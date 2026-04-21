import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN" && role !== "COORDINATOR") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const { bookId } = await params;
    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, author: true, contentUrl: true }
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    const result = await generateAndSaveActivities({
      bookId: book.id,
      title: book.title,
      author: book.author || "Autor Desconocido",
      contentUrl: book.contentUrl || "",
      userId: (session.user as any).id || "",
      stage: "sel-workshop"
    });

    if (!result.questions || result.questions.length === 0) {
      return NextResponse.json({ message: "La IA no pudo generar las preguntas correctamente" }, { status: 500 });
    }

    const questions = result.questions;

    // Clear previous if any
    await (prisma as any).activity.deleteMany({
      where: { bookId: book.id, type: "SEL_WORKSHOP" }
    });

    const activity = await (prisma as any).activity.create({
      data: {
        title: `Taller ODS CON SEL: ${book.title}`,
        description: `Taller interactivo de 50 preguntas enfocado en habilidades socioemocionales y ODS basados en el libro ${book.title}.`,
        type: "SEL_WORKSHOP",
        content: JSON.stringify({ questions: questions }),
        points: 500, // higher points for 50 questions
        published: true,
        createdById: (session.user as any).id,
        bookId: book.id,
      }
    });

    await (prisma as any).book.update({
      where: { id: book.id },
      data: { selWorkshopId: activity.id }
    });

    return NextResponse.json({ 
      success: true, 
      activityId: activity.id,
      count: questions.length 
    });

  } catch (err: any) {
    console.error("Generación SEL error:", err);
    return NextResponse.json({ message: "Error interno", error: err.message }, { status: 500 });
  }
}
