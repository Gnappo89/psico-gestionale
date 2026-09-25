export function formatCurrency(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(",", ".")) || 0;
  // Prisma Decimal ha un metodo toNumber()
  if (value && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export function initials(nome: string, cognome: string): string {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();
}

/**
 * Rimuove il byte NUL (0x00) e altri caratteri di controllo non stampabili
 * da una stringa prima di salvarla nel database: Postgres rifiuta il byte
 * 0x00 nei campi di testo con l'errore "invalid byte sequence for encoding
 * UTF8". Può capitare leggendo il testo di PDF con codifiche dei font
 * particolari (es. font CID a doppio byte), quindi va applicato a qualsiasi
 * testo che potrebbe arrivare, anche indirettamente, da un PDF caricato.
 */
export function sanitizeForDb(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
