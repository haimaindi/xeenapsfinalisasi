
/**
 * XEENAPS PKM - ACTIVITY REGISTRY MODULE
 */

function setupActivitiesDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.ACTIVITIES);
    let sheet = ss.getSheetByName("Activities");
    if (!sheet) {
      sheet = ss.insertSheet("Activities");
      const headers = CONFIG.SCHEMAS.ACTIVITIES;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      // Auto-append missing columns
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.ACTIVITIES;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
    return { status: 'success', message: 'Activities Database ready.' };
  } catch (err) { 
    return { status: 'error', message: err.toString() }; 
  }
}

/**
 * Fetch activities with pagination, search, and date range (UPDATED FOR TYPE FILTER)
 */
function getActivitiesFromRegistry(page = 1, limit = 25, search = "", startDate = "", endDate = "", typeFilter = "All") {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.ACTIVITIES);
    const sheet = ss.getSheetByName("Activities");
    if (!sheet) return { items: [], totalCount: 0 };

    const allValues = sheet.getDataRange().getValues();
    if (allValues.length <= 1) return { items: [], totalCount: 0 };

    const headers = allValues[0];
    const rawData = allValues.slice(1);
    
    // Search Indices
    const nameIdx = headers.indexOf('eventName');
    const orgIdx = headers.indexOf('organizer');
    const descIdx = headers.indexOf('description');
    const typeIdx = headers.indexOf('type');
    const favIdx = headers.indexOf('isFavorite');
    const startIdx = headers.indexOf('startDate');
    
    const searchLower = search.toLowerCase();

    // 1. FILTERING
    let filtered = rawData.filter(row => {
      // Activity Type Filter (CRITICAL BUG FIX)
      if (typeFilter !== "All" && row[typeIdx] !== typeFilter) return false;

      // Search Filter
      if (searchLower) {
        const matchesSearch = String(row[nameIdx] || "").toLowerCase().includes(searchLower) ||
                              String(row[orgIdx] || "").toLowerCase().includes(searchLower) ||
                              String(row[descIdx] || "").toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const activityDate = new Date(row[startIdx]);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (activityDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (activityDate > end) return false;
        }
      }

      return true;
    });

    // 2. MULTI-LEVEL SORTING
    filtered.sort((a, b) => {
      const favA = a[favIdx] === true || String(a[favIdx]).toLowerCase() === 'true';
      const favB = b[favIdx] === true || String(b[favIdx]).toLowerCase() === 'true';
      if (favA !== favB) return favA ? -1 : 1;

      const dateA = a[startIdx] ? new Date(a[startIdx]).getTime() : 0;
      const dateB = b[startIdx] ? new Date(b[startIdx]).getTime() : 0;
      return dateB - dateA;
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
    console.error("Error fetching activities: " + e.toString());
    return { items: [], totalCount: 0 };
  }
}

/**
 * Save / Update Activity Metadata
 */
function saveActivityToRegistry(item) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.ACTIVITIES);
    let sheet = ss.getSheetByName("Activities");
    if (!sheet) {
      setupActivitiesDatabase();
      sheet = ss.getSheetByName("Activities");
    }

    const headers = CONFIG.SCHEMAS.ACTIVITIES;
    const rowData = headers.map(h => item[h] !== undefined ? item[h] : '');

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

/**
 * Delete Activity and clean up Vault Shards + Certificate cross-nodes
 */
function deleteActivityFromRegistry(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.ACTIVITIES);
    const sheet = ss.getSheetByName("Activities");
    if (!sheet) return { status: 'error' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const vaultIdx = headers.indexOf('vaultJsonId');
    const nodeIdx = headers.indexOf('storageNodeUrl');
    const certFileIdx = headers.indexOf('certificateFileId');
    const certNodeIdx = headers.indexOf('certificateNodeUrl');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        const vaultId = data[i][vaultIdx];
        const vaultFileNode = data[i][nodeIdx];
        const certId = data[i][certFileIdx];
        const certNode = data[i][certNodeIdx];

        const myUrl = ScriptApp.getService().getUrl();

        // 1. DELETE CERTIFICATE FILE
        if (certId) {
          const isCertLocal = !certNode || certNode === "" || certNode === myUrl;
          if (isCertLocal) permanentlyDeleteFile(certId);
          else {
            UrlFetchApp.fetch(certNode, {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [certId] }),
              muteHttpExceptions: true
            });
          }
        }

        // 2. VAULT CLEANUP
        if (vaultId) {
          try {
            const isLocalIndex = !vaultFileNode || vaultFileNode === "" || vaultFileNode === myUrl;
            let vaultContentRaw = "";
            if (isLocalIndex) {
              vaultContentRaw = DriveApp.getFileById(vaultId).getBlob().getDataAsString();
            } else {
              const res = UrlFetchApp.fetch(vaultFileNode + (vaultFileNode.includes('?') ? '&' : '?') + "action=getFileContent&fileId=" + vaultId);
              vaultContentRaw = JSON.parse(JSON.parse(res.getContentText()).content);
            }

            const vaultItems = JSON.parse(vaultContentRaw);
            const nodeGroups = {};
            vaultItems.forEach(item => {
              if (item.type === 'FILE' && item.fileId && item.nodeUrl) {
                if (!nodeGroups[item.nodeUrl]) nodeGroups[item.nodeUrl] = [];
                nodeGroups[item.nodeUrl].push(item.fileId);
              }
            });

            Object.keys(nodeGroups).forEach(targetNode => {
              const fileIds = nodeGroups[targetNode];
              if (targetNode === myUrl || targetNode === "") {
                fileIds.forEach(fid => permanentlyDeleteFile(fid));
              } else {
                UrlFetchApp.fetch(targetNode, {
                  method: 'post',
                  contentType: 'application/json',
                  payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: fileIds }),
                  muteHttpExceptions: true
                });
              }
            });

            if (isLocalIndex) permanentlyDeleteFile(vaultId);
            else {
              UrlFetchApp.fetch(vaultFileNode, {
                method: 'post',
                contentType: 'application/json',
                payload: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [vaultId] }),
                muteHttpExceptions: true
              });
            }
          } catch (vaultErr) {
            console.warn("Vault cleanup error: " + vaultErr.toString());
          }
        }

        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Activity ID not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}
