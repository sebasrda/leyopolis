
"use client";

import { useState, useEffect } from "react";
import { 
  Library, Trash2, Plus, Search, FileText, Loader2, AlertCircle, CheckCircle2, Sparkles
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
import { Image as ImageIcon } from "lucide-react";

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
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(10);
    setError(null);
    const formData = new FormData();
    formData.append("file", selectedPdf);
    if (selectedCover) formData.append("cover", selectedCover);
    formData.append("title", bookTitle || selectedPdf.name.replace(".pdf", ""));
    formData.append("author", bookAuthor || "Autor Desconocido");
    formData.append("category", bookCategory);
    formData.append("difficulty", bookDifficulty);
    formData.append("ageRange", bookAgeRange);
    if (bookGrade) formData.append("grade", bookGrade);
    if (bookSubject) formData.append("subject", bookSubject);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploadOpen(false);
          setUploadProgress(0);
          resetForm();
          fetchBooks();
          setSuccess("Libro subido exitosamente");
        }, 500);
      } else {
        const ct = res.headers.get("content-type") || "";
        const err = ct.includes("json") ? await res.json().catch(() => null) : null;
        setError(err?.message || "Error al subir el libro");
        setUploadProgress(0);
      }
    } catch (err) {
      setError("Error de conexión");
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedPdf(null);
    setSelectedCover(null);
    setBookTitle("");
    setBookAuthor("");
    setBookCategory("Literatura");
    setBookDifficulty("Intermedio");
    setBookAgeRange("9-12");
    setBookGrade("");
    setBookSubject("");
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

  const filteredBooks = books.filter(book => 
    book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Libros</h1>
          <p className="text-gray-500">Sube, edita y administra la biblioteca digital.</p>
        </div>
        
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2"><Plus className="h-4 w-4" /> Nuevo Libro</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Libro</DialogTitle>
              <DialogDescription>Sube el archivo PDF con la información del libro.</DialogDescription>
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
                    <option value="Ciencia">Ciencia</option>
                    <option value="Historia">Historia</option>
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
                <div className="space-y-1">
                  <Label>Archivo PDF *</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 relative">
                    <Input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSelectedPdf(e.target.files?.[0] || null)} />
                    <FileText className="h-6 w-6 text-gray-400 mb-1" />
                    <span className="text-xs text-center text-gray-500">{selectedPdf ? selectedPdf.name : "Seleccionar PDF"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Portada</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 relative">
                    <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSelectedCover(e.target.files?.[0] || null)} />
                    <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                    <span className="text-xs text-center text-gray-500">{selectedCover ? "Cambiar" : "Seleccionar"}</span>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleUpload} disabled={!selectedPdf || (uploadProgress > 0 && uploadProgress < 100)} className="w-full mt-1">
                {uploadProgress > 0 ? `Subiendo ${uploadProgress}%...` : "Subir Libro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar libros..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Portada</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Quiz</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Cargando libros...
                </TableCell>
              </TableRow>
            ) : filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">No se encontraron libros</TableCell>
              </TableRow>
            ) : (
              filteredBooks.map(book => (
                <TableRow key={book.id}>
                  <TableCell>
                    <img src={book.coverImage || `https://placehold.co/80x120?text=PDF`} alt={book.title} className="h-12 w-8 object-cover rounded shadow-sm" />
                  </TableCell>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell className="text-gray-500">{book.author}</TableCell>
                  <TableCell>
                    {book.grade ? <Badge variant="secondary" className="text-xs">{book.grade}</Badge> : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    {book.subject ? <Badge variant="outline" className="text-xs">{book.subject}</Badge> : <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    {book.quizId ? (
                      <Badge className="bg-green-100 text-green-700"><Sparkles className="h-3 w-3 mr-1" /> Sí</Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline">{book.category}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(book.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
