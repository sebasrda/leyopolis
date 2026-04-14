const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const raw = (process.env.GOOGLE_API_KEY || "").trim();
const key = raw.replace(/^["']|["']$/g, '');

console.log(`--- DEBUG INFO ---`);
console.log(`Raw length: ${raw.length}`);
console.log(`Sanitized length: ${key.length}`);
console.log(`Prefix: ${key.substring(0, 10)}`);
console.log(`Suffix: ${key.substring(key.length - 4)}`);
console.log(`------------------`);

const genAI = new GoogleGenerativeAI(key);

async function finalTest() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("hi");
    console.log("✅ RESULT: API KEY IS VALID AND WORKING!");
  } catch (err) {
    console.error(`❌ RESULT: FAILED with message: ${err.message}`);
  }
}

finalTest();
