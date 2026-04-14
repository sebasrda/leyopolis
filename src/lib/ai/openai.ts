import { OpenAI } from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function generateWithOpenAI(prompt: string, model: string = "gpt-4o-mini") {
  if (!openai) {
    throw new Error("OpenAI configuration missing");
  }

  try {
    const response = await openai.chat.completions.create({
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
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error(`[AI-STATS] OpenAI error (${model}):`, error.message);
    throw error;
  }
}
