/**
 * XEENAPS PKM - PRESENTATION REGISTRY MODULE V13 (CASE-INSENSITIVE ROBUST MAPPING)
 */

/**
 * Menarik data presentasi berdasarkan collectionId dengan dukungan Search, Sort, dan Paginasi
 */
function getPresentationsByCollection(collectionId, page = 1, limit = 20, search = "", sortKey = "createdAt", sortDir = "desc") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
    let sheet = ss.getSheetByName("Presentation");
    if (!sheet) {
      setupPresentationRegistry();
      return { items: [], totalCount: 0 };
    }

    const allValues = sheet.getDataRange().getValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    
    // NORMALISASI HEADER UNTUK LOOKUP (Case-Insensitive & Trim)
    const lowerHeaders = headers.map(h => String(h || "").trim().toLowerCase());
    
    const colIdsIdx = lowerHeaders.indexOf('collectionids');
    const titleIdx = lowerHeaders.indexOf('title');
    const presenterIdx = lowerHeaders.indexOf('presenters');
    const sortIdx = lowerHeaders.indexOf(String(sortKey).toLowerCase());
    
    const jsonFields = ['collectionids', 'presenters', 'themeconfig'];
    const searchLower = search.toLowerCase();

    // 1. FILTERING
    let filtered = rawData.filter(row => {
      // Check if related to collection
      let rowCollectionIds = [];
      try {
        rowCollectionIds = JSON.parse(row[colIdsIdx] || '[]');
      } catch (e) { rowCollectionIds = []; }
      
      if (!rowCollectionIds.includes(collectionId)) return false;

      // Smart Search Filter
      if (searchLower) {
        const titleMatch = String(row[titleIdx] || "").toLowerCase().includes(searchLower);
        const presenterMatch = String(row[presenterIdx] || "").toLowerCase().includes(searchLower);
        if (!titleMatch && !presenterMatch) return false;
      }

      return true;
    });

    const totalCount = filtered.length;

    // 2. SORTING
    if (sortIdx !== -1) {
      filtered.sort((a, b) => {
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
    }

    // 3. PAGINATION
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    // 4. MAPPING (Dinamis berdasarkan urutan header fisik)
    const items = paginated.map(row => {
      let presentation = {};
      headers.forEach((h, j) => {
        const cleanHeader = String(h || "").trim();
        const lowerH = cleanHeader.toLowerCase();
        let val = row[j];
        
        if (jsonFields.includes(lowerH)) {
          try {
            val = JSON.parse(val || (lowerH === 'themeconfig' ? '{}' : '[]'));
          } catch (e) {
            val = lowerH === 'themeconfig' ? {} : [];
          }
        }
        // Gunakan nama header asli dari Config Schema sebagai key (lower camel case)
        const schemaKey = CONFIG.SCHEMAS.PRESENTATIONS.find(k => k.toLowerCase() === lowerH) || cleanHeader;
        presentation[schemaKey] = val;
      });
      return presentation;
    });

    return { items, totalCount };
  } catch (e) {
    console.error("Error fetching related presentations: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

/**
 * Menarik seluruh data presentasi dengan dukungan Search, Sort, dan Date Range (Server-Side)
 */
function getAllPresentationsFromRegistry(page = 1, limit = 25, search = "", sortKey = "createdAt", sortDir = "desc", startDate = "", endDate = "") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
    let sheet = ss.getSheetByName("Presentation");
    if (!sheet) {
      setupPresentationRegistry();
      return { items: [], totalCount: 0 };
    }

    const allValues = sheet.getDataRange().getValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    const lowerHeaders = headers.map(h => String(h || "").trim().toLowerCase());
    const jsonFields = ['collectionids', 'presenters', 'themeconfig'];
    
    const sortIdx = lowerHeaders.indexOf(String(sortKey).toLowerCase());
    const createdIdx = lowerHeaders.indexOf('createdat');
    const searchLower = search.toLowerCase();

    // 1. FILTERING
    let filtered = rawData.filter(row => {
      const presentation = {};
      headers.forEach((h, j) => {
        const lowerH = String(h || "").trim().toLowerCase();
        const schemaKey = CONFIG.SCHEMAS.PRESENTATIONS.find(k => k.toLowerCase() === lowerH) || h;
        presentation[schemaKey] = row[j];
      });

      // Search Filter: Title or Presenters
      const matchesSearch = !search || 
        String(presentation.title || "").toLowerCase().includes(searchLower) || 
        String(presentation.presenters || "").toLowerCase().includes(searchLower);

      // Date Range Filter
      let matchesDate = true;
      if (startDate || endDate) {
        const createdDate = new Date(row[createdIdx]);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (createdDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (createdDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    });

    const totalCount = filtered.length;

    // 2. SORTING
    if (sortIdx !== -1) {
      filtered.sort((a, b) => {
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
    }

    // 3. PAGINATION
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    // 4. MAPPING TO OBJECT
    const items = paginated.map(row => {
      let presentation = {};
      headers.forEach((h, j) => {
        const lowerH = String(h || "").trim().toLowerCase();
        let val = row[j];
        if (jsonFields.includes(lowerH)) {
          try {
            val = JSON.parse(val || (lowerH === 'themeconfig' ? '{}' : '[]'));
          } catch (e) {
            val = lowerH === 'themeconfig' ? {} : [];
          }
        }
        const schemaKey = CONFIG.SCHEMAS.PRESENTATIONS.find(k => k.toLowerCase() === lowerH) || h;
        presentation[schemaKey] = val;
      });
      return presentation;
    });

    return { items: items, totalCount: totalCount };
  } catch (e) {
    console.error("Error fetching all presentations: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

/**
 * Menyimpan presentasi baru ke registry dan mengonversi file ke Google Slides
 */
function handleSavePresentation(body) {
  try {
    const { presentation, pptxFileData } = body;
    
    // 1. Storage Node Determination
    let storageTarget;
    if (body.folderId) {
      storageTarget = {
        url: ScriptApp.getService().getUrl(),
        folderId: body.folderId,
        isLocal: true
      };
    } else {
      storageTarget = getViableStorageTarget(CONFIG.STORAGE.THRESHOLD);
    }
    
    if (!storageTarget) throw new Error("Storage full on all nodes.");

    // Delegasi ke Slave jika diperlukan
    if (!storageTarget.isLocal) {
      const res = UrlFetchApp.fetch(storageTarget.url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          action: 'savePresentation',
          presentation: presentation,
          pptxFileData: pptxFileData,
          folderId: storageTarget.folderId
        })
      });
      return JSON.parse(res.getContentText());
    }

    // 2. Simpan file PPTX fisik (Backup)
    const fileName = `${presentation.title}.pptx`;
    const blob = Utilities.newBlob(Utilities.base64Decode(pptxFileData), 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fileName);
    
    const folder = DriveApp.getFolderById(storageTarget.folderId);
    const pptxFile = folder.createFile(blob);

    // 3. Konversi ke Google Slides (Premium Archiving)
    const resource = {
      name: presentation.title || "Xeenaps Elegant Presentation",
      mimeType: MimeType.GOOGLE_SLIDES,
      parents: [storageTarget.folderId]
    };
    
    const convertedFile = Drive.Files.create(resource, blob);
    
    // Hardening Metadata
    presentation.gSlidesId = convertedFile.id;
    presentation.storageNodeUrl = storageTarget.url; 
    if (!presentation.createdAt) presentation.createdAt = new Date().toISOString();
    if (!presentation.updatedAt) presentation.updatedAt = new Date().toISOString();

    // 4. Registry Logging (FIXED: CASE-INSENSITIVE & ROBUST MAPPING)
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
    let sheet = ss.getSheetByName("Presentation");
    if (!sheet) {
      setupPresentationRegistry();
      sheet = ss.getSheetByName("Presentation");
    }

    // Ambil header aktual dari sheet
    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Susun rowData berdasarkan urutan nama kolom fisik di Spreadsheet secara Cerdas
    const rowData = actualHeaders.map(headerName => {
      const cleanHeader = String(headerName || "").trim().toLowerCase();
      if (!cleanHeader) return ''; // Lewati kolom kosong tanpa menggeser data selanjutnya
      
      // Cari key di objek presentation yang cocok (Case-Insensitive)
      const matchingKey = Object.keys(presentation).find(k => k.toLowerCase() === cleanHeader);
      const val = matchingKey ? presentation[matchingKey] : '';
      
      if (val === undefined || val === null) return '';
      return (Array.isArray(val) || (typeof val === 'object')) ? JSON.stringify(val) : val;
    });

    // Masukkan data ke baris baru
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);
    
    return { status: 'success', data: presentation };
  } catch (e) {
    console.error("Save Presentation Engine Error: " + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Menghapus presentasi dari registry dan file fisiknya
 */
function deletePresentationRecord(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
    const sheet = ss.getSheetByName("Presentation");
    if (!sheet) return { status: 'error', message: 'Registry not found' };
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h || "").trim().toLowerCase());
    
    const idIdx = headers.indexOf('id');
    const gSlidesIdIdx = headers.indexOf('gslidesid');
    const nodeUrlIdx = headers.indexOf('storagenodeurl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const gSlidesId = data[i][gSlidesIdIdx];
        const nodeUrl = data[i][nodeUrlIdx];
        
        // 1. Route permanent deletion based on sharding node
        if (gSlidesId) {
          const myUrl = ScriptApp.getService().getUrl();
          const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;

          if (isLocal) {
            try {
              permanentlyDeleteFile(gSlidesId);
            } catch (e) {
              console.warn("Could not delete Slides file locally: " + e.toString());
            }
          } else {
            // Send deletion command to the correct Slave node
            try {
              UrlFetchApp.fetch(nodeUrl, {
                method: 'post',
                contentType: 'application/json',
                payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [gSlidesId] }),
                muteHttpExceptions: true
              });
            } catch (slaveErr) {
              console.error("Failed to trigger remote slides deletion on slave: " + slaveErr.toString());
            }
          }
        }
        
        // 2. Remove the row from Master Registry sheet
        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Presentation ID not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Setup tabel Presentation
 */
function setupPresentationRegistry() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.PRESENTATION);
  let sheet = ss.getSheetByName("Presentation");
  if (!sheet) {
    sheet = ss.insertSheet("Presentation");
    const headers = CONFIG.SCHEMAS.PRESENTATIONS;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }
}
