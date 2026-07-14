import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max — Vercel Pro limit

const LANG_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  pt: "Brazilian Portuguese",
  it: "Italian",
  zh: "Simplified Chinese (Mandarin)",
};

/**
 * POST /api/superadmin/translate-books
 * Body: { bookIds: string[], languages: string[], fields?: ("title" | "description")[] }
 *
 * Streams progress via Server-Sent Events. Each SSE event is a JSON with
 * { done, total, current, ok, skipped, failed, message }.
 *
 * For every (book × language × field) combination it calls the internal
 * /api/translate endpoint (which handles the AI chain + cache).
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const bookIds: string[] = Array.isArray(body.bookIds) ? body.bookIds : [];
  const languages: string[] = Array.isArray(body.languages) ? body.languages : [];
  const fields: string[] = Array.isArray(body.fields) && body.fields.length > 0
    ? body.fields
    : ["title", "description"];

  if (bookIds.length === 0 || languages.length === 0) {
    return new Response(JSON.stringify({ message: "bookIds y languages son requeridos" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const invalidLangs = languages.filter((l) => !LANG_LABELS[l]);
  if (invalidLangs.length > 0) {
    return new Response(JSON.stringify({ message: `Idiomas inválidos: ${invalidLangs.join(", ")}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, title: true, description: true, author: true },
  });

  if (books.length === 0) {
    return new Response(JSON.stringify({ message: "Ningún libro encontrado" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build the work list — one item per (book, lang, field)
  const workList: Array<{ bookId: string; bookTitle: string; lang: string; field: string; text: string }> = [];
  for (const book of books) {
    for (const lang of languages) {
      for (const field of fields) {
        const text = field === "title" ? book.title : book.description;
        if (!text || text.trim().length < 2) continue;
        // Skip synthetic auto-extract placeholders that some seed books have
        if (text.trim().startsWith("[Extrayendo del archivo")) continue;
        workList.push({
          bookId: book.id,
          bookTitle: book.title,
          lang,
          field,
          text: text.trim(),
        });
      }
    }
  }

  const total = workList.length;
  const origin = new URL(req.url).origin;

  // Forward the caller's cookie so the internal /api/translate call is
  // authenticated as the same superadmin (rate limits, etc.)
  const cookieHeader = req.headers.get("cookie") || "";

  // ── SSE stream ─────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let done = 0;
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: "start", total, message: `Traduciendo ${total} strings (${books.length} libros × ${languages.length} idiomas × ${fields.length} campos)…` });

      // Process items with limited concurrency to avoid hammering the AI providers
      const CONCURRENCY = 4;
      let cursor = 0;

      const worker = async () => {
        while (cursor < workList.length) {
          const item = workList[cursor++];
          if (!item) break;

          try {
            const res = await fetch(`${origin}/api/translate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                cookie: cookieHeader,
              },
              body: JSON.stringify({
                text: item.text,
                targetLanguage: LANG_LABELS[item.lang],
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const translation = (data.translation || "").trim();
              if (translation && translation !== item.text) {
                ok++;
              } else {
                skipped++;
              }
            } else {
              failed++;
            }
          } catch (e) {
            failed++;
          }

          done++;
          send({
            type: "progress",
            done,
            total,
            ok,
            skipped,
            failed,
            current: { book: item.bookTitle, lang: item.lang, field: item.field },
          });
        }
      };

      // Fire N workers in parallel
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

      send({ type: "complete", done, total, ok, skipped, failed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx/proxy buffering
    },
  });
}
