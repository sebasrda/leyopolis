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

  try {
    const { bookId } = await params;

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
    if (!pdfRes.ok) throw new Error("No se pudo descargar el PDF");
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

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

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error("Error extracting text:", error);
    return NextResponse.json({ message: "Error al extraer texto", error: error.message }, { status: 500 });
  }
}
