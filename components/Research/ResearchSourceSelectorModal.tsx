import React, { useState, useEffect } from 'react';
import { LibraryItem, LibraryType } from '../../types';
import { fetchLibraryPaginated } from '../../services/gasService';
import { 
  XMarkIcon, 
  CheckIcon,
  PlusIcon,
  BookOpenIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon
} from '@heroicons/react/24/outline';
import { SmartSearchBox } from '../Common/SearchComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';

interface ResearchSourceSelectorModalProps {
  onClose: () => void;
  onAudit: (selected: LibraryItem[]) => void;
  currentMatrixCount: number;
}

const ResearchSourceSelectorModal: React.FC<ResearchSourceSelectorModalProps> = ({ onClose, onAudit, currentMatrixCount }) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selected, setSelected] = useState<LibraryItem[]>([]);

  const itemsPerPage = 10;
  const GLOBAL_MAX = 10;
  const SESSION_MAX = 3;
  const remainingTotalSlots = GLOBAL_MAX - currentMatrixCount;
  const effectiveSessionMax = Math.min(SESSION_MAX, remainingTotalSlots);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const result = await fetchLibraryPaginated(currentPage, itemsPerPage, appliedSearch, LibraryType.LITERATURE, 'research', 'createdAt', 'desc');
      // Hanya menampilkan yang sudah diproses AI (extractedJsonId ada)
      setItems(result.items.filter(it => !!it.extractedJsonId));
      setTotalCount(result.totalCount);
      setIsLoading(false);
    };
    loadData();
  }, [currentPage, appliedSearch]);

  const handleSearch = () => {
    setAppliedSearch(localSearch);
    setCurrentPage(1);
  };

  const toggleSelect = (item: LibraryItem) => {
    const isAlreadySelected = selected.some(s => s.id === item.id);
    if (isAlreadySelected) {
      setSelected(selected.filter(s => s.id !== item.id));
    } else {
      if (selected.length >= effectiveSessionMax) return;
      setSelected([...selected, item]);
    }
  };

  const handleExecute = () => {
    if (selected.length === 0) return;
    onAudit(selected);
    setSelected([]); 
    onClose(); 
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const start = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-6 bg-black/40 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
        
        {/* Header Identik dengan Review */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#004A74] text-[#FED400] rounded-xl flex items-center justify-center shadow-md">
              <BookOpenIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#004A74] uppercase tracking-tight leading-none">Literature Discovery</h2>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Select relevant literature sources</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={handleSearch} 
            className="w-full"
            phrases={["Search Title...", "Search Author(s)..."]}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden px-4 py-2 flex flex-col bg-[#fcfcfc]">
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 pb-2">
              {isLoading ? (
                <CardGridSkeleton count={6} />
              ) : items.length === 0 ? (
                <div className="py-20 text-center opacity-30 flex flex-col items-center">
                   <InboxIcon className="w-12 h-12 mb-2 text-[#004A74]" />
                   <p className="text-[9px] font-black uppercase tracking-widest">No verified literature found</p>
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = selected.some(s => s.id === item.id);
                  const isFull = !isSelected && selected.length >= effectiveSessionMax;
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => !isFull && toggleSelect(item)} 
                      className={`bg-white border rounded-2xl p-3.5 flex items-center gap-4 shadow-sm transition-all duration-300 relative group ${isSelected ? 'border-[#004A74] ring-1 ring-[#004A74]/10 bg-blue-50/20' : isFull ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:border-[#004A74]/30 cursor-pointer'}`}
                    >
                        <div className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#004A74] border-[#004A74] text-white' : 'bg-white border-gray-200'}`}>
                           {isSelected ? <CheckIcon className="w-4 h-4 stroke-[4]" /> : <PlusIcon className="w-4 h-4 text-gray-200" />}
                        </div>

                        <div className="flex-1 min-w-0">
                           <h4 className="text-[11px] font-black text-[#004A74] uppercase leading-tight truncate">{item.title}</h4>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-bold text-gray-400 italic truncate tracking-tight">
                                 {Array.isArray(item.authors) && item.authors.length > 0 ? item.authors.join(', ') : 'Unknown Author'}
                              </span>
                           </div>
                        </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>

        {/* Footer Identik dengan Review */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase whitespace-nowrap">
                {start}-{end} <span className="font-normal opacity-50">of</span> {totalCount}
              </span>
              <div className="flex gap-1">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-1.5 bg-white border border-gray-200 rounded-lg text-[#004A74] disabled:opacity-30 hover:bg-gray-100 shadow-sm transition-all"
                >
                  <ChevronLeftIcon className="w-3 h-3 stroke-[3]" />
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1.5 bg-white border border-gray-200 rounded-lg text-[#004A74] disabled:opacity-30 hover:bg-gray-100 shadow-sm transition-all"
                >
                  <ChevronRightIcon className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {[...Array(SESSION_MAX)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${i < selected.length ? 'bg-[#FED400] border-[#FED400] shadow-sm' : i >= effectiveSessionMax ? 'bg-red-200 border-red-200' : 'bg-white border-gray-200'}`} />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#004A74] uppercase tracking-widest">{selected.length}/{effectiveSessionMax} Slots</span>
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Capacity: {currentMatrixCount + selected.length}/{GLOBAL_MAX}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={onClose} className="px-5 py-2.5 bg-white text-gray-400 rounded-xl font-black uppercase tracking-widest text-[9px] border border-gray-100 hover:bg-gray-100 transition-all shadow-sm">Cancel</button>
             <button 
                onClick={handleExecute}
                disabled={selected.length === 0}
                className="px-8 py-3.5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
             >
                Execute Analysis
             </button>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ResearchSourceSelectorModal;