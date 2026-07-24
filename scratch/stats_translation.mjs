import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const LANGS = ['en', 'fr', 'de', 'pt-BR', 'it', 'zh-CN'];

async function main() {
  const books = await prisma.book.findMany({
    where: { published: true },
    select: { id: true, title: true, contentUrl: true },
  });
  console.log('Published books with contentUrl:', books.filter(b => b.contentUrl).length, '/', books.length);

  const translations = await prisma.bookPageTranslation.groupBy({
    by: ['bookId', 'language'],
    _max: { pageNumber: true },
    _count: { pageNumber: true },
  });

  const byBook = new Map();
  for (const t of translations) {
    if (!byBook.has(t.bookId)) byBook.set(t.bookId, {});
    byBook.get(t.bookId)[t.language] = { max: t._max.pageNumber, count: t._count.pageNumber };
  }

  let fullyMissingCombos = 0;
  let partialCombos = 0;
  let completeCombos = 0;
  let booksWithNoContentUrl = 0;
  let totalMissingPages = 0;

  for (const b of books) {
    if (!b.contentUrl) { booksWithNoContentUrl++; continue; }
    const langData = byBook.get(b.id) || {};
    const maxPageAcrossLangs = Math.max(0, ...Object.values(langData).map(d => d.max || 0));
    for (const lang of LANGS) {
      const d = langData[lang];
      if (!d || d.count === 0) {
        fullyMissingCombos++;
        totalMissingPages += maxPageAcrossLangs;
      } else if (d.max < maxPageAcrossLangs || d.count < d.max) {
        partialCombos++;
        totalMissingPages += Math.max(0, maxPageAcrossLangs - d.count);
      } else {
        completeCombos++;
      }
    }
  }

  console.log('Books with NO contentUrl (cannot translate):', booksWithNoContentUrl);
  console.log('Total book x language combos:', books.length * LANGS.length);
  console.log('Fully missing combos:', fullyMissingCombos);
  console.log('Partial combos:', partialCombos);
  console.log('Complete combos:', completeCombos);
  console.log('Estimated total missing pages (rough, using max known page as proxy):', totalMissingPages);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
