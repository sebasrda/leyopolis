const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`;
    console.log('Columns in User table:', columns);
  } catch (e) {
    console.error('Error checking schema:', e);
  }
}

checkSchema()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
