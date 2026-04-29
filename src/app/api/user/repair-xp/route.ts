import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateLevel } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── Reading time XP: 1 XP per minute, min 1 per session ──────────
  // When durationSeconds is 0, estimate from endTime-startTime
  const sessions = await prisma.readingSession.findMany({
    where: { userId },
    select: { durationSeconds: true, startTime: true, endTime: true },
  });

  const readingXp = sessions.reduce((sum, s) => {
    let secs = s.durationSeconds ?? 0;
    if (secs === 0 && s.endTime && s.startTime) {
      secs = Math.min(
        Math.floor((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000),
        7200
      );
    }
    return sum + Math.max(1, Math.floor(secs / 60));
  }, 0);

  // ── Books XP ──────────────────────────────────────────────────────
  // 100 XP per completed book, 25 XP per in-progress book
  const [completedBooks, inProgressBooks] = await Promise.all([
    prisma.userBook.count({ where: { userId, status: "COMPLETED" } }),
    prisma.userBook.count({ where: { userId, status: "IN_PROGRESS" } }),
  ]);
  const booksXp = completedBooks * 100 + inProgressBooks * 25;

  // ── Quiz/Activity XP: 25 XP per attempt ──────────────────────────
  const attempts = await prisma.activityAttempt.count({ where: { userId } });
  const quizXp = attempts * 25;

  // ── Book views XP: 5 XP per unique book opened, capped at 100 ────
  const uniqueBookViews = await prisma.bookView.findMany({
    where: { userId },
    select: { bookId: true },
    distinct: ["bookId"],
  });
  const viewXp = Math.min(uniqueBookViews.length * 5, 100);

  const totalXp = readingXp + booksXp + quizXp + viewXp;
  // Never decrease existing XP — only repair upward
  const finalXp = Math.max(user.xp, totalXp);
  const newLevel = calculateLevel(finalXp);

  await prisma.user.update({
    where: { id: userId },
    data: { xp: finalXp, level: newLevel, lastActive: new Date() },
  });

  return NextResponse.json({
    xp: finalXp, level: newLevel,
    breakdown: { readingXp, booksXp, quizXp, viewXp },
  });
}
