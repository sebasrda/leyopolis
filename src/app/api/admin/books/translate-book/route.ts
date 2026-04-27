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

    // 1. Fetch PDF
    let absoluteUrl = book.contentUrl;
    if (book.contentUrl.startsWith("/")) {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      absoluteUrl = `${baseUrl}${book.contentUrl}`;
    }

    const pdfRes = await fetch(absoluteUrl);
    if (!pdfRes.ok) throw new Error("No se pudo descargar el PDF");
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // 2. Parse PDF page by page
    const pdfParse = require("pdf-parse");
    
    const pages: string[] = [];
    await pdfParse(pdfBuffer, {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY, text = '';
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pages.push(text);
          return text;
        });
      }
    });

    console.log(`[ADMIN-TRANSLATE] Iniciando traducción de ${pages.length} páginas para: ${book.title}`);

    // 3. Translate in chunks of 2 pages (to match reader spread)
    const results = [];
    const VIRTUAL_PAGES = 2;

    // We simulate the reader spreads
    // The reader shows: [Cover], [Credits], [P1, P2], [P3, P4]...
    // Spread 0: Cover (Page 0)
    // Spread 1: Credits (Page 1)
    // Spread 2: Page 2 & 3 (of Flipbook) -> Real Page 1 & 2 of PDF
    
    // Actually, let's just translate individual pages and the spreads commonly used.
    // To be safe, we translate each page individually first.
    for (let i = 0; i < pages.length; i++) {
      const text = pages[i].trim();
      if (!text || text.length < 5) continue;

      const key = cacheKey(text, targetLanguage);
      
      // Check if already translated
      const existing = await prisma.translation.findUnique({ where: { hash: key } });
      if (existing) {
        results.push({ page: i + 1, status: "cached" });
        continue;
      }

      // Call the internal translate logic (or fetch internal API)
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const transRes = await fetch(`${baseUrl}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage })
      });

      if (transRes.ok) {
        results.push({ page: i + 1, status: "translated" });
      } else {
        results.push({ page: i + 1, status: "failed" });
      }
      
      // Wait a bit to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    // Now also translate spreads (P1 + P2, P2 + P3, etc.)
    for (let i = 0; i < pages.length - 1; i++) {
        const spreadText = `${pages[i].trim()}\n\n---\n\n${pages[i+1].trim()}`;
        const key = cacheKey(spreadText, targetLanguage);
        const existing = await prisma.translation.findUnique({ where: { hash: key } });
        if (!existing) {
            const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
            await fetch(`${baseUrl}/api/translate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: spreadText, targetLanguage })
            });
            await new Promise(r => setTimeout(r, 500));
        }
    }

    return NextResponse.json({ 
      message: "Traducción completada y guardada en caché persistente",
      pagesProcessed: pages.length,
      results 
    });

  } catch (error: any) {
    console.error("Error in admin translate:", error);
    return NextResponse.json({ message: "Error al traducir el libro", error: error.message }, { status: 500 });
  }
}
