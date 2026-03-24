"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Users } from "lucide-react";

type Me = { userId: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  teacherId: string;
  teacher: { id: string; name: string | null; email: string | null };
  enrollments: { id: string; userId: string; user: { id: string; name: string | null; email: string | null; role: string } }[];
  modules: {
    id: string;
    title: string;
    order: number;
    items: {
      id: string;
      type: string;
      order: number;
      book: { id: string; title: string; author: string } | null;
      activity: { id: string; title: string; type: string; points: number; published: boolean } | null;
      video: { id: string; title: string; provider: string; url: string } | null;
    }[];
  }[];
};

type BookRow = { id: string; title: string; author: string };
type ActivityRow = { id: string; title: string; type: string };
type VideoRow = { id: string; title: string; provider: string };

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [enrollEmail, setEnrollEmail] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleOpen, setModuleOpen] = useState(false);

  const [itemOpen, setItemOpen] = useState(false);
  const [moduleId, setModuleId] = useState<string>("");
  const [itemType, setItemType] = useState<"BOOK" | "ACTIVITY" | "VIDEO">("BOOK");
  const [itemRefId, setItemRefId] = useState<string>("");

  const [books, setBooks] = useState<BookRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);

  const canManage = useMemo(() => {
    if (!me || !course) return false;
    if (me.role === "ADMIN") return true;
    return me.role === "TEACHER" && course.teacherId === me.userId;
  }, [me, course]);

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/courses/${id}`);
      if (res.ok) setCourse(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchCourse();
    const interval = setInterval(fetchCourse, 10000);
    return () => clearInterval(interval);
  }, [id, session]);

  useEffect(() => {
    if (!session || !canManage) return;
    fetch("/api/books")
      .then((r) => (r.ok ? r.json() : []))
      .then((b) => setBooks((b as any[]).map((x) => ({ id: x.id, title: x.title, author: x.author }))))
      .catch(() => {});
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : []))
      .then((a) => setActivities((a as any[]).map((x) => ({ id: x.id, title: x.title, type: x.type }))))
      .catch(() => {});
    fetch("/api/videos")
      .then((r) => (r.ok ? r.json() : []))
      .then((v) => setVideos((v as any[]).map((x) => ({ id: x.id, title: x.title, provider: x.provider }))))
      .catch(() => {});
  }, [session, canManage]);

  const handleEnroll = async () => {
    if (!enrollEmail.trim()) return;
    const res = await fetch(`/api/courses/${id}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: enrollEmail }),
    });
    if (res.ok) {
      setEnrollEmail("");
      fetchCourse();
    }
  };

  const handleCreateModule = async () => {
    if (!moduleTitle.trim()) return;
    const res = await fetch(`/api/courses/${id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: moduleTitle, order: (course?.modules.length ?? 0) + 1 }),
    });
    if (res.ok) {
      setModuleTitle("");
      setModuleOpen(false);
      fetchCourse();
    }
  };

  const handleAddItem = async () => {
    if (!moduleId || !itemRefId) return;
    const payload =
      itemType === "BOOK"
        ? { type: "BOOK", bookId: itemRefId }
        : itemType === "ACTIVITY"
          ? { type: "ACTIVITY", activityId: itemRefId }
          : { type: "VIDEO", videoId: itemRefId };

    const res = await fetch(`/api/courses/modules/${moduleId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, order: 1 }),
    });

    if (res.ok) {
      setItemOpen(false);
      setItemRefId("");
      fetchCourse();
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Link href="/dashboard/courses">
            <Button variant="ghost" className="text-gray-600">
              ← Cursos
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{course?.title || "Curso"}</h1>
          <p className="text-gray-500">{course?.description || " "}</p>
        </div>
        <div className="flex items-center gap-3">
          {course && (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
              {course.enrollments.length} estudiantes
            </Badge>
          )}
          {canManage && (
            <>
              <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Nuevo módulo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Nuevo módulo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Título del módulo" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setModuleOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateModule} className="bg-indigo-600 hover:bg-indigo-700">
                        Crear
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={itemOpen} onOpenChange={setItemOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <BookOpen className="h-4 w-4" /> Agregar contenido
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[680px]">
                  <DialogHeader>
                    <DialogTitle>Agregar a módulo</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Módulo</div>
                        <Select value={moduleId} onValueChange={setModuleId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un módulo" />
                          </SelectTrigger>
                          <SelectContent>
                            {(course?.modules ?? []).map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Tipo</div>
                        <Select value={itemType} onValueChange={(v) => setItemType(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BOOK">Libro</SelectItem>
                            <SelectItem value="ACTIVITY">Actividad</SelectItem>
                            <SelectItem value="VIDEO">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Elemento</div>
                      <Select value={itemRefId} onValueChange={setItemRefId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un elemento" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemType === "BOOK" &&
                            books.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.title} — {b.author}
                              </SelectItem>
                            ))}
                          {itemType === "ACTIVITY" &&
                            activities.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.title} — {a.type}
                              </SelectItem>
                            ))}
                          {itemType === "VIDEO" &&
                            videos.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.title} — {v.provider}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setItemOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddItem} className="bg-indigo-600 hover:bg-indigo-700">
                        Agregar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando curso...</CardContent>
        </Card>
      ) : !course ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">No se puede ver este curso.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {course.modules.map((m) => (
              <Card key={m.id} className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{m.title}</span>
                    <Badge variant="outline" className="bg-gray-50">
                      {m.items.length} items
                    </Badge>
                  </CardTitle>
                  <CardDescription>Contenido del módulo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {m.items.length === 0 ? (
                    <div className="text-sm text-gray-500">Sin elementos.</div>
                  ) : (
                    <div className="space-y-2">
                      {m.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {it.type === "BOOK" && (it.book?.title ?? "Libro")}
                              {it.type === "ACTIVITY" && (it.activity?.title ?? "Actividad")}
                              {it.type === "VIDEO" && (it.video?.title ?? "Video")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {it.type === "BOOK" && it.book?.author}
                              {it.type === "ACTIVITY" && it.activity?.type}
                              {it.type === "VIDEO" && it.video?.provider}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {it.type === "BOOK" && it.book && (
                              <Link href={`/dashboard/reader/${it.book.id}?title=${encodeURIComponent(it.book.title)}`}>
                                <Button variant="outline" size="sm">
                                  Leer
                                </Button>
                              </Link>
                            )}
                            {it.type === "ACTIVITY" && it.activity && (
                              <Link href={`/dashboard/activities/${it.activity.id}`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm">
                                  Resolver
                                </Button>
                              </Link>
                            )}
                            {it.type === "VIDEO" && it.video && (
                              <Link href={`/dashboard/videos/${it.video.id}`}>
                                <Button variant="outline" size="sm">
                                  Ver
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" /> Estudiantes
                </CardTitle>
                <CardDescription>Inscritos en el curso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canManage && (
                  <div className="flex gap-2">
                    <Input
                      value={enrollEmail}
                      onChange={(e) => setEnrollEmail(e.target.value)}
                      placeholder="Email del estudiante"
                    />
                    <Button onClick={handleEnroll} className="bg-indigo-600 hover:bg-indigo-700">
                      Invitar
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {course.enrollments.length === 0 ? (
                    <div className="text-sm text-gray-500">Sin estudiantes.</div>
                  ) : (
                    course.enrollments.slice(0, 12).map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-sm">
                        <div className="line-clamp-1 text-gray-700">{e.user.name || e.user.email || "Usuario"}</div>
                        <Badge variant="outline" className="bg-gray-50 text-gray-600">
                          {e.user.role}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

