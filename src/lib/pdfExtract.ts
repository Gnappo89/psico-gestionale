import zlib from "node:zlib";
import { sanitizeForDb } from "./utils";

// Estrattore di testo da PDF scritto "a mano", senza dipendenze esterne.
//
// Perché non una libreria come pdf-parse o pdfjs-dist: in questo ambiente di
// sviluppo non è stato possibile verificare una build reale di Next.js con
// queste librerie (richiedono spesso configurazioni particolari per bundling/
// worker, e alcune versioni recenti hanno anche avvisi di sicurezza che
// bloccherebbero il deploy su Railway, come già successo in questo progetto).
// Un parser minimale basato solo sui moduli nativi di Node (zlib) evita
// questi rischi.
//
// Non è un parser PDF completo, ma copre i casi reali più comuni:
// - Trova tutti gli oggetti del PDF, inclusi quelli compressi dentro
//   "object stream" (/Type /ObjStm, usati da molti generatori moderni per
//   comprimere pagine/risorse/font in un unico blocco).
// - Per ogni pagina, risale ai font usati (operatore Tf) e, quando il font
//   ha una mappa /ToUnicode (quasi sempre presente nei PDF "di testo",
//   anche quelli con font CID/Identity-H), decodifica le stringhe mostrate
//   con Tj/TJ passando dai codici carattere ai veri caratteri Unicode
//   tramite quella mappa, invece di assumere una codifica a byte singolo.
// - Se un font non ha /ToUnicode (raro, ma possibile), il testo di quel
//   font resta illeggibile: è un limite noto di un parser senza accesso al
//   font vero e proprio.
//
// In ogni caso l'estrazione è usata SOLO come suggerimento: l'utente rivede
// e corregge sempre i dati prima di confermare l'importazione, quindi un
//'estrazione parziale o vuota non blocca mai il flusso.

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

// ---------------------------------------------------------------------
// Livello 1: indicizzazione "grezza" degli oggetti del PDF
// ---------------------------------------------------------------------

type PdfObject = { dict: string; streamBytes?: Buffer };

/** Indicizza tutti gli oggetti classici "N G obj ... endobj" per numero. */
function indexObjects(raw: string): Map<number, PdfObject> {
  const objects = new Map<number, PdfObject>();
  const objRegex = /(\d+)\s+\d+\s+obj([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = objRegex.exec(raw))) {
    const num = parseInt(m[1], 10);
    const body = m[2];
    const streamMatch = body.match(/^([\s\S]*?)stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (streamMatch) {
      objects.set(num, {
        dict: streamMatch[1],
        streamBytes: Buffer.from(streamMatch[2], "latin1"),
      });
    } else if (!objects.has(num)) {
      objects.set(num, { dict: body });
    }
  }
  return objects;
}

function resolveStreamBytes(obj: PdfObject): Buffer | null {
  if (!obj.streamBytes) return null;
  const isFlate =
    /\/Filter\s*\/FlateDecode/.test(obj.dict) || /\/Filter\s*\[[^\]]*\/FlateDecode/.test(obj.dict);
  if (isFlate) return inflateSafe(obj.streamBytes);
  return obj.streamBytes;
}

/**
 * Molti generatori PDF moderni comprimono le pagine, le risorse e i
 * dizionari dei font dentro un "object stream" per ridurre la dimensione
 * del file. Questi oggetti compressi non sono visibili scansionando il
 * file alla cieca (il loro testo è dentro dati compressi con zlib), quindi
 * vanno espansi ed aggiunti alla stessa mappa di oggetti.
 */
function expandObjectStreams(objects: Map<number, PdfObject>): void {
  for (const obj of Array.from(objects.values())) {
    if (!/\/Type\s*\/ObjStm\b/.test(obj.dict)) continue;
    const bytes = resolveStreamBytes(obj);
    if (!bytes) continue;
    const nMatch = obj.dict.match(/\/N\s+(\d+)/);
    const firstMatch = obj.dict.match(/\/First\s+(\d+)/);
    if (!nMatch || !firstMatch) continue;
    const first = parseInt(firstMatch[1], 10);
    const text = bytes.toString("latin1");
    const header = text.slice(0, first).trim();
    const pairs = header.split(/\s+/).map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n));
    const body = text.slice(first);
    for (let i = 0; i < pairs.length; i += 2) {
      const objNum = pairs[i];
      const offset = pairs[i + 1];
      if (!Number.isFinite(objNum) || !Number.isFinite(offset)) continue;
      const nextOffset = i + 3 < pairs.length ? pairs[i + 3] : body.length;
      if (!objects.has(objNum)) {
        objects.set(objNum, { dict: body.slice(offset, nextOffset) });
      }
    }
  }
}

