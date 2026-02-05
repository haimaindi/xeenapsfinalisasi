/**
 * XEENAPS PKM - WEB EXTRACTION MODULE
 */

function handleWebExtraction(url) {
  // LAYER 1: Native Fetch (Primary)
  let nativeContent = "";
  try {
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      if (!isBlocked(html)) {
        const metadata = extractWebMetadata(html);
        const body = cleanHtml(html);
        nativeContent = metadata + "\n\n" + body;
        if (body.length > 200) return nativeContent;
      }
    }
  } catch (e) { console.log("Native fetch error: " + e.message); }

  // LAYER 2: ScrapingAnt (Backup for hard blocks)
  const saKey = getScrapingAntKey();
  if (saKey) {
    try {
      const saUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${saKey}`;
      const response = UrlFetchApp.fetch(saUrl, { muteHttpExceptions: true });
      const html = response.getContentText();
      
      if (response.getResponseCode() === 200 && !isBlocked(html)) {
        return extractWebMetadata(html) + "\n\n" + cleanHtml(html);
      }
    } catch (e) { console.log("ScrapingAnt failed: " + e.message); }
  }

  if (nativeContent && nativeContent.length > 50) return nativeContent;
  throw new Error("All web extraction methods failed for this URL.");
}

function extractWebMetadata(html) {
  let metaInfo = "";
  
  // Basic Title/Author/Publisher
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) metaInfo += `WEBSITE_TITLE: ${decodeHtmlEntities(titleMatch[1].trim())}\n`;

  // Robust Metadata Mapping for Academic & General Web
  const metaMappings = [
    { name: 'citation_doi', label: 'PRIMARY_DOI' },
    { name: 'dc.identifier', label: 'PRIMARY_DOI' },
    { name: 'prism.doi', label: 'PRIMARY_DOI' },
    { name: 'doi', label: 'PRIMARY_DOI' },
    { name: 'citation_title', label: 'WEBSITE_TITLE' },
    { name: 'citation_author', label: 'WEBSITE_AUTHOR' },
    { name: 'citation_publisher', label: 'WEBSITE_PUBLISHER' },
    { name: 'og:title', label: 'WEBSITE_TITLE' },
    { name: 'og:site_name', label: 'WEBSITE_PUBLISHER' },
    { property: 'og:title', label: 'WEBSITE_TITLE' },
    { property: 'og:site_name', label: 'WEBSITE_PUBLISHER' }
  ];

  metaMappings.forEach(map => {
    const attr = map.name ? `name=["']${map.name}["']` : `property=["']${map.property}["']`;
    const regex1 = new RegExp(`<meta[^>]*${attr}[^>]*content=["']([^"']+)["']`, 'i');
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attr}`, 'i');
    
    const match = html.match(regex1) || html.match(regex2);
    if (match && !metaInfo.includes(map.label)) {
      metaInfo += `${map.label}: ${decodeHtmlEntities(match[1].trim())}\n`;
    }
  });

  return metaInfo;
}

function isBlocked(text) {
  if (!text || text.length < 200) return true;
  const criticalBlocked = ["access denied", "cloudflare", "security check", "captcha", "bot detection", "robot check"];
  const textLower = text.toLowerCase();
  if (text.length < 1500) {
     return criticalBlocked.some(keyword => textLower.includes(keyword));
  }
  return false;
}

function cleanHtml(html) {
  return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
             .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
             .replace(/<[^>]*>/g, " ")
             .replace(/\s+/g, " ")
             .trim();
}