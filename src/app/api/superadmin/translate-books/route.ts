import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 800; // Vercel Pro: hasta 800s por request

// Debe coincidir con CACHE_VERSION en /api/translate/route.ts para que el
// lector encuentre las traducciones que dejamos aquí.
const CACHE_VERSION = "v11";

// Mapa de códigos de idioma al formato que espera el lector cuando llama
// /api/translate. Usamos el ISO exacto porque ese ISO forma parte de la
// hash key del cache.
const LANG_TABLE: Record<string, { prompt: string; iso: string; flag: string }> = {
  en: { prompt: "English", iso: "en", flag: "🇬🇧" },
  fr: { prompt: "French", iso: "fr", flag: "🇫🇷" },
  de: { prompt: "German", iso: "de", flag: "🇩🇪" },
  pt: { prompt: "Brazilian Portuguese", iso: "pt-BR", flag: "🇧🇷" },
  it: { prompt: "Italian", iso: "it", flag: "🇮🇹" },
  zh: { prompt: "Simplified Chinese", iso: "zh-CN", flag: "🇨🇳" },
};

function cacheKey(text: string, targetIso: string) {
  // MISMO formato que /api/translate.cacheKey() — cualquier cambio aquí
  // rompe el cache que verá el lector.
  const normalized = text.replace(/\s+/g, " ").trim();
  const hash = createHash("sha1").update(normalized).digest("hex");
  return `${CACHE_VERSION}::${targetIso}::${hash}`;
}

function buildTranslationPrompt(text: string, targetLang: string): string {
  return `You are a world-class professional literary translator with deep expertise in ${targetLang}.

YOUR TASK: Translate the following page of a book into ${targetLang}.

MANDATORY RULES — violating any rule is unacceptable:
1. Translate EVERY sentence completely. Do NOT skip, summarize, abbreviate, or truncate any part.
2. Preserve the exact paragraph structure. Each paragraph in the original must appear as a paragraph in the translation.
3. Maintain the author's literary tone, style, register, and voice faithfully.
4. Produce fluent, natural ${targetLang}. NEVER translate word-by-word.
5. Proper nouns (character names, place names) stay in their original form unless a well-known ${targetLang} equivalent exists (e.g. "Don Quijote" → "Don Quixote" in EN).
6. Output MUST contain ONLY ${targetLang}. No source-language text, no preamble, no commentary, no headers, no labels like "Translation:" or "翻译：" or "Aquí está la traducción:". Start directly with the translated text.
7. If the input is already partially in ${targetLang}, still translate every other sentence into ${targetLang}. Do NOT leave any sentence in another language.
8. Preserve dialogue punctuation (em-dashes, quotation marks) in the appropriate ${targetLang} convention.

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
    const re = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*`, "i");
    out = out.replace(re, "");
  }
  return out.trim();
}

