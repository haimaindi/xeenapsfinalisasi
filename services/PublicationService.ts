
import { PublicationItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS PUBLICATION SERVICE
 */

export const fetchPublicationsPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: PublicationItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getPublication&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sortKey=${sortKey}&sortDir=${sortDir}`;
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

export const savePublication = async (item: PublicationItem): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-publication-updated', { detail: item }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'savePublication', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deletePublication = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-publication-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deletePublication', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};
