
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Activity, 
  BarChart3,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminIntel = {
  users: { total: number; activeToday: number; activeWeek: number; newUsers7d: number };
  books: { total: number; recent: { id: string; title: string; author: string; createdAt: string }[]; topRead: { id: string; title: string; author: string; reads: number; weeklyGrowth: number }[] };
  reading: { readsToday: number; readsWeek: number; readsMonth: number; avgReadingSeconds: number };
  activity: {
    topPages: { path: string; count: number }[];
    topBooksOpened: { id: string; title: string; author: string; opens: number }[];
    peakHours: { hour: number; count: number }[];
  };
  charts: {
    readsByDay: { day: string; count: number }[];
    usersGrowth: { day: string; count: number }[];
    popularBooks: { name: string; count: number }[];
    activityByHour: { hour: number; count: number }[];
  };
  tables: {
    topBooks: { id: string; title: string; author: string; reads: number; weeklyGrowth: number }[];
    topUsers: { id: string; name: string; email: string; readingSeconds: number; booksCompleted: number }[];
  };
  updatedAt: string;
};

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminStatsPage() {
  const [intel, setIntel] = useState<AdminIntel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchIntel = async () => {
      try {
        const res = await fetch("/api/admin/intelligence");
        if (!res.ok) {
          const msg = res.status === 401 ? "No autorizado" : `Error ${res.status}`;
          if (!cancelled) setError(msg);
          return;
        }
        const data = (await res.json()) as AdminIntel;
        if (!cancelled) {
          setIntel(data);
          setError(null);
        }
      } catch {
      }
    };

    fetchIntel();
    const interval = setInterval(fetchIntel, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const statCards = [
    { title: "Usuarios Totales", value: intel ? intel.users.total : "—", change: intel ? `${intel.users.newUsers7d} nuevos (7d)` : "—", icon: Users, color: "text-blue-600" },
    { title: "Usuarios Activos", value: intel ? intel.users.activeToday : "—", change: intel ? `${intel.users.activeWeek} activos (7d)` : "—", icon: Activity, color: "text-orange-600" },
    { title: "Libros en Plataforma", value: intel ? intel.books.total : "—", change: intel ? `${intel.books.recent.length} recientes` : "—", icon: BookOpen, color: "text-indigo-600" },
    { title: "Lecturas Hoy", value: intel ? intel.reading.readsToday : "—", change: intel ? `Promedio ${formatDuration(intel.reading.avgReadingSeconds)}` : "—", icon: Clock, color: "text-green-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Inteligencia / Estadísticas</h1>
        <p className="text-gray-500">
          Datos en tiempo real del comportamiento, crecimiento y lectura. Última actualización:{" "}
          {intel?.updatedAt ? new Date(intel.updatedAt).toLocaleTimeString() : "—"}
        </p>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-900">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" /> {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" /> Lecturas por día (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intel?.charts.readsByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> Crecimiento de usuarios (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intel?.charts.usersGrowth ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" /> Libros más populares (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intel?.charts.popularBooks ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" /> Actividad por horas (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intel?.charts.activityByHour ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" /> Top libros (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libro</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="text-right">Lecturas</TableHead>
                  <TableHead className="text-right">Crec. 7d</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(intel?.tables.topBooks ?? []).slice(0, 8).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-gray-500">{row.author}</TableCell>
                    <TableCell className="text-right">{row.reads}</TableCell>
                    <TableCell className="text-right">{row.weeklyGrowth}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" /> Usuarios más activos (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Tiempo</TableHead>
                  <TableHead className="text-right">Libros leídos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(intel?.tables.topUsers ?? []).slice(0, 8).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div>{row.name}</div>
                      <div className="text-xs text-gray-500">{row.email}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatDuration(row.readingSeconds)}</TableCell>
                    <TableCell className="text-right">{row.booksCompleted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
