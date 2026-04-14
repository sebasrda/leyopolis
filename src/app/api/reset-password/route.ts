import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Token y contraseña requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const resetRecord = await (prisma as any).passwordResetToken.findUnique({ where: { token } });

    if (!resetRecord) {
      return NextResponse.json({ message: "Token inválido o ya utilizado" }, { status: 400 });
    }

    if (new Date() > resetRecord.expires) {
      await (prisma as any).passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ message: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword },
    });

    await (prisma as any).passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Error al restablecer la contraseña" }, { status: 500 });
  }
}
