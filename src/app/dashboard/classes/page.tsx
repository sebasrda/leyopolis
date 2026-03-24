
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Calendar, 
  MoreHorizontal,
  BookOpen,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    if (!newClassName) return;
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName })
      });
      if (res.ok) {
        setNewClassName("");
        setOpen(false);
        fetchClasses();
      }
    } catch (e) {
      alert("Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar clase?")) return;
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      fetchClasses();
    } catch (e) {
      alert("Error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Clases</h1>
          <p className="text-gray-500">Gestiona tus grupos y asignaciones de lectura.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <Plus className="h-4 w-4" /> Nueva Clase
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Clase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Clase</Label>
                <Input 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ej. Español 8vo A"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Crear Clase</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <Card key={cls.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl font-bold text-indigo-900">{cls.name}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <Calendar className="h-3 w-3 mr-1" /> {new Date(cls.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Ver Estudiantes</DropdownMenuItem>
                  <DropdownMenuItem>Asignar Lectura</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(cls.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar Clase
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 flex items-center">
                  <Users className="h-4 w-4 mr-1" /> Estudiantes
                </span>
                <span className="font-bold">{cls._count?.students || 0}</span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg">
                <span className="text-xs font-bold text-indigo-600 uppercase">Próxima Asignación</span>
                <div className="flex items-center mt-1 text-sm font-medium text-gray-700">
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                  Sin asignación
                </div>
              </div>
              <Button variant="outline" className="w-full">Gestionar Clase</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
