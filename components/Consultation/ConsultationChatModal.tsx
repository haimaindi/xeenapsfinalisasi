
import React, { useState, useEffect, useRef } from 'react';
import { ConsultationItem, LibraryItem, ConsultationAnswerContent } from '../../types';
import { callAiConsult, saveConsultation } from '../../services/ConsultationService';
import { fetchFileContent } from '../../services/gasService';
import { 
  XMarkIcon, 
  SparklesIcon, 
  PaperAirplaneIcon,
  TrashIcon,
  StarIcon,
  LightBulbIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { showXeenapsToast } from '../../utils/toastUtils';

interface ConsultationChatModalProps {
  collection: LibraryItem;
  existingConsult?: ConsultationItem | null;
  onClose: () => void;
}

const ConsultationChatModal: React.FC<ConsultationChatModalProps> = ({ collection, existingConsult, onClose }) => {
  const [question, setQuestion] = useState(existingConsult?.question || '');
  const [answerContent, setAnswerContent] = useState<ConsultationAnswerContent | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const [isFavorite, setIsFavorite] = useState(existingConsult?.isFavorite || false);
  const [isFetchingAnswer, setIsFetchingAnswer] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStoredAnswer = async () => {
      if (existingConsult?.answerJsonId) {
        setIsFetchingAnswer(true);
        const data = await fetchFileContent(existingConsult.answerJsonId, existingConsult.nodeUrl);
        if (data) setAnswerContent(data);
        setIsFetchingAnswer(false);
      }
    };
    loadStoredAnswer();
  }, [existingConsult]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [answerContent, isThinking]);

  const handleConsult = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isThinking) return;

    setIsThinking(true);
    setAnswerContent(null);

    try {
      const result = await callAiConsult(collection.id, question);
      if (result) {
        setAnswerContent(result);
        
        // AUTO SAVE / UPDATE (Total Rewrite)
        const newItem: ConsultationItem = {
          id: existingConsult?.id || crypto.randomUUID(),
          collectionId: collection.id,
          question: question,
          answerJsonId: existingConsult?.answerJsonId || '',
          nodeUrl: existingConsult?.nodeUrl || '',
          isFavorite: isFavorite,
          createdAt: existingConsult?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const success = await saveConsultation(newItem, result);
        if (success) {
          showXeenapsToast('success', existingConsult ? 'Synthesis Overwritten' : 'Consultation Synchronized');
        }
      } else {
        showXeenapsToast('error', 'AI Synthesis Interrupted');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection lost');
    } finally {
      setIsThinking(false);
    }
  };

  const toggleFavorite = () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    if (existingConsult && answerContent) {
      saveConsultation({ ...existingConsult, isFavorite: newVal }, answerContent);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-full border border-white/20 relative">
        
        {/* MODAL HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg relative">
                 <CpuChipIcon className="w-6 h-6" />
                 {isThinking && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
              </div>
              <div>
                 <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">AI Knowledge Partner</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Groq AI • Rational Synthesis Engine</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <button onClick={toggleFavorite} className="p-2 hover:scale-125 transition-transform">
                {isFavorite ? <StarSolid className="w-6 h-6 text-[#FED400]" /> : <StarIcon className="w-6 h-6 text-gray-300" />}
              </button>
              {/* Fix: Removed invalid onClose prop from button element */}
              <button className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all" onClick={onClose}>
                 <XMarkIcon className="w-8 h-8" />
              </button>
           </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-white">
           <div className="max-w-3xl mx-auto space-y-10">
              
              {/* SOURCE BANNER */}
              <div className="bg-[#004A74]/5 border border-[#004A74]/10 rounded-[2.5rem] p-6 flex items-center gap-4">
                 <BookOpenIcon className="w-10 h-10 text-[#004A74] opacity-20 shrink-0" />
                 <div className="min-w-0">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Document</p>
                    <h4 className="text-xs font-black text-[#004A74] uppercase truncate leading-tight">{collection.title}</h4>
                 </div>
              </div>

              {/* QUESTION BUBBLE (USER) */}
              <div className="flex flex-col items-end gap-2 animate-in slide-in-from-right-4">
                 <div className="bg-gray-100 text-[#004A74] px-8 py-5 rounded-[2.5rem] rounded-tr-sm shadow-sm max-w-[85%]">
                    <p className="text-sm font-bold leading-relaxed">{question || "Awaiting inquiry..."}</p>
                 </div>
              </div>

              {/* LOADER / FETCHING ANSWER */}
              {(isThinking || isFetchingAnswer) && (
                <div className="flex items-start gap-4 animate-in slide-in-from-left-4">
                   <div className="w-10 h-10 bg-[#FED400] text-[#004A74] rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                   </div>
                   <div className="space-y-4 flex-1">
                      <div className="p-6 bg-gray-50 rounded-[2.5rem] rounded-tl-sm border border-gray-100 italic text-gray-400 text-xs">
                         AI is traversing knowledge nodes...
                      </div>
                   </div>
                </div>
              )}

              {/* ANSWER AREA */}
              {answerContent && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                   
                   {/* 1. THINKING PROCESS (IF ANY) */}
                   {answerContent.reasoning && (
                     <div className="space-y-3">
                        <button 
                          onClick={() => setShowReasoning(!showReasoning)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 text-gray-400 hover:text-[#004A74] rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                           <CpuChipIcon className="w-3 h-3" /> 
                           {showReasoning ? 'Hide Thinking Process' : 'Show Thinking Process'}
                        </button>
                        
                        {showReasoning && (
                          <div className="p-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-[2rem] text-[11px] text-gray-500 font-medium italic leading-relaxed whitespace-pre-wrap">
                             {answerContent.reasoning}
                          </div>
                        )}
                     </div>
                   )}

                   {/* 2. FINAL ANSWER BUBBLE */}
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shrink-0 shadow-xl border border-white/20">
                         <SparklesIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-4">
                         <div className="p-8 bg-white border border-gray-100 rounded-[3rem] rounded-tl-sm shadow-xl relative">
                            <div 
                              className="text-sm md:text-base leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap consultation-output"
                              dangerouslySetInnerHTML={{ __html: answerContent.answer }} 
                            />
                         </div>
                      </div>
                   </div>
                </div>
              )}

              <div ref={bottomRef} className="h-4" />
           </div>
        </div>

        {/* INPUT AREA */}
        <div className="p-8 md:p-10 border-t border-gray-100 bg-gray-50/80 shrink-0">
           <form onSubmit={handleConsult} className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="flex-1 relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#004A74] transition-colors">
                    <LightBulbIcon className="w-6 h-6" />
                 </div>
                 <input 
                   className="w-full pl-16 pr-6 py-5 bg-white border border-gray-200 rounded-[2rem] outline-none text-sm font-bold text-[#004A74] shadow-sm focus:ring-4 focus:ring-[#004A74]/5 focus:border-[#004A74]/30 transition-all placeholder:text-gray-300"
                   placeholder="Ask Groq AI anything about this document..."
                   value={question}
                   onChange={(e) => setQuestion(e.target.value)}
                   disabled={isThinking}
                 />
              </div>
              <button 
                type="submit"
                disabled={!question.trim() || isThinking}
                className="w-16 h-16 bg-[#004A74] text-[#FED400] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#004A74]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
              >
                {isThinking ? <ArrowPathIcon className="w-7 h-7 animate-spin" /> : <PaperAirplaneIcon className="w-7 h-7 -rotate-45" />}
              </button>
           </form>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        
        .xeenaps-highlight {
           background-color: #FED40030;
           color: #004A74;
           padding: 0 4px;
           border-radius: 4px;
           font-weight: 700;
        }

        .consultation-output b {
           color: #004A74;
           font-weight: 800;
        }
      `}</style>
    </div>
  );
};

export default ConsultationChatModal;
