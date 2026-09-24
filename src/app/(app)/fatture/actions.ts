"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateInvoicePdf } from "@/lib/pdf";
import { sendInvoiceEmail, isMailConfigured } from "@/lib/mail";
import { getStudioSettings } from "@/lib/settings";
import { toNumber } from "@/lib/utils";

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
