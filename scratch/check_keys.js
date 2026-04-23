const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany();
  console.log('--- System Settings ---');
  settings.forEach(s => {
    const value = s.value ? (s.value.length > 8 ? s.value.slice(0, 4) + '...' + s.value.slice(-4) : '***') : 'EMPTY';
    console.log(`${s.key}: ${value}`);
  });
  console.log('-----------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
