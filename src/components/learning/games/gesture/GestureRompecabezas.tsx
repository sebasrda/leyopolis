"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import { GestureType } from "./gestureUtils";

// ─── Layout constants ─────────────────────────────────────────────────────────
const GRID = 3;
const PIECE_SZ = 110;              // larger pieces for better visibility
const BOARD_SZ = GRID * PIECE_SZ;  // 330 px
const CW = 700;
const CH = 430;
const BX = 10;
const BY = 52;
const TX = BX + BOARD_SZ + 20;    // 360  (tray starts right of board)
const SNAP_DIST = 65;              // px from slot centre to snap

// Pre-computed positions — stable, outside component
const boardSlots = Array.from({ length: 9 }, (_, i) => ({
  x: BX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));
const traySlots = Array.from({ length: 9 }, (_, i) => ({
  x: TX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));

// ─── 15 puzzle images (330×330 from picsum.photos) ────────────────────────────
const PUZZLE_IMAGES = [
  { src: "https://picsum.photos/seed/mntpzl/330/330",  label: "Montañas"   },
  { src: "https://picsum.photos/seed/ocnpzl/330/330",  label: "Océano"     },
  { src: "https://picsum.photos/seed/frstpzl/330/330", label: "Bosque"     },
  { src: "https://picsum.photos/seed/flwrpzl/330/330", label: "Flores"     },
  { src: "https://picsum.photos/seed/ctypzl/330/330",  label: "Ciudad"     },
  { src: "https://picsum.photos/seed/anmlpzl/330/330", label: "Animales"   },
  { src: "https://picsum.photos/seed/bchpzl/330/330",  label: "Playa"      },
  { src: "https://picsum.photos/seed/spcpzl/330/330",  label: "Espacio"    },
  { src: "https://picsum.photos/seed/foodpzl/330/330", label: "Comida"     },
  { src: "https://picsum.photos/seed/wntpzl/330/330",  label: "Invierno"   },
  { src: "https://picsum.photos/seed/snstpzl/330/330", label: "Atardecer"  },
  { src: "https://picsum.photos/seed/advpzl/330/330",  label: "Aventura"   },
  { src: "https://picsum.photos/seed/hstpzl/330/330",  label: "Historia"   },
  { src: "https://picsum.photos/seed/grdnpzl/330/330", label: "Jardín"     },
  { src: "https://picsum.photos/seed/rnbwpzl/330/330", label: "Arcoíris"  },
];

const PIECE_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f97316","#eab308",
  "#22c55e","#14b8a6","#3b82f6","#a855f7",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Piece {
  id: number;       // 0-8 → its "home" board slot
  trayPos: number;  // fixed tray position 0-8
  slot: number | null;
}

interface Props {
  onComplete?: (score: number, max: number) => void;
  onExit?: () => void;
}

type Phase = "selecting" | "playing" | "complete";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GestureRompecabezas({ onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [imgIdx, setImgIdx] = useState(0);
  const [completionTime, setCompletionTime] = useState(0);

  const puzzleCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const piecesRef = useRef<Piece[]>([]);
  const grabbedRef = useRef<number | null>(null);   // piece.id being dragged
  const hoveredRef = useRef<number | null>(null);   // piece.id under cursor (open hand)
  const lastGestureRef = useRef<GestureType>(null); // previous frame gesture (for transition detection)
  const gameStartRef = useRef(0);
  const phaseRef = useRef<Phase>("selecting");
  const gestureStateRef = useRef<any>({ gesture: null, isHandDetected: false });
  const onCompleteRef = useRef(onComplete);

  const { isActive, isLoading, error, gestureState, getPosition, videoRef, canvasRef, startCamera, stopCamera } =
    useGestureCam();

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gestureStateRef.current = gestureState; }, [gestureState]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // ── Find piece under cursor ───────────────────────────────────────────────
  function findPieceAt(cx: number, cy: number): Piece | null {
    // Check tray pieces
    for (const p of piecesRef.current) {
      if (p.slot !== null) continue;
      const { x, y } = traySlots[p.trayPos];
      if (cx >= x && cx < x + PIECE_SZ && cy >= y && cy < y + PIECE_SZ) return p;
    }
    // Check board pieces
    for (let s = 0; s < 9; s++) {
      const { x, y } = boardSlots[s];
      if (cx >= x && cx < x + PIECE_SZ && cy >= y && cy < y + PIECE_SZ) {
        const p = piecesRef.current.find(pp => pp.slot === s);
        if (p) return p;
      }
    }
    return null;
  }

  // ── Start puzzle ──────────────────────────────────────────────────────────
  const startPuzzle = useCallback(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = PUZZLE_IMAGES[imgIdx].src;

    const init = () => {
      const ids = shuffle(Array.from({ length: 9 }, (_, i) => i));
      piecesRef.current = ids.map((id, trayPos) => ({ id, trayPos, slot: null }));
      grabbedRef.current = null;
      hoveredRef.current = null;
      lastGestureRef.current = null;
      gameStartRef.current = Date.now();
      setPhase("playing");
      phaseRef.current = "playing";
    };

    img.onload = () => { imgRef.current = img; init(); };
    img.onerror = () => { imgRef.current = null; init(); };
  }, [imgIdx]);

  // ── Main RAF loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    let raf: number;

    function tick() {
      const canvas = puzzleCanvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(tick); return; }

      const img = imgRef.current;
      const pos = getPosition();
      const gesture: GestureType = gestureStateRef.current?.gesture ?? null;
      const isHand: boolean = gestureStateRef.current?.isHandDetected ?? false;
      const cx = (pos?.vx ?? 0.5) * CW;
      const cy = (pos?.vy ?? 0.5) * CH;

      const isFist = gesture === "fist";
      const wasFist = lastGestureRef.current === "fist";

      // ── Interaction ──────────────────────────────────────────────────────
      if (phaseRef.current === "playing") {
        if (isHand) {
          if (!isFist) {
            // Open hand: update hover highlight
            if (grabbedRef.current === null) {
              hoveredRef.current = findPieceAt(cx, cy)?.id ?? null;
            }

            // Drop: transition fist → open while holding a piece
            if (wasFist && grabbedRef.current !== null) {
              const pieceId = grabbedRef.current;
              let bestSlot = -1;
              let bestDist = SNAP_DIST;
              for (let s = 0; s < 9; s++) {
                const { x, y } = boardSlots[s];
                const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
                const dist = Math.hypot(cx - sc.x, cy - sc.y);
                const occupied = piecesRef.current.some(p => p.slot === s && p.id !== pieceId);
                if (!occupied && dist < bestDist) { bestDist = dist; bestSlot = s; }
              }
              if (bestSlot >= 0) {
                piecesRef.current = piecesRef.current.map(p =>
                  p.id === pieceId ? { ...p, slot: bestSlot } : p
                );
                const correct = piecesRef.current.filter(p => p.slot === p.id).length;
                if (correct === 9) {
                  const elapsed = (Date.now() - gameStartRef.current) / 1000;
                  setCompletionTime(elapsed);
                  setPhase("complete");
                  phaseRef.current = "complete";
                  onCompleteRef.current?.(10, 10);
                  cancelAnimationFrame(raf);
                  return;
                }
              }
              grabbedRef.current = null;
              hoveredRef.current = null;
            }
          } else {
            // Fist: grab on transition (open → fist)
            if (!wasFist && grabbedRef.current === null) {
              const found = findPieceAt(cx, cy);
              if (found) {
                // Remove from board slot if placed there
                if (found.slot !== null) {
                  piecesRef.current = piecesRef.current.map(p =>
                    p.id === found.id ? { ...p, slot: null } : p
                  );
                }
                grabbedRef.current = found.id;
                hoveredRef.current = null;
              }
            }
          }
        } else {
          // Hand lost: drop piece back (remains in tray since slot is null)
          if (grabbedRef.current !== null) grabbedRef.current = null;
          hoveredRef.current = null;
        }

        lastGestureRef.current = gesture;
      }

      // ── Draw ─────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, CW, CH);

      // Background
      ctx.fillStyle = "#0d0a1e";
      ctx.fillRect(0, 0, CW, CH);

      // Board panel background
      ctx.fillStyle = "#13103a";
      drawRR(ctx, BX - 6, BY - 28, BOARD_SZ + 12, BOARD_SZ + 34, 10);
      ctx.fill();
      ctx.fillStyle = "#6366f1";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("📋 TABLERO", BX + BOARD_SZ / 2, BY - 12);

      // Tray panel background
      ctx.fillStyle = "#13103a";
      drawRR(ctx, TX - 6, BY - 28, BOARD_SZ + 12, BOARD_SZ + 34, 10);
      ctx.fill();
      ctx.fillStyle = "#a78bfa";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🧩 PIEZAS", TX + BOARD_SZ / 2, BY - 12);

      // Helper: draw one piece image clip
      const drawPiece = (id: number, dx: number, dy: number, alpha = 1) => {
        const c = ctx as CanvasRenderingContext2D;
        c.save();
        c.globalAlpha = alpha;
        if (img) {
          const srcX = (id % GRID) * PIECE_SZ;
          const srcY = Math.floor(id / GRID) * PIECE_SZ;
          c.beginPath();
          c.rect(dx, dy, PIECE_SZ, PIECE_SZ);
          c.clip();
          c.drawImage(img, srcX, srcY, PIECE_SZ, PIECE_SZ, dx, dy, PIECE_SZ, PIECE_SZ);
        } else {
          c.fillStyle = PIECE_COLORS[id];
          c.fillRect(dx, dy, PIECE_SZ, PIECE_SZ);
          c.fillStyle = "rgba(255,255,255,0.9)";
          c.font = "bold 28px sans-serif";
          c.textAlign = "center";
          c.fillText((id + 1).toString(), dx + PIECE_SZ / 2, dy + PIECE_SZ / 2 + 10);
        }
        c.restore();
      };

      // ── Board slots ──────────────────────────────────────────────────────
      for (let s = 0; s < 9; s++) {
        const { x, y } = boardSlots[s];
        const placed = piecesRef.current.find(p => p.slot === s);

        if (placed && placed.id !== grabbedRef.current) {
          drawPiece(placed.id, x, y);
          // Border: green if correct, amber if wrong
          const isCorrect = placed.id === s;
          ctx.strokeStyle = isCorrect ? "#4ade80" : "#f59e0b";
          ctx.lineWidth = isCorrect ? 3 : 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);

          // Hover highlight (piece can be re-grabbed from board)
          if (hoveredRef.current === placed.id) {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
            ctx.fillStyle = "rgba(251,191,36,0.12)";
            ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          }
        } else {
          // Empty slot
          ctx.fillStyle = "#1a1640";
          ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.strokeStyle = "#3730a3";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(x + 0.5, y + 0.5, PIECE_SZ - 1, PIECE_SZ - 1);
          ctx.setLineDash([]);
          ctx.fillStyle = "#3730a355";
          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText((s + 1).toString(), x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 7);
        }
      }

      // ── Tray pieces ──────────────────────────────────────────────────────
      for (const piece of piecesRef.current) {
        if (piece.slot !== null) continue;          // placed on board
        if (piece.id === grabbedRef.current) continue; // being dragged

        const { x, y } = traySlots[piece.trayPos];
        drawPiece(piece.id, x, y);

        const isHovered = hoveredRef.current === piece.id;
        if (isHovered) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
          ctx.fillStyle = "rgba(251,191,36,0.12)";
          ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          // "✊ para agarrar" hint
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✊ agarrar", x + PIECE_SZ / 2, y + PIECE_SZ - 6);
        } else {
          ctx.strokeStyle = "#7c3aed";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
        }
      }

      // ── Grabbed piece (follows cursor) ───────────────────────────────────
      if (grabbedRef.current !== null) {
        const gid = grabbedRef.current;
        const dx = cx - PIECE_SZ / 2;
        const dy = cy - PIECE_SZ / 2;

        // Shadow glow
        ctx.save();
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 20;
        drawPiece(gid, dx, dy, 0.92);
        ctx.restore();

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.strokeRect(dx + 1, dy + 1, PIECE_SZ - 2, PIECE_SZ - 2);

        // Snap target highlight on board
        for (let s = 0; s < 9; s++) {
          const { x, y } = boardSlots[s];
          const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
          const dist = Math.hypot(cx - sc.x, cy - sc.y);
          if (dist < SNAP_DIST && !piecesRef.current.some(p => p.slot === s && p.id !== gid)) {
            ctx.fillStyle = "rgba(167,139,250,0.2)";
            ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
            ctx.strokeStyle = "#a78bfa";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x + 2, y + 2, PIECE_SZ - 4, PIECE_SZ - 4);
            ctx.setLineDash([]);
            ctx.fillStyle = "#a78bfa";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("🖐 soltar", x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 4);
            break;
          }
        }
      }

      // ── Cursor ───────────────────────────────────────────────────────────
      if (isHand) {
        const grabbed = grabbedRef.current !== null;
        const hovered = hoveredRef.current !== null;
        const color = grabbed ? "#fbbf24" : hovered ? "#fbbf24" : "#a78bfa";

        ctx.beginPath();
        ctx.arc(cx, cy, grabbed ? 20 : 12, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Gesture label near cursor
        if (!grabbed) {
          ctx.fillStyle = color + "cc";
          ctx.font = "13px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(isFist ? "✊" : "🖐", cx + 14, cy - 6);
        }
      }

      // ── Progress bar ─────────────────────────────────────────────────────
      const correct = piecesRef.current.filter(p => p.slot === p.id).length;
      const barY = CH - 16;
      const barW = CW - 20;
      ctx.fillStyle = "#1a1640";
      ctx.fillRect(10, barY, barW, 10);
      if (correct > 0) {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(10, barY, (barW * correct) / 9, 10);
      }
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${correct}/9 correctas`, CW - 10, barY - 4);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, getPosition]);

  // ── SELECTING screen ──────────────────────────────────────────────────────
  if (phase === "selecting") {
    return (
      <div className="flex flex-col items-center gap-6 p-6 w-full max-w-3xl mx-auto">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-1">🧩 Rompecabezas Gestual</h3>
          <p className="text-slate-400 text-sm">
            🖐 Mano abierta sobre una pieza para seleccionarla · ✊ Cierra el puño para agarrar · 🖐 Abre para soltar
          </p>
        </div>

        <div className="flex items-center gap-3 w-full">
          <Button variant="ghost" size="icon"
            onClick={() => setImgIdx(i => (i - 1 + PUZZLE_IMAGES.length) % PUZZLE_IMAGES.length)}
            className="text-white hover:bg-white/10 shrink-0">
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="grid grid-cols-5 gap-2">
              {PUZZLE_IMAGES.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === imgIdx
                      ? "border-purple-400 scale-110 shadow-lg shadow-purple-500/50"
                      : "border-slate-700 opacity-55 hover:opacity-80 hover:border-slate-500"
                  }`}>
                  <img src={img.src} alt={img.label} className="w-full h-full object-cover" crossOrigin="anonymous" />
                </button>
              ))}
            </div>
            <p className="text-white font-bold text-xl">{PUZZLE_IMAGES[imgIdx].label}</p>
          </div>

          <Button variant="ghost" size="icon"
            onClick={() => setImgIdx(i => (i + 1) % PUZZLE_IMAGES.length)}
            className="text-white hover:bg-white/10 shrink-0">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <Button onClick={startPuzzle}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-14 py-5 text-lg rounded-2xl shadow-lg shadow-purple-500/30">
          🧩 ¡Jugar!
        </Button>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 space-y-1.5 w-full max-w-lg">
          <p className="font-bold text-purple-300 mb-2">Cómo jugar:</p>
          <p>① Activa la cámara dentro del juego</p>
          <p>② Mueve tu <strong>mano abierta 🖐</strong> sobre una pieza — se resalta en amarillo</p>
          <p>③ Cierra el <strong>puño ✊</strong> para agarrarla instantáneamente</p>
          <p>④ Mueve el puño al tablero izquierdo hasta ver el espacio en morado</p>
          <p>⑤ <strong>Abre la mano 🖐</strong> para soltar · ¿La pusiste mal? ¡Agárrala de nuevo!</p>
        </div>
      </div>
    );
  }

  // ── COMPLETE screen ───────────────────────────────────────────────────────
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
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            onClick={() => { setPhase("selecting"); setImgIdx(i => (i + 1) % PUZZLE_IMAGES.length); }}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 font-bold">
            Siguiente imagen 🧩
          </Button>
          <Button onClick={() => setPhase("selecting")} variant="ghost" className="text-slate-300">
            Elegir imagen
          </Button>
          <Button onClick={onExit} variant="ghost" className="text-slate-400">Salir</Button>
        </div>
      </motion.div>
    );
  }

  // ── PLAYING screen ────────────────────────────────────────────────────────
  const grabbed = grabbedRef.current !== null;
  const statusLabel = !isActive
    ? "Activa la cámara para jugar"
    : !gestureState.isHandDetected
    ? "Muestra tu mano a la cámara"
    : grabbed
    ? "✊ Moviendo pieza — abre la mano 🖐 para soltar"
    : gestureState.gesture === "fist"
    ? "✊ Apunta tu puño cerrado a una pieza"
    : "🖐 Abre la mano sobre una pieza, luego cierra el puño ✊";

  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-purple-300">🧩 {PUZZLE_IMAGES[imgIdx].label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Referencia:</span>
          <img
            src={PUZZLE_IMAGES[imgIdx].src}
            alt="ref"
            crossOrigin="anonymous"
            className="w-16 h-16 rounded-lg object-cover border-2 border-purple-500/40"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase("selecting")}
          className="text-slate-400 hover:text-white text-xs">
          Cambiar imagen
        </Button>
      </div>

      <canvas
        ref={puzzleCanvasRef}
        width={CW}
        height={CH}
        className="rounded-2xl border border-purple-500/20 w-full"
        style={{ display: "block", margin: "0 auto" }}
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
