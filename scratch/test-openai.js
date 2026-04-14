const { OpenAI } = require("openai");
require("dotenv").config({ path: ".env.local" });

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("No OpenAI API key found in .env.local");
    return;
  }
  
  const openai = new OpenAI({ apiKey });
  try {
    console.log("Testing OpenAI (gpt-4o-mini)...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello!" }],
      max_tokens: 5
    });
    console.log("OpenAI Response:", completion.choices[0].message.content);
    console.log("OpenAI works!");
  } catch (err) {
    console.error("OpenAI failed:", err.message);
  }
}

testOpenAI();
