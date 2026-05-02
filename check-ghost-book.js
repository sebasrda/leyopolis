const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    where: { title: { contains: 'Visitante' } }
  });
  console.log('Found books:', books);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
