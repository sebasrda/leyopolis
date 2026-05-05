import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

function generatePassword(length = 8) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function computeExpiry(licenseType: string) {
  if (licenseType === "MENSUAL") return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (licenseType === "TRIMESTRAL") return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  if (licenseType === "ANUAL") return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  if (licenseType === "DEMO") return new Date(Date.now() + 24 * 60 * 60 * 1000);
  return null;
}

/**
 * POST /api/superadmin/institutions/[id]/users/bulk
 * Body: multipart/form-data with field "file" (CSV text content)
 * CSV format: name,email,password,grade,licenseType
 *   - password: optional (auto-generated if empty)
 *   - grade: optional
 *   - licenseType: optional (defaults to ANUAL)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPERADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Check ADMIN is from this institution
    if (userRole === "ADMIN") {
      const dbUser = await (prisma as any).user.findUnique({
        where: { id: (session.user as any).id },
        select: { institutionId: true },
      });
      if (dbUser?.institutionId !== id) {
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });
      }
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ message: "No se recibió archivo" }, { status: 400 });
    }

    const rawText = await file.text();

    // Parse CSV – support comma or semicolon separator
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ message: "El archivo no tiene datos válidos (se requiere encabezado + al menos una fila)" }, { status: 400 });
    }

    // Auto-detect separator
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));

    // Verify required headers
    const emailIdx = headers.indexOf("email");
    if (emailIdx === -1) {
      return NextResponse.json({ message: "El CSV debe tener una columna 'email'" }, { status: 400 });
    }
    const nameIdx = headers.indexOf("name") !== -1 ? headers.indexOf("name") : headers.indexOf("nombre");
    const passIdx = headers.indexOf("password") !== -1 ? headers.indexOf("password") : headers.indexOf("contrasena");
    const gradeIdx = headers.indexOf("grade") !== -1 ? headers.indexOf("grade") : headers.indexOf("grado");
    const licenseIdx = headers.indexOf("licensetype") !== -1 ? headers.indexOf("licensetype") : headers.indexOf("licencia");

    // Check institution student limit
    const institution = await (prisma as any).institution.findUnique({ where: { id }, select: { maxStudents: true } });
    const currentCount = await (prisma as any).user.count({ where: { institutionId: id, role: "STUDENT" } });

    const dataRows = lines.slice(1);
    const results: { email: string; name: string; password: string; status: "created" | "skipped"; reason?: string }[] = [];

    let created = 0;

    for (const line of dataRows) {
      if (!line.trim()) continue;
      const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      const email = cols[emailIdx]?.toLowerCase();
      if (!email || !email.includes("@")) {
        results.push({ email: cols[emailIdx] || "", name: "", password: "", status: "skipped", reason: "Email inválido" });
        continue;
      }

      const name = nameIdx >= 0 ? cols[nameIdx] || email.split("@")[0] : email.split("@")[0];
      const plainPassword = (passIdx >= 0 && cols[passIdx]) ? cols[passIdx] : generatePassword(8);
      const grade = gradeIdx >= 0 ? cols[gradeIdx] || "" : "";
      const licenseType = licenseIdx >= 0 ? (cols[licenseIdx] || "ANUAL").toUpperCase() : "ANUAL";

      // Check limit
      if (institution?.maxStudents && (currentCount + created) >= institution.maxStudents) {
        results.push({ email, name, password: "", status: "skipped", reason: "Límite de estudiantes alcanzado" });
        continue;
      }

      // Check duplicate
      const existing = await (prisma as any).user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        results.push({ email, name, password: "", status: "skipped", reason: "Email ya registrado" });
        continue;
      }

      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const expiresAt = computeExpiry(licenseType);

      await (prisma as any).user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "STUDENT",
          grade,
          institutionId: id,
          licenseType,
          ...(expiresAt && { expiresAt }),
        },
      });

      results.push({ email, name, password: plainPassword, status: "created" });
      created++;
    }

    return NextResponse.json({ created, total: dataRows.length, results });
  } catch (error) {
    console.error("[BULK-STUDENTS] Error:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
