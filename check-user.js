const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const email = 'sebastianrod336@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  console.log("User:", user);
}
check().catch(console.error).finally(() => prisma.$disconnect());
