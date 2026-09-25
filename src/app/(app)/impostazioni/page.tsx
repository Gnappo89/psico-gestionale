import { getStudioSettings } from "@/lib/settings";
import { updateStudioSettingsAction } from "./actions";
import { isMailConfigured } from "@/lib/mail";
import { isConservazioneConfigured } from "@/lib/conservazione";
import { HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi";

export const dynamic = "force-dynamic";

export default async function ImpostazioniPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const settings = await getStudioSettings();
  const mailOk = isMailConfigured();
  const conservazioneOk = isConservazioneConfigured();

  return (
    <div className="py-6 md:py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Impostazioni</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dati dello studio, usati nelle fatture, e parametri fiscali per il calcolo del netto
        </p>
      </div>

      {searchParams.saved && (
        <div className="rounded-xl bg-mint-50 border border-mint-200 text-mint-800 text-sm px-4 py-3">
          Impostazioni salvate.
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 text-sm font-medium">
          {mailOk ? (
            <>
              <HiOutlineCheckCircle className="h-5 w-5 text-mint-600" />
              <span className="text-mint-700">Invio email via Gmail configurato</span>
            </>
          ) : (
            <>
              <HiOutlineExclamationCircle className="h-5 w-5 text-coral-500" />
              <span className="text-coral-600">
                Invio email non configurato — imposta GMAIL_USER e GMAIL_APP_PASSWORD tra le
                variabili d&apos;ambiente del progetto su Railway.
              </span>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 text-sm font-medium">
          {conservazioneOk ? (
            <>
              <HiOutlineCheckCircle className="h-5 w-5 text-mint-600" />
              <span className="text-mint-700">Conservazione digitale (LegalDoc) configurata</span>
            </>
          ) : (
            <>
              <HiOutlineExclamationCircle className="h-5 w-5 text-coral-500" />
              <span className="text-coral-600">
                Conservazione digitale non configurata — imposta LEGALDOC_BASE_URL e
                LEGALDOC_API_KEY tra le variabili d&apos;ambiente del progetto su Railway (li
                trovi nella Scheda Dati Tecnici fornita da InfoCert quando attivi il contratto
                LegalDoc).
              </span>
            </>
          )}
        </div>
      </div>

      <form
        action={async (formData) => {
          "use server";
          await updateStudioSettingsAction(formData);
          const { redirect } = await import("next/navigation");
          redirect("/impostazioni?saved=1");
        }}
        className="card space-y-5"
      >
        <h2 className="font-bold text-slate-800">Dati dello studio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="nomeStudio">
              Nome studio
            </label>
            <input
              id="nomeStudio"
              name="nomeStudio"
              defaultValue={settings.nomeStudio}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="nomePsicologa">
              Nome e cognome
            </label>
            <input
              id="nomePsicologa"
              name="nomePsicologa"
              defaultValue={settings.nomePsicologa}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="indirizzoStudio">
            Indirizzo studio
          </label>
          <input
            id="indirizzoStudio"
            name="indirizzoStudio"
            defaultValue={settings.indirizzoStudio}
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="label" htmlFor="partitaIva">
              Partita IVA
            </label>
            <input
              id="partitaIva"
              name="partitaIva"
              defaultValue={settings.partitaIva}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="codiceFiscalePsicologa">
              Codice fiscale
            </label>
            <input
              id="codiceFiscalePsicologa"
              name="codiceFiscalePsicologa"
              defaultValue={settings.codiceFiscalePsicologa}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="numeroAlboIscrizione">
              N. iscrizione Albo
            </label>
            <input
              id="numeroAlboIscrizione"
              name="numeroAlboIscrizione"
              defaultValue={settings.numeroAlboIscrizione}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="iban">
            IBAN (mostrato sulle fatture non pagate)
          </label>
          <input id="iban" name="iban" defaultValue={settings.iban} className="input" />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h2 className="font-bold text-slate-800 mb-1">Parametri regime forfettario</h2>
          <p className="text-xs text-slate-400 mb-4">
            Usati per stimare il netto nella sezione Report. Verifica i valori corretti per la
            tua situazione con il tuo commercialista.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="label" htmlFor="coefficienteRedditivita">
                Coefficiente redditività (%)
              </label>
              <input
                id="coefficienteRedditivita"
                name="coefficienteRedditivita"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={(settings.coefficienteRedditivita * 100).toString()}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="aliquotaImposta">
                Aliquota imposta sostitutiva (%)
              </label>
              <input
                id="aliquotaImposta"
                name="aliquotaImposta"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={(settings.aliquotaImposta * 100).toString()}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="aliquotaContributi">
                Aliquota contributi previdenziali (%)
              </label>
              <input
                id="aliquotaContributi"
                name="aliquotaContributi"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={(settings.aliquotaContributi * 100).toString()}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h2 className="font-bold text-slate-800 mb-1">Conservazione digitale a norma</h2>
          <p className="text-xs text-slate-400 mb-4">
            Se attiva, ogni fattura segnata come pagata viene inviata automaticamente in
            conservazione sostitutiva (es. InfoCert LegalDoc). Richiede un contratto attivo e le
            credenziali configurate su Railway (vedi sopra).
          </p>
          <div className="flex items-start gap-3 mb-5">
            <input
              id="conservazioneAbilitata"
              name="conservazioneAbilitata"
              type="checkbox"
              defaultChecked={settings.conservazioneAbilitata}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            <label className="text-sm text-slate-600" htmlFor="conservazioneAbilitata">
              Invia automaticamente in conservazione le fatture pagate
            </label>
          </div>
          <div>
            <label className="label" htmlFor="conservazioneClasseDocumentale">
              Classe documentale LegalDoc
            </label>
            <input
              id="conservazioneClasseDocumentale"
              name="conservazioneClasseDocumentale"
              defaultValue={settings.conservazioneClasseDocumentale}
              className="input"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Per LegalDoc Lite la classe standard per le fatture è{" "}
              <code className="text-slate-500">ll_lg_fattu</code>.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="btn-primary">
            Salva impostazioni
          </button>
        </div>
      </form>
    </div>
  );
}
