
import { ResearchProject, ResearchSource, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS RESEARCH SERVICE
 * Hub for Project-based Gap Analysis Management
 */

export const fetchResearchProjects = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ResearchProject[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getResearchProjects&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sortKey=${sortKey}&sortDir=${sortDir}`;
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

export const saveResearchProject = async (project: ResearchProject): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveResearchProject', project })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteResearchProject = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteResearchProject', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const fetchProjectSources = async (projectId: string): Promise<ResearchSource[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=getProjectSources&projectId=${projectId}`;
    const res = await fetch(url);
    const result = await res.json();
    return result.data || [];
  } catch (e) {
    return [];
  }
};

export const saveProjectSource = async (source: ResearchSource): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveProjectSource', source })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteProjectSource = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteProjectSource', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};
