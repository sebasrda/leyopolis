"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Users,
  Search,
  Flame,
  Trophy,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Activity,
  Sparkles,
  X,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AttemptRow {
  id: string;
  score: number;
  title: string;
  type: string;
  date: string;
}
interface StudentRow {
  id: string;
  name: string | null;
  email: string | null;
  grade: string | null;
  image: string | null;
  licenseType: string | null;
  expiresAt: string | null;
  classes: string[];
  xp: number;
  level: number;
  streak: number;
  lastActive: string | null;
  createdAt: string;
  totalMinutes: number;
  totalPages: number;
  minutesThisWeek: number;
  completedBooks: number;
  inProgressBooks: number;
  attemptsCount: number;
  avgScore: number | null;
  recentAttempts: AttemptRow[];
  atRisk: boolean;
  atRiskReason: string;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 1) return "hace minutos";
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `hace ${diffD}d`;
  return d.toLocaleDateString("es-CO");
}

function fmtMinutes(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function StudentsPanel() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "risk" | "recent">("all");
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/teacher/students?_=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // refresh every 15s for real-time feel
    return () => clearInterval(id);
  }, []);

  const atRisk = useMemo(() => students.filter((s) => s.atRisk), [students]);
  const recentExamCompleters = useMemo(() => {
    return students
      .filter((s) => s.recentAttempts.length > 0)
      .sort((a, b) => {
        const aD = new Date(a.recentAttempts[0]?.date || 0).getTime();
        const bD = new Date(b.recentAttempts[0]?.date || 0).getTime();
        return bD - aD;
      })
      .slice(0, 5);
  }, [students]);

  const filtered = useMemo(() => {
    let base = students;
    if (filter === "risk") base = base.filter((s) => s.atRisk);
    if (filter === "recent") base = base.filter((s) => s.lastActive && Date.now() - new Date(s.lastActive).getTime() < 86400000);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        s.classes.some((c) => c.toLowerCase().includes(q)),
      );
    }
    return base;
  }, [students, search, filter]);

  return (
    <div className="space-y-6">
      {/* Top KPIs + At-risk alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          color="from-indigo-500 to-purple-600"
          value={students.length}
          label="Estudiantes a cargo"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          color="from-red-500 to-orange-600"
          value={atRisk.length}
          label="Estudiantes en riesgo"
          critical={atRisk.length > 0}
        />
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          color="from-emerald-500 to-teal-600"
          value={students.filter((s) => s.lastActive && Date.now() - new Date(s.lastActive).getTime() < 86400000).length}
          label="Activos hoy"
        />
      </div>

      {/* At-risk alert box */}
      {atRisk.length > 0 && (
        <Card className="border-2 border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {atRisk.length} estudiante{atRisk.length === 1 ? "" : "s"} requiere{atRisk.length === 1 ? "" : "n"} atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {atRisk.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className="text-left rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-all p-3 group"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm shrink-0">
                      {(s.name || s.email || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{s.name || s.email}</p>
                      <p className="text-[10px] text-red-300 line-clamp-1">{s.atRiskReason}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
            {atRisk.length > 6 && (
              <button
                type="button"
                onClick={() => setFilter("risk")}
                className="mt-3 text-xs text-red-300 hover:text-red-200 underline"
              >
                Ver los {atRisk.length} estudiantes en riesgo →
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent exam completions */}
      {recentExamCompleters.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Estudiantes que completaron evaluaciones recientemente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentExamCompleters.map((s) => {
                const last = s.recentAttempts[0];
                if (!last) return null;
                const scoreColor =
                  last.score >= 80 ? "text-emerald-400" :
                  last.score >= 60 ? "text-amber-400" :
                  "text-red-400";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition group"
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {(s.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{s.name || s.email}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {last.title} · {fmtTime(last.date)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`tabular-nums ${scoreColor} border-current/30`}>
                      {last.score}%
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roster */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Mis estudiantes
              <Badge variant="outline" className="ml-2 text-[10px]">
                {filtered.length} {filtered.length === 1 ? "estudiante" : "estudiantes"}
              </Badge>
              {refreshing && <span className="text-[10px] text-emerald-400 animate-pulse ml-1">● en vivo</span>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-60">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nombre, correo, clase…"
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                {([
                  ["all", "Todos"],
                  ["risk", "En riesgo"],
                  ["recent", "Activos hoy"],
                ] as const).map(([k, label]) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setFilter(k)}
                    className={`h-7 px-2 text-[11px] ${filter === k ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando estudiantes…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin estudiantes que coincidan con el filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((s) => (
                <StudentCard key={s.id} s={s} onOpen={() => setSelected(s)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {selected && <StudentDetailModal s={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function KpiCard({ icon, color, value, label, critical }: { icon: React.ReactNode; color: string; value: number; label: string; critical?: boolean }) {
  return (
    <Card className={`border-none overflow-hidden bg-gradient-to-br ${color} text-white shadow-lg ${critical ? "ring-2 ring-red-500/40 animate-pulse" : ""}`}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/85 font-semibold">{label}</p>
          <p className="text-3xl font-black mt-1 tabular-nums">{value}</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">{icon}</div>
      </CardContent>
    </Card>
  );
}

function StudentCard({ s, onOpen }: { s: StudentRow; onOpen: () => void }) {
  const scoreColor =
    s.avgScore === null ? "text-muted-foreground" :
    s.avgScore >= 80 ? "text-emerald-400" :
    s.avgScore >= 60 ? "text-amber-400" :
    "text-red-400";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg group ${
        s.atRisk
          ? "border-red-500/40 bg-red-500/5 hover:border-red-500/70"
          : "border-border/40 hover:border-indigo-400/50 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
          {(s.name || s.email || "?")[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold line-clamp-1">{s.name || "Sin nombre"}</p>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{s.email}</p>
        </div>
        {s.atRisk && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
      </div>
      <div className="grid grid-cols-3 gap-1 text-[11px]">
        <div className="text-center">
          <div className="font-bold text-indigo-300 tabular-nums">N{s.level}</div>
          <div className="text-muted-foreground">Nivel</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-orange-300 tabular-nums flex items-center justify-center gap-0.5">
            <Flame className="h-3 w-3" /> {s.streak}
          </div>
          <div className="text-muted-foreground">Racha</div>
        </div>
        <div className="text-center">
          <div className={`font-bold tabular-nums ${scoreColor}`}>
            {s.avgScore !== null ? `${s.avgScore}%` : "—"}
          </div>
          <div className="text-muted-foreground">Promedio</div>
        </div>
      </div>
      {s.atRisk && (
        <p className="mt-2 text-[10px] text-red-300 line-clamp-1 italic">⚠ {s.atRiskReason}</p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground line-clamp-1">
        Última actividad: {fmtTime(s.lastActive)}
      </p>
    </button>
  );
}

function StudentDetailModal({ s, onClose }: { s: StudentRow; onClose: () => void }) {
  // Initial snapshot from list; we also refetch fresh from server for the
  // detail view so the modal feels "real time".
  const [detail, setDetail] = useState<StudentRow>(s);

  useEffect(() => {
    // Pull fresh data
    fetch(`/api/teacher/students?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.students) return;
        const fresh = data.students.find((x: StudentRow) => x.id === s.id);
        if (fresh) setDetail(fresh);
      })
      .catch(() => {});
  }, [s.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="bg-[#0a0a1a]/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1623] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-black shrink-0">
              {(detail.name || "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-lg line-clamp-1">{detail.name || "Sin nombre"}</h2>
              <p className="text-xs text-white/80 line-clamp-1">{detail.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-white/15 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {detail.atRisk && (
            <div className="rounded-xl border-2 border-red-500/40 bg-red-500/10 p-3 flex items-start gap-2 text-sm text-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Estudiante en riesgo</p>
                <p className="text-xs text-red-300 mt-0.5">{detail.atRiskReason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<Sparkles className="h-4 w-4" />} label="Nivel" value={detail.level} color="text-purple-300" />
            <Stat icon={<Flame className="h-4 w-4" />} label="Racha" value={detail.streak} color="text-orange-300" />
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="XP" value={detail.xp} color="text-indigo-300" />
            <Stat icon={<Trophy className="h-4 w-4" />} label="Libros" value={detail.completedBooks} color="text-amber-300" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<Clock className="h-4 w-4" />} label="Tiempo total" value={fmtMinutes(detail.totalMinutes)} color="text-emerald-300" />
            <Stat icon={<Clock className="h-4 w-4" />} label="Esta semana" value={fmtMinutes(detail.minutesThisWeek)} color="text-teal-300" />
            <Stat icon={<BookOpen className="h-4 w-4" />} label="Páginas" value={detail.totalPages} color="text-cyan-300" />
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Quizzes" value={detail.attemptsCount} color="text-fuchsia-300" />
          </div>

          {detail.classes.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Clases</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.classes.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Últimos quizzes ({detail.recentAttempts.length})</p>
            {detail.recentAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin intentos registrados todavía.</p>
            ) : (
              <ul className="space-y-1">
                {detail.recentAttempts.map((a) => {
                  const color = a.score >= 80 ? "text-emerald-400" : a.score >= 60 ? "text-amber-400" : "text-red-400";
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-white/5 bg-white/[0.02]">
                      <div className="min-w-0">
                        <p className="text-sm line-clamp-1">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtTime(a.date)}</p>
                      </div>
                      <Badge variant="outline" className={`tabular-nums shrink-0 ${color} border-current/30`}>
                        {a.score}%
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Última actividad</p>
              <p>{fmtTime(detail.lastActive)}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Promedio quizzes</p>
              <p>{detail.avgScore !== null ? `${detail.avgScore}%` : "Sin datos"}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Licencia</p>
              <p>{detail.licenseType || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Grado</p>
              <p>{detail.grade || "Sin asignar"}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className={`flex items-center gap-1 text-xs ${color}`}>
        {icon}
        <span className="font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-black mt-1 tabular-nums text-white">
        {typeof value === "number" ? value.toLocaleString("es-CO") : value}
      </p>
    </div>
  );
}
