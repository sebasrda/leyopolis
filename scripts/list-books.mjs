import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const books = await prisma.book.findMany({
  select: { id: true, title: true, author: true, coverImage: true, grade: true },
  orderBy: { createdAt: 'asc' }
});
console.log(JSON.stringify(books, null, 2));
await prisma.$disconnect();
