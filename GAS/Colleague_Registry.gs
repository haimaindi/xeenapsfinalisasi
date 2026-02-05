
/**
 * XEENAPS PKM - COLLEAGUE REGISTRY MODULE
 * Pure Data Management for Professional Network
 */

function setupColleagueDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.COLLEAGUES);
    let sheet = ss.getSheetByName("Colleagues");
    if (!sheet) {
      sheet = ss.insertSheet("Colleagues");
      const headers = CONFIG.SCHEMAS.COLLEAGUES;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.COLLEAGUES;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Colleague Database successfully initialized.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Fetch colleagues with pagination and multi-column tokenized search (SERVER-SIDE)
 */
function getColleaguesFromRegistry(page = 1, limit = 20, search = "", sortKey = "name", sortDir = "asc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.COLLEAGUES);
    const sheet = ss.getSheetByName("Colleagues");
    if (!sheet) return { items: [], totalCount: 0 };

    const allValues = sheet.getDataRange().getDisplayValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    
    // Indices for search
    const nameIdx = headers.indexOf('name');
    const affIdx = headers.indexOf('affiliation');
    const appIdIdx = headers.indexOf('uniqueAppId');
    const emailIdx = headers.indexOf('email');
    const favIdx = headers.indexOf('isFavorite');
    const sortIdx = headers.indexOf(sortKey);
    
    const searchLower = search.toLowerCase();
    const searchTokens = searchLower ? searchLower.split(/\s+/).filter(t => t.length > 1) : [];

    // 1. FILTERING (SERVER-SIDE TOKENIZED SEARCH)
    let filtered = rawData.filter(row => {
      if (searchTokens.length === 0) return true;

      const searchableStr = (
        String(row[nameIdx] || "") + " " +
        String(row[affIdx] || "") + " " +
        String(row[appIdIdx] || "") + " " +
        String(row[emailIdx] || "")
      ).toLowerCase();

      // Token match: every token must be present in the searchable string
      return searchTokens.every(token => searchableStr.includes(token));
    });

    // 2. SORTING (SERVER-SIDE)
    filtered.sort((a, b) => {
      let valA = a[sortIdx];
      let valB = b[sortIdx];

      if (sortKey === 'createdAt' || sortKey === 'updatedAt') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }
      
      // Favorite priority first? No, use specified sortKey.
      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = filtered.length;

    // 3. PAGINATION
    const startRow = (page - 1) * limit;
    const paginated = filtered.slice(startRow, startRow + limit);

    // 4. MAPPING
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
  } catch (e) {
    console.error("Error fetching colleagues: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

function saveColleagueToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.COLLEAGUES);
    let sheet = ss.getSheetByName("Colleagues");
    if (!sheet) {
      setupColleagueDatabase();
      sheet = ss.getSheetByName("Colleagues");
    }

    const headers = CONFIG.SCHEMAS.COLLEAGUES;
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
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteColleagueFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.COLLEAGUES);
    const sheet = ss.getSheetByName("Colleagues");
    if (!sheet) return { status: 'error' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const photoIdIdx = headers.indexOf('photoFileId');
    const nodeIdx = headers.indexOf('photoNodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const photoFileId = data[i][photoIdIdx];
        const nodeUrl = data[i][nodeIdx];

        // Cleanup sharded photo file
        if (photoFileId && nodeUrl) {
          const myUrl = ScriptApp.getService().getUrl();
          if (nodeUrl === myUrl || nodeUrl === "") {
             permanentlyDeleteFile(photoFileId);
          } else {
            UrlFetchApp.fetch(nodeUrl, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [photoFileId] }),
              muteHttpExceptions: true
            });
          }
        }

        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Colleague ID not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}
