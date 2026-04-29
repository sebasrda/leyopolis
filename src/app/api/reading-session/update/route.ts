import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { grantXp } from "@/lib/gamification";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { sessionId, durationSeconds, pagesRead, progress, bookId } = await req.json();
    if (!sessionId) return NextResponse.json({ message: "Session ID required" }, { status: 400 });

    // Read previous durationSeconds to calculate delta for XP
    const existing = await prisma.readingSession.findUnique({
      where: { id: sessionId },
      select: { durationSeconds: true },
    });

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

    // Grant XP for newly accumulated reading time (delta since last update)
    // This ensures XP is saved even when the session end beacon fails
    const prevSeconds = existing?.durationSeconds ?? 0;
    const newSeconds = durationSeconds ?? 0;
    const deltaMinutes = Math.floor((newSeconds - prevSeconds) / 60);
    if (deltaMinutes >= 1) {
      await grantXp(userId, deltaMinutes);
    }

    return NextResponse.json({ message: "Session updated successfully" });
  } catch (error) {
    console.error("Error updating reading session:", error);
    return NextResponse.json({ message: "Error updating session" }, { status: 500 });
  }
}
