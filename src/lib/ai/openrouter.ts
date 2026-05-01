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
    const requestBody: any = {
      model: model,
      messages: [
        {
          role: "system",
          content: "Actúas como un experto pedagogo que genera contenido educativo en JSON estricto para una plataforma de lectura infantil."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      // 3500 keeps the request under the free-tier credit threshold on OpenRouter
      // (free Gemini caps around ~3933 tokens). Increase only if you have paid credits.
      max_tokens: 3500
    };

    // OpenRouter / Google Gemini models often do not support json_object via the OpenAI compatibility API
    if (!model.includes("gemini")) {
      requestBody.response_format = { type: "json_object" };
    }

    const response = await client.chat.completions.create(requestBody);

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
