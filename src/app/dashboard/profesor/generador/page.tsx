"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Gamepad2 } from "lucide-react";

type BookRow = { id: string; title: string; author: string };

export default function ProfesorGeneradorPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [bookId, setBookId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"quiz" | "games" | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/books")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setBooks((rows as any[]).map((b) => ({ id: b.id, title: b.title, author: b.author }))))
      .catch(() => {});
  }, [session]);

  const generateQuiz = async () => {
    if (!bookId) return;
    setBusy("quiz");
    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, prompt, text }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.id) router.push(`/dashboard/activities/${data.id}`);
    } finally {
      setBusy(null);
    }
  };

  const generateGames = async () => {
    if (!bookId) return;
    setBusy("games");
    try {
      const res = await fetch("/api/games/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, text }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.wordsearchId) router.push(`/dashboard/activities/${data.wordsearchId}`);
    } finally {
      setBusy(null);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Generador por libro</h1>
        <p className="text-gray-500">Genera quiz y juegos automáticamente para una demo institucional.</p>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Selecciona un libro</CardTitle>
          <CardDescription>Usa el prompt para orientar la generación (opcional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={bookId} onValueChange={setBookId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un libro" />
            </SelectTrigger>
            <SelectContent>
              {books.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title} — {b.author}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ej: "quiz sobre capítulo 3", "enfoque en comprensión lectora"'
          />

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí un extracto del libro si quieres mejorar la precisión (opcional)."
            className="min-h-[180px]"
          />

          <div className="flex flex-wrap gap-3">
            <Button onClick={generateQuiz} className="bg-indigo-600 hover:bg-indigo-700 gap-2" disabled={!bookId || busy !== null}>
              <Sparkles className="h-4 w-4" /> Generar quiz
            </Button>
            <Button onClick={generateGames} variant="outline" className="gap-2" disabled={!bookId || busy !== null}>
              <Gamepad2 className="h-4 w-4" /> Generar juegos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

