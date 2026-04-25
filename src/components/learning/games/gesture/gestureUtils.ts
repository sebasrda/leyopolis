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

// Euclidean distance between two 2D landmarks
function d2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Count extended fingers (0–5).
 * Uses distance-based extension check normalized by palm width so it works
 * regardless of hand rotation and is not confused by forearm/wrist length.
 */
export function countFingers(lm: any[]): number {
  // Palm width = index MCP (5) ↔ pinky MCP (17): the "knuckle bar"
  // This is the SHORT axis of the hand — not affected by arm length.
  const palmW = d2(lm[5], lm[17]);
  if (palmW < 0.01) return 0;

  const FINGERS: [number, number, number][] = [
    [8,  6,  5],  // index  tip, pip, mcp
    [12, 10, 9],  // middle
    [16, 14, 13], // ring
    [20, 18, 17], // pinky
  ];
  let count = FINGERS.filter(([tip, pip, mcp]) => {
    const tipD = d2(lm[tip], lm[mcp]);
    const pipD = d2(lm[pip], lm[mcp]);
    // Extended: tip farther from MCP than pip AND more than 50 % of palm width
    return tipD > pipD * 1.05 && tipD > palmW * 0.5;
  }).length;

  // Thumb: tip past its IP joint
  const thumbTipD = d2(lm[4], lm[2]);
  const thumbIpD  = d2(lm[3], lm[2]);
  if (thumbTipD > thumbIpD * 1.1 && thumbTipD > palmW * 0.3) count++;
  return Math.min(count, 5);
}

/**
 * Classify hand gesture.
 * Palm-width normalization prevents the arm/wrist from being mistaken for
 * an open hand — a common failure when the camera sees the forearm.
 */
export function detectGesture(lm: any[]): GestureType {
  const palmW = d2(lm[5], lm[17]);
  if (palmW < 0.01) return null;

  const FINGERS: [number, number, number][] = [
    [8,  6,  5],
    [12, 10, 9],
    [16, 14, 13],
    [20, 18, 17],
  ];

  // A finger is "extended" only if its tip is:
  //   • farther from its MCP than the PIP joint is (basic extension)
  //   • AND at least 50 % of palm width away from the MCP (rules out curled fingers
  //     that look extended just because the palm is large in frame)
  const ext = FINGERS.map(([tip, pip, mcp]) => {
    const tipD = d2(lm[tip], lm[mcp]);
    const pipD = d2(lm[pip], lm[mcp]);
    return tipD > pipD * 1.05 && tipD > palmW * 0.5;
  });

  const allCurled = ext.every(e => !e);
  const allOpen   = ext.every(e => e);
  const peaceSign = ext[0] && ext[1] && !ext[2] && !ext[3];

  const thumbTipD = d2(lm[4], lm[2]);
  const thumbIpD  = d2(lm[3], lm[2]);
  const thumbUp   = thumbTipD > thumbIpD * 1.1 && allCurled;

  if (thumbUp)   return "thumbsUp";
  if (allCurled) return "fist";
  if (allOpen)   return "open";
  if (peaceSign) return "peace";
  return null;
}

/** Return visual position (mirrored X) from landmark 9 (middle finger MCP ≈ palm centre). */
export function getHandPos(lm: any[]): HandPos {
  return { vx: 1 - lm[9].x, vy: lm[9].y };
}

/** Map visual position to screen quadrant. */
export function getQuadrant(pos: HandPos): QuadrantType {
  const left = pos.vx < 0.5;
  const top  = pos.vy < 0.5;
  if (left && top)  return "TL";
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
  cx: number, cy: number,
  progress: number,
  color = "#a78bfa",
  radius = 40,
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
