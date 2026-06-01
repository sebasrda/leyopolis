"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Settings,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  CreditCard,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SuperAdminDashboard() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState("TRIAL");
  const [maxStudents, setMaxStudents] = useState("30");
  const [duration, setDuration] = useState("30");
  const [creating, setCreating] = useState(false);
  // ── Plan feature flags ─────────────────────────────────────────
  const [motionTrackingEnabled, setMotionTrackingEnabled] = useState(true);
  const [motionGamesEnabled, setMotionGamesEnabled] = useState(true);
  const [maxBooks, setMaxBooks] = useState("220");

  // Renew form
  const [renewTarget, setRenewTarget] = useState<any>(null); // institution being renewed
  const [renewPlan, setRenewPlan] = useState<string>("ANUAL");
  const [renewDays, setRenewDays] = useState<string>("365");
  const [renewMaxStudents, setRenewMaxStudents] = useState<string>("");
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<string | null>(null);

  const openRenew = (inst: any) => {
    setRenewTarget(inst);
    setRenewPlan(inst.plan === "TRIAL" ? "ANUAL" : inst.plan);
    setRenewDays(inst.plan === "MENSUAL" ? "30" : "365");
    setRenewMaxStudents(String(inst.maxStudents ?? 30));
    setRenewError(null);
    setRenewSuccess(null);
  };

  const handleRenew = async () => {
    if (!renewTarget) return;
    setRenewing(true);
    setRenewError(null);
    setRenewSuccess(null);
    try {
      const res = await fetch(`/api/superadmin/institutions/${renewTarget.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: renewPlan,
          additionalDays: parseInt(renewDays, 10),
          maxStudents: parseInt(renewMaxStudents, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al renovar");
      const newDate = new Date(data.newEndDate).toLocaleDateString();
      setRenewSuccess(`Licencia extendida hasta ${newDate}`);
      fetchInstitutions();
      setTimeout(() => {
        setRenewTarget(null);
        setRenewSuccess(null);
      }, 1600);
    } catch (e: any) {
      setRenewError(e.message || "Error de conexión");
    } finally {
      setRenewing(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
    const interval = setInterval(fetchInstitutions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch(`/api/superadmin/institutions?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        console.log("[DEBUG] SuperAdmin institutions:", data);
        setInstitutions(data);
      } else {
        console.error("[ERROR] Failed to fetch institutions:", res.status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/superadmin/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          domain,
          plan,
          maxStudents: parseInt(maxStudents),
          durationDays: parseInt(duration),
          motionTrackingEnabled,
          motionGamesEnabled,
          maxBooks: parseInt(maxBooks) || 0,
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        fetchInstitutions();
      } else {
        const error = await res.json();
        alert(error.message || "Error al crear");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "activa": return <Badge className="bg-green-100 text-green-700 border-green-200">Activa</Badge>;
      case "trial": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Trial</Badge>;
      case "vencida": return <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleSyncDb = async () => {
    try {
      const res = await fetch("/api/superadmin/migrate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Sincronización completada:\n" + data.results.join("\n"));
      } else {
        alert("Error: " + data.message);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const stats = {
    total: institutions.length,
    users: institutions.reduce((acc, inst) => acc + (inst._count?.users || 0), 0),
    active: institutions.filter(i => i.status === 'activa').length,
    anual: institutions.filter(i => i.plan === 'ANUAL').length,
    mensual: institutions.filter(i => i.plan === 'MENSUAL').length,
    trial: institutions.filter(i => i.plan === 'TRIAL').length,
  };

  return (
    <div className="text-white space-y-8">
      {/* ── TOP HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Consola de Súper Administración</h1>
          <p className="text-slate-400 mt-1 text-sm">Gestión global de contratos, colegios y suscripciones B2B de Leyópolis.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleSyncDb} 
            className="gap-2 border-white/10 hover:bg-white/5 text-slate-300 rounded-xl h-11"
          >
            <Settings className="h-4 w-4" /> Sincronizar BD
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6B21A8] hover:bg-[#581C87] text-white shadow-lg shadow-purple-900/40 gap-2 rounded-xl h-11 px-6">
                <Plus className="h-4 w-4" /> Nuevo Colegio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f1623] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Registrar Nuevo Colegio</DialogTitle>
                <DialogDescription className="text-slate-400">Configura la suscripción y límites de la nueva institución.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Nombre de la Institución</Label>
                  <Input placeholder="Ej. Colegio San Patricio" value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Dominio (Identificador único)</Label>
                  <Input placeholder="sanpatricio.edu" value={domain} onChange={e => setDomain(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Plan</Label>
                    <Select value={plan} onValueChange={setPlan}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a2235] border-white/10 text-white">
                        <SelectItem value="TRIAL">Trial</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                        <SelectItem value="ANUAL">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Límite Estudiantes</Label>
                    <Input type="number" value={maxStudents} onChange={e => setMaxStudents(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Duración del acceso (Días)</Label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="bg-white/5 border-white/10" />
                </div>

                {/* ── Plan feature toggles ───────────────────────────── */}
                <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-4 mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">Funciones incluidas en el plan</p>

                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-3">
                      <Label className="text-white text-sm font-semibold block">Motion Tracking (lector)</Label>
                      <p className="text-[10px] text-slate-400">Pasar páginas y señalar palabras con la mano</p>
                    </div>
                    <Switch checked={motionTrackingEnabled} onCheckedChange={setMotionTrackingEnabled} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-3">
                      <Label className="text-white text-sm font-semibold block">Juegos Motion Tracking</Label>
                      <p className="text-[10px] text-slate-400">Minijuegos gestuales: V/F, quiz, cronología</p>
                    </div>
                    <Switch checked={motionGamesEnabled} onCheckedChange={setMotionGamesEnabled} />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-white text-sm font-semibold">Límite de unidades pedagógicas</Label>
                      <span className="text-xs text-slate-400">{maxBooks === "0" ? "Ilimitado" : `${maxBooks} libros`}</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={maxBooks}
                      onChange={e => setMaxBooks(e.target.value)}
                      placeholder="220"
                      className="bg-white/5 border-white/10"
                    />
                    <p className="text-[10px] text-slate-400">0 = sin límite. Por defecto: 220 (paquete completo).</p>
                  </div>
                </div>

                <Button onClick={handleCreate} disabled={creating || !name || !domain} className="w-full bg-[#6B21A8] hover:bg-[#581C87] mt-2">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Habilitar Institución
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── HERO MONITORING CARD ───────────────────── */}
      {!loading && (
        <div className="relative rounded-2xl overflow-hidden bg-[#0f1623] border border-white/10 min-h-[220px] flex items-center p-8 group shadow-2xl">
          <div
            className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623] via-[#0f1623]/60 to-transparent" />
          
          <div className="relative z-10 w-full">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-none px-3 py-1">Panel Global Leyópolis</Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-none px-3 py-1">Estado de Servidores: OK</Badge>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white mb-2">Visión de Plataforma</h2>
                  <p className="text-slate-300 max-w-md">
                    Supervisa la salud del negocio, la retención de instituciones y el crecimiento global de la red educativa.
                  </p>
                </div>
                <div className="flex items-center gap-6 pt-2">
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Colegios</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.users}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Usuarios Globales</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.active}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Cuentas Activas</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[300px]">
                <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-400" /> Distribución de Planes
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Anual</span>
                    <span className="text-indigo-300 font-black">{stats.anual}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Mensual</span>
                    <span className="text-purple-300 font-black">{stats.mensual}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Trial / Demo</span>
                    <span className="text-amber-300 font-black">{stats.trial}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {institutions.map(inst => (
            <Card key={inst.id} className={`bg-[#1a2235]/50 border-white/5 shadow-xl hover:border-indigo-500/30 transition-all group ${inst.status === "vencida" ? "opacity-75" : ""}`}>
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl text-white flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                      <Building2 className="h-5 w-5 text-indigo-400" /> {inst.name}
                    </CardTitle>
                    <p className="text-xs text-slate-400">{inst.domain}</p>
                  </div>
                  {inst.status === "activa" ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-none">Activa</Badge>
                  ) : inst.status === "vencida" ? (
                    <Badge className="bg-red-500/20 text-red-300 border-none">Vencida</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-300 border-none">Trial</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Plan
                    </p>
                    <p className="text-sm font-bold text-white">{inst.plan}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Users className="h-3 w-3" /> Usuarios
                    </p>
                    <p className="text-sm font-bold text-white">{inst._count?.users || 0} / {inst.maxStudents}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Inicio
                    </p>
                    <p className="text-sm font-bold text-slate-300">{new Date(inst.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Vencimiento
                    </p>
                    <p className={`text-sm font-bold ${inst.status === "vencida" ? "text-red-400" : "text-slate-300"}`}>
                      {inst.endDate ? new Date(inst.endDate).toLocaleDateString() : "Ilimitado"}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 flex flex-col gap-2">
                  <Link href={`/dashboard/superadmin/colegio/${inst.id}`}>
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl group/btn">
                      Entrar a la Gestión &rarr;
                    </Button>
                  </Link>
                  <Button
                    onClick={() => openRenew(inst)}
                    className={`w-full rounded-xl gap-2 ${
                      inst.status === "vencida"
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {inst.status === "vencida" ? "Reactivar Licencia" : "Renovar Licencia"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {institutions.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-slate-500" />
              </div>
              <h3 className="text-white font-bold">No hay instituciones</h3>
              <p className="text-slate-500 text-sm mt-1">Comienza registrando tu primer colegio cliente.</p>
            </div>
          )}
        </div>
      )}

      {/* ── RENEW LICENSE DIALOG (super admin only) ─────────────── */}
      <Dialog
        open={renewTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenewTarget(null);
            setRenewError(null);
            setRenewSuccess(null);
          }
        }}
      >
        <DialogContent className="bg-[#0f1623] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-400" />
              Renovar Licencia: {renewTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Extiende el contrato de {renewTarget?.domain ?? "esta institución"}. Los días se suman al vencimiento actual si la licencia sigue activa, o desde hoy si ya venció.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1 border border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400">Plan actual</span>
                <span className="font-semibold">{renewTarget?.plan ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estado</span>
                <span className={`font-semibold ${renewTarget?.status === "vencida" ? "text-red-400" : renewTarget?.status === "activa" ? "text-emerald-400" : "text-amber-400"}`}>
                  {renewTarget?.status ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vencimiento actual</span>
                <span className="font-semibold">
                  {renewTarget?.endDate ? new Date(renewTarget.endDate).toLocaleDateString() : "Ilimitado"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-400">Plan</Label>
                <Select value={renewPlan} onValueChange={setRenewPlan}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a2235] border-white/10 text-white">
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                    <SelectItem value="ANUAL">Anual</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Límite Estudiantes</Label>
                <Input
                  type="number"
                  min={1}
                  value={renewMaxStudents}
                  onChange={(e) => setRenewMaxStudents(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400">Días a agregar</Label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={renewDays}
                onChange={(e) => setRenewDays(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { l: "+30 días", v: "30" },
                  { l: "+90 días", v: "90" },
                  { l: "+180 días", v: "180" },
                  { l: "+1 año", v: "365" },
                  { l: "+2 años", v: "730" },
                ].map((p) => (
                  <Button
                    key={p.v}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setRenewDays(p.v)}
                    className={`h-7 px-2 text-[11px] border-white/10 hover:bg-white/10 ${renewDays === p.v ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "text-slate-300"}`}
                  >
                    {p.l}
                  </Button>
                ))}
              </div>
            </div>

            {renewError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-md p-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {renewError}
              </div>
            )}
            {renewSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-md p-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {renewSuccess}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setRenewTarget(null)}
                disabled={renewing}
                className="flex-1 border-white/10 hover:bg-white/5 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRenew}
                disabled={renewing || !renewDays || parseInt(renewDays, 10) <= 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Confirmar renovación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