/** Estrae il contenuto di un dizionario bilanciato "<< ... >>" a partire da fromIndex. */
function extractBalancedDict(text: string, fromIndex: number): string | null {
  const start = text.indexOf("<<", fromIndex);
  if (start === -1) return null;
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.startsWith("<<", i)) {
      depth++;
      i += 2;
      continue;
    }
    if (text.startsWith(">>", i)) {
      depth--;
      i += 2;
      if (depth === 0) return text.slice(start + 2, i - 2);
      continue;
    }
    i++;
  }
  return null;
}

/**
 * Risolve il valore di una chiave di un dizionario PDF che può essere sia
 * un riferimento indiretto ("/Chiave 5 0 R") sia un dizionario inline
 * ("/Chiave << ... >>"), restituendo sempre il testo del dizionario finale.
 */
function resolveSubDict(objects: Map<number, PdfObject>, containerDict: string, key: string): string {
  const idx = containerDict.indexOf("/" + key);
  if (idx === -1) return "";
  const after = containerDict.slice(idx + key.length + 1);
  const refMatch = after.match(/^\s*(\d+)\s+0\s+R/);
  if (refMatch) {
    const obj = objects.get(parseInt(refMatch[1], 10));
    return obj ? obj.dict : "";
  }
  return extractBalancedDict(containerDict, idx) ?? "";
}

// ---------------------------------------------------------------------
// Livello 2: mappe ToUnicode e risoluzione dei font
// ---------------------------------------------------------------------

/** Interpreta una stringa esadecimale come sequenza di code unit UTF-16BE. */
function hexToUtf16String(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 3 < clean.length + 1 && i + 1 < clean.length; i += 4) {
    const code = parseInt(clean.slice(i, i + 4), 16);
    if (!Number.isNaN(code)) out += String.fromCharCode(code);
  }
  return out;
}

/** Analizza le sezioni bfchar/bfrange di una CMap /ToUnicode. */
function parseToUnicodeCMap(cmapText: string): Map<number, string> {
  const map = new Map<number, string>();

  const bfcharBlocks = cmapText.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
  for (const block of bfcharBlocks) {
    const pairRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let m: RegExpExecArray | null;
    while ((m = pairRegex.exec(block))) {
      map.set(parseInt(m[1], 16), hexToUtf16String(m[2]));
    }
  }

  const bfrangeBlocks = cmapText.match(/beginbfrange([\s\S]*?)endbfrange/g) || [];
  for (const block of bfrangeBlocks) {
    const arrayRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = arrayRegex.exec(block))) {
      const lo = parseInt(m[1], 16);
      const items = [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map((x) => x[1]);
      items.forEach((hex, idx) => map.set(lo + idx, hexToUtf16String(hex)));
    }
    const simpleRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let m2: RegExpExecArray | null;
    while ((m2 = simpleRegex.exec(block))) {
      const lo = parseInt(m2[1], 16);
      const hi = parseInt(m2[2], 16);
      const dstStart = parseInt(m2[3], 16);
      const dstLen = m2[3].length;
      for (let code = lo; code <= hi; code++) {
        if (!map.has(code)) {
          map.set(code, hexToUtf16String((dstStart + (code - lo)).toString(16).padStart(dstLen, "0")));
        }
      }
    }
  }

  return map;
}

type FontInfo = { byteWidth: 1 | 2; toUnicode?: Map<number, string> };

function buildFontInfo(objects: Map<number, PdfObject>, fontObjNum: number): FontInfo {
  const fontObj = objects.get(fontObjNum);
  if (!fontObj) return { byteWidth: 1 };
  const isComposite = /\/Subtype\s*\/Type0/.test(fontObj.dict);
  const byteWidth: 1 | 2 = isComposite ? 2 : 1;
  const toUnicodeMatch = fontObj.dict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
  if (!toUnicodeMatch) return { byteWidth };
  const cmapObj = objects.get(parseInt(toUnicodeMatch[1], 10));
  if (!cmapObj) return { byteWidth };
  const bytes = resolveStreamBytes(cmapObj);
  if (!bytes) return { byteWidth };
  return { byteWidth, toUnicode: parseToUnicodeCMap(bytes.toString("latin1")) };
}

