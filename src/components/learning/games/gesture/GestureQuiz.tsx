"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, CheckCircle2, XCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { getQuadrant } from "./gestureUtils";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface GestureQuizProps {
  questions: Question[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const QUADRANT_LABELS: Record<string, string> = { TL: "A", TR: "B", BL: "C", BR: "D" };
const QUADRANT_COLORS: Record<string, string> = {
  TL: "bg-blue-600/80",
  TR: "bg-purple-600/80",
  BL: "bg-green-600/80",
  BR: "bg-orange-600/80",
};
const QUADRANT_BORDER: Record<string, string> = {
  TL: "border-blue-400",
  TR: "border-purple-400",
  BL: "border-green-400",
  BR: "border-orange-400",
};
const DWELL_MS = 1800;
const COOLDOWN_MS = 2200;
const MAX_Q = 10;
const TIMER_S = 25;

export function GestureQuiz({ questions, onComplete, onExit }: GestureQuizProps) {
  // Stabilize pool so it doesn't change every render. useState init lets us
  // cap at 10 once; the underlying handler closures stay stable.
  const [pool] = useState(() => questions.slice(0, MAX_Q));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [dwellZone, setDwellZone] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_S);
  const [lastWrongChoice, setLastWrongChoice] = useState<number | null>(null);

  const { isActive, isLoading, error, getPosition, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const dwellZoneRef = useRef<string | null>(null);
  const dwellStartRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);
  const feedbackRef = useRef<"correct" | "wrong" | null>(null);
  const idxRef = useRef(idx);
  const scoreRef = useRef(score);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  const handleAnswer = useCallback((quadrant: string, fromTimeout = false) => {
    if (feedbackRef.current || !pool[idxRef.current]) return;
    const q = pool[idxRef.current];
    const optIdx = ["TL", "TR", "BL", "BR"].indexOf(quadrant);
    const correct = !fromTimeout && optIdx === q.correctAnswer;
    if (correct) scoreRef.current = scoreRef.current + 1;
    setScore(s => correct ? s + 1 : s);
    setFeedback(correct ? "correct" : "wrong");
    feedbackRef.current = correct ? "correct" : "wrong";
    setLastWrongChoice(correct ? null : optIdx);

    // Show the correct answer for 2.6s when the user got it wrong (or ran out
    // of time) so they actually learn. Faster path for correct answers.
    const delay = correct ? 1200 : 2600;

    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = null;
      setLastWrongChoice(null);
      const next = idxRef.current + 1;
      if (next >= pool.length) {
        setDone(true);
        onComplete?.(scoreRef.current, pool.length);
      } else {
        setIdx(next);
        setTimeLeft(TIMER_S);
      }
    }, delay);
  }, [pool, onComplete]);

  // Countdown timer — runs whether playing by gesture or click
  useEffect(() => {
    if (feedbackRef.current || done || pool.length === 0) return;
    setTimeLeft(TIMER_S);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time's up: fake a wrong answer (BR is the dummy quadrant, but we
          // pass fromTimeout=true so the answer is always marked wrong)
          handleAnswer("BR", true);
          return TIMER_S;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, done, pool.length, handleAnswer]);

  // Dwell detection loop (runs at 10fps to avoid re-render overload)
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (feedbackRef.current) return;
      const pos = getPosition();
      const now = Date.now();
      if (!pos || now - cooldownRef.current < COOLDOWN_MS) {
        if (dwellZoneRef.current) { dwellZoneRef.current = null; setDwellZone(null); setDwellProgress(0); }
        return;
      }
      const zone = getQuadrant(pos);
      if (!zone) return;
      if (zone !== dwellZoneRef.current) {
        dwellZoneRef.current = zone;
        dwellStartRef.current = now;
        setDwellZone(zone);
        setDwellProgress(0);
      } else {
        const elapsed = now - dwellStartRef.current;
        const prog = Math.min(elapsed / DWELL_MS, 1);
        setDwellProgress(prog);
        if (elapsed >= DWELL_MS) {
          cooldownRef.current = now;
          dwellZoneRef.current = null;
          setDwellZone(null);
          setDwellProgress(0);
          handleAnswer(zone);
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [isActive, getPosition, handleAnswer]);

  if (done || pool.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="h-16 w-16 text-yellow-400" />
        <h3 className="text-2xl font-bold text-white">¡Juego Completado!</h3>
        <p className="text-xl text-slate-300">Puntaje: <span className="text-purple-400 font-black">{score}</span> / {pool.length}</p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  const q = pool[idx];
  const quadrants: Array<{ key: string; label: string }> = [
    { key: "TL", label: q.options[0] || "A" },
    { key: "TR", label: q.options[1] || "B" },
    { key: "BL", label: q.options[2] || "C" },
    { key: "BR", label: q.options[3] || "D" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto p-4">
      {/* Progress + timer */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 tabular-nums">{idx + 1}/{pool.length}</span>
        <Progress value={((idx + 1) / pool.length) * 100} className="flex-1 h-2" />
        <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-orange-300"}`}>
          <Timer className="h-4 w-4" />{timeLeft}s
        </div>
        <span className="text-sm font-bold text-purple-300 tabular-nums">{score} pts</span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-slate-800 rounded-2xl p-5 text-center border border-purple-500/30"
        >
          <p className="text-sm text-purple-300 font-medium mb-1">Pregunta</p>
          <p className="text-lg font-bold text-white">{q.question}</p>
        </motion.div>
      </AnimatePresence>

      {/* 4 answer zones */}
      <div className="grid grid-cols-2 gap-3">
        {quadrants.map(({ key, label }, qIdx) => {
          const isDwelling = dwellZone === key;
          const isCorrectAnswer = qIdx === q.correctAnswer;
          const isWrongChosen = lastWrongChoice === qIdx;
          const showResult = feedback !== null;
          let extraCls = "border-white/10";
          if (showResult && isCorrectAnswer) extraCls = "border-green-400 ring-2 ring-green-400/60";
          else if (showResult && isWrongChosen) extraCls = "border-red-400 ring-2 ring-red-400/60 opacity-70";
          else if (isDwelling) extraCls = QUADRANT_BORDER[key];
          return (
            <motion.div
              key={key}
              className={`relative rounded-2xl p-4 border-2 cursor-pointer transition-all ${QUADRANT_COLORS[key]} ${extraCls}`}
              whileHover={!showResult ? { scale: 1.02 } : {}}
              onClick={() => !showResult && handleAnswer(key)}
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-2xl text-white/60">{QUADRANT_LABELS[key]}</span>
                <span className="text-sm font-medium text-white flex-1">{label}</span>
                {showResult && isCorrectAnswer && <CheckCircle2 className="h-5 w-5 text-green-300" />}
                {showResult && isWrongChosen && <XCircle className="h-5 w-5 text-red-300" />}
              </div>
              {isDwelling && !showResult && (
                <div className="absolute bottom-1.5 left-2 right-2 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${dwellProgress * 100}%` }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {feedback && q.options[q.correctAnswer] && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-2 text-center text-sm border ${
            feedback === "correct"
              ? "bg-green-900/40 text-green-200 border-green-500/40"
              : "bg-red-900/40 text-red-100 border-red-500/40"
          }`}
        >
          {feedback === "correct" ? (
            <>✅ Respuesta correcta: <strong>{q.options[q.correctAnswer]}</strong></>
          ) : (
            <>❌ La respuesta correcta era: <strong>{q.options[q.correctAnswer]}</strong></>
          )}
        </motion.div>
      )}

      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 rounded-2xl ${
              feedback === "correct" ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            {feedback === "correct" ? (
              <CheckCircle2 className="h-20 w-20 text-green-400" />
            ) : (
              <XCircle className="h-20 w-20 text-red-400" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera */}
      <div className="flex justify-center mt-2">
        <GestureCamUI
          videoRef={videoRef}
          canvasRef={canvasRef}
          isActive={isActive}
          isLoading={isLoading}
          error={error}
          onStart={startCamera}
          onStop={stopCamera}
          statusLabel={dwellZone ? `Señalando: ${QUADRANT_LABELS[dwellZone]}` : "Mueve la mano a la respuesta"}
        />
      </div>

      <p className="text-center text-xs text-slate-500">
        🎮 TL=A · TR=B · BL=C · BR=D — mantén la mano en la zona para responder
      </p>
    </div>
  );
}
