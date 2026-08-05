import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLoginLocked, recordLoginFailure, resetLoginFailures, clientIp } from "@/lib/ratelimit";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales inválidas");
        }

        const emailRaw = credentials.email.trim();
        const emailLower = emailRaw.toLowerCase();
        const plainPassword = String(credentials.password); // never trim — preserves intentional whitespace

        // Extract client IP from NextAuth's request (it exposes headers object)
        const headers: Headers = (req?.headers && typeof (req.headers as any).get === "function"
          ? (req.headers as unknown as Headers)
          : new Headers(req?.headers as Record<string, string> | undefined));
        const ip = clientIp(headers);

        // ── BRUTE-FORCE GUARD: block if too many recent failed attempts ──
        const lockState = await isLoginLocked(emailLower, ip);
        if (lockState.locked) {
          const mins = Math.max(1, Math.ceil(lockState.retryAfter / 60));
          throw new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${mins} minuto${mins === 1 ? "" : "s"}.`);
        }

        // Case-insensitive email lookup — accounts may have been created
        // with mixed-case emails (e.g. "Pedro@example.com") but Prisma's
        // `findUnique({ email: ... })` is case-sensitive. findFirst with
        // `mode: 'insensitive'` matches regardless.
        const user = await prisma.user.findFirst({
          where: { email: { equals: emailRaw, mode: "insensitive" } },
        });

        if (!user || !user.password) {
          await recordLoginFailure(emailLower, ip);
          throw new Error("Usuario no encontrado");
        }

        if (user.isActive === false) {
          // Don't increment failure counter — this is a server-side decision,
          // not a wrong password.
          throw new Error("Su cuenta ha sido suspendida. Contacte con un administrador.");
        }

        const isPasswordCorrect = await bcrypt.compare(
          plainPassword,
          user.password
        );

        if (!isPasswordCorrect) {
          const after = await recordLoginFailure(emailLower, ip);
          if (after.locked) {
            throw new Error("Demasiados intentos fallidos. Cuenta bloqueada temporalmente por 15 minutos.");
          }
          const remaining = Math.max(0, 5 - after.count);
          throw new Error(`Contraseña incorrecta. Te quedan ${remaining} intento${remaining === 1 ? "" : "s"}.`);
        }

        if (user.expiresAt && new Date() > user.expiresAt) {
          throw new Error("Su licencia o periodo de prueba ha expirado");
        }

        // Successful login — clear failure counter
        await resetLoginFailures(emailLower, ip);

        const role =
          user.role === "SUPERADMIN" || user.role === "STUDENT" || user.role === "TEACHER" || user.role === "COORDINATOR" || user.role === "ADMIN"
            ? user.role
            : "STUDENT";

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role,
          licenseType: user.licenseType,
          expiresAt: user.expiresAt,
        };
      },
    }),
    CredentialsProvider({
      id: "sso",
      name: "sso",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          throw new Error("Token missing");
        }

        try {
          const secret = process.env.EDUNOMAD_JWT_SECRET;
          if (!secret) throw new Error("EDUNOMAD_JWT_SECRET not configured");

          const decoded = jwt.verify(credentials.token, secret) as any;
          if (!decoded.email) throw new Error("Token missing email");

          const emailRaw = decoded.email.trim();
          
          const user = await prisma.user.findFirst({
            where: { email: { equals: emailRaw, mode: "insensitive" } },
          });

          if (!user) {
            throw new Error(`El usuario ${emailRaw} no existe en Leyopolis. Debes estar registrado en ambas plataformas con el mismo correo.`);
          }

          if (user.isActive === false) {
            throw new Error("Su cuenta ha sido suspendida. Contacte con un administrador.");
          }

          if (user.expiresAt && new Date() > user.expiresAt) {
            throw new Error("Su licencia ha expirado");
          }

          const role =
            user.role === "SUPERADMIN" || user.role === "STUDENT" || user.role === "TEACHER" || user.role === "COORDINATOR" || user.role === "ADMIN"
              ? user.role
              : "STUDENT";

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role,
            licenseType: user.licenseType,
            expiresAt: user.expiresAt,
            ssoSource: "edunomad",
          };
        } catch (error: any) {
          console.error("SSO verify error:", error.message);
          throw new Error(error.message || "Fallo en autenticación SSO");
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as unknown as { role?: string }).role;
        if (role === "SUPERADMIN" || role === "STUDENT" || role === "TEACHER" || role === "COORDINATOR" || role === "ADMIN") {
          token.role = role;
        }
        token.id = user.id;
        token.licenseType = (user as any).licenseType;
        token.expiresAt = (user as any).expiresAt;
        if ((user as any).ssoSource) {
          token.ssoSource = (user as any).ssoSource;
        }
      }
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: String(token.id) }, select: { role: true, licenseType: true, expiresAt: true } });
        const role = dbUser?.role;
        if (role === "SUPERADMIN" || role === "STUDENT" || role === "TEACHER" || role === "COORDINATOR" || role === "ADMIN") {
          token.role = role;
        }
        token.licenseType = dbUser?.licenseType;
        token.expiresAt = dbUser?.expiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.role) session.user.role = token.role;
        if (token.id) session.user.id = token.id;
        (session.user as any).licenseType = token.licenseType;
        (session.user as any).expiresAt = token.expiresAt;
        if (token.ssoSource) (session.user as any).ssoSource = token.ssoSource;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        const userDb = prisma as unknown as {
          institution: {
            findUnique: (args: unknown) => Promise<{ id: string } | null>;
          };
          user: {
            update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
          };
        };

        const email = user.email?.toLowerCase();
        if (email && email.includes("@")) {
          const domain = email.split("@")[1]!.trim().toLowerCase();
          const institution = await userDb.institution.findUnique({ where: { domain }, select: { id: true } });
          if (institution) {
            await userDb.user.update({
              where: { id: user.id },
              data: { institutionId: institution.id },
            });
          }
        }
      } catch {
      }

      const activityDb = prisma as unknown as {
        userActivity: {
          create: (args: { data: { userId: string; type: string } }) => Promise<unknown>;
        };
      };

      try {
        await activityDb.userActivity.create({
          data: {
            userId: user.id,
            type: "SIGN_IN",
          },
        });
      } catch {
      }
    },
  },
};
