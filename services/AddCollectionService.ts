import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";
import { GAS_WEB_APP_URL } from "../constants";

/**
 * AddCollectionService - Metadata Extraction via AI Proxy (GROQ).
 * FOCUS: Verbatim abstract extraction, Parenthetical Harvard citations, and mandatory classification enrichment.
 * IMPORTANT: This service acts ONLY as a Librarian. It does NOT fill Insight fields (Summary, Strength, etc.).
 */
export const extractMetadataWithAI = async (textSnippet: string, existingData: Partial<LibraryItem> = {}, signal?: AbortSignal): Promise<Partial<LibraryItem>> => {
  try {
    const truncatedSnippet = textSnippet.substring(0, 7500);

    const categories = [
      "Algorithm", "Blog Post", "Book", "Book Chapter", "Business Report", "Case Report", "Case Series", 
      "Checklist", "Checklist Model", "Clinical Guideline", "Conference Paper", "Course Module", "Dataset", 
      "Dissertation", "Exam Bank", "Form", "Framework", "Guideline (Non-Clinical)", "Idea Draft", "Image", 
      "Infographic", "Journal Entry", "Lecture Note", "Magazine Article", "Manual", "Meeting Note", "Memo", 
      "Meta-analysis", "Mindmap", "Model", "Newspaper Article", "Original Research", "Podcast", "Policy Brief", 
      "Preprint", "Presentation Slide", "Proceedings", "Project Document", "Proposal", "Protocol", "Rapid Review", 
      "Reflection", "Review Article", "Scoping Review", "Standard Operating Procedure (SOP)", "Study Guide", 
      "Syllabus", "Summary", "Systematic Review", "Teaching Material", "Technical Report", "Template", "Thesis", 
      "Toolkit", "Video", "Web Article", "Webpage Snapshot", "White Paper", "Working Paper", "Other"
    ];

    const prompt = `ACT AS AN EXPERT SENIOR ACADEMIC LIBRARIAN (XEENAPS AI LIBRARIAN). 
    YOUR TASK IS TO ORGANIZE AND CLEAN THE METADATA FOR A LIBRARY ENTRY BASED ON THE PROVIDED TEXT.

    --- ROBUST MANDATORY WORKFLOW ---
    1. LIBRARIAN ROLE: Identify Title, Authors, Publisher, Year, and technical identifiers.
    2. GAP-FILLING: Use "EXISTING_DATA" as core facts. Fill ONLY fields that are empty ("") or "N/A".
    3. MANDATORY CLASSIFICATION (CRITICAL):
       - KEYWORDS: You MUST provide EXACTLY 7 relevant keywords.
       - LABELS: You MUST provide EXACTLY 5 thematic labels.
       - TOPIC & SUBTOPIC: You MUST determine a high-level Topic and a specific Sub-Topic.
       - CATEGORY: You MUST analyze the content and CHOOSE EXACTLY ONE CATEGORY FROM THE APPROVED LIST BELOW. YOU MUST PICK THE ONE THAT BEST DESCRIBES THE CONTENT. DO NOT CREATE NEW CATEGORIES.
    4. YOUTUBE SPECIAL HANDLING (CRITICAL):
       - If the TEXT SNIPPET contains "YOUTUBE_METADATA:", you MUST:
         * Set "publisher" to "Youtube" verbatim.
         * Set "category" to "Video" verbatim.
         * Extract the Channel name and put it as the ONLY entry in the "authors" array.
         * Extract the upload date to fill "year" (YYYY) and "fullDate" (DD MMM YYYY).
    5. VERBATIM ABSTRACT (CRITICAL):
       - EXTRACT the PROPER abstract exactly as written in the "TEXT SNIPPET". PROPER AND ACCURATE ABSTRACT SHOULD BE IDENTIFIED WITH EXACTLY WORD OF "ABSTRACT" then followed by the abstract content. 
       - DO NOT SUMMARIZE OR PARAPHRASE.
       - FORMATTING: Use <b> tag for sub-headers and <br/> for line breaks.
       - EMPHASIS: Use <b><i> tags for key findings.
       - IF PROPER ABSTRACT FORMAT IS CAN NOT BE IDENTIFIED BECAUSE OF ERROR OR NO SINGLE WORD "ABSTRACT" is FOUND. DO NOT RETURN RAW DATA OR HALUCINATION DATA BUT RETURN EMPTY.
    6. SMART INDEXING (mainInfo - CRITICAL):
       - Analyze the "TEXT SNIPPET" and all data in "EXISTING_DATA".
       - Create a list of Technical Nouns, Scientific Terms, and Key Concepts.
       - STRICT FILTRATION: Remove all Verbs, Conjunctions, Irrelevant characters, Person Names, and general/common words.
       - LENGTH: Max 1000 characters of clean, space-separated terms. This is used for Smart Searching.
    7. STRICT RULE: DO NOT fill "summary", "strength", "weakness", "researchMethodology", "unfamiliarTerminology", "supportingReferences", "videoRecommendation", or "quickTipsForYou".
    8. NO HTML ENTITIES (CRITICAL): ALWAYS output human-readable literal characters. DO NOT use HTML entities like &amp;, &quot;, &lt;, or &gt; in your JSON values. Convert them to their literal character equivalents (e.g., use "&" instead of "&amp;").
    --------------------------

    APPROVED CATEGORY LIST:
    ${categories.join(", ")}

    EXISTING_DATA:
    ${JSON.stringify(existingData)}

    TEXT SNIPPET:
    ${truncatedSnippet}

    EXPECTED JSON OUTPUT (RAW JSON ONLY):
    {
      "title": "Official Title",
      "authors": ["Author 1", "Author 2"],
      "year": "YYYY",
      "publisher": "Publisher Name",
      "doi": "DOI",
      "isbn": "ISBN",
      "issn": "ISSN",
      "pmid": "PMID",
      "arxivId": "arXiv ID",
      "journalName": "Journal Name",
      "volume": "Vol",
      "issue": "No",
      "pages": "pp-pp",
      "category": "Must choose exactly from the Approved List provided above.",
      "topic": "General Topic",
      "subTopic": "Specific Sub-Topic",
      "abstract": "HTML formatted verbatim abstract",
      "mainInfo": "Clean technical noun-based index string (Max 1000 chars)",
      "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7"],
      "labels": ["label1", "label2", "label3", "label4", "label5"]
    }`;

    const response = await callAiProxy('groq', prompt, undefined, signal);
    if (!response) return {};
    
    let cleanJson = response.trim();
    if (cleanJson.includes('{')) {
      const start = cleanJson.indexOf('{');
      const end = cleanJson.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanJson = cleanJson.substring(start, end + 1);
    }

    try {
      const parsed = JSON.parse(cleanJson);
      const merged: any = { ...parsed };
      Object.keys(existingData).forEach(key => {
        const val = (existingData as any)[key];
        
        // Priority logic: Category and mainInfo are strictly AI territory.
        if (key === 'category' || key === 'mainInfo') return;

        if (val && val !== "" && val !== "N/A" && (!Array.isArray(val) || val.length > 0)) {
          merged[key] = val;
        }
      });

      // SYNC GUARD: Fetch Supporting References as part of the PRIMARY workflow
      if (merged.keywords && merged.keywords.length > 0) {
        try {
          const refRes = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ 
              action: 'getSupportingReferences', 
              keywords: merged.keywords 
            }),
            signal
          });
          const refData = await refRes.json();
          if (refData.status === 'success' && refData.data) {
            merged.supportingReferences = {
              references: refData.data.references || [],
              videoUrl: refData.data.videoUrl || ""
            };
          }
        } catch (e) {
          console.warn("Supporting data fetch failed, continuing with partial metadata:", e);
        }
      }

      return merged;
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return {};
    }
  } catch (error) {
    console.error('Extraction Failed:', error);
    return {};
  }
};