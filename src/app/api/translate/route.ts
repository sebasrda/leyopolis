import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CACHE_VERSION = "v10";

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
7. Output MUST contain ONLY ${targetLang}. No source-language text, no preamble, no commentary, no headers, no labels like "Translation:" or "翻译：" or "Aquí está la traducción:". Start directly with the translated text.
8. If the input is already partially in ${targetLang}, still translate every other sentence into ${targetLang}. Do NOT leave any sentence in another language.
9. If the original uses dialogue (em-dash, quotation marks), preserve the same punctuation style.
10. The translation must be the SAME LENGTH (in content, not characters) as the original — do not add or remove information.

TEXT TO TRANSLATE:

${text}`;
}

// Strip common AI preambles, labels, and quote wrappers that sneak into responses
function stripPreamble(text: string): string {
  if (!text) return text;
  let out = text.trim();

  // Remove leading code-fence markers like ```text or ```
  out = out.replace(/^```[\w-]*\s*\n/i, "").replace(/\n```\s*$/i, "");

  // Remove leading labels in many languages, anchored to the very start
  const labels = [
    /^translation\s*:\s*/i,
    /^translated\s+text\s*:\s*/i,
    /^here(?:'s|\s+is)\s+the\s+translation[^\n]*\n+/i,
    /^traducci[oó]n\s*:\s*/i,
    /^aqu[ií]\s+est[aá]\s+la\s+traducci[oó]n[^\n]*\n+/i,
    /^traduction\s*:\s*/i,
    /^[uü]bersetzung\s*:\s*/i,
    /^traduzione\s*:\s*/i,
    /^tradu[cç][aã]o\s*:\s*/i,
    /^翻译[：:]\s*/,
    /^译文[：:]\s*/,
  ];
  for (const re of labels) {
    out = out.replace(re, "");
  }

  // Strip surrounding quotes when the entire body is wrapped in them
  if (out.length > 4) {
    const first = out[0];
    const last = out[out.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'") || (first === "“" && last === "”")) {
      out = out.slice(1, -1).trim();
    }
  }

  return out.trim();
}

// Best-effort post-processor that drops leading source-language paragraphs when
// translating to a CJK target. The AI sometimes emits a paraphrase before the
// actual CJK output — this trims it without harming valid CJK answers.
function ensureTargetLanguage(text: string, targetIso: string): string {
  if (!text) return text;
  const isCJK = targetIso === "zh-CN" || targetIso === "zh" || targetIso === "ja" || targetIso === "ko";
  if (!isCJK) return text;

  const cjkRe = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;
  const paragraphs = text.split(/\n{2,}/);
  // Drop leading paragraphs that contain no CJK characters at all
  let i = 0;
  while (i < paragraphs.length && !cjkRe.test(paragraphs[i])) i++;
  if (i > 0 && i < paragraphs.length) {
    return paragraphs.slice(i).join("\n\n").trim();
  }
  return text;
}

// Detect a truncated translation. Two signals:
//  1) provider-reported finish_reason === "length" (token cap hit)
//  2) length-ratio heuristic vs the source. CJK targets compress a lot, so we
//     allow a much smaller ratio there.
function isTruncated(translation: string, source: string, targetIso: string, finishReason?: string): boolean {
  if (finishReason && finishReason.toLowerCase() === "length") return true;
  if (!translation || !source) return false;
  const trim = translation.trim();
  if (trim.length < 20) return true;
  const ratio = trim.length / source.length;
  const isCJK = targetIso === "zh-CN" || targetIso === "zh" || targetIso === "ja" || targetIso === "ko";
  const minRatio = isCJK ? 0.18 : 0.4;
  if (ratio < minRatio) return true;
  if (ratio < 0.6 && !/[\.\?\!…。？！」』”’\)\]]\s*$/.test(trim)) return true;
  return false;
}

// ─── Strategy 1: Anthropic (Claude Sonnet 4.6) ─────────────────────
async function translateWithClaude(text: string, targetLangPrompt: string, targetIso: string, apiKey?: string): Promise<string | null> {
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
    const stop = data.stop_reason; // "end_turn" | "max_tokens" | ...
    if (!translation || translation.trim().length <= 10) return null;
    const cleaned = stripPreamble(translation);
    const finish = stop === "max_tokens" ? "length" : stop;
    if (isTruncated(cleaned, text, targetIso, finish)) return null;
    return cleaned;
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

// ─── Strategy 2: OpenAI (GPT-4o mini) ─────────────────────────────
async function translateWithOpenAI(text: string, targetLangPrompt: string, targetIso: string, apiKey?: string): Promise<string | null> {
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
            content: `You are a professional literary translator. You translate text into ${targetLangPrompt} with perfect fluency. Output ONLY the full translation in ${targetLangPrompt}, never partial. Translate every paragraph completely.`,
          },
          {
            role: "user",
            content: buildTranslationPrompt(text, targetLangPrompt),
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content;
    const finish = data.choices?.[0]?.finish_reason;
    if (!translation || translation.trim().length <= 10) return null;
    const cleaned = stripPreamble(translation);
    if (isTruncated(cleaned, text, targetIso, finish)) return null;
    return cleaned;
  } catch (error) {
    console.error("[TRANSLATE] OpenAI error:", error);
  }
  return null;
}

// ─── Strategy 3: OpenRouter ────────────────────────────────────────
async function translateWithOpenRouter(text: string, targetLangPrompt: string, targetIso: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  // Tries multiple models in order. If any returns a TRUNCATED response
  // (finish_reason "length" or suspiciously short), we skip and try the next.
  const candidateModels = [
    "anthropic/claude-haiku-4.5",
    "google/gemini-2.5-flash",
    "openai/gpt-4o-mini",
  ];

  for (const model of candidateModels) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://leyopolis.vercel.app",
          "X-Title": "Leyopolis Translate",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `You translate text into ${targetLangPrompt}. Output ONLY the COMPLETE translation in ${targetLangPrompt}. Never stop mid-paragraph. Never produce partial output. No preamble, no source-language text, no explanations.` },
            { role: "user", content: buildTranslationPrompt(text, targetLangPrompt) },
          ],
          temperature: 0.2,
          // Generous ceiling so a full PDF page never gets truncated. Most pages
          // produce 1.5k-3k tokens of output; 8000 leaves room for verbose
          // languages (French/German) and CJK-to-Latin expansions.
          max_tokens: 8000,
        }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const translation = data.choices?.[0]?.message?.content;
      const finish = data.choices?.[0]?.finish_reason;
      if (!translation || translation.trim().length <= 10) continue;
      const cleaned = stripPreamble(translation);
      if (isTruncated(cleaned, text, targetIso, finish)) {
        console.warn(`[TRANSLATE] OpenRouter ${model} returned truncated output, skipping`);
        continue;
      }
      return cleaned;
    } catch (error) {
      console.error(`[TRANSLATE] OpenRouter (${model}) error:`, error);
    }
  }
  return null;
}

// ─── Strategy 4: Gemini ────────────────────────────────────────────
async function translateWithGemini(text: string, targetLangPrompt: string, targetIso: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || process.env.GOOGLE_API_KEY;
  if (!key) return null;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
    });
    const result = await model.generateContent(buildTranslationPrompt(text, targetLangPrompt));
    const translation = result.response.text();
    const finish = (result.response as any).candidates?.[0]?.finishReason; // "STOP" | "MAX_TOKENS" | ...
    if (!translation || translation.trim().length <= 10) return null;
    const cleaned = stripPreamble(translation);
    const finishNorm = finish === "MAX_TOKENS" ? "length" : finish;
    if (isTruncated(cleaned, text, targetIso, finishNorm)) return null;
    return cleaned;
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
      // Sanitize: old cache entries may contain combined spreads with "---" or
      // AI preambles in another language. Clean before serving.
      let cleanText = sanitizeSinglePage(dbCached.translatedText);
      cleanText = stripPreamble(cleanText);
      cleanText = ensureTargetLanguage(cleanText, target.iso);
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
          let cleanPart = stripPreamble(cachedPart.translatedText);
          cleanPart = ensureTargetLanguage(cleanPart, target.iso);
          translatedParts.push(cleanPart);
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

    // Chain of engines. Each strategy now rejects truncated output (returns
    // null) so the next engine gets a chance to produce a complete translation.
    // 1. OpenRouter (cheap + multi-model fallback inside)
    resultText = await translateWithOpenRouter(safeText, target.prompt, target.iso, keys.openrouter);
    if (resultText) engineUsed = "openrouter";
    // 2. Gemini direct
    if (!resultText) {
      resultText = await translateWithGemini(safeText, target.prompt, target.iso, keys.gemini);
      if (resultText) engineUsed = "gemini";
    }
    // 3. OpenAI direct
    if (!resultText) {
      resultText = await translateWithOpenAI(safeText, target.prompt, target.iso, keys.openai);
      if (resultText) engineUsed = "openai";
    }
    // 4. Claude direct (highest quality, last resort cost-wise)
    if (!resultText) {
      resultText = await translateWithClaude(safeText, target.prompt, target.iso, keys.anthropic);
      if (resultText) engineUsed = "claude";
    }
    // 5. Google Translate Free (last resort, lower quality but always full)
    if (!resultText) {
      resultText = await translateWithGoogleFree(safeText, target.iso);
      if (resultText) engineUsed = "google-free";
    }

    if (resultText) {
      // Final post-processing: strip preambles + drop leading source-language for CJK targets
      resultText = stripPreamble(resultText);
      resultText = ensureTargetLanguage(resultText, target.iso);

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
