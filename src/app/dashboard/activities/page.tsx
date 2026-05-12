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
import { ActivityContentEditor, type ActivityType } from "@/components/dashboard/teacher/ActivityContentEditor";

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

  // ── AI generator wizard state ─────────────────────────────────────────────
  const [aiBookId, setAiBookId] = useState<string>("");
  const [aiType, setAiType] = useState<string>("QUIZ");
  const [aiCount, setAiCount] = useState<number>(8);
  const [aiBookQuery, setAiBookQuery] = useState("");
  const [aiBooks, setAiBooks] = useState<Array<{ id: string; title: string; author: string; coverImage?: string }>>([]);
  const [aiBooksLoading, setAiBooksLoading] = useState(false);

  // Fetch books only when the AI dialog opens so we don't waste a call
  useEffect(() => {
    if (!aiOpen || aiBooks.length > 0) return;
    setAiBooksLoading(true);
    fetch("/api/books?_=" + Date.now(), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) ? setAiBooks(data) : setAiBooks([]))
      .catch(() => setAiBooks([]))
      .finally(() => setAiBooksLoading(false));
  }, [aiOpen, aiBooks.length]);

  const aiFilteredBooks = useMemo(() => {
    if (!aiBookQuery.trim()) return aiBooks.slice(0, 40);
    const q = aiBookQuery.toLowerCase();
    return aiBooks
      .filter((b) => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q))
      .slice(0, 40);
  }, [aiBooks, aiBookQuery]);

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
    if (!aiBookId) return;
    const book = aiBooks.find((b) => b.id === aiBookId);
    if (!book) return;

    setGenerating(true);
    try {
      // Build a structured prompt so the API doesn't need to guess what the
      // teacher meant. The server adds type-specific output-shape instructions.
      const promptParts = [
        `Libro: "${book.title}" de ${book.author}`,
        `Tipo de actividad solicitada: ${aiType}`,
        `Cantidad de preguntas/ítems: ${aiCount}`,
        "Genera contenido pedagógico de alta calidad orientado a estudiantes, evaluando comprensión y análisis del libro mencionado.",
      ];

      const res = await fetch("/api/activities/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptParts.join("\n"),
          bookId: aiBookId,
          type: aiType,
          count: aiCount,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { title?: string; description?: string; type?: string; points?: number; content?: unknown };
      if (data.title) setTitle(data.title);
      else setTitle(`${labelForType(aiType)}: ${book.title}`);
      if (data.description) setDescription(data.description);
      else setDescription(`Actividad generada con IA para el libro "${book.title}".`);
      setType(data.type || aiType);
      if (typeof data.points === "number") setPoints(data.points);
      if (data.content) setContent(JSON.stringify(data.content, null, 2));
      setAiOpen(false);
      setCreateOpen(true);
    } finally {
      setGenerating(false);
    }
  };

  function labelForType(t: string): string {
    return activityTypes.find((x) => x.value === t)?.label || t;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Actividades</h1>
          <p className="text-muted-foreground">Cuestionarios, juegos y comprensión lectora.</p>
        </div>

        {canCreate && (
          <div className="flex gap-3">
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Generar actividad con IA
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-border/40">
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    Generar actividad con IA
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Elige sobre qué libro y qué tipo de actividad quieres generar. La IA crea las preguntas usando el contenido del libro.
                  </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                  {/* 1. Book selector */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">1</span>
                      Elige el libro
                    </div>
                    <Input
                      value={aiBookQuery}
                      onChange={(e) => setAiBookQuery(e.target.value)}
                      placeholder="Buscar por título o autor…"
                    />
                    <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border/40 divide-y">
                      {aiBooksLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Cargando biblioteca…</p>
                      ) : aiFilteredBooks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Sin resultados.</p>
                      ) : aiFilteredBooks.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setAiBookId(b.id)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                            aiBookId === b.id ? "bg-indigo-500/15 border-l-2 border-indigo-500" : "hover:bg-muted/40"
                          }`}
                        >
                          {b.coverImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={b.coverImage} alt={b.title} className="w-8 h-10 object-cover rounded shrink-0" loading="lazy" />
                          ) : (
                            <div className="w-8 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                              <BookOpen className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{b.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{b.author}</p>
                          </div>
                          {aiBookId === b.id && <Sparkles className="h-4 w-4 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Activity type */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">2</span>
                      Elige el tipo de actividad
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {activityTypes.map((t) => (
                        <Button
                          key={t.value}
                          type="button"
                          variant={aiType === t.value ? "default" : "outline"}
                          size="sm"
                          className={`h-auto py-2 text-xs ${aiType === t.value ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                          onClick={() => setAiType(t.value)}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Count */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">3</span>
                      Cantidad de preguntas / ítems
                    </div>
                    <div className="flex gap-2 items-center">
                      {[5, 8, 10, 15, 20].map((n) => (
                        <Button
                          key={n}
                          type="button"
                          size="sm"
                          variant={aiCount === n ? "default" : "outline"}
                          className={aiCount === n ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                          onClick={() => setAiCount(n)}
                        >
                          {n}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={String(aiCount)}
                        onChange={(e) => setAiCount(Math.max(1, Math.min(50, Number(e.target.value) || 8)))}
                        className="w-20 h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 border-t border-border/40 bg-card/60 backdrop-blur flex justify-end gap-2 shrink-0">
                  <Button variant="outline" onClick={() => setAiOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    disabled={generating || !aiBookId}
                  >
                    <Sparkles className="h-4 w-4" />
                    {generating ? "Generando..." : "Generar actividad"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                  <BookOpen className="h-4 w-4" /> Crear actividad
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-border/40">
                  <DialogTitle>Nueva actividad</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 px-6 py-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Título</div>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la actividad" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Puntos</div>
                      <Input
                        type="number"
                        value={String(points)}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Descripción</div>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Tipo</div>
                    <div className="flex flex-wrap gap-2">
                      {activityTypes.map((t) => (
                        <Button
                          key={t.value}
                          type="button"
                          variant={type === t.value ? "default" : "outline"}
                          className={type === t.value ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                          onClick={() => {
                            // Switching type discards content that doesn't fit
                            // the new shape (e.g., went from QUIZ to TRUE_FALSE).
                            // The editor for the new type starts fresh.
                            if (type !== t.value) setContent("");
                            setType(t.value);
                          }}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Contenido</div>
                    <ActivityContentEditor
                      type={type as ActivityType}
                      value={content}
                      onChange={setContent}
                    />
                  </div>
                </div>

                {/* Sticky footer with the action buttons — always visible
                    even if the body of the dialog is taller than the screen */}
                <div className="px-6 py-3 border-t border-border/40 bg-card/60 backdrop-blur flex justify-end gap-2 shrink-0">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!title.trim() || !content.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Guardar actividad
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">Cargando actividades...</CardContent>
        </Card>
      ) : activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">No hay actividades disponibles.</CardContent>
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
                  <Badge className="bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/10" variant="outline">
                    {a.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
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

