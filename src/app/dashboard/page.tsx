
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, Clock, Brain, ArrowRight, Play, BookMarked, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { useGamification } from "@/context/GamificationContext";
import { useLearning } from "@/context/LearningContext";
import { MyAssignments } from "@/components/dashboard/student/MyAssignments";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  coverImage?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Estudiante";
  const { progress } = useGamification();
  const { userBooks, vocabulary } = useLearning();
  const [recommendations, setRecommendations] = useState<Book[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch('/api/recommendations');
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data);
        }
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      }
    };
    fetchRecommendations();
  }, []);

  // 1. Calculate Stats
  const booksReadCount = userBooks.filter(b => b.progress >= 100).length;
  const vocabularyCount = vocabulary.length;
  
  // 2. Get Continue Reading (In Progress)
  const continueReadingBooks = userBooks
    .filter(b => b.progress > 0 && b.progress < 100)
    .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
    .slice(0, 2);

  // 3. Get Top Recommendation (if any)
  const topRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">¡Hola, {userName}! 👋</h1>
          <p className="text-gray-500 mt-1">Continuemos con tu viaje de lectura inteligente.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div className="text-sm">
              <p className="font-semibold">Nivel {progress.level}</p>
              <p className="text-xs text-gray-500">{progress.xp} XP</p>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <div className="text-sm">
              <p className="font-semibold">Racha: {progress.streakDays} días</p>
              <p className="text-xs text-gray-500">Mantén el fuego 🔥</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Continue Reading & Assignments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Assignments Section (Real Data) */}
          <MyAssignments />

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" /> Continuar Leyendo
            </h2>
            <Link href="/dashboard/my-readings">
                <Button variant="ghost" size="sm" className="text-indigo-600">Ver todos</Button>
            </Link>
          </div>
          
          {continueReadingBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {continueReadingBooks.map((item) => {
                    // Handle nested book object from API
                    const book = item.book || item; 
                    const bookTitle = book.title || "Sin título";
                    const bookAuthor = book.author || "Autor desconocido";
                    const bookImage = book.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(bookTitle)}`;
                    const bookCategory = book.category || "General";

                    return (
                        <Card key={item.id || book.id} className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <CardContent className="p-0 relative aspect-[3/4]">
                            <img 
                            src={bookImage} 
                            alt={bookTitle} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <Badge className="mb-2 bg-indigo-600 border-none">{bookCategory}</Badge>
                            <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-1">{bookTitle}</h3>
                            <p className="text-sm text-gray-300 mb-4">{bookAuthor}</p>
                            <div className="flex items-center gap-3">
                                <Link href={`/dashboard/reader/${book.id}?title=${encodeURIComponent(bookTitle)}`} className="w-full">
                                    <Button size="sm" className="bg-white text-indigo-900 hover:bg-gray-100 font-bold w-full">
                                    <Play className="h-4 w-4 mr-2 fill-indigo-900" /> Leer ahora
                                    </Button>
                                </Link>
                                <div className="flex-1">
                                <div className="flex justify-between text-[10px] mb-1">
                                    <span>Progreso</span>
                                    <span>{item.progress}%</span>
                                </div>
                                <Progress value={item.progress} className="h-1 bg-white/20" />
                                </div>
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                    );
                })}
            </div>
          ) : (
            <Card className="p-8 border-dashed border-2 border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="font-semibold text-gray-900">No tienes lecturas en curso</h3>
                <p className="text-sm text-gray-500 mb-4">Explora la biblioteca para empezar tu primer libro.</p>
                <Link href="/dashboard/library">
                    <Button variant="outline">Explorar Biblioteca</Button>
                </Link>
            </Card>
          )}

          {/* AI Recommendation Banner */}
          {topRecommendation ? (
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <Brain className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900">Tutor IA: Recomendación</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">
                        Te sugerimos leer: <span className="font-semibold text-indigo-600">"{topRecommendation.title}"</span>
                    </p>
                </div>
                </div>
                <Link href={`/dashboard/reader/${topRecommendation.id}?title=${encodeURIComponent(topRecommendation.title)}`}>
                    <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                    Leer ahora
                    </Button>
                </Link>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Brain className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-700">Tutor IA: Sin sugerencias</h3>
                    <p className="text-sm text-gray-500">
                        ¡Has leído todo lo recomendado! Explora la biblioteca para más.
                    </p>
                </div>
                </div>
                <Link href="/dashboard/library">
                    <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                    Ir a Biblioteca
                    </Button>
                </Link>
            </div>
          )}

        </div>

        {/* Right Column - Stats & Activity */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Mi Progreso</h2>
          
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-indigo-900 text-white pb-6">
              <CardTitle className="text-lg">Estadísticas Reales</CardTitle>
              <CardDescription className="text-indigo-200">Tu trayectoria en Leyopolis</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                 {/* Placeholder for Comprehension Stats - Needs Quiz Data to be real */}
                 {/* For now, we show general progress */}
                 <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">Nivel Actual</p>
                    <div className="text-4xl font-black text-indigo-900">{progress.level}</div>
                    <Progress value={(progress.xp % 1000) / 10} className="h-2 mt-2" />
                    <p className="text-xs text-gray-400 mt-1">{progress.xp} XP totales</p>
                 </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-600">{booksReadCount}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Libros leídos</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-600">{vocabularyCount}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Palabras</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-indigo-600" /> Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Generate Activity Feed from Real Data */}
              {userBooks.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Leíste "{item.book?.title || 'un libro'}"</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.lastRead).toLocaleDateString()} - {item.progress}% completado
                      </p>
                    </div>
                  </div>
              ))}
              {userBooks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente.</p>
              )}
              
              <Link href="/dashboard/my-readings">
                <Button variant="ghost" className="w-full text-sm text-gray-500 hover:text-indigo-600">
                    Ver historial completo
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group cursor-pointer">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <MessageSquare className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-bold mb-2">Clubes de Lectura</h3>
              <p className="text-indigo-100 text-sm mb-4">Únete a la discusión con otros estudiantes.</p>
              <Link href="/dashboard/community">
                <Button className="w-full bg-white text-indigo-600 hover:bg-gray-100 font-bold border-none">
                    Explorar Clubes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
