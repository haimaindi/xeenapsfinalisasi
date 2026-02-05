/**
 * XEENAPS PKM - UTILITIES
 */

function createJsonResponse(data) {
  // Menggunakan MimeType.TEXT untuk menghindari kendala CORS pada browser tertentu saat proses redirect GAS.
  // Konten tetap berupa string JSON yang valid sehingga response.json() di frontend tetap berfungsi.
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Decode HTML entities like &amp;, &quot;, &#39;, etc. into normal characters.
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string' || !text.includes('&')) return text;
  try {
    // Robust mapping for common academic metadata entities
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&ndash;': '-',
      '&mdash;': '-',
      '&reg;': '®',
      '&copy;': '©'
    };
    return text.replace(/&[a-z0-9#]+;/gi, (match) => {
      const lower = match.toLowerCase();
      if (entities[lower]) return entities[lower];
      // Handle numeric entities
      if (match.startsWith('&#')) {
        const num = match.includes('x') 
          ? parseInt(match.slice(3, -1), 16) 
          : parseInt(match.slice(2, -1), 10);
        return !isNaN(num) ? String.fromCharCode(num) : match;
      }
      return match;
    });
  } catch (e) {
    return text;
  }
}

function getKeysFromSheet(sheetName, colIndex) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    // colIndex 2 = Column B
    return sheet.getRange(2, colIndex, lastRow - 1, 1).getValues().map(r => r[0]).filter(k => k);
  } catch (e) { return []; }
}

function getProviderModel(providerName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.AI_CONFIG);
    const sheet = ss.getSheetByName('AI');
    if (!sheet) return { model: getDefaultModel(providerName) };
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim().toUpperCase() === providerName.toUpperCase()) {
        const val = data[i][1] ? data[i][1].toString().trim() : "";
        return { model: val || getDefaultModel(providerName) };
      }
    }
  } catch (e) {
    console.log("getProviderModel Error: " + e.toString());
  }
  return { model: getDefaultModel(providerName) };
}

function getDefaultModel(provider) {
  const p = provider.toUpperCase();
  if (p === 'GEMINI') return 'gemini-1.5-pro';
  if (p === 'GROQ') return 'meta-llama/llama-4-scout-17b-16e-instruct';
  return '';
}

function getScrapingAntKey() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName("Scraping");
    return sheet ? sheet.getRange("A1").getValue().toString().trim() : null;
  } catch (e) { return null; }
}