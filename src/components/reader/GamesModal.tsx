
"use client";

import { useState, useEffect } from "react";
import {
  X, BrainCircuit, Gamepad2, Grid3X3, PenTool, Loader2,
  History as HistoryIcon, RefreshCcw, Hand, Puzzle,
  Scissors, Clock, User, Zap, HelpCircle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

// Classic games
import { TimelineGame } from "@/components/learning/games/TimelineGame";
import { WordScrambleGame } from "@/components/learning/games/WordScrambleGame";
import { WordSearchGame } from "@/components/learning/games/WordSearchGame";
import { TrueFalseGame } from "@/components/learning/games/TrueFalseGame";

// Gesture games
import { GestureQuiz } from "@/components/learning/games/gesture/GestureQuiz";
import { GestureVerdaderoFalso } from "@/components/learning/games/gesture/GestureVerdaderoFalso";
import { GestureRompecabezas } from "@/components/learning/games/gesture/GestureRompecabezas";
import { GesturePPT } from "@/components/learning/games/gesture/GesturePPT";
import { GestureTimeline } from "@/components/learning/games/gesture/GestureTimeline";
import { GestureAdivinaPersonaje } from "@/components/learning/games/gesture/GestureAdivinaPersonaje";
import { GestureSimonDice } from "@/components/learning/games/gesture/GestureSimonDice";

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookId?: string;
}

type GameType =
  // classic
  | "truefalse" | "timeline" | "wordsearch" | "scramble"
  // gesture
  | "g-quiz" | "g-vf" | "g-puzzle" | "g-ppt" | "g-timeline" | "g-adivina" | "g-simon"
  | null;

const GAME_TITLES: Record<string, string> = {
  truefalse: "Verdad o Falso",
  timeline: "Cronología Literaria",
  wordsearch: "Sopa de Letras",
  scramble: "Ordenar Frases",
  "g-quiz": "Quiz con Gestos",
  "g-vf": "V/F Gestual",
  "g-puzzle": "Rompecabezas",
  "g-ppt": "Piedra Papel Tijeras",
  "g-timeline": "Cronología Gestual",
  "g-adivina": "Adivina el Personaje",
  "g-simon": "Simón Dice",
};

