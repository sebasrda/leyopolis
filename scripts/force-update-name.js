const { PrismaClient } = require('@prisma/client');
const { config } = require('dotenv');

// We'll try both possible database environment variables
async function runUpdate() {
  console.log('--- Starting Database Update ---');
  
  // Try local first
  config({ path: '.env.local' });
  const localUrl = process.env.DATABASE_URL;
  const prodUrl = process.env.PROD_DATABASE_URL;

  const targets = [
    { name: 'Local/Default', url: localUrl },
    { name: 'Production (Neon)', url: prodUrl }
  ];

  for (const target of targets) {
    if (!target.url) {
      console.log(`Skipping ${target.name}: URL not found in .env.local`);
      continue;
    }

    console.log(`Attempting to update ${target.name}...`);
    
    // We need to bypass the schema provider check if possible, or just ensure the URL format matches.
    // Prisma will use whatever is in DATABASE_URL during client instantiation.
    process.env.DATABASE_URL = target.url;
    
    const prisma = new PrismaClient();
    
    try {
      const user = await prisma.user.update({
        where: { email: 'sebatianrod336@gmail.com' },
        data: { name: 'Ing Sebastian Rodriguez' }
      });
      console.log(`SUCCESS: ${target.name} updated. User name is now: "${user.name}"`);
    } catch (error) {
      // If the email is slightly different (missing s / has s)
      try {
        const user2 = await prisma.user.update({
          where: { email: 'sebastianrod336@gmail.com' },
          data: { name: 'Ing Sebastian Rodriguez' }
        });
        console.log(`SUCCESS: ${target.name} updated (alt email). User name is now: "${user2.name}"`);
      } catch (innerError) {
        console.error(`FAILED: ${target.name} update failed. Error: ${error.message}`);
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

runUpdate();
