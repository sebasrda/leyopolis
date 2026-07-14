// Mergea el JSON curado (book-translations.json) en los 6 locales de i18n.
// Sobreescribe entradas existentes (base es autoritativo).
import fs from "node:fs";
import path from "node:path";

const raw = JSON.parse(fs.readFileSync("scripts/book-translations.json", "utf-8"));

// Aplanar en un unico dict {spanishKey: {lang: value}}
const flat = {};
for (const section of ["titles", "grades", "categories", "subjects", "ui"]) {
  const bucket = raw[section] || {};
  for (const [key, translations] of Object.entries(bucket)) {
    flat[key] = translations;
  }
}

const LANGS = ["en", "fr", "de", "pt", "it", "zh"];
let totalAdded = 0;
let totalUpdated = 0;

for (const lang of LANGS) {
  const filepath = path.join("locales", lang, "translation.json");
  const existing = JSON.parse(fs.readFileSync(filepath, "utf-8"));

  let added = 0, updated = 0;
  for (const [key, translations] of Object.entries(flat)) {
    const newValue = translations[lang];
    if (!newValue) continue;

    if (existing[key] === undefined) {
      added++;
    } else if (existing[key] !== newValue) {
      updated++;
    } else {
      continue;
    }
    existing[key] = newValue;
  }

  // Guardar con indent 2 para mantener el estilo
  fs.writeFileSync(filepath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  console.log(`   ${lang.padEnd(4)} → +${String(added).padStart(3)} nuevas, ~${String(updated).padStart(3)} actualizadas`);
  totalAdded += added;
  totalUpdated += updated;
}

console.log(`\n✔ Total: ${totalAdded} nuevas + ${totalUpdated} actualizadas en ${LANGS.length} idiomas.`);
console.log(`  Fuente: ${Object.keys(flat).length} claves en scripts/book-translations.json`);
