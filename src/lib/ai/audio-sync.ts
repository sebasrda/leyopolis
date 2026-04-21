import { WhisperWord } from "./whisper";

/**
 * Audio Sync Service
 * Aligns Whisper transcription words with PDF page text to create a sync map.
 */

export interface SyncWord {
  word: string;
  start: number;
  end: number;
}

export interface SyncPage {
  pageNum: number;
  startTime: number;
  endTime: number;
  words: SyncWord[];
}

export interface AudioSyncMap {
  totalDuration: number;
  language: string;
  pages: SyncPage[];
}

/**
 * Normalize text for comparison: lowercase, remove punctuation, collapse whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, "") // Keep accented chars
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize a single word for comparison
 */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^\wáéíóúüñ]/gi, "")
    .trim();
}

/**
 * Calculate similarity between two strings (Levenshtein-based, 0-1 scale)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Simple Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[a.length][b.length];
  return 1 - distance / maxLen;
}

/**
 * Extract words from a page's text content
 */
function extractPageWords(pageText: string): string[] {
  return pageText
    .split(/\s+/)
    .map(w => normalizeWord(w))
    .filter(w => w.length > 0);
}

/**
 * Align Whisper transcription words with PDF page texts.
 * 
 * Algorithm:
 * 1. Extract word lists from each PDF page
 * 2. Walk through Whisper words sequentially
 * 3. For each page, try to match a window of Whisper words against page words
 * 4. Use fuzzy matching to handle OCR/transcription differences
 * 5. Assign timestamps to page boundaries
 */
export function alignTranscriptionWithPages(
  whisperWords: WhisperWord[],
  pageTexts: string[], // Array of text content per page (1-indexed internally)
  totalDuration: number,
  language: string = "es"
): AudioSyncMap {
  if (!whisperWords.length || !pageTexts.length) {
    console.warn("[AUDIO-SYNC] Empty transcription or pages, returning empty sync map");
    return { totalDuration, language, pages: [] };
  }

  // Normalize all whisper words
  const normalizedWhisperWords = whisperWords.map(w => ({
    ...w,
    normalized: normalizeWord(w.word),
  }));

  // Extract word arrays for each page
  const pagesWordArrays = pageTexts.map(text => extractPageWords(text));

  const syncPages: SyncPage[] = [];
  let whisperCursor = 0; // Current position in whisper words

  for (let pageIdx = 0; pageIdx < pagesWordArrays.length; pageIdx++) {
    const pageWords = pagesWordArrays[pageIdx];
    const pageNum = pageIdx + 1;

    if (pageWords.length === 0) {
      // Empty page (likely an image-only page) — skip
      continue;
    }

    // Find how many whisper words match this page
    const matchResult = findPageBoundary(
      normalizedWhisperWords,
      whisperCursor,
      pageWords
    );

    if (matchResult.matchedCount > 0) {
      const startIdx = whisperCursor;
      const endIdx = whisperCursor + matchResult.matchedCount - 1;

      const pageWhisperWords: SyncWord[] = [];
      for (let i = startIdx; i <= endIdx && i < whisperWords.length; i++) {
        pageWhisperWords.push({
          word: whisperWords[i].word,
          start: whisperWords[i].start,
          end: whisperWords[i].end,
        });
      }

      const startTime = whisperWords[startIdx]?.start || 0;
      const endTime = whisperWords[endIdx]?.end || startTime;

      syncPages.push({
        pageNum,
        startTime,
        endTime,
        words: pageWhisperWords,
      });

      whisperCursor += matchResult.matchedCount;
    } else {
      // No match found — this page might not have corresponding audio
      // Still create an entry with estimated times for navigation
      const prevPage = syncPages[syncPages.length - 1];
      const estimatedStart = prevPage ? prevPage.endTime : 0;

      syncPages.push({
        pageNum,
        startTime: estimatedStart,
        endTime: estimatedStart,
        words: [],
      });
    }
  }

  // Assign any remaining whisper words to the last page
  if (whisperCursor < whisperWords.length && syncPages.length > 0) {
    const lastPage = syncPages[syncPages.length - 1];
    for (let i = whisperCursor; i < whisperWords.length; i++) {
      lastPage.words.push({
        word: whisperWords[i].word,
        start: whisperWords[i].start,
        end: whisperWords[i].end,
      });
    }
    lastPage.endTime = whisperWords[whisperWords.length - 1].end;
  }

  console.log(`[AUDIO-SYNC] Aligned ${whisperWords.length} words across ${syncPages.length} pages`);

  return {
    totalDuration,
    language,
    pages: syncPages,
  };
}

/**
 * Find how many whisper words (starting from cursor) belong to the given page.
 * Uses a greedy matching approach with fuzzy word comparison.
 */
function findPageBoundary(
  whisperWords: Array<WhisperWord & { normalized: string }>,
  startCursor: number,
  pageWords: string[]
): { matchedCount: number; confidence: number } {
  if (pageWords.length === 0 || startCursor >= whisperWords.length) {
    return { matchedCount: 0, confidence: 0 };
  }

  const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity to consider a match
  let pageWordIdx = 0;
  let whisperIdx = startCursor;
  let matchedCount = 0;
  let matchedWords = 0;
  let skippedWhisper = 0;
  const MAX_SKIP = 3; // Maximum consecutive non-matching whisper words before we stop

  while (pageWordIdx < pageWords.length && whisperIdx < whisperWords.length) {
    const pWord = pageWords[pageWordIdx];
    const wWord = whisperWords[whisperIdx].normalized;

    const sim = similarity(pWord, wWord);

    if (sim >= SIMILARITY_THRESHOLD) {
      // Match found
      matchedWords++;
      matchedCount = whisperIdx - startCursor + 1;
      pageWordIdx++;
      whisperIdx++;
      skippedWhisper = 0;
    } else {
      // Try skipping the whisper word (narrator might say extra words)
      skippedWhisper++;
      if (skippedWhisper > MAX_SKIP) {
        // Too many non-matching words — try skipping the page word instead
        pageWordIdx++;
        skippedWhisper = 0;
      } else {
        whisperIdx++;
        matchedCount = whisperIdx - startCursor;
      }
    }
  }

  // If we matched very few words relative to page content, consider it a non-match
  const confidence = pageWords.length > 0 ? matchedWords / pageWords.length : 0;
  
  if (confidence < 0.15) {
    // Less than 15% of page words matched — likely not the right segment
    return { matchedCount: 0, confidence: 0 };
  }

  return { matchedCount, confidence };
}
