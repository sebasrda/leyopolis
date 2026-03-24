import { NextResponse } from "next/server";
import { getUserIdAndRole } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json(user);
}

