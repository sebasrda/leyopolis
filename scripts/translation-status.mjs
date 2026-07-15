// Reporta cobertura de traducciones por libro y por idioma.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();
const LANGS = ["en", "fr", "de", "pt-BR", "it", "zh-CN"];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("     LEYÓPOLIS — ESTADO DE TRADUCCIÓN POR LIBRO");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const books = await prisma.book.findMany({
    where: { published: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  console.log(`Total libros publicados: ${books.length}`);
  console.log(`Idiomas evaluados: ${LANGS.join(", ")}\n`);

  // Trae TODAS las traducciones de una en un solo query
  const allTranslations = await prisma.bookPageTranslation.findMany({
    select: { bookId: true, language: true, pageNumber: true },
  });

  // Indexar: bookId -> { lang -> Set<pageNumber> }
  const byBook = new Map();
  for (const t of allTranslations) {
    if (!byBook.has(t.bookId)) byBook.set(t.bookId, new Map());
    const langMap = byBook.get(t.bookId);
    if (!langMap.has(t.language)) langMap.set(t.language, new Set());
    langMap.get(t.language).add(t.pageNumber);
  }

  // Para cada libro, calcular el max page number cacheado (proxy del total de páginas)
  const rows = [];
  for (const book of books) {
    const langMap = byBook.get(book.id) || new Map();
    let maxPage = 0;
    for (const set of langMap.values()) {
      for (const p of set) if (p > maxPage) maxPage = p;
    }

    const langCoverage = {};
    for (const lang of LANGS) {
      const set = langMap.get(lang);
      langCoverage[lang] = set ? set.size : 0;
    }

    const totalCached = Object.values(langCoverage).reduce((a, b) => a + b, 0);
    const expected = maxPage * LANGS.length;
    const pct = expected > 0 ? Math.round((totalCached / expected) * 100) : 0;

    rows.push({ book, maxPage, langCoverage, totalCached, expected, pct });
  }

  // Agrupar por estado
  const complete = rows.filter((r) => r.expected > 0 && r.totalCached >= r.expected);
  const partial = rows.filter((r) => r.expected > 0 && r.totalCached > 0 && r.totalCached < r.expected);
  const empty = rows.filter((r) => r.totalCached === 0);

  console.log("── RESUMEN GLOBAL ─────────────────────────────────────────────────────────────");
  console.log(`   ✅ Completos (todos los idiomas, todas las páginas): ${complete.length} / ${books.length}`);
  console.log(`   🔶 Parciales                                        : ${partial.length}`);
  console.log(`   ⬜ Sin ninguna traducción                            : ${empty.length}`);
  console.log(`   Total filas en BookPageTranslation: ${allTranslations.length}\n`);

  // Detalle por idioma
  console.log("── COBERTURA POR IDIOMA ────────────────────────────────────────────────────────");
  for (const lang of LANGS) {
    let booksWithAny = 0;
    let totalPages = 0;
    for (const r of rows) {
      const n = r.langCoverage[lang] || 0;
      if (n > 0) booksWithAny++;
      totalPages += n;
    }
    console.log(`   ${lang.padEnd(6)} → ${String(booksWithAny).padStart(3)} libros con traducción · ${totalPages} páginas totales`);
  }

  // Top 10 completos y top 10 empty
  console.log("\n── LIBROS COMPLETOS (primeros 20) ─────────────────────────────────────────────");
  complete.slice(0, 20).forEach((r, i) => {
    console.log(`   ${String(i + 1).padStart(2)}. ${r.book.title.padEnd(50).slice(0, 50)} · ${r.maxPage}p`);
  });
  if (complete.length > 20) console.log(`   … +${complete.length - 20} más`);

  console.log("\n── LIBROS PARCIALES (todos) ────────────────────────────────────────────────────");
  partial
    .sort((a, b) => a.pct - b.pct)
    .forEach((r, i) => {
      const detail = LANGS.map((l) => {
        const n = r.langCoverage[l] || 0;
        const flag = n >= r.maxPage ? "✓" : n > 0 ? `${n}p` : "✗";
        return `${l}:${flag}`;
      }).join(" ");
      console.log(`   ${String(i + 1).padStart(2)}. [${String(r.pct).padStart(3)}%] ${r.book.title.padEnd(38).slice(0, 38)} · ${r.maxPage}p · ${detail}`);
    });

  console.log("\n── LIBROS SIN NINGUNA TRADUCCIÓN ───────────────────────────────────────────────");
  empty.forEach((r, i) => {
    console.log(`   ${String(i + 1).padStart(2)}. ${r.book.title}`);
  });

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("     FIN DEL REPORTE");
  console.log("═══════════════════════════════════════════════════════════════════════════════");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
