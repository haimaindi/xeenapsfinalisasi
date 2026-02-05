/**
 * XEENAPS PKM - TRACER REGISTRY MODULE
 * Handles Audit Trail, Lab Notebooks, Project References, and Finance Ledger.
 */

function setupTracerDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    
    // 1. Projects Sheet
    let pSheet = ss.getSheetByName("TracerProjects");
    if (!pSheet) {
      pSheet = ss.insertSheet("TracerProjects");
      const headers = CONFIG.SCHEMAS.TRACER_PROJECTS;
      pSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      pSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      pSheet.setFrozenRows(1);
    } else {
      // Sync headers for existing sheet (Prevents column shift errors)
      const currentHeaders = pSheet.getRange(1, 1, 1, pSheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.TRACER_PROJECTS;
      const missingHeaders = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length > 0) {
        const startCol = currentHeaders.length + 1;
        pSheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        pSheet.getRange(1, startCol, 1, missingHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }

    // 2. Logs Sheet (Activity Journal)
    let lSheet = ss.getSheetByName("TracerLogs");
    if (!lSheet) {
      lSheet = ss.insertSheet("TracerLogs");
      const headers = CONFIG.SCHEMAS.TRACER_LOGS;
      lSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      lSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      lSheet.setFrozenRows(1);
    }

    // 3. References Sheet (Relationship Table)
    let rSheet = ss.getSheetByName("TracerReferences");
    if (!rSheet) {
      rSheet = ss.insertSheet("TracerReferences");
      const headers = CONFIG.SCHEMAS.TRACER_REFERENCES;
      rSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      rSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      rSheet.setFrozenRows(1);
    } else {
      // Update headers for references to include sharding
      const currentHeaders = rSheet.getRange(1, 1, 1, rSheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.TRACER_REFERENCES;
      const missingHeaders = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length > 0) {
        const startCol = currentHeaders.length + 1;
        rSheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        rSheet.getRange(1, startCol, 1, missingHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }

    // 4. To Do Sheet
    let tSheet = ss.getSheetByName("TracerTodos");
    if (!tSheet) {
      tSheet = ss.insertSheet("TracerTodos");
      const headers = CONFIG.SCHEMAS.TRACER_TODOS;
      tSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      tSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      tSheet.setFrozenRows(1);
    }

    // 5. NEW: Finance Sheet (Ledger)
    let fSheet = ss.getSheetByName("TracerFinance");
    if (!fSheet) {
      fSheet = ss.insertSheet("TracerFinance");
      const headers = CONFIG.SCHEMAS.TRACER_FINANCE;
      fSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      fSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      fSheet.setFrozenRows(1);
    }

    return { status: 'success', message: 'Tracer database structure synchronized.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// --- PROJECT HANDLERS ---

function getTracerProjectsFromRegistry(page = 1, limit = 25, search = "") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerProjects");
    if (!sheet) return { items: [], totalCount: 0 };
    
    // Using getValues for data type integrity
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rawItems = data.slice(1);
    
    let filtered = rawItems;
    if (search) {
      const s = search.toLowerCase();
      filtered = rawItems.filter(r => r.some(cell => String(cell).toLowerCase().includes(s)));
    }
    
    // Initial ID index for sorting fallback
    const updatedAtIdx = headers.indexOf('updatedAt');
    filtered.sort((a, b) => {
      const timeA = a[updatedAtIdx] ? new Date(a[updatedAtIdx]).getTime() : 0;
      const timeB = b[updatedAtIdx] ? new Date(b[updatedAtIdx]).getTime() : 0;
      return timeB - timeA;
    });
    
    const totalCount = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, (page * limit));
    
    const items = paginated.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        
        // Handle JSON array fields
        if (h === 'authors' || h === 'keywords') {
          try { 
            val = (typeof val === 'string' && val !== '') ? JSON.parse(val) : (Array.isArray(val) ? val : []); 
          } catch(e) { val = []; }
        }
        
        // Handle Date objects from Spreadsheet
        if (val instanceof Date) {
          val = val.toISOString();
        }
        
        obj[h] = val;
      });
      return obj;
    });
    
    return { items, totalCount };
  } catch (e) { return { items: [], totalCount: 0 }; }
}

function saveTracerProjectToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    let sheet = ss.getSheetByName("TracerProjects");
    if (!sheet) { setupTracerDatabase(); sheet = ss.getSheetByName("TracerProjects"); }
    
    // Dynamic Mapping: Get headers from sheet to handle any column shifts
    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idIdx = actualHeaders.indexOf('id');
    
    if (idIdx === -1) {
      setupTracerDatabase(); // Force repair
      return { status: 'error', message: 'ID column missing. Repair initiated.' };
    }

    const rowData = actualHeaders.map(h => {
      const val = item[h];
      if (val === undefined || val === null) return '';
      return (Array.isArray(val) || (typeof val === 'object')) ? JSON.stringify(val) : val;
    });

    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) { existingRow = i + 1; break; }
    }

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteTracerProjectFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerProjects");
    const lSheet = ss.getSheetByName("TracerLogs");
    const rSheet = ss.getSheetByName("TracerReferences");
    const tSheet = ss.getSheetByName("TracerTodos");
    const fSheet = ss.getSheetByName("TracerFinance");
    
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const idIdx = data[0].indexOf('id');
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === id) { sheet.deleteRow(i + 1); break; }
      }
    }
    
    // Cleanup related logs, references, and todos
    if (lSheet) {
      const lData = lSheet.getDataRange().getValues();
      const pIdIdx = lData[0].indexOf('projectId');
      for (let j = lData.length - 1; j >= 1; j--) {
        if (lData[j][pIdIdx] === id) lSheet.deleteRow(j + 1);
      }
    }
    if (rSheet) {
      const rData = rSheet.getDataRange().getValues();
      const pIdIdx = rData[0].indexOf('projectId');
      for (let k = rData.length - 1; k >= 1; k--) {
        if (rData[k][pIdIdx] === id) rSheet.deleteRow(k + 1);
      }
    }
    if (tSheet) {
      const tData = tSheet.getDataRange().getValues();
      const pIdIdx = tData[0].indexOf('projectId');
      for (let m = tData.length - 1; m >= 1; m--) {
        if (tData[m][pIdIdx] === id) tSheet.deleteRow(m + 1);
      }
    }
    if (fSheet) {
      const fData = fSheet.getDataRange().getValues();
      const pIdIdx = fData[0].indexOf('projectId');
      for (let n = fData.length - 1; n >= 1; n--) {
        if (fData[n][pIdIdx] === id) fSheet.deleteRow(n + 1);
      }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}

// --- LOG HANDLERS ---

function getTracerLogsFromRegistry(projectId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerLogs");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0];
    const projectIdIdx = headers.indexOf('projectId');
    
    return data.slice(1)
      .filter(r => r[projectIdIdx] === projectId)
      .map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) { return []; }
}

function saveTracerLogToRegistry(item, content) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    let sheet = ss.getSheetByName("TracerLogs");
    if (!sheet) { setupTracerDatabase(); sheet = ss.getSheetByName("TracerLogs"); }
    
    const headers = CONFIG.SCHEMAS.TRACER_LOGS;
    const data = sheet.getDataRange().getValues();
    const idIdx = headers.indexOf('id');
    let existingRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) {
        existingRow = i + 1;
        break;
      }
    }

    // Sharding payload (Log content is sharded like Notes)
    if (content) {
      let storageTarget;
      if (existingRow > -1) {
         storageTarget = { url: item.storageNodeUrl, isLocal: !item.storageNodeUrl || item.storageNodeUrl === ScriptApp.getService().getUrl() };
      } else {
         storageTarget = getViableStorageTarget(CONFIG.STORAGE.CRITICAL_THRESHOLD);
      }
      if (!storageTarget) throw new Error("Storage Critical.");

      const jsonFileName = `tracer_log_${item.id}.json`;
      const jsonBody = JSON.stringify(content);

      if (storageTarget.isLocal) {
        let file;
        if (item.logJsonId) {
          file = DriveApp.getFileById(item.logJsonId);
          file.setContent(jsonBody);
        } else {
          const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
          file = folder.createFile(Utilities.newBlob(jsonBody, 'application/json', jsonFileName));
          item.logJsonId = file.getId();
        }
        item.storageNodeUrl = ScriptApp.getService().getUrl();
      } else {
        const res = UrlFetchApp.fetch(storageTarget.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ action: 'saveJsonFile', fileId: item.logJsonId || null, fileName: jsonFileName, content: jsonBody })
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') {
          item.logJsonId = resJson.fileId;
          item.storageNodeUrl = storageTarget.url;
        }
      }
    }

    const rowData = headers.map(h => item[h] || '');
    if (existingRow > -1) sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);

    return { status: 'success', data: item };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteTracerLogFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerLogs");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf('id');
    const jsonIdIdx = data[0].indexOf('logJsonId');
    const nodeIdx = data[0].indexOf('storageNodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const fileId = data[i][jsonIdIdx];
        const nodeUrl = data[i][nodeIdx];
        if (fileId && nodeUrl) {
          const myUrl = ScriptApp.getService().getUrl();
          if (nodeUrl === myUrl || nodeUrl === "") permanentlyDeleteFile(fileId);
          else UrlFetchApp.fetch(nodeUrl, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] }) });
        }
        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: error };
  } catch (e) { return { status: 'error' }; }
}

