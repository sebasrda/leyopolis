"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, BookOpen, Clock, Star, Zap, Target, TrendingUp, Calendar, PieChart } from "lucide-react";
import { useGamification } from "@/context/GamificationContext";
import { useLearning } from "@/context/LearningContext";
import { 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

export default function ProgressPage() {
  const { progress } = useGamification();
  const { userBooks, vocabulary } = useLearning();

  const [stats, setStats] = useState({
    totalTime: "0m",
    totalPages: 0,
    averageDailyTime: "0m",
    booksCompleted: 0
  });

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/user/stats");
        const data = await res.json();
        if (!cancelled && data && !data.error) setStats(data);
      } catch {
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // 1. Calculate Real Stats (Fallback if API fails or for immediate feedback)
  const booksRead = stats.booksCompleted || userBooks.filter(b => b.progress >= 100).length;
  const totalBooks = userBooks.length;
  
  // 2. Generate Chart Data from Real Books
  // Group by Category
  const booksByCategory = userBooks.reduce((acc: any, curr) => {
    const cat = curr.book?.category || "Otros";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.keys(booksByCategory).map(key => ({
    name: key,
    value: booksByCategory[key]
  }));

  // Group by Progress Status
  const statusData = [
    { name: "Completados", value: booksRead },
    { name: "En Progreso", value: totalBooks - booksRead }
  ].filter(d => d.value > 0);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-8 w-8 text-indigo-600" />
          Mi Progreso
        </h1>
        <p className="text-gray-500">Analíticas basadas en tu actividad real de lectura.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-6 flex flex-col items-center justify-center space-y-2">
            <BookOpen className="h-8 w-8 opacity-80" />
            <h3 className="text-3xl font-bold">{booksRead}</h3>
            <p className="text-sm font-medium opacity-90">Libros leídos</p>
          </CardContent>
        </Card>
        <Card className="bg-white p-6 shadow-md border-none flex flex-col items-center justify-center space-y-2">
          <Star className="h-8 w-8 text-indigo-500" />
          <h3 className="text-3xl font-bold text-gray-900">{vocabulary.length}</h3>
          <p className="text-sm text-gray-500">Palabras aprendidas</p>
        </Card>
        <Card className="bg-white p-6 shadow-md border-none flex flex-col items-center justify-center space-y-2">
          <Zap className="h-8 w-8 text-yellow-500" />
          <h3 className="text-3xl font-bold text-gray-900">{progress.streakDays} días</h3>
          <p className="text-sm text-gray-500">Racha actual</p>
        </Card>
        <Card className="bg-white p-6 shadow-md border-none flex flex-col items-center justify-center space-y-2">
          <Clock className="h-8 w-8 text-orange-500" />
          <div className="text-center">
             <h3 className="text-2xl font-bold text-gray-900">{stats.totalPages}</h3>
             <p className="text-sm text-gray-500">Páginas leídas</p>
             <p className="text-xs text-indigo-600 font-medium mt-1">Tiempo: {stats.totalTime}</p>
          </div>
        </Card>
      </div>

      {categoryData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Books by Category Chart */}
            <Card className="col-span-1 shadow-md border-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-indigo-600" />
                Libros por Categoría
                </CardTitle>
                <CardDescription>Distribución de tus lecturas.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                        {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>

            {/* Reading Status Chart */}
            <Card className="col-span-1 shadow-md border-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Estado de Lectura
                </CardTitle>
                <CardDescription>Libros completados vs en progreso.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Aún no hay datos suficientes</h3>
            <p className="text-gray-500">Empieza a leer libros para ver tus estadísticas aquí.</p>
        </div>
      )}
    </div>
  );
}
