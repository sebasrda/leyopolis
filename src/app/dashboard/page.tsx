"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useGamification } from "@/context/GamificationContext";
import { useLearning } from "@/context/LearningContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
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
import { cn } from "@/lib/utils";

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

const WEEKLY_CHALLENGES = [
  { id: 1, title: "Lector Constante", desc: "Mantén una racha de 3 días", xp: 50, type: "streak", target: 3, icon: "🔥" },
  { id: 2, title: "Devorador de Páginas", desc: "Lee 50 páginas", xp: 100, type: "pages", target: 50, icon: "📖" },
  { id: 3, title: "Tiempo de Calidad", desc: "Lee por 30 minutos", xp: 150, type: "time", target: 30, icon: "⏱️" },
  { id: 4, title: "Lector Imparable", desc: "Mantén una racha de 5 días", xp: 150, type: "streak", target: 5, icon: "🔥" },
  { id: 5, title: "Maratón de Lectura", desc: "Lee 100 páginas", xp: 200, type: "pages", target: 100, icon: "📚" },
  { id: 6, title: "Explorador", desc: "Lee por 60 minutos", xp: 250, type: "time", target: 60, icon: "⏱️" },
  { id: 7, title: "Racha Perfecta", desc: "Mantén una racha de 7 días", xp: 300, type: "streak", target: 7, icon: "🔥" },
  { id: 8, title: "Lector Veloz", desc: "Lee 200 páginas", xp: 300, type: "pages", target: 200, icon: "🚀" },
  { id: 9, title: "Dedicación", desc: "Lee por 120 minutos", xp: 300, type: "time", target: 120, icon: "⏱️" },
];

