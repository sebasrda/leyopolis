import { OpenAI } from "openai";

/**
 * OpenRouter Service
 * Provides access to a wide variety of models via a single API key.
 * Compatible with OpenAI's SDK.
 */
export async function generateWithOpenRouter(prompt: string, apiKey: string, model: string = "google/gemini-2.0-flash-001") {
  if (!apiKey) {
    throw new Error("OpenRouter API key missing");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://leyopolis.vercel.app", // Optional, for OpenRouter tracking
      "X-Title": "Leyopolis AI", // Optional, for OpenRouter tracking
    }
  });

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { 
          role: "system", 
          content: "Actúas como un experto pedagogo que genera contenido educativo en JSON estricto para una plataforma de lectura infantil." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4096 // More room for 20 questions
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("OpenRouter returned empty response");
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error(`[AI-STATS] OpenRouter error (${model}):`, error.message);
    throw error;
  }
}
