// Shared utilities for all gesture-based games

export const MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm";
export const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type GestureType = "open" | "fist" | "peace" | "thumbsUp" | null;
export type QuadrantType = "TL" | "TR" | "BL" | "BR" | null;
export type SideType = "left" | "right" | null;

export interface HandPos {
  vx: number; // visual X (0=left, 1=right on screen, mirrored from MediaPipe)
  vy: number; // visual Y (0=top, 1=bottom)
}

/** Count extended fingers (0-5). */
export function countFingers(lm: any[]): number {
  // index=8/6, middle=12/10, ring=16/14, pinky=20/18
  const tipPips: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];
  let count = tipPips.filter(([tip, pip]) => lm[tip].y < lm[pip].y).length;
  // Thumb: extended if tip is far from index MCP laterally
  if (Math.abs(lm[4].x - lm[5].x) > 0.07) count++;
  return Math.min(count, 5);
}

/** Classify hand gesture. */
export function detectGesture(lm: any[]): GestureType {
  const tipPips: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];
  const ext = tipPips.map(([tip, pip]) => lm[tip].y < lm[pip].y);
  const allCurled = ext.every(e => !e);
  const allOpen = ext.every(e => e);
  const peaceSign = ext[0] && ext[1] && !ext[2] && !ext[3];
  // Thumb up: thumb tip clearly above wrist, all fingers curled
  const thumbUp = lm[4].y < lm[0].y - 0.1 && allCurled;

  if (thumbUp) return "thumbsUp";
  if (allCurled) return "fist";
  if (allOpen) return "open";
  if (peaceSign) return "peace";
  return null;
}

/** Return visual position (mirrored X) from landmark 9 (palm center). */
export function getHandPos(lm: any[]): HandPos {
  return { vx: 1 - lm[9].x, vy: lm[9].y };
}

/** Map visual position to screen quadrant. */
export function getQuadrant(pos: HandPos): QuadrantType {
  const left = pos.vx < 0.5;
  const top = pos.vy < 0.5;
  if (left && top) return "TL";
  if (!left && top) return "TR";
  if (left && !top) return "BL";
  return "BR";
}

/** Map visual position to left/right side. */
export function getSide(pos: HandPos): SideType {
  return pos.vx < 0.5 ? "left" : "right";
}

/** Draw a dwell arc progress indicator centered at (cx, cy). */
export function drawDwellArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  progress: number,
  color = "#a78bfa",
  radius = 40
) {
  ctx.save();
  ctx.strokeStyle = "rgba(167,139,250,0.2)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
}
