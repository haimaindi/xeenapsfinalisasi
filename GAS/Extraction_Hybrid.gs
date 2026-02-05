
/**
 * XEENAPS PKM - HYBRID EXTRACTION MODULE
 * Mengambil 5.000 karakter awal dan 5.000 karakter akhir dokumen.
 */

function getHybridSnippet(fileId, nodeUrl) {
  const myUrl = ScriptApp.getService().getUrl();
  const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;
  let fullText = "";

  try {
    if (isLocal) {
      const file = DriveApp.getFileById(fileId);
      const content = JSON.parse(file.getBlob().getDataAsString());
      fullText = content.fullText || "";
    } else {
      const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + fileId);
      const resJson = JSON.parse(remoteRes.getContentText());
      if (resJson.status === 'success') {
        const content = JSON.parse(resJson.content);
        fullText = content.fullText || "";
      }
    }

    if (!fullText || fullText.trim() === "") return "";

    const intro = fullText.substring(0, 5000);
    const conclusion = fullText.length > 5000 
      ? fullText.substring(fullText.length - 5000) 
      : "";

    return `[START_OF_DOCUMENT_INTRO]\n${intro}\n[END_OF_INTRO]\n\n` +
           `[START_OF_DOCUMENT_CONCLUSION]\n${conclusion}\n[END_OF_CONCLUSION]`;
  } catch (e) {
    console.error("Hybrid extraction failed: " + e.toString());
    return "";
  }
}