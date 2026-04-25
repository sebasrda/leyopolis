"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID = 3;
const PIECE_SZ = 90;
const BOARD_SZ = GRID * PIECE_SZ; // 270px
const CW = 580;
const CH = 365;
const BX = 10;
const BY = 48;
const TX = BX + BOARD_SZ + 30; // 310

const GRAB_MS = 480;   // ms holding fist over piece to grab
const SNAP_DIST = 58;  // px from slot center to snap-drop

// Pre-computed slot positions (outside component, stable)
const boardSlots = Array.from({ length: 9 }, (_, i) => ({
  x: BX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));
const traySlots = Array.from({ length: 9 }, (_, i) => ({
  x: TX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));

// ─── 15 puzzle images ─────────────────────────────────────────────────────────
const PUZZLE_IMAGES = [
  { src: "https://picsum.photos/seed/mntpzl/270/270",    label: "Montañas"    },
  { src: "https://picsum.photos/seed/ocnpzl/270/270",    label: "Océano"      },
  { src: "https://picsum.photos/seed/frstpzl/270/270",   label: "Bosque"      },
  { src: "https://picsum.photos/seed/flwrpzl/270/270",   label: "Flores"      },
  { src: "https://picsum.photos/seed/ctypzl/270/270",    label: "Ciudad"      },
  { src: "https://picsum.photos/seed/anmlpzl/270/270",   label: "Animales"    },
  { src: "https://picsum.photos/seed/bchpzl/270/270",    label: "Playa"       },
  { src: "https://picsum.photos/seed/spcpzl/270/270",    label: "Espacio"     },
  { src: "https://picsum.photos/seed/foodpzl/270/270",   label: "Comida"      },
  { src: "https://picsum.photos/seed/wntpzl/270/270",    label: "Invierno"    },
  { src: "https://picsum.photos/seed/snstpzl/270/270",   label: "Atardecer"   },
  { src: "https://picsum.photos/seed/advpzl/270/270",    label: "Aventura"    },
  { src: "https://picsum.photos/seed/hstpzl/270/270",    label: "Historia"    },
  { src: "https://picsum.photos/seed/grdnpzl/270/270",   label: "Jardín"      },
  { src: "https://picsum.photos/seed/rnbwpzl/270/270",   label: "Arcoíris"   },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Piece {
  id: number;       // 0-8 → its "home" board slot
  trayPos: number;  // fixed tray position 0-8
  slot: number | null; // current board slot, or null (in tray)
}

interface GrabStart {
  time: number;
  pieceId: number;
}

interface Props {
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

type Phase = "selecting" | "playing" | "complete";

// ─── Helper ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GestureRompecabezas({ onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [imgIdx, setImgIdx] = useState(0);
  const [completionTime, setCompletionTime] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const puzzleCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const piecesRef = useRef<Piece[]>([]);
  const grabbedRef = useRef<number | null>(null);
  const grabStartRef = useRef<GrabStart | null>(null);
  const grabProgressRef = useRef(0);
  const gameStartRef = useRef(0);
  const phaseRef = useRef<Phase>("selecting");
  const gestureStateRef = useRef<any>({ gesture: null, isHandDetected: false });
  const onCompleteRef = useRef(onComplete);

  const { isActive, isLoading, error, gestureState, getPosition, videoRef, canvasRef, startCamera, stopCamera } =
    useGestureCam();

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gestureStateRef.current = gestureState; }, [gestureState]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // ── Start puzzle ──────────────────────────────────────────────────────────
  const startPuzzle = useCallback(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = PUZZLE_IMAGES[imgIdx].src;
    img.onload = () => {
      imgRef.current = img;
      const ids = shuffle(Array.from({ length: 9 }, (_, i) => i));
      piecesRef.current = ids.map((id, trayPos) => ({ id, trayPos, slot: null }));
      grabbedRef.current = null;
      grabStartRef.current = null;
      grabProgressRef.current = 0;
      gameStartRef.current = Date.now();
      setCorrectCount(0);
      setPhase("playing");
      phaseRef.current = "playing";
    };
    img.onerror = () => {
      // Fallback: start without image (shapes will be drawn as colored squares)
      imgRef.current = null;
      const ids = shuffle(Array.from({ length: 9 }, (_, i) => i));
      piecesRef.current = ids.map((id, trayPos) => ({ id, trayPos, slot: null }));
      grabbedRef.current = null;
      grabStartRef.current = null;
      grabProgressRef.current = 0;
      gameStartRef.current = Date.now();
      setCorrectCount(0);
      setPhase("playing");
      phaseRef.current = "playing";
    };
  }, [imgIdx]);

  // ── Piece colors (fallback if no image) ──────────────────────────────────
  const PIECE_COLORS = [
    "#6366f1","#8b5cf6","#ec4899","#f97316","#eab308",
    "#22c55e","#14b8a6","#3b82f6","#a855f7",
  ];

  // ── Main RAF loop (draw + interact) ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    let raf: number;

    function tick() {
      const canvas = puzzleCanvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(tick); return; }

      const img = imgRef.current;
      const pieces = piecesRef.current;
      const pos = getPosition();
      const gesture = gestureStateRef.current?.gesture ?? null;
      const isHand = gestureStateRef.current?.isHandDetected ?? false;
      const cx = (pos?.vx ?? 0.5) * CW;
      const cy = (pos?.vy ?? 0.5) * CH;

      // ── Interaction ──────────────────────────────────────────────────────
      if (isHand && phaseRef.current === "playing") {
        if (gesture === "fist") {
          if (grabbedRef.current === null) {
            // Find piece under cursor
            let found: Piece | null = null;
            for (const p of pieces) {
              if (p.slot !== null) continue;
              const { x, y } = traySlots[p.trayPos];
              if (cx >= x && cx < x + PIECE_SZ && cy >= y && cy < y + PIECE_SZ) { found = p; break; }
            }
            if (!found) {
              for (let s = 0; s < 9; s++) {
                const { x, y } = boardSlots[s];
                if (cx >= x && cx < x + PIECE_SZ && cy >= y && cy < y + PIECE_SZ) {
                  found = pieces.find(p => p.slot === s) ?? null;
                  if (found) break;
                }
              }
            }

            if (found) {
              if (grabStartRef.current === null) {
                grabStartRef.current = { time: Date.now(), pieceId: found.id };
              } else if (grabStartRef.current.pieceId !== found.id) {
                grabStartRef.current = { time: Date.now(), pieceId: found.id };
              } else {
                const elapsed = Date.now() - grabStartRef.current.time;
                grabProgressRef.current = Math.min(elapsed / GRAB_MS, 1);
                if (elapsed >= GRAB_MS) {
                  // Confirm grab
                  const target = pieces.find(p => p.id === grabStartRef.current!.pieceId);
                  if (target) {
                    if (target.slot !== null) {
                      piecesRef.current = pieces.map(p => p.id === target.id ? { ...p, slot: null } : p);
                    }
                    grabbedRef.current = target.id;
                  }
                  grabStartRef.current = null;
                  grabProgressRef.current = 0;
                }
              }
            } else {
              grabStartRef.current = null;
              grabProgressRef.current = 0;
            }
          }
        } else {
          grabStartRef.current = null;
          grabProgressRef.current = 0;

          if (grabbedRef.current !== null) {
            const pieceId = grabbedRef.current;
            let placed = false;

            for (let s = 0; s < 9; s++) {
              const { x, y } = boardSlots[s];
              const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
              const dist = Math.hypot(cx - sc.x, cy - sc.y);
              const occupied = piecesRef.current.some(p => p.slot === s && p.id !== pieceId);
              if (!occupied && dist < SNAP_DIST) {
                piecesRef.current = piecesRef.current.map(p => p.id === pieceId ? { ...p, slot: s } : p);
                placed = true;

                const correct = piecesRef.current.filter(p => p.slot === p.id).length;
                setCorrectCount(correct);

                if (correct === 9) {
                  const elapsed = (Date.now() - gameStartRef.current) / 1000;
                  setCompletionTime(elapsed);
                  setPhase("complete");
                  phaseRef.current = "complete";
                  onCompleteRef.current?.(10, 10);
                  cancelAnimationFrame(raf);
                  return;
                }
                break;
              }
            }

            if (!placed) {
              // Piece stays where it was (in tray slot) — no action needed since slot is still null
            }
            grabbedRef.current = null;
          }
        }
      }

      // ── Draw ─────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, CW, CH);

      // Background
      ctx.fillStyle = "#0d0a1e";
      ctx.fillRect(0, 0, CW, CH);

      // Board panel
      ctx.fillStyle = "#13103a";
      drawRoundRect(ctx, BX - 6, BY - 26, BOARD_SZ + 12, BOARD_SZ + 32, 10);
      ctx.fill();
      ctx.fillStyle = "#6366f1";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TABLERO", BX + BOARD_SZ / 2, BY - 10);

      // Tray panel
      ctx.fillStyle = "#13103a";
      drawRoundRect(ctx, TX - 6, BY - 26, BOARD_SZ + 12, BOARD_SZ + 32, 10);
      ctx.fill();
      ctx.fillStyle = "#a78bfa";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PIEZAS", TX + BOARD_SZ / 2, BY - 10);

      // ── Board slots ──────────────────────────────────────────────────────
      for (let s = 0; s < 9; s++) {
        const { x, y } = boardSlots[s];
        const placedPiece = piecesRef.current.find(p => p.slot === s);

        if (placedPiece) {
          if (img) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, PIECE_SZ, PIECE_SZ);
            ctx.clip();
            ctx.drawImage(img,
              (placedPiece.id % GRID) * PIECE_SZ, Math.floor(placedPiece.id / GRID) * PIECE_SZ,
              PIECE_SZ, PIECE_SZ, x, y, PIECE_SZ, PIECE_SZ);
            ctx.restore();
          } else {
            ctx.fillStyle = PIECE_COLORS[placedPiece.id];
            ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.font = "bold 24px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText((placedPiece.id + 1).toString(), x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 8);
          }

          ctx.strokeStyle = placedPiece.id === s ? "#4ade80" : "#f59e0b";
          ctx.lineWidth = placedPiece.id === s ? 3 : 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
        } else {
          // Empty slot
          ctx.fillStyle = "#1a1640";
          ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.strokeStyle = "#3730a3";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.setLineDash([]);
          ctx.fillStyle = "#3730a355";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText((s + 1).toString(), x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 6);
        }
      }

      // ── Tray pieces ──────────────────────────────────────────────────────
      for (const piece of piecesRef.current) {
        if (piece.slot !== null) continue;
        if (piece.id === grabbedRef.current) continue;

        const { x, y } = traySlots[piece.trayPos];

        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.clip();
          ctx.drawImage(img,
            (piece.id % GRID) * PIECE_SZ, Math.floor(piece.id / GRID) * PIECE_SZ,
            PIECE_SZ, PIECE_SZ, x, y, PIECE_SZ, PIECE_SZ);
          ctx.restore();
        } else {
          ctx.fillStyle = PIECE_COLORS[piece.id];
          ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText((piece.id + 1).toString(), x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 8);
        }

        // Hover/grab highlight
        const hovered = grabStartRef.current?.pieceId === piece.id;
        ctx.strokeStyle = hovered ? "#fbbf24" : "#7c3aed";
        ctx.lineWidth = hovered ? 3 : 2;
        ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);

        // Grab progress arc
        if (hovered && grabProgressRef.current > 0) {
          ctx.beginPath();
          ctx.arc(x + PIECE_SZ / 2, y + PIECE_SZ / 2, 22,
            -Math.PI / 2, -Math.PI / 2 + grabProgressRef.current * Math.PI * 2);
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 5;
          ctx.stroke();
        }
      }

      // ── Grabbed piece (follows cursor) ───────────────────────────────────
      if (grabbedRef.current !== null) {
        const gid = grabbedRef.current;
        const dx = cx - PIECE_SZ / 2;
        const dy = cy - PIECE_SZ / 2;

        if (img) {
          ctx.save();
          ctx.globalAlpha = 0.88;
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.rect(dx, dy, PIECE_SZ, PIECE_SZ);
          ctx.clip();
          ctx.drawImage(img,
            (gid % GRID) * PIECE_SZ, Math.floor(gid / GRID) * PIECE_SZ,
            PIECE_SZ, PIECE_SZ, dx, dy, PIECE_SZ, PIECE_SZ);
          ctx.restore();
        } else {
          ctx.globalAlpha = 0.88;
          ctx.fillStyle = PIECE_COLORS[gid];
          ctx.fillRect(dx, dy, PIECE_SZ, PIECE_SZ);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.strokeRect(dx + 1, dy + 1, PIECE_SZ - 2, PIECE_SZ - 2);
        ctx.globalAlpha = 1;

        // Snap target highlight
        for (let s = 0; s < 9; s++) {
          const { x, y } = boardSlots[s];
          const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
          const dist = Math.hypot(cx - sc.x, cy - sc.y);
          if (dist < SNAP_DIST && !piecesRef.current.some(p => p.slot === s && p.id !== gid)) {
            ctx.strokeStyle = "#a78bfa";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(x + 2, y + 2, PIECE_SZ - 4, PIECE_SZ - 4);
            ctx.setLineDash([]);
            break;
          }
        }
      }

      // ── Cursor ───────────────────────────────────────────────────────────
      if (isHand) {
        const grabbed = grabbedRef.current !== null;
        ctx.beginPath();
        ctx.arc(cx, cy, grabbed ? 18 : 11, 0, Math.PI * 2);
        ctx.strokeStyle = grabbed ? "#fbbf24" : "#a78bfa";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grabbed ? "#fbbf24" : "#a78bfa";
        ctx.fill();
      }

      // ── Progress bar ─────────────────────────────────────────────────────
      const correct = piecesRef.current.filter(p => p.slot === p.id).length;
      const barY = CH - 14;
      ctx.fillStyle = "#1a1640";
      ctx.fillRect(10, barY, CW - 20, 8);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(10, barY, ((CW - 20) * correct) / 9, 8);
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${correct}/9 en su lugar`, CW - 10, barY - 3);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // ── Render: selecting ─────────────────────────────────────────────────────
  if (phase === "selecting") {
    return (
      <div className="flex flex-col items-center gap-6 p-6 w-full max-w-2xl mx-auto">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-1">🧩 Rompecabezas Gestual</h3>
          <p className="text-slate-400 text-sm">Haz ✊ sobre una pieza y mantenla para agarrarla · abre la mano 🖐 para soltar</p>
        </div>

        <div className="flex items-center gap-3 w-full">
          <Button variant="ghost" size="icon" onClick={() => setImgIdx(i => (i - 1 + PUZZLE_IMAGES.length) % PUZZLE_IMAGES.length)} className="text-white hover:bg-white/10 shrink-0">
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="grid grid-cols-5 gap-2">
              {PUZZLE_IMAGES.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    i === imgIdx ? "border-purple-400 scale-110 shadow-lg shadow-purple-500/40" : "border-slate-700 opacity-60 hover:opacity-90"
                  }`}
                >
                  <img src={img.src} alt={img.label} className="w-full h-full object-cover" crossOrigin="anonymous" />
                </button>
              ))}
            </div>
            <p className="text-white font-bold text-lg">{PUZZLE_IMAGES[imgIdx].label}</p>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setImgIdx(i => (i + 1) % PUZZLE_IMAGES.length)} className="text-white hover:bg-white/10 shrink-0">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <Button onClick={startPuzzle} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-12 py-5 text-lg rounded-2xl shadow-lg shadow-purple-500/30">
          ✊ ¡Jugar!
        </Button>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 space-y-1.5 w-full">
          <p className="font-bold text-purple-300 mb-2">Cómo jugar:</p>
          <p>① Activa la cámara dentro del juego</p>
          <p>② Apunta tu mano a una pieza del panel <span className="text-purple-300">PIEZAS</span></p>
          <p>③ Haz un <strong>puño ✊</strong> y mantenlo ~0.5s para agarrar</p>
          <p>④ Mueve la mano al panel <span className="text-indigo-300">TABLERO</span></p>
          <p>⑤ <strong>Abre la mano 🖐</strong> cerca de un espacio para soltar</p>
        </div>
      </div>
    );
  }

  // ── Render: complete ──────────────────────────────────────────────────────
  if (phase === "complete") {
    const mins = Math.floor(completionTime / 60);
    const secs = Math.floor(completionTime % 60);
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-6 p-8 text-center">
        <Trophy className="h-20 w-20 text-yellow-400 drop-shadow-lg" />
        <h3 className="text-3xl font-black text-white">¡Rompecabezas Completo!</h3>
        <p className="text-slate-400 text-lg">
          Tiempo:{" "}
          <span className="text-purple-300 font-bold">
            {mins > 0 ? `${mins}m ` : ""}{secs}s
          </span>
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Button
            onClick={() => { setPhase("selecting"); setImgIdx(i => (i + 1) % PUZZLE_IMAGES.length); }}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 font-bold">
            Siguiente imagen 🧩
          </Button>
          <Button onClick={() => { setPhase("selecting"); }} variant="ghost" className="text-slate-300">
            Elegir imagen
          </Button>
          <Button onClick={onExit} variant="ghost" className="text-slate-400">Salir</Button>
        </div>
      </motion.div>
    );
  }

  // ── Render: playing ───────────────────────────────────────────────────────
  const statusLabel = !isActive
    ? "Activa la cámara para jugar"
    : !gestureState.isHandDetected
    ? "Muestra tu mano a la cámara"
    : grabbedRef.current !== null
    ? "✊ Moviendo pieza… abre la mano para soltar"
    : gestureState.gesture === "fist"
    ? "✊ Apunta a una pieza y mantén el puño"
    : "Mueve la mano sobre una pieza y haz ✊";

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-purple-300">{PUZZLE_IMAGES[imgIdx].label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Referencia:</span>
          <img
            src={PUZZLE_IMAGES[imgIdx].src}
            alt="ref"
            crossOrigin="anonymous"
            className="w-12 h-12 rounded object-cover border border-purple-500/40"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase("selecting")} className="text-slate-400 hover:text-white text-xs">
          Cambiar
        </Button>
      </div>

      <canvas
        ref={puzzleCanvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border border-purple-500/20 w-full"
        style={{ maxWidth: CW, display: "block", margin: "0 auto" }}
      />

      <div className="flex justify-center">
        <GestureCamUI
          videoRef={videoRef}
          canvasRef={canvasRef}
          isActive={isActive}
          isLoading={isLoading}
          error={error}
          onStart={startCamera}
          onStop={stopCamera}
          statusLabel={statusLabel}
        />
      </div>
    </div>
  );
}
