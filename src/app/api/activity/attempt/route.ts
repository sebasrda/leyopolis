import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";
import { grantXp } from "@/lib/gamification";

export async function POST(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  try {
    const { activityId, score, answers } = await req.json();
    if (!activityId) return NextResponse.json({ message: "activityId requerido" }, { status: 400 });

    const attempt = await (prisma as any).activityAttempt.create({
      data: {
        activityId,
        userId: user.userId,
        score: typeof score === "number" ? score : 0,
        answers: typeof answers === "string" ? answers : JSON.stringify(answers || {}),
        completedAt: new Date(),
      },
    });

    const xpGain = Math.max(1, Math.round((typeof score === "number" ? score : 0) * 0.5));
    const { xp, level } = await grantXp(user.userId, xpGain);

    return NextResponse.json({ id: attempt.id, score: attempt.score, xpGained: xpGain, xp, level });
  } catch (error) {
    console.error("Error saving activity attempt:", error);
    return NextResponse.json({ message: "Error al guardar intento" }, { status: 500 });
  }
}
