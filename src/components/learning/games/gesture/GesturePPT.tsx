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
const HOLD_MS = 1500;
const GESTURE_ICONS: Record<string, string> = { fist: "✊", open: "🖐", peace: "✌️" };
const GESTURE_NAMES: Record<string, string> = { fist: "Piedra", open: "Papel", peace: "Tijeras" };
const AI_CHOICES: GestureType[] = ["fist", "open", "peace"];

function getWinner(player: GestureType, ai: GestureType): "player" | "ai" | "tie" {
  if (player === ai) return "tie";
  if (
    (player === "fist" && ai === "peace") ||
    (player === "open" && ai === "fist") ||
    (player === "peace" && ai === "open")
  ) return "player";
  return "ai";
}

type Phase = "waiting" | "holding" | "result" | "done";

export function GesturePPT({ questions, onComplete, onExit }: Props) {
  const [round, setRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [playerChoice, setPlayerChoice] = useState<GestureType>(null);
  const [aiChoice, setAiChoice] = useState<GestureType>(null);
  const [roundResult, setRoundResult] = useState<"player" | "ai" | "tie" | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);

  const { isActive, isLoading, error, gestureState, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const holdStartRef = useRef<number | null>(null);
  const lastGestureRef = useRef<GestureType>(null);
  const phaseRef = useRef<Phase>("waiting");
  const roundRef = useRef(1);
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { playerScoreRef.current = playerScore; }, [playerScore]);
  useEffect(() => { aiScoreRef.current = aiScore; }, [aiScore]);

  // Reset hold when gesture changes
  useEffect(() => {
    if (gestureState.gesture !== lastGestureRef.current) {
      lastGestureRef.current = gestureState.gesture;
      holdStartRef.current = null;
      setHoldProgress(0);
    }
  }, [gestureState.gesture]);

  // Hold detection in "waiting" phase
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
      setPhase("result");
      phaseRef.current = "result";

      if (winner === "player") {
        playerScoreRef.current += 1;
        setPlayerScore(s => s + 1);
        // Show book bonus message
        if (questions && questions.length > 0) {
          const q = questions[Math.floor(Math.random() * questions.length)];
          setBonusMsg(`💡 Dato del libro: "${q.question}"`);
        }
      } else if (winner === "ai") {
        aiScoreRef.current += 1;
        setAiScore(s => s + 1);
      }

      setTimeout(() => {
        setBonusMsg(null);
        const nextRound = roundRef.current + 1;
        if (nextRound > ROUNDS) {
          setPhase("done");
          phaseRef.current = "done";
          onComplete?.(playerScoreRef.current, ROUNDS);
        } else {
          setRound(nextRound);
          setPhase("waiting");
          phaseRef.current = "waiting";
          setPlayerChoice(null);
          setAiChoice(null);
          setRoundResult(null);
        }
      }, 2500);
    }
  }, [isActive, gestureState, questions, onComplete]);

  if (phase === "done") {
    const won = playerScoreRef.current > aiScoreRef.current;
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className={`h-20 w-20 ${won ? "text-yellow-400" : "text-slate-400"}`} />
        <h3 className="text-2xl font-bold text-white">{won ? "¡Ganaste!" : playerScore === aiScore ? "¡Empate!" : "La IA ganó esta vez"}</h3>
        <div className="flex gap-8 text-3xl font-black">
          <span className="text-purple-300">{playerScore}</span>
          <span className="text-slate-500">vs</span>
          <span className="text-red-400">{aiScore}</span>
        </div>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        {phase === "waiting" && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 rounded-2xl p-8 text-center border border-purple-500/30 space-y-4">
            <p className="text-purple-300 font-medium text-sm">Elige tu gesto y mantenlo</p>
            <div className="flex justify-center gap-8 text-5xl">
              {(["fist", "open", "peace"] as const).map(g => {
                const active = gestureState.gesture === g;
                return (
                  <div key={g} className={`flex flex-col items-center gap-1 transition-all ${active ? "scale-125" : "opacity-50"}`}>
                    <span>{GESTURE_ICONS[g]}</span>
                    <span className="text-xs text-slate-400">{GESTURE_NAMES[g]}</span>
                    {active && holdProgress > 0 && (
                      <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${holdProgress * 100}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">✊ Piedra · 🖐 Papel · ✌️ Tijeras</p>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-800 rounded-2xl p-6 text-center border border-purple-500/30 space-y-4">
            <div className="flex justify-center items-center gap-8">
              <div className="flex flex-col items-center">
                <span className="text-6xl">{playerChoice ? GESTURE_ICONS[playerChoice] : "❓"}</span>
                <span className="text-xs text-purple-300 mt-1">Tú</span>
              </div>
              <span className="text-3xl font-black text-slate-500">VS</span>
              <div className="flex flex-col items-center">
                <span className="text-6xl">{aiChoice ? GESTURE_ICONS[aiChoice] : "❓"}</span>
                <span className="text-xs text-red-400 mt-1">IA</span>
              </div>
            </div>
            <div className={`text-2xl font-black ${roundResult === "player" ? "text-green-400" : roundResult === "ai" ? "text-red-400" : "text-yellow-400"}`}>
              {roundResult === "player" ? "🎉 ¡Ganaste la ronda!" : roundResult === "ai" ? "😤 La IA gana esta ronda" : "🤝 Empate"}
            </div>
            {bonusMsg && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-purple-900/40 rounded-xl p-3 text-sm text-purple-200 text-left">
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
          statusLabel={gestureState.gesture ? `${GESTURE_ICONS[gestureState.gesture]} ${GESTURE_NAMES[gestureState.gesture]}` : "Muestra piedra, papel o tijeras"}
        />
      </div>
    </div>
  );
}
