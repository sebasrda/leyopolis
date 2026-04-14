import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: "Email requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid user enumeration
    if (!user) {
      return NextResponse.json({ message: "Si el correo existe, recibirás un enlace de recuperación." });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the token (we'll use a dedicated table via raw prisma)
    await (prisma as any).passwordResetToken.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || "https://leyopolis.vercel.app"}/reset-password?token=${token}`;

    // Send the email via Resend
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Leyópolis <no-reply@leyopolis.com>",
      to: email,
      subject: "Restaura tu contraseña - Leyópolis",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #4f46e5; color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px;">L</div>
            <h1 style="color: #1e1b4b; font-size: 20px; margin-top: 12px;">LEYÓPOLIS</h1>
          </div>
          <h2 style="color: #111827;">Recuperación de Contraseña</h2>
          <p style="color: #6b7280;">Hola <strong>${user.name || email}</strong>,</p>
          <p style="color: #6b7280;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón a continuación para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Restaurar Contraseña
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">Este enlace expirará en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #d1d5db; font-size: 11px; text-align: center;">© 2026 LEYÓPOLIS. Todos los derechos reservados.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Si el correo existe, recibirás un enlace de recuperación." });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Error al procesar la solicitud" }, { status: 500 });
  }
}
