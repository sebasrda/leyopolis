import { NextResponse } from "next/server";
import { getUserIdAndRole } from "@/lib/access";
import { getStudentsForUser } from "@/lib/teacherStudents";
import { apiError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function noStore(payload: any, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      ...(init?.headers || {}),
    },
  });
}

export async function GET() {
  const user = await getUserIdAndRole();
  if (!user) return noStore({ message: "Unauthorized" }, { status: 401 });
  if (!["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(user.role)) {
    return noStore({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const students = await getStudentsForUser(user.userId, user.role as any);
    return noStore({ students, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    return apiError(error, 500, `/api/teacher/students error: ${error?.message}`);
  }
}
