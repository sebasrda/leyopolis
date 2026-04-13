import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAndSaveActivities } from "@/lib/ai-activities";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN" && role !== "COORDINATOR") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const { bookId } = await req.json();
    if (!bookId) {
      return NextResponse.json({ message: "ID del libro requerido" }, { status: 400 });
    }

    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
      include: { activities: true }
    });

    if (!book) {
      return NextResponse.json({ message: "Libro no encontrado" }, { status: 404 });
    }

    await generateAndSaveActivities({
      bookId: book.id,
      title: book.title,
      author: book.author || "Autor Desconocido",
      contentUrl: book.contentUrl,
      userId: session.user.id
    });

    return NextResponse.json({ message: "Actividades regeneradas exitosamente" });
  } catch (error: any) {
    console.error("Error regenerating IA activities:", error);
    return NextResponse.json({ 
      message: "Error al regenerar actividades", 
      error: error.message 
    }, { status: 500 });
  }
}
