import React, { useState, useMemo, useEffect } from 'react';
import { SharboxItem, PubInfo, Identifiers, SharboxStatus, SupportingData, ColleagueItem } from '../../types';
import { 
  XMarkIcon, 
  ArrowLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  UserIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingLibraryIcon,
  BookOpenIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  LinkIcon,
  VideoCameraIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  HashtagIcon,
  TagIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { BRAND_ASSETS } from '../../assets';
import { fetchFileContent } from '../../services/gasService';
import { deleteSharboxItem } from '../../services/SharboxService';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import ColleagueForm from '../Colleague/ColleagueForm';

interface SharboxDetailViewProps {
  item: SharboxItem;
  activeTab: 'Inbox' | 'Sent';
  onClose: () => void;
  onRefresh?: () => void;
  onClaim?: () => void;
}

/**
 * Helper to safely format dates from ISO or raw strings.
 */
const formatDate = (dateStr: any) => {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Unknown') return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      if (/^\d{4}$/.test(String(dateStr).trim())) return dateStr;
      return null;
    }
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    // Return full date or just year based on precision
    if (String(dateStr).includes('T00:00:00') || String(dateStr).length < 10) return year.toString();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
};

/**
 * Enhanced List Component with Inline Skeleton Support
 */
const ElegantList: React.FC<{ text?: any; className?: string; isLoading?: boolean }> = ({ text, className = "", isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-6 h-6 rounded-full skeleton shrink-0" />
            <div className="h-4 w-full skeleton rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (text === null || text === undefined || text === 'N/A') return null;
  const isNarrative = typeof text === 'string' && (text.includes('<span') || text.includes('<b') || text.length > 500);
  if (isNarrative) {
    return (
      <div className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} dangerouslySetInnerHTML={{ __html: text }} />
    );
  }
  let items: string[] = [];
  if (Array.isArray(text)) {
    items = text.map(i => String(i).trim()).filter(Boolean);
  } else if (typeof text === 'string') {
    const trimmedText = text.trim();
    if (trimmedText === '') return null;
    items = trimmedText.split(/\n|(?=\d+\.)|(?=•)/).map(i => i.replace(/^\d+\.\s*|•\s*/, '').trim()).filter(Boolean);
  } else {
    const strVal = String(text).trim();
    if (strVal === '') return null;
    items = [strVal];
  }
  if (items.length === 0) return null;
  return (
    <ol className={`space-y-3 list-none ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 items-start group">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">{idx + 1}</span>
          <span className="text-sm text-[#004A74]/90 leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
};

const SharboxDetailView: React.FC<SharboxDetailViewProps> = ({ item, activeTab, onClose, onRefresh, onClaim }) => {
  const [currentItem, setCurrentItem] = useState<SharboxItem>(item);
  const [isFetchingInsights, setIsFetchingInsights] = useState(false);
  const [isColleagueFormOpen, setIsColleagueFormOpen] = useState(false);

  useEffect(() => {
    const loadJsonInsights = async () => {
      if (item.insightJsonId) {
        setIsFetchingInsights(true);
        const jsonInsights = await fetchFileContent(item.insightJsonId, item.storageNodeUrl);
        if (jsonInsights && Object.keys(jsonInsights).length > 0) {
          setCurrentItem(prev => ({ ...prev, ...jsonInsights }));
        }
        setIsFetchingInsights(false);
      }
    };
    setCurrentItem(item);
    loadJsonInsights();
  }, [item]);

  const parseJsonField = (field: any, defaultValue: any = {}) => {
    if (!field) return defaultValue;
    if (typeof field === 'object' && !Array.isArray(field)) return field;
    try { return typeof field === 'string' ? JSON.parse(field) : field; } catch { return defaultValue; }
  };

  const pubInfo: PubInfo = useMemo(() => parseJsonField(currentItem.pubInfo), [currentItem.pubInfo]);
  const identifiers: Identifiers = useMemo(() => parseJsonField(currentItem.identifiers), [currentItem.identifiers]);
  const tags = useMemo(() => parseJsonField(currentItem.tags, { keywords: [], labels: [] }), [currentItem.tags]);
  const supportingData: SupportingData = useMemo(() => parseJsonField(currentItem.supportingReferences, { references: [], videoUrl: null }), [currentItem.supportingReferences]);

  const profile = useMemo(() => {
    if (activeTab === 'Inbox') {
      return {
        name: currentItem.senderName || 'Unknown Sender',
        photo: currentItem.senderPhotoUrl || BRAND_ASSETS.USER_DEFAULT,
        affiliation: currentItem.senderAffiliation || 'Independent Researcher',
        uniqueId: currentItem.senderUniqueAppId || 'XN-PRIVATE',
        email: currentItem.senderEmail || '-',
        phone: currentItem.senderPhone || '-',
        social: currentItem.senderSocialMedia || '-',
        label: 'SENDER'
      };
    } else {
      return {
        name: currentItem.receiverName || 'Recipient',
        photo: currentItem.receiverPhotoUrl || BRAND_ASSETS.USER_DEFAULT,
        affiliation: 'Authorized Partner',
        uniqueId: currentItem.receiverUniqueAppId || 'XN-PRIVATE',
        email: currentItem.receiverEmail || '-',
        phone: currentItem.receiverPhone || '-',
        social: currentItem.receiverSocialMedia || '-',
        label: 'RECIPIENT'
      };
    }
  }, [currentItem, activeTab]);

  const colleagueData: ColleagueItem | undefined = useMemo(() => {
    if (activeTab !== 'Inbox') return undefined;
    return {
      id: crypto.randomUUID(),
      name: currentItem.senderName || '',
      uniqueAppId: currentItem.senderUniqueAppId || '',
      affiliation: currentItem.senderAffiliation || '',
      email: currentItem.senderEmail || '',
      phone: currentItem.senderPhone || '',
      socialMedia: currentItem.senderSocialMedia || '',
      photoUrl: currentItem.senderPhotoUrl || '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [currentItem, activeTab]);

  const displayDate = formatDate(currentItem.fullDate || currentItem.year);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Reference Copied!');
  };

  const handleViewCollection = () => {
    let targetUrl = '';
    if (currentItem.fileId) {
      targetUrl = `https://drive.google.com/file/d/${currentItem.fileId}/view`;
    } else if (currentItem.url) {
      targetUrl = currentItem.url;
    }
    
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      showXeenapsToast('warning', 'No source file available');
    }
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteSharboxItem(currentItem.id, activeTab);
      if (success) {
        showXeenapsToast('success', 'Record removed');
        onRefresh?.();
        onClose();
      } else {
        showXeenapsToast('error', 'Delete failed');
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1100] bg-white flex flex-col animate-in fade-in slide-in-from-right duration-500"
      style={{ left: 'var(--sidebar-offset, 0px)' }}
    >
      {/* 1. MINIMAL HEADER */}
      <div className="sticky top-0 z-[90] bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 px-3 py-2 rounded-xl transition-all">
          <ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back to Sharbox
        </button>

        <div className="flex items-center gap-2">
          {activeTab === 'Inbox' && currentItem.status === SharboxStatus.UNCLAIMED && (
            <button 
              onClick={onClaim}
              className="flex items-center gap-2 px-5 py-2 bg-[#FED400] text-[#004A74] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all mr-2"
            >
              <PlusIcon className="w-4 h-4 stroke-[3]" /> Claim & Import
            </button>
          )}
          <button 
            onClick={handleViewCollection}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-full transition-all"
            title="View Source Document"
          >
            <EyeIcon className="w-8 h-8" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-2 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
            title="Delete Record"
          >
            <TrashIcon className="w-8 h-8" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-10 space-y-10">
          
          {/* 2. REMOTE PROFILE & MESSAGE BLOCK */}
          <section className="bg-[#004A74] rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 -translate-y-24 translate-x-24 rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
               {/* Portrait */}
               <div className="relative shrink-0 mx-auto md:mx-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#FED400] overflow-hidden shadow-2xl bg-white">
                    <img src={profile.photo} className="w-full h-full object-cover" alt="Profile" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-[#FED400] text-[#004A74] px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase shadow-lg">
                    {profile.label}
                  </div>
               </div>

               {/* Bio Info */}
               <div className="flex-1 space-y-6 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none">{profile.name}</h2>
                      <p className="text-[#FED400] text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                        <AcademicCapIcon className="w-4 h-4" /> {profile.affiliation}
                      </p>
                    </div>
                    {activeTab === 'Inbox' && (
                      <button 
                        onClick={() => setIsColleagueFormOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#FED400] text-[#004A74] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all mx-auto md:mx-0"
                      >
                        <UserPlusIcon className="w-4 h-4 stroke-[3]" /> Save Colleague
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                     <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                        <ShieldCheckIcon className="w-4 h-4 text-[#FED400]" />
                        <span className="text-[10px] font-mono font-bold tracking-widest">{profile.uniqueId}</span>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                        <EnvelopeIcon className="w-4 h-4 text-white/50" />
                        <span className="text-[10px] font-bold">{profile.email}</span>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                        <PhoneIcon className="w-4 h-4 text-white/50" />
                        <span className="text-[10px] font-bold">{profile.phone}</span>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                        <GlobeAltIcon className="w-4 h-4 text-white/50" />
                        <span className="text-[10px] font-bold tracking-tighter">{profile.social}</span>
                     </div>
                  </div>

                  {/* Shared Message Bubble */}
                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 relative">
                     <ChatBubbleBottomCenterTextIcon className="absolute -top-3 -left-3 w-10 h-10 text-[#FED400]/20" />
                     <p className="text-sm md:text-base font-medium italic leading-relaxed text-white/90">
                       "{currentItem.message || "Synthesizing knowledge transfer without attached narrative."}"
                     </p>
                  </div>
               </div>
            </div>
          </section>

          {/* 3. DOCUMENT METADATA BLOCK */}
          <section className="bg-gray-50/50 p-8 md:p-12 rounded-[3rem] border border-gray-100 space-y-6 relative group">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.type}</span>
              {currentItem.category && <span className="px-3 py-1 bg-[#004A74]/10 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.category}</span>}
              <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.topic}</span>
            </div>

            <h1 className="text-xl md:text-3xl font-black text-[#004A74] leading-[1.1] uppercase max-w-4xl">{currentItem.title}</h1>
            
            <div className="space-y-1">
              {displayDate && <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{displayDate}</p>}
              <p className="text-sm font-bold text-[#004A74]">{Array.isArray(currentItem.authors) ? currentItem.authors.join(', ') : 'Unknown Authors'}</p>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-100">
              {currentItem.publisher && (
                <div className="flex items-start gap-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Publisher</span>
                  <p className="text-[11px] font-bold text-gray-600">{currentItem.publisher}</p>
                </div>
              )}
              {(pubInfo.journal || pubInfo.vol || pubInfo.issue || pubInfo.pages) && (
                <div className="flex items-start gap-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Publication</span>
                  <p className="text-[11px] font-bold text-[#004A74]">
                    {[pubInfo.journal, pubInfo.vol ? `Vol. ${pubInfo.vol}` : '', pubInfo.issue ? `No. ${pubInfo.issue}` : '', pubInfo.pages ? `pp. ${pubInfo.pages}` : ''].filter(Boolean).join(' • ')}
                  </p>
                </div>
              )}
              {Object.values(identifiers).some(v => v) && (
                <div className="flex items-start gap-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-24 shrink-0">Identifiers</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] font-bold text-gray-400 italic uppercase">
                    {identifiers.doi && <span>DOI: {identifiers.doi}</span>}
                    {identifiers.issn && <span>ISSN: {identifiers.issn}</span>}
                    {identifiers.isbn && <span>ISBN: {identifiers.isbn}</span>}
                    {identifiers.pmid && <span>PMID: {identifiers.pmid}</span>}
                    {identifiers.arxiv && <span>arXiv: {identifiers.arxiv}</span>}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4. KEYWORDS & LABELS PARITY */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><HashtagIcon className="w-3 h-3" /> Keywords</h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.keywords?.length > 0 ? tags.keywords.map((k: string) => <span key={k} className="px-2.5 py-1 bg-[#004A74]/5 border border-[#004A74]/10 rounded-lg text-[9px] font-bold text-[#004A74]">{k}</span>) : <p className="text-[9px] text-gray-300 italic">No keywords.</p>}
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><TagIcon className="w-3 h-3" /> Labels</h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.labels?.length > 0 ? tags.labels.map((l: string) => <span key={l} className="px-2.5 py-1 bg-[#FED400]/10 border border-[#FED400]/20 rounded-lg text-[9px] font-bold text-[#004A74]">{l}</span>) : <p className="text-[9px] text-gray-300 italic">No labels.</p>}
              </div>
            </div>
          </section>

          {/* 5. ABSTRACT & INSIGHTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 md:col-span-2">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> Verbatim Abstract</h3>
              <div className="text-sm leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentItem.abstract || 'No abstract retrieved.' }} />
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 md:col-span-2">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><ClipboardDocumentListIcon className="w-4 h-4" /> AI Summary</h3>
              {isFetchingInsights ? (
                <div className="space-y-3">
                  <div className="h-4 w-full skeleton rounded-md" />
                  <div className="h-4 w-full skeleton rounded-md" />
                  <div className="h-4 w-3/4 skeleton rounded-md" />
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-[#004A74] font-medium" dangerouslySetInnerHTML={{ __html: currentItem.summary || 'Summary pending initialization.' }} />
              )}
            </div>

            <div className="bg-green-50 p-6 rounded-[2.5rem] border border-green-100/50 shadow-sm space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-green-600/50 flex items-center gap-2"><ClipboardDocumentCheckIcon className="w-4 h-4" /> Strengths</h3>
              <ElegantList text={currentItem.strength} isLoading={isFetchingInsights} />
            </div>

            <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100/50 shadow-sm space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-red-600/50 flex items-center gap-2"><ExclamationTriangleIcon className="w-4 h-4" /> Weaknesses</h3>
              <ElegantList text={currentItem.weakness} isLoading={isFetchingInsights} />
            </div>

            <div className="bg-[#004A74]/5 p-6 rounded-[2.5rem] border border-[#004A74]/10 shadow-sm space-y-4 md:col-span-2">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-[#004A74]/40 flex items-center gap-2"><ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Unfamiliar Terminology</h3>
              <ElegantList text={currentItem.unfamiliarTerminology || currentItem.quickTipsForYou} isLoading={isFetchingInsights} />
            </div>
          </div>

          {/* 6. SUPPORTING RESOURCES */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-gray-100">
             <div className="space-y-6">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Supporting References</h3>
                <div className="space-y-4">
                  {supportingData.references && supportingData.references.length > 0 ? supportingData.references.map((ref, idx) => {
                    const urlMatch = ref.match(/https?:\/\/[^\s<]+/);
                    const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                    return (
                      <div key={idx} className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 flex flex-col gap-4 transition-all hover:bg-white group">
                        <div className="flex gap-4">
                          <span className="shrink-0 w-7 h-7 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">{idx + 1}</span>
                          <p className="text-xs font-bold text-[#004A74]/80 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: ref }} />
                        </div>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleCopy(ref.replace(/<[^>]*>/g, ''))} className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#004A74] rounded-lg border border-gray-100 text-[9px] font-black uppercase tracking-tight shadow-sm hover:bg-[#FED400] transition-all"><DocumentDuplicateIcon className="w-3.5 h-3.5" /> Copy</button>
                          {url && <button onClick={() => window.open(url, '_blank')} className="flex items-center gap-2 px-3 py-1.5 bg-[#004A74] text-white rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm hover:scale-105 transition-all"><ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> Visit</button>}
                        </div>
                      </div>
                    );
                  }) : <p className="text-[10px] font-bold text-gray-300 uppercase italic py-10 text-center">No supporting links.</p>}
                </div>
             </div>

             <div className="bg-[#004A74] p-8 md:p-10 rounded-[3rem] text-white space-y-6 flex flex-col">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><VideoCameraIcon className="w-4 h-4" /> Visual Insights</h3>
                <div className="flex-1 flex flex-col justify-center">
                   {supportingData.videoUrl ? (
                     <div className="aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl border-4 border-white/10">
                        <iframe className="w-full h-full" src={supportingData.videoUrl} frameBorder="0" allowFullScreen></iframe>
                     </div>
                   ) : (
                     <div className="aspect-video rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center space-y-4">
                        <VideoCameraIcon className="w-12 h-12 text-white/10" />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Visual node unavailable</p>
                     </div>
                   )}
                </div>
                <p className="text-[10px] text-[#FED400]/80 font-bold italic text-center px-4">"Multimedia triangulation anchors knowledge 40% faster than text alone."</p>
             </div>
          </section>

          <footer className="py-20 text-center opacity-20">
             <BuildingLibraryIcon className="w-12 h-12 mx-auto mb-4 text-[#004A74]" />
             <p className="text-[8px] font-black uppercase tracking-[0.8em]">XEENAPS TRANSIT ARCHIVE</p>
          </footer>
        </div>
      </div>

      {isColleagueFormOpen && colleagueData && (
        <ColleagueForm 
          item={colleagueData}
          onClose={() => setIsColleagueFormOpen(false)}
          onComplete={() => {
            setIsColleagueFormOpen(false);
            showXeenapsToast('success', 'Colleague saved successfully');
          }}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SharboxDetailView;