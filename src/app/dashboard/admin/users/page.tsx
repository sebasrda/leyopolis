"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  MoreHorizontal, 
  Search, 
  Shield, 
  UserCog, 
  Trash2,
  Lock,
  UserX,
  UserCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Password Reset Modal State
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

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
        const err = await res.json();
        alert(`Error al eliminar: ${err.message || "error desconocido"}`);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const handleStatusToggle = async (user: any) => {
    const newStatus = !user.isActive;
    const action = newStatus ? "Activar" : "Suspender";
    if (!confirm(`¿${action} la cuenta de ${user.name}?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (e) {
      alert("Error al actualizar estado");
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        alert("Contraseña actualizada correctamente");
        setPassModalOpen(false);
        setNewPassword("");
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (e) {
      alert("Error al cambiar contraseña");
    } finally {
      setChangingPass(false);
    }
  };

  const handleRoleChange = async (id: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "STUDENT" : "ADMIN";
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
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los accesos y roles de la plataforma.</p>
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
              <TableHead>Estado</TableHead>
              <TableHead>Licencia</TableHead>
              <TableHead>Activación</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Última Actividad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className={cn("font-medium", !user.isActive && "text-gray-400 line-through")}>{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-indigo-300">{user.institution?.name || "Sin Colegio"}</span>
                    <span className="text-xs text-muted-foreground">{user.grade || "S/G"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "SUPERADMIN" ? "default" : user.role === "ADMIN" ? "outline" : user.role === "TEACHER" ? "secondary" : "outline"} className={user.role === "SUPERADMIN" ? "bg-purple-600" : ""}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "outline" : "destructive"} className={cn(user.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                    {user.isActive ? "Activo" : "Suspendido"}
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
                  {user.createdAt ? (
                    <div className="flex flex-col tabular-nums">
                      <span className="text-xs text-foreground/80">
                        {format(new Date(user.createdAt), "dd MMM yyyy", { locale: es })}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(user.createdAt), "HH:mm:ss")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
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
                  <span className="text-xs text-muted-foreground">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "N/A"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Acciones de Usuario</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem className="gap-2" onClick={() => handleRoleChange(user.id, user.role)}>
                        <UserCog className="h-4 w-4" /> Alternar Rol (Admin/Est.)
                      </DropdownMenuItem>

                      <DropdownMenuItem className="gap-2" onClick={() => {
                        setSelectedUser(user);
                        setPassModalOpen(true);
                      }}>
                        <Lock className="h-4 w-4" /> Cambiar Contraseña
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Licencia y Estado</DropdownMenuLabel>

                      <DropdownMenuItem className={cn("gap-2", user.isActive ? "text-amber-600" : "text-green-600")} onClick={() => handleStatusToggle(user)}>
                        {user.isActive ? (
                          <><UserX className="h-4 w-4" /> Suspender Acceso</>
                        ) : (
                          <><UserCheck className="h-4 w-4" /> Reactivar Acceso</>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem className="gap-2 text-indigo-400" onClick={() => handleLicenseChange(user.id, "ACTIVATED")}>
                        <Shield className="h-4 w-4" /> Hacer Permanente
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => handleLicenseChange(user.id, "DEMO")}>
                        <Shield className="h-4 w-4" /> Hacer Demo
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 text-red-600" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4" /> Eliminar Permanentemente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Password Reset Modal */}
      <Dialog open={passModalOpen} onOpenChange={setPassModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Asigna una nueva clave para el usuario <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePasswordChange} disabled={changingPass}>
              {changingPass ? "Actualizando..." : "Guardar Contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
