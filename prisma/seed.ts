// Crea la riga iniziale delle impostazioni dello studio, se non esiste ancora.
// Uso: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.studioSettings.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.studioSettings.create({ data: { id: 1 } });
    console.log("Impostazioni dello studio create con i valori di default.");
  } else {
    console.log("Le impostazioni dello studio esistono già.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
