"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, GraduationCap } from "lucide-react";

type Me = { userId: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  createdAt: string;
  teacher: { id: string; name: string | null; email: string | null };
  _count: { enrollments: number; modules: number; activities: number; videos: number };
};

export default function CoursesPage() {
  const { data: session } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = me?.role === "ADMIN" || me?.role === "TEACHER";

  useEffect(() => {
    if (!session) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => {});
  }, [session]);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) setCourses(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchCourses();
    const interval = setInterval(fetchCourses, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleCreate = async () => {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, published: true }),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      setOpen(false);
      fetchCourses();
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Cursos</h1>
          <p className="text-gray-500">Módulos con actividades, videos y libros.</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <GraduationCap className="h-4 w-4" /> Crear curso
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]">
              <DialogHeader>
                <DialogTitle>Nuevo curso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Título</div>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del curso" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Descripción</div>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando cursos...</CardContent>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">No hay cursos disponibles.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <Card key={c.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{c.description || "Sin descripción"}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                    {c._count.enrollments} estudiantes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    {c._count.modules} módulos · {c._count.activities} actividades · {c._count.videos} videos
                  </div>
                  <div>{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="line-clamp-1">Profesor: {c.teacher.name || c.teacher.email || "—"}</div>
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                </div>
                <Link href={`/dashboard/courses/${c.id}`} className="block">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Abrir</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

