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

export function GesturePageTurner({ onTurnNext, onTurnPrev, onFavoriteSelection }: GesturePageTurnerProps) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);

  // Swipe detection state
  const lastXRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
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
  const gestureState = useRef<"NONE" | "RIGHT_ZONE" | "LEFT_ZONE">("NONE");
  const stateTimestamp = useRef<number>(0);

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

        const pointing = isPointingGesture(landmarks);

        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: pointing ? "#fbbf24" : "#4ade80",
          lineWidth: 4,
        });
        drawingUtils.drawLandmarks(landmarks, { color: "#ffffff", lineWidth: 2, radius: 5 });

        ctx.fillStyle = pointing ? "#fbbf24" : "#4ade80";
        ctx.fillText(pointing ? "DEDO ✋👉" : "MANO OK ✅", 10, 30);

        // ── FINGER / POINTER MODE ──────────────────────────────────────
        if (pointing) {
          // Reset swipe state so finger move doesn't trigger a page turn after exit
          gestureState.current = "NONE";

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
            // Begin hovering at this point
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
                // Finger drifted — reset hover anchor
                hoverStartRef.current = nowInMs;
                hoverPosRef.current = { x: screenX, y: screenY };
              } else if (nowInMs - hoverStartRef.current > 500) {
                // Held still long enough → enter selecting mode
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
                const sel = window.getSelection();
                if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(range);
                  lastSelectionTextRef.current = sel.toString();
                }
              } catch {
                // Range across detached nodes — ignore this frame
              }
            }
          }
        } else {
          // Not pointing: confirm any pending selection and run the existing swipe logic
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

          const handX = landmarks[0].x; // Wrist

          // Zones
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.setLineDash([10, 5]);
          ctx.beginPath(); ctx.moveTo(canvas.width * 0.3, 40); ctx.lineTo(canvas.width * 0.3, canvas.height); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(canvas.width * 0.7, 40); ctx.lineTo(canvas.width * 0.7, canvas.height); ctx.stroke();
          ctx.setLineDash([]);

          const cooldownTime = 1200;
          if (nowInMs - cooldownRef.current > cooldownTime) {
            if (handX < 0.3) {
              if (gestureState.current !== "RIGHT_ZONE") {
                gestureState.current = "RIGHT_ZONE";
                stateTimestamp.current = nowInMs;
              }
            }
            else if (handX > 0.7) {
              if (gestureState.current === "RIGHT_ZONE" && (nowInMs - stateTimestamp.current < 1500)) {
                onTurnNext();
                cooldownRef.current = nowInMs;
                gestureState.current = "NONE";
                flashScreen("rgba(139, 92, 246, 0.9)");
              } else {
                gestureState.current = "LEFT_ZONE";
                stateTimestamp.current = nowInMs;
              }
            }

            if (handX < 0.3 && gestureState.current === "LEFT_ZONE" && (nowInMs - stateTimestamp.current < 1500)) {
                onTurnPrev();
                cooldownRef.current = nowInMs;
                gestureState.current = "NONE";
                flashScreen("rgba(59, 130, 246, 0.9)");
            }

            if (gestureState.current === "RIGHT_ZONE") {
               ctx.fillStyle = "rgba(139, 92, 246, 0.7)";
               ctx.fillRect(0, 40, canvas.width * 0.3, canvas.height - 40);
               ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.fillText("PASAR PÁGINA >>", 20, canvas.height - 30);
            } else if (gestureState.current === "LEFT_ZONE") {
               ctx.fillStyle = "rgba(59, 130, 246, 0.7)";
               ctx.fillRect(canvas.width * 0.7, 40, canvas.width * 0.3, canvas.height - 40);
               ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.fillText("<< VOLVER", canvas.width * 0.7 + 10, canvas.height - 30);
            }
          }
        }
      } else {
        ctx.fillStyle = "#fbbf24";
        ctx.fillText("BUSCANDO MANO...", 10, 30);
        if (nowInMs - stateTimestamp.current > 2000) gestureState.current = "NONE";
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
