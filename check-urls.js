const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    select: { title: true, coverImage: true, contentUrl: true }
  });
  console.log("Total books:", books.length);
  const vercelBlobs = books.filter(b => b.coverImage && b.coverImage.includes('vercel-storage.com'));
  console.log("Vercel blob covers:", vercelBlobs.length);
  const otherCovers = books.filter(b => b.coverImage && !b.coverImage.includes('vercel-storage.com'));
  console.log("Other covers:", otherCovers.length);
  if (otherCovers.length > 0) {
      console.log("Example other cover:", otherCovers[0].coverImage);
  }
}

main().finally(() => prisma.$disconnect());
