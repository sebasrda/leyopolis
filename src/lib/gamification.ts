import { prisma } from "@/lib/prisma";

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

/** Increment XP in DB and auto-recalculate level. Returns new xp+level. */
export async function grantXp(userId: string, amount: number): Promise<{ xp: number; level: number }> {
  if (amount <= 0) return { xp: 0, level: 1 };
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: { increment: amount },
      lastActive: new Date(),
    },
    select: { xp: true, level: true },
  });
  const newLevel = calculateLevel(updated.xp);
  if (newLevel !== updated.level) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });
  }
  return { xp: updated.xp, level: newLevel };
}
