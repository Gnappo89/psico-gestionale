"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateInvoicePdf } from "@/lib/pdf";
import { sendInvoiceEmail, isMailConfigured } from "@/lib/mail";
import { getStudioSettings } from "@/lib/settings";
import { toNumber } from "@/lib/utils";
import { inviaInConservazione, isConservazioneConfigured } from "@/lib/conservazione";

function parseDecimal(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function createInvoiceAction(formData: FormData) {
  const patientId = String(formData.get("patientId") || "");
  if (!patientId) throw new Error("Seleziona un paziente.");

  const dataStr = String(formData.get("data") || "");
  const data = dataStr ? new Date(dataStr) : new Date();
  const anno = data.getFullYear();

  const importo = parseDecimal(formData.get("importo"));
  const descrizione = String(formData.get("descrizione") || "Prestazione professionale").trim();

  const invoice = await prisma.$transaction(async (tx) => {
    const count = await tx.invoice.count({ where: { anno } });
    const progressivo = count + 1;
    const numero = `${progressivo}/${anno}`;

    return tx.invoice.create({
      data: {
        numero,
        anno,
        progressivo,
        data,
        descrizione,
        importo,
        patientId,
      },
    });
  });

  revalidatePath("/fatture");
  revalidatePath("/dashboard");
  redirect(`/fatture/${invoice.id}`);
}

export async function markPaidAction(id: string, formData: FormData) {
  const dataStr = String(formData.get("dataPagamento") || "");
  const dataPagamento = dataStr ? new Date(dataStr) : new Date();
  const metodoPagamento = String(formData.get("metodoPagamento") || "") || null;

  await prisma.invoice.update({
    where: { id },
    data: { pagata: true, dataPagamento, metodoPagamento },
  });

  revalidatePath("/fatture");
  revalidatePath(`/fatture/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/report");

  // Una fattura pagata va proposta per la conservazione digitale, se abilitata.
  // Il fallimento dell'invio in conservazione non deve mai bloccare la
  // registrazione del pagamento: viene eseguito "best effort" e l'esito è
  // visibile/ritentabile dalla pagina della fattura.
  const studio = await getStudioSettings();
  if (studio.conservazioneAbilitata) {
    await submitInvoiceToConservazione(id).catch(() => {
      // l'errore è già stato salvato su erroreConservazione da submitInvoiceToConservazione
    });
    revalidatePath(`/fatture/${id}`);
  }
}

// Genera il PDF della fattura e lo invia in conservazione digitale (es.
// InfoCert LegalDoc), aggiornando lo stato sulla fattura. Pensata per essere
// chiamata sia automaticamente (al pagamento) sia manualmente (pulsante
// "Invia in conservazione" / "Riprova" nella pagina della fattura).
async function submitInvoiceToConservazione(id: string) {
  await prisma.invoice.update({
    where: { id },
    data: { statoConservazione: "IN_CORSO", erroreConservazione: null },
  });

  try {
    const [invoice, studio] = await Promise.all([
      prisma.invoice.findUnique({ where: { id }, include: { patient: true } }),
      getStudioSettings(),
    ]);
    if (!invoice) throw new Error("Fattura non trovata.");

    const pdfBytes = await generateInvoicePdf({
      numero: invoice.numero,
      data: invoice.data,
      descrizione: invoice.descrizione,
      importo: toNumber(invoice.importo),
      pagata: invoice.pagata,
      dataPagamento: invoice.dataPagamento,
      patient: invoice.patient,
      studio,
    });

    const result = await inviaInConservazione({
      numero: invoice.numero,
      data: invoice.data,
      importo: toNumber(invoice.importo),
      descrizione: invoice.descrizione,
      patientNome: invoice.patient.nome,
      patientCognome: invoice.patient.cognome,
      patientCodiceFiscale: invoice.patient.codiceFiscale,
      classeDocumentale: studio.conservazioneClasseDocumentale,
      pdfBytes,
    });

    await prisma.invoice.update({
      where: { id },
      data: {
        statoConservazione: "CONSERVATA",
        dataInvioConservazione: result.dataAccettazione,
        identificativoConservazione: result.identificativo,
        erroreConservazione: null,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Errore durante l'invio in conservazione.";
    await prisma.invoice.update({
      where: { id },
      data: { statoConservazione: "ERRORE", erroreConservazione: message },
    });
    throw err;
  }
}

export async function inviaInConservazioneAction(id: string) {
  if (!isConservazioneConfigured()) {
    await prisma.invoice.update({
      where: { id },
      data: {
        statoConservazione: "ERRORE",
        erroreConservazione:
          "Conservazione digitale non configurata: imposta LEGALDOC_BASE_URL e LEGALDOC_API_KEY nelle variabili d'ambiente.",
      },
    });
  } else {
    await submitInvoiceToConservazione(id).catch(() => {
      // l'errore è già salvato su erroreConservazione
    });
  }

  revalidatePath(`/fatture/${id}`);
  redirect(`/fatture/${id}`);
}

export async function markUnpaidAction(id: string) {
  await prisma.invoice.update({
    where: { id },
    data: { pagata: false, dataPagamento: null, metodoPagamento: null },
  });

  revalidatePath("/fatture");
  revalidatePath(`/fatture/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/report");
}

export async function deleteInvoiceAction(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/fatture");
  revalidatePath("/dashboard");
  redirect("/fatture");
}

export async function sendInvoiceEmailAction(id: string) {
  try {
    if (!isMailConfigured()) {
      throw new Error(
        "Invio email non configurato: imposta GMAIL_USER e GMAIL_APP_PASSWORD nelle variabili d'ambiente."
      );
    }

    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { patient: true } });
    if (!invoice) throw new Error("Fattura non trovata.");
    if (!invoice.patient.email) {
      throw new Error("Il paziente non ha un indirizzo email in anagrafica.");
    }

    const studio = await getStudioSettings();
    const pdfBytes = await generateInvoicePdf({
      numero: invoice.numero,
      data: invoice.data,
      descrizione: invoice.descrizione,
      importo: toNumber(invoice.importo),
      pagata: invoice.pagata,
      dataPagamento: invoice.dataPagamento,
      patient: invoice.patient,
      studio,
    });

    await sendInvoiceEmail({
      to: invoice.patient.email,
      patientName: `${invoice.patient.nome} ${invoice.patient.cognome}`,
      invoiceNumber: invoice.numero,
      amountLabel: new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
        toNumber(invoice.importo)
      ),
      pdfBytes,
      fromName: studio.nomeStudio,
    });

    await prisma.invoice.update({
      where: { id },
      data: { inviataEmail: true, dataInvioEmail: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore durante l'invio dell'email.";
    revalidatePath(`/fatture/${id}`);
    redirect(`/fatture/${id}?mailError=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/fatture/${id}`);
  redirect(`/fatture/${id}?mailSent=1`);
}