/** Mappa i nomi risorsa dei font (es. "/F1") ai numeri oggetto corrispondenti. */
function findFontResourceMap(objects: Map<number, PdfObject>, resourcesDict: string): Map<string, number> {
  const result = new Map<string, number>();
  const fontDictText = resolveSubDict(objects, resourcesDict, "Font");
  if (!fontDictText) return result;
  const pairRegex = /\/([A-Za-z0-9#+._-]+)\s+(\d+)\s+0\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = pairRegex.exec(fontDictText))) {
    result.set(m[1], parseInt(m[2], 10));
  }
  return result;
}

// ---------------------------------------------------------------------
// Livello 3: decodifica delle stringhe di testo (Tj/TJ) tramite il font attivo
// ---------------------------------------------------------------------

function decodePdfLiteralStringToBytes(raw: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\") {
      const next = raw[i + 1];
      if (next === "n") {
        out.push(10);
        i++;
      } else if (next === "r") {
        out.push(13);
        i++;
      } else if (next === "t") {
        out.push(9);
        i++;
      } else if (next === "b") {
        out.push(8);
        i++;
      } else if (next === "f") {
        out.push(12);
        i++;
      } else if (next === "(" || next === ")" || next === "\\") {
        out.push(next.charCodeAt(0));
        i++;
      } else if (next >= "0" && next <= "7") {
        let oct = next;
        let j = i + 2;
        for (let k = 0; k < 2 && raw[j] >= "0" && raw[j] <= "7"; k++, j++) oct += raw[j];
        out.push(parseInt(oct, 8) & 0xff);
        i = j - 1;
      } else if (next === "\n" || next === "\r") {
        i++; // continuazione di riga, nessun byte
      } else if (next !== undefined) {
        out.push(next.charCodeAt(0));
        i++;
      }
    } else {
      out.push(c.charCodeAt(0) & 0xff);
    }
  }
  return out;
}

function tokenToBytes(token: string): number[] {
  if (token.startsWith("(")) return decodePdfLiteralStringToBytes(token.slice(1, -1));
  if (token.startsWith("<")) {
    const clean = token.slice(1, -1).replace(/\s+/g, "");
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      const b = parseInt(clean.slice(i, i + 2), 16);
      if (!Number.isNaN(b)) bytes.push(b);
    }
    return bytes;
  }
  return [];
}

function decodeStringWithFont(token: string, font: FontInfo | undefined): string {
  const bytes = tokenToBytes(token);
  if (font?.toUnicode) {
    let out = "";
    const w = font.byteWidth;
    for (let i = 0; i + w <= bytes.length; i += w) {
      let code = 0;
      for (let k = 0; k < w; k++) code = (code << 8) | bytes[i + k];
      out += font.toUnicode.get(code) ?? "";
    }
    return out;
  }
  // Nessuna mappa ToUnicode per il font attivo (o nessun font individuato):
  // fallback alla vecchia interpretazione byte-per-byte, valida solo per
  // font semplici con codifica standard (Latin-1/WinAnsi "pura").
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

function extractTextFromContentStream(
  streamText: string,
  fontMap: Map<string, number>,
  getFontInfo: (num: number) => FontInfo
): string {
  let out = "";
  let activeFont: FontInfo | undefined;
  const tokenRegex =
    /\/([A-Za-z0-9#+._-]+)\s+[\d.]+\s+Tf|(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*Tj|(\[(?:\\.|[^\[\]])*\])\s*TJ|\b(Td|TD|T\*|BT|Tm)\b/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(streamText))) {
    if (match[1] !== undefined) {
      const fontNum = fontMap.get(match[1]);
      activeFont = fontNum !== undefined ? getFontInfo(fontNum) : undefined;
    } else if (match[2] !== undefined) {
      out += decodeStringWithFont(match[2], activeFont);
    } else if (match[3] !== undefined) {
      const stringRegex = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>/g;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = stringRegex.exec(match[3]))) out += decodeStringWithFont(sMatch[0], activeFont);
    } else if (match[4]) {
      out += "\n";
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// Livello 4: estrazione per pagina, con fallback "alla cieca"
// ---------------------------------------------------------------------

function extractPagesText(objects: Map<number, PdfObject>): string[] {
  const texts: string[] = [];
  for (const obj of objects.values()) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(obj.dict)) continue;

    const resourcesDict = resolveSubDict(objects, obj.dict, "Resources");
    const fontMap = findFontResourceMap(objects, resourcesDict);
    const fontInfoCache = new Map<number, FontInfo>();
    const getFontInfo = (num: number): FontInfo => {
      let info = fontInfoCache.get(num);
      if (!info) {
        info = buildFontInfo(objects, num);
        fontInfoCache.set(num, info);
      }
      return info;
    };

    const contentsMatch = obj.dict.match(/\/Contents\s+(\[[^\]]*\]|\d+\s+0\s+R)/);
    if (!contentsMatch) continue;
    const refNums = [...contentsMatch[1].matchAll(/(\d+)\s+0\s+R/g)].map((m) => parseInt(m[1], 10));
    let contentText = "";
    for (const refNum of refNums) {
      const contentObj = objects.get(refNum);
      if (!contentObj) continue;
      const bytes = resolveStreamBytes(contentObj);
      if (bytes) contentText += bytes.toString("latin1") + "\n";
    }
    if (!contentText) continue;

    texts.push(extractTextFromContentStream(contentText, fontMap, getFontInfo));
  }
  return texts;
}

