const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const activities = await p.activity.findMany({
    select: { id: true, title: true, bookId: true, type: true }
  });
  console.log('All Activities:', JSON.stringify(activities, null, 2));
  console.log('Total:', activities.length);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
