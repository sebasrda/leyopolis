"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useGamification } from "@/context/GamificationContext";
import { useLearning } from "@/context/LearningContext";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Star,
  Play,
  Target,
  Clock,
  BookOpen,
  Users,
  Zap,
  CheckCircle2,
  Trophy,
  Calendar,
} from "lucide-react";
import { ProgressDonut } from "@/components/dashboard/student/ProgressDonut";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  coverImage?: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  status: "PENDING" | "COMPLETED";
  progress: number;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string;
  };
  class: {
    name: string;
  };
}

// Activity icons map
const ACTIVITY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  read:     { icon: "📚", color: "text-indigo-300", bg: "bg-indigo-500/20" },
  complete: { icon: "🏆", color: "text-yellow-300", bg: "bg-yellow-500/20" },
  streak:   { icon: "🕐", color: "text-green-300",  bg: "bg-green-500/20"  },
  achieve:  { icon: "🌟", color: "text-purple-300", bg: "bg-purple-500/20" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString("es", { day: "numeric", month: "short" });
}

// Week goal constants
const WEEKLY_GOAL_DAYS = 7;

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "Estudiante";
  const { progress } = useGamification();
  const { userBooks } = useLearning();

  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingRec, setLoadingRec] = useState(true);
  const [loadingAssign, setLoadingAssign] = useState(true);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setRecommendations(d); setLoadingRec(false); })
      .catch(() => setLoadingRec(false));
  }, []);

  useEffect(() => {
    fetch("/api/user/assignments")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setAssignments(d); setLoadingAssign(false); })
      .catch(() => setLoadingAssign(false));
  }, []);

  // ── Computed values ──────────────────────────────────────────────
  const completedBooks = userBooks.filter((b) => b.progress >= 100).length;
  const inProgressBooks = userBooks.filter((b) => b.progress > 0 && b.progress < 100).length;
  const toReadBooks = Math.max(0, userBooks.length - completedBooks - inProgressBooks);

  // Hero book: most recently read in-progress
  const heroBook = userBooks
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())[0];

  const heroBookData = heroBook?.book || null;
  const heroProgress = heroBook?.progress || 0;

  // Weekly goal progress (streak / 7 days)
  const weeklyGoalPct = Math.min(100, Math.round((progress.streakDays / WEEKLY_GOAL_DAYS) * 100));
  const weekDaysLeft = Math.max(0, WEEKLY_GOAL_DAYS - progress.streakDays);

  // Active assignments (retos)
  const activeAssignments = assignments.filter((a) => a.status !== "COMPLETED").slice(0, 3);
  const completedAssignments = assignments.filter((a) => a.status === "COMPLETED").length;

  // Recent activity from userBooks
  const recentActivity = userBooks
    .filter((b) => b.lastRead)
    .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
    .slice(0, 4)
    .map((b, i) => ({
      label: b.progress >= 100 ? `Terminaste de leer` : `Leíste páginas de`,
      subtitle: `${b.book?.title || "Libro"} · ${b.book?.author || ""}`,
      time: timeAgo(b.lastRead),
      type: b.progress >= 100 ? "complete" : "read",
    }));

  return (
    <div className="text-white space-y-0">
      {/* ── TOP HEADER ─────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            ¡Hola, {userName}! 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Cada historia te hace más grande. ¿Qué vamos a descubrir hoy?
          </p>
        </div>

        {/* Weekly Goal Card */}
        <div className="hidden lg:flex items-center gap-4 bg-[#1a2235] border border-white/10 rounded-2xl px-6 py-4 min-w-[240px]">
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-0.5">Tu meta semanal</p>
            <p className="text-3xl font-black text-white">{weeklyGoalPct}%</p>
            <div className="w-full bg-card/10 rounded-full h-1.5 mt-2 mb-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${weeklyGoalPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {weekDaysLeft === 0 ? "¡Meta completada! 🎉" : `${weekDaysLeft} días restantes`}
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Star className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN GRID ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        
        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-6">

          {/* ── Continúa tu aventura ─── */}
          <section>
            <h2 className="text-base font-bold text-white mb-3">Continúa tu aventura</h2>

            {heroBookData ? (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a2235] to-[#0f1623] border border-white/10 h-[200px] flex items-center gap-6 px-6">
                {/* Background blur image */}
                {heroBookData.coverImage && (
                  <div
                    className="absolute inset-0 opacity-10 bg-cover bg-center blur-xl scale-110"
                    style={{ backgroundImage: `url(${heroBookData.coverImage})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623]/80 via-transparent to-[#0f1623]/40" />

                {/* Book Cover */}
                <div className="relative z-10 shrink-0">
                  <div className="w-28 h-40 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ perspective: "600px" }}>
                    {heroBookData.coverImage ? (
                      <img
                        src={heroBookData.coverImage}
                        alt={heroBookData.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center p-2">
                        <span className="text-white text-xs text-center font-bold">{heroBookData.title}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Info */}
                <div className="relative z-10 flex-1 min-w-0">
                  <p className="text-xs text-indigo-300 font-medium mb-1 uppercase tracking-widest">Continuar leyendo</p>
                  <h3 className="text-xl font-bold text-white mb-0.5 line-clamp-1">{heroBookData.title}</h3>
                  <p className="text-slate-400 text-sm mb-4">{heroBookData.author}</p>
                  
                  <p className="text-xs text-slate-400 mb-1.5">{heroProgress}% completado</p>
                  <div className="w-full bg-card/10 rounded-full h-1.5 mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                      style={{ width: `${heroProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/reader/${heroBookData.id}?title=${encodeURIComponent(heroBookData.title)}`}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Continuar leyendo
                    </Link>
                    <Link
                      href="/dashboard/my-readings"
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-card/10 hover:bg-card/20 transition-all text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#1a2235]/40 h-[180px] flex flex-col items-center justify-center text-center gap-3">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-slate-300 font-semibold">No tienes lecturas en curso</p>
                  <p className="text-muted-foreground text-sm">Explora la biblioteca para empezar</p>
                </div>
                <Link
                  href="/dashboard/library"
                  className="inline-flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50/30 text-indigo-300 text-sm font-medium px-4 py-2 rounded-xl transition-all"
                >
                  Explorar Biblioteca
                </Link>
              </div>
            )}
          </section>

          {/* ── Recomendados para ti ─── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Recomendados para ti</h2>
              <Link
                href="/dashboard/library"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                Ver todo <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingRec ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="shrink-0 w-[120px] space-y-2 animate-pulse">
                    <div className="w-[120px] h-[170px] rounded-xl bg-card/5" />
                    <div className="h-3 bg-card/5 rounded w-3/4" />
                    <div className="h-3 bg-card/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {recommendations.slice(0, 7).map((book) => (
                  <Link
                    key={book.id}
                    href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(book.title)}`}
                    className="shrink-0 w-[120px] group"
                  >
                    {/* Cover */}
                    <div className="w-[120px] h-[170px] rounded-xl overflow-hidden mb-2.5 shadow-lg ring-1 ring-white/10 group-hover:ring-indigo-500/40 transition-all duration-200 relative">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 flex items-center justify-center p-3">
                          <span className="text-white text-xs text-center font-bold leading-tight">{book.title}</span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-card/20 backdrop-blur-sm rounded-full p-2">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{book.author}</p>
                    {book.category && (
                      <span className="inline-block mt-1.5 text-[10px] bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-500/50/20">
                        {book.category}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#1a2235]/40 py-8 flex flex-col items-center justify-center text-center gap-2">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-slate-400 text-sm">Explorando la biblioteca para ti...</p>
                <Link
                  href="/dashboard/library"
                  className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
                >
                  Ir a Biblioteca
                </Link>
              </div>
            )}
          </section>

          {/* ── Retos activos (Asignaciones) ─── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Retos activos</h2>
              <Link
                href="/dashboard/estudiante"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {loadingAssign ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-card/5 animate-pulse" />
                ))}
              </div>
            ) : activeAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeAssignments.map((a, idx) => {
                  const icons = ["🌍", "🌙", "🔥"];
                  const colors = [
                    "from-green-500/10 to-emerald-500/5 border-green-500/20",
                    "from-blue-500/10 to-indigo-500/5 border-blue-500/20",
                    "from-orange-500/10 to-amber-500/5 border-orange-500/20",
                  ];
                  const progressColors = ["bg-green-500", "bg-blue-500", "bg-orange-500"];
                  const daysLeft = Math.max(0, Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000));
                  return (
                    <Link
                      key={a.id}
                      href={`/dashboard/reader/${a.book.id}?title=${encodeURIComponent(a.book.title)}&assignmentId=${a.id}`}
                      className={`group bg-gradient-to-br ${colors[idx % 3]} border rounded-2xl p-4 hover:scale-[1.02] transition-all duration-200`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-xl">{icons[idx % 3]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white line-clamp-1">{a.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {a.book.title} · {daysLeft === 0 ? "Vence hoy" : `${daysLeft} días`}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-card/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${progressColors[idx % 3]} rounded-full transition-all`}
                          style={{ width: `${a.progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{a.progress}%</p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#1a2235]/40 py-6 flex flex-col items-center text-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-400 opacity-50" />
                <p className="text-slate-300 font-semibold text-sm">¡Todo al día!</p>
                <p className="text-muted-foreground text-xs">No tienes retos pendientes.</p>
              </div>
            )}
          </section>

          {/* ── Community Banner ─── */}
          <section className="bg-gradient-to-r from-[#1a2235] to-[#1e2d47] border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["🧒", "👦", "👧", "🧑"].map((emoji, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-indigo-500/20 border-2 border-[#1a2235] flex items-center justify-center text-sm"
                  >
                    {emoji}
                  </div>
                ))}
                <div className="h-8 w-8 rounded-full bg-slate-700 border-2 border-[#1a2235] flex items-center justify-center text-[10px] text-slate-300 font-bold">
                  +15
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Leyópolis en tu escuela</p>
                <p className="text-xs text-slate-400">Descubre lo que tus compañeros están leyendo y recomendando.</p>
              </div>
            </div>
            <Link
              href="/dashboard/community"
              className="shrink-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <Users className="h-4 w-4" />
              Ver comunidad
            </Link>
          </section>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="space-y-5">

          {/* ── Actividad reciente ─── */}
          <section className="bg-[#1a2235] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Actividad reciente</h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((act, i) => {
                  const meta = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.read;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-xl ${meta.bg} flex items-center justify-center text-sm shrink-0`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 font-medium line-clamp-1">
                          {act.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 font-semibold">
                          {act.subtitle}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs text-center py-4">Sin actividad reciente.</p>
            )}
          </section>

          {/* ── Tu Progreso ─── */}
          <section className="bg-[#1a2235] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Tu progreso</h3>
              <span className="text-xs text-slate-400 bg-card/5 px-2.5 py-1 rounded-lg border border-white/10">Esta semana</span>
            </div>

            <ProgressDonut
              completed={completedBooks}
              inProgress={inProgressBooks}
              toRead={toReadBooks}
            />

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/5">
              <div className="text-center">
                <p className="text-lg font-black text-white">{Math.round((progress.xp / 2) * 0.7) || 0}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Minutos de lectura</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-lg font-black text-white">{completedAssignments}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Retos completados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white">{progress.streakDays}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Días de racha</p>
              </div>
            </div>
          </section>

          {/* ── IA Mentor (deshabilitada para estudiantes) ─── */}
          <section className="bg-[#1a2235] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Tu IA Mentor</h3>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/50/30 flex items-center justify-center shrink-0">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Estoy aquí para ayudarte a descubrir, entender y disfrutar cada historia.
                </p>
              </div>
            </div>
            <button
              disabled
              title="La IA Mentor estará disponible próximamente"
              className="mt-4 w-full bg-indigo-600/30 text-indigo-400/50 text-sm font-semibold py-2.5 rounded-xl border border-indigo-500/50/20 cursor-not-allowed select-none"
            >
              Hablar con mi mentor
            </button>
            <p className="text-center text-[10px] text-muted-foreground mt-2">Próximamente disponible</p>
          </section>

        </div>
      </div>
    </div>
  );
}
