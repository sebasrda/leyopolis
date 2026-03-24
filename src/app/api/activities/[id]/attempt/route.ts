import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const activity = await eduDb.activity.findUnique({
    where: { id },
    select: { id: true, published: true, content: true, points: true },
  });
  if (!activity) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!activity.published && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const answers = typeof body.answers === "object" && body.answers ? JSON.stringify(body.answers) : JSON.stringify({});
  const score = typeof body.score === "number" ? Math.max(0, body.score) : 0;

  const created = await eduDb.activityAttempt.create({
    data: {
      activityId: id,
      userId: user.userId,
      score,
      answers,
      completedAt: new Date(),
    },
    select: { id: true, score: true, createdAt: true, completedAt: true },
  });

  return NextResponse.json(created);
}
