import "@/lib/pdf-polyfill";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { bookId } = await params;

  try {

    const book = await (prisma as any).book.findUnique({
      where: { id: bookId }
    });

    if (!book || !book.contentUrl) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    let absoluteUrl = book.contentUrl;
    if (book.contentUrl.startsWith("/")) {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      absoluteUrl = `${baseUrl}${book.contentUrl}`;
    }

    const pdfRes = await fetch(absoluteUrl);
    if (!pdfRes.ok) throw new Error(`No se pudo descargar el PDF de la URL: ${absoluteUrl} (Status: ${pdfRes.status})`);
    
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    console.log(`[EXTRACT] PDF descargado. Tamaño: ${pdfBuffer.length} bytes`);

    const { PDFParse } = require("pdf-parse");
    const pages: string[] = [];
    let parser: any = null;

    try {
      parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();
      for (const p of textResult.pages || []) {
        pages.push((p.text || "").trim());
      }
    } catch (parseErr: any) {
      console.error("[EXTRACT] PDF Parse error:", parseErr);
      throw new Error(`Error en el motor de lectura de PDF: ${parseErr.message}`);
    } finally {
      try { await parser?.destroy?.(); } catch {}
    }

    if (pages.length === 0) {
      throw new Error("El motor de extracción no encontró ninguna página con texto en este PDF.");
    }

    return NextResponse.json({ 
      pages, 
      count: pages.length,
      title: book.title 
    });
  } catch (error: any) {
    console.error("Error extracting text:", error);
    return NextResponse.json({ 
      message: "Fallo en la extracción de texto", 
      error: error.message,
      bookId
    }, { status: 500 });
  }
}
