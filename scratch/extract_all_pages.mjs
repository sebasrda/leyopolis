// Extrae el texto real de cada PDF publicado (mismo algoritmo que la app,
// via unpdf) y lo cachea localmente + calcula huecos reales de traduccion
// por idioma. NO llama a ninguna API de traduccion — solo lectura de PDFs
// y consulta a la base de datos.
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import 'dotenv/config';

const prisma = new PrismaClient();
const LANGS = ['en', 'fr', 'de', 'pt-BR', 'it', 'zh-CN'];
const OUT_DIR = 'D:/Temp/claude/D--trae-projects-Leyopolis/6c7f12e9-818c-4fbb-bea1-9cb8fa361b10/scratchpad/pdf_pages';

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function extractPdfPages(pdfUrl) {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Descarga PDF HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const { getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(buf);
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items;
    let result = '';
    let lastY = null;
    for (const item of items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        result += '\n';
      } else if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n')) {
        result += ' ';
      }
      result += item.str;
      lastY = item.transform[5];
    }
    pages.push(result.trim());
  }
  return pages;
}

async function main() {
  const books = await prisma.book.findMany({
    where: { published: true },
    select: { id: true, title: true, contentUrl: true },
    orderBy: { title: 'asc' },
  });

  const translations = await prisma.bookPageTranslation.findMany({
    select: { bookId: true, pageNumber: true, language: true },
  });
  const existing = new Map(); // bookId -> lang -> Set(pageNumber)
  for (const t of translations) {
    if (!existing.has(t.bookId)) existing.set(t.bookId, {});
    const langMap = existing.get(t.bookId);
    if (!langMap[t.language]) langMap[t.language] = new Set();
    langMap[t.language].add(t.pageNumber);
  }

  const summary = [];
  let totalRealPages = 0;
  let totalMissingPageLangPairs = 0;
  let failedBooks = [];

  for (const [idx, book] of books.entries()) {
    const cacheFile = `${OUT_DIR}/${book.id}.json`;
    let pages;
    if (existsSync(cacheFile)) {
      pages = JSON.parse(readFileSync(cacheFile, 'utf-8')).pages;
    } else {
      try {
        pages = await extractPdfPages(book.contentUrl);
        writeFileSync(cacheFile, JSON.stringify({ bookId: book.id, title: book.title, pages }, null, 0));
      } catch (e) {
        console.error(`FAILED ${book.title}: ${e.message}`);
        failedBooks.push({ id: book.id, title: book.title, error: e.message });
        continue;
      }
    }

    const realPageCount = pages.filter(p => p && p.trim().length >= 20).length;
    totalRealPages += realPageCount;

    const langMap = existing.get(book.id) || {};
    const missingByLang = {};
    for (const lang of LANGS) {
      const have = langMap[lang] || new Set();
      const validPageNumbers = pages.map((p, i) => ({ p, n: i + 1 })).filter(x => x.p && x.p.trim().length >= 20).map(x => x.n);
      const missing = validPageNumbers.filter(n => !have.has(n));
      missingByLang[lang] = missing.length;
      totalMissingPageLangPairs += missing.length;
    }

    summary.push({ id: book.id, title: book.title, realPageCount, missingByLang });
    console.log(`[${idx + 1}/${books.length}] ${book.title}: ${realPageCount} pages real | missing: ${JSON.stringify(missingByLang)}`);
  }

  writeFileSync('D:/Temp/claude/D--trae-projects-Leyopolis/6c7f12e9-818c-4fbb-bea1-9cb8fa361b10/scratchpad/translation_gap_summary.json',
    JSON.stringify({ summary, totalRealPages, totalMissingPageLangPairs, failedBooks, generatedAt: new Date().toISOString() }, null, 2));

  console.log('\n=== TOTALS ===');
  console.log('Books processed:', books.length);
  console.log('Books failed to extract:', failedBooks.length);
  console.log('Total real pages (sum across all books, single language):', totalRealPages);
  console.log('Total missing (page x language) pairs to translate:', totalMissingPageLangPairs);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
