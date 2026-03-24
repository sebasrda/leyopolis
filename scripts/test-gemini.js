
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    const apiKey = "AIzaSyD_EKKl5gnFjYsyDt5vTiyCVZ5PC9cRigA";
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("Testing Gemini API with key:", apiKey.substring(0, 10) + "...");

    // Test 1: List Models
    /*
    try {
        console.log("Listing models...");
        // Note: listModels is not directly available on the client instance in some versions, 
        // but let's try to infer if we can connect.
        // Actually, let's just try to generate content with the suspected model.
    } catch (e) {
        console.error("Error listing models:", e.message);
    }
    */

    // Test 2: Generate Content with gemini-2.0-flash
    try {
        console.log("Attempting generation with 'gemini-2.0-flash'...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log("Success! Response:", response.text());
    } catch (e) {
        console.error("Failed with gemini-2.0-flash:", e.message);
    }

    // Test 3: Generate Content with gemini-flash-latest
    try {
        console.log("Attempting generation with 'gemini-flash-latest'...");
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log("Success! Response:", response.text());
    } catch (e) {
        console.error("Failed with gemini-flash-latest:", e.message);
    }
}

testGemini();
