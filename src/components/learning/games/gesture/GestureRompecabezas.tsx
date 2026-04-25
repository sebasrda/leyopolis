"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";

// ─── Layout ───────────────────────────────────────────────────────────────────
const GRID     = 3;
const PIECE_SZ = 110;
const BOARD_SZ = GRID * PIECE_SZ; // 330
const CW       = 700;
const CH       = 430;
const BX       = 10;
const BY       = 52;
const TX       = BX + BOARD_SZ + 20; // 360
const SNAP_DIST = 70;

const boardSlots = Array.from({ length: 9 }, (_, i) => ({
  x: BX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));
const traySlots = Array.from({ length: 9 }, (_, i) => ({
  x: TX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));

// ─── 15 images ────────────────────────────────────────────────────────────────
const PUZZLE_IMAGES = [
  { src: "https://picsum.photos/seed/mntpzl/330/330",  label: "Montañas"  },
  { src: "https://picsum.photos/seed/ocnpzl/330/330",  label: "Océano"    },
  { src: "https://picsum.photos/seed/frstpzl/330/330", label: "Bosque"    },
  { src: "https://picsum.photos/seed/flwrpzl/330/330", label: "Flores"    },
  { src: "https://picsum.photos/seed/ctypzl/330/330",  label: "Ciudad"    },
  { src: "https://picsum.photos/seed/anmlpzl/330/330", label: "Animales"  },
  { src: "https://picsum.photos/seed/bchpzl/330/330",  label: "Playa"     },
  { src: "https://picsum.photos/seed/spcpzl/330/330",  label: "Espacio"   },
  { src: "https://picsum.photos/seed/foodpzl/330/330", label: "Comida"    },
  { src: "https://picsum.photos/seed/wntpzl/330/330",  label: "Invierno"  },
  { src: "https://picsum.photos/seed/snstpzl/330/330", label: "Atardecer" },
  { src: "https://picsum.photos/seed/advpzl/330/330",  label: "Aventura"  },
  { src: "https://picsum.photos/seed/hstpzl/330/330",  label: "Historia"  },
  { src: "https://picsum.photos/seed/grdnpzl/330/330", label: "Jardín"    },
  { src: "https://picsum.photos/seed/rnbwpzl/330/330", label: "Arcoíris" },
];

const PIECE_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f97316","#eab308",
  "#22c55e","#14b8a6","#3b82f6","#a855f7",
];

interface Piece { id: number; trayPos: number; slot: number | null; }
interface Props  { onComplete?: (score: number, max: number) => void; onExit?: () => void; }
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
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GestureRompecabezas({ onComplete, onExit }: Props) {
  const [phase, setPhase]               = useState<Phase>("selecting");
  const [imgIdx, setImgIdx]             = useState(0);
  const [completionTime, setCompletionTime] = useState(0);
  const [refModalOpen, setRefModalOpen] = useState(false); // reference image modal

  const puzzleCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef          = useRef<HTMLImageElement | null>(null);
  const piecesRef       = useRef<Piece[]>([]);
  const phaseRef        = useRef<Phase>("selecting");
  const gameStartRef    = useRef(0);
  const onCompleteRef   = useRef(onComplete);

  // Interaction refs
  const hoveredRef  = useRef<number | null>(null); // piece under OPEN hand
  const grabbedRef  = useRef<number | null>(null); // piece being DRAGGED
  const gestureStateRef = useRef<any>({ gesture: null, isHandDetected: false });

  const { isActive, isLoading, error, gestureState, getPosition,
          videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gestureStateRef.current = gestureState; }, [gestureState]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // ── Piece search with adjustable hit area ─────────────────────────────────
  const findPiece = useCallback((cx: number, cy: number, extra = 0): Piece | null => {
    // Tray pieces
    for (const p of piecesRef.current) {
      if (p.slot !== null) continue;
      const { x, y } = traySlots[p.trayPos];
      if (cx >= x - extra && cx < x + PIECE_SZ + extra &&
          cy >= y - extra && cy < y + PIECE_SZ + extra) return p;
    }
    // Board pieces
    for (let s = 0; s < 9; s++) {
      const { x, y } = boardSlots[s];
      if (cx >= x - extra && cx < x + PIECE_SZ + extra &&
          cy >= y - extra && cy < y + PIECE_SZ + extra) {
        const p = piecesRef.current.find(pp => pp.slot === s);
        if (p) return p;
      }
    }
    return null;
  }, []);

  // ── GRAB / DROP via gestureState changes ──────────────────────────────────
  //
  // DESIGN RATIONALE
  // ─────────────────
  // When the user closes their fist the hand landmark shifts physically
  // (fingers curl → palm centre moves). The RAF loop NEVER updates hoveredRef
  // during a fist, so the piece selected with an open hand is preserved.
  //
  // Grab  → fires THE INSTANT gestureState becomes "fist"   (no timer)
  // Drop  → fires ONLY when gestureState becomes "open"
  //         (peace / thumbsUp / null do NOT drop, avoiding accidents)
  useEffect(() => {
    if (!isActive || phaseRef.current !== "playing") return;
    const g = gestureState.gesture;

    if (g === "fist") {
      // ── GRAB ─────────────────────────────────────────────────────────────
      if (grabbedRef.current !== null) return; // already holding

      // 1st priority: piece pre-selected while hand was open
      let target = hoveredRef.current;

      // 2nd priority: fist position with generous hit area
      // (handles the position-shift that happens when closing the fist)
      if (target === null) {
        const pos = getPosition();
        const cx = (pos?.vx ?? 0.5) * CW;
        const cy = (pos?.vy ?? 0.5) * CH;
        target = findPiece(cx, cy, 40)?.id ?? null;
      }

      if (target === null) return;

      const piece = piecesRef.current.find(p => p.id === target);
      if (!piece) return;

      if (piece.slot !== null) {
        piecesRef.current = piecesRef.current.map(p =>
          p.id === target ? { ...p, slot: null } : p
        );
      }
      grabbedRef.current = target;
      hoveredRef.current = null;

    } else if (g === "open") {
      // ── DROP ─────────────────────────────────────────────────────────────
      if (grabbedRef.current === null) return;

      const pieceId = grabbedRef.current;
      const pos     = getPosition();
      const cx      = (pos?.vx ?? 0.5) * CW;
      const cy      = (pos?.vy ?? 0.5) * CH;

      let bestSlot = -1;
      let bestDist = SNAP_DIST;
      for (let s = 0; s < 9; s++) {
        const { x, y } = boardSlots[s];
        const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
        const dist = Math.hypot(cx - sc.x, cy - sc.y);
        if (!piecesRef.current.some(p => p.slot === s && p.id !== pieceId) && dist < bestDist) {
          bestDist = dist; bestSlot = s;
        }
      }
      if (bestSlot >= 0) {
        piecesRef.current = piecesRef.current.map(p =>
          p.id === pieceId ? { ...p, slot: bestSlot } : p
        );
        if (piecesRef.current.every(p => p.slot === p.id)) {
          const elapsed = (Date.now() - gameStartRef.current) / 1000;
          setCompletionTime(elapsed);
          setPhase("complete");
          phaseRef.current = "complete";
          onCompleteRef.current?.(10, 10);
        }
      }
      grabbedRef.current = null;
    }
    // gesture === "peace" | "thumbsUp" | null → do nothing (keep holding)
  }, [isActive, gestureState, findPiece, getPosition]);

  // ── Start puzzle ──────────────────────────────────────────────────────────
  const startPuzzle = useCallback(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = PUZZLE_IMAGES[imgIdx].src;
    const init = () => {
      piecesRef.current = shuffle(Array.from({ length: 9 }, (_, i) => i))
        .map((id, trayPos) => ({ id, trayPos, slot: null }));
      grabbedRef.current = null;
      hoveredRef.current = null;
      gameStartRef.current = Date.now();
      setPhase("playing");
      phaseRef.current = "playing";
    };
    img.onload = () => { imgRef.current = img; init(); };
    img.onerror = () => { imgRef.current = null; init(); };
  }, [imgIdx]);

  // ── RAF draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    let raf: number;

    function tick() {
      const canvas = puzzleCanvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx)   { raf = requestAnimationFrame(tick); return; }

      const img     = imgRef.current;
      const pos     = getPosition();
      const gesture = gestureStateRef.current?.gesture ?? null;
      const isHand  = gestureStateRef.current?.isHandDetected ?? false;
      const cx      = (pos?.vx ?? 0.5) * CW;
      const cy      = (pos?.vy ?? 0.5) * CH;
      const isFist  = gesture === "fist";
      const grabbed = grabbedRef.current;

      // ── Hover: only update while open hand (not fist) ────────────────────
      // DO NOT update on fist — preserves the pre-selection despite position shift
      if (isHand && !isFist && grabbed === null) {
        hoveredRef.current = null;
        // Tray
        for (const p of piecesRef.current) {
          if (p.slot !== null) continue;
          const { x, y } = traySlots[p.trayPos];
          if (cx >= x - 8 && cx < x + PIECE_SZ + 8 && cy >= y - 8 && cy < y + PIECE_SZ + 8) {
            hoveredRef.current = p.id; break;
          }
        }
        // Board
        if (hoveredRef.current === null) {
          for (let s = 0; s < 9; s++) {
            const { x, y } = boardSlots[s];
            if (cx >= x - 8 && cx < x + PIECE_SZ + 8 && cy >= y - 8 && cy < y + PIECE_SZ + 8) {
              const p = piecesRef.current.find(pp => pp.slot === s);
              if (p) { hoveredRef.current = p.id; break; }
            }
          }
        }
      } else if (!isHand && grabbed === null) {
        hoveredRef.current = null;
      }

      // ── Draw piece helper ────────────────────────────────────────────────
      const dp = (id: number, dx: number, dy: number, alpha = 1) => {
        const c = ctx as CanvasRenderingContext2D;
        c.save(); c.globalAlpha = alpha;
        if (img) {
          c.beginPath(); c.rect(dx, dy, PIECE_SZ, PIECE_SZ); c.clip();
          c.drawImage(img, (id % GRID) * PIECE_SZ, Math.floor(id / GRID) * PIECE_SZ,
            PIECE_SZ, PIECE_SZ, dx, dy, PIECE_SZ, PIECE_SZ);
        } else {
          c.fillStyle = PIECE_COLORS[id];
          c.fillRect(dx, dy, PIECE_SZ, PIECE_SZ);
          c.fillStyle = "rgba(255,255,255,0.9)"; c.font = "bold 30px sans-serif";
          c.textAlign = "center";
          c.fillText((id + 1).toString(), dx + PIECE_SZ / 2, dy + PIECE_SZ / 2 + 10);
        }
        c.restore();
      };

      // ── Background + panels ──────────────────────────────────────────────
      ctx.clearRect(0, 0, CW, CH);
      ctx.fillStyle = "#0d0a1e"; ctx.fillRect(0, 0, CW, CH);

      ctx.fillStyle = "#13103a";
      drawRR(ctx, BX - 6, BY - 28, BOARD_SZ + 12, BOARD_SZ + 34, 10); ctx.fill();
      ctx.fillStyle = "#6366f1"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("📋  TABLERO", BX + BOARD_SZ / 2, BY - 12);

      ctx.fillStyle = "#13103a";
      drawRR(ctx, TX - 6, BY - 28, BOARD_SZ + 12, BOARD_SZ + 34, 10); ctx.fill();
      ctx.fillStyle = "#a78bfa"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🧩  PIEZAS", TX + BOARD_SZ / 2, BY - 12);

      // ── Board slots ──────────────────────────────────────────────────────
      for (let s = 0; s < 9; s++) {
        const { x, y } = boardSlots[s];
        const placed = piecesRef.current.find(p => p.slot === s);

        if (placed && placed.id !== grabbed) {
          dp(placed.id, x, y);
          const correct = placed.id === s;
          ctx.strokeStyle = correct ? "#4ade80" : "#f59e0b";
          ctx.lineWidth = correct ? 3 : 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
          if (hoveredRef.current === placed.id) {
            ctx.fillStyle = "rgba(251,191,36,0.2)"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
            ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
          }
        } else {
          ctx.fillStyle = "#1a1640"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.strokeStyle = "#3730a3"; ctx.lineWidth = 1;
          ctx.setLineDash([5, 4]); ctx.strokeRect(x + .5, y + .5, PIECE_SZ - 1, PIECE_SZ - 1);
          ctx.setLineDash([]);
          ctx.fillStyle = "#3730a355"; ctx.font = "18px sans-serif"; ctx.textAlign = "center";
          ctx.fillText((s + 1).toString(), x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 7);
        }
      }

      // ── Tray pieces ──────────────────────────────────────────────────────
      for (const piece of piecesRef.current) {
        if (piece.slot !== null || piece.id === grabbed) continue;
        const { x, y } = traySlots[piece.trayPos];
        dp(piece.id, x, y);
        const hl = hoveredRef.current === piece.id;
        if (hl) {
          ctx.fillStyle = "rgba(251,191,36,0.2)"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
          ctx.fillStyle = "#fbbf24"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("✊ cerrar puño", x + PIECE_SZ / 2, y + PIECE_SZ - 5);
        } else {
          ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
        }
      }

      // ── Grabbed piece ────────────────────────────────────────────────────
      if (grabbed !== null) {
        const dx = cx - PIECE_SZ / 2, dy = cy - PIECE_SZ / 2;
        ctx.save(); ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 22;
        dp(grabbed, dx, dy, 0.92); ctx.restore();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
        ctx.strokeRect(dx + 1, dy + 1, PIECE_SZ - 2, PIECE_SZ - 2);

        // Snap target
        for (let s = 0; s < 9; s++) {
          const { x, y } = boardSlots[s];
          const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
          if (Math.hypot(cx - sc.x, cy - sc.y) < SNAP_DIST &&
              !piecesRef.current.some(p => p.slot === s && p.id !== grabbed)) {
            ctx.fillStyle = "rgba(167,139,250,0.22)"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
            ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 4]); ctx.strokeRect(x + 2, y + 2, PIECE_SZ - 4, PIECE_SZ - 4);
            ctx.setLineDash([]);
            ctx.fillStyle = "#a78bfa"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("🖐 abrir mano", x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 4);
            break;
          }
        }
      }

      // ── Cursor ───────────────────────────────────────────────────────────
      if (isHand) {
        const col = grabbed || hoveredRef.current !== null ? "#fbbf24" : "#a78bfa";
        ctx.beginPath(); ctx.arc(cx, cy, grabbed ? 20 : 13, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.font = "16px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(isFist ? "✊" : "🖐", cx + 15, cy - 4);
      }

      // ── Progress bar ─────────────────────────────────────────────────────
      const correct = piecesRef.current.filter(p => p.slot === p.id).length;
      const barY = CH - 18;
      ctx.fillStyle = "#1a1640"; ctx.fillRect(10, barY, CW - 20, 10);
      if (correct > 0) { ctx.fillStyle = "#4ade80"; ctx.fillRect(10, barY, ((CW - 20) * correct) / 9, 10); }
      ctx.fillStyle = "#a5b4fc"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${correct}/9 en su lugar`, CW - 10, barY - 4);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, getPosition]);

  // ── SELECTING ─────────────────────────────────────────────────────────────
  if (phase === "selecting") {
    return (
      <div className="flex flex-col items-center gap-6 p-6 w-full max-w-3xl mx-auto">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-1">🧩 Rompecabezas Gestual</h3>
          <p className="text-slate-400 text-sm">🖐 Abre la mano sobre una pieza · ✊ Cierra para agarrar · 🖐 Abre para soltar</p>
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
                    i === imgIdx ? "border-purple-400 scale-110 shadow-lg shadow-purple-500/50"
                                 : "border-slate-700 opacity-55 hover:opacity-80"}`}>
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
          <p>① Activa la cámara · muestra la mano abierta 🖐</p>
          <p>② Muévela sobre una pieza — se resalta en amarillo</p>
          <p>③ <strong>Cierra el puño ✊</strong> — la pieza queda pegada a tu mano</p>
          <p>④ Mueve al tablero · <strong>abre la mano 🖐</strong> para soltar</p>
          <p>⑤ ¿Mal puesta? Pasa la mano abierta encima y vuelve a agarrar</p>
          <p className="text-purple-400 text-xs">💡 Haz clic en la imagen de referencia para verla grande</p>
        </div>
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (phase === "complete") {
    const mins = Math.floor(completionTime / 60);
    const secs = Math.floor(completionTime % 60);
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-6 p-8 text-center">
        <Trophy className="h-20 w-20 text-yellow-400 drop-shadow-lg" />
        <h3 className="text-3xl font-black text-white">¡Rompecabezas Completo!</h3>
        <p className="text-slate-400 text-lg">
          Tiempo: <span className="text-purple-300 font-bold">{mins > 0 ? `${mins}m ` : ""}{secs}s</span>
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={() => { setPhase("selecting"); setImgIdx(i => (i + 1) % PUZZLE_IMAGES.length); }}
            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-8 font-bold">
            Siguiente imagen 🧩
          </Button>
          <Button onClick={() => setPhase("selecting")} variant="ghost" className="text-slate-300">Elegir imagen</Button>
          <Button onClick={onExit} variant="ghost" className="text-slate-400">Salir</Button>
        </div>
      </motion.div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  const statusLabel =
    !isActive                              ? "Activa la cámara para jugar" :
    !gestureState.isHandDetected           ? "Muestra tu mano a la cámara" :
    grabbedRef.current !== null            ? "✊ Pieza agarrada — abre la mano 🖐 para soltar" :
    gestureState.gesture === "fist"        ? "✊ Puño cerrado — mueve al tablero" :
    hoveredRef.current !== null            ? "🟡 Pieza lista — cierra el puño ✊ para agarrar" :
                                             "🖐 Mueve la mano abierta sobre una pieza";

  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-purple-300">🧩 {PUZZLE_IMAGES[imgIdx].label}</span>

        {/* Reference image — click to enlarge */}
        <button
          onClick={() => setRefModalOpen(true)}
          className="flex items-center gap-1.5 group"
          title="Ver imagen de referencia grande">
          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Referencia (clic):</span>
          <img src={PUZZLE_IMAGES[imgIdx].src} alt="ref" crossOrigin="anonymous"
            className="w-16 h-16 rounded-lg object-cover border-2 border-purple-500/40 group-hover:border-purple-400 group-hover:scale-105 transition-all cursor-zoom-in" />
        </button>

        <Button variant="ghost" size="sm" onClick={() => setPhase("selecting")}
          className="text-slate-400 hover:text-white text-xs">
          Cambiar imagen
        </Button>
      </div>

      {/* Puzzle canvas */}
      <canvas ref={puzzleCanvasRef} width={CW} height={CH}
        className="rounded-2xl border border-purple-500/20 w-full"
        style={{ display: "block", margin: "0 auto" }} />

      {/* Camera */}
      <div className="flex justify-center">
        <GestureCamUI videoRef={videoRef} canvasRef={canvasRef}
          isActive={isActive} isLoading={isLoading} error={error}
          onStart={startCamera} onStop={stopCamera}
          statusLabel={statusLabel} />
      </div>

      {/* Reference image modal */}
      <AnimatePresence>
        {refModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6"
            onClick={() => setRefModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              onClick={e => e.stopPropagation()}
              className="relative">
              <img
                src={PUZZLE_IMAGES[imgIdx].src}
                alt={PUZZLE_IMAGES[imgIdx].label}
                crossOrigin="anonymous"
                className="rounded-2xl shadow-2xl border-2 border-purple-500/40"
                style={{ maxWidth: "min(90vw, 480px)", maxHeight: "70vh", objectFit: "contain" }}
              />
              <button
                onClick={() => setRefModalOpen(false)}
                className="absolute -top-3 -right-3 bg-slate-800 hover:bg-slate-700 rounded-full p-1.5 text-white border border-slate-600">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
            <p className="text-slate-400 text-sm">{PUZZLE_IMAGES[imgIdx].label} — clic fuera para cerrar</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
