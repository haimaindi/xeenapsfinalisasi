/**
 * XEENAPS PKM - CV REGISTRY MODULE
 */

function setupCVDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CV_REGISTRY);
    let sheet = ss.getSheetByName("CVRegistry");
    if (!sheet) {
      sheet = ss.insertSheet("CVRegistry");
      const headers = CONFIG.SCHEMAS.CV_REGISTRY;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.CV_REGISTRY;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'CV Registry Database ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getCVFromRegistry() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CV_REGISTRY);
    const sheet = ss.getSheetByName("CVRegistry");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const jsonFields = ['selectedEducationIds', 'selectedCareerIds', 'selectedPublicationIds', 'selectedActivityIds'];
    
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (jsonFields.includes(h)) {
          try { val = JSON.parse(val || '[]'); } catch(e) { val = []; }
        }
        if (h === 'includePhoto') val = (val === true || String(val).toLowerCase() === 'true');
        obj[h] = val;
      });
      return obj;
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) { return []; }
}

function saveCVToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CV_REGISTRY);
    let sheet = ss.getSheetByName("CVRegistry");
    if (!sheet) { setupCVDatabase(); sheet = ss.getSheetByName("CVRegistry"); }
    
    const headers = CONFIG.SCHEMAS.CV_REGISTRY;
    const rowData = headers.map(h => {
      const val = item[h];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });

    sheet.appendRow(rowData);
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteCVFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.CV_REGISTRY);
    const sheet = ss.getSheetByName("CVRegistry");
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf('id');
    const fileIdIdx = data[0].indexOf('fileId');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const fileId = data[i][fileIdIdx];
        if (fileId) {
          try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {}
        }
        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'CV ID not found' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}