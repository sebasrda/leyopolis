"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GestureNavItem {
  label: string;
  href: string;
}

interface GestureMenuNavigatorProps {
  navItems: GestureNavItem[];
  onNavigate: (href: string) => void;
  onHighlightChange?: (index: number | null) => void;
}

const FIST_DWELL_MS = 900;
const NAVIGATE_COOLDOWN_MS = 2500;

export function GestureMenuNavigator({ navItems, onNavigate, onHighlightChange }: GestureMenuNavigatorProps) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [fistProgress, setFistProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);
  const isActiveRef = useRef(false);

  // Refs for values used inside the rAF loop (avoids stale closures)
  const navItemsRef = useRef(navItems);
  const onNavigateRef = useRef(onNavigate);
  const onHighlightChangeRef = useRef(onHighlightChange);
  const fistStartRef = useRef<number | null>(null);
  const lastNavigateRef = useRef<number>(0);
  const currentIndexRef = useRef<number | null>(null);

  useEffect(() => { navItemsRef.current = navItems; }, [navItems]);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { onHighlightChangeRef.current = onHighlightChange; }, [onHighlightChange]);

  const isFist = (landmarks: any[]): boolean => {
    // Compare each fingertip (8,12,16,20) vs its PIP joint (6,10,14,18)
    // In image coords, y increases downward → tip.y > pip.y means finger is curled
    const tipPips = [[8, 6], [12, 10], [16, 14], [20, 18]];
    const curled = tipPips.filter(([tip, pip]) => landmarks[tip].y > landmarks[pip].y).length;
    return curled >= 3;
  };

  const detectFrame = () => {
    if (!videoRef.current || !landmarkerRef.current || !isActiveRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const items = navItemsRef.current;

    if (video.videoWidth > 0 && video.videoHeight > 0 && ctx && items.length > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const now = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Header bar background
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, canvas.width, 46);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const drawingUtils = new DrawingUtils(ctx);
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#a78bfa", lineWidth: 3 });
        drawingUtils.drawLandmarks(landmarks, { color: "#ffffff", lineWidth: 1, radius: 4 });

        // Use middle finger MCP (landmark 9) as palm center Y
        const handY = landmarks[9].y;
        const rawIdx = Math.floor(handY * items.length);
        const itemIndex = Math.max(0, Math.min(rawIdx, items.length - 1));
        const item = items[itemIndex];

        // Update highlighted item when it changes
        if (currentIndexRef.current !== itemIndex) {
          currentIndexRef.current = itemIndex;
          setCurrentLabel(item.label);
          onHighlightChangeRef.current?.(itemIndex);
          fistStartRef.current = null; // reset fist dwell on item change
        }

        const fistDetected = isFist(landmarks);

        if (fistDetected) {
          if (fistStartRef.current === null) fistStartRef.current = now;
          const elapsed = now - fistStartRef.current;
          const prog = Math.min(elapsed / FIST_DWELL_MS, 1);
          setFistProgress(prog);

          // Draw circular progress arc centered on canvas
          const cx = canvas.width * 0.5;
          const cy = canvas.height * 0.5;
          ctx.save();
          ctx.strokeStyle = "rgba(167,139,250,0.25)";
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, 52, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, 52, -Math.PI / 2, -Math.PI / 2 + prog * 2 * Math.PI);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = "#a78bfa";
          ctx.font = "bold 17px Arial";
          const label = item.label.length > 14 ? item.label.substring(0, 14) + "…" : item.label;
          ctx.fillText(`✊ Abriendo: ${label}`, 10, 32);

          if (elapsed >= FIST_DWELL_MS && now - lastNavigateRef.current > NAVIGATE_COOLDOWN_MS) {
            lastNavigateRef.current = now;
            fistStartRef.current = null;
            setFistProgress(0);
            onNavigateRef.current(item.href);
          }
        } else {
          if (fistStartRef.current !== null) {
            fistStartRef.current = null;
            setFistProgress(0);
          }
          ctx.fillStyle = "#4ade80";
          ctx.font = "bold 17px Arial";
          const label = item.label.length > 14 ? item.label.substring(0, 14) + "…" : item.label;
          ctx.fillText(`🖐 Señalando: ${label}`, 10, 32);
        }

        // Draw item zone lanes on the right side of the canvas
        const laneW = 110;
        for (let i = 0; i < items.length; i++) {
          const zoneH = canvas.height / items.length;
          const zoneY = i * zoneH;
          const isHighlighted = i === itemIndex;

          if (isHighlighted) {
            ctx.fillStyle = "rgba(167,139,250,0.18)";
            ctx.fillRect(canvas.width - laneW, zoneY, laneW, zoneH);
            ctx.strokeStyle = "rgba(167,139,250,0.7)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            ctx.strokeRect(canvas.width - laneW, zoneY + 1, laneW - 1, zoneH - 2);
          }

          const maxChars = 12;
          const name = items[i].label.length > maxChars
            ? items[i].label.substring(0, maxChars) + "…"
            : items[i].label;
          ctx.fillStyle = isHighlighted ? "#c4b5fd" : "rgba(255,255,255,0.35)";
          ctx.font = isHighlighted ? "bold 12px Arial" : "11px Arial";
          ctx.fillText(name, canvas.width - laneW + 6, zoneY + zoneH / 2 + 5);
        }
      } else {
        // No hand detected
        if (fistStartRef.current !== null) {
          fistStartRef.current = null;
          setFistProgress(0);
        }
        if (currentIndexRef.current !== null) {
          currentIndexRef.current = null;
          setCurrentLabel(null);
          onHighlightChangeRef.current?.(null);
        }
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 17px Arial";
        ctx.fillText("Buscando mano...", 10, 32);
      }
    }

    if (isActiveRef.current) {
      requestRef.current = requestAnimationFrame(detectFrame);
    }
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isActiveRef.current = true;
        setIsActive(true);
      }
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
            minHandDetectionConfidence: 0.3,
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3
          });
          landmarkerRef.current = handLandmarker;
          setIsLoading(false);
          detectFrame();
        } catch {
          setError("IA no disponible. Intenta refrescar.");
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        detectFrame();
      }
    } catch {
      setError("No se pudo acceder a la cámara. Revisa permisos.");
      setIsLoading(false);
    }
  };

  const stopCamera = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setCurrentLabel(null);
    setFistProgress(0);
    onHighlightChangeRef.current?.(null);
    currentIndexRef.current = null;
    fistStartRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  return (
    <div>
      {/* Floating container — bottom right (reader camera only appears on /reader/ routes) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Camera window */}
        <div className={cn(
          "relative w-56 bg-black rounded-xl overflow-hidden border-2 transition-all duration-500",
          isActive
            ? "opacity-100 scale-100 border-purple-500 shadow-2xl shadow-purple-500/20 h-40"
            : "opacity-0 scale-95 pointer-events-none h-0 border-transparent"
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
          {/* Live badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 pointer-events-none">
            <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/50 px-1.5 py-0.5 rounded">
              MENÚ IA
            </span>
          </div>
          {/* Status label at bottom of camera */}
          {isActive && currentLabel && fistProgress === 0 && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded-lg px-2 py-1">
              <p className="text-[10px] text-purple-300 font-bold truncate">👆 {currentLabel}</p>
              <p className="text-[9px] text-slate-400">Cierra la mano para abrir</p>
            </div>
          )}
          {isActive && fistProgress > 0 && (
            <div className="absolute bottom-2 left-2 right-2 bg-purple-900/80 rounded-lg px-2 py-1">
              <p className="text-[10px] text-purple-200 font-bold truncate">Abriendo: {currentLabel}</p>
              <div className="w-full bg-purple-900/50 rounded-full h-1 mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full transition-all duration-75"
                  style={{ width: `${fistProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <Button
          onClick={isActive ? stopCamera : startCamera}
          disabled={isLoading}
          className={cn(
            "rounded-full shadow-2xl border h-14 w-14 p-0 flex items-center justify-center transition-all duration-300 group",
            isActive
              ? "bg-red-500 hover:bg-red-600 border-red-400 text-white"
              : "bg-[#1E1B4B] hover:bg-[#312E81] border-purple-500 text-purple-300"
          )}
          title={isActive ? "Desactivar Navegación por Gestos" : "Activar Navegación por Gestos (IA)"}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isActive ? (
            <CameraOff className="h-6 w-6" />
          ) : (
            <Camera className="h-6 w-6 group-hover:scale-110 transition-transform" />
          )}
        </Button>

        {/* Tooltip when inactive */}
        {!isActive && !isLoading && (
          <div className="bg-[#1a1a2e]/95 border border-purple-500/30 rounded-xl px-3 py-2 text-[10px] text-slate-300 max-w-[130px] shadow-xl backdrop-blur-sm">
            <p className="font-bold text-purple-300 mb-1 text-[11px]">Gestos de Menú</p>
            <p className="mb-0.5">🖐 Mano abierta → señalar</p>
            <p>✊ Puño cerrado → abrir</p>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-28 right-6 bg-red-500/90 text-white text-xs px-4 py-2 rounded-lg shadow-xl z-[70] backdrop-blur-md max-w-[220px]">
          {error}
        </div>
      )}
    </div>
  );
}
