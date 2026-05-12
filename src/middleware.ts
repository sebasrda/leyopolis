import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit, clientIp, tooManyRequestsResponse } from "@/lib/ratelimit";

const STUDENT_BLOCKED_PATHS = [
  "/dashboard/profesor",
  "/dashboard/admin",
  "/dashboard/superadmin",
  "/dashboard/translator",
  "/dashboard/coordinador",
];

const TEACHER_BLOCKED_PATHS = [
  "/dashboard/admin",
  "/dashboard/superadmin",
];

const ADMIN_BLOCKED_PATHS = [
  "/dashboard/superadmin",
];

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/demo",
  "/precios",
  "/api/auth",
  "/api/register",
  "/expired",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow static files and API auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/books/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // ── Global IP rate limit on API routes (anti-bot / DoS) ──
  // Skip /api/auth/* (NextAuth has its own flow and is brute-force-protected
  // separately via login lockout). Authenticated users get a much higher
  // budget so multiple tabs / a busy school network don't trip the limit.
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    const ip = clientIp(request.headers);
    const authed = !!token;
    const key = authed
      ? `api:user:${(token as any)?.id || ip}`
      : `api:ip:${ip}`;
    const limit = authed ? 600 : 60; // per minute
    const rl = await rateLimit(key, { limit, windowMs: 60_000 });
    if (!rl.ok) {
      return tooManyRequestsResponse(rl);
    }
  }

  // If not authenticated and accessing protected route, redirect to login
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!token) return NextResponse.next();

  if (token.expiresAt && new Date() > new Date(token.expiresAt as string)) {
    if (pathname !== "/expired") {
      return NextResponse.redirect(new URL("/expired", request.url));
    }
  }

  const role = (token.role as string) || "STUDENT";

  // Student restrictions
  if (role === "STUDENT") {
    if (STUDENT_BLOCKED_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Block AI API endpoints for students
    if (pathname.startsWith("/api/ai-tutor") || pathname.startsWith("/api/ai/")) {
      return NextResponse.json({ message: "Acceso IA no disponible para estudiantes" }, { status: 403 });
    }
  }

  // Teacher restrictions
  if (role === "TEACHER") {
    // Whitelist: teachers can access these admin pages because they're
    // pedagogical (quiz answers reference) not management.
    const teacherAllowedAdmin = pathname.startsWith("/dashboard/admin/answers");
    if (TEACHER_BLOCKED_PATHS.some(p => pathname.startsWith(p)) && !teacherAllowedAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Coordinator restrictions
  if (role === "COORDINATOR") {
    if (
      pathname.startsWith("/dashboard/admin") &&
      !pathname.startsWith("/dashboard/admin/stats") &&
      !pathname.startsWith("/dashboard/admin/answers")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/dashboard/superadmin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Admin restrictions
  if (role === "ADMIN") {
    if (ADMIN_BLOCKED_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
