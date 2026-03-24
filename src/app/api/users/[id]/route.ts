
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role } = await req.json();
    
    await prisma.user.update({
      where: { id },
      data: { role }
    });

    return NextResponse.json({ message: "User updated" });
  } catch (error) {
    return NextResponse.json({ message: "Error updating user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Prevent deleting self
    if (session.user.email) {
       const userToDelete = await prisma.user.findUnique({ where: { id } });
       if (userToDelete?.email === session.user.email) {
         return NextResponse.json({ message: "Cannot delete yourself" }, { status: 400 });
       }
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting user" }, { status: 500 });
  }
}
