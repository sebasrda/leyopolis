"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Trophy, ArrowLeft } from "lucide-react";
import { WordSearchGame } from "@/components/learning/games/WordSearchGame";
import { CrosswordGame } from "@/components/learning/games/CrosswordGame";
import { WordMatchGame } from "@/components/learning/games/WordMatchGame";
import { WordScrambleGame } from "@/components/learning/games/WordScrambleGame";

type ActivityDetail = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  points: number;
  published: boolean;
  content: string;
  bookId: string | null;
  courseId: string | null;
  myAttempts: { id: string; score: number; createdAt: string; completedAt: string | null }[];
};

type QuizQuestion = {
  id: number;
  question: string;
  options?: string[];
  correctAnswer?: number;
  answer?: string;
};

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number } | null>(null);

  const parsed = useMemo(() => {
    if (!activity) return null;
    return safeJsonParse(activity.content);
  }, [activity]);

  const questions = useMemo(() => {
    if (!parsed || typeof parsed !== "object") return [];
    const q = (parsed as any).questions;
    if (!Array.isArray(q)) return [];
    return q as QuizQuestion[];
  }, [parsed]);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch(`/api/activities/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActivity(d))
      .finally(() => setLoading(false));
  }, [id, session]);

  const submitAttempt = async (score: number, max: number, finalAnswers: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, answers: finalAnswers }),
      });
      if (res.ok) setResult({ score, max });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activity) return;
    const max = activity.points;
    if (questions.length === 0) return submitAttempt(0, max, answers);

    let correct = 0;
    let gradable = 0;

    questions.forEach((q) => {
      const key = String(q.id);
      const a = answers[key];

      if (typeof q.correctAnswer === "number" && Array.isArray(q.options)) {
        gradable += 1;
        if (typeof a === "number" && a === q.correctAnswer) correct += 1;
        return;
      }

      if (typeof q.answer === "string") {
        gradable += 1;
        const expected = q.answer.trim().toLowerCase();
        const got = typeof a === "string" ? a.trim().toLowerCase() : "";
        if (expected && got && expected === got) correct += 1;
      }
    });

    const ratio = gradable > 0 ? correct / gradable : 0;
    const score = Math.round(ratio * max);
    await submitAttempt(score, max, answers);
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/activities">
              <Button variant="ghost" className="gap-2 text-gray-600">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
            </Link>
            {activity && (
              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50" variant="outline">
                {activity.type}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{activity?.title || "Actividad"}</h1>
          <p className="text-gray-500">{activity?.description || " "}</p>
        </div>
        {activity && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Puntuación</div>
            <div className="text-2xl font-bold text-indigo-700">{activity.points}</div>
          </div>
        )}
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando actividad...</CardContent>
        </Card>
      ) : !activity ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Actividad no disponible.</CardContent>
        </Card>
      ) : result ? (
        <Card className="border-none shadow-md">
          <CardContent className="p-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">Resultado</div>
            <div className="text-5xl font-black text-indigo-600">
              {result.score} <span className="text-2xl text-gray-400">/ {result.max}</span>
            </div>
            <Button onClick={() => setResult(null)} variant="outline">
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      ) : activity.type === "WORDSEARCH" ? (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Sopa de letras</CardTitle>
            <CardDescription>Encuentra todas las palabras para completar la actividad.</CardDescription>
          </CardHeader>
          <CardContent className="h-[700px]">
            <WordSearchGame
              words={Array.isArray((parsed as any)?.words) ? ((parsed as any).words as string[]) : ["LEYOPOLIS", "LIBRO", "LECTURA"]}
              gridSize={typeof (parsed as any)?.gridSize === "number" ? (parsed as any).gridSize : 10}
              onComplete={(score) => submitAttempt(Math.min(activity.points, score), activity.points, { game: "WORDSEARCH" })}
              onExit={() => {}}
            />
          </CardContent>
        </Card>
      ) : activity.type === "CROSSWORD" ? (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Crucigrama</CardTitle>
            <CardDescription>Completa el crucigrama y marca la actividad como finalizada.</CardDescription>
          </CardHeader>
          <CardContent className="h-[700px] space-y-4">
            <div className="h-[600px]">
              <CrosswordGame />
            </div>
            <Button
              onClick={() => submitAttempt(activity.points, activity.points, { game: "CROSSWORD" })}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={submitting}
            >
              Marcar como completado
            </Button>
          </CardContent>
        </Card>
      ) : activity.type === "MATCH" ? (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Emparejar conceptos</CardTitle>
            <CardDescription>Completa el juego y marca la actividad como finalizada.</CardDescription>
          </CardHeader>
          <CardContent className="h-[700px] space-y-4">
            <div className="h-[600px]">
              <WordMatchGame />
            </div>
            <Button
              onClick={() => submitAttempt(activity.points, activity.points, { game: "MATCH" })}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={submitting}
            >
              Marcar como completado
            </Button>
          </CardContent>
        </Card>
      ) : activity.type === "REORDER" ? (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Ordenar palabras</CardTitle>
            <CardDescription>Completa el juego y marca la actividad como finalizada.</CardDescription>
          </CardHeader>
          <CardContent className="h-[700px] space-y-4">
            <div className="h-[600px]">
              <WordScrambleGame
                sentences={
                  Array.isArray((parsed as any)?.sentences)
                    ? ((parsed as any).sentences as { id: number; sentence: string; scrambled?: string[] }[])
                    : [{ id: 1, sentence: "La lectura inteligente mejora la comprensión." }]
                }
                onComplete={(score, maxScore) => {
                  const normalized = maxScore > 0 ? score / maxScore : 0;
                  const pts = Math.round(normalized * activity.points);
                  void submitAttempt(pts, activity.points, { game: "REORDER", score, maxScore });
                }}
                onExit={() => {}}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Cuestionario</CardTitle>
            <CardDescription>Responde y envía para registrar tu puntuación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Contenido</div>
                <Textarea value={activity.content} readOnly className="font-mono text-xs min-h-[220px]" />
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q) => (
                  <Card key={q.id} className="border border-gray-200 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{q.question}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Array.isArray(q.options) && q.options.length > 0 ? (
                        <div className="space-y-2">
                          {q.options.map((opt, idx) => {
                            const selected = answers[String(q.id)] === idx;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setAnswers((prev) => ({ ...prev, [String(q.id)]: idx }))}
                                className={[
                                  "w-full text-left p-3 rounded-lg border transition",
                                  selected ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-gray-200 hover:bg-gray-50",
                                ].join(" ")}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <Input
                          value={typeof answers[String(q.id)] === "string" ? (answers[String(q.id)] as string) : ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                          placeholder="Escribe tu respuesta"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitQuiz}
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={submitting}
              >
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
