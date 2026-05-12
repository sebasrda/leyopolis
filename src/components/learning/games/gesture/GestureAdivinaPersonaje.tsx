"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Eye, CheckCircle2, XCircle, ChevronRight, Play, Hand, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { getQuadrant } from "./gestureUtils";

interface CharacterClue {
  name: string;
  clues: string[];
}

interface Props {
  characters: CharacterClue[];
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

const DEFAULT_CHARACTERS: CharacterClue[] = [
  { name: "El protagonista", clues: ["Es el personaje central de la historia", "Enfrenta el mayor conflicto", "Cambia más que nadie al final"] },
  { name: "El antagonista", clues: ["Se opone al protagonista", "Crea obstáculos en la trama", "Sus motivaciones son complejas"] },
  { name: "El mentor", clues: ["Guía al personaje principal", "Tiene más experiencia o sabiduría", "Aparece en momentos clave"] },
  { name: "El aliado", clues: ["Apoya al protagonista", "Es un compañero fiel", "Aporta habilidades complementarias"] },
];

const QUADRANT_POSITIONS = ["TL", "TR", "BL", "BR"];
const QUADRANT_LABELS: Record<string, string> = {
  TL: "↖ arriba-izquierda",
  TR: "↗ arriba-derecha",
  BL: "↙ abajo-izquierda",
  BR: "↘ abajo-derecha",
};
const QUADRANT_COLORS: Record<string, string> = {
  TL: "bg-blue-700/60 border-blue-500",
  TR: "bg-purple-700/60 border-purple-500",
  BL: "bg-green-700/60 border-green-500",
  BR: "bg-orange-700/60 border-orange-500",
};
const DWELL_MS = 1500;
const COOLDOWN_MS = 1800;

type Phase = "intro" | "clues" | "guess";

export function GestureAdivinaPersonaje({ characters, onComplete, onExit }: Props) {
  // Always need at least 4 characters for the 4-option round
  const pool = (characters && characters.length >= 4 ? characters : DEFAULT_CHARACTERS).slice(0, 8);

  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [clueIdx, setClueIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [dwellZone, setDwellZone] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const { isActive, isLoading, error, getPosition, videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  const phaseRef = useRef<Phase>("intro");
  const dwellZoneRef = useRef<string | null>(null);
  const dwellStartRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);
  const feedbackRef = useRef<"correct" | "wrong" | null>(null);
  const qIdxRef = useRef(qIdx);
  const scoreRef = useRef(score);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qIdxRef.current = qIdx; }, [qIdx]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Build options for the current question (correct + 3 random distractors)
  useEffect(() => {
    if (pool.length < 4) return;
    const correct = pool[qIdx];
    const others = pool.filter((_, i) => i !== qIdx);
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [correct, ...shuffled].sort(() => Math.random() - 0.5).map(c => c.name);
    setOptions(opts);
    setClueIdx(0);
  }, [qIdx, pool]);

  // Stop camera when leaving guess phase, free CPU + WebGL
  useEffect(() => {
    if (phase !== "guess" && isActive) {
      stopCamera();
    }
  }, [phase, isActive, stopCamera]);

  const startGame = () => {
    setPhase("clues");
    phaseRef.current = "clues";
  };

  const nextClue = () => {
    const q = pool[qIdxRef.current];
    if (!q) return;
    if (clueIdx < q.clues.length - 1) {
      setClueIdx(c => c + 1);
    } else {
      setPhase("guess");
      phaseRef.current = "guess";
    }
  };

  const handleGuess = useCallback((chosenName: string) => {
    if (feedbackRef.current) return;
    const correct = pool[qIdxRef.current]?.name === chosenName;
    if (correct) scoreRef.current += 1;
    setScore(s => correct ? s + 1 : s);
    setFeedback(correct ? "correct" : "wrong");
    feedbackRef.current = correct ? "correct" : "wrong";
    setTimeout(() => {
      setFeedback(null);
      feedbackRef.current = null;
      const next = qIdxRef.current + 1;
      if (next >= pool.length) {
        setDone(true);
        onComplete?.(scoreRef.current, pool.length);
      } else {
        setQIdx(next);
        setClueIdx(0);
        setPhase("clues");
        phaseRef.current = "clues";
      }
    }, 1500);
  }, [pool, onComplete]);

  // Dwell detection — only runs in guess phase
  useEffect(() => {
    if (!isActive || phase !== "guess") return;
    const interval = setInterval(() => {
      if (phaseRef.current !== "guess" || feedbackRef.current) return;
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
        if (elapsed >= DWELL_MS && options.length === 4) {
          const zoneIdx = QUADRANT_POSITIONS.indexOf(zone);
          const chosen = options[zoneIdx];
          if (chosen) {
            cooldownRef.current = now;
            dwellZoneRef.current = null;
            setDwellZone(null);
            setDwellProgress(0);
            handleGuess(chosen);
          }
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [isActive, phase, getPosition, handleGuess, options]);

  // ── DONE ────────────────────────────────────────────────────────────────
  if (done || pool.length < 4) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="h-16 w-16 text-yellow-400" />
        <h3 className="text-2xl font-bold text-white">¡Juego Terminado!</h3>
        <p className="text-xl text-slate-300">Puntaje: <span className="text-purple-400 font-black">{score}</span> / {pool.length}</p>
        <Button onClick={onExit} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8">Volver al menú</Button>
      </div>
    );
  }

  // ── INTRO ───────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-5 w-full max-w-2xl mx-auto p-6 text-white">
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-black">🎭 Adivina el Personaje</h3>
          <p className="text-slate-400 text-sm">{pool.length} personajes · cómo se juega</p>
        </div>

        <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-5 space-y-4">
          <Step n={1} icon={<BookOpen className="h-5 w-5" />} title="Lee las pistas">
            Cada personaje tiene 3 pistas de la más vaga a la más clara. <span className="text-purple-300">Tú decides cuándo pasar</span> a la siguiente con el botón
            <span className="inline-flex items-center gap-1 mx-1 text-purple-300"><ChevronRight className="h-3 w-3" /></span>. Antes pistas se podían leer todas seguidas para darte una ventaja.
          </Step>
          <Step n={2} icon={<Hand className="h-5 w-5" />} title="Activa la cámara cuando estés listo">
            Cuando termines las pistas, aparece un tablero con 4 opciones en cuadrantes. La cámara se activa solo en este momento — antes no la necesitas.
          </Step>
          <Step n={3} icon={<CheckCircle2 className="h-5 w-5" />} title="Señala con la mano">
            Mueve la mano al cuadrante del personaje correcto y manténla {Math.round(DWELL_MS / 100) / 10}s. También puedes dar click si prefieres jugar sin cámara.
          </Step>
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={startGame} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-10 py-6 text-lg font-bold gap-2 shadow-lg shadow-purple-500/30">
            <Play className="h-5 w-5" /> Empezar
          </Button>
        </div>

        <Button onClick={onExit} variant="ghost" className="text-slate-400 hover:text-white">
          Salir
        </Button>
      </div>
    );
  }

  const q = pool[qIdx];

  // ── PLAYING (clues / guess) ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4 relative">
      {/* Progress + score */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 tabular-nums">{qIdx + 1}/{pool.length}</span>
        <Progress value={((qIdx + 1) / pool.length) * 100} className="flex-1 h-2" />
        <span className="text-sm font-bold text-purple-300 tabular-nums">{score} pts</span>
      </div>

      {phase === "clues" && q && (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${qIdx}-${clueIdx}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-slate-800 rounded-2xl p-6 border border-purple-500/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">Pista {clueIdx + 1} de {q.clues.length}</span>
                <div className="flex-1 flex items-center justify-end gap-1">
                  {q.clues.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${i <= clueIdx ? "w-6 bg-purple-500" : "w-3 bg-slate-700"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xl font-semibold text-white text-center leading-relaxed">{q.clues[clueIdx]}</p>
            </motion.div>
          </AnimatePresence>

          {/* Manual advance */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
            <Button
              onClick={nextClue}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-6 py-5 gap-2 font-bold"
            >
              {clueIdx < q.clues.length - 1 ? (
                <>Siguiente pista <ChevronRight className="h-4 w-4" /></>
              ) : (
                <>Adivinar <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
            {clueIdx < q.clues.length - 1 && (
              <button
                type="button"
                onClick={() => { setPhase("guess"); phaseRef.current = "guess"; }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Saltar al tablero
              </button>
            )}
          </div>
        </>
      )}

      {phase === "guess" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-center text-purple-300 font-medium text-sm">🎯 ¿Quién es? Señala con la mano o haz click</p>
          <div className="grid grid-cols-2 gap-3">
            {QUADRANT_POSITIONS.map((qPos, i) => {
              const name = options[i];
              const isDwelling = dwellZone === qPos;
              return (
                <motion.div
                  key={qPos}
                  className={`rounded-2xl p-4 border-2 cursor-pointer transition-all ${QUADRANT_COLORS[qPos]} ${isDwelling ? "scale-105 ring-2 ring-white/30" : "opacity-80"}`}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => handleGuess(name)}
                >
                  <div className="text-[10px] uppercase tracking-wide text-white/60 mb-1">
                    {QUADRANT_LABELS[qPos]}
                  </div>
                  <p className="text-sm font-bold text-white text-center">{name}</p>
                  {isDwelling && (
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${dwellProgress * 100}%` }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {feedback && q && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-2"
          >
            {feedback === "correct"
              ? <><CheckCircle2 className="h-20 w-20 text-green-400" /><span className="text-green-300 font-black text-xl">¡Correcto!</span></>
              : <><XCircle className="h-20 w-20 text-red-400" /><span className="text-red-300 font-black text-lg">Era: {q.name}</span></>
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera only visible in guess phase */}
      {phase === "guess" && (
        <div className="flex justify-center mt-2">
          <GestureCamUI
            videoRef={videoRef} canvasRef={canvasRef}
            isActive={isActive} isLoading={isLoading} error={error}
            onStart={startCamera} onStop={stopCamera}
            statusLabel="Señala el personaje correcto"
          />
        </div>
      )}
    </div>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">
          {n}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-purple-300">{icon}</span>
          <h4 className="font-bold text-white">{title}</h4>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
