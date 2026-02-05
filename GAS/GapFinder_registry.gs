
/**
 * XEENAPS PKM - GAP FINDER REGISTRY
 */

function setupResearchDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    
    // 1. Research Projects Sheet
    let pSheet = ss.getSheetByName("ResearchProjects");
    if (!pSheet) {
      pSheet = ss.insertSheet("ResearchProjects");
      const headers = CONFIG.SCHEMAS.RESEARCH_PROJECTS;
      pSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      pSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      pSheet.setFrozenRows(1);
    }

    // 2. Project Sources (Matrix) Sheet
    let sSheet = ss.getSheetByName("ProjectSources");
    if (!sSheet) {
      sSheet = ss.insertSheet("ProjectSources");
      const headers = CONFIG.SCHEMAS.PROJECT_SOURCES;
      sSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sSheet.setFrozenRows(1);
    }

    // 3. Legacy GapLogs (Keep for compatibility)
    let gSheet = ss.getSheetByName("GapLogs");
    if (!gSheet) {
      gSheet = ss.insertSheet("GapLogs");
      const headers = CONFIG.SCHEMAS.RESEARCH_GAPS;
      gSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      gSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      gSheet.setFrozenRows(1);
    }

    return { status: 'success', message: 'Research database structure ready.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// --- PROJECT LEVEL HANDLERS ---

function getResearchProjectsFromRegistry(page = 1, limit = 25, search = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    const sheet = ss.getSheetByName("ResearchProjects");
    if (!sheet) return { items: [], totalCount: 0 };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rawItems = data.slice(1);
    
    let filtered = rawItems;
    if (search) {
      const s = search.toLowerCase();
      filtered = rawItems.filter(r => r.some(cell => String(cell).toLowerCase().includes(s)));
    }
    
    // SERVER-SIDE SORTING
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
    
    const items = paginated.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    
    return { items, totalCount };
  } catch (e) { return { items: [], totalCount: 0 }; }
}

function saveResearchProjectToRegistry(project) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    let sheet = ss.getSheetByName("ResearchProjects");
    if (!sheet) { setupResearchDatabase(); sheet = ss.getSheetByName("ResearchProjects"); }
    
    const headers = CONFIG.SCHEMAS.RESEARCH_PROJECTS;
    const rowData = headers.map(h => {
      const val = project[h];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });

    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === project.id) { existingRow = i + 1; break; }
    }

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteResearchProjectFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    const sheet = ss.getSheetByName("ResearchProjects");
    const sSheet = ss.getSheetByName("ProjectSources");
    
    // 1. Delete Project Row
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
      }
    }
    
    // 2. Delete Associated Sources
    if (sSheet) {
      const sData = sSheet.getDataRange().getValues();
      for (let j = sData.length - 1; j >= 1; j--) {
        if (sData[j][1] === id) sSheet.deleteRow(j + 1);
      }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}

// --- MATRIX SOURCE HANDLERS ---

function getProjectSourcesFromRegistry(projectId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    const sheet = ss.getSheetByName("ProjectSources");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return data.slice(1)
      .filter(r => r[1] === projectId)
      .map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
  } catch (e) { return []; }
}

function saveProjectSourceToRegistry(source) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    let sheet = ss.getSheetByName("ProjectSources");
    if (!sheet) { setupResearchDatabase(); sheet = ss.getSheetByName("ProjectSources"); }
    
    const headers = CONFIG.SCHEMAS.PROJECT_SOURCES;
    const rowData = headers.map(h => source[h] || '');

    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === source.id) { existingRow = i + 1; break; }
    }

    if (existingRow > -1) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}

function deleteProjectSourceFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    const sheet = ss.getSheetByName("ProjectSources");
    if (!sheet) return { status: 'error' };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { status: 'success' };
  } catch (e) { return { status: 'error' }; }
}

// --- LEGACY GAP LOG HANDLERS ---

function saveGapLog(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    let sheet = ss.getSheetByName("GapLogs");
    if (!sheet) { 
      setupResearchDatabase(); 
      sheet = ss.getSheetByName("GapLogs"); 
    }

    const headers = CONFIG.SCHEMAS.RESEARCH_GAPS;
    const rowData = headers.map(h => item[h] || '');

    sheet.appendRow(rowData);
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getGapLogsBySource(sourceId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.RESEARCH);
    const sheet = ss.getSheetByName("GapLogs");
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const sourceIdIdx = headers.indexOf('sourceId');
    
    // Ambil log terbaru untuk sourceId tersebut (iterasi dari bawah)
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][sourceIdIdx] === sourceId) {
        let item = {};
        headers.forEach((h, j) => item[h] = data[i][j]);
        return item;
      }
    }
  } catch (e) {}
  return null;
}
