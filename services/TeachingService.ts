
import { TeachingItem, TeachingVaultItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS TEACHING SERVICE
 * Pure data management for Lecturer BKD compliance and Documentation Vault.
 */

export const fetchTeachingPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  signal?: AbortSignal
): Promise<{ items: TeachingItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getTeaching&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
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

export const saveTeachingItem = async (item: TeachingItem): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  
  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-teaching-updated', { detail: item }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveTeaching', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteTeachingItem = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-teaching-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteTeaching', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * VAULT: Fetch Teaching Documentation Vault
 */
export const fetchTeachingVaultContent = async (vaultJsonId: string, nodeUrl?: string): Promise<TeachingVaultItem[]> => {
  if (!vaultJsonId) return [];
  try {
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return [];
    const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getFileContent&fileId=${vaultJsonId}`;
    const response = await fetch(finalUrl);
    const result = await response.json();
    return result.status === 'success' ? JSON.parse(result.content) : [];
  } catch (e) {
    return [];
  }
};

/**
 * VAULT: Update Teaching Vault JSON
 */
export const updateTeachingVaultContent = async (
  teachingId: string, 
  vaultJsonId: string, 
  content: TeachingVaultItem[], 
  nodeUrl?: string
): Promise<{ success: boolean, newVaultId?: string, newNodeUrl?: string }> => {
  try {
    let targetUrl = nodeUrl || GAS_WEB_APP_URL!;
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveJsonFile', 
        fileId: vaultJsonId, 
        fileName: `teaching_vault_${teachingId}.json`,
        content: JSON.stringify(content) 
      })
    });
    const result = await res.json();
    return { 
      success: result.status === 'success', 
      newVaultId: result.fileId,
      newNodeUrl: targetUrl 
    };
  } catch (e) {
    return { success: false };
  }
};
