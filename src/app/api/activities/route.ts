import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as unknown as {
  activity: {
    findMany: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<{ id: string }>;
  };
};

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { userId, role } = user;

  const where =
    role === "ADMIN"
      ? {}
      : role === "TEACHER" || role === "COORDINATOR"
        ? { OR: [{ published: true }, { createdById: userId }] }
        : { published: true };

  const activities = await eduDb.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      points: true,
      published: true,
      courseId: true,
      bookId: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    take: 200,
  });

  return NextResponse.json(activities);
}

export async function POST(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "COORDINATOR") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const points = typeof body.points === "number" ? Math.max(0, Math.floor(body.points)) : 100;
  const published = typeof body.published === "boolean" ? body.published : true;

  const courseId = typeof body.courseId === "string" ? body.courseId : null;
  const bookId = typeof body.bookId === "string" ? body.bookId : null;
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : null;
  const pageStart = typeof body.pageStart === "number" ? Math.max(1, Math.floor(body.pageStart)) : null;
  const pageEnd = typeof body.pageEnd === "number" ? Math.max(1, Math.floor(body.pageEnd)) : null;
  const excerpt = typeof body.excerpt === "string" ? body.excerpt : null;

  const content =
    typeof body.content === "string"
      ? body.content
      : typeof body.content === "object" && body.content
        ? JSON.stringify(body.content)
        : "";

  if (!title || !type || !content) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const created = await eduDb.activity.create({
    data: {
      title,
      description,
      type,
      content,
      points,
      published,
      createdById: user.userId,
      courseId,
      bookId,
      chapterId,
      pageStart,
      pageEnd,
      excerpt,
    },
    select: { id: true },
  });

  return NextResponse.json(created);
}
