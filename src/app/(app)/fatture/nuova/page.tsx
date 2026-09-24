import { prisma } from "@/lib/db";
import { InvoiceForm } from "@/components/InvoiceForm";
import { createInvoiceAction } from "../actions";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NuovaFatturaPage({
  searchParams,
}: {
  searchParams: { patientId?: string };
}) {
  const pazienti = await prisma.patient.findMany({
    where: { attivo: true },
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
  });

  const patients = pazienti.map((p) => ({
    id: p.id,
    nome: p.nome,
    cognome: p.cognome,
    tariffaSeduta: toNumber(p.tariffaSeduta),
  }));

  return (
    <div className="py-6 md:py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nuova fattura</h1>
        <p className="text-slate-500 text-sm mt-1">
          L&apos;importo viene precompilato con la tariffa del paziente
        </p>
      </div>
      <InvoiceForm
        action={createInvoiceAction}
        patients={patients}
        defaultPatientId={searchParams.patientId}
      />
    </div>
  );
}
