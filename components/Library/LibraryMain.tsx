import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { LibraryItem, LibraryType } from '../../types';
import { deleteLibraryItem, saveLibraryItem, fetchLibraryPaginated } from '../../services/gasService';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { 
  TrashIcon, 
  BookmarkIcon, 
  StarIcon, 
  PlusIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';
import { SmartSearchBox } from '../Common/SearchComponents';
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
} from '../Common/TableComponents';
import { 
  StandardQuickAccessBar, 
  StandardQuickActionButton, 
  StandardPrimaryButton as AddButton,
  StandardPrimaryButton, 
  StandardFilterButton 
} from '../Common/ButtonComponents';
import { TableSkeletonRows, CardGridSkeleton } from '../Common/LoadingComponents';
import LibraryDetailView from './LibraryDetailView';
import { showXeenapsAlert } from '../../utils/swalUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';

// Fix: Added missing LibraryMainProps interface
interface LibraryMainProps {
  items: LibraryItem[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  globalSearch: string;
  isMobileSidebarOpen: boolean;
}

// Fix: Corrected typo 'key0f' to 'keyof' in SortConfig definition
type SortConfig = { key: keyof LibraryItem | 'none'; direction: 'asc' | 'desc' | null; };

const LibraryMain: React.FC<LibraryMainProps> = ({ items, isLoading: isGlobalLoading, onRefresh, globalSearch, isMobileSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<LibraryItem>();
  const [serverItems, setServerItems] = useState<LibraryItem[]>([]);
  const [totalItemsServer, setTotalItemsServer] = useState(0);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | LibraryType>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(() => !!(location.state as any)?.openItem);
  
  // LOGIC LOCKS: Mencegah tabrakan render saat sanitasi state
  const isSanitizing = useRef(false);
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 20 : 25;
  const totalPages = Math.ceil(totalItemsServer / itemsPerPage);
  const filters: ('All' | LibraryType)[] = ['All', LibraryType.LITERATURE, LibraryType.TASK, LibraryType.PERSONAL, LibraryType.OTHER];
  
  useEffect(() => {
    if (globalSearch && !appliedSearch) {
      setLocalSearch(globalSearch);
      setAppliedSearch(globalSearch);
    }
  }, [globalSearch]);

  // RESET VIEW LOGIC: Diperbaiki agar deterministik dan mengabaikan navigasi sanitasi
  useEffect(() => {
    const state = location.state as any;
    const pathChanged = prevPathname.current !== location.pathname;

    if (pathChanged) {
      // Navigasi ke halaman lain (Dashboard, Settings, dll)
      setSelectedItem(null);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } 
    else {
      // Path masih sama, periksa apakah ada item di state atau sedang dalam proses sanitasi
      if (!state?.openItem && !isTransitioning) {
        if (isSanitizing.current) {
          // Navigasi ini adalah hasil dari pembersihan state internal (sanitasi)
          // Berhasil dibersihkan, lepaskan kunci untuk navigasi berikutnya
          isSanitizing.current = false;
        } else {
          // Tidak ada item di state dan tidak sedang sanitasi, berarti user ingin menutup modal (e.g. Back button)
          setSelectedItem(null);
        }
      }
    }
    
    prevPathname.current = location.pathname;
  }, [location.pathname, location.key, isTransitioning]);

  // DATA RE-HYDRATION LOGIC: Mengaktifkan kunci sanitasi sebelum navigasi 'replace'
  useEffect(() => {
    const state = location.state as any;
    if (state?.openItem) {
      const partialItem = state.openItem;
      const fullItem = items.find(i => i.id === partialItem.id) || 
                       serverItems.find(i => i.id === partialItem.id);
      
      if (fullItem) {
        setSelectedItem({ ...partialItem, ...fullItem });
      } else {
        setSelectedItem(partialItem);
      }
      
      const timer = setTimeout(() => {
        // PRESERVE METADATA: Ambil semua state kecuali openItem
        const { openItem, ...rest } = state;
        
        // AKTIFKAN KUNCI: Beritahu logic reset untuk mengabaikan navigasi pembersihan ini
        isSanitizing.current = true;
        
        // Simpan sisa metadata (returnToTracerProject, fromPath, dll)
        navigate(location.pathname, { replace: true, state: rest });
        setIsTransitioning(false);
      }, 800); 
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [location.state, navigate, location.pathname, items, serverItems]);

  useEffect(() => {
    workflow.execute(
      async (signal) => {
        setIsInternalLoading(true);
        const pathPart = location.pathname.substring(1); 
        const sortKey = sortConfig.key === 'none' ? 'createdAt' : sortConfig.key;
        const sortDir = sortConfig.direction || 'desc';
        const result = await fetchLibraryPaginated(currentPage, itemsPerPage, appliedSearch, activeFilter, pathPart, sortKey, sortDir, signal);
        setServerItems(result.items);
        setTotalItemsServer(result.totalCount);
      },
      () => setIsInternalLoading(false),
      () => setIsInternalLoading(false)
    );
  }, [currentPage, appliedSearch, activeFilter, location.pathname, itemsPerPage, sortConfig.key, sortConfig.direction]);

  const handleSearchTrigger = () => { setAppliedSearch(localSearch); setCurrentPage(1); };
  
  const handleSort = (key: keyof LibraryItem) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key: direction ? key : 'none', direction });
    setCurrentPage(1); 
  };

  const getSortIcon = (key: keyof LibraryItem) => {
    if (sortConfig.key !== key) return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
    if (sortConfig.direction === 'asc') return <ChevronUpIcon className="w-3 h-3 text-[#004A74]" />;
    if (sortConfig.direction === 'desc') return <ChevronDownIcon className="w-3 h-3 text-[#004A74]" />;
    return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === serverItems.length && serverItems.length > 0) setSelectedIds([]);
    else setSelectedIds(serverItems.map(item => item.id));
  };

