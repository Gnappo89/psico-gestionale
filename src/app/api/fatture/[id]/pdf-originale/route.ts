import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });

  if (!invoice || !invoice.pdfOriginale) {
    return NextResponse.json({ error: "PDF originale non disponibile" }, { status: 404 });
  }

  const filename = (
    invoice.pdfOriginaleNomeFile || `fattura-${invoice.numero.replace(/\//g, "-")}.pdf`
  ).replace(/"/g, "");

  return new NextResponse(Buffer.from(invoice.pdfOriginale), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
