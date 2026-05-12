"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, CheckCircle2, XCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { getSide } from "./gestureUtils";

interface Statement {
  text: string;
  isTrue: boolean;
}

interface Props {
  statements: Statement[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const DWELL_MS = 2000;
const COOLDOWN_MS = 2000;
const TIMER_S = 15;

export function GestureVerdaderoFalso({ statements, onComplete, onExit }: Props) {
  // Defensive normalization: API may occasionally hand us legacy shapes.
  const pool = (statements || [])
    .map((it: any) => {
      if (!it) return null;
      if (typeof it === "string") return { text: it.trim(), isTrue: true };
      const text = String(it.text ?? it.statement ?? it.affirmation ?? it.sentence ?? "").trim();
      if (!text) return null;
      return { text, isTrue: Boolean(it.isTrue ?? it.is_true ?? it.correct ?? true) };
    })
    .filter(Boolean)
    .slice(0, 10) as Statement[];
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_S);
  const [dwellSide, setDwellSide] = useState<"left" | "right" | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const { isActive, isLoading, error, getPosition, videoRef, canvasRef, startCamera, stopCamera, calibrate, resetCalibration, calibrated } = useGestureCam();

  const dwellSideRef = useRef<"left" | "right" | null>(null);
  const dwellStartRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);
  const feedbackRef = useRef<"correct" | "wrong" | null>(null);
  const idxRef = useRef(idx);
  const scoreRef = useRef(score);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  const advance = useCallback((isCorrect: boolean) => {
    if (feedbackRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (isCorrect) scoreRef.current += 1;
    setScore(s => isCorrect ? s + 1 : s);
    setFeedback(isCorrect ? "correct" : "wrong");
    feedbackRef.current = isCorrect ? "correct" : "wrong";
    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = null;
      const next = idxRef.current + 1;
      if (next >= pool.length) {
        setDone(true);
        onComplete?.(scoreRef.current, pool.length);
      } else {
        setIdx(next);
        setTimeLeft(TIMER_S);
      }
    }, 1200);
  }, [pool.length, onComplete]);

  const handleSide = useCallback((side: "left" | "right") => {
    const st = pool[idxRef.current];
    if (!st) return;
    // left = Falso, right = Verdadero
    const answeredTrue = side === "right";
    advance(answeredTrue === st.isTrue);
  }, [pool, advance]);

  // Countdown timer — runs whether the user plays by gesture OR by click, so
  // the clock visibly ticks even without camera activated.
  useEffect(() => {
    if (feedbackRef.current || done) return;
    setTimeLeft(TIMER_S);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          advance(false);
          return TIMER_S;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, done, advance]);

  // Dwell detection
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

  if (done || pool.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="h-16 w-16 text-yellow-400" />
        <h3 className="text-2xl font-bold text-white">¡Completado!</h3>
        <p className="text-xl text-slate-300">Puntaje: <span className="text-purple-400 font-black">{score}</span> / {pool.length}</p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  const st = pool[idx];

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4 relative">
      {/* Progress + timer */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{idx + 1}/{pool.length}</span>
        <Progress value={((idx + 1) / pool.length) * 100} className="flex-1 h-2" />
        <div className="flex items-center gap-1 text-sm font-bold text-orange-300">
          <Timer className="h-4 w-4" />{timeLeft}s
        </div>
      </div>

      {/* Statement */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-slate-800 rounded-2xl p-6 text-center border border-purple-500/30"
        >
          <p className="text-sm text-purple-300 mb-2">¿Verdadero o Falso?</p>
          <p className="text-lg font-semibold text-white">{st.text}</p>
        </motion.div>
      </AnimatePresence>

      {/* V / F zones */}
      <div className="grid grid-cols-2 gap-4">
        {/* Falso — left */}
        <motion.div
          className={`rounded-2xl p-6 border-2 cursor-pointer flex flex-col items-center gap-2 transition-all ${
            dwellSide === "left"
              ? "bg-red-600/60 border-red-400"
              : "bg-red-900/30 border-red-800/40"
          }`}
          whileHover={{ scale: 1.03 }}
          onClick={() => handleSide("left")}
        >
          <XCircle className="h-10 w-10 text-red-400" />
          <span className="text-xl font-black text-red-300">FALSO</span>
          <span className="text-xs text-red-400/70">← Mano a la izquierda</span>
          {dwellSide === "left" && (
            <div className="w-full h-1 bg-red-900/50 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${dwellProgress * 100}%` }} />
            </div>
          )}
        </motion.div>

        {/* Verdadero — right */}
        <motion.div
          className={`rounded-2xl p-6 border-2 cursor-pointer flex flex-col items-center gap-2 transition-all ${
            dwellSide === "right"
              ? "bg-green-600/60 border-green-400"
              : "bg-green-900/30 border-green-800/40"
          }`}
          whileHover={{ scale: 1.03 }}
          onClick={() => handleSide("right")}
        >
          <CheckCircle2 className="h-10 w-10 text-green-400" />
          <span className="text-xl font-black text-green-300">VERDADERO</span>
          <span className="text-xs text-green-400/70">Mano a la derecha →</span>
          {dwellSide === "right" && (
            <div className="w-full h-1 bg-green-900/50 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${dwellProgress * 100}%` }} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Feedback — always reveals the correct answer to support learning */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-3 rounded-2xl bg-black/40 backdrop-blur-sm p-4"
          >
            {feedback === "correct"
              ? <CheckCircle2 className="h-20 w-20 text-green-400 drop-shadow-2xl" />
              : <XCircle className="h-20 w-20 text-red-400 drop-shadow-2xl" />
            }
            <span className="text-white font-black text-2xl drop-shadow-lg">
              {feedback === "correct" ? "¡Correcto!" : "Respuesta incorrecta"}
            </span>
            <div className={`pointer-events-auto max-w-md rounded-xl px-5 py-3 text-center border ${
              st.isTrue ? "bg-green-900/70 border-green-500/40" : "bg-red-900/70 border-red-500/40"
            }`}>
              <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1">La respuesta correcta es</p>
              <p className="text-2xl font-black text-white">
                {st.isTrue ? "VERDADERO" : "FALSO"}
              </p>
              <p className="text-sm text-white/90 mt-2 italic">«{st.text}»</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center mt-2">
        <GestureCamUI
          videoRef={videoRef} canvasRef={canvasRef}
          isActive={isActive} isLoading={isLoading} error={error}
          onStart={startCamera} onStop={stopCamera}
          statusLabel={dwellSide ? `Eligiendo: ${dwellSide === "left" ? "FALSO" : "VERDADERO"}` : "Izquierda=Falso · Derecha=Verdadero"}
          onCalibrate={calibrate}
          onResetCalibration={resetCalibration}
          calibrated={calibrated}
        />
      </div>
    </div>
  );
}
