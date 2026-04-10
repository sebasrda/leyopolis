import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ message: "Error al obtener el perfil" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email } = body;

    // Validate email if it's being changed
    if (email && email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json({ message: "El correo electrónico ya está en uso" }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name || undefined,
        email: email || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Perfil actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ message: "Error al actualizar el perfil" }, { status: 500 });
  }
}
