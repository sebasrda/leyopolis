import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as unknown as {
  activity: {
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
  activityAttempt: {
    findMany: (args: unknown) => Promise<unknown>;
  };
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const activity = (await eduDb.activity.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      book: { select: { id: true, title: true, author: true } },
      course: { select: { id: true, title: true } },
    },
  })) as unknown as { id: string; published: boolean; createdById: string } | null;

  if (!activity) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!activity.published && user.role !== "ADMIN" && activity.createdById !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const myAttempts = (await eduDb.activityAttempt.findMany({
    where: { activityId: id, userId: user.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, score: true, createdAt: true, completedAt: true },
  })) as unknown as { id: string; score: number; createdAt: string; completedAt: string | null }[];

  return NextResponse.json({ ...activity, myAttempts });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "COORDINATOR") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = (await eduDb.activity.findUnique({ where: { id }, select: { createdById: true } })) as unknown as
    | { createdById: string }
    | null;
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && existing.createdById !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.type === "string") data.type = body.type.trim();
  if (typeof body.points === "number") data.points = Math.max(0, Math.floor(body.points));
  if (typeof body.published === "boolean") data.published = body.published;
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.courseId === "string" || body.courseId === null) data.courseId = body.courseId;
  if (typeof body.bookId === "string" || body.bookId === null) data.bookId = body.bookId;
  if (typeof body.chapterId === "string" || body.chapterId === null) data.chapterId = body.chapterId;
  if (typeof body.pageStart === "number" || body.pageStart === null) data.pageStart = body.pageStart;
  if (typeof body.pageEnd === "number" || body.pageEnd === null) data.pageEnd = body.pageEnd;
  if (typeof body.excerpt === "string" || body.excerpt === null) data.excerpt = body.excerpt;

  const updated = await eduDb.activity.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "COORDINATOR") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = (await eduDb.activity.findUnique({ where: { id }, select: { createdById: true } })) as unknown as
    | { createdById: string }
    | null;
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && existing.createdById !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await eduDb.activity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
