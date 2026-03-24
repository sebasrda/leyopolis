import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales inválidas");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error("Usuario no encontrado");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordCorrect) {
          throw new Error("Contraseña incorrecta");
        }

        const role =
          user.role === "STUDENT" || user.role === "TEACHER" || user.role === "COORDINATOR" || user.role === "ADMIN"
            ? user.role
            : "STUDENT";

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as unknown as { role?: string }).role;
        if (role === "STUDENT" || role === "TEACHER" || role === "COORDINATOR" || role === "ADMIN") {
          token.role = role;
        }
        token.id = user.id;
      }
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: String(token.id) }, select: { role: true } });
        const role = dbUser?.role;
        if (role === "STUDENT" || role === "TEACHER" || role === "COORDINATOR" || role === "ADMIN") {
          token.role = role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.role) session.user.role = token.role;
        if (token.id) session.user.id = token.id;
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
