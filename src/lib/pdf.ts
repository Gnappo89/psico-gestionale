import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib";
import { formatCurrency, formatDate } from "./utils";

export type InvoicePdfData = {
  numero: string;
  data: Date;
  descrizione: string;
  importo: number;
  pagata: boolean;
  dataPagamento: Date | null;
  patient: {
    nome: string;
    cognome: string;
    codiceFiscale: string | null;
    indirizzo: string | null;
  };
  studio: {
    nomeStudio: string;
    nomePsicologa: string;
    indirizzoStudio: string;
    partitaIva: string;
    codiceFiscalePsicologa: string;
    numeroAlboIscrizione: string;
    iban: string;
  };
};

const BRAND: RGB = rgb(0.44, 0.32, 0.84); // viola brand
const DARK: RGB = rgb(0.15, 0.15, 0.18);
const GREY: RGB = rgb(0.42, 0.42, 0.46);
const LIGHT_LINE: RGB = rgb(0.85, 0.85, 0.9);

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 56;
  let y = height - 64;

  const drawText = (
    text: string,
    x: number,
    yy: number,
    opts: { size?: number; bold?: boolean; color?: RGB } = {}
  ) => {
    page.drawText(text, {
      x,
      y: yy,
      size: opts.size ?? 11,
      font: opts.bold ? fontBold : font,
      color: opts.color ?? DARK,
    });
  };

  const drawLine = (yy: number) => {
    page.drawLine({
      start: { x: marginX, y: yy },
      end: { x: width - marginX, y: yy },
      thickness: 1,
      color: LIGHT_LINE,
    });
  };

  // Intestazione studio
  drawText(data.studio.nomeStudio || "Studio di Psicologia", marginX, y, {
    size: 18,
    bold: true,
    color: BRAND,
  });
  y -= 20;
  if (data.studio.nomePsicologa) {
    drawText(data.studio.nomePsicologa, marginX, y, { size: 11 });
    y -= 15;
  }
  if (data.studio.indirizzoStudio) {
    drawText(data.studio.indirizzoStudio, marginX, y, { size: 10, color: GREY });
    y -= 14;
  }
  const fiscalLine = [
    data.studio.partitaIva ? `P.IVA ${data.studio.partitaIva}` : null,
    data.studio.codiceFiscalePsicologa ? `CF ${data.studio.codiceFiscalePsicologa}` : null,
    data.studio.numeroAlboIscrizione ? `Albo n. ${data.studio.numeroAlboIscrizione}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (fiscalLine) {
    drawText(fiscalLine, marginX, y, { size: 10, color: GREY });
    y -= 14;
  }

  // Numero e data fattura, allineati a destra
  const titolo = `FATTURA N. ${data.numero}`;
  const titoloWidth = fontBold.widthOfTextAtSize(titolo, 14);
  drawText(titolo, width - marginX - titoloWidth, height - 64, { size: 14, bold: true });
  const dataLabel = `Data: ${formatDate(data.data)}`;
  const dataWidth = font.widthOfTextAtSize(dataLabel, 10);
  drawText(dataLabel, width - marginX - dataWidth, height - 82, { size: 10, color: GREY });

  y -= 20;
  drawLine(y);
  y -= 28;

  // Dati cliente
  drawText("Fatturato a", marginX, y, { size: 9, color: GREY });
  y -= 16;
  drawText(`${data.patient.nome} ${data.patient.cognome}`, marginX, y, { size: 12, bold: true });
  y -= 16;
  if (data.patient.codiceFiscale) {
    drawText(`CF ${data.patient.codiceFiscale}`, marginX, y, { size: 10, color: GREY });
    y -= 14;
  }
  if (data.patient.indirizzo) {
    drawText(data.patient.indirizzo, marginX, y, { size: 10, color: GREY });
    y -= 14;
  }

  y -= 20;

  // Tabella: intestazione
  const colDescX = marginX;
  const colImportoX = width - marginX - 100;
  page.drawRectangle({
    x: marginX,
    y: y - 8,
    width: width - marginX * 2,
    height: 26,
    color: rgb(0.95, 0.94, 0.99),
  });
  drawText("Descrizione", colDescX + 8, y, { size: 10, bold: true, color: BRAND });
  drawText("Importo", colImportoX, y, { size: 10, bold: true, color: BRAND });
  y -= 34;

  // Riga voce (word-wrap semplice a ~70 caratteri)
  const descrizioneLines = wrapText(data.descrizione, 68);
  for (const line of descrizioneLines) {
    drawText(line, colDescX + 8, y, { size: 10.5 });
    y -= 15;
  }
  const importoStr = formatCurrency(data.importo);
  drawText(importoStr, colImportoX, y + (descrizioneLines.length - 1) * 15, {
    size: 10.5,
    bold: true,
  });

  y -= 14;
  drawLine(y);
  y -= 26;

  // Totale
  const totaleLabel = "Totale";
  drawText(totaleLabel, colImportoX - 90, y, { size: 12, bold: true });
  drawText(formatCurrency(data.importo), colImportoX, y, { size: 12, bold: true, color: BRAND });
  y -= 34;

  // Regime forfettario - dicitura obbligatoria
  drawLine(y);
  y -= 20;
  const note1 =
    "Operazione effettuata ai sensi dell'art. 1, commi 54-89, Legge n. 190/2014 (regime forfettario):";
  const note2 = "operazione non soggetta ad IVA, non soggetta a ritenuta d'acconto.";
  drawText(note1, marginX, y, { size: 9, color: GREY });
  y -= 13;
  drawText(note2, marginX, y, { size: 9, color: GREY });
  y -= 13;
  if (data.importo > 77.47) {
    drawText(
      "Imposta di bollo di € 2,00 assolta (dovuta per importi superiori a € 77,47, se applicabile).",
      marginX,
      y,
      { size: 9, color: GREY }
    );
    y -= 13;
  }

  // Stato pagamento
  y -= 10;
  const statoLabel = data.pagata
    ? `Fattura pagata${data.dataPagamento ? " il " + formatDate(data.dataPagamento) : ""}`
    : "Fattura da pagare";
  drawText(statoLabel, marginX, y, {
    size: 10.5,
    bold: true,
    color: data.pagata ? rgb(0.08, 0.55, 0.4) : rgb(0.85, 0.35, 0.1),
  });

  if (!data.pagata && data.studio.iban) {
    y -= 16;
    drawText(`Coordinate per il pagamento — IBAN: ${data.studio.iban}`, marginX, y, {
      size: 9,
      color: GREY,
    });
  }

  // Footer
  drawText(
    "Documento generato dal gestionale dello studio.",
    marginX,
    40,
    { size: 8, color: LIGHT_LINE }
  );

  return pdfDoc.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
