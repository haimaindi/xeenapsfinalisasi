import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ColleagueItem } from '../../types';
import { fetchColleaguesPaginated, deleteColleague, saveColleague } from '../../services/ColleagueService';
import { 
  Plus, 
  Trash2, 
  Star, 
  Pencil,
  Users,
  Check,
  Share2
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardPrimaryButton, StandardQuickAccessBar, StandardQuickActionButton } from '../Common/ButtonComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { StandardTableFooter } from '../Common/TableComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import ColleagueForm from './ColleagueForm';
import SharboxWorkflowModal from '../Sharbox/SharboxWorkflowModal';
import { BRAND_ASSETS } from '../../assets';

const ColleagueMain: React.FC = () => {
  const workflow = useAsyncWorkflow(30000);
  
  const [items, setItems] = useState<ColleagueItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ColleagueItem | undefined>();
  
  // Workflow state
  const [sharingColleague, setSharingColleague] = useState<ColleagueItem | null>(null);

  const itemsPerPage = 12;

  // Server-side search debounce (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(localSearch);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchColleaguesPaginated(
          currentPage, 
          itemsPerPage, 
          appliedSearch, 
          "name", 
          "asc", 
          signal
        );
        setItems(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, itemsPerPage, workflow.execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFavorite = async (e: React.MouseEvent, item: ColleagueItem) => {
    e.stopPropagation();
    const updated = { ...item, isFavorite: !item.isFavorite };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    await saveColleague(updated);
    showXeenapsToast('success', updated.isFavorite ? 'Marked as favorite' : 'Removed from favorites');
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteColleague(id);
      if (success) {
        showXeenapsToast('success', 'Colleague removed');
        setSelectedIds(prev => prev.filter(i => i !== id));
        loadData();
      }
    }
  };

  const handleMassDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      for (const id of selectedIds) {
        await deleteColleague(id);
      }
      showXeenapsToast('success', `${selectedIds.length} colleagues removed`);
      setSelectedIds([]);
      loadData();
    }
  };

  const handleMassFavorite = async () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyUnfav = selectedItems.some(i => !i.isFavorite);
    const newValue = anyUnfav;

    // Optimistic Update
    setItems(prev => prev.map(i => selectedIds.includes(i.id) ? { ...i, isFavorite: newValue } : i));
    
    // Background Sync
    for (const id of selectedIds) {
      const target = items.find(it => it.id === id);
      if (target) {
        await saveColleague({ ...target, isFavorite: newValue });
      }
    }
    showXeenapsToast('success', `Bulk update complete`);
  };

  const handleEdit = (e: React.MouseEvent, item: ColleagueItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleInitiateShare = (e: React.MouseEvent, item: ColleagueItem) => {
    e.stopPropagation();
    setSharingColleague(item);
  };

  const anyUnfavSelected = useMemo(() => {
    const selected = items.filter(i => selectedIds.includes(i.id));
    return selected.some(i => !i.isFavorite);
  }, [selectedIds, items]);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      {/* Search & Header Section - Mengalir mengikuti scroll */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8 shrink-0 px-1">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <Users size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">Colleagues</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Professional Network Management</p>
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1 max-w-2xl justify-end">
          <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            phrases={["Search by name...", "Search by affiliation...", "Search Unique App ID..."]}
            className="w-full lg:max-w-md"
          />
          <StandardPrimaryButton onClick={() => { setSelectedItem(undefined); setIsFormOpen(true); }} icon={<Plus size={20} />}>
            Add Colleague
          </StandardPrimaryButton>
        </div>
      </div>

      {/* Mass Action Bar - Mengalir mengikuti scroll */}
      <div className="px-1">
        <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
          <StandardQuickActionButton variant="danger" onClick={handleMassDelete} title="Mass Delete">
            <Trash2 size={18} />
          </StandardQuickActionButton>
          <StandardQuickActionButton variant="warning" onClick={handleMassFavorite} title="Mass Favorite">
            <Star size={18} className={anyUnfavSelected ? "text-gray-300" : "text-[#FED400] fill-[#FED400]"} />
          </StandardQuickActionButton>
          <button onClick={() => setSelectedIds([])} className="text-[9px] font-black uppercase tracking-widest text-[#004A74]/50 hover:text-[#004A74] px-2 transition-all">Clear Selection</button>
        </StandardQuickAccessBar>
      </div>

      {/* List Container - Mengalir mengikuti scroll */}
      <div className="pb-10 mt-2">
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
             <Users size={80} strokeWidth={1} className="text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Registry is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
            {items.map(item => (
              <div 
                key={item.id}
                className={`group relative bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col ${selectedIds.includes(item.id) ? 'ring-2 ring-[#004A74] border-[#004A74]' : ''}`}
              >
                {/* TOP LEFT: CIRCLE CHECKBOX */}
                <div className="flex justify-between items-start mb-3">
                   <div 
                     onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                     className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                       selectedIds.includes(item.id) 
                         ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' 
                         : 'bg-white border-gray-200 hover:border-[#004A74]/30'
                     }`}
                   >
                      {selectedIds.includes(item.id) && <Check size={12} strokeWidth={4} />}
                   </div>
                   {/* TOP RIGHT: FAVORITE STAR */}
                   <button onClick={(e) => handleToggleFavorite(e, item)} className="p-1 hover:scale-125 transition-transform">
                      <Star size={18} className={item.isFavorite ? 'text-[#FED400] fill-[#FED400]' : 'text-gray-200'} />
                   </button>
                </div>

                {/* MIDDLE: PHOTO LEFT | INFO RIGHT */}
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-gray-50 shadow-sm bg-gray-50">
                      <img 
                        src={item.photoUrl || BRAND_ASSETS.USER_DEFAULT} 
                        className="w-full h-full object-cover" 
                        alt={item.name} 
                      />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#004A74] truncate leading-tight group-hover:text-blue-600 transition-colors">{item.name}</h3>
                      <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">{item.affiliation || 'Independent'}</p>
                   </div>
                </div>

                {/* BOTTOM ACTIONS */}
                <div className="mt-auto flex justify-between items-center border-t border-gray-50 pt-3">
                   <button 
                     onClick={(e) => handleInitiateShare(e, item)}
                     className="flex items-center gap-1.5 px-4 py-1.5 bg-[#004A74]/5 text-[#004A74] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FED400] transition-all"
                   >
                     <Share2 size={12} /> Share
                   </button>
                   <div className="flex gap-1">
                      <button 
                        onClick={(e) => handleEdit(e, item)}
                        className="p-2 text-gray-400 hover:text-[#004A74] hover:bg-gray-50 rounded-lg transition-all"
                        title="Edit"
                      >
                         <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, item.id)} 
                        className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer - Mengalir mengikuti scroll */}
      <div className="px-1 pb-10">
        <StandardTableFooter 
          totalItems={totalCount} 
          currentPage={currentPage} 
          itemsPerPage={itemsPerPage} 
          totalPages={Math.ceil(totalCount / itemsPerPage)} 
          onPageChange={setCurrentPage} 
        />
      </div>

      {isFormOpen && (
        <ColleagueForm 
          item={selectedItem} 
          onClose={() => setIsFormOpen(false)} 
          onComplete={() => {
            setIsFormOpen(false);
            loadData();
          }} 
        />
      )}

      {sharingColleague && (
        <SharboxWorkflowModal 
          initialColleague={sharingColleague} 
          onClose={() => setSharingColleague(null)} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.2); }
      `}</style>
    </div>
  );
};

export default ColleagueMain;