/**
 * XEENAPS PKM - SHARBOX REGISTRY MODULE
 * Handles P2P Cross-Spreadsheet Knowledge Exchange.
 */

function setupSharboxDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.SHARBOX);
    
    // 1. Inbox Sheet
    let iSheet = ss.getSheetByName("Inbox");
    if (!iSheet) {
      iSheet = ss.insertSheet("Inbox");
      const headers = CONFIG.SCHEMAS.SHARBOX_INBOX;
      iSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      iSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      iSheet.setFrozenRows(1);
    } else {
      // Auto-update Inbox sheet headers to include isRead
      const currentHeaders = iSheet.getRange(1, 1, 1, iSheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.SHARBOX_INBOX;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        iSheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }

    // 2. Sent Sheet
    let sSheet = ss.getSheetByName("Sent");
    if (!sSheet) {
      sSheet = ss.insertSheet("Sent");
      const headers = CONFIG.SCHEMAS.SHARBOX_SENT;
      sSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sSheet.setFrozenRows(1);
    } else {
      // Auto-update Sent sheet headers to include contacts
      const currentHeaders = sSheet.getRange(1, 1, 1, sSheet.getLastColumn()).getValues()[0];
      const targetHeaders = CONFIG.SCHEMAS.SHARBOX_SENT;
      const missing = targetHeaders.filter(h => !currentHeaders.includes(h));
      if (missing.length > 0) {
        sSheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }

    return { status: 'success', message: 'Sharbox structure initialized.' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Handle Knowledge Sharing (Double Write Logic)
 * UPDATED: Persists receiver contact info.
 */
function handleSendToSharbox(targetUniqueAppId, receiverName, receiverPhotoUrl, message, item, receiverContacts) {
  try {
    const profile = getProfileFromRegistry();
    if (!profile) throw new Error("Sender profile not found.");

    // 1. PREPARE PERMISSIONS: Auto-set files to "Anyone with link can view"
    const fileIdsToShare = [item.fileId, item.extractedJsonId, item.insightJsonId].filter(id => id && id.trim() !== "");
    fileIdsToShare.forEach(id => {
       try {
         DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       } catch (e) {
         console.warn("Failed to set permission for file: " + id);
       }
    });

    const timestamp = new Date().toISOString();
    const transactionId = Utilities.getUuid();

    // 2. WRITE TO TARGET (Receiver's Inbox)
    const targetSS = SpreadsheetApp.openById(targetUniqueAppId);
    let targetInbox = targetSS.getSheetByName("Inbox");
    if (!targetInbox) {
      // Create Inbox if not exists in target SS (User might not have initialized yet)
      targetInbox = targetSS.insertSheet("Inbox");
      targetInbox.getRange(1, 1, 1, CONFIG.SCHEMAS.SHARBOX_INBOX.length).setValues([CONFIG.SCHEMAS.SHARBOX_INBOX]);
    }

    // Map data for SHARBOX_INBOX schema
    const inboxRow = CONFIG.SCHEMAS.SHARBOX_INBOX.map(h => {
      if (h === 'id') return transactionId;
      if (h === 'senderName') return profile.fullName;
      if (h === 'senderPhotoUrl') return profile.photoUrl;
      if (h === 'senderAffiliation') return profile.affiliation;
      if (h === 'senderUniqueAppId') return profile.uniqueAppId;
      if (h === 'senderEmail') return profile.email;
      if (h === 'senderPhone') return profile.phone;
      if (h === 'senderSocialMedia') return profile.socialMedia;
      if (h === 'message') return message || '';
      if (h === 'timestamp') return timestamp;
      if (h === 'status') return 'UNCLAIMED';
      if (h === 'isRead') return false;
      
      // Collection Metadata mapping (prefix id_item)
      const colKey = h === 'id_item' ? 'id' : h;
      const val = item[colKey];
      return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });
    targetInbox.appendRow(inboxRow);

    // 3. WRITE TO LOCAL (Sender's Sent)
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.SHARBOX);
    let sentSheet = ss.getSheetByName("Sent");
    if (!sentSheet) { setupSharboxDatabase(); sentSheet = ss.getSheetByName("Sent"); }

    const sentRow = CONFIG.SCHEMAS.SHARBOX_SENT.map(h => {
      if (h === 'id') return transactionId;
      if (h === 'receiverName') return receiverName;
      if (h === 'receiverPhotoUrl') return receiverPhotoUrl;
      if (h === 'receiverUniqueAppId') return targetUniqueAppId;
      if (h === 'receiverEmail') return (receiverContacts && receiverContacts.email) || '';
      if (h === 'receiverPhone') return (receiverContacts && receiverContacts.phone) || '';
      if (h === 'receiverSocialMedia') return (receiverContacts && receiverContacts.socialMedia) || '';
      if (h === 'message') return message || '';
      if (h === 'timestamp') return timestamp;
      if (h === 'status') return 'SENT';
      
      const colKey = h === 'id_item' ? 'id' : h;
      const val = item[colKey];
      return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val !== undefined ? val : '');
    });
    sentSheet.appendRow(sentRow);

    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: "Double-write failed: " + e.toString() };
  }
}

