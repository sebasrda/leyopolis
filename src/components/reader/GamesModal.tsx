
"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  BrainCircuit, 
  Trophy, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw,
  Gamepad2,
  Puzzle,
  Lightbulb,
  GraduationCap,
  Grid3X3,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { QuizGame } from "@/components/learning/games/QuizGame";
import { MemoryGame } from "@/components/learning/games/MemoryGame";
import { WordScrambleGame } from "@/components/learning/games/WordScrambleGame";
import { WordSearchGame } from "@/components/learning/games/WordSearchGame";
import { WordMatchGame } from "@/components/learning/games/WordMatchGame";
import { CrosswordGame } from "@/components/learning/games/CrosswordGame";
import { EvaluationMode } from "@/components/learning/games/EvaluationMode";

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
}

type GameType = "quiz" | "memory" | "wordsearch" | "wordmatch" | "crossword" | "evaluation" | "scramble" | null;

export default function GamesModal({ isOpen, onClose, bookTitle }: GamesModalProps) {
  const [activeGame, setActiveGame] = useState<GameType>(null);

  // Reset active game when modal opens/closes
  useEffect(() => {
    if (!isOpen) setActiveGame(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Header */}
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-8 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Gamepad2 className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Zona Interactiva: {bookTitle}</h2>
              <p className="text-indigo-100 text-sm">Aprende, juega y evalúate</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="hover:bg-white/20 text-white rounded-full h-10 w-10"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-indigo-50/30">
          {!activeGame ? (
            <GameMenu onSelectGame={setActiveGame} />
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-white flex items-center gap-4 shrink-0">
                <Button variant="ghost" onClick={() => setActiveGame(null)}>
                  ← Volver al Menú
                </Button>
                <div className="h-6 w-px bg-gray-200" />
                <h3 className="font-bold text-lg text-indigo-900">
                  {activeGame === 'quiz' && 'Desafío de Preguntas'}
                  {activeGame === 'memory' && 'Memoria Literaria'}
                  {activeGame === 'wordsearch' && 'Sopa de Letras'}
                  {activeGame === 'wordmatch' && 'Conecta Palabras'}
                  {activeGame === 'scramble' && 'Ordena la Frase'}
                  {activeGame === 'crossword' && 'Crucigrama'}
                  {activeGame === 'evaluation' && 'Evaluación Final'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                {activeGame === 'quiz' && <QuizGame questions={[
                    {id: 1, question: "¿Quién escribió 'El Principito'?", options: ["Antoine de Saint-Exupéry", "J.K. Rowling", "Cervantes", "Borges"], correctAnswer: 0},
                    {id: 2, question: "¿Qué animal se come al elefante en el dibujo?", options: ["Una boa", "Un león", "Un tigre", "Un gato"], correctAnswer: 0},
                    {id: 3, question: "¿Qué pide el Principito que le dibujen?", options: ["Un cordero", "Una flor", "Una casa", "Un avión"], correctAnswer: 0}
                ]} onComplete={() => {}} onExit={() => setActiveGame(null)} />}
                {activeGame === 'memory' && <MemoryGame pairs={[
                    {character: "Principito", description: "Niño de las estrellas"},
                    {character: "Zorro", description: "Amigo sabio"},
                    {character: "Rosa", description: "Flor vanidosa"},
                    {character: "Aviador", description: "Narrador"},
                    {character: "Rey", description: "Monarca solitario"},
                    {character: "Serpiente", description: "Misteriosa"}
                ]} onComplete={() => {}} />}
                {activeGame === 'wordsearch' && <WordSearchGame words={["PRINCIPITO", "ZORRO", "ROSA", "PLANETA", "BAOBAB", "AVIADOR"]} onComplete={() => {}} />}
                {activeGame === 'wordmatch' && <WordMatchGame />}
                {activeGame === 'crossword' && <CrosswordGame />}
                {activeGame === 'scramble' && (
                    <WordScrambleGame 
                        sentences={[
                            { id: 1, sentence: "Lo esencial es invisible a los ojos" },
                            { id: 2, sentence: "Fue el tiempo que pasaste con tu rosa" }
                        ]}
                        onComplete={() => {}}
                        onExit={() => setActiveGame(null)}
                    />
                )}
                {activeGame === 'evaluation' && <EvaluationMode onClose={onClose} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameMenu({ onSelectGame }: { onSelectGame: (g: GameType) => void }) {
  const games = [
    {
      id: "quiz",
      title: "Desafío de Preguntas",
      description: "Pon a prueba tu comprensión lectora con este quiz interactivo.",
      icon: BrainCircuit,
      color: "bg-blue-500",
      gradient: "from-blue-500 to-cyan-400"
    },
    {
      id: "memory",
      title: "Memoria Literaria",
      description: "Encuentra las parejas de personajes y conceptos del libro.",
      icon: Puzzle,
      color: "bg-purple-500",
      gradient: "from-purple-500 to-pink-400"
    },
    {
      id: "wordsearch",
      title: "Sopa de Letras",
      description: "Busca y encuentra las palabras ocultas en la cuadrícula.",
      icon: Grid3X3,
      color: "bg-red-500",
      gradient: "from-red-500 to-orange-400"
    },
    {
      id: "wordmatch",
      title: "Conecta Palabras",
      description: "Une las palabras clave con sus definiciones correctas.",
      icon: Lightbulb,
      color: "bg-orange-500",
      gradient: "from-orange-500 to-yellow-400"
    },
    {
      id: "scramble",
      title: "Ordena la Frase",
      description: "Reconstruye frases célebres del libro en el orden correcto.",
      icon: PenTool,
      color: "bg-teal-500",
      gradient: "from-teal-500 to-green-400"
    },
    {
      id: "crossword",
      title: "Crucigrama",
      description: "Completa el crucigrama con pistas del libro.",
      icon: PenTool,
      color: "bg-cyan-500",
      gradient: "from-cyan-500 to-blue-400"
    },
    {
      id: "evaluation",
      title: "Evaluación Final",
      description: "Examen formal para calificar tu comprensión del libro.",
      icon: GraduationCap,
      color: "bg-emerald-600",
      gradient: "from-emerald-600 to-green-500"
    }
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      <h3 className="text-3xl font-bold text-gray-800 mb-12 text-center">¡Elige tu Actividad!</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full max-w-7xl px-4">
        {games.map((game) => (
          <motion.div
            key={game.id}
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer"
            onClick={() => onSelectGame(game.id as GameType)}
          >
            <Card className="h-full overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col">
              <div className={`h-32 bg-gradient-to-br ${game.gradient} flex items-center justify-center`}>
                <game.icon className="h-16 w-16 text-white opacity-90 drop-shadow-md" />
              </div>
              <CardContent className="p-6 text-center flex-1 flex flex-col">
                <h4 className="text-xl font-bold text-gray-900 mb-2">{game.title}</h4>
                <p className="text-sm text-gray-500 flex-1">{game.description}</p>
                <Button className={`mt-6 w-full ${game.color} hover:opacity-90 text-white font-bold rounded-full`}>
                  {game.id === 'evaluation' ? 'Iniciar Examen' : 'Jugar Ahora'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
