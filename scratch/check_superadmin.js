const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'sebastianrod336@gmail.com' }
  });
  console.log('User status:', JSON.stringify(user, null, 2));
}

checkUser()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