/**
 * Retrieval logic for Inbox or Sent
 */
function getSharboxItemsFromRegistry(type) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.SHARBOX);
    const sheet = ss.getSheetByName(type); // 'Inbox' or 'Sent'
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const jsonFields = ['authors', 'pubInfo', 'identifiers', 'tags', 'supportingReferences'];
    const schema = type === 'Inbox' ? CONFIG.SCHEMAS.SHARBOX_INBOX : CONFIG.SCHEMAS.SHARBOX_SENT;

    return data.slice(1).map(row => {
      let obj = {};
      schema.forEach(schemaKey => {
        const spreadsheetIdx = headers.indexOf(schemaKey);
        let val = spreadsheetIdx !== -1 ? row[spreadsheetIdx] : '';

        // Handle JSON fields with safe defaults
        if (jsonFields.includes(schemaKey)) {
          try { 
            val = (val && String(val).trim() !== "") ? JSON.parse(val) : (schemaKey === 'authors' ? [] : {});
          } catch(e) { 
            val = (schemaKey === 'authors' ? [] : {}); 
          }
        }
        
        // Final fallback for critical fields to prevent UI crashes
        if (schemaKey === 'title' && !val) val = 'Untitled Document';
        if (schemaKey === 'authors' && !Array.isArray(val)) val = [];
        
        obj[schemaKey] = val;
        
        // Specific boolean parsing for isRead
        if (schemaKey === 'isRead') {
          obj[schemaKey] = (val === true || String(val).toLowerCase() === 'true');
        }
      });
      return obj;
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) { return []; }
}

/**
 * Handle Claim/Import knowledge to local Library
 * Future Proof: Clones JSON content to local Storage Node
 */
function handleClaimSharboxItem(transactionId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.SHARBOX);
    const sheet = ss.getSheetByName("Inbox");
    if (!sheet) throw new Error("Inbox not found.");

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const statusIdx = headers.indexOf('status');
    const idItemIdx = headers.indexOf('id_item');

    let targetRowIndex = -1;
    let sharboxItem = {};
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === transactionId) {
        targetRowIndex = i + 1;
        headers.forEach((h, j) => sharboxItem[h] = data[i][j]);
        break;
      }
    }

    if (targetRowIndex === -1) throw new Error("Item not found.");
    if (sharboxItem.status === 'CLAIMED') throw new Error("Already claimed.");

    // 1. DATA RECONSTRUCTION for Collections
    const collectionItem = {};
    CONFIG.SCHEMAS.LIBRARY.forEach(h => {
       const key = h === 'id' ? 'id_item' : h;
       let val = sharboxItem[key];
       // JSON Parse safety
       if (['authors', 'pubInfo', 'identifiers', 'tags', 'supportingReferences'].includes(h)) {
         try { 
           val = (val && String(val).trim() !== "") ? JSON.parse(val) : (h === 'authors' ? [] : {});
         } catch(e) {
           val = (h === 'authors' ? [] : {});
         }
       }
       collectionItem[h] = val;
    });

    // OVERWRITE WITH LOCAL TIMESTAMP (NOW)
    const now = new Date().toISOString();
    collectionItem.createdAt = now;
    collectionItem.updatedAt = now;

    // 2. REGISTER TO LOCAL LIBRARY
    saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", collectionItem);

    // 3. MARK AS CLAIMED
    sheet.getRange(targetRowIndex, statusIdx + 1).setValue('CLAIMED');

    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * NEW: Mark Sharbox Inbox item as Read
 */
function markSharboxItemAsRead(id) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.SHARBOX);
    const sheet = ss.getSheetByName("Inbox");
    if (!sheet) return { status: 'error', message: 'Inbox not found' };
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('id');
    const isReadIdx = headers.indexOf('isRead');
    if (isReadIdx === -1) return { status: 'error', message: 'isRead column missing. Please re-initialize Sharbox.' };
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        sheet.getRange(i + 1, isReadIdx + 1).setValue(true);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Item not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * NEW: Delete Sharbox Record
 */
function deleteSharboxItem(id, type) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.SHARBOX);
    const sheet = ss.getSheetByName(type);
    if (!sheet) throw new Error("Sheet not found");
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf('id');
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id) {
        sheet.deleteRow(i + 1);
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Item not found' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}