/**
 * XEENAPS PKM - GEMINI AI SERVICE V20 (SMART URL ROUTING)
 */

function callGeminiService(prompt, modelOverride) {
  const keys = getKeysFromSheet('ApiKeys', 2); // Column B
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Gemini API keys found in spreadsheet KEYS sheet ApiKeys Col B.' };

  const config = getProviderModel('GEMINI');
  const rawModel = modelOverride || config.model;

  for (let key of keys) {
    try {
      // SMART URL DETECTION
      let url = "";
      if (rawModel.startsWith('http')) {
        // If Column B is a full URL
        const separator = rawModel.indexOf('?') === -1 ? '?' : '&';
        url = `${rawModel}${separator}key=${key}`;
      } else {
        // Fallback for simple model names
        url = `https://generativelanguage.googleapis.com/v1beta/models/${rawModel}:generateContent?key=${key}`;
      }

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      
      const res = UrlFetchApp.fetch(url, { 
        method: "post", 
        contentType: "application/json", 
        payload: JSON.stringify(payload), 
        muteHttpExceptions: true,
        timeoutInSeconds: 120 // Extended for V19/V20 context depth
      });
      
      const responseData = JSON.parse(res.getContentText());
      if (responseData.candidates && responseData.candidates.length > 0) {
        const responseText = responseData.candidates[0].content.parts[0].text;
        return { status: 'success', data: responseText };
      } else if (responseData.error) {
        throw new Error(responseData.error.message || "Gemini API Internal Error");
      }
    } catch (err) {
      console.log("Gemini rotation: " + err.toString());
    }
  }
  return { status: 'error', message: 'Gemini Synthesis Interrupted. Possible causes: Invalid Model URL in AI_CONFIG, expired API Key in KEYS, or context size limit.' };
}
