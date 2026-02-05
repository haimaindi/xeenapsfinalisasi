import { BrainstormingItem, GASResponse, LibraryItem } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy } from './gasService';

/**
 * XEENAPS BRAINSTORMING SERVICE
 * Coordinates data persistence and AI synthesis for research incubation.
 */

export const fetchBrainstormingPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: BrainstormingItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getBrainstorming&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sortKey=${sortKey}&sortDir=${sortDir}`;
    const res = await fetch(url, { signal });
    const result = await res.json();
    return { 
      items: result.data || [], 
      totalCount: result.totalCount || 0 
    };
  } catch (error) {
    return { items: [], totalCount: 0 };
  }
};

export const saveBrainstorming = async (item: BrainstormingItem): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR OPTIMISTIC UI SYNC
  window.dispatchEvent(new CustomEvent('xeenaps-brainstorming-updated', { detail: item }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveBrainstorming', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteBrainstorming = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR OPTIMISTIC UI SYNC
  window.dispatchEvent(new CustomEvent('xeenaps-brainstorming-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteBrainstorming', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const synthesizeRoughIdea = async (roughIdea: string): Promise<Partial<BrainstormingItem> | null> => {
  const prompt = `ACT AS A SENIOR RESEARCH STRATEGIST.
  TRANSFORM THE FOLLOWING ROUGH IDEA INTO A STRUCTURED RESEARCH FRAMEWORK.
  
  ROUGH IDEA:
  "${roughIdea}"

  --- REQUIREMENTS ---
  1. RESPONSE MUST BE RAW JSON ONLY.
  2. LANGUAGE: ENGLISH BY DEFAULT.
  3. STRICT RULE: DO NOT USE the long dash character '—'. Use standard hyphens '-' instead.
  4. FIELDS TO FILL:
     - proposedTitle: High-impact academic title.
     - problemStatement: Concise justification of the study.
     - researchGap: What previous studies missed.
     - researchQuestion: Primary investigation question.
     - methodology: Proposed technical approach.
     - population: Targeted subjects or data sources.
     - keywords: Array of 5 core academic keywords.
     - pillars: Array of EXACTLY 10 main discussion pillars for the paper.

  EXPECTED JSON STRUCTURE:
  {
    "proposedTitle": "...",
    "problemStatement": "...",
    "researchGap": "...",
    "researchQuestion": "...",
    "methodology": "...",
    "population": "...",
    "keywords": ["...", "...", "...", "...", "..."],
    "pillars": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]
  }`;

  try {
    const response = await callAiProxy('gemini', prompt);
    if (!response) return null;
    let cleanJson = response.trim();
    if (cleanJson.includes('{')) {
      cleanJson = cleanJson.substring(cleanJson.indexOf('{'), cleanJson.lastIndexOf('}') + 1);
    }
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Idea synthesis failed:", e);
    return null;
  }
};

export const generateProposedAbstract = async (item: BrainstormingItem): Promise<string | null> => {
  const prompt = `ACT AS A SENIOR ACADEMIC WRITER.
  COMPOSE A FORMAL ACADEMIC ABSTRACT BASED ON THESE RESEARCH ELEMENTS:
  
  TITLE: ${item.proposedTitle}
  PROBLEM: ${item.problemStatement}
  GAP: ${item.researchGap}
  QUESTION: ${item.researchQuestion}
  METHODOLOGY: ${item.methodology}
  PILLARS: ${item.pillars.join(', ')}

  --- RULES ---
  - NO CONVERSATION. ONLY TEXT.
  - USE ACADEMIC TONE.
  - MAX 250 WORDS.
  - STRICT RULE: DO NOT USE the long dash character '—'. Use standard hyphens '-' instead.
  - RETURN PLAIN STRING.`;

  try {
    const response = await callAiProxy('gemini', prompt);
    return response ? response.trim() : null;
  } catch (e) {
    console.error("Abstract generation failed:", e);
    return null;
  }
};

export const getExternalRecommendations = async (item: BrainstormingItem): Promise<string[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'getBrainstormingRecommendations', 
        keywords: item.keywords,
        title: item.proposedTitle
      })
    });
    const result = await res.json();
    // Return all 10 items from OpenAlex
    return result.status === 'success' ? (result.external || []) : [];
  } catch (error) {
    return [];
  }
};

export const getInternalRecommendations = async (item: BrainstormingItem): Promise<LibraryItem[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    // Broadened Query for Fuzzy Logic: Combine Title and first 5 keywords
    const conceptualQuery = `${item.proposedTitle} ${(item.keywords || []).join(' ')}`.trim();
    const internalRes = await fetch(`${GAS_WEB_APP_URL}?action=getLibrary&page=1&limit=10&search=${encodeURIComponent(conceptualQuery)}&type=Literature&path=research`);
    const internalResult = await internalRes.json();
    return internalResult.data || [];
  } catch (error) {
    return [];
  }
};

export const translateBrainstormingFields = async (item: BrainstormingItem, targetLang: string): Promise<Partial<BrainstormingItem> | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'translateBrainstorming', 
        data: item,
        targetLang: targetLang
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};