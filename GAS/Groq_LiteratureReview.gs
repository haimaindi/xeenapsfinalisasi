
/**
 * XEENAPS PKM - GROQ LITERATURE REVIEW SERVICE
 * Specialized in matrix extraction (35k char limit) and academic synthesis.
 */

function handleAiReviewRequest(subAction, payload) {
  if (subAction === 'extract') {
    return callGroqReviewExtractor(payload.collectionId, payload.centralQuestion);
  } else if (subAction === 'synthesize') {
    return callGroqNarrativeSynthesizer(payload.matrix, payload.centralQuestion);
  }
  return { status: 'error', message: 'Invalid subAction' };
}

/**
 * Matrix Extraction: Membedah 1 dokumen untuk menjawab pertanyaan utama.
 * Karakter dibatasi 35.000 sesuai instruksi.
 */
function callGroqReviewExtractor(collectionId, centralQuestion) {
  const keys = getKeysFromSheet('Groq', 2); 
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Groq keys found.' };

  // 1. GET SOURCE CONTEXT FROM LIBRARY
  let context = "";
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    const sheet = ss.getSheetByName("Collections");
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf('id');
    const extractedIdx = data[0].indexOf('extractedJsonId');
    const nodeIdx = data[0].indexOf('storageNodeUrl');
    
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
      let fullText = "";

      if (isLocal) {
        const file = DriveApp.getFileById(extractedId);
        fullText = JSON.parse(file.getBlob().getDataAsString()).fullText;
      } else {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + extractedId);
        fullText = JSON.parse(JSON.parse(remoteRes.getContentText()).content).fullText;
      }
      // MANDATORY LIMIT: 35.000 characters
      context = fullText.substring(0, 35000); 
    }
  } catch (e) {
    return { status: 'error', message: "Context retrieval failed: " + e.toString() };
  }

  const config = getProviderModel('Groq');
  const model = config.model;

  const prompt = `ACT AS A SENIOR SCIENTIFIC ANALYST.
  I am conducting a deep Literature Review on this specific question: "${centralQuestion}".
  
  TASK: Perform a COMPREHENSIVE AND HOLISTIC extraction that directly answers the question based on the source text.
  
  --- MANDATORY REQUIREMENTS ---
  1. ANSWER: Provide an EXTREMELY DETAILED SINGLE-PARAGRAPH analysis. This paragraph must be holistic, covering factual findings, methodology used, and technical nuances relevant to the question.
  2. NO LISTS: Strictly DO NOT use bullet points, numbered lists, or multiple paragraphs in the "answer" field. Everything must be in one dense, cohesive academic paragraph.
  3. RELEVANCE: Ignore any part of the text that does not help in answering "${centralQuestion}".
  4. VERBATIM: Extract exactly one impactful sentence as a direct quote.
  
  --- RULES ---
  - IF DATA NOT FOUND, return "This source does not explicitly address the central question."
  - RESPONSE MUST BE RAW JSON.
  - USE PLAIN STRING TEXT.
  
  TEXT TO ANALYZE:
  ${context}

  EXPECTED JSON:
  {
    "answer": "Holistic technical single-paragraph answering the central question...",
    "verbatim": "..."
  }`;

  for (let key of keys) {
    try {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const payload = {
        model: model,
        messages: [
          { role: "system", content: "You are an expert scientific data extractor. You provide holistic, technical, and highly informative academic answers in a single dense paragraph without lists." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
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
        return { status: 'success', data: JSON.parse(responseData.choices[0].message.content) };
      }
    } catch (err) {
      console.log("Groq Review rotation failed, trying next...");
    }
  }
  return { status: 'error', message: 'Extraction engine busy.' };
}

/**
 * Narrative Synthesis: Merajut seluruh baris matrix menjadi narasi akademik.
 * Versi Hardened: Larangan total terhadap Markdown dash/bintang.
 */
function callGroqNarrativeSynthesizer(matrix, centralQuestion) {
  const keys = getKeysFromSheet('Groq', 2);
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Groq keys found.' };

  const matrixSummary = matrix.map((m, i) => `SOURCE ${i+1} (${m.title}): ${m.answer}`).join('\n\n');

  const prompt = `ACT AS A DISTINGUISHED ACADEMIC PROFESSOR.
  TASK: Synthesize a VERY COMPREHENSIVE Literature Review narrative for: "${centralQuestion}".
  
  DATA INPUT (Matrix of findings from various literatures):
  ${matrixSummary}

  --- NARRATIVE REQUIREMENTS ---
  - Write a cohesive and high-level academic synthesis that directly addresses the central question.
  - STRUCTURE:
    1. Use <p> tags for analytical paragraphs.
    2. Use <ol> and <li> tags (NUMBERED LISTS) to highlight core technical pillars.
    3. Use <b> tags for emphasis on critical concepts.
  - STRICT FORMATTING RULES: 
    * RETURN VALID HTML STRUCTURE ONLY. 
    * STRICTLY DO NOT use Markdown symbols like "-", "*", or "#".
    * DO NOT use dashes (-) for bullet points; use <ol> and <li> instead.
  - COMPLEXITY: The synthesis must be very comprehensive, discussing agreements and contradictions between sources.
  
  LANGUAGE: ENGLISH.`;

  const config = getProviderModel('Groq');
  const model = config.model;

  for (let key of keys) {
    try {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const payload = {
        model: model,
        messages: [
          { role: "system", content: "You are a professional academic writer. Provide a comprehensive synthesized narrative using valid HTML structure. Do not use markdown bullet points." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
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
        return { status: 'success', data: responseData.choices[0].message.content.trim() };
      }
    } catch (err) {
      console.log("Groq Synthesizer rotation failed, trying next...");
    }
  }
  return { status: 'error', message: 'Synthesis engine busy.' };
}
