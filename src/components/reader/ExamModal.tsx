"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

export default function ExamModal({ isOpen, onClose, bookTitle, bookId }: { isOpen: boolean; onClose: () => void; bookTitle: string; bookId?: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [passScore, setPassScore] = useState(60);
  const [allowRetake, setAllowRetake] = useState(false);

  React.useEffect(() => {
    if (isOpen && bookId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch quiz content and settings
          const res = await fetch(`/api/books/${bookId}/quiz`);
          const data = await res.json();
          
          if (data.quiz && data.quiz.content) {
            setPassScore(data.passScore || 60);
            setAllowRetake(data.allowMultipleAttempts || false);
            
            const parsed = typeof data.quiz.content === 'string' ? JSON.parse(data.quiz.content) : data.quiz.content;
            const qList = parsed.questions || [];
            if (qList.length > 0) {
              setQuestions(qList.map((q: any) => ({
                id: q.id,
                text: q.question || q.text,
                options: q.options || [],
                correctAnswer: q.correctAnswer
              })));
            } else {
              setError("Este libro no tiene preguntas configuradas todavía.");
            }

            // Check for previous attempts
            try {
              const attemptRes = await fetch(`/api/books/${bookId}/attempts`);
              const attemptData = await attemptRes.json();
              if (attemptData.hasAttempt && !data.allowMultipleAttempts) {
                setAlreadyCompleted(true);
              }
            } catch (e) {
               console.warn("Could not check attempts", e);
            }
          } else {
            setError("No se encontró un examen para este libro.");
          }
        } catch (err) {
          console.error("Error fetching quiz:", err);
          setError("Error al cargar el examen.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, bookId]);

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleNext = async () => {
    if (selectedOption === null) return;

    let newScore = score;
    if (selectedOption === questions[currentQuestion].correctAnswer) {
      newScore = score + 1;
      setScore(newScore);
    }

    setIsAnswered(true);

    setTimeout(async () => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        setShowResult(true);
        // Save result to DB
        try {
          await fetch(`/api/books/${bookId}/attempts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              score: newScore,
              totalQuestions: questions.length,
              passed: (newScore / questions.length) * 100 >= passScore
            })
          });
        } catch (err) {
          console.error("Failed to save attempt:", err);
        }
      }
    }, 1500);
  };

  const resetExam = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setScore(0);
    setShowResult(false);
    setIsAnswered(false);
  };

  if (!isOpen) return null;

  const currentPass = questions.length > 0 && (score / questions.length) * 100 >= passScore;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:max-w-full print:rounded-none"
        >
          <div className="bg-indigo-600 p-6 flex justify-between items-center no-print print:hidden">
            <div>
              <h2 className="text-2xl font-bold text-white">Examen de Comprensión</h2>
              <p className="text-indigo-100 text-sm">{bookTitle}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-8">
            {/* Print Header */}
            <div className="hidden print:block text-center mb-8 border-b pb-4">
              <h1 className="text-3xl font-bold text-indigo-300">Evidencia de Evaluación - Leyópolis</h1>
              <div className="mt-4 grid grid-cols-2 text-left gap-4 max-w-md mx-auto">
                <p><span className="font-bold">Libro:</span> {bookTitle}</p>
                <p><span className="font-bold">Fecha:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold">Calificación:</span> {score} / {questions.length} ({Math.round((score/(questions.length||1))*100)}%)</p>
                <p><span className="font-bold">Resultado:</span> {currentPass ? "APROBADO" : "REPROBADO"}</p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 print:hidden">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
                <p className="text-muted-foreground">Cargando preguntas oficiales...</p>
              </div>
            ) : alreadyCompleted ? (
              <div className="text-center py-12 print:hidden">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Examen ya realizado</h3>
                <p className="text-muted-foreground mb-6">Ya has completado este examen y solo se permite un intento. Contacta al administrador si necesitas repetir la prueba.</p>
                <Button onClick={onClose} className="bg-indigo-600">Volver a la lectura</Button>
              </div>
            ) : error ? (
              <div className="text-center py-12 print:hidden">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">¡Ups!</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={onClose} className="bg-indigo-600">Volver a la lectura</Button>
              </div>
            ) : !showResult && questions.length > 0 ? (
              <>
                <div className="mb-6 space-y-2 print:hidden">
                  <div className="flex justify-between text-sm text-muted-foreground font-medium">
                    <span>Pregunta {currentQuestion + 1} de {questions.length}</span>
                    <span>{Math.round(((currentQuestion) / questions.length) * 100)}% Completado</span>
                  </div>
                  <Progress value={((currentQuestion) / questions.length) * 100} className="h-2" />
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-6">
                  {questions[currentQuestion].text}
                </h3>

                <div className="space-y-3 mb-8">
                  {questions[currentQuestion].options?.map((option, index) => {
                    let optionClass = "border-2 border-border hover:border-indigo-300 hover:bg-indigo-500/10";
                    
                    if (isAnswered) {
                      if (index === questions[currentQuestion].correctAnswer) {
                        optionClass = "border-green-500 bg-green-50 text-green-700";
                      } else if (index === selectedOption) {
                        optionClass = "border-red-500 bg-red-50 text-red-700";
                      } else {
                        optionClass = "border-border text-gray-400 opacity-50";
                      }
                    } else if (selectedOption === index) {
                      optionClass = "border-indigo-600 bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-600";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleOptionSelect(index)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 font-medium flex justify-between items-center ${optionClass}`}
                      >
                        <span>{option}</span>
                        {isAnswered && index === questions[currentQuestion].correctAnswer && (
                          <CheckCircle className="text-green-600" size={20} />
                        )}
                        {isAnswered && index === selectedOption && index !== questions[currentQuestion].correctAnswer && (
                          <AlertCircle className="text-red-600" size={20} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end print:hidden">
                  <Button 
                    onClick={handleNext} 
                    disabled={selectedOption === null || isAnswered}
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                  >
                    {isAnswered ? "Siguiente..." : "Confirmar Respuesta"}
                  </Button>
                </div>
              </>
            ) : showResult ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center p-6 bg-yellow-100 rounded-full mb-6 print:hidden">
                  {currentPass ? (
                    <Award size={64} className="text-yellow-600" />
                  ) : (
                    <AlertCircle size={64} className="text-red-600" />
                  )}
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-2">
                  {currentPass ? "¡Felicidades, Aprobaste!" : "Evaluación Finalizada"}
                </h3>
                <div className="mb-4">
                  <Badge className={currentPass ? "bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1 text-lg" : "bg-red-100 text-red-700 hover:bg-red-100 px-4 py-1 text-lg"}>
                    {currentPass ? "APROBADO" : "REPROBADO"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-8 print:hidden">
                  {currentPass 
                    ? "Has demostrado un excelente conocimiento de la lectura." 
                    : "Te recomendamos volver a leer los puntos clave para mejorar tu nivel."}
                </p>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                  <div className="bg-muted p-4 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Puntuación</p>
                    <p className="text-4xl font-black text-indigo-400">{score}/{questions.length}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Precisión</p>
                    <p className="text-4xl font-black text-green-600">{Math.round((score / (questions.length||1)) * 100)}%</p>
                  </div>
                </div>

                <div className="flex justify-center gap-4 no-print print:hidden">
                  <Button variant="outline" onClick={() => window.print()} size="lg" className="border-indigo-500/50/30 text-indigo-300">
                    Descargar Evidencia
                  </Button>
                  <Button variant="outline" onClick={onClose} size="lg">Cerrar</Button>
                  {(allowRetake || !currentPass) && (
                    <Button onClick={resetExam} size="lg" className="bg-indigo-600 hover:bg-indigo-700">Intentar de Nuevo</Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
