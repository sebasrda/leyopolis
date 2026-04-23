import { OpenAI } from "openai";

export async function generateWithOpenAI(prompt: string, model: string = "gpt-4o-mini", externalApiKey?: string) {
  const key = externalApiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OpenAI configuration missing");
  }

  const client = new OpenAI({ apiKey: key });

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "Actúas como un experto pedagogo que genera contenido educativo en JSON estricto." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("OpenAI returned empty response");
    
    try {
      // Clean content from potential markdown markers
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanContent = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[AI-INTEL] OpenAI returned non-JSON content:", content.slice(0, 200));
      throw new Error(`OpenAI no devolvió un formato válido (JSON). Respuesta: ${content.slice(0, 50)}...`);
    }
  } catch (error: any) {
    console.error(`[AI-STATS] OpenAI error (${model}):`, error.message);
    throw error;
  }
}
