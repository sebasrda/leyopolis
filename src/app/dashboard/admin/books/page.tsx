
"use client";

import { useState, useEffect } from "react";
import { 
  Library, 
  Trash2, 
  Plus, 
  Search, 
  UploadCloud, 
  Image as ImageIcon,
  FileText
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";

export default function AdminBooksPage() {
  const { data: session } = useSession();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Upload State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCategory, setBookCategory] = useState("Literatura");
  const [bookDifficulty, setBookDifficulty] = useState("Intermedio");
  const [bookAgeRange, setBookAgeRange] = useState("9-12");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedPdf) return;

    setUploadProgress(10);
    const formData = new FormData();
    formData.append("file", selectedPdf);
    if (selectedCover) {
      formData.append("cover", selectedCover);
    }
    formData.append("title", bookTitle || selectedPdf.name.replace(".pdf", ""));
    formData.append("author", bookAuthor || "Autor Desconocido");

    try {
      // We'll try to use formData for everyone, let the server handle Vercel Blob if needed
      // but if the client has Vercel Blob configured, it's faster to do it here.
      // For simplicity and consistency, focusing on the API route first.
      
      formData.append("category", bookCategory);
      formData.append("difficulty", bookDifficulty);
      formData.append("ageRange", bookAgeRange);

      const res = await fetch("/api/upload", { 
        method: "POST", 
        body: formData 
      });

      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploadOpen(false);
          setUploadProgress(0);
          setSelectedPdf(null);
          setSelectedCover(null);
          setBookTitle("");
          setBookAuthor("");
          setBookCategory("Literatura");
          setBookDifficulty("Intermedio");
          setBookAgeRange("9-12");
          fetchBooks(); // Refresh list
        }, 500);
      } else {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const err = await res.json().catch(() => null);
          alert(err?.message || err?.error || err?.details || "Error al subir el libro");
        } else {
          const text = await res.text().catch(() => "");
          alert(text ? text.slice(0, 500) : "Error al subir el libro");
        }
        setUploadProgress(0);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(msg || "Error al subir el libro");
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este libro? Esta acción no se puede deshacer.")) return;

    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setBooks(books.filter(b => b.id !== id));
        // alert("Libro eliminado exitosamente"); // Optional: use toast
      } else {
        const errorData = await res.json();
        alert(`Error al eliminar: ${errorData.message || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("Error de conexión al eliminar el libro.");
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Libros</h1>
          <p className="text-gray-500">Sube, edita y administra la biblioteca digital.</p>
        </div>
        
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <Plus className="h-4 w-4" /> Nuevo Libro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Libro</DialogTitle>
              <DialogDescription>
                Sube el archivo PDF y la portada del libro.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Título del Libro</Label>
                <Input 
                  placeholder="Ej. Don Quijote" 
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Autor</Label>
                <Input 
                  placeholder="Ej. Miguel de Cervantes" 
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <select 
                    className="w-full p-2 border rounded-md text-sm"
                    value={bookCategory}
                    onChange={(e) => setBookCategory(e.target.value)}
                  >
                    <option value="Infantil">Infantil</option>
                    <option value="Literatura">Literatura</option>
                    <option value="Académico">Académico</option>
                    <option value="Ciencia">Ciencia</option>
                    <option value="Historia">Historia</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Dificultad</Label>
                  <select 
                    className="w-full p-2 border rounded-md text-sm"
                    value={bookDifficulty}
                    onChange={(e) => setBookDifficulty(e.target.value)}
                  >
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Edad Recom.</Label>
                  <select 
                    className="w-full p-2 border rounded-md text-sm"
                    value={bookAgeRange}
                    onChange={(e) => setBookAgeRange(e.target.value)}
                  >
                    <option value="3-5">3-5 años</option>
                    <option value="6-8">6-8 años</option>
                    <option value="9-12">9-12 años</option>
                    <option value="13-15">13-15 años</option>
                    <option value="16+">16+ años</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Archivo PDF</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                    <Input 
                      type="file" 
                      accept=".pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setSelectedPdf(e.target.files?.[0] || null)}
                    />
                    <FileText className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-xs text-center text-gray-500">
                      {selectedPdf ? selectedPdf.name : "Seleccionar PDF"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Portada (Imagen)</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setSelectedCover(e.target.files?.[0] || null)}
                    />
                    {selectedCover ? (
                      <img 
                        src={URL.createObjectURL(selectedCover)} 
                        alt="Preview" 
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                    )}
                    <span className="text-xs text-center text-gray-500">
                      {selectedCover ? "Cambiar" : "Seleccionar"}
                    </span>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleUpload} disabled={!selectedPdf || (uploadProgress > 0 && uploadProgress < 100)} className="w-full mt-2">
                {uploadProgress > 0 ? `Subiendo ${uploadProgress}%...` : "Subir Libro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Buscar libros..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Portada</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Cargando libros...</TableCell>
              </TableRow>
            ) : filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">No se encontraron libros</TableCell>
              </TableRow>
            ) : (
              filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <img 
                      src={book.image || book.coverImage} 
                      alt={book.title} 
                      className="h-12 w-8 object-cover rounded shadow-sm"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      {book.ageRange || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{book.category}</Badge></TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(book.id)}
                    >
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
