"use client";

import { useState, useEffect } from "react";
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
  GraduationCap,
  Loader2,
  UserCog,
  Trash2,
  FileText,
  Settings,
} from "lucide-react";
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStats();
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500">Cargando panel de administración...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchStats}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión del Colegio</h1>
          <p className="text-gray-500">
            {stats?.institution?.name 
              ? `Plataforma de ${stats.institution.name}` 
              : "Administra usuarios y clases de tu institución."}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                <Plus className="h-4 w-4" /> Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Añadir Usuario al Colegio</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
                <div className="space-y-1">
                  <Label>Contraseña</Label>
                  <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-1">
                  <Label>Rol</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Estudiante</SelectItem>
                      <SelectItem value="TEACHER">Docente</SelectItem>
                      <SelectItem value="COORDINATOR">Coordinador</SelectItem>
                      <SelectItem value="ADMIN">Admin Secundario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} disabled={creatingUser || !newUserName || !newUserEmail || !newUserPassword} className="w-full">
                  {creatingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Añadir Usuario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subscription Card */}
      {stats?.institution && (
        <Card className={`border-2 ${stats.institution.status === 'activa' ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Suscripción: {stats.institution.plan}
                  <Badge variant={stats.institution.status === 'activa' ? "default" : "secondary"} className={stats.institution.status === 'activa' ? "bg-green-600" : ""}>
                    {stats.institution.status.toUpperCase()}
                  </Badge>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Estudiantes inscritos: <span className="font-bold">{stats.totalStudents || 0}</span> / {stats.institution.maxStudents} límite
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Vencimiento del plan</p>
                <p className="font-semibold text-gray-900">
                  {stats.institution.endDate ? new Date(stats.institution.endDate).toLocaleDateString() : 'Ilimitado'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Institution Library Config - SUPERADMIN ONLY */}
      {stats?.institution && isSuperAdmin && (
        <Card className="border-indigo-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="py-4 border-b bg-gray-50/30 flex flex-row items-center justify-between">
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
                <p className="font-semibold text-gray-900">Restringir Biblioteca a Libros Asignados</p>
                <p className="text-sm text-gray-500">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">{stats?.totalStudents || 0} est. · {stats?.totalTeachers || 0} doc. · {stats?.totalAdmins || 0} admin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Libros en Biblioteca</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBooks || 0}</div>
            <p className="text-xs text-gray-500 mt-1">PDFs disponibles en la plataforma</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clases Activas</CardTitle>
            <GraduationCap className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Grupos con docente asignado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Users Table - REAL DATA */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuarios Recientes</CardTitle>
            <CardDescription>Últimos usuarios registrados en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.recentUsers || []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || "Sin nombre"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : user.role === "TEACHER" ? "secondary" : "outline"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem asChild><Link href="/dashboard/admin/users">Ver en gestión</Link></DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">No hay usuarios registrados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/admin/users">Ver todos los usuarios</Link>
            </Button>
          </CardContent>
        </Card>

        {/* User Distribution - REAL DATA */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Estudiantes</span>
                    <span className="text-gray-500">{stats?.studentPercent || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${stats?.studentPercent || 0}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Profesores</span>
                    <span className="text-gray-500">{stats?.teacherPercent || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 transition-all" style={{ width: `${stats?.teacherPercent || 0}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Admins</span>
                    <span className="text-gray-500">{stats?.adminPercent || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-800 transition-all" style={{ width: `${stats?.adminPercent || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" asChild>
                <Link href="/dashboard/admin/classes"><Plus className="h-4 w-4" /> Crear Nueva Clase</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/dashboard/admin/users"><Users className="h-4 w-4" /> Asignar Estudiantes</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
