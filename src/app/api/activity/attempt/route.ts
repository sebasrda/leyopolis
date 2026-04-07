import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export async function POST(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { activityId, score, answers } = await req.json();

    if (!activityId) {
      return NextResponse.json({ message: "activityId requerido" }, { status: 400 });
    }

    const attempt = await (prisma as any).activityAttempt.create({
      data: {
        activityId,
        userId: user.userId,
        score: typeof score === "number" ? score : 0,
        answers: typeof answers === "string" ? answers : JSON.stringify(answers || {}),
        completedAt: new Date(),
      },
    });

    // Award XP for completing a quiz
    try {
      const xpGain = Math.round(score * 0.5); // 0-50 XP based on score
      await prisma.user.update({
        where: { id: user.userId },
        data: {
          xp: { increment: xpGain },
          lastActive: new Date(),
        },
      });
    } catch (xpErr) {
      console.error("Error updating XP:", xpErr);
    }

    return NextResponse.json({ id: attempt.id, score: attempt.score });
  } catch (error) {
    console.error("Error saving activity attempt:", error);
    return NextResponse.json({ message: "Error al guardar intento" }, { status: 500 });
  }
}

