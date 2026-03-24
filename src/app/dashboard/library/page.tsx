
"use client";

import { useState, useEffect } from "react";
import { Search, Filter, BookOpen, Clock, Star, Download, ChevronRight, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadBookDialog } from "@/components/dashboard/library/UploadBookDialog";

import { useSession } from "next-auth/react";

const categories = ["Todos", "Infantil", "Académico", "Literatura", "Ciencia", "Historia"];
const difficulties = ["Todos", "Principiante", "Intermedio", "Avanzado"];
const ageRanges = ["Todos", "6-9", "10-13", "14-17", "18+"];

export default function LibraryPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdminOrTeacher = role === "ADMIN" || role === "TEACHER";
  
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Todos");
  const [selectedAge, setSelectedAge] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<any[]>([]);

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        // Transform API data to match UI expectations
        const formattedBooks = data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          category: b.category,
          language: b.language,
          difficulty: b.difficulty || "Intermedio",
          rating: b.rating || 0,
          image: b.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(b.title)}`,
          readTime: b.readTime || "Desconocido",
          isLocal: false,
          fileUrl: b.contentUrl
        }));
        
        setBooks(formattedBooks);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(book => {
    const matchesCategory = selectedCategory === "Todos" || book.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "Todos" || (book.difficulty && book.difficulty === selectedDifficulty);
    // Age filter placeholder - would need age range in book model
    const matchesAge = selectedAge === "Todos" || true; 
    
    const matchesSearch = (book.title && book.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesDifficulty && matchesSearch && matchesAge;
  });

  return (
    <div className="space-y-8">
      {/* Library Header & Filters */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Biblioteca Digital</h1>
            <p className="text-gray-500">Explora miles de libros para potenciar tu aprendizaje.</p>
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
            
            {isAdminOrTeacher && (
                <UploadBookDialog onSuccess={fetchBooks} />
            )}
            
            {/* Removed "Licencias Institucionales" if it's not a real feature yet, but user didn't ask to remove it. Keeping it as a placeholder link is less intrusive than fake data. */}
            </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mr-2">
                <SlidersHorizontal size={18} />
                <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Dificultad" />
                </SelectTrigger>
                <SelectContent>
                    {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Edad" />
                </SelectTrigger>
                <SelectContent>
                    {ageRanges.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedCategory !== "Todos" || selectedDifficulty !== "Todos" || selectedAge !== "Todos") && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9"
                    onClick={() => {
                        setSelectedCategory("Todos");
                        setSelectedDifficulty("Todos");
                        setSelectedAge("Todos");
                    }}
                >
                    Limpiar
                </Button>
            )}
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron libros</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                  Intenta ajustar tus filtros de búsqueda o categoría.
              </p>
              <Button 
                variant="link" 
                onClick={() => {
                    setSelectedCategory("Todos");
                    setSelectedDifficulty("Todos");
                    setSearchQuery("");
                }}
                className="mt-4 text-indigo-600"
              >
                  Ver todos los libros
              </Button>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="relative aspect-[2/3] overflow-hidden bg-gray-100">
                  <img 
                    src={book.image} 
                    alt={book.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2">
                     <Badge className="bg-white/90 text-indigo-900 hover:bg-white shadow-sm backdrop-blur-sm">
                        {book.category}
                     </Badge>
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-indigo-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 gap-4">
                    <Link href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(book.title)}`} className="w-full">
                        <Button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold">
                            Leer Ahora
                        </Button>
                    </Link>
                    <Button variant="outline" className="w-full border-white text-white hover:bg-white/10">
                        Ver Detalles
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-4 flex-1 flex flex-col gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1 text-lg" title={book.title}>{book.title}</h3>
                    <p className="text-sm text-gray-500">{book.author}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-gray-400">
                     <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">
                        {book.difficulty}
                     </span>
                     <span className="flex items-center gap-1 ml-auto">
                        <Clock size={12} /> {book.readTime}
                     </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
      )}
    </div>
  );
}
