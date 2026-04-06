import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const { studentIds } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ message: "studentIds requerido (array)" }, { status: 400 });
    }

    // Verify the class exists
    const cls = await prisma.class.findUnique({ where: { id } });
    if (!cls) {
      return NextResponse.json({ message: "Clase no encontrada" }, { status: 404 });
    }

    // Connect students to the class
    await prisma.class.update({
      where: { id },
      data: {
        students: {
          connect: studentIds.map((sid: string) => ({ id: sid })),
        },
      },
    });

    // Fetch updated class with student count
    const updated = await prisma.class.findUnique({
      where: { id },
      include: {
        students: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error enrolling students:", error);
    return NextResponse.json({ message: "Error al matricular estudiantes" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ message: "studentId requerido" }, { status: 400 });
    }

    await prisma.class.update({
      where: { id },
      data: {
        students: {
          disconnect: { id: studentId },
        },
      },
    });

    return NextResponse.json({ message: "Estudiante removido" });
  } catch (error) {
    console.error("Error removing student:", error);
    return NextResponse.json({ message: "Error al remover estudiante" }, { status: 500 });
  }
}
