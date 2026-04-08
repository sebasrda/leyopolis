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
    (prisma as any).activity.count({ where: whereCreator }),
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

  // Calcular métricas reales del Dashboard
  const classesWithStudents = await prisma.class.findMany({
    where: whereTeacher,
    select: { students: { select: { id: true } } }
  });
  const studentSet = new Set();
  classesWithStudents.forEach(c => c.students.forEach((s: any) => studentSet.add(s.id)));
  const totalStudents = studentSet.size;

  const activeReadingsCount = await prisma.assignment.count({
    where: {
      class: whereTeacher,
      dueDate: { gte: new Date() }
    }
  });

  const allAttempts = await eduDb.activityAttempt.findMany({
    where: { activity: whereCreator, userId: { not: DEMO_USER_ID } },
    select: { score: true }
  });
  
  let averageComprehension = 0;
  if (allAttempts.length > 0) {
    const sum = allAttempts.reduce((acc: number, val: any) => acc + val.score, 0);
    averageComprehension = Math.round((sum / allAttempts.length) * 10) / 10; // decimal si es necesario, pero int esta bien
  } else {
     // Check EvaluationResults as fallback
     const evals = await prisma.evaluationResult.findMany({
       where: { evaluation: { book: { assignments: { some: { class: whereTeacher } } } } },
       select: { score: true }
     });
     if (evals.length > 0) {
       const sum = evals.reduce((acc: number, val: any) => acc + val.score, 0);
       averageComprehension = Math.round(sum / evals.length);
     }
  }

  return NextResponse.json({
    counts: { courses, activities, videos, attempts7d },
    dashboardStats: {
      totalStudents,
      activeReadings: activeReadingsCount,
      averageComprehension
    },
    latestAttempts: filtered.map((a: any) => ({
      id: a.id,
      score: a.score,
      createdAt: a.createdAt,
      activity: { id: a.activity.id, title: a.activity.title },
      user: { id: a.user.id, name: a.user.name, email: a.user.email },
    })),
  });
}



