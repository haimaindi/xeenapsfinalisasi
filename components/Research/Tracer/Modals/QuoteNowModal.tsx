import React, { useState } from 'react';
import { LibraryItem, TracerQuote, TracerSavedQuote } from '../../../../types';
import { extractTracerQuotes } from '../../../../services/TracerService';
import { translateReviewRowContent } from '../../../../services/ReviewService';
import { 
  X, 
  Search, 
  Quote, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare,
  Copy,
  Layout,
  RefreshCcw,
  Zap,
  Globe,
  Plus,
  Save,
  Languages,
  Check
} from 'lucide-react';
import { showXeenapsToast } from '../../../../utils/toastUtils';

interface QuoteNowModalProps {
  item: LibraryItem;
  onClose: () => void;
  onSave: (quotes: TracerSavedQuote[]) => Promise<void>;
}

const QuoteNowModal: React.FC<QuoteNowModalProps> = ({ item, onClose, onSave }) => {
  const [stage, setStage] = useState<'input' | 'processing' | 'result'>('input');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ originalText: string; enhancedText: string; lang: string; isSelected: boolean }>>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const [openLangMenu, setOpenLangMenu] = useState<number | null>(null);

  const LANG_OPTIONS = [
    { label: "English", code: "en" }, { label: "Indonesian", code: "id" }, { label: "French", code: "fr" },
    { label: "German", code: "de" }, { label: "Spanish", code: "es" }, { label: "Portuguese", code: "pt" }
  ];

  const handleStartExtraction = async () => {
    if (!query.trim()) return;
    setIsBusy(true);
    setStage('processing');
    
    try {
      const data = await extractTracerQuotes(item.id, query);
      // HARDENED VALIDATION: Ensure data is a non-empty array
      if (data && Array.isArray(data) && data.length > 0) {
        setResults(data.map(q => ({ ...q, lang: 'en', isSelected: true })));
        setStage('result');
      } else {
        showXeenapsToast('error', 'No relevant quotes identified');
        setStage('input');
      }
    } catch (e) {
      showXeenapsToast('error', 'Extraction engine failure');
      setStage('input');
    } finally {
      setIsBusy(false);
    }
  };

  const handleTranslateItem = async (idx: number, langCode: string) => {
    if (translatingIdx !== null) return;
    setTranslatingIdx(idx);
    setOpenLangMenu(null);
    showXeenapsToast('info', 'Translating enhancement...');

    try {
      const textToTranslate = results[idx].enhancedText;
      const translated = await translateReviewRowContent(textToTranslate, langCode);
      if (translated) {
        const cleanText = translated.replace(/^- /gm, "").replace(/^-/gm, "").trim();
        setResults(prev => prev.map((item, i) => i === idx ? { ...item, enhancedText: cleanText, lang: langCode } : item));
        showXeenapsToast('success', 'Translation ready');
      }
    } finally {
      setTranslatingIdx(null);
    }
  };

  const toggleSelection = (idx: number) => {
    setResults(prev => prev.map((item, i) => i === idx ? { ...item, isSelected: !item.isSelected } : item));
  };

  const handleBatchSave = async () => {
    const selected = results.filter(r => r.isSelected);
    if (selected.length === 0) return;

    setIsBusy(true);
    const quotesToSave: TracerSavedQuote[] = selected.map(s => ({
      id: crypto.randomUUID(),
      originalText: s.originalText,
      enhancedText: s.enhancedText,
      lang: s.lang,
      createdAt: new Date().toISOString()
    }));

    await onSave(quotesToSave);
    setIsBusy(false);
    onClose();
    showXeenapsToast('success', `${selected.length} intelligence nodes anchored`);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Copied');
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20 relative">
        
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><Zap size={24} /></div>
              <div>
                 <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">AI Quote Discoverer</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Contextual Evidence Extraction Engine</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
           {stage === 'input' && (
             <div className="space-y-10 animate-in zoom-in-95">
                <div className="text-center space-y-4">
                   <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">Define Your Search Context</h2>
                   <p className="text-xs font-medium text-gray-500 max-w-md mx-auto leading-relaxed">Describe the logic or findings you are looking for. AI will locate 3 distinct quotes and architect academic enhancements for each.</p>
                </div>
                <div className="relative group">
                   <MessageSquare className="absolute left-6 top-8 w-6 h-6 text-gray-200 group-focus-within:text-[#FED400] transition-colors" />
                   <textarea autoFocus className="w-full bg-gray-50 p-8 pl-16 border border-gray-200 rounded-[2.5rem] outline-none text-base font-bold text-[#004A74] transition-all focus:bg-white focus:ring-8 focus:ring-[#004A74]/5 min-h-[150px] resize-none" placeholder="e.g. Find specific results regarding the efficiency of the new algorithm..." value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <button onClick={handleStartExtraction} disabled={!query.trim() || isBusy} className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all">
                  <Sparkles size={18} /> Execute Multi-Discovery
                </button>
             </div>
           )}

           {stage === 'processing' && (
             <div className="py-20 flex flex-col items-center text-center space-y-8 animate-in fade-in">
                <div className="relative">
                   <div className="w-24 h-24 border-4 border-[#004A74]/10 rounded-full" />
                   <div className="w-24 h-24 border-4 border-[#FED400] border-t-transparent rounded-full animate-spin absolute inset-0" />
                   <Search className="w-10 h-10 absolute inset-0 m-auto text-[#004A74] animate-pulse" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-[#004A74] uppercase tracking-tighter">Deep Scanning Doc Nodes</h3>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI is identifying and enhancing top 3 contextual verbatim matches...</p>
                </div>
             </div>
           )}

           {stage === 'result' && (
             <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Discovery Results (Ranked)</h4>
                   <p className="text-[9px] font-black text-[#004A74] uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">{results.filter(r=>r.isSelected).length} Items Selected</p>
                </div>

                <div className="space-y-10">
                   {results.map((res, idx) => (
                     <div key={idx} className={`group relative bg-white border rounded-[2.5rem] p-8 shadow-sm transition-all duration-500 flex flex-col ${res.isSelected ? 'border-[#004A74] ring-4 ring-[#004A74]/5' : 'border-gray-100 opacity-60'}`}>
                        {/* SELECTOR */}
                        <button onClick={() => toggleSelection(idx)} className={`absolute -top-3 -left-3 w-10 h-10 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center transition-all ${res.isSelected ? 'bg-[#004A74] text-white scale-110' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}>
                           {res.isSelected ? <Check size={20} strokeWidth={4} /> : <Plus size={20} strokeWidth={3} />}
                        </button>

                        <div className="flex items-start justify-between gap-6 mb-6">
                           <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#004A74]">
                                 <Sparkles size={12} className="text-[#FED400] fill-[#FED400]" /> Intelligence Option 0{idx+1}
                              </div>
                              <p className="text-sm md:text-base font-medium text-[#004A74] leading-relaxed italic">"{res.enhancedText}"</p>
                           </div>
                           
                           <div className="flex flex-col gap-2">
                              <div className="relative">
                                 <button 
                                   onClick={() => setOpenLangMenu(openLangMenu === idx ? null : idx)}
                                   disabled={translatingIdx === idx}
                                   className={`p-2.5 rounded-xl transition-all shadow-sm ${translatingIdx === idx ? 'bg-[#004A74] text-white animate-pulse' : 'bg-gray-50 text-gray-400 hover:text-[#004A74]'}`}
                                 >
                                    {translatingIdx === idx ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                                 </button>
                                 {openLangMenu === idx && (
                                   <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
                                      <div className="p-2 border-b border-gray-50 mb-1">
                                         <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Translate Result</p>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                         {LANG_OPTIONS.map(l => (
                                            <button key={l.code} onClick={() => handleTranslateItem(idx, l.code)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all">{l.label}</button>
                                         ))}
                                      </div>
                                   </div>
                                 )}
                              </div>
                              <button onClick={() => handleCopy(res.enhancedText)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] rounded-xl transition-all"><Copy size={16}/></button>
                           </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 space-y-3">
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Quote size={12}/> Verbatim Capture</span>
                              <button onClick={() => handleCopy(res.originalText)} className="text-[8px] font-black text-[#004A74] uppercase hover:underline">Copy Verbatim</button>
                           </div>
                           <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[10px] font-bold italic text-gray-400 leading-relaxed">
                              "{res.originalText}"
                           </div>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="pt-10 flex gap-4">
                   <button onClick={() => setStage('input')} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all">New Trace</button>
                   <button 
                     onClick={handleBatchSave} 
                     disabled={isBusy || results.filter(r=>r.isSelected).length === 0}
                     className="flex-[2] py-5 bg-[#004A74] text-[#FED400] rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Anchor Intelligence Node(s)
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default QuoteNowModal;