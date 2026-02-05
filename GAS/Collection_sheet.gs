/**
 * XEENAPS PKM - COLLECTION DATA LAYER
 */

function setupDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    let sheet = ss.getSheetByName("Collections");
    if (!sheet) {
      sheet = ss.insertSheet("Collections");
      const headers = CONFIG.SCHEMAS.LIBRARY;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      // AUTO-UPDATE COLUMNS: Detect and append missing headers from schema
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.LIBRARY;
      const missingHeaders = targetHeaders.filter(h => !currentHeaders.includes(h));
      
      if (missingHeaders.length > 0) {
        const startCol = currentHeaders.length + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        sheet.getRange(1, startCol, 1, missingHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Database "Collections" has been successfully initialized/updated.' };
  } catch (err) { return { status: 'error', message: err.toString() }; }
}

/**
 * Optimized for 100,000+ rows with Fuzzy Tokenized Smart Search (Match Score)
 */
function getPaginatedItems(ssId, sheetName, page = 1, limit = 25, search = "", typeFilter = "All", pathFilter = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { items: [], totalCount: 0 };
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { items: [], totalCount: 0 };
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const sortIdx = headers.indexOf(sortKey);
    
    let items = [];
    let totalFilteredCount = 0;

    const jsonFields = ['authors', 'pubInfo', 'identifiers', 'tags', 'supportingReferences'];

    // 1. DATA HARVESTING
    const allValues = sheet.getDataRange().getValues();
    const rawData = allValues.slice(1);
    
    // 2. SMART TOKENIZED SEARCH PREP
    const searchTokens = search ? search.toLowerCase().split(/\s+/).filter(t => t.length > 1) : [];

    // 3. FILTERING & SCORING LOGIC (FUZZY)
    let filtered = rawData.map(row => {
      const itemObj = {};
      headers.forEach((h, i) => itemObj[h] = row[i]);
      
      let matchScore = 0;
      if (searchTokens.length > 0) {
        // Broaden search area: Include Title, Authors, Topic, MainInfo, Tags (Keywords/Labels), and Abstract
        const searchableStr = (
          String(itemObj.title) + " " + 
          String(itemObj.authors) + " " + 
          String(itemObj.topic) + " " + 
          String(itemObj.mainInfo) + " " + 
          String(itemObj.tags) + " " + 
          String(itemObj.abstract)
        ).toLowerCase();
        
        searchTokens.forEach(token => {
          if (searchableStr.includes(token)) {
            matchScore++;
          }
        });
      } else {
        // No search provided, everyone is a base match
        matchScore = 1;
      }

      const matchesType = typeFilter === "All" || itemObj.type === typeFilter;
      const matchesPath = (!pathFilter) || 
                        (pathFilter === "favorite" && (itemObj.isFavorite === true || itemObj.isFavorite === 'true')) || 
                        (pathFilter === "bookmark" && (itemObj.isBookmarked === true || itemObj.isBookmarked === 'true')) ||
                        (pathFilter === "research" && (itemObj.type === "Literature" || itemObj.type === "Task"));
      
      if (matchScore > 0 && matchesType && matchesPath) {
        return { row: row, score: matchScore };
      }
      return null;
    }).filter(x => x !== null);
    
    totalFilteredCount = filtered.length;
    
    // 4. SERVER-SIDE SORTING (Rank by Score first if searching, then by sortKey)
    filtered.sort((a, b) => {
      // Primary: Score (Relevance)
      if (searchTokens.length > 0 && a.score !== b.score) {
        return b.score - a.score;
      }

      // Secondary: User defined sort key
      let valA = a.row[sortIdx];
      let valB = b.row[sortIdx];
      
      if (sortKey === 'createdAt' || sortKey === 'updatedAt') {
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
    
    // 5. PAGINATION & JSON MAPPING
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);
    
    items = paginated.map(wrapped => {
      const row = wrapped.row;
      let item = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (jsonFields.includes(h)) { 
          try { 
            val = (typeof val === 'string' && val !== '') ? JSON.parse(val) : (val || (h === 'authors' ? [] : {})); 
          } catch(e) { 
            val = (h === 'authors') ? [] : {}; 
          } 
        }
        item[h] = val;
      });
      return item;
    });

    return { items, totalCount: totalFilteredCount };
  } catch(e) { 
    return { items: [], totalCount: 0, error: e.toString() }; 
  }
}

function saveToSheet(ssId, sheetName, item) {
  const ss = SpreadsheetApp.openById(ssId);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(sheetName); }
  
  if (!item.pubInfo) {
    item.pubInfo = { 
      journal: item.journalName || "", 
      vol: item.volume || "", 
      issue: item.issue || "", 
      pages: item.pages || "" 
    };
  }
  if (!item.identifiers) {
    item.identifiers = { 
      doi: item.doi || "", 
      issn: item.issn || "", 
      isbn: item.isbn || "", 
      pmid: item.pmid || "", 
      arxiv: item.arxivId || "", 
      bibcode: item.bibcode || "" 
    };
  }
  if (!item.tags) {
    item.tags = { 
      keywords: item.keywords || [], 
      labels: item.labels || [] 
    };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(h => {
    const val = item[h];
    return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val !== undefined ? val : '');
  });

  const lastRow = sheet.getLastRow();
  let existingRowIndex = -1;
  
  if (lastRow > 1) {
    const idColumnValues = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (let i = 1; i < idColumnValues.length; i++) {
      if (idColumnValues[i][0] === item.id) {
        existingRowIndex = i + 1;
        break;
      }
    }
  }

  if (existingRowIndex > -1) {
    sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function deleteFromSheet(ssId, sheetName, id) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIdx = headers.indexOf('id');
  const fileIdIdx = headers.indexOf('fileId');
  const extractedIdx = headers.indexOf('extractedJsonId');
  const insightIdx = headers.indexOf('insightJsonId');
  const nodeUrlIdx = headers.indexOf('storageNodeUrl');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === id) {
      const fileId = data[i][fileIdIdx];
      const extractedId = data[i][extractedIdx];
      const insightId = data[i][insightIdx];
      const nodeUrl = data[i][nodeUrlIdx];
      
      const idsToDelete = [fileId, extractedId, insightId].filter(fid => fid && String(fid).trim() !== "");

      if (idsToDelete.length > 0) {
        const myUrl = ScriptApp.getService().getUrl();
        const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;

        if (isLocal) {
          idsToDelete.forEach(fid => permanentlyDeleteFile(fid));
        } else {
          try {
            UrlFetchApp.fetch(nodeUrl, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: idsToDelete }),
              muteHttpExceptions: true
            });
          } catch (slaveErr) {
            console.error("Failed to trigger remote deletion on slave: " + slaveErr.toString());
          }
        }
      }
      
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
