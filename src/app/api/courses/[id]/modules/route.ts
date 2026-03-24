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
  const course = await eduDb.course.findUnique({ where: { id }, select: { teacherId: true } });
  if (!course) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && course.teacherId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const order = typeof body.order === "number" ? Math.floor(body.order) : 0;
  if (!title) return NextResponse.json({ message: "Title required" }, { status: 400 });

  const created = await eduDb.courseModule.create({
    data: { courseId: id, title, order },
    select: { id: true },
  });

  return NextResponse.json(created);
}
