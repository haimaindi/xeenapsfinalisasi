
/**
 * XEENAPS PKM - TEACHING REGISTRY MODULE
 * Pure Data Management for Academic Teaching Logs
 */

function setupTeachingDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TEACHING);
    let sheet = ss.getSheetByName("TeachingLogs");
    if (!sheet) {
      sheet = ss.insertSheet("TeachingLogs");
      const headers = CONFIG.SCHEMAS.TEACHING;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.TEACHING;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Teaching Database successfully initialized.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Fetch teaching logs with pagination, search, and date range filtering (SERVER-SIDE)
 */
function getTeachingFromRegistry(page = 1, limit = 25, search = "", startDate = "", endDate = "") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TEACHING);
    const sheet = ss.getSheetByName("TeachingLogs");
    if (!sheet) return { items: [], totalCount: 0 };

    // CORE FIX: Use getDisplayValues() instead of getValues()
    const allValues = sheet.getDataRange().getDisplayValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    
    const labelIdx = headers.indexOf('label');
    const dateIdx = headers.indexOf('teachingDate');
    const institutionIdx = headers.indexOf('institution');
    const facultyIdx = headers.indexOf('faculty');
    const programIdx = headers.indexOf('program');
    const groupIdx = headers.indexOf('classGroup');
    const titleIdx = headers.indexOf('courseTitle');
    const codeIdx = headers.indexOf('courseCode');
    const topicIdx = headers.indexOf('topic');
    
    const searchLower = search.toLowerCase();

    // 1. FILTERING (SERVER-SIDE)
    let filtered = rawData.filter(row => {
      // Date Range Filter
      if (startDate || endDate) {
        const itemDate = new Date(row[dateIdx]);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      // Expanded Smart Search (Label, Identity, Substance)
      if (searchLower) {
        const searchableStr = (
          String(row[labelIdx] || "") + " " +
          String(row[institutionIdx] || "") + " " +
          String(row[facultyIdx] || "") + " " +
          String(row[programIdx] || "") + " " +
          String(row[groupIdx] || "") + " " +
          String(row[titleIdx] || "") + " " +
          String(row[codeIdx] || "") + " " +
          String(row[topicIdx] || "")
        ).toLowerCase();
        
        if (!searchableStr.includes(searchLower)) return false;
      }

      return true;
    });

    // 2. SORTING (Newest Date First)
    filtered.sort((a, b) => {
      const dateA = a[dateIdx] ? new Date(a[dateIdx]).getTime() : 0;
      const dateB = b[dateIdx] ? new Date(b[dateIdx]).getTime() : 0;
      return dateB - dateA;
    });

    const totalCount = filtered.length;

    // 3. PAGINATION
    const startRow = (page - 1) * limit;
    const paginated = filtered.slice(startRow, startRow + limit);

    // 4. MAPPING
    const jsonFields = ['referenceLinks', 'presentationId', 'questionBankId', 'attachmentLink'];
    const items = paginated.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (jsonFields.includes(h)) {
          try { val = (typeof val === 'string' && val !== '') ? JSON.parse(val) : (val || []); } catch(e) { val = []; }
        }
        obj[h] = val;
      });
      return obj;
    });

    return { items, totalCount };
  } catch (e) {
    console.error("Error fetching teaching logs: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

function saveTeachingToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TEACHING);
    let sheet = ss.getSheetByName("TeachingLogs");
    if (!sheet) {
      setupTeachingDatabase();
      sheet = ss.getSheetByName("TeachingLogs");
    }

    const headers = CONFIG.SCHEMAS.TEACHING;
    const rowData = headers.map(h => {
      const val = item[h];
      return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val !== undefined ? val : '');
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

function deleteTeachingFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.TEACHING);
    const sheet = ss.getSheetByName("TeachingLogs");
    if (!sheet) return { status: 'error' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const vaultIdx = headers.indexOf('vaultJsonId');
    const nodeIdx = headers.indexOf('storageNodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const vaultId = data[i][vaultIdx];
        const nodeUrl = data[i][nodeIdx];

        // Cleanup sharded files (Vault JSON)
        if (vaultId && nodeUrl) {
          const myUrl = ScriptApp.getService().getUrl();
          if (nodeUrl === myUrl || nodeUrl === "") {
             permanentlyDeleteFile(vaultId);
          } else {
            UrlFetchApp.fetch(nodeUrl, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [vaultId] }),
              muteHttpExceptions: true
            });
          }
        }

        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Session ID not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}
