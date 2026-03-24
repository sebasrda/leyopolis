# LEYOPOLIS: Plan Maestro de Evolución a Plataforma Educativa de Clase Mundial

Este documento detalla la hoja de ruta técnica y funcional para transformar LEYOPOLIS en un ecosistema educativo superior a los LMS tradicionales, centrado en la experiencia de lectura gamificada.

---

## 1. Análisis y Estrategia Central

**Estado Actual:** Plataforma avanzada con Gamificación, LMS para Profesores y Analíticas.
**Meta:** Convertirse en un "Netflix Educativo + LMS Gamificado".
**Diferenciador Clave:** La integración fluida entre lectura, juego y evaluación sin salir del contexto del libro.

---

## 2. Estado del Desarrollo (Actualizado)

### ✅ A. Dashboard & Gamificación (COMPLETADO)
*   **Engine:** `GamificationContext` implementado para XP, Niveles y Rachas.
*   **Integración:** Barra de estado global en el header.
*   **Game Hub:** Centro de juegos educativos (`/dashboard/learning`) con Quiz y Memoria.

### ✅ B. Biblioteca Inteligente (COMPLETADO)
*   **Filtros Avanzados:** Categoría, Edad, Dificultad.
*   **Recomendaciones:** Carrusel de "Recomendado para ti" basado en IA.
*   **UI:** Interfaz moderna con `shadcn/ui`.

### ✅ C. Mis Lecturas (COMPLETADO)
*   **Historial:** Timeline visual de libros leídos.
*   **Banco de Vocabulario:** Tarjetas de palabras guardadas con definiciones y contexto.
*   **Marcadores:** Gestión de notas y subrayados.

### ✅ D. Comunidad (COMPLETADO)
*   **Clubes de Lectura:** Grupos temáticos con seguimiento de libros actuales.
*   **Foro:** Discusiones por capítulo y temas generales.
*   **Eventos:** Calendario de actividades en vivo.

### ✅ E. Progreso & Analíticas (COMPLETADO)
*   **Radar Chart:** Visualización de habilidades (Comprensión, Vocabulario, Velocidad).
*   **Heatmap:** Gráfico de actividad diaria (estilo GitHub).
*   **Metas:** Seguimiento de objetivos personales.

### ✅ F. LMS Profesor (PROTOTIPO COMPLETADO)
*   **Gestión de Clases:** Vista de aulas y estudiantes.
*   **Asignaciones:** Creación de tareas y lecturas obligatorias.
*   **Monitor:** Seguimiento del progreso de los alumnos.

### ✅ G. Sistema de Lectura (Reader 2.0) (COMPLETADO)
*   **Selección Inteligente:** Menú flotante al seleccionar texto.
*   **Diccionario AI:** Integración con Tutor IA para definiciones contextuales.
*   **Notas y Vocabulario:** Guardado persistente (Local Storage) de palabras y notas.

### ✅ H. Expansión de Juegos (COMPLETADO)
*   **Ordena la Frase:** Juego de sintaxis y comprensión.
*   **Sopa de Letras:** Juego de vocabulario generado proceduralmente.
*   **Integración:** Disponible en Game Hub y Modal de Lectura.

---

## 3. Próximos Pasos (Fase de Refinamiento)

Aunque la estructura principal está completa, las siguientes áreas requieren integración profunda:

1.  **Conexión Backend Real:**
    *   Conectar los componentes de UI con la base de datos real (Prisma/PostgreSQL).
    *   Reemplazar los datos mock (`mockData`) con llamadas a la API.

2.  **Rol de Profesor Avanzado:**
    *   Reportes detallados exportables (PDF/Excel).
    *   Herramienta de creación de Quizzes asistida por IA.

---

## 4. Arquitectura Técnica

*   **Frontend:** Next.js 14 (App Router), Tailwind CSS, Shadcn UI, Framer Motion, Recharts.
*   **State:** React Context (Gamification).
*   **AI:** Google Gemini 2.5 Flash (con fallback a 1.5 Pro).
*   **Database:** Prisma (PostgreSQL).
