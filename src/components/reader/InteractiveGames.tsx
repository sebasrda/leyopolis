
"use client";

import { useState, useEffect } from "react";
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
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface InteractiveGamesProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  evaluations: any[];
  defaultGame?: GameType;
}

type GameType = "quiz" | "memory" | "wordmatch" | "evaluation" | null;

export default function InteractiveGames({ isOpen, onClose, bookTitle, evaluations = [], defaultGame = null }: InteractiveGamesProps) {
  const [activeGame, setActiveGame] = useState<GameType>(defaultGame);

  useEffect(() => {
    if (isOpen) {
      setActiveGame(defaultGame);
    }
  }, [isOpen, defaultGame]);

  // Parse game content
  const quizData = evaluations.find(e => e.type === "QUIZ");
  const memoryData = evaluations.find(e => e.type === "MEMORY");
  const evaluationData = evaluations.find(e => e.type === "EVALUATION");
  
  const quizQuestions = quizData ? JSON.parse(quizData.content) : null;
  const memoryCards = memoryData ? JSON.parse(memoryData.content) : null;
  const evaluationQuestions = evaluationData ? JSON.parse(evaluationData.content) : null;

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
                <Button variant="ghost" onClick={() => {
                  if (defaultGame) onClose();
                  else setActiveGame(null);
                }}>
                  {defaultGame ? 'Cerrar' : '← Volver al Menú'}
                </Button>
                <div className="h-6 w-px bg-gray-200" />
                <h3 className="font-bold text-lg text-indigo-900">
                  {activeGame === 'quiz' && 'Desafío de Preguntas'}
                  {activeGame === 'memory' && 'Memoria Literaria'}
                  {activeGame === 'wordmatch' && 'Conecta Palabras'}
                  {activeGame === 'evaluation' && 'Evaluación Final'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                {activeGame === 'quiz' && <QuizGame questions={quizQuestions} />}
                {activeGame === 'memory' && <MemoryGame cardsData={memoryCards} />}
                {activeGame === 'wordmatch' && <WordMatchGame />}
                {activeGame === 'evaluation' && <EvaluationMode questions={evaluationQuestions} onClose={onClose} />}
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
      id: "wordmatch",
      title: "Conecta Palabras",
      description: "Une las palabras clave con sus definiciones correctas.",
      icon: Lightbulb,
      color: "bg-orange-500",
      gradient: "from-orange-500 to-yellow-400"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
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

// --- EVALUATION MODE ---
function EvaluationMode({ questions, onClose }: { questions: any[], onClose: () => void }) {
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Default questions if none provided
  const defaultQuestions = [
    {
      id: 1,
      question: "¿Cuál es el conflicto principal de la historia?",
      options: ["Hombre contra naturaleza", "Hombre contra sociedad", "Hombre contra sí mismo", "Bien contra mal"],
      correct: 2
    },
    {
      id: 2,
      question: "¿Cómo evoluciona el protagonista?",
      options: ["Se vuelve más cínico", "Aprende a perdonar", "Pierde la memoria", "Gana poderes mágicos"],
      correct: 1
    },
    {
      id: 3,
      question: "¿Qué rol juega el antagonista?",
      options: ["Es un obstáculo físico", "Representa el pasado", "Es un aliado secreto", "No existe antagonista"],
      correct: 1
    },
    {
      id: 4,
      question: "¿Cuál es el tono predominante?",
      options: ["Satírico", "Melancólico", "Optimista", "Terrorífico"],
      correct: 1
    }
  ];

  const activeQuestions = questions && questions.length > 0 ? questions : defaultQuestions;

  const handleSubmit = () => {
    let correctCount = 0;
    activeQuestions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correct) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);
  };

  if (submitted) {
    const percentage = Math.round((score / activeQuestions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-emerald-100">
          <div className="mb-6 inline-flex p-4 bg-emerald-100 rounded-full">
            <GraduationCap className="h-16 w-16 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Evaluación Completada</h2>
          <p className="text-gray-500 mb-8">Has finalizado el examen del libro.</p>
          
          <div className="text-6xl font-black text-emerald-600 mb-2">{percentage}%</div>
          <p className="text-xl font-medium text-gray-700 mb-8">
            {score} de {activeQuestions.length} respuestas correctas
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button onClick={onClose} variant="outline" className="border-gray-300">
              Cerrar
            </Button>
            {percentage < 70 && (
              <Button onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setScore(0);
              }} className="bg-emerald-600 hover:bg-emerald-700">
                Intentar de Nuevo
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full pb-10">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 flex items-start gap-4">
        <GraduationCap className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-emerald-900">Instrucciones</h4>
          <p className="text-emerald-700 text-sm">Responde todas las preguntas cuidadosamente. Al finalizar, recibirás tu calificación inmediata. Necesitas un 70% para aprobar.</p>
        </div>
      </div>

      <div className="space-y-8">
        {activeQuestions.map((q: any, idx: number) => (
          <Card key={idx} className="overflow-hidden border-gray-200 shadow-sm">
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex gap-3">
              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <h3 className="font-medium text-gray-900">{q.question}</h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {q.options.map((opt: string, optIdx: number) => (
                <label 
                  key={optIdx} 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    answers[idx] === optIdx 
                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    answers[idx] === optIdx ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
                  }`}>
                    {answers[idx] === optIdx && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm text-gray-700">{opt}</span>
                  <input 
                    type="radio" 
                    name={`q-${idx}`} 
                    className="hidden" 
                    onChange={() => setAnswers({...answers, [idx]: optIdx})}
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={Object.keys(answers).length < activeQuestions.length}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-200"
        >
          Entregar Evaluación
        </Button>
      </div>
    </div>
  );
}

// --- QUIZ GAME ---
function QuizGame({ questions }: { questions: any[] }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Default questions if none provided
  const defaultQuestions = [
    {
      question: "¿Cuál es el tema principal del primer capítulo?",
      options: ["La importancia de la familia", "El descubrimiento de un nuevo mundo", "La amistad entre dos rivales", "Un viaje inesperado"],
      correct: 0
    },
    {
      question: "¿Qué personaje aparece al final de la página 5?",
      options: ["El misterioso viajero", "El perro guardián", "El antiguo profesor", "La reina del castillo"],
      correct: 2
    },
    {
      question: "¿Qué simboliza el objeto dorado mencionado en la historia?",
      options: ["Riqueza infinita", "Poder absoluto", "Sabiduría perdida", "Esperanza eterna"],
      correct: 3
    }
  ];

  const activeQuestions = questions && questions.length > 0 ? questions : defaultQuestions;

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    const correct = index === activeQuestions[currentQuestion].correct;
    setIsCorrect(correct);
    if (correct) setScore(score + 1);

    setTimeout(() => {
      if (currentQuestion < activeQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
        <div className="mb-8 relative">
          <Trophy className="h-32 w-32 text-yellow-400 drop-shadow-lg" />
          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold animate-bounce">
            {Math.round((score / activeQuestions.length) * 100)}%
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-2">¡Juego Completado!</h3>
        <p className="text-xl text-gray-600 mb-8">
          Obtuviste {score} de {activeQuestions.length} respuestas correctas.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => {
            setCurrentQuestion(0);
            setScore(0);
            setShowResult(false);
            setSelectedAnswer(null);
            setIsCorrect(null);
          }} className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6 rounded-xl">
            <RefreshCcw className="mr-2 h-5 w-5" /> Jugar de Nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <span className="text-gray-500 font-bold">Pregunta {currentQuestion + 1} de {activeQuestions.length}</span>
        <div className="flex items-center gap-2 bg-indigo-100 px-4 py-1 rounded-full text-indigo-700 font-bold">
          <Trophy className="h-4 w-4" /> Puntos: {score * 100}
        </div>
      </div>
      
      <Progress value={((currentQuestion) / activeQuestions.length) * 100} className="mb-8 h-3 rounded-full" />

      <Card className="border-none shadow-lg mb-8 bg-white overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h3 className="text-2xl font-bold">{activeQuestions[currentQuestion].question}</h3>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeQuestions[currentQuestion].options.map((option: string, index: number) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAnswer(index)}
            disabled={selectedAnswer !== null}
            className={`p-6 rounded-xl text-left font-semibold text-lg transition-all border-2 ${
              selectedAnswer === index
                ? isCorrect
                  ? "bg-green-100 border-green-500 text-green-800"
                  : "bg-red-100 border-red-500 text-red-800"
                : "bg-white border-gray-200 hover:border-indigo-400 hover:shadow-md text-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{option}</span>
              {selectedAnswer === index && (
                isCorrect ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// --- MEMORY GAME ---
function MemoryGame({ cardsData }: { cardsData: any[] }) {
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    initializeGame();
  }, [cardsData]);

  const initializeGame = () => {
    const defaultItems = [
      { id: 1, content: "🦁", type: "icon" }, { id: 1, content: "León", type: "text" },
      { id: 2, content: "👑", type: "icon" }, { id: 2, content: "Rey", type: "text" },
      { id: 3, content: "⚔️", type: "icon" }, { id: 3, content: "Espada", type: "text" },
      { id: 4, content: "🏰", type: "icon" }, { id: 4, content: "Castillo", type: "text" },
      { id: 5, content: "🧙‍♂️", type: "icon" }, { id: 5, content: "Mago", type: "text" },
      { id: 6, content: "dragon", type: "icon" }, { id: 6, content: "Dragón", type: "text" },
    ];
    
    const items = cardsData && cardsData.length > 0 ? cardsData : defaultItems;

    // Shuffle
    const shuffled = items
      .map((item: any) => ({ ...item, uniqueId: Math.random() })) // Add unique ID for React keys
      .sort(() => Math.random() - 0.5);
      
    setCards(shuffled);
    setFlipped([]);
    setSolved([]);
  };

  const handleClick = (index: number) => {
    if (disabled || flipped.includes(index) || solved.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setDisabled(true);
      const [first, second] = newFlipped;
      if (cards[first].id === cards[second].id) {
        setSolved([...solved, first, second]);
        setFlipped([]);
        setDisabled(false);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  };

  if (solved.length === cards.length && cards.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Trophy className="h-24 w-24 text-purple-500 mb-6 animate-pulse" />
        <h3 className="text-3xl font-bold mb-4">¡Excelente Memoria!</h3>
        <Button onClick={initializeGame} className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-4 rounded-full">
          Jugar Otra Vez
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.uniqueId}
            onClick={() => handleClick(index)}
            className={`aspect-square cursor-pointer perspective-1000`}
          >
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
              flipped.includes(index) || solved.includes(index) ? "rotate-y-180" : ""
            }`}>
              {/* Front (Hidden) */}
              <div className={`absolute w-full h-full bg-indigo-600 rounded-xl flex items-center justify-center backface-hidden shadow-md border-4 border-indigo-400 ${
                 flipped.includes(index) || solved.includes(index) ? "opacity-0" : "opacity-100"
              }`}>
                <Puzzle className="h-8 w-8 text-white/50" />
              </div>
              
              {/* Back (Revealed) */}
              <div className={`absolute w-full h-full bg-white rounded-xl flex items-center justify-center backface-hidden rotate-y-180 shadow-xl border-4 ${
                solved.includes(index) ? "border-green-400 bg-green-50" : "border-purple-200"
              } ${
                 flipped.includes(index) || solved.includes(index) ? "opacity-100" : "opacity-0"
              }`}>
                <span className="text-3xl font-bold text-gray-800">
                  {card.content === "dragon" ? "🐉" : card.content}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- WORD MATCH GAME ---
function WordMatchGame() {
  const [pairs, setPairs] = useState<{word: string, def: string}[]>([]);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [shuffledDefs, setShuffledDefs] = useState<{id: number, text: string}[]>([]);

  useEffect(() => {
    const data = [
      { word: "Efímero", def: "Que dura poco tiempo o es pasajero." },
      { word: "Inefable", def: "Algo tan increíble que no se puede explicar con palabras." },
      { word: "Resiliencia", def: "Capacidad de adaptarse frente a situaciones adversas." },
      { word: "Melancolía", def: "Tristeza vaga, profunda y permanente." }
    ];
    setPairs(data);
    setShuffledDefs(data.map((item, idx) => ({ id: idx, text: item.def })).sort(() => Math.random() - 0.5));
  }, []);

  const handleWordClick = (idx: number) => {
    if (matched.includes(idx)) return;
    setSelectedWord(idx);
  };

  const handleDefClick = (id: number) => {
    if (selectedWord === null) return;
    if (selectedWord === id) {
      setMatched([...matched, id]);
      setSelectedWord(null);
    } else {
      // Error feedback could go here
      setSelectedWord(null);
    }
  };

  if (matched.length === pairs.length && pairs.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="bg-orange-100 p-8 rounded-full mb-6">
          <Lightbulb className="h-16 w-16 text-orange-500" />
        </div>
        <h3 className="text-3xl font-bold mb-4">¡Conexión Perfecta!</h3>
        <p className="text-gray-600 mb-8">Has dominado el vocabulario.</p>
        <Button onClick={() => setMatched([])} className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-4 rounded-full">
          Reiniciar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-4">
          <h4 className="font-bold text-gray-500 mb-4 text-center uppercase tracking-widest">Palabras</h4>
          {pairs.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleWordClick(idx)}
              className={`p-6 rounded-xl cursor-pointer border-2 transition-all ${
                matched.includes(idx) 
                  ? "bg-green-100 border-green-400 opacity-50" 
                  : selectedWord === idx 
                    ? "bg-orange-100 border-orange-500 shadow-md" 
                    : "bg-white border-gray-200 hover:border-orange-300"
              }`}
            >
              <span className="font-bold text-lg text-gray-800">{item.word}</span>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-500 mb-4 text-center uppercase tracking-widest">Significados</h4>
          {shuffledDefs.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleDefClick(item.id)}
              className={`p-6 rounded-xl cursor-pointer border-2 transition-all ${
                matched.includes(item.id) 
                  ? "bg-green-100 border-green-400 opacity-50" 
                  : "bg-white border-gray-200 hover:border-orange-300"
              }`}
            >
              <span className="text-sm text-gray-600 leading-snug">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
