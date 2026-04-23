"use client";

import { useState, useEffect } from "react";
import { useLearning } from "@/context/LearningContext";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  MoreHorizontal,
  Search,
  CheckCircle2,
  Plus,
  Play,
  ChevronRight,
  GraduationCap,
  Loader2,
  UserCog,
  Trash2,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";
import { SuggestedReadingsDialog } from "@/components/dashboard/teacher/SuggestedReadingsDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
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
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalBooks: number;
  totalClasses: number;
  totalReadingSessions: number;
  totalActivities: number;
  studentPercent: number;
  teacherPercent: number;
  adminPercent: number;
  recentUsers: { id: string; name: string; email: string; role: string; createdAt: string }[];
  institution?: {
    name: string;
    status: string;
    plan: string;
    maxStudents: number;
    endDate: string | null;
    isLibraryRestricted?: boolean;
    id: string;
  };
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "SUPERADMIN";
  const { userBooks } = useLearning();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero book logic
  const heroBook = userBooks
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())[0];

  const heroBookData = heroBook?.book || null;
  const heroProgress = heroBook?.progress || 0;

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ageRange, setAgeRange] = useState("9-12");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Create user state
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("STUDENT");
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingSetting, setUpdatingSetting] = useState(false);
  const [isSuggestedOpen, setIsSuggestedOpen] = useState(false);
  const [adminClasses, setAdminClasses] = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    fetchStats();
    fetch("/api/teacher/classes").then(r => r.ok ? r.json() : []).then(setAdminClasses).catch(() => {});
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        setStats(await res.json());
      } else {
        setError("Error al cargar estadísticas");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máximo 10MB).");
      return;
    }

    setUploadProgress(10);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", selectedFile.name.replace(".pdf", ""));
    formData.append("ageRange", ageRange);
    formData.append("category", "General");
    formData.append("difficulty", "Intermedio");

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({ message: "Error de formato en respuesta del servidor" }));
      
      if (response.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(0);
          setSelectedFile(null);
          fetchStats();
        }, 500);
      } else {
        alert(data.message || data.error || "Error al subir el libro. Revisa el tamaño del PDF.");
        setUploadProgress(0);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al intentar subir el libro.");
      setUploadProgress(0);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) return;
    setCreatingUser(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      if (res.ok) {
        setCreateUserOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("STUDENT");
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.message || "Error al crear usuario");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Eliminar usuario permanentemente?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) fetchStats();
      else alert("Error al eliminar");
    } catch { alert("Error de conexión"); }
  };

  const handleToggleLibrary = async (checked: boolean) => {
    if (!stats?.institution?.id) return;
    setUpdatingSetting(true);
    try {
      const res = await fetch(`/api/superadmin/institutions/${stats.institution.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLibraryRestricted: checked }),
      });
      if (res.ok) {
        setStats((prev: any) => ({
          ...prev,
          institution: { ...prev.institution, isLibraryRestricted: checked }
        }));
      } else {
        alert("Error al actualizar configuración");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setUpdatingSetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="ml-3 text-muted-foreground">Cargando panel de administración...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchStats}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="text-white space-y-8">
      {/* ── TOP HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            ¡Hola, {session?.user?.name?.split(" ")[0] || "Administrador"}! 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {stats?.institution?.name 
              ? `Gestionando la plataforma de ${stats.institution.name}` 
              : "Administra usuarios y clases de tu institución con eficiencia."}
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6B21A8] hover:bg-[#581C87] text-white shadow-lg shadow-purple-900/40 gap-2 rounded-xl h-11 px-6">
                <Plus className="h-4 w-4" /> Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f1623] border-white/10 text-white">
              <DialogHeader><DialogTitle className="text-white">Añadir Usuario al Colegio</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400">Nombre</Label>
                  <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nombre completo" className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400">Email</Label>
                  <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="correo@ejemplo.com" className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400">Contraseña</Label>
                  <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400">Rol</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a2235] border-white/10 text-white">
                      <SelectItem value="STUDENT">Estudiante</SelectItem>
                      <SelectItem value="TEACHER">Docente</SelectItem>
                      <SelectItem value="COORDINATOR">Coordinador</SelectItem>
                      <SelectItem value="ADMIN">Admin Secundario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} disabled={creatingUser || !newUserName || !newUserEmail || !newUserPassword} className="w-full bg-[#6B21A8] hover:bg-[#581C87] mt-2">
                  {creatingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Añadir Usuario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-8">
          {/* ── Continúa tu aventura (Admin style) ─── */}
          <section>
            <h2 className="text-base font-bold text-white mb-3">Tu actividad reciente</h2>
            <div className="relative rounded-2xl overflow-hidden bg-[#0f1623] border border-white/10 h-[260px] flex items-center gap-8 px-8 group shadow-2xl">
              {/* Adventure Landscape Background */}
              <div
                className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=2070')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623] via-[#0f1623]/60 to-transparent" />

              {heroBookData ? (
                <>
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
                    <p className="text-xs text-indigo-300 font-medium mb-1 uppercase tracking-widest">Continuar explorando</p>
                    <h3 className="text-xl font-bold text-white mb-0.5 line-clamp-1">{heroBookData.title}</h3>
                    <p className="text-slate-400 text-sm mb-4">{heroBookData.author}</p>
                    
                    <p className="text-xs text-slate-400 mb-1.5">{heroProgress}% completado</p>
                    <div className="w-full bg-card/10 rounded-full h-1.5 mb-4 overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full transition-all"
                        style={{ width: `${heroProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/reader/${heroBookData.id}`}
                        className="inline-flex items-center gap-2 bg-[#6B21A8] hover:bg-[#581C87] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/40"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        Abrir Libro
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative z-10 py-10">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-none mb-3">Panel de Gestión</Badge>
                  <h3 className="text-2xl font-black text-white mb-2">Explora la Biblioteca</h3>
                  <p className="text-slate-300 max-w-md mb-6 text-sm">
                    Como administrador, puedes revisar cualquier contenido pedagógico para asegurar la calidad de la enseñanza.
                  </p>
                  <Link
                    href="/dashboard/library"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all border border-white/10"
                  >
                    Ir a Biblioteca <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── HERO SUMMARY CARD (Move to left column) ──────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0f1623] border border-white/10 min-h-[220px] flex items-center p-8 group shadow-2xl">
            <div
              className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2070')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f1623] via-[#0f1623]/60 to-transparent" />
            
            <div className="relative z-10 w-full">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-none px-3 py-1">Panel Institucional</Badge>
                    {stats?.institution?.status === 'activa' && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-none px-3 py-1">Suscripción Activa</Badge>
                    )}
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-white mb-2">Visión General</h2>
                    <p className="text-slate-300 max-w-sm text-sm">
                      Monitorea el progreso de tu comunidad educativa desde un solo lugar.
                    </p>
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <div>
                      <p className="text-2xl font-bold text-white">{stats?.totalStudents || 0}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Estudiantes</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats?.totalTeachers || 0}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Docentes</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats?.totalClasses || 0}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cursos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {stats?.institution && (
            <div className="bg-[#1a2235] border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Tu suscripción</p>
                  <p className="text-xl font-black text-white">{stats.institution.plan}</p>
                </div>
                <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">Cupos Estudiantes</span>
                    <span className="text-white">{stats.totalStudents || 0} / {stats.institution.maxStudents}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, ((stats.totalStudents || 0) / stats.institution.maxStudents) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  Vence: {stats.institution.endDate ? new Date(stats.institution.endDate).toLocaleDateString() : 'Ilimitado'}
                </div>
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-xs h-9" asChild>
                  <Link href="/dashboard/admin/settings">Ver Detalles del Plan</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Quick Stats Distribution */}
          <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white">Distribución de Red</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Estudiantes</span>
                  <span className="text-indigo-400">{stats?.studentPercent || 0}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all" style={{ width: `${stats?.studentPercent || 0}%` }}></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Docentes</span>
                  <span className="text-purple-400">{stats?.teacherPercent || 0}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${stats?.teacherPercent || 0}%` }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Institution Library Config - SUPERADMIN ONLY */}
      {stats?.institution && isSuperAdmin && (
        <Card className="border-indigo-500/50/20 shadow-sm overflow-hidden bg-card">
          <CardHeader className="py-4 border-b bg-muted/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-500" /> Configuración de Biblioteca Institucional
              </CardTitle>
            </div>
            {updatingSetting && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Restringir Biblioteca a Libros Asignados</p>
                <p className="text-sm text-muted-foreground">
                  Si se activa, tus estudiantes solo verán aquellos libros que hayan sido asignados específicamente a sus clases matriculadas.
                </p>
              </div>
              <Switch 
                checked={stats.institution.isLibraryRestricted || false} 
                onCheckedChange={handleToggleLibrary}
                disabled={updatingSetting}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Book Section (Hidden locally unless superadmin/coordinador wants local books, removing to clean UI as requested) */}

      {/* Stats Cards - REAL DATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1a2235] border-white/5 shadow-xl hover:border-indigo-500/30 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Usuarios Totales</CardTitle>
            <div className="h-8 w-8 bg-indigo-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{stats?.totalUsers || 0}</div>
            <p className="text-[10px] text-slate-500 mt-2 flex gap-2">
              <span className="text-indigo-300 font-bold">{stats?.totalStudents || 0} Est.</span>
              <span>·</span>
              <span className="text-purple-300 font-bold">{stats?.totalTeachers || 0} Doc.</span>
              <span>·</span>
              <span className="text-slate-400 font-bold">{stats?.totalAdmins || 0} Adm.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2235] border-white/5 shadow-xl hover:border-violet-500/30 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Libros Disponibles</CardTitle>
            <div className="h-8 w-8 bg-violet-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="h-4 w-4 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{stats?.totalBooks || 0}</div>
            <p className="text-[10px] text-slate-500 mt-2">Títulos curados en la biblioteca global</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2235] border-white/5 shadow-xl hover:border-emerald-500/30 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Sesiones de Lectura</CardTitle>
            <div className="h-8 w-8 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{stats?.totalReadingSessions || 0}</div>
            <p className="text-[10px] text-slate-500 mt-2">Interacciones totales en tiempo real</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Users Table - REAL DATA */}
        <Card className="lg:col-span-2 bg-[#1a2235]/50 border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Usuarios Recientes</CardTitle>
            <CardDescription className="text-slate-400">Últimos usuarios registrados en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="border-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400">Usuario</TableHead>
                  <TableHead className="text-slate-400">Rol</TableHead>
                  <TableHead className="text-slate-400">Fecha</TableHead>
                  <TableHead className="text-right text-slate-400">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.recentUsers || []).map((user) => (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-bold text-white">{user.name || "Sin nombre"}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        user.role === "ADMIN" ? "bg-indigo-500/20 text-indigo-300 border-none" :
                        user.role === "TEACHER" ? "bg-purple-500/20 text-purple-300 border-none" :
                        "bg-slate-500/20 text-slate-300 border-none"
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a2235] border-white/10 text-white">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer">
                            <Link href="/dashboard/admin/users">Ver en gestión</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" className="w-full mt-6 border-white/10 hover:bg-white/5 text-slate-300 rounded-xl" asChild>
              <Link href="/dashboard/admin/users">Ver todos los usuarios</Link>
            </Button>
          </CardContent>
        </Card>

        {/* User Distribution - REAL DATA */}
        <div className="space-y-6">
          <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Distribución</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-300">Estudiantes</span>
                    <span className="text-indigo-400 font-black">{stats?.studentPercent || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all" style={{ width: `${stats?.studentPercent || 0}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-300">Profesores</span>
                    <span className="text-purple-400 font-black">{stats?.teacherPercent || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all" style={{ width: `${stats?.teacherPercent || 0}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-300">Administradores</span>
                    <span className="text-slate-400 font-black">{stats?.adminPercent || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-slate-600 to-slate-400 transition-all" style={{ width: `${stats?.adminPercent || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[#1a2235]/50 border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start gap-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl h-11"
                onClick={() => setIsSuggestedOpen(true)}
              >
                <Sparkles className="h-4 w-4" /> Lecturas Sugeridas
              </Button>
              <Button className="w-full justify-start gap-3 bg-[#6B21A8]/10 hover:bg-[#6B21A8]/20 text-purple-300 border border-purple-500/30 rounded-xl h-11" asChild>
                <Link href="/dashboard/admin/classes"><Plus className="h-4 w-4" /> Crear Nueva Clase</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-white/10 hover:bg-white/5 text-slate-300 rounded-xl h-11" asChild>
                <Link href="/dashboard/admin/users"><Users className="h-4 w-4" /> Asignar Estudiantes</Link>
              </Button>
            </CardContent>
          </Card>

          <SuggestedReadingsDialog
            isOpen={isSuggestedOpen}
            onClose={() => setIsSuggestedOpen(false)}
            onSuccess={() => {}}
            classes={adminClasses}
          />
        </div>
      </div>
    </div>
  );
}
