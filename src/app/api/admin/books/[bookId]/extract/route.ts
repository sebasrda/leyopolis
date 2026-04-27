import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// Polyfill for DOMMatrix which is required by some PDFs in Node environment
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor(init: any) {
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
    }
    m11: number; m12: number; m13: number; m14: number;
    m21: number; m22: number; m23: number; m24: number;
    m31: number; m32: number; m33: number; m34: number;
    m41: number; m42: number; m43: number; m44: number;
  };
}

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

    const pdfParse = require("pdf-parse");
    const pages: string[] = [];
    
    try {
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
    } catch (parseErr: any) {
      console.error("[EXTRACT] PDF Parse error:", parseErr);
      throw new Error(`Error en el motor de lectura de PDF: ${parseErr.message}`);
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
