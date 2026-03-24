import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await eduDb.video.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });
  if (!video) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!video.published && user.role !== "ADMIN" && video.teacherId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(video);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await eduDb.video.findUnique({ where: { id }, select: { teacherId: true } });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && existing.teacherId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await eduDb.video.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
