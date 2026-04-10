import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "sebastianrod336@gmail.com";
  
  console.log(`Setting ${email} as SUPERADMIN...`);

  // We upsert the user: 
  // If they exist, we just upgrade their role.
  // If they don't, we create an empty record for them. When they login with Google, 
  // NextAuth will link the "User" record and add the "Account" record for Google OAuth.
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "SUPERADMIN",
    },
    create: {
      email,
      name: "Sebastian Admin",
      role: "SUPERADMIN",
      password: null, // No password, they will login with Google
    },
  });

  console.log("Success! Updated user:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
