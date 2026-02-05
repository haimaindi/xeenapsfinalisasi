
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { PresentationItem, LibraryItem } from '../../types';
import { fetchPresentationsPaginated, deletePresentation } from '../../services/PresentationService';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { 
  PresentationChartBarIcon, 
  ArrowTopRightOnSquareIcon, 
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  BuildingLibraryIcon,
  ClockIcon,
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
// Added Trash2 to the imports from lucide-react
import { Grip, Calendar, Trash2 } from 'lucide-react';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd,
  StandardTableFooter,
  ElegantTooltip,
  StandardCheckbox,
  StandardGridContainer,
  StandardItemCard
} from '../Common/TableComponents';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardPrimaryButton, 
  StandardQuickAccessBar, 
  StandardQuickActionButton 
} from '../Common/ButtonComponents';
import { TableSkeletonRows, CardGridSkeleton } from '../Common/LoadingComponents';
import PresentationSetupModal from './PresentationSetupModal';
import TeachingSessionPicker from '../Teaching/TeachingSessionPicker';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsAlert } from '../../utils/swalUtils';

interface AllPresentationProps {
  items: LibraryItem[];
}

/**
 * Presentation Detail Modal
 */
const PresentationDetailModal: React.FC<{ 
  ppt: PresentationItem; 
  allLibraryItems: LibraryItem[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAttach: () => void;
}> = ({ ppt, allLibraryItems, onClose, onDelete, onAttach }) => {
  const navigate = useNavigate();
  // DEFENSIVE CHECK: collectionIds might be undefined
  const sourceItems = (ppt.collectionIds || []).map(id => allLibraryItems.find(it => it.id === id)).filter(Boolean) as LibraryItem[];

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return '-'; }
  };

  const handleCollectionClick = (item: LibraryItem) => {
    navigate('/', { state: { openItem: item, returnToAudit: ppt }, replace: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <PresentationChartBarIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Presentation Detail</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Synthesis Metadata</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
          <div className="space-y-4">
            <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Title</h4>
              <p className="text-lg font-bold text-[#004A74] leading-tight uppercase">{ppt.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Presenters</h4>
                <p className="text-sm font-bold text-[#004A74]">{(ppt.presenters || []).join(', ')}</p>
              </div>
              <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Slides</h4>
                <p className="text-sm font-bold text-[#004A74]">{ppt.slidesCount} Pages</p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <BuildingLibraryIcon className="w-3.5 h-3.5" /> Source Collections (Click to View)
              </h4>
              <div className="space-y-2 mt-3">
                {sourceItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => handleCollectionClick(item)}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#FED400]/20 transition-all text-left group"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#004A74]/20 group-hover:bg-[#004A74] shrink-0 transition-colors" />
                    <span className="text-xs font-bold text-[#004A74] uppercase leading-relaxed">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">
              <div className="flex items-center gap-2"><ClockIcon className="w-3.5 h-3.5" /> Created: {formatDateTime(ppt.createdAt)}</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 mt-8 flex gap-3">
          <button 
            onClick={() => window.open(`https://docs.google.com/presentation/d/${ppt.gSlidesId}/edit`, '_blank')}
            className="flex-1 py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-105"
          >
            Open Presentation
          </button>
          <button 
            onClick={onAttach}
            className="w-14 h-14 bg-gray-50 text-[#004A74] border border-gray-100 rounded-2xl flex items-center justify-center hover:bg-[#FED400] hover:text-[#004A74] transition-all shadow-md"
            title="Attach to Teaching"
          >
            <Grip className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onDelete(ppt.id)}
            className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md"
            title="Delete Permanently"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const AllPresentation: React.FC<AllPresentationProps> = ({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const workflow = useAsyncWorkflow(30000);
  const { performDelete } = useOptimisticUpdate<PresentationItem>();
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, dir: 'asc'|'desc'}>({ key: 'createdAt', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedPptForPicker, setSelectedPptForPicker] = useState<PresentationItem | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<PresentationItem | null>(() => (location.state as any)?.reopenPPT || null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 12 : 25;

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchPresentationsPaginated(
          currentPage, 
          itemsPerPage, 
          appliedSearch, 
          startDate, 
          endDate, 
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
  }, [currentPage, appliedSearch, startDate, endDate, sortConfig, itemsPerPage, workflow.execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- GLOBAL SYNC LISTENER ---
  useEffect(() => {
    const handleGlobalUpdate = (e: any) => {
      const updatedPpt = e.detail as PresentationItem;
      setPresentations(prev => {
        const index = prev.findIndex(p => p.id === updatedPpt.id);
        return index > -1 ? prev.map(p => p.id === updatedPpt.id ? updatedPpt : p) : [updatedPpt, ...prev];
      });
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
  }, []);

  useEffect(() => {
    const state = location.state as any;
    if (state?.reopenPPT) {
      setSelectedDetail(state.reopenPPT);
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const handleSearchTrigger = () => {
    setAppliedSearch(localSearch);
    setCurrentPage(1);
  };

  const handleApplyFilter = () => {
    setAppliedSearch(localSearch);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setAppliedSearch(localSearch);
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

  const toggleSelectAll = () => {
    if (selectedIds.length === presentations.length && presentations.length > 0) setSelectedIds([]);
    else setSelectedIds(presentations.map(p => p.id));
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (!confirmed) return;
    
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);

    // OPTIMISTIC DELETE
    await performDelete(
      presentations,
      setPresentations,
      idsToDelete,
      async (id) => await deletePresentation(id),
      () => {
        showXeenapsAlert({ icon: 'error', title: 'SYNC FAILED', text: 'Server error occurred during deletion.' });
      }
    );
    // Success toast removed for SILENT UPDATE
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // OPTIMISTIC DELETE
      await performDelete(
        presentations,
        setPresentations,
        [id],
        async (pid) => await deletePresentation(pid),
        () => {
          showXeenapsAlert({ icon: 'error', title: 'DELETE FAILED', text: 'Server error occurred.' });
        }
      );

      if (selectedDetail?.id === id) setSelectedDetail(null);
      // Success toast removed for SILENT UPDATE
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return '-'; }
  };

  const getSourceTitles = (ids: string[]) => {
    return (ids || []).map(id => items.find(it => it.id === id)?.title || 'Unknown Source').join(', ');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-1 relative animate-in fade-in duration-500">
      {showSetup && (
        <PresentationSetupModal 
          items={items}
          onClose={() => setShowSetup(false)} 
          onComplete={() => { setShowSetup(false); loadData(); }} 
        />
      )}

      {selectedDetail && (
        <PresentationDetailModal 
          ppt={selectedDetail} 
          allLibraryItems={items} 
          onClose={() => setSelectedDetail(null)} 
          onDelete={handleDelete}
          onAttach={() => {
            setSelectedPptForPicker(selectedDetail);
            setIsPickerOpen(true);
          }}
        />
      )}

      {isPickerOpen && selectedPptForPicker && (
        <TeachingSessionPicker 
          item={selectedPptForPicker}
          onClose={() => { setIsPickerOpen(false); setSelectedPptForPicker(null); }}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6 shrink-0">
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto flex-1">
          <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={handleSearchTrigger} 
            phrases={["Search by Presentation Title...", "Search by Source Collections...", "Search by Presenter..."]}
          />

          <div className="flex flex-col items-stretch md:flex-row md:items-center gap-2 bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 md:py-0">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter w-8">From</span>
              <input type="date" placeholder="DD/MM/YYYY" className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#004A74] outline-none cursor-pointer flex-1" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} />
            </div>
            <div className="hidden md:block w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2 px-3 py-2 md:py-0">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter w-8">Until</span>
              <input type="date" placeholder="DD/MM/YYYY" className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#004A74] outline-none cursor-pointer flex-1" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} />
            </div>
            {(tempStartDate || tempEndDate) && (
              <button 
                onClick={handleApplyFilter}
                className="w-full md:w-auto px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#003859] transition-all shadow-md md:ml-1"
              >
                Apply Range
              </button>
            )}
            {(startDate || endDate) && (
              <button onClick={() => { setTempStartDate(''); setTempEndDate(''); setStartDate(''); setEndDate(''); setCurrentPage(1); }} className="p-2 hover:bg-gray-200 rounded-lg transition-all flex justify-center"><XMarkIcon className="w-4 h-4 text-red-400" /></button>
            )}
          </div>
        </div>
        <StandardPrimaryButton onClick={() => setShowSetup(true)} icon={<PlusIcon className="w-5 h-5" />}>Create Presentation</StandardPrimaryButton>
      </div>

      <div className="lg:hidden flex items-center justify-start gap-4 px-1 py-1 shrink-0 mb-4">
        <div className="relative">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}><AdjustmentsHorizontalIcon className="w-4 h-4 stroke-[2.5]" /><span className="text-[10px] font-black uppercase tracking-widest">Sort</span></button>
          {showSortMenu && (
            <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
              {['title', 'presenters', 'slidesCount', 'createdAt'].map((k) => (
                <button key={k} onClick={() => { handleSort(k); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === k ? 'bg-[#004A74]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}><span>{k === 'title' ? 'Title' : k === 'presenters' ? 'Presenter' : k === 'slidesCount' ? 'Slides' : 'Date'}</span>{sortConfig.key === k && (sortConfig.dir === 'asc' ? <ChevronUpIcon className="w-3 h-3 stroke-[3]" /> : <ChevronDownIcon className="w-3 h-3 stroke-[3]" />)}</button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <button onClick={toggleSelectAll} className={`text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length === presentations.length && presentations.length > 0 ? 'text-red-500' : 'text-[#004A74]'}`}>{selectedIds.length === presentations.length && presentations.length > 0 ? 'Deselect All' : 'Select All'}</button>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete}><TrashIcon className="w-5 h-5" /></StandardQuickActionButton>
      </StandardQuickAccessBar>

      <div className="mt-4 flex-1">
        <div className="hidden lg:block">
          <StandardTableContainer>
            <StandardTableWrapper>
              <thead>
                <tr>
                  <th className="sticky left-0 z-[60] px-6 py-4 w-12 bg-gray-50 border-r border-gray-100/50 shadow-sm text-center">
                    <div className="flex items-center justify-center">
                      <StandardCheckbox onChange={toggleSelectAll} checked={presentations.length > 0 && selectedIds.length === presentations.length} />
                    </div>
                  </th>
                  <StandardTh width="180px" onClick={() => handleSort('createdAt')} isActiveSort={sortConfig.key === 'createdAt'}>Created At {getSortIcon('createdAt')}</StandardTh>
                  <StandardTh width="300px" onClick={() => handleSort('title')} isActiveSort={sortConfig.key === 'title'}>Presentation Title {getSortIcon('title')}</StandardTh>
                  <StandardTh width="400px">Source Collections</StandardTh>
                  <StandardTh width="180px" onClick={() => handleSort('presenters')} isActiveSort={sortConfig.key === 'presenters'}>Presenter(s) {getSortIcon('presenters')}</StandardTh>
                  <StandardTh width="150px" className="sticky right-0 bg-gray-50 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Action</StandardTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableSkeletonRows count={8} />
                ) : presentations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <PresentationChartBarIcon className="w-16 h-16 mb-4 text-[#004A74]" />
                        <p className="text-sm font-bold text-[#004A74] uppercase tracking-widest">No presentations found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  presentations.map((ppt) => (
                    <StandardTr key={ppt.id} className="cursor-pointer" onClick={() => setSelectedDetail(ppt)}>
                      <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={e => e.stopPropagation()}>
                        <StandardCheckbox checked={selectedIds.includes(ppt.id)} onChange={() => toggleSelectItem(ppt.id)} />
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-gray-400 whitespace-nowrap text-center">
                        <div className="line-clamp-2">{formatDateTime(ppt.createdAt)}</div>
                      </td>
                      <StandardTd>
                        <ElegantTooltip text={ppt.title}>
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: ppt.themeConfig.primaryColor }} />
                            <span className="text-sm font-bold text-[#004A74] uppercase line-clamp-2">{ppt.title}</span>
                          </div>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd>
                        <ElegantTooltip text={getSourceTitles(ppt.collectionIds)}>
                          <p className="text-xs font-semibold text-gray-600 line-clamp-2 italic">
                            {getSourceTitles(ppt.collectionIds)}
                          </p>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd>
                        <ElegantTooltip text={(ppt.presenters || []).join(', ')}>
                          <div className="text-xs font-bold text-[#004A74] opacity-80 text-center uppercase tracking-tighter line-clamp-2">
                            {(ppt.presenters || []).join(', ')}
                          </div>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd className="sticky right-0 bg-white group-hover:bg-[#f0f7fa] z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] text-center overflow-visible">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setSelectedDetail(ppt)} 
                            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all"
                            title="Detail View"
                          >
                            <EyeIcon className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button 
                            onClick={() => { setSelectedPptForPicker(ppt); setIsPickerOpen(true); }}
                            className="p-2 text-[#004A74] hover:bg-gray-50 rounded-xl transition-all"
                            title="Attach to Teaching"
                          >
                            <Grip className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => window.open(`https://docs.google.com/presentation/d/${ppt.gSlidesId}/edit`, '_blank')} 
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Open Slides"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button 
                            onClick={() => handleDelete(ppt.id)} 
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </StandardTd>
                    </StandardTr>
                  ))
                )}
              </tbody>
            </StandardTableWrapper>
            <StandardTableFooter 
              totalItems={totalCount} 
              currentPage={currentPage} 
              itemsPerPage={itemsPerPage} 
              totalPages={Math.ceil(totalCount / itemsPerPage)} 
              onPageChange={setCurrentPage} 
            />
          </StandardTableContainer>
        </div>

        <div className="lg:hidden">
          {isLoading ? (
            <CardGridSkeleton count={8} />
          ) : presentations.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-2 bg-white border border-gray-100/50 rounded-[2rem] shadow-sm mx-1">
              <PresentationChartBarIcon className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No presentations found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in duration-500">
              {presentations.map((ppt) => (
                <div 
                  key={ppt.id} 
                  onClick={() => setSelectedDetail(ppt)} 
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
                    <p className="text-[10px] font-bold text-gray-500 italic truncate mt-0.5">{(ppt.presenters || []).join(', ')}</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-300 mt-1 uppercase tracking-widest">
                        <Calendar size={12} className="w-3 h-3" /> {formatDateTime(ppt.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedDetail(ppt)} 
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
                      onClick={() => handleDelete(ppt.id)} 
                      className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-90 transition-all"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalCount > itemsPerPage && (
            <div className="pt-8">
              <StandardTableFooter 
                totalItems={totalCount} 
                currentPage={currentPage} 
                itemsPerPage={itemsPerPage} 
                totalPages={Math.ceil(totalCount / itemsPerPage)} 
                onPageChange={setCurrentPage} 
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.2); }
      `}</style>
    </div>
  );
};

export default AllPresentation;