// --- REFERENCE HANDLERS ---

function getTracerReferencesFromRegistry(projectId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerReferences");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0];
    const projectIdIdx = headers.indexOf('projectId');
    
    return data.slice(1)
      .filter(r => r[projectIdIdx] === projectId)
      .map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
  } catch (e) { return []; }
}

/**
 * LINK REFERENCE: Updated with Proactive Initialization of sharded JSON
 */
function linkTracerReferenceToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    let sheet = ss.getSheetByName("TracerReferences");
    if (!sheet) { setupTracerDatabase(); sheet = ss.getSheetByName("TracerReferences"); }
    
    // 1. IDENTITY GEN
    if (!item.id) item.id = Utilities.getUuid();
    if (!item.createdAt) item.createdAt = new Date().toISOString();

    // 2. PROACTIVE SHARDING: Create empty JSON file { "quotes": [] }
    const storageTarget = getViableStorageTarget(CONFIG.STORAGE.CRITICAL_THRESHOLD);
    if (storageTarget) {
      const jsonFileName = `ref_content_${item.id}.json`;
      const initialContent = JSON.stringify({ quotes: [] });

      if (storageTarget.isLocal) {
        const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
        const file = folder.createFile(Utilities.newBlob(initialContent, 'application/json', jsonFileName));
        item.contentJsonId = file.getId();
        item.storageNodeUrl = ScriptApp.getService().getUrl();
      } else {
        const res = UrlFetchApp.fetch(storageTarget.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ action: 'saveJsonFile', fileName: jsonFileName, content: initialContent })
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') {
          item.contentJsonId = resJson.fileId;
          item.storageNodeUrl = storageTarget.url;
        }
      }
    }

    // 3. REGISTRY SYNC
    const headers = CONFIG.SCHEMAS.TRACER_REFERENCES;
    const rowData = headers.map(h => item[h] || '');
    sheet.appendRow(rowData);

    return { status: 'success', data: item };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function unlinkTracerReferenceFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerReferences");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const jsonIdIdx = headers.indexOf('contentJsonId');
    const nodeIdx = headers.indexOf('storageNodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const fileId = data[i][jsonIdIdx];
        const nodeUrl = data[i][nodeIdx];
        
        // Cleanup sharded quotes file
        if (fileId && nodeUrl) {
          const myUrl = ScriptApp.getService().getUrl();
          if (nodeUrl === myUrl || nodeUrl === "") {
             permanentlyDeleteFile(fileId);
          } else {
            UrlFetchApp.fetch(nodeUrl, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] }),
              muteHttpExceptions: true
            });
          }
        }

        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error' };
  } catch (e) { return { status: 'error' }; }
}

/**
 * SHARDING: Save/Update Reference Content (Saved Quotes)
 * Includes Row Discovery Failover and Guard Logic
 */
