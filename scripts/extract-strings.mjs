// Extrae los titulos + descripciones + categorias + grados de todos los libros
// para que Claude los traduzca en batch.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const books = await prisma.book.findMany({
  where: { published: true },
  select: {
    id: true,
    title: true,
    author: true,
    description: true,
    category: true,
    grade: true,
    subject: true,
  },
  orderBy: { title: "asc" },
});

console.log(`\nTotal libros publicados: ${books.length}\n`);
console.log("═══ TÍTULOS ═══");
books.forEach((b, i) => console.log(`${String(i + 1).padStart(3)}. ${b.title}`));

console.log("\n═══ DESCRIPCIONES ═══");
books.forEach((b, i) => {
  if (b.description) {
    console.log(`\n--- ${i + 1}. ${b.title} ---`);
    console.log(b.description);
  }
});

console.log("\n═══ CATEGORÍAS ÚNICAS ═══");
const cats = [...new Set(books.map((b) => b.category).filter(Boolean))];
cats.forEach((c) => console.log(`   ${c}`));

console.log("\n═══ MATERIAS ÚNICAS ═══");
const subjects = [...new Set(books.map((b) => b.subject).filter(Boolean))];
subjects.forEach((s) => console.log(`   ${s}`));

console.log("\n═══ GRADOS ÚNICOS ═══");
const grades = [...new Set(books.map((b) => b.grade).filter(Boolean))];
grades.forEach((g) => console.log(`   ${g}`));

// TAMBIÉN volcamos el JSON crudo para poder importarlo desde el script de traducción
const fs = await import("fs");
fs.writeFileSync("scripts/books-raw.json", JSON.stringify(books, null, 2), "utf-8");
console.log("\n[archivo escrito: scripts/books-raw.json]");

await prisma.$disconnect();
