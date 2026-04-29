export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { grantXp, calculateLevel } from "@/lib/gamification";

/** Each query runs independently — a failed table never blocks the whole repair */
async function calcRepairXp(userId: string): Promise<number> {
  // ── Reading time: 1 XP per minute, min 1 per session ──────────────
  let readingXp = 0;
  try {
    const sessions = await prisma.readingSession.findMany({
      where: { userId },
      select: { durationSeconds: true, startTime: true, endTime: true },
    });
    readingXp = sessions.reduce((sum, s) => {
      let secs = s.durationSeconds ?? 0;
      if (secs === 0 && s.endTime && s.startTime) {
        secs = Math.min(
          Math.floor((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000),
          7200
        );
      }
      return sum + Math.max(1, Math.floor(secs / 60));
    }, 0);
  } catch { /* no reading sessions table → 0 */ }

  // ── Books: 100 per completed, 25 per in-progress ──────────────────
  let booksXp = 0;
  try {
    const [completed, inProgress] = await Promise.all([
      prisma.userBook.count({ where: { userId, status: "COMPLETED" } }),
      prisma.userBook.count({ where: { userId, status: "IN_PROGRESS" } }),
    ]);
    booksXp = completed * 100 + inProgress * 25;
  } catch { /* 0 */ }

  // ── Quiz attempts: 25 XP each ─────────────────────────────────────
  let quizXp = 0;
  try {
    const attempts = await prisma.activityAttempt.count({ where: { userId } });
    quizXp = attempts * 25;
  } catch { /* 0 */ }

  // ── Unique books opened: 5 XP each (capped 100) ───────────────────
  let viewXp = 0;
  try {
    const groups = await prisma.bookView.groupBy({ by: ["bookId"], where: { userId } });
    viewXp = Math.min(groups.length * 5, 100);
  } catch { /* bookView table may not exist → 0 */ }

  return readingXp + booksXp + quizXp + viewXp;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ xp: 0, level: 1, streak: 0 });

    const userId = session.user.id;
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true, lastActive: true },
    });
    if (!user) return NextResponse.json({ xp: 0, level: 1, streak: 0 });

    // ── Auto-repair XP when suspiciously low ─────────────────────────
    if (user.xp < 50) {
      try {
        const repairedXp = await calcRepairXp(userId);
        const finalXp = Math.max(user.xp, repairedXp);
        if (finalXp > user.xp) {
          const newLevel = calculateLevel(finalXp);
          await prisma.user.update({
            where: { id: userId },
            data: { xp: finalXp, level: newLevel, lastActive: new Date() },
          });
          user = { ...user, xp: finalXp, level: newLevel };
        }
      } catch { /* never block the response */ }
    }

    // ── Auto-correct level drift ──────────────────────────────────────
    const correctLevel = calculateLevel(user.xp);
    if (correctLevel !== user.level) {
      await prisma.user.update({ where: { id: userId }, data: { level: correctLevel } });
    }

    // ── Streak logic ──────────────────────────────────────────────────
    const now = new Date();
    const lastActive = user.lastActive ? new Date(user.lastActive) : now;
    const diffHrs = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    let currentStreak = user.streak;
    let streakUpdated = false;
    if (diffHrs >= 20 && diffHrs <= 48) { currentStreak += 1; streakUpdated = true; }
    else if (diffHrs > 48 && currentStreak > 1) { currentStreak = 1; streakUpdated = true; }
    if (streakUpdated) {
      await prisma.user.update({ where: { id: userId }, data: { streak: currentStreak, lastActive: now } });
    }

    return NextResponse.json({ xp: user.xp, level: correctLevel, streak: currentStreak });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch progress', details: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;
    const body = await request.json();

    if (typeof body.xp_delta === "number" && body.xp_delta > 0) {
      const { xp, level } = await grantXp(userId, body.xp_delta);
      return NextResponse.json({ xp, level });
    }

    const updateData: Record<string, unknown> = { lastActive: new Date() };
    if (typeof body.xp === "number") updateData.xp = Math.max(0, body.xp);
    if (typeof body.streak === "number") updateData.streak = body.streak;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { xp: true, level: true, streak: true },
    });
    const correctLevel = calculateLevel(updated.xp);
    if (correctLevel !== updated.level) {
      await prisma.user.update({ where: { id: userId }, data: { level: correctLevel } });
    }
    return NextResponse.json({ xp: updated.xp, level: correctLevel, streak: updated.streak });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
