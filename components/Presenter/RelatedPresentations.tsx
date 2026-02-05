
import React, { useState, useEffect, useCallback } from 'react';
import { PresentationItem, LibraryItem } from '../../types';
import { fetchRelatedPresentations, deletePresentation } from '../../services/PresentationService';
import { 
  PlusIcon, 
  PresentationChartBarIcon, 
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  TrashIcon,
  EyeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
// Added Trash2 to the imports from lucide-react
import { Grip, Trash2 } from 'lucide-react';
import PresentationSetupModal from './PresentationSetupModal';
import TeachingSessionPicker from '../Teaching/TeachingSessionPicker';
import { CardGridSkeleton, TableSkeletonRows } from '../Common/LoadingComponents';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd, 
  StandardTableFooter, 
  StandardCheckbox,
  ElegantTooltip 
} from '../Common/TableComponents';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardPrimaryButton } from '../Common/ButtonComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsAlert } from '../../utils/swalUtils';

interface RelatedPresentationsProps {
  collection: LibraryItem;
  onBack: () => void;
}

const RelatedPresentations: React.FC<RelatedPresentationsProps> = ({ collection, onBack }) => {
  const workflow = useAsyncWorkflow(30000);
  const { performDelete } = useOptimisticUpdate<PresentationItem>();
  
  // States
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, dir: 'asc'|'desc'}>({ key: 'createdAt', dir: 'desc' });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedPptForPicker, setSelectedPptForPicker] = useState<PresentationItem | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPresentations = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchRelatedPresentations(
          collection.id,
          currentPage,
          itemsPerPage,
          appliedSearch,
          sortConfig.key,
          sortConfig.dir,
          signal
        );
        setPresentations(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [collection.id, currentPage, appliedSearch, sortConfig, itemsPerPage, workflow.execute]);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  // --- GLOBAL SYNC LISTENER ---
  useEffect(() => {
    const handleGlobalUpdate = (e: any) => {
      const updatedPpt = e.detail as PresentationItem;
      // Only care if it's related to this collection
      if (updatedPpt.collectionIds?.includes(collection.id)) {
        setPresentations(prev => {
          const index = prev.findIndex(p => p.id === updatedPpt.id);
          return index > -1 ? prev.map(p => p.id === updatedPpt.id ? updatedPpt : p) : [updatedPpt, ...prev];
        });
      }
    };
    const handleGlobalDelete = (e: any) => {
      setPresentations(prev => prev.filter(p => p.id !== e.detail));
    };
    window.addEventListener('xeenaps-presentation-updated', handleGlobalUpdate);
    window.addEventListener('xeenaps-presentation-deleted', handleGlobalDelete);
    return () => {
      window.removeEventListener('xeenaps-presentation-updated', handleGlobalUpdate);
      window.removeEventListener('xeenaps-presentation-deleted', handleGlobalDelete);
    };
  }, [collection.id]);

  const handleSearchTrigger = () => {
    setCurrentPage(1);
    setAppliedSearch(localSearch);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
    if (sortConfig.dir === 'asc') return <ChevronUpIcon className="w-3 h-3 text-[#004A74]" />;
    if (sortConfig.dir === 'desc') return <ChevronDownIcon className="w-3 h-3 text-[#004A74]" />;
    return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === presentations.length && presentations.length > 0) setSelectedIds([]);
    else setSelectedIds(presentations.map(p => p.id));
  };

  const openInGoogleSlides = (id: string) => {
    window.open(`https://docs.google.com/presentation/d/${id}/edit`, '_blank');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // OPTIMISTIC DELETE
      await performDelete(
        presentations,
        setPresentations,
        [id],
        async (pid) => await deletePresentation(pid),
        () => showXeenapsAlert({ icon: 'error', title: 'DELETE FAILED', text: 'Server error occurred.' })
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
        presentations,
        setPresentations,
        idsToDelete,
        async (id) => await deletePresentation(id),
        () => showXeenapsAlert({ icon: 'error', title: 'BATCH DELETE FAILED', text: 'Server error occurred.' })
      );
      // Success toast removed for SILENT UPDATE
    }
  };

  const formatPresentationDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return "-"; }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar pr-1 relative">
      {showSetup && (
        <PresentationSetupModal 
          item={collection} 
          onClose={() => setShowSetup(false)} 
          onComplete={() => {
            setShowSetup(false);
            // Even though we have events, loadData ensures we pick up any server-calculated counts if needed
            loadPresentations();
          }} 
        />
      )}

      {isPickerOpen && selectedPptForPicker && (
        <TeachingSessionPicker 
          item={selectedPptForPicker}
          onClose={() => { setIsPickerOpen(false); setSelectedPptForPicker(null); }}
        />
      )}

      {/* HEADER AREA - Unfixed flow */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 flex flex-col gap-6 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Presentation Gallery</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[250px] md:max-w-md">Source: {collection.title}</p>
            </div>
          </div>

          <StandardPrimaryButton 
            onClick={() => setShowSetup(true)}
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Create Presentation
          </StandardPrimaryButton>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
           <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={handleSearchTrigger}
            phrases={["Search by Slide Title...", "Search by Presenter..."]}
            className="w-full lg:max-w-xl"
           />
           <div className="text-[10px] font-black uppercase tracking-widest text-[#004A74]/60 px-4">
             {totalCount} Presentations Available
           </div>
        </div>
      </div>

      {/* CONTENT FLOW */}
      <div className="flex-1 px-6 md:px-10 mt-4">
        <div className="py-6 md:py-10 pb-32">
          {isLoading ? (
            isMobile ? <CardGridSkeleton count={4} /> : <div className="mt-4"><TableSkeletonRows count={8} /></div>
          ) : presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <PresentationChartBarIcon className="w-20 h-20 mb-4 text-[#004A74]" />
              <h3 className="text-lg font-black text-[#004A74] uppercase tracking-widest">No Presentations Found</h3>
              <p className="text-sm font-medium text-gray-500 mt-2">Transform your collection into visual synthesis.</p>
            </div>
          ) : isMobile ? (
            /* ELEGANT MOBILE LIST VIEW */
            <div className="flex flex-col gap-4 animate-in fade-in duration-500">
              {presentations.map((ppt) => (
                <div 
                  key={ppt.id} 
                  onClick={() => openInGoogleSlides(ppt.gSlidesId)} 
                  className={`bg-white border border-gray-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden ${
                    selectedIds.includes(ppt.id) ? 'ring-2 ring-[#004A74] bg-blue-50' : ''
                  }`}
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelectItem(ppt.id); }}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(ppt.id) ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200 hover:border-[#004A74]/30'}`}
                  >
                    {selectedIds.includes(ppt.id) && <CheckIcon className="w-3 h-3" strokeWidth={2.5} />}
                  </div>
                  <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: ppt.themeConfig.primaryColor }} />
                  <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-black text-[#004A74] truncate uppercase leading-tight">{ppt.title}</h4>
                     <p className="text-[10px] font-bold text-gray-500 italic truncate mt-0.5">{ppt.presenters.join(', ')}</p>
                     <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-300 mt-1 uppercase tracking-widest">
                        <CalendarDaysIcon className="w-3 h-3" /> {formatPresentationDate(ppt.createdAt)}
                     </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                     <button 
                       onClick={() => openInGoogleSlides(ppt.gSlidesId)} 
                       className="p-2.5 text-cyan-600 bg-cyan-50 rounded-xl active:scale-90 transition-all"
                     >
                       <EyeIcon className="w-5 h-5" />
                     </button>
                     <button 
                       onClick={() => { setSelectedPptForPicker(ppt); setIsPickerOpen(true); }}
                       className="p-2.5 text-[#004A74] bg-gray-50 rounded-xl active:scale-90 transition-all"
                     >
                       <Grip className="w-5 h-5" />
                     </button>
                     <button 
                       onClick={(e) => handleDelete(e, ppt.id)} 
                       className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-90 transition-all"
                     >
                       <TrashIcon className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* PERMANENT DESKTOP TABLE VIEW */
            <StandardTableContainer>
              <StandardTableWrapper>
                <thead>
                  <tr>
                    <StandardTh width="60px">
                      <div className="flex items-center justify-center">
                        <StandardCheckbox onChange={toggleSelectAll} checked={presentations.length > 0 && selectedIds.length === presentations.length} />
                      </div>
                    </StandardTh>
                    <StandardTh width="300px" onClick={() => handleSort('title')} isActiveSort={sortConfig.key === 'title'}>Title {getSortIcon('title')}</StandardTh>
                    <StandardTh width="200px" onClick={() => handleSort('presenters')} isActiveSort={sortConfig.key === 'presenters'}>Presenter(s) {getSortIcon('presenters')}</StandardTh>
                    <StandardTh width="100px">Slides</StandardTh>
                    <StandardTh width="180px" onClick={() => handleSort('createdAt')} isActiveSort={sortConfig.key === 'createdAt'}>Date Created {getSortIcon('createdAt')}</StandardTh>
                    <StandardTh width="150px" className="sticky right-0 bg-gray-50">Action</StandardTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {presentations.map((ppt) => (
                    <StandardTr key={ppt.id} onClick={() => toggleSelectItem(ppt.id)} className="cursor-pointer">
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <StandardCheckbox checked={selectedIds.includes(ppt.id)} readOnly />
                      </td>
                      <StandardTd>
                        <ElegantTooltip text={ppt.title}>
                          <p className="text-sm font-bold text-[#004A74] uppercase line-clamp-1">{ppt.title}</p>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd className="text-xs text-gray-500 font-semibold">{ppt.presenters.join(', ')}</StandardTd>
                      <StandardTd className="text-center"><span className="px-3 py-1 bg-gray-50 rounded-lg font-black text-[#004A74] text-[10px]">{ppt.slidesCount}</span></StandardTd>
                      <StandardTd className="text-xs text-gray-400 font-medium text-center">{formatPresentationDate(ppt.createdAt)}</StandardTd>
                      <StandardTd className="sticky right-0 bg-white group-hover:bg-[#f0f7fa]">
                         <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                           <button onClick={() => openInGoogleSlides(ppt.gSlidesId)} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg"><EyeIcon className="w-4 h-4" /></button>
                           <button onClick={() => { setSelectedPptForPicker(ppt); setIsPickerOpen(true); }} className="p-2 text-[#004A74] hover:bg-gray-50 rounded-lg"><Grip className="w-4 h-4" /></button>
                           <button onClick={(e) => handleDelete(e, ppt.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                         </div>
                      </StandardTd>
                    </StandardTr>
                  ))}
                </tbody>
              </StandardTableWrapper>
            </StandardTableContainer>
          )}
        </div>
      </div>

      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="px-5 py-3 bg-[#004A74] text-white rounded-full shadow-[0_20px_50px_-10px_rgba(0,74,116,0.4)] flex items-center gap-4 border border-white/10 backdrop-blur-md">
           <div className="flex items-center gap-2 px-1">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#FED400]">{selectedIds.length}</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Selected</span>
           </div>
           <div className="w-px h-5 bg-white/20" />
           <div className="flex items-center gap-2">
              <button 
                onClick={handleBatchDelete}
                className="p-2 bg-red-50 text-white rounded-full hover:bg-red-600 transition-all shadow-sm active:scale-90"
                title="Delete Selected"
              >
                <Trash2 size={16} className="w-4 h-4 stroke-[2.5]" />
              </button>
           </div>
           <div className="w-px h-5 bg-white/20" />
           <button 
             onClick={() => setSelectedIds([])} 
             className="text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all px-2"
           >
             Clear
           </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7420; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default RelatedPresentations;
