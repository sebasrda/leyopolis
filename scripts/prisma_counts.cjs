const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const [users, books, userBooks, readingSessions] = await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      prisma.userBook.count(),
      prisma.readingSession.count(),
    ]);
    console.log({ users, books, userBooks, readingSessions });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

