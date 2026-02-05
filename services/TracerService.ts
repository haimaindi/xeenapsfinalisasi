import { TracerProject, TracerLog, TracerReference, TracerReferenceContent, TracerQuote, TracerTodo, TracerFinanceItem, TracerFinanceContent, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS TRACER SERVICE
 * Managing Research Audit Trails, Heatmaps, and AI-Powered Reference Quoting.
 */

export const fetchTracerProjects = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  signal?: AbortSignal
): Promise<{ items: TracerProject[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getTracerProjects&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
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

export const saveTracerProject = async (item: TracerProject): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD & MAIN LIST
  window.dispatchEvent(new CustomEvent('xeenaps-tracer-updated', { detail: item }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveTracerProject', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteTracerProject = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD & MAIN LIST
  window.dispatchEvent(new CustomEvent('xeenaps-tracer-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTracerProject', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const fetchTracerLogs = async (projectId: string): Promise<TracerLog[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=getTracerLogs&projectId=${projectId}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.data || [];
  } catch (e) {
    return [];
  }
};

export const saveTracerLog = async (item: TracerLog, content: { description: string }): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveTracerLog', item, content })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteTracerLog = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTracerLog', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const fetchTracerReferences = async (projectId: string): Promise<TracerReference[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=getTracerReferences&projectId=${projectId}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.data || [];
  } catch (e) {
    return [];
  }
};

export const linkTracerReference = async (item: Partial<TracerReference>): Promise<TracerReference | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'linkTracerReference', item })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

export const unlinkTracerReference = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'unlinkTracerReference', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * SHARDING: Reference Content (Quotes) Management
 */
export const fetchReferenceContent = async (contentJsonId: string, nodeUrl?: string): Promise<TracerReferenceContent | null> => {
  if (!contentJsonId) return null;
  try {
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return null;
    const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getFileContent&fileId=${contentJsonId}`;
    const response = await fetch(finalUrl);
    const result = await response.json();
    return result.status === 'success' ? JSON.parse(result.content) : null;
  } catch (e) {
    return null;
  }
};

export const saveReferenceContent = async (item: TracerReference, content: TracerReferenceContent): Promise<{contentJsonId: string, storageNodeUrl: string} | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveReferenceContent', item, content })
    });
    const result = await res.json();
    return result.status === 'success' ? { contentJsonId: result.contentJsonId, storageNodeUrl: result.storageNodeUrl } : null;
  } catch (e) {
    return null;
  }
};

/**
 * TODO SERVICE: Manage Tasks within Projects
 */
export const fetchTracerTodos = async (projectId: string): Promise<TracerTodo[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=getTracerTodos&projectId=${projectId}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.data || [];
  } catch (e) {
    return [];
  }
};

export const saveTracerTodo = async (item: TracerTodo): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  
  // SILENT BROADCAST FOR DASHBOARD & NOTIFICATIONS
  window.dispatchEvent(new CustomEvent('xeenaps-todo-updated', { detail: item }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveTracerTodo', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteTracerTodo = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST
  window.dispatchEvent(new CustomEvent('xeenaps-todo-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTracerTodo', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * FINANCE SERVICE: Manage Financial Records
 */
export const fetchTracerFinance = async (projectId: string, startDate = "", endDate = "", search = ""): Promise<TracerFinanceItem[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=getTracerFinance&projectId=${projectId}&startDate=${startDate}&endDate=${endDate}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.data || [];
  } catch (e) {
    return [];
  }
};

export const fetchFinanceExportData = async (projectId: string): Promise<any[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=getFinanceExportData&projectId=${projectId}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (e) {
    return [];
  }
};

/**
 * NEW: Premium Export Service (Direct PDF Stream)
 * REMOVED: Excel format as per request.
 * ADDED: Return structure for Base64 binary.
 */
export const exportFinanceLedger = async (projectId: string, currency: string): Promise<{ base64: string, filename: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    // Force format=pdf for direct public download logic
    const url = `${GAS_WEB_APP_URL}?action=generateFinanceExport&projectId=${projectId}&format=pdf&currency=${encodeURIComponent(currency)}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.status === 'success' ? { base64: result.base64, filename: result.filename } : null;
  } catch (e) {
    return null;
  }
};

export const saveTracerFinance = async (item: TracerFinanceItem, content: TracerFinanceContent): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveTracerFinance', item, content })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteTracerFinance = async (id: string): Promise<GASResponse<any>> => {
  if (!GAS_WEB_APP_URL) return { status: 'error' };
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTracerFinance', id })
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
};

/**
 * AI TRACER: Quote Extraction via Groq (Multi-Quote v2)
 */
export const extractTracerQuotes = async (collectionId: string, contextQuery: string): Promise<Array<{ originalText: string; enhancedText: string }> | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiTracerProxy', 
        subAction: 'extractQuote', 
        payload: { collectionId, contextQuery } 
      })
    });
    const result = await res.json();
    // Expected return is an array of objects
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * AI TRACER: Single Academic Enhancement via Groq
 */
export const enhanceTracerQuote = async (originalText: string, citation: string): Promise<string | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiTracerProxy', 
        subAction: 'enhanceQuote', 
        payload: { originalText, citation } 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};