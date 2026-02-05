import React from 'react';
import { CVTemplateType } from '../../types';
import { X, User, Circle } from 'lucide-react';

interface CVPreviewModalProps {
  template: CVTemplateType;
  onClose: () => void;
}

const CVPreviewModal: React.FC<CVPreviewModalProps> = ({ template, onClose }) => {
  
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden relative flex flex-col border border-white/20">
        
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div>
              <h3 className="text-lg font-black text-[#004A74] uppercase tracking-tight">Xeenaps Standard Professional</h3>
              <p className="text-[9px] font-bold text-black uppercase tracking-widest">Chronological Timeline • Aligned Matrix</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
              <X className="w-6 h-6" />
           </button>
        </div>

        <div className="p-8 bg-gray-100 flex items-center justify-center overflow-hidden">
           <div className="aspect-[1/1.414] w-[280px] md:w-[320px] bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden transform hover:scale-105 transition-transform duration-700 p-6 flex flex-col space-y-6">
              {/* Header Grid Prototype */}
              <div className="flex gap-4 border-b-2 border-[#004A74] pb-4">
                 <div className="w-16 h-20 bg-gray-50 border border-[#004A74] rounded-sm shrink-0 flex items-center justify-center text-[#004A74]">
                    <User size={20} />
                 </div>
                 <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-[#004A74] rounded-sm" />
                    <div className="space-y-1">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="flex gap-2 items-center">
                            <div className="h-1 w-8 bg-black opacity-20 rounded-full" />
                            <div className="h-1 w-12 bg-black opacity-40 rounded-full" />
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Summary Prototype */}
              <div className="p-3 border-l-4 border-[#004A74] bg-gray-50">
                 <div className="h-1 w-full bg-black opacity-40 rounded-sm mb-1" />
                 <div className="h-1 w-2/3 bg-black opacity-40 rounded-sm" />
              </div>

              {/* Timeline Prototype */}
              <div className="space-y-5 flex-1">
                 <div className="space-y-4">
                    <div className="h-2 w-24 bg-[#004A74] rounded-sm" />
                    <div className="relative pl-4 border-l border-[#004A74] space-y-4 ml-1">
                       {[1, 2].map(i => (
                          <div key={i} className="relative">
                             <div className="absolute -left-[21px] top-0 w-2 h-2 rounded-full bg-[#004A74] border border-white" />
                             <div className="flex justify-between items-center mb-1">
                                <div className="h-1.5 w-20 bg-black rounded-sm" />
                                <div className="h-1 w-10 bg-black opacity-30 rounded-full" />
                             </div>
                             <div className="h-1 w-24 bg-black opacity-20 rounded-sm" />
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="h-2 w-20 bg-[#004A74] rounded-sm" />
                    <div className="space-y-2 pt-1">
                       <div className="flex justify-between items-center">
                          <div className="h-1.5 w-full bg-black opacity-40 rounded-sm" />
                       </div>
                       <div className="h-1 w-2/3 bg-black opacity-20 rounded-sm" />
                    </div>
                 </div>
              </div>

              {/* Footer Prototype */}
              <div className="mt-auto pt-2 border-t border-black text-center opacity-40">
                <div className="h-1 w-32 bg-black mx-auto rounded-full" />
              </div>
           </div>
        </div>

        <div className="px-10 py-6 border-t border-gray-100 text-center bg-gray-50/30">
           <button 
             onClick={onClose}
             className="px-10 py-3 bg-[#004A74] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
           >
             Close Prototype
           </button>
        </div>

      </div>
    </div>
  );
};

export default CVPreviewModal;