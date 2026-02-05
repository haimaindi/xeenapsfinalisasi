import { CVDocument, CVTemplateType, GASResponse, UserProfile, EducationEntry, CareerEntry, PublicationItem, ActivityItem } from '../types';
import { GAS_WEB_APP_URL } from '../constants';

/**
 * XEENAPS CV ARCHITECT SERVICE
 * Handles CV document management and PDF generation triggers.
 */

export const fetchCVList = async (signal?: AbortSignal): Promise<CVDocument[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const res = await fetch(`${GAS_WEB_APP_URL}?action=getCVList`, { signal });
    const result: GASResponse<CVDocument[]> = await res.json();
    return result.status === 'success' ? result.data || [] : [];
  } catch (e) {
    return [];
  }
};

export const deleteCVDocument = async (id: string): Promise<boolean> => {
  if (!GAS_WEB_APP_URL) return false;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteCV', id })
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (e) {
    return false;
  }
};

/**
 * Pengambilan data terkonsolidasi untuk checklist CV Architect
 */
export const fetchSourceDataForCV = async (): Promise<{
  profile: UserProfile | null,
  education: EducationEntry[],
  career: CareerEntry[],
  publications: PublicationItem[],
  activities: ActivityItem[]
}> => {
  if (!GAS_WEB_APP_URL) return { profile: null, education: [], career: [], publications: [], activities: [] };
  
  try {
    const [pRes, eRes, cRes, pubRes, actRes] = await Promise.all([
      fetch(`${GAS_WEB_APP_URL}?action=getProfile`),
      fetch(`${GAS_WEB_APP_URL}?action=getEducation`),
      fetch(`${GAS_WEB_APP_URL}?action=getCareer`),
      fetch(`${GAS_WEB_APP_URL}?action=getPublication&limit=1000`),
      fetch(`${GAS_WEB_APP_URL}?action=getActivities&limit=1000`)
    ]);

    const profile = await pRes.json();
    const education = await eRes.json();
    const career = await cRes.json();
    const pubs = await pubRes.json();
    const acts = await actRes.json();

    return {
      profile: profile.data || null,
      education: education.data || [],
      career: career.data || [],
      publications: pubs.data || [],
      activities: acts.data || []
    };
  } catch (e) {
    console.error("Failed to fetch CV source data", e);
    return { profile: null, education: [], career: [], publications: [], activities: [] };
  }
};

/**
 * Pemicu utama generator PDF di Apps Script
 */
export const generateCVPdf = async (config: {
  title: string,
  template: CVTemplateType,
  selectedEducationIds: string[],
  selectedCareerIds: string[],
  selectedPublicationIds: string[],
  selectedActivityIds: string[],
  includePhoto: boolean,
  aiSummary: string
}): Promise<CVDocument | null> => {
  if (!GAS_WEB_APP_URL) return null;
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'generateCV_PDF', 
        config 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};