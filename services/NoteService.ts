
import { NoteItem, NoteContent, NoteAttachment, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS NOTEBOOK SERVICE
 * Handles Metadata on Spreadsheet and Payload on Sharded JSON.
 */

export const fetchNotesPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  collectionId: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: NoteItem[], totalCount: number }> => {
  if (!GAS_WEB_APP_URL) return { items: [], totalCount: 0 };
  try {
    const url = `${GAS_WEB_APP_URL}?action=getNotes&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&collectionId=${collectionId}&sortKey=${sortKey}&sortDir=${sortDir}`;
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

export const fetchNoteContent = async (noteJsonId: string, nodeUrl?: string): Promise<NoteContent | null> => {
  if (!noteJsonId) return null;
  try {
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return null;
    const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getFileContent&fileId=${noteJsonId}`;
    const response = await fetch(finalUrl);
    const result = await response.json();
    return result.status === 'success' ? JSON.parse(result.content) : null;
  } catch (e) {
    return null;
  }
};

export const saveNote = async (item: NoteItem, content: NoteContent): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveNote', item, content })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteNote = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteNote', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const uploadNoteAttachment = async (file: File): Promise<{ fileId: string, nodeUrl: string, mimeType: string } | null> => {
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
    return result.status === 'success' ? { fileId: result.fileId, nodeUrl: result.nodeUrl, mimeType: file.type } : null;
  } catch (e) {
    return null;
  }
};
