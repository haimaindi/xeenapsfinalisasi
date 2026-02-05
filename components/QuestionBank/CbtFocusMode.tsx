import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QuestionItem } from '../../types';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface CbtFocusModeProps {
  questions: QuestionItem[];
  mode: 'CBT' | 'FLASHCARD';
  onClose: () => void;
}

const CbtFocusMode: React.FC<CbtFocusModeProps> = ({ questions, mode, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false); 

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelect = (key: string) => {
    if (showFeedback && mode === 'CBT') return;
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: key });
    if (mode === 'CBT') setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
      setIsFlipped(false);
    } else {
      // Last question reached, close the mode
      onClose();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowFeedback(false);
      setIsFlipped(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextQuestion();
      if (e.key === 'ArrowLeft') prevQuestion();
      if (e.key === ' ' && mode === 'FLASHCARD') setIsFlipped(prev => !prev);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, isFlipped]);

  return createPortal(
    <div 
      className="fixed top-0 right-0 bottom-0 z-[9999] bg-white flex flex-col animate-in fade-in duration-300 overflow-hidden transition-all duration-500 ease-in-out"
      style={{ left: 'var(--sidebar-offset, 0px)' }}
    >
      {/* Header - Compact */}
      <div className="px-4 md:px-8 py-2 md:py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-[#004A74] text-[#FED400] rounded-lg flex items-center justify-center shrink-0">
            {mode === 'CBT' ? <PlayIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <AcademicCapIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest truncate">{mode === 'CBT' ? 'Exam Simulation' : 'Flashcard Mastery'}</h2>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Item {currentIndex + 1} / {questions.length}</p>
          </div>
        </div>

        <button onClick={onClose} className="p-1.5 md:p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shrink-0">
          <XMarkIcon className="w-4 h-4 md:w-5 h-5" />
        </button>
      </div>

      <div className="w-full h-0.5 bg-gray-100 shrink-0 overflow-hidden">
        <div className="h-full bg-[#004A74] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Main Content Area - Reduced scaling */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/20 p-3 md:p-6 flex items-start justify-center">
        <div className="max-w-5xl w-full">
          
          {mode === 'CBT' ? (
            /* CBT UI - Compact Grid */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start animate-in slide-in-from-bottom-3 duration-500">
              
              {/* Left Column: Question Card */}
              <div className="lg:col-span-4 lg:sticky lg:top-0">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#004A74]/5 -translate-y-8 translate-x-8 rounded-full" />
                  <div className="flex items-center gap-1.5 mb-3">
                    <AcademicCapIcon className="w-3 h-3 text-[#004A74] opacity-30" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Context</span>
                  </div>
                  <h3 className="text-sm md:text-[15px] font-black text-[#004A74] leading-relaxed">
                    {currentQ.questionText}
                  </h3>
                </div>
              </div>

              {/* Right Column: Options */}
              <div className="lg:col-span-8 space-y-1.5 md:space-y-2">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedAnswers[currentIndex] === opt.key;
                  const isCorrect = opt.key === currentQ.correctAnswer;
                  
                  let bgStyle = "bg-white border-gray-100 text-[#004A74]";
                  let icon = null;
                  
                  if (showFeedback) {
                    if (isCorrect) {
                      bgStyle = "bg-green-50 border-green-500 text-green-700 shadow-sm ring-1 ring-green-500/10 z-10";
                      icon = <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />;
                    } else if (isSelected) {
                      bgStyle = "bg-red-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500/10";
                      icon = <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />;
                    } else {
                      bgStyle = "bg-gray-50/40 border-gray-100 text-gray-300 opacity-40";
                    }
                  } else if (isSelected) {
                    bgStyle = "bg-[#004A74] border-[#004A74] text-white shadow-md";
                  }

                  return (
                    <div key={opt.key} className="w-full">
                      <button 
                        onClick={() => handleSelect(opt.key)}
                        disabled={showFeedback}
                        className={`w-full group flex flex-col p-3 md:p-4 border-[1.2px] rounded-xl transition-all text-left ${bgStyle}`}
                      >
                        <div className="flex items-start gap-2.5 w-full">
                          <span className={`shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors ${isSelected ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-[#FED400]/20'}`}>
                            {opt.key}
                          </span>
                          <p className="flex-1 text-[11px] md:text-[12px] font-bold leading-relaxed pt-1">{opt.text}</p>
                          {icon}
                        </div>
                        
                        {showFeedback && (isCorrect || isSelected) && (
                          <div className={`mt-2 pt-2 border-t border-current/10 animate-in slide-in-from-top-0.5 duration-300 w-full`}>
                            <div className="flex items-start gap-1.5">
                               <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
                               <p className="text-[9px] font-semibold italic opacity-80 leading-relaxed">
                                 {isCorrect ? currentQ.reasoningCorrect : (currentQ.reasoningDistractors[opt.key] || "Incorrect logic based on analysis.")}
                               </p>
                            </div>
                            {isCorrect && currentQ.verbatimReference && (
                              <div className="mt-1.5 p-2 bg-white/40 rounded-lg border border-current/5">
                                 <p className="text-[7px] font-black uppercase tracking-widest opacity-40 mb-0.5 flex items-center gap-1">
                                   <DocumentMagnifyingGlassIcon className="w-2 h-2" /> Proof
                                 </p>
                                 <p className="text-[8px] font-bold opacity-70 leading-snug">"{currentQ.verbatimReference}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}

                {showFeedback && (
                   <div className="pt-2 flex justify-end animate-in fade-in zoom-in-95 duration-500">
                      <button 
                        onClick={nextQuestion} 
                        className="bg-[#004A74] text-[#FED400] px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        {currentIndex === questions.length - 1 ? 'Finish' : 'Next Item'} 
                        <ChevronRightIcon className="w-3 h-3 stroke-[3]" />
                      </button>
                   </div>
                )}
              </div>
            </div>
          ) : (
            /* FLASHCARD UI - Compact Card - SIZE REDUCED (h-380/450) */
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="group perspective w-full max-w-xl mx-auto h-[380px] md:h-[450px] cursor-pointer"
            >
              <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front Side */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] border-[1.2px] border-gray-100 shadow-xl p-8 md:p-12 flex flex-col items-center justify-center text-center">
                   <div className="absolute top-6 left-8 px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-widest">Question</div>
                   <AcademicCapIcon className="w-10 h-10 md:w-14 md:h-14 text-[#004A74] mb-8 opacity-10" />
                   <p className="text-lg md:text-xl font-black text-[#004A74] leading-relaxed px-4">
                     "{currentQ.questionText}"
                   </p>
                   <p className="mt-8 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] animate-pulse">Tap to reveal Answer</p>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#004A74] rounded-[2.5rem] p-8 md:p-12 flex flex-col shadow-2xl text-white">
                   <div className="absolute top-6 left-8 px-3 py-1 bg-white/10 text-white/50 rounded-lg text-[9px] font-black uppercase tracking-widest">Answer</div>
                   
                   <div className="mt-6 mb-4">
                      <p className="text-[10px] md:text-xs font-black bg-[#FED400] text-[#004A74] px-4 py-2 inline-block rounded-xl shadow-lg uppercase tracking-widest">Key: {currentQ.correctAnswer}</p>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto custom-scrollbar-white pr-2 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black mb-1 uppercase tracking-widest text-[#FED400]">Rationale</h4>
                        <p className="text-xs md:text-sm font-medium leading-relaxed opacity-90 italic">
                          "{currentQ.reasoningCorrect}"
                        </p>
                      </div>
                      
                      <div className="h-px bg-white/10" />
                      
                      <div className="bg-white/5 p-4 rounded-3xl border border-white/5 shadow-inner">
                        <h5 className="text-[8px] font-black uppercase tracking-widest mb-2 text-[#FED400] flex items-center gap-2">
                           <DocumentMagnifyingGlassIcon className="w-3 h-3" /> Source Verification
                        </h5>
                        <p className="text-[10px] md:text-xs font-bold leading-relaxed italic opacity-80">"{currentQ.verbatimReference}"</p>
                      </div>
                   </div>
                   <p className="mt-4 text-center text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">Tap to flip</p>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Navigation Footer - Reduced height */}
      <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
        <button onClick={prevQuestion} disabled={currentIndex === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black text-[#004A74] uppercase hover:bg-gray-50 disabled:opacity-20 transition-all shrink-0">
          <ChevronLeftIcon className="w-3 h-3 stroke-[3]" /> <span className="hidden sm:inline">Prev</span>
        </button>
        
        <div className="flex items-center gap-3">
           <button onClick={() => { setSelectedAnswers({}); setShowFeedback(false); setIsFlipped(false); }} className="p-1.5 text-gray-300 hover:text-[#004A74] transition-all" title="Reset"><ArrowPathIcon className="w-3.5 h-3.5" /></button>
           <p className="text-[9px] font-black text-[#004A74] uppercase tracking-widest">{currentIndex + 1} / {questions.length}</p>
        </div>

        <button 
          onClick={nextQuestion} 
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#004A74] text-white rounded-lg text-[9px] font-black uppercase shadow-md hover:scale-105 transition-all shrink-0"
        >
          <span className="hidden sm:inline">{currentIndex === questions.length - 1 ? 'Finish' : 'Next'}</span> 
          <ChevronRightIcon className="w-3 h-3 stroke-[3]" />
        </button>
      </div>

      <style>{`
        .perspective { perspective: 1500px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar-white::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar-white::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
    </div>,
    document.body
  );
};

export default CbtFocusMode;

const PlayIcon = (props: any) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);
