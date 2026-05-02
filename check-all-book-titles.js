const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    select: { id: true, title: true }
  });
  books.forEach(b => console.log(b.title));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
