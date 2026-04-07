const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyD_EKKl5gnFjYsyDt5vTiyCVZ5PC9cRigA';
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(res => res.json())
  .then(data => {
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log('Error:', data);
    }
  })
  .catch(console.error);
