import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Run database migrations for new columns
export async function POST() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "SUPERADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Add displaySettings column to Book table if it doesn't exist
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "displaySettings" TEXT`
    );
    results.push("✅ Added displaySettings column to Book table");
  } catch (error: any) {
    results.push(`⚠️ displaySettings: ${error.message}`);
  }

  return NextResponse.json({ results });
}
