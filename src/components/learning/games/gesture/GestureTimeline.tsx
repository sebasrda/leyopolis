"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { getSide } from "./gestureUtils";

interface Props {
  events: string[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const DWELL_MS = 1600;
const COOLDOWN_MS = 2000;
const TIMER_S = 20;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GestureTimeline({ events, onComplete, onExit }: Props) {
  // Build pairs ONCE so the array identity is stable across renders. Before
  // pairs was recomputed every render, which made handleSide's closure unstable.
  const [pairs] = useState<Array<[string, string, 0 | 1]>>(() => {
    const ordered = events.slice(0, 6);
    const out: Array<[string, string, 0 | 1]> = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      const swapped = Math.random() > 0.5;
      if (swapped) out.push([ordered[i + 1], ordered[i], 1]);
      else out.push([ordered[i], ordered[i + 1], 0]);
    }
    return out;
  });

  const [pairIdx, setPairIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [dwellSide, setDwellSide] = useState<"left" | "right" | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isActive, isLoading, error, getPosition, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const dwellSideRef = useRef<"left" | "right" | null>(null);
  const dwellStartRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);
  const feedbackRef = useRef<"correct" | "wrong" | null>(null);
  const pairIdxRef = useRef(pairIdx);
  const scoreRef = useRef(score);

  useEffect(() => { pairIdxRef.current = pairIdx; }, [pairIdx]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  const handleSide = useCallback((side: "left" | "right" | "timeout") => {
    if (feedbackRef.current || pairs.length === 0) return;
    const pair = pairs[pairIdxRef.current];
    if (!pair) return;
    const [, , firstIsIdx] = pair;
    const correct = side !== "timeout" && (
      (side === "left" && firstIsIdx === 0) || (side === "right" && firstIsIdx === 1)
    );
    if (correct) scoreRef.current += 1;
    setScore(s => correct ? s + 1 : s);
    setFeedback(correct ? "correct" : "wrong");
    feedbackRef.current = correct ? "correct" : "wrong";
    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = null;
      const next = pairIdxRef.current + 1;
      if (next >= pairs.length) {
        setDone(true);
        onComplete?.(scoreRef.current, pairs.length);
      } else {
        setPairIdx(next);
        setTimeLeft(TIMER_S);
      }
    }, 1800);
  }, [pairs, onComplete]);

