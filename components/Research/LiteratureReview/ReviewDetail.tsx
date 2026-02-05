import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ReviewItem, ReviewContent, ReviewMatrixRow, LibraryItem } from '../../../types';
/* Added missing deleteReview import from ReviewService */
import { fetchReviewsPaginated, fetchReviewContent, saveReview, deleteReview, runMatrixExtraction, runReviewSynthesis, translateReviewRowContent } from '../../../services/ReviewService';
import { 
  ArrowLeft, 
  Sparkles, 
  Trash2, 
  Plus, 
  Save, 
  Loader2, 
  BookOpen, 
  MessageSquare,
  Zap,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ClipboardList,
  Eye,
  Star,
  RefreshCcw,
  Languages,
  Globe
} from 'lucide-react';
import ReviewSourceSelectorModal from './ReviewSourceSelectorModal';
import { showXeenapsToast } from '../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { fetchFileContent } from '../../../services/gasService';
import LibraryDetailView from '../../Library/LibraryDetailView';

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
  { label: "Vietnamese", code: "vi" },
  { label: "Thai", code: "th" },
  { label: "Hindi", code: "hi" },
  { label: "Turkish", code: "tr" },
  { label: "Russian", code: "ru" },
  { label: "Arabic", code: "ar" }
];

interface ReviewDetailProps {
  libraryItems: LibraryItem[];
  isMobileSidebarOpen?: boolean;
}

