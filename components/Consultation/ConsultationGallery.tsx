
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ConsultationItem, LibraryItem, ConsultationAnswerContent } from '../../types';
import { fetchRelatedConsultations, deleteConsultation, saveConsultation } from '../../services/ConsultationService';
import { 
  ArrowLeftIcon, 
  ChatBubbleLeftRightIcon, 
  PlusIcon,
  TrashIcon,
  ClockIcon,
  ChevronRightIcon,
  StarIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import ConsultationInputModal from './ConsultationInputModal';
import ConsultationResultView from './ConsultationResultView';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardQuickAccessBar, StandardQuickActionButton, StandardPrimaryButton } from '../Common/ButtonComponents';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import { fetchFileContent } from '../../services/gasService';

interface ConsultationGalleryProps {
  collection: LibraryItem;
  onBack: () => void;
}

const ConsultationGallery: React.FC<ConsultationGalleryProps> = ({ collection, onBack }) => {
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Navigation States
  const [view, setView] = useState<'gallery' | 'result'>('gallery');
  const [selectedConsult, setSelectedConsult] = useState<ConsultationItem | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [activeAnswer, setActiveAnswer] = useState<ConsultationAnswerContent | null>(null);

  const loadConsultations = useCallback(async (isSilent = false) => {
    // Only show global loading if we have no data and it's not a silent refresh
    if (!isSilent && items.length === 0) setIsLoading(true);
    
    const result = await fetchRelatedConsultations(collection.id, currentPage, 20, appliedSearch);
    setItems(result.items);
    setTotalCount(result.totalCount);
    setIsLoading(false);
  }, [collection.id, currentPage, appliedSearch, items.length]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  const handleSearchTrigger = () => {
    setAppliedSearch(localSearch);
    setCurrentPage(1);
  };

  const toggleSelectItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleFavorite = async (e: React.MouseEvent, item: ConsultationItem) => {
    e.stopPropagation();
    const newVal = !item.isFavorite;
    
    // Optimistic Update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isFavorite: newVal } : i));
    
    // Background sync
    const content = await fetchFileContent(item.answerJsonId, item.nodeUrl);
    if (content) {
      await saveConsultation({ ...item, isFavorite: newVal }, content);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // Optimistic Delete
      setItems(prev => prev.filter(i => i.id !== id));
      // Silent Background Delete
      await deleteConsultation(id);
    }
  };

  const handleMassDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      const idsToDelete = [...selectedIds];
      // Optimistic Update
      setItems(prev => prev.filter(i => !idsToDelete.includes(i.id)));
      setSelectedIds([]);
      
      // Silent background processing
      for (const id of idsToDelete) {
        await deleteConsultation(id);
      }
      loadConsultations(true); // Final silent sync
    }
  };

  const handleMassFavorite = async () => {
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyUnfav = selectedItems.some(i => !i.isFavorite);
    const newValue = anyUnfav;

    // Optimistic Update
    setItems(prev => prev.map(i => selectedIds.includes(i.id) ? { ...i, isFavorite: newValue } : i));
    
    // Background sync
    for (const item of selectedItems) {
       const content = await fetchFileContent(item.answerJsonId, item.nodeUrl);
       if (content) {
         await saveConsultation({ ...item, isFavorite: newValue }, content);
       }
    }
    setSelectedIds([]);
  };

  const handleOpenConsult = (item: ConsultationItem) => {
    setSelectedConsult(item);
    setActiveAnswer(null);
    setView('result');
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const anyUnfavSelected = useMemo(() => {
    return items.filter(i => selectedIds.includes(i.id)).some(i => !i.isFavorite);
  }, [items, selectedIds]);

  // Handler for internal updates from detail view
  const handleItemUpdateLocally = (updated: ConsultationItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  if (view === 'result' && selectedConsult) {
    return (
      <ConsultationResultView 
        collection={collection}
        consultation={selectedConsult}
        initialAnswer={activeAnswer}
        onUpdate={handleItemUpdateLocally}
        onBack={() => {
          setView('gallery');
          setSelectedConsult(null);
          setActiveAnswer(null);
          loadConsultations(true); // Silent refresh to ensure list is fresh without loading state
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar pr-1 relative">
      
      {isInputOpen && (
        <ConsultationInputModal 
          collection={collection}
          onClose={() => setIsInputOpen(false)}
          onSuccess={(item, content) => {
            setActiveAnswer(content);
            setSelectedConsult(item);
            setIsInputOpen(false);
            setView('result');
          }}
        />
      )}

      {/* HEADER AREA - Unfixed flow */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 flex flex-col gap-6 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Deep Consultation</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">AI Partner: Groq Reasoner</p>
            </div>
          </div>

          <StandardPrimaryButton 
            onClick={() => setIsInputOpen(true)}
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Ask New Question
          </StandardPrimaryButton>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
           <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={handleSearchTrigger}
            phrases={["Search by question topic...", "Filter reasoning logs..."]}
            className="w-full lg:max-w-xl"
           />
           <div className="text-[10px] font-black uppercase tracking-widest text-[#004A74]/60 px-4">
             {totalCount} Sessions Stored
           </div>
        </div>
      </div>

      {/* CONTENT FLOW */}
      <div className="flex-1 px-6 md:px-10 mt-4">
        <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
          <StandardQuickActionButton variant="danger" onClick={handleMassDelete} title="Mass Delete">
            <TrashIcon className="w-5 h-5" />
          </StandardQuickActionButton>
          <StandardQuickActionButton variant="warning" onClick={handleMassFavorite} title="Mass Favorite">
            {anyUnfavSelected ? <StarIcon className="w-5 h-5" /> : <StarSolid className="w-5 h-5 text-[#FED400]" />}
          </StandardQuickActionButton>
          <button onClick={() => setSelectedIds([])} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#004A74] px-2 transition-all">Clear</button>
        </StandardQuickAccessBar>

        <div className="py-6 md:py-10 pb-32">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-20 w-full skeleton rounded-2xl" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
              <ChatBubbleLeftRightIcon className="w-20 h-20 mb-4 text-[#004A74]" />
              <h3 className="text-lg font-black uppercase tracking-widest">No Consultations Yet</h3>
              <p className="text-sm font-medium mt-2">Groq AI is waiting to analyze this document with you.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenConsult(item)}
                    className={`group relative bg-white border border-gray-200 rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#004A74]/20 transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-[#004A74] bg-blue-50/30' : ''}`}
                  >
                    {/* LEFT: CHECKBOX */}
                    <div 
                      onClick={(e) => toggleSelectItem(e, item.id)}
                      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200 hover:border-[#004A74]'}`}
                    >
                       {isSelected && <CheckIcon className="w-4 h-4 stroke-[4]" />}
                    </div>
                    
                    {/* MIDDLE: CONTENT */}
                    <div className="flex-1 min-w-0">
                       <h3 className="text-sm font-bold text-[#004A74] leading-tight truncate">"{item.question}"</h3>
                       <div className="flex items-center gap-3 mt-1.5 opacity-50">
                        <div className="flex items-center gap-1">
                           <ClockIcon className="w-3 h-3" />
                           <span className="text-[9px] font-black uppercase tracking-widest">{formatTimeAgo(item.createdAt)}</span>
                        </div>
                       </div>
                    </div>

                    {/* RIGHT: ACTIONS */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleFavorite(e, item)} className="p-2 hover:scale-125 transition-transform text-[#FED400]">
                      {item.isFavorite ? <StarSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5 text-gray-300 hover:text-[#FED400]" />}
                    </button>
                    <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                    <div className="ml-2 p-1.5 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-[#FED400] group-hover:text-[#004A74] transition-all">
                       <ChevronRightIcon className="w-4 h-4 stroke-[3]" />
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

export default ConsultationGallery;
