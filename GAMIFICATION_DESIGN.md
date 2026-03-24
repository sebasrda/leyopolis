# LEYOPOLIS: Sistema de Gamificación y Juegos Interactivos de Lectura

## 1. Arquitectura del Sistema de Juegos

La arquitectura se basará en un enfoque modular dentro de la aplicación Next.js existente.

*   **Game Engine (Motor de Juego):** Un `React Context` (`GamificationContext`) que maneja el estado global del jugador (XP, Nivel, Racha, Logros) y la lógica de progresión.
*   **Game Registry (Registro de Juegos):** Un objeto de configuración que mapea tipos de juegos a componentes React específicos.
*   **Content Adapter (Adaptador de Contenido):** Una capa que toma el contenido del libro (capítulos, personajes, eventos) y lo transforma en datos jugables (preguntas, pares de memoria, secuencias). *Nota: En una fase avanzada, esto podría ser generado por la IA de Gemini.*
*   **Game Runner (Ejecutor de Juegos):** Un componente contenedor que carga el juego específico, gestiona el temporizador, la puntuación de la sesión y la pantalla de "Fin de Juego".

### Flujo de Datos
1.  **Lectura:** Usuario termina Capítulo X -> Evento `onChapterComplete`.
2.  **Trigger:** El sistema consulta `GameRegistry` para ver qué juegos están disponibles para ese capítulo.
3.  **Acción:** Se muestra un modal o pantalla "¡Desafío de Lectura Disponible!".
4.  **Juego:** Usuario juega. El `GameRunner` reporta el puntaje al `GamificationContext`.
5.  **Recompensa:** `GamificationContext` calcula XP, verifica logros y actualiza el Dashboard.

---

## 2. Tipos de Juegos (Catálogo de 15+ Juegos)

### Categoría A: Comprensión Directa (Memoria y Hechos)

1.  **Quiz de Comprensión (Classic Quiz)**
    *   **Objetivo:** Verificar retención de hechos clave.
    *   **Mecánica:** Pregunta de opción múltiple con 4 respuestas.
    *   **Ejemplo (La Vuelta al Mundo):** "¿Qué apuesta hizo Phileas Fogg?" A) 20k libras B) 10k libras...
    *   **Puntos:** 10pts por acierto.

2.  **Verdadero o Falso (Speed Run)**
    *   **Objetivo:** Validación rápida de hechos.
    *   **Mecánica:** Tarjetas pasan rápido, swipe izquierda (Falso) o derecha (Verdadero).
    *   **Ejemplo (Colmillo Blanco):** "Colmillo Blanco nació en una casa." -> Falso.

3.  **Memoria de Personajes (Memory Match)**
    *   **Objetivo:** Asociar nombres con roles o imágenes.
    *   **Mecánica:** Grilla de cartas volteadas. Encontrar pares (Nombre - Descripción/Imagen).
    *   **Ejemplo (Don Quijote):** Carta "Sancho Panza" <-> Carta "Escudero fiel".

4.  **Trivia de Capítulos (Chapter Sprint)**
    *   **Objetivo:** Repaso específico de un capítulo recién leído.
    *   **Mecánica:** 5 preguntas seguidas contrarreloj.

5.  **Citas del Libro (Who Said It?)**
    *   **Objetivo:** Identificar la voz de los personajes.
    *   **Mecánica:** Se muestra una frase célebre, elegir quién la dijo.
    *   **Ejemplo (El Principito):** "Lo esencial es invisible a los ojos." -> El Zorro.

### Categoría B: Secuencia y Lógica (Análisis)

6.  **Ordenar Eventos (Timeline)**
    *   **Objetivo:** Comprensión de la estructura narrativa.
    *   **Mecánica:** Drag & Drop de 4 eventos para ponerlos en orden cronológico.
    *   **Ejemplo (Caperucita):** 1. Madre da cesta -> 2. Encuentra al lobo -> 3. Lobo se disfraza -> 4. Cazador llega.

7.  **Relacionar Personajes con Acciones (Connector)**
    *   **Objetivo:** Entender la agencia de los personajes.
    *   **Mecánica:** Conectar columna A (Personaje) con columna B (Acción realizada).
    *   **Ejemplo (Harry Potter):** Harry -> Atrapa la Snitch; Hermione -> Levita la pluma.

8.  **Rompecabezas de Escenas (Scene Puzzle)**
    *   **Objetivo:** Reconstrucción visual/narrativa.
    *   **Mecánica:** Una ilustración del libro o un párrafo clave desordenado que hay que reconstruir.

