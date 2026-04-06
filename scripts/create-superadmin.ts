import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("leyopolis123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@leyopolis.com" },
    update: {
      role: "SUPERADMIN",
      password: hashedPassword,
    },
    create: {
      email: "superadmin@leyopolis.com",
      name: "Súper Admin Leyópolis",
      password: hashedPassword,
      role: "SUPERADMIN",
    },
  });

  console.log("SuperAdmin account guaranteed:", superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
