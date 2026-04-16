import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for bulk processing

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session?.user || userRole !== "SUPERADMIN") {
    return NextResponse.json({ message: "Acceso restringido a Super Administradores" }, { status: 401 });
  }

  try {
    // 1. Find all books with default or empty description
    const booksToFix = await (prisma as any).book.findMany({
      where: {
        OR: [
          { description: { contains: "Libro subido por el administrador" } },
          { description: "" },
          { description: null }
        ]
      },
      select: {
        id: true,
        title: true,
        author: true,
        contentUrl: true
      }
    });

    if (booksToFix.length === 0) {
      return NextResponse.json({ message: "No se encontraron libros que necesiten limpieza de sinopsis" });
    }

    const results = [];
    const userId = (session.user as any).id;

    // 2. Process each book with stage: "synopsis" (non-destructive)
    for (const book of booksToFix) {
      try {
        console.log(`[BULK-FIX] Procesando sinopsis para: ${book.title}`);
        await generateAndSaveActivities({
          bookId: book.id,
          title: book.title,
          author: book.author || "Autor Desconocido",
          contentUrl: book.contentUrl || "",
          userId,
          stage: "synopsis" // Safe stage added previously
        });
        results.push({ id: book.id, title: book.title, status: "success" });
      } catch (err: any) {
        console.error(`[BULK-FIX] Error en ${book.title}:`, err.message);
        results.push({ id: book.id, title: book.title, status: "error", error: err.message });
      }
    }

    return NextResponse.json({
      message: "Proceso de limpieza completado",
      total: booksToFix.length,
      successCount: results.filter(r => r.status === "success").length,
      details: results
    });

  } catch (error: any) {
    console.error("[BULK-FIX] Error crítico:", error);
    return NextResponse.json({ message: "Error crítico en el proceso de limpieza", error: error.message }, { status: 500 });
  }
}
