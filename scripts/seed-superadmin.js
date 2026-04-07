
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin1234', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@leyopolis.com' },
    update: {
      role: 'SUPERADMIN',
      name: 'Super Admin Leyopolis',
      password: password
    },
    create: {
      email: 'superadmin@leyopolis.com',
      name: 'Super Admin Leyopolis',
      role: 'SUPERADMIN',
      password: password
    }
  });

  console.log('✅ Super Admin created successfully');
  console.log('Email: superadmin@leyopolis.com');
  console.log('Password: admin1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
