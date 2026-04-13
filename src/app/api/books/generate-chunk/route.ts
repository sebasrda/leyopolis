import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role === "STUDENT") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { bookId, stage } = await req.json();

    if (!bookId || !stage) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }

    const result = await generateAndSaveActivities({
      bookId,
      title: book.title,
      author: book.author || "Autor Desconocido",
      contentUrl: book.contentUrl,
      userId: session.user.id,
      stage
    });

    return NextResponse.json({ 
      success: true, 
      stage,
      activityCount: result.questions?.length || 0 
    });

  } catch (error: any) {
    console.error("Error in generate-chunk:", error);
    return NextResponse.json({ 
      error: error.message || "Error en la generación" 
    }, { status: 500 });
  }
}
