import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Load display settings for a book (public, no auth needed for reading)
export async function GET(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  try {
    const book = await (prisma as any).book.findUnique({
      where: { id: bookId },
      select: { displaySettings: true },
    });

    if (!book) {
      return NextResponse.json({ settings: null });
    }

    let settings = null;
    if (book.displaySettings) {
      try {
        settings = JSON.parse(book.displaySettings);
      } catch {
        settings = null;
      }
    }

    // Also load global default from SystemSetting
    let globalSettings = null;
    try {
      const globalSetting = await prisma.systemSetting.findUnique({
        where: { key: "flipbook-global-defaults" },
      });
      if (globalSetting?.value) {
        globalSettings = JSON.parse(globalSetting.value);
      }
    } catch {}

    return NextResponse.json({ settings, globalSettings });
  } catch (error) {
    console.error("Error fetching display settings:", error);
    return NextResponse.json({ settings: null, globalSettings: null });
  }
}

// PUT: Save display settings for a book (admin/superadmin only)
export async function PUT(req: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || !["ADMIN", "SUPERADMIN"].includes(userRole)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { bookId } = await params;
  const body = await req.json();

  const displaySettings = JSON.stringify({
    scale: body.scale ?? 1,
    offsetX: body.offsetX ?? 0,
    offsetY: body.offsetY ?? 0,
    isDarkMode: body.isDarkMode ?? false,
  });

  try {
    await (prisma as any).book.update({
      where: { id: bookId },
      data: { displaySettings },
    });

    return NextResponse.json({ message: "Configuración de visualización guardada" });
  } catch (error) {
    console.error("Error saving display settings:", error);
    return NextResponse.json({ message: "Error al guardar" }, { status: 500 });
  }
}
