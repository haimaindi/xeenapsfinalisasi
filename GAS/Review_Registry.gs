
/**
 * XEENAPS PKM - LITERATURE REVIEW REGISTRY MODULE
 * Handles Metadata on Spreadsheet and Payload on Sharded JSON.
 */

function setupReviewDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LITERATURE_REVIEW);
    let sheet = ss.getSheetByName("Reviews");
    if (!sheet) {
      sheet = ss.insertSheet("Reviews");
      const headers = CONFIG.SCHEMAS.LITERATURE_REVIEW;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
    return { status: 'success', message: 'Literature Review Database ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getReviewsFromRegistry(page = 1, limit = 20, search = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LITERATURE_REVIEW);
    const sheet = ss.getSheetByName("Reviews");
    if (!sheet) return { items: [], totalCount: 0 };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rawItems = data.slice(1);
    
    const labelIdx = headers.indexOf('label');
    const questionIdx = headers.indexOf('centralQuestion');
    const favIdx = headers.indexOf('isFavorite');
    const sortIdx = headers.indexOf(sortKey);

    const searchTokens = search ? search.toLowerCase().split(/\s+/).filter(t => t.length > 1) : [];

    let filtered = rawItems.filter(row => {
      if (searchTokens.length > 0) {
        const searchableStr = (String(row[labelIdx] || "") + " " + String(row[questionIdx] || "")).toLowerCase();
        return searchTokens.every(token => searchableStr.includes(token));
      }
      return true;
    });

    // SERVER-SIDE SORTING
    filtered.sort((a, b) => {
      const favA = a[favIdx] === true || String(a[favIdx]).toLowerCase() === 'true';
      const favB = b[favIdx] === true || String(b[favIdx]).toLowerCase() === 'true';
      if (favA !== favB) return favA ? -1 : 1;

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
        if (h === 'isFavorite') val = (val === true || String(val).toLowerCase() === 'true');
        obj[h] = val;
      });
      return obj;
    });

    return { items, totalCount };
  } catch (e) { return { items: [], totalCount: 0 }; }
}

function saveReviewToRegistry(item, content) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LITERATURE_REVIEW);
    let sheet = ss.getSheetByName("Reviews");
    if (!sheet) { setupReviewDatabase(); sheet = ss.getSheetByName("Reviews"); }
    
    const headers = CONFIG.SCHEMAS.LITERATURE_REVIEW;
    const data = sheet.getDataRange().getValues();
    const idIdx = headers.indexOf('id');
    let existingRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) {
        existingRow = i + 1;
        break;
      }
    }

    // --- LOGIC: SHARDING JSON PAYLOAD (Matrix & Synthesis) ---
    if (content) {
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

      const jsonFileName = `review_${item.id}.json`;
      const jsonBody = JSON.stringify(content);

      if (storageTarget.isLocal) {
        let file;
        if (item.reviewJsonId) {
          file = DriveApp.getFileById(item.reviewJsonId);
          file.setContent(jsonBody);
        } else {
          const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
          file = folder.createFile(Utilities.newBlob(jsonBody, 'application/json', jsonFileName));
          item.reviewJsonId = file.getId();
        }
        item.storageNodeUrl = ScriptApp.getService().getUrl();
      } else {
        const res = UrlFetchApp.fetch(storageTarget.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveJsonFile', 
            fileId: item.reviewJsonId || null, 
            fileName: jsonFileName, 
            content: jsonBody 
          })
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') {
          item.reviewJsonId = resJson.fileId;
          item.storageNodeUrl = storageTarget.url;
        }
      }
    }

    // Update Registry Metadata Row with Robust Mapping
    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = actualHeaders.map(h => {
      const val = item[h];
      if (val === undefined || val === null) return '';
      return (typeof val === 'object') ? JSON.stringify(val) : val;
    });

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return { status: 'success', data: item };
  } catch (e) {
    console.error("saveReview Error: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

function deleteReviewFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LITERATURE_REVIEW);
    const sheet = ss.getSheetByName("Reviews");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const jsonIdIdx = headers.indexOf('reviewJsonId');
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
    return { status: 'error', message: 'Review ID not found' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}
