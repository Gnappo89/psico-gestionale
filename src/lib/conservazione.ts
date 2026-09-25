import { createHash } from "crypto";

// Integrazione con InfoCert LegalDoc per la conservazione digitale a norma
// delle fatture pagate.
//
// IMPORTANTE: LegalDoc non è un servizio "self-service" con una singola API
// key: richiede un contratto attivo (Accordo + Atto di Affidamento al
// Responsabile della Conservazione), al termine del quale InfoCert assegna
// le credenziali di accesso e la "Scheda Dati Tecnici" che definisce nel
// dettaglio l'endpoint da chiamare e i metadati obbligatori per la classe
// documentale scelta (per le fatture, in LegalDoc Lite, la classe standard è
// "ll_lg_fattu").
//
// Questo file implementa la struttura della chiamata (pacchetto XML con i
// metadati del documento + hash del PDF, invio via HTTPS) basandosi sulla
// documentazione tecnica pubblica di LegalDoc, ma l'endpoint esatto e
// l'elenco definitivo dei metadati vanno confermati con la Scheda Dati
// Tecnici ricevuta da InfoCert all'attivazione del contratto: finché
// LEGALDOC_BASE_URL non è impostata, ogni invio restituisce un errore
// chiaro invece di chiamare un endpoint indovinato.

export type ConservazioneResult = {
  identificativo: string; // riferimento IPdA restituito da LegalDoc
  dataAccettazione: Date;
};

export function isConservazioneConfigured(): boolean {
  return Boolean(process.env.LEGALDOC_BASE_URL && process.env.LEGALDOC_API_KEY);
}

export type DocumentoDaConservare = {
  numero: string;
  data: Date;
  importo: number;
  descrizione: string;
  patientNome: string;
  patientCognome: string;
  patientCodiceFiscale: string | null;
  classeDocumentale: string;
  pdfBytes: Uint8Array;
};

export async function inviaInConservazione(
  doc: DocumentoDaConservare
): Promise<ConservazioneResult> {
  const baseUrl = process.env.LEGALDOC_BASE_URL;
  const apiKey = process.env.LEGALDOC_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Conservazione digitale non configurata: imposta LEGALDOC_BASE_URL e LEGALDOC_API_KEY " +
        "(li trovi nella Scheda Dati Tecnici fornita da InfoCert all'attivazione del contratto LegalDoc)."
    );
  }

  const hash = createHash("sha256").update(doc.pdfBytes).digest("hex");
  const indiceXml = buildIndiceXml(doc, hash);

  const formData = new FormData();
  formData.append(
    "documento",
    new Blob([doc.pdfBytes], { type: "application/pdf" }),
    `fattura-${doc.numero.replace(/\//g, "-")}.pdf`
  );
  formData.append("indice", new Blob([indiceXml], { type: "application/xml" }), "indice.xml");

  let response: Response;
  try {
    response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });
  } catch (err) {
    throw new Error(
      `Impossibile contattare LegalDoc (${baseUrl}): ${
        err instanceof Error ? err.message : "errore di rete"
      }`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `LegalDoc ha rifiutato l'invio della fattura ${doc.numero} (HTTP ${response.status}): ${body.slice(
        0,
        500
      )}`
    );
  }

  const data = await response.json().catch(() => null);
  const identificativo = data?.identificativo ?? data?.ipda ?? data?.id;

  if (!identificativo) {
    throw new Error(
      `LegalDoc ha risposto senza un identificativo di conservazione (IPdA) per la fattura ${doc.numero}: risposta imprevista, verifica il formato con la documentazione InfoCert.`
    );
  }

  return {
    identificativo: String(identificativo),
    dataAccettazione: new Date(),
  };
}

// Pacchetto indice XML con i metadati minimi richiesti dalle Linee Guida
// AgID (Allegato 5) per un documento di tipo fattura. Da adattare secondo la
// Scheda Dati Tecnici specifica del contratto.
function buildIndiceXml(doc: DocumentoDaConservare, hashSha256: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<pacchettoVersamento>
  <classeDocumentale>${esc(doc.classeDocumentale)}</classeDocumentale>
  <documento>
    <numero>${esc(doc.numero)}</numero>
    <data>${doc.data.toISOString().slice(0, 10)}</data>
    <importo>${doc.importo.toFixed(2)}</importo>
    <descrizione>${esc(doc.descrizione)}</descrizione>
    <impronta algoritmo="SHA-256">${hashSha256}</impronta>
  </documento>
  <soggettoDestinatario>
    <nome>${esc(doc.patientNome)}</nome>
    <cognome>${esc(doc.patientCognome)}</cognome>
    ${doc.patientCodiceFiscale ? `<codiceFiscale>${esc(doc.patientCodiceFiscale)}</codiceFiscale>` : ""}
  </soggettoDestinatario>
</pacchettoVersamento>`;
}
