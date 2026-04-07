const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const key = 'AIzaSyD_EKKl5gnFjYsyDt5vTiyCVZ5PC9cRigA';
  console.log('Testing Gemini API with key:', key.substring(0, 10) + '...');
  
  const genAI = new GoogleGenerativeAI(key);
  
  // Try different models
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro'];
  
  for (const modelName of models) {
    try {
      console.log(`\nTrying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Di "hola" en una palabra');
      console.log(`  ✅ ${modelName}: ${result.response.text().trim()}`);
      return modelName; // Return first working model
    } catch (err) {
      console.log(`  ❌ ${modelName}: ${err.message.substring(0, 100)}`);
    }
  }
}

test().catch(console.error);
