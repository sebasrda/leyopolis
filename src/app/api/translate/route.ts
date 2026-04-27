import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CACHE_VERSION = "v6";

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

// ─── Build the prompt ──────────────────────────────────────────────
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

// ─── Strategy 1: Anthropic (Claude 3.5 Sonnet) (PRIMARY) ──────────
async function translateWithClaude(text: string, targetLangPrompt: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: buildTranslationPrompt(text, targetLangPrompt),
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`[TRANSLATE] Anthropic API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const translation = data.content?.[0]?.text;
    if (translation && translation.trim().length > 10) {
      console.log(`[TRANSLATE] ✓ Claude 3.5 Sonnet succeeded (${translation.length} chars)`);
      return translation.trim();
    }
  } catch (error) {
    console.error("[TRANSLATE] Claude error:", error);
  }
  return null;
}

// ─── Strategy 2: OpenAI (GPT-4o mini) (Fallback) ──────────────────
async function translateWithOpenAI(text: string, targetLangPrompt: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key || key.length < 10) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional literary translator. You translate text into ${targetLangPrompt} with perfect fluency. Return ONLY the translation.`,
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

    if (!response.ok) return null;
    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content;
    if (translation && translation.trim().length > 10) {
      console.log(`[TRANSLATE] ✓ OpenAI gpt-4o-mini succeeded (${translation.length} chars)`);
      return translation.trim();
    }
  } catch (error) {
    console.error("[TRANSLATE] OpenAI error:", error);
  }
  return null;
}

// ─── Strategy 3: OpenRouter (Fallback) ─────────────────────────────
async function translateWithOpenRouter(text: string, targetLangPrompt: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: buildTranslationPrompt(text, targetLangPrompt) }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content;
    if (translation && translation.trim().length > 10) {
      console.log(`[TRANSLATE] ✓ OpenRouter succeeded (${translation.length} chars)`);
      return translation.trim();
    }
  } catch (error) {
    console.error("[TRANSLATE] OpenRouter error:", error);
  }
  return null;
}

// ─── Strategy 4: Gemini (Legacy Fallback) ──────────────────────────
async function translateWithGemini(text: string, targetLangPrompt: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.GOOGLE_API_KEY;
  if (!key) return null;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = buildTranslationPrompt(text, targetLangPrompt);
    const result = await model.generateContent(prompt);
    const translation = result.response.text();
    if (translation && translation.trim().length > 10) {
      console.log(`[TRANSLATE] ✓ Gemini succeeded (${translation.length} chars)`);
      return translation.trim();
    }
  } catch (error) {
    console.error("[TRANSLATE] Gemini failed");
  }
  return null;
}

// ─── Strategy 5: Google Translate Free (Last Resort) ──────────────
async function translateWithGoogleFree(text: string, targetIso: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetIso)}&dt=t&q=${encodeURIComponent(text.slice(0, 4500))}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const translated = Array.isArray(data) && Array.isArray(data[0])
      ? data[0].map((p: any) => p[0]).join("")
      : "";
    if (translated.trim().length > 10) {
      console.log(`[TRANSLATE] ✓ Google Free API succeeded`);
      return translated;
    }
  } catch (error) {
    console.error("[TRANSLATE] Google Free API failed");
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, targetLanguage } = body;
    const target = normalizeTarget(targetLanguage);

    if (!text || !target.prompt) {
      return NextResponse.json({ error: "Missing text or targetLanguage" }, { status: 400 });
    }

    const safeText = text.length > 60000 ? text.slice(0, 60000) : text;
    const key = cacheKey(safeText, target.iso);
    const cached = getCached(key);
    if (cached) return NextResponse.json({ translation: cached, engine: "cache" });

    // Fetch keys from DB
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const sanitize = (val?: string) => (val || "").trim().replace(/^["']|["']$/g, '');
    const keys = {
      anthropic: sanitize(settingsMap.ANTHROPIC_API_KEY),
      openai: sanitize(settingsMap.OPENAI_API_KEY),
      openrouter: sanitize(settingsMap.OPENROUTER_API_KEY),
      gemini: sanitize(settingsMap.GOOGLE_API_KEY)
    };

    // 1. Claude (Primary)
    const claudeResult = await translateWithClaude(safeText, target.prompt, keys.anthropic);
    if (claudeResult) {
      setCached(key, claudeResult, 12 * 60 * 60 * 1000);
      return NextResponse.json({ translation: claudeResult, engine: "claude" });
    }

    // 2. OpenAI (Fallback)
    const openaiResult = await translateWithOpenAI(safeText, target.prompt, keys.openai);
    if (openaiResult) {
      setCached(key, openaiResult, 12 * 60 * 60 * 1000);
      return NextResponse.json({ translation: openaiResult, engine: "openai" });
    }

    // 3. OpenRouter (Fallback)
    const orResult = await translateWithOpenRouter(safeText, target.prompt, keys.openrouter);
    if (orResult) {
      setCached(key, orResult, 12 * 60 * 60 * 1000);
      return NextResponse.json({ translation: orResult, engine: "openrouter" });
    }

    // 4. Gemini (Legacy)
    const geminiResult = await translateWithGemini(safeText, target.prompt, keys.gemini);
    if (geminiResult) {
      setCached(key, geminiResult, 12 * 60 * 60 * 1000);
      return NextResponse.json({ translation: geminiResult, engine: "gemini" });
    }

    // 5. Google Free (Last resort)
    const googleResult = await translateWithGoogleFree(safeText, target.iso);
    if (googleResult) return NextResponse.json({ translation: googleResult, engine: "google-free" });

    return NextResponse.json({ translation: safeText, degraded: true });

  } catch (error) {
    console.error("[TRANSLATE] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
