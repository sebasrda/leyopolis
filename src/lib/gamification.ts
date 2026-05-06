import { prisma } from "@/lib/prisma";

// Level curve: THRESHOLD[n] = 50 * n * (n + 1). Same shape as the legacy 10-level
// table (deltas grow by 100 XP per level), now extended to a hard cap of 50.
//   Lvl 1  → 0 XP        Lvl 10 → 4 500 XP      Lvl 25 → 30 000 XP
//   Lvl 50 → 122 500 XP  (last level — "Inmortal")
export const MAX_LEVEL = 50;
export const LEVEL_THRESHOLDS: number[] = Array.from({ length: MAX_LEVEL }, (_, i) => 50 * i * (i + 1));

export function calculateLevel(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
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
