import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { LibraryItem, TracerReference, TracerReferenceContent, TracerSavedQuote } from '../../../../types';
import { fetchReferenceContent, saveReferenceContent } from '../../../../services/TracerService';
import { translateReviewRowContent } from '../../../../services/ReviewService';
import { GAS_WEB_APP_URL } from '../../../../constants';
import { 
  X, 
  BookOpen, 
  Quote, 
  Sparkles, 
  ArrowLeft, 
  Plus, 
  Languages, 
  Trash2, 
  Eye, 
  Copy,
  ChevronRight,
  Loader2,
  Calendar,
  Globe,
  ExternalLink
} from 'lucide-react';
import { showXeenapsToast } from '../../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import QuoteNowModal from './QuoteNowModal';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { FormField, FormDropdown } from '../../../Common/FormComponents';

// --- SHARED CITATION MODAL LOGIC FROM LIBRARY ---
const CitationModal: React.FC<{ item: LibraryItem; onClose: () => void }> = ({ item, onClose }) => {
  const [style, setStyle] = useState('Harvard');
  const [language, setLanguage] = useState('English');
  const [results, setResults] = useState<{ parenthetical: string; narrative: string; bibliography: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editableParenthetical, setEditableParenthetical] = useState('');
  const [editableNarrative, setEditableNarrative] = useState('');
  const [editableBibliography, setEditableBibliography] = useState('');

  const styles = ['Harvard', 'APA 7th Edition', 'IEEE', 'Chicago', 'Vancouver', 'MLA 9th Edition'];
  const languages = ['English', 'Indonesian', 'French', 'German', 'Dutch'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    const response = await fetch(GAS_WEB_APP_URL!, {
      method: 'POST',
      body: JSON.stringify({ action: 'generateCitations', item, style, language })
    });
    const result = await response.json();
    if (result.status === 'success') {
      const data = result.data;
      setResults(data);
      setEditableParenthetical(data.parenthetical);
      setEditableNarrative(data.narrative);
      setEditableBibliography(data.bibliography);
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Citation Copied!');
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative border border-white/20 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><AcademicCapIcon className="w-7 h-7" /></div>
            <div><h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Citation Architect</h3></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={32} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Style"><FormDropdown value={style} onChange={setStyle} options={styles} placeholder="Select style" allowCustom={false} showSearch={false} /></FormField>
            <FormField label="Language"><FormDropdown value={language} onChange={setLanguage} options={languages} placeholder="Language" allowCustom={false} showSearch={false} /></FormField>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3">
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Cite Reference
          </button>
          {results && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 pb-4">
              <div className="h-px bg-gray-100 w-full" />
              <div className="space-y-2"><div className="flex justify-between px-1"><span className="text-[9px] font-black text-gray-400 uppercase">In-Text</span><button onClick={() => copyToClipboard(editableParenthetical)} className="text-[#004A74] hover:scale-110 transition-transform"><Copy size={14} /></button></div><textarea value={editableParenthetical} onChange={e=>setEditableParenthetical(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-[#004A74] outline-none" rows={2}/></div>
              <div className="space-y-2"><div className="flex justify-between px-1"><span className="text-[9px] font-black text-gray-400 uppercase">Bibliography</span><button onClick={() => copyToClipboard(editableBibliography)} className="text-[#004A74] hover:scale-110 transition-transform"><Copy size={14} /></button></div><textarea value={editableBibliography} onChange={e=>setEditableBibliography(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-[#004A74] outline-none" rows={4}/></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ReferenceDetailViewProps {
  item: LibraryItem;
  refRow: TracerReference;
  onClose: () => void;
}

const ReferenceDetailView: React.FC<ReferenceDetailViewProps> = ({ item, refRow, onClose }) => {
  const navigate = useNavigate();
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [showCite, setShowCite] = useState(false);
  const [content, setContent] = useState<TracerReferenceContent>({ quotes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false); // FOR INLINE SKELETON
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [openLangMenu, setOpenLangMenu] = useState<string | null>(null);

  // CRITICAL: Manage local metadata to prevent stale state loops
  const [localRefRow, setLocalRefRow] = useState<TracerReference>(refRow);

  const LANG_OPTIONS = [
    { label: "English", code: "en" }, { label: "Indonesian", code: "id" }, { label: "French", code: "fr" },
    { label: "German", code: "de" }, { label: "Spanish", code: "es" }, { label: "Portuguese", code: "pt" }
  ];

  useEffect(() => {
    const loadContent = async () => {
      // ONLY LOAD IF JSON ID EXISTS
      if (localRefRow.contentJsonId) {
        setIsLoadingContent(true);
        try {
          const data = await fetchReferenceContent(localRefRow.contentJsonId, localRefRow.storageNodeUrl);
          if (data) setContent(data);
        } catch (e) {
          console.error("Failed to fetch quotes", e);
        } finally {
          setIsLoadingContent(false);
        }
      }
      setIsLoading(false);
    };
    loadContent();
  }, [localRefRow.contentJsonId, localRefRow.storageNodeUrl]);

  const handleSaveContent = async (newContent: TracerReferenceContent) => {
    // Sync UI first
    setContent(newContent);
    // Background Sync with current metadata
    const result = await saveReferenceContent(localRefRow, newContent);
    if (result) {
        // ESSENTIAL: Update localRefRow with newly assigned IDs if this was first write
        setLocalRefRow(prev => ({
            ...prev,
            contentJsonId: result.contentJsonId,
            storageNodeUrl: result.storageNodeUrl
        }));
    }
  };

  const handleRemoveQuote = async (quoteId: string) => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // Optimistic Remove
      const updated = { ...content, quotes: content.quotes.filter(q => q.id !== quoteId) };
      await handleSaveContent(updated);
      showXeenapsToast('success', 'Quote removed');
    }
  };

  const handleTranslateQuote = async (quote: TracerSavedQuote, langCode: string) => {
    if (translatingId) return;
    setTranslatingId(quote.id);
    setOpenLangMenu(null);
    showXeenapsToast('info', 'Translating academic text...');
    
    try {
      const translated = await translateReviewRowContent(quote.enhancedText, langCode);
      if (translated) {
        const cleanText = translated.replace(/^- /gm, "").replace(/^-/gm, "").trim();
        const updated = {
          ...content,
          quotes: content.quotes.map(q => q.id === quote.id ? { ...q, enhancedText: cleanText, lang: langCode } : q)
        };
        await handleSaveContent(updated);
        showXeenapsToast('success', 'Translation synchronized');
      }
    } finally {
      setTranslatingId(null);
    }
  };

  const handleAddQuotes = async (newQuotes: TracerSavedQuote[]) => {
    const updated = { ...content, quotes: [...newQuotes, ...content.quotes] };
    await handleSaveContent(updated);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Copied to clipboard');
  };

  const handleViewFile = () => {
    let targetUrl = '';
    if (item.fileId) targetUrl = `https://drive.google.com/file/d/${item.fileId}/view`;
    else if (item.url) targetUrl = item.url;
    if (targetUrl) window.open(targetUrl, '_blank');
  };

  const handleGoToLibrary = () => {
    navigate('/', { 
      state: { 
        openItem: item, 
        returnToTracerProject: localRefRow.projectId,
        returnToRef: item 
      } 
    });
  };

  return (
    <div 
      className="fixed top-0 right-0 bottom-0 z-[1200] bg-white animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col transition-all duration-500"
      style={{ left: 'var(--sidebar-offset, 0px)' }}
    >
      {isQuoteOpen && <QuoteNowModal item={item} onClose={() => setIsQuoteOpen(false)} onSave={handleAddQuotes} />}
      {showCite && <CitationModal item={item} onClose={() => setShowCite(false)} />}
      
      <header className="px-6 md:px-10 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md">
         <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] rounded-xl transition-all shadow-sm active:scale-90"><ArrowLeft size={20} strokeWidth={3} /></button>
            <div className="min-w-0">
               <h2 className="text-sm font-black text-[#004A74] uppercase tracking-widest truncate">Reference Detail</h2>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Knowledge Anchor Perspective</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={handleViewFile} className="p-2.5 text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all shadow-sm" title="Open Source File">
               <Eye size={20} strokeWidth={2.5} />
            </button>
            <button onClick={handleGoToLibrary} className="p-2.5 text-[#004A74] hover:bg-gray-100 rounded-xl transition-all shadow-sm" title="Go to Library Detail">
               <ExternalLink size={20} strokeWidth={2.5} />
            </button>
            <div className="w-px h-6 bg-gray-100 mx-1" />
            <button onClick={() => setShowCite(true)} className="flex items-center gap-2 px-6 py-2 bg-[#FED400] text-[#004A74] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">CITE</button>
            <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all active:scale-90"><X size={28} /></button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 bg-[#fcfcfc]">
         <div className="max-w-5xl mx-auto space-y-12 pb-32">
            
            <header className="space-y-6">
               <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">{item.category}</span>
                  <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{item.topic}</span>
               </div>
               <h1 className="text-2xl md:text-3xl font-black text-[#004A74] uppercase tracking-tighter leading-tight uppercase">{item.title}</h1>
               <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                  <span className="italic">{item.authors.join(', ')}</span>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{item.publisher} • {item.year}</span>
               </div>
            </header>

            {/* SAVED QUOTES SECTION */}
            <section className="space-y-6 pt-4">
               <div className="flex items-center justify-between px-2">
                  <div className="space-y-1">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2"><Quote size={16} className="text-[#FED400] fill-[#FED400]" /> Intelligence Harvest</h3>
                     <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Saved Evidence Collections</p>
                  </div>
                  <button 
                    onClick={() => setIsQuoteOpen(true)}
                    disabled={!item.extractedJsonId}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#004A74] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                     <Plus size={16} /> Quote Now
                  </button>
               </div>

               <div className="space-y-4">
                  {(isLoading || isLoadingContent) ? (
                    /* INLINE SKELETON LOADING AREA */
                    <div className="space-y-4">
                      {[1,2].map(i => (
                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                           <div className="space-y-3">
                              <div className="h-2 w-24 skeleton rounded-full" />
                              <div className="h-4 w-full skeleton rounded-lg" />
                              <div className="h-4 w-3/4 skeleton rounded-lg" />
                           </div>
                           <div className="pt-6 border-t border-gray-50 space-y-2">
                              <div className="h-2 w-32 skeleton rounded-full" />
                              <div className="h-10 w-full skeleton rounded-2xl" />
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : content.quotes.length === 0 ? (
                    <div className="py-20 text-center opacity-20 bg-white border border-dashed border-gray-200 rounded-[2.5rem]">
                       <Quote size={48} className="mx-auto mb-2 text-[#004A74]" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No quotes saved yet</p>
                    </div>
                  ) : content.quotes.map(quote => (
                    <div key={quote.id} className="group relative bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-[#FED400]/40 transition-all duration-500">
                       <div className="flex items-start justify-between gap-6 mb-6">
                          <div className="flex-1 space-y-4">
                             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#004A74]/40">
                                <Sparkles size={12} className="text-[#FED400] fill-[#FED400]" /> Academic Synthesis
                             </div>
                             <p className="text-sm md:text-base font-medium text-[#004A74] leading-relaxed relative">
                                "{quote.enhancedText}"
                                <button onClick={() => handleCopy(quote.enhancedText)} className="inline-block ml-3 p-1.5 bg-gray-50 text-gray-400 hover:text-[#004A74] rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Copy size={12}/></button>
                             </p>
                          </div>
                          
                          <div className="flex flex-col gap-2 shrink-0">
                             <div className="relative">
                                <button 
                                  onClick={() => setOpenLangMenu(openLangMenu === quote.id ? null : quote.id)}
                                  disabled={translatingId === quote.id}
                                  className={`p-2.5 rounded-xl transition-all shadow-sm ${translatingId === quote.id ? 'bg-[#004A74] text-white animate-pulse' : 'bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-white'}`}
                                >
                                   {translatingId === quote.id ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                                </button>
                                {openLangMenu === quote.id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
                                     <div className="p-2 border-b border-gray-50 mb-1">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Translate to...</p>
                                     </div>
                                     <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {LANG_OPTIONS.map(l => (
                                           <button key={l.code} onClick={() => handleTranslateQuote(quote, l.code)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg flex items-center justify-between">{l.label}</button>
                                        ))}
                                     </div>
                                  </div>
                                )}
                             </div>
                             <button onClick={() => handleRemoveQuote(quote.id)} className="p-2.5 bg-white text-red-200 hover:text-red-500 border border-gray-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                          </div>
                       </div>

                       <div className="pt-6 border-t border-gray-50 space-y-3">
                          <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Quote size={12}/> Verbatim Source</span>
                             <button onClick={() => handleCopy(quote.originalText)} className="text-[8px] font-black text-[#004A74] uppercase hover:underline">Copy Verbatim</button>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] font-bold italic text-gray-500 leading-relaxed">
                             "{quote.originalText}"
                          </div>
                          <div className="flex items-center justify-between pt-2">
                             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-300 flex items-center gap-1.5"><Globe size={10}/> Language: {LANG_OPTIONS.find(l=>l.code===quote.lang)?.label || 'English'}</span>
                             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-300 flex items-center gap-1.5"><Calendar size={10}/> {new Date(quote.createdAt).toLocaleDateString()}</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </section>
         </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }`}</style>
    </div>
  );
};

export default ReferenceDetailView;