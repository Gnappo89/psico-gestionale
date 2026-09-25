"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function parsePercent(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value || "0").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n / 100));
}

export async function updateStudioSettingsAction(formData: FormData) {
  await prisma.studioSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      nomeStudio: String(formData.get("nomeStudio") || "").trim(),
      nomePsicologa: String(formData.get("nomePsicologa") || "").trim(),
      indirizzoStudio: String(formData.get("indirizzoStudio") || "").trim(),
      partitaIva: String(formData.get("partitaIva") || "").trim(),
      codiceFiscalePsicologa: String(formData.get("codiceFiscalePsicologa") || "").trim(),
      numeroAlboIscrizione: String(formData.get("numeroAlboIscrizione") || "").trim(),
      iban: String(formData.get("iban") || "").trim(),
      coefficienteRedditivita: parsePercent(formData.get("coefficienteRedditivita")),
      aliquotaImposta: parsePercent(formData.get("aliquotaImposta")),
      aliquotaContributi: parsePercent(formData.get("aliquotaContributi")),
      conservazioneAbilitata: formData.get("conservazioneAbilitata") === "on",
      conservazioneClasseDocumentale:
        String(formData.get("conservazioneClasseDocumentale") || "").trim() || "ll_lg_fattu",
    },
    update: {
      nomeStudio: String(formData.get("nomeStudio") || "").trim(),
      nomePsicologa: String(formData.get("nomePsicologa") || "").trim(),
      indirizzoStudio: String(formData.get("indirizzoStudio") || "").trim(),
      partitaIva: String(formData.get("partitaIva") || "").trim(),
      codiceFiscalePsicologa: String(formData.get("codiceFiscalePsicologa") || "").trim(),
      numeroAlboIscrizione: String(formData.get("numeroAlboIscrizione") || "").trim(),
      iban: String(formData.get("iban") || "").trim(),
      coefficienteRedditivita: parsePercent(formData.get("coefficienteRedditivita")),
      aliquotaImposta: parsePercent(formData.get("aliquotaImposta")),
      aliquotaContributi: parsePercent(formData.get("aliquotaContributi")),
      conservazioneAbilitata: formData.get("conservazioneAbilitata") === "on",
      conservazioneClasseDocumentale:
        String(formData.get("conservazioneClasseDocumentale") || "").trim() || "ll_lg_fattu",
    },
  });

  revalidatePath("/impostazioni");
  revalidatePath("/report");
}
