import OpenAI from "openai";

/**
 * Whisper Transcription Service
 * Transcribes audio files with word-level timestamps using OpenAI Whisper.
 * Handles files >25MB by chunking.
 */

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperTranscription {
  text: string;
  words: WhisperWord[];
  duration: number;
  language: string;
}

const MAX_WHISPER_SIZE = 24 * 1024 * 1024; // 24MB (safety margin under 25MB limit)

/**
 * Transcribe audio buffer with word-level timestamps.
 * If the buffer exceeds 24MB, it processes in chunks.
 */
export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  apiKey: string,
  fileName: string = "audio.mp3"
): Promise<WhisperTranscription> {
  if (!apiKey) {
    throw new Error("OpenAI API key is required for Whisper transcription");
  }

  const client = new OpenAI({ apiKey });

  // If file is small enough, transcribe in one go
  if (audioBuffer.length <= MAX_WHISPER_SIZE) {
    return await transcribeChunk(client, audioBuffer, fileName);
  }

  // For larger files, we need to split
  console.log(`[WHISPER] Audio size ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB exceeds limit. Processing in chunks...`);
  
  const chunks = splitBuffer(audioBuffer, MAX_WHISPER_SIZE);
  const allWords: WhisperWord[] = [];
  let fullText = "";
  let totalDuration = 0;
  let detectedLanguage = "es";

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[WHISPER] Processing chunk ${i + 1}/${chunks.length} (${(chunks[i].length / 1024 / 1024).toFixed(1)}MB)`);
    
    try {
      const result = await transcribeChunk(client, chunks[i], `chunk_${i}.mp3`);
      
      // Offset timestamps by the accumulated duration from previous chunks
      const offsetWords = result.words.map(w => ({
        word: w.word,
        start: w.start + totalDuration,
        end: w.end + totalDuration,
      }));

      allWords.push(...offsetWords);
      fullText += (fullText ? " " : "") + result.text;
      totalDuration += result.duration;
      detectedLanguage = result.language;
    } catch (err: any) {
      console.error(`[WHISPER] Chunk ${i + 1} failed:`, err.message);
      // Continue with remaining chunks
    }
  }

  return {
    text: fullText,
    words: allWords,
    duration: totalDuration,
    language: detectedLanguage,
  };
}

/**
 * Transcribe a single audio chunk (must be <=25MB)
 */
async function transcribeChunk(
  client: OpenAI,
  buffer: Buffer,
  fileName: string
): Promise<WhisperTranscription> {
  // Create a File-like object from the buffer (use Uint8Array for TS compatibility)
  const file = new File([new Uint8Array(buffer)], fileName, { type: "audio/mpeg" });

  const response = await client.audio.transcriptions.create({
    model: "whisper-1",
    file: file,
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
    language: "es", // Default to Spanish; Whisper auto-detects if wrong
  });

  // Extract word-level timestamps
  const words: WhisperWord[] = (response as any).words?.map((w: any) => ({
    word: w.word?.trim() || "",
    start: w.start || 0,
    end: w.end || 0,
  })) || [];

  // Calculate duration from the last word or from response
  const duration = (response as any).duration || 
    (words.length > 0 ? words[words.length - 1].end : 0);

  console.log(`[WHISPER] Transcribed ${words.length} words, duration: ${duration.toFixed(1)}s, language: ${(response as any).language || "unknown"}`);

  return {
    text: response.text || "",
    words,
    duration,
    language: (response as any).language || "es",
  };
}

/**
 * Split a buffer into chunks of maxSize bytes.
 * Note: This is a simple byte split. For better audio quality,
 * ideally we'd split at silence boundaries, but this works for Whisper
 * since it handles incomplete sentences gracefully.
 */
function splitBuffer(buffer: Buffer, maxSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const end = Math.min(offset + maxSize, buffer.length);
    chunks.push(buffer.subarray(offset, end));
    offset = end;
  }

  return chunks;
}
