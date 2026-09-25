"use client";

import { useState } from "react";
import { formatDateInput } from "@/lib/utils";

type PatientOption = {
  id: string;
  nome: string;
  cognome: string;
};

export function ImportInvoiceForm({
  action,
  patients,
  defaultNumero,
  defaultData,
  defaultImporto,
  defaultPazienteNome,
}: {
  action: (formData: FormData) => void;
  patients: PatientOption[];
  defaultNumero: string;
  defaultData: string;
  defaultImporto?: number;
  defaultPazienteNome: string;
}) {
  const [patientMode, setPatientMode] = useState<"esistente" | "nuovo">(
    patients.length === 0 ? "nuovo" : "esistente"
  );
  const [pagata, setPagata] = useState(true);
  const [importo, setImporto] = useState<string>(
    defaultImporto !== undefined ? String(defaultImporto) : ""
  );

  return (
    <form action={action} className="card space-y-5">
      <h2 className="font-bold text-slate-800">Dati fattura</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="numero">
            Numero fattura
          </label>
          <input
            id="numero"
            name="numero"
            required
            defaultValue={defaultNumero}
            className="input"
            placeholder="45/2023"
          />
        </div>
        <div>
          <label className="label" htmlFor="data">
            Data fattura
          </label>
          <input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={defaultData}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="importo">
          Importo (€)
        </label>
        <input
          id="importo"
          name="importo"
          type="number"
          step="0.01"
          min="0"
          required
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="descrizione">
          Descrizione prestazione
        </label>
        <textarea
          id="descrizione"
          name="descrizione"
          rows={2}
          defaultValue="Prestazione professionale"
          className="input"
        />
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h2 className="font-bold text-slate-800 mb-3">Paziente</h2>
        {defaultPazienteNome && (
          <p className="text-xs text-slate-400 mb-3">
            Trovato nel PDF:{" "}
            <span className="font-medium text-slate-600">{defaultPazienteNome}</span> — verifica
            che sia corretto prima di confermare.
          </p>
        )}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="patientMode"
              value="esistente"
              checked={patientMode === "esistente"}
              onChange={() => setPatientMode("esistente")}
              disabled={patients.length === 0}
            />
            Paziente già in anagrafica
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="patientMode"
              value="nuovo"
              checked={patientMode === "nuovo"}
              onChange={() => setPatientMode("nuovo")}
            />
            Nuovo paziente
          </label>
        </div>

        {patientMode === "esistente" ? (
          patients.length === 0 ? (
            <p className="text-sm text-slate-400">
              Non hai ancora nessun paziente in anagrafica: scegli &quot;Nuovo paziente&quot;.
            </p>
          ) : (
            <select name="existingPatientId" required className="input">
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cognome} {p.nome}
                </option>
              ))}
            </select>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="nuovoNome">
                  Nome
                </label>
                <input
                  id="nuovoNome"
                  name="nuovoNome"
                  required
                  defaultValue={defaultPazienteNome}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="nuovoCognome">
                  Cognome
                </label>
                <input id="nuovoCognome" name="nuovoCognome" required className="input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="nuovoEmail">
                  Email (opzionale)
                </label>
                <input id="nuovoEmail" name="nuovoEmail" type="email" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="nuovoTelefono">
                  Telefono (opzionale)
                </label>
                <input id="nuovoTelefono" name="nuovoTelefono" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="nuovoCodiceFiscale">
                  Codice fiscale (opzionale)
                </label>
                <input
                  id="nuovoCodiceFiscale"
                  name="nuovoCodiceFiscale"
                  className="input uppercase"
                />
              </div>
              <div>
                <label className="label" htmlFor="nuovoIndirizzo">
                  Indirizzo (opzionale)
                </label>
                <input id="nuovoIndirizzo" name="nuovoIndirizzo" className="input" />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              La tariffa a seduta del nuovo paziente verrà impostata sull&apos;importo di questa
              fattura ({importo ? `${importo} €` : "da definire"}); puoi correggerla in seguito
              dalla sua scheda.
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h2 className="font-bold text-slate-800 mb-3">Pagamento</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <input
            type="checkbox"
            name="pagata"
            checked={pagata}
            onChange={(e) => setPagata(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          Fattura già pagata
        </label>
        {pagata && (
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
        )}
      </div>

      <div className="pt-2">
        <button type="submit" className="btn-primary">
          Importa fattura
        </button>
      </div>
    </form>
  );
}
