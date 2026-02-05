import { SharboxItem, LibraryItem, GASResponse, ColleagueItem } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS SHARBOX SERVICE
 * Peer-to-Peer Cross-Spreadsheet Knowledge Exchange
 */

export const initializeSharboxDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    const response = await fetch(GAS_WEB_APP_URL!, {
      method: 'POST',
      body: JSON.stringify({ action: 'setupSharboxDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

export const fetchSharboxItems = async (type: 'Inbox' | 'Sent'): Promise<SharboxItem[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getSharboxItems&type=${type}`);
    const result: GASResponse<SharboxItem[]> = await response.json();
    return result.status === 'success' ? result.data || [] : [];
  } catch (error) {
    return [];
  }
};

export const shareToColleague = async (
  targetUniqueAppId: string, 
  receiverName: string, 
  receiverPhotoUrl: string,
  message: string,
  item: LibraryItem,
  receiverContacts?: { email?: string, phone?: string, socialMedia?: string }
): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'sendToSharbox', 
        targetUniqueAppId, 
        receiverName, 
        receiverPhotoUrl,
        message,
        item,
        receiverContacts
      })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const claimSharboxItem = async (transactionId: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'claimSharboxItem', 
        id: transactionId 
      })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const markSharboxItemAsRead = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'markSharboxRead', 
        id: id 
      })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteSharboxItem = async (id: string, type: 'Inbox' | 'Sent'): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'deleteSharboxItem', 
        id, 
        type 
      })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};