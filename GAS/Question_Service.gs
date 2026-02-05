/**
 * XEENAPS PKM - AI QUESTION BANK SERVICE
 */

/**
 * Inisialisasi Database QuestionBank
 */
function setupQuestionDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.QUESTION_BANK);
    let sheet = ss.getSheetByName("QuestionBank");
    if (!sheet) {
      sheet = ss.insertSheet("QuestionBank");
      const headers = CONFIG.SCHEMAS.QUESTIONS;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      // Auto-append missing columns
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.QUESTIONS;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'QuestionBank Database ready.' };
  } catch (err) { 
    return { status: 'error', message: err.toString() }; 
  }
}

/**
 * NEW: Save or Update a single question record (Manual Entry)
 */
function saveQuestionToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.QUESTION_BANK);
    let sheet = ss.getSheetByName("QuestionBank");
    if (!sheet) {
      setupQuestionDatabase();
      sheet = ss.getSheetByName("QuestionBank");
    }

    const headers = CONFIG.SCHEMAS.QUESTIONS;
    const rowData = headers.map(h => {
      const val = item[h];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });

    const data = sheet.getDataRange().getValues();
    const idIdx = headers.indexOf('id');
    let existingRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) {
        existingRow = i + 1;
        break;
      }
    }

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Mengambil seluruh soal (Global) dengan Paginasi, Search, Filter Bloom, dan Date Range
 */
