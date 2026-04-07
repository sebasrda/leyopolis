const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_USER_ID = 'cmnnz0pg5000013mqhqh4miue';

// Pre-built educational content for known books
const bookContent = {
  'Anaconda': {
    questions: [
      { id: 1, question: '¿Quién es el autor de "Anaconda"?', options: ['Horacio Quiroga', 'Gabriel García Márquez', 'Jorge Luis Borges', 'Julio Cortázar'], correctAnswer: 0 },
      { id: 2, question: '¿Dónde se desarrolla la historia principal?', options: ['En la selva misionera', 'En Buenos Aires', 'En el desierto', 'En la playa'], correctAnswer: 0 },
      { id: 3, question: '¿Qué tipo de animal es Anaconda?', options: ['Una serpiente', 'Un jaguar', 'Un cocodrilo', 'Un águila'], correctAnswer: 0 },
      { id: 4, question: '¿Cuál es el conflicto principal en la historia?', options: ['La lucha entre las serpientes y los humanos', 'Una guerra entre países', 'Un viaje por el mar', 'Una competencia deportiva'], correctAnswer: 0 },
      { id: 5, question: '¿Qué amenaza a las serpientes en el relato?', options: ['El Instituto de Seroterapia', 'Los cazadores furtivos', 'La deforestación', 'Una inundación'], correctAnswer: 0 },
      { id: 6, question: '¿Qué representa Anaconda en la historia?', options: ['La resistencia de la naturaleza', 'La maldad humana', 'El progreso tecnológico', 'La soledad'], correctAnswer: 0 },
      { id: 7, question: '¿Qué tipo de serpiente lidera el congreso?', options: ['La yarará', 'La cobra', 'La pitón', 'La víbora de cascabel'], correctAnswer: 0 },
      { id: 8, question: '¿Qué deciden hacer las serpientes ante la amenaza?', options: ['Organizarse y luchar juntas', 'Huir a otra selva', 'Esconderse bajo tierra', 'Pedir ayuda a otros animales'], correctAnswer: 0 },
      { id: 9, question: '¿Qué género literario predomina en esta obra?', options: ['Cuento naturalista', 'Poesía lírica', 'Novela romántica', 'Teatro del absurdo'], correctAnswer: 0 },
      { id: 10, question: '¿Qué característica tienen los cuentos de Quiroga?', options: ['Ambientación selvática y temas de supervivencia', 'Humor y sátira política', 'Fantasía medieval', 'Ciencia ficción futurista'], correctAnswer: 0 },
    ],
    keywords: ['ANACONDA', 'SERPIENTE', 'SELVA', 'QUIROGA', 'VENENO', 'NATURALEZA', 'YARARÁ', 'CONGRESO', 'SEROTERAPIA', 'MISIONES'],
    memoryPairs: [
      { character: 'Anaconda', description: 'Gran serpiente protagonista' },
      { character: 'Horacio Quiroga', description: 'Autor del cuento' },
      { character: 'La Yarará', description: 'Serpiente venenosa líder' },
      { character: 'La Selva', description: 'Escenario principal' },
      { character: 'Instituto', description: 'Amenaza para las serpientes' },
      { character: 'El Congreso', description: 'Reunión de serpientes' },
    ],
    sentences: [
      { id: 1, sentence: 'Las serpientes descubren la presencia del Instituto de Seroterapia.' },
      { id: 2, sentence: 'Se convoca un congreso de serpientes para decidir qué hacer.' },
      { id: 3, sentence: 'Anaconda observa las actividades del hombre en la selva.' },
      { id: 4, sentence: 'Las serpientes deciden organizarse para defender su territorio.' },
      { id: 5, sentence: 'La naturaleza demuestra su fuerza ante la intervención humana.' },
    ],
  },
  'Frankenstein': {
    questions: [
      { id: 1, question: '¿Quién escribió Frankenstein?', options: ['Mary Shelley', 'Bram Stoker', 'Edgar Allan Poe', 'H.G. Wells'], correctAnswer: 0 },
      { id: 2, question: '¿Cuál es el nombre completo del protagonista científico?', options: ['Victor Frankenstein', 'Henry Frankenstein', 'Albert Frankenstein', 'Friedrich Frankenstein'], correctAnswer: 0 },
      { id: 3, question: '¿Dónde estudió Victor Frankenstein?', options: ['Universidad de Ingolstadt', 'Universidad de Oxford', 'Universidad de París', 'Universidad de Viena'], correctAnswer: 0 },
      { id: 4, question: '¿Cómo se presenta la novela?', options: ['Como cartas del capitán Walton', 'Como un diario personal', 'Como una entrevista', 'Como un informe científico'], correctAnswer: 0 },
      { id: 5, question: '¿Qué busca la criatura de Frankenstein?', options: ['Aceptación y compañía', 'Venganza inmediata', 'Poder absoluto', 'Riqueza material'], correctAnswer: 0 },
      { id: 6, question: '¿Qué le pide la criatura a Victor?', options: ['Que cree una compañera para él', 'Que lo destruya', 'Que le enseñe a leer', 'Que lo lleve a la ciudad'], correctAnswer: 0 },
      { id: 7, question: '¿Dónde termina la persecución final?', options: ['En el Ártico', 'En los Alpes', 'En Londres', 'En un castillo'], correctAnswer: 0 },
      { id: 8, question: '¿A quién mata la criatura en la noche de bodas?', options: ['A Elizabeth', 'A Victor', 'A Henry Clerval', 'A William'], correctAnswer: 0 },
      { id: 9, question: '¿Qué género literario inauguró esta novela?', options: ['La ciencia ficción', 'El terror gótico', 'La novela policial', 'El realismo mágico'], correctAnswer: 0 },
      { id: 10, question: '¿Cuál es el tema central de la novela?', options: ['Los peligros de la ambición científica sin ética', 'El amor romántico', 'La política europea', 'Los viajes por el mundo'], correctAnswer: 0 },
    ],
    keywords: ['FRANKENSTEIN', 'CRIATURA', 'SHELLEY', 'CIENCIA', 'CREACIÓN', 'MONSTRUO', 'VICTOR', 'ÁRTICO', 'INGOLSTADT', 'ELIZABETH'],
    memoryPairs: [
      { character: 'Victor Frankenstein', description: 'Científico creador de la criatura' },
      { character: 'La Criatura', description: 'Ser creado a partir de cadáveres' },
      { character: 'Elizabeth', description: 'Esposa de Victor, asesinada por la criatura' },
      { character: 'Robert Walton', description: 'Capitán explorador que narra la historia' },
      { character: 'Henry Clerval', description: 'Mejor amigo de Victor' },
      { character: 'Mary Shelley', description: 'Autora de la novela' },
    ],
    sentences: [
      { id: 1, sentence: 'Victor Frankenstein estudia ciencias naturales en la universidad.' },
      { id: 2, sentence: 'Victor logra dar vida a una criatura formada con partes de cadáveres.' },
      { id: 3, sentence: 'La criatura es rechazada por la sociedad y busca venganza.' },
      { id: 4, sentence: 'Victor persigue a la criatura hasta el Ártico.' },
      { id: 5, sentence: 'La historia se revela a través de las cartas del capitán Walton.' },
    ],
  },
  'En la Diestra de Dios Padre': {
    questions: [
      { id: 1, question: '¿Quién es el autor de "En la Diestra de Dios Padre"?', options: ['Tomás Carrasquilla', 'Gabriel García Márquez', 'Fernando Vallejo', 'Álvaro Mutis'], correctAnswer: 0 },
      { id: 2, question: '¿Cómo se llama el protagonista?', options: ['Peralta', 'Pedro', 'Pablo', 'Patricio'], correctAnswer: 0 },
      { id: 3, question: '¿Qué característica define al protagonista?', options: ['Su extrema generosidad y bondad', 'Su ambición de poder', 'Su inteligencia superior', 'Su cobardía'], correctAnswer: 0 },
      { id: 4, question: '¿Quién le concede deseos a Peralta?', options: ['Jesús y San Pedro', 'Un hada madrina', 'El diablo', 'Un mago'], correctAnswer: 0 },
      { id: 5, question: '¿Qué tipo de relato es?', options: ['Un cuento costumbrista colombiano', 'Una novela de ciencia ficción', 'Un poema épico', 'Una obra de teatro moderna'], correctAnswer: 0 },
      { id: 6, question: '¿En qué región de Colombia se ambienta?', options: ['Antioquia', 'La costa caribe', 'Los Llanos Orientales', 'El Amazonas'], correctAnswer: 0 },
      { id: 7, question: '¿Qué hace Peralta con los dones que recibe?', options: ['Los usa para ayudar a los demás', 'Los vende', 'Los desperdicia', 'Los esconde'], correctAnswer: 0 },
      { id: 8, question: '¿A quién engaña Peralta con sus poderes?', options: ['Al diablo', 'A Dios', 'A sus vecinos', 'A su familia'], correctAnswer: 0 },
      { id: 9, question: '¿Qué logra Peralta al final?', options: ['Sentarse a la diestra de Dios Padre', 'Convertirse en rey', 'Ser millonario', 'Viajar por el mundo'], correctAnswer: 0 },
      { id: 10, question: '¿Qué valores resalta esta historia?', options: ['La caridad, la astucia y la fe', 'La codicia y el poder', 'La venganza y la justicia', 'La ciencia y la razón'], correctAnswer: 0 },
    ],
    keywords: ['PERALTA', 'CARRASQUILLA', 'ANTIOQUIA', 'BONDAD', 'DIABLO', 'DIOS', 'DESEOS', 'COLOMBIA', 'COSTUMBRISMO', 'GENEROSIDAD'],
    memoryPairs: [
      { character: 'Peralta', description: 'Protagonista bondadoso y astuto' },
      { character: 'Jesús', description: 'Le concede los dones a Peralta' },
      { character: 'San Pedro', description: 'Acompaña a Jesús en la visita' },
      { character: 'El Diablo', description: 'Es engañado por Peralta' },
      { character: 'Tomás Carrasquilla', description: 'Autor del cuento' },
      { character: 'La Muerte', description: 'Personaje que Peralta puede controlar' },
    ],
    sentences: [
      { id: 1, sentence: 'Peralta vive en pobreza pero con gran generosidad.' },
      { id: 2, sentence: 'Jesús y San Pedro visitan a Peralta y le conceden deseos.' },
      { id: 3, sentence: 'Peralta usa sus poderes para ayudar a los pobres.' },
      { id: 4, sentence: 'El diablo intenta llevarse el alma de Peralta.' },
      { id: 5, sentence: 'Peralta logra sentarse a la diestra de Dios Padre.' },
    ],
  },
  'Tom Sawyer': {
    questions: [
      { id: 1, question: '¿Quién escribió Las Aventuras de Tom Sawyer?', options: ['Mark Twain', 'Charles Dickens', 'Jules Verne', 'Robert Louis Stevenson'], correctAnswer: 0 },
      { id: 2, question: '¿Cómo se llama el mejor amigo de Tom?', options: ['Huckleberry Finn', 'Joe Harper', 'Ben Rogers', 'Alfred Temple'], correctAnswer: 0 },
      { id: 3, question: '¿Con quién vive Tom Sawyer?', options: ['Con su tía Polly', 'Con sus padres', 'Con su abuelo', 'Solo'], correctAnswer: 0 },
      { id: 4, question: '¿Qué truco famoso hace Tom con la cerca?', options: ['Convence a otros niños de que pintar es divertido', 'Escapa por debajo de ella', 'La destruye', 'La usa como escondite'], correctAnswer: 0 },
      { id: 5, question: '¿De quién se enamora Tom?', options: ['Becky Thatcher', 'Mary Jane', 'Amy Lawrence', 'Sally Harper'], correctAnswer: 0 },
      { id: 6, question: '¿Qué presencian Tom y Huck en el cementerio?', options: ['Un asesinato', 'Un funeral', 'Una fiesta', 'Un tesoro enterrado'], correctAnswer: 0 },
      { id: 7, question: '¿Quién es el villano principal?', options: ['Indio Joe', 'El sheriff', 'El maestro', 'Muff Potter'], correctAnswer: 0 },
      { id: 8, question: '¿Dónde se pierden Tom y Becky?', options: ['En la cueva de McDougal', 'En el bosque', 'En el río Mississippi', 'En la montaña'], correctAnswer: 0 },
      { id: 9, question: '¿Qué encuentran Tom y Huck al final?', options: ['Un tesoro de oro', 'Un mapa antiguo', 'Una carta secreta', 'Un barco abandonado'], correctAnswer: 0 },
      { id: 10, question: '¿En qué río se desarrolla gran parte de la historia?', options: ['Mississippi', 'Missouri', 'Ohio', 'Hudson'], correctAnswer: 0 },
    ],
    keywords: ['SAWYER', 'TWAIN', 'MISSISSIPPI', 'AVENTURA', 'HUCK', 'BECKY', 'CUEVA', 'TESORO', 'CERCA', 'POLLY'],
    memoryPairs: [
      { character: 'Tom Sawyer', description: 'Niño aventurero protagonista' },
      { character: 'Huckleberry Finn', description: 'Mejor amigo de Tom' },
      { character: 'Becky Thatcher', description: 'Interés amoroso de Tom' },
      { character: 'Tía Polly', description: 'Tutora de Tom' },
      { character: 'Indio Joe', description: 'Villano de la historia' },
      { character: 'Mark Twain', description: 'Autor de la novela' },
    ],
    sentences: [
      { id: 1, sentence: 'Tom es castigado a pintar la cerca por tía Polly.' },
      { id: 2, sentence: 'Tom y Huck presencian un asesinato en el cementerio.' },
      { id: 3, sentence: 'Los chicos huyen a una isla en el Mississippi.' },
      { id: 4, sentence: 'Tom y Becky se pierden en la cueva de McDougal.' },
      { id: 5, sentence: 'Tom y Huck descubren el tesoro de Indio Joe.' },
    ],
  },
};

