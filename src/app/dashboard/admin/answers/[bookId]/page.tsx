"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  Clock,
  ListOrdered,
  ShieldCheck,
  Type,
  Hash,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}
interface Statement {
  text: string;
  isTrue: boolean;
}
interface QuizContent {
  questions: Question[];
  statements: Statement[];
  timelineEvents: string[];
  keywords: string[];
  sentences: Array<{ id: number; sentence: string }>;
  characterClues: Array<{ name: string; clues: string[] }>;
  countingQuestions: Array<{ question: string; answer: number; hint?: string }>;
}

export default function AdminAnswersDetail() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId;

  const [content, setContent] = useState<QuizContent | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/quiz?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar el quiz.");
        const data = await res.json();
        setContent(data.quiz?.content || null);
        setBookTitle(data.quiz?.title || "");
      } catch (e: any) {
        setError(e.message || "Error al cargar respuestas");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  const hasAny = useMemo(() => {
    if (!content) return false;
    return (
      (content.questions?.length || 0) > 0 ||
      (content.statements?.length || 0) > 0 ||
      (content.timelineEvents?.length || 0) > 0 ||
      (content.keywords?.length || 0) > 0 ||
      (content.sentences?.length || 0) > 0 ||
      (content.characterClues?.length || 0) > 0 ||
      (content.countingQuestions?.length || 0) > 0
    );
  }, [content]);

  const handleDownload = () => {
    if (!content) return;
    const lines: string[] = [];
    lines.push(`RESPUESTAS — ${bookTitle}`);
    lines.push("=".repeat(60));
    lines.push("");

    if (content.questions?.length) {
      lines.push("PREGUNTAS DE OPCIÓN MÚLTIPLE");
      lines.push("-".repeat(60));
      content.questions.forEach((q, i) => {
        lines.push(`${i + 1}. ${q.question}`);
        q.options?.forEach((opt, j) => {
          const mark = j === q.correctAnswer ? "  [✓]" : "     ";
          lines.push(`   ${mark} ${String.fromCharCode(65 + j)}. ${opt}`);
        });
        lines.push("");
      });
    }
    if (content.statements?.length) {
      lines.push("VERDADERO O FALSO");
      lines.push("-".repeat(60));
      content.statements.forEach((s, i) => {
        lines.push(`${i + 1}. ${s.text}`);
        lines.push(`   Respuesta: ${s.isTrue ? "VERDADERO" : "FALSO"}`);
        lines.push("");
      });
    }
    if (content.timelineEvents?.length) {
      lines.push("ORDEN CRONOLÓGICO");
      lines.push("-".repeat(60));
      content.timelineEvents.forEach((e, i) => lines.push(`${i + 1}º — ${e}`));
      lines.push("");
    }
    if (content.keywords?.length) {
      lines.push("PALABRAS CLAVE (SOPA DE LETRAS)");
      lines.push("-".repeat(60));
      lines.push(content.keywords.join(" · "));
      lines.push("");
    }
    if (content.sentences?.length) {
      lines.push("FRASES PARA ORDENAR");
      lines.push("-".repeat(60));
      content.sentences.forEach((s, i) => lines.push(`${i + 1}. ${s.sentence}`));
      lines.push("");
    }
    if (content.characterClues?.length) {
      lines.push("ADIVINA EL PERSONAJE");
      lines.push("-".repeat(60));
      content.characterClues.forEach((c) => {
        lines.push(`• ${c.name}`);
        c.clues?.forEach((clue, i) => lines.push(`  Pista ${i + 1}: ${clue}`));
        lines.push("");
      });
    }
    if (content.countingQuestions?.length) {
      lines.push("PREGUNTAS NUMÉRICAS");
      lines.push("-".repeat(60));
      content.countingQuestions.forEach((c, i) => {
        lines.push(`${i + 1}. ${c.question}`);
        lines.push(`   Respuesta: ${c.answer}`);
        if (c.hint) lines.push(`   Pista: ${c.hint}`);
        lines.push("");
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respuestas_${bookTitle.toLowerCase().replace(/[^a-z0-9]+/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Link
            href="/dashboard/admin/answers"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al listado
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            Respuestas: {bookTitle}
          </h1>
          <p className="text-muted-foreground text-sm">
            Solo administradores y docentes ven esta página. Las respuestas correctas se marcan en verde.
          </p>
        </div>
        <Button onClick={handleDownload} disabled={!hasAny} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Download className="h-4 w-4" /> Descargar todo (.txt)
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {!hasAny && !error && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Este libro aún no tiene actividades generadas.</p>
          <p className="text-xs mt-1">Pídele al super-admin que regenere actividades con IA.</p>
        </div>
      )}

      {/* Preguntas de Opción Múltiple */}
      {content?.questions && content.questions.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Preguntas de Opción Múltiple ({content.questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.questions.map((q, i) => (
              <div key={i} className="border border-border/40 rounded-xl p-4">
                <p className="font-semibold mb-2">
                  <span className="text-indigo-400 mr-2">{i + 1}.</span>
                  {q.question}
                </p>
                <ul className="space-y-1">
                  {q.options?.map((opt, j) => (
                    <li
                      key={j}
                      className={`text-sm pl-3 py-1 rounded flex items-center gap-2 ${
                        j === q.correctAnswer
                          ? "bg-emerald-500/10 text-emerald-400 font-medium border-l-2 border-emerald-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-mono text-xs w-4">{String.fromCharCode(65 + j)}.</span>
                      <span>{opt}</span>
                      {j === q.correctAnswer && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Verdadero o Falso */}
      {content?.statements && content.statements.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Verdadero o Falso ({content.statements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.statements.map((s, i) => (
                <li key={i} className="flex items-start gap-3 border border-border/40 rounded-lg p-3">
                  <span className="text-indigo-400 font-semibold shrink-0">{i + 1}.</span>
                  <span className="flex-1">{s.text}</span>
                  <Badge
                    className={
                      s.isTrue
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/15 text-red-400 border-red-500/30"
                    }
                  >
                    {s.isTrue ? "VERDADERO" : "FALSO"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cronología */}
      {content?.timelineEvents && content.timelineEvents.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Orden Cronológico ({content.timelineEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {content.timelineEvents.map((e, i) => (
                <li key={i} className="flex items-start gap-3 border-l-4 border-amber-500 bg-amber-500/5 rounded-r-lg p-3">
                  <span className="font-black text-amber-400 tabular-nums">{i + 1}º</span>
                  <span className="text-sm">{e}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Sopa de Letras */}
      {content?.keywords && content.keywords.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="h-4 w-4 text-cyan-400" />
              Palabras Clave / Sopa de Letras ({content.keywords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {content.keywords.map((w, i) => (
                <Badge key={i} className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-sm py-1 px-3">
                  {w}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frases para Ordenar */}
      {content?.sentences && content.sentences.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-violet-400" />
              Frases en Orden Correcto ({content.sentences.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {content.sentences.map((s, i) => (
                <li key={i} className="border border-violet-500/20 bg-violet-500/5 rounded-lg p-3 flex items-start gap-2">
                  <span className="font-bold text-violet-400 tabular-nums">{i + 1}.</span>
                  <span className="text-sm italic">«{s.sentence}»</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Adivina el Personaje */}
      {content?.characterClues && content.characterClues.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              Adivina el Personaje ({content.characterClues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.characterClues.map((c, i) => (
              <div key={i} className="border border-fuchsia-500/20 bg-fuchsia-500/5 rounded-lg p-3">
                <p className="font-bold text-fuchsia-300 mb-2">{c.name}</p>
                <ul className="space-y-1">
                  {c.clues?.map((clue, j) => (
                    <li key={j} className="text-sm text-muted-foreground">
                      <span className="text-fuchsia-400 mr-1">Pista {j + 1}:</span> {clue}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preguntas Numéricas */}
      {content?.countingQuestions && content.countingQuestions.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4 text-rose-400" />
              Preguntas Numéricas ({content.countingQuestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.countingQuestions.map((c, i) => (
                <li key={i} className="border border-border/40 rounded-lg p-3">
                  <p className="font-semibold">
                    <span className="text-rose-400 mr-2">{i + 1}.</span>
                    {c.question}
                  </p>
                  <p className="text-sm mt-1">
                    Respuesta: <span className="font-bold text-rose-400">{c.answer}</span>
                  </p>
                  {c.hint && <p className="text-xs text-muted-foreground mt-0.5">Pista: {c.hint}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
