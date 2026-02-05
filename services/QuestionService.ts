
import { QuestionItem, BloomsLevel, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS QUESTION BANK SERVICE
 */

export const fetchRelatedQuestions = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = "",
  bloomFilter: string = "All",
  signal?: AbortSignal
): Promise<{ items: QuestionItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getQuestionsByCollection&collectionId=${collectionId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&bloomFilter=${encodeURIComponent(bloomFilter)}`;
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

/**
 * Fetch All Questions (Global) with Filtering, Sorting, and Pagination
 */
export const fetchAllQuestionsPaginated = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  bloomFilter: string = "All",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: QuestionItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getAllQuestions&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}&bloomFilter=${encodeURIComponent(bloomFilter)}&sortKey=${sortKey}&sortDir=${sortDir}`;
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

export const generateQuestionsWorkflow = async (
  config: {
    collectionId: string;
    extractedJsonId: string;
    nodeUrl?: string;
    bloomLevel: BloomsLevel;
    count: number;
    additionalContext: string;
    language: string;
  }
): Promise<QuestionItem[] | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'generateQuestionsAI',
        ...config
      })
    });
    const result = await res.json();
    
    if (result.status === 'success' && Array.isArray(result.data)) {
      // SILENT BROADCAST FOR EACH GENERATED QUESTION
      result.data.forEach((q: QuestionItem) => {
        window.dispatchEvent(new CustomEvent('xeenaps-question-updated', { detail: q }));
      });
      return result.data;
    }
    return null;
  } catch (error) {
    console.error("Question Generation Error:", error);
    return null;
  }
};

/**
 * NEW: Save or Update a single question record (Manual Entry) with SILENT BROADCAST
 */
export const saveQuestionRecord = async (item: QuestionItem): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveQuestion', item })
    });
    const result = await res.json();
    
    if (result.status === 'success') {
      window.dispatchEvent(new CustomEvent('xeenaps-question-updated', { detail: item }));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Delete Question with SILENT BROADCAST
 */
export const deleteQuestion = async (id: string): Promise<boolean> => {
  // SILENT BROADCAST FOR REAL-TIME SYNC & CASCADE CLEANUP
  window.dispatchEvent(new CustomEvent('xeenaps-question-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL!, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteQuestionRecord', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};
