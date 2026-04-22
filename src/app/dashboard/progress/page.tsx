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
    totalTime: "0h 0m",
    totalPages: 0,
    averageDailyMinutes: 0,
    completedBooks: 0,
    totalBooks: 0,
    totalMinutes: 0
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
  const booksRead = stats.completedBooks || userBooks.filter(b => b.progress >= 100).length;
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
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Target className="h-8 w-8 text-indigo-400" />
          Mi Progreso
        </h1>
        <p className="text-muted-foreground">Analíticas basadas en tu actividad real de lectura.</p>
      </div>



      {categoryData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Books by Category Chart */}
            <Card className="col-span-1 shadow-md border-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-indigo-400" />
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
        <div className="text-center py-12 bg-muted rounded-xl border-2 border-dashed">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Aún no hay datos suficientes</h3>
            <p className="text-muted-foreground">Empieza a leer libros para ver tus estadísticas aquí.</p>
        </div>
      )}
    </div>
  );
}
