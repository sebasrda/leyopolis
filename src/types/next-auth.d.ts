import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

export type LeyopolisUserRole = "STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: LeyopolisUserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: LeyopolisUserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: LeyopolisUserRole;
  }
}
