
"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Clock, SlidersHorizontal, Sparkles, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
import { UploadBookDialog } from "@/components/dashboard/library/UploadBookDialog";
import { useSession } from "next-auth/react";
import { BookCover } from "@/components/ui/book-cover";

import { DISPLAY_GRADES, GRADE_TO_STANDARD, normalizeGrade } from "@/lib/grades";

const categories = ["Todos", "Infantil", "Académico", "Literatura", "Ciencia", "Historia", "General"];
const difficulties = ["Todos", "Principiante", "Intermedio", "Avanzado"];
const subjects = ["Todos", "Español", "Ciencias", "Matemáticas", "Historia", "Inglés", "Arte"];

export default function LibraryPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdminOrTeacher = role === "ADMIN" || role === "TEACHER";
  
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Todos");
  const [selectedGrade, setSelectedGrade] = useState("Todos");
  const [selectedSubject, setSelectedSubject] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedGrade !== "Todos") {
        const standardGrade = GRADE_TO_STANDARD[selectedGrade] || selectedGrade;
        params.set("grade", standardGrade);
      }
      if (selectedSubject !== "Todos") params.set("subject", selectedSubject);
      
      const res = await fetch(`/api/books?${params.toString()}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        let formattedBooks = data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          category: b.category,
          language: b.language,
          difficulty: b.difficulty || "Intermedio",
          grade: b.grade,
          subject: b.subject,
          hasQuiz: b.hasQuiz || !!b.quizId,
          quizId: b.quizId,
          isAssigned: !!b.isAssigned,
          image: b.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(b.title)}`,
          readTime: b.readTime || "—",
          fileUrl: b.contentUrl,
          description: b.description || "Este libro aún no tiene una sinopsis disponible.",
        }));
        
        if ((session?.user as any)?.licenseType === "DEMO") {
          const grouped: Record<string, any[]> = {};
          for (const b of formattedBooks) {
            const g = b.grade || "General";
            if (!grouped[g]) grouped[g] = [];
            if (grouped[g].length < 2) grouped[g].push(b);
          }
          formattedBooks = Object.values(grouped).flat();
        }

        setBooks(formattedBooks);
      } else {
        setError("Error al cargar libros");
      }
    } catch (err) {
      console.error("Error fetching books:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [selectedGrade, selectedSubject]);

  const filteredBooks = books.filter(book => {
    const matchesCategory = selectedCategory === "Todos" || book.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "Todos" || book.difficulty === selectedDifficulty;
    const matchesSearch = !searchQuery || 
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      book.author?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const hasActiveFilters = selectedCategory !== "Todos" || selectedDifficulty !== "Todos" || selectedGrade !== "Todos" || selectedSubject !== "Todos";

  const assignedBooksList = filteredBooks.filter(b => b.isAssigned);
  const otherBooksList = filteredBooks.filter(b => !b.isAssigned);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Biblioteca Digital</h1>
          <p className="text-muted-foreground">Explora los libros disponibles para tu aprendizaje.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar por título o autor..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isAdminOrTeacher && <UploadBookDialog onSuccess={fetchBooks} />}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground mr-2">
          <SlidersHorizontal size={18} />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Dificultad" /></SelectTrigger>
          <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Grado" /></SelectTrigger>
          <SelectContent>{DISPLAY_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Materia" /></SelectTrigger>
          <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-9"
            onClick={() => {
              setSelectedCategory("Todos");
              setSelectedDifficulty("Todos");
              setSelectedGrade("Todos");
              setSelectedSubject("Todos");
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <span className="ml-3 text-muted-foreground">Cargando biblioteca...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-200">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchBooks} className="mt-4" variant="outline">Reintentar</Button>
        </div>
      )}

      {/* Books Grid */}
      {!loading && !error && filteredBooks.length === 0 && (
        <div className="text-center py-20 bg-muted rounded-2xl border-2 border-dashed border-border">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-bold text-foreground mb-2">No se encontraron libros</h3>
          <p className="text-muted-foreground max-w-md mx-auto">Intenta ajustar tus filtros de búsqueda.</p>
          <Button variant="link" onClick={() => { setSelectedCategory("Todos"); setSelectedDifficulty("Todos"); setSearchQuery(""); }} className="mt-4 text-indigo-400">
            Ver todos los libros
          </Button>
        </div>
      )}

      {/* Assigned Books Grid */}
      {!loading && !error && assignedBooksList.length > 0 && (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-indigo-50 to-white p-4 rounded-xl border border-indigo-500/50/20">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><BookOpen className="h-6 w-6" /></div>
            <div>
              <h2 className="text-2xl font-bold text-indigo-100">Tus Unidades Asignadas</h2>
              <p className="text-sm text-indigo-400/80">Lecturas recomendadas para tus clases matriculadas</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assignedBooksList.map((book) => (
              <Card key={book.id} className="group overflow-hidden border border-indigo-500/50/20 shadow-lg shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-300 flex flex-col h-full bg-indigo-500/10/20 ring-1 ring-indigo-50">
                  <BookCover src={book.image} alt={book.title}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <Badge className="bg-indigo-600 text-white shadow-sm backdrop-blur-sm border-none">Unidad Oficial</Badge>
                    </div>
                    <div className="absolute inset-0 bg-indigo-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 gap-3">
                      <Link href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(book.title)}`} className="w-full">
                        <Button className="w-full bg-card text-indigo-200 hover:bg-indigo-500/10 font-bold">Leer Ahora</Button>
                      </Link>
                      {book.hasQuiz && book.quizId && (
                        <Link href={`/dashboard/quiz/${book.quizId}`} className="w-full">
                          <Button variant="outline" className="w-full border-white text-white hover:bg-card/10">
                            <Sparkles className="h-4 w-4 mr-2" /> Hacer Quiz
                          </Button>
                        </Link>
                      )}
                    </div>
                  </BookCover>

                
                <CardContent className="p-4 flex-1 flex flex-col gap-2">
                  <div>
                    <h3 className="font-bold text-foreground line-clamp-1 text-lg" title={book.title}>{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-gray-400 flex-wrap">
                    <span className="bg-indigo-500/20 px-2 py-1 rounded-md text-indigo-300 font-medium">{book.difficulty}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 font-bold ml-1 border border-indigo-500/50/30"
                        >
                          Ver Sinopsis
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            Sinopsis: {book.title}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-sm leading-relaxed text-muted-foreground italic border-l-4 border-indigo-500/50 pl-4 bg-indigo-500/10 rounded-r-lg">
                          "{book.description}"
                        </div>
                      </DialogContent>
                    </Dialog>
                    <span className="flex items-center gap-1 ml-auto"><Clock size={12} /> {book.readTime}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Books Grid */}
      {!loading && !error && otherBooksList.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {assignedBooksList.length > 0 && (
             <h2 className="text-xl font-bold text-foreground mb-6 border-t pt-8">Catálogo General</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {otherBooksList.map((book) => (
              <Card key={book.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                  <BookCover src={book.image} alt={book.title}>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <Badge className="bg-card/90 text-indigo-200 hover:bg-card shadow-sm backdrop-blur-sm">{book.category}</Badge>
                      {book.hasQuiz && (
                        <Badge className="bg-green-500/90 text-white hover:bg-green-600 shadow-sm backdrop-blur-sm flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Quiz
                        </Badge>
                      )}
                    </div>
                    {book.grade && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-indigo-600/80 text-white text-xs backdrop-blur-sm">{book.grade}</Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-indigo-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 gap-3">
                      <Link href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(book.title)}`} className="w-full">
                        <Button className="w-full bg-card text-indigo-200 hover:bg-indigo-500/10 font-bold">Leer Ahora</Button>
                      </Link>
                      {book.hasQuiz && book.quizId && (
                        <Link href={`/dashboard/quiz/${book.quizId}`} className="w-full">
                          <Button variant="outline" className="w-full border-white text-white hover:bg-card/10">
                            <Sparkles className="h-4 w-4 mr-2" /> Hacer Quiz
                          </Button>
                        </Link>
                      )}
                    </div>
                  </BookCover>

                
                <CardContent className="p-4 flex-1 flex flex-col gap-2">
                  <div>
                    <h3 className="font-bold text-foreground line-clamp-1 text-lg" title={book.title}>{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-gray-400 flex-wrap">
                    <span className="bg-muted px-2 py-1 rounded-md text-muted-foreground font-medium">{book.difficulty}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-bold ml-1 border border-indigo-500/50/20"
                        >
                          Sinopsis
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-indigo-200">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            Sinopsis: {book.title}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-sm leading-relaxed text-muted-foreground italic border-l-4 border-indigo-500/50 pl-4 bg-indigo-500/10 rounded-r-lg">
                          "{book.description}"
                        </div>
                      </DialogContent>
                    </Dialog>
                    {book.subject && <span className="bg-blue-50 px-2 py-1 rounded-md text-blue-600 font-medium">{book.subject}</span>}
                    <span className="flex items-center gap-1 ml-auto"><Clock size={12} /> {book.readTime}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
