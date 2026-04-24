"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import {
  MEDIAPIPE_WASM,
  HAND_MODEL,
  GestureType,
  HandPos,
  detectGesture,
  countFingers,
  getHandPos,
} from "./gestureUtils";

export interface GestureState {
  gesture: GestureType;
  fingerCount: number;
  isHandDetected: boolean;
}

export function useGestureCam() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestureState, setGestureState] = useState<GestureState>({
    gesture: null,
    fingerCount: 0,
    isHandDetected: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const isActiveRef = useRef(false);

  // Position ref — updated every frame, NOT pushed to React state
  const positionRef = useRef<HandPos | null>(null);

  // Previous values to avoid unnecessary re-renders
  const prevGestureRef = useRef<GestureType>(null);
  const prevFingerRef = useRef(0);
  const prevDetectedRef = useRef(false);

  const detectFrame = () => {
    if (!videoRef.current || !landmarkerRef.current || !isActiveRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const now = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks?.length > 0) {
        const lm = results.landmarks[0];
        const dutils = new DrawingUtils(ctx);
        dutils.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: "#a78bfa", lineWidth: 2 });
        dutils.drawLandmarks(lm, { color: "#ffffff", lineWidth: 1, radius: 3 });

        const g = detectGesture(lm);
        const fc = countFingers(lm);
        const pos = getHandPos(lm);

        positionRef.current = pos;

        if (g !== prevGestureRef.current || fc !== prevFingerRef.current || !prevDetectedRef.current) {
          prevGestureRef.current = g;
          prevFingerRef.current = fc;
          prevDetectedRef.current = true;
          setGestureState({ gesture: g, fingerCount: fc, isHandDetected: true });
        }
      } else {
        positionRef.current = null;
        if (prevDetectedRef.current || prevGestureRef.current !== null) {
          prevGestureRef.current = null;
          prevFingerRef.current = 0;
          prevDetectedRef.current = false;
          setGestureState({ gesture: null, fingerCount: 0, isHandDetected: false });
        }
      }
    }

    if (isActiveRef.current) {
      rafRef.current = requestAnimationFrame(detectFrame);
    }
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isActiveRef.current = true;
        setIsActive(true);
      }
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
      }
      setIsLoading(false);
      detectFrame();
    } catch {
      setError("No se pudo acceder a la cámara. Revisa permisos.");
      setIsLoading(false);
    }
  };

  const stopCamera = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setGestureState({ gesture: null, fingerCount: 0, isHandDetected: false });
    positionRef.current = null;
    prevGestureRef.current = null;
    prevFingerRef.current = 0;
    prevDetectedRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const getPosition = useCallback(() => positionRef.current, []);

  return {
    isActive, isLoading, error,
    gestureState,
    getPosition,
    videoRef, canvasRef,
    startCamera, stopCamera,
  };
}
