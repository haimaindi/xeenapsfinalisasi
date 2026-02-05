/**
 * XEENAPS PKM - NOTEBOOK REGISTRY MODULE
 */

function setupNotebookDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.NOTEBOOK);
    let sheet = ss.getSheetByName("Notebook");
    if (!sheet) {
      sheet = ss.insertSheet("Notebook");
      const headers = CONFIG.SCHEMAS.NOTEBOOK;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.NOTEBOOK;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Notebook Database ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getNotesFromRegistry(page = 1, limit = 25, search = "", collectionId = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.NOTEBOOK);
    const sheet = ss.getSheetByName("Notebook");
    if (!sheet) return { items: [], totalCount: 0 };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rawItems = data.slice(1);
    
    const idIdx = headers.indexOf('id');
    const colIdIdx = headers.indexOf('collectionId');
    const colTitleIdx = headers.indexOf('collectionTitle');
    const labelIdx = headers.indexOf('label');
    const searchIdx = headers.indexOf('searchIndex');
    const createdIdx = headers.indexOf('createdAt');
    const favIdx = headers.indexOf('isFavorite');

    const searchTokens = search ? search.toLowerCase().split(/\s+/).filter(t => t.length > 1) : [];

    let filtered = rawItems.filter(row => {
      // 1. Filter by Collection ID if provided
      // SPECIAL TOKEN: __INDEPENDENT__ means collectionId must be empty in sheet
      if (collectionId === "__INDEPENDENT__") {
        if (row[colIdIdx] && row[colIdIdx].toString().trim() !== "") return false;
      } else if (collectionId && row[colIdIdx] !== collectionId) {
        return false;
      }

      // 2. BACKEND TOKENIZED SMART SEARCH (Label, Title Collection, Description & Lampiran Index)
      if (searchTokens.length > 0) {
        const searchableStr = (
          String(row[labelIdx] || "") + " " + 
          String(row[colTitleIdx] || "") + " " + 
          String(row[searchIdx] || "")
        ).toLowerCase();
        
        return searchTokens.every(token => searchableStr.includes(token));
      }

      return true;
    });

    // SERVER-SIDE SORTING
    filtered.sort((a, b) => {
      // Priority 1: Favorite
      const favA = a[favIdx] === true || String(a[favIdx]).toLowerCase() === 'true';
      const favB = b[favIdx] === true || String(b[favIdx]).toLowerCase() === 'true';
      if (favA !== favB) return favA ? -1 : 1;

      // Priority 2: Primary Sort Key
      const sortIdx = headers.indexOf(sortKey);
      let valA = a[sortIdx];
      let valB = b[sortIdx];

      if (sortKey === 'createdAt' || sortKey === 'updatedAt') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }
      
      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const items = paginated.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (h === 'isFavorite' || h === 'isUsed') val = (val === true || String(val).toLowerCase() === 'true');
        obj[h] = val;
      });
      return obj;
    });

    return { items, totalCount };
  } catch (e) { return { items: [], totalCount: 0 }; }
}

function saveNoteToRegistry(item, content) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.NOTEBOOK);
    let sheet = ss.getSheetByName("Notebook");
    if (!sheet) { setupNotebookDatabase(); sheet = ss.getSheetByName("Notebook"); }
    
    const headers = CONFIG.SCHEMAS.NOTEBOOK;
    const data = sheet.getDataRange().getValues();
    const idIdx = headers.indexOf('id');
    let existingRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) {
        existingRow = i + 1;
        break;
      }
    }

    // --- LOGIC: SHARDING JSON PAYLOAD & SEARCH INDEXING ---
    if (content && (content.description !== undefined || (content.attachments && content.attachments.length > 0))) {
      
      // BUILD SEARCH INDEX (Backend search enhancement)
      let indexText = (content.description || "").replace(/<[^>]*>/g, ' '); 
      if (content.attachments && Array.isArray(content.attachments)) {
        content.attachments.forEach(at => {
          indexText += " " + (at.label || "");
        });
      }
      item.searchIndex = indexText.substring(0, 5000); // Limit spreadsheet cell size

      let storageTarget;
      if (existingRow > -1) {
         storageTarget = { 
           url: item.storageNodeUrl, 
           isLocal: !item.storageNodeUrl || item.storageNodeUrl === ScriptApp.getService().getUrl() 
         };
      } else {
         storageTarget = getViableStorageTarget(CONFIG.STORAGE.CRITICAL_THRESHOLD);
      }

      if (!storageTarget) throw new Error("Storage Critical.");

      const jsonFileName = `note_${item.id}.json`;
      const jsonBody = JSON.stringify(content);

      if (storageTarget.isLocal) {
        let file;
        if (item.noteJsonId) {
          file = DriveApp.getFileById(item.noteJsonId);
          file.setContent(jsonBody);
        } else {
          const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
          file = folder.createFile(Utilities.newBlob(jsonBody, 'application/json', jsonFileName));
          item.noteJsonId = file.getId();
        }
        item.storageNodeUrl = ScriptApp.getService().getUrl();
      } else {
        const res = UrlFetchApp.fetch(storageTarget.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveJsonFile', 
            fileId: item.noteJsonId || null, 
            fileName: jsonFileName, 
            content: jsonBody 
          })
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') {
          item.noteJsonId = resJson.fileId;
          item.storageNodeUrl = storageTarget.url;
        }
      }
    }

    // Update Registry Metadata Row
    const rowData = headers.map(h => {
      const val = item[h];
      return (val !== undefined && val !== null) ? val : '';
    });

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return { status: 'success', data: item };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteNoteFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.NOTEBOOK);
    const sheet = ss.getSheetByName("Notebook");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const jsonIdIdx = headers.indexOf('noteJsonId');
    const nodeIdx = headers.indexOf('storageNodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const fileId = data[i][jsonIdIdx];
        const nodeUrl = data[i][nodeIdx];
        
        if (fileId && nodeUrl) {
          const myUrl = ScriptApp.getService().getUrl();
          if (nodeUrl === myUrl || nodeUrl === "") {
            permanentlyDeleteFile(fileId);
          } else {
            UrlFetchApp.fetch(nodeUrl, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] })
            });
          }
        }
        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Note ID not found' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}