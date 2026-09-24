import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER o GMAIL_APP_PASSWORD non configurate: imposta queste variabili d'ambiente per abilitare l'invio email."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendInvoiceEmail(params: {
  to: string;
  patientName: string;
  invoiceNumber: string;
  amountLabel: string;
  pdfBytes: Uint8Array;
  fromName?: string;
}) {
  const transporter = getTransporter();
  const fromName = params.fromName || "Studio di Psicologia";
  const user = process.env.GMAIL_USER;

  await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: params.to,
    subject: `Fattura n. ${params.invoiceNumber}`,
    text: `Gentile ${params.patientName},\n\nin allegato la fattura n. ${params.invoiceNumber} di importo ${params.amountLabel}.\n\nCordiali saluti,\n${fromName}`,
    attachments: [
      {
        filename: `fattura-${params.invoiceNumber.replace(/\//g, "-")}.pdf`,
        content: Buffer.from(params.pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });
}
