const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("No API key found in environment");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There is no direct genAI.listModels() in the modern library, 
    // we have to use the REST API or try a generic model.
    console.log("Testing gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("gemini-1.5-flash works!");
  } catch (err) {
    console.error("gemini-1.5-flash failed:", err.message);
  }

  try {
    console.log("Testing gemini-1.5-pro...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("test");
    console.log("gemini-1.5-pro works!");
  } catch (err) {
    console.error("gemini-1.5-pro failed:", err.message);
  }
}

listModels();
