"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseDecimal(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function createPatientAction(formData: FormData) {
  const patient = await prisma.patient.create({
    data: {
      nome: String(formData.get("nome") || "").trim(),
      cognome: String(formData.get("cognome") || "").trim(),
      codiceFiscale: emptyToNull(formData.get("codiceFiscale")),
      email: emptyToNull(formData.get("email")),
      telefono: emptyToNull(formData.get("telefono")),
      indirizzo: emptyToNull(formData.get("indirizzo")),
      tariffaSeduta: parseDecimal(formData.get("tariffaSeduta")),
      note: emptyToNull(formData.get("note")),
    },
  });

  revalidatePath("/pazienti");
  redirect(`/pazienti/${patient.id}`);
}

export async function updatePatientAction(id: string, formData: FormData) {
  await prisma.patient.update({
    where: { id },
    data: {
      nome: String(formData.get("nome") || "").trim(),
      cognome: String(formData.get("cognome") || "").trim(),
      codiceFiscale: emptyToNull(formData.get("codiceFiscale")),
      email: emptyToNull(formData.get("email")),
      telefono: emptyToNull(formData.get("telefono")),
      indirizzo: emptyToNull(formData.get("indirizzo")),
      tariffaSeduta: parseDecimal(formData.get("tariffaSeduta")),
      note: emptyToNull(formData.get("note")),
      attivo: formData.get("attivo") === "on",
    },
  });

  revalidatePath("/pazienti");
  revalidatePath(`/pazienti/${id}`);
  redirect(`/pazienti/${id}`);
}

export async function deletePatientAction(id: string) {
  const fatture = await prisma.invoice.count({ where: { patientId: id } });
  if (fatture > 0) {
    // Non eliminiamo pazienti con fatture collegate: li disattiviamo soltanto,
    // per non perdere lo storico delle fatture emesse.
    await prisma.patient.update({ where: { id }, data: { attivo: false } });
  } else {
    await prisma.patient.delete({ where: { id } });
  }
  revalidatePath("/pazienti");
  redirect("/pazienti");
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str.length ? str : null;
}
