const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const titles = ['Hamlet', 'Frankeinstein', 'Gulliver', 'La isla del Tesoro'];
  for (const title of titles) {
    const books = await prisma.book.findMany({
      where: { title: { contains: title, mode: 'insensitive' } },
      select: { title: true, author: true, grade: true, coverImage: true }
    });
    console.log(`Results for ${title}:`, books);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
