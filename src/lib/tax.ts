// Calcolo (indicativo) del netto in regime forfettario, a "principio di
// cassa": si tassa quanto e' stato effettivamente incassato nell'anno, non
// quanto e' stato fatturato. Questi calcoli sono una stima utile per farsi
// un'idea dell'accantonamento necessario: per la dichiarazione dei redditi
// fa sempre fede il calcolo del proprio commercialista.

export type TaxParams = {
  coefficienteRedditivita: number; // es. 0.78
  aliquotaImposta: number; // es. 0.15
  aliquotaContributi: number; // es. 0 se non versati tramite lo studio
};

export type TaxBreakdown = {
  incassato: number;
  redditoImponibileLordo: number;
  contributiPrevidenziali: number;
  redditoImponibileNetto: number;
  impostaSostitutiva: number;
  totaleTasseEContributi: number;
  nettoStimato: number;
};

export function computeTaxBreakdown(incassato: number, params: TaxParams): TaxBreakdown {
  const redditoImponibileLordo = round2(incassato * params.coefficienteRedditivita);
  const contributiPrevidenziali = round2(redditoImponibileLordo * params.aliquotaContributi);
  // I contributi previdenziali versati sono deducibili dal reddito imponibile
  // prima di applicare l'imposta sostitutiva.
  const redditoImponibileNetto = round2(
    Math.max(0, redditoImponibileLordo - contributiPrevidenziali)
  );
  const impostaSostitutiva = round2(redditoImponibileNetto * params.aliquotaImposta);
  const totaleTasseEContributi = round2(contributiPrevidenziali + impostaSostitutiva);
  const nettoStimato = round2(incassato - totaleTasseEContributi);

  return {
    incassato: round2(incassato),
    redditoImponibileLordo,
    contributiPrevidenziali,
    redditoImponibileNetto,
    impostaSostitutiva,
    totaleTasseEContributi,
    nettoStimato,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
