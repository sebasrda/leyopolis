
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { bookId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const { bookId } = params;

  try {
    // A user has an attempt if they have an EvaluationResult for any Evaluation of this book
    const attempt = await prisma.evaluationResult.findFirst({
      where: {
        userId: session.user.id,
        evaluation: {
          bookId: bookId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      hasAttempt: !!attempt,
      lastAttempt: attempt 
    });
  } catch (error) {
    console.error("Error checking attempts:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { bookId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const { bookId } = params;
  const body = await req.json();

  try {
    // 1. Find or create the Evaluation for this book
    let evaluation = await prisma.evaluation.findFirst({
      where: { bookId: bookId, type: "QUIZ" }
    });

    if (!evaluation) {
      evaluation = await prisma.evaluation.create({
        data: {
          bookId: bookId,
          type: "QUIZ",
          content: "{}" // Placeholder
        }
      });
    }

    // 2. Create the EvaluationResult
    const result = await prisma.evaluationResult.create({
      data: {
        userId: session.user.id,
        evaluationId: evaluation.id,
        score: body.score,
        feedback: body.passed ? "¡Aprobado!" : "Reprobado",
      }
    });

    // 3. Register Activity
    await (prisma.userActivity as any).create({
      data: {
        userId: session.user.id,
        type: "QUIZ",
        bookId: bookId,
        metadata: JSON.stringify({ score: body.score, totalQuestions: body.totalQuestions }),
      }
    });

    return NextResponse.json({ message: "Intento guardado", result });
  } catch (error) {
    console.error("Error saving attempt:", error);
    return NextResponse.json({ message: "Error al guardar el intento" }, { status: 500 });
  }
}
