import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const where =
    user.role === "ADMIN"
      ? {}
      : user.role === "TEACHER" || user.role === "COORDINATOR"
        ? { OR: [{ published: true }, { teacherId: user.userId }] }
        : { published: true };

  const videos = await eduDb.video.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    take: 200,
  });

  return NextResponse.json(videos);
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
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const durationSeconds = typeof body.durationSeconds === "number" ? Math.max(0, Math.floor(body.durationSeconds)) : null;
  const published = typeof body.published === "boolean" ? body.published : true;
  const courseId = typeof body.courseId === "string" ? body.courseId : null;

  const teacherId = user.role === "ADMIN" && typeof body.teacherId === "string" ? body.teacherId : user.userId;

  if (!title || !provider || !url) return NextResponse.json({ message: "Invalid payload" }, { status: 400 });

  const created = await eduDb.video.create({
    data: {
      title,
      description,
      provider,
      url,
      durationSeconds,
      published,
      courseId,
      teacherId,
    },
    select: { id: true },
  });

  return NextResponse.json(created);
}
