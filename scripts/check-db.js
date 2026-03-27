
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({ take: 5 });
  console.log('Books:', books.length);
  books.forEach(b => console.log(`- ${b.title} by ${b.author}`));

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true }, take: 5 });
  console.log('Users:', users.length);
  users.forEach(u => console.log(`- ${u.email} (${u.role})`));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
