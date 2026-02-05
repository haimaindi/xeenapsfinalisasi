import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore - Resolving TS error for missing exported member useNavigate
import { useNavigate } from 'react-router-dom';
import { PublicationItem, PublicationStatus } from '../../../types';
import { fetchPublicationsPaginated, deletePublication, savePublication } from '../../../services/PublicationService';
import { getCleanedProfileName } from '../../../services/ProfileService';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Star,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  BookOpen,
  Share2,
  ExternalLink,
  Settings2 as AdjustmentsHorizontalIcon
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

const AllPublication: React.FC = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<PublicationItem>();
  
  const [items, setItems] = useState<PublicationItem[]>([]);
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
    // BUG FIX: Panggil workflow.execute tanpa menyertakan workflow objek itu sendiri di dependency
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchPublicationsPaginated(
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
  }, [currentPage, appliedSearch, itemsPerPage, sortConfig.key, sortConfig.dir]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewPublication = async () => {
    const { value: title } = await Swal.fire({
      title: 'NEW PUBLICATION',
      input: 'text',
      inputLabel: 'Full Publication Title',
      inputPlaceholder: 'e.g., Deep Learning in Architectural Form...',
      showCancelButton: true,
      confirmButtonText: 'INITIALIZE',
      ...XEENAPS_SWAL_CONFIG,
      inputValidator: (value) => {
        if (!value) return 'Title is mandatory!';
        return null;
      }
    });

    if (title) {
      // Fetch Cleaned Profile Name for dynamic initialization
      const cleanedAuthorName = await getCleanedProfileName();
      
      const id = crypto.randomUUID();
      const newItem: PublicationItem = {
        id,
        title,
        authors: [cleanedAuthorName],
        type: 'Journal',
        status: PublicationStatus.DRAFT,
        publisherName: '',
        researchDomain: '',
        affiliation: '',
        indexing: '',
        quartile: '',
        doi: '',
        issn_isbn: '',
        volume: '',
        issue: '',
        pages: '',
        year: new Date().getFullYear().toString(),
        submissionDate: '',
        acceptanceDate: '',
        publicationDate: '',
        manuscriptLink: '',
        abstract: '',
        keywords: [],
        remarks: '',
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await savePublication(newItem);
      if (success) {
        navigate(`/research/publication/${id}`, { state: { item: newItem } });
      }
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, item: PublicationItem) => {
    e.stopPropagation();
    await performUpdate(
      items,
      setItems,
      [item.id],
      (i) => ({ ...i, isFavorite: !i.isFavorite }),
      async (updated) => await savePublication(updated)
    );
    showXeenapsToast('success', 'Preferences synchronized');
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length && items.length > 0) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const handleBatchFavorite = async () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyUnfav = selectedItems.some(i => !i.isFavorite);
    const newValue = anyUnfav; // if some unfavored, make all favored

    await performUpdate(
      items,
      setItems,
      selectedIds,
      (i) => ({ ...i, isFavorite: newValue }),
      async (updated) => await savePublication(updated)
    );
    showXeenapsToast('success', `Bulk ${newValue ? 'Favorite' : 'Unfavorite'} complete`);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      const idsToDelete = [...selectedIds];
      setSelectedIds([]);
      await performDelete(
        items,
        setItems,
        idsToDelete,
        async (id) => await deletePublication(id)
      );
      showXeenapsToast('success', 'Selected publications removed');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      await performDelete(
        items,
        setItems,
        [id],
        async (pubId) => await deletePublication(pubId)
      );
      showXeenapsToast('success', 'Publication removed');
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortConfig.dir === 'asc' ? <ChevronUp size={12} className="text-[#004A74]" /> : <ChevronDown size={12} className="text-[#004A74]" />;
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const getStatusColor = (status: PublicationStatus) => {
    switch (status) {
      case PublicationStatus.PUBLISHED: return 'bg-green-500 text-white';
      case PublicationStatus.ACCEPTED: return 'bg-emerald-400 text-white';
      case PublicationStatus.REVISION: return 'bg-orange-400 text-white';
      case PublicationStatus.UNDER_REVIEW: return 'bg-blue-500 text-white';
      case PublicationStatus.SUBMITTED: return 'bg-[#004A74] text-white';
      case PublicationStatus.REJECTED: return 'bg-red-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const anyUnfavSelected = useMemo(() => {
    const selected = items.filter(i => selectedIds.includes(i.id));
    return selected.some(i => !i.isFavorite);
  }, [selectedIds, items]);

  return (
    <div className="flex flex-col h-full overflow-hidden p-1">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6 shrink-0">
        <SmartSearchBox 
          value={localSearch} 
          onChange={setLocalSearch} 
          onSearch={() => { setAppliedSearch(localSearch); setCurrentPage(1); }} 
          phrases={["Search publications...", "Search publishers...", "Search status..."]}
        />
        <StandardPrimaryButton onClick={handleNewPublication} icon={<Plus size={20} />}>
          Register Publication
        </StandardPrimaryButton>
      </div>

      {/* MOBILE SORT & SELECT ALL BAR */}
      <div className="lg:hidden flex items-center justify-start gap-4 px-1 py-1 shrink-0 mb-4">
        <div className="relative">
          <button 
            onClick={() => setShowSortMenu(!showSortMenu)} 
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}
          >
            <AdjustmentsHorizontalIcon size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Sort</span>
          </button>
          {showSortMenu && (
            <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
              {['status', 'title', 'publisherName', 'indexing', 'year'].map((k) => (
                <button 
                  key={k} 
                  onClick={() => { handleSort(k); setShowSortMenu(false); }} 
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === k ? 'bg-[#004A74]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="capitalize">{k === 'publisherName' ? 'Publisher' : k}</span>
                  {sortConfig.key === k && (sortConfig.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <button 
          onClick={toggleSelectAll} 
          className={`text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length === items.length && items.length > 0 ? 'text-red-500' : 'text-[#004A74]'}`}
        >
          {selectedIds.length === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete} title="Mass Delete">
          <Trash2 size={18} />
        </StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={handleBatchFavorite} title="Mass Favorite">
          <Star size={18} className={anyUnfavSelected ? "text-gray-300" : "text-[#FED400] fill-[#FED400]"} />
        </StandardQuickActionButton>
      </StandardQuickAccessBar>

      <div className="flex-1 mt-2 overflow-y-auto custom-scrollbar">
        {isMobile ? (
          isLoading ? <CardGridSkeleton count={8} /> : items.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-2 opacity-30">
              <Share2 size={48} className="mb-4 text-[#004A74]" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your Publication Gallery is Empty</p>
            </div>
          ) : (
            <StandardGridContainer>
              {items.map(item => (
                <StandardItemCard 
                  key={item.id} 
                  isSelected={selectedIds.includes(item.id)}
                  onClick={() => navigate(`/research/publication/${item.id}`, { state: { item } })}
                >
                  <div className="absolute top-4 right-4" onClick={e => handleToggleFavorite(e, item)}>
                    <Star size={18} className={item.isFavorite ? "text-[#FED400] fill-[#FED400]" : "text-gray-200"} />
                  </div>
                  <div className="flex items-center gap-3 mb-4" onClick={e => e.stopPropagation()}>
                     <button 
                       onClick={() => toggleSelectItem(item.id)}
                       className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200'}`}
                     >
                        {selectedIds.includes(item.id) && <Check size={12} strokeWidth={4} />}
                     </button>
                     <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tight ${getStatusColor(item.status)}`}>
                       {item.status}
                     </span>
                  </div>
                  <h3 className="text-sm font-black text-[#004A74] uppercase leading-tight line-clamp-2 mb-2">{item.title}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{item.publisherName || 'No Publisher'}</p>
                  <div className="h-px bg-gray-50 mb-3" />
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black bg-gray-100 px-2 py-0.5 rounded-md text-gray-500 uppercase">{item.type}</span>
                        {item.indexing && <span className="text-[8px] font-black bg-blue-50 px-2 py-0.5 rounded-md text-blue-600 uppercase">{item.indexing}</span>}
                     </div>
                     <span className="text-[9px] font-black text-[#004A74]">{item.year}</span>
                  </div>
                </StandardItemCard>
              ))}
            </StandardGridContainer>
          )
        ) : (
          <StandardTableContainer>
            <StandardTableWrapper>
              <thead>
                <tr>
                  <th className="sticky left-0 z-50 px-6 py-4 w-12 bg-gray-50 border-r border-gray-100/50 shadow-sm text-center">
                    <StandardCheckbox 
                      onChange={toggleSelectAll} 
                      checked={items.length > 0 && selectedIds.length === items.length} 
                    />
                  </th>
                  <StandardTh width="150px" onClick={() => handleSort('status')} isActiveSort={sortConfig.key === 'status'}>Status {getSortIcon('status')}</StandardTh>
                  <StandardTh width="350px" onClick={() => handleSort('title')} isActiveSort={sortConfig.key === 'title'}>Title {getSortIcon('title')}</StandardTh>
                  <StandardTh width="200px" onClick={() => handleSort('publisherName')} isActiveSort={sortConfig.key === 'publisherName'}>Publisher / Journal {getSortIcon('publisherName')}</StandardTh>
                  <StandardTh width="120px" onClick={() => handleSort('indexing')} isActiveSort={sortConfig.key === 'indexing'}>Index {getSortIcon('indexing')}</StandardTh>
                  <StandardTh width="100px" onClick={() => handleSort('year')} isActiveSort={sortConfig.key === 'year'}>Year {getSortIcon('year')}</StandardTh>
                  <StandardTh width="120px" className="sticky right-0 bg-gray-50 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Action</StandardTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableSkeletonRows count={10} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center">
                       <div className="flex flex-col items-center justify-center space-y-2 opacity-30">
                          <Share2 size={48} className="mb-4 text-[#004A74]" />
                          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Publication Data</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <StandardTr key={item.id} className="cursor-pointer" onClick={() => navigate(`/research/publication/${item.id}`, { state: { item } })}>
                      <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={e => e.stopPropagation()}>
                         <StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} />
                      </td>
                      <StandardTd>
                         <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => handleToggleFavorite(e, item)}>
                               <Star size={16} className={item.isFavorite ? "text-[#FED400] fill-[#FED400]" : "text-gray-200"} />
                            </button>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight shadow-sm ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                         </div>
                      </StandardTd>
                      <StandardTd>
                         <ElegantTooltip text={item.title}>
                            <span className="text-sm font-bold text-[#004A74] uppercase line-clamp-2">{item.title}</span>
                         </ElegantTooltip>
                      </StandardTd>
                      <StandardTd>
                         <span className="text-xs font-bold text-gray-500 uppercase">{item.publisherName || '-'}</span>
                      </StandardTd>
                      <StandardTd className="text-center">
                         {item.indexing && <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase">{item.indexing}</span>}
                      </StandardTd>
                      <StandardTd className="text-xs font-mono font-bold text-gray-400 text-center">{item.year}</StandardTd>
                      <StandardTd className="sticky right-0 bg-white group-hover:bg-[#f0f7fa] text-center z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                         <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                           <button onClick={() => navigate(`/research/publication/${item.id}`, { state: { item } })} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Detail"><Eye size={18} /></button>
                           {item.doi && <button onClick={() => window.open(`https://doi.org/${item.doi}`, '_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="External Link"><ExternalLink size={18} /></button>}
                           <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={18} /></button>
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
    </div>
  );
};

export default AllPublication;