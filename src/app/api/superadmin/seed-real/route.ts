import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = "sebastianrod336@gmail.com";
  
  try {
    const user = await (prisma.user as any).upsert({
      where: { email },
      update: {
        role: "SUPERADMIN",
      },
      create: {
        email,
        name: "Sebastian Admin",
        role: "SUPERADMIN",
        password: null, 
      },
    });

    return NextResponse.json({
      success: true,
      message: `${email} is now SUPERADMIN! log in with Google to access the account.`,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
