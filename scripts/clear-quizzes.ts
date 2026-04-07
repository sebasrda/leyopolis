import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.book.updateMany({
    data: {
      quizId: null
    }
  });
  console.log("Cleared quizId from all books!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
