type PatientFormValues = {
  nome?: string;
  cognome?: string;
  codiceFiscale?: string | null;
  email?: string | null;
  telefono?: string | null;
  indirizzo?: string | null;
  tariffaSeduta?: number | string;
  note?: string | null;
  attivo?: boolean;
};

export function PatientForm({
  action,
  defaultValues,
  showAttivo = false,
  submitLabel = "Salva paziente",
}: {
  action: (formData: FormData) => void;
  defaultValues?: PatientFormValues;
  showAttivo?: boolean;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="card space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={defaultValues?.nome}
            className="input"
            placeholder="Maria"
          />
        </div>
        <div>
          <label className="label" htmlFor="cognome">
            Cognome
          </label>
          <input
            id="cognome"
            name="cognome"
            required
            defaultValue={defaultValues?.cognome}
            className="input"
            placeholder="Rossi"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className="input"
            placeholder="maria.rossi@esempio.it"
          />
        </div>
        <div>
          <label className="label" htmlFor="telefono">
            Telefono
          </label>
          <input
            id="telefono"
            name="telefono"
            defaultValue={defaultValues?.telefono ?? ""}
            className="input"
            placeholder="333 1234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="codiceFiscale">
            Codice fiscale
          </label>
          <input
            id="codiceFiscale"
            name="codiceFiscale"
            defaultValue={defaultValues?.codiceFiscale ?? ""}
            className="input uppercase"
            placeholder="RSSMRA80A01H501U"
          />
        </div>
        <div>
          <label className="label" htmlFor="tariffaSeduta">
            Tariffa a seduta (€)
          </label>
          <input
            id="tariffaSeduta"
            name="tariffaSeduta"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.tariffaSeduta as number | undefined}
            className="input"
            placeholder="70.00"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="indirizzo">
          Indirizzo
        </label>
        <input
          id="indirizzo"
          name="indirizzo"
          defaultValue={defaultValues?.indirizzo ?? ""}
          className="input"
          placeholder="Via Roma 1, Milano"
        />
      </div>

      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={defaultValues?.note ?? ""}
          className="input"
          placeholder="Note private, promemoria, ecc."
        />
      </div>

      {showAttivo && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="attivo"
            defaultChecked={defaultValues?.attivo ?? true}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          Paziente attivo
        </label>
      )}

      <div className="pt-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
