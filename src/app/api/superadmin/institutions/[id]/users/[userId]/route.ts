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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, userId: string }> }) {
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

    const targetUser = await (prisma as any).user.findUnique({ where: { id: userId }, select: { institutionId: true } });
    if (!targetUser || targetUser.institutionId !== id) {
        return NextResponse.json({ message: "Usuario no encontrado en este colegio" }, { status: 404 });
    }

    await (prisma as any).user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Institution user DELETE error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
