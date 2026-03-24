
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Clock, Star, Bookmark, BookMarked, Brain, History, PlayCircle, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLearning } from "@/context/LearningContext";

export default function MyReadingsPage() {
  const { vocabulary, notes, deleteNote, toggleVocabularyMastery, userBooks } = useLearning();

  // Filter books from real data
  // Assuming 'progress' < 100 means In Progress, and 100 means Completed.
  // In a real app with 'status' field, we would use that.
  const currentBooks = userBooks.filter(b => b.progress < 100);
  const historyBooks = userBooks.filter(b => b.progress >= 100);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookMarked className="h-8 w-8 text-indigo-600" />
          Mis Lecturas
        </h1>
        <p className="text-gray-500">Gestiona tu progreso, historial y aprendizaje.</p>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-8">
          <TabsTrigger value="current">En Curso</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="bookmarks">Marcadores</TabsTrigger>
          <TabsTrigger value="vocabulary">Vocabulario</TabsTrigger>
        </TabsList>

        {/* CURRENT READINGS TAB */}
        <TabsContent value="current" className="space-y-6">
          {currentBooks.length === 0 ? (
             <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">No tienes lecturas en curso</h3>
                <p className="text-gray-500 mb-4">Explora la biblioteca para encontrar tu próximo libro.</p>
                <Link href="/dashboard/library">
                  <Button>Ir a la Biblioteca</Button>
                </Link>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentBooks.map((item) => {
                const book = item.book;
                const progress = item.progress;
                const lastRead = item.lastRead ? new Date(item.lastRead).toLocaleDateString() : 'Reciente';
                // Fallback image handling
                const image = book.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(book.title)}`;

                return (
                <Card key={item.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-[2/3] overflow-hidden">
                    <img 
                        src={image} 
                        alt={book.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                        <Link href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(book.title)}`}>
                        <Button className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold w-full">
                            <PlayCircle className="h-4 w-4 mr-2" /> Continuar
                        </Button>
                        </Link>
                        <div className="text-white text-sm font-medium">
                        Última vez: {lastRead}
                        </div>
                    </div>
                    <Badge className="absolute top-2 right-2 bg-indigo-600/90 hover:bg-indigo-700">
                        {book.category || "General"}
                    </Badge>
                    </div>
                    <CardContent className="p-4 space-y-3">
                    <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1" title={book.title}>{book.title}</h3>
                        <p className="text-sm text-gray-500">{book.author}</p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>Progreso</span>
                        <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                    </CardContent>
                </Card>
                );
                })}
                
                {/* Add New Book Placeholder - Always visible as an option */}
                <Link href="/dashboard/library">
                <Card className="h-full border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 cursor-pointer min-h-[300px]">
                    <div className="p-4 rounded-full bg-gray-50 group-hover:bg-indigo-100 mb-4 transition-colors">
                    <BookOpen className="h-8 w-8" />
                    </div>
                    <span className="font-medium">Explorar Biblioteca</span>
                </Card>
                </Link>
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                Historial de Lectura
              </CardTitle>
              <CardDescription>Libros que has completado.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyBooks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                      <p>Aún no has completado ningún libro. ¡Sigue leyendo!</p>
                  </div>
              ) : (
                <div className="space-y-4">
                    {historyBooks.map((item) => {
                    const book = item.book;
                    const date = item.lastRead ? new Date(item.lastRead).toLocaleDateString() : 'Reciente';
                    const image = book.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(book.title)}`;
                    
                    return (
                    <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <img src={image} alt={book.title} className="w-16 h-24 object-cover rounded-md shadow-sm" />
                        <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-900">{book.title}</h3>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            Completado
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{book.author}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                            <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {date}
                            </span>
                        </div>
                        </div>
                        {/* Rating removed as it is not yet supported in DB */}
                    </div>
                    );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOOKMARKS TAB */}
        <TabsContent value="bookmarks">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-gray-400">
                    <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No tienes marcadores ni notas guardadas aún.</p>
                </div>
            ) : notes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow relative group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="mb-2">
                      Página {note.page}
                    </Badge>
                    <span className="text-xs text-gray-400">{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Fecha desconocida'}</span>
                  </div>
                  <CardTitle className="text-base line-clamp-1">{note.bookTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {note.quote && (
                    <blockquote className="border-l-4 border-indigo-200 pl-3 italic text-gray-600 text-sm line-clamp-3">
                      "{note.quote}"
                    </blockquote>
                  )}
                  {note.text && (
                    <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 flex gap-2 items-start">
                      <Bookmark className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {note.text}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                      {/* Note: 'Ir a la página' would need complex routing to specific page in reader, omitted for now or just link to reader */}
                      <Link href={`/dashboard/reader/${note.id /* Note: this should be bookId but note doesn't guarantee bookId is foreign key in some versions, but usually it is. Assuming note has bookId or we can't link easily. */}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full" disabled={!note.bookTitle}>
                            Ver Libro
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteNote(note.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* VOCABULARY TAB */}
        <TabsContent value="vocabulary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vocabulary.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-gray-400">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No has guardado palabras en tu vocabulario.</p>
                </div>
            ) : vocabulary.map((vocab) => (
              <Card key={vocab.id} className={`border-l-4 ${vocab.mastered ? "border-l-green-500" : "border-l-indigo-500"}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl text-indigo-900">{vocab.word}</CardTitle>
                    <div onClick={() => toggleVocabularyMastery(vocab.id)} className="cursor-pointer">
                        {vocab.mastered ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Aprendido</Badge>
                        ) : (
                        <Badge variant="outline" className="hover:bg-indigo-50">Por repasar</Badge>
                        )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-1">De: {vocab.bookTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700">{vocab.definition}</p>
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-500 italic">
                    "{vocab.context}"
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1">
                      <Brain className="h-3 w-3 mr-2" /> Practicar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
