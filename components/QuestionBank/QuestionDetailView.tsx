import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QuestionItem, BloomsLevel, LibraryItem } from '../../types';
import { 
  XMarkIcon, 
  CheckBadgeIcon, 
  AcademicCapIcon,
  TagIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Grip } from 'lucide-react';
import TeachingSessionPicker from '../Teaching/TeachingSessionPicker';

interface QuestionDetailViewProps {
  question: QuestionItem;
  collection: LibraryItem;
  onClose: () => void;
  onViewSource: () => void;
  showSourceInfo?: boolean;
}

const QuestionDetailView: React.FC<QuestionDetailViewProps> = ({ 
  question, 
  collection, 
  onClose, 
  onViewSource,
  showSourceInfo = true
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const getBloomColor = (level: BloomsLevel) => {
    if (level.includes('C1') || level.includes('C2')) return 'bg-green-500';
    if (level.includes('C3') || level.includes('C4')) return 'bg-[#004A74]';
    return 'bg-[#FED400] text-[#004A74]';
  };

  return createPortal(
    <div 
      className="fixed top-0 right-0 bottom-0 z-[9999] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden transition-all duration-500 ease-in-out"
      style={{ left: 'var(--sidebar-offset, 0px)' }}
    >
      {isPickerOpen && (
        <TeachingSessionPicker 
          item={question} 
          onClose={() => setIsPickerOpen(false)} 
        />
      )}

      {/* Header - Minimal Sticky */}
      <div className="px-6 md:px-10 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-50 text-[#004A74] rounded-xl flex items-center justify-center shadow-sm">
            <InformationCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#004A74] uppercase tracking-widest">Question Anatomy</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Deep Pedagogical Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPickerOpen(true)}
            className="p-2 bg-gray-50 text-[#004A74] rounded-xl hover:bg-[#FED400] hover:text-[#004A74] transition-all shadow-sm"
            title="Grip to Teaching"
          >
            <Grip className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/10">
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          
          {/* GRID ATAS: Question Card (Improved responsive alignment) */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-lg border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#004A74]/5 -translate-y-16 translate-x-16 rounded-full" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
               <div className="flex items-center gap-2">
                  <AcademicCapIcon className="w-4 h-4 text-[#004A74] opacity-30" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Target Assessment</span>
               </div>
               <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${getBloomColor(question.bloomLevel)}`}>
                    {question.bloomLevel}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-200 shadow-sm flex items-center gap-1.5">
                    <TagIcon className="w-2.5 h-2.5" /> {question.customLabel}
                  </span>
               </div>
            </div>

            <h3 className="text-base md:text-lg font-black text-[#004A74] leading-relaxed relative z-10">
              "{question.questionText}"
            </h3>
          </div>

          {/* GRID TENGAH: Aligned Options and Explanations */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6 px-4">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Response Options</span>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Logic & Rationale</span>
            </div>
            
            <div className="space-y-3">
              {question.options.map((opt) => {
                const isCorrect = opt.key === question.correctAnswer;
                const explanation = isCorrect ? question.reasoningCorrect : (question.reasoningDistractors[opt.key] || "Incorrect premise based on analysis.");
                
                return (
                  <div key={opt.key} className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                    {/* Left: Option Card */}
                    <div className={`p-4 md:p-5 rounded-2xl border-[1.2px] transition-all flex items-start gap-3 ${
                      isCorrect ? 'bg-green-50 border-green-500/30 ring-2 ring-green-500/5' : 'bg-white border-gray-100 shadow-sm'
                    }`}>
                      <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] ${
                        isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-[#004A74]'
                      }`}>
                        {opt.key}
                      </span>
                      <p className={`text-[12px] font-bold leading-relaxed pt-1 ${isCorrect ? 'text-green-800' : 'text-gray-600'}`}>
                        {opt.text}
                      </p>
                    </div>

                    {/* Right: Rationale Card (Aligned) */}
                    <div className={`p-4 md:p-5 rounded-2xl border-[1.2px] flex items-start gap-3 transition-all ${
                      isCorrect ? 'bg-green-50/40 border-green-500/10' : 'bg-red-50/20 border-red-500/5'
                    }`}>
                      <div className="shrink-0 mt-0.5">
                        {isCorrect ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <XCircleIcon className="w-4 h-4 text-red-300" />}
                      </div>
                      <p className={`text-[11px] font-semibold italic leading-relaxed ${isCorrect ? 'text-green-700/80' : 'text-red-700/60'}`}>
                        {explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GRID BAWAH: Fullwidth Verbatim & Source Title */}
          <div className="bg-[#004A74] rounded-[2.5rem] shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -translate-y-16 translate-x-16 rounded-full group-hover:scale-110 transition-transform duration-700" />
            
            <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
              {/* Verbatim Section */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <DocumentMagnifyingGlassIcon className="w-4 h-4 text-[#FED400]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FED400]">Source Verification (Verbatim)</span>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 border-l-[4px] border-l-[#FED400]">
                  <p className="text-xs md:text-sm font-medium text-white leading-relaxed italic opacity-90">
                    "{question.verbatimReference}"
                  </p>
                </div>
              </div>

              {/* Source Link Section */}
              {showSourceInfo && (
                <div className="w-full md:w-80 shrink-0 animate-in fade-in slide-in-from-right-2 duration-500">
                  <div className="flex items-center gap-2 mb-4">
                     <CheckBadgeIcon className="w-4 h-4 text-[#FED400]" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FED400]/60">Collection Root</span>
                  </div>
                  <button 
                    onClick={onViewSource}
                    className="w-full p-6 bg-white/10 hover:bg-[#FED400] group/src rounded-3xl border border-white/10 transition-all duration-500 text-left relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <p className="text-[8px] font-black text-white/40 group-hover/src:text-[#004A74]/50 uppercase tracking-widest mb-1">Source Title</p>
                      <h4 className="text-xs font-black text-white group-hover/src:text-[#004A74] uppercase line-clamp-3 leading-tight">{collection.title}</h4>
                      <div className="mt-4 flex items-center gap-2 text-[#FED400] group-hover/src:text-[#004A74] transition-colors">
                         <span className="text-[9px] font-black uppercase tracking-widest">Go to Details</span>
                         <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="px-10 py-5 bg-white border-t border-gray-50 flex items-center justify-center shrink-0">
        <p className="text-[7px] font-black text-gray-300 uppercase tracking-[0.6em]">XEENAPS ASSESSMENT INFRASTRUCTURE • VERIFIED OUTPUT</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7415; border-radius: 10px; }
      `}</style>
    </div>,
    document.body
  );
};

export default QuestionDetailView;