  // Countdown timer — independent of camera state so the clock always ticks
  useEffect(() => {
    if (feedbackRef.current || done || pairs.length === 0) return;
    setTimeLeft(TIMER_S);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleSide("timeout");
          return TIMER_S;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pairIdx, done, pairs.length, handleSide]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (feedbackRef.current) return;
      const pos = getPosition();
      const now = Date.now();
      if (!pos || now - cooldownRef.current < COOLDOWN_MS) {
        if (dwellSideRef.current) { dwellSideRef.current = null; setDwellSide(null); setDwellProgress(0); }
        return;
      }
      const side = getSide(pos);
      if (!side) return;
      if (side !== dwellSideRef.current) {
        dwellSideRef.current = side;
        dwellStartRef.current = now;
        setDwellSide(side);
        setDwellProgress(0);
      } else {
        const elapsed = now - dwellStartRef.current;
        const prog = Math.min(elapsed / DWELL_MS, 1);
        setDwellProgress(prog);
        if (elapsed >= DWELL_MS) {
          cooldownRef.current = now;
          dwellSideRef.current = null;
          setDwellSide(null);
          setDwellProgress(0);
          handleSide(side);
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [isActive, getPosition, handleSide]);

  if (done || pairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="h-16 w-16 text-yellow-400" />
        <h3 className="text-2xl font-bold text-white">¡Cronología completada!</h3>
        <p className="text-xl text-slate-300">Puntaje: <span className="text-purple-400 font-black">{score}</span> / {pairs.length}</p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  const pair = pairs[pairIdx];

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4 relative">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 tabular-nums">{pairIdx + 1}/{pairs.length}</span>
        <Progress value={((pairIdx + 1) / pairs.length) * 100} className="flex-1 h-2" />
        <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-orange-300"}`}>
          <Timer className="h-4 w-4" />{timeLeft}s
        </div>
        <span className="text-sm font-bold text-purple-300 tabular-nums">{score} pts</span>
      </div>

      <div className="bg-slate-800 rounded-2xl p-4 text-center border border-purple-500/30">
        <p className="text-purple-300 font-medium">⏱ ¿Cuál ocurrió primero?</p>
        <p className="text-xs text-slate-400 mt-1">Mueve la mano hacia el evento que ocurrió antes en la historia</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={pairIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-4">
          {/* Left event */}
          <motion.div
            className={`rounded-2xl p-5 border-2 cursor-pointer transition-all flex flex-col gap-3 ${
              dwellSide === "left"
                ? "bg-blue-600/50 border-blue-400"
                : "bg-slate-700/60 border-white/10"
            }`}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleSide("left")}
          >
            <div className="flex items-center gap-2 text-blue-300">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Opción izquierda</span>
            </div>
            <p className="text-sm text-white font-medium">{pair[0]}</p>
            {dwellSide === "left" && (
              <div className="h-1 bg-blue-900/50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${dwellProgress * 100}%` }} />
              </div>
            )}
          </motion.div>

          {/* Right event */}
          <motion.div
            className={`rounded-2xl p-5 border-2 cursor-pointer transition-all flex flex-col gap-3 ${
              dwellSide === "right"
                ? "bg-orange-600/50 border-orange-400"
                : "bg-slate-700/60 border-white/10"
            }`}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleSide("right")}
          >
            <div className="flex items-center gap-2 text-orange-300 justify-end">
              <span className="text-xs font-bold uppercase tracking-wide">Opción derecha</span>
              <ArrowRight className="h-4 w-4" />
            </div>
            <p className="text-sm text-white font-medium">{pair[1]}</p>
            {dwellSide === "right" && (
              <div className="h-1 bg-orange-900/50 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${dwellProgress * 100}%` }} />
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-3"
          >
            {feedback === "correct" ? (
              <>
                <CheckCircle2 className="h-20 w-20 text-green-400" />
                <span className="text-green-300 font-black text-xl">¡Correcto!</span>
                <div className="bg-green-900/80 border border-green-500/40 rounded-xl px-4 py-2 text-center max-w-md">
                  <p className="text-[10px] uppercase tracking-wide text-green-300/80">Orden cronológico</p>
                  <p className="text-sm text-white font-medium mt-1">
                    1º <span className="text-green-200">{pair[pair[2]]}</span>
                  </p>
                  <p className="text-sm text-white font-medium">
                    2º <span className="text-green-200">{pair[pair[2] === 0 ? 1 : 0]}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-20 w-20 text-red-400" />
                <span className="text-red-300 font-black text-xl">Incorrecto</span>
                <div className="bg-red-900/80 border border-red-500/40 rounded-xl px-4 py-2 text-center max-w-md">
                  <p className="text-[10px] uppercase tracking-wide text-red-300/80">Respuesta correcta</p>
                  <p className="text-sm text-white font-bold mt-1">
                    1º ocurrió: <span className="text-yellow-200">{pair[pair[2]]}</span>
                  </p>
                  <p className="text-sm text-white mt-0.5">
                    2º ocurrió: <span className="text-slate-300">{pair[pair[2] === 0 ? 1 : 0]}</span>
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center">
        <GestureCamUI
          videoRef={videoRef} canvasRef={canvasRef}
          isActive={isActive} isLoading={isLoading} error={error}
          onStart={startCamera} onStop={stopCamera}
          statusLabel="Izquierda o derecha — ¿cuál fue primero?"
        />
      </div>
    </div>
  );
}
