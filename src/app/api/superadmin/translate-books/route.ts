import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max — client sends 1 book × 1 lang, always fits

const CACHE_VERSION = "v11";

const LANG_TABLE: Record<string, { prompt: string; iso: string }> = {
  en: { prompt: "English", iso: "en" },
  fr: { prompt: "French", iso: "fr" },
  de: { prompt: "German", iso: "de" },
  pt: { prompt: "Brazilian Portuguese", iso: "pt-BR" },
  it: { prompt: "Italian", iso: "it" },
  zh: { prompt: "Simplified Chinese", iso: "zh-CN" },
};

function cacheKey(text: string, targetIso: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const hash = createHash("sha1").update(normalized).digest("hex");
  return `${CACHE_VERSION}::${targetIso}::${hash}`;
}

function buildTranslationPrompt(text: string, targetLang: string): string {
  return `You are a world-class professional literary translator with deep expertise in ${targetLang}.

YOUR TASK: Translate the following page of a book into ${targetLang}.

MANDATORY RULES:
1. Translate EVERY sentence completely. Do NOT skip, summarize, or truncate.
2. Preserve paragraph structure.
3. Maintain the author's literary tone, style, register, and voice.
4. Produce fluent, natural ${targetLang}. Never translate word-by-word.
5. Proper nouns stay in original form unless a well-known ${targetLang} equivalent exists.
6. Output ONLY ${targetLang}. No preamble, no labels, no commentary. Start directly with the translated text.

TEXT TO TRANSLATE:

${text}`;
}

function stripPreamble(text: string): string {
  if (!text) return text;
  let out = text.trim();
  out = out.replace(/^```[\w-]*\s*\n/i, "").replace(/\n```\s*$/i, "");
  const labels = [
    "Translation:", "Traduction:", "Übersetzung:", "Tradução:", "Traduzione:", "翻译：", "翻译:",
    "Aquí está la traducción:", "Aquí tienes la traducción:",
    "Here is the translation:", "Here's the translation:",
    "Voici la traduction:", "Ecco la traduzione:",
  ];
  for (const label of labels) {
    const re = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i");
    out = out.replace(re, "");
  }
  return out.trim();
}

type TranslateResult = { ok: true; translation: string; engine: string } | { ok: false; error: string };

async function translateWithClaude(text: string, targetPrompt: string, apiKey: string): Promise<TranslateResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        messages: [{ role: "user", content: buildTranslationPrompt(text, targetPrompt) }],
        temperature: 0.3,
      }),
    });
    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return { ok: false, error: `Claude HTTP ${response.status}: ${errText.slice(0, 200)}` };
    }
    const data = await response.json();
    const translation = data.content?.[0]?.text;
    if (!translation || translation.trim().length <= 5) return { ok: false, error: "Claude: respuesta vacía" };
    return { ok: true, translation: stripPreamble(translation), engine: "claude-batch" };
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "Claude timeout" : (e?.message || String(e)) };
  }
}

async function translateWithGemini(text: string, targetPrompt: string, apiKey: string): Promise<TranslateResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildTranslationPrompt(text, targetPrompt) }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
      },
    );
    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return { ok: false, error: `Gemini HTTP ${response.status}: ${errText.slice(0, 200)}` };
    }
    const data = await response.json();
    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!translation || translation.trim().length <= 5) return { ok: false, error: "Gemini: respuesta vacía" };
    return { ok: true, translation: stripPreamble(translation), engine: "gemini-batch" };
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "Gemini timeout" : (e?.message || String(e)) };
  }
}

async function translateWithOpenAI(text: string, targetPrompt: string, apiKey: string): Promise<TranslateResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 4096,
        temperature: 0.3,
        messages: [{ role: "user", content: buildTranslationPrompt(text, targetPrompt) }],
      }),
    });
    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return { ok: false, error: `OpenAI HTTP ${response.status}: ${errText.slice(0, 200)}` };
    }
    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content;
    if (!translation || translation.trim().length <= 5) return { ok: false, error: "OpenAI: respuesta vacía" };
    return { ok: true, translation: stripPreamble(translation), engine: "openai-batch" };
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "OpenAI timeout" : (e?.message || String(e)) };
  }
}

/**
 * Cadena de proveedores. Claude preferido (mejor calidad), Gemini como
 * fallback barato, OpenAI último. Si Claude devuelve 'credit balance too low'
 * o 401/403, saltamos directo al próximo sin re-intentar.
 */
async function translatePage(
  text: string,
  targetPrompt: string,
  keys: { claude?: string; gemini?: string; openai?: string },
): Promise<TranslateResult> {
  let lastError = "sin proveedores configurados";
  if (keys.claude) {
    const r = await translateWithClaude(text, targetPrompt, keys.claude);
    if (r.ok) return r;
    lastError = r.error;
  }
  if (keys.gemini) {
    const r = await translateWithGemini(text, targetPrompt, keys.gemini);
    if (r.ok) return r;
    lastError = r.error;
  }
  if (keys.openai) {
    const r = await translateWithOpenAI(text, targetPrompt, keys.openai);
    if (r.ok) return r;
    lastError = r.error;
  }
  return { ok: false, error: lastError };
}

async function extractPdfPages(pdfUrl: string): Promise<string[]> {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Descarga PDF HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());

  // Reproducimos el mismo algoritmo del lector para que los hashes matcheen
  // en la retrocompat, aunque la clave primaria ahora es (bookId, page, lang).
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buf);
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    let result = "";
    let lastY: number | null = null;
    for (const item of items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        result += "\n";
      } else if (result.length > 0 && !result.endsWith(" ") && !result.endsWith("\n")) {
        result += " ";
      }
      result += item.str;
      lastY = item.transform[5];
    }
    pages.push(result.trim());
  }

  return pages;
}

