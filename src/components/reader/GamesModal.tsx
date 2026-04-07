
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
  PenTool,
  Loader2
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
  bookId?: string;
}

type GameType = "quiz" | "memory" | "wordsearch" | "wordmatch" | "crossword" | "scramble" | null;

export default function GamesModal({ isOpen, onClose, bookTitle, bookId }: GamesModalProps) {
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveGame(null);
    } else if (bookId) {
      const fetchQuiz = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/books/${bookId}/quiz`);
          const data = await res.json();
          if (data.quiz && data.quiz.content) {
            setQuizData(typeof data.quiz.content === 'string' ? JSON.parse(data.quiz.content) : data.quiz.content);
          }
        } catch (err) {
          console.error("Error fetching games data:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchQuiz();
    }
  }, [isOpen, bookId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[90vh] bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-8 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Gamepad2 className="h-8 w-8 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Zona Interactiva: {bookTitle}</h2>
              <p className="text-indigo-100 text-sm">Contenido dinámico basado en tu lectura</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/20 text-white rounded-full h-10 w-10">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden bg-indigo-50/10">
          {!activeGame ? (
            <GameMenu onSelectGame={setActiveGame} />
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-white dark:bg-gray-800 flex items-center gap-4 shrink-0">
                <Button variant="ghost" onClick={() => setActiveGame(null)}>← Menú</Button>
                <div className="h-6 w-px bg-gray-200" />
                <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-300">
                  {activeGame === 'quiz' && 'Reto de Preguntas'}
                  {activeGame === 'memory' && 'Parejas de Personajes'}
                  {activeGame === 'wordsearch' && 'Busca las Palabras'}
                  {activeGame === 'scramble' && 'Ordena la Frase'}
                  {activeGame === 'wordmatch' && 'Relacionar Conceptos'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex justify-center items-center">
                {quizData ? (
                  <>
                    {activeGame === 'quiz' && (
                      <QuizGame 
                        questions={quizData.questions || []} 
                        onComplete={() => {}} 
                        onExit={() => setActiveGame(null)} 
                      />
                    )}
                    {activeGame === 'memory' && (
                      <MemoryGame 
                        pairs={quizData.memoryPairs || []} 
                        onComplete={() => {}} 
                      />
                    )}
                    {activeGame === 'wordsearch' && (
                      <WordSearchGame 
                        words={quizData.keywords || ["LEYOPOLIS", "LECTURA"]} 
                        onComplete={() => {}} 
                      />
                    )}
                    {activeGame === 'scramble' && (
                      <WordScrambleGame 
                        sentences={quizData.sentences || []}
                        onComplete={() => {}}
                        onExit={() => setActiveGame(null)}
                      />
                    )}
                    {activeGame === 'wordmatch' && <WordMatchGame />}
                  </>
                ) : (
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p>Cargando actividades personalizadas...</p>
                  </div>
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
  const games = [
    { id: "quiz", title: "Preguntas", description: "Pon a prueba lo que leíste.", icon: BrainCircuit, color: "bg-blue-500", gradient: "from-blue-500 to-cyan-400" },
    { id: "memory", title: "Memoria", description: "Encuentra los personajes.", icon: Puzzle, color: "bg-purple-500", gradient: "from-purple-500 to-pink-400" },
    { id: "wordsearch", title: "Sopa de Letras", description: "Busca palabras clave.", icon: Grid3X3, color: "bg-red-500", gradient: "from-red-500 to-orange-400" },
    { id: "scramble", title: "Ordenar", description: "Ordena frases del libro.", icon: PenTool, color: "bg-teal-500", gradient: "from-teal-500 to-green-400" },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-12 text-center">Zona de Juegos Literarios</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-5xl">
        {games.map((game) => (
          <motion.div
            key={game.id}
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer"
            onClick={() => onSelectGame(game.id as GameType)}
          >
            <Card className="h-full overflow-hidden border-none shadow-xl flex flex-col">
              <div className={`h-32 bg-gradient-to-br ${game.gradient} flex items-center justify-center`}>
                <game.icon className="h-16 w-16 text-white opacity-90" />
              </div>
              <CardContent className="p-6 text-center flex-1 flex flex-col">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{game.title}</h4>
                <p className="text-sm text-gray-500 flex-1">{game.description}</p>
                <Button className={`mt-6 w-full ${game.color} hover:opacity-90 text-white font-bold rounded-full`}>
                  Jugar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
