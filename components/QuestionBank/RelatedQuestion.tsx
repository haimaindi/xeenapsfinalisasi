import React, { useState, useEffect, useCallback } from 'react';
import { QuestionItem, LibraryItem, BloomsLevel } from '../../types';
import { fetchRelatedQuestions, deleteQuestion } from '../../services/QuestionService';
import { 
  PlusIcon, 
  AcademicCapIcon, 
  TrashIcon,
  PlayIcon,
  RectangleStackIcon,
  ArrowLeftIcon,
  ClockIcon,
  SparklesIcon,
  EyeIcon,
  CheckIcon,
  TagIcon,
  CheckBadgeIcon,
  ListBulletIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { Grip, Trash2 } from 'lucide-react';
import QuestionSetupModal from './QuestionSetupModal';
import CbtFocusMode from './CbtFocusMode';
import QuestionDetailView from './QuestionDetailView';
import TeachingSessionPicker from '../Teaching/TeachingSessionPicker';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardFilterButton,
  StandardQuickAccessBar,
  StandardQuickActionButton
} from '../Common/ButtonComponents';
import { 
  StandardTh, 
  StandardTr, 
  StandardTd, 
  StandardTableFooter,
  StandardCheckbox,
  ElegantTooltip
} from '../Common/TableComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';

interface RelatedQuestionProps {
  collection: LibraryItem;
  onBack: () => void;
}

const getBloomColor = (level: BloomsLevel) => {
  if (level.includes('C1') || level.includes('C2')) return 'bg-green-500';
  if (level.includes('C3') || level.includes('C4')) return 'bg-[#004A74]';
  return 'bg-[#FED400] text-[#004A74]';
};

