import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { BrainstormingItem } from '../../../types';
import { fetchBrainstormingPaginated, deleteBrainstorming, saveBrainstorming } from '../../../services/BrainstormingService';
import { 
  Plus as PlusIcon, 
  Sparkles as SparklesIcon, 
  Trash2 as TrashIcon, 
  Eye as EyeIcon, 
  Star as StarIcon,
  Check as CheckIcon,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  ArrowUpDown as ArrowsUpDownIcon,
  Settings2 as AdjustmentsHorizontalIcon,
  Calendar
} from 'lucide-react';
import { SmartSearchBox } from '../../Common/SearchComponents';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd, 
  StandardTableFooter, 
  StandardCheckbox,
  StandardGridContainer,
  StandardItemCard,
  ElegantTooltip
} from '../../Common/TableComponents';
import { 
  StandardPrimaryButton, 
  StandardQuickAccessBar, 
  StandardQuickActionButton 
} from '../../Common/ButtonComponents';
import { TableSkeletonRows, CardGridSkeleton } from '../../Common/LoadingComponents';
import { useAsyncWorkflow } from '../../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../../hooks/useOptimisticUpdate';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../../utils/swalUtils';

const AllBrainstorming: React.FC = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<BrainstormingItem>();
  
  const [items, setItems] = useState<BrainstormingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const itemsPerPage = isMobile ? 12 : 20;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchBrainstormingPaginated(
          currentPage, 
          itemsPerPage, 
          appliedSearch, 
          sortConfig.key, 
          sortConfig.dir, 
          signal
        );
        setItems(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, itemsPerPage, sortConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewProject = async () => {
    const { value: label } = await Swal.fire({
      title: 'NEW BRAINSTORMING',
      input: 'text',
      inputLabel: 'Project Label',
      inputPlaceholder: 'e.g., Quantum Computing...',
      showCancelButton: true,
      confirmButtonText: 'CREATE',
      ...XEENAPS_SWAL_CONFIG,
      inputValidator: (value) => {
        if (!value) return 'Label is mandatory!';
        return null;
      }
    });

    if (label) {
      // HANDSHAKE LOADING
      Swal.fire({
        title: 'INITIALIZING...',
        text: 'Preparing your brainstorming workspace...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        ...XEENAPS_SWAL_CONFIG
      });

      const id = crypto.randomUUID();
      const newItem: BrainstormingItem = {
        id,
        label,
        roughIdea: '',
        proposedTitle: '',
        problemStatement: '',
        researchGap: '',
        researchQuestion: '',
        methodology: '',
        population: '',
        keywords: [],
        pillars: [],
        proposedAbstract: '',
        externalRefs: [],
        internalRefs: [],
        isFavorite: false,
        isUsed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await saveBrainstorming(newItem);
      Swal.close();
      
      if (success) {
        navigate(`/research/brainstorming/${id}`, { state: { item: newItem } });
      } else {
        showXeenapsToast('error', 'Handshake failed');
      }
    }
  };

  const handleSearchTrigger = () => {
    setAppliedSearch(localSearch);
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowsUpDownIcon size={12} className="text-gray-300" />;
    return sortConfig.dir === 'asc' ? <ChevronUpIcon size={12} className="text-[#004A74]" /> : <ChevronDownIcon size={12} className="text-[#004A74]" />;
  };

  const handleToggleFavorite = async (e: React.MouseEvent, item: BrainstormingItem) => {
    e.stopPropagation();
    await performUpdate(
      items,
      setItems,
      [item.id],
      (i) => ({ ...i, isFavorite: !i.isFavorite }),
      async (updated) => await saveBrainstorming(updated)
    );
    showXeenapsToast('success', 'Preference updated');
  };

  const handleToggleUsed = async (e: React.MouseEvent, item: BrainstormingItem) => {
    e.stopPropagation();
    await performUpdate(
      items,
      setItems,
      [item.id],
      (i) => ({ ...i, isUsed: !i.isUsed }),
      async (updated) => await saveBrainstorming(updated)
    );
    showXeenapsToast('success', 'Status updated');
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length && items.length > 0) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const handleBatchAction = async (property: 'isFavorite' | 'isUsed') => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyFalse = selectedItems.some(i => !i[property]);
    const newValue = anyFalse;

    await performUpdate(
      items,
      setItems,
      selectedIds,
      (i) => ({ ...i, [property]: newValue }),
      async (updated) => await saveBrainstorming(updated)
    );
    showXeenapsToast('success', `Bulk update complete`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // OPTIMISTIC DELETE WITH COUNT SYNC
      setTotalCount(prev => Math.max(0, prev - 1));
      await performDelete(
        items,
        setItems,
        [id],
        async (pid) => await deleteBrainstorming(pid)
      );
      showXeenapsToast('success', 'Project removed');
    }
  };

  const handleBatchDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      const idsToDelete = [...selectedIds];
      setSelectedIds([]);
      // OPTIMISTIC DELETE WITH COUNT SYNC
      setTotalCount(prev => Math.max(0, prev - idsToDelete.length));
      await performDelete(
        items,
        setItems,
        idsToDelete,
        async (id) => await deleteBrainstorming(id)
      );
      showXeenapsToast('success', 'Selected projects removed');
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return '-'; }
  };

  const { anyUnfavorited, anyUnused } = useMemo(() => {
    const selected = items.filter(i => selectedIds.includes(i.id));
    return {
      anyUnfavorited: selected.some(i => !i.isFavorite),
      anyUnused: selected.some(i => !i.isUsed)
    };
  }, [selectedIds, items]);

  return (
    <div className="flex flex-col h-full p-1 overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6 shrink-0">
        <SmartSearchBox 
          value={localSearch} 
          onChange={setLocalSearch} 
          onSearch={handleSearchTrigger} 
          phrases={["Search label...", "Search research ideas..."]}
        />
        <StandardPrimaryButton onClick={handleNewProject} icon={<PlusIcon size={20} />}>
          Create
        </StandardPrimaryButton>
      </div>

      {/* MOBILE SORT & SELECT ALL BAR */}
      <div className="lg:hidden flex items-center justify-start gap-4 px-1 py-1 shrink-0 mb-4">
        <div className="relative">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}><AdjustmentsHorizontalIcon size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Sort</span></button>
          {showSortMenu && (
            <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
              {['label', 'createdAt'].map((k) => (
                <button key={k} onClick={() => { handleSort(k); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === k ? 'bg-[#004A74]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}><span>{k === 'label' ? 'Label' : 'Date'}</span>{sortConfig.key === k && (sortConfig.dir === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />)}</button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <button onClick={toggleSelectAll} className={`text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length === items.length && items.length > 0 ? 'text-red-500' : 'text-[#004A74]'}`}>{selectedIds.length === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}</button>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete} title="Mass Delete">
          <TrashIcon size={18} />
        </StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={() => handleBatchAction('isFavorite')} title="Mass Favorite">
          {anyUnfavorited ? <StarIcon size={18} className="text-[#FED400] fill-[#FED400]" /> : <StarIcon size={18} />}
        </StandardQuickActionButton>
        <button 
          onClick={() => handleBatchAction('isUsed')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-90 border ${
            anyUnused ? 'bg-green-500 text-white border-green-600 hover:bg-green-600' : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
          }`}
        >
          {anyUnused ? 'USED' : 'UNUSED'}
        </button>
      </StandardQuickAccessBar>

      <div className="flex-1 mt-4 overflow-y-auto custom-scrollbar">
        {isMobile ? (
          isLoading ? <CardGridSkeleton count={8} /> : items.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-2 opacity-30">
              <SparklesIcon size={48} className="mb-4 text-[#004A74]" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Projects Found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in duration-500 px-1">
              {items.map(item => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/research/brainstorming/${item.id}`, { state: { item } })}
                  className={`bg-white border border-gray-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden ${
                    selectedIds.includes(item.id) ? 'ring-2 ring-[#004A74] bg-blue-50' : ''
                  }`}
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200 hover:border-[#004A74]/30'}`}
                  >
                    {selectedIds.includes(item.id) && <CheckIcon size={14} strokeWidth={4} />}
                  </div>
                  <div className="w-1.5 h-12 rounded-full shrink-0 bg-[#004A74]" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#004A74] truncate uppercase leading-tight">{item.label}</h4>
                    <p className="text-[10px] font-medium text-gray-400 truncate italic mt-0.5">
                      "{item.roughIdea || 'No initial idea draft yet...'}"
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <button 
                        onClick={(e) => handleToggleUsed(e, item)}
                        className={`px-2 py-0.5 text-[7px] font-black rounded-full shadow-sm tracking-widest border transition-all ${
                          item.isUsed ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
                        }`}
                      >
                        {item.isUsed ? 'USED' : 'UNUSED'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-300 mt-2 uppercase tracking-widest">
                        <Calendar size={12} className="w-3 h-3" /> {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => handleToggleFavorite(e, item)} className="p-2 text-[#FED400] bg-yellow-50/30 rounded-xl transition-all">
                      {item.isFavorite ? <StarIcon size={18} className="fill-[#FED400]" /> : <StarIcon size={18} />}
                    </button>
                    <button onClick={() => navigate(`/research/brainstorming/${item.id}`, { state: { item } })} className="p-2.5 text-cyan-600 bg-cyan-50 rounded-xl active:scale-90 transition-all">
                      <EyeIcon size={18} />
                    </button>
                    <button onClick={(e) => handleDelete(e, item.id)} className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-90 transition-all">
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <StandardTableContainer>
            <StandardTableWrapper>
              <thead>
                <tr>
                  <th className="sticky left-0 z-50 px-6 py-4 w-12 bg-gray-50 border-r border-gray-100/50 shadow-sm text-center">
                    <div className="flex items-center justify-center">
                      <StandardCheckbox 
                        onChange={toggleSelectAll} 
                        checked={items.length > 0 && selectedIds.length === items.length} 
                      />
                    </div>
                  </th>
                  <StandardTh width="180px" onClick={() => handleSort('isUsed')} isActiveSort={sortConfig.key === 'isUsed'}>Status {getSortIcon('isUsed')}</StandardTh>
                  <StandardTh width="300px" onClick={() => handleSort('label')} isActiveSort={sortConfig.key === 'label'}>Label {getSortIcon('label')}</StandardTh>
                  <StandardTh width="500px">Rough Idea</StandardTh>
                  <StandardTh width="150px" onClick={() => handleSort('createdAt')} isActiveSort={sortConfig.key === 'createdAt'}>Created At {getSortIcon('createdAt')}</StandardTh>
                  <StandardTh width="100px" className="sticky right-0 bg-gray-50 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Action</StandardTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableSkeletonRows count={8} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 opacity-30">
                        <SparklesIcon size={48} className="mb-4 text-[#004A74]" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Brainstorming Projects Found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <StandardTr key={item.id} className="cursor-pointer" onClick={() => navigate(`/research/brainstorming/${item.id}`, { state: { item } })}>
                      <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={e => e.stopPropagation()}>
                         <StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => handleToggleFavorite(e, item)}>
                             <StarIcon size={16} className={item.isFavorite ? "text-[#FED400] fill-[#FED400]" : "text-gray-200"} />
                          </button>
                          <button 
                            onClick={(e) => handleToggleUsed(e, item)}
                            className={`px-2 py-0.5 text-[8px] font-black rounded-full shadow-sm tracking-widest border transition-all ${
                              item.isUsed ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
                            }`}
                          >
                            {item.isUsed ? 'USED' : 'UNUSED'}
                          </button>
                        </div>
                      </td>
                      <StandardTd>
                        <ElegantTooltip text={item.label}>
                          <span className="text-sm font-bold text-[#004A74] uppercase line-clamp-2 truncate">{item.label}</span>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd>
                        <ElegantTooltip text={item.roughIdea}>
                          <p className="text-xs text-gray-500 line-clamp-2 italic">{item.roughIdea || '-'}</p>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd className="text-xs text-gray-400 text-center">{formatDateTime(item.createdAt)}</StandardTd>
                      <StandardTd className="sticky right-0 bg-white group-hover:bg-[#f0f7fa] text-center z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                         <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                           <button onClick={() => navigate(`/research/brainstorming/${item.id}`, { state: { item } })} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg"><EyeIcon size={16} /></button>
                           <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><TrashIcon size={16} /></button>
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
        )}
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

export default AllBrainstorming;