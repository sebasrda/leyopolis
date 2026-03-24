import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";
const eduDb = prisma as any;
const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const teacherId = user.userId;
  const whereTeacher = user.role === "ADMIN" ? {} : { teacherId };
  const whereCreator = user.role === "ADMIN" ? {} : { createdById: teacherId };

  const [courses, activities, videos, attempts7d] = await prisma.$transaction([
    eduDb.course.count({ where: whereTeacher }),
    eduDb.activity.count({ where: whereCreator }),
    eduDb.video.count({ where: whereTeacher }),
    eduDb.activityAttempt.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, userId: { not: DEMO_USER_ID } },
    }),
  ]);

  const latestAttempts = await eduDb.activityAttempt.findMany({
    where: { userId: { not: DEMO_USER_ID } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      user: { select: { id: true, name: true, email: true } },
      activity: { select: { id: true, title: true, createdById: true } },
    },
  });

  const filtered =
    user.role === "ADMIN" ? latestAttempts : latestAttempts.filter((a: any) => a.activity.createdById === teacherId);

  return NextResponse.json({
    counts: { courses, activities, videos, attempts7d },
    latestAttempts: filtered.map((a: any) => ({
      id: a.id,
      score: a.score,
      createdAt: a.createdAt,
      activity: { id: a.activity.id, title: a.activity.title },
      user: { id: a.user.id, name: a.user.name, email: a.user.email },
    })),
  });
}
