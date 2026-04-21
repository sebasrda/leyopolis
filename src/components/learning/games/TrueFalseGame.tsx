"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trophy, Timer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Statement {
  text: string;
  isTrue: boolean;
}

interface TrueFalseGameProps {
  statements: Statement[];
  onComplete: (score: number, maxScore: number) => void;
  onExit?: () => void;
}

export function TrueFalseGame({ statements, onComplete, onExit }: TrueFalseGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  if (!statements || statements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-2 border-indigo-50 dark:border-indigo-900/20">
          <AlertCircle className="h-12 w-12 text-indigo-400 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500 dark:text-gray-400 italic">No hay suficientes afirmaciones para este libro.</p>
          <Button onClick={onExit} variant="outline" className="mt-6">Volver</Button>
        </div>
      </div>
    );
  }

  const [showFeedback, setShowFeedback] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds per statement

  const currentStatement = statements[currentIndex];

  useEffect(() => {
    if (isFinished || showFeedback !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null); // Timeout is wrong
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isFinished, showFeedback]);

  const handleAnswer = (userAnswer: boolean | null) => {
    const correct = userAnswer === currentStatement.isTrue;
    setShowFeedback(correct);
    if (correct) setScore((s) => s + 1);

    setTimeout(() => {
      if (currentIndex < statements.length - 1) {
        setCurrentIndex((i) => i + 1);
        setShowFeedback(null);
        setTimeLeft(15);
      } else {
        setIsFinished(true);
        onComplete(score + (correct ? 1 : 0), statements.length);
      }
    }, 1500);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full border-b-8 border-indigo-200">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">¡Misión Cumplida!</h2>
          <p className="text-gray-500 mb-8">Has completado el reto de Verdad o Falso.</p>
          <div className="text-5xl font-black text-indigo-600 mb-8">{score} / {statements.length}</div>
          <Button onClick={onExit} className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 rounded-2xl text-xl font-bold">Continuar</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col items-center justify-center h-full gap-8">
      {/* Header Info */}
      <div className="w-full flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm font-bold text-indigo-600">Pregunta {currentIndex + 1} / {statements.length}</div>
        <div className={`flex items-center gap-2 font-mono text-xl ${timeLeft < 5 ? "text-red-500 animate-pulse" : "text-gray-600"}`}>
          <Timer size={24} /> {timeLeft}s
        </div>
      </div>

      {/* Statement Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className={`w-full min-h-[200px] bg-white border-4 p-8 rounded-[2.5rem] shadow-xl flex items-center justify-center text-center transition-colors duration-300 ${
            showFeedback === true ? "border-green-500 bg-green-50" : 
            showFeedback === false ? "border-red-500 bg-red-50" : "border-indigo-100"
          }`}
        >
          <p className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
            {currentStatement?.text || "Cargando afirmación..."}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
        <Button
          onClick={() => handleAnswer(true)}
          disabled={showFeedback !== null}
          className="h-24 bg-green-500 hover:bg-green-600 text-white rounded-[2rem] text-2xl font-black shadow-lg shadow-green-100 active:scale-95 transition-all"
        >
          <Check size={32} className="mr-2" /> VERDAD
        </Button>
        <Button
          onClick={() => handleAnswer(false)}
          disabled={showFeedback !== null}
          className="h-24 bg-red-500 hover:bg-red-600 text-white rounded-[2rem] text-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-all"
        >
          <X size={32} className="mr-2" /> FALSO
        </Button>
      </div>

      {/* Feedback Overlay */}
      {showFeedback !== null && (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute">
          {showFeedback ? (
            <div className="bg-green-500 text-white p-6 rounded-full shadow-2xl"><Check size={64} strokeWidth={4} /></div>
          ) : (
            <div className="bg-red-500 text-white p-6 rounded-full shadow-2xl"><X size={64} strokeWidth={4} /></div>
          )}
        </motion.div>
      )}
    </div>
  );
}
