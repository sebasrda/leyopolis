"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ClassesTab({ institutionId, onUpdate }: { institutionId: string, onUpdate: () => void }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [grade, setGrade] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [bookIds, setBookIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [institutionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const resClasses = await fetch(`/api/superadmin/institutions/${institutionId}/classes`);
      if (resClasses.ok) setClasses(await resClasses.json());

      // Fetch teachers for the select dropdown
      const resTeachers = await fetch(`/api/superadmin/institutions/${institutionId}/users?role=TEACHER`);
      if (resTeachers.ok) setTeachers(await resTeachers.json());
      
      // Fetch students for enrollment
      const resStudents = await fetch(`/api/superadmin/institutions/${institutionId}/users?role=STUDENT`);
      if (resStudents.ok) setStudents(await resStudents.json());

      // Fetch books globally
      const resBooks = await fetch(`/api/books`);
      if (resBooks.ok) setBooks(await resBooks.json());
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, teacherId, grade, studentIds, bookIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        fetchData();
        onUpdate();
        setName("");
        setTeacherId("");
        setGrade("");
        setStudentIds([]);
        setBookIds([]);
      } else {
        alert(data.message || "Error al crear");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("¿Eliminar esta clase? Los estudiantes no serán borrados, solo desasignados.")) return;
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}/classes/${classId}`, { method: "DELETE" });
      if (res.ok) {
        setClasses(classes.filter(c => c.id !== classId));
        onUpdate();
      } else {
        alert("Error al eliminar");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Gestión de Clases / Aulas</h2>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                <Plus className="h-4 w-4" /> Crear Clase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Clase</DialogTitle>
              </DialogHeader>
              
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Clase</Label>
                      <Input placeholder="Ej. Matemáticas 5to B" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Grado (Opcional)</Label>
                      <Input placeholder="Ej. 5to Primaria" value={grade} onChange={e => setGrade(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Docente Titular</Label>
                      <Select value={teacherId} onValueChange={setTeacherId}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar Docente" /></SelectTrigger>
                          <SelectContent>
                              {teachers.length === 0 ? (
                                  <div className="p-2 text-sm text-gray-500">No hay docentes registrados</div>
                              ) : (
                                teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name || t.email}</SelectItem>)
                              )}
                          </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estudiantes a Matricular</Label>
                      <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                        {students.length === 0 ? <div className="text-sm text-gray-500">No hay estudiantes en este colegio</div> : students.map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm p-1 hover:bg-gray-50 rounded">
                            <input type="checkbox" checked={studentIds.includes(s.id)} onChange={(e) => {
                              if (e.target.checked) setStudentIds([...studentIds, s.id]);
                              else setStudentIds(studentIds.filter(id => id !== s.id));
                            }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="truncate">{s.name || s.email}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Unidades de Lectura (Libros Base)</Label>
                      <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                        {books.length === 0 ? <div className="text-sm text-gray-500">No hay libros disponibles</div> : books.map(b => (
                          <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm p-1 hover:bg-gray-50 rounded">
                            <input type="checkbox" checked={bookIds.includes(b.id)} onChange={(e) => {
                              if (e.target.checked) setBookIds([...bookIds, b.id]);
                              else setBookIds(bookIds.filter(id => id !== b.id));
                            }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="truncate">{b.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleCreate} disabled={creating || !name || !teacherId} className="w-full mt-4">
                      {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Crear Clase
                    </Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-medium text-gray-500">Clase</th>
                <th className="p-3 font-medium text-gray-500">Docente Titular</th>
                <th className="p-3 font-medium text-gray-500">Estudiantes</th>
                <th className="p-3 font-medium text-gray-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400" /></td></tr>
              ) : classes.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay clases configuradas.</td></tr>
              ) : (
                classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-3">
                        <div className="font-bold text-gray-900">{c.name}</div>
                        {c.grade && <Badge variant="secondary" className="mt-1 text-[10px]">{c.grade}</Badge>}
                    </td>
                    <td className="p-3 text-gray-600">{c.teacher?.name || c.teacher?.email || "Sin asignar"}</td>
                    <td className="p-3">
                        <span className="flex items-center gap-1 text-gray-600">
                            <Users className="h-4 w-4" /> {c._count?.students || 0}
                        </span>
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-700 hover:bg-red-50 h-8 w-8" onClick={() => handleDelete(c.id)}>
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
