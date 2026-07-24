// Parte job_queue.json en archivos individuales pequenos en disco, uno por
// job, para que cada agente del Workflow pueda leer solo el suyo sin que la
// data bruta tenga que pasar por el contexto del orquestador.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const jobs = JSON.parse(readFileSync('D:/Temp/claude/D--trae-projects-Leyopolis/6c7f12e9-818c-4fbb-bea1-9cb8fa361b10/scratchpad/job_queue.json', 'utf-8'));
const DIR = 'D:/Temp/claude/D--trae-projects-Leyopolis/6c7f12e9-818c-4fbb-bea1-9cb8fa361b10/scratchpad/jobs';
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

jobs.forEach((j, i) => {
  const idx = String(i).padStart(5, '0');
  writeFileSync(`${DIR}/job_${idx}.json`, JSON.stringify({
    jobId: j.jobId, bookId: j.bookId, title: j.title, language: j.language, pageNumbers: j.pageNumbers,
  }));
});

console.log('Wrote', jobs.length, 'job files to', DIR);
