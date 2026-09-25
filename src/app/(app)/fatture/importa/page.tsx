import Link from "next/link";
import { prisma } from "@/lib/db";
import { caricaFattureStoricheAction, scartaImportazioneAction } from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatDate } from "@/lib/utils";
import { HiOutlineArrowLeft, HiOutlineUpload } from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function ImportaFatturePage({
  searchParams,
}: {
  searchParams: { errore?: string };
}) {
  const inAttesa = await prisma.importazioneStaging.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="py-6 md:py-8 space-y-6 max-w-3xl">
      <Link
        href="/fatture"
        className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline"
      >
        <HiOutlineArrowLeft className="h-4 w-4" /> Tutte le fatture
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Importa fatture storiche</h1>
        <p className="text-slate-500 text-sm mt-1">
          Carica i PDF delle vecchie fatture emesse con altri gestionali: vengono aggiunte solo a
          fini statistici, senza inviarle via email né rigenerarle con il modello di questa app.
          Per ogni file dovrai confermare (e correggere, se serve) i dati prima che diventi una
          fattura vera e propria.
        </p>
      </div>

      {searchParams.errore && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 text-coral-700 text-sm px-4 py-3">
          {searchParams.errore}
        </div>
      )}

      <form action={caricaFattureStoricheAction} className="card space-y-4">
        <div>
          <label className="label" htmlFor="files">
            File PDF (puoi selezionarne più di uno)
          </label>
          <input
            id="files"
            name="files"
            type="file"
            accept="application/pdf"
            multiple
            required
            className="input"
          />
        </div>
        <button type="submit" className="btn-primary">
          <HiOutlineUpload className="h-4 w-4" /> Carica e analizza
        </button>
      </form>

      {inAttesa.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Da rivedere ({inAttesa.length})</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ogni file va confermato singolarmente prima di diventare una fattura.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {inAttesa.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{s.nomeFileOriginale}</p>
                  <p className="text-xs text-slate-400">
                    Caricato il {formatDate(s.createdAt)}
                    {s.suggerimentoPaziente ? ` · ${s.suggerimentoPaziente}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/fatture/importa/${s.id}`} className="btn-secondary">
                    Rivedi e importa
                  </Link>
                  <form action={scartaImportazioneAction.bind(null, s.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Scartare questo file senza importarlo? Il PDF caricato verrà eliminato."
                      className="btn-ghost"
                    >
                      Scarta
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
