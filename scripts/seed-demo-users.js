
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const demoUsers = [
  {
    name: 'Gustavo Estudiante',
    email: 'gustavo.estudiante@demo.com',
    role: 'STUDENT',
    image: 'https://ui-avatars.com/api/?name=Gustavo+Estudiante&background=4F46E5&color=fff',
  },
  {
    name: 'Gustavo Profesor',
    email: 'gustavo.profesor@demo.com',
    role: 'TEACHER',
    image: 'https://ui-avatars.com/api/?name=Gustavo+Profesor&background=059669&color=fff',
  },
  {
    name: 'Gustavo Coordinador',
    email: 'gustavo.coordinador@demo.com',
    role: 'COORDINATOR',
    image: 'https://ui-avatars.com/api/?name=Gustavo+Coordinador&background=D97706&color=fff',
  },
];

async function main() {
  const password = 'demo1234';
  const hashedPassword = await bcrypt.hash(password, 10);

  for (const user of demoUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existing) {
      console.log(`Creating ${user.role} user: ${user.email}`);
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          image: user.image,
        },
      });
      console.log(`  ✅ Created successfully`);
    } else {
      console.log(`User ${user.email} already exists. Updating...`);
      await prisma.user.update({
        where: { email: user.email },
        data: {
          password: hashedPassword,
          role: user.role,
          name: user.name,
          image: user.image,
        },
      });
      console.log(`  ✅ Updated successfully`);
    }
  }

  console.log('\n--- Demo Users Summary ---');
  console.log('Password for all: demo1234');
  for (const u of demoUsers) {
    console.log(`  ${u.role.padEnd(12)} → ${u.email}`);
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
