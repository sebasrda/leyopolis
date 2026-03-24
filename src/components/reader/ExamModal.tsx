"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "¿Quién es el protagonista principal de 'La Isla del Tesoro'?",
    options: ["Long John Silver", "Jim Hawkins", "Dr. Livesey", "Capitán Smollett"],
    correctAnswer: 1
  },
  {
    id: 2,
    text: "¿Qué buscaban los piratas en la isla?",
    options: ["Un barco perdido", "Agua potable", "El tesoro del Capitán Flint", "Un refugio secreto"],
    correctAnswer: 2
  },
  {
    id: 3,
    text: "¿Cómo se llamaba la posada de la familia de Jim?",
    options: ["El Almirante Benbow", "El Spyglass", "La Hispaniola", "El Loro Verde"],
    correctAnswer: 0
  },
  {
    id: 4,
    text: "¿Qué animal tenía Long John Silver siempre en su hombro?",
    options: ["Un mono", "Un gato", "Un loro", "Una rata"],
    correctAnswer: 2
  },
  {
    id: 5,
    text: "¿Quién fue el primero en hablar del mapa del tesoro?",
    options: ["Billy Bones", "Pew el Ciego", "Black Dog", "Ben Gunn"],
    correctAnswer: 0
  }
];

export default function ExamModal({ isOpen, onClose, bookTitle }: { isOpen: boolean; onClose: () => void; bookTitle: string }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    // Check answer
    if (selectedOption === SAMPLE_QUESTIONS[currentQuestion].correctAnswer) {
      setScore(prev => prev + 1);
    }

    setIsAnswered(true);

    // Wait a bit before showing next question or result
    setTimeout(() => {
      if (currentQuestion < SAMPLE_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        setShowResult(true);
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
            <div>
              <h2 className="text-2xl font-bold">Examen de Comprensión</h2>
              <p className="text-indigo-200 text-sm">{bookTitle}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/20 text-white">
              <X size={24} />
            </Button>
          </div>

          <div className="p-8">
            {!showResult ? (
              <>
                {/* Progress Bar */}
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500 font-medium">
                    <span>Pregunta {currentQuestion + 1} de {SAMPLE_QUESTIONS.length}</span>
                    <span>{Math.round(((currentQuestion) / SAMPLE_QUESTIONS.length) * 100)}% Completado</span>
                  </div>
                  <Progress value={((currentQuestion) / SAMPLE_QUESTIONS.length) * 100} className="h-2" />
                </div>

                {/* Question */}
                <h3 className="text-xl font-semibold text-gray-800 mb-6">
                  {SAMPLE_QUESTIONS[currentQuestion].text}
                </h3>

                {/* Options */}
                <div className="space-y-3 mb-8">
                  {SAMPLE_QUESTIONS[currentQuestion].options.map((option, index) => {
                    let optionClass = "border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50";
                    
                    if (isAnswered) {
                      if (index === SAMPLE_QUESTIONS[currentQuestion].correctAnswer) {
                        optionClass = "border-green-500 bg-green-50 text-green-700";
                      } else if (index === selectedOption) {
                        optionClass = "border-red-500 bg-red-50 text-red-700";
                      } else {
                        optionClass = "border-gray-100 text-gray-400 opacity-50";
                      }
                    } else if (selectedOption === index) {
                      optionClass = "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleOptionSelect(index)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 font-medium flex justify-between items-center ${optionClass}`}
                      >
                        <span>{option}</span>
                        {isAnswered && index === SAMPLE_QUESTIONS[currentQuestion].correctAnswer && (
                          <CheckCircle className="text-green-600" size={20} />
                        )}
                        {isAnswered && index === selectedOption && index !== SAMPLE_QUESTIONS[currentQuestion].correctAnswer && (
                          <AlertCircle className="text-red-600" size={20} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Action */}
                <div className="flex justify-end">
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
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center p-6 bg-yellow-100 rounded-full mb-6">
                  <Award size={64} className="text-yellow-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-2">¡Examen Completado!</h3>
                <p className="text-gray-500 mb-8">Has demostrado un gran conocimiento sobre la lectura.</p>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Puntuación</p>
                    <p className="text-4xl font-black text-indigo-600">{score}/{SAMPLE_QUESTIONS.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Precisión</p>
                    <p className="text-4xl font-black text-green-600">{Math.round((score / SAMPLE_QUESTIONS.length) * 100)}%</p>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={onClose} size="lg">Cerrar</Button>
                  <Button onClick={resetExam} size="lg" className="bg-indigo-600 hover:bg-indigo-700">Intentar de Nuevo</Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
