import zlib from "node:zlib";
import { sanitizeForDb } from "./utils";

// Estrattore di testo da PDF scritto "a mano", senza dipendenze esterne.
//
// Perché non una libreria come pdf-parse o pdfjs-dist: in questo ambiente di
// sviluppo non è stato possibile verificare una build reale di Next.js con
// queste librerie (richiedono spesso configurazioni particolari per bundling/
// worker, e alcune versioni recenti hanno anche avvisi di sicurezza che
// bloccherebbero il deploy su Railway). Un parser minimale basato solo sui
// moduli nativi di Node (zlib) evita questi rischi. Non è un parser PDF
// completo: legge gli stream di contenuto (FlateDecode) e ne estrae le
// stringhe mostrate con gli operatori Tj/TJ, il che copre bene i PDF "di
// testo" prodotti dalla maggior parte dei gestionali (incluso questo). Non
// gestisce font con codifica CID/Identity-H (comuni in PDF generati da
// stampa di pagine HTML con font personalizzati): in quel caso il testo
// estratto può risultare vuoto o illeggibile. Per questo l'estrazione è
// usata SOLO come suggerimento: l'utente rivede e corregge sempre i dati
// prima di confermare l'importazione.

function inflateSafe(buf: Buffer): Buffer | null {
  try {
    return zlib.inflateSync(buf);
  } catch {
    // ignora
  }
  try {
    return zlib.inflateRawSync(buf);
  } catch {
    // ignora
  }
  return null;
}

function decodePdfLiteralString(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\") {
      const next = raw[i + 1];
      if (next === "n") {
        out += "\n";
        i++;
      } else if (next === "r") {
        out += "\r";
        i++;
      } else if (next === "t") {
        out += "\t";
        i++;
      } else if (next === "b") {
        out += "\b";
        i++;
      } else if (next === "f") {
        out += "\f";
        i++;
      } else if (next === "(" || next === ")" || next === "\\") {
        out += next;
        i++;
      } else if (next >= "0" && next <= "7") {
        let oct = next;
        let j = i + 2;
        for (let k = 0; k < 2 && raw[j] >= "0" && raw[j] <= "7"; k++, j++) oct += raw[j];
        out += String.fromCharCode(parseInt(oct, 8) & 0xff);
        i = j - 1;
      } else if (next === "\n" || next === "\r") {
        i++; // line continuation
      } else {
        out += next;
        i++;
      }
    } else {
      out += c;
    }
  }
  return out;
}

function decodeHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (!Number.isNaN(byte)) out += String.fromCharCode(byte);
  }
  return out;
}

function decodeOneStringToken(token: string): string {
  if (token.startsWith("(")) return decodePdfLiteralString(token.slice(1, -1));
  if (token.startsWith("<")) return decodeHexString(token.slice(1, -1));
  return "";
}

function extractTextFromContentStream(streamText: string): string {
  let out = "";
  const tokenRegex =
    /(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*(Tj)|(\[(?:\\.|[^\[\]])*\])\s*(TJ)|\b(Td|TD|T\*|BT)\b/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(streamText))) {
    if (match[2] === "Tj") {
      out += decodeOneStringToken(match[1]);
    } else if (match[4] === "TJ") {
      const stringRegex = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>/g;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = stringRegex.exec(match[3]))) out += decodeOneStringToken(sMatch[0]);
    } else if (match[5]) {
      out += "\n";
    }
  }
  return out;
}

/** Estrae il testo "leggibile" da un PDF (best effort). Non lancia mai. */
export function extractPdfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    const streamRegex = /(<<(?:[^<>]|<<[^<>]*>>)*>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    const texts: string[] = [];
    while ((match = streamRegex.exec(raw))) {
      const dict = match[1];
      const streamBody = Buffer.from(match[2], "latin1");
      const isFlate =
        /\/Filter\s*\/FlateDecode/.test(dict) || /\/Filter\s*\[[^\]]*\/FlateDecode/.test(dict);
      let content: Buffer = streamBody;
      if (isFlate) {
        const inflated = inflateSafe(streamBody);
        if (!inflated) continue;
        content = inflated;
      }
      const text = content.toString("latin1");
      if (/\b(Tj|TJ)\b/.test(text)) texts.push(extractTextFromContentStream(text));
    }
    const joined = texts
      .join("\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
    // Alcuni PDF usano font con codifica a doppio byte (es. CID/Identity-H):
    // decodificandoli byte-per-byte come qui possono comparire byte NUL
    // (0x00) intervallati al testo vero, che Postgres rifiuta a scrittura.
    return sanitizeForDb(joined);
  } catch {
    return "";
  }
}

