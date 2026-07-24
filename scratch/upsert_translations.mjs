// Lee un JSON { bookId, language, pages: [{pageNumber, translatedText}] }
// y lo inserta/actualiza en BookPageTranslation. Idempotente.
// Uso: node upsert_translations.mjs <path-to-json>
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import 'dotenv/config';

const prisma = new PrismaClient();
const VALID_LANGS = new Set(['en', 'fr', 'de', 'pt-BR', 'it', 'zh-CN']);

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node upsert_translations.mjs <path-to-json>');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  const { bookId, language, pages } = data;

  if (!bookId || !language || !Array.isArray(pages)) {
    console.error('Invalid JSON shape. Expected {bookId, language, pages:[{pageNumber, translatedText}]}');
    process.exit(1);
  }
  if (!VALID_LANGS.has(language)) {
    console.error(`Invalid language code: ${language}. Must be one of ${[...VALID_LANGS].join(', ')}`);
    process.exit(1);
  }

  let ok = 0, skipped = 0, failed = 0;
  for (const p of pages) {
    const pageNumber = Number(p.pageNumber);
    const translatedText = (p.translatedText || '').trim();
    if (!Number.isInteger(pageNumber) || pageNumber < 1) { skipped++; continue; }
    if (translatedText.length < 5) { skipped++; continue; }
    try {
      await prisma.bookPageTranslation.upsert({
        where: { bookId_pageNumber_language: { bookId, pageNumber, language } },
        update: { translatedText, engine: 'claude-agent-direct' },
        create: { bookId, pageNumber, language, translatedText, engine: 'claude-agent-direct' },
      });
      ok++;
    } catch (e) {
      failed++;
      console.error(`Page ${pageNumber} failed:`, e.message);
    }
  }

  console.log(`[UPSERT] ${bookId} / ${language}: ok=${ok} skipped=${skipped} failed=${failed} (of ${pages.length})`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
