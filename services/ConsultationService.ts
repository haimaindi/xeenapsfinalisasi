
import { ConsultationItem, ConsultationAnswerContent } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS CONSULTATION SERVICE
 * Hub for AI DeepSeek-R1 (Reasoning) Knowledge Partner.
 */

export const fetchRelatedConsultations = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = "",
  signal?: AbortSignal
): Promise<{ items: ConsultationItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getConsultations&collectionId=${collectionId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
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
 * Proxy call to DeepSeek-R1 reasoning model
 */
export const callAiConsult = async (
  collectionId: string,
  question: string
): Promise<{ answer: string, reasoning: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiConsultProxy',
        collectionId,
        question
      })
    });
    const result = await res.json();
    if (result.status === 'success') {
      return { 
        answer: result.data,
        reasoning: result.reasoning 
      };
    }
    throw new Error(result.message || "Consultation engine failed");
  } catch (error) {
    console.error("AI Consult Error:", error);
    return null;
  }
};

/**
 * PERSISTENCE: Save Consultation metadata and shard JSON answer.
 * Supports TOTAL REWRITE if answerJsonId is already present.
 */
export const saveConsultation = async (
  item: ConsultationItem,
  answerContent: ConsultationAnswerContent
): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveConsultation', 
        item, 
        answerContent 
      })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
};

export const deleteConsultation = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteConsultation', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
};
