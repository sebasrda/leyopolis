import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Load global flipbook defaults (public)
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "flipbook-global-defaults" },
    });

    if (!setting?.value) {
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({ settings: JSON.parse(setting.value) });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

// PUT: Save global flipbook defaults (ADMIN/SUPERADMIN only)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || !["ADMIN", "SUPERADMIN"].includes(userRole)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

  const value = JSON.stringify({
    scale: body.scale ?? 1,
    offsetX: body.offsetX ?? 0,
    offsetY: body.offsetY ?? 0,
    isDarkMode: body.isDarkMode ?? false,
  });

  try {
    await prisma.systemSetting.upsert({
      where: { key: "flipbook-global-defaults" },
      update: { value },
      create: { key: "flipbook-global-defaults", value },
    });

    return NextResponse.json({ message: "Configuración global guardada para todos los usuarios" });
  } catch (error) {
    console.error("Error saving global defaults:", error);
    return NextResponse.json({ message: "Error al guardar" }, { status: 500 });
  }
}
