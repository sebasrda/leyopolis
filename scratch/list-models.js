const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("No API key found");
    return;
  }
  
  console.log("Using API Key starting with:", apiKey.substring(0, 5));
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log("Fetching from v1beta...");
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log("Models found in v1beta:", data.models.map(m => m.name.split('/').pop()));
    } else {
      console.log("No models found in v1beta:", data);
    }
  } catch (err) {
    console.error("v1beta list failed:", err.message);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    console.log("Fetching from v1...");
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log("Models found in v1:", data.models.map(m => m.name.split('/').pop()));
    } else {
      console.log("No models found in v1:", data);
    }
  } catch (err) {
    console.error("v1 list failed:", err.message);
  }
}

listAllModels();
