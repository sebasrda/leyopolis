
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = "AIzaSyD_EKKl5gnFjYsyDt5vTiyCVZ5PC9cRigA";
    
    // Manual fetch to list models since the SDK client helper might not be straightforward
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("Available Models:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}

listModels();
