import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export async function GET() {
  const auth = await requireRole("SUPERADMIN", "ADMIN");
  if ("error" in auth) return auth.error;

  const userRole = auth.user.role;
  const userId = auth.user.userId;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { institutionId: true, role: true }
    });

    const institutionId = dbUser?.institutionId;

    if (!institutionId && dbUser?.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "No pertences a ninguna institución" }, { status: 400 });
    }
    const whereScope: any = dbUser?.role === "SUPERADMIN" ? undefined : { institutionId: dbUser?.institutionId || undefined };

    const institution = institutionId ? await prisma.institution.findUnique({
       where: { id: institutionId }
    }) : null;
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalClasses,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count({ where: whereScope }),
      prisma.user.count({ where: { ...whereScope, role: "STUDENT" } }),
      prisma.user.count({ where: { ...whereScope, role: "TEACHER" } }),
      prisma.user.count({ where: { ...whereScope, role: "ADMIN" } }),
      prisma.class.count({ where: whereScope }),
      prisma.user.findMany({
        where: whereScope,
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate percentages
    const studentPercent = totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 0;
    const teacherPercent = totalUsers > 0 ? Math.round((totalTeachers / totalUsers) * 100) : 0;
    const adminPercent = totalUsers > 0 ? Math.round((totalAdmins / totalUsers) * 100) : 0;

    return NextResponse.json({
      institution,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalClasses,
      studentPercent,
      teacherPercent,
      adminPercent,
      recentUsers,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ message: "Error al obtener estadísticas" }, { status: 500 });
  }
}
