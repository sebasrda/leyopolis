"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Trophy } from "lucide-react";

type Me = { userId: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  points: number;
  published: boolean;
  createdAt: string;
  createdBy: { id: string; name: string | null };
};

const activityTypes = [
  { value: "QUIZ", label: "Cuestionario (opción múltiple)" },
  { value: "TRUE_FALSE", label: "Verdadero / Falso" },
  { value: "FILL_BLANK", label: "Completar frase" },
  { value: "SHORT_ANSWER", label: "Respuesta corta" },
  { value: "WORDSEARCH", label: "Sopa de letras" },
  { value: "CROSSWORD", label: "Crucigrama" },
  { value: "REORDER", label: "Ordenar palabras" },
  { value: "MATCH", label: "Emparejar conceptos" },
  { value: "READING_COMPREHENSION", label: "Comprensión lectora" },
] as const;

export default function ActivitiesPage() {
  const { data: session } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("QUIZ");
  const [points, setPoints] = useState(100);
  const [content, setContent] = useState("");

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const canCreate = me?.role === "ADMIN" || me?.role === "TEACHER";

  const typeLabel = useMemo(() => {
    const hit = activityTypes.find((t) => t.value === type);
    return hit?.label ?? type;
  }, [type]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => {});
  }, [session]);

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = (await res.json()) as ActivityRow[];
        setActivities(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchActivities();
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleCreate = async () => {
    const payload = {
      title,
      description,
      type,
      points,
      content,
      published: true,
    };

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setTitle("");
      setDescription("");
      setType("QUIZ");
      setPoints(100);
      setContent("");
      setCreateOpen(false);
      fetchActivities();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/activities/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { title?: string; description?: string; type?: string; points?: number; content?: unknown };
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.type) setType(data.type);
      if (typeof data.points === "number") setPoints(data.points);
      if (data.content) setContent(JSON.stringify(data.content, null, 2));
      setAiOpen(false);
      setCreateOpen(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Actividades</h1>
          <p className="text-gray-500">Cuestionarios, juegos y comprensión lectora.</p>
        </div>

        {canCreate && (
          <div className="flex gap-3">
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Generar actividad con IA
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>Generar actividad con IA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='Ej: "crear actividad sobre capítulo 3 del libro"'
                    className="min-h-[140px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAiOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700" disabled={generating}>
                      Generar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                  <BookOpen className="h-4 w-4" /> Crear actividad
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[760px]">
                <DialogHeader>
                  <DialogTitle>Nueva actividad</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Título</div>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la actividad" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Puntos</div>
                      <Input
                        type="number"
                        value={String(points)}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Descripción</div>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Tipo</div>
                    <div className="flex flex-wrap gap-2">
                      {activityTypes.map((t) => (
                        <Button
                          key={t.value}
                          type="button"
                          variant={type === t.value ? "default" : "outline"}
                          className={type === t.value ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                          onClick={() => setType(t.value)}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700">Contenido (JSON)</div>
                      <Badge variant="outline" className="bg-gray-50">
                        {typeLabel}
                      </Badge>
                    </div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder='Ej: { "questions": [ ... ] }'
                      className="min-h-[220px] font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
                      Guardar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando actividades...</CardContent>
        </Card>
      ) : activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">No hay actividades disponibles.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((a) => (
            <Card key={a.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{a.description || "Sin descripción"}</CardDescription>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50" variant="outline">
                    {a.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>{a.points} pts</span>
                  </div>
                  <div className="text-xs">{new Date(a.createdAt).toLocaleDateString()}</div>
                </div>

                <Link href={`/dashboard/activities/${a.id}`} className="block">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {me?.role === "STUDENT" ? "Resolver" : "Abrir"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