  const toggleSelectItem = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const { anyUnbookmarked, anyUnfavorited } = useMemo(() => {
    const selectedItemsForIcons = serverItems.filter(i => selectedIds.includes(i.id));
    return { anyUnbookmarked: selectedItemsForIcons.some(i => !i.isBookmarked), anyUnfavorited: selectedItemsForIcons.some(i => !i.isFavorite) };
  }, [selectedIds, serverItems]);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (!confirmed) return;
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);
    await performDelete(serverItems, setServerItems, idsToDelete, async (id) => await deleteLibraryItem(id), () => {
      showXeenapsAlert({ icon: 'error', title: 'SYNC FAILED', text: 'Error deleting from server.' });
    });
    showXeenapsToast('success', 'Bulk deletion processed successfully');
  };

  const handleBatchAction = async (property: 'isBookmarked' | 'isFavorite') => {
    if (selectedIds.length === 0) return;
    const selectedItems = serverItems.filter(i => selectedIds.includes(i.id));
    const anyFalse = selectedItems.some(i => !i[property]);
    const newValue = anyFalse;
    await performUpdate(serverItems, setServerItems, selectedIds, (item) => ({ ...item, [property]: newValue }), async (updatedItem) => await saveLibraryItem(updatedItem), () => {
      showXeenapsAlert({ icon: 'error', title: 'SYNC FAILED', text: 'Background update failed.' });
    });
  };

  const handleDetailUpdate = (updatedItem: LibraryItem) => {
    setServerItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const handleDetailDelete = (id: string) => {
    setServerItems(prev => prev.filter(i => i.id !== id));
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return '-'; }
  };

  const tableColumns: { key: keyof LibraryItem; label: string; width?: string }[] = [
    { key: 'title', label: 'Title', width: '300px' },
    { key: 'authors', label: 'Author(s)', width: '200px' },
    { key: 'publisher', label: 'Publisher', width: '200px' },
    { key: 'year', label: 'Year', width: '80px' },
    { key: 'category', label: 'Category', width: '150px' },
    { key: 'topic', label: 'Topic', width: '150px' },
    { key: 'subTopic', label: 'Sub Topic', width: '150px' },
    { key: 'createdAt', label: 'Created At', width: '150px' },
  ];

  const isDataLoading = isInternalLoading || isGlobalLoading;

  const clampStyle = { 
    display: '-webkit-box', 
    WebkitLineClamp: 2, 
    WebkitBoxOrient: 'vertical', 
    overflow: 'hidden',
    wordBreak: 'break-word'
  } as React.CSSProperties;

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-1 relative">
      {selectedItem && (
        <LibraryDetailView 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          isLoading={isGlobalLoading}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onRefresh={onRefresh}
          onUpdateOptimistic={handleDetailUpdate}
          onDeleteOptimistic={handleDetailDelete}
        />
      )}

      <div className={`flex-1 flex flex-col transition-opacity duration-300 ${isTransitioning ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0 mb-4">
          <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={handleSearchTrigger} />
          <AddButton onClick={() => navigate('/add')} icon={<PlusIcon className="w-5 h-5" />}>Add Collection</AddButton>
        </div>

        <div className="flex items-center justify-between lg:justify-start gap-4 shrink-0 relative z-[30] mb-4">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
            {filters.map(filter => (
              <StandardFilterButton key={filter} isActive={activeFilter === filter} onClick={() => { setActiveFilter(filter); setCurrentPage(1); }}>{filter}</StandardFilterButton>
            ))}
          </div>
        </div>

        <div className="lg:hidden flex items-center justify-start gap-4 px-1 py-1 shrink-0 mb-4">
          <div className="relative">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}><AdjustmentsHorizontalIcon className="w-4 h-4 stroke-[2.5]" /><span className="text-[10px] font-black uppercase tracking-widest">Sort</span></button>
            {showSortMenu && (
              <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
                {['title', 'authors', 'publisher', 'year', 'category', 'topic', 'subTopic', 'createdAt'].map((k) => (
                  <button key={k} onClick={() => { handleSort(k as keyof LibraryItem); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === k ? 'bg-[#004A74]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}><span>{k}</span>{sortConfig.key === k && (sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-3 h-3 stroke-[3]" /> : <ChevronDownIcon className="w-3 h-3 stroke-[3]" />)}</button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-4 bg-gray-200" /><button onClick={toggleSelectAll} className={`text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length === serverItems.length && serverItems.length > 0 ? 'text-red-500' : 'text-[#004A74]'}`}>{selectedIds.length === serverItems.length && serverItems.length > 0 ? 'Deselect All' : 'Select All'}</button>
        </div>

        <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
          <StandardQuickActionButton variant="danger" onClick={handleBatchDelete}><TrashIcon className="w-5 h-5" /></StandardQuickActionButton>
          <StandardQuickActionButton variant="primary" onClick={() => handleBatchAction('isBookmarked')}>{anyUnbookmarked ? <BookmarkSolid className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}</StandardQuickActionButton>
          <StandardQuickActionButton variant="warning" onClick={() => handleBatchAction('isFavorite')}>{anyUnfavorited ? <StarSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}</StandardQuickActionButton>
        </StandardQuickAccessBar>

        <div className="hidden lg:block mt-4">
          <StandardTableContainer>
            <StandardTableWrapper>
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 px-6 py-4 w-12 bg-gray-50 border-r border-gray-100/50 shadow-sm text-center"><div className="flex items-center justify-center"><StandardCheckbox onChange={toggleSelectAll} checked={serverItems.length > 0 && selectedIds.length === serverItems.length} /></div></th>
                  {tableColumns.map(col => <StandardTh key={col.key} onClick={() => handleSort(col.key)} isActiveSort={sortConfig.key === col.key} width={col.width} className={col.key === 'title' ? 'sticky left-12 z-20 border-r border-gray-100/50 shadow-sm' : ''}>{col.label} {getSortIcon(col.key)}</StandardTh>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isDataLoading ? <TableSkeletonRows count={8} /> : serverItems.length === 0 ? <tr key="empty"><td colSpan={tableColumns.length + 1} className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center space-y-2"><div className="p-4 bg-gray-50 rounded-full"><PlusIcon className="w-8 h-8 text-gray-300" /></div><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Collection Found</p></div></td></tr> : serverItems.map((item) => (
                  <StandardTr key={item.id} className="cursor-pointer" onClick={() => setSelectedItem(item)}>
                    <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={(e) => e.stopPropagation()}><StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} /></td>
                    
                    <StandardTd isActiveSort={sortConfig.key === 'title'} className="sticky left-12 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm">
                      <ElegantTooltip text={item.title}>
                        <div className="flex items-start gap-2 group/title w-full">
                          <div className="flex-1 min-w-0">
                            <div style={clampStyle}>
                              <span className="inline-flex items-center gap-1 mr-1.5 align-middle shrink-0">
                                {item.isBookmarked && <BookmarkSolid className="w-3.5 h-3.5 text-[#004A74]" />}
                                {item.isFavorite && <StarSolid className="w-3.5 h-3.5 text-[#FED400]" />}
                              </span>
                              <span className="text-sm font-bold text-[#004A74] group-hover/title:underline leading-tight transition-all uppercase">
                                {item.title}
                              </span>
                            </div>
                          </div>
                          <EyeIcon className="w-3.5 h-3.5 text-gray-300 group-hover/title:text-[#004A74] opacity-0 group-hover/title:opacity-100 transition-all shrink-0 mt-1" />
                        </div>
                      </ElegantTooltip>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'authors'}>
                      <ElegantTooltip text={item.authors?.join(', ') || ''}>
                        <div className="text-xs text-gray-600 italic text-center w-full line-clamp-2" style={clampStyle}>
                          {item.authors?.join(', ') || '-'}
                        </div>
                      </ElegantTooltip>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'publisher'}>
                      <ElegantTooltip text={item.publisher}>
                        <div className="text-xs text-gray-600 text-center w-full line-clamp-2" style={clampStyle}>
                          {item.publisher || '-'}
                        </div>
                      </ElegantTooltip>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'year'} className="text-xs text-gray-600 font-mono text-center">
                      <div className="line-clamp-2" style={clampStyle}>{item.year || '-'}</div>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'category'} className="text-xs text-gray-600 text-center">
                      <ElegantTooltip text={item.category || '-'}>
                        <div className="line-clamp-2" style={clampStyle}>{item.category || '-'}</div>
                      </ElegantTooltip>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'topic'}>
                      <ElegantTooltip text={item.topic}>
                        <div className="text-xs text-gray-600 text-center w-full line-clamp-2" style={clampStyle}>
                          {item.topic || '-'}
                        </div>
                      </ElegantTooltip>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'subTopic'}>
                      <ElegantTooltip text={item.subTopic}>
                        <div className="text-xs text-gray-600 text-center w-full line-clamp-2" style={clampStyle}>
                          {item.subTopic || '-'}
                        </div>
                      </ElegantTooltip>
                    </StandardTd>

                    <StandardTd isActiveSort={sortConfig.key === 'createdAt'} className="text-xs font-medium text-gray-400 whitespace-nowrap text-center">
                      <div className="line-clamp-2" style={clampStyle}>{formatDateTime(item.createdAt)}</div>
                    </StandardTd>
                  </StandardTr>
                ))}
              </tbody>
            </StandardTableWrapper>
            <StandardTableFooter totalItems={totalItemsServer} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </StandardTableContainer>
        </div>

        <div className="lg:hidden mt-4">
          {isDataLoading ? <CardGridSkeleton count={8} /> : serverItems.length === 0 ? <div className="py-24 text-center flex flex-col items-center justify-center space-y-2 bg-white border border-gray-100/50 rounded-[2rem] shadow-sm mx-1"><div className="p-4 bg-gray-50 rounded-full"><PlusIcon className="w-8 h-8 text-gray-300" /></div><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Collection Found</p></div> : (
            <StandardGridContainer>
              {serverItems.map((item) => (
                <StandardItemCard key={item.id} isSelected={selectedIds.includes(item.id)} onClick={() => setSelectedItem(item)}>
                  <div className="absolute top-4 right-4 flex gap-1.5 z-10">{item.isBookmarked && <BookmarkSolid className="w-4 h-4 text-[#004A74] drop-shadow-sm" />}{item.isFavorite && <StarSolid className="w-4 h-4 text-[#FED400] drop-shadow-sm" />}</div>
                  <div className="flex items-center gap-3 mb-2" onClick={(e) => e.stopPropagation()}><button onClick={() => toggleSelectItem(item.id)} className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-[#004A74] border-[#004A74] text-white' : 'bg-white border-gray-200'}`}>{selectedIds.includes(item.id) && <CheckIcon className="w-3 h-3 stroke-[4]" />}</button><span className="text-[8px] font-black uppercase tracking-widest bg-[#004A74] text-white px-2 py-0.5 rounded-full line-clamp-1">{item.category || 'GENERAL'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-[#004A74] opacity-80" style={clampStyle}>{item.topic || 'NO TOPIC'}</span></div>
                  <div className="mt-[-4px] mb-2"><span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter" style={clampStyle}>{item.subTopic || 'No Sub Topic'}</span></div>
                  <div className="flex items-start gap-2 mb-3"><div className="flex-1 min-w-0"><h3 className="text-sm font-bold text-[#004A74] leading-tight" style={clampStyle}>{item.title}</h3></div></div>
                  <p className="text-xs font-medium text-gray-500 italic mb-1" style={clampStyle}>{item.authors?.join(', ') || 'Unknown Author'}</p>
                  <p className="text-[11px] text-gray-400 mb-4" style={clampStyle}>{item.publisher || '-'}</p>
                  <div className="h-px bg-gray-50 mb-3" /><div className="flex items-center justify-between text-gray-400"><span className="text-xs font-mono font-black text-[#004A74]">{item.year || '-'}</span><span className="text-[9px] font-bold uppercase tracking-tight">{formatDateTime(item.createdAt)}</span></div>
                </StandardItemCard>
              ))}
            </StandardGridContainer>
          )}
          {totalPages > 1 && <div className="pt-8"><StandardTableFooter totalItems={totalItemsServer} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
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

export default LibraryMain;