/**
 * Fallback "alla cieca": scansiona tutti gli stream FlateDecode del file
 * cercando operatori Tj/TJ, senza risalire a pagine/font/ToUnicode. Usato
 * solo quando l'estrazione strutturata per pagina non trova nulla (es. PDF
 * con una struttura di oggetti che questo parser minimale non riconosce).
 * Funziona bene per font semplici con codifica standard; con font CID può
 * produrre testo illeggibile o vuoto, per questo è solo un fallback.
 */
function extractPdfTextLegacy(raw: string): string {
  const streamRegex = /(<<(?:[^<>]|<<[^<>]*>>)*>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  const texts: string[] = [];
  const emptyFontMap = new Map<string, number>();
  const noFontInfo = (): FontInfo => ({ byteWidth: 1 });
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
    if (/\b(Tj|TJ)\b/.test(text)) {
      texts.push(extractTextFromContentStream(text, emptyFontMap, noFontInfo));
    }
  }
  return texts.join("\n");
}

/** Estrae il testo "leggibile" da un PDF (best effort). Non lancia mai. */
export function extractPdfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    const objects = indexObjects(raw);
    expandObjectStreams(objects);

    let combined = extractPagesText(objects).join("\n");
    if (!combined.trim()) {
      combined = extractPdfTextLegacy(raw);
    }

    const joined = combined
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
    // Alcuni PDF usano font con codifica a doppio byte (es. CID/Identity-H)
    // senza una mappa ToUnicode risolvibile: decodificandoli byte-per-byte
    // come fallback possono comparire byte NUL (0x00) intervallati al testo
    // vero, che Postgres rifiuta a scrittura.
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
    /fattura\s*n?[.°ro]{0,3}\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9/\-.]{0,19})/i
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
  // Preferisce la data della fattura vera e propria ("Fattura ... del
  // DD/MM/YYYY", dicitura tipica): evita di confondersi con altre date nel
  // documento (es. data di iscrizione all'albo professionale). "\s" qui
  // include gli "a capo" che il parser inserisce tra un elemento di testo e
  // l'altro, quindi funziona anche quando numero e data sono su righe
  // diverse nel PDF originale.
  const conDel = testo.match(
    /fattura[\s\S]{0,40}?\bdel\b[\s\S]{0,10}?(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i
  );
  if (conDel) {
    const d = parseDataItaliana(conDel[1], conDel[2], conDel[3]);
    if (d) return d;
  }
  // Poi una data vicino alla parola "data" (non troppo lontana, per evitare
  // date di nascita/iscrizione che compaiono altrove nel documento)
  const vicinoData = testo.match(
    /\bdata\b[^0-9]{0,15}(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/i
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
  const vicinoTotale = [
    ...testo.matchAll(/total[ei][^\d€]{0,15}(?:€\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi),
  ];
  if (vicinoTotale.length > 0) {
    const n = parseImportoItaliano(vicinoTotale[vicinoTotale.length - 1][1]);
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
  const labels =
    /(spett\.?\s*le|spett\.?|cliente|paziente|intestat[ao]rio|fatturato a|destinatario)\s*[:\n]?\s*([^\n]{2,80})/i;
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
