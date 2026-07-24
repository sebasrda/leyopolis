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
    
    const allPages = new Set<number>();
    let maxPage = 0;
    for (const set of langMap.values()) {
      for (const p of set) {
        allPages.add(p);
        if (p > maxPage) maxPage = p;
      }
    }
    const expectedPagesCount = allPages.size;

    const perLang: Record<string, number> = {};
    for (const lang of LANGS) {
      perLang[lang] = (langMap.get(lang)?.size) || 0;
    }

    const total = Object.values(perLang).reduce((a, b) => a + b, 0);
    const expected = expectedPagesCount * LANGS.length;
    
    const isComplete = expectedPagesCount > 0 && LANGS.every((l) => (perLang[l] || 0) >= expectedPagesCount);

    return {
      title: book.title,
      maxPage,
      expectedPagesCount,
      perLang,
      isComplete,
      isEmpty: total === 0
    };
  });

  const complete = rows.filter((r) => r.isComplete);
  const partial = rows.filter((r) => !r.isComplete && !r.isEmpty);
  const empty = rows.filter((r) => r.isEmpty);

  console.log(`Total books: ${books.length}`);
  console.log(`Complete: ${complete.length}`);
  console.log(`Partial: ${partial.length}`);
  console.log(`Empty: ${empty.length}`);
  
  if (partial.length > 0) {
    console.log("\nSample Partial Books:");
    partial.slice(0, 3).forEach(b => console.log(b.title, b.perLang, "expected:", b.expectedPagesCount));
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
