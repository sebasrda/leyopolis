import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";
import { apiError } from "@/lib/apiError";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const currentRole = (session?.user as any)?.role;
  const callerId = (session?.user as any)?.id;

  if (!session || !session.user || (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role, licenseType, isActive, password } = await req.json();
    
    // Security Scoping: ADMINs can only modify users in their own institution
    if (currentRole === "ADMIN") {
      const callerUser = await prisma.user.findUnique({
        where: { id: callerId },
        select: { institutionId: true }
      });
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { institutionId: true }
      });

      if (!callerUser?.institutionId || callerUser.institutionId !== targetUser?.institutionId) {
        return NextResponse.json({ message: "No puedes gestionar usuarios fuera de tu institución" }, { status: 403 });
      }
    }

    let updateData: any = {};
    if (role) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
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

    // Audit: separate action types so log queries are cleaner
    if (role) {
      await audit({
        actorId: callerId,
        actorEmail: session.user.email,
        actorRole: currentRole,
        action: AUDIT_ACTIONS.USER_ROLE_CHANGE,
        resource: "User",
        resourceId: id,
        request: req,
        metadata: { newRole: role },
      });
    }
    if (licenseType) {
      await audit({
        actorId: callerId,
        actorEmail: session.user.email,
        actorRole: currentRole,
        action: AUDIT_ACTIONS.USER_LICENSE_RENEW,
        resource: "User",
        resourceId: id,
        request: req,
        metadata: { licenseType, expiresAt: updateData.expiresAt },
      });
    }
    if (typeof isActive === "boolean") {
      await audit({
        actorId: callerId,
        actorEmail: session.user.email,
        actorRole: currentRole,
        action: AUDIT_ACTIONS.USER_SUSPEND,
        resource: "User",
        resourceId: id,
        request: req,
        metadata: { isActive },
      });
    }
    if (password) {
      await audit({
        actorId: callerId,
        actorEmail: session.user.email,
        actorRole: currentRole,
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        resource: "User",
        resourceId: id,
        request: req,
      });
    }

    return NextResponse.json({ message: "User updated" });
  } catch (error) {
    return apiError(error, 500, `update user ${id} failed`);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const currentRole = (session?.user as any)?.role;
  if (!session || !session.user || (currentRole !== "ADMIN" && currentRole !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Prevent deleting self
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) return NextResponse.json({ message: "User not found" }, { status: 404 });
    
    if (session.user.email === userToDelete.email) {
      return NextResponse.json({ message: "Cannot delete yourself" }, { status: 400 });
    }

    // Use transaction to delete related records first (those without Cascade Delete in schema)
    await prisma.$transaction([
      prisma.userBook.deleteMany({ where: { userId: id } }),
      prisma.evaluationResult.deleteMany({ where: { userId: id } }),
      prisma.clubMember.deleteMany({ where: { userId: id } }),
      prisma.post.deleteMany({ where: { userId: id } }),
      prisma.comment.deleteMany({ where: { userId: id } }),
      prisma.vocabulary.deleteMany({ where: { userId: id } }),
      prisma.note.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    await audit({
      actorId: (session.user as any)?.id,
      actorEmail: session.user.email,
      actorRole: currentRole,
      action: AUDIT_ACTIONS.USER_DELETE,
      resource: "User",
      resourceId: id,
      request: req,
      metadata: { deletedEmail: userToDelete.email, deletedRole: userToDelete.role },
    });

    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    return apiError(error, 500, `delete user ${id} failed`);
  }
}
