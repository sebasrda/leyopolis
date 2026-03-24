"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Trophy } from "lucide-react";

type GradeBooksResponse = { grade: string | null; books: { id: string; title: string; author: string; coverImage?: string | null }[] };
type UserStats = { totalBooks: number; completedBooks: number; averageDailyMinutes: number; totalMinutes: number; streak: number; level: number; xp: number };

export default function EstudianteDashboardPage() {
  const { data: session } = useSession();
  const [gradeBooks, setGradeBooks] = useState<GradeBooksResponse | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch("/api/student/grade-books").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/stats").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([gb, st]) => {
        setGradeBooks(gb);
        setStats(st);
      })
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Panel del Estudiante</h1>
        <p className="text-gray-500">Lectura, actividades, juegos y progreso.</p>
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
                <CardTitle className="text-sm font-medium text-gray-500">Libros</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats?.totalBooks ?? 0}</div>
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Completados</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats?.completedBooks ?? 0}</div>
                <Trophy className="h-5 w-5 text-amber-600" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Nivel</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats?.level ?? 1}</div>
                <Sparkles className="h-5 w-5 text-purple-600" />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href="/dashboard/library">Ir a Biblioteca</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/activities">Actividades</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/progress">Mi Progreso</Link>
            </Button>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Libros por grado</CardTitle>
              <CardDescription>
                {gradeBooks?.grade ? `Colección asignada a ${gradeBooks.grade}` : "No hay grado asignado todavía."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(gradeBooks?.books ?? []).length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gradeBooks!.books.slice(0, 9).map((b) => (
                    <Card key={b.id} className="border border-gray-200 shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base line-clamp-1">{b.title}</CardTitle>
                        <CardDescription className="line-clamp-1">{b.author}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-gray-50">Asignado</Badge>
                        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                          <Link href={`/dashboard/reader/${b.id}?title=${encodeURIComponent(b.title)}`}>Leer</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {gradeBooks?.grade ? "No hay libros asignados a este grado." : "Contacta al coordinador para asignarte un grado."}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