function getAllQuestionsFromRegistry(page = 1, limit = 20, search = "", bloomFilter = "All", startDate = "", endDate = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.QUESTION_BANK);
    const sheet = ss.getSheetByName("QuestionBank");
    if (!sheet) return { items: [], totalCount: 0 };

    const allValues = sheet.getDataRange().getValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    const labelIdx = headers.indexOf('customLabel');
    const textIdx = headers.indexOf('questionText');
    const optionsIdx = headers.indexOf('options');
    const bloomIdx = headers.indexOf('bloomLevel');
    const createdIdx = headers.indexOf('createdAt');
    const colIdIdx = headers.indexOf('collectionId');
    const sortIdx = headers.indexOf(sortKey);
    
    const jsonFields = ['options', 'reasoningDistractors'];
    const searchLower = search.toLowerCase();

    // 1. FILTERING
    let filtered = rawData.filter(row => {
      // Bloom Level Filter
      if (bloomFilter !== "All" && row[bloomIdx] !== bloomFilter) return false;

      // Smart Search Filter (Label, Question, Answer, CollectionID)
      if (searchLower) {
        const labelMatch = String(row[labelIdx]).toLowerCase().includes(searchLower);
        const questionMatch = String(row[textIdx]).toLowerCase().includes(searchLower);
        const sourceMatch = colIdIdx !== -1 ? String(row[colIdIdx]).toLowerCase().includes(searchLower) : false;
        let optionsMatch = false;
        try {
          const opts = JSON.parse(row[optionsIdx] || '[]');
          optionsMatch = opts.some(o => String(o.text).toLowerCase().includes(searchLower));
        } catch (e) {}
        
        if (!labelMatch && !questionMatch && !optionsMatch && !sourceMatch) return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const createdDate = new Date(row[createdIdx]);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (createdDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (createdDate > end) return false;
        }
      }

      return true;
    });

    // 2. SORTING
    if (sortIdx !== -1) {
      filtered.sort((a, b) => {
        let valA = a[sortIdx];
        let valB = b[sortIdx];

        if (sortKey === 'createdAt') {
          const timeA = valA ? new Date(valA).getTime() : 0;
          const timeB = valB ? new Date(valB).getTime() : 0;
          return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default newest first
      filtered.sort((a, b) => new Date(b[createdIdx]).getTime() - new Date(a[createdIdx]).getTime());
    }

    const totalCount = filtered.length;

    // 3. PAGINATION
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    // 4. MAPPING
    const items = paginated.map(row => {
      let question = {};
      headers.forEach((h, j) => {
        let val = row[j];
        if (jsonFields.includes(h)) {
          try {
            val = JSON.parse(val || (h === 'options' ? '[]' : '{}'));
          } catch (e) {
            val = h === 'options' ? [] : {};
          }
        }
        question[h] = val;
      });
      return question;
    });

    return { items, totalCount };
  } catch (e) {
    console.error("Error fetching global questions: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

/**
 * Mengambil soal berdasarkan collectionId dengan Paginasi, Search, dan Filter Bloom
 */
function getQuestionsFromRegistry(collectionId, page = 1, limit = 20, search = "", bloomFilter = "All") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.QUESTION_BANK);
    const sheet = ss.getSheetByName("QuestionBank");
    if (!sheet) return { items: [], totalCount: 0 };

    const allValues = sheet.getDataRange().getValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    const colIdIdx = headers.indexOf('collectionId');
    const labelIdx = headers.indexOf('customLabel');
    const textIdx = headers.indexOf('questionText');
    const optionsIdx = headers.indexOf('options');
    const bloomIdx = headers.indexOf('bloomLevel');
    const createdIdx = headers.indexOf('createdAt');
    
    const jsonFields = ['options', 'reasoningDistractors'];
    const searchLower = search.toLowerCase();

    // 1. FILTERING
    let filtered = rawData.filter(row => {
      // Basic check: Collection ID
      if (row[colIdIdx] !== collectionId) return false;

      // Bloom Level Filter
      if (bloomFilter !== "All" && row[bloomIdx] !== bloomFilter) return false;

      // Smart Search Filter (Label, Question, Answer, CollectionID)
      if (searchLower) {
        const labelMatch = String(row[labelIdx]).toLowerCase().includes(searchLower);
        const questionMatch = String(row[textIdx]).toLowerCase().includes(searchLower);
        const sourceMatch = colIdIdx !== -1 ? String(row[colIdIdx]).toLowerCase().includes(searchLower) : false;
        // Deep search in options array
        let optionsMatch = false;
        try {
          const opts = JSON.parse(row[optionsIdx] || '[]');
          optionsMatch = opts.some(o => String(o.text).toLowerCase().includes(searchLower));
        } catch (e) {}
        
        if (!labelMatch && !questionMatch && !optionsMatch && !sourceMatch) return false;
      }

      return true;
    });

    // Sort by newest
    filtered.sort((a, b) => {
      const timeA = new Date(a[createdIdx]).getTime();
      const timeB = new Date(b[createdIdx]).getTime();
      return timeB - timeA;
    });

    const totalCount = filtered.length;

    // 2. PAGINATION
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    // 3. MAPPING
    const items = paginated.map(row => {
      let question = {};
      headers.forEach((h, j) => {
        let val = row[j];
        if (jsonFields.includes(h)) {
          try {
            val = JSON.parse(val || (h === 'options' ? '[]' : '{}'));
          } catch (e) {
            val = h === 'options' ? [] : {};
          }
        }
        question[h] = val;
      });
      return question;
    });

    return { items, totalCount };
  } catch (e) {
    console.error("Error fetching questions: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

/**
 * Handler utama untuk generate soal via AI
 */
function handleGenerateQuestions(body) {
  try {
    const { collectionId, bloomLevel, customLabel, count, additionalContext, language, extractedJsonId, nodeUrl } = body;
    
    if (!extractedJsonId) throw new Error("Source text not found. Please re-extract item.");

    // 1. Ambil teks sumber
    let fullText = "";
    const myUrl = ScriptApp.getService().getUrl();
    const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;

    if (isLocal) {
      const file = DriveApp.getFileById(extractedJsonId);
      const content = JSON.parse(file.getBlob().getDataAsString());
      fullText = content.fullText || "";
    } else {
      const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + extractedJsonId);
      const resJson = JSON.parse(remoteRes.getContentText());
      if (resJson.status === 'success') {
        const content = JSON.parse(resJson.content);
        fullText = content.fullText || "";
      }
    }

    if (!fullText) throw new Error("Could not retrieve source text.");

    // 2. Siapkan Prompt AI
    const contextSnippet = fullText.substring(0, 50000); 
    const prompt = `ACT AS A SENIOR PEDAGOGICAL ASSESSMENT SPECIALIST.
    YOUR TASK: Generate exactly ${count} high-validity multiple-choice questions based on the source text.
    
    PEDAGOGICAL FRAMEWORK: Bloom's Taxonomy Level: ${bloomLevel}.
    LANGUAGE: ${language || 'English'}.
    ADDITIONAL CONTEXT: ${additionalContext || 'None'}.

    --- CRITICAL MANDATORY RULES ---
    1. ANSWER KEY RANDOMIZATION: You MUST distribute the correct answer keys (A, B, C, D, E) UNIFORMLY across the generated set. Avoid repetitive patterns (e.g., all A or all B).
    2. VERBATIM REFERENCE (MANDATORY): For every correct answer, you MUST identify exactly one sentence or phrase from the source text that provides the factual basis. This sentence must be copied verbatim into the "verbatimReference" field.
    3. STRICT DATA MAPPING:
       - "reasoningDistractors" MUST ONLY contain entries for the 4 INCORRECT keys.
       - DO NOT put "verbatimReference" text inside the "reasoningDistractors" object.
       - DO NOT include the "correctAnswer" key inside the "reasoningDistractors" object.
    4. BLOOM'S TARGET: C1-C6 target logic must be strictly applied.
    5. QUESTION STRUCTURE: 5 options (A, B, C, D, E).
    6. OUTPUT: RAW JSON ONLY.

    --- JSON SCHEMA ---
    {
      "questions": [
        {
          "questionText": "...",
          "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, ...],
          "correctAnswer": "Determined by your uniform distribution logic",
          "reasoningCorrect": "...",
          "reasoningDistractors": {
            "IncorrectKey1": "...",
            "IncorrectKey2": "...",
            "IncorrectKey3": "...",
            "IncorrectKey4": "..."
          },
          "verbatimReference": "Verbatim quote from the text supporting the correct answer"
        }
      ]
    }

    TEXT TO ANALYZE:
    ${contextSnippet}`;

    const aiResult = callGeminiService(prompt);
    if (aiResult.status !== 'success') return aiResult;

    let cleanJson = aiResult.data.trim();
    if (cleanJson.includes('```json')) {
      cleanJson = cleanJson.split('```json')[1].split('```')[0].trim();
    }
    
    const parsed = JSON.parse(cleanJson);
    const questions = parsed.questions || [];
    const savedQuestions = [];

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.QUESTION_BANK);
    let sheet = ss.getSheetByName("QuestionBank");
    if (!sheet) {
      setupQuestionDatabase();
      sheet = ss.getSheetByName("QuestionBank");
    }

    const headers = CONFIG.SCHEMAS.QUESTIONS;

    questions.forEach(q => {
      // Robust Cleaning: Ensure reasoningDistractors only has distractors
      const cleanedDistractors = {};
      if (q.reasoningDistractors) {
        Object.keys(q.reasoningDistractors).forEach(k => {
          if (k !== q.correctAnswer) {
            cleanedDistractors[k] = q.reasoningDistractors[k];
          }
        });
      }

      const qItem = {
        id: Utilities.getUuid(),
        collectionId: collectionId,
        bloomLevel: bloomLevel,
        customLabel: customLabel || "General Set",
        questionText: q.questionText,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        reasoningCorrect: q.reasoningCorrect,
        reasoningDistractors: JSON.stringify(cleanedDistractors),
        verbatimReference: q.verbatimReference,
        language: language,
        createdAt: new Date().toISOString()
      };

      const rowData = headers.map(h => qItem[h] || '');
      sheet.appendRow(rowData);
      
      qItem.options = q.options;
      qItem.reasoningDistractors = cleanedDistractors;
      savedQuestions.push(qItem);
    });

    return { status: 'success', data: savedQuestions };

  } catch (e) {
    return { status: 'error', message: "Question Engine Error: " + e.toString() };
  }
}

/**
 * Menghapus soal dari registry
 */
function deleteQuestionFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.QUESTION_BANK);
    const sheet = ss.getSheetByName("QuestionBank");
    if (!sheet) return { status: 'error', message: 'Registry not found' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Question ID not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}