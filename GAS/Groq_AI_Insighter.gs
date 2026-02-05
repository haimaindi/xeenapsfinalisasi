
/**
 * XEENAPS PKM - AI INSIGHTER SERVICE (GROQ POWERED)
 * Specialized in deep content analysis, IMRaD+C summary, and terminology explanation.
 */

function handleGenerateInsight(item) {
  try {
    const extractedId = item.extractedJsonId;
    if (!extractedId) return { status: 'error', message: 'No extracted data found to analyze.' };

    const nodeUrl = item.storageNodeUrl;
    const currentWebAppUrl = ScriptApp.getService().getUrl();
    const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === currentWebAppUrl;

    let fullText = "";

    if (isLocal) {
      const file = DriveApp.getFileById(extractedId);
      const contentStr = file.getBlob().getDataAsString();
      const content = JSON.parse(contentStr);
      fullText = content.fullText || "";
    } else {
      try {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + extractedId, { 
          muteHttpExceptions: true 
        });
        const resJson = JSON.parse(remoteRes.getContentText());
        if (resJson.status === 'success') {
          const content = JSON.parse(resJson.content);
          fullText = content.content ? JSON.parse(resJson.content).fullText : (content.fullText || "");
        } else {
          throw new Error(resJson.message || "Failed to fetch remote content");
        }
      } catch (remoteErr) {
        return { status: 'error', message: 'Remote Node Access Failed: ' + remoteErr.toString() };
      }
    }

    if (!fullText || fullText.length < 50) {
      return { status: 'error', message: 'Extracted content is too short for analysis.' };
    }

    // MANDATORY: Upgraded Context to 100,000 characters
    const contextText = fullText.substring(0, 100000);

    const prompt = `ACT AS A SENIOR ARCHITECTURAL RESEARCH ANALYST (XEENAPS AI INSIGHTER).
    ANALYZE THE FOLLOWING TEXT FROM A PKM ITEM TITLED "${item.title}".
    RESPONSE LANGUAGE: ENGLISH.

    --- ANALYTICAL REQUIREMENTS ---
    1. RESEARCH METHODOLOGY:
       - Type string "EMPTY"
       
    2. SUMMARY LOGIC (EXTREMELY VERBOSE MODE - MINIMUM 500 WORDS):
       - IF THE TEXT VERBATIMLY CONTAIN Introduction, Methode, Result, Discussion, Conclusion Structure:
         * Create a highly detailed, comprehensive and long enough (Minimal 5 sentences) summary using IMRaD+C (Introduction, Methods, Results, and Discussion + Conclusion) with our own summarizing style. Do Not copy identically from Asbtract
         * MUST Use <b> tags ONLY FOR each sub-heading.
         * MUST Use <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> to HIGHLIGHT only accurate and important critical terms, core concepts, or statistical significance ONLY IN PARAGRAPHS
         * Use single <br> to separate subheading with paragraph and Use double breaks to separate paragraph with next sub heading
       - IF THE TEXT VERBATIMLY NOT CONTAIN Introduction, Methode, Result, Discussion, Conclusion Structure:
         * Create a VERY COMPREHENSIVE multi-paragraph summary covering all critical points and every critical nuance with our own summarizing style. MUST BE AT LEAST 5-8 LONG PARAGRAPHS.
         * MUST Use <b><i> tags for key findings and major breakthroughs.
         * MUST Use <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> to HIGHLIGHT only accurate and important critical terms, core concepts, or statistical significance.
         * Use <br/> for paragraph breaks (Separate every paragraph).

    3. STRENGTHS & WEAKNESSES: 
       - STRICT NARRATIVE HTML FORMAT ONLY. DO NOT USE NUMBERING (1, 2, 3) OR BULLET POINTS.
       - Template: <b>[Point]</b><br/>[Explanation]<br/><br/>
       - MUST USE only <b> combine with <span style="background-color: #FED40030; color: #004A74; padding: 0 4px; border-radius: 4px;">...</span> RIGIDLY for main key point.
    
    4. UNFAMILIAR TERMINOLOGY (NARRATIVE FORMAT):
       - Explain technical terms one by one with complete explanation. DO NOT SIMPLIFY the explaination
       - STRICT ONE TEMPLATE FOR ALL TERMINOLOGIES, EXACTLY following this rule for every terminology: <b>[Terminology]</b><br/>[Explanation]<br/><br/>
       - DO NOT USE <i>
       - STRICTLY DO NOT USE NUMBERING (1, 2, 3) OR BULLET POINTS FOR THIS PART.

    5. QUICK TIPS:
       - Practical and strategic advice for the user.
       - Plain STRING TEXT ONLY DO NOT USE ANY STYLING

    --- FORMATTING RESTRICTIONS (STRICT) ---
    - NO MARKDOWN SYMBOLS (no *, no #). OUTPUT MUST BE RAW JSON.
    - BE ARCHITECTURAL, DEEP, AND PROLIX. NO SURFACE LEVEL ANALYSIS.
    - DO NOT USE CHARACTER "—"
    - OUTPUT HARUS RAW JSON.
    - OUTPUT HARUS RAW JSON.

    ITEM TITLE: "${item.title}"
    TEXT TO ANALYZE:
    ${contextText}

    EXPECTED JSON OUTPUT:
    {
      "researchMethodology": "string with HTML",
      "summary": "Verbose narrative min 500 words with HTML sub-headings and span highlights",
      "strength": "Detailed narrative with HTML highlights",
      "weakness": "Detailed narrative with HTML highlights",
      "unfamiliarTerminology": "Detailed list with <b>Term</b><br/>Explanation and span highlights",
      "quickTipsForYou": "string"
    }`;

    const aiResult = callGroqLibrarian(prompt);
    if (aiResult.status !== 'success') return aiResult;

    let rawData = aiResult.data;
    const jsonMatch = rawData.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON object structure.");
    
    const insights = JSON.parse(jsonMatch[0]);

    if (item.insightJsonId) {
      const insightContent = JSON.stringify(insights);
      if (isLocal) {
        DriveApp.getFileById(item.insightJsonId).setContent(insightContent);
      } else {
        // ENHANCED: Pass fileId to remote node to perform overwrite instead of create
        UrlFetchApp.fetch(nodeUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveJsonFile', 
            fileId: item.insightJsonId, // CRITICAL FOR TOTAL REWRITE
            fileName: `insight_${item.id}.json`, 
            content: insightContent, 
            folderId: CONFIG.FOLDERS.MAIN_LIBRARY 
          })
        });
      }
    }

    return { status: 'success', data: insights };

  } catch (err) {
    return { status: 'error', message: 'Insighter Error: ' + err.toString() };
  }
}
