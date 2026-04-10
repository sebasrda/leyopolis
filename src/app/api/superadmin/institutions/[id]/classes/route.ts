import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (userRole === "ADMIN") {
      const dbAdmin = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbAdmin?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    const classes = await (prisma as any).class.findMany({
      where: {
        institutionId: id
      },
      include: {
        teacher: {
            select: { name: true, email: true }
        },
        _count: {
            select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Institution classes GET error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (userRole === "ADMIN") {
      const dbAdmin = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbAdmin?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { name, teacherId, grade, subject, studentIds = [], bookIds = [] } = body;

    if (!name || !teacherId) {
        return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });
    }

    // Verify teacher belongs to the institution
    const teacher = await (prisma as any).user.findUnique({ where: { id: teacherId }, select: { institutionId: true, role: true } });
    if (!teacher || teacher.institutionId !== id || teacher.role !== "TEACHER") {
        return NextResponse.json({ message: "Docente inválido o no pertenece a la institución" }, { status: 400 });
    }

    const newClass = await (prisma as any).class.create({
      data: {
        name,
        teacherId,
        grade,
        subject,
        institutionId: id,
        students: studentIds.length > 0 ? { connect: studentIds.map((sid: string) => ({ id: sid })) } : undefined,
        assignedBooks: bookIds.length > 0 ? { connect: bookIds.map((bid: string) => ({ id: bid })) } : undefined,
      },
      include: {
          teacher: { select: { name: true } },
          _count: { select: { students: true } }
      }
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error("Institution classes POST error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
