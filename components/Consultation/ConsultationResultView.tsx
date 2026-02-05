
import React, { useState, useEffect, useRef } from 'react';
import { ConsultationItem, LibraryItem, ConsultationAnswerContent } from '../../types';
import { saveConsultation, callAiConsult, deleteConsultation } from '../../services/ConsultationService';
import { fetchFileContent } from '../../services/gasService';
import { 
  ArrowLeftIcon, 
  SparklesIcon, 
  StarIcon,
  CpuChipIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';

interface ConsultationResultViewProps {
  collection: LibraryItem;
  consultation: ConsultationItem;
  initialAnswer?: ConsultationAnswerContent | null;
  onBack: () => void;
  onUpdate?: (updated: ConsultationItem) => void;
}

const ConsultationResultView: React.FC<ConsultationResultViewProps> = ({ collection, consultation, initialAnswer, onBack, onUpdate }) => {
  const [answerContent, setAnswerContent] = useState<ConsultationAnswerContent | null>(initialAnswer || null);
  const [localQuestion, setLocalQuestion] = useState(consultation.question);
  const [tempQuestion, setTempQuestion] = useState(consultation.question);
  const [isEditing, setIsEditing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const [isFavorite, setIsFavorite] = useState(consultation.isFavorite || false);
  const [isLoading, setIsLoading] = useState(!initialAnswer);
  const [isThinking, setIsThinking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadStoredAnswer = async () => {
      if (!initialAnswer && consultation.answerJsonId) {
        setIsLoading(true);
        const data = await fetchFileContent(consultation.answerJsonId, consultation.nodeUrl);
        if (data) setAnswerContent(data);
        setIsLoading(false);
      }
    };
    loadStoredAnswer();
  }, [consultation, initialAnswer]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [localQuestion, tempQuestion, isEditing]);

  const handleStartEdit = () => {
    setTempQuestion(localQuestion);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setTempQuestion(localQuestion);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const newQuestion = tempQuestion.trim();
    if (!newQuestion) return;

    // Optimistic Update UI
    setLocalQuestion(newQuestion);
    setIsEditing(false);

    // Notify Parent instantly (Optimistic)
    const updatedItem = {
      ...consultation,
      question: newQuestion,
      updatedAt: new Date().toISOString()
    };
    onUpdate?.(updatedItem);

    // Silent Background Sync
    if (answerContent) {
      saveConsultation(updatedItem, answerContent);
    }
  };

  const handleReConsult = async () => {
    // Gunakan tempQuestion jika sedang editing, atau localQuestion jika sudah di save
    const targetQuestion = isEditing ? tempQuestion : localQuestion;
    if (!targetQuestion.trim() || isThinking) return;

    setIsThinking(true);
    showXeenapsToast('info', 'Re-architecting knowledge synthesis...');

    try {
      const result = await callAiConsult(collection.id, targetQuestion);
      if (result) {
        setAnswerContent(result);
        
        // Update Registry & Shard
        const updatedItem: ConsultationItem = {
          ...consultation,
          question: targetQuestion,
          updatedAt: new Date().toISOString()
        };

        onUpdate?.(updatedItem);
        const success = await saveConsultation(updatedItem, result);
        if (success) {
          showXeenapsToast('success', 'Synthesis Re-synchronized');
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
    
    const updatedItem = { ...consultation, isFavorite: newVal };
    onUpdate?.(updatedItem);
    
    if (answerContent) {
      // Silent Background Sync
      saveConsultation(updatedItem, answerContent);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteConsultation(consultation.id);
      if (success) {
        showXeenapsToast('success', 'Consultation deleted');
        onBack();
      }
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90">
               <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
               <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight truncate max-w-md">Consultation Analysis</h2>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Synthesized by Groq AI</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <button onClick={toggleFavorite} className="p-3 bg-gray-50 text-[#FED400] hover:bg-[#FED400]/10 rounded-xl transition-all shadow-sm active:scale-90 border border-gray-100">
               {isFavorite ? <StarSolid className="w-6 h-6" /> : <StarIcon className="w-6 h-6" />}
            </button>
            <button onClick={handleDelete} className="p-3 bg-gray-50 text-red-400 hover:bg-red-50 rounded-xl transition-all shadow-sm active:scale-90 border border-gray-100">
               <TrashIcon className="w-6 h-6" />
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-[#fcfcfc]">
         <div className="max-w-4xl mx-auto space-y-10">
            
            {/* SOURCE BANNER */}
            <div className="bg-[#004A74] rounded-[2.5rem] p-8 md:p-10 shadow-xl relative overflow-hidden group shrink-0">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 -translate-y-24 translate-x-24 rounded-full" />
               <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 text-[#FED400]">
                     <BookOpenIcon className="w-6 h-6" />
                     <span className="text-[10px] font-black uppercase tracking-[0.4em]">Target Knowledge Root</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase leading-tight tracking-tight">{collection.title}</h3>
                  <div className="pt-4 border-t border-white/10 flex items-center gap-6">
                     <div className="text-white/60 text-[9px] font-bold uppercase tracking-widest">
                        Topic: <span className="text-white">{collection.topic}</span>
                     </div>
                     <div className="text-white/60 text-[9px] font-bold uppercase tracking-widest">
                        Date: <span className="text-white">{formatDisplayDate(consultation.createdAt)}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* EDITABLE QUESTION DISPLAY */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-[#004A74]/15 shadow-sm relative overflow-hidden group/question transition-all">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FED400]" />
               <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <CpuChipIcon className="w-3 h-3" /> Inquiry Context (Editable)
                  </p>
                  
                  {/* EDIT BUTTONS */}
                  <div className="flex items-center gap-2">
                     {!isEditing ? (
                       <button 
                         onClick={handleStartEdit}
                         className="p-1.5 text-gray-400 hover:text-[#004A74] hover:bg-gray-100 rounded-lg transition-all"
                         title="Edit Question"
                       >
                         <PencilIcon className="w-4 h-4" />
                       </button>
                     ) : (
                       <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                         <button 
                           onClick={handleSaveEdit}
                           className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
                           title="Save Changes"
                         >
                           <CheckIcon className="w-4 h-4 stroke-[3]" />
                         </button>
                         <button 
                           onClick={handleCancelEdit}
                           className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-all"
                           title="Cancel"
                         >
                           <XMarkIcon className="w-4 h-4" />
                         </button>
                       </div>
                     )}
                  </div>
               </div>
               
               <div className="space-y-6">
                  {isEditing ? (
                    <textarea 
                      ref={textareaRef}
                      autoFocus
                      className="w-full bg-gray-50 border-2 border-[#004A74]/10 p-4 rounded-2xl outline-none text-lg md:text-xl font-bold text-[#004A74] leading-relaxed italic placeholder:text-gray-200 resize-none overflow-hidden"
                      value={tempQuestion}
                      onChange={(e) => setTempQuestion(e.target.value)}
                      placeholder="Enter your inquiry for analysis..."
                      rows={1}
                    />
                  ) : (
                    <p className="text-lg md:text-xl font-bold text-[#004A74] leading-relaxed italic">
                      "{localQuestion}"
                    </p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={handleReConsult}
                      disabled={isThinking || (isEditing ? !tempQuestion.trim() : !localQuestion.trim())}
                      className="flex items-center gap-3 px-8 py-3.5 bg-[#004A74] text-[#FED400] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
                    >
                      {isThinking ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
                          Re-Analyze Knowledge
                        </>
                      )}
                    </button>
                  </div>
               </div>
            </div>

            {(isLoading || isThinking) ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-24 w-full bg-gray-100 rounded-[2rem]" />
                <div className="h-96 w-full bg-gray-100 rounded-[2.5rem]" />
              </div>
            ) : answerContent && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                 
                 {/* THINKING PROCESS BOX */}
                 {answerContent.reasoning && (
                   <div className="bg-gray-50 border border-gray-100 rounded-[2.5rem] overflow-hidden">
                      <button 
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="w-full px-8 py-5 flex items-center justify-between text-[#004A74] hover:bg-gray-100 transition-all"
                      >
                         <div className="flex items-center gap-3">
                            <CpuChipIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">AI Reasoning Context</span>
                         </div>
                         {showReasoning ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </button>
                      
                      {showReasoning && (
                        <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                           <div className="p-6 bg-white border border-gray-100 rounded-2xl text-xs text-gray-500 font-medium italic leading-relaxed whitespace-pre-wrap">
                              {answerContent.reasoning}
                           </div>
                        </div>
                      )}
                   </div>
                 )}

                 {/* FINAL SYNTHESIS BUBBLE */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[#004A74] px-4">
                       <SparklesIcon className="w-6 h-6 text-[#FED400]" />
                       <span className="text-[11px] font-black uppercase tracking-[0.3em]">Knowledge Synthesis Output</span>
                    </div>
                    <div className="p-10 md:p-14 bg-white border border-gray-100 rounded-[3.5rem] shadow-xl relative min-h-[400px]">
                       <div 
                         className="text-base md:text-lg leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap consultation-result-body"
                         dangerouslySetInnerHTML={{ __html: answerContent.answer }} 
                       />
                    </div>
                 </div>
              </div>
            )}

            <div ref={scrollRef} className="h-20" />
         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        
        .consultation-result-body b {
           color: #004A74;
           font-weight: 800;
        }

        .xeenaps-highlight {
           background-color: #FED40030;
           color: #004A74;
           padding: 0 4px;
           border-radius: 4px;
           font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default ConsultationResultView;