export default function GamesModal({ isOpen, onClose, bookTitle, bookId }: GamesModalProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPERADMIN";
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchQuiz = async (forceRegenerate = false) => {
    if (!bookId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/quiz${forceRegenerate ? "?regenerate=true" : ""}`);
      const data = await res.json();
      if (data.quiz?.content) {
        setQuizData(typeof data.quiz.content === "string" ? JSON.parse(data.quiz.content) : data.quiz.content);
      }
    } catch (err) {
      console.error("Error fetching games data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!bookId) return;
    if (!window.confirm("¿Regenerar todas las actividades con IA?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/books/regenerate-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (res.ok) {
        alert("¡Actividades regeneradas!");
        await fetchQuiz();
      }
    } finally {
      setLoading(false);
    }
  };

  // Download activities as a printable HTML file
  const handleDownloadActivities = () => {
    if (!quizData) return;

    const formatSection = (title: string, items: any[]): string => {
      if (!items || items.length === 0) return "";
      let html = `<h2 style="color:#4f46e5;margin-top:24px;border-bottom:2px solid #e5e7eb;padding-bottom:6px">${title}</h2>`;
      items.forEach((item: any, i: number) => {
        if (item.statement || item.sentence) {
          html += `<p style="margin:12px 0"><strong>${i + 1}.</strong> ${item.statement || item.sentence}</p>`;
          if (typeof item.isTrue === "boolean") {
            html += `<p style="color:#9ca3af;margin-left:24px;font-size:13px">[ ] Verdadero &nbsp;&nbsp; [ ] Falso</p>`;
          } else if (item.correctIndex !== undefined && Array.isArray(item.options)) {
            item.options.forEach((opt: string, j: number) => {
              html += `<p style="margin-left:24px;font-size:13px">[ ] ${String.fromCharCode(65 + j)}. ${opt}</p>`;
            });
          } else if (Array.isArray(item.words)) {
            html += `<p style="color:#9ca3af;margin-left:24px;font-size:13px">Reordena: ${item.words?.join(" — ")}</p>`;
          }
        } else if (item.event) {
          html += `<p style="margin:8px 0"><strong>${i + 1}.</strong> ${item.event}</p>`;
        } else {
          html += `<p style="margin:8px 0"><strong>${i + 1}.</strong> ${JSON.stringify(item)}</p>`;
        }
      });
      return html;
    };

    const body = [
      quizData.questions ? formatSection("Preguntas de Opción Múltiple", quizData.questions) : "",
      quizData.statements ? formatSection("Verdadero o Falso", quizData.statements) : "",
      quizData.timelineEvents ? formatSection("Cronología — Ordena los eventos", quizData.timelineEvents) : "",
      quizData.sentences ? formatSection("Ordena las Frases", quizData.sentences) : "",
      quizData.keywords ? `<h2 style="color:#4f46e5;margin-top:24px">Sopa de Letras — Palabras Clave</h2><p style="letter-spacing:4px;color:#374151;font-size:15px">${(quizData.keywords as string[]).join(" · ")}</p>` : "",
    ].join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Actividades — ${bookTitle}</title>
<style>
  body { font-family: Georgia, serif; max-width: 780px; margin: 40px auto; color: #1f2937; line-height: 1.7; }
  h1 { text-align: center; color: #312e81; font-size: 26px; margin-bottom: 4px; }
  .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 32px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>📖 Actividades del Libro</h1>
<p class="subtitle">${bookTitle} · Generadas con IA por Leyópolis</p>
${body}
<hr style="margin-top:40px" />
<p style="text-align:center;font-size:11px;color:#9ca3af">Generado por Leyópolis · plataforma de lectura inteligente</p>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `actividades_${bookTitle.toLowerCase().replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isOpen) { setActiveGame(null); }
    else if (bookId) { fetchQuiz(); }
  }, [isOpen, bookId]);

  if (!isOpen) return null;

  const isGesture = activeGame?.startsWith("g-");

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[92vh] bg-card dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-8 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Gamepad2 className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Zona Interactiva: {bookTitle}</h2>
              <p className="text-indigo-100 text-sm">
                {isGesture ? "✋ Modo Gestos — usa tu cámara" : "Juegos basados en tu lectura"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!activeGame && quizData && (
              <Button
                onClick={handleDownloadActivities}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2"
                title="Descargar actividades para imprimir o usar offline"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Descargar</span>
              </Button>
            )}
            {isAdmin && !activeGame && (
              <Button
                onClick={handleRegenerate}
                disabled={loading}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                <span className="hidden sm:inline">Regenerar IA</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/20 text-white rounded-full h-10 w-10">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!activeGame ? (
            <GameMenu onSelectGame={setActiveGame} />
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-card dark:bg-gray-800 flex items-center gap-4 shrink-0">
                <Button variant="ghost" onClick={() => setActiveGame(null)}>← Menú</Button>
                <div className="h-6 w-px bg-gray-200" />
                <h3 className="font-bold text-lg text-indigo-200 dark:text-indigo-300">
                  {activeGame && GAME_TITLES[activeGame]}
                  {isGesture && <span className="ml-2 text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">✋ GESTOS</span>}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
                {loading && !quizData ? (
                  <div className="text-center mt-20">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mx-auto mb-4" />
                    <p className="text-slate-400">Cargando actividades personalizadas...</p>
                  </div>
                ) : (
                  <>
                    {/* Classic games */}
                    {activeGame === "truefalse" && (
                      <TrueFalseGame statements={quizData?.statements || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                    {activeGame === "timeline" && (
                      <TimelineGame events={quizData?.timelineEvents || []} onComplete={() => {}} />
                    )}
                    {activeGame === "wordsearch" && (
                      <WordSearchGame words={quizData?.keywords || ["LEYOPOLIS", "LECTURA"]} onComplete={() => {}} />
                    )}
                    {activeGame === "scramble" && (
                      <WordScrambleGame sentences={quizData?.sentences || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}

                    {/* Gesture games */}
                    {activeGame === "g-quiz" && (
                      <GestureQuiz questions={quizData?.questions || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                    {activeGame === "g-vf" && (
                      <GestureVerdaderoFalso statements={quizData?.statements || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                    {activeGame === "g-puzzle" && (
                      <GestureRompecabezas onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                    {activeGame === "g-ppt" && (
                      <GesturePPT
                        questions={quizData?.questions || []}
                        keywords={quizData?.keywords || []}
                        statements={quizData?.statements || []}
                        bookTitle={bookTitle}
                        onComplete={() => {}}
                        onExit={() => setActiveGame(null)}
                      />
                    )}
                    {activeGame === "g-timeline" && (
                      <GestureTimeline events={quizData?.timelineEvents || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                    {activeGame === "g-adivina" && (
                      <GestureAdivinaPersonaje characters={quizData?.characterClues || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                    {activeGame === "g-simon" && (
                      <GestureSimonDice keywords={quizData?.keywords || []} onComplete={() => {}} onExit={() => setActiveGame(null)} />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameMenu({ onSelectGame }: { onSelectGame: (g: GameType) => void }) {
  const classicGames = [
    { id: "truefalse", title: "Verdad o Falso", desc: "Reto de afirmaciones.", icon: BrainCircuit, gradient: "from-orange-600 to-amber-500", color: "bg-orange-600" },
    { id: "wordsearch", title: "Sopa de Letras", desc: "Encuentra conceptos clave.", icon: Grid3X3, gradient: "from-emerald-600 to-teal-500", color: "bg-emerald-600" },
    { id: "timeline", title: "Cronología", desc: "Ordena los hechos.", icon: HistoryIcon, gradient: "from-purple-600 to-pink-500", color: "bg-purple-600" },
    { id: "scramble", title: "Ordenar Frases", desc: "Reconstruye la historia.", icon: PenTool, gradient: "from-amber-600 to-orange-500", color: "bg-amber-600" },
  ];

  const gestureGames = [
    { id: "g-quiz", title: "Quiz Gestual", desc: "4 zonas · señala tu respuesta con la mano.", icon: HelpCircle, gradient: "from-blue-600 to-indigo-600", color: "bg-blue-600" },
    { id: "g-vf", title: "V/F con Manos", desc: "Izquierda=Falso · Derecha=Verdadero.", icon: Hand, gradient: "from-rose-600 to-pink-600", color: "bg-rose-600" },
    { id: "g-puzzle", title: "Rompecabezas", desc: "Arma 15 imágenes con el puño ✊", icon: Puzzle, gradient: "from-violet-600 to-purple-600", color: "bg-violet-600" },
    { id: "g-ppt", title: "Piedra Papel Tijeras", desc: "✊🖐✌️ temático del libro.", icon: Scissors, gradient: "from-cyan-600 to-blue-600", color: "bg-cyan-600" },
    { id: "g-timeline", title: "Cronología Gestual", desc: "¿Cuál ocurrió primero? izq/der.", icon: Clock, gradient: "from-teal-600 to-emerald-600", color: "bg-teal-600" },
    { id: "g-adivina", title: "Adivina el Personaje", desc: "Pistas automáticas · 4 zonas.", icon: User, gradient: "from-fuchsia-600 to-purple-700", color: "bg-fuchsia-600" },
    { id: "g-simon", title: "Simón Dice", desc: "Reproduce gestos con tema literario.", icon: Zap, gradient: "from-yellow-600 to-orange-600", color: "bg-yellow-600" },
  ];

  return (
    <div className="h-full overflow-y-auto p-8 space-y-10">
      {/* Classic section */}
      <div>
        <h3 className="text-lg font-bold text-slate-300 mb-5 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-indigo-400" /> Juegos Clásicos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {classicGames.map((g) => (
            <GameCard key={g.id} game={g} onClick={() => onSelectGame(g.id as GameType)} />
          ))}
        </div>
      </div>

      {/* Gesture section */}
      <div>
        <h3 className="text-lg font-bold text-slate-300 mb-2 flex items-center gap-2">
          <Hand className="h-5 w-5 text-purple-400" /> Juegos con Gestos IA ✋
          <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full font-normal">NUEVO</span>
        </h3>
        <p className="text-xs text-slate-500 mb-5">Activa la cámara dentro del juego y controla todo con tu mano</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {gestureGames.map((g) => (
            <GameCard key={g.id} game={g} onClick={() => onSelectGame(g.id as GameType)} gesture />
          ))}
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, onClick, gesture = false }: { game: any; onClick: () => void; gesture?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -6 }}
      whileTap={{ scale: 0.97 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="h-full overflow-hidden border-none shadow-xl flex flex-col">
        <div className={`h-28 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative`}>
          <game.icon className="h-14 w-14 text-white opacity-90" />
          {gesture && (
            <span className="absolute top-2 right-2 text-xs bg-black/30 text-white px-1.5 py-0.5 rounded font-bold">✋</span>
          )}
        </div>
        <CardContent className="p-4 text-center flex-1 flex flex-col">
          <h4 className="text-sm font-bold text-foreground dark:text-gray-100 mb-1">{game.title}</h4>
          <p className="text-xs text-muted-foreground flex-1">{game.desc}</p>
          <Button className={`mt-4 w-full ${game.color} hover:opacity-90 text-white font-bold rounded-full text-xs`}>
            {gesture ? "✋ Jugar" : "Jugar"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
