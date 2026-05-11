"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Camera, CameraOff, Loader2, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GesturePageTurnerProps {
  onTurnNext: () => void;
  onTurnPrev: () => void;
  onFavoriteSelection?: (text: string) => void;
  /**
   * When true (e.g. a game / exam modal is open on top of the reader) the
   * gesture detection stops emitting events — no page-turn, no finger
   * cursor. Camera stays on so reactivation is instant.
   */
  disabled?: boolean;
}

type PointerPhase = "idle" | "hover" | "selecting";

// Detect "pointing" gesture: index extended, middle/ring/pinky curled.
// Robust enough for an upright hand at any moderate distance.
function isPointingGesture(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  const indexExtended = landmarks[8].y < landmarks[6].y - 0.02;
  const middleCurled = landmarks[12].y > landmarks[10].y - 0.005;
  const ringCurled = landmarks[16].y > landmarks[14].y - 0.005;
  const pinkyCurled = landmarks[20].y > landmarks[18].y - 0.005;
  return indexExtended && middleCurled && ringCurled && pinkyCurled;
}

function getRangeAtPoint(x: number, y: number): Range | null {
  const doc: any = document;
  if (typeof doc.caretRangeFromPoint === "function") {
    return doc.caretRangeFromPoint(x, y);
  }
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos || !pos.offsetNode) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.setEnd(pos.offsetNode, pos.offset);
    return range;
  }
  return null;
}

// Snap a range's boundaries to the nearest word boundaries — the start moves
// backward to the beginning of its word, the end forward to the end of its
// word. Gives "smart" word-by-word highlighting instead of cutting mid-letter.
const WORD_CHAR = /[\p{L}\p{N}_]/u;
function expandRangeToWords(range: Range): Range {
  const out = range.cloneRange();

  if (out.startContainer.nodeType === Node.TEXT_NODE) {
    const text = out.startContainer.textContent || "";
    let s = Math.min(out.startOffset, text.length);
    while (s > 0 && WORD_CHAR.test(text[s - 1])) s--;
    try { out.setStart(out.startContainer, s); } catch { /* node detached */ }
  }

  if (out.endContainer.nodeType === Node.TEXT_NODE) {
    const text = out.endContainer.textContent || "";
    let e = Math.min(out.endOffset, text.length);
    while (e < text.length && WORD_CHAR.test(text[e])) e++;
    try { out.setEnd(out.endContainer, e); } catch { /* node detached */ }
  }

  return out;
}

