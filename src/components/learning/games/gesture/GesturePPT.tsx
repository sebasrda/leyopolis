"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { GestureType } from "./gestureUtils";

interface Props {
  questions?: { question: string; options: string[]; correctAnswer: number }[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const ROUNDS = 5;
const HOLD_MS = 2500;    // tiempo para confirmar gesto
const RESULT_MS = 3500;  // tiempo mostrando resultado
const COUNTDOWN_N = 3;   // "3, 2, 1"

const GESTURE_ICONS: Record<string, string> = { fist: "✊", open: "🖐", peace: "✌️" };
const GESTURE_NAMES: Record<string, string> = { fist: "Piedra", open: "Papel", peace: "Tijeras" };
const AI_CHOICES: GestureType[] = ["fist", "open", "peace"];

const BEAT: Record<string, string> = { fist: "peace", open: "fist", peace: "open" };
const BEAT_DESC: Record<string, string> = {
  "fist-peace":  "✊ Piedra aplasta ✌️ Tijeras",
  "open-fist":   "🖐 Papel cubre ✊ Piedra",
  "peace-open":  "✌️ Tijeras corta 🖐 Papel",
};

function getWinner(player: GestureType, ai: GestureType): "player" | "ai" | "tie" {
  if (player === ai) return "tie";
  if (BEAT[player!] === ai) return "player";
  return "ai";
}

type Phase = "countdown" | "waiting" | "result" | "reveal" | "done";

export function GesturePPT({ questions, onComplete, onExit }: Props) {
  const [round, setRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_N);
  const [playerChoice, setPlayerChoice] = useState<GestureType>(null);
  const [aiChoice, setAiChoice] = useState<GestureType>(null);
  const [aiRevealed, setAiRevealed] = useState(false);
  const [roundResult, setRoundResult] = useState<"player" | "ai" | "tie" | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);

  const { isActive, isLoading, error, gestureState, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const holdStartRef = useRef<number | null>(null);
  const lastGestureRef = useRef<GestureType>(null);
  const phaseRef = useRef<Phase>("countdown");
  const roundRef = useRef(1);
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { playerScoreRef.current = playerScore; }, [playerScore]);
  useEffect(() => { aiScoreRef.current = aiScore; }, [aiScore]);

  // ── Countdown phase ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(COUNTDOWN_N);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < COUNTDOWN_N; i++) {
      timers.push(setTimeout(() => setCountdown(COUNTDOWN_N - i - 1), (i + 1) * 900));
    }
    timers.push(setTimeout(() => {
      setPhase("waiting");
      phaseRef.current = "waiting";
    }, (COUNTDOWN_N + 1) * 900));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // ── Reset hold when gesture changes ───────────────────────────────────────
  useEffect(() => {
    if (gestureState.gesture !== lastGestureRef.current) {
      lastGestureRef.current = gestureState.gesture;
      holdStartRef.current = null;
      setHoldProgress(0);
    }
  }, [gestureState.gesture]);

  // ── Hold detection in "waiting" phase ─────────────────────────────────────
  useEffect(() => {
    if (!isActive || phaseRef.current !== "waiting") return;
    const validGestures: GestureType[] = ["fist", "open", "peace"];
    const g = gestureState.gesture;
    if (!g || !validGestures.includes(g)) {
      holdStartRef.current = null;
      setHoldProgress(0);
      return;
    }

    if (holdStartRef.current === null) holdStartRef.current = Date.now();
    const elapsed = Date.now() - holdStartRef.current;
    setHoldProgress(Math.min(elapsed / HOLD_MS, 1));

    if (elapsed >= HOLD_MS) {
      holdStartRef.current = null;
      setHoldProgress(0);

      const ai = AI_CHOICES[Math.floor(Math.random() * 3)];
      const winner = getWinner(g, ai);

      setPlayerChoice(g);
      setAiChoice(ai);
      setRoundResult(winner);
      setAiRevealed(false);
      setPhase("reveal");
      phaseRef.current = "reveal";

      if (winner === "player") {
        playerScoreRef.current += 1;
        setPlayerScore(s => s + 1);
        if (questions && questions.length > 0) {
          const q = questions[Math.floor(Math.random() * questions.length)];
          setBonusMsg(`💡 Dato del libro: "${q.question}"`);
        }
      } else if (winner === "ai") {
        aiScoreRef.current += 1;
        setAiScore(s => s + 1);
      }

      // Reveal AI choice after a suspenseful delay
      setTimeout(() => setAiRevealed(true), 700);

      setTimeout(() => {
        setBonusMsg(null);
        const nextRound = roundRef.current + 1;
        if (nextRound > ROUNDS) {
          setPhase("done");
          phaseRef.current = "done";
          onComplete?.(playerScoreRef.current, ROUNDS);
        } else {
          setRound(nextRound);
          setPhase("countdown");
          phaseRef.current = "countdown";
          setPlayerChoice(null);
          setAiChoice(null);
          setRoundResult(null);
          setAiRevealed(false);
        }
      }, RESULT_MS);
    }
  }, [isActive, gestureState, questions, onComplete]);

