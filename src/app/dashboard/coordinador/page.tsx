"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen, Users } from "lucide-react";

type Overview = {
  counts: {
    students: number;
    teachers: number;
    books: number;
    sessions7d: number;
    avgProgress: number;
    avgQuiz: number;
  };
  topBooks: { bookId: string; reads: number; title: string; author: string }[];
  progressByGrade: { grade: string; avgProgress: number }[];
  latestQuizzes: {
    id: string;
    score: number;
    createdAt: string;
    student: { id: string; name: string | null; email: string | null; grade: string | null };
    activity: { id: string; title: string; bookId: string | null };
  }[];
};

export default function CoordinadorDashboardPage() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<{
    students: { id: string; name: string | null; email: string | null; grade: string | null; avgProgress: number }[];
    teachers: { id: string; name: string | null; email: string | null; role: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch("/api/coordinator/overview").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/coordinator/users").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([o, u]) => {
        setOverview(o);
        setUsers(u);
      })
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Panel del Coordinador</h1>
        <p className="text-gray-500">Seguimiento institucional: lectura, quizzes y progreso por grado.</p>
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Estudiantes</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview?.counts.students ?? 0}</div>
                <Users className="h-5 w-5 text-indigo-600" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Profesores</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview?.counts.teachers ?? 0}</div>
                <Users className="h-5 w-5 text-emerald-600" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Lecturas (7 días)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview?.counts.sessions7d ?? 0}</div>
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-none shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Libros más leídos (7 días)</CardTitle>
                <CardDescription>Ranking institucional basado en sesiones de lectura.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.topBooks ?? []).length ? (
                  overview!.topBooks.map((b) => (
                    <div key={b.bookId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900 line-clamp-1">{b.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{b.author}</div>
                      </div>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                        {b.reads}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Sin datos.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Promedios</CardTitle>
                <CardDescription>Progreso y quizzes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Progreso promedio</div>
                  <div className="font-bold text-indigo-700">{overview?.counts.avgProgress ?? 0}%</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Quiz promedio</div>
                  <div className="font-bold text-emerald-700">{overview?.counts.avgQuiz ?? 0}</div>
                </div>
                <div className="flex gap-2">
                  <Button asChild className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/dashboard/activities">Actividades</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/dashboard/courses">Cursos</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Progreso por grado</CardTitle>
                <CardDescription>Promedio de progreso de lectura por grado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.progressByGrade ?? []).length ? (
                  overview!.progressByGrade.map((r) => (
                    <div key={r.grade} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div className="font-medium text-gray-800">{r.grade}</div>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
                        {r.avgProgress}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Sin datos.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Resultados recientes</CardTitle>
                <CardDescription>Últimos quizzes completados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.latestQuizzes ?? []).length ? (
                  overview!.latestQuizzes.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900 line-clamp-1">{a.activity.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {a.student.name || a.student.email || "Estudiante"} {a.student.grade ? `· ${a.student.grade}` : ""}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                        {a.score}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Sin datos.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Estudiantes</CardTitle>
                <CardDescription>Listado por institución (con progreso promedio).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(users?.students ?? []).length ? (
                  users!.students.slice(0, 10).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900 line-clamp-1">{s.name || s.email || "Estudiante"}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{s.grade || "Sin grado"}</div>
                      </div>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                        {s.avgProgress}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Sin estudiantes.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Profesores</CardTitle>
                <CardDescription>Profesores y coordinadores de la institución.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(users?.teachers ?? []).length ? (
                  users!.teachers.slice(0, 10).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900 line-clamp-1">{t.name || t.email || "Profesor"}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{t.email || " "}</div>
                      </div>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
                        {t.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Sin profesores.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Accesos</CardTitle>
              <CardDescription>Herramientas institucionales</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/library">
                  <BookOpen className="h-4 w-4" /> Biblioteca
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/reports">
                  <BarChart3 className="h-4 w-4" /> Reportes
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
