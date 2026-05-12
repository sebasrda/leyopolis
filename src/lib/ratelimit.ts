/**
 * Universal rate limiter for Leyópolis.
 *
 * - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars are set,
 *   uses Upstash Redis (distributed, durable, survives cold starts).
 * - Otherwise falls back to an in-memory Map (works per Lambda instance —
 *   leaky on multi-instance but still meaningfully slows down attackers).
 *
 * Usage:
 *   const r = await rateLimit(`ai:${userId}`, { limit: 30, windowMs: 60_000 });
 *   if (!r.ok) return new Response("Demasiadas solicitudes", { status: 429 });
 */

type Bucket = { count: number; resetAt: number };

const MEMORY = new Map<string, Bucket>();

// Periodic GC for the in-memory store (avoids unbounded growth)
let gcInterval: ReturnType<typeof setInterval> | null = null;
function startGcOnce() {
  if (gcInterval) return;
  if (typeof setInterval === "undefined") return;
  gcInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of MEMORY.entries()) {
      if (bucket.resetAt <= now) MEMORY.delete(key);
    }
  }, 60_000);
  // Don't keep the Lambda alive just for GC
  (gcInterval as any)?.unref?.();
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HAS_UPSTASH = !!(UPSTASH_URL && UPSTASH_TOKEN);

if (!HAS_UPSTASH && typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  console.warn(
    "[ratelimit] Upstash not configured — using in-memory fallback. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed limits.",
  );
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the limit resets */
  retryAfter: number;
  limit: number;
}

export interface RateLimitOptions {
  /** Max requests in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Consume one slot from the rate limit bucket identified by `key`.
 * Returns whether the request should be allowed.
 */
export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  startGcOnce();

  if (HAS_UPSTASH) {
    try {
      return await upstashLimit(key, opts);
    } catch (e) {
      console.error("[ratelimit] Upstash error, falling back to memory:", e);
      return memoryLimit(key, opts);
    }
  }
  return memoryLimit(key, opts);
}

function memoryLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = MEMORY.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + opts.windowMs };
    MEMORY.set(key, fresh);
    return {
      ok: true,
      remaining: opts.limit - 1,
      retryAfter: Math.ceil(opts.windowMs / 1000),
      limit: opts.limit,
    };
  }
  bucket.count += 1;
  const remaining = Math.max(0, opts.limit - bucket.count);
  const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    ok: bucket.count <= opts.limit,
    remaining,
    retryAfter,
    limit: opts.limit,
  };
}

async function upstashLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  // Upstash REST API: use atomic INCR + EXPIRE
  // We avoid the @upstash/redis package to keep the bundle small and
  // edge-compatible. Just use fetch.
  const ttlSec = Math.ceil(opts.windowMs / 1000);
  const prefixedKey = `rl:${key}`;

  // Pipeline INCR + EXPIRE (only set EXPIRE if key was just created)
  const pipelineRes = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", prefixedKey],
      ["EXPIRE", prefixedKey, String(ttlSec), "NX"],
      ["PTTL", prefixedKey],
    ]),
    // Edge-friendly: don't cache
    cache: "no-store",
  });

  if (!pipelineRes.ok) {
    throw new Error(`Upstash HTTP ${pipelineRes.status}`);
  }
  const results = await pipelineRes.json();
  const count = Number(results?.[0]?.result ?? 0);
  const pttl = Number(results?.[2]?.result ?? opts.windowMs);

  const remaining = Math.max(0, opts.limit - count);
  const retryAfter = Math.max(0, Math.ceil((pttl > 0 ? pttl : opts.windowMs) / 1000));
  return {
    ok: count <= opts.limit,
    remaining,
    retryAfter,
    limit: opts.limit,
  };
}

/**
 * Extract the real client IP from request headers.
 * Vercel sets `x-forwarded-for` (comma-separated, real IP first).
 * Falls back to `x-real-ip` and Cloudflare's `cf-connecting-ip`.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

/**
 * Helper: build a standard 429 JSON response with Retry-After header.
 */
export function tooManyRequestsResponse(result: RateLimitResult, message?: string) {
  return new Response(
    JSON.stringify({
      message: message || "Demasiadas solicitudes. Por favor espera un momento.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

/**
 * Specialized counter for tracking failed login attempts.
 * Different semantics from rateLimit: we only increment on FAILURE,
 * and reset to 0 on success.
 */
export async function recordLoginFailure(emailLower: string, ip: string): Promise<{ count: number; locked: boolean }> {
  const key = `login_fail:${emailLower}:${ip}`;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;

  if (HAS_UPSTASH) {
    try {
      const ttlSec = Math.ceil(WINDOW_MS / 1000);
      const pipelineRes = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, String(ttlSec), "NX"],
        ]),
        cache: "no-store",
      });
      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const count = Number(results?.[0]?.result ?? 1);
        return { count, locked: count >= MAX_ATTEMPTS };
      }
    } catch (e) {
      console.error("[ratelimit] login failure tracking via upstash failed:", e);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const bucket = MEMORY.get(key);
  if (!bucket || bucket.resetAt <= now) {
    MEMORY.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { count: 1, locked: false };
  }
  bucket.count += 1;
  return { count: bucket.count, locked: bucket.count >= MAX_ATTEMPTS };
}

export async function resetLoginFailures(emailLower: string, ip: string): Promise<void> {
  const key = `login_fail:${emailLower}:${ip}`;
  if (HAS_UPSTASH) {
    try {
      await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
      });
      return;
    } catch (e) {
      console.error("[ratelimit] reset login failures via upstash failed:", e);
    }
  }
  MEMORY.delete(key);
}

export async function isLoginLocked(emailLower: string, ip: string): Promise<{ locked: boolean; retryAfter: number }> {
  const key = `login_fail:${emailLower}:${ip}`;
  const MAX_ATTEMPTS = 5;

  if (HAS_UPSTASH) {
    try {
      const pipelineRes = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["GET", key],
          ["PTTL", key],
        ]),
        cache: "no-store",
      });
      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const count = Number(results?.[0]?.result ?? 0);
        const pttl = Number(results?.[1]?.result ?? 0);
        return {
          locked: count >= MAX_ATTEMPTS,
          retryAfter: Math.max(0, Math.ceil(pttl / 1000)),
        };
      }
    } catch (e) {
      console.error("[ratelimit] check login lock via upstash failed:", e);
    }
  }

  const bucket = MEMORY.get(key);
  if (!bucket || bucket.resetAt <= Date.now()) return { locked: false, retryAfter: 0 };
  return {
    locked: bucket.count >= MAX_ATTEMPTS,
    retryAfter: Math.ceil((bucket.resetAt - Date.now()) / 1000),
  };
}
