const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ where: { role: { in: ['ADMIN', 'SUPERADMIN'] } }, select: { id: true, email: true, role: true } })
  .then(u => { u.forEach(x => console.log(`ID: ${x.id} | Email: ${x.email} | Role: ${x.role}`)); p.$disconnect(); });
