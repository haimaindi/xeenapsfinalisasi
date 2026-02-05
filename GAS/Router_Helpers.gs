/**
 * XEENAPS PKM - ROUTER HELPERS
 * RESTORES MISSING OPERATIONAL LOGIC FOR SHARDING, AI PROXY, AND EXTRACTION ROUTING.
 */

/**
 * getViableStorageTarget
 * Logic to determine if data should go to Master Drive or a registered Slave Storage Node.
 */
function getViableStorageTarget(threshold) {
  // 1. Check Master Drive first
  try {
    const masterQuota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
    const masterRemaining = parseInt(masterQuota.limit) - parseInt(masterQuota.usage);
    
    if (masterRemaining > threshold) {
      return {
        url: ScriptApp.getService().getUrl(),
        folderId: CONFIG.FOLDERS.MAIN_LIBRARY,
        isLocal: true
      };
    }
  } catch (e) { console.log("master quota check failed: " + e.toString()); }

  // 2. Check Slave Nodes from Registry
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.STORAGE_REGISTRY);
    const sheet = ss.getSheetByName(CONFIG.STORAGE.REGISTRY_SHEET);
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const nodeUrl = data[i][1];
      const nodeFolderId = data[i][2];
      const status = data[i][3];
      
      // STABILITY FIX: Use smarter URL parameter appending
      if (status === 'active' && nodeUrl) {
        try {
          const separator = nodeUrl.indexOf('?') === -1 ? '?' : '&';
          const res = UrlFetchApp.fetch(nodeUrl + separator + "action=checkQuota", { muteHttpExceptions: true });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success' && resJson.remaining > threshold) {
            return {
              url: nodeUrl,
              folderId: nodeFolderId,
              isLocal: false
            };
          }
        } catch (e) { console.log("node check failed: " + nodeUrl); }
      }
    }
  } catch (e) { console.log("registry check failed: " + e.toString()); }

  return null;
}

/**
 * routerUrlExtraction
 * Directs URL-based extraction to the appropriate specialized module.
 */
function routerUrlExtraction(url) {
  const driveId = getFileIdFromUrl(url);
  
  if (driveId && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
    return handleDriveExtraction(url, driveId);
  }
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return handleYoutubeExtraction(url);
  }
  
  return handleWebExtraction(url);
}

/**
 * handleAiRequest
 * Proxies AI requests to either Groq or Gemini based on user configuration.
 * MODIFIED: Added responseType parameter to support Text-Only mode for CV Architect.
 */
function handleAiRequest(provider, prompt, modelOverride, responseType) {
  if (!provider) return { status: 'error', message: 'No provider specified' };
  
  if (provider.toLowerCase() === 'groq') {
    if (responseType === 'text') {
      return callGroqCVGen(prompt, modelOverride);
    }
    return callGroqLibrarian(prompt, modelOverride);
  }
  return callGeminiService(prompt, modelOverride);
}

/**
 * extractYoutubeId
 * Helper to get video ID for embedding and metadata purposes.
 */
function extractYoutubeId(url) {
  let videoId = "";
  if (url.includes('youtu.be/')) {
    videoId = url.split('/').pop().split('?')[0];
  } else {
    const match = url.match(/v=([^&]+)/);
    videoId = match ? match[1] : "";
  }
  return videoId;
}