const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "loading") return;
    // Redirections removed to allow administrative roles to access the unified Home dashboard
  }, [role, status, router]);

  const userName = session?.user?.name?.split(" ")[0] || (status === "loading" ? "..." : "Usuario");
  
  
  const { progress, addXp } = useGamification();
  const { userBooks } = useLearning();

  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loadingRec, setLoadingRec] = useState(true);
  const [recPage, setRecPage] = useState(0);
  
  const currentWeek = getWeekNumber(new Date());
  const [claimedChallenges, setClaimedChallenges] = useState<Record<number, boolean>>({});
  const [stats, setStats] = useState({ totalPages: 0, totalMinutes: 0 });

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setRecommendations(d); setLoadingRec(false); })
      .catch(() => setLoadingRec(false));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchStatsAndChallenges = () => {
      fetch("/api/user/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && !d.error) setStats({ totalPages: d.totalPages || 0, totalMinutes: d.totalMinutes || 0 });
        });

      fetch(`/api/user/challenges?week=${currentWeek}`)
        .then(r => r.ok ? r.json() : {})
        .then(d => setClaimedChallenges(d))
        .catch(() => {});
    };

    fetchStatsAndChallenges();
    const interval = setInterval(fetchStatsAndChallenges, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [currentWeek, status]);

  const handleClaim = async (challenge: any) => {
    try {
        const res = await fetch("/api/user/challenges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeId: challenge.id,
                weekNumber: currentWeek,
                xp: challenge.xp
            })
        });

        if (res.ok) {
            addXp(challenge.xp);
            setClaimedChallenges(prev => ({ ...prev, [challenge.id]: true }));
        }
    } catch (e) {
        console.error("Error claiming challenge:", e);
    }
  };

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

  // Weekly challenges
  const startIndex = (currentWeek * 3) % WEEKLY_CHALLENGES.length;
  const activeWeeklyChallenges = [
    WEEKLY_CHALLENGES[startIndex % WEEKLY_CHALLENGES.length],
    WEEKLY_CHALLENGES[(startIndex + 1) % WEEKLY_CHALLENGES.length],
    WEEKLY_CHALLENGES[(startIndex + 2) % WEEKLY_CHALLENGES.length],
  ];
  const completedAssignments = Object.keys(claimedChallenges).length;

  // Determine landscape based on book id
  const landscapes = [
    "/images/landscapes/space.png", 
    "/images/landscapes/forest.png", 
    "/images/landscapes/mountains.png", 
    "/images/landscapes/ocean.png"
  ];
  
  const getLandscapeForBook = (bookId: string) => {
    if (!bookId) return landscapes[0];
    let hash = 0;
    for (let i = 0; i < bookId.length; i++) {
      hash = bookId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % landscapes.length;
    return landscapes[index];
  };

  const currentLandscape = heroBookData ? getLandscapeForBook(heroBookData.id) : landscapes[0];

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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

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
              <div className="relative rounded-2xl overflow-hidden bg-[#0f1623] border border-white/10 h-[260px] flex items-center gap-8 px-8 group">
                {/* Adventure Landscape Background */}
                <div
                  className="absolute inset-0 opacity-60 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${currentLandscape})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623] via-[#0f1623]/40 to-transparent" />

                {/* Book Cover */}
                <div className="relative z-10 shrink-0">
                  <div className="w-32 h-44 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/20 transition-transform duration-300 group-hover:-translate-y-1" style={{ perspective: "1000px" }}>
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
                      className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full transition-all"
                      style={{ width: `${heroProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/reader/${heroBookData.id}?title=${encodeURIComponent(heroBookData.title)}`}
                      className="inline-flex items-center gap-2 bg-[#6B21A8] hover:bg-[#581C87] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/40"
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
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="shrink-0 w-[120px] space-y-2 animate-pulse">
                    <div className="w-[120px] h-[170px] rounded-xl bg-card/5" />
                    <div className="h-3 bg-card/5 rounded w-3/4" />
                    <div className="h-3 bg-card/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="relative group/rec">
                {/* Arrows */}
                {recommendations.length > 6 && (
                  <>
                    <button 
                      onClick={() => setRecPage(0)}
                      className={cn(
                        "absolute -left-4 top-[85px] -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-[#1a2235]/90 border border-white/10 flex items-center justify-center text-white shadow-xl opacity-0 group-hover/rec:opacity-100 transition-all hover:bg-indigo-600 hover:border-indigo-500",
                        recPage === 0 && "hidden"
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setRecPage(1)}
                      className={cn(
                        "absolute -right-4 top-[85px] -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-[#1a2235]/90 border border-white/10 flex items-center justify-center text-white shadow-xl opacity-0 group-hover/rec:opacity-100 transition-all hover:bg-indigo-600 hover:border-indigo-500",
                        recPage === 1 && "hidden"
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                <div className="flex gap-4 overflow-hidden pb-2 min-h-[230px]">
                  {recommendations.slice(recPage * 6, (recPage + 1) * 6).map((book) => (
                    <Link
                      key={book.id}
                      href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(book.title)}`}
                      className="shrink-0 w-[120px] group animate-in fade-in slide-in-from-right-4 duration-500"
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

          {/* ── Retos Semanales ─── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">Retos Semanales</h2>
              <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">Semana {currentWeek}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeWeeklyChallenges.map((c, idx) => {
                const colors = [
                  "from-green-500/10 to-emerald-500/5 border-green-500/20",
                  "from-blue-500/10 to-indigo-500/5 border-blue-500/20",
                  "from-orange-500/10 to-amber-500/5 border-orange-500/20",
                ];
                const progressColors = ["bg-green-500", "bg-blue-500", "bg-orange-500"];
                
                let currentProg = 0;
                if (c.type === "streak") currentProg = progress.streakDays;
                if (c.type === "pages") currentProg = stats.totalPages;
                if (c.type === "time") currentProg = stats.totalMinutes;
                
                const pct = Math.min(100, Math.round((currentProg / c.target) * 100));
                const isCompleted = pct >= 100;
                const isClaimed = claimedChallenges[c.id];

                return (
                  <div
                    key={c.id}
                    className={`group bg-gradient-to-br ${colors[idx % 3]} border rounded-2xl p-4 transition-all duration-200 flex flex-col`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-xl">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white line-clamp-1">{c.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{c.desc}</p>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      {!isClaimed ? (
                        <>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-xs font-bold text-white">+{c.xp} XP</span>
                            <span className="text-[10px] text-slate-400">{currentProg}/{c.target}</span>
                          </div>
                          <div className="w-full bg-card/10 rounded-full h-1.5 overflow-hidden mb-3">
                            <div
                              className={`h-full ${progressColors[idx % 3]} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {isCompleted ? (
                            <button
                              onClick={() => handleClaim(c)}
                              className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
                            >
                              Reclamar Puntos
                            </button>
                          ) : (
                            <div className="w-full py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-semibold text-center">
                              En progreso
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 flex items-center justify-center gap-1.5 text-xs font-bold mt-2">
                          <CheckCircle2 className="h-4 w-4" />
                          ¡Completado!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
