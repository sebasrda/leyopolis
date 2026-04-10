import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole("SUPERADMIN", "ADMIN", "COORDINATOR", "TEACHER");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const grade = url.searchParams.get("grade");

  const dbUser = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { role: true, institutionId: true }
  });

  const baseFilter: any = {};
  if (dbUser?.role !== "SUPERADMIN" && dbUser?.institutionId) {
    baseFilter.institutionId = dbUser.institutionId;
  }

  // Si es un profesor, ver solo sus clases
  if (auth.user.role === "TEACHER") {
    baseFilter.teacherId = auth.user.userId;
  }

  if (subject) baseFilter.subject = subject;
  if (grade) baseFilter.grade = grade;

  try {
    const classes = await prisma.class.findMany({
      where: baseFilter,
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { students: true },
        },
        assignedBooks: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole("SUPERADMIN", "ADMIN", "COORDINATOR", "TEACHER");
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    let { name, teacherId, subject, grade, studentIds = [], bookIds = [] } = body;

    if (auth.user.role === "TEACHER") teacherId = auth.user.userId;

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { institutionId: true, role: true }
    });

    if (!name || !teacherId) {
      return NextResponse.json(
        { message: "Nombre de clase y profesor son requeridos" },
        { status: 400 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        teacherId,
        subject,
        grade,
        institutionId: dbUser?.institutionId || null,
        students: studentIds.length > 0 ? { connect: studentIds.map((sid: string) => ({ id: sid })) } : undefined,
        assignedBooks: bookIds.length > 0 ? { connect: bookIds.map((bid: string) => ({ id: bid })) } : undefined,
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true } }
      }
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}



