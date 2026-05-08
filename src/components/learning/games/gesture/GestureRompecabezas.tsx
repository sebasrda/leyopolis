"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureCamUI } from "./GestureCamUI";
import { useGestureCam } from "./useGestureCam";
import type { GestureState } from "./useGestureCam";

// ─── Layout ───────────────────────────────────────────────────────────────────
const GRID      = 3;
const PIECE_SZ  = 110;
const BOARD_SZ  = GRID * PIECE_SZ;   // 330
const CW        = 700;
const CH        = 430;
const BX        = 10;
const BY        = 52;
const TX        = BX + BOARD_SZ + 20; // 360
const SNAP_DIST = 80;   // px — distance to nearest slot centre for auto-snap on drop click
const HOVER_R   = 65;   // px — hover highlight radius around cursor

// ms the fist must be held for a confirmed "click". 280 keeps it intentional
// without feeling laggy (was 500 — too slow for an arcade-style puzzle).
const CLICK_MS  = 280;

const boardSlots = Array.from({ length: 9 }, (_, i) => ({
  x: BX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));
const traySlots = Array.from({ length: 9 }, (_, i) => ({
  x: TX + (i % GRID) * PIECE_SZ,
  y: BY + Math.floor(i / GRID) * PIECE_SZ,
}));

// ─── 35 puzzle images — paisajes, naturaleza y temas creativos ───────────────
// Picsum.photos returns a stable random photo per seed. Seeds are chosen so
// the resulting catalog feels diverse: nature, animals, sky, art, micro/macro.
const PUZZLE_IMAGES = [
  // ─ Original 15 ─
  { src: "https://picsum.photos/seed/mntpzl/330/330",   label: "Montañas"      },
  { src: "https://picsum.photos/seed/ocnpzl/330/330",   label: "Océano"        },
  { src: "https://picsum.photos/seed/frstpzl/330/330",  label: "Bosque"        },
  { src: "https://picsum.photos/seed/flwrpzl/330/330",  label: "Flores"        },
  { src: "https://picsum.photos/seed/ctypzl/330/330",   label: "Ciudad"        },
  { src: "https://picsum.photos/seed/anmlpzl/330/330",  label: "Animales"      },
  { src: "https://picsum.photos/seed/bchpzl/330/330",   label: "Playa"         },
  { src: "https://picsum.photos/seed/spcpzl/330/330",   label: "Espacio"       },
  { src: "https://picsum.photos/seed/foodpzl/330/330",  label: "Comida"        },
  { src: "https://picsum.photos/seed/wntpzl/330/330",   label: "Invierno"      },
  { src: "https://picsum.photos/seed/snstpzl/330/330",  label: "Atardecer"     },
  { src: "https://picsum.photos/seed/advpzl/330/330",   label: "Aventura"      },
  { src: "https://picsum.photos/seed/hstpzl/330/330",   label: "Historia"      },
  { src: "https://picsum.photos/seed/grdnpzl/330/330",  label: "Jardín"        },
  { src: "https://picsum.photos/seed/rnbwpzl/330/330",  label: "Arcoíris"      },
  // ─ +20 nuevos: paisajes y temas creativos ─
  { src: "https://picsum.photos/seed/aurorapz/330/330", label: "Aurora Boreal" },
  { src: "https://picsum.photos/seed/cascadapz/330/330",label: "Cascada"       },
  { src: "https://picsum.photos/seed/sakurapz/330/330", label: "Cerezos"       },
  { src: "https://picsum.photos/seed/vlcnpz/330/330",   label: "Volcán"        },
  { src: "https://picsum.photos/seed/dsrtpz/330/330",   label: "Desierto"      },
  { src: "https://picsum.photos/seed/glciarpz/330/330", label: "Glaciar"       },
  { src: "https://picsum.photos/seed/lagopz/330/330",   label: "Lago Alpino"   },
  { src: "https://picsum.photos/seed/faropz/330/330",   label: "Faro"          },
  { src: "https://picsum.photos/seed/pradpz/330/330",   label: "Pradera"       },
  { src: "https://picsum.photos/seed/cuevapz/330/330",  label: "Cuevas"        },
  { src: "https://picsum.photos/seed/lavandpz/330/330", label: "Lavanda"       },
  { src: "https://picsum.photos/seed/castllpz/330/330", label: "Castillo"      },
  { src: "https://picsum.photos/seed/globopz/330/330",  label: "Globos"        },
  { src: "https://picsum.photos/seed/coralpz/330/330",  label: "Arrecife"      },
  { src: "https://picsum.photos/seed/zorropz/330/330",  label: "Zorro"         },
  { src: "https://picsum.photos/seed/tigrepz/330/330",  label: "Tigre"         },
  { src: "https://picsum.photos/seed/mariposapz/330/330", label: "Mariposa"    },
  { src: "https://picsum.photos/seed/colibripz/330/330",label: "Colibrí"       },
  { src: "https://picsum.photos/seed/gxlxpz/330/330",   label: "Galaxia"       },
  { src: "https://picsum.photos/seed/streetartpz/330/330", label: "Arte Urbano" },
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
  const [refModalOpen, setRefModalOpen] = useState(false);

  const puzzleCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef          = useRef<HTMLImageElement | null>(null);
  const piecesRef       = useRef<Piece[]>([]);
  const phaseRef        = useRef<Phase>("selecting");
  const gameStartRef    = useRef(0);
  const onCompleteRef   = useRef(onComplete);

  // ── Interaction refs ───────────────────────────────────────────────────────
  // hoveredRef  : piece highlighted near cursor (updated every frame, any gesture)
  // grabbedRef  : piece currently attached to the cursor after a grab-click
  // fistStartRef: timestamp when current fist started, null = not fisting
  // fistFiredRef: true = this fist-hold already triggered a click — wait for release
  // clickProgRef: 0-1 progress of the current fist hold
  const hoveredRef   = useRef<number | null>(null);
  const grabbedRef   = useRef<number | null>(null);
  const fistStartRef = useRef<number | null>(null);
  const fistFiredRef = useRef(false);
  const clickProgRef = useRef(0);

  // Mirror gestureState into a ref so the RAF loop always reads fresh values
  // without being a dependency of the effect.
  const gestureStateRef = useRef<GestureState>({ gesture: null, fingerCount: 0, isHandDetected: false });

  const { isActive, isLoading, error, gestureState, getPosition,
          videoRef, canvasRef, startCamera, stopCamera } = useGestureCam();

  useEffect(() => { phaseRef.current      = phase;       }, [phase]);
  useEffect(() => { gestureStateRef.current = gestureState; }, [gestureState]);
  useEffect(() => { onCompleteRef.current  = onComplete;  }, [onComplete]);

  // ── Piece hit-test ────────────────────────────────────────────────────────
  const findPiece = useCallback((cx: number, cy: number, extra = 0): Piece | null => {
    for (const p of piecesRef.current) {
      if (p.slot !== null) continue;
      const { x, y } = traySlots[p.trayPos];
      if (cx >= x - extra && cx < x + PIECE_SZ + extra &&
          cy >= y - extra && cy < y + PIECE_SZ + extra) return p;
    }
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

  // ── Start puzzle ──────────────────────────────────────────────────────────
  const startPuzzle = useCallback(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = PUZZLE_IMAGES[imgIdx].src;
    const init = () => {
      piecesRef.current  = shuffle(Array.from({ length: 9 }, (_, i) => i))
        .map((id, trayPos) => ({ id, trayPos, slot: null }));
      grabbedRef.current = null;
      hoveredRef.current = null;
      fistStartRef.current = null;
      fistFiredRef.current = false;
      clickProgRef.current = 0;
      gameStartRef.current = Date.now();
      setPhase("playing");
      phaseRef.current = "playing";
    };
    img.onload  = () => { imgRef.current = img;  init(); };
    img.onerror = () => { imgRef.current = null; init(); };
  }, [imgIdx]);

  // ── RAF draw + interaction loop ───────────────────────────────────────────
  //
  // INTERACTION MODEL
  // ─────────────────
  // • Piece NOT grabbed:
  //     – Open hand → cursor moves, nearest piece within HOVER_R highlights
  //     – Fist held for CLICK_MS → GRAB the highlighted (or nearest) piece
  //
  // • Piece IS grabbed:
  //     – ANY gesture → piece follows cursor (no need to hold fist)
  //     – Fist held for CLICK_MS → DROP: snap to nearest board slot, or back to tray
  //
  // The fist-click fires once per fist-hold (fistFiredRef prevents re-fire).
  // Timer runs entirely in the RAF loop → never interrupted by React re-renders.
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
      const gs      = gestureStateRef.current;
      const isHand  = gs.isHandDetected;
      const isFist  = gs.gesture === "fist";
      const cx      = (pos?.vx ?? 0.5) * CW;
      const cy      = (pos?.vy ?? 0.5) * CH;
      const grabbed = grabbedRef.current;
      const now     = performance.now();

      // ── Hover: nearest piece to cursor (any gesture, only when nothing grabbed) ──
      if (isHand && grabbed === null) {
        hoveredRef.current = findPiece(cx, cy, HOVER_R)?.id ?? null;
      } else if (!isHand) {
        hoveredRef.current = null;
      }
      // When grabbed: no hover needed (cursor carries the piece)

      // ── Fist click timer ─────────────────────────────────────────────────
      if (isHand && isFist) {
        if (fistFiredRef.current) {
          // Fist already triggered this hold — wait for release
          clickProgRef.current = 0;
        } else {
          if (fistStartRef.current === null) fistStartRef.current = now;
          const held = now - fistStartRef.current;
          clickProgRef.current = Math.min(held / CLICK_MS, 1);

          if (held >= CLICK_MS) {
            // ── CLICK FIRED ──────────────────────────────────────────────
            fistFiredRef.current = true;
            fistStartRef.current = null;
            clickProgRef.current = 0;

            if (grabbed === null) {
              // ── GRAB: first click ─────────────────────────────────────
              let target = hoveredRef.current;
              if (target === null) target = findPiece(cx, cy, 55)?.id ?? null;
              if (target !== null) {
                const piece = piecesRef.current.find(p => p.id === target);
                if (piece?.slot !== null) {
                  piecesRef.current = piecesRef.current.map(p =>
                    p.id === target ? { ...p, slot: null } : p);
                }
                grabbedRef.current = target;
                hoveredRef.current = null;
              }
            } else {
              // ── DROP: second click ────────────────────────────────────
              const pieceId = grabbed;
              let bestSlot = -1; let bestDist = SNAP_DIST;
              for (let s = 0; s < 9; s++) {
                const { x, y } = boardSlots[s];
                const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
                const dist = Math.hypot(cx - sc.x, cy - sc.y);
                if (!piecesRef.current.some(p => p.slot === s && p.id !== pieceId) && dist < bestDist) {
                  bestDist = dist; bestSlot = s;
                }
              }
              if (bestSlot >= 0) {
                // Place on slot
                piecesRef.current = piecesRef.current.map(p =>
                  p.id === pieceId ? { ...p, slot: bestSlot } : p);
                if (piecesRef.current.every(p => p.slot === p.id) && phaseRef.current === "playing") {
                  const elapsed = (Date.now() - gameStartRef.current) / 1000;
                  setCompletionTime(elapsed);
                  setPhase("complete");
                  phaseRef.current = "complete";
                  onCompleteRef.current?.(10, 10);
                }
              }
              // Whether snapped or not, release the piece
              grabbedRef.current = null;
              hoveredRef.current = null;
            }
          }
        }
      } else {
        // Fist released → ready for next click
        fistFiredRef.current = false;
        fistStartRef.current = null;
        clickProgRef.current = 0;
      }

      // ── Draw piece helper ─────────────────────────────────────────────────
      const dp = (id: number, dx: number, dy: number, alpha = 1) => {
        const c = ctx as CanvasRenderingContext2D;
        c.save(); c.globalAlpha = alpha;
        if (img) {
          c.beginPath(); c.rect(dx, dy, PIECE_SZ, PIECE_SZ); c.clip();
          c.drawImage(img, (id % GRID) * PIECE_SZ, Math.floor(id / GRID) * PIECE_SZ,
            PIECE_SZ, PIECE_SZ, dx, dy, PIECE_SZ, PIECE_SZ);
        } else {
          c.fillStyle = PIECE_COLORS[id]; c.fillRect(dx, dy, PIECE_SZ, PIECE_SZ);
          c.fillStyle = "rgba(255,255,255,0.9)"; c.font = "bold 30px sans-serif"; c.textAlign = "center";
          c.fillText((id + 1).toString(), dx + PIECE_SZ / 2, dy + PIECE_SZ / 2 + 10);
        }
        c.restore();
      };

      // ── Background ────────────────────────────────────────────────────────
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

      // ── Board slots ───────────────────────────────────────────────────────
      for (let s = 0; s < 9; s++) {
        const { x, y } = boardSlots[s];
        const placed = piecesRef.current.find(p => p.slot === s);
        if (placed && placed.id !== grabbedRef.current) {
          dp(placed.id, x, y);
          const correct = placed.id === s;
          ctx.strokeStyle = correct ? "#4ade80" : "#f59e0b";
          ctx.lineWidth   = correct ? 3 : 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
          if (hoveredRef.current === placed.id) {
            ctx.fillStyle  = "rgba(251,191,36,0.2)"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
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

      // ── Tray pieces ───────────────────────────────────────────────────────
      for (const piece of piecesRef.current) {
        if (piece.slot !== null || piece.id === grabbedRef.current) continue;
        const { x, y } = traySlots[piece.trayPos];
        dp(piece.id, x, y);
        const hl = hoveredRef.current === piece.id;
        if (hl) {
          ctx.fillStyle  = "rgba(251,191,36,0.2)"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
          ctx.fillStyle = "#fbbf24"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("✊ click para agarrar", x + PIECE_SZ / 2, y + PIECE_SZ - 5);
        } else {
          ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, PIECE_SZ - 2, PIECE_SZ - 2);
        }
      }

      // ── Grabbed piece — follows cursor at any gesture ─────────────────────
      if (grabbedRef.current !== null) {
        const dx = cx - PIECE_SZ / 2; const dy = cy - PIECE_SZ / 2;
        ctx.save(); ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 24;
        dp(grabbedRef.current, dx, dy, 0.92); ctx.restore();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
        ctx.strokeRect(dx + 1, dy + 1, PIECE_SZ - 2, PIECE_SZ - 2);

        // Snap highlight — shows where the piece will land
        let snapSlot = -1; let snapDist = SNAP_DIST;
        for (let s = 0; s < 9; s++) {
          const { x, y } = boardSlots[s];
          const sc = { x: x + PIECE_SZ / 2, y: y + PIECE_SZ / 2 };
          const d  = Math.hypot(cx - sc.x, cy - sc.y);
          if (!piecesRef.current.some(p => p.slot === s && p.id !== grabbedRef.current) && d < snapDist) {
            snapDist = d; snapSlot = s;
          }
        }
        if (snapSlot >= 0) {
          const { x, y } = boardSlots[snapSlot];
          ctx.fillStyle  = "rgba(167,139,250,0.25)"; ctx.fillRect(x, y, PIECE_SZ, PIECE_SZ);
          ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]); ctx.strokeRect(x + 2, y + 2, PIECE_SZ - 4, PIECE_SZ - 4);
          ctx.setLineDash([]);
          ctx.fillStyle = "#a78bfa"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("✊ click para colocar", x + PIECE_SZ / 2, y + PIECE_SZ / 2 + 4);
        }
      }

      // ── Cursor ────────────────────────────────────────────────────────────
      if (isHand) {
        const hasAction = grabbedRef.current !== null || hoveredRef.current !== null;
        const col = hasAction ? "#fbbf24" : "#a78bfa";
        const R   = grabbedRef.current !== null ? 20 : 13;

        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.font = "16px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(isFist ? "✊" : "🖐", cx + 16, cy - 4);

        // Click progress arc — fills while fist is held
        const prog = clickProgRef.current;
        if (isFist && prog > 0) {
          const ARC_R = 30;
          ctx.beginPath(); ctx.arc(cx, cy, ARC_R, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(167,139,250,0.2)"; ctx.lineWidth = 5; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, ARC_R, -Math.PI / 2, -Math.PI / 2 + prog * 2 * Math.PI);
          ctx.strokeStyle = grabbedRef.current !== null ? "#fbbf24" : "#a78bfa";
          ctx.lineWidth = 5; ctx.stroke();
        }
      }

      // ── Progress bar ──────────────────────────────────────────────────────
      const correct = piecesRef.current.filter(p => p.slot === p.id).length;
      const barY    = CH - 18;
      ctx.fillStyle = "#1a1640"; ctx.fillRect(10, barY, CW - 20, 10);
      if (correct > 0) { ctx.fillStyle = "#4ade80"; ctx.fillRect(10, barY, ((CW - 20) * correct) / 9, 10); }
      ctx.fillStyle = "#a5b4fc"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${correct}/9 en su lugar`, CW - 10, barY - 4);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, getPosition, findPiece, setPhase, setCompletionTime]);

  // ── SELECTING ─────────────────────────────────────────────────────────────
  if (phase === "selecting") {
    return (
      <div className="flex flex-col items-center gap-6 p-6 w-full max-w-3xl mx-auto">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-1">🧩 Rompecabezas Gestual</h3>
          <p className="text-slate-400 text-sm">Dos clicks con el puño para agarrar y colocar cada pieza</p>
        </div>

        <div className="flex items-center gap-3 w-full">
          <Button variant="ghost" size="icon"
            onClick={() => setImgIdx(i => (i - 1 + PUZZLE_IMAGES.length) % PUZZLE_IMAGES.length)}
            className="text-white hover:bg-white/10 shrink-0">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1 flex flex-col items-center gap-3">
            <div className="grid grid-cols-5 gap-2 max-h-[260px] overflow-y-auto pr-1 py-1 custom-scroll">
              {PUZZLE_IMAGES.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  title={img.label}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === imgIdx ? "border-purple-400 scale-110 shadow-lg shadow-purple-500/50"
                                 : "border-slate-700 opacity-55 hover:opacity-80"}`}>
                  <img src={img.src} alt={img.label} loading="lazy" className="w-full h-full object-cover" crossOrigin="anonymous" />
                </button>
              ))}
            </div>
            <p className="text-white font-bold text-xl">{PUZZLE_IMAGES[imgIdx].label}</p>
            <p className="text-[11px] text-slate-500">{PUZZLE_IMAGES.length} imágenes disponibles</p>
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
          <p>① Activa la cámara y muestra tu mano 🖐</p>
          <p>② Mueve la mano sobre una pieza — se resalta en amarillo</p>
          <p>③ <strong>Cierra el puño ✊ y mantén (~0.5 s)</strong> — el arco se llena → ¡AGARRADA!</p>
          <p>④ Abre la mano y mueve la pieza a su lugar en el tablero</p>
          <p>⑤ <strong>Cierra el puño ✊ otra vez</strong> sobre la ranura para colocarla</p>
          <p>⑥ ¿Mal puesta? Pasa la mano encima y repite el click ✊</p>
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
  const gs = gestureState;
  const isGrabbing = grabbedRef.current !== null;
  const statusLabel =
    !isActive          ? "Activa la cámara para jugar" :
    !gs.isHandDetected ? "Muestra tu mano a la cámara" :
    isGrabbing         ? "Pieza agarrada 🧩 — muévela y ✊ click para colocar" :
    gs.gesture === "fist" ? "✊ Manteniendo puño…" :
    hoveredRef.current !== null ? "🟡 Pieza seleccionada — ✊ click para agarrar" :
                         "🖐 Mueve la mano sobre una pieza";

  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-purple-300">🧩 {PUZZLE_IMAGES[imgIdx].label}</span>
        <button onClick={() => setRefModalOpen(true)}
          className="flex items-center gap-1.5 group" title="Ver imagen de referencia grande">
          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Referencia (clic):</span>
          <img src={PUZZLE_IMAGES[imgIdx].src} alt="ref" crossOrigin="anonymous"
            className="w-16 h-16 rounded-lg object-cover border-2 border-purple-500/40 group-hover:border-purple-400 group-hover:scale-105 transition-all cursor-zoom-in" />
        </button>
        <Button variant="ghost" size="sm" onClick={() => setPhase("selecting")}
          className="text-slate-400 hover:text-white text-xs">Cambiar imagen</Button>
      </div>

      <canvas ref={puzzleCanvasRef} width={CW} height={CH}
        className="rounded-2xl border border-purple-500/20 w-full"
        style={{ display: "block", margin: "0 auto" }} />

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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6"
            onClick={() => setRefModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }} transition={{ type: "spring", bounce: 0.3 }}
              onClick={e => e.stopPropagation()} className="relative">
              <img src={PUZZLE_IMAGES[imgIdx].src} alt={PUZZLE_IMAGES[imgIdx].label}
                crossOrigin="anonymous" className="rounded-2xl shadow-2xl border-2 border-purple-500/40"
                style={{ maxWidth: "min(90vw, 480px)", maxHeight: "70vh", objectFit: "contain" }} />
              <button onClick={() => setRefModalOpen(false)}
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
