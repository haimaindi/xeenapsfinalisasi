/**
 * XEENAPS PKM - BRAINSTORMING REGISTRY
 */

function setupBrainstormingDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.BRAINSTORMING);
    let sheet = ss.getSheetByName("Brainstorming");
    if (!sheet) {
      sheet = ss.insertSheet("Brainstorming");
      const headers = CONFIG.SCHEMAS.BRAINSTORMING;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.BRAINSTORMING;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Brainstorming Database ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getBrainstormingFromRegistry(page = 1, limit = 25, search = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.BRAINSTORMING);
    const sheet = ss.getSheetByName("Brainstorming");
    if (!sheet) return { items: [], totalCount: 0 };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rawItems = data.slice(1);
    
    let filtered = rawItems;
    if (search) {
      const s = search.toLowerCase();
      filtered = rawItems.filter(r => r.some(cell => String(cell).toLowerCase().includes(s)));
    }
    
    const sortIdx = headers.indexOf(sortKey);
    if (sortIdx !== -1) {
      filtered.sort((a, b) => {
        let valA = a[sortIdx];
        let valB = b[sortIdx];
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
    }
    
    const totalCount = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    
    const jsonFields = ['keywords', 'pillars', 'externalRefs', 'internalRefs'];
    const items = paginated.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (jsonFields.includes(h)) {
          try { 
            // Better robust JSON parsing
            val = (typeof val === 'string' && val !== '') ? JSON.parse(val) : (val || []); 
          } catch (e) { 
            val = []; 
          }
        }
        obj[h] = val;
      });
      return obj;
    });
    
    return { items, totalCount };
  } catch (e) { return { items: [], totalCount: 0 }; }
}

function saveBrainstormingToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.BRAINSTORMING);
    let sheet = ss.getSheetByName("Brainstorming");
    if (!sheet) { setupBrainstormingDatabase(); sheet = ss.getSheetByName("Brainstorming"); }
    
    const headers = CONFIG.SCHEMAS.BRAINSTORMING;
    const rowData = headers.map(h => {
      const val = item[h];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });

    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.id) { existingRow = i + 1; break; }
    }

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteBrainstormingFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.BRAINSTORMING);
    const sheet = ss.getSheetByName("Brainstorming");
    if (!sheet) return { status: 'error' };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}