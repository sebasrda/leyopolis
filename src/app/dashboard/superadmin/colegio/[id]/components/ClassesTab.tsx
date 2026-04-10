"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Users, UserPlus, FileEdit, Settings, Save } from "lucide-react";
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
import { Search } from "lucide-react";

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
  const [newClassStudentIds, setNewClassStudentIds] = useState<string[]>([]);
  const [newClassBookIds, setNewClassBookIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit class state
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [editBookIds, setEditBookIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // Search state
  const [studentSearch, setStudentSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");

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
        body: JSON.stringify({ name, teacherId, grade, studentIds: newClassStudentIds, bookIds: newClassBookIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        fetchData();
        onUpdate();
        setName("");
        setTeacherId("");
        setGrade("");
        setNewClassStudentIds([]);
        setNewClassBookIds([]);
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

  const filteredStudents = students.filter(s => 
    (s.name || s.email || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredBooks = books.filter(b => 
    (b.title || "").toLowerCase().includes(bookSearch.toLowerCase())
  );

  const handleEditOpen = (cls: any) => {
    setEditingClass(cls);
    setEditName(cls.name);
    setEditGrade(cls.grade || "");
    setEditTeacherId(cls.teacherId);
    setEditStudentIds(cls.students?.map((s: any) => s.id) || []);
    setEditBookIds(cls.assignedBooks?.map((b: any) => b.id) || []);
    setEditOpen(true);
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/classes/${editingClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          grade: editGrade,
          teacherId: editTeacherId,
          studentIds: editStudentIds,
          bookIds: editBookIds,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        fetchData();
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.message || "Error al actualizar");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
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
                      <Label className="flex items-center justify-between">
                        <span>Estudiantes a Matricular</span>
                        <div className="relative w-40">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input 
                            placeholder="Buscar..." 
                            className="pl-7 h-8 text-xs" 
                            value={studentSearch} 
                            onChange={e => setStudentSearch(e.target.value)} 
                          />
                        </div>
                      </Label>
                      <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50/30">
                        {filteredStudents.length === 0 ? <div className="text-sm text-gray-500 text-center py-2">No se encontraron estudiantes</div> : filteredStudents.map(s => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm p-1 hover:bg-white rounded border border-transparent hover:border-gray-100">
                            <input type="checkbox" checked={newClassStudentIds.includes(s.id)} onChange={(e) => {
                              if (e.target.checked) setNewClassStudentIds([...newClassStudentIds, s.id]);
                              else setNewClassStudentIds(newClassStudentIds.filter(id => id !== s.id));
                            }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="truncate">{s.name || s.email}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>Unidades de Lectura (Libros Base)</span>
                        <div className="relative w-40">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input 
                            placeholder="Buscar..." 
                            className="pl-7 h-8 text-xs" 
                            value={bookSearch} 
                            onChange={e => setBookSearch(e.target.value)} 
                          />
                        </div>
                      </Label>
                      <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50/30">
                        {filteredBooks.length === 0 ? <div className="text-sm text-gray-500 text-center py-2">No se encontraron libros</div> : filteredBooks.map(b => (
                          <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm p-1 hover:bg-white rounded border border-transparent hover:border-gray-100">
                            <input type="checkbox" checked={newClassBookIds.includes(b.id)} onChange={(e) => {
                              if (e.target.checked) setNewClassBookIds([...newClassBookIds, b.id]);
                              else setNewClassBookIds(newClassBookIds.filter(id => id !== b.id));
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

          {/* Edit Class Modal */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" /> Gestionar Clase: {editName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label>Nombre de la Clase</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Grado</Label>
                  <Input value={editGrade} onChange={e => setEditGrade(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Docente</Label>
                  <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name || t.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="flex items-center justify-between">
                    <span>Estudiantes Matriculados</span>
                    <div className="relative w-36">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                      <Input 
                        placeholder="Buscar..." 
                        className="pl-7 h-7 text-[10px]" 
                        value={studentSearch} 
                        onChange={e => setStudentSearch(e.target.value)} 
                      />
                    </div>
                  </Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-gray-50/50">
                    {filteredStudents.length === 0 ? <p className="text-xs text-center text-gray-500 py-2">No se encontraron estudiantes</p> : filteredStudents.map(s => (
                      <label key={s.id} className={`flex items-center gap-2 cursor-pointer text-xs p-1.5 hover:bg-white rounded border border-transparent ${editStudentIds.includes(s.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:border-gray-100'}`}>
                        <input type="checkbox" checked={editStudentIds.includes(s.id)} onChange={(e) => {
                          if (e.target.checked) setEditStudentIds([...editStudentIds, s.id]);
                          else setEditStudentIds(editStudentIds.filter(id => id !== s.id));
                        }} className="rounded border-gray-300 text-indigo-600" />
                        <span className="flex-1 truncate font-medium">{s.name || s.email}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="flex items-center justify-between">
                    <span>Unidades de Lectura Asignadas</span>
                    <div className="relative w-36">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                      <Input 
                        placeholder="Buscar..." 
                        className="pl-7 h-7 text-[10px]" 
                        value={bookSearch} 
                        onChange={e => setBookSearch(e.target.value)} 
                      />
                    </div>
                  </Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-gray-50/50">
                    {filteredBooks.length === 0 ? <p className="text-xs text-center text-gray-500 py-2">No se encontraron libros</p> : filteredBooks.map(b => (
                      <label key={b.id} className={`flex items-center gap-2 cursor-pointer text-xs p-1.5 hover:bg-white rounded border border-transparent ${editBookIds.includes(b.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:border-gray-100'}`}>
                        <input type="checkbox" checked={editBookIds.includes(b.id)} onChange={(e) => {
                          if (e.target.checked) setEditBookIds([...editBookIds, b.id]);
                          else setEditBookIds(editBookIds.filter(id => id !== b.id));
                        }} className="rounded border-gray-300 text-indigo-600" />
                        <span className="flex-1 truncate font-medium">{b.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleUpdateClass} disabled={updating} className="w-full mt-2 bg-indigo-600">
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Cambios
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
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8 w-8" onClick={() => handleEditOpen(c)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-700 hover:bg-red-50 h-8 w-8" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
