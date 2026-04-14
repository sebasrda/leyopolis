"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Library, Trash2, Plus, Search, FileText, Loader2, AlertCircle, CheckCircle2, Sparkles, Image as ImageIcon, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AdminBooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCategory, setBookCategory] = useState("Literatura");
  const [bookDifficulty, setBookDifficulty] = useState("Intermedio");
  const [bookAgeRange, setBookAgeRange] = useState("9-12");
  const [bookGrade, setBookGrade] = useState("");
  const [bookSubject, setBookSubject] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingQuizFor, setUploadingQuizFor] = useState<string | null>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchBooks(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) setBooks(await res.json());
    } catch (err) {
      console.error("Error fetching books:", err);
      setError("Error al cargar libros");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedPdf) return;
    
    setError(null);
    setUploadProgress(10);

    try {
      const { upload } = await import("@vercel/blob/client");
      
      // Stage 1: Upload PDF directly to Blob
      setUploadProgress(20);
      const pdfBlob = await upload(selectedPdf.name, selectedPdf, {
        access: 'public',
        handleUploadUrl: '/api/upload/blob-token',
      });
      console.log("PDF uploaded to:", pdfBlob.url);

      // Stage 2: Upload Cover if exists
      let coverUrl = "";
      if (selectedCover) {
        setUploadProgress(40);
        const coverBlob = await upload(selectedCover.name, selectedCover, {
          access: 'public',
          handleUploadUrl: '/api/upload/blob-token',
        });
        coverUrl = coverBlob.url;
      }

      // Stage 3: Upload Quiz File if exists
      let quizUrl = "";
      if (quizFile) {
        setUploadProgress(50);
        const quizBlob = await upload(quizFile.name, quizFile, {
          access: 'public',
          handleUploadUrl: '/api/upload/blob-token',
        });
        quizUrl = quizBlob.url;
      }

      // Stage 4: Send meta-data to our API
      setUploadProgress(70);
      const res = await fetch("/api/upload", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle || selectedPdf.name.replace(".pdf", ""),
          author: bookAuthor || "Autor Desconocido",
          category: bookCategory,
          difficulty: bookDifficulty,
          ageRange: bookAgeRange,
          grade: bookGrade,
          subject: bookSubject,
          contentUrl: pdfBlob.url,
          coverImage: coverUrl,
          quizFileUrl: quizUrl,
          description: bookDescription || "",
        }) 
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        setError(`Error del servidor (${res.status}): ${text.slice(0, 100)}...`);
        setUploadProgress(0);
        return;
      }

      if (res.ok) {
        const bookData = data;
        setUploadProgress(80);
        setSuccess("Libro registrado. Generando actividades (Paso 1/3)...");

        try {
          // Trigger the unified, hybrid AI generation (replacing the old 3-step sequence)
          const genRes = await fetch("/api/books/regenerate-ia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId: bookData.book.id })
          });
          
          const genData = await genRes.json();

          if (!genRes.ok) {
            throw new Error(genData.message || "Error en la generación automática de IA");
          }

          setUploadProgress(100);
          setTimeout(() => {
            setUploadOpen(false);
            setUploadProgress(0);
            resetForm();
            fetchBooks();
            setSuccess(`¡Éxito! Libro subido y ${genData.activityCount} actividades generadas.`);
          }, 500);
        } catch (genErr: any) {
          console.error("AI Generation error after upload:", genErr);
          setUploadOpen(false);
          setUploadProgress(0);
          resetForm();
          fetchBooks();
          setError(`El libro se subió, pero hubo un error de IA: ${genErr.message || "Prueba Regenerar manualmente"}`);
        }
      } else {
        setError(data.message || data.error || "Error al registrar el libro en la base de datos [V3]");
        setUploadProgress(0);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(`Error durante la subida: ${err.message || "Verifique su conexión"}`);
      setUploadProgress(0);
    }
  };

  const Kinder = {
    grade: "K",
    subject: "Transición"
  };
  const Primary = {
    grade: "P",
    subject: "Primaria"
  };
  const Secondary = {
    grade: "S",
    subject: "Secundaria"
  };

  const toggleMultipleAttempts = async (bookId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowMultipleAttempts: !currentState })
      });
      if (res.ok) {
        setBooks(books.map(b => b.id === bookId ? { ...b, allowMultipleAttempts: !currentState } : b));
        setSuccess("Preferencia de intentos actualizada");
      }
    } catch (err) {
      setError("Error al actualizar preferencia");
    }
  };

  const resetForm = () => {
    setSelectedPdf(null);
    setSelectedCover(null);
    setBookTitle("");
    setBookAuthor("");
    setBookCategory("Literatura");
    setBookDifficulty("Intermedio");
    setBookGrade("");
    setBookSubject("");
    setBookDescription("");
    setQuizFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este libro permanentemente?")) return;
    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBooks(books.filter(b => b.id !== id));
        setSuccess("Libro eliminado");
      } else {
        setError("Error al eliminar");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  const handleQuizUpload = async (bookId: string, file: File) => {
    setUploadingQuizFor(bookId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("quizFile", file);
      const res = await fetch(`/api/books/${bookId}/quiz/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Quiz actualizado: ${data.questionsCount} preguntas cargadas`);
        fetchBooks();
      } else {
        setError(data.message || "Error al subir quiz");
      }
    } catch {
      setError("Error de conexión al subir quiz");
    } finally {
      setUploadingQuizFor(null);
    }
  };

  const handleRegenerateIA = async (bookId: string) => {
    if (!confirm("¿Deseas re-generar las actividades con IA? Esto reemplazará el quiz y juegos actuales (20 preguntas + 4 juegos premium).")) return;
    
    setLoading(true);
    setError(null);
    setSuccess("Generando actividades pedagógicas con IA... esto puede tardar unos 20-30 segundos.");

    try {
      const res = await fetch("/api/books/regenerate-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const detail = data.error ? `: ${data.error}` : "";
        throw new Error(`${data.message || "Fallo en la regeneración"}${detail}`);
      }

      setSuccess(`¡Éxito! Se han generado ${data.activityCount} preguntas y todos los juegos interactivos.`);
      fetchBooks();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error en la generación con IA");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSynopsisFix = async () => {
    if (!confirm("¿Deseas generar sipnosis para todos los libros que no tienen una? Esto usará IA y puede tomar varios minutos. No se borrarán tus quizzes actuales.")) return;
    
    setLoading(true);
    setSuccess("Iniciando sincronización masiva de sipnosis... Por favor, no cierres esta ventana.");
    setError(null);

    try {
      const res = await fetch("/api/admin/bulk-synopsis-fix", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(`¡Sincronización completada! ${data.successCount} libros actualizados.`);
        fetchBooks();
      } else {
        setError(data.message || "Error en la sincronización masiva");
      }
    } catch (err: any) {
      setError("Error de conexión al sincronizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const [selectedGradeFilter, setSelectedGradeFilter] = useState("Todos");
  const [manualGradeFilter, setManualGradeFilter] = useState("");

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesGrade = true;
    if (selectedGradeFilter !== "Todos") {
      matchesGrade = book.grade === selectedGradeFilter;
    }
    if (manualGradeFilter && matchesGrade) {
      matchesGrade = book.grade?.toLowerCase().includes(manualGradeFilter.toLowerCase());
    }
    
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Biblioteca</h1>
          <p className="text-gray-500">Administra libros, exámenes y juegos interactivos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2"
            onClick={handleBulkSynopsisFix}
            disabled={loading}
          >
            <Sparkles className="h-4 w-4" /> Sincronizar Catálogo
          </Button>

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2"><Plus className="h-4 w-4" /> Nuevo Libro</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Libro</DialogTitle>
              <DialogDescription>Completa los datos. Si no subes un quiz, la IA generará uno automático.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input placeholder="Título del libro" value={bookTitle} onChange={e => setBookTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Autor</Label>
                  <Input placeholder="Autor" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <select className="w-full p-2 border rounded-md text-sm" value={bookCategory} onChange={e => setBookCategory(e.target.value)}>
                    <option value="Infantil">Infantil</option>
                    <option value="Literatura">Literatura</option>
                    <option value="Académico">Académico</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Dificultad</Label>
                  <select className="w-full p-2 border rounded-md text-sm" value={bookDifficulty} onChange={e => setBookDifficulty(e.target.value)}>
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Edad</Label>
                  <select className="w-full p-2 border rounded-md text-sm" value={bookAgeRange} onChange={e => setBookAgeRange(e.target.value)}>
                    <option value="3-5">3-5</option>
                    <option value="6-8">6-8</option>
                    <option value="9-12">9-12</option>
                    <option value="13-15">13-15</option>
                    <option value="16+">16+</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Sipnosis (Opcional - La IA generará una si se deja vacío)</Label>
                <textarea 
                  className="w-full min-h-[60px] p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-indigo-500" 
                  placeholder="Resumen del libro..." 
                  value={bookDescription} 
                  onChange={e => setBookDescription(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Grado</Label>
                  <Input placeholder="Ej. 6to" value={bookGrade} onChange={e => setBookGrade(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Materia</Label>
                  <Input placeholder="Ej. Español" value={bookSubject} onChange={e => setBookSubject(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-center">
                  <Label>Archivo PDF *</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 relative">
                    <Input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSelectedPdf(e.target.files?.[0] || null)} />
                    <FileText className="h-6 w-6 text-gray-400 mx-auto" />
                    <span className="text-xs">{selectedPdf ? selectedPdf.name : "Subir PDF"}</span>
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <Label>Portada</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 relative">
                    <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSelectedCover(e.target.files?.[0] || null)} />
                    <ImageIcon className="h-6 w-6 text-gray-400 mx-auto" />
                    <span className="text-xs">{selectedCover ? "Cambiar" : "Subir Imagen"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <Label>Añadir Quiz Manual (Opcional)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 relative h-14 flex items-center justify-center">
                  <Input type="file" accept=".pdf,.docx,.json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setQuizFile(e.target.files?.[0] || null)} />
                  <span className="text-xs text-gray-500">{quizFile ? quizFile.name : "Subir PDF/Word de examen"}</span>
                </div>
              </div>
              
              <Button onClick={handleUpload} disabled={!selectedPdf || (uploadProgress > 0 && uploadProgress < 100)} className="w-full mt-2 bg-indigo-600">
                {uploadProgress > 0 ? `Procesando... ${uploadProgress}%` : "Subir y Generar Actividades"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Search className="h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por título o autor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
           <Select value={selectedGradeFilter} onValueChange={setSelectedGradeFilter}>
             <SelectTrigger className="w-[140px] h-9">
               <SelectValue placeholder="Filtrar por Grado" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="Todos">Todos los grados</SelectItem>
               <SelectItem value="6to">Grado 6to</SelectItem>
               <SelectItem value="7mo">Grado 7mo</SelectItem>
               <SelectItem value="8vo">Grado 8vo</SelectItem>
               <SelectItem value="9no">Grado 9no</SelectItem>
               <SelectItem value="10mo">Grado 10mo</SelectItem>
               <SelectItem value="11vo">Grado 11vo</SelectItem>
             </SelectContent>
           </Select>
           <div className="relative w-[120px]">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
              <Input 
                placeholder="Manual..." 
                className="pl-7 h-9 text-xs" 
                value={manualGradeFilter} 
                onChange={e => setManualGradeFilter(e.target.value)} 
              />
           </div>
           <Badge variant="outline" className="bg-indigo-50 text-indigo-700">Total: {filteredBooks.length}</Badge>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-lg">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-20">Portada</TableHead>
              <TableHead>Libro</TableHead>
              <TableHead>Grado/Materia</TableHead>
              <TableHead>IA Activa</TableHead>
              <TableHead>Reintentos</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-gray-500">Cargando biblioteca...</p>
                </TableCell>
              </TableRow>
            ) : filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-gray-400">No se encontraron libros en el catálogo.</TableCell>
              </TableRow>
            ) : (
              filteredBooks.map(book => (
                <TableRow key={book.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <img src={book.coverImage || `https://placehold.co/80x120?text=PDF`} alt={book.title} className="h-16 w-12 object-cover rounded-md shadow-md border" />
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-gray-900">{book.title}</div>
                    <div className="text-xs text-gray-500">{book.author} • {book.category}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit text-[10px]">{book.grade || "No asig."}</Badge>
                      <Badge variant="outline" className="w-fit text-[10px]">{book.subject || "General"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={book.quizId ? "bg-green-500/10 text-green-600 border-green-200" : "bg-gray-100 text-gray-400"}>
                      <Sparkles className="h-3 w-3 mr-1" /> {book.quizId ? "Activo" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Switch 
                         checked={book.allowMultipleAttempts} 
                         onCheckedChange={() => toggleMultipleAttempts(book.id, book.allowMultipleAttempts)} 
                       />
                       <span className="text-[10px] uppercase font-bold text-gray-400">{book.allowMultipleAttempts ? "Sí" : "No"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.json,.txt"
                        className="hidden"
                        id={`quiz-upload-${book.id}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleQuizUpload(book.id, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-full"
                        title="Subir quiz (PDF/Word)"
                        disabled={uploadingQuizFor === book.id}
                        onClick={() => document.getElementById(`quiz-upload-${book.id}`)?.click()}
                      >
                        {uploadingQuizFor === book.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-purple-400 hover:text-purple-700 hover:bg-purple-50 rounded-full"
                          title="Re-generar Actividades IA"
                          onClick={() => handleRegenerateIA(book.id)}
                        >
                          <Sparkles className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => handleDelete(book.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
