const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
  try {
    await prisma.user.update({
      where: { email: 'sebastianrod336@gmail.com' },
      data: { role: 'SUPERADMIN' }
    });
    console.log('✅ SUPERADMIN RESTORED SUCCESSFULLY');
  } catch (err) {
    console.error('FAIL:', err);
  } finally {
    await prisma.$disconnect();
  }
}

restore();