// Llamada directa a la API de Claude — el usuario cargó saldo ahí, así que
// esta ruta usa Claude preferentemente. Con timeout largo porque cada página
// puede tardar 5–15 segundos.
async function translateWithClaude(
  text: string,
  targetPrompt: string,
  apiKey: string,
  model = "claude-haiku-4-5-20251001",
): Promise<{ ok: true; translation: string } | { ok: false; error: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
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
    if (!translation || translation.trim().length <= 5) {
      return { ok: false, error: "Respuesta vacía" };
    }
    return { ok: true, translation: stripPreamble(translation) };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function extractPdfPages(pdfUrl: string): Promise<string[]> {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Descarga PDF HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());

  // ── CRITICAL: replicamos EXACTAMENTE el algoritmo de extracción del
  // lector (ProfessionalFlipbook.extractPageText) para que el hash SHA1
  // usado como cache key coincida byte a byte con el que produce el
  // cliente cuando abre el libro y llama /api/translate. Cualquier
  // diferencia mínima → cache miss → traducción se re-genera al vuelo.
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

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const bookIds: string[] = Array.isArray(body.bookIds) ? body.bookIds : [];
  const languages: string[] = Array.isArray(body.languages) ? body.languages : [];

  if (bookIds.length === 0 || languages.length === 0) {
    return new Response(JSON.stringify({ message: "bookIds y languages son requeridos" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const invalidLangs = languages.filter((l) => !LANG_TABLE[l]);
  if (invalidLangs.length > 0) {
    return new Response(JSON.stringify({ message: `Idiomas inválidos: ${invalidLangs.join(", ")}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Obtener API key de Claude — puede venir de SystemSetting (superadmin la
  // configura en /dashboard/superadmin/settings) o de la env var.
  const settings = await prisma.systemSetting.findMany();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => { acc[s.key] = s.value; return acc; }, {});
  const sanitize = (k?: string) => (k || "").trim().replace(/^["']|["']$/g, "");
  const claudeKey = sanitize(settingsMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);

  if (!claudeKey) {
    return new Response(JSON.stringify({ message: "Falta ANTHROPIC_API_KEY (configura en /dashboard/superadmin/settings o env)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, title: true, contentUrl: true },
  });

  // ── SSE ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: any) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)); }
        catch { /* controller may be closed */ }
      };

      const summary = { totalPages: 0, translated: 0, cached: 0, failed: 0 };

      send({ type: "start", message: `Iniciando traducción de ${books.length} libros × ${languages.length} idiomas…` });

      for (let bIdx = 0; bIdx < books.length; bIdx++) {
        const book = books[bIdx];
        if (!book.contentUrl) {
          send({ type: "book-skip", book: book.title, reason: "sin contentUrl" });
          continue;
        }

        send({ type: "book-start", book: book.title, index: bIdx + 1, total: books.length });

        // 1. Extraer texto por página (una sola vez, se reusa para todos los idiomas)
        let pages: string[] = [];
        try {
          pages = await extractPdfPages(book.contentUrl);
        } catch (e: any) {
          send({ type: "book-error", book: book.title, error: `Extracción PDF falló: ${e?.message}` });
          continue;
        }

        // Filtrar páginas vacías (portadas, separadores)
        const validPages = pages.map((p, i) => ({ text: p, num: i + 1 }))
                                .filter((p) => p.text.trim().length >= 20);

        send({ type: "book-pages", book: book.title, totalPages: pages.length, validPages: validPages.length });
        summary.totalPages += validPages.length * languages.length;

        // 2. Para cada idioma, traducir todas las páginas
        for (const langCode of languages) {
          const lang = LANG_TABLE[langCode];

          // Procesar páginas en batches concurrentes (concurrency = 3)
          const CONCURRENCY = 3;
          let cursor = 0;

          const worker = async () => {
            while (cursor < validPages.length) {
              const idx = cursor++;
              const page = validPages[idx];
              if (!page) break;

              const key = cacheKey(page.text, lang.iso);

              // ¿Ya cacheado? Usamos la tabla determinística por (book, page, lang)
              // porque el hash del texto puede variar entre extracciones y no
              // sirve como "ya está listo"; el (bookId, pageNumber, lang) sí.
              const existing = await (prisma as any).bookPageTranslation.findUnique({
                where: { bookId_pageNumber_language: { bookId: book.id, pageNumber: page.num, language: lang.iso } },
              }).catch(() => null);
              if (existing) {
                summary.cached++;
                send({
                  type: "page-cached",
                  book: book.title,
                  lang: langCode,
                  page: page.num,
                  progress: { translated: summary.translated, cached: summary.cached, failed: summary.failed, total: summary.totalPages },
                });
                continue;
              }

              // Traducir con Claude
              const result = await translateWithClaude(page.text, lang.prompt, claudeKey);

              if (result.ok) {
                try {
                  // 1. Guardar en la tabla determinística (bookId, page, lang)
                  //    para que el lector haga cache-hit garantizado.
                  await (prisma as any).bookPageTranslation.upsert({
                    where: { bookId_pageNumber_language: { bookId: book.id, pageNumber: page.num, language: lang.iso } },
                    update: { translatedText: result.translation, engine: "claude-batch" },
                    create: {
                      bookId: book.id,
                      pageNumber: page.num,
                      language: lang.iso,
                      translatedText: result.translation,
                      engine: "claude-batch",
                    },
                  });
                  // 2. También en el cache antiguo por hash (retrocompat)
                  await prisma.translation.upsert({
                    where: { hash: key },
                    update: { translatedText: result.translation, engine: "claude-batch" },
                    create: {
                      hash: key,
                      originalText: page.text.slice(0, 4000),
                      translatedText: result.translation,
                      targetLanguage: lang.iso,
                      engine: "claude-batch",
                    },
                  }).catch(() => {});
                  summary.translated++;
                  send({
                    type: "page-ok",
                    book: book.title,
                    lang: langCode,
                    page: page.num,
                    progress: { translated: summary.translated, cached: summary.cached, failed: summary.failed, total: summary.totalPages },
                  });
                } catch (dbErr: any) {
                  summary.failed++;
                  send({ type: "page-fail", book: book.title, lang: langCode, page: page.num, error: `DB: ${dbErr?.message}` });
                }
              } else {
                summary.failed++;
                send({
                  type: "page-fail",
                  book: book.title,
                  lang: langCode,
                  page: page.num,
                  error: result.error,
                  progress: { translated: summary.translated, cached: summary.cached, failed: summary.failed, total: summary.totalPages },
                });
              }
            }
          };

          await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
          send({ type: "book-lang-done", book: book.title, lang: langCode });
        }

        send({ type: "book-done", book: book.title, index: bIdx + 1, total: books.length });
      }

      send({ type: "complete", summary });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
