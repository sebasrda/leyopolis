
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  try {
    const book = await prisma.book.findUnique({
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
  
  // Check if user is authorized (Admin or Teacher)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await params;

  try {
    // Check if book exists
    const book = await prisma.book.findUnique({
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
    
    await prisma.book.delete({
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
