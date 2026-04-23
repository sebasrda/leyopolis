"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GesturePageTurnerProps {
  onTurnNext: () => void;
  onTurnPrev: () => void;
}

export function GesturePageTurner({ onTurnNext, onTurnPrev }: GesturePageTurnerProps) {
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

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. START CAMERA FIRST (This should be fast)
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
        setIsActive(true); // Now the UI shows the video
      }

      // 2. INITIALIZE IA IN BACKGROUND
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
            numHands: 1
          });
          landmarkerRef.current = handLandmarker;
          setIsLoading(false); // IA is ready
          detectFrame();
        } catch (wasmError) {
          console.error("MediaPipe load error:", wasmError);
          setError("IA no disponible. Intenta refrescar.");
          setIsLoading(false);
          // We don't stop the camera, just IA won't work
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
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // --- NEW ROBUST STATE MACHINE FOR GESTURES ---
  const gestureState = useRef<"NONE" | "RIGHT_ZONE" | "LEFT_ZONE">("NONE");
  const stateTimestamp = useRef<number>(0);

  const detectFrame = () => {
    if (!videoRef.current || !landmarkerRef.current || !isActive || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const nowInMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, nowInMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 1. Draw Status Background
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, 40);
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "white";

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const drawingUtils = new DrawingUtils(ctx);
        
        // Draw Hand Skeleton
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#4ade80", lineWidth: 3 });
        drawingUtils.drawLandmarks(landmarks, { color: "#3b82f6", lineWidth: 1, radius: 4 });

        ctx.fillText("MANO DETECTADA ✅", 10, 28);

        // --- ZONE BASED GESTURE LOGIC ---
        const handX = landmarks[0].x; 

        // Visual Zones
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(canvas.width * 0.35, 40); ctx.lineTo(canvas.width * 0.35, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(canvas.width * 0.65, 40); ctx.lineTo(canvas.width * 0.65, canvas.height); ctx.stroke();
        ctx.setLineDash([]);

        const cooldownTime = 1200; 
        if (nowInMs - cooldownRef.current > cooldownTime) {
          
          if (handX < 0.35) {
            if (gestureState.current !== "RIGHT_ZONE") {
              gestureState.current = "RIGHT_ZONE";
              stateTimestamp.current = nowInMs;
            }
          } 
          else if (handX > 0.65) {
            if (gestureState.current === "RIGHT_ZONE" && (nowInMs - stateTimestamp.current < 1200)) {
              onTurnNext();
              cooldownRef.current = nowInMs;
              gestureState.current = "NONE";
              flashScreen("rgba(139, 92, 246, 0.8)");
            } else {
              gestureState.current = "LEFT_ZONE";
              stateTimestamp.current = nowInMs;
            }
          }
          else if (handX > 0.4 && handX < 0.6) {
            if (nowInMs - stateTimestamp.current > 1500) gestureState.current = "NONE";
          }

          if (handX < 0.35 && gestureState.current === "LEFT_ZONE" && (nowInMs - stateTimestamp.current < 1200)) {
              onTurnPrev();
              cooldownRef.current = nowInMs;
              gestureState.current = "NONE";
              flashScreen("rgba(59, 130, 246, 0.8)");
          }

          if (gestureState.current === "RIGHT_ZONE") {
             ctx.fillStyle = "rgba(139, 92, 246, 0.5)";
             ctx.fillRect(0, 40, canvas.width * 0.35, canvas.height - 40);
             ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.fillText("¡DESLIZA A LA IZQUIERDA!", 10, canvas.height - 20);
          } else if (gestureState.current === "LEFT_ZONE") {
             ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
             ctx.fillRect(canvas.width * 0.65, 40, canvas.width * 0.35, canvas.height - 40);
             ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.fillText("¡DESLIZA A LA DERECHA!", canvas.width * 0.65 + 10, canvas.height - 20);
          }
        }
      } else {
        ctx.fillText("BUSCANDO MANO... 🔍", 10, 28);
        if (nowInMs - stateTimestamp.current > 1500) gestureState.current = "NONE";
      }
    }

    if (isActive) {
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
      {/* Floating control button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isActive && (
          <div className="relative w-56 h-42 bg-black rounded-xl overflow-hidden border-2 border-indigo-500 shadow-2xl backdrop-blur-md">
            {/* Native video display - much more reliable than canvas drawImage */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} 
            />
            {/* Transparent overlay for skeleton and zones */}
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
          </div>
        )}

        <Button
          onClick={isActive ? stopCamera : startCamera}
          disabled={isLoading}
          className={`rounded-full shadow-2xl border ${
            isActive
              ? "bg-red-500 hover:bg-red-600 border-red-400 text-white"
              : "bg-[#1E1B4B] hover:bg-[#312E81] border-indigo-500 text-indigo-300"
          } h-14 w-14 p-0 flex items-center justify-center transition-all duration-300 group`}
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
