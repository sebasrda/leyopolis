
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  MoreHorizontal, 
  Search, 
  Shield, 
  UserCog, 
  Trash2 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar usuario permanentemente?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert("Error al eliminar");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const handleRoleChange = async (id: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "STUDENT" : "ADMIN"; // Simple toggle for now
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      alert("Error");
    }
  };

  const handleLicenseChange = async (id: string, newLicense: string) => {
    if (!confirm(`¿Cambiar licencia a ${newLicense}?`)) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseType: newLicense })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      alert("Error al actualizar licencia");
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra los accesos y roles de la plataforma.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Buscar usuarios..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Colegio / Grado</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Licencia</TableHead>
              <TableHead>Progreso (XP/Lvl)</TableHead>
              <TableHead>Última Actividad</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-indigo-700">{user.institution?.name || "Sin Colegio"}</span>
                    <span className="text-xs text-gray-500">{user.grade || "S/G"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "SUPERADMIN" ? "default" : user.role === "ADMIN" ? "outline" : user.role === "TEACHER" ? "secondary" : "outline"} className={user.role === "SUPERADMIN" ? "bg-purple-600" : ""}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className={cn(
                        "w-fit text-[10px] uppercase",
                        user.licenseType === "DEMO" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-200"
                    )}>
                        {user.licenseType === "DEMO" ? "Prueba (Demo)" : user.licenseType || "Periodo Activo"}
                    </Badge>
                    {user.expiresAt && (
                        <span className="text-[10px] text-gray-400">
                          Expira: {format(new Date(user.expiresAt), "dd MMM yyyy", { locale: es })}
                        </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-amber-600">{user.xp || 0} XP</span>
                      <span className="text-[10px] text-gray-400">| Lvl {user.level || 1}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-gray-500">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "N/A"}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2" onClick={() => handleRoleChange(user.id, user.role)}>
                        <UserCog className="h-4 w-4" /> Alternar Rol (Admin/Estudiante)
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-indigo-600" onClick={() => handleLicenseChange(user.id, "ACTIVATED")}>
                        <Shield className="h-4 w-4" /> Hacer Permanente
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => handleLicenseChange(user.id, "DEMO")}>
                        <Shield className="h-4 w-4" /> Hacer Demo
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-red-600" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