function saveReferenceContentToRegistry(item, content) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    let sheet = ss.getSheetByName("TracerReferences");
    if (!sheet) return { status: 'error', message: 'Sheet missing.' };
    
    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idIdx = actualHeaders.indexOf('id');
    const pIdIdx = actualHeaders.indexOf('projectId');
    const cIdIdx = actualHeaders.indexOf('collectionId');
    const jsonIdIdx = actualHeaders.indexOf('contentJsonId');
    const nodeIdx = actualHeaders.indexOf('storageNodeUrl');
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // PRIMARY LOOKUP: BY ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === item.id) { rowIndex = i + 1; break; }
    }
    
    // FAILOVER DISCOVERY: BY PROJECT + COLLECTION (Handles race conditions)
    if (rowIndex === -1 && item.projectId && item.collectionId) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][pIdIdx] === item.projectId && data[i][cIdIdx] === item.collectionId) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    if (rowIndex === -1) throw new Error("Reference anchor not found. Please refresh list.");

    // Determine storage node
    let storageTarget;
    if (item.contentJsonId && item.contentJsonId.trim() !== "") {
      storageTarget = { url: item.storageNodeUrl, isLocal: !item.storageNodeUrl || item.storageNodeUrl === ScriptApp.getService().getUrl() };
    } else {
      storageTarget = getViableStorageTarget(CONFIG.STORAGE.CRITICAL_THRESHOLD);
    }
    if (!storageTarget) throw new Error("Storage Critical.");

    const jsonFileName = `ref_content_${item.id}.json`;
    const jsonBody = JSON.stringify(content);

    if (storageTarget.isLocal) {
      let file;
      // CORE GUARD: Verify ID before fetching from Drive
      if (item.contentJsonId && item.contentJsonId.trim() !== "") {
        file = DriveApp.getFileById(item.contentJsonId);
        file.setContent(jsonBody);
      } else {
        const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
        file = folder.createFile(Utilities.newBlob(jsonBody, 'application/json', jsonFileName));
        item.contentJsonId = file.getId();
        if (jsonIdIdx > -1) sheet.getRange(rowIndex, jsonIdIdx + 1).setValue(item.contentJsonId);
      }
      item.storageNodeUrl = ScriptApp.getService().getUrl();
      if (nodeIdx > -1) sheet.getRange(rowIndex, nodeIdx + 1).setValue(item.storageNodeUrl);
    } else {
      const res = UrlFetchApp.fetch(storageTarget.url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ 
          action: 'saveJsonFile', 
          fileId: (item.contentJsonId && item.contentJsonId.trim() !== "") ? item.contentJsonId : null, 
          fileName: jsonFileName, 
          content: jsonBody 
        })
      });
      const resJson = JSON.parse(res.getContentText());
      if (resJson.status === 'success') {
        item.contentJsonId = resJson.fileId;
        item.storageNodeUrl = storageTarget.url;
        if (jsonIdIdx > -1) sheet.getRange(rowIndex, jsonIdIdx + 1).setValue(item.contentJsonId);
        if (nodeIdx > -1) sheet.getRange(rowIndex, nodeIdx + 1).setValue(item.storageNodeUrl);
      }
    }

    return { status: 'success', contentJsonId: item.contentJsonId, storageNodeUrl: item.storageNodeUrl };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

// --- TODO HANDLERS ---

function getTracerTodosFromRegistry(projectId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerTodos");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0];
    const projectIdIdx = headers.indexOf('projectId');
    const isDoneIdx = headers.indexOf('isDone');
    
    return data.slice(1)
      .filter(r => r[projectIdIdx] === projectId)
      .map(row => {
        let obj = {};
        headers.forEach((h, i) => {
          let val = row[i];
          if (h === 'isDone') val = (val === 'true' || val === true);
          obj[h] = val;
        });
        return obj;
      }).sort((a,b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
  } catch (e) { return []; }
}

/**
 * NEW: getGlobalUnfinishedTodos
 * Mengambil seluruh tugas yang belum selesai dari semua project.
 */
function getGlobalUnfinishedTodos() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerTodos");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0];
    const isDoneIdx = headers.indexOf('isDone');
    
    return data.slice(1)
      .filter(r => r[isDoneIdx] !== 'true' && r[isDoneIdx] !== true)
      .map(row => {
        let obj = {};
        headers.forEach((h, i) => {
          let val = row[i];
          if (h === 'isDone') val = false;
          obj[h] = val;
        });
        return obj;
      });
  } catch (e) { return []; }
}

function saveTracerTodoToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    let sheet = ss.getSheetByName("TracerTodos");
    if (!sheet) { setupTracerDatabase(); sheet = ss.getSheetByName("TracerTodos"); }
    
    const headers = CONFIG.SCHEMAS.TRACER_TODOS;
    const rowData = headers.map(h => {
      const val = item[h];
      return (val !== undefined && val !== null) ? val : '';
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
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteTracerTodoFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerTodos");
    if (!sheet) return { status: 'error' };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}

// --- FINANCE HANDLERS ---

function getTracerFinanceFromRegistry(projectId, startDate = "", endDate = "", search = "") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerFinance");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const pIdIdx = headers.indexOf('projectId');
    const dateIdx = headers.indexOf('date');
    const descIdx = headers.indexOf('description');
    
    let filtered = data.slice(1).filter(r => r[pIdIdx] === projectId);
    
    if (startDate) {
      const s = new Date(startDate);
      filtered = filtered.filter(r => new Date(r[dateIdx]) >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23,59,59);
      filtered = filtered.filter(r => new Date(r[dateIdx]) <= e);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => String(r[descIdx]).toLowerCase().includes(s));
    }
    
    return filtered.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val instanceof Date) val = val.toISOString();
        obj[h] = val;
      });
      return obj;
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Chronological for Ledger
  } catch (e) { return []; }
}

function saveTracerFinanceToRegistry(item, content) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    let sheet = ss.getSheetByName("TracerFinance");
    if (!sheet) { setupTracerDatabase(); sheet = ss.getSheetByName("TracerFinance"); }
    
    const headers = CONFIG.SCHEMAS.TRACER_FINANCE;
    const data = sheet.getDataRange().getValues();
    const pIdIdx = headers.indexOf('projectId');
    const balIdx = headers.indexOf('balance');
    
    // 1. CALCULATE BALANCE INTEGRITY
    let lastBalance = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][pIdIdx] === item.projectId) {
        lastBalance = parseFloat(data[i][balIdx]) || 0;
        break;
      }
    }
    
    item.balance = lastBalance + (parseFloat(item.credit) || 0) - (parseFloat(item.debit) || 0);

    // 2. SHARDING ATTACHMENTS
    if (content) {
      const storageTarget = getViableStorageTarget(CONFIG.STORAGE.CRITICAL_THRESHOLD);
      if (!storageTarget) throw new Error("Storage Critical.");
      const jsonFileName = `fin_attachments_${item.id}.json`;
      const jsonBody = JSON.stringify(content);
      if (storageTarget.isLocal) {
        const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
        const file = folder.createFile(Utilities.newBlob(jsonBody, 'application/json', jsonFileName));
        item.attachmentsJsonId = file.getId();
        item.storageNodeUrl = ScriptApp.getService().getUrl();
      } else {
        const res = UrlFetchApp.fetch(storageTarget.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ action: 'saveJsonFile', fileName: jsonFileName, content: jsonBody })
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') {
          item.attachmentsJsonId = resJson.fileId;
          item.storageNodeUrl = storageTarget.url;
        }
      }
    }

    const rowData = headers.map(h => item[h] || '');
    sheet.appendRow(rowData);
    return { status: 'success', data: item };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteTracerFinanceFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerFinance");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf('id');
    const pIdIdx = data[0].indexOf('projectId');
    const jsonIdIdx = data[0].indexOf('attachmentsJsonId');
    const nodeIdx = data[0].indexOf('storageNodeUrl');

    // FIND THE ROW TO DELETE
    let targetRowIndex = -1;
    let targetProjectId = "";
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) { 
        targetRowIndex = i + 1; 
        targetProjectId = data[i][pId];
        break; 
      }
    }

    if (targetRowIndex === -1) return { status: 'error', message: 'Not found' };

    // INTEGRITY GUARD: Check if this is the latest row for this project
    let isLatest = true;
    for (let j = data.length - 1; j >= 1; j--) {
      if (data[j][pIdIdx] === targetProjectId) {
        if (data[j][idIdx] !== id) { isLatest = false; }
        break;
      }
    }

    if (!isLatest) return { status: 'error', message: 'Balance Integrity Guard: Only the latest transaction can be deleted.' };

    // CLEANUP SHARDED ATTACHMENTS - MUST USE PERMANENT DELETE FOR INTEGRITY
    const fileId = data[targetRowIndex-1][jsonIdIdx];
    const nodeUrl = data[targetRowIndex-1][nodeIdx];
    if (fileId && nodeUrl) {
      const myUrl = ScriptApp.getService().getUrl();
      if (nodeUrl === myUrl || nodeUrl === "") permanentlyDeleteFile(fileId);
      else UrlFetchApp.fetch(nodeUrl, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] }) });
    }

    sheet.deleteRow(targetRowIndex);
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

