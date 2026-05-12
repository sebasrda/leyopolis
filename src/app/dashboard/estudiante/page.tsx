"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  Trophy,
  Flame,
  Target,
  Clock,
  TrendingUp,
  ArrowRight,
  Calendar,
  Loader2,
} from "lucide-react";
import { LEVEL_THRESHOLDS, MAX_LEVEL } from "@/context/GamificationContext";

interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string | null;
}
type GradeBooksResponse = { grade: string | null; books: Book[] };
type UserStats = {
  totalBooks: number;
  completedBooks: number;
  averageDailyMinutes: number;
  totalMinutes: number;
  streak: number;
  level: number;
  xp: number;
  totalPages: number;
  totalTime: string;
};
type Progress = {
  xp: number;
  level: number;
  streak: number;
  daysActiveThisWeek?: number;
};

function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: "Principiante", 2: "Aprendiz", 3: "Lector", 4: "Explorador", 5: "Aventurero",
    6: "Sabio", 7: "Curioso", 8: "Maestro", 9: "Legendario", 10: "Leyenda",
    11: "Cronista", 12: "Erudito", 13: "Bibliófilo", 14: "Narrador", 15: "Historiador",
    16: "Visionario", 17: "Filósofo", 18: "Arcano", 19: "Centinela", 20: "Gran Maestro",
  };
  return titles[level] || `Nivel ${level}`;
}

