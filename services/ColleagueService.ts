
import { ColleagueItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS COLLEAGUE SERVICE
 * Pure data management for Professional Network with Server-Side processing.
 */

export const fetchColleaguesPaginated = async (
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "name",
  sortDir: string = "asc",
  signal?: AbortSignal
): Promise<{ items: ColleagueItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getColleagues&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sortKey=${sortKey}&sortDir=${sortDir}`;
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

export const saveColleague = async (item: ColleagueItem): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveColleague', item })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteColleague = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteColleague', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * Dynamic Sharded Binary Upload for Colleague Photos
 */
export const uploadColleaguePhoto = async (file: File): Promise<{ photoUrl: string, fileId: string, nodeUrl: string } | null> => {
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
        action: 'vaultFileUpload', // Reusing dynamic sharding logic from Activity Vault
        fileData: base64Data, 
        fileName: `colleague_${Date.now()}_${file.name}`, 
        mimeType: file.type 
      })
    });
    const result = await response.json();
    if (result.status === 'success') {
      return {
        photoUrl: `https://lh3.googleusercontent.com/d/${result.fileId}`,
        fileId: result.fileId,
        nodeUrl: result.nodeUrl
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};