const ReviewDetail: React.FC<ReviewDetailProps> = ({ libraryItems, isMobileSidebarOpen }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // INITIALIZE FROM STATE (INSTANT ACCESS)
  const [review, setReview] = useState<ReviewItem | null>(() => (location.state as any)?.review || null);
  const [content, setContent] = useState<ReviewContent>({ matrix: [], finalSynthesis: '' });
  // FIX: Force isLoading to true by default to prevent premature rendering of empty state
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false); 
  const [isBusy, setIsBusy] = useState(false);
  const [isReviewSelectorOpen, setIsReviewSelectorOpen] = useState(false);
  
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translatingSynthesis, setTranslatingSynthesis] = useState(false);
  const [openTranslationMenu, setOpenTranslationMenu] = useState<string | null>(null);

  const lastKnownGoodContent = useRef<ReviewContent | null>(null);
  const [selectedSourceForDetail, setSelectedSourceForDetail] = useState<LibraryItem | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch latest metadata from Cloud in background
        const res = await fetchReviewsPaginated(1, 1000);
        const found = res.items.find(i => i.id === id);
        
        if (found) {
          setReview(prev => prev ? { ...prev, ...found } : found);
          const detail = await fetchReviewContent(found.reviewJsonId, found.storageNodeUrl);
          if (detail) {
            setContent(detail);
            lastKnownGoodContent.current = detail;
          }
          // FIX: Only set isHydrated to true AFTER content is successfully fetched
          setIsHydrated(true);
        } else if (!review) {
          navigate('/research/literature-review');
        }
      } catch (error) {
        console.error("Critical error during review data load:", error);
      } finally {
        // FIX: Always set isLoading to false at the very end of the process
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // --- EXTERNAL SYNC LISTENER (Point #2 & #5 Fix) ---
  useEffect(() => {
    const handleRemoteUpdate = (e: any) => {
      const updated = e.detail as ReviewItem;
      if (updated.id === id) {
        setReview(prev => prev ? { ...prev, ...updated } : updated);
      }
    };
    window.addEventListener('xeenaps-review-updated', handleRemoteUpdate);
    return () => window.removeEventListener('xeenaps-review-updated', handleRemoteUpdate);
  }, [id]);

  // AUTO-SAVE ENGINE
  useEffect(() => {
    // CRITICAL GUARD: Never save if still loading, not hydrated, or busy
    if (!review || isLoading || !isHydrated || isBusy) return;

    // DATA INTEGRITY GUARD: Prevent saving empty content if we know we should have data
    if (content.matrix.length === 0 && lastKnownGoodContent.current && lastKnownGoodContent.current.matrix.length > 0) {
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const success = await saveReview(review, content);
      if (success) {
        lastKnownGoodContent.current = content;
      }
    }, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [review?.label, review?.centralQuestion, review?.isFavorite, content, isLoading, isHydrated, isBusy]);

  const handleToggleFavorite = async () => {
    if (!review || isBusy) return;
    const updated = { ...review, isFavorite: !review.isFavorite, updatedAt: new Date().toISOString() };
    
    // 1. Instant UI & Local State Update
    setReview(updated);
    
    // 2. Immediate Global Broadcast & Cloud Sync
    await saveReview(updated, content);
  };

  const handleStartExtraction = async (selectedLibs: LibraryItem[]) => {
    if (!review?.centralQuestion.trim()) {
      showXeenapsToast('warning', 'Please formulate a Main Question first.');
      return;
    }

    setIsReviewSelectorOpen(false);
    setIsBusy(true);
    showXeenapsToast('info', `Initializing analysis for ${selectedLibs.length} sources...`);

    const placeholders: ReviewMatrixRow[] = selectedLibs.map(lib => ({
      collectionId: lib.id,
      title: lib.title,
      answer: '',
      verbatim: ''
    }));
    
    setAnalyzingIds(prev => [...prev, ...selectedLibs.map(l => l.id)]);
    setContent(prev => ({ ...prev, matrix: [...prev.matrix, ...placeholders] }));
    
    for (const lib of selectedLibs) {
      try {
        const result = await runMatrixExtraction(lib.id, review.centralQuestion);
        if (result) {
          const completedRow = {
            collectionId: lib.id,
            title: lib.title,
            answer: result.answer,
            verbatim: result.verbatim
          };
          
          setContent(prev => ({
            ...prev,
            matrix: prev.matrix.map(m => m.collectionId === lib.id ? completedRow : m)
          }));
        }
      } catch (e) {
        showXeenapsToast('error', `Analysis failed for: ${lib.title}`);
      } finally {
        setAnalyzingIds(prev => prev.filter(id => id !== lib.id));
      }
    }

    setIsBusy(false);
    showXeenapsToast('success', 'Matrix segments updated');
  };

  const handleSynthesize = async () => {
    if (content.matrix.length === 0) {
      showXeenapsToast('warning', 'Matrix is empty. Add literature first.');
      return;
    }
    setIsBusy(true);
    showXeenapsToast('info', 'Synthesizing global summary...');
    
    const result = await runReviewSynthesis(content.matrix, review!.centralQuestion);
    if (result) {
      setContent(prev => ({ ...prev, finalSynthesis: result }));
      showXeenapsToast('success', 'Synthesis Complete');
    }
    setIsBusy(false);
  };

  const removeRow = async (libId: string) => {
    const confirm = await showXeenapsDeleteConfirm(1);
    if (confirm) {
      setContent(prev => ({ ...prev, matrix: prev.matrix.filter(m => m.collectionId !== libId) }));
      showXeenapsToast('success', 'Source removed from matrix');
    }
  };

  const handleTranslateRow = async (row: ReviewMatrixRow, langCode: string) => {
    if (translatingId) return;
    setTranslatingId(row.collectionId);
    setOpenTranslationMenu(null);
    showXeenapsToast('info', 'Translating row analysis...');

    try {
      const translated = await translateReviewRowContent(row.answer, langCode);
      if (translated) {
        const cleanTranslated = translated.replace(/^[-\*\s]+/gm, "").trim();
        setContent(prev => ({
          ...prev,
          matrix: prev.matrix.map(m => m.collectionId === row.collectionId ? { ...m, answer: cleanTranslated } : m)
        }));
        showXeenapsToast('success', 'Row translated');
      }
    } catch (e) {
      showXeenapsToast('error', 'Translation failed');
    } finally {
      setTranslatingId(null);
    }
  };

  const handleTranslateSynthesis = async (langCode: string) => {
    if (translatingSynthesis) return;
    setTranslatingSynthesis(true);
    setOpenTranslationMenu(null);
    showXeenapsToast('info', 'Translating final review...');

    try {
      const translated = await translateReviewRowContent(content.finalSynthesis, langCode);
      if (translated) {
        const cleanSynthesis = translated.replace(/^[-\*\s]+/gm, "").trim();
        setContent(prev => ({ ...prev, finalSynthesis: cleanSynthesis }));
        showXeenapsToast('success', 'Synthesis translated');
      } else {
        showXeenapsToast('error', 'Translation engine returned empty result');
      }
    } catch (e) {
      showXeenapsToast('error', 'Critical translation failure');
    } finally {
      setTranslatingSynthesis(false);
    }
  };

  const handleOpenSource = (libId: string) => {
    const lib = libraryItems.find(it => it.id === libId);
    if (lib) {
      setSelectedSourceForDetail(lib);
    }
  };

  const handleDeleteProject = async () => {
    if (!review || isBusy) return;
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const idToDelete = review.id;
      // 1. SILENT BROADCAST (OPTIMISTIC)
      deleteReview(idToDelete); 
      // 2. INSTANT NAVIGATION (Point #4 Fix)
      navigate('/research/literature-review', { replace: true });
      showXeenapsToast('success', 'Processing Deletion...');
    }
  };

  if (!review && !isLoading) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfcfc] overflow-hidden relative">
      
      {/* HUD HEADER */}
      <header className="px-6 md:px-10 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0 z-50">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate('/research/literature-review')} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm">
               <ArrowLeft size={20} strokeWidth={3} />
            </button>
            <div className="min-w-0">
               {isLoading || !review ? (
                 <div className="h-8 w-64 skeleton rounded-lg" />
               ) : (
                 <input 
                   className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tighter leading-none bg-transparent border-none outline-none focus:ring-0 truncate max-w-xs md:max-w-xl placeholder:text-gray-200"
                   value={review.label}
                   onChange={(e) => setReview({ ...review, label: e.target.value.toUpperCase() })}
                   placeholder="REVIEW PROJECT LABEL..."
                 />
               )}
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Multi-Literatures Summary Synthesis</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={handleToggleFavorite}
              className={`p-2.5 rounded-xl border transition-all ${review?.isFavorite ? 'bg-yellow-50 border-yellow-200 text-[#FED400]' : 'bg-white border-gray-100 text-gray-300'}`}
            >
              <Star size={18} fill={review?.isFavorite ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={handleDeleteProject}
              disabled={isBusy}
              className="p-2.5 bg-white text-red-300 hover:text-red-500 hover:bg-red-50 border border-gray-100 rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-30"
              title="Delete Project Permanently"
            >
              <Trash2 size={18} />
            </button>
            <div className="w-10 h-10 flex items-center justify-center">
               {(isBusy || translatingSynthesis) && <Loader2 size={20} className="animate-spin text-[#004A74]" />}
            </div>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-12 pb-32">
         
         {/* 1. CENTRAL QUESTION HUB */}
         <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
               MAIN REVIEW QUESTION
            </h3>
            <div className="relative group">
               <MessageSquare className="absolute left-6 top-8 w-6 h-6 text-gray-200 group-focus-within:text-[#FED400] transition-colors" />
               {isLoading || !review ? (
                 <div className="h-24 w-full skeleton rounded-[3rem]" />
               ) : (
                 <textarea 
                   className="w-full bg-white p-8 pl-16 border border-gray-200 rounded-[3rem] outline-none text-base md:text-lg font-bold text-[#004A74] placeholder:text-gray-200 resize-none transition-all focus:border-[#FED400] focus:ring-8 focus:ring-[#FED400]/5 min-h-[120px]"
                   placeholder="What specific question should AI answer across all selected literatures?"
                   value={review.centralQuestion}
                   onChange={(e) => setReview({ ...review, centralQuestion: e.target.value })}
                 />
               )}
            </div>
         </section>

         {/* 2. MATRIX AUDIT TABLE */}
         <section className="space-y-6">
            <div className="flex items-center justify-between px-4">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">Comparative Analysis Matrix</h3>
               <button 
                 onClick={() => setIsReviewSelectorOpen(true)}
                 disabled={isBusy || isLoading || content.matrix.length >= 10}
                 className={`flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 text-[#004A74] rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${content.matrix.length >= 10 ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-gray-50 active:scale-95'}`}
                 title={content.matrix.length >= 10 ? 'Maximum 10 sources allowed' : 'Add Sources'}
               >
                 <Plus size={14} /> Add Sources {content.matrix.length > 0 && `(${content.matrix.length}/10)`}
               </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                     <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                           <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[20%]">Source Identity</th>
                           <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[40%]">Analysis Result</th>
                           <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[30%]">Verbatim Evidence</th>
                           <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[10%] text-center">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                           /* Inline Table Skeletons */
                           [1,2,3].map(i => (
                             <tr key={i}>
                               <td className="p-6"><div className="h-4 w-32 skeleton rounded-lg"/></td>
                               <td className="p-6"><div className="space-y-2"><div className="h-4 w-full skeleton rounded-lg"/><div className="h-4 w-3/4 skeleton rounded-lg"/></div></td>
                               <td className="p-6"><div className="h-12 w-full skeleton rounded-2xl"/></td>
                               <td className="p-6"><div className="h-8 w-8 skeleton rounded-lg mx-auto"/></td>
                             </tr>
                           ))
                        ) : content.matrix.length === 0 ? (
                           <tr>
                              <td colSpan={4} className="py-24 text-center opacity-30">
                                 <BookOpen size={48} className="mx-auto mb-4 text-[#004A74]" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Comparative Matrix is empty</p>
                              </td>
                           </tr>
                        ) : (
                          content.matrix.map((row, idx) => {
                           const isAnalyzing = analyzingIds.includes(row.collectionId);
                           const isTranslating = translatingId === row.collectionId;
                           
                           return (
                             <tr key={idx} className={`transition-all duration-700 ${isAnalyzing ? 'bg-[#FED400]/5' : 'hover:bg-gray-50/50'}`}>
                                <td className="p-6 align-top">
                                   <div className="space-y-2">
                                      <div className="flex items-center gap-1.5">
                                         <span className="text-[8px] font-black text-[#FED400] bg-[#004A74] px-2 py-0.5 rounded-full uppercase tracking-tighter">SOURCE 0{idx+1}</span>
                                      </div>
                                      <h4 
                                         onClick={() => handleOpenSource(row.collectionId)}
                                         className={`text-xs font-black uppercase leading-snug hover:underline cursor-pointer transition-colors ${row.answer ? 'text-[#004A74]' : 'text-gray-300'}`}
                                      >
                                         {row.title}
                                      </h4>
                                      {isAnalyzing && (
                                         <div className="flex items-center gap-1.5 text-[#004A74] animate-pulse">
                                            <Loader2 size={10} className="animate-spin" />
                                            <span className="text-[7px] font-black uppercase tracking-widest">AI Auditing Content...</span>
                                         </div>
                                      )}
                                   </div>
                                </td>
                                <td className="p-6 align-top">
                                   {isAnalyzing ? (
                                      <div className="space-y-2">
                                         <div className="h-3 w-full skeleton rounded-lg" />
                                         <div className="h-3 w-3/4 skeleton rounded-lg" />
                                      </div>
                                   ) : (
                                      <div className="text-[11px] font-semibold text-gray-600 leading-relaxed whitespace-pre-wrap">
                                         {row.answer || <span className="text-gray-200 italic">Analysis pending audit...</span>}
                                      </div>
                                   )}
                                </td>
                                <td className="p-6 align-top">
                                   {isAnalyzing ? (
                                      <div className="h-12 w-full skeleton rounded-2xl" />
                                   ) : row.verbatim ? (
                                      <div className="p-4 bg-[#004A74]/5 border border-[#004A74]/10 rounded-2xl text-[10px] font-bold italic text-[#004A74]/70 leading-relaxed">
                                         "{row.verbatim}"
                                      </div>
                                   ) : <span className="text-[9px] text-gray-300 italic">No evidence extracted.</span>}
                                </td>
                                <td className="p-6 text-center align-top">
                                   <div className="flex flex-col gap-2">
                                      <div className="relative">
                                         <button 
                                            onClick={() => setOpenTranslationMenu(openTranslationMenu === row.collectionId ? null : row.collectionId)}
                                            disabled={!!translatingId || isAnalyzing || !row.answer}
                                            className={`p-2.5 rounded-xl transition-all ${isTranslating ? 'bg-[#004A74] text-white animate-pulse' : 'bg-gray-50 text-gray-400 hover:text-[#004A74]'}`}
                                            title="Translate Segment"
                                         >
                                            {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                                         </button>
                                         {openTranslationMenu === row.collectionId && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
                                               <div className="p-2 border-b border-gray-50 mb-1">
                                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                                               </div>
                                               <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                  {LANG_OPTIONS.map((lang) => (
                                                     <button 
                                                        key={lang.code}
                                                        onClick={() => handleTranslateRow(row, lang.code)}
                                                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center justify-between"
                                                     >
                                                        {lang.label}
                                                     </button>
                                                  ))}
                                               </div>
                                            </div>
                                         )}
                                      </div>
                                      <button onClick={() => removeRow(row.collectionId)} disabled={isAnalyzing} className="p-2.5 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all disabled:opacity-20">
                                         <Trash2 size={16} />
                                      </button>
                                   </div>
                                </td>
                             </tr>
                           );
                          })
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="flex justify-center pt-8 animate-in slide-in-from-bottom-5 duration-700">
               <button 
                  onClick={handleSynthesize}
                  disabled={isBusy || isLoading || content.matrix.length === 0 || analyzingIds.length > 0}
                  className="group relative flex items-center gap-4 px-20 py-6 bg-[#004A74] text-[#FED400] rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-[0_20px_50px_-10px_rgba(0,74,116,0.3)] hover:scale-105 active:scale-95 transition-all duration-500 disabled:opacity-40 disabled:grayscale overflow-hidden"
               >
                  <div className="relative z-10 flex items-center gap-3">
                    {isBusy ? <Loader2 size={24} className="animate-spin" /> : null}
                    Synthesize Final Summary
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
               </button>
            </div>
         </section>

         {/* 3. FINAL SYNTHESIS NARRATIVE */}
         <section className="space-y-6 pt-10">
            <div className="flex items-center justify-between px-4">
               <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">Multi-Literatures holistic summary</h3>
                  <h2 className="text-3xl font-black text-[#004A74] uppercase tracking-tighter">GLOBAL SUMMARY</h2>
               </div>
               <div className="flex items-center gap-2">
                  <div className="relative">
                     <button 
                        onClick={() => setOpenTranslationMenu(openTranslationMenu === 'synthesis' ? null : 'synthesis')}
                        disabled={translatingSynthesis || !content.finalSynthesis || isLoading}
                        className={`p-3 border border-gray-200 rounded-xl transition-all ${translatingSynthesis ? 'bg-[#004A74] text-white animate-pulse' : 'bg-white text-[#004A74] hover:bg-gray-50 shadow-sm'}`}
                        title="Translate Final Review"
                     >
                        {translatingSynthesis ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
                     </button>
                     {openTranslationMenu === 'synthesis' && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-110 animate-in fade-in zoom-in-95">
                           <div className="p-2 border-b border-gray-50 mb-1">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                           </div>
                           <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {LANG_OPTIONS.map((lang) => (
                                 <button 
                                    key={lang.code}
                                    onClick={() => handleTranslateSynthesis(lang.code)}
                                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all"
                                 >
                                    {lang.label}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
                  <button 
                     onClick={handleSynthesize}
                     disabled={isBusy || isLoading || content.matrix.length === 0 || analyzingIds.length > 0}
                     className="p-3 bg-white border border-gray-100 rounded-xl text-[#004A74] hover:bg-gray-50 transition-all shadow-sm"
                     title="Re-Synthesize"
                  >
                     <RefreshCcw size={18} className={isBusy ? 'animate-spin' : ''} />
                  </button>
               </div>
            </div>

            <div className="relative group">
               {(isBusy || translatingSynthesis) && (
                 <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[3.5rem]">
                    <Loader2 size={40} className="text-[#004A74] animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004A74]">
                       {translatingSynthesis ? 'Translating...' : 'Architecting Narrative...'}
                    </p>
                 </div>
               )}
               <div className="bg-white p-10 md:p-16 border border-gray-100 rounded-[3.5rem] shadow-xl relative overflow-hidden min-h-[400px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FED400]/5 -translate-y-24 translate-x-24 rounded-full" />
                  
                  {isLoading ? (
                    <div className="space-y-4 relative z-10">
                      <div className="h-4 w-full skeleton rounded-lg" />
                      <div className="h-4 w-full skeleton rounded-lg" />
                      <div className="h-4 w-full skeleton rounded-lg" />
                      <div className="h-4 w-5/6 skeleton rounded-lg" />
                      <div className="h-4 w-4/6 skeleton rounded-lg pt-4" />
                      <div className="h-4 w-full skeleton rounded-lg" />
                      <div className="h-4 w-full skeleton rounded-lg" />
                    </div>
                  ) : (
                    <div 
                      className="text-sm md:text-base leading-[1.8] text-[#004A74] font-medium relative z-10 review-output-body"
                      dangerouslySetInnerHTML={{ __html: content.finalSynthesis || '<p className="text-gray-200 text-center py-20 uppercase font-black tracking-widest">Summary is not created yet</p>' }}
                    />
                  )}
               </div>
            </div>

            {content.finalSynthesis && !isLoading && (
               <div className="p-8 bg-[#004A74]/5 rounded-[2.5rem] border border-[#004A74]/10 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-2">
                  <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shrink-0 shadow-xl"><ShieldAlert size={28} /></div>
                  <div>
                    <h4 className="text-sm font-black text-[#004A74] uppercase tracking-widest mb-1">Scientific Integrity Guard</h4>
                    <p className="text-xs font-bold text-[#004A74]/50 leading-relaxed italic">
                      "The AI-generated summary above is synthesized from the matrix evidence. We highly recommend that you re-read the literature thoroughly. "
                    </p>
                  </div>
               </div>
            )}
         </section>

      </div>

      {isReviewSelectorOpen && (
        <ReviewSourceSelectorModal 
          onClose={() => setIsReviewSelectorOpen(false)}
          onConfirm={handleStartExtraction}
          currentMatrixCount={content.matrix.length}
        />
      )}

      {selectedSourceForDetail && (
        <LibraryDetailView 
          item={selectedSourceForDetail} 
          onClose={() => setSelectedSourceForDetail(null)} 
          isLoading={false}
          isMobileSidebarOpen={isMobileSidebarOpen}
          isLocalOverlay={true}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        
        .review-output-body b { font-weight: 900; color: #004A74; }
        .review-output-body p { margin-bottom: 1.5rem; line-height: 1.8; }
        .review-output-body br { margin-bottom: 0.5rem; content: ""; display: block; }
        .review-output-body ol { 
          list-style-type: decimal !important; 
          margin: 1.5rem 0 1.5rem 1.5rem !important; 
          padding-left: 0.5rem !important;
        }
        .review-output-body ul { 
          list-style-type: disc !important; 
          margin: 1.5rem 0 1.5rem 1.5rem !important; 
          padding-left: 0.5rem !important;
        }
        .review-output-body li { 
          margin-bottom: 0.75rem !important; 
          font-weight: 600; 
          display: list-item !important;
          padding-left: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default ReviewDetail;