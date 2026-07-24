import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const book = await prisma.book.findFirst({
    where: { title: { contains: "Bruno el Oso Tímido" } }
  });
  
  if (!book) return console.log("not found");
  
  const translations = await (prisma as any).bookPageTranslation.findMany({
    where: { bookId: book.id },
    select: { language: true, pageNumber: true },
    orderBy: { pageNumber: 'asc' }
  });

  const byLang = new Map<string, number[]>();
  for (const t of translations) {
    if (!byLang.has(t.language)) byLang.set(t.language, []);
    byLang.get(t.language)!.push(t.pageNumber);
  }

  for (const [lang, pages] of byLang.entries()) {
    console.log(`Lang: ${lang}, Pages (${pages.length}):`, pages.join(', '));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
