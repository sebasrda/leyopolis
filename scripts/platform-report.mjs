// Platform report: counts books by grade, translation coverage, quiz/game presence.
// Run with: node scripts/platform-report.mjs
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("     LEYÓPOLIS — REPORTE DE ESTADO DE LA PLATAFORMA");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1) TOTAL LIBROS PUBLICADOS
  const totalBooks = await prisma.book.count();
  const publishedBooks = await prisma.book.count({ where: { published: true } });
  const unpublishedBooks = totalBooks - publishedBooks;
  console.log("── 1. UNIDADES PEDAGÓGICAS TOTALES ────────────────────────────");
  console.log(`   Total de libros en DB:       ${totalBooks}`);
  console.log(`   Publicados / visibles:       ${publishedBooks}`);
  console.log(`   No publicados (ocultos):     ${unpublishedBooks}\n`);

  // 2) POR GRADO
  console.log("── 2. LIBROS POR GRADO ─────────────────────────────────────────");
  const byGrade = await prisma.book.groupBy({
    by: ["grade"],
    _count: { _all: true },
    where: { published: true },
  });
  const gradeOrder = [
    "TRANSICION", "PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO",
    "SEXTO", "SEPTIMO", "OCTAVO", "NOVENO", "DECIMO", "ONCE",
  ];
  const gradeRows = byGrade
    .map((g) => ({ grade: g.grade || "(sin grado)", count: g._count._all }))
    .sort((a, b) => {
      const ai = gradeOrder.indexOf((a.grade || "").toUpperCase());
      const bi = gradeOrder.indexOf((b.grade || "").toUpperCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  for (const r of gradeRows) {
    console.log(`   ${(r.grade || "").padEnd(20)} ${String(r.count).padStart(4)} libros`);
  }
  console.log();

  // 3) POR MATERIA
  console.log("── 3. LIBROS POR MATERIA ───────────────────────────────────────");
  const bySubject = await prisma.book.groupBy({
    by: ["subject"],
    _count: { _all: true },
    where: { published: true },
  });
  for (const r of bySubject.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`   ${(r.subject || "(sin materia)").padEnd(20)} ${String(r._count._all).padStart(4)} libros`);
  }
  console.log();

  // 4) QUIZZES / JUEGOS
  console.log("── 4. QUIZZES Y ACTIVIDADES ────────────────────────────────────");
  const withQuiz = await prisma.book.count({ where: { published: true, quizId: { not: null } } });
  const withoutQuiz = publishedBooks - withQuiz;
  const totalActivities = await prisma.activity.count();
  const activitiesByType = await prisma.activity.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
  console.log(`   Libros con quiz asignado:    ${withQuiz} / ${publishedBooks} (${Math.round(withQuiz * 100 / publishedBooks)}%)`);
  console.log(`   Libros SIN quiz:             ${withoutQuiz}`);
  console.log(`   Total de actividades en DB:  ${totalActivities}`);
  console.log(`   Por tipo de actividad:`);
  for (const r of activitiesByType.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`      ${(r.type || "(sin tipo)").padEnd(24)} ${String(r._count._all).padStart(4)}`);
  }
  console.log();

  // 5) AUDIO SINCRONIZADO
  console.log("── 5. AUDIO SINCRONIZADO ───────────────────────────────────────");
  const withAudio = await prisma.book.count({ where: { published: true, audioUrl: { not: null } } });
  console.log(`   Libros con audio narrado:    ${withAudio} / ${publishedBooks} (${Math.round(withAudio * 100 / publishedBooks)}%)`);
  console.log();

  // 6) MOTION TRACKING — es feature del LECTOR, no del libro. Se habilita por INSTITUCIÓN.
  console.log("── 6. MOTION TRACKING ──────────────────────────────────────────");
  console.log(`   Motion Tracking es una feature del LECTOR, no de libros`);
  console.log(`   individuales. Cualquier libro con PDF puede usar gestos.`);
  console.log(`   Se habilita/deshabilita por INSTITUCIÓN vía toggle de plan.`);
  const institutionsWithMT = await prisma.institution.count({ where: { motionTrackingEnabled: true } });
  const institutionsWithoutMT = await prisma.institution.count({ where: { motionTrackingEnabled: false } });
  const institutionsWithMG = await prisma.institution.count({ where: { motionGamesEnabled: true } });
  const institutionsWithoutMG = await prisma.institution.count({ where: { motionGamesEnabled: false } });
  console.log(`   Instituciones con Motion Tracking:   ${institutionsWithMT}`);
  console.log(`   Instituciones SIN Motion Tracking:   ${institutionsWithoutMT}`);
  console.log(`   Instituciones con Juegos Gestuales:  ${institutionsWithMG}`);
  console.log(`   Instituciones SIN Juegos Gestuales:  ${institutionsWithoutMG}`);
  console.log();

  // 7) TRADUCCIONES CACHEADAS
  console.log("── 7. COBERTURA DE TRADUCCIONES (caché en DB) ──────────────────");
  const totalTranslations = await prisma.translation.count();
  const translationsByLang = await prisma.translation.groupBy({
    by: ["targetLanguage"],
    _count: { _all: true },
  });
  console.log(`   Total de strings traducidos y cacheados: ${totalTranslations}`);
  console.log(`   Por idioma:`);
  for (const r of translationsByLang.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`      ${(r.targetLanguage || "?").padEnd(6)} ${String(r._count._all).padStart(6)} strings`);
  }
  console.log();
  console.log(`   NOTA: las traducciones son on-demand. Cada string en un libro`);
  console.log(`   se traduce la primera vez que un usuario lo lee en otro idioma`);
  console.log(`   y queda cacheado para todos los siguientes lectores.`);
  console.log();

  // 8) DESCRIPCIONES / SINOPSIS
  console.log("── 8. METADATA DE CATÁLOGO ─────────────────────────────────────");
  const withDescription = await prisma.book.count({ where: { published: true, description: { not: null } } });
  const withCover = await prisma.book.count({ where: { published: true, coverImage: { not: null } } });
  console.log(`   Libros con descripción/sinopsis: ${withDescription} / ${publishedBooks} (${Math.round(withDescription * 100 / publishedBooks)}%)`);
  console.log(`   Libros con portada:              ${withCover} / ${publishedBooks} (${Math.round(withCover * 100 / publishedBooks)}%)`);
  console.log();

  // 9) INSTITUCIONES Y USUARIOS
  console.log("── 9. INSTITUCIONES Y USUARIOS ─────────────────────────────────");
  const totalInstitutions = await prisma.institution.count();
  const activeInstitutions = await prisma.institution.count({ where: { status: "activa" } });
  const trialInstitutions = await prisma.institution.count({ where: { status: "trial" } });
  const totalUsers = await prisma.user.count();
  const usersByRole = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
  console.log(`   Instituciones totales:         ${totalInstitutions}`);
  console.log(`   Instituciones activas:         ${activeInstitutions}`);
  console.log(`   Instituciones en trial:        ${trialInstitutions}`);
  console.log(`   Usuarios totales:              ${totalUsers}`);
  console.log(`   Por rol:`);
  for (const r of usersByRole.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`      ${(r.role || "?").padEnd(15)} ${String(r._count._all).padStart(6)}`);
  }
  console.log();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("     FIN DEL REPORTE");
  console.log("═══════════════════════════════════════════════════════════════");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
