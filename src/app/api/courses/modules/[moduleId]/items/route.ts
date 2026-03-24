import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;

export async function POST(req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { moduleId } = await params;
  const module = await eduDb.courseModule.findUnique({
    where: { id: moduleId },
    select: { course: { select: { teacherId: true } } },
  });
  if (!module) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && module.course.teacherId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const order = typeof body.order === "number" ? Math.floor(body.order) : 0;
  const bookId = typeof body.bookId === "string" ? body.bookId : null;
  const activityId = typeof body.activityId === "string" ? body.activityId : null;
  const videoId = typeof body.videoId === "string" ? body.videoId : null;

  if (!type) return NextResponse.json({ message: "Invalid payload" }, { status: 400 });

  const created = await eduDb.courseModuleItem.create({
    data: {
      moduleId,
      type,
      order,
      bookId,
      activityId,
      videoId,
    },
    select: { id: true },
  });

  return NextResponse.json(created);
}
