"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  GraduationCap,
  Trash2,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClassItem {
  id: string;
  name: string;
  subject?: string;
  grade?: string;
  teacher: { id: string; name: string; email: string };
  _count: { students: number };
  students?: { id: string; name: string; email: string }[];
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BookItem {
  id: string;
  title: string;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create class state
  const [createOpen, setCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("");
  const [newClassTeacherId, setNewClassTeacherId] = useState("");
  const [newClassStudentIds, setNewClassStudentIds] = useState<string[]>([]);
  const [newClassBookIds, setNewClassBookIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Enroll state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollClassId, setEnrollClassId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Detail/Edit view
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [editBookIds, setEditBookIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const teachers = users.filter(u => u.role === "TEACHER" || u.role === "COORDINATOR");
  const students = users.filter(u => u.role === "STUDENT");

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const fetchAll = async () => {
    try {
      const [classRes, usersRes, booksRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/users"),
        fetch("/api/books"),
      ]);
      if (classRes.ok) setClasses(await classRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (booksRes.ok) setBooks(await booksRes.json());
    } catch (err) {
      console.error(err);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClassName || !newClassTeacherId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClassName,
          teacherId: newClassTeacherId,
          subject: newClassSubject || undefined,
          grade: newClassGrade || undefined,
          studentIds: newClassStudentIds,
          bookIds: newClassBookIds,
        }),
      });
      if (res.ok) {
        const newCls = await res.json();
        setClasses(prev => [newCls, ...prev]);
        setCreateOpen(false);
        setNewClassName("");
        setNewClassSubject("");
        setNewClassGrade("");
        setNewClassTeacherId("");
        setNewClassStudentIds([]);
        setNewClassBookIds([]);
        setSuccess("Clase creada exitosamente");
      } else {
        const data = await res.json();
        setError(data.message || "Error al crear clase");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollClassId || selectedStudents.length === 0) return;
    setEnrolling(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${enrollClassId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      if (res.ok) {
        setEnrollOpen(false);
        setSelectedStudents([]);
        setEnrollClassId("");
        setSuccess(`${selectedStudents.length} estudiante(s) matriculado(s)`);
        fetchAll();
      } else {
        const data = await res.json();
        setError(data.message || "Error al matricular");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setEnrolling(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta clase permanentemente?")) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClasses(prev => prev.filter(c => c.id !== id));
        setSuccess("Clase eliminada");
      }
    } catch {
      setError("Error al eliminar");
    }
  };

  const handleEditOpen = async (cls: any) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${cls.id}`);
      if (res.ok) {
        const fullCls = await res.json();
        setEditingClass(fullCls);
        setEditName(fullCls.name);
        setEditSubject(fullCls.subject || "");
        setEditGrade(fullCls.grade || "");
        setEditTeacherId(fullCls.teacherId);
        setEditStudentIds(fullCls.students?.map((s: any) => s.id) || []);
        setEditBookIds(fullCls.assignedBooks?.map((b: any) => b.id) || []);
        setEditOpen(true);
      }
    } catch {
      setError("Error al cargar detalles de la clase");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingClass) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${editingClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          subject: editSubject,
          grade: editGrade,
          teacherId: editTeacherId,
          studentIds: editStudentIds,
          bookIds: editBookIds,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        setSuccess("Clase actualizada correctamente");
        fetchAll();
      } else {
        const data = await res.json();
        setError(data.message || "Error al actualizar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setUpdating(false);
    }
  };



  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Clases</h1>
          <p className="text-gray-500">Crea clases, asigna docentes y matricula estudiantes.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                <Plus className="h-4 w-4" /> Nueva Clase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Clase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nombre de la Clase *</Label>
                  <Input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Ej. Español 8vo A" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Materia</Label>
                    <Input value={newClassSubject} onChange={e => setNewClassSubject(e.target.value)} placeholder="Ej. Español" />
                  </div>
                  <div className="space-y-2">
                    <Label>Grado</Label>
                    <Input value={newClassGrade} onChange={e => setNewClassGrade(e.target.value)} placeholder="Ej. 8vo" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Docente Asignado *</Label>
                  <Select value={newClassTeacherId} onValueChange={setNewClassTeacherId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar docente" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Matricular Estudiantes Iniciales</Label>
                  <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                    {students.length === 0 ? (
                      <div className="text-xs text-gray-500">No hay estudiantes registrados</div>
                    ) : (
                      students.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer text-xs p-1 hover:bg-gray-50 rounded">
                          <input 
                            type="checkbox" 
                            checked={newClassStudentIds.includes(s.id)} 
                            onChange={(e) => {
                              if (e.target.checked) setNewClassStudentIds([...newClassStudentIds, s.id]);
                              else setNewClassStudentIds(newClassStudentIds.filter(id => id !== s.id));
                            }} 
                            className="rounded border-gray-300 text-indigo-600" 
                          />
                          <span className="truncate">{s.name || s.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Asignar Unidades de Lectura</Label>
                  <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                    {books.length === 0 ? (
                      <div className="text-xs text-gray-500">No hay libros disponibles</div>
                    ) : (
                      books.map(b => (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer text-xs p-1 hover:bg-gray-50 rounded">
                          <input 
                            type="checkbox" 
                            checked={newClassBookIds.includes(b.id)} 
                            onChange={(e) => {
                              if (e.target.checked) setNewClassBookIds([...newClassBookIds, b.id]);
                              else setNewClassBookIds(newClassBookIds.filter(id => id !== b.id));
                            }} 
                            className="rounded border-gray-300 text-indigo-600" 
                          />
                          <span className="truncate">{b.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Button onClick={handleCreate} disabled={creating || !newClassName || !newClassTeacherId} className="w-full mt-4">
                  {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Crear Clase"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" /> Matricular
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Matricular Estudiantes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Clase</Label>
                  <Select value={enrollClassId} onValueChange={setEnrollClassId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar clase" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c._count.students} est.)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Buscar Estudiantes</Label>
                  <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Buscar por nombre o email..." />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-gray-500 p-3 text-center">No hay estudiantes registrados</p>
                  ) : (
                    filteredStudents.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} className="rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {selectedStudents.length > 0 && (
                  <p className="text-sm text-indigo-600 font-medium">{selectedStudents.length} seleccionado(s)</p>
                )}
                <Button onClick={handleEnroll} disabled={enrolling || !enrollClassId || selectedStudents.length === 0} className="w-full">
                  {enrolling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Matriculando...</> : `Matricular ${selectedStudents.length} Estudiantes`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit/Manage Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" /> Gestionar Clase: {editName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre de la Clase</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Materia</Label>
                <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Grado</Label>
                <Input value={editGrade} onChange={e => setEditGrade(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Docente</Label>
              <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center justify-between">
                <span>Estudiantes en Clase</span>
                <Badge variant="outline">{editStudentIds.length}</Badge>
              </Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1 bg-gray-50/50">
                {students.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 cursor-pointer text-xs p-1.5 hover:bg-white rounded border border-transparent ${editStudentIds.includes(s.id) ? 'bg-indigo-50 border-indigo-100' : ''}`}>
                    <input type="checkbox" checked={editStudentIds.includes(s.id)} onChange={(e) => {
                      if (e.target.checked) setEditStudentIds([...editStudentIds, s.id]);
                      else setEditStudentIds(editStudentIds.filter(id => id !== s.id));
                    }} className="rounded border-gray-300 text-indigo-600" />
                    <span className="flex-1 truncate font-medium">{s.name}</span>
                    <span className="text-gray-400 font-normal">{s.email}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center justify-between">
                <span>Unidades de Lectura</span>
                <Badge variant="outline">{editBookIds.length}</Badge>
              </Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1 bg-gray-50/50">
                {books.map(b => (
                  <label key={b.id} className={`flex items-center gap-2 cursor-pointer text-xs p-1.5 hover:bg-white rounded border border-transparent ${editBookIds.includes(b.id) ? 'bg-indigo-50 border-indigo-100' : ''}`}>
                    <input type="checkbox" checked={editBookIds.includes(b.id)} onChange={(e) => {
                      if (e.target.checked) setEditBookIds([...editBookIds, b.id]);
                      else setEditBookIds(editBookIds.filter(id => id !== b.id));
                    }} className="rounded border-gray-300 text-indigo-600" />
                    <span className="flex-1 truncate font-medium">{b.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleUpdate} disabled={updating} className="w-full mt-2">
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <Card className="p-12 border-dashed border-2 text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-900">No hay clases creadas</h3>
          <p className="text-sm text-gray-500 mt-1">Crea tu primera clase con el botón de arriba.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-indigo-900">{cls.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {cls.subject && <Badge variant="outline" className="mr-1">{cls.subject}</Badge>}
                      {cls.grade && <Badge variant="secondary" className="text-xs">{cls.grade}</Badge>}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 -mt-1" onClick={() => handleDelete(cls.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Docente:</span> {cls.teacher?.name || "Sin asignar"}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Users className="h-4 w-4" /> Estudiantes
                  </span>
                  <span className="font-bold">{cls._count?.students || 0}</span>
                </div>
                <Button variant="outline" className="w-full" size="sm" onClick={() => handleEditOpen(cls)}>
                  Gestionar Clase
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
