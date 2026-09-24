import { prisma } from "./db";

// Le impostazioni dello studio sono un'unica riga (id=1). Questa funzione la
// crea al primo utilizzo se non esiste ancora.
export async function getStudioSettings() {
  const existing = await prisma.studioSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.studioSettings.create({ data: { id: 1 } });
}
