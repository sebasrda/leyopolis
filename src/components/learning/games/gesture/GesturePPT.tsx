"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords, Flame, BookOpen, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { GestureType } from "./gestureUtils";

interface BookQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface BookStatement {
  text: string;
  isTrue?: boolean;
}

interface Props {
  questions?: BookQuestion[];
  keywords?: string[];
  statements?: BookStatement[];
  bookTitle?: string;
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const ROUNDS = 5;
const HOLD_MS = 2200;
const COUNTDOWN_N = 3;
const TRIVIA_MS = 12000;
const REVEAL_MS = 2200;

const GESTURE_ICONS: Record<string, string> = { fist: "✊", open: "🖐", peace: "✌️" };
const GESTURE_NAMES: Record<string, string> = { fist: "Piedra", open: "Papel", peace: "Tijeras" };
const AI_CHOICES: GestureType[] = ["fist", "open", "peace"];

const BEAT: Record<string, string> = { fist: "peace", open: "fist", peace: "open" };
const BEAT_DESC: Record<string, string> = {
  "fist-peace": "✊ Piedra aplasta ✌️ Tijeras",
  "open-fist": "🖐 Papel cubre ✊ Piedra",
  "peace-open": "✌️ Tijeras corta 🖐 Papel",
};

function getWinner(player: GestureType, ai: GestureType): "player" | "ai" | "tie" {
  if (player === ai) return "tie";
  if (BEAT[player!] === ai) return "player";
  return "ai";
}

type Phase = "countdown" | "waiting" | "reveal" | "trivia" | "done";

function pickFromArray<T>(arr: T[], index: number): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[index % arr.length];
}

