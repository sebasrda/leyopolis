"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface LicenseDailyPoint { date: string; count: number; }
interface LicenseRecentRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  licenseType: string;
  createdAt: string;
  institutionId: string | null;
  institutionName: string | null;
  isActive: boolean;
  expiresAt: string | null;
}
interface LicenseSummary {
  totalActive: number;
  totalAllTime: number;
  activatedToday: number;
  activated7Days: number;
  activated30Days: number;
  byInstitution: Array<{
    institutionId: string | null;
    institutionName: string;
    active: number;
    activatedToday: number;
  }>;
  daily: LicenseDailyPoint[];
  recent: LicenseRecentRow[];
  generatedAt: string;
}

interface Props {
  /** "/api/superadmin/licenses" or "/api/admin/licenses" */
  endpoint: string;
  /** Title in the header */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Show the per-institution table (super admin global view) */
  showInstitutionsBreakdown?: boolean;
  /** Polling interval in ms. Default 10s for "real-time" feel. */
  pollMs?: number;
}

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDayShort = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};

export default function LicensesPanel({
  endpoint,
  title = "Licencias activas",
  subtitle = "Conteo por día, fecha y hora — actualizado en tiempo real",
  showInstitutionsBreakdown = false,
  pollMs = 10000,
}: Props) {
  const [data, setData] = useState<LicenseSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadRef = useRef(true);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${endpoint}?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Error al cargar las licencias");
    } finally {
      initialLoadRef.current = false;
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, pollMs]);

  const chartData = useMemo(
    () => (data?.daily ?? []).map((d) => ({ ...d, label: fmtDayShort(d.date) })),
    [data],
  );

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["fecha", "hora", "nombre", "email", "rol", "licencia", "institucion", "activa", "expira"],
      ...data.recent.map((r) => {
        const d = new Date(r.createdAt);
        return [
          d.toLocaleDateString("es-CO"),
          d.toLocaleTimeString("es-CO"),
          r.name ?? "",
          r.email ?? "",
          r.role,
          r.licenseType,
          r.institutionName ?? "",
          r.isActive ? "sí" : "no",
          r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("es-CO") : "",
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `licencias_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (initialLoadRef.current && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
          {data?.generatedAt && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
              <Activity className={`h-3 w-3 ${refreshing ? "text-emerald-400 animate-pulse" : "text-emerald-500"}`} />
              Actualizado: {fmtTime(data.generatedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={refreshing} className="gap-2">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            Actualizar
          </Button>
          <Button onClick={handleExportCSV} disabled={!data} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Licencias activas"
              value={data.totalActive}
              accent="from-emerald-500 to-teal-600"
            />
            <KpiCard
              icon={<Sparkles className="h-5 w-5" />}
              label="Activadas hoy"
              value={data.activatedToday}
              accent="from-indigo-500 to-violet-600"
            />
            <KpiCard
              icon={<CalendarRange className="h-5 w-5" />}
              label="Últimos 7 días"
              value={data.activated7Days}
              accent="from-amber-500 to-orange-600"
            />
            <KpiCard
              icon={<Users className="h-5 w-5" />}
              label="Total histórico"
              value={data.totalAllTime}
              accent="from-rose-500 to-pink-600"
            />
          </div>

          {/* Daily chart */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-indigo-400" />
                Activaciones por día (últimos 30 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(99,102,241,0.4)",
                        borderRadius: 8,
                        color: "white",
                      }}
                      labelFormatter={(label) => `Día: ${label}`}
                      formatter={(value: any) => [`${value ?? 0} licencias`, "Activadas"]}
                    />
                    <Bar dataKey="count" fill="url(#licGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="licGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#4338ca" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {showInstitutionsBreakdown && data.byInstitution.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-400" />
                  Por institución
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/40">
                        <th className="py-2 px-3">Institución</th>
                        <th className="py-2 px-3 text-right">Activas</th>
                        <th className="py-2 px-3 text-right">Activadas hoy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byInstitution.map((row) => (
                        <tr key={row.institutionId ?? "none"} className="border-b border-border/20 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium">{row.institutionName}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{row.active}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {row.activatedToday > 0 ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                                +{row.activatedToday}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent activations */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                Activaciones recientes ({data.recent.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay activaciones registradas todavía.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/40">
                        <th className="py-2 px-3">Fecha y hora</th>
                        <th className="py-2 px-3">Usuario</th>
                        <th className="py-2 px-3">Rol</th>
                        <th className="py-2 px-3">Plan</th>
                        {showInstitutionsBreakdown && <th className="py-2 px-3">Institución</th>}
                        <th className="py-2 px-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((u) => (
                        <tr key={u.id} className="border-b border-border/20 hover:bg-muted/30">
                          <td className="py-2 px-3 tabular-nums text-xs text-foreground/80">
                            {fmtTime(u.createdAt)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium">{u.name || "Sin nombre"}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="py-2 px-3 text-xs">{u.role}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-[10px]">{u.licenseType}</Badge>
                          </td>
                          {showInstitutionsBreakdown && (
                            <td className="py-2 px-3 text-xs text-muted-foreground">
                              {u.institutionName || "—"}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right">
                            {u.isActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Activa</Badge>
                            ) : (
                              <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30">Inactiva</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-gradient-to-br ${accent} shadow-lg`}>
      <div className="absolute -top-6 -right-6 opacity-15 text-white scale-[3]">{icon}</div>
      <div className="relative">
        <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-wide font-semibold">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-4xl font-black text-white mt-2 tabular-nums">{value.toLocaleString("es-CO")}</div>
      </div>
    </div>
  );
}
