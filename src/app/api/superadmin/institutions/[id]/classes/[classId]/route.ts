import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, classId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id, classId } = await params;

    if (userRole === "ADMIN") {
      const dbAdmin = await (prisma as any).user.findUnique({ where: { id: (session.user as any).id }, select: { institutionId: true } });
      if (dbAdmin?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    const targetClass = await (prisma as any).class.findUnique({ where: { id: classId }, select: { institutionId: true } });
    if (!targetClass || targetClass.institutionId !== id) {
        return NextResponse.json({ message: "Clase no encontrada en este colegio" }, { status: 404 });
    }

    await (prisma as any).class.delete({
      where: { id: classId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Institution class DELETE error:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
