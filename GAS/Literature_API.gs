/**
 * XEENAPS PKM - GLOBAL LITERATURE SEARCH PROXY (OPENALEX & OPEN LIBRARY EDITION)
 * Memproses pencarian ke OpenAlex dan Open Library (bypass CORS) serta terjemahan via Lingva.
 */

function handleGlobalArticleSearch(params) {
  const query = params.query || "";
  const yearStart = params.yearStart;
  const yearEnd = params.yearEnd;

  // 1. TERJEMAHAN OTOMATIS VIA LINGVA (Target: EN)
  let searchTerms = query;
  try {
    const translated = lingvaTranslateQuery(query);
    if (translated) {
      searchTerms = translated;
    }
  } catch (e) {
    console.log("Lingva Engine Error: " + e.toString());
  }

  // 2. PENYUSUNAN PARAMETER OPENALEX
  let limit = params.limit || 12;
  let openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(searchTerms)}&per_page=${limit}`;
  
  if (yearStart && yearEnd) {
    openAlexUrl += `&filter=publication_year:${yearStart}-${yearEnd}`;
  } else if (yearStart) {
    openAlexUrl += `&filter=publication_year:${yearStart}-2026`;
  }

  try {
    const response = UrlFetchApp.fetch(openAlexUrl, { 
      muteHttpExceptions: true,
      headers: { "Accept": "application/json" }
    });
    
    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      return { 
        status: 'error', 
        message: 'OpenAlex API Error (' + responseCode + '): ' + response.getContentText() 
      };
    }

    const result = JSON.parse(response.getContentText());
    
    const mappedData = (result.results || []).map(item => ({
      paperId: item.id,
      title: item.display_name || "Untitled",
      authors: (item.authorships || []).map(a => ({ name: a.author.display_name })),
      year: item.publication_year || null,
      doi: item.doi ? item.doi.replace('https://doi.org/', '') : "",
      url: item.doi || item.ids?.openalex || "",
      venue: item.primary_location?.source?.display_name || "Academic Source",
      citationCount: item.cited_by_count || 0,
      abstract: "" 
    }));

    return { 
      status: 'success', 
      data: mappedData,
      translatedQuery: searchTerms !== query ? searchTerms : null
    };
  } catch (err) {
    return { status: 'error', message: 'Literature Search Proxy Error: ' + err.toString() };
  }
}

/**
 * NEW: handleGlobalBookSearch via Open Library API
 */
function handleGlobalBookSearch(params) {
  const query = params.query || "";
  const yearStart = params.yearStart;
  const yearEnd = params.yearEnd;

  // 1. Translation Engine
  let searchTerms = query;
  try {
    const translated = lingvaTranslateQuery(query);
    if (translated) searchTerms = translated;
  } catch (e) {}

  // 2. Open Library Search URL
  let limit = params.limit || 12;
  let olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerms)}&limit=${limit}`;
  
  // Year filter is handled by Open Library via specific query params if needed, 
  // but usually q=title+first_publish_year:[1990+TO+2000] works.
  if (yearStart && yearEnd) {
    olUrl += `&first_publish_year:[${yearStart}+TO+${yearEnd}]`;
  }

  try {
    const response = UrlFetchApp.fetch(olUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      return { status: 'error', message: 'Open Library unreachable.' };
    }

    const result = JSON.parse(response.getContentText());
    
    const mappedData = (result.docs || []).map(item => ({
      paperId: item.key, // Using Open Library Key
      title: item.title || "Untitled Book",
      authors: (item.author_name || []).map(name => ({ name })),
      year: item.first_publish_year || null,
      isbn: (item.isbn || [])[0] || "",
      url: `https://openlibrary.org${item.key}`,
      venue: (item.publisher || [])[0] || "Global Publisher",
      citationCount: 0, // Not provided by OL Search directly
      abstract: ""
    }));

    return { status: 'success', data: mappedData };
  } catch (err) {
    return { status: 'error', message: 'Book Search Proxy Error: ' + err.toString() };
  }
}

/**
 * Lingva Engine - Khusus untuk pencarian Query
 */
function lingvaTranslateQuery(text) {
  if (!text) return "";
  
  const instances = [
    "https://lingva.ml/api/v1/auto/en/",
    "https://lingva.garudalinux.org/api/v1/auto/en/",
    "https://lingva.lunar.icu/api/v1/auto/en/"
  ];

  for (let baseUrl of instances) {
    try {
      const url = baseUrl + encodeURIComponent(text);
      const res = UrlFetchApp.fetch(url, { 
        muteHttpExceptions: true, 
        timeoutInSeconds: 10 
      });
      
      if (res.getResponseCode() === 200) {
        const json = JSON.parse(res.getContentText());
        return json.translation || text;
      }
    } catch (e) {
      console.log("Instance failure: " + baseUrl);
    }
  }
  return text; 
}