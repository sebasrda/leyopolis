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
    let { name, teacherId, subject, grade } = body;

    if (auth.user.role === "TEACHER") teacherId = auth.user.userId;

    const classDb = prisma as unknown as {
      class: {
        create: (args: unknown) => Promise<unknown>;
      };
      user: {
        findUnique: (args: unknown) => Promise<{ institutionId: string | null; role: string | null } | null>;
      };
    };

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { institutionId: true, role: true }
    });

    if (!dbUser?.institutionId && dbUser?.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "No tienes una institución asignada" }, { status: 400 });
    }

    if (!name || !teacherId) {
      return NextResponse.json(
        { message: "Nombre de clase y profesor son requeridos" },
        { status: 400 }
      );
    }

    const newClass = await classDb.class.create({
      data: {
        name,
        teacherId,
        subject,
        grade,
        institutionId: dbUser.institutionId
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