export type SuggerimentiFattura = {
  numero?: string;
  data?: Date;
  importo?: number;
  paziente?: string;
};

function suggerisciNumero(testo: string): string | undefined {
  const match = testo.match(
    /fattura\s*n[.°ro]{0,3}\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9/\-.]{0,19})/i
  );
  return match ? match[1].trim() : undefined;
}

function parseDataItaliana(dd: string, mm: string, yyyy: string): Date | undefined {
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  let year = parseInt(yyyy, 10);
  if (yyyy.length === 2) year += year < 50 ? 2000 : 1900;
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function suggerisciData(testo: string): Date | undefined {
  // Preferisce una data vicino alla parola "data"
  const vicinoData = testo.match(
    /data[^0-9]{0,20}(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i
  );
  if (vicinoData) {
    const d = parseDataItaliana(vicinoData[1], vicinoData[2], vicinoData[3]);
    if (d) return d;
  }
  const generica = testo.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (generica) return parseDataItaliana(generica[1], generica[2], generica[3]);
  return undefined;
}

function parseImportoItaliano(raw: string): number | undefined {
  // "1.234,56" -> 1234.56 ; "80,00" -> 80.00 ; "80.00" -> 80.00
  let s = raw.trim();
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function suggerisciImporto(testo: string): number | undefined {
  const vicinoTotale = testo.match(
    /total[ei][^\d€]{0,15}(?:€\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i
  );
  if (vicinoTotale) {
    const n = parseImportoItaliano(vicinoTotale[1]);
    if (n !== undefined) return n;
  }
  const conSimbolo = [...testo.matchAll(/€\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g)];
  if (conSimbolo.length > 0) {
    const n = parseImportoItaliano(conSimbolo[conSimbolo.length - 1][1]);
    if (n !== undefined) return n;
  }
  const euroTesto = [
    ...testo.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*(?:€|eur|euro)/gi),
  ];
  if (euroTesto.length > 0) {
    const n = parseImportoItaliano(euroTesto[euroTesto.length - 1][1]);
    if (n !== undefined) return n;
  }
  return undefined;
}

function suggerisciPaziente(testo: string): string | undefined {
  const labels = /(spett\.?\s*le|spett\.?|cliente|paziente|intestat[ao]rio|fatturato a)\s*[:\n]?\s*([^\n]{2,80})/i;
  const match = testo.match(labels);
  if (match) {
    const candidate = match[2].trim();
    // Evita di catturare righe che sembrano indirizzi/numeri invece di un nome
    if (candidate && !/^\d/.test(candidate) && candidate.length <= 60) {
      return candidate;
    }
  }
  return undefined;
}

/** Analizza il testo estratto e propone dei valori. Non lancia mai. */
export function suggerisciDatiFattura(testo: string): SuggerimentiFattura {
  if (!testo) return {};
  try {
    return {
      numero: suggerisciNumero(testo),
      data: suggerisciData(testo),
      importo: suggerisciImporto(testo),
      paziente: suggerisciPaziente(testo),
    };
  } catch {
    return {};
  }
}

export type AnalisiFatturaPdf = { testo: string } & SuggerimentiFattura;

/** Estrae testo e suggerimenti da un PDF caricato. Non lancia mai. */
export function analizzaFatturaPdf(buffer: Buffer): AnalisiFatturaPdf {
  const testo = extractPdfText(buffer);
  const suggerimenti = suggerisciDatiFattura(testo);
  return { testo, ...suggerimenti };
}
