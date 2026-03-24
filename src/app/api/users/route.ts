
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Check if admin
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // status is not in schema yet, assuming active if exists
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
