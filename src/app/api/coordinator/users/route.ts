import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "clt_demo_user_001";

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "COORDINATOR" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const db = prisma as unknown as any;
  const me = await db.user.findUnique({ where: { id: user.userId }, select: { institutionId: true } });
  const institutionId = user.role === "ADMIN" ? null : (me?.institutionId ?? null);
  if (!institutionId && user.role !== "ADMIN") return NextResponse.json({ students: [], teachers: [] });

  const whereBase = user.role === "ADMIN" ? { id: { not: DEMO_USER_ID } } : { institutionId, id: { not: DEMO_USER_ID } };

  const [students, teachers] = await Promise.all([
    db.user.findMany({
      where: { ...whereBase, role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, email: true, grade: true, createdAt: true },
    }),
    db.user.findMany({
      where: { ...whereBase, role: { in: ["TEACHER", "COORDINATOR"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  const studentIds = students.map((s: any) => s.id);
  const progressRows = studentIds.length
    ? await db.userBook.groupBy({
        by: ["userId"],
        where: { userId: { in: studentIds } },
        _avg: { progress: true },
      })
    : [];
  const progressMap = new Map(progressRows.map((r: any) => [r.userId, Math.round(r._avg.progress ?? 0)]));

  return NextResponse.json({
    students: students.map((s: any) => ({ ...s, avgProgress: progressMap.get(s.id) ?? 0 })),
    teachers,
  });
}

export async function PATCH(req: Request) {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "COORDINATOR" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const userId = typeof body.userId === "string" ? body.userId : "";
  const grade = typeof body.grade === "string" ? body.grade.trim() : null;
  const role = typeof body.role === "string" ? body.role : null;

  if (!userId) return NextResponse.json({ message: "userId required" }, { status: 400 });

  const db = prisma as unknown as any;
  const me = await db.user.findUnique({ where: { id: user.userId }, select: { institutionId: true } });
  const target = await db.user.findUnique({ where: { id: userId }, select: { institutionId: true } });
  if (user.role !== "ADMIN" && (!me?.institutionId || me.institutionId !== target?.institutionId)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (grade !== null) data.grade = grade || null;
  if (user.role === "ADMIN" && (role === "ADMIN" || role === "COORDINATOR" || role === "TEACHER" || role === "STUDENT")) {
    data.role = role;
  }

  await db.user.update({ where: { id: userId }, data });
  return NextResponse.json({ ok: true });
}

