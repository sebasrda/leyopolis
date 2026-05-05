import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CACHE_VERSION = "v8";

function normalizeTarget(input: string) {
  const t = input.trim();
  const lower = t.toLowerCase();
  const upper = t.toUpperCase();

  if (upper === "EN" || lower === "en" || lower === "english") return { prompt: "English", iso: "en" };
  if (upper === "ES" || lower === "es" || lower === "spanish") return { prompt: "Spanish", iso: "es" };
  if (upper === "FR" || lower === "fr" || lower === "french") return { prompt: "French", iso: "fr" };
  if (upper === "DE" || lower === "de" || lower === "german") return { prompt: "German", iso: "de" };
  if (upper === "PT" || lower === "pt" || lower.includes("portuguese")) return { prompt: "Brazilian Portuguese", iso: "pt-BR" };
  if (upper === "IT" || lower === "it" || lower === "italian") return { prompt: "Italian", iso: "it" };
  if (upper === "ZH" || lower === "zh" || lower.includes("chinese"))
    return { prompt: "Simplified Chinese", iso: "zh-CN" };

  return { prompt: t, iso: lower || t };
}

function cacheKey(text: string, targetLanguage: string) {
  // Normalize whitespace to prevent cache misses on tiny formatting changes
  const normalized = text.replace(/\s+/g, " ").trim();
  const hash = createHash("sha1").update(normalized).digest("hex");
  return `${CACHE_VERSION}::${targetLanguage}::${hash}`;
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
        model: "claude-sonnet-4-6",
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

    if (!response.ok) return null;
    const data = await response.json();
    const translation = data.content?.[0]?.text;
    if (translation && translation.trim().length > 10) return translation.trim();
  } catch (error) {
    console.error("[TRANSLATE] Claude error:", error);
  }
  return null;
}

// Helper: ensure a translation result is a single page (strip old combined spreads)
function sanitizeSinglePage(text: string): string {
  if (text.includes("\n\n---\n\n")) {
    // Old combined spread leaked into cache — take only the first part
    return text.split("\n\n---\n\n")[0].trim();
  }
  return text;
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
            content: `You are a professional literary translator. You translate text into ${targetLangPrompt} with perfect fluency.`,
          },
          {
            role: "user",
            content: buildTranslationPrompt(text, targetLangPrompt),
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content;
    if (translation && translation.trim().length > 10) return translation.trim();
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
    if (translation && translation.trim().length > 10) return translation.trim();
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(buildTranslationPrompt(text, targetLangPrompt));
    const translation = result.response.text();
    if (translation && translation.trim().length > 10) return translation.trim();
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
    if (translated.trim().length > 10) return translated;
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

    // 1. CHECK PERSISTENT DB CACHE (FULL TEXT)
    const dbCached = await prisma.translation.findUnique({ where: { hash: key } });
    if (dbCached) {
      // Sanitize: old cache entries may contain combined spreads with "---"
      const cleanText = sanitizeSinglePage(dbCached.translatedText);
      return NextResponse.json({ translation: cleanText, engine: "db-cache" });
    }

    // 2. CHECK IF IT'S A SPREAD (---) AND ASSEMBLE FROM INDIVIDUAL PAGES
    if (safeText.includes("\n\n---\n\n")) {
      const parts = safeText.split("\n\n---\n\n");
      const translatedParts = [];
      let allFound = true;

      for (const part of parts) {
        const partText = part.trim();
        if (!partText) continue;
        const partKey = cacheKey(partText, target.iso);
        const cachedPart = await prisma.translation.findUnique({ where: { hash: partKey } });
        if (cachedPart) {
          translatedParts.push(cachedPart.translatedText);
        } else {
          allFound = false;
          break;
        }
      }

      if (allFound && translatedParts.length > 0) {
        const combinedTranslation = translatedParts.join("\n\n---\n\n");
        // Save the combined result for next time
        await prisma.translation.upsert({
          where: { hash: key },
          update: {},
          create: {
            hash: key,
            originalText: safeText.slice(0, 500),
            translatedText: combinedTranslation,
            targetLanguage: target.iso,
            engine: "db-cache-assembled"
          }
        });
        return NextResponse.json({ translation: combinedTranslation, engine: "db-cache-assembled" });
      }
    }

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

    let resultText: string | null = null;
    let engineUsed = "";

    // Chain of engines — cost-optimized order
    // 1. OpenRouter (cheapest, high quality with llama-3.1-70b)
    resultText = await translateWithOpenRouter(safeText, target.prompt, keys.openrouter);
    if (resultText) engineUsed = "openrouter";
    // 2. Gemini (free tier available)
    if (!resultText) {
      resultText = await translateWithGemini(safeText, target.prompt, keys.gemini);
      if (resultText) engineUsed = "gemini";
    }
    // 3. OpenAI (moderate cost)
    if (!resultText) {
      resultText = await translateWithOpenAI(safeText, target.prompt, keys.openai);
      if (resultText) engineUsed = "openai";
    }
    // 4. Claude (most expensive — last AI resort)
    if (!resultText) {
      resultText = await translateWithClaude(safeText, target.prompt, keys.anthropic);
      if (resultText) engineUsed = "claude";
    }
    // 5. Google Translate Free (absolute last resort, lower quality)
    if (!resultText) {
      resultText = await translateWithGoogleFree(safeText, target.iso);
      if (resultText) engineUsed = "google-free";
    }

    if (resultText) {
      // SAVE TO PERSISTENT CACHE (FOR FUTURE SAVINGS)
      try {
        await prisma.translation.upsert({
          where: { hash: key },
          update: {},
          create: {
            hash: key,
            originalText: safeText.slice(0, 500),
            translatedText: resultText,
            targetLanguage: target.iso,
            engine: engineUsed
          }
        });
      } catch (dbError) {
        console.error("[TRANSLATE] DB Save error:", dbError);
      }
      return NextResponse.json({ translation: resultText, engine: engineUsed });
    }

    return NextResponse.json({ translation: safeText, degraded: true });

  } catch (error) {
    console.error("[TRANSLATE] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
