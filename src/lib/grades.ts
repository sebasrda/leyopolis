
/**
 * Utility to normalize grade names for consistent search and filtering.
 * Maps various synonyms and shorthand to a standard format (e.g., "6to").
 */

const GRADE_MAP: Record<string, string> = {
  "1": "1ro", "1o": "1ro", "1ro": "1ro", "primero": "1ro",
  "2": "2do", "2o": "2do", "2do": "2do", "segundo": "2do",
  "3": "3ro", "3o": "3ro", "3ro": "3ro", "tercero": "3ro",
  "4": "4to", "4o": "4to", "4to": "4to", "cuarto": "4to",
  "5": "5to", "5o": "5to", "5to": "5to", "quinto": "5to",
  "6": "6to", "6o": "6to", "6to": "6to", "sexto": "6to",
  "7": "7mo", "7o": "7mo", "7mo": "7mo", "septimo": "7mo", "séptimo": "7mo",
  "8": "8vo", "8o": "8vo", "8vo": "8vo", "octavo": "8vo",
  "9": "9no", "9o": "9no", "9no": "9no", "noveno": "9no",
  "10": "10mo", "10o": "10mo", "10mo": "10mo", "decimo": "10mo", "décimo": "10mo",
  "11": "11vo", "11o": "11vo", "11vo": "11vo", "once": "11vo"
};

const REVERSE_MAP: Record<string, string[]> = {
  "1ro": ["1ro", "1", "1o", "primero"],
  "2do": ["2do", "2", "2o", "segundo"],
  "3ro": ["3ro", "3", "3o", "tercero"],
  "4to": ["4to", "4", "4o", "cuarto"],
  "5to": ["5to", "5", "5o", "quinto"],
  "6to": ["6to", "6", "6o", "sexto"],
  "7mo": ["7mo", "7", "7o", "septimo", "séptimo"],
  "8vo": ["8vo", "8", "8o", "octavo"],
  "9no": ["9no", "9", "9o", "noveno"],
  "10mo": ["10mo", "10", "10o", "decimo", "décimo"],
  "11vo": ["11vo", "11", "11o", "once"]
};

/**
 * Normalizes a grade input string to its standard short format.
 * Returns the original input if no mapping is found.
 */
export function normalizeGrade(input: string | null | undefined): string {
  if (!input) return "";
  
  const cleanInput = input.toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/grado\s+/i, "");      // Remove "grado " prefix
    
  return GRADE_MAP[cleanInput] || input;
}

/**
 * Returns a list of all known variants for a given grade string.
 * Used for database queries to ensure all formats are caught.
 */
export function getGradeVariants(input: string | null | undefined): string[] {
  const norm = normalizeGrade(input);
  const variants = REVERSE_MAP[norm] || [norm];
  // Add original input just in case
  if (input && !variants.includes(input)) variants.push(input);
  return variants;
}

export const DISPLAY_GRADES = [
  "Todos",
  "Primero",
  "Segundo",
  "Tercero",
  "Cuarto",
  "Quinto",
  "Sexto",
  "Séptimo",
  "Octavo",
  "Noveno",
  "Décimo",
  "Undécimo"
];

export const GRADE_TO_STANDARD: Record<string, string> = {
  "Primero": "1ro",
  "Segundo": "2do",
  "Tercero": "3ro",
  "Cuarto": "4to",
  "Quinto": "5to",
  "Sexto": "6to",
  "Séptimo": "7mo",
  "Octavo": "8vo",
  "Noveno": "9no",
  "Décimo": "10mo",
  "Once": "11vo",
  "Undécimo": "11vo"
};
