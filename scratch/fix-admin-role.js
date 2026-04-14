const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndElevate() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'sebastian' } },
          { name: { contains: 'Sebastian' } }
        ]
      }
    });

    console.log('Resultados de búsqueda:', users.map(u => ({ email: u.email, role: u.role })));

    if (users.length > 0) {
      for (const u of users) {
        if (u.role !== 'ADMIN') {
          console.log(`Elevando a ${u.email} a ADMIN...`);
          await prisma.user.update({
            where: { id: u.id },
            data: { role: 'ADMIN' }
          });
          console.log('✅ Éxito.');
        } else {
          console.log(`${u.email} ya es ADMIN.`);
        }
      }
    } else {
      console.log('No se encontró al usuario Sebastian.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndElevate();
