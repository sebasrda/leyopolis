import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LANGS = ["en", "fr", "de", "pt-BR", "it", "zh-CN"];

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const [books, translations] = await Promise.all([
    prisma.book.findMany({
      where: { published: true },
      select: { id: true, title: true, grade: true, author: true, coverImage: true, contentUrl: true },
      orderBy: { title: "asc" },
    }),
    (prisma as any).bookPageTranslation.findMany({
      select: { bookId: true, language: true, pageNumber: true },
    }),
  ]);

  // Index by book -> lang -> Set<pageNumber>
  const byBook = new Map<string, Map<string, Set<number>>>();
  for (const t of translations) {
    if (!byBook.has(t.bookId)) byBook.set(t.bookId, new Map());
    const langMap = byBook.get(t.bookId)!;
    if (!langMap.has(t.language)) langMap.set(t.language, new Set());
    langMap.get(t.language)!.add(t.pageNumber);
  }

  const rows = books.map((book) => {
    const langMap = byBook.get(book.id) || new Map<string, Set<number>>();

    // Max page number known across all languages (proxy for total pages)
    let maxPage = 0;
    for (const set of langMap.values()) {
      for (const p of set) if (p > maxPage) maxPage = p;
    }

    const perLang: Record<string, number> = {};
    for (const lang of LANGS) {
      perLang[lang] = (langMap.get(lang)?.size) || 0;
    }

    const total = Object.values(perLang).reduce((a, b) => a + b, 0);
    const expected = maxPage * LANGS.length;
    const pct = expected > 0 ? Math.round((total / expected) * 100) : 0;

    // A book is "complete" if every language has AT LEAST maxPage pages.
    // (The extractor filters pages <20 chars, so some books may legitimately
    // have fewer 'valid' pages than maxPage; but if all langs match the max,
    // we consider it done.)
    const isComplete = maxPage > 0 && LANGS.every((l) => (perLang[l] || 0) >= maxPage);

    const missingLangs = LANGS.filter((l) => (perLang[l] || 0) < maxPage);

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      grade: book.grade,
      coverImage: book.coverImage,
      hasContentUrl: !!book.contentUrl,
      maxPage,
      perLang,
      total,
      expected,
      pct,
      isComplete,
      isEmpty: total === 0,
      missingLangs,
    };
  });

  const complete = rows.filter((r) => r.isComplete);
  const partial = rows.filter((r) => !r.isComplete && !r.isEmpty);
  const empty = rows.filter((r) => r.isEmpty);

  return NextResponse.json({
    totals: {
      books: books.length,
      complete: complete.length,
      partial: partial.length,
      empty: empty.length,
      translatedPages: translations.length,
    },
    perLang: LANGS.map((lang) => ({
      lang,
      booksWithAny: rows.filter((r) => (r.perLang[lang] || 0) > 0).length,
      totalPages: rows.reduce((a, r) => a + (r.perLang[lang] || 0), 0),
    })),
    books: rows,
    languages: LANGS,
  });
}
