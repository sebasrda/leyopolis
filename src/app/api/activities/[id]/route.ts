import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const activity = await (prisma as any).activity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        content: true,
        points: true,
        bookId: true,
        createdAt: true,
      },
    });

    if (!activity) {
      return NextResponse.json({ message: "Actividad no encontrada" }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
