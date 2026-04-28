import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { sessionId, durationSeconds, pagesRead, progress, bookId } = await req.json();
    if (!sessionId) return NextResponse.json({ message: "Session ID required" }, { status: 400 });

    await prisma.readingSession.update({
      where: { id: sessionId },
      data: { endTime: new Date(), durationSeconds, pagesRead },
    });

    if (bookId && progress !== undefined) {
      await prisma.userBook.upsert({
        where: { userId_bookId: { userId, bookId } },
        update: { progress, lastRead: new Date(), status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS" },
        create: { userId, bookId, progress, status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS", lastRead: new Date() },
      });
    }

    return NextResponse.json({ message: "Session updated successfully" });
  } catch (error) {
    console.error("Error updating reading session:", error);
    return NextResponse.json({ message: "Error updating session" }, { status: 500 });
  }
}
