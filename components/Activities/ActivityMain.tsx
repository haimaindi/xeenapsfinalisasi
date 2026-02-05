
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { ActivityItem, ActivityType } from '../../types';
import { fetchActivitiesPaginated, deleteActivity, saveActivity } from '../../services/ActivityService';
import { 
  Plus, 
  Trash2, 
  Star, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  Award,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  Check,
  LayoutGrid,
  List as ListIcon,
  X as XIcon
} from 'lucide-react';
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
  StandardPrimaryButton, 
  StandardQuickAccessBar, 
  StandardQuickActionButton,
  StandardFilterButton
} from '../Common/ButtonComponents';
import { CardGridSkeleton, TableSkeletonRows } from '../Common/LoadingComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import ActivityDetail from './ActivityDetail';
import DocumentationVault from './DocumentationVault';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

const ActivityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<ActivityItem>();
  
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const itemsPerPage = isMobile ? 12 : 25;
  const activityTypes = ['All', ...Object.values(ActivityType)];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        // Server-side filtering by passing activeFilter
        const result = await fetchActivitiesPaginated(currentPage, itemsPerPage, appliedSearch, startDate, endDate, activeFilter, signal);
        setItems(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, startDate, endDate, activeFilter, itemsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewActivity = async () => {
    const { value: name } = await Swal.fire({
      title: 'NEW ACTIVITY',
      input: 'text',
      inputLabel: 'Event or Activity Name',
      inputPlaceholder: 'e.g., International Seminar on AI...',
      showCancelButton: true,
      confirmButtonText: 'INITIALIZE',
      ...XEENAPS_SWAL_CONFIG,
      inputValidator: (value) => {
        if (!value) return 'Name is mandatory!';
        return null;
      }
    });

    if (name) {
      const id = crypto.randomUUID();
      const newItem: ActivityItem = {
        id,
        eventName: name,
        organizer: '',
        location: '',
        type: ActivityType.SEMINAR,
        level: 'Local' as any,
        role: 'Participant' as any,
        startDate: new Date().toISOString().substring(0, 10),
        endDate: new Date().toISOString().substring(0, 10),
        description: '',
        notes: '',
        certificateNumber: '',
        credit: '',
        link: '',
        isFavorite: false,
        vaultJsonId: '',
        storageNodeUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await saveActivity(newItem);
      if (success) {
        navigate(`/activities/${id}`);
      } else {
        showXeenapsToast('error', 'Failed to create activity');
      }
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, item: ActivityItem) => {
    e.stopPropagation();
    await performUpdate(
      items,
      setItems,
      [item.id],
      (i) => ({ ...i, isFavorite: !i.isFavorite }),
      async (updated) => await saveActivity(updated)
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      await performDelete(items, setItems, selectedIds, async (id) => await deleteActivity(id));
      setSelectedIds([]);
      showXeenapsToast('success', 'Batch deletion complete');
    }
  };

  const handleBatchFavorite = async () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyUnfav = selectedItems.some(i => !i.isFavorite);
    const newValue = anyUnfav;

    await performUpdate(
      items,
      setItems,
      selectedIds,
      (i) => ({ ...i, isFavorite: newValue }),
      async (updated) => await saveActivity(updated)
    );
    showXeenapsToast('success', `Bulk update complete`);
  };

  const handleApplyDateFilter = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setCurrentPage(1);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return dateStr; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6 shrink-0">
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto flex-1">
          <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={() => { setAppliedSearch(localSearch); setCurrentPage(1); }} 
            phrases={["Search event name...", "Search organizer...", "Search certificates..."]}
          />

          <div className="flex flex-col items-stretch md:flex-row md:items-center gap-2 bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 md:py-0">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter w-8">From</span>
              <input type="date" className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#004A74] outline-none cursor-pointer flex-1" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} />
            </div>
            <div className="hidden md:block w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2 px-3 py-2 md:py-0">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter w-8">Until</span>
              <input type="date" className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#004A74] outline-none cursor-pointer flex-1" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} />
            </div>
            {(tempStartDate || tempEndDate) && (
              <button onClick={handleApplyDateFilter} className="w-full md:w-auto px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#003859] transition-all shadow-md md:ml-1">Apply Range</button>
            )}
            {(startDate || endDate) && (
              <button onClick={() => { setTempStartDate(''); setTempEndDate(''); setStartDate(''); setEndDate(''); setCurrentPage(1); }} className="p-2 hover:bg-gray-200 rounded-lg transition-all flex justify-center text-red-400"><XIcon size={16} /></button>
            )}
          </div>
        </div>
        <StandardPrimaryButton onClick={handleNewActivity} icon={<Plus size={20} />}>
          Register Activity
        </StandardPrimaryButton>
      </div>

      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
          {activityTypes.map(type => (
            <StandardFilterButton 
              key={type} 
              isActive={activeFilter === type} 
              onClick={() => { setActiveFilter(type); setCurrentPage(1); }}
            >
              {type}
            </StandardFilterButton>
          ))}
        </div>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete} title="Delete Selected">
          <Trash2 size={18} />
        </StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={handleBatchFavorite} title="Favorite Selected">
           <Star size={18} fill={selectedIds.length > 0 && items.filter(i => selectedIds.includes(i.id)).some(i => !i.isFavorite) ? "none" : "currentColor"} />
        </StandardQuickActionButton>
        <button onClick={() => setSelectedIds([])} className="text-[9px] font-black uppercase tracking-widest text-[#004A74]/50 hover:text-[#004A74] px-2">Clear</button>
      </StandardQuickAccessBar>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center justify-center space-y-2 opacity-30">
            <ClipboardCheck size={64} className="text-[#004A74] mb-4" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Activities Found</p>
            <p className="text-xs text-gray-400 italic">Start building your academic portfolio today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-10 px-1">
            {items.map(item => (
              <div 
                key={item.id}
                onClick={() => navigate(`/activities/${item.id}`)}
                className={`group relative bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col h-full ${
                  selectedIds.includes(item.id) ? 'ring-4 ring-[#004A74]/10 border-[#004A74]' : ''
                }`}
              >
                {/* CHECKBOX ON TOP LEFT AS REQUESTED */}
                <div className="absolute top-6 left-6 z-10" onClick={e => e.stopPropagation()}>
                   <button onClick={() => toggleSelect(item.id)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-[#004A74]'}`}>
                      {selectedIds.includes(item.id) && <Check size={14} strokeWidth={4} />}
                   </button>
                </div>

                <div className="absolute top-6 right-6 z-10" onClick={e => e.stopPropagation()}>
                   <button onClick={(e) => handleToggleFavorite(e, item)} className="p-1.5 hover:scale-125 transition-transform bg-white/50 backdrop-blur-sm rounded-lg">
                      <Star size={20} className={item.isFavorite ? 'text-[#FED400] fill-[#FED400]' : 'text-gray-200'} />
                   </button>
                </div>

                <div className="mb-4 mt-8 flex flex-wrap gap-1.5">
                   <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{item.type}</span>
                   {item.level && <span className="px-3 py-1 bg-[#FED400]/10 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{item.level}</span>}
                </div>

                <h3 className="text-base font-black text-[#004A74] leading-tight mb-4 uppercase line-clamp-2 flex-1">{item.eventName}</h3>
                
                <div className="space-y-3 mb-6">
                   <div className="flex items-center gap-2 text-gray-400">
                      <User size={14} className="shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-tight truncate">{item.organizer || 'Unknown Organizer'}</span>
                   </div>
                   <div className="flex items-center gap-2 text-gray-400">
                      <Calendar size={14} className="shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{formatShortDate(item.startDate)}</span>
                   </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                      <Award size={14} className="text-[#004A74]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#004A74]/60">{item.role}</span>
                   </div>
                   <ChevronRight size={18} className="text-gray-300 group-hover:text-[#FED400] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StandardTableFooter 
        totalItems={totalCount} 
        currentPage={currentPage} 
        itemsPerPage={itemsPerPage} 
        totalPages={Math.ceil(totalCount / itemsPerPage)} 
        onPageChange={setCurrentPage} 
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.2); }
      `}</style>
    </div>
  );
};

const ActivityMain: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ActivityDashboard />} />
      <Route path="/:id" element={<ActivityDetail />} />
      <Route path="/:id/vault" element={<DocumentationVault />} />
    </Routes>
  );
};

export default ActivityMain;
