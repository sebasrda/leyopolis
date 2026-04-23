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
    
    try {
      // Clean content from potential markdown markers
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanContent = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[AI-INTEL] OpenRouter returned non-JSON content:", content.slice(0, 200));
      throw new Error(`OpenRouter no devolvió un formato válido (JSON). Respuesta: ${content.slice(0, 50)}...`);
    }
  } catch (error: any) {
    console.error(`[AI-STATS] OpenRouter error (${model}):`, error.message);
    throw error;
  }
}
