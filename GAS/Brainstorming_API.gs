/**
 * XEENAPS PKM - BRAINSTORMING API MODULE
 * Specialized for deep research recommendations.
 */

function getBrainstormingDeepRecommendations(keywords, title) {
  try {
    const externalRefs = fetchOpenAlexRecommendations(keywords);
    const youtubeUrl = getYoutubeRecommendation(keywords);
    
    // Internal Relevance via Tokenized Search
    const searchQuery = (keywords && keywords.length > 0) ? keywords.slice(0, 3).join(' ') : title;
    const libraryResult = getPaginatedItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections", 1, 10, searchQuery, "Literature", "research");

    return {
      status: 'success',
      external: externalRefs,
      youtube: youtubeUrl,
      internal: libraryResult.items
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Fetch 10 related citations from OpenAlex API
 */
function fetchOpenAlexRecommendations(keywords) {
  if (!keywords || keywords.length === 0) return [];
  
  const query = keywords.slice(0, 3).join(" ");
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=10&filter=type:article`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];
    
    const data = JSON.parse(response.getContentText());
    const results = data.results || [];
    
    return results.map(item => {
      const authors = (item.authorships || []).map(a => a.author.display_name);
      let authorStr = authors.length > 2 
        ? authors[0] + " et al." 
        : (authors.join(" and ") || "Anon.");
        
      const year = item.publication_year || "n.d.";
      const title = item.title || "Untitled";
      const journal = item.primary_location?.source?.display_name || "Academic Source";
      const doi = item.doi || "";

      // Assemble Harvard Citation
      let bib = `${authorStr} (${year}). ${title}. <i>${journal}</i>.`;
      if (doi) bib += ` Available at: ${doi}`;
      return bib.replace(/—/g, '-').trim();
    });
  } catch (e) {
    console.error("OpenAlex search failed: " + e.toString());
    return [];
  }
}