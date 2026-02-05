/**
 * XEENAPS PKM - GROQ AI CV GENERATOR SERVICE
 * Khusus untuk narasi Professional Statement (Teks Bersih)
 */

function callGroqCVGen(prompt, modelOverride) {
  const keys = getKeysFromSheet('Groq', 2);
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Groq keys found.' };
  
  const config = getProviderModel('groq');
  const model = modelOverride || config.model;

  for (let key of keys) {
    try {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const payload = { 
        model: model, 
        messages: [
          { role: "system", content: "You are a professional CV Branding Architect. Your task is to write high-impact professional statements. Provide only the text narration requested, without any JSON structure, quotes, or conversational filler." }, 
          { role: "user", content: prompt }
        ], 
        temperature: 0.7
      };
      
      const res = UrlFetchApp.fetch(url, { 
        method: "post", 
        contentType: "application/json", 
        headers: { "Authorization": "Bearer " + key }, 
        payload: JSON.stringify(payload), 
        muteHttpExceptions: true 
      });
      
      const responseData = JSON.parse(res.getContentText());
      if (responseData.choices && responseData.choices.length > 0) {
        const responseText = responseData.choices[0].message.content;
        return { status: 'success', data: responseText.trim() };
      }
    } catch (err) {
      console.log("Groq CV rotation: key failed, trying next...");
    }
  }
  return { status: 'error', message: 'CV AI service is currently busy.' };
}