/**
 * EXPORT HANDLER: Stitches finance data with attachment URLs
 */
function getFinanceExportDataFromRegistry(projectId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const sheet = ss.getSheetByName("TracerFinance");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const pIdIdx = headers.indexOf('projectId');
    const dateIdx = headers.indexOf('date');
    const credIdx = headers.indexOf('credit');
    const debIdx = headers.indexOf('debit');
    const balIdx = headers.indexOf('balance');
    const descIdx = headers.indexOf('description');
    const attIdIdx = headers.indexOf('attachmentsJsonId');
    const nodeIdx = headers.indexOf('storageNodeUrl');

    const filtered = data.slice(1).filter(r => r[pIdIdx] === projectId);
    
    const myUrl = ScriptApp.getService().getUrl();

    return filtered.map(row => {
      const date = row[dateIdx];
      const dateStr = (date instanceof Date) ? date.toISOString() : date;
      
      let links = [];
      const attId = row[attIdIdx];
      const nodeUrl = row[nodeIdx];

      if (attId) {
        try {
          let contentRaw = "";
          const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;
          if (isLocal) {
            contentRaw = DriveApp.getFileById(attId).getBlob().getDataAsString();
          } else {
            const res = UrlFetchApp.fetch(nodeUrl + (nodeUrl.includes('?') ? '&' : '?') + "action=getFileContent&fileId=" + attId);
            const resJson = JSON.parse(res.getContentText());
            contentRaw = JSON.parse(resJson.content);
          }
          const contentObj = typeof contentRaw === 'string' ? JSON.parse(contentRaw) : contentRaw;
          const atts = contentObj.attachments || [];
          links = atts.map(a => a.url || (a.fileId ? `https://drive.google.com/file/d/${a.fileId}/view` : ''));
        } catch (e) {
          console.warn("Export attachment fetch failed for row: " + e.toString());
        }
      }

      return {
        date: dateStr,
        credit: row[credIdx] || 0,
        debit: row[debIdx] || 0,
        balance: row[balIdx] || 0,
        description: row[descIdx] || '',
        links: links.filter(Boolean).join(" | ")
      };
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (e) {
    console.error("getFinanceExportData Error: " + e.toString());
    return [];
  }
}

/**
 * PREMIUM GENERATOR: Produces Official PDF as Base64 for Direct Public Download
 * EXCEL logic removed as per request.
 */
function generateFinanceExportFileFromRegistry(projectId, format, currency) {
  try {
    const data = getFinanceExportDataFromRegistry(projectId);
    if (data.length === 0) return { status: 'error', message: 'No transaction data available.' };

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TRACER);
    const pSheet = ss.getSheetByName("TracerProjects");
    const pData = pSheet.getDataRange().getValues();
    const pHeaders = pData[0];
    const pIdIdx = pHeaders.indexOf('id');
    const pLabelIdx = pHeaders.indexOf('label');
    const pTitleIdx = pHeaders.indexOf('title');
    const pAuthorIdx = pHeaders.indexOf('authors');
    
    let pLabel = "Project";
    let pTitle = "Financial Ledger";
    let pAuthors = "N/A";
    for(let i=1; i<pData.length; i++) {
       if(pData[i][pIdIdx] === projectId) {
         pLabel = pData[i][pLabelIdx];
         pTitle = pData[i][pTitleIdx] || pLabel;
         try {
           const authorsRaw = pData[i][pAuthorIdx];
           const authorsArr = typeof authorsRaw === 'string' ? JSON.parse(authorsRaw) : authorsRaw;
           pAuthors = Array.isArray(authorsArr) ? authorsArr.join(", ") : authorsRaw;
         } catch(e) { pAuthors = pData[i][pAuthorIdx]; }
         break;
       }
    }

    const filename = `Ledger_${pLabel}_${new Date().toISOString().split('T')[0]}`;
    
    // FORMATTING 2D ARRAY FOR PDF TEMPLATE
    const rows = data.map(d => {
       const date = new Date(d.date);
       const dateFmt = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
       return [dateFmt, d.credit, d.debit, d.balance, d.description, d.links];
    });

    // OFFICIAL PDF GENERATOR
    const navy = "#004A74";
    const yellow = "#FED400";
    const generationTimestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const html = `
    <html>
    <head>
      <style>
        @page { size: A4 landscape; margin: 1cm; }
        body { font-family: sans-serif; color: #333; margin: 0; padding: 0; font-size: 9pt; }
        .header { border-bottom: 3px solid ${navy}; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header-info h1 { margin: 0; color: ${navy}; text-transform: uppercase; font-size: 18pt; letter-spacing: -0.5px; }
        .header-info p { margin: 2px 0; color: #666; font-weight: bold; font-size: 8pt; text-transform: uppercase; }
        .logo { font-weight: 900; color: ${navy}; font-size: 14pt; }
        .logo span { color: ${yellow}; }
        
        .meta-box { background-color: #F9FAFB; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #EEE; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .meta-item { display: flex; gap: 10px; align-items: baseline; margin-bottom: 5px; }
        .meta-label { font-weight: 900; text-transform: uppercase; font-size: 7pt; color: #AAA; width: 120px; shrink: 0; }
        .meta-value { font-weight: 700; color: ${navy}; font-size: 8.5pt; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: ${navy}; color: white; text-align: left; padding: 8px 10px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 1px; border: 1px solid ${navy}; }
        td { padding: 8px 10px; border-bottom: 1px solid #EEE; vertical-align: top; border-right: 1px solid #F5F5F5; border-left: 1px solid #F5F5F5; }
        .num { font-family: monospace; font-weight: bold; text-align: right; }
        .income { color: green; }
        .expense { color: red; }
        .balance { background-color: #F9FAFB; font-weight: bold; color: ${navy}; }
        .desc { font-weight: bold; color: #444; }
        .link { color: #0066CC; font-size: 7pt; word-break: break-all; text-decoration: none; }
        .footer { margin-top: 30px; border-top: 1px solid #EEE; padding-top: 10px; text-align: center; color: #AAA; font-size: 7pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-info">
            <h1>Financial Ledger Report</h1>
            <p>Xeenaps Premium Research Tracer</p>
        </div>
        <div class="logo">XEENAPS<span>.</span></div>
      </div>

      <div class="meta-box">
        <div class="meta-grid">
           <div>
              <div class="meta-item">
                <span class="meta-label">Research Title</span>
                <span class="meta-value" style="font-size: 10pt;">${pTitle}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Author Team</span>
                <span class="meta-value">${pAuthors}</span>
              </div>
           </div>
           <div>
              <div class="meta-item">
                <span class="meta-label">Base Currency</span>
                <span class="meta-value" style="color: ${navy}; background: ${yellow}; padding: 2px 8px; border-radius: 4px; font-weight: 900;">${currency || 'N/A'}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Downloaded At</span>
                <span class="meta-value" style="color: #666;">${generationTimestamp}</span>
              </div>
           </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 12%;">DateTime</th>
            <th style="width: 12%; text-align: right;">Credit (+)</th>
            <th style="width: 12%; text-align: right;">Debit (-)</th>
            <th style="width: 12%; text-align: right;">Balance</th>
            <th style="width: 27%;">Description</th>
            <th style="width: 25%;">Evidence Links</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td style="color: #888; font-family: monospace;">${r[0]}</td>
              <td class="num income">${r[1] > 0 ? '+' + Number(r[1]).toLocaleString() : '-'}</td>
              <td class="num expense">${r[2] > 0 ? '-' + Number(r[2]).toLocaleString() : '-'}</td>
              <td class="num balance">${Number(r[3]).toLocaleString()}</td>
              <td class="desc">${r[4]}</td>
              <td>${r[5].split(' | ').map(l => `<a class="link" href="${l}">${l}</a>`).join('<br/>')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Xeenaps PKM • Project Audit Protocol • System Identity Verified</div>
    </body>
    </html>`;

    const blob = Utilities.newBlob(html, "text/html", filename + ".html");
    const pdfBlob = blob.getAs("application/pdf");
    
    // Return Base64 for Direct Public Download
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return { 
      status: 'success', 
      base64: base64, 
      filename: filename + ".pdf" 
    };

  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}