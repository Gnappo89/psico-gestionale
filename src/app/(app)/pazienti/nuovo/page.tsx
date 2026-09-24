import { PatientForm } from "@/components/PatientForm";
import { createPatientAction } from "../actions";

export default function NuovoPazientePage() {
  return (
    <div className="py-6 md:py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nuovo paziente</h1>
        <p className="text-slate-500 text-sm mt-1">Aggiungi anagrafica e tariffa a seduta</p>
      </div>
      <PatientForm action={createPatientAction} submitLabel="Aggiungi paziente" />
    </div>
  );
}
