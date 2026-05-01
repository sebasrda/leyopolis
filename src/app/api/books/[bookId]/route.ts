
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  try {
    const book = await (prisma as any).book.findUnique({
      where: {
        id: bookId
      },
      include: {
        evaluations: true
      }
    });

    if (!book) {
      return NextResponse.json(
        { message: "Libro no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
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

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "No hay cambios válidos para aplicar" }, { status: 400 });
  }

  try {
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
