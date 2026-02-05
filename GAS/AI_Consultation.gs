/**
 * XEENAPS PKM - GROQ AI CONSULTATION SERVICE
 * Specialized for Reasoning and Contextual Deep Analysis via Groq Engine.
 * VERSION: 2.1 (Anti-Markdown Regex & Strict HTML)
 */

function handleAiConsultRequest(collectionId, question) {
  return callGroqConsultant(question, collectionId);
}

/**
 * Pembersih Output AI: Menjamin tidak ada simbol Markdown yang lolos ke UI.
 */
function cleanAiOutputToHtml(text) {
  if (!text) return "";
  let clean = text;

  // 1. Tangani Bold Markdown yang bandel: **teks** -> <b>teks</b>
  clean = clean.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  // 2. Hapus semua sisa tanda bintang tunggal (biasanya dipakai bullet point/italics oleh AI)
  clean = clean.replace(/\*/g, "");

  // 3. Hapus simbol Header Markdown (#, ##, dll)
  clean = clean.replace(/^#+\s+/gm, "");

  // 4. Hapus Backticks (`)
  clean = clean.replace(/`/g, "");

  // 5. Konversi Newline menjadi <br/> jika AI lupa menyisipkan tag HTML
  // Gunakan regex untuk menghindari duplikasi jika <br/> sudah ada
  clean = clean.replace(/\n/g, "<br/>");
  
  // 6. Rapikan spasi berlebih
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  return clean;
}

function callGroqConsultant(prompt, collectionId) {
  const keys = getKeysFromSheet('Groq', 2); 
  if (!keys || keys.length === 0) return { status: 'error', message: 'No Groq keys found in database.' };
  
  // 1. GET SOURCE CONTEXT FROM LIBRARY
  let context = "";
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
      let fullText = "";

      if (isLocal) {
        const file = DriveApp.getFileById(extractedId);
        fullText = JSON.parse(file.getBlob().getDataAsString()).fullText;
      } else {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + extractedId);
        fullText = JSON.parse(JSON.parse(remoteRes.getContentText()).content).fullText;
      }
      context = fullText.substring(0, 100000); 
    }
  } catch (e) {
    console.warn("Could not retrieve context: " + e.toString());
  }

  const config = getProviderModel('Groq');
  const model = config.model;

  // 2. CALL GROQ API
  for (let key of keys) {
    try {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const payload = {
        model: model,
        messages: [
          { 
            role: "system", 
            content: "You are the Xeenaps Knowledge Consultant. \n\n" +
                     "STRICT FORMATTING RULES (ZERO TOLERANCE FOR MARKDOWN):\n" +
                     "1. NEVER use symbols like **, *, #, or -. If you use them, the application will crash.\n" +
                     "2. ALWAYS use pure HTML tags for formatting.\n" +
                     "3. Use <b> for key terms, labels, and bolding.\n" +
                     "4. Use <span class='xeenaps-highlight' style='background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px; font-weight: 700;'> for critical insights.\n" +
                     "5. Use <br/> for line breaks and paragraph spacing.\n" +
                     "6. For lists, use format: 1. <b>Point Name</b>:<br/>Description<br/><br/>\n" +
                     "7. Link all answers to the provided [DOCUMENT_CONTEXT].\n\n" +
                     "[DOCUMENT_CONTEXT]: \n" + context 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
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
        const choice = responseData.choices[0].message;
        
        // APPLY REGEX CLEANING TO REMOVE ANY STRAY MARKDOWN
        const cleanedAnswer = cleanAiOutputToHtml(choice.content);
        const cleanedReasoning = choice.reasoning_content ? cleanAiOutputToHtml(choice.reasoning_content) : "";

        return { 
          status: 'success', 
          data: cleanedAnswer,
          reasoning: cleanedReasoning 
        };
      }
    } catch (err) {
      console.log("Groq rotation: key failed, trying next...");
    }
  }
  return { status: 'error', message: 'Groq Consultation Service is currently overloaded.' };
}
