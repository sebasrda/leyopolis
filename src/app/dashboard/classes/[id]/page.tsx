"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, BookOpen, Plus, Calendar, Clock, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ClassDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"students" | "assignments">("students");
  const [cls, setCls] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  
  // Assignment form
  const [openAssignment, setOpenAssignment] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");

  // Add student form
  const [openStudentModal, setOpenStudentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Check URL query parameters for default tab
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("tab") === "assignments") setActiveTab("assignments");
    }
    fetchClassData();
    fetchBooks();
  }, [id]);

  const fetchClassData = async () => {
    try {
      const res = await fetch(`/api/classes/${id}`);
      if (res.ok) setCls(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) setBooks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchStudent = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/students/search?query=${query}`);
      if (res.ok) setSearchResults(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnrollStudent = async (studentId: string) => {
    try {
      const res = await fetch(`/api/classes/${id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] })
      });
      if (res.ok) {
        setOpenStudentModal(false);
        setSearchQuery("");
        setSearchResults([]);
        fetchClassData();
      } else {
        alert("Error al añadir al estudiante.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignReading = async () => {
    if (!selectedBookId || !assignmentTitle) {
      alert("Por favor completa el título y selecciona un libro.");
      return;
    }
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: id,
          bookId: selectedBookId,
          title: assignmentTitle,
          dueDate: dueDate || null,
        })
      });

      if (res.ok) {
        setOpenAssignment(false);
        setAssignmentTitle("");
        setSelectedBookId("");
        setDueDate("");
        fetchClassData(); // Refresh assignments
      } else {
        alert("Error al asignar la lectura.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!cls) {
    return <div className="p-8 text-center text-muted-foreground hover:animate-pulse transition-all">Cargando clase...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/classes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-200">{cls.name}</h1>
            <p className="text-muted-foreground">Gestión de panel de {cls.subject || "Lectura"}</p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-indigo-500/10 border-indigo-500/50/20 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Total Estudiantes</p>
              <h2 className="text-3xl font-black text-indigo-200 mt-1">{cls.students?.length || 0}</h2>
            </div>
            <Users className="h-8 w-8 text-indigo-300" />
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Lecturas Asignadas</p>
              <h2 className="text-3xl font-black text-emerald-900 mt-1">{cls.assignments?.length || 0}</h2>
            </div>
            <BookOpen className="h-8 w-8 text-emerald-300" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-border">
        <button 
          onClick={() => setActiveTab("students")}
          className={`pb-4 px-4 font-bold border-b-2 transition-colors ${activeTab === "students" ? "border-indigo-600 text-indigo-300" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          🎓 Lista de Estudiantes
        </button>
        <button 
          onClick={() => setActiveTab("assignments")}
          className={`pb-4 px-4 font-bold border-b-2 transition-colors ${activeTab === "assignments" ? "border-indigo-600 text-indigo-300" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          📚 Lecturas Asignadas
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        
        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Estudiantes Matriculados</CardTitle>
                <CardDescription>Usuarios asociados a esta clase y sus progresos.</CardDescription>
              </div>
              <Dialog open={openStudentModal} onOpenChange={setOpenStudentModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Añadir Estudiante
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buscar e Inscribir Estudiante</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2 relative">
                      <Label>Buscar por Nombre o Correo (Solo tu colegio)</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          placeholder="Escribe para buscar..." 
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => handleSearchStudent(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-md min-h-[150px] max-h-[300px] overflow-y-auto bg-muted p-2">
                      {isSearching ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">Buscando...</p>
                      ) : searchResults.length > 0 ? (
                        <div className="space-y-2">
                          {searchResults.map(st => (
                            <div key={st.id} className="flex justify-between items-center p-2 bg-card border border-border rounded-md">
                              <div>
                                <p className="font-semibold text-sm">{st.name}</p>
                                <p className="text-xs text-muted-foreground">{st.email}</p>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleEnrollStudent(st.id)}
                                disabled={cls.students?.some((s: any) => s.id === st.id)}
                              >
                                {cls.students?.some((s: any) => s.id === st.id) ? "Inscrito" : "Añadir"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : searchQuery.length >= 2 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">No se encontraron estudiantes.</p>
                      ) : (
                        <p className="text-center text-gray-400 py-4 text-sm flex items-center justify-center gap-2">
                          <Users className="h-4 w-4" /> Escribe al menos 2 letras
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">* Al inscribir a un estudiante, se registrará el enlace y, de haber un servicio de correo habilitado, se le enviará un email de bienvenida.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {cls.students?.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-muted rounded-lg border border-dashed border-border">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Todavía no tienes estudiantes en esta clase.</p>
                  <p className="text-sm">Comparte el código de acceso con tu salón.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cls.students?.map((st: any) => (
                    <div key={st.id} className="flex justify-between items-center p-3 hover:bg-muted rounded-lg border border-border transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-300 uppercase">
                          {st.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{st.name}</p>
                          <p className="text-sm text-muted-foreground">{st.email}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ASSIGNMENTS TAB */}
        {activeTab === "assignments" && (
          <Card className="border-border shadow-sm border-t-indigo-500 border-t-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Plan de Lectura</CardTitle>
                <CardDescription>Asigna libros de la biblioteca general como tareas.</CardDescription>
              </div>
              
              {/* Assign Reading Modal */}
              <Dialog open={openAssignment} onOpenChange={setOpenAssignment}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-semibold">
                    <Plus className="h-4 w-4" /> Asignar Nueva Lectura
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Asignación de Libro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Título de la Tarea</Label>
                      <Input 
                        value={assignmentTitle}
                        onChange={(e) => setAssignmentTitle(e.target.value)}
                        placeholder="Ej. Análisis de Romeo y Julieta (Fin de Mes)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Seleccionar Libro</Label>
                      <select 
                        value={selectedBookId}
                        onChange={(e) => setSelectedBookId(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="" disabled>-- Elige un libro de la biblioteca --</option>
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>{b.title} (Autor: {b.author})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Fecha de Entrega Límite (Opcional)</Label>
                      <Input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAssignReading} className="w-full bg-indigo-600 hover:bg-indigo-700">Guardar Asignación</Button>
                  </div>
                </DialogContent>
              </Dialog>

            </CardHeader>
            <CardContent>
              {cls.assignments?.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-muted rounded-lg border border-dashed border-border">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No has asignado ninguna lectura a esta clase aún.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {cls.assignments?.map((assign: any) => (
                    <div key={assign.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-card rounded-xl shadow-sm border border-border hover:shadow-md transition-all gap-4">
                      
                      {/* Título de tarea y libro vinculado */}
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 mt-1">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-lg leading-tight">{assign.title}</h3>
                          <p className="text-indigo-400 font-semibold text-sm">Libro: {assign.book?.title || "Libro no encontrado"}</p>
                        </div>
                      </div>

                      {/* Fecha de entrega */}
                      <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg shrink-0 w-full md:w-auto mt-2 md:mt-0">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Entrega: <span className="font-bold text-foreground">{assign.dueDate ? new Date(assign.dueDate).toLocaleDateString() : 'Sin fecha límite'}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
