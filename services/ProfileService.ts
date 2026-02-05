import { UserProfile, EducationEntry, CareerEntry, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS PROFILE SERVICE
 * Dedicated service for User Identity, Education, and Career History.
 */

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getProfile`);
    const result: GASResponse<UserProfile> = await res.json();
    return result.status === 'success' ? result.data || null : null;
  } catch (e) {
    return null;
  }
};

/**
 * NEW: Get profile name stripped of all academic titles (Prefixes & Suffixes)
 */
export const getCleanedProfileName = async (): Promise<string> => {
  const profile = await fetchUserProfile();
  if (!profile || !profile.fullName) return "Xeenaps User";
  
  // 1. Remove Suffixes (Everything after the first comma is considered a degree/title)
  let name = profile.fullName.split(',')[0].trim();
  
  // 2. Remove All Prefixes (Any word ending with a dot at the start of the string)
  // This identifies academic titles like Dr., Ir., Prof., etc., recursively.
  // Regex explanation: ^ matches start, ([A-Za-z]+\.\s*) matches words with dots + space.
  // The + quantifier after the group ensures all consecutive prefixes are removed.
  name = name.replace(/^([A-Za-z]+\.\s*)+/i, '').trim();
  
  // 3. Fallback check
  return name || "Xeenaps User";
};

export const saveUserProfile = async (profile: UserProfile): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveProfile', item: profile })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const uploadProfilePhoto = async (file: File): Promise<{ photoUrl: string, fileId: string, nodeUrl: string } | null> => {
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
        action: 'saveItem', // Using unified sharding logic
        item: { id: 'PHOTO_PROFILE', title: 'Profile Photo' },
        file: { fileName: file.name, mimeType: file.type, fileData: base64Data }
      })
    });
    const result = await response.json();
    if (result.status === 'success') {
      const fileId = result.fileId;
      const nodeUrl = result.nodeUrl;
      return {
        photoUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        fileId: fileId,
        nodeUrl: nodeUrl
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const deleteProfilePhoto = async (fileId: string, nodeUrl: string): Promise<boolean> => {
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

export const fetchEducationHistory = async (): Promise<EducationEntry[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getEducation`);
    const result: GASResponse<EducationEntry[]> = await res.json();
    return result.status === 'success' ? result.data || [] : [];
  } catch (e) {
    return [];
  }
};

export const saveEducationEntry = async (entry: EducationEntry): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveEducation', item: entry })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteEducationEntry = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteEducation', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const fetchCareerHistory = async (): Promise<CareerEntry[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getCareer`);
    const result: GASResponse<CareerEntry[]> = await res.json();
    return result.status === 'success' ? result.data || [] : [];
  } catch (e) {
    return [];
  }
};

export const saveCareerEntry = async (entry: CareerEntry): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveCareer', item: entry })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

export const deleteCareerEntry = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteCareer', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};