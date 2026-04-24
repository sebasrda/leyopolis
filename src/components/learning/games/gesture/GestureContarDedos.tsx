"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, CheckCircle2, XCircle, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";

interface CountingQuestion {
  question: string;
  answer: number; // 1-5
  hint: string;
}

interface Props {
  questions: CountingQuestion[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const HOLD_MS = 2000;
const FEEDBACK_MS = 1400;

const DEFAULT_QUESTIONS: CountingQuestion[] = [
  { question: "¿Cuántos dedos tiene una mano?", answer: 5, hint: "Abre toda la mano" },
  { question: "Muestra 3 dedos", answer: 3, hint: "Índice, medio y anular" },
  { question: "Muestra 1 dedo", answer: 1, hint: "Solo el índice" },
  { question: "Muestra 4 dedos", answer: 4, hint: "Todos menos el pulgar" },
  { question: "Muestra 2 dedos", answer: 2, hint: "Índice y medio (✌️)" },
];

export function GestureContarDedos({ questions, onComplete, onExit }: Props) {
  const pool = (questions && questions.length > 0 ? questions : DEFAULT_QUESTIONS).slice(0, 8);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const { isActive, isLoading, error, gestureState, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const holdStartRef = useRef<number | null>(null);
  const cooldownRef = useRef<number>(0);
  const feedbackRef = useRef<"correct" | "wrong" | null>(null);
  const idxRef = useRef(idx);
  const scoreRef = useRef(score);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Reset hold when finger count changes
  useEffect(() => {
    holdStartRef.current = null;
    setHoldProgress(0);
  }, [gestureState.fingerCount]);

  // Hold detection: if current fingerCount matches answer, hold for HOLD_MS
  useEffect(() => {
    if (!isActive || !gestureState.isHandDetected || feedbackRef.current) return;
    const q = pool[idxRef.current];
    if (!q) return;
    const now = Date.now();
    if (now - cooldownRef.current < 1800) return;

    if (gestureState.fingerCount === q.answer) {
      if (holdStartRef.current === null) holdStartRef.current = Date.now();
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(elapsed / HOLD_MS, 1));
      if (elapsed >= HOLD_MS) {
        holdStartRef.current = null;
        cooldownRef.current = Date.now();
        setHoldProgress(0);
        scoreRef.current += 1;
        setScore(s => s + 1);
        setFeedback("correct");
        feedbackRef.current = "correct";
        setTimeout(() => {
          setFeedback(null);
          feedbackRef.current = null;
          const next = idxRef.current + 1;
          if (next >= pool.length) {
            setDone(true);
            onComplete?.(scoreRef.current, pool.length);
          } else {
            setIdx(next);
          }
        }, FEEDBACK_MS);
      }
    } else {
      holdStartRef.current = null;
      setHoldProgress(0);
    }
  }, [isActive, gestureState, pool, onComplete]);

  const handleSkip = () => {
    if (feedbackRef.current) return;
    cooldownRef.current = Date.now();
    setFeedback("wrong");
    feedbackRef.current = "wrong";
    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = null;
      const next = idxRef.current + 1;
      if (next >= pool.length) {
        setDone(true);
        onComplete?.(scoreRef.current, pool.length);
      } else {
        setIdx(next);
      }
    }, FEEDBACK_MS);
  };

  if (done || pool.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="h-16 w-16 text-yellow-400" />
        <h3 className="text-2xl font-bold text-white">¡Bien hecho!</h3>
        <p className="text-xl text-slate-300">Puntaje: <span className="text-purple-400 font-black">{score}</span> / {pool.length}</p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  const q = pool[idx];
  const currentCount = gestureState.fingerCount;

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto p-4 relative">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{idx + 1}/{pool.length}</span>
        <Progress value={((idx + 1) / pool.length) * 100} className="flex-1 h-2" />
        <span className="text-sm font-bold text-purple-300">{score} pts</span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-slate-800 rounded-2xl p-6 text-center border border-purple-500/30"
        >
          <p className="text-sm text-purple-300 mb-2">✋ Responde con tus dedos</p>
          <p className="text-lg font-bold text-white">{q.question}</p>
          <p className="text-xs text-slate-400 mt-2">💡 {q.hint}</p>
        </motion.div>
      </AnimatePresence>

      {/* Finger count display */}
      <div className="flex items-center justify-center gap-8">
        {/* Current detected fingers */}
        <div className="flex flex-col items-center">
          <div className={`h-20 w-20 rounded-full border-4 flex items-center justify-center text-4xl font-black transition-all ${
            gestureState.isHandDetected
              ? currentCount === q.answer
                ? "border-green-400 bg-green-500/20 text-green-300"
                : "border-purple-400 bg-purple-500/20 text-white"
              : "border-slate-600 bg-slate-700/30 text-slate-500"
          }`}>
            {gestureState.isHandDetected ? currentCount : "?"}
          </div>
          <span className="text-xs text-slate-400 mt-1">Tus dedos</span>
        </div>

        {/* Hold progress ring */}
        {holdProgress > 0 && (
          <div className="flex flex-col items-center">
            <div className="relative h-20 w-20">
              <svg className="absolute inset-0" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke="#a78bfa" strokeWidth="8"
                  strokeDasharray={`${holdProgress * 213.6} 213.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-purple-300 font-bold text-sm">
                {Math.round(holdProgress * 100)}%
              </div>
            </div>
            <span className="text-xs text-purple-400 mt-1">Mantén</span>
          </div>
        )}

        {/* Target */}
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 rounded-full border-4 border-yellow-400 bg-yellow-500/10 flex items-center justify-center text-4xl font-black text-yellow-300">
            {q.answer}
          </div>
          <span className="text-xs text-slate-400 mt-1">Respuesta</span>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            {feedback === "correct"
              ? <CheckCircle2 className="h-24 w-24 text-green-400" />
              : <XCircle className="h-24 w-24 text-red-400" />
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera */}
      <div className="flex justify-center">
        <GestureCamUI
          videoRef={videoRef} canvasRef={canvasRef}
          isActive={isActive} isLoading={isLoading} error={error}
          onStart={startCamera} onStop={stopCamera}
          statusLabel={gestureState.isHandDetected ? `Detectando: ${currentCount} dedo(s)` : "Muestra tu mano a la cámara"}
        />
      </div>

      <Button variant="ghost" size="sm" onClick={handleSkip} className="text-slate-500 mx-auto">
        Saltar pregunta →
      </Button>
    </div>
  );
}
