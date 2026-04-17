"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";

export default function UsersTab({ institutionId, role, limits, onUpdate }: { institutionId: string, role: string, limits: { count: number, max: number }, onUpdate: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [licenseType, setLicenseType] = useState("MENSUAL");
  const [creating, setCreating] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{email: string, pass: string} | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [institutionId, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users?role=${role}`);
      if (res.ok) {
        setUsers(await res.json());
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
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, licenseType }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCredentials({ email: data.user.email, pass: data.plainPassword });
        fetchUsers();
        onUpdate();
        setName("");
        setEmail("");
      } else {
        alert(data.message || "Error al crear");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario permanentemente?")) return;
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        onUpdate();
      } else {
        alert("Error al eliminar");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const roleName = role === "STUDENT" ? "Estudiantes" : role === "TEACHER" ? "Docentes" : role === "COORDINATOR" ? "Coordinadores" : "Administradores";
  const roleSingular = role === "STUDENT" ? "Estudiante" : role === "TEACHER" ? "Docente" : role === "COORDINATOR" ? "Coordinador" : "Administrador";

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Gestión de {roleName}</h2>
          
          <Dialog open={createOpen} onOpenChange={(val) => { setCreateOpen(val); if (!val) setNewCredentials(null); }}>
            <DialogTrigger asChild>
              <Button disabled={role === "STUDENT" && limits.max > 0 && limits.count >= limits.max} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                <Plus className="h-4 w-4" /> Registrar {roleSingular}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo {roleSingular}</DialogTitle>
              </DialogHeader>
              
              {newCredentials ? (
                 <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center space-y-4">
                    <KeyRound className="h-10 w-10 text-green-600 mx-auto" />
                    <div>
                        <p className="text-sm text-green-800 font-medium">¡Creado exitosamente!</p>
                        <p className="text-xs text-gray-500 mt-2">Copia estos datos y entrégalos al usuario:</p>
                    </div>
                    <div className="bg-white p-4 rounded border text-left space-y-2">
                        <p className="font-mono text-sm"><strong>Email:</strong> {newCredentials.email}</p>
                        <p className="font-mono text-sm text-indigo-600"><strong>Clave:</strong> {newCredentials.pass}</p>
                    </div>
                    <Button onClick={() => setCreateOpen(false)} className="w-full">Cerrar</Button>
                 </div>
              ) : (
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input placeholder={`Nombre del ${roleSingular.toLowerCase()}`} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Licencia</Label>
                      <Select value={licenseType} onValueChange={setLicenseType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una licencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MENSUAL">Mensual (30 días)</SelectItem>
                          <SelectItem value="TRIMESTRAL">Trimestral (90 días)</SelectItem>
                          <SelectItem value="ANUAL">Anual (365 días)</SelectItem>
                          <SelectItem value="ACTIVATED">Permanente / Activa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreate} disabled={creating || !name || !email} className="w-full mt-2">
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Crear (Clave Automática)
                    </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {role === "STUDENT" && limits.max > 0 && limits.count >= limits.max && (
            <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-sm">
                Has alcanzado el límite máximo de estudiantes contratados ({limits.max}). No puedes registrar más.
            </div>
        )}

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-medium text-gray-500">Nombre</th>
                <th className="p-3 font-medium text-gray-500">Email</th>
                <th className="p-3 font-medium text-gray-500">Licencia</th>
                <th className="p-3 font-medium text-gray-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay {roleName.toLowerCase()} registrados.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{u.name || "Sin nombre"}</td>
                    <td className="p-3 text-gray-500">{u.email}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        {u.licenseType === "DEMO" ? "Demo" : u.licenseType === "MENSUAL" ? "Mensual" : u.licenseType === "TRIMESTRAL" ? "Trimestral" : u.licenseType === "ANUAL" ? "Anual" : "Permanente"}
                      </span>
                      {u.expiresAt && (
                        <span className="block text-xs text-gray-400 mt-1">Expira: {format(new Date(u.expiresAt), "dd/MM/yyyy")}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-700 hover:bg-red-50 h-8 w-8" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
