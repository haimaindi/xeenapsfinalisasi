
import React, { useState, useEffect, useRef } from 'react';
import { LibraryItem, BloomsLevel, QuestionItem, QuestionOption } from '../../types';
import { generateQuestionsWorkflow, saveQuestionRecord } from '../../services/QuestionService';
import { fetchLibraryPaginated } from '../../services/gasService';
import { 
  XMarkIcon, 
  SparklesIcon, 
  AcademicCapIcon, 
  DocumentTextIcon,
  CheckBadgeIcon,
  TagIcon,
  PencilSquareIcon,
  CheckIcon as CheckIconSolid,
  MagnifyingGlassIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { FormField, FormDropdown } from '../Common/FormComponents';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import { showXeenapsToast } from '../../utils/toastUtils';

interface QuestionSetupModalProps {
  item?: LibraryItem;
  items?: LibraryItem[]; 
  onClose: () => void;
  onComplete: () => void;
}

const QuestionSetupModal: React.FC<QuestionSetupModalProps> = ({ item, onClose, onComplete }) => {
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  
  // Smart Search Source State
  const [selectedSource, setSelectedSource] = useState<LibraryItem | null>(item || null);
  const [sourceSearch, setSourceSearch] = useState('');
  const [availableSources, setAvailableSources] = useState<LibraryItem[]>([]);
  const [isSearchingSources, setIsSearchingSources] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    bloomLevel: BloomsLevel.C2_UNDERSTAND,
    customLabel: '',
    count: 3,
    additionalContext: '',
    language: 'English'
  });

  // Manual Entry State
  const [manualData, setManualData] = useState({
    questionText: '',
    options: [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
      { key: 'E', text: '' }
    ] as QuestionOption[],
    correctAnswer: 'A',
    reasoningCorrect: '',
    reasoningDistractors: {
      'A': '', 'B': '', 'C': '', 'D': '', 'E': ''
    } as Record<string, string>,
    verbatimReference: ''
  });

  const bloomOptions = Object.values(BloomsLevel);
  const languages = ['English', 'Indonesian', 'French', 'German', 'Spanish'];

  // Smart Search Logic (Debounced Backend Fetch)
  useEffect(() => {
    if (item) return;
    
    const delayDebounceFn = setTimeout(async () => {
      if (sourceSearch.length < 2) {
        setAvailableSources([]);
        return;
      }
      
      setIsSearchingSources(true);
      try {
        const result = await fetchLibraryPaginated(1, 15, sourceSearch, 'All', 'research');
        setAvailableSources(result.items);
      } catch (err) {
        console.error("Failed to fetch sources", err);
      } finally {
        setIsSearchingSources(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [sourceSearch, item]);

  // Click Outside Results Panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateManual = () => {
    if (!selectedSource) return "Source Collection is mandatory.";
    if (!formData.customLabel.trim()) return "Question Set Label is mandatory.";
    if (!manualData.questionText.trim()) return "Question text is mandatory.";
    if (manualData.options.some(opt => !opt.text.trim())) return "All 5 options are mandatory.";
    if (!manualData.reasoningCorrect.trim()) return "Rationale for correct answer is mandatory.";
    if (!manualData.verbatimReference.trim()) return "Verbatim evidence is mandatory.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) {
      showXeenapsToast('error', 'Please select a source collection.');
      return;
    }
    if (!formData.customLabel.trim()) {
      showXeenapsToast('error', 'Question set label is mandatory.');
      return;
    }

    if (mode === 'AI') {
      setIsGenerating(true);
      try {
        const result = await generateQuestionsWorkflow({
          collectionId: selectedSource.id,
          extractedJsonId: selectedSource.extractedJsonId || '',
          nodeUrl: selectedSource.storageNodeUrl,
          ...formData
        });
        if (result) {
          setGeneratedCount(result.length);
          setIsGenerating(false);
        } else throw new Error();
      } catch (err) {
        showXeenapsToast('error', 'AI Generation Failed.');
        setIsGenerating(false);
      }
    } else {
      const error = validateManual();
      if (error) {
        showXeenapsToast('warning', error);
        return;
      }

      setIsGenerating(true);
      try {
        const cleanDistractors: Record<string, string> = {};
        Object.keys(manualData.reasoningDistractors).forEach(k => {
          if (k !== manualData.correctAnswer) cleanDistractors[k] = manualData.reasoningDistractors[k];
        });

        const newQuestion: QuestionItem = {
          id: crypto.randomUUID(),
          collectionId: selectedSource.id,
          bloomLevel: formData.bloomLevel,
          customLabel: formData.customLabel,
          questionText: manualData.questionText,
          options: manualData.options,
          correctAnswer: manualData.correctAnswer,
          reasoningCorrect: manualData.reasoningCorrect,
          reasoningDistractors: cleanDistractors,
          verbatimReference: manualData.verbatimReference,
          language: formData.language,
          createdAt: new Date().toISOString()
        };

        const success = await saveQuestionRecord(newQuestion);
        if (success) {
          setGeneratedCount(1);
        } else throw new Error();
      } catch (e) {
        showXeenapsToast('error', 'Manual save failed.');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden relative flex flex-col max-h-[95vh] md:max-h-[90vh]">
        
        {isGenerating && (
          <div className="absolute inset-0 z-[300] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
            <div className="w-20 h-20 mb-6 relative">
              <div className="absolute inset-0 border-4 border-[#004A74]/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#004A74] border-t-transparent rounded-full animate-spin" />
              <AcademicCapIcon className="absolute inset-0 m-auto w-8 h-8 text-[#004A74] animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tighter mb-2">Processing Data</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Synchronizing with Cloud Registry...</p>
          </div>
        )}

        {generatedCount !== null && (
          <div className="absolute inset-0 z-[310] bg-white flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-emerald-100">
              <CheckBadgeIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-[#004A74] uppercase tracking-tight mb-2">Success!</h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 mb-10">Knowledge record has been successfully anchored.</p>
            <button onClick={onComplete} className="w-full max-w-xs py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl">Return to Gallery</button>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 md:px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#004A74] text-[#FED400] rounded-xl flex items-center justify-center shadow-lg">
              <AcademicCapIcon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tight">Question Builder</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assessment & Evaluation Hub</p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
             <button onClick={() => setMode('AI')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${mode === 'AI' ? 'bg-[#004A74] text-white shadow-md' : 'text-gray-400'}`}>
                <SparklesIcon className="w-3.5 h-3.5" /> AI Mode
             </button>
             <button onClick={() => setMode('MANUAL')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${mode === 'MANUAL' ? 'bg-[#004A74] text-white shadow-md' : 'text-gray-400'}`}>
                <PencilSquareIcon className="w-3.5 h-3.5" /> Manual
             </button>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8">
          
          {/* COMMON FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!item ? (
              <div className="relative" ref={searchContainerRef}>
                <FormField label="Source Collection (Smart Search)" required>
                  <div className="relative group">
                    <MagnifyingGlassIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearchingSources ? 'text-[#004A74] animate-pulse' : 'text-gray-400'}`} />
                    <input 
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#004A74] outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/5 transition-all"
                      placeholder="Type title or keywords..."
                      value={selectedSource ? selectedSource.title : sourceSearch}
                      onChange={(e) => {
                        setSelectedSource(null);
                        setSourceSearch(e.target.value);
                        setShowResults(true);
                      }}
                      onFocus={() => setShowResults(true)}
                    />
                    {selectedSource && (
                       <button 
                         type="button" 
                         onClick={() => { setSelectedSource(null); setSourceSearch(''); }}
                         className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                       >
                         <XMarkIcon className="w-3 h-3 text-gray-400" />
                       </button>
                    )}
                  </div>
                </FormField>

                {/* Search Results Panel */}
                {showResults && sourceSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {isSearchingSources ? (
                        <div className="p-8 text-center"><Loader2Icon className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></div>
                      ) : availableSources.length === 0 ? (
                        <div className="p-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching literature</div>
                      ) : (
                        availableSources.map(src => (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => {
                              setSelectedSource(src);
                              setShowResults(false);
                            }}
                            className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 group flex items-start gap-3"
                          >
                            <BookOpenIcon className="w-4 h-4 text-gray-300 mt-0.5 group-hover:text-[#004A74]" />
                            <div className="min-w-0">
                               <p className="text-[11px] font-black text-[#004A74] uppercase truncate">{src.title}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{src.authors[0]} • {src.year} • {src.topic}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
               <FormField label="Context Source">
                 <div className="w-full px-5 py-3 bg-[#004A74]/5 border border-[#004A74]/10 rounded-xl text-[10px] font-black text-[#004A74] uppercase truncate">
                    {item.title}
                 </div>
               </FormField>
            )}

            <FormField label={mode === 'MANUAL' ? "Question Set Label *" : "Question Set Label"} required>
              <div className="relative">
                <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="w-full pl-11 pr-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#004A74] outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/5" placeholder="e.g., EXAM SET A..." value={formData.customLabel} onChange={(e) => setFormData({...formData, customLabel: e.target.value.toUpperCase()})} />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Cognitive Level" required>
              <FormDropdown value={formData.bloomLevel} options={bloomOptions} onChange={(v) => setFormData({...formData, bloomLevel: v as BloomsLevel})} placeholder="Level" allowCustom={false} showSearch={false} />
            </FormField>
            <FormField label="Language" required>
              <div className={mode === 'MANUAL' ? 'opacity-50 grayscale pointer-events-none' : ''}>
                <FormDropdown 
                  value={formData.language} 
                  options={languages} 
                  onChange={(v) => setFormData({...formData, language: v})} 
                  placeholder="Select Language" 
                  allowCustom={false} 
                  showSearch={false} 
                  disabled={mode === 'MANUAL'}
                />
              </div>
            </FormField>
          </div>

          <div className="h-px bg-gray-100" />

          {mode === 'AI' ? (
            /* AI CONFIG VIEW */
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <FormField label="Number of Questions (Max 5)">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <input type="range" min="1" max="5" value={formData.count} onChange={(e) => setFormData({...formData, count: parseInt(e.target.value)})} className="flex-1 accent-[#004A74]" />
                  <span className="w-10 h-10 bg-[#004A74] text-white rounded-xl flex items-center justify-center font-black text-sm">{formData.count}</span>
                </div>
              </FormField>
              <FormField label="Additional Context (Optional)">
                <textarea className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm min-h-[120px] outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/5" placeholder="Specific sub-chapters..." value={formData.additionalContext} onChange={(e) => setFormData({...formData, additionalContext: e.target.value})} />
              </FormField>
            </div>
          ) : (
            /* MANUAL FORM VIEW */
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
               <FormField label="Question Core Text *" required>
                  <textarea className="w-full px-6 py-4 bg-[#004A74]/5 border border-[#004A74]/10 rounded-2xl text-sm font-bold text-[#004A74] min-h-[100px] outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/10" placeholder="Enter your question here..." value={manualData.questionText} onChange={(e) => setManualData({...manualData, questionText: e.target.value})} />
               </FormField>

               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Response Options & Key *</label>
                  <div className="grid grid-cols-1 gap-3">
                    {manualData.options.map((opt, idx) => {
                      const isCorrect = manualData.correctAnswer === opt.key;
                      return (
                        <div key={opt.key} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${isCorrect ? 'bg-green-50 border-green-500/30' : 'bg-gray-50 border-gray-100'}`}>
                           <button type="button" onClick={() => setManualData({...manualData, correctAnswer: opt.key})} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shadow-sm transition-all ${isCorrect ? 'bg-green-500 text-white' : 'bg-white text-gray-400'}`}>
                             {isCorrect ? <CheckIconSolid className="w-4 h-4" strokeWidth={3} /> : opt.key}
                           </button>
                           <input className="flex-1 bg-transparent border-none p-0 text-xs font-bold text-[#004A74] outline-none" placeholder={`Option ${opt.key} text...`} value={opt.text} onChange={(e) => {
                              const newOpts = [...manualData.options];
                              newOpts[idx].text = e.target.value;
                              setManualData({...manualData, options: newOpts});
                           }} />
                        </div>
                      );
                    })}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                  <div className="space-y-6">
                    <FormField label="Correct Answer Rationale *" required>
                      <textarea className="w-full px-5 py-4 bg-green-50/30 border border-green-100 rounded-2xl text-[11px] font-medium text-green-800 min-h-[100px] outline-none focus:bg-white" placeholder="Why is the chosen key correct?" value={manualData.reasoningCorrect} onChange={(e) => setManualData({...manualData, reasoningCorrect: e.target.value})} />
                    </FormField>
                    <FormField label="Verbatim Evidence (from document) *" required>
                      <div className="relative group">
                         <DocumentTextIcon className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
                         <textarea className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[10px] font-bold italic text-gray-500 min-h-[80px] outline-none focus:bg-white" placeholder="Copy-paste the exact sentence from the source..." value={manualData.verbatimReference} onChange={(e) => setManualData({...manualData, verbatimReference: e.target.value})} />
                      </div>
                    </FormField>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Distractor Logics *</label>
                    {['A', 'B', 'C', 'D', 'E'].filter(k => k !== manualData.correctAnswer).map(k => (
                      <div key={k} className="flex items-start gap-3 p-3 bg-red-50/20 border border-red-100/50 rounded-xl">
                        <span className="text-[10px] font-black text-red-300 mt-1">{k}</span>
                        <input className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-gray-500 outline-none" placeholder={`Rationale for incorrect ${k}...`} value={manualData.reasoningDistractors[k]} onChange={(e) => {
                           const newRd = { ...manualData.reasoningDistractors };
                           newRd[k] = e.target.value;
                           setManualData({...manualData, reasoningDistractors: newRd});
                        }} />
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          <div className="pt-8 flex justify-end">
            <button type="submit" disabled={isGenerating} className="w-full md:w-auto px-12 py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4">
              {mode === 'AI' ? <SparklesIcon className="w-4 h-4" /> : <CheckIconSolid className="w-4 h-4" />}
              {mode === 'AI' ? 'Generate Assessment' : 'Secure Manual Record'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default QuestionSetupModal;

const Loader2Icon = (props: any) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
