import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { grantXp } from "@/lib/gamification";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { sessionId, pagesRead, durationSeconds, progress, bookId } = await req.json();
    if (!sessionId) return NextResponse.json({ message: "Session ID required" }, { status: 400 });

    const updatedSession = await prisma.readingSession.update({
      where: { id: sessionId },
      data: { endTime: new Date(), pagesRead, durationSeconds },
    });

    if (bookId && progress !== undefined) {
      await prisma.userBook.upsert({
        where: { userId_bookId: { userId, bookId } },
        update: { progress, lastRead: new Date(), status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS" },
        create: { userId, bookId, progress, status: progress >= 100 ? "COMPLETED" : "IN_PROGRESS", lastRead: new Date() },
      });

      // +1 XP per minute read (minimum 1 XP per session)
      if (durationSeconds > 30) {
        const xpGain = Math.max(1, Math.floor(durationSeconds / 60));
        await grantXp(userId, xpGain);
      }

      // Bonus XP for book completion
      if (progress >= 100) {
        await grantXp(userId, 100);
      }
    }

    return NextResponse.json({ message: "Session ended successfully", session: updatedSession });
  } catch (error) {
    console.error("Error ending reading session:", error);
    return NextResponse.json({ message: "Error ending session" }, { status: 500 });
  }
}
