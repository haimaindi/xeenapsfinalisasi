
import { ReviewItem, ReviewContent, ReviewMatrixRow, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS LITERATURE REVIEW SERVICE
 * In-Memory Sync Registry ensures instant cross-component consistency.
 */

// SESSION SINGLETON CACHE
const reviewUpdateCache = new Map<string, ReviewItem>();
const reviewDeletedRegistry = new Set<string>();

export const fetchReviewsPaginated = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ReviewItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getReviews&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sortKey=${sortKey}&sortDir=${sortDir}`;
    const res = await fetch(url, { signal });
    const result = await res.json();
    
    // MERGE SERVER DATA WITH SESSION MEMORY (DEFEATS LATENCY)
    const serverItems: ReviewItem[] = result.data || [];
    const mergedItems = serverItems
      .filter(item => !reviewDeletedRegistry.has(item.id))
      .map(item => {
        const cached = reviewUpdateCache.get(item.id);
        return cached ? { ...item, ...cached } : item;
      });

    return { 
      items: mergedItems, 
      totalCount: result.totalCount || 0 
    };
  } catch (error) {
    return { items: [], totalCount: 0 };
  }
};

export const fetchReviewContent = async (reviewJsonId: string, nodeUrl?: string): Promise<ReviewContent | null> => {
  if (!reviewJsonId) return null;
  try {
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return null;
    const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getFileContent&fileId=${reviewJsonId}`;
    const response = await fetch(finalUrl);
    if (!response.ok) throw new Error("Cloud access failed.");
    const result = await response.json();
    if (result.status === 'success' && result.content) {
      return JSON.parse(result.content);
    }
    return null;
  } catch (e) {
    console.error("fetchReviewContent error:", e);
    return null;
  }
};

export const saveReview = async (item: ReviewItem, content: ReviewContent): Promise<boolean> => {
  // 1. UPDATE SESSION MEMORY (INSTANT TRUTH)
  reviewUpdateCache.set(item.id, item);
  
  // 2. BROADCAST TO ACTIVE COMPONENTS
  window.dispatchEvent(new CustomEvent('xeenaps-review-updated', { detail: item }));

  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveReview', item, content })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
};

export const deleteReview = async (id: string): Promise<boolean> => {
  // 1. UPDATE SESSION MEMORY (BLOCKLIST)
  reviewDeletedRegistry.add(id);
  reviewUpdateCache.delete(id);
  
  // 2. BROADCAST TO ACTIVE COMPONENTS
  window.dispatchEvent(new CustomEvent('xeenaps-review-deleted', { detail: id }));

  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteReview', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
};

/**
 * AI Matrix Extraction: Memanggil proxy Groq khusus review
 */
export const runMatrixExtraction = async (
  collectionId: string, 
  centralQuestion: string
): Promise<{ answer: string, verbatim: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiReviewProxy', 
        subAction: 'extract',
        payload: { collectionId, centralQuestion }
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * AI Narrative Synthesis: Menggabungkan seluruh matrix menjadi narasi
 */
export const runReviewSynthesis = async (
  matrix: ReviewMatrixRow[], 
  centralQuestion: string
): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiReviewProxy', 
        subAction: 'synthesize',
        payload: { matrix, centralQuestion }
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

export const translateReviewRowContent = async (text: string, targetLang: string): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'translateReviewRow', text, targetLang })
    });
    const result = await res.json();
    return result.status === 'success' ? result.translated : null;
  } catch (e) {
    return null;
  }
};
