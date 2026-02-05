/**
 * XEENAPS PKM - GROQ TRACER AI SERVICE
 * Specialized in contextual quote discovery and academic paraphrasing.
 * Updated to support semantic skimming across the entire document for holistic discovery.
 */

function handleAiTracerQuoteExtraction(payload) {
  const { collectionId, contextQuery } = payload;
  const keys = getKeysFromSheet('Groq', 2);
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Groq keys found.' };

  // 1. GET SOURCE CONTEXT
  let fullText = "";
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    const sheet = ss.getSheetByName("Collections");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const extractedIdx = headers.indexOf('extractedJsonId');
    const nodeIdx = headers.indexOf('storageNodeUrl');
    
    let extractedId, nodeUrl;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === collectionId) {
        extractedId = data[i][extractedIdx];
        nodeUrl = data[i][nodeIdx];
        break;
      }
    }

    if (extractedId) {
      const myUrl = ScriptApp.getService().getUrl();
      const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;
      if (isLocal) {
        fullText = JSON.parse(DriveApp.getFileById(extractedId).getBlob().getDataAsString()).fullText;
      } else {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.includes('?') ? '&' : '?') + "action=getFileContent&fileId=" + extractedId);
        fullText = JSON.parse(JSON.parse(remoteRes.getContentText()).content).fullText;
      }
    }
  } catch (e) {
    return { status: 'error', message: "Document context unavailable." };
  }

  if (!fullText) return { status: 'error', message: "Extracted content empty." };

  // MANDATORY: FULL SCAN UP TO 100,000 CHARS
  const contextSnippet = fullText.substring(0, 100000);

  const prompt = `ACT AS A PRECISION RESEARCH ARCHIVIST.
  YOUR TASK: IDENTIFY THREE (3) DISTINCT EVIDENCE BLOCKS (VERBATIM QUOTES) RELEVANT TO: "${contextQuery}".

  --- SEMANTIC SKIMMING RULES (CRITICAL) ---
  1. SCAN THE ENTIRE DOCUMENT: Do not just pick the first 3 paragraphs. You must scan the Intro, Body, Results, and Conclusion. 
  2. DIVERSITY: Ensure the 3 quotes are geographically distant within the document (e.g., one from Intro, one from Results, one from Conclusion).
  3. CONTEXT RELEVANCE: Prioritize sections that directly explain "${contextQuery}" even if they appear late in the text.
  4. NO MONOTONY: Do not return redundant information. Each quote must provide a unique semantic angle.

  --- OUTPUT FORMAT ---
  1. originalText: Exact word-for-word string from the text.
  2. enhancedText: A sophisticated academic paraphrase (no in-text citations or years).
  
  --- JSON SCHEMA ---
  { "data": [ { "originalText": "...", "enhancedText": "..." }, ... ] }
  
  [DOCUMENT_CONTENT]:
  ${contextSnippet}`;

  const config = getProviderModel('Groq');
  const model = config.model;

  for (let key of keys) {
    try {
      const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + key },
        payload: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "You are a professional academic data extractor. You scan entire documents to find the most relevant contextual evidence. Always respond in raw JSON." },
            { role: "user", content: prompt }
          ],
          temperature: 0.4, // TUNED FOR BETTER EXPLORATION
          response_format: { type: "json_object" }
        }),
        muteHttpExceptions: true
      });
      const responseData = JSON.parse(res.getContentText());
      if (responseData.choices && responseData.choices.length > 0) {
        const rawContent = responseData.choices[0].message.content;
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const dataArray = parsed.data || parsed.quotes || parsed.results || (Array.isArray(parsed) ? parsed : null);
          if (dataArray && Array.isArray(dataArray)) {
            return { status: 'success', data: dataArray };
          }
        }
      }
    } catch (err) { console.log("Groq Tracer rotate..."); }
  }
  return { status: 'error', message: 'Tracer AI Busy.' };
}

function handleAiTracerQuoteEnhancement(payload) {
  const { originalText, citation } = payload;
  const keys = getKeysFromSheet('Groq', 2);
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Groq keys found.' };

  const prompt = `ACT AS AN ELITE ACADEMIC WRITER.
  TASK: Enhance and paraphrase the following verbatim quote into a smooth, scholarly sentence ready for a manuscript.
  
  ORIGINAL: "${originalText}"
  REQUIRED CITATION: ${citation}
  
  --- REQUIREMENTS ---
  - Provide a sophisticated, fluid paraphrase.
  - Integrate the citation naturally (Narrative or Parenthetical).
  - Use academic connectors (e.g., "Furthermore", "As underscored by...").
  - RETURN ONLY THE ENHANCED TEXT STRING. NO JSON. NO CONVERSATION.`;

  const config = getProviderModel('Groq');
  const model = config.model;

  for (let key of keys) {
    try {
      const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + key },
        payload: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7
        }),
        muteHttpExceptions: true
      });
      const responseData = JSON.parse(res.getContentText());
      if (responseData.choices && responseData.choices.length > 0) {
        return { status: 'success', data: responseData.choices[0].message.content.trim() };
      }
    } catch (err) { console.log("Groq Enhancer rotate..."); }
  }
  return { status: 'error', message: 'Enhancer AI Busy.' };
}