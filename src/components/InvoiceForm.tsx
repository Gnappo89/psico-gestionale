"use client";

import { useMemo, useState } from "react";
import { formatDateInput } from "@/lib/utils";

type PatientOption = {
  id: string;
  nome: string;
  cognome: string;
  tariffaSeduta: number;
};

export function InvoiceForm({
  action,
  patients,
  defaultPatientId,
}: {
  action: (formData: FormData) => void;
  patients: PatientOption[];
  defaultPatientId?: string;
}) {
  const initialPatient = patients.find((p) => p.id === defaultPatientId) ?? patients[0];

  const [patientId, setPatientId] = useState(initialPatient?.id ?? "");
  const [importo, setImporto] = useState<string>(
    initialPatient ? String(initialPatient.tariffaSeduta) : ""
  );

  const meseCorrente = useMemo(() => {
    const nomi = [
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
    ];
    const now = new Date();
    return `${nomi[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  function handlePatientChange(id: string) {
    setPatientId(id);
    const p = patients.find((pp) => pp.id === id);
    if (p) setImporto(String(p.tariffaSeduta));
  }

  if (patients.length === 0) {
    return (
      <div className="card text-sm text-slate-500">
        Non hai ancora nessun paziente attivo. Aggiungine uno dalla sezione Pazienti prima di
        creare una fattura.
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5">
      <div>
        <label className="label" htmlFor="patientId">
          Paziente
        </label>
        <select
          id="patientId"
          name="patientId"
          required
          className="input"
          value={patientId}
          onChange={(e) => handlePatientChange(e.target.value)}
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.cognome} {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="data">
            Data fattura
          </label>
          <input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={formatDateInput(new Date())}
            className="input"
          />
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
      </div>

      <div>
        <label className="label" htmlFor="descrizione">
          Descrizione prestazione
        </label>
        <textarea
          id="descrizione"
          name="descrizione"
          rows={3}
          required
          defaultValue={`Sedute di psicoterapia - ${meseCorrente}`}
          className="input"
        />
      </div>

      <div className="pt-2">
        <button type="submit" className="btn-primary">
          Crea fattura
        </button>
      </div>
    </form>
  );
}
