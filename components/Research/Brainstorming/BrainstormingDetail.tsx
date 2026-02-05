import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BrainstormingItem, LibraryItem } from '../../../types';
import { 
  fetchBrainstormingPaginated, 
  saveBrainstorming, 
  synthesizeRoughIdea, 
  generateProposedAbstract, 
  getExternalRecommendations,
  getInternalRecommendations,
  translateBrainstormingFields,
  deleteBrainstorming
} from '../../../services/BrainstormingService';
import { 
  ArrowLeft, 
  Sparkles, 
  RefreshCcw, 
  BookOpen, 
  Loader2,
  Languages,
  Plus,
  MessageSquare,
  Target,
  FlaskConical,
  Users,
  Search,
  Zap,
  AlignLeft,
  X,
  Library,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  Star
} from 'lucide-react';
import { showXeenapsToast } from '../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import LibraryDetailView from '../../Library/LibraryDetailView';
import { BRAND_ASSETS } from '../../../assets';

const LANG_OPTIONS = [
  { label: "English", code: "en" },
  { label: "Indonesian", code: "id" },
  { label: "Portuguese", code: "pt" },
  { label: "Spanish", code: "es" },
  { label: "German", code: "de" },
  { label: "French", code: "fr" },
  { label: "Dutch", code: "nl" },
  { label: "Mandarin", code: "zh" },
  { label: "Japanese", code: "ja" },
  { label: "Russian", code: "ru" },
  { label: "Arabic", code: "ar" }
];