9.  **Mapa de Aventura (Map Tracker)**
    *   **Objetivo:** Geografía narrativa.
    *   **Mecánica:** Pinchar en un mapa dónde ocurrió el evento actual.
    *   **Ejemplo (La Vuelta al Mundo):** "¿Dónde rescataron a Aouda?" -> Pinchar en India.

### Categoría C: Deducción y Vocabulario (Profundidad)

10. **Detective Literario (Clue Hunter)**
    *   **Objetivo:** Inferencia.
    *   **Mecánica:** Se da una "Pista" (ej. un objeto encontrado). Deducir qué significa para la trama.

11. **Completar Frases (Gap Fill)**
    *   **Objetivo:** Vocabulario y contexto (Cloze test).
    *   **Mecánica:** Texto con huecos. Arrastrar palabras al lugar correcto.
    *   **Ejemplo:** "En un lugar de la ___, de cuyo nombre no quiero acordarme..." (Mancha).

12. **Adivinar Personaje (Guess Who)**
    *   **Objetivo:** Identificación por rasgos.
    *   **Mecánica:** Se revelan pistas una a una. Menos pistas usadas = más puntos.
    *   **Pista 1:** "Es alto y flaco". **Pista 2:** "Monta un caballo viejo". -> Don Quijote.

13. **Encuentra el Error (Fact Checker)**
    *   **Objetivo:** Atención al detalle.
    *   **Mecánica:** Se presenta un resumen del capítulo con un dato falso cambiado sutilmente. Tocar el error.

### Categoría D: Pensamiento Crítico (Decisiones)

14. **Decisiones del Protagonista (What Would You Do?)**
    *   **Objetivo:** Empatía y comprensión de motivaciones.
    *   **Mecánica:** Se plantea el dilema del personaje. Elegir qué hizo realmente en el libro vs. qué harías tú.

15. **Escoge el Final (Alternative Endings)**
    *   **Objetivo:** Predicción.
    *   **Mecánica:** (Para mitad del libro) "¿Qué crees que pasará ahora?" Elegir la continuación lógica basada en el tono del libro.

---

## 3. Sistema de Gamificación (The "Loop")

### Economía de Puntos (XP)
*   **Lectura:** 1 minuto de lectura = 10 XP.
*   **Capítulo Completado:** 100 XP base + Bono por longitud.
*   **Juegos:**
    *   Victoria Perfecta (3 estrellas): 150 XP.
    *   Victoria Normal (2 estrellas): 100 XP.
    *   Completado (1 estrella): 50 XP.

### Niveles de Lector
1.  **Novato de Letras** (Nivel 1-5)
2.  **Explorador de Capítulos** (Nivel 6-10)
3.  **Aventurero de Páginas** (Nivel 11-20)
4.  **Maestro de Historias** (Nivel 21-30)
5.  **Guardián de la Biblioteca** (Nivel 30+) -> Desbloquea temas "Oscuros/Dorados" para la app.

### Rachas (Streaks)
*   **Fuego Diario:** Leer al menos 15 minutos al día mantiene la llama encendida.
*   **Bonificadores:** Días consecutivos multiplican la XP (x1.1, x1.2... hasta x2.0).

### Logros (Badges)
*   **"Ratón de Biblioteca":** Leer 5 libros.
*   **"Ojo de Águila":** 100% de aciertos en 5 juegos seguidos.
*   **"Maratonista":** Leer 2 horas en una sesión.
*   **"Políglota":** Usar el traductor en 3 libros diferentes.

---

## 4. Integración con Dashboard

### Interfaz de Usuario
*   **Barra de Progreso (Top Bar):** Muestra Nivel actual, XP para siguiente nivel y Fuego de Racha.
*   **Sección "Misiones Diarias":**
    *   [ ] Lee 1 capítulo.
    *   [ ] Gana un juego de Quiz.
    *   [ ] Aprende 3 palabras nuevas.
*   **Card de "Siguiente Desafío":** En el Dashboard principal, si hay un juego pendiente de un capítulo leído, aparece destacado.

---

## 5. Implementación Técnica (Next Steps)

1.  Crear `GamificationContext.tsx`.
2.  Crear componentes base para los juegos (`QuizGame`, `OrderGame`, `MemoryGame`).
3.  Actualizar `ReaderPage` para disparar el evento de "Juego Disponible" al terminar un capítulo.
4.  Crear la vista de "Perfil Gamificado" en el Dashboard.