const RelatedQuestion: React.FC<RelatedQuestionProps> = ({ collection, onBack }) => {
  const workflow = useAsyncWorkflow(30000);
  const { performDelete } = useOptimisticUpdate<QuestionItem>();
  
  // States
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeBloomFilter, setActiveBloomFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<'CBT' | 'FLASHCARD' | null>(null);
  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState<QuestionItem | null>(null);

  // Grip / Picker state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [itemsForPicker, setItemsForPicker] = useState<QuestionItem | QuestionItem[] | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bloomFilters = ['All', ...Object.values(BloomsLevel)];

  const loadQuestions = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchRelatedQuestions(
          collection.id,
          currentPage,
          itemsPerPage,
          appliedSearch,
          activeBloomFilter,
          signal
        );
        setQuestions(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [collection.id, currentPage, appliedSearch, activeBloomFilter, itemsPerPage, workflow.execute]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // --- GLOBAL SYNC LISTENER ---
  useEffect(() => {
    const handleGlobalUpdate = (e: any) => {
      const updatedQ = e.detail as QuestionItem;
      // Only care if it belongs to this collection
      if (updatedQ.collectionId === collection.id) {
        setQuestions(prev => {
          const index = prev.findIndex(q => q.id === updatedQ.id);
          return index > -1 ? prev.map(q => q.id === updatedQ.id ? updatedQ : q) : [updatedQ, ...prev];
        });
      }
    };
    const handleGlobalDelete = (e: any) => {
      setQuestions(prev => prev.filter(q => q.id !== e.detail));
    };
    window.addEventListener('xeenaps-question-updated', handleGlobalUpdate);
    window.addEventListener('xeenaps-question-deleted', handleGlobalDelete);
    return () => {
      window.removeEventListener('xeenaps-question-updated', handleGlobalUpdate);
      window.removeEventListener('xeenaps-question-deleted', handleGlobalDelete);
    };
  }, [collection.id]);

  const handleSearchTrigger = () => {
    setCurrentPage(1);
    setAppliedSearch(localSearch);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleStartSimulation = (mode: 'CBT' | 'FLASHCARD') => {
    const questionsToUse = selectedIds.length > 0 
      ? questions.filter(q => selectedIds.includes(q.id))
      : questions;
    
    if (questionsToUse.length === 0) {
      showXeenapsToast('warning', 'No questions available for simulation.');
      return;
    }
    setActiveSimulation(mode);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // OPTIMISTIC DELETE
      await performDelete(
        questions,
        setQuestions,
        [id],
        async (qid) => await deleteQuestion(qid),
        () => showXeenapsToast('error', 'Sync failed. Item restored.')
      );
      setSelectedIds(prev => prev.filter(i => i !== id));
      // Success toast removed for SILENT UPDATE
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      const idsToDelete = [...selectedIds];
      setSelectedIds([]);
      // OPTIMISTIC DELETE
      await performDelete(
        questions,
        setQuestions,
        idsToDelete,
        async (id) => await deleteQuestion(id),
        () => showXeenapsToast('error', 'Bulk sync failed. Items restored.')
      );
      // Success toast removed for SILENT UPDATE
    }
  };

  const handleGripSingle = (e: React.MouseEvent, q: QuestionItem) => {
    e.stopPropagation();
    setItemsForPicker(q);
    setIsPickerOpen(true);
  };

  const handleGripBatch = () => {
    if (selectedIds.length === 0) return;
    const selected = questions.filter(q => selectedIds.includes(q.id));
    setItemsForPicker(selected);
    setIsPickerOpen(true);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      return `${day} ${month} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return "-"; }
  };

  const effectiveViewMode = isMobile ? 'card' : viewMode;

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar relative">
      {showSetup && (
        <QuestionSetupModal 
          item={collection} 
          onClose={() => setShowSetup(false)} 
          onComplete={() => {
            setShowSetup(false);
            loadQuestions();
          }} 
        />
      )}

      {activeSimulation && (
        <CbtFocusMode 
          questions={selectedIds.length > 0 ? questions.filter(q => selectedIds.includes(q.id)) : questions}
          mode={activeSimulation}
          onClose={() => setActiveSimulation(null)}
        />
      )}

      {selectedQuestionDetail && (
        <QuestionDetailView 
          question={selectedQuestionDetail}
          collection={collection}
          onClose={() => setSelectedQuestionDetail(null)}
          onViewSource={() => {
            setSelectedQuestionDetail(null);
            onBack();
          }}
          showSourceInfo={false}
        />
      )}

      {isPickerOpen && itemsForPicker && (
        <TeachingSessionPicker 
          item={itemsForPicker} 
          onClose={() => {
            setIsPickerOpen(false);
            setItemsForPicker(null);
            setSelectedIds([]);
          }} 
        />
      )}

      <div className="px-4 md:px-10 py-6 border-b border-gray-100 flex flex-col gap-6 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={onBack} className="p-2 md:p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90 shrink-0">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">AI Question Bank</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[250px] md:max-w-md">Source: {collection.title}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="flex bg-gray-100 p-1 rounded-xl md:rounded-2xl gap-0.5 md:gap-1">
              <button 
                onClick={() => handleStartSimulation('FLASHCARD')} 
                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:text-[#004A74] transition-all"
              >
                <RectangleStackIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Flashcards</span>
              </button>
              <button 
                onClick={() => handleStartSimulation('CBT')} 
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#004A74] text-[#FED400] rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all"
              >
                <PlayIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Exam Mode</span>
              </button>
            </div>
            <button 
              onClick={() => setShowSetup(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FED400] text-[#004A74] rounded-xl md:rounded-2xl shadow-lg transition-all active:scale-95 group"
            >
              <PlusIcon className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-[11px] uppercase tracking-widest font-black">Create New</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
           <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={handleSearchTrigger}
            phrases={["Search by Label...", "Search by Question...", "Search by Answer..."]}
            className="w-full lg:max-w-xl"
           />
           
           <div className="flex items-center gap-3 shrink-0">
             <div className="hidden lg:flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-[#004A74] shadow-sm' : 'text-gray-400'}`}><Squares2X2Icon className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[#004A74] shadow-sm' : 'text-gray-400'}`}><ListBulletIcon className="w-4 h-4" /></button>
             </div>
             
             <div className="w-px h-6 bg-gray-200 hidden md:block" />
             
             <p className="text-[10px] font-black uppercase tracking-widest text-[#004A74]/60 hidden md:block">
               {totalCount} Items Found
             </p>
           </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {bloomFilters.map(filter => (
            <StandardFilterButton 
              key={filter} 
              isActive={activeBloomFilter === filter} 
              onClick={() => { setActiveBloomFilter(filter); setCurrentPage(1); }}
            >
              {filter}
            </StandardFilterButton>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-10 pb-32">
        {isLoading ? (
          <div className="mt-4"><CardGridSkeleton count={6} /></div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <AcademicCapIcon className="w-16 h-16 md:w-20 md:h-20 mb-4 text-[#004A74]" />
            <h3 className="text-lg font-black text-[#004A74] uppercase tracking-widest">No Items Match</h3>
            <p className="text-xs md:sm font-medium text-gray-500 mt-2">Try adjusting your search query or Bloom Filter.</p>
            <button onClick={() => { setAppliedSearch(''); setLocalSearch(''); setActiveBloomFilter('All'); }} className="mt-8 text-[#004A74] font-black underline uppercase tracking-widest text-[10px] md:text-xs">
              Clear All Filters
            </button>
          </div>
        ) : effectiveViewMode === 'card' ? (
          /* MOBILE ROW-LIST VIEW */
          <div className="flex flex-col gap-4 animate-in fade-in duration-500">
            {questions.map((q) => {
              const isSelected = selectedIds.includes(q.id);
              return (
                <div 
                  key={q.id}
                  onClick={() => setSelectedQuestionDetail(q)}
                  className={`bg-white border border-gray-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden ${
                    isSelected ? 'ring-2 ring-[#004A74] bg-blue-50' : ''
                  }`}
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelect(q.id); }}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200 hover:border-[#004A74]/30'}`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3" strokeWidth={2.5} />}
                  </div>
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${getBloomColor(q.bloomLevel)}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#004A74] truncate leading-tight line-clamp-1">{q.questionText}</h4>
                    <p className="text-[10px] font-bold text-gray-500 truncate mt-0.5">{q.customLabel}</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-300 mt-1 uppercase tracking-widest">
                       <CheckBadgeIcon className="w-3 h-3" /> Correct: {q.correctAnswer}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedQuestionDetail(q)} className="p-2.5 text-cyan-600 bg-cyan-50 rounded-xl active:scale-90 transition-all"><EyeIcon className="w-5 h-5" /></button>
                    <button onClick={(e) => handleGripSingle(e, q)} className="p-2.5 text-[#004A74] bg-gray-50 rounded-xl active:scale-90 transition-all"><Grip className="w-5 h-5" /></button>
                    <button onClick={(e) => handleDelete(e, q.id)} className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-90 transition-all"><TrashIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-100/50 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
               <thead>
                 <tr>
                    <th className="sticky left-0 z-[60] px-6 py-4 w-[60px] bg-gray-50 border-r border-gray-100/50 shadow-sm text-center">
                      <div className="flex items-center justify-center">
                        <StandardCheckbox 
                          onChange={() => {
                            if (selectedIds.length === questions.length) setSelectedIds([]);
                            else setSelectedIds(questions.map(q => q.id));
                          }}
                          checked={selectedIds.length === questions.length && questions.length > 0}
                        />
                      </div>
                    </th>
                    <StandardTh width="120px">Bloom Tier</StandardTh>
                    <StandardTh width="150px">Label</StandardTh>
                    <StandardTh width="450px">Question Text</StandardTh>
                    <StandardTh width="100px">Answer</StandardTh>
                    <StandardTh width="180px">Date</StandardTh>
                    <StandardTh width="120px">Action</StandardTh>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {questions.map((q) => (
                    <StandardTr key={q.id} onClick={() => setSelectedQuestionDetail(q)} className="cursor-pointer">
                       <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={(e) => e.stopPropagation()}>
                         <StandardCheckbox checked={selectedIds.includes(q.id)} onChange={() => toggleSelect(q.id)} />
                       </td>
                       <StandardTd>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${getBloomColor(q.bloomLevel)}`}>
                            {q.bloomLevel.split(' ')[0]}
                          </span>
                       </StandardTd>
                       <StandardTd className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[120px]">{q.customLabel}</StandardTd>
                       <StandardTd className="max-w-[400px]">
                          <ElegantTooltip text={q.questionText}><p className="text-xs font-bold text-[#004A74] leading-relaxed line-clamp-1">{q.questionText}</p></ElegantTooltip>
                       </StandardTd>
                       <StandardTd className="text-center"><span className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center font-black text-[#004A74] text-[10px]">{q.correctAnswer}</span></StandardTd>
                       <StandardTd className="text-[9px] font-bold text-gray-400 text-center whitespace-nowrap">{formatShortDate(q.createdAt)}</StandardTd>
                       <StandardTd>
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                             <button onClick={() => setSelectedQuestionDetail(q)} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg"><EyeIcon className="w-4 h-4" /></button>
                             <button onClick={(e) => handleGripSingle(e, q)} className="p-2 text-[#004A74] hover:bg-gray-50 rounded-lg"><Grip className="w-3.5 h-3.5" /></button>
                             <button onClick={e => handleDelete(e, q.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                       </StandardTd>
                    </StandardTr>
                  ))}
               </tbody>
            </table>
          </div>
        )}
        
        {totalCount > itemsPerPage && (
          <div className="mt-8 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <StandardTableFooter totalItems={totalCount} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={Math.ceil(totalCount / itemsPerPage)} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="px-5 py-3 bg-[#004A74] text-white rounded-full shadow-[0_20px_50px_-10px_rgba(0,74,116,0.4)] flex items-center gap-4 border border-white/10 backdrop-blur-md">
           <div className="flex items-center gap-2 px-1">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#FED400]">{selectedIds.length}</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Selected</span>
           </div>
           <div className="w-px h-5 bg-white/20" />
           <div className="flex items-center gap-2">
              <button onClick={handleBatchDelete} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-sm active:scale-90" title="Delete Selected"><Trash2 className="w-4 h-4" /></button>
              <button onClick={handleGripBatch} className="p-2 bg-[#FED400] text-[#004A74] rounded-full hover:scale-110 transition-all shadow-sm active:scale-90" title="Grip to Teaching"><Grip className="w-4 h-4" /></button>
              <button onClick={() => handleStartSimulation('FLASHCARD')} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all shadow-sm active:scale-90" title="Flashcards Selected"><RectangleStackIcon className="w-4 h-4 stroke-[2.5]" /></button>
              <button onClick={() => handleStartSimulation('CBT')} className="p-2 bg-[#FED400] text-[#004A74] rounded-full hover:scale-110 transition-all shadow-sm active:scale-90" title="Exam Mode Selected"><PlayIcon className="w-4 h-4 stroke-[2.5]" /></button>
           </div>
           <div className="w-px h-5 bg-white/20" />
           <button onClick={() => setSelectedIds([])} className="text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all px-2">Clear</button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #004A7430; }
      `}</style>
    </div>
  );
};


export default RelatedQuestion;