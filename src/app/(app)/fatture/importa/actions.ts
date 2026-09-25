"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { analizzaFatturaPdf } from "@/lib/pdfExtract";

function parseDecimal(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str.length ? str : null;
}

export async function caricaFattureStoricheAction(formData: FormData) {
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    redirect(`/fatture/importa?errore=${encodeURIComponent("Seleziona almeno un file PDF.")}`);
  }

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const analisi = analizzaFatturaPdf(buffer);

    await prisma.importazioneStaging.create({
      data: {
        nomeFileOriginale: file.name || "fattura.pdf",
        pdfBytes: buffer,
        testoEstratto: analisi.testo || null,
        suggerimentoNumero: analisi.numero ?? null,
        suggerimentoData: analisi.data ?? null,
        suggerimentoImporto: analisi.importo ?? null,
        suggerimentoPaziente: analisi.paziente ?? null,
      },
    });
  }

  revalidatePath("/fatture/importa");
  redirect("/fatture/importa");
}

export async function scartaImportazioneAction(id: string) {
  await prisma.importazioneStaging.delete({ where: { id } }).catch(() => {
    // già rimosso o inesistente: nessun problema
  });
  revalidatePath("/fatture/importa");
  redirect("/fatture/importa");
}

export async function confermaImportazioneAction(stagingId: string, formData: FormData) {
  const staging = await prisma.importazioneStaging.findUnique({ where: { id: stagingId } });
  if (!staging) {
    redirect(
      `/fatture/importa?errore=${encodeURIComponent(
        "File non trovato: forse è già stato importato o scartato."
      )}`
    );
  }

  const patientMode = String(formData.get("patientMode") || "esistente");
  const importo = parseDecimal(formData.get("importo"));

  let patientId: string;
  if (patientMode === "nuovo") {
    const nome = String(formData.get("nuovoNome") || "").trim();
    const cognome = String(formData.get("nuovoCognome") || "").trim();
    if (!nome || !cognome) {
      redirect(
        `/fatture/importa/${stagingId}?errore=${encodeURIComponent(
          "Nome e cognome del nuovo paziente sono obbligatori."
        )}`
      );
    }
    const nuovoPaziente = await prisma.patient.create({
      data: {
        nome,
        cognome,
        codiceFiscale: emptyToNull(formData.get("nuovoCodiceFiscale")),
        email: emptyToNull(formData.get("nuovoEmail")),
        telefono: emptyToNull(formData.get("nuovoTelefono")),
        indirizzo: emptyToNull(formData.get("nuovoIndirizzo")),
        tariffaSeduta: importo,
      },
    });
    patientId = nuovoPaziente.id;
  } else {
    patientId = String(formData.get("existingPatientId") || "");
    if (!patientId) {
      redirect(
        `/fatture/importa/${stagingId}?errore=${encodeURIComponent("Seleziona un paziente.")}`
      );
    }
  }

  const numero = String(formData.get("numero") || "").trim();
  if (!numero) {
    redirect(
      `/fatture/importa/${stagingId}?errore=${encodeURIComponent(
        "Il numero fattura è obbligatorio."
      )}`
    );
  }

  const dataStr = String(formData.get("data") || "");
  const data = dataStr ? new Date(dataStr) : new Date();
  const anno = data.getFullYear();
  const descrizione =
    String(formData.get("descrizione") || "").trim() || "Prestazione professionale";
  const pagata = formData.get("pagata") === "on";
  const dataPagamentoStr = String(formData.get("dataPagamento") || "");
  const dataPagamento = pagata ? (dataPagamentoStr ? new Date(dataPagamentoStr) : data) : null;
  const metodoPagamento = pagata ? emptyToNull(formData.get("metodoPagamento")) : null;

  let invoiceId: string;
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const count = await tx.invoice.count({ where: { anno } });
      const progressivo = count + 1;

      return tx.invoice.create({
        data: {
          numero,
          anno,
          progressivo,
          data,
          descrizione,
          importo,
          pagata,
          dataPagamento,
          metodoPagamento,
          importata: true,
          pdfOriginale: staging.pdfBytes,
          pdfOriginaleNomeFile: staging.nomeFileOriginale,
          patientId,
        },
      });
    });
    invoiceId = invoice.id;
  } catch (err) {
    const isDuplicateNumero =
      err && typeof err === "object" && (err as { code?: string }).code === "P2002";
    const message = isDuplicateNumero
      ? `Esiste già una fattura con numero "${numero}": modifica il numero e riprova.`
      : "Errore durante la creazione della fattura. Riprova.";
    redirect(`/fatture/importa/${stagingId}?errore=${encodeURIComponent(message)}`);
  }

  await prisma.importazioneStaging.delete({ where: { id: stagingId } }).catch(() => {
    // la fattura è comunque stata creata correttamente
  });

  revalidatePath("/fatture");
  revalidatePath("/fatture/importa");
  revalidatePath("/pazienti");
  revalidatePath("/dashboard");
  revalidatePath("/report");
  redirect(`/fatture/${invoiceId}`);
}
