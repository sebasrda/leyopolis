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
  const [isActive, setIsActive]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [gestureState, setGestureState] = useState<GestureState>({
    gesture: null, fingerCount: 0, isHandDetected: false,
  });

  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const rafRef        = useRef<number>(0);
  const isActiveRef   = useRef(false);

  // Updated every frame — NOT pushed to React state (avoids 60-fps re-renders)
  const positionRef = useRef<HandPos | null>(null);

  // Previous emitted values — used to skip no-op setState calls
  const prevGestureRef  = useRef<GestureType>(null);
  const prevFingerRef   = useRef(0);
  const prevDetectedRef = useRef(false);

  // 4-frame rolling buffer for gesture smoothing.
  // Requires 2/4 majority before emitting a state change, which keeps 1-frame
  // jitter out without introducing noticeable latency (~65 ms at 30 fps).
  // Was 6 frames / 3 majority — felt sluggish for fist-confirm clicks.
  const gestBufferRef = useRef<GestureType[]>([]);

  const detectFrame = () => {
    if (!videoRef.current || !landmarkerRef.current || !isActiveRef.current || !canvasRef.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    if (video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;

      const results = landmarkerRef.current.detectForVideo(video, performance.now());
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks?.length > 0) {
        const lm = results.landmarks[0];

        const dutils = new DrawingUtils(ctx);
        dutils.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: "#a78bfa", lineWidth: 2 });
        dutils.drawLandmarks(lm, { color: "#ffffff", lineWidth: 1, radius: 3 });

        const rawG = detectGesture(lm);
        const fc   = countFingers(lm);
        const pos  = getHandPos(lm);

        positionRef.current = pos;

        // ── Gesture smoothing ──────────────────────────────────────────────
        gestBufferRef.current.push(rawG);
        if (gestBufferRef.current.length > 4) gestBufferRef.current.shift();

        // Majority vote over the buffer
        const counts = new Map<string, number>();
        for (const g of gestBufferRef.current) counts.set(g ?? "__", (counts.get(g ?? "__") ?? 0) + 1);
        let topKey = "__"; let topCnt = 0;
        for (const [k, c] of counts) { if (c > topCnt) { topCnt = c; topKey = k; } }

        // If no clear majority, keep the previously emitted gesture (avoids thrashing)
        const smoothG: GestureType = topCnt >= 2
          ? (topKey === "__" ? null : topKey as GestureType)
          : prevGestureRef.current;

        if (smoothG !== prevGestureRef.current || fc !== prevFingerRef.current || !prevDetectedRef.current) {
          prevGestureRef.current  = smoothG;
          prevFingerRef.current   = fc;
          prevDetectedRef.current = true;
          setGestureState({ gesture: smoothG, fingerCount: fc, isHandDetected: true });
        }
      } else {
        positionRef.current     = null;
        gestBufferRef.current   = []; // clear buffer so old votes don't linger
        if (prevDetectedRef.current || prevGestureRef.current !== null) {
          prevGestureRef.current  = null;
          prevFingerRef.current   = 0;
          prevDetectedRef.current = false;
          setGestureState({ gesture: null, fingerCount: 0, isHandDetected: false });
        }
      }
    }

    if (isActiveRef.current) rafRef.current = requestAnimationFrame(detectFrame);
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Lower resolution (480x360 instead of 640x480) cuts hand-tracking CPU
      // cost by ~40% with no visible loss of accuracy at typical webcam
      // distances. Big improvement for the puzzle which redraws every frame.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
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
        // Prefer GPU (WebGL-backed). Falls back to CPU automatically if the
        // device has no WebGL2 support — the MediaPipe runtime handles the
        // fallback internally, so this is a strict speedup.
        try {
          landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.3,
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3,
          });
        } catch {
          // Hard fallback to CPU if the GPU delegate refuses to initialize
          // (rare — Linux without GPU drivers, very old browsers, etc.)
          landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.3,
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3,
          });
        }
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
    positionRef.current    = null;
    prevGestureRef.current = null;
    prevFingerRef.current  = 0;
    prevDetectedRef.current = false;
    gestBufferRef.current  = [];
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (rafRef.current)     cancelAnimationFrame(rafRef.current);
    if (videoRef.current)   videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const getPosition = useCallback(() => positionRef.current, []);

  return { isActive, isLoading, error, gestureState, getPosition, videoRef, canvasRef, startCamera, stopCamera };
}
