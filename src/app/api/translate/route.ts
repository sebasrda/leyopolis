
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";

export const runtime = "nodejs";

const CACHE_VERSION = "v5";

function normalizeTarget(input: string) {
  const t = input.trim();
  const lower = t.toLowerCase();
  const upper = t.toUpperCase();

  if (upper === "EN" || lower === "en" || lower === "english") return { prompt: "English", iso: "en" };
  if (upper === "ES" || lower === "es" || lower === "spanish") return { prompt: "Spanish", iso: "es" };
  if (upper === "FR" || lower === "fr" || lower === "french") return { prompt: "French", iso: "fr" };
  if (upper === "DE" || lower === "de" || lower === "german") return { prompt: "German", iso: "de" };
  if (upper === "ZH" || lower === "zh" || lower.includes("chinese"))
    return { prompt: "Simplified Chinese", iso: "zh-CN" };

  return { prompt: t, iso: lower || t };
}

// ─── In-Memory Cache ───────────────────────────────────────────────
type CacheEntry = { translation: string; expiresAtMs: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(text: string, targetLanguage: string) {
  const hash = createHash("sha1").update(text).digest("hex");
  return `${CACHE_VERSION}::${targetLanguage}::${hash}`;
}
function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAtMs) { cache.delete(key); return null; }
  return entry.translation;
}
function setCached(key: string, translation: string, ttlMs: number) {
  cache.set(key, { translation, expiresAtMs: Date.now() + ttlMs });
}

// ─── Build the prompt used by both Gemini and OpenAI ───────────────
function buildTranslationPrompt(text: string, targetLang: string): string {
  return `You are a world-class professional literary translator with deep expertise in ${targetLang}.

YOUR TASK: Translate the following text into ${targetLang}.

MANDATORY RULES — violating any rule is unacceptable:
1. Translate EVERY sentence completely. Do NOT skip, summarize, abbreviate, or truncate any part.
2. Preserve the exact paragraph structure. Each paragraph in the original must appear as a paragraph in the translation.
3. Maintain the author's literary tone, style, register, and voice faithfully.
4. Produce fluent, natural ${targetLang}. NEVER translate word-by-word.
5. Proper nouns (character names, place names) stay in their original form unless a well-known ${targetLang} equivalent exists.
6. If the text contains a "---" separator, keep it in the output — it marks a page break.
7. Return ONLY the translated text. Absolutely no comments, notes, headers, explanations, or meta-text.
8. If the original uses dialogue (em-dash, quotation marks), preserve the same punctuation style.
9. The translation must be the SAME LENGTH (in content, not characters) as the original — do not add or remove information.

TEXT TO TRANSLATE:

${text}`;
}

// ─── Strategy 1: Gemini AI Translation (Primary) ──────────────────
async function translateWithGemini(text: string, targetLangPrompt: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 16384,
        },
      });
      const prompt = buildTranslationPrompt(text, targetLangPrompt);
      const result = await model.generateContent(prompt);
      const translation = result.response.text();
      if (translation && translation.trim().length > 10) {
        console.log(`[TRANSLATE] ✓ Gemini ${modelName} succeeded (${translation.length} chars)`);
        return translation.trim();
      }
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      console.error(`[TRANSLATE] Gemini ${modelName} failed:`, message.slice(0, 200));
      if (message.includes("[429") || message.toLowerCase().includes("quota")) {
        break; // No point trying other models if quota exceeded
      }
    }
  }
  return null;
}

// ─── Strategy 2: OpenAI Translation (Fallback) ────────────────────
async function translateWithOpenAI(text: string, targetLangPrompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional literary translator. You translate text into ${targetLangPrompt} with perfect fluency, preserving the author's voice, style, and every paragraph. You return ONLY the translated text — nothing else.`,
          },
          {
            role: "user",
            content: buildTranslationPrompt(text, targetLangPrompt),
          },
        ],
        temperature: 0.3,
        max_tokens: 16384,
      }),
    });

    if (!response.ok) {
      console.error(`[TRANSLATE] OpenAI API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    const translation = data.choices?.[0]?.message?.content;
    if (translation && translation.trim().length > 10) {
      console.log(`[TRANSLATE] ✓ OpenAI gpt-4o-mini succeeded (${translation.length} chars)`);
      return translation.trim();
    }
  } catch (error) {
    console.error("[TRANSLATE] OpenAI error:", error instanceof Error ? error.message : error);
  }
  return null;
}

// ─── Strategy 3: Google Translate Free API (Last Resort) ──────────
async function translateWithGoogleFree(text: string, targetIso: string): Promise<string | null> {
  // Split into manageable chunks to avoid URL length limits
  const maxChunk = 4500;
  const chunks: string[] = [];
  
  // Split by paragraphs first to maintain coherence
  const paragraphs = text.split(/\n+/);
  let currentChunk = "";
  for (const para of paragraphs) {
    if ((currentChunk + "\n" + para).length > maxChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + para;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  const results: string[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetIso
    )}&dt=t&q=${encodeURIComponent(chunk)}`;

    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    if (!res || !res.ok) {
      console.error(`[TRANSLATE] Google Free API failed for chunk`);
      continue;
    }
    const data = (await res.json()) as unknown;
    const translated =
      Array.isArray(data) && Array.isArray((data as any)[0])
        ? String((data as any)[0].map((p: unknown) => (Array.isArray(p) ? (p as any)[0] : "")).join(""))
        : "";
    results.push(translated);
  }

  const combined = results.join("\n");
  if (combined.trim().length > 10) {
    console.log(`[TRANSLATE] ✓ Google Free API succeeded (${combined.length} chars)`);
    return combined;
  }
  return null;
}

// ─── Main POST handler ────────────────────────────────────────────
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

    const maxChars = 60000;
    const safeText = text.length > maxChars ? text.slice(0, maxChars) : text;

    // Check cache first
    const key = cacheKey(safeText, target.iso);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({ translation: cached, cached: true, engine: "cache" });
    }

    console.log(`[TRANSLATE] Translating ${safeText.length} chars → ${target.prompt}`);

    // ─── STRATEGY 1: Gemini AI (Best quality) ─────────────────────
    const geminiResult = await translateWithGemini(safeText, target.prompt);
    if (geminiResult) {
      setCached(key, geminiResult, 12 * 60 * 60 * 1000); // 12h cache
      return NextResponse.json({ translation: geminiResult, engine: "gemini" });
    }

    // ─── STRATEGY 2: OpenAI (Great quality fallback) ──────────────
    const openaiResult = await translateWithOpenAI(safeText, target.prompt);
    if (openaiResult) {
      setCached(key, openaiResult, 12 * 60 * 60 * 1000);
      return NextResponse.json({ translation: openaiResult, engine: "openai" });
    }

    // ─── STRATEGY 3: Google Translate Free (Last resort) ──────────
    const googleResult = await translateWithGoogleFree(safeText, target.iso);
    if (googleResult) {
      setCached(key, googleResult, 6 * 60 * 60 * 1000); // shorter cache for lower quality
      return NextResponse.json({ translation: googleResult, engine: "google-free" });
    }

    // ─── Absolute fallback: return original text ──────────────────
    return NextResponse.json({
      translation: safeText,
      degraded: true,
      reason: "Todos los servicios de traducción están temporalmente no disponibles. Mostrando texto original.",
    });

  } catch (error) {
    console.error("[TRANSLATE] Critical error:", error);
    return NextResponse.json({
      translation: typeof rawText === "string" ? rawText : "",
      degraded: true,
      reason: "Error interno en el servicio de traducción.",
    });
  }
}
