const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    select: { title: true, coverImage: true, contentUrl: true }
  });
  console.log(books.filter(b => b.title.toLowerCase().includes('legado')));
}

main().finally(() => prisma.$disconnect());
