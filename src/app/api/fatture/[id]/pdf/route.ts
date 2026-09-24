import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInvoicePdf } from "@/lib/pdf";
import { getStudioSettings } from "@/lib/settings";
import { toNumber } from "@/lib/utils";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { patient: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Fattura non trovata" }, { status: 404 });
  }

  const studio = await getStudioSettings();

  const pdfBytes = await generateInvoicePdf({
    numero: invoice.numero,
    data: invoice.data,
    descrizione: invoice.descrizione,
    importo: toNumber(invoice.importo),
    pagata: invoice.pagata,
    dataPagamento: invoice.dataPagamento,
    patient: invoice.patient,
    studio,
  });

  const filename = `fattura-${invoice.numero.replace(/\//g, "-")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
