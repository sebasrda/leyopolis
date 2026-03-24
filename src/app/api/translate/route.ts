
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";
import dns from "dns";

export const runtime = "nodejs";

const CACHE_VERSION = "v4";

dns.setDefaultResultOrder("ipv4first");

function normalizeTarget(input: string) {
  const t = input.trim();
  const lower = t.toLowerCase();
  const upper = t.toUpperCase();

  if (upper === "EN" || lower === "en" || lower === "english") return { prompt: "English", isoCandidates: ["en"] };
  if (upper === "ES" || lower === "es" || lower === "spanish") return { prompt: "Spanish", isoCandidates: ["es"] };
  if (upper === "FR" || lower === "fr" || lower === "french") return { prompt: "French", isoCandidates: ["fr"] };
  if (upper === "DE" || lower === "de" || lower === "german") return { prompt: "German", isoCandidates: ["de"] };
  if (upper === "ZH" || lower === "zh" || lower.includes("chinese"))
    return { prompt: "Simplified Chinese", isoCandidates: ["zh-CN", "zh", "zh-Hans"] };

  return { prompt: t, isoCandidates: [lower || t] };
}

type CacheEntry = { translation: string; expiresAtMs: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(text: string, targetLanguage: string) {
  const hash = createHash("sha1").update(text).digest("hex");
  return `${CACHE_VERSION}::${targetLanguage}::${hash}`;
}

function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAtMs) {
    cache.delete(key);
    return null;
  }
  return entry.translation;
}

function setCached(key: string, translation: string, ttlMs: number) {
  cache.set(key, { translation, expiresAtMs: Date.now() + ttlMs });
}

function heuristicTranslate(text: string, targetLanguage: string) {
  const lang = targetLanguage.toLowerCase();
  if (!text.trim()) return text;

  if (lang === "english") {
    const map: Record<string, string> = {
      hola: "hello",
      mundo: "world",
      libro: "book",
      lectura: "reading",
      páginas: "pages",
      pagina: "page",
      página: "page",
      gracias: "thank you",
      por: "for",
      favor: "please",
      y: "and",
      el: "the",
      la: "the",
      los: "the",
      las: "the",
      un: "a",
      una: "a",
      de: "of",
      en: "in",
      con: "with",
      sin: "without",
    };
    return text.replace(/\b[\p{L}]+\b/gu, (w) => {
      const lower = w.toLowerCase();
      const repl = map[lower];
      if (!repl) return w;
      const isCapitalized = w[0] === w[0].toUpperCase();
      return isCapitalized ? repl[0].toUpperCase() + repl.slice(1) : repl;
    });
  }

  if (lang === "spanish") {
    const map: Record<string, string> = {
      hello: "hola",
      world: "mundo",
      book: "libro",
      reading: "lectura",
      page: "página",
      pages: "páginas",
      thanks: "gracias",
      please: "por favor",
      and: "y",
      the: "el",
      a: "un",
      of: "de",
      in: "en",
      with: "con",
      without: "sin",
    };
    return text.replace(/\b[a-zA-Z]+\b/g, (w) => {
      const lower = w.toLowerCase();
      const repl = map[lower];
      if (!repl) return w;
      const isCapitalized = w[0] === w[0].toUpperCase();
      return isCapitalized ? repl[0].toUpperCase() + repl.slice(1) : repl;
    });
  }

  return text;
}

async function googleTranslate(text: string, targetIso: string) {
  const maxChunk = 1800;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChunk) chunks.push(text.slice(i, i + maxChunk));

  const results: string[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetIso
    )}&dt=t&q=${encodeURIComponent(chunk)}`;
    let res: Response | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    if (!res) throw lastError ?? new Error("Google translate failed");
    if (!res.ok) throw new Error(`Google translate failed: ${res.status}`);
    const data = (await res.json()) as unknown;
    const translated =
      Array.isArray(data) && Array.isArray((data as any)[0])
        ? String((data as any)[0].map((p: unknown) => (Array.isArray(p) ? (p as any)[0] : "")).join(""))
        : "";
    results.push(translated);
  }

  return results.join("");
}

export async function POST(req: Request) {
  let rawText: unknown;
  let rawTargetLanguage: unknown;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    rawText = body.text;
    rawTargetLanguage = body.targetLanguage;
    const text = typeof rawText === "string" ? rawText : "";
    const targetLanguageRaw = typeof rawTargetLanguage === "string" ? rawTargetLanguage : "";
    const target = normalizeTarget(targetLanguageRaw);

    if (!text || !target.prompt) {
      return NextResponse.json({ error: "Missing text or targetLanguage" }, { status: 400 });
    }

    const maxChars = 20000;
    const safeText = text.length > maxChars ? text.slice(0, maxChars) : text;

    const key = cacheKey(safeText, target.isoCandidates[0] || target.prompt);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({ translation: cached, cached: true });
    }

    const preferGoogle = ["en", "es", "fr", "de", "zh-CN", "zh", "zh-Hans"].includes(target.isoCandidates[0]);

    if (preferGoogle) {
      for (const iso of target.isoCandidates) {
        try {
          const translation = await googleTranslate(safeText, iso);
          if (translation) {
            setCached(key, translation, 12 * 60 * 60 * 1000);
            return NextResponse.json({ translation });
          }
        } catch {
        }
      }
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      const fallback = heuristicTranslate(safeText, target.prompt);
      setCached(key, fallback, 2 * 60 * 1000);
      return NextResponse.json({ translation: fallback, degraded: true, reason: "Configuración de API incompleta." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let translation = "";
    let quotaExceeded = false;

    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest"];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const clippedText = safeText.length > 8000 ? `${safeText.slice(0, 8000)}\n\n[...truncated]` : safeText;
        const prompt = `Translate the following text into ${target.prompt}. Preserve meaning and formatting. Return only the translation.\n\n${clippedText}`;
        const result = await model.generateContent(prompt);
        translation = result.response.text();
        if (translation) break;
      } catch (apiError) {
        const message = apiError instanceof Error ? apiError.message : String(apiError);
        console.error(`Gemini Translation Error with ${modelName}:`, message);
        if (message.includes("[429") || message.toLowerCase().includes("too many requests") || message.toLowerCase().includes("quota")) {
          quotaExceeded = true;
          break;
        }
      }
    }

    if (translation) {
      setCached(key, translation, 6 * 60 * 60 * 1000);
      return NextResponse.json({ translation });
    }

    const fallback = heuristicTranslate(safeText, target.prompt);
    setCached(key, fallback, quotaExceeded ? 2 * 60 * 1000 : 15 * 60 * 1000);
    return NextResponse.json({
      translation: fallback,
      degraded: true,
      reason: quotaExceeded ? "Cuota excedida" : "Servicio de traducción no disponible temporalmente.",
    });

  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({
      translation: typeof rawText === "string" ? rawText : "",
      degraded: true,
      reason: "Translation failed",
    });
  }
}
