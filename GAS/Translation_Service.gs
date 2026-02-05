
/**
 * XEENAPS PKM - TRANSLATION SERVICE (LINGVA ENGINE) - INDUSTRIAL GRADE
 * Menggunakan Lingva API dengan sistem Marker Unik {{XTn}} untuk preservasi tag HTML.
 * Versi stabil dengan Stray Dash & Markdown Artifact Sanitizer.
 */

function fetchTranslation(text, targetLang) {
  if (!text) return "";

  try {
    // 1. EKSTRAKSI TAG & PENGGANTIAN DENGAN MARKER UNIK (Resilient Placeholder)
    const preservedTags = [];
    const processedText = text.replace(/<[^>]+>/g, function(match) {
      const placeholder = "{{XT" + preservedTags.length + "}}";
      preservedTags.push(match);
      return placeholder;
    });

    // 2. CHUNKING LOGIC: 1000 karakter untuk stabilitas URI
    const MAX_CHUNK_LENGTH = 1000;
    const chunks = [];
    let currentChunk = "";
    
    const segments = processedText.split(/(\s+)/);
    for (let segment of segments) {
      if ((currentChunk + segment).length > MAX_CHUNK_LENGTH) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = segment;
      } else {
        currentChunk += segment;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const instances = [
      "https://lingva.ml/api/v1/auto/",
      "https://lingva.garudalinux.org/api/v1/auto/",
      "https://lingva.lunar.icu/api/v1/auto/"
    ];

    let translatedFull = "";

    // 3. PROSES TRANSLASI PER CHUNK
    for (let chunkText of chunks) {
      let chunkTranslated = "";
      let isSuccess = false;
      let lastError = "";

      for (let baseUrl of instances) {
        try {
          const url = baseUrl + targetLang + "/" + encodeURIComponent(chunkText);
          const response = UrlFetchApp.fetch(url, { 
            method: "get",
            muteHttpExceptions: true,
            timeout: 20000
          });

          if (response.getResponseCode() === 200) {
            const json = JSON.parse(response.getContentText());
            if (json.translation) {
              // ADVANCED SANITIZER: Hapus karakter dash/bintang/bullet yang sering ditambahkan engine secara liar
              chunkTranslated = json.translation.replace(/^[-\*\s•]+/gm, "").replace(/^[-]/gm, "");
              isSuccess = true;
              break;
            }
          }
          lastError = "Instance response: " + response.getResponseCode();
        } catch (e) {
          lastError = e.toString();
        }
      }

      if (!isSuccess) throw new Error("Chunk Fail: " + lastError);
      translatedFull += chunkTranslated + " ";
    }

    // 4. MARKER REPAIR & RESTORASI TAG
    let finalResult = translatedFull.trim();
    
    // REGEX: Bersihkan spasi di dalam kurung kurawal hasil translasi
    // Contoh: "{ { XT 0 } }" menjadi "{{XT0}}"
    finalResult = finalResult.replace(/\{\s*\{\s*XT\s*(\d+)\s*\}\s*\}/gi, "{{XT$1}}");

    // Kembalikan tag HTML asli
    preservedTags.forEach((tag, index) => {
      const marker = "{{XT" + index + "}}";
      finalResult = finalResult.split(marker).join(tag);
    });

    return finalResult;

  } catch (err) {
    console.error("Translation Engine Error: " + err.toString());
    return text;
  }
}
