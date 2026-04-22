"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowLeft, Trophy, Loader2 } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options?: string[];
  correctAnswer?: number;
  answer?: string;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  content: string;
  points: number;
  bookId?: string;
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/activities/${quizId}`);
        if (!res.ok) throw new Error("Quiz no encontrado");
        const data = await res.json();
        setQuiz(data);
        const parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
        setQuestions(parsed.questions || []);
      } catch (err) {
        console.error("Error loading quiz:", err);
        setError("No se pudo cargar el quiz. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };
    if (quizId) fetchQuiz();
  }, [quizId]);

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleTextAnswer = (questionId: number, value: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);

    let correct = 0;
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (q.options && q.correctAnswer !== undefined) {
        if (userAnswer === q.correctAnswer) correct++;
      } else if (q.answer) {
        if (typeof userAnswer === "string" && userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim()) {
          correct++;
        }
      }
    });

    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setScore(finalScore);
    setSubmitted(true);

    try {
      await fetch("/api/activity/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: quizId,
          score: finalScore,
          answers: JSON.stringify(answers),
        }),
      });
    } catch (err) {
      console.error("Error saving attempt:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="ml-3 text-muted-foreground">Cargando quiz...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quiz?.title || "Quiz"}</h1>
          {quiz?.description && <p className="text-muted-foreground text-sm">{quiz.description}</p>}
        </div>
        <Badge className="ml-auto bg-indigo-500/20 text-indigo-300">{quiz?.points || 100} pts</Badge>
      </div>

      {submitted && (
        <Card className={`border-2 ${score >= 70 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <CardContent className="p-6 flex items-center gap-4">
            <Trophy className={`h-10 w-10 ${score >= 70 ? "text-green-600" : "text-amber-600"}`} />
            <div>
              <h2 className="text-xl font-bold">{score >= 70 ? "¡Felicidades!" : "Sigue practicando"}</h2>
              <p className="text-sm text-muted-foreground">
                Obtuviste <span className="font-bold text-lg">{score}%</span> de respuestas correctas
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = submitted && (
            q.options && q.correctAnswer !== undefined
              ? userAnswer === q.correctAnswer
              : typeof userAnswer === "string" && q.answer && userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim()
          );

          return (
            <Card key={q.id} className={`transition-all ${submitted ? (isCorrect ? "ring-2 ring-green-300" : "ring-2 ring-red-200") : "hover:shadow-md"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-indigo-500/20 text-indigo-300 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </span>
                  {q.question}
                  {submitted && (isCorrect
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto shrink-0" />
                    : <XCircle className="h-5 w-5 text-red-400 ml-auto shrink-0" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {q.options ? (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        disabled={submitted}
                        className={`text-left p-3 rounded-lg border text-sm transition-all ${
                          submitted
                            ? optIdx === q.correctAnswer
                              ? "bg-green-100 border-green-300 font-medium"
                              : userAnswer === optIdx
                                ? "bg-red-50 border-red-200"
                                : "bg-muted border-border"
                            : userAnswer === optIdx
                              ? "bg-indigo-500/10 border-indigo-300 ring-1 ring-indigo-200"
                              : "bg-card border-border hover:bg-muted"
                        }`}
                      >
                        <span className="font-medium mr-2 text-gray-400">{String.fromCharCode(65 + optIdx)}.</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Escribe tu respuesta..."
                    value={(userAnswer as string) || ""}
                    onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                    disabled={submitted}
                    className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                  />
                )}
                {submitted && !isCorrect && q.answer && (
                  <p className="mt-2 text-sm text-green-700">Respuesta correcta: <strong>{q.answer}</strong></p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(answers).length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
          ) : (
            `Enviar Respuestas (${Object.keys(answers).length}/${questions.length})`
          )}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver al libro
          </Button>
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push("/dashboard/library")}>
            Ir a Biblioteca
          </Button>
        </div>
      )}
    </div>
  );
}
