
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  try {
    // SELECT only fields the reader actually needs. Skipping evaluations[]
    // (often dozens of rows of stored quiz results) keeps the metadata
    // response under ~2 KB vs the previous ~100 KB on books with quizzes.
    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        coverImage: true,
        category: true,
        language: true,
        difficulty: true,
        format: true,
        contentUrl: true,
        grade: true,
        subject: true,
        quizId: true,
        selWorkshopId: true,
        audioUrl: true,
        audioSyncMap: true,
        displaySettings: true,
        allowMultipleAttempts: true,
        passScore: true,
      },
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    // Browser + CDN can cache for an hour; the reader hits this only once
    // per page-load, but if the user navigates back, instant.
    return NextResponse.json(book, {
      headers: {
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === "ADMIN" || userRole === "TEACHER" || userRole === "SUPERADMIN";
  
  // Check if user is authorized
  if (!session || !isAuthorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await params;

  try {
    // Check if book exists
    const book = await (prisma as any).book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    // Delete related records (cascade delete is usually handled by Prisma if configured, 
    // but explicit deletion is safer if schema doesn't have cascade)
    // For now, we assume simple deletion. 
    // Ideally we should delete physical files too if we stored them locally, 
    // but since we might use external URLs or blob storage, we just delete the DB record.
    
    await (prisma as any).book.delete({
      where: { id: bookId }
    });

    return NextResponse.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { message: "Error deleting book" },
      { status: 500 }
    );
  }
}
export async function PATCH(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === "ADMIN" || userRole === "SUPERADMIN";

  if (!session || !isAuthorized) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { bookId } = await params;
  const body = await req.json();

  const allowedStringFields = [
    "title",
    "author",
    "description",
    "category",
    "difficulty",
    "ageRange",
    "grade",
    "subject",
    "language",
    "coverImage",
    "contentUrl",
  ] as const;

  const data: Record<string, any> = {};

  for (const field of allowedStringFields) {
    if (body[field] !== undefined) {
      const value = body[field];
      if (value === null) {
        data[field] = null;
      } else if (typeof value === "string") {
        const trimmed = value.trim();
        data[field] = trimmed.length === 0 ? null : trimmed;
      }
    }
  }

  if (body.allowMultipleAttempts !== undefined) {
    data.allowMultipleAttempts = Boolean(body.allowMultipleAttempts);
  }

  if (body.published !== undefined) {
    data.published = Boolean(body.published);
  }

  if (body.passScore !== undefined) {
    const score = Number(body.passScore);
    if (!Number.isNaN(score) && score >= 0 && score <= 100) {
      data.passScore = Math.round(score);
    }
  }

  if (Object.keys(data).length === 0 && !body.synopsisFileUrl) {
    return NextResponse.json({ message: "No hay cambios válidos para aplicar" }, { status: 400 });
  }

  try {
    // If a manual synopsis file was uploaded
    if (body.synopsisFileUrl) {
      try {
        const sFileRes = await fetch(body.synopsisFileUrl);
        if (sFileRes.ok) {
          const sBuffer = Buffer.from(await sFileRes.arrayBuffer());
          let extractedSynopsis = "";
          
          if (body.synopsisFileUrl.endsWith(".pdf")) {
            try {
              const { PDFParse } = require("pdf-parse");
              let parser: any = null;
              try {
                parser = new PDFParse({ data: new Uint8Array(sBuffer) });
                const result = await parser.getText();
                extractedSynopsis = result.text || "";
              } finally {
                try { await parser?.destroy?.(); } catch {}
              }
            } catch (pdfErr) {
              console.error("Error parsing PDF synopsis:", pdfErr);
            }
          } else if (body.synopsisFileUrl.endsWith(".docx") || body.synopsisFileUrl.endsWith(".doc")) {
            const mammoth = require("mammoth");
            const sResult = await mammoth.extractRawText({ buffer: sBuffer });
            extractedSynopsis = sResult.value;
          } else if (body.synopsisFileUrl.endsWith(".txt")) {
            extractedSynopsis = new TextDecoder().decode(sBuffer);
          }

          if (extractedSynopsis.trim()) {
            data.description = extractedSynopsis.trim();
          }
        }
      } catch (sErr) {
        console.error("Error processing synopsis file:", sErr);
      }
    }

    const book = await (prisma as any).book.update({
      where: { id: bookId },
      data,
    });

    return NextResponse.json({ message: "Libro actualizado", book });
  } catch (error) {
    console.error("Error updating book:", error);
    return NextResponse.json({ message: "Error al actualizar libro" }, { status: 500 });
  }
}