export function GesturePageTurner({ onTurnNext, onTurnPrev, onFavoriteSelection, disabled = false }: GesturePageTurnerProps) {
  // Mirror prop to a ref so the RAF loop reads the latest value without being
  // a hook dependency (the loop runs at ~30fps and re-binding on every prop
  // change would tear down detectFrame).
  const disabledRef = useRef(disabled);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);

  // Swipe detection state — velocity-based.
  // We track the last ~700ms of wrist X positions; a swipe fires when the
  // hand moves >25% of the frame horizontally in one consistent direction.
  // Much more forgiving than the old "must reach 30% then 70% zone" gate.
  const swipeBufferRef = useRef<Array<{ x: number; t: number }>>([]);
  const cooldownRef = useRef<number>(0);

  const isActiveRef = useRef(false);

  // ── Finger / pointer mode state ─────────────────────────────────────────
  const [pointerVisible, setPointerVisible] = useState(false);
  const [pointerPhase, setPointerPhase] = useState<PointerPhase>("idle");
  const pointerPhaseRef = useRef<PointerPhase>("idle");
  const cursorRef = useRef<HTMLDivElement>(null);
  const anchorRangeRef = useRef<Range | null>(null);
  const hoverStartRef = useRef<number>(0);
  const hoverPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastSelectionTextRef = useRef<string>("");

  useEffect(() => {
    pointerPhaseRef.current = pointerPhase;
  }, [pointerPhase]);

  const resetPointer = useCallback(() => {
    setPointerVisible(false);
    setPointerPhase("idle");
    pointerPhaseRef.current = "idle";
    anchorRangeRef.current = null;
    hoverStartRef.current = 0;
    hoverPosRef.current = null;
  }, []);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. START CAMERA FIRST
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isActiveRef.current = true;
        setIsActive(true); 
      }

      // 2. INITIALIZE IA
      if (!landmarkerRef.current) {
        try {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm"
          );
          const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.3, // Much more forgiving
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3
          });
          landmarkerRef.current = handLandmarker;
          setIsLoading(false);
          detectFrame();
        } catch (wasmError) {
          console.error("MediaPipe load error:", wasmError);
          setError("IA no disponible. Intenta refrescar.");
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        detectFrame();
      }

    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("No se pudo acceder a la cámara. Revisa permisos.");
      setIsLoading(false);
    }
  };

  const stopCamera = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    resetPointer();
  }, [resetPointer]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // --- GESTURE LOGIC ---
  // Legacy zone-based state replaced by swipeBufferRef (velocity-based).

  const detectFrame = () => {
    if (!videoRef.current || !landmarkerRef.current || !isActiveRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const nowInMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, nowInMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw status bar
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, 40);
      ctx.font = "bold 24px Arial";

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const drawingUtils = new DrawingUtils(ctx);

        // If disabled (e.g. a game / exam modal is open) we keep drawing the
        // hand for visual feedback but skip all gesture-driven side effects.
        const isDisabled = disabledRef.current;

        const pointing = isPointingGesture(landmarks);

        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: isDisabled ? "#64748b" : pointing ? "#fbbf24" : "#4ade80",
          lineWidth: 4,
        });
        drawingUtils.drawLandmarks(landmarks, { color: "#ffffff", lineWidth: 2, radius: 5 });

        ctx.fillStyle = isDisabled ? "#94a3b8" : pointing ? "#fbbf24" : "#4ade80";
        ctx.fillText(isDisabled ? "PAUSADO ⏸" : pointing ? "DEDO ✋👉" : "MANO OK ✅", 10, 30);

        if (isDisabled) {
          // Clear any leftover pointer / swipe state and bail out
          if (pointerVisible) setPointerVisible(false);
          if (pointerPhaseRef.current !== "idle") {
            pointerPhaseRef.current = "idle";
            setPointerPhase("idle");
            anchorRangeRef.current = null;
          }
          swipeBufferRef.current = [];
        }
        // ── FINGER / POINTER MODE ──────────────────────────────────────
        else if (pointing) {
          // Reset swipe buffer so finger move doesn't trigger a page turn on exit
          swipeBufferRef.current = [];

          // Map index tip to screen coordinates (no mirror — natural movement)
          const tip = landmarks[8];
          const screenX = Math.max(0, Math.min(window.innerWidth, tip.x * window.innerWidth));
          const screenY = Math.max(0, Math.min(window.innerHeight, tip.y * window.innerHeight));

          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
          }
          if (!pointerVisible) setPointerVisible(true);

          const phase = pointerPhaseRef.current;

          // Visual ring at the index tip on the camera canvas
          ctx.beginPath();
          ctx.arc(landmarks[8].x * canvas.width, landmarks[8].y * canvas.height, 12, 0, Math.PI * 2);
          ctx.strokeStyle = phase === "selecting" ? "#fde047" : "#fbbf24";
          ctx.lineWidth = 3;
          ctx.stroke();

          if (phase === "idle") {
            hoverStartRef.current = nowInMs;
            hoverPosRef.current = { x: screenX, y: screenY };
            pointerPhaseRef.current = "hover";
            setPointerPhase("hover");
          } else if (phase === "hover") {
            const start = hoverPosRef.current;
            if (start) {
              const dx = screenX - start.x;
              const dy = screenY - start.y;
              const moved = Math.hypot(dx, dy);
              if (moved > 60) {
                hoverStartRef.current = nowInMs;
                hoverPosRef.current = { x: screenX, y: screenY };
              } else if (nowInMs - hoverStartRef.current > 500) {
                const startRange = getRangeAtPoint(start.x, start.y);
                if (startRange) {
                  anchorRangeRef.current = startRange;
                  pointerPhaseRef.current = "selecting";
                  setPointerPhase("selecting");
                }
              }
            }
          } else if (phase === "selecting" && anchorRangeRef.current) {
            const endRange = getRangeAtPoint(screenX, screenY);
            if (endRange) {
              const start = anchorRangeRef.current;
              const range = document.createRange();
              try {
                const cmp = start.compareBoundaryPoints(Range.START_TO_START, endRange);
                if (cmp <= 0) {
                  range.setStart(start.startContainer, start.startOffset);
                  range.setEnd(endRange.endContainer, endRange.endOffset);
                } else {
                  range.setStart(endRange.startContainer, endRange.startOffset);
                  range.setEnd(start.endContainer, start.endOffset);
                }
                // SMART SELECTION: snap to whole-word boundaries so the
                // highlight never cuts mid-letter. Much more readable when
                // a student wants to favorite "el coraje del protagonista".
                const wordRange = expandRangeToWords(range);
                const sel = window.getSelection();
                if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(wordRange);
                  lastSelectionTextRef.current = sel.toString();
                }
              } catch {
                // Range across detached nodes — ignore this frame
              }
            }
          }
        } else {
          // Open hand / unknown gesture → finish any pending selection, run swipe
          if (pointerPhaseRef.current === "selecting") {
            const text = lastSelectionTextRef.current?.trim() || "";
            if (text.length > 1 && onFavoriteSelection) {
              try { onFavoriteSelection(text); } catch {}
            }
          }
          if (pointerPhaseRef.current !== "idle") {
            pointerPhaseRef.current = "idle";
            setPointerPhase("idle");
            anchorRangeRef.current = null;
          }
          if (pointerVisible) setPointerVisible(false);

          // ── VELOCITY-BASED SWIPE DETECTION ─────────────────────────
          // 1) Keep a 700ms rolling buffer of wrist X (normalized 0-1)
          // 2) Take the oldest sample inside that window and the newest
          // 3) If horizontal travel > 22% of frame AND time gap >= 80ms,
          //    fire a turn in that direction
          const wristX = landmarks[0].x;
          const buf = swipeBufferRef.current;
          buf.push({ x: wristX, t: nowInMs });
          // Drop entries older than 700ms
          while (buf.length > 0 && nowInMs - buf[0].t > 700) buf.shift();

          // Visual hint: thin dashed midline so user knows movement direction matters
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.moveTo(canvas.width * 0.5, 40); ctx.lineTo(canvas.width * 0.5, canvas.height); ctx.stroke();
          ctx.setLineDash([]);

          const cooldownTime = 650;
          if (buf.length >= 3 && nowInMs - cooldownRef.current > cooldownTime) {
            const first = buf[0];
            const last = buf[buf.length - 1];
            const dx = last.x - first.x;
            const dt = last.t - first.t;
            const MIN_DX = 0.22;
            const MIN_DT = 80;

            if (dt >= MIN_DT && Math.abs(dx) >= MIN_DX) {
              // Verify direction is consistent (not back-and-forth)
              let consistent = true;
              const sign = Math.sign(dx);
              for (let i = 1; i < buf.length; i++) {
                if (Math.sign(buf[i].x - buf[i - 1].x) === -sign &&
                    Math.abs(buf[i].x - buf[i - 1].x) > 0.04) {
                  consistent = false; break;
                }
              }
              if (consistent) {
                // MediaPipe coordinates are NOT mirrored. The preview shown to
                // the user IS mirrored (CSS scaleX(-1)). So:
                //   • User moves hand RIGHT (their right) → camera sees it move
                //     LEFT → MP x DECREASES → dx < 0 → user expects PREV
                //   • User moves hand LEFT (their left) → MP x INCREASES → dx > 0
                //     → user expects NEXT (like turning the page of a book)
                if (dx > 0) {
                  onTurnNext();
                  flashScreen("rgba(139, 92, 246, 0.9)");
                } else {
                  onTurnPrev();
                  flashScreen("rgba(59, 130, 246, 0.9)");
                }
                cooldownRef.current = nowInMs;
                swipeBufferRef.current = [];
              }
            }
          }

          // Hint label
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "bold 13px Arial";
          ctx.fillText("← desliza →", 10, canvas.height - 14);
        }
      } else {
        ctx.fillStyle = "#fbbf24";
        ctx.fillText("BUSCANDO MANO...", 10, 30);
        swipeBufferRef.current = [];
        if (pointerVisible) setPointerVisible(false);
        if (pointerPhaseRef.current !== "idle") {
          pointerPhaseRef.current = "idle";
          setPointerPhase("idle");
          anchorRangeRef.current = null;
        }
      }
    }

    if (isActiveRef.current) {
      requestRef.current = requestAnimationFrame(detectFrame);
    }
  };

  const flashScreen = (color: string) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Finger-mode cursor — fixed-position triangle that follows the index tip */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          transform: "translate3d(-100px, -100px, 0)",
          willChange: "transform",
          pointerEvents: "none",
          zIndex: 9999,
          opacity: pointerVisible ? 1 : 0,
          transition: "opacity 150ms ease-out",
        }}
      >
        <div
          style={{
            transform: "translate(-4px, -4px)",
            filter:
              pointerPhase === "selecting"
                ? "drop-shadow(0 0 6px rgba(253,224,71,0.95))"
                : "drop-shadow(0 0 4px rgba(0,0,0,0.6))",
          }}
        >
          <MousePointer2
            className={cn(
              "h-8 w-8",
              pointerPhase === "selecting" ? "text-yellow-300" : "text-white"
            )}
            strokeWidth={2.5}
            fill={pointerPhase === "selecting" ? "rgba(253,224,71,0.55)" : "rgba(255,255,255,0.25)"}
          />
        </div>
        {pointerPhase === "hover" && (
          <span
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              fontSize: 10,
              fontWeight: 700,
              color: "#fbbf24",
              background: "rgba(0,0,0,0.65)",
              padding: "2px 6px",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            mantén firme…
          </span>
        )}
        {pointerPhase === "selecting" && (
          <span
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              fontSize: 10,
              fontWeight: 700,
              color: "#0f172a",
              background: "#fde047",
              padding: "2px 6px",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            seleccionando
          </span>
        )}
      </div>

      {/* Floating control button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* The Camera Window */}
        <div className={cn(
          "relative w-56 h-42 bg-black rounded-xl overflow-hidden border-2 border-indigo-500 shadow-2xl backdrop-blur-md transition-all duration-500",
          isActive ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none h-0"
        )}>
          <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded">
              IA LIVE
            </span>
          </div>
          {isActive && (
            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 pointer-events-none">
              <span className="text-[9px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                ☝️ Apunta para seleccionar texto · ✋ Mueve para pasar página
              </span>
            </div>
          )}
        </div>

        <Button
          onClick={isActive ? stopCamera : startCamera}
          disabled={isLoading}
          className={cn(
            "rounded-full shadow-2xl border h-14 w-14 p-0 flex items-center justify-center transition-all duration-300 group",
            isActive 
              ? "bg-red-500 hover:bg-red-600 border-red-400 text-white" 
              : "bg-[#1E1B4B] hover:bg-[#312E81] border-indigo-500 text-indigo-300"
          )}
          title={isActive ? "Desactivar Manos Libres" : "Activar Manos Libres (IA)"}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isActive ? (
            <CameraOff className="h-6 w-6" />
          ) : (
            <Camera className="h-6 w-6 group-hover:scale-110 transition-transform" />
          )}
        </Button>
      </div>

      {error && (
        <div className="fixed bottom-24 right-6 bg-red-500/90 text-white text-xs px-4 py-2 rounded-lg shadow-xl z-[70] backdrop-blur-md max-w-[200px]">
          {error}
        </div>
      )}
    </div>
  );
}
