import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateLevel } from "@/lib/gamification";

export const dynamic = "force-dynamic";

// Recalculates XP from existing activity data for the current user.
// Called automatically when user has 0 XP but has reading/activity history.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Count reading time from all sessions (1 XP per minute)
  const sessions = await prisma.readingSession.findMany({
    where: { userId },
    select: { durationSeconds: true },
  });
  const readingXp = sessions.reduce((sum, s) => sum + Math.max(1, Math.floor((s.durationSeconds ?? 0) / 60)), 0);

  // Count completed books (100 XP each)
  const completedBooks = await prisma.userBook.count({ where: { userId, status: "COMPLETED" } });
  const booksXp = completedBooks * 100;

  // Count quiz attempts (avg 25 XP each)
  const attempts = await (prisma as any).activityAttempt.count({ where: { userId } });
  const quizXp = attempts * 25;

  const totalXp = readingXp + booksXp + quizXp;
  const newLevel = calculateLevel(totalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { xp: totalXp, level: newLevel, lastActive: new Date() },
  });

  return NextResponse.json({ xp: totalXp, level: newLevel, readingXp, booksXp, quizXp });
}