/**
 * POST /api/superadmin/translate-books
 * Body: { bookIds: string[], languages: string[] }
 *
 * SIMPLE JSON response (no SSE). The frontend loops one (book × language)
 * per request, so each call is bounded (~2 min max) and never hits the
 * Vercel timeout. Every translated page is persisted to
 * BookPageTranslation immediately, so any timeout or reload is safe —
 * the next run picks up from where we left off via the cache check.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const bookIds: string[] = Array.isArray(body.bookIds) ? body.bookIds : [];
  const languages: string[] = Array.isArray(body.languages) ? body.languages : [];

  if (bookIds.length === 0 || languages.length === 0) {
    return NextResponse.json({ message: "bookIds y languages son requeridos" }, { status: 400 });
  }
  const invalidLangs = languages.filter((l) => !LANG_TABLE[l]);
  if (invalidLangs.length > 0) {
    return NextResponse.json({ message: `Idiomas inválidos: ${invalidLangs.join(", ")}` }, { status: 400 });
  }

  const settings = await prisma.systemSetting.findMany();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => { acc[s.key] = s.value; return acc; }, {});
  const sanitize = (k?: string) => (k || "").trim().replace(/^["']|["']$/g, "");
  const keys = {
    claude: sanitize(settingsMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY),
    gemini: sanitize(settingsMap.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY),
    openai: sanitize(settingsMap.OPENAI_API_KEY || process.env.OPENAI_API_KEY),
  };

  if (!keys.claude && !keys.gemini && !keys.openai) {
    return NextResponse.json({
      message: "No hay ninguna API key configurada. Configura ANTHROPIC_API_KEY, GOOGLE_API_KEY u OPENAI_API_KEY en /dashboard/superadmin/settings o como variable de entorno.",
    }, { status: 400 });
  }

  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, title: true, contentUrl: true },
  });

  const summary = {
    totalPages: 0,
    translated: 0,
    cached: 0,
    failed: 0,
    booksProcessed: 0,
    booksSkipped: 0,
    firstError: null as string | null,
  };

  for (const book of books) {
    if (!book.contentUrl) {
      summary.booksSkipped++;
      continue;
    }

    // ── FAST PATH: si TODAS las páginas del libro ya están traducidas a
    // TODOS los idiomas pedidos, no bajemos ni extraigamos el PDF (esa era
    // la causa principal del cuelgue: re-descargar y re-extraer PDFs grandes
    // 6 veces por libro cuando ya estaba todo hecho).
    const cachedCount = await (prisma as any).bookPageTranslation.count({
      where: { bookId: book.id, language: { in: languages.map((l) => LANG_TABLE[l].iso) } },
    }).catch(() => 0);

    // Estimamos el max page number cacheado. Si existe, y todos los idiomas
    // tienen la misma cantidad de páginas, asumimos que está completo.
    const maxCachedPage = await (prisma as any).bookPageTranslation.findFirst({
      where: { bookId: book.id },
      orderBy: { pageNumber: "desc" },
      select: { pageNumber: true },
    }).catch(() => null);

    const expectedFull = (maxCachedPage?.pageNumber || 0) * languages.length;
    if (maxCachedPage && cachedCount >= expectedFull && expectedFull > 0) {
      summary.cached += cachedCount;
      summary.totalPages += maxCachedPage.pageNumber * languages.length;
      summary.booksProcessed++;
      continue;
    }

    let pages: string[];
    try {
      pages = await extractPdfPages(book.contentUrl);
    } catch (e: any) {
      summary.booksSkipped++;
      if (!summary.firstError) summary.firstError = `Extracción PDF (${book.title}): ${e?.message}`;
      continue;
    }

    const validPages = pages
      .map((p, i) => ({ text: p, num: i + 1 }))
      .filter((p) => p.text.trim().length >= 20);

    for (const langCode of languages) {
      const lang = LANG_TABLE[langCode];
      const CONCURRENCY = 3;
      let cursor = 0;
      summary.totalPages += validPages.length;

      const worker = async () => {
        while (cursor < validPages.length) {
          const idx = cursor++;
          const page = validPages[idx];
          if (!page) break;

          // ¿Ya cacheado? (chequeo determinístico)
          const existing = await (prisma as any).bookPageTranslation.findUnique({
            where: { bookId_pageNumber_language: { bookId: book.id, pageNumber: page.num, language: lang.iso } },
          }).catch(() => null);
          if (existing) {
            summary.cached++;
            continue;
          }

          const result = await translatePage(page.text, lang.prompt, keys);
          if (!result.ok) {
            summary.failed++;
            if (!summary.firstError) summary.firstError = `${book.title} pág ${page.num} (${langCode}): ${result.error}`;
            continue;
          }

          try {
            await (prisma as any).bookPageTranslation.upsert({
              where: { bookId_pageNumber_language: { bookId: book.id, pageNumber: page.num, language: lang.iso } },
              update: { translatedText: result.translation, engine: result.engine },
              create: {
                bookId: book.id,
                pageNumber: page.num,
                language: lang.iso,
                translatedText: result.translation,
                engine: result.engine,
              },
            });
            await prisma.translation.upsert({
              where: { hash: cacheKey(page.text, lang.iso) },
              update: { translatedText: result.translation, engine: result.engine },
              create: {
                hash: cacheKey(page.text, lang.iso),
                originalText: page.text.slice(0, 4000),
                translatedText: result.translation,
                targetLanguage: lang.iso,
                engine: result.engine,
              },
            }).catch(() => {});
            summary.translated++;
          } catch (dbErr: any) {
            summary.failed++;
            if (!summary.firstError) summary.firstError = `DB: ${dbErr?.message}`;
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    }

    summary.booksProcessed++;
  }

  return NextResponse.json(summary);
}