export default function EstudianteDashboardPage() {
  const { data: session } = useSession();
  const [gradeBooks, setGradeBooks] = useState<GradeBooksResponse | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch("/api/student/grade-books").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/progress").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/books?_=" + Date.now(), { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([gb, st, pr, allBooks]) => {
        setGradeBooks(gb);
        setStats(st);
        setProgress(pr);
        if (Array.isArray(allBooks)) {
          setRecentBooks(allBooks.filter((b: any) => b.isAssigned).slice(0, 4));
        }
      })
      .finally(() => setLoading(false));
  }, [session]);

  const xpInfo = useMemo(() => {
    const xp = progress?.xp ?? stats?.xp ?? 0;
    const lvl = progress?.level ?? stats?.level ?? 1;
    const currentTh = LEVEL_THRESHOLDS[Math.min(lvl - 1, LEVEL_THRESHOLDS.length - 1)] || 0;
    const nextTh = LEVEL_THRESHOLDS[Math.min(lvl, LEVEL_THRESHOLDS.length - 1)] || currentTh + 500;
    const xpIn = Math.max(0, xp - currentTh);
    const xpNeeded = Math.max(1, nextTh - currentTh);
    const pct = Math.min(100, Math.round((xpIn / xpNeeded) * 100));
    return { xp, lvl, xpIn, xpNeeded, pct, title: getLevelTitle(lvl), maxed: lvl >= MAX_LEVEL };
  }, [progress, stats]);

  const daysThisWeek = Math.min(7, progress?.daysActiveThisWeek ?? 0);
  const weeklyPct = Math.round((daysThisWeek / 7) * 100);

  const userName = session?.user?.name?.split(" ")[0] || "Estudiante";

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/80 text-sm">¡Hola, {userName}! 👋</p>
            <h1 className="text-3xl md:text-4xl font-black mt-1">Panel del Estudiante</h1>
            <p className="text-white/80 mt-1 text-sm max-w-md">
              Resumen de tu lectura, retos semanales y libros asignados por tu colegio.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[280px]">
            <KPI icon={<Flame className="h-4 w-4" />} value={progress?.streak ?? 0} label="Racha" />
            <KPI icon={<Trophy className="h-4 w-4" />} value={stats?.completedBooks ?? 0} label="Completos" />
            <KPI icon={<Clock className="h-4 w-4" />} value={stats?.totalTime || "0m"} label="Leído" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* Level + Weekly goal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Nivel {xpInfo.lvl} · {xpInfo.title}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {xpInfo.xp.toLocaleString("es-CO")} XP
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-700"
                    style={{ width: `${xpInfo.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-muted-foreground tabular-nums">{xpInfo.xpIn} / {xpInfo.xpNeeded} XP</span>
                  <span className="text-indigo-300 font-medium">
                    {xpInfo.maxed ? "¡Nivel máximo!" : `${xpInfo.pct}% al nivel ${xpInfo.lvl + 1}`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    Meta semanal
                  </CardTitle>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {daysThisWeek} de 7 días
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                    style={{ width: `${weeklyPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {daysThisWeek >= 7
                    ? "¡Meta cumplida! 🎉 Reinicia el próximo lunes."
                    : `Te faltan ${7 - daysThisWeek} días activos esta semana`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={<BookOpen className="h-5 w-5" />} color="from-indigo-500 to-purple-600" value={stats?.totalBooks ?? 0} label="Libros abiertos" />
            <StatTile icon={<TrendingUp className="h-5 w-5" />} color="from-emerald-500 to-teal-600" value={stats?.totalPages ?? 0} label="Páginas leídas" />
            <StatTile icon={<Clock className="h-5 w-5" />} color="from-amber-500 to-orange-600" value={stats?.totalMinutes ?? 0} suffix=" min" label="Minutos totales" />
            <StatTile icon={<Calendar className="h-5 w-5" />} color="from-rose-500 to-pink-600" value={stats?.averageDailyMinutes ?? 0} suffix=" min/d" label="Promedio diario" />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Link href="/dashboard/library">
                <BookOpen className="h-4 w-4" /> Ir a Biblioteca
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/activities">
                <Sparkles className="h-4 w-4" /> Actividades
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/progress">
                <TrendingUp className="h-4 w-4" /> Mi Progreso
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/my-readings">
                <Trophy className="h-4 w-4" /> Mis Aventuras
              </Link>
            </Button>
          </div>

          {/* Recent assigned books with covers */}
          {recentBooks.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Mis lecturas asignadas</CardTitle>
                  <Link href="/dashboard/library" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {recentBooks.map((b) => (
                    <Link key={b.id} href={`/dashboard/reader/${b.id}?title=${encodeURIComponent(b.title)}`} className="group">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted border border-border/40 group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all">
                        {b.coverImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium mt-1.5 line-clamp-2 group-hover:text-indigo-300 transition-colors">
                        {b.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{b.author}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grade-specific books */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Libros para tu grado
              </CardTitle>
              <CardDescription>
                {gradeBooks?.grade
                  ? `Colección oficial para ${gradeBooks.grade}`
                  : "Tu coordinador aún no te asignó un grado."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(gradeBooks?.books ?? []).length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gradeBooks!.books.slice(0, 9).map((b) => (
                    <Card key={b.id} className="border border-border/40 shadow-none flex flex-row overflow-hidden">
                      <div className="w-16 shrink-0 bg-muted">
                        {b.coverImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div>
                          <p className="text-sm font-bold line-clamp-2">{b.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{b.author}</p>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                            Asignado
                          </Badge>
                          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs">
                            <Link href={`/dashboard/reader/${b.id}?title=${encodeURIComponent(b.title)}`}>Leer</Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  {gradeBooks?.grade
                    ? "Todavía no hay libros en la colección oficial de tu grado."
                    : "Habla con tu coordinador para que te asigne un grado y unas lecturas."}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 flex flex-col items-center">
      <div className="flex items-center gap-1 text-white/85">{icon}<span className="text-lg font-black tabular-nums">{value}</span></div>
      <span className="text-[10px] uppercase tracking-wide text-white/70 mt-0.5">{label}</span>
    </div>
  );
}

function StatTile({ icon, color, value, label, suffix = "" }: { icon: React.ReactNode; color: string; value: number | string; label: string; suffix?: string }) {
  return (
    <Card className={`border-none overflow-hidden bg-gradient-to-br ${color} text-white shadow-lg`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="bg-white/20 rounded-lg p-1.5">{icon}</span>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums leading-none">
              {typeof value === "number" ? value.toLocaleString("es-CO") : value}
              {suffix}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-white/85 mt-2 uppercase tracking-wide font-semibold">{label}</p>
      </CardContent>
    </Card>
  );
}
