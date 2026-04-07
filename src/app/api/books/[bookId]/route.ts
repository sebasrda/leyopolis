
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

  try {
    const book = await (prisma as any).book.update({
      where: { id: bookId },
      data: {
        allowMultipleAttempts: body.allowMultipleAttempts !== undefined ? body.allowMultipleAttempts : undefined,
        passScore: body.passScore !== undefined ? body.passScore : undefined,
      }
    });

    return NextResponse.json({ message: "Libro actualizado", book });
  } catch (error) {
    console.error("Error updating book:", error);
    return NextResponse.json({ message: "Error al actualizar libro" }, { status: 500 });
  }
}
