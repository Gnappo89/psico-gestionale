import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  markPaidAction,
  markUnpaidAction,
  deleteInvoiceAction,
  sendInvoiceEmailAction,
  inviaInConservazioneAction,
} from "../actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatCurrency, formatDate, formatDateInput, toNumber } from "@/lib/utils";
import { isConservazioneConfigured } from "@/lib/conservazione";
import {
  HiOutlineDownload,
  HiOutlineMail,
  HiOutlineArrowLeft,
  HiOutlineArchive,
} from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function FatturaDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mailSent?: string; mailError?: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { patient: true },
  });

  if (!invoice) notFound();

  const conservazioneOk = isConservazioneConfigured();

  const markPaid = markPaidAction.bind(null, invoice.id);
  const markUnpaid = markUnpaidAction.bind(null, invoice.id);
  const del = deleteInvoiceAction.bind(null, invoice.id);
  const sendEmail = sendInvoiceEmailAction.bind(null, invoice.id);
  const inviaConservazione = inviaInConservazioneAction.bind(null, invoice.id);

  return (
    <div className="py-6 md:py-8 space-y-6 max-w-2xl">
      <Link href="/fatture" className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline">
        <HiOutlineArrowLeft className="h-4 w-4" /> Tutte le fatture
      </Link>

      {searchParams.mailSent && (
        <div className="rounded-xl bg-mint-50 border border-mint-200 text-mint-800 text-sm px-4 py-3">
          Email inviata con successo a {invoice.patient.email}.
        </div>
      )}
      {searchParams.mailError && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 text-coral-700 text-sm px-4 py-3">
          {searchParams.mailError}
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide">
              Fattura n. {invoice.numero}
            </p>
            <h1 className="text-xl font-bold text-slate-800 mt-1">
              {invoice.patient.nome} {invoice.patient.cognome}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Emessa il {formatDate(invoice.data)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={invoice.pagata ? "badge-success" : "badge-warning"}>
              {invoice.pagata ? "Pagata" : "Da pagare"}
            </span>
            {invoice.importata && <span className="badge-neutral">Fattura storica</span>}
          </div>
        </div>

        {invoice.importata && (
          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-4">
            Importata da un altro gestionale, solo a fini statistici: conta nei report ma non può
            essere rigenerata dal modello dell&apos;app né inviata via email da qui.
          </p>
        )}

        <p className="text-sm text-slate-600 mb-4">{invoice.descrizione}</p>
        <p className="text-3xl font-bold text-brand-700 mb-6">
          {formatCurrency(toNumber(invoice.importo))}
        </p>

        <div className="flex flex-wrap gap-2">
          {invoice.importata ? (
            <a
              href={`/api/fatture/${invoice.id}/pdf-originale`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <HiOutlineDownload className="h-4 w-4" /> PDF originale
            </a>
          ) : (
            <>
              <a
                href={`/api/fatture/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <HiOutlineDownload className="h-4 w-4" /> PDF / Stampa
              </a>

              {invoice.patient.email && (
                <form action={sendEmail}>
                  <button type="submit" className="btn-secondary">
                    <HiOutlineMail className="h-4 w-4" />
                    {invoice.inviataEmail ? "Invia di nuovo via email" : "Invia via email"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {!invoice.importata && invoice.inviataEmail && invoice.dataInvioEmail && (
          <p className="text-xs text-slate-400 mt-3">
            Ultimo invio email: {formatDate(invoice.dataInvioEmail)}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-4">Pagamento</h2>
        {invoice.pagata ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Pagata il <strong>{formatDate(invoice.dataPagamento)}</strong>
              {invoice.metodoPagamento ? ` · ${invoice.metodoPagamento}` : ""}
            </p>
            <form action={markUnpaid}>
              <button type="submit" className="btn-ghost">
                Segna come da pagare
              </button>
            </form>
          </div>
        ) : (
          <form action={markPaid} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label" htmlFor="dataPagamento">
                  Data pagamento
                </label>
                <input
                  id="dataPagamento"
                  name="dataPagamento"
                  type="date"
                  defaultValue={formatDateInput(new Date())}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="metodoPagamento">
                  Metodo (opzionale)
                </label>
                <select id="metodoPagamento" name="metodoPagamento" className="input">
                  <option value="">-</option>
                  <option value="Contanti">Contanti</option>
                  <option value="Bonifico">Bonifico</option>
                  <option value="Carta">Carta</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary">
              Segna come pagata
            </button>
          </form>
        )}
      </div>

      {invoice.pagata && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineArchive className="h-5 w-5 text-brand-500" />
            <h2 className="font-bold text-slate-800">Conservazione digitale</h2>
          </div>

          <div className="flex items-center gap-2 mb-3">
            {invoice.statoConservazione === "CONSERVATA" && (
              <span className="badge-success">Conservata</span>
            )}
            {invoice.statoConservazione === "ERRORE" && (
              <span className="badge-danger">Errore</span>
            )}
            {invoice.statoConservazione === "IN_CORSO" && (
              <span className="badge-warning">Invio in corso</span>
            )}
            {invoice.statoConservazione === "NON_INVIATA" && (
              <span className="badge-neutral">Non inviata</span>
            )}
          </div>

          {invoice.statoConservazione === "CONSERVATA" && (
            <p className="text-sm text-slate-600 mb-4">
              Inviata in conservazione
              {invoice.dataInvioConservazione ? ` il ${formatDate(invoice.dataInvioConservazione)}` : ""}.
              {invoice.identificativoConservazione && (
                <>
                  {" "}
                  Identificativo (IPdA):{" "}
                  <span className="font-mono text-xs text-slate-500">
                    {invoice.identificativoConservazione}
                  </span>
                </>
              )}
            </p>
          )}

          {invoice.statoConservazione === "ERRORE" && invoice.erroreConservazione && (
            <p className="text-sm text-coral-700 bg-coral-50 border border-coral-200 rounded-xl px-4 py-3 mb-4">
              {invoice.erroreConservazione}
            </p>
          )}

          {!conservazioneOk && (
            <p className="text-xs text-slate-400 mb-4">
              La conservazione digitale non è ancora configurata (vedi Impostazioni).
            </p>
          )}

          {invoice.statoConservazione !== "CONSERVATA" && (
            <form action={inviaConservazione}>
              <button type="submit" className="btn-secondary">
                <HiOutlineArchive className="h-4 w-4" />
                {invoice.statoConservazione === "ERRORE"
                  ? "Riprova invio in conservazione"
                  : "Invia in conservazione"}
              </button>
            </form>
          )}
        </div>
      )}

      <form action={del} className="flex justify-end">
        <ConfirmSubmitButton confirmMessage="Vuoi davvero eliminare questa fattura? L'operazione non è reversibile.">
          Elimina fattura
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
