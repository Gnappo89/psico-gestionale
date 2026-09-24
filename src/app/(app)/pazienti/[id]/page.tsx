import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PatientForm } from "@/components/PatientForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updatePatientAction, deletePatientAction } from "../actions";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { HiPlus } from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function PazienteDetailPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { invoices: { orderBy: { data: "desc" } } },
  });

  if (!patient) notFound();

  const update = updatePatientAction.bind(null, patient.id);
  const del = deletePatientAction.bind(null, patient.id);

  return (
    <div className="py-6 md:py-8 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {patient.nome} {patient.cognome}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Paziente {patient.attivo ? "attivo" : "non attivo"}
          </p>
        </div>
        <Link href={`/fatture/nuova?patientId=${patient.id}`} className="btn-primary">
          <HiPlus className="h-4 w-4" /> Nuova fattura
        </Link>
      </div>

      <PatientForm
        action={update}
        defaultValues={{
          ...patient,
          tariffaSeduta: toNumber(patient.tariffaSeduta),
        }}
        showAttivo
        submitLabel="Salva modifiche"
      />

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-4">Fatture del paziente</h2>
        {patient.invoices.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nessuna fattura ancora.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {patient.invoices.map((f) => (
              <Link
                key={f.id}
                href={`/fatture/${f.id}`}
                className="flex items-center justify-between py-3 hover:bg-brand-50/60 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-slate-800">Fattura n. {f.numero}</p>
                  <p className="text-xs text-slate-400">{formatDate(f.data)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-slate-700">
                    {formatCurrency(toNumber(f.importo))}
                  </span>
                  <span className={f.pagata ? "badge-success" : "badge-warning"}>
                    {f.pagata ? "Pagata" : "Da pagare"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <form action={del} className="flex justify-end">
        <ConfirmSubmitButton confirmMessage="Vuoi davvero rimuovere questo paziente? Se ha fatture collegate verrà solo disattivato.">
          Rimuovi paziente
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
