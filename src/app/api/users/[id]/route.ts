
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const currentRole = (session.user as any).role;
  if (!session || !session.user || (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role, licenseType } = await req.json();
    
    let updateData: any = {};
    if (role) updateData.role = role;
    
    if (licenseType) {
        updateData.licenseType = licenseType;
        if (licenseType === "MENSUAL") {
            updateData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else if (licenseType === "TRIMESTRAL") {
            updateData.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        } else if (licenseType === "ANUAL") {
            updateData.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        } else if (licenseType === "DEMO") {
            updateData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } else {
            updateData.expiresAt = null; // PERMANENTE / ACTIVATED
        }
    }
    
    await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ message: "User updated" });
  } catch (error) {
    return NextResponse.json({ message: "Error updating user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const currentRole = (session.user as any).role;
  if (!session || !session.user || (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN")) {
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
