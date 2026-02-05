
import React, { useState } from 'react';
import { LibraryItem, ConsultationItem, ConsultationAnswerContent } from '../../types';
import { callAiConsult, saveConsultation } from '../../services/ConsultationService';
import { 
  XMarkIcon, 
  PaperAirplaneIcon,
  LightBulbIcon,
  ArrowPathIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { showXeenapsToast } from '../../utils/toastUtils';

interface ConsultationInputModalProps {
  collection: LibraryItem;
  onClose: () => void;
  onSuccess: (item: ConsultationItem, content: ConsultationAnswerContent) => void;
}

const ConsultationInputModal: React.FC<ConsultationInputModalProps> = ({ collection, onClose, onSuccess }) => {
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isThinking) return;

    setIsThinking(true);
    try {
      const result = await callAiConsult(collection.id, question);
      if (result) {
        const newItem: ConsultationItem = {
          id: crypto.randomUUID(),
          collectionId: collection.id,
          question: question,
          answerJsonId: '',
          nodeUrl: '',
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const success = await saveConsultation(newItem, result);
        if (success) {
          onSuccess(newItem, result);
        } else {
          showXeenapsToast('error', 'Sync failed');
        }
      } else {
        showXeenapsToast('error', 'AI synthesis interrupted');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection lost');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20 relative">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#004A74] text-[#FED400] rounded-xl flex items-center justify-center shadow-lg">
                 <CpuChipIcon className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-lg font-black text-[#004A74] uppercase tracking-tight">New Consultation</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ask Groq Reasoner Engine</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
              <XMarkIcon className="w-6 h-6" />
           </button>
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                 <LightBulbIcon className="w-3 h-3" /> Inquiry for Analysis
              </label>
              <textarea 
                autoFocus
                className="w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-[2rem] outline-none text-sm font-bold text-[#004A74] focus:ring-4 focus:ring-[#004A74]/5 focus:border-[#004A74]/30 transition-all placeholder:text-gray-300 min-h-[150px] resize-none"
                placeholder="What deep insights do you seek from this document?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isThinking}
              />
           </div>

           <button 
             type="submit"
             disabled={!question.trim() || isThinking}
             className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:grayscale"
           >
              {isThinking ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Traversing knowledge nodes...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
                  Analyze Knowledge
                </>
              )}
           </button>
        </form>
      </div>
    </div>
  );
};

export default ConsultationInputModal;
