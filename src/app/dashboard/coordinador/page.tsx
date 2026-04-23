"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen, Users, Sparkles, Play, ChevronRight } from "lucide-react";
import { SuggestedReadingsDialog } from "@/components/dashboard/teacher/SuggestedReadingsDialog";
import { useLearning } from "@/context/LearningContext";

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
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuggestedOpen, setIsSuggestedOpen] = useState(false);
  const { userBooks } = useLearning();

  // Hero book logic
  const heroBook = userBooks
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())[0];

  const heroBookData = heroBook?.book || null;
  const heroProgress = heroBook?.progress || 0;

  useEffect(() => {
    if (!session) return;
    
    const fetchData = () => {
      Promise.all([
        fetch("/api/coordinator/overview").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/coordinator/users").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/teacher/classes").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([o, u, c]) => {
          setOverview(o);
          setUsers(u);
          setClasses(c);
        })
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  return (
    <div className="text-white space-y-8">
      {/* ── TOP HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            ¡Hola, {session?.user?.name?.split(" ")[0] || "Coordinador"}! 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Seguimiento institucional: lectura, quizzes y progreso por grado en tiempo real.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-[#6B21A8] hover:bg-[#581C87] text-white shadow-lg shadow-purple-900/40 gap-2 rounded-xl h-11 px-6"
            onClick={() => setIsSuggestedOpen(true)}
          >
            <Sparkles className="h-4 w-4" /> Lecturas Sugeridas
          </Button>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-8">
          {/* ── Continúa tu aventura (Coordinator style) ─── */}
          <section>
            <h2 className="text-base font-bold text-white mb-3">Tu actividad reciente</h2>
            <div className="relative rounded-2xl overflow-hidden bg-[#0f1623] border border-white/10 h-[260px] flex items-center gap-8 px-8 group shadow-2xl">
              {/* Adventure Landscape Background */}
              <div
                className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1491843384429-171f1f2079e2?auto=format&fit=crop&q=80&w=2070')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623] via-[#0f1623]/60 to-transparent" />

              {heroBookData ? (
                <>
                  <div className="relative z-10 shrink-0">
                    <div className="w-32 h-44 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/20 transition-transform duration-300 group-hover:-translate-y-1" style={{ perspective: "1000px" }}>
                      {heroBookData.coverImage ? (
                        <img src={heroBookData.coverImage} alt={heroBookData.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center p-2">
                          <span className="text-white text-xs text-center font-bold">{heroBookData.title}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 flex-1 min-w-0">
                    <p className="text-xs text-indigo-300 font-medium mb-1 uppercase tracking-widest">Seguir explorando</p>
                    <h3 className="text-xl font-bold text-white mb-0.5 line-clamp-1">{heroBookData.title}</h3>
                    <p className="text-slate-400 text-sm mb-4">{heroBookData.author}</p>
                    
                    <p className="text-xs text-slate-400 mb-1.5">{heroProgress}% completado</p>
                    <div className="w-full bg-card/10 rounded-full h-1.5 mb-4 overflow-hidden max-w-xs">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full transition-all" style={{ width: `${heroProgress}%` }} />
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/reader/${heroBookData.id}`}
                        className="inline-flex items-center gap-2 bg-[#6B21A8] hover:bg-[#581C87] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/40"
                      >
                        <Play className="h-4 w-4 fill-white" /> Abrir Libro
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative z-10 py-10">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-none mb-3">Panel Académico</Badge>
                  <h3 className="text-2xl font-black text-white mb-2">Monitorea el Futuro</h3>
                  <p className="text-slate-300 max-w-md mb-6 text-sm">
                    Revisa las lecturas asignadas y los resultados de los estudiantes para optimizar el plan pedagógico.
                  </p>
                  <Link
                    href="/dashboard/library"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10"
                  >
                    Ver Biblioteca <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── HERO MONITORING CARD ───────────────────── */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0f1623] border border-white/10 min-h-[220px] flex items-center p-8 group shadow-2xl">
            <div
              className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=2071')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623] via-[#0f1623]/60 to-transparent" />
            
            <div className="relative z-10 w-full">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-none px-3 py-1">Panel de Coordinación</Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-none px-3 py-1">Datos en Vivo</Badge>
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-white mb-2">Estado Académico</h2>
                    <p className="text-slate-300 max-w-sm text-sm">
                      Analiza el rendimiento general y detecta áreas de mejora en tiempo real.
                    </p>
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <div>
                      <p className="text-2xl font-bold text-white">{overview?.counts.students ?? 0}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Estudiantes</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-2xl font-bold text-white">{overview?.counts.teachers ?? 0}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Docentes</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-2xl font-bold text-white">{overview?.counts.sessions7d ?? 0}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sesiones (7d)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Averages & Tools) ── */}
        <div className="space-y-6">
          <div className="bg-[#1a2235] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <BarChart3 className="h-4 w-4 text-indigo-400" /> Rendimiento Global
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Progreso de lectura</span>
                  <span className="text-indigo-300">{overview?.counts.avgProgress ?? 0}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${overview?.counts.avgProgress ?? 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Desempeño en Quizzes</span>
                  <span className="text-emerald-400">{overview?.counts.avgQuiz ?? 0}/100</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${overview?.counts.avgQuiz ?? 0}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Herramientas Rápidas</p>
              <Button asChild className="w-full justify-start gap-3 bg-white/5 hover:bg-white/10 text-white border-white/5 rounded-xl h-10 text-xs">
                <Link href="/dashboard/reports"><BarChart3 className="h-3 w-3 text-emerald-400" /> Reportes Full</Link>
              </Button>
              <Button asChild className="w-full justify-start gap-3 bg-white/5 hover:bg-white/10 text-white border-white/5 rounded-xl h-10 text-xs">
                <Link href="/dashboard/activities"><Sparkles className="h-3 w-3 text-purple-400" /> Actividades</Link>
              </Button>
            </div>
          </div>

          <Card className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/30 shadow-xl overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-10 w-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Sugerir Lecturas</h3>
                <p className="text-[10px] text-indigo-200 mt-1">Recomienda libros a grados específicos</p>
              </div>
              <Button className="w-full bg-[#6B21A8] hover:bg-[#581C87] text-white rounded-xl h-9 text-xs" onClick={() => setIsSuggestedOpen(true)}>
                Abrir Selector
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>


      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Estudiantes</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview?.counts.students ?? 0}</div>
                <Users className="h-5 w-5 text-indigo-400" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profesores</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview?.counts.teachers ?? 0}</div>
                <Users className="h-5 w-5 text-emerald-600" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lecturas (7 días)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview?.counts.sessions7d ?? 0}</div>
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg text-white">Libros más leídos (7 días)</CardTitle>
                <CardDescription className="text-slate-400">Ranking institucional basado en sesiones de lectura.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.topBooks ?? []).length ? (
                  overview!.topBooks.map((b) => (
                    <div key={b.bookId} className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:bg-white/5 transition group">
                      <div className="space-y-1">
                        <div className="font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">{b.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">{b.author}</div>
                      </div>
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-none px-3">
                        {b.reads} lecturas
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 py-4">Sin datos de lectura recientes.</div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Herramientas</CardTitle>
                  <CardDescription className="text-slate-400">Accesos directos de gestión</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start gap-3 bg-white/5 hover:bg-white/10 text-white border-white/5 rounded-xl h-11">
                    <Link href="/dashboard/activities">
                      <Sparkles className="h-4 w-4 text-purple-400" /> Gestionar Actividades
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start gap-3 bg-white/5 hover:bg-white/10 text-white border-white/5 rounded-xl h-11">
                    <Link href="/dashboard/courses">
                      <Users className="h-4 w-4 text-indigo-400" /> Administrar Cursos
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start gap-3 bg-white/5 hover:bg-white/10 text-white border-white/5 rounded-xl h-11">
                    <Link href="/dashboard/reports">
                      <BarChart3 className="h-4 w-4 text-emerald-400" /> Ver Reportes Detallados
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border-indigo-500/30 shadow-xl overflow-hidden">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="h-12 w-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Sugerir Lecturas</h3>
                    <p className="text-xs text-indigo-200 mt-1">Recomienda libros a grados específicos</p>
                  </div>
                  <Button 
                    className="w-full bg-[#6B21A8] hover:bg-[#581C87] text-white rounded-xl"
                    onClick={() => setIsSuggestedOpen(true)}
                  >
                    Abrir Selector
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <SuggestedReadingsDialog 
            isOpen={isSuggestedOpen}
            onClose={() => setIsSuggestedOpen(false)}
            onSuccess={() => {
              // Refresh overview if needed
            }}
            classes={classes}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">Progreso por grado</CardTitle>
                <CardDescription className="text-slate-400">Promedio de progreso de lectura institucional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(overview?.progressByGrade ?? []).length ? (
                  overview!.progressByGrade.map((r) => (
                    <div key={r.grade} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-300">{r.grade}</span>
                        <span className="text-indigo-400 font-black">{r.avgProgress}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all" style={{ width: `${r.avgProgress}%` }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">Sin datos de progreso.</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">Resultados recientes</CardTitle>
                <CardDescription className="text-slate-400">Últimos quizzes completados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.latestQuizzes ?? []).length ? (
                  overview!.latestQuizzes.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:bg-white/5 transition group">
                      <div className="space-y-1">
                        <div className="font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">{a.activity.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {a.student.name || a.student.email || "Estudiante"} {a.student.grade ? `· ${a.student.grade}` : ""}
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-none px-3">
                        {a.score}/100
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 py-4">Sin resultados recientes.</div>
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
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground line-clamp-1">{s.name || s.email || "Estudiante"}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{s.grade || "Sin grado"}</div>
                      </div>
                      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/10">
                        {s.avgProgress}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Sin estudiantes.</div>
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
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground line-clamp-1">{t.name || t.email || "Profesor"}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{t.email || " "}</div>
                      </div>
                      <Badge variant="outline" className="bg-muted text-foreground hover:bg-muted">
                        {t.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Sin profesores.</div>
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
