
import { ActivityItem, ActivityVaultItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS ACTIVITY SERVICE
 * Logic for Portfolio tracking and Sharded Documentation Vault.
 */

export const fetchActivitiesPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  startDate: string = "",
  endDate: string = "",
  type: string = "All",
  signal?: AbortSignal
): Promise<{ items: ActivityItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getActivities&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&startDate=${startDate}&endDate=${endDate}&type=${encodeURIComponent(type)}`;
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

export const saveActivity = async (item: ActivityItem): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-activity-updated', { detail: item }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveActivity', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteActivity = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;

  // SILENT BROADCAST FOR DASHBOARD
  window.dispatchEvent(new CustomEvent('xeenaps-activity-deleted', { detail: id }));

  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteActivity', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * Helper to permanently delete a file from a specific storage node
 */
export const deleteRemoteFile = async (fileId: string, nodeUrl: string): Promise<boolean> => {
  try {
    const res = await fetch(nodeUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteRemoteFiles', fileIds: [fileId] })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * SHARDING: Fetch Vault JSON Content from Storage Node
 */
export const fetchVaultContent = async (vaultJsonId: string, nodeUrl?: string): Promise<ActivityVaultItem[]> => {
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
 * SHARDING: Update Vault JSON Content on Storage Node
 */
export const updateVaultContent = async (
  activityId: string, 
  vaultJsonId: string, 
  content: ActivityVaultItem[], 
  nodeUrl?: string
): Promise<{ success: boolean, newVaultId?: string, newNodeUrl?: string }> => {
  try {
    let targetUrl = nodeUrl || GAS_WEB_APP_URL!;
    
    // If we don't have a vault yet, ask the backend for a sharding target first
    if (!vaultJsonId && !nodeUrl) {
      const quotaRes = await fetch(`${GAS_WEB_APP_URL}?action=checkQuota`);
      const quotaData = await quotaRes.json();
      // Quota management is handled on GAS side via action: 'saveJsonFile' logic 
      // but we ensure we are hitting the master first to let it decide if it needs to proxy.
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveJsonFile', 
        fileId: vaultJsonId, 
        fileName: `vault_${activityId}.json`,
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

/**
 * Dynamic Sharded Binary Upload for Vault
 * Returns both fileId and nodeUrl where the file was actually stored
 */
export const uploadVaultFile = async (file: File): Promise<{ fileId: string, nodeUrl: string } | null> => {
  if (!GAS_WEB_APP_URL) return null;
  
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  try {
    const response = await fetch(GAS_WEB_APP_URL, { 
      method: 'POST', 
      body: JSON.stringify({ 
        action: 'vaultFileUpload', 
        fileData: base64Data, 
        fileName: file.name, 
        mimeType: file.type 
      })
    });
    const result = await response.json();
    return result.status === 'success' ? { fileId: result.fileId, nodeUrl: result.nodeUrl } : null;
  } catch (e) {
    return null;
  }
};
