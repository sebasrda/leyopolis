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
      // 1. Initialize MediaPipe
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        landmarkerRef.current = handLandmarker;
      }

      // 2. Start Video
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsActive(true);
          setIsLoading(false);
          detectFrame();
        };
      }
    } catch (err: any) {
      console.error("Camera/MediaPipe error:", err);
      setError("No se pudo acceder a la cámara o cargar la IA.");
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
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const drawingUtils = new DrawingUtils(ctx);
        
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#4ade80",
          lineWidth: 3
        });
        drawingUtils.drawLandmarks(landmarks, { color: "#3b82f6", lineWidth: 1, radius: 4 });

        // Gesture Detection logic
        // Use the index finger tip (landmark 8)
        const indexTip = landmarks[8];
        const xPos = indexTip.x; // Value between 0.0 and 1.0

        // Handle cooldown
        if (nowInMs - cooldownRef.current > 1500) { // 1.5 seconds cooldown between swipes
          if (lastXRef.current !== null) {
            const deltaX = xPos - lastXRef.current;
            const deltaTime = nowInMs - lastTimeRef.current;
            const velocity = deltaX / deltaTime; // speed of movement

            // Threshold for swipe (velocity and distance)
            if (Math.abs(deltaX) > 0.15 && Math.abs(velocity) > 0.001) {
              if (deltaX < 0) {
                // Moved left -> next page
                console.log("Swipe Left detected!");
                onTurnNext();
                cooldownRef.current = nowInMs;
                flashScreen("rgba(139, 92, 246, 0.4)"); // purple flash
              } else {
                // Moved right -> previous page
                console.log("Swipe Right detected!");
                onTurnPrev();
                cooldownRef.current = nowInMs;
                flashScreen("rgba(59, 130, 246, 0.4)"); // blue flash
              }
              lastXRef.current = null; // reset
            } else {
              lastXRef.current = xPos;
              lastTimeRef.current = nowInMs;
            }
          } else {
            lastXRef.current = xPos;
            lastTimeRef.current = nowInMs;
          }
        }
      } else {
        lastXRef.current = null;
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
      {/* Invisible video element to feed the ML model */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="hidden"
        style={{ transform: "scaleX(-1)" }} // mirror
      />

      {/* Floating control button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isActive && (
          <div className="relative w-48 h-36 bg-black/80 rounded-xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 backdrop-blur-md">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }} // mirror
            />
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded">
                Manos Libres
              </span>
            </div>
            <div className="absolute bottom-2 left-0 w-full text-center">
              <span className="text-[10px] text-slate-300 font-medium drop-shadow-md">
                Desliza tu mano ↔️
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
        <div className="fixed bottom-24 right-6 bg-red-500/90 text-white text-xs px-4 py-2 rounded-lg shadow-xl z-50 backdrop-blur-md">
          {error}
        </div>
      )}
    </div>
  );
}