export function GesturePPT({
  questions,
  keywords,
  statements,
  bookTitle,
  onComplete,
  onExit,
}: Props) {
  const [round, setRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [bonusScore, setBonusScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_N);
  const [playerChoice, setPlayerChoice] = useState<GestureType>(null);
  const [aiChoice, setAiChoice] = useState<GestureType>(null);
  const [aiRevealed, setAiRevealed] = useState(false);
  const [roundResult, setRoundResult] = useState<"player" | "ai" | "tie" | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);

  // Trivia (per-round bonus question)
  const [trivia, setTrivia] = useState<BookQuestion | null>(null);
  const [triviaSelected, setTriviaSelected] = useState<number | null>(null);
  const [triviaCorrect, setTriviaCorrect] = useState<boolean | null>(null);
  const [triviaTimeLeft, setTriviaTimeLeft] = useState(TRIVIA_MS / 1000);

  const [inputMode, setInputMode] = useState<"gesture" | "click">("gesture");

  const { isActive, isLoading, error, gestureState, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const holdStartRef = useRef<number | null>(null);
  const lastGestureRef = useRef<GestureType>(null);
  const phaseRef = useRef<Phase>("countdown");
  const roundRef = useRef(1);
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const bonusScoreRef = useRef(0);
  const triviaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { playerScoreRef.current = playerScore; }, [playerScore]);
  useEffect(() => { aiScoreRef.current = aiScore; }, [aiScore]);
  useEffect(() => { bonusScoreRef.current = bonusScore; }, [bonusScore]);

  useEffect(() => {
    return () => {
      if (triviaTimerRef.current) clearInterval(triviaTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Theme keyword shown above the round (rotates per round)
  const roundTheme = useMemo(() => {
    if (!keywords || keywords.length === 0) return null;
    return pickFromArray(keywords, round - 1) || null;
  }, [keywords, round]);

  // ── Countdown phase ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(COUNTDOWN_N);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < COUNTDOWN_N; i++) {
      timers.push(setTimeout(() => setCountdown(COUNTDOWN_N - i - 1), (i + 1) * 850));
    }
    timers.push(setTimeout(() => {
      setPhase("waiting");
      phaseRef.current = "waiting";
    }, (COUNTDOWN_N + 1) * 850));
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

  // ── Hold detection in "waiting" phase (gesture mode) ─────────────────────
  useEffect(() => {
    if (!isActive || phaseRef.current !== "waiting" || inputMode !== "gesture") return;
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
      lockInChoice(g);
    }
  }, [isActive, gestureState, inputMode]);

  function lockInChoice(playerGesture: GestureType) {
    if (phaseRef.current !== "waiting" || !playerGesture) return;
    const ai = AI_CHOICES[Math.floor(Math.random() * 3)];
    const winner = getWinner(playerGesture, ai);

    setPlayerChoice(playerGesture);
    setAiChoice(ai);
    setRoundResult(winner);
    setAiRevealed(false);
    setPhase("reveal");
    phaseRef.current = "reveal";

    if (winner === "player") {
      playerScoreRef.current += 1;
      setPlayerScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else if (winner === "ai") {
      aiScoreRef.current += 1;
      setAiScore((s) => s + 1);
      setStreak(0);
    } else {
      // tie keeps streak as-is
    }

    setTimeout(() => setAiRevealed(true), 600);

    // After reveal, go to trivia phase if we have questions; otherwise advance
    advanceTimerRef.current = setTimeout(() => {
      if (questions && questions.length > 0) {
        const q = questions[Math.floor(Math.random() * questions.length)];
        if (q && q.options && q.options.length > 0) {
          setTrivia(q);
          setTriviaSelected(null);
          setTriviaCorrect(null);
          setTriviaTimeLeft(TRIVIA_MS / 1000);
          setPhase("trivia");
          phaseRef.current = "trivia";
          return;
        }
      }
      goToNextRound();
    }, REVEAL_MS);
  }

  function goToNextRound() {
    const nextRound = roundRef.current + 1;
    if (nextRound > ROUNDS) {
      setPhase("done");
      phaseRef.current = "done";
      onComplete?.(playerScoreRef.current + bonusScoreRef.current, ROUNDS * 2);
    } else {
      setRound(nextRound);
      setPhase("countdown");
      phaseRef.current = "countdown";
      setPlayerChoice(null);
      setAiChoice(null);
      setRoundResult(null);
      setAiRevealed(false);
      setTrivia(null);
      setTriviaSelected(null);
      setTriviaCorrect(null);
    }
  }

  // ── Trivia timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "trivia") {
      if (triviaTimerRef.current) {
        clearInterval(triviaTimerRef.current);
        triviaTimerRef.current = null;
      }
      return;
    }
    setTriviaTimeLeft(TRIVIA_MS / 1000);
    triviaTimerRef.current = setInterval(() => {
      setTriviaTimeLeft((t) => {
        if (t <= 1) {
          if (triviaTimerRef.current) {
            clearInterval(triviaTimerRef.current);
            triviaTimerRef.current = null;
          }
          // timeout: skip to next round
          if (phaseRef.current === "trivia") {
            setTimeout(() => goToNextRound(), 600);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (triviaTimerRef.current) clearInterval(triviaTimerRef.current);
    };
  }, [phase]);

  function handleTriviaAnswer(idx: number) {
    if (!trivia || triviaSelected !== null) return;
    setTriviaSelected(idx);
    const ok = idx === trivia.correctAnswer;
    setTriviaCorrect(ok);
    if (ok) {
      bonusScoreRef.current += 1;
      setBonusScore((s) => s + 1);
    }
    if (triviaTimerRef.current) {
      clearInterval(triviaTimerRef.current);
      triviaTimerRef.current = null;
    }
    advanceTimerRef.current = setTimeout(() => goToNextRound(), 1800);
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (phase === "done") {
    const finalScore = playerScoreRef.current + bonusScoreRef.current;
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
        <div className="grid grid-cols-2 gap-4 bg-slate-800/60 border border-purple-500/30 rounded-xl p-4 w-full max-w-sm">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-yellow-300 text-2xl font-black">
              <Sparkles className="h-5 w-5" /> {bonusScoreRef.current}
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Bonus de lectura</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-orange-300 text-2xl font-black">
              <Flame className="h-5 w-5" /> {bestStreak}
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Mejor racha</span>
          </div>
        </div>
        <p className="text-sm text-slate-300">
          Puntaje total: <span className="font-bold text-white">{finalScore}</span> / {ROUNDS * 2}
        </p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 mt-2">
          Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto p-4">
      {/* Header: scores + streak + theme */}
      <div className="flex items-center justify-between px-2">
        <div className="text-center">
          <div className="text-3xl font-black text-purple-300">{playerScore}</div>
          <div className="text-xs text-slate-400">Tú</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Swords className="h-6 w-6 text-yellow-400" />
          <span className="text-sm font-bold text-slate-300">Ronda {round}/{ROUNDS}</span>
          <div className="flex items-center gap-2 text-[11px]">
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-orange-300 font-bold">
                <Flame className="h-3 w-3" /> {streak}
              </span>
            )}
            {bonusScore > 0 && (
              <span className="flex items-center gap-0.5 text-yellow-300 font-bold">
                <Sparkles className="h-3 w-3" /> {bonusScore}
              </span>
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black text-red-400">{aiScore}</div>
          <div className="text-xs text-slate-400">IA</div>
        </div>
      </div>

      {/* Theme of the round */}
      {roundTheme && (
        <motion.div
          key={`theme-${round}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-xs text-purple-200 bg-purple-900/30 border border-purple-700/40 rounded-full px-3 py-1.5 mx-auto"
        >
          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-slate-300">Tema:</span>
          <span className="font-bold text-purple-200">{roundTheme}</span>
          {bookTitle && (
            <span className="text-slate-500 text-[10px] hidden sm:inline">· {bookTitle}</span>
          )}
        </motion.div>
      )}

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
            <p className="text-slate-400 text-sm mt-2">Prepara tu jugada para la ronda {round}</p>
          </motion.div>
        )}

        {/* Waiting for choice */}
        {phase === "waiting" && (
          <motion.div key="waiting"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-6 text-center border border-purple-500/30 space-y-4">

            {/* Mode toggle */}
            <div className="flex justify-center gap-1 text-[11px]">
              <button
                onClick={() => setInputMode("gesture")}
                className={`px-3 py-1 rounded-full transition-colors ${
                  inputMode === "gesture"
                    ? "bg-purple-600 text-white font-bold"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                ✋ Gestos
              </button>
              <button
                onClick={() => setInputMode("click")}
                className={`px-3 py-1 rounded-full transition-colors ${
                  inputMode === "click"
                    ? "bg-purple-600 text-white font-bold"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                👆 Toque
              </button>
            </div>

            <p className="text-purple-300 font-bold text-base">
              {inputMode === "gesture" ? "Elige tu gesto y mantenlo firme" : "Toca tu jugada"}
            </p>

            <div className="flex justify-center gap-4 text-5xl flex-wrap">
              {(["fist", "open", "peace"] as const).map(g => {
                const active = inputMode === "gesture" && gestureState.gesture === g;
                const isClickMode = inputMode === "click";
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={!isClickMode}
                    onClick={() => isClickMode && lockInChoice(g)}
                    className={`flex flex-col items-center gap-2 transition-all duration-200 rounded-2xl p-3 ${
                      isClickMode
                        ? "cursor-pointer bg-slate-700/50 hover:bg-purple-600/30 hover:scale-110 active:scale-95 border border-slate-600 hover:border-purple-400"
                        : active
                        ? "scale-125 bg-purple-900/30 border border-purple-500/40"
                        : "opacity-50 scale-90"
                    }`}
                  >
                    <span className="text-5xl">{GESTURE_ICONS[g]}</span>
                    <span className="text-xs text-slate-300 font-medium">{GESTURE_NAMES[g]}</span>
                    {active && inputMode === "gesture" && (
                      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${holdProgress * 100}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {inputMode === "gesture" && gestureState.gesture && ["fist","open","peace"].includes(gestureState.gesture!) && (
              <p className="text-xs text-slate-500">
                Mantén <strong className="text-yellow-400">{GESTURE_NAMES[gestureState.gesture!]}</strong> — {Math.round((1 - holdProgress) * (HOLD_MS / 1000) * 10) / 10}s
              </p>
            )}
            {inputMode === "gesture" && !gestureState.isHandDetected && (
              <p className="text-xs text-orange-400">Sin mano detectada — muéstrala a la cámara o cambia a 👆 Toque</p>
            )}
          </motion.div>
        )}

        {/* Result reveal */}
        {phase === "reveal" && (
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
                {roundResult === "player" && streak >= 2 && (
                  <p className="text-[11px] text-orange-300 font-bold mt-1 flex items-center justify-center gap-1">
                    <Flame className="h-3 w-3" /> Racha x{streak}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Trivia: bonus question after each round */}
        {phase === "trivia" && trivia && (
          <motion.div
            key={`trivia-${round}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-900/70 to-purple-900/70 rounded-2xl p-5 border border-yellow-500/40 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold uppercase tracking-wide">
                <Sparkles className="h-4 w-4" /> Bonus de lectura
              </div>
              <div className="text-[11px] text-slate-300 bg-slate-900/60 rounded-full px-2 py-0.5">
                ⏱ {triviaTimeLeft}s
              </div>
            </div>

            <p className="text-base text-white font-medium leading-snug">{trivia.question}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trivia.options.map((opt, i) => {
                const isSelected = triviaSelected === i;
                const isCorrectOption = i === trivia.correctAnswer;
                const showResult = triviaSelected !== null;
                const baseClasses = "text-left text-sm rounded-lg px-3 py-2.5 border transition-all";
                let stateClasses = "bg-slate-800/60 border-slate-700 hover:bg-purple-700/40 hover:border-purple-400 text-slate-100";
                if (showResult) {
                  if (isCorrectOption) {
                    stateClasses = "bg-green-700/40 border-green-400 text-green-100";
                  } else if (isSelected && !isCorrectOption) {
                    stateClasses = "bg-red-800/40 border-red-400 text-red-100";
                  } else {
                    stateClasses = "bg-slate-800/30 border-slate-700 text-slate-400 opacity-70";
                  }
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={showResult}
                    onClick={() => handleTriviaAnswer(i)}
                    className={`${baseClasses} ${stateClasses} flex items-center gap-2 disabled:cursor-default`}
                  >
                    <span className="font-bold text-yellow-300">{String.fromCharCode(65 + i)}.</span>
                    <span className="flex-1">{opt}</span>
                    {showResult && isCorrectOption && <CheckCircle2 className="h-4 w-4 text-green-300" />}
                    {showResult && isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-red-300" />}
                  </button>
                );
              })}
            </div>

            {triviaSelected !== null && (
              <p className={`text-xs font-bold text-center ${triviaCorrect ? "text-green-300" : "text-red-300"}`}>
                {triviaCorrect ? "✨ ¡Correcto! +1 punto bonus" : "Casi… La respuesta correcta queda resaltada en verde."}
              </p>
            )}
            {triviaSelected === null && (
              <button
                type="button"
                onClick={() => goToNextRound()}
                className="block mx-auto text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Saltar pregunta
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Camera shown only in gesture mode (and not while answering trivia) */}
      {inputMode === "gesture" && phase !== "trivia" && (
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
      )}

      {/* Statement clue (extra reading flavor when available) */}
      {statements && statements.length > 0 && phase === "waiting" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          className="text-[11px] text-slate-400 text-center italic px-3"
        >
          📖 «{(pickFromArray(statements, round - 1) as BookStatement | undefined)?.text || ""}»
        </motion.p>
      )}
    </div>
  );
}
