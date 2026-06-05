import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, userId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id, userId } = await params;

    if (userRole === "ADMIN") {
      const dbAdmin = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbAdmin?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    // Verify target user belongs to institution
    const targetUser = await (prisma as any).user.findUnique({ where: { id: userId }, select: { institutionId: true } });
    if (!targetUser || targetUser.institutionId !== id) {
        return NextResponse.json({ message: "Usuario no encontrado en este colegio" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, grade, role } = body;

    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        name,
        email,
        grade,
        role: role !== undefined ? role : undefined,
      },
      select: { id: true, name: true, email: true, role: true, grade: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Institution user PUT error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string, userId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const callerId = (session?.user as any)?.id;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id, userId } = await params;

    if (userRole === "ADMIN") {
      const dbAdmin = await (prisma as any).user.findUnique({ where: { id: callerId }, select: { institutionId: true } });
      if (dbAdmin?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    // Cannot delete self
    if (callerId === userId) {
      return NextResponse.json({ message: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    const targetUser = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { institutionId: true, role: true, email: true },
    });
    if (!targetUser || targetUser.institutionId !== id) {
      return NextResponse.json({ message: "Usuario no encontrado en este colegio" }, { status: 404 });
    }

    // Block if the target is a teacher with classes still attached. Deleting
    // would orphan those classes (Class.teacherId has no cascade). Force the
    // superadmin to reassign or delete the classes first.
    const teacherClassCount = await (prisma as any).class.count({ where: { teacherId: userId } });
    if (teacherClassCount > 0) {
      return NextResponse.json({
        message: `Este docente tiene ${teacherClassCount} clase(s) asignada(s). Reasigna o elimina las clases primero.`,
      }, { status: 409 });
    }

    // Delete the user inside a transaction, cleaning up all relations that
    // don't have onDelete: Cascade in the schema. ActivityAttempt, ReadingSession,
    // UserChallenge, UserActivity, BookView, Account, Session, PostLike and
    // TwoFactor already cascade automatically — we don't touch them here.
    await prisma.$transaction([
      prisma.userBook.deleteMany({ where: { userId } }),
      prisma.evaluationResult.deleteMany({ where: { userId } }),
      prisma.clubMember.deleteMany({ where: { userId } }),
      prisma.comment.deleteMany({ where: { userId } }),
      prisma.post.deleteMany({ where: { userId } }),
      prisma.vocabulary.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Institution user DELETE error:", error);
    const isProd = process.env.NODE_ENV === "production";
    return NextResponse.json({
      message: isProd
        ? "No se pudo eliminar al usuario. Puede tener contenido asociado que lo impide."
        : `Error: ${error?.message || "desconocido"}`,
    }, { status: 500 });
  }
}
