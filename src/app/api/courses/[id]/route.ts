import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await eduDb.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      enrollments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              book: { select: { id: true, title: true, author: true } },
              activity: { select: { id: true, title: true, type: true, points: true, published: true } },
              video: { select: { id: true, title: true, provider: true, url: true } },
            },
          },
        },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, title: true, type: true, points: true, published: true } },
      videos: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, title: true, provider: true, url: true, published: true } },
    },
  });

  if (!course) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const isEnrolled = course.enrollments.some((e: any) => e.userId === user.userId);
  const canView =
    user.role === "ADMIN" ||
    course.teacherId === user.userId ||
    (isEnrolled && course.published);

  if (!canView) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  return NextResponse.json(course);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await eduDb.course.findUnique({ where: { id }, select: { teacherId: true } });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && existing.teacherId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.published === "boolean") data.published = body.published;

  const updated = await eduDb.course.update({ where: { id }, data });
  return NextResponse.json(updated);
}
