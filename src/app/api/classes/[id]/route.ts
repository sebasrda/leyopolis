
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || !("id" in session.user)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const cls = await prisma.class.findUnique({ where: { id } });
    if (!cls || cls.teacherId !== userId) {
       // Only teacher owner or admin can delete? Let's restrict to owner for now
       if (userRole !== "ADMIN" && cls?.teacherId !== userId) {
         return NextResponse.json({ message: "Forbidden" }, { status: 403 });
       }
    }

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ message: "Class deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
