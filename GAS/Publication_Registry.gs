/**
 * XEENAPS PKM - PUBLICATION REGISTRY
 */

function setupPublicationDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PUBLICATION);
    let sheet = ss.getSheetByName("Publications");
    if (!sheet) {
      sheet = ss.insertSheet("Publications");
      const headers = CONFIG.SCHEMAS.PUBLICATION;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.PUBLICATION;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Publication Database ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getPublicationFromRegistry(page = 1, limit = 25, search = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PUBLICATION);
    const sheet = ss.getSheetByName("Publications");
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
    const favIdx = headers.indexOf('isFavorite');

    // MULTI-LEVEL SORTING (SERVER SIDE)
    filtered.sort((a, b) => {
      // 1. Prioritize isFavorite (TRUE comes first)
      const favA = a[favIdx] === true || String(a[favIdx]).toLowerCase() === 'true';
      const favB = b[favIdx] === true || String(b[favIdx]).toLowerCase() === 'true';
      
      if (favA !== favB) return favA ? -1 : 1;

      // 2. Secondary: Primary Sort Key (Date or others)
      if (sortIdx !== -1) {
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
      }
      return 0;
    });
    
    const totalCount = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    
    const jsonFields = ['authors', 'keywords'];
    const items = paginated.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (jsonFields.includes(h)) {
          try { 
            val = (typeof val === 'string' && val !== '') ? JSON.parse(val) : (val || []); 
          } catch (e) { 
            val = []; 
          }
        }
        if (h === 'isFavorite') {
           val = val === true || String(val).toLowerCase() === 'true';
        }
        obj[h] = val;
      });
      return obj;
    });
    
    return { items, totalCount };
  } catch (e) { return { items: [], totalCount: 0 }; }
}

function savePublicationToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PUBLICATION);
    let sheet = ss.getSheetByName("Publications");
    if (!sheet) { setupPublicationDatabase(); sheet = ss.getSheetByName("Publications"); }
    
    const headers = CONFIG.SCHEMAS.PUBLICATION;
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

function deletePublicationFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PUBLICATION);
    const sheet = ss.getSheetByName("Publications");
    if (!sheet) return { status: 'error' };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}