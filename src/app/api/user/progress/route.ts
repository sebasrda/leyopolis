export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { grantXp, calculateLevel } from "@/lib/gamification";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ xp: 0, level: 1, streak: 0 });

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true, lastActive: true },
    });

    if (!user) return NextResponse.json({ xp: 0, level: 1, streak: 0 });

    // Auto-correct level if it drifted from XP
    const correctLevel = calculateLevel(user.xp);
    if (correctLevel !== user.level) {
      await prisma.user.update({ where: { id: userId }, data: { level: correctLevel } });
    }

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
    return NextResponse.json({ error: 'Failed to fetch progress', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;
    const body = await request.json();

    // Accept either an absolute xp value (legacy) or a delta
    if (typeof body.xp_delta === "number" && body.xp_delta > 0) {
      const { xp, level } = await grantXp(userId, body.xp_delta);
      return NextResponse.json({ xp, level });
    }

    // Legacy path: set absolute values but always recalculate level from xp
    const updateData: Record<string, unknown> = { lastActive: new Date() };
    if (typeof body.xp === "number") updateData.xp = Math.max(0, body.xp);
    if (typeof body.streak === "number") updateData.streak = body.streak;

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData, select: { xp: true, level: true, streak: true } });
    const correctLevel = calculateLevel(updated.xp);
    if (correctLevel !== updated.level) {
      await prisma.user.update({ where: { id: userId }, data: { level: correctLevel } });
    }
    return NextResponse.json({ xp: updated.xp, level: correctLevel, streak: updated.streak });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
