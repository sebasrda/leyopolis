
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@leyopolis.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingAdmin) {
    console.log('Creating admin user...');
    await prisma.user.create({
      data: {
        name: 'Administrador Principal',
        email,
        password: hashedPassword,
        role: 'ADMIN',
        image: 'https://ui-avatars.com/api/?name=Admin+Principal&background=random'
      },
    });
    console.log('Admin user created successfully.');
  } else {
    console.log('Admin user already exists. Updating password/role just in case...');
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Administrador Principal'
      }
    });
    console.log('Admin user updated.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