async function createContentForBook(book) {
  // Find matching content (fuzzy match on title)
  let content = null;
  for (const [key, val] of Object.entries(bookContent)) {
    if (book.title.toLowerCase().includes(key.toLowerCase())) {
      content = val;
      break;
    }
  }

  if (!content) {
    // Generic fallback content
    content = {
      questions: [
        { id: 1, question: `¿Cuál es el título de este libro?`, options: [book.title, 'Otro libro', 'No recuerdo', 'Ninguno'], correctAnswer: 0 },
        { id: 2, question: `¿Quién es el autor?`, options: [book.author || 'Desconocido', 'Otro autor', 'No se menciona', 'Anónimo'], correctAnswer: 0 },
        { id: 3, question: '¿Qué tipo de texto es esta obra?', options: ['Literatura', 'Ciencia', 'Matemáticas', 'Historia'], correctAnswer: 0 },
        { id: 4, question: '¿Cuál es el tema principal del libro?', options: ['La narrativa y sus personajes', 'La geografía mundial', 'Las estadísticas', 'La cocina'], correctAnswer: 0 },
        { id: 5, question: '¿Qué aprendiste de esta lectura?', options: ['Nuevas perspectivas y vocabulario', 'Fórmulas matemáticas', 'Recetas de cocina', 'Datos meteorológicos'], correctAnswer: 0 },
      ],
      keywords: ['LECTURA', 'LIBRO', 'HISTORIA', 'PERSONAJE', 'TRAMA', 'AUTOR', 'NARRADOR', 'CAPÍTULO'],
      memoryPairs: [
        { character: 'Protagonista', description: 'Personaje principal del libro' },
        { character: 'Autor', description: book.author || 'Escritor de la obra' },
        { character: 'Narrador', description: 'Quien cuenta la historia' },
        { character: 'Antagonista', description: 'Personaje que genera conflicto' },
      ],
      sentences: [
        { id: 1, sentence: 'Se presenta al personaje principal y su contexto.' },
        { id: 2, sentence: 'El protagonista enfrenta un conflicto importante.' },
        { id: 3, sentence: 'Se desarrollan eventos que cambian la historia.' },
        { id: 4, sentence: 'El conflicto llega a su punto más alto.' },
        { id: 5, sentence: 'La historia llega a su desenlace final.' },
      ],
    };
  }

  console.log(`\n📚 Creando contenido para: "${book.title}"`);

  // 1. Quiz
  const quiz = await prisma.activity.create({
    data: {
      title: `Quiz: ${book.title}`,
      description: `Examen de comprensión lectora para "${book.title}"`,
      type: 'QUIZ',
      content: JSON.stringify(content),
      points: 100,
      published: true,
      createdById: ADMIN_USER_ID,
      bookId: book.id,
    },
  });
  await prisma.book.update({ where: { id: book.id }, data: { quizId: quiz.id } });
  console.log(`  ✅ Quiz creado y vinculado`);

  // 2. Wordsearch
  await prisma.activity.create({
    data: {
      title: `Sopa de letras: ${book.title}`,
      description: `Encuentra palabras clave de "${book.title}"`,
      type: 'WORDSEARCH',
      content: JSON.stringify({ words: content.keywords.slice(0, 10), gridSize: 12 }),
      points: 50, published: true, createdById: ADMIN_USER_ID, bookId: book.id,
    },
  });
  console.log(`  ✅ Sopa de letras creada`);

  // 3. Memory Match
  await prisma.activity.create({
    data: {
      title: `Memoria: ${book.title}`,
      description: `Relaciona personajes de "${book.title}"`,
      type: 'MATCH',
      content: JSON.stringify({ pairs: content.memoryPairs.map((p, i) => ({ id: i + 1, word: p.character, def: p.description })) }),
      points: 50, published: true, createdById: ADMIN_USER_ID, bookId: book.id,
    },
  });
  console.log(`  ✅ Juego de memoria creado`);

  // 4. Reorder
  await prisma.activity.create({
    data: {
      title: `Ordenar eventos: ${book.title}`,
      description: `Ordena los eventos de "${book.title}"`,
      type: 'REORDER',
      content: JSON.stringify({ sentences: content.sentences }),
      points: 50, published: true, createdById: ADMIN_USER_ID, bookId: book.id,
    },
  });
  console.log(`  ✅ Ordenar eventos creado`);
}

async function main() {
  console.log('🚀 Generando quizzes y juegos para todos los libros...\n');
  
  const books = await prisma.book.findMany({
    where: { quizId: null },
    select: { id: true, title: true, author: true },
  });
  console.log(`📖 Libros sin quiz: ${books.length}`);
  
  for (const book of books) {
    await createContentForBook(book);
  }

  console.log('\n✅ ¡Todos los libros han sido procesados!');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
