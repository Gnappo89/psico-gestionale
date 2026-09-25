import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { confermaImportazioneAction, scartaImportazioneAction } from "../actions";
import { ImportInvoiceForm } from "@/components/ImportInvoiceForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatDateInput, toNumber } from "@/lib/utils";
import { HiOutlineArrowLeft } from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function RivediImportazionePage({
  params,
  searchParams,
}: {
  params: { stagingId: string };
  searchParams: { errore?: string };
}) {
  const staging = await prisma.importazioneStaging.findUnique({
    where: { id: params.stagingId },
  });

  if (!staging) notFound();

  const pazienti = await prisma.patient.findMany({
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
  });
  const patients = pazienti.map((p) => ({ id: p.id, nome: p.nome, cognome: p.cognome }));

  const confermaAction = confermaImportazioneAction.bind(null, staging.id);
  const scartaAction = scartaImportazioneAction.bind(null, staging.id);

  return (
    <div className="py-6 md:py-8 space-y-6 max-w-4xl">
      <Link
        href="/fatture/importa"
        className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline"
      >
        <HiOutlineArrowLeft className="h-4 w-4" /> Fatture da importare
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rivedi fattura storica</h1>
        <p className="text-slate-500 text-sm mt-1">
          {staging.nomeFileOriginale} — controlla e correggi i dati prima di importare
        </p>
      </div>

      {searchParams.errore && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 text-coral-700 text-sm px-4 py-3">
          {searchParams.errore}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-3">PDF originale</h2>
          <a
            href={`/api/fatture/importa/${staging.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mb-4"
          >
            Apri il PDF in una nuova scheda
          </a>
          {staging.testoEstratto ? (
            <>
              <p className="text-xs text-slate-400 mb-2">
                Testo estratto automaticamente dal PDF (solo un aiuto per compilare i campi — non
                sempre è affidabile, soprattutto per PDF con grafiche particolari: verifica sempre
                confrontando con il file originale).
              </p>
              <pre className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 max-h-96 overflow-auto whitespace-pre-wrap">
                {staging.testoEstratto}
              </pre>
            </>
          ) : (
            <p className="text-xs text-slate-400">
              Non è stato possibile estrarre automaticamente il testo da questo PDF: apri il file
              originale e compila i campi a mano.
            </p>
          )}
        </div>

        <ImportInvoiceForm
          action={confermaAction}
          patients={patients}
          defaultNumero={staging.suggerimentoNumero ?? ""}
          defaultData={formatDateInput(staging.suggerimentoData ?? new Date())}
          defaultImporto={
            staging.suggerimentoImporto !== null ? toNumber(staging.suggerimentoImporto) : undefined
          }
          defaultPazienteNome={staging.suggerimentoPaziente ?? ""}
        />
      </div>

      <form action={scartaAction} className="flex justify-end">
        <ConfirmSubmitButton confirmMessage="Vuoi scartare questo file? Il PDF caricato verrà eliminato senza creare una fattura.">
          Scarta questo file
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
