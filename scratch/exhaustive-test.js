const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

async function testEveryModel() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found");
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-pro"
  ];

  for (const name of modelsToTest) {
    try {
      console.log(`Testing model: ${name}...`);
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent("test");
      console.log(`✅ SUCCESS: ${name} works!`);
    } catch (err) {
      console.log(`❌ FAIL: ${name} error: ${err.message}`);
    }
  }
}

testEveryModel();