  // ── Done screen ───────────────────────────────────────────────────────────
  if (phase === "done") {
    const won = playerScoreRef.current > aiScoreRef.current;
    const tied = playerScoreRef.current === aiScoreRef.current;
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
          <Trophy className={`h-20 w-20 ${won ? "text-yellow-400" : "text-slate-400"}`} />
        </motion.div>
        <h3 className="text-2xl font-bold text-white">
          {won ? "¡Ganaste!" : tied ? "¡Empate!" : "La IA ganó esta vez"}
        </h3>
        <div className="flex gap-8 text-4xl font-black items-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-purple-300">{playerScoreRef.current}</span>
            <span className="text-xs text-slate-400">Tú</span>
          </div>
          <span className="text-slate-600 text-2xl">vs</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-red-400">{aiScoreRef.current}</span>
            <span className="text-xs text-slate-400">IA</span>
          </div>
        </div>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 mt-2">
          Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto p-4">
      {/* Score header */}
      <div className="flex items-center justify-between px-2">
        <div className="text-center">
          <div className="text-3xl font-black text-purple-300">{playerScore}</div>
          <div className="text-xs text-slate-400">Tú</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Swords className="h-6 w-6 text-yellow-400" />
          <span className="text-sm font-bold text-slate-300">Ronda {round}/{ROUNDS}</span>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black text-red-400">{aiScore}</div>
          <div className="text-xs text-slate-400">IA</div>
        </div>
      </div>

      {/* Battle area */}
      <AnimatePresence mode="wait">

        {/* Countdown */}
        {phase === "countdown" && (
          <motion.div key={`cd-${round}`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            className="bg-slate-800 rounded-2xl p-10 text-center border border-purple-500/30 space-y-2">
            {countdown > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div key={countdown}
                  initial={{ opacity: 0, y: -30, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 1.3 }}
                  transition={{ duration: 0.3 }}
                  className="text-8xl font-black text-yellow-400 leading-none"
                >
                  {countdown}
                </motion.div>
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.15 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="text-4xl font-black text-green-400"
              >
                ¡LUCHA!
              </motion.div>
            )}
            <p className="text-slate-400 text-sm mt-2">Prepara tu gesto para la ronda {round}</p>
          </motion.div>
        )}

        {/* Waiting for gesture */}
        {phase === "waiting" && (
          <motion.div key="waiting"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-8 text-center border border-purple-500/30 space-y-5">
            <p className="text-purple-300 font-bold text-base">Elige tu gesto y mantenlo firme</p>
            <div className="flex justify-center gap-6 text-5xl">
              {(["fist", "open", "peace"] as const).map(g => {
                const active = gestureState.gesture === g;
                return (
                  <div key={g} className={`flex flex-col items-center gap-2 transition-all duration-200 ${active ? "scale-130" : "opacity-40 scale-90"}`}
                    style={{ transform: active ? "scale(1.35)" : "scale(0.9)" }}>
                    <span className="text-5xl">{GESTURE_ICONS[g]}</span>
                    <span className="text-xs text-slate-400 font-medium">{GESTURE_NAMES[g]}</span>
                    {active && (
                      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${holdProgress * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {gestureState.gesture && ["fist","open","peace"].includes(gestureState.gesture!) && (
              <p className="text-xs text-slate-500">
                Mantén <strong className="text-yellow-400">{GESTURE_NAMES[gestureState.gesture!]}</strong> — {Math.round((1 - holdProgress) * (HOLD_MS / 1000) * 10) / 10}s
              </p>
            )}
            {!gestureState.isHandDetected && (
              <p className="text-xs text-orange-400">Sin mano detectada — muéstrala a la cámara</p>
            )}
          </motion.div>
        )}

        {/* Result reveal */}
        {(phase === "reveal") && (
          <motion.div key="result"
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 text-center border border-purple-500/30 space-y-4">
            <div className="flex justify-center items-center gap-8">
              <motion.div className="flex flex-col items-center gap-1"
                initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                <span className="text-7xl">{playerChoice ? GESTURE_ICONS[playerChoice] : "❓"}</span>
                <span className="text-xs text-purple-300 font-bold mt-1">Tú</span>
              </motion.div>
              <span className="text-3xl font-black text-slate-500">VS</span>
              <motion.div className="flex flex-col items-center gap-1"
                initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                {aiRevealed ? (
                  <motion.span className="text-7xl" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.35 }}>
                    {aiChoice ? GESTURE_ICONS[aiChoice] : "❓"}
                  </motion.span>
                ) : (
                  <span className="text-7xl animate-pulse">🤖</span>
                )}
                <span className="text-xs text-red-400 font-bold mt-1">IA</span>
              </motion.div>
            </div>

            {aiRevealed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className={`text-xl font-black ${roundResult === "player" ? "text-green-400" : roundResult === "ai" ? "text-red-400" : "text-yellow-400"}`}>
                  {roundResult === "player" ? "🎉 ¡Ganaste la ronda!" : roundResult === "ai" ? "😤 La IA gana esta ronda" : "🤝 ¡Empate!"}
                </div>
                {roundResult !== "tie" && playerChoice && aiChoice && (
                  <p className="text-xs text-slate-400 mt-1">
                    {roundResult === "player"
                      ? BEAT_DESC[`${playerChoice}-${aiChoice}`] ?? ""
                      : BEAT_DESC[`${aiChoice}-${playerChoice}`] ?? ""}
                  </p>
                )}
              </motion.div>
            )}

            {bonusMsg && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="bg-purple-900/40 rounded-xl p-3 text-sm text-purple-200 text-left border border-purple-700/40">
                {bonusMsg}
              </motion.div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      <div className="flex justify-center">
        <GestureCamUI
          videoRef={videoRef} canvasRef={canvasRef}
          isActive={isActive} isLoading={isLoading} error={error}
          onStart={startCamera} onStop={stopCamera}
          statusLabel={
            phase === "countdown" ? "Prepara tu gesto…" :
            phase === "waiting"
              ? gestureState.gesture
                ? `${GESTURE_ICONS[gestureState.gesture]} ${GESTURE_NAMES[gestureState.gesture]} — mantén firme`
                : "Muestra ✊ Piedra · 🖐 Papel · ✌️ Tijeras"
              : "Esperando siguiente ronda…"
          }
        />
      </div>
    </div>
  );
}
