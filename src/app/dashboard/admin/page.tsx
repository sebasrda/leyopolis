"use client";

import { useState } from "react";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  AlertCircle,
  MoreHorizontal,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function AdminDashboardPage() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploadProgress(10); // Start progress

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", selectedFile.name.replace(".pdf", ""));

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          alert("Libro subido exitosamente. Ahora está disponible en la Biblioteca.");
          setUploadProgress(0);
          setSelectedFile(null);
        }, 500);
      } else {
        alert("Error al subir el libro.");
        setUploadProgress(0);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión.");
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500">Gestiona usuarios, libros y contenido de la plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            <Plus className="h-4 w-4" /> Nuevo Usuario
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Upload Book Section */}
      <Card className="p-6 border-dashed border-2 border-indigo-200 bg-indigo-50/50">
        <h3 className="text-lg font-bold text-indigo-900 mb-2">Subir Nuevo Libro (PDF)</h3>
        <div className="flex items-center gap-4">
          <Input 
            type="file" 
            accept=".pdf" 
            className="bg-white" 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleFileUpload} disabled={!selectedFile || (uploadProgress > 0 && uploadProgress < 100)}>
            {uploadProgress > 0 && uploadProgress < 100 ? `Subiendo ${uploadProgress}%` : "Subir y Procesar"}
          </Button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,345</div>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> +18.2% este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Libros Traducidos</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">843</div>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> +5.4% esta semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231</div>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> +12.1% vs mes anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <p className="text-xs text-gray-500 mt-1">Uptime últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Users Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuarios Recientes</CardTitle>
            <CardDescription>Gestión de los últimos usuarios registrados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input placeholder="Buscar usuarios..." className="pl-9" />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Ana García", email: "ana@example.com", role: "Estudiante", status: "Activo", date: "Hoy" },
                    { name: "Carlos Ruiz", email: "carlos@example.com", role: "Profesor", status: "Activo", date: "Ayer" },
                    { name: "Maria Loza", email: "maria@example.com", role: "Estudiante", status: "Inactivo", date: "Hace 2 días" },
                    { name: "John Doe", email: "john@example.com", role: "Estudiante", status: "Activo", date: "Hace 3 días" },
                    { name: "Admin Test", email: "admin@leyopolis.com", role: "Admin", status: "Activo", date: "Hace 1 semana" },
                  ].map((user, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "Activo" ? "default" : "secondary"} className={user.status === "Activo" ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.date}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">Suspender</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* System Health / Alerts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-yellow-900">Alto uso de API de Traducción</h4>
                  <p className="text-xs text-yellow-700 mt-1">Se ha alcanzado el 85% de la cuota mensual de OpenAI.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-green-900">Backup Completado</h4>
                  <p className="text-xs text-green-700 mt-1">La copia de seguridad de la base de datos se realizó con éxito a las 03:00 AM.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Estudiantes</span>
                    <span className="text-gray-500">85%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 w-[85%]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Profesores</span>
                    <span className="text-gray-500">12%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 w-[12%]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Admins</span>
                    <span className="text-gray-500">3%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-800 w-[3%]"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
