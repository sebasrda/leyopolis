// Construye la cola de trabajo de traduccion: para cada (libro, idioma) con
// paginas faltantes, arma chunks de paginas consecutivas (tamano maximo
// CHUNK_SIZE) listos para pasarle a un agente. Ordena por tamano de libro
// ascendente para priorizar victorias rapidas.
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import 'dotenv/config';

const prisma = new PrismaClient();
const LANGS = ['en']; // cambio de plan: solo ingles por ahora, los demas quedan sin traducir
const PDF_DIR = 'D:/Temp/claude/D--trae-projects-Leyopolis/6c7f12e9-818c-4fbb-bea1-9cb8fa361b10/scratchpad/pdf_pages';
const CHUNK_SIZE = 40;

async function main() {
  const books = await prisma.book.findMany({
    where: { published: true },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const translations = await prisma.bookPageTranslation.findMany({
    select: { bookId: true, pageNumber: true, language: true },
  });
  const existing = new Map();
  for (const t of translations) {
    if (!existing.has(t.bookId)) existing.set(t.bookId, {});
    const langMap = existing.get(t.bookId);
    if (!langMap[t.language]) langMap[t.language] = new Set();
    langMap[t.language].add(t.pageNumber);
  }

  const jobs = [];
  let bookIdx = 0;
  for (const book of books) {
    const cacheFile = `${PDF_DIR}/${book.id}.json`;
    if (!existsSync(cacheFile)) continue; // failed extraction (corrupt PDF)
    const { pages } = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    const validPageNumbers = pages
      .map((p, i) => ({ p, n: i + 1 }))
      .filter(x => x.p && x.p.trim().length >= 20)
      .map(x => x.n);
    if (validPageNumbers.length === 0) continue;

    const langMap = existing.get(book.id) || {};
    for (const lang of LANGS) {
      const have = langMap[lang] || new Set();
      const missing = validPageNumbers.filter(n => !have.has(n));
      if (missing.length === 0) continue;

      // chunk into consecutive groups of up to CHUNK_SIZE
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        const chunk = missing.slice(i, i + CHUNK_SIZE);
        jobs.push({
          jobId: `${book.id}__${lang}__${chunk[0]}-${chunk[chunk.length - 1]}`,
          bookId: book.id,
          title: book.title,
          language: lang,
          bookTotalValidPages: validPageNumbers.length,
          pageNumbers: chunk,
          status: 'pending',
        });
      }
    }
    bookIdx++;
  }

  // Sort: smaller books first (fast visible wins), then by title/lang for stability
  jobs.sort((a, b) => a.bookTotalValidPages - b.bookTotalValidPages || a.title.localeCompare(b.title) || a.language.localeCompare(b.language));

  const outPath = 'D:/Temp/claude/D--trae-projects-Leyopolis/6c7f12e9-818c-4fbb-bea1-9cb8fa361b10/scratchpad/job_queue.json';
  writeFileSync(outPath, JSON.stringify(jobs, null, 2));

  console.log('Total jobs (chunks):', jobs.length);
  console.log('Total pages across all jobs:', jobs.reduce((a, j) => a + j.pageNumbers.length, 0));
  console.log('Distinct books involved:', new Set(jobs.map(j => j.bookId)).size);
  console.log('Written to', outPath);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
