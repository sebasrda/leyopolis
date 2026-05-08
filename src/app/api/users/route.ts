
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const allowed = ["ADMIN", "SUPERADMIN"];
  
  if (!session?.user || !allowed.includes(userRole)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Superadmin sees everyone; institutional admins see only their institution's users
    let institutionFilter: any = {};
    if (userRole === "ADMIN") {
      const callerUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { institutionId: true }
      });
      if (callerUser?.institutionId) {
        institutionFilter = { institutionId: callerUser.institutionId };
      }
    }

    const users = await prisma.user.findMany({
      where: institutionFilter,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        grade: true,
        licenseType: true,
        expiresAt: true,
        createdAt: true,
        xp: true,
        level: true,
        lastActive: true,
        isActive: true,
        institution: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
  }
}



