import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { stagingId: string } }
) {
  const staging = await prisma.importazioneStaging.findUnique({
    where: { id: params.stagingId },
  });

  if (!staging) {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }

  const filename = (staging.nomeFileOriginale || "fattura.pdf").replace(/"/g, "");

  return new NextResponse(Buffer.from(staging.pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
