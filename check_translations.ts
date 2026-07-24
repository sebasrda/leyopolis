import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LANGS = ["en", "fr", "de", "pt-BR", "it", "zh-CN"];

async function main() {
  const books = await prisma.book.findMany({
    where: { published: true },
    select: { id: true, title: true, grade: true, author: true, coverImage: true, contentUrl: true },
    orderBy: { title: "asc" },
  });
  
  const translations = await (prisma as any).bookPageTranslation.findMany({
    select: { bookId: true, language: true, pageNumber: true },
  });

  const byBook = new Map<string, Map<string, Set<number>>>();
  for (const t of translations) {
    if (!byBook.has(t.bookId)) byBook.set(t.bookId, new Map());
    const langMap = byBook.get(t.bookId)!;
    if (!langMap.has(t.language)) langMap.set(t.language, new Set());
    langMap.get(t.language)!.add(t.pageNumber);
  }

  const rows = books.map((book) => {
    const langMap = byBook.get(book.id) || new Map<string, Set<number>>();
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
    
    // The issue: a book is considered complete if perLang[l] >= maxPage for all langs
    // But what if one language has 15 pages and another has 16? It's marked as partial.
    const isComplete = maxPage > 0 && LANGS.every((l) => (perLang[l] || 0) >= maxPage);
    const isAlmostComplete = maxPage > 0 && LANGS.every((l) => (perLang[l] || 0) >= maxPage - 2);

    return {
      title: book.title,
      maxPage,
      perLang,
      isComplete,
      isAlmostComplete,
      isEmpty: total === 0
    };
  });

  const complete = rows.filter((r) => r.isComplete);
  const almostComplete = rows.filter(r => r.isAlmostComplete && !r.isComplete);
  const partial = rows.filter((r) => !r.isAlmostComplete && !r.isComplete && !r.isEmpty);
  const empty = rows.filter((r) => r.isEmpty);

  console.log(`Total books: ${books.length}`);
  console.log(`Complete: ${complete.length}`);
  console.log(`Almost Complete (within 2 pages of max): ${almostComplete.length}`);
  console.log(`Partial: ${partial.length}`);
  console.log(`Empty: ${empty.length}`);
  
  if (almostComplete.length > 0) {
    console.log("\nSample Almost Complete Books:");
    almostComplete.slice(0, 3).forEach(b => console.log(b.title, b.perLang, "max:", b.maxPage));
  }
  
  if (partial.length > 0) {
    console.log("\nSample Partial Books:");
    partial.slice(0, 3).forEach(b => console.log(b.title, b.perLang, "max:", b.maxPage));
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
