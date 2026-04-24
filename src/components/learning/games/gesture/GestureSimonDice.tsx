"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { GestureType } from "./gestureUtils";

interface Props {
  keywords?: string[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

interface GestureChallenge {
  gesture: GestureType;
  icon: string;
  name: string;
  theme: string;
}

const MAX_ROUNDS = 8;
const HOLD_MS = 2000;
const ROUND_TIME_MS = 4000;

const GESTURE_POOL: Omit<GestureChallenge, "theme">[] = [
  { gesture: "open", icon: "🖐", name: "Mano Abierta" },
  { gesture: "fist", icon: "✊", name: "Puño Cerrado" },
  { gesture: "peace", icon: "✌️", name: "Dos Dedos" },
  { gesture: "thumbsUp", icon: "👍", name: "Pulgar Arriba" },
];

const THEMED_TEMPLATES = [
  "Simón dice: ¡{gesture} para honrar a «{keyword}»!",
  "Cuando escuches «{keyword}», haz {gesture}",
  "El personaje {keyword} haría {gesture}",
  "¡{gesture} en honor a {keyword}!",
];

function buildChallenge(keywords: string[], round: number): GestureChallenge {
  const base = GESTURE_POOL[Math.floor(Math.random() * GESTURE_POOL.length)];
  const keyword = keywords.length > 0 ? keywords[round % keywords.length] : "la historia";
  const tmpl = THEMED_TEMPLATES[Math.floor(Math.random() * THEMED_TEMPLATES.length)];
  const theme = tmpl
    .replace("{gesture}", base.name)
    .replace("{keyword}", keyword);
  return { ...base, theme };
}

type Phase = "showing" | "waiting" | "success" | "fail" | "done";

export function GestureSimonDice({ keywords = [], onComplete, onExit }: Props) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("showing");
  const [challenge, setChallenge] = useState<GestureChallenge | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_MS / 1000);
  const [streak, setStreak] = useState(0);

  const { isActive, isLoading, error, gestureState, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const phaseRef = useRef<Phase>("showing");
  const challengeRef = useRef<GestureChallenge | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { challengeRef.current = challenge; }, [challenge]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  const nextRound = useCallback(() => {
    const next = roundRef.current + 1;
    if (next >= MAX_ROUNDS) {
      setPhase("done");
      phaseRef.current = "done";
      onComplete?.(scoreRef.current, MAX_ROUNDS);
      return;
    }
    setRound(next);
    const newChallenge = buildChallenge(keywords, next);
    setChallenge(newChallenge);
    challengeRef.current = newChallenge;
    setPhase("showing");
    phaseRef.current = "showing";
    setHoldProgress(0);
    holdStartRef.current = null;

    // Show challenge for 1.5s then start waiting
    setTimeout(() => {
      setPhase("waiting");
      phaseRef.current = "waiting";
      setTimeLeft(ROUND_TIME_MS / 1000);
    }, 1500);
  }, [keywords, onComplete]);

  // Start first round
  useEffect(() => {
    const c = buildChallenge(keywords, 0);
    setChallenge(c);
    challengeRef.current = c;
    setTimeout(() => {
      setPhase("waiting");
      phaseRef.current = "waiting";
    }, 1500);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== "waiting") return;
    setTimeLeft(ROUND_TIME_MS / 1000);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) {
          clearInterval(interval);
          if (phaseRef.current === "waiting") {
            setPhase("fail");
            phaseRef.current = "fail";
            setStreak(0);
            streakRef.current = 0;
            holdStartRef.current = null;
            setHoldProgress(0);
            setTimeout(() => nextRound(), 1800);
          }
          return 0;
        }
        return Math.max(0, t - 0.1);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [phase, nextRound]);

  // Gesture hold detection
  useEffect(() => {
    if (!isActive || phaseRef.current !== "waiting") return;
    const target = challengeRef.current?.gesture;
    if (!target) return;

    if (gestureState.gesture === target) {
      if (holdStartRef.current === null) holdStartRef.current = Date.now();
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(elapsed / HOLD_MS, 1));
      if (elapsed >= HOLD_MS) {
        holdStartRef.current = null;
        setHoldProgress(0);
        scoreRef.current += 1 + streakRef.current;
        setScore(scoreRef.current);
        setStreak(s => s + 1);
        setPhase("success");
        phaseRef.current = "success";
        setTimeout(() => nextRound(), 1200);
      }
    } else {
      holdStartRef.current = null;
      setHoldProgress(0);
    }
  }, [isActive, gestureState.gesture, nextRound]);

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="h-20 w-20 text-yellow-400" />
        <h3 className="text-2xl font-bold text-white">¡Simón dice que terminaste!</h3>
        <p className="text-xl text-slate-300">Puntaje final: <span className="text-purple-400 font-black">{score}</span></p>
        <p className="text-sm text-slate-400">Racha máxima: {Math.max(streak)} rondas seguidas</p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-400" />
          <span className="text-sm font-bold text-white">Ronda {round + 1}/{MAX_ROUNDS}</span>
        </div>
        <span className="text-sm font-bold text-purple-300">{score} pts</span>
        {streak > 1 && (
          <span className="text-xs text-orange-300 font-bold">🔥 Racha ×{streak}</span>
        )}
      </div>

      {/* Challenge card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={round}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-slate-800 rounded-2xl p-8 text-center border-2 transition-all ${
            phase === "success" ? "border-green-400 bg-green-900/20" :
            phase === "fail" ? "border-red-400 bg-red-900/20" :
            "border-purple-500/40"
          }`}
        >
          {challenge && (
            <>
              <div className="text-7xl mb-4">{challenge.icon}</div>
              <p className="text-lg font-bold text-white mb-2">{challenge.name}</p>
              <p className="text-sm text-slate-300 italic">{challenge.theme}</p>
              {phase === "waiting" && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-bold text-orange-300">{timeLeft.toFixed(1)}s</div>
                  {holdProgress > 0 && (
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${holdProgress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {phase === "success" && <p className="text-2xl font-black text-green-400 mt-2">¡Perfecto! +{1 + streak - 1} pts</p>}
              {phase === "fail" && <p className="text-2xl font-black text-red-400 mt-2">¡Tiempo!</p>}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Current gesture detected */}
      {isActive && phase === "waiting" && (
        <div className="text-center">
          <span className="text-sm text-slate-400">Detectando: </span>
          <span className="text-sm font-bold text-purple-300">
            {gestureState.gesture
              ? `${GESTURE_POOL.find(g => g.gesture === gestureState.gesture)?.icon} ${GESTURE_POOL.find(g => g.gesture === gestureState.gesture)?.name}`
              : "ningún gesto"}
          </span>
        </div>
      )}

      <div className="flex justify-center">
        <GestureCamUI
          videoRef={videoRef} canvasRef={canvasRef}
          isActive={isActive} isLoading={isLoading} error={error}
          onStart={startCamera} onStop={stopCamera}
          statusLabel={challenge ? `Haz: ${challenge.name}` : "Prepárate..."}
        />
      </div>
    </div>
  );
}
