
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  const userRole = (session?.user as any)?.role;
  const allowed = ["ADMIN", "SUPERADMIN"];
  
  if (!session?.user || !allowed.includes(userRole)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        grade: true,
        xp: true,
        level: true,
        lastActive: true,
        institution: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Add virtual status field
    const usersWithStatus = users.map(u => ({ ...u, status: "Activo" }));

    return NextResponse.json(usersWithStatus);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
  }
}

