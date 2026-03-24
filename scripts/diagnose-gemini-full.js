
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function diagnoseGemini() {
    const apiKey = "AIzaSyD_EKKl5gnFjYsyDt5vTiyCVZ5PC9cRigA";
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("========================================");
    console.log("   GEMINI API DIAGNOSTIC TOOL");
    console.log("========================================");
    console.log("API Key Prefix:", apiKey.substring(0, 10) + "...");

    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash",
        "gemini-pro",
        "gemini-flash-latest"
    ];

    for (const modelName of modelsToTest) {
        console.log(`\n----------------------------------------`);
        console.log(`Testing Model: [${modelName}]`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const startTime = Date.now();
            const result = await model.generateContent("Say 'OK' if you can read this.");
            const response = await result.response;
            const text = response.text();
            const duration = Date.now() - startTime;

            console.log(`STATUS: SUCCESS ✅`);
            console.log(`Latency: ${duration}ms`);
            console.log(`Response: "${text.trim()}"`);
        } catch (e) {
            console.log(`STATUS: FAILED ❌`);
            console.log(`Error Type: ${e.name}`);
            console.log(`Error Message: ${e.message}`);
            
            if (e.message.includes("429")) {
                console.log(">>> DIAGNOSIS: QUOTA EXCEEDED / RATE LIMIT");
            } else if (e.message.includes("404")) {
                console.log(">>> DIAGNOSIS: MODEL NOT FOUND / NOT SUPPORTED");
            } else if (e.message.includes("403")) {
                console.log(">>> DIAGNOSIS: API KEY INVALID OR PERMISSION DENIED");
            }
        }
    }
    console.log("\n========================================");
    console.log("DIAGNOSTIC COMPLETE");
    console.log("========================================");
}

diagnoseGemini();
