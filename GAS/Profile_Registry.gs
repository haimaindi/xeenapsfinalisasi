/**
 * XEENAPS PKM - PROFILE REGISTRY MODULE
 * Handles User Metadata, Education, and Career History.
 */

function setupProfileDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    
    // 1. Profile Metadata Sheet
    let mSheet = ss.getSheetByName("Profile");
    if (!mSheet) {
      mSheet = ss.insertSheet("Profile");
      const headers = CONFIG.SCHEMAS.PROFILE;
      mSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      mSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      mSheet.setFrozenRows(1);
    }

    // 2. Education Sheet
    let eSheet = ss.getSheetByName("Education");
    if (!eSheet) {
      eSheet = ss.insertSheet("Education");
      const headers = CONFIG.SCHEMAS.EDUCATION;
      eSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      eSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      eSheet.setFrozenRows(1);
    }

    // 3. Career Sheet
    let cSheet = ss.getSheetByName("Career");
    if (!cSheet) {
      cSheet = ss.insertSheet("Career");
      const headers = CONFIG.SCHEMAS.CAREER;
      cSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      cSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      cSheet.setFrozenRows(1);
    }

    return { status: 'success', message: 'Profile database structure synchronized.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// --- PROFILE HANDLERS ---

function getProfileFromRegistry() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    const sheet = ss.getSheetByName("Profile");
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;
    
    const headers = data[0];
    const row = data[1]; // Only 1 profile allowed
    
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  } catch (e) { return null; }
}

function saveProfileToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    let sheet = ss.getSheetByName("Profile");
    if (!sheet) { setupProfileDatabase(); sheet = ss.getSheetByName("Profile"); }
    
    const headers = CONFIG.SCHEMAS.PROFILE;
    const rowData = headers.map(h => item[h] || '');

    // Profile is unique (Always overwrite row 2)
    sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

// --- EDUCATION HANDLERS ---

function getEducationFromRegistry() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    const sheet = ss.getSheetByName("Education");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  } catch (e) { return []; }
}

function saveEducationToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    let sheet = ss.getSheetByName("Education");
    if (!sheet) { setupProfileDatabase(); sheet = ss.getSheetByName("Education"); }
    
    const headers = CONFIG.SCHEMAS.EDUCATION;
    const rowData = headers.map(h => item[h] || '');
    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.id) { existingRow = i + 1; break; }
    }
    if (existingRow > -1) sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteEducationFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    const sheet = ss.getSheetByName("Education");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}

// --- CAREER HANDLERS ---

function getCareerFromRegistry() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    const sheet = ss.getSheetByName("Career");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  } catch (e) { return []; }
}

function saveCareerToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    let sheet = ss.getSheetByName("Career");
    if (!sheet) { setupProfileDatabase(); sheet = ss.getSheetByName("Career"); }
    
    const headers = CONFIG.SCHEMAS.CAREER;
    const rowData = headers.map(h => item[h] || '');
    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.id) { existingRow = i + 1; break; }
    }
    if (existingRow > -1) sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteCareerFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PROFILE);
    const sheet = ss.getSheetByName("Career");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}