const BrainstormingDetail: React.FC<{ libraryItems: LibraryItem[] }> = ({ libraryItems }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper: Pastikan data adalah array (mencegah Uncaught TypeError .map)
  const ensureArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.startsWith('[')) {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return [];
  };

  // Instant Transition: Coba ambil dari state navigasi dulu agar tidak blank
  const [item, setItem] = useState<BrainstormingItem | null>(() => {
    const navItem = (location.state as any)?.item;
    if (navItem) {
      return {
        ...navItem,
        externalRefs: ensureArray(navItem.externalRefs),
        internalRefs: ensureArray(navItem.internalRefs),
        keywords: ensureArray(navItem.keywords),
        pillars: ensureArray(navItem.pillars)
      };
    }
    return null;
  });
  
  const [isBusy, setIsBusy] = useState(false);
  const [internalRecoms, setInternalRecoms] = useState<LibraryItem[]>([]);
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);
  const [isFetchingInternal, setIsFetchingInternal] = useState(false);
  const [openLangMenu, setOpenLangMenu] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedInternalItem, setSelectedInternalItem] = useState<LibraryItem | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper for auto-expanding textarea height
  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    const load = async () => {
      const res = await fetchBrainstormingPaginated(1, 1000);
      const found = res.items.find(i => i.id === id);
      if (found) {
        setItem({
          ...found,
          externalRefs: ensureArray(found.externalRefs),
          internalRefs: ensureArray(found.internalRefs),
          keywords: ensureArray(found.keywords),
          pillars: ensureArray(found.pillars)
        });
      } else if (!item) {
        showXeenapsToast('error', 'Project not found');
        navigate('/research/brainstorming');
      }
    };
    
    if (!item || item.id !== id) {
      load();
    }
  }, [id, item, navigate]);

  const handleSave = useCallback(async (updated?: BrainstormingItem) => {
    const target = updated || item;
    if (!target) return;
    
    // BROADCAST UPDATE FOR GLOBAL LISTENERS
    window.dispatchEvent(new CustomEvent('xeenaps-brainstorming-updated', { detail: target }));
    
    await saveBrainstorming({ ...target, updatedAt: new Date().toISOString() });
  }, [item]);

  // Debounced Auto-save
  useEffect(() => {
    if (!item) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [item, handleSave]);

  const handleSynthesize = async () => {
    if (!item?.roughIdea) {
      showXeenapsToast('warning', 'Please provide a Rough Idea draft first.');
      return;
    }
    setIsBusy(true);
    showXeenapsToast('info', 'Synthesizing idea matrix...');
    const result = await synthesizeRoughIdea(item.roughIdea);
    if (result) {
      const updated = { 
        ...item, 
        ...result,
        pillars: ensureArray(result.pillars),
        keywords: ensureArray(result.keywords)
      };
      setItem(updated);
      showXeenapsToast('success', 'Synthesis Complete (10 Pillars)');
    }
    setIsBusy(false);
  };

  const handleGenerateAbstract = async () => {
    if (!item?.proposedTitle) {
      showXeenapsToast('warning', 'Synthesize core matrix first.');
      return;
    }
    setIsBusy(true);
    showXeenapsToast('info', 'Generating Academic Abstract...');
    const abs = await generateProposedAbstract(item);
    if (abs) {
      const updated = { ...item, proposedAbstract: abs };
      setItem(updated);
      showXeenapsToast('success', 'Abstract Ready');
    }
    setIsBusy(false);
  };

  const handleFetchExternal = async () => {
    const keywords = ensureArray(item?.keywords);
    if (keywords.length === 0) return;
    setIsFetchingExternal(true);
    showXeenapsToast('info', 'Searching External Benchmarks...');
    const data = await getExternalRecommendations(item!);
    const updatedItem = { ...item!, externalRefs: ensureArray(data) };
    setItem(updatedItem);
    handleSave(updatedItem);
    setIsFetchingExternal(false);
    showXeenapsToast('success', 'External Benchmarks Synchronized');
  };

  const handleFetchInternal = async () => {
    if (!item?.proposedTitle) return;
    setIsFetchingInternal(true);
    showXeenapsToast('info', 'Searching Internal Relevance...');
    const data = await getInternalRecommendations(item!);
    const updatedItem = { ...item!, internalRefs: ensureArray(data.map(lib => lib.id)) };
    setItem(updatedItem);
    handleSave(updatedItem);
    setIsFetchingInternal(false);
    showXeenapsToast('success', 'Internal Relevance Synchronized');
  };

  // ID Resolver: Match stored internalRefs (IDs) with current libraryItems
  useEffect(() => {
    const refs = ensureArray(item?.internalRefs);
    if (refs.length) {
      const resolved = refs
        .map(refId => libraryItems.find(lib => lib.id === refId))
        .filter(Boolean) as LibraryItem[];
      setInternalRecoms(resolved);
    } else {
      setInternalRecoms([]);
    }
  }, [item?.internalRefs, libraryItems]);

  const handleTranslate = async (langCode: string) => {
    if (!item) return;
    setOpenLangMenu(false);
    setIsBusy(true);
    showXeenapsToast('info', 'Translating framework...');
    const translated = await translateBrainstormingFields(item, langCode);
    if (translated) {
      setItem({ 
        ...item, 
        ...translated,
        pillars: ensureArray(translated.pillars) 
      });
      showXeenapsToast('success', 'Translation Applied');
    }
    setIsBusy(false);
  };

  const toggleAction = (prop: 'isFavorite' | 'isUsed') => {
    if (!item) return;
    setItem({ ...item, [prop]: !item[prop] });
  };

  const removeKeyword = (kw: string) => {
    if (!item) return;
    const keywords = ensureArray(item.keywords);
    setItem({ ...item, keywords: keywords.filter(k => k !== kw) });
  };

  const addKeyword = () => {
    if (!item || !newKeyword.trim()) return;
    const keywords = ensureArray(item.keywords);
    if (keywords.includes(newKeyword.trim())) {
      setNewKeyword('');
      return;
    }
    setItem({ ...item, keywords: [...keywords, newKeyword.trim()] });
    setNewKeyword('');
  };

  const renderPillarInput = (idx: number) => {
    const pillars = ensureArray(item?.pillars);
    return (
      <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-200 transition-all hover:border-[#FED400] focus-within:ring-4 focus-within:ring-[#FED400]/5 group">
        <span className="shrink-0 w-8 h-8 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
          {String(idx + 1).padStart(2, '0')}
        </span>
        <textarea 
          className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-[#004A74] min-h-[40px] resize-none leading-relaxed"
          value={pillars[idx] || ''}
          placeholder={`Discussion pillar ${idx + 1}...`}
          onChange={(e) => {
            if (!item) return;
            const newPillars = [...ensureArray(item.pillars)];
            newPillars[idx] = e.target.value.replace(/—/g, '-');
            setItem({ ...item, pillars: newPillars });
            adjustHeight(e.target);
          }}
          onFocus={(e) => adjustHeight(e.target)}
          rows={1}
          ref={(el) => adjustHeight(el)}
        />
      </div>
    );
  };

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-full">
         <div className="relative">
            <div className="w-16 h-16 border-4 border-[#004A74]/10 rounded-full absolute inset-0"></div>
            <div className="w-16 h-16 border-4 border-[#FED400] border-t-transparent rounded-full animate-spin"></div>
            <img src={BRAND_ASSETS.LOGO_ICON} className="w-8 h-8 absolute inset-0 m-auto" alt="Loading" />
         </div>
         <p className="mt-4 text-[10px] font-black text-[#004A74] uppercase tracking-[0.4em] animate-pulse">Initializing Room</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
      {/* Internal Collection Overlay */}
      {selectedInternalItem && (
        <LibraryDetailView 
          item={selectedInternalItem} 
          onClose={() => setSelectedInternalItem(null)} 
          isLoading={false}
        />
      )}

      {/* HUD Header */}
      <header className="px-6 md:px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex flex-col md:flex-row items-center md:justify-between gap-4 shrink-0 z-[90]">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => navigate('/research/brainstorming')} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90">
               <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
               <div className="flex flex-wrap items-center gap-2">
                 {/* Label is now editable using a minimal input field */}
                 <input 
                   className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tighter leading-none bg-transparent border-none outline-none focus:ring-0 truncate max-w-[200px] md:max-w-md placeholder:text-gray-200"
                   value={item.label}
                   onChange={(e) => setItem({ ...item, label: e.target.value })}
                   placeholder="PROJECT LABEL..."
                 />
                 <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                    <button onClick={() => toggleAction('isFavorite')} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all" title="Favorite">
                      {item.isFavorite ? <Star size={18} className="text-[#FED400] fill-[#FED400]" /> : <Star size={18} className="text-gray-300" />}
                    </button>
                    <button 
                      onClick={() => toggleAction('isUsed')} 
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all border ${
                        item.isUsed ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
                      }`}
                    >
                      {item.isUsed ? 'USED' : 'UNUSED'}
                    </button>
                 </div>
               </div>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Brainstorming Workspace</p>
            </div>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative">
              <button 
                onClick={() => setOpenLangMenu(!openLangMenu)}
                className="p-2.5 bg-gray-50 text-gray-500 hover:text-[#004A74] rounded-xl transition-all"
                title="Translate Framework"
              >
                <Languages size={18} />
              </button>
              {openLangMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
                  <div className="p-2 border-b border-gray-50 mb-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {LANG_OPTIONS.map((lang) => (
                      <button 
                        key={lang.code}
                        onClick={() => handleTranslate(lang.code)}
                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center justify-between"
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1200px] mx-auto p-6 md:p-10 space-y-12">
           
           {/* a. Ide kasar full width editable */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                 Your Rough Idea
              </h3>
              <textarea 
                className="w-full bg-white p-6 border border-gray-200 rounded-3xl outline-none text-xs font-normal text-[#004A74] placeholder:text-gray-200 resize-none leading-relaxed transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5"
                placeholder="Type your messy ideas here. AI will structure it into the framework below..."
                value={item.roughIdea}
                onChange={(e) => {
                  setItem({ ...item, roughIdea: e.target.value.replace(/—/g, '-') });
                  adjustHeight(e.target);
                }}
                onFocus={(e) => adjustHeight(e.target)}
                rows={1}
                ref={(el) => adjustHeight(el)}
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleSynthesize}
                  disabled={isBusy}
                  className="flex items-center gap-2 px-8 py-2.5 bg-[#004A74] text-[#FED400] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#004A74]/10"
                >
                   {isBusy ? <Loader2 size={14} className="animate-spin" /> : null} Synthesize Framework
                </button>
              </div>
           </div>

           {/* b. Title full width editable */}
           <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#004A74] flex items-center gap-2">
                <Target size={14} /> Academic Title Proposal
              </label>
              <textarea 
                className="w-full bg-white p-6 border border-gray-200 rounded-3xl outline-none text-xl font-black text-[#004A74] uppercase tracking-tighter transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5 resize-none"
                value={item.proposedTitle}
                placeholder="Awaiting Synthesis..."
                onChange={(e) => {
                  setItem({ ...item, proposedTitle: e.target.value.replace(/—/g, '-') });
                  adjustHeight(e.target);
                }}
                onFocus={(e) => adjustHeight(e.target)}
                rows={1}
                ref={(el) => adjustHeight(el)}
              />
           </div>

           {/* c, d, e, f, g: Logic Elements Stacked */}
           <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <MessageSquare size={14} /> Problem Justification
                </label>
                <textarea 
                  className="w-full bg-white p-6 border border-gray-200 rounded-3xl outline-none text-xs font-bold text-gray-600 leading-relaxed transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5 resize-none"
                  value={item.problemStatement}
                  placeholder="State the core problem..."
                  onChange={(e) => {
                    setItem({ ...item, problemStatement: e.target.value.replace(/—/g, '-') });
                    adjustHeight(e.target);
                  }}
                  onFocus={(e) => adjustHeight(e.target)}
                  rows={1}
                  ref={(el) => adjustHeight(el)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Search size={14} /> The White Space (Gap)
                </label>
                <textarea 
                  className="w-full bg-[#004A74] p-6 border border-[#004A74]/10 rounded-3xl outline-none text-xs font-bold text-white leading-relaxed transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5 resize-none"
                  value={item.researchGap}
                  placeholder="Define the knowledge gap..."
                  onChange={(e) => {
                    setItem({ ...item, researchGap: e.target.value.replace(/—/g, '-') });
                    adjustHeight(e.target);
                  }}
                  onFocus={(e) => adjustHeight(e.target)}
                  rows={1}
                  ref={(el) => adjustHeight(el)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <AlignLeft size={14} /> Investigation Question
                </label>
                <textarea 
                  className="w-full bg-white p-6 border border-gray-200 rounded-3xl outline-none text-xs font-bold text-gray-600 leading-relaxed transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5 resize-none"
                  value={item.researchQuestion}
                  placeholder="What are we trying to answer?"
                  onChange={(e) => {
                    setItem({ ...item, researchQuestion: e.target.value.replace(/—/g, '-') });
                    adjustHeight(e.target);
                  }}
                  onFocus={(e) => adjustHeight(e.target)}
                  rows={1}
                  ref={(el) => adjustHeight(el)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <FlaskConical size={14} /> Approach & Methodology
                </label>
                <textarea 
                  className="w-full bg-white p-6 border border-gray-200 rounded-3xl outline-none text-xs font-bold text-gray-600 leading-relaxed transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5 resize-none"
                  value={item.methodology}
                  placeholder="Define the methodology..."
                  onChange={(e) => {
                    setItem({ ...item, methodology: e.target.value.replace(/—/g, '-') });
                    adjustHeight(e.target);
                  }}
                  onFocus={(e) => adjustHeight(e.target)}
                  rows={1}
                  ref={(el) => adjustHeight(el)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Users size={14} /> Targeted Population
                </label>
                <textarea 
                  className="w-full bg-white p-6 border border-gray-200 rounded-3xl outline-none text-xs font-bold text-gray-600 leading-relaxed transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5 resize-none"
                  value={item.population}
                  placeholder="Define targeted population..."
                  onChange={(e) => {
                    setItem({ ...item, population: e.target.value.replace(/—/g, '-') });
                    adjustHeight(e.target);
                  }}
                  onFocus={(e) => adjustHeight(e.target)}
                  rows={1}
                  ref={(el) => adjustHeight(el)}
                />
              </div>
           </div>

           {/* h. Discussion Pillars (10 pillars) 2 Column Grid */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Discussion Structure</h4>
                <span className="text-[8px] font-black text-[#FED400] bg-[#004A74] px-3 py-1 rounded-full uppercase tracking-widest">Pillars</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                 <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map(idx => renderPillarInput(idx))}
                 </div>
                 <div className="space-y-3">
                    {[5, 6, 7, 8, 9].map(idx => renderPillarInput(idx))}
                 </div>
              </div>
           </div>

           {/* i. Strategic Keywords full width editable */}
           <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Strategic Keywords</h4>
              <div className="bg-white p-6 border border-gray-200 rounded-3xl space-y-4 transition-all focus-within:border-[#FED400]">
                 <div className="flex flex-wrap gap-2">
                    {ensureArray(item.keywords).map(k => (
                      <div key={k} className="group flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-[#004A74] transition-all hover:bg-[#FED400]/20">
                        {k}
                        <button onClick={() => removeKeyword(k)} className="text-red-400 hover:text-red-500 transition-all"><X size={14} /></button>
                      </div>
                    ))}
                 </div>
                 <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                    <input 
                      className="flex-1 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold text-[#004A74] outline-none focus:bg-white"
                      placeholder="Type keyword and press enter..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value.replace(/—/g, '-'))}
                      onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    />
                    <button onClick={addKeyword} className="p-2.5 bg-[#004A74] text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#004A74]/10"><Plus size={18} /></button>
                 </div>
              </div>
           </div>

           {/* j. Benchmarks Section: PERSISTENT Results */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* External Literature (OpenAlex) */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">Recommendation References</h3>
                    <button 
                      onClick={handleFetchExternal} 
                      disabled={isFetchingExternal}
                      className="p-2.5 bg-white border border-gray-100 rounded-xl text-[#004A74] hover:bg-[#FED400]/20 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isFetchingExternal ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    </button>
                 </div>
                 <div className="space-y-4">
                    {isFetchingExternal ? [...Array(3)].map((_, i) => <div key={i} className="h-20 w-full skeleton rounded-2xl" />) : ensureArray(item.externalRefs).length > 0 ? ensureArray(item.externalRefs).map((ref, idx) => {
                      const urlMatch = typeof ref === 'string' ? ref.match(/https?:\/\/[^\s<]+/) : null;
                      const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => url && window.open(url, '_blank')}
                          className={`p-5 bg-white border border-gray-200 rounded-3xl shadow-sm transition-all group ${url ? 'cursor-pointer hover:border-[#004A74]/30 hover:bg-[#004A74]/5' : ''}`}
                        >
                           <div className="flex gap-4">
                              <span className="shrink-0 w-7 h-7 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center">{idx+1}</span>
                              <div className="space-y-2 flex-1">
                                 <p className="text-[11px] font-bold text-[#004A74]/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: String(ref).replace(/—/g, '-') }} />
                                 {url && <span className="text-[8px] font-black text-[#004A74]/40 uppercase tracking-widest flex items-center gap-1 group-hover:text-[#004A74]">Access External DOI <ExternalLink size={10} /></span>}
                              </div>
                           </div>
                        </div>
                      );
                    }) : (
                      <div className="py-10 text-center opacity-20 bg-white border border-dashed border-gray-200 rounded-3xl">
                        <BookOpen size={32} className="mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">No benchmarks stored</p>
                      </div>
                    )}
                 </div>
              </div>

              {/* Internal Collection (Smart Relevant Library) */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">Internal Library (MAY INVALID)</h3>
                    <button 
                      onClick={handleFetchInternal} 
                      disabled={isFetchingInternal}
                      className="p-2.5 bg-white border border-gray-100 rounded-xl text-[#004A74] hover:bg-[#FED400]/20 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isFetchingInternal ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    </button>
                 </div>
                 <div className="space-y-4">
                    {isFetchingInternal ? [...Array(3)].map((_, i) => <div key={i} className="h-20 w-full skeleton rounded-2xl" />) : internalRecoms.length > 0 ? internalRecoms.map((lib, idx) => (
                      <div 
                        key={lib.id} 
                        onClick={() => setSelectedInternalItem(lib)}
                        className="p-5 bg-white border border-gray-200 rounded-3xl shadow-sm transition-all group cursor-pointer hover:border-[#FED400] hover:bg-[#FED400]/5"
                      >
                         <div className="flex gap-4">
                            <span className="shrink-0 w-7 h-7 rounded-full bg-[#FED400] text-[#004A74] text-[10px] font-black flex items-center justify-center shadow-sm">0{idx+1}</span>
                            <div className="space-y-1 flex-1">
                               <h5 className="text-[11px] font-black text-[#004A74] uppercase leading-tight group-hover:underline">{lib.title}</h5>
                               <p className="text-[9px] font-bold text-gray-400 uppercase">{lib.authors[0]} • {lib.year}</p>
                               <div className="flex items-center gap-1.5 pt-2 text-[8px] font-black text-[#004A74]/40 uppercase tracking-widest group-hover:text-[#004A74]">
                                 View Internal Detail <ChevronRight size={10} />
                               </div>
                            </div>
                         </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center opacity-20 bg-white border border-dashed border-gray-200 rounded-3xl">
                        <Library size={32} className="mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">No local docs stored</p>
                      </div>
                    )}
                 </div>
              </div>

           </div>

           {/* l. Abstract full width editable */}
           <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Unified Synthesis Abstract</h3>
                <button 
                  onClick={handleGenerateAbstract} 
                  disabled={isBusy}
                  className="flex items-center gap-2 px-6 py-2 bg-[#004A74] text-[#FED400] rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Regenerate Abstract
                </button>
              </div>
              <textarea 
                className="w-full bg-white p-10 border border-gray-200 rounded-[3rem] outline-none text-sm font-medium text-gray-600 leading-relaxed italic text-center resize-none transition-all focus:border-[#FED400] focus:ring-4 focus:ring-[#FED400]/5"
                placeholder="Abstract pending generation..."
                value={item.proposedAbstract}
                onChange={(e) => {
                  setItem({ ...item, proposedAbstract: e.target.value.replace(/—/g, '-') });
                  adjustHeight(e.target);
                }}
                onFocus={(e) => adjustHeight(e.target)}
                rows={1}
                ref={(el) => adjustHeight(el)}
              />
           </div>

        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.08); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default BrainstormingDetail;