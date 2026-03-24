"use client";

import { useSession } from "next-auth/react";
import TeacherDashboard from "@/components/dashboard/teacher/TeacherDashboard";

export default function ProfesorDashboardPage() {
  const { data: session } = useSession();
  if (!session) return null;
  return <TeacherDashboard />;
}

