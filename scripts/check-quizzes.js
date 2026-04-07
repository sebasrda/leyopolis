const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const books = await p.book.findMany({
    select: { id: true, title: true, quizId: true }
  });
  console.log(JSON.stringify(books, null, 2));
  
  const activities = await p.activity.findMany({
    where: { type: 'QUIZ' },
    select: { id: true, title: true, bookId: true, type: true }
  });
  console.log('\n--- QUIZ Activities ---');
  console.log(JSON.stringify(activities, null, 2));
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
