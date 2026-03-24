import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const course = await eduDb.course.findUnique({ where: { id }, select: { id: true, teacherId: true } });
  if (!course) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && course.teacherId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const userId = typeof body.userId === "string" ? body.userId : "";

  const target = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null;

  if (!target) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const created = await eduDb.courseEnrollment.upsert({
    where: { courseId_userId: { courseId: id, userId: target.id } },
    update: {},
    create: { courseId: id, userId: target.id, role: "STUDENT" },
    select: { id: true },
  });

  return NextResponse.json(created);
}
