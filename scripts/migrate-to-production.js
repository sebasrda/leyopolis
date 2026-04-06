
/**
 * Migration Script: Local SQLite -> Vercel Production
 * 
 * Usage:
 * 1. Set PRODUCTION_DATABASE_URL and BLOB_READ_WRITE_TOKEN in your .env
 * 2. Run: node scripts/migrate-to-production.js
 */

require('dotenv').config();
const { PrismaClient: LocalPrisma } = require('@prisma/client');
const { put } = require('@vercel/blob');
const fs = require('fs/promises');
const path = require('path');

// We'll use a separate instance for production if we have the URL
const localPrisma = new LocalPrisma();

async function migrate() {
  console.log("🚀 Iniciando migración de datos locales a producción...");

  if (!process.env.PROD_DATABASE_URL) {
    console.error("❌ Error: PROD_DATABASE_URL no definida en .env");
    process.exit(1);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ Error: BLOB_READ_WRITE_TOKEN no definida en .env");
    process.exit(1);
  }

  const { PrismaClient: RemotePrisma } = require('@prisma/client');
  const remotePrisma = new RemotePrisma({
    datasources: {
      db: {
        url: process.env.PROD_DATABASE_URL,
      },
    },
  });

  try {
    const localBooks = await localPrisma.book.findMany();
    console.log(`📦 Encontrados ${localBooks.length} libros en la base de datos local.`);

    for (const book of localBooks) {
      console.log(`\n📖 Procesando: "${book.title}"...`);

      let finalContentUrl = book.contentUrl;
      let finalCoverUrl = book.coverImage;

      // 1. Migrate PDF to Vercel Blob if it's local
      if (book.contentUrl.startsWith('/books/')) {
        const localPath = path.join(process.cwd(), 'public', book.contentUrl);
        try {
          const fileBuffer = await fs.readFile(localPath);
          const blob = await put(`books/${path.basename(book.contentUrl)}`, fileBuffer, {
            access: 'public',
            addRandomSuffix: true,
          });
          finalContentUrl = blob.url;
          console.log(`   ✅ PDF migrado a Vercel Blob: ${finalContentUrl}`);
        } catch (err) {
          console.error(`   ⚠️ Error al migrar PDF local: ${err.message}`);
        }
      }

      // 2. Migrate Cover to Vercel Blob if it's local
      if (book.coverImage && book.coverImage.startsWith('/books/')) {
        const localPath = path.join(process.cwd(), 'public', book.coverImage);
        try {
          const fileBuffer = await fs.readFile(localPath);
          const blob = await put(`books/${path.basename(book.coverImage)}`, fileBuffer, {
            access: 'public',
            addRandomSuffix: true,
          });
          finalCoverUrl = blob.url;
          console.log(`   ✅ Portada migrada a Vercel Blob: ${finalCoverUrl}`);
        } catch (err) {
          console.error(`   ⚠️ Error al migrar portada local: ${err.message}`);
        }
      }

      // 3. Create record in Production
      try {
        await remotePrisma.book.upsert({
          where: { id: book.id }, // Assuming IDs are stable
          update: {
            contentUrl: finalContentUrl,
            coverImage: finalCoverUrl,
            ageRange: book.ageRange,
            category: book.category,
            difficulty: book.difficulty,
          },
          create: {
            ...book,
            contentUrl: finalContentUrl,
            coverImage: finalCoverUrl,
          },
        });
        console.log(`   ✨ Libro guardado en la base de datos de producción.`);
      } catch (err) {
        console.error(`   ❌ Error al guardar libro en producción: ${err.message}`);
      }
    }

    console.log("\n✅ Migración completada exitosamente.");
  } catch (error) {
    console.error("💥 Error fatal durante la migración:", error);
  } finally {
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
  }
}

migrate();
