import "@/lib/pdf-polyfill";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

const CACHE_VERSION = "v7";

function cacheKey(text: string, targetLanguage: string) {
  const hash = createHash("sha1").update(text).digest("hex");
  return `${CACHE_VERSION}::${targetLanguage}::${hash}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { bookId, targetLanguage } = await req.json();
    if (!bookId || !targetLanguage) {
      return NextResponse.json({ message: "Faltan datos" }, { status: 400 });
    }

    const book = await (prisma as any).book.findUnique({
      where: { id: bookId }
    });

    if (!book || !book.contentUrl) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    console.log(`[ADMIN-TRANSLATE] Iniciando para Libro: ${bookId}, Lang: ${targetLanguage}`);

    // 1. Fetch PDF
    let absoluteUrl = book.contentUrl;
    if (book.contentUrl.startsWith("/")) {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      absoluteUrl = `${baseUrl}${book.contentUrl}`;
    }

    console.log(`[ADMIN-TRANSLATE] Descargando PDF de: ${absoluteUrl}`);
    const pdfRes = await fetch(absoluteUrl);
    if (!pdfRes.ok) throw new Error(`No se pudo descargar el PDF (${pdfRes.status})`);
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // 2. Parse PDF page by page
    console.log(`[ADMIN-TRANSLATE] Parseando PDF...`);
    const pdfParse = require("pdf-parse");
    
    const pages: string[] = [];
    try {
      await pdfParse(pdfBuffer, {
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let result = "";
            let lastY: number | null = null;
            for (const item of textContent.items) {
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                // Different vertical position = likely new line
                result += "\n";
              } else if (result.length > 0 && !result.endsWith(" ") && !result.endsWith("\n")) {
                result += " ";
              }
              result += item.str;
              lastY = item.transform[5];
            }
            const text = result.trim();
            pages.push(text);
            return text;
          });
        }
      });
    } catch (parseErr: any) {
      console.error("[ADMIN-TRANSLATE] PDF Parse error:", parseErr);
      throw new Error(`Fallo al extraer texto del PDF: ${parseErr.message}`);
    }

    console.log(`[ADMIN-TRANSLATE] Encontradas ${pages.length} páginas.`);

    // 3. Translate in chunks
    const results = [];
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    for (let i = 0; i < pages.length; i++) {
      const text = pages[i].trim();
      if (!text || text.length < 5) continue;

      const key = cacheKey(text, targetLanguage);
      
      try {
        const existing = await (prisma as any).translation.findUnique({ where: { hash: key } });
        if (existing) {
          results.push({ page: i + 1, status: "cached" });
          continue;
        }

        console.log(`[ADMIN-TRANSLATE] Traduciendo página ${i + 1}/${pages.length}...`);
        const transRes = await fetch(`${baseUrl}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLanguage })
        });

        if (transRes.ok) {
          results.push({ page: i + 1, status: "translated" });
        } else {
          const errData = await transRes.json();
          results.push({ page: i + 1, status: "failed", error: errData.error || "Unknown" });
        }
      } catch (loopErr: any) {
        console.error(`[ADMIN-TRANSLATE] Error en página ${i+1}:`, loopErr);
        results.push({ page: i + 1, status: "error", error: loopErr.message });
      }
      
      await new Promise(r => setTimeout(r, 300));
    }

    // Now also translate spreads
    console.log(`[ADMIN-TRANSLATE] Procesando combinaciones (spreads)...`);
    for (let i = 0; i < pages.length - 1; i++) {
        const spreadText = `${pages[i].trim()}\n\n---\n\n${pages[i+1].trim()}`;
        const key = cacheKey(spreadText, targetLanguage);
        const existing = await (prisma as any).translation.findUnique({ where: { hash: key } });
        if (!existing) {
            await fetch(`${baseUrl}/api/translate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: spreadText, targetLanguage })
            });
            await new Promise(r => setTimeout(r, 200));
        }
    }

    return NextResponse.json({ 
      message: "Proceso completado",
      pagesProcessed: pages.length,
      results 
    });

  } catch (error: any) {
    console.error("Error in admin translate route:", error);
    return NextResponse.json({ 
      message: "Error al traducir el libro", 
      error: error.message || "Error desconocido",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
