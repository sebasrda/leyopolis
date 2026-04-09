import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = "sebastianrod336@gmail.com";
  const rawPassword = "Sebasrod8011";
  
  try {
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    
    const user = await (prisma.user as any).upsert({
      where: { email },
      update: {
        role: "SUPERADMIN",
        password: hashedPassword,
      },
      create: {
        email,
        name: "Sebastian Admin",
        role: "SUPERADMIN",
        password: hashedPassword, 
      },
    });

    return NextResponse.json({
      success: true,
      message: `${email} is now SUPERADMIN with password access! log in via the normal form.`,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
