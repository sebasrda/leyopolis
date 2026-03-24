
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function findWorkingModel() {
    const apiKey = "AIzaSyD_EKKl5gnFjYsyDt5vTiyCVZ5PC9cRigA";
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("🔍 Scanning for a WORKING Gemini model...");

    let modelsToCheck = [];

    // 1. Fetch available models first
    try {
        // We use the REST API manually to get the list because the SDK helper might differ
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error(`List failed: ${response.status}`);
        const data = await response.json();
        if (data.models) {
            // Filter for generateContent supported models
            modelsToCheck = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .map(m => m.name.replace("models/", ""));
            
            console.log(`📋 Found ${modelsToCheck.length} candidate models from API.`);
        }
    } catch (e) {
        console.error("⚠️ Could not list models via API, using fallback list.", e.message);
        modelsToCheck = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-pro",
            "gemini-1.5-pro-latest",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",
            "gemini-pro",
            "gemini-flash-latest"
        ];
    }

    // 2. Test each one until success
    console.log("🚀 Starting connectivity test...");
    
    for (const modelName of modelsToCheck) {
        process.stdout.write(`Testing [${modelName}] ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Set a timeout to avoid hanging
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
            const generatePromise = model.generateContent("Hi");
            
            const result = await Promise.race([generatePromise, timeoutPromise]);
            const response = await result.response;
            const text = response.text();
            
            if (text) {
                console.log("✅ SUCCESS!");
                console.log(`\n🎉 FOUND WORKING MODEL: "${modelName}"`);
                console.log(`Response: "${text.trim()}"`);
                console.log("\nRECOMMENDATION: Update your API routes to use this model name.");
                return; // Stop after finding the first working one
            }
        } catch (e) {
            console.log(`❌ FAILED (${e.message.split(' ')[0]}...)`);
            // Optional: Log specific 429/404 to debug
            // if (e.message.includes("429")) console.log("   -> Quota Exceeded");
        }
    }

    console.log("\n😓 No working models found in the list.");
}

findWorkingModel();
