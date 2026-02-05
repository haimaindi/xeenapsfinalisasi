
/**
 * XEENAPS PKM - CONSULTATION REGISTRY MODULE
 */

function setupConsultationDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CONSULTATION);
    let sheet = ss.getSheetByName("Consultations");
    if (!sheet) {
      sheet = ss.insertSheet("Consultations");
      const headers = CONFIG.SCHEMAS.CONSULTATIONS;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
    return { status: 'success', message: 'Consultation Database ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getConsultationsFromRegistry(collectionId, page = 1, limit = 20, search = "") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CONSULTATION);
    const sheet = ss.getSheetByName("Consultations");
    if (!sheet) return { items: [], totalCount: 0 };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rawItems = data.slice(1);
    
    const colIdIdx = headers.indexOf('collectionId');
    const questionIdx = headers.indexOf('question');
    const createdIdx = headers.indexOf('createdAt');
    const favIdx = headers.indexOf('isFavorite');

    let filtered = rawItems.filter(row => {
      const matchesCol = row[colIdIdx] === collectionId;
      const matchesSearch = !search || String(row[questionIdx]).toLowerCase().includes(search.toLowerCase());
      return matchesCol && matchesSearch;
    });

    // Sort by Favorite, then Created (DESC)
    filtered.sort((a, b) => {
      const favA = a[favIdx] === true || String(a[favIdx]).toLowerCase() === 'true';
      const favB = b[favIdx] === true || String(b[favIdx]).toLowerCase() === 'true';
      if (favA !== favB) return favA ? -1 : 1;
      return new Date(b[createdIdx]).getTime() - new Date(a[createdIdx]).getTime();
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

function saveConsultationToRegistry(item, answerContent) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CONSULTATION);
    let sheet = ss.getSheetByName("Consultations");
    if (!sheet) { setupConsultationDatabase(); sheet = ss.getSheetByName("Consultations"); }
    
    const headers = CONFIG.SCHEMAS.CONSULTATIONS;
    const data = sheet.getDataRange().getValues();
    const idIdx = headers.indexOf('id');
    let existingRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) {
        existingRow = i + 1;
        break;
      }
    }

    // --- LOGIC: SHARDING TOTAL REWRITE ---
    let storageTarget;
    if (existingRow > -1) {
       // Re-consult: Gunakan node yang sudah ada
       storageTarget = { 
         url: item.nodeUrl, 
         isLocal: !item.nodeUrl || item.nodeUrl === ScriptApp.getService().getUrl() 
       };
    } else {
       // New Consult: Cari node baru
       storageTarget = getViableStorageTarget(CONFIG.STORAGE.CRITICAL_THRESHOLD);
    }

    if (!storageTarget) throw new Error("Storage Critical.");

    const jsonFileName = `consult_${item.id}.json`;
    const jsonBody = JSON.stringify(answerContent);

    if (storageTarget.isLocal) {
      let file;
      if (item.answerJsonId) {
        // OVERWRITE EXISTING
        file = DriveApp.getFileById(item.answerJsonId);
        file.setContent(jsonBody);
      } else {
        // CREATE NEW
        const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
        file = folder.createFile(Utilities.newBlob(jsonBody, 'application/json', jsonFileName));
        item.answerJsonId = file.getId();
      }
      item.nodeUrl = ScriptApp.getService().getUrl();
    } else {
      const res = UrlFetchApp.fetch(storageTarget.url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ 
          action: 'saveJsonFile', 
          fileId: item.answerJsonId || null, 
          fileName: jsonFileName, 
          content: jsonBody 
        })
      });
      const resJson = JSON.parse(res.getContentText());
      if (resJson.status === 'success') {
        item.answerJsonId = resJson.fileId;
        item.nodeUrl = storageTarget.url;
      }
    }

    // Update Registry Row
    const rowData = headers.map(h => {
      const val = item[h];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val !== undefined ? val : '');
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

function deleteConsultationFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CONSULTATION);
    const sheet = ss.getSheetByName("Consultations");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const answerIdx = headers.indexOf('answerJsonId');
    const nodeIdx = headers.indexOf('nodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const fileId = data[i][answerIdx];
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
    return { status: 'error', message: 'ID Not Found' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}
