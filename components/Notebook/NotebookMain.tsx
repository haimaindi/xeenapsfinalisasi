import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NoteItem, NoteContent, LibraryItem } from '../../types';
import { fetchNotesPaginated, deleteNote, saveNote } from '../../services/NoteService';
import { 
  Plus, 
  Trash2, 
  Star, 
  Search, 
  Clock, 
  LayoutGrid, 
  ChevronRight,
  Sparkles,
  StickyNote,
  Library,
  Check,
  MoreVertical,
  ArrowLeft,
  Pencil
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardPrimaryButton, StandardQuickAccessBar, StandardQuickActionButton } from '../Common/ButtonComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { StandardTableFooter } from '../Common/TableComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import NoteForm from './NoteForm';
import NoteDetailView from './NoteDetailView';

interface NotebookMainProps {
  libraryItems?: LibraryItem[];
  collectionId?: string; // Jika dipanggil dari LibraryDetail
  onBackToLibrary?: () => void;
  isMobileSidebarOpen?: boolean;
}

const NotebookMain: React.FC<NotebookMainProps> = ({ libraryItems = [], collectionId = "", onBackToLibrary, isMobileSidebarOpen }) => {
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<NoteItem>();
  
  const [items, setItems] = useState<NoteItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | undefined>();
  const [viewNote, setViewNote] = useState<NoteItem | null>(null);
  const [tempNoteContent, setTempNoteContent] = useState<NoteContent | null>(null);

  const itemsPerPage = 12;

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        // Requirement: Filter independent notes if collectionId is empty (from sidebar)
        const result = await fetchNotesPaginated(
          currentPage, 
          itemsPerPage, 
          appliedSearch, 
          collectionId || "__INDEPENDENT__",
          "createdAt", 
          "desc", 
          signal
        );
        setItems(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, itemsPerPage, collectionId, workflow.execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFavorite = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    // Silent Optimistic Update
    await performUpdate(
      items,
      setItems,
      [note.id],
      (i) => ({ ...i, isFavorite: !i.isFavorite }),
      async (updated) => {
        return await saveNote(updated, { description: "", attachments: [] });
      }
    );
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
      async (updated) => await saveNote(updated, { description: "", attachments: [] })
    );
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // Optimistic delete UI
      setItems(prev => prev.filter(i => i.id !== id));
      // Silent background sync
      const success = await deleteNote(id);
      if (!success) {
        loadData(); // Rollback jika gagal
      }
    }
  };

  const handleMassDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (confirmed) {
      const idsToPurge = [...selectedIds];
      setSelectedIds([]);
      setItems(prev => prev.filter(i => !idsToPurge.includes(i.id)));
      
      for (const id of idsToPurge) {
        await deleteNote(id);
      }
      loadData();
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length && items.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return "-"; }
  };

  const anyUnfavSelected = useMemo(() => {
    return items.filter(i => selectedIds.includes(i.id)).some(i => !i.isFavorite);
  }, [items, selectedIds]);

  const handleEditDirect = (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    setSelectedNote(note);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white animate-in fade-in duration-500 pb-32 custom-scrollbar pr-1 relative">
      
      {/* HEADER - Flow naturally, only app header is sticky */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 flex flex-col gap-8 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             {onBackToLibrary && (
                <button 
                  onClick={onBackToLibrary}
                  className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90"
                  title="Back to Collection"
                >
                   <ArrowLeft size={20} strokeWidth={3} />
                </button>
             )}
             <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                <StickyNote size={24} />
             </div>
             <div>
                <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Notebook</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Research Insights & Synthesis</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <StandardPrimaryButton 
               onClick={() => { setSelectedNote(undefined); setIsFormOpen(true); }} 
               icon={<Plus size={20} />}
             >
               Create Note
             </StandardPrimaryButton>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
           <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:max-w-3xl flex-1">
              <SmartSearchBox 
                value={localSearch} 
                onChange={setLocalSearch} 
                onSearch={() => { setAppliedSearch(localSearch); setCurrentPage(1); }}
                phrases={[
                  "Search labels...", 
                  "Search in descriptions...", 
                  "Search collection titles...", 
                  "Search attachment labels..."
                ]}
                className="w-full"
              />
              <button 
                onClick={toggleSelectAll}
                className="px-6 py-3.5 bg-gray-50 text-[#004A74] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200 shrink-0 w-full md:w-auto shadow-sm"
              >
                {selectedIds.length === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
           </div>
           
           <div className="text-[10px] font-black uppercase tracking-widest text-[#004A74]/60 px-4 whitespace-nowrap">
             {totalCount} Knowledge Anchors
           </div>
        </div>
      </div>

      {/* BATCH ACTION BAR */}
      <div className="px-6 md:px-10 mt-4">
        <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
          <StandardQuickActionButton variant="danger" onClick={handleMassDelete} title="Mass Purge">
            <Trash2 size={18} />
          </StandardQuickActionButton>
          <StandardQuickActionButton variant="warning" onClick={handleBatchFavorite} title="Mass Favorite">
            {anyUnfavSelected ? <Star size={18} /> : <Star size={18} className="fill-current" />}
          </StandardQuickActionButton>
          <button onClick={() => setSelectedIds([])} className="text-[10px] font-black uppercase tracking-widest text-[#004A74]/50 hover:text-[#004A74] px-2 transition-all">Clear Selection</button>
        </StandardQuickAccessBar>
      </div>

      {/* GALLERY GRID - Scrolling naturally with page */}
      <div className="p-6 md:p-10">
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
             <StickyNote size={80} strokeWidth={1} className="text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Notebook is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(item => {
              const collectionTitle = item.collectionTitle;
              return (
                <div 
                  key={item.id}
                  onClick={() => setViewNote(item)}
                  className={`group relative bg-white border border-gray-200 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full ${selectedIds.includes(item.id) ? 'ring-2 ring-[#004A74] border-[#004A74]' : ''}`}
                >
                  {/* Checkbox Top Left */}
                  <div className="absolute top-6 left-6 z-10" onClick={e => toggleSelect(e, item.id)}>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200 hover:border-[#004A74]'}`}>
                        {selectedIds.includes(item.id) && <Check size={14} strokeWidth={4} />}
                     </div>
                  </div>

                  {/* Favorite Top Right */}
                  <div className="absolute top-6 right-6 z-10" onClick={e => handleToggleFavorite(e, item)}>
                     <Star size={20} className={item.isFavorite ? 'text-[#FED400] fill-[#FED400]' : 'text-gray-200'} />
                  </div>

                  {/* Label Header Refined: Sparks & Label & Edit Pencil removed for cleaner look */}
                  <div className="mt-8 mb-4">
                     <h3 className="text-base font-black text-[#004A74] uppercase leading-tight line-clamp-2">{item.label}</h3>
                  </div>

                  {collectionTitle && (
                     <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50 text-gray-400">
                        <Library size={12} className="shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-tight truncate">{collectionTitle}</span>
                     </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                     <div className="flex items-center gap-1.5 text-gray-300">
                        <Clock size={12} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">{formatShortDate(item.createdAt)}</span>
                     </div>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEditDirect(e, item)} className="p-2 text-blue-200 hover:text-[#004A74] hover:bg-blue-50 rounded-lg transition-all"><Pencil size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(e, item.id); }} className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 md:px-10">
        <StandardTableFooter 
          totalItems={totalCount} 
          currentPage={currentPage} 
          itemsPerPage={itemsPerPage} 
          totalPages={Math.ceil(totalCount / itemsPerPage)} 
          onPageChange={setCurrentPage} 
        />
      </div>

      {isFormOpen && (
        <NoteForm 
          note={selectedNote} 
          collectionId={collectionId}
          libraryItems={libraryItems}
          onClose={() => setIsFormOpen(false)} 
          onComplete={(newItem, newContent) => { 
            setIsFormOpen(false); 
            if (newItem) {
              setItems(prev => {
                const index = prev.findIndex(i => i.id === newItem.id);
                return index > -1 ? prev.map(i => i.id === newItem.id ? newItem : i) : [newItem, ...prev];
              });
              setTotalCount(prev => prev + (items.some(i => i.id === newItem.id) ? 0 : 1));
              
              // Handover data content untuk Detail View
              setTempNoteContent(newContent);
              setViewNote(newItem);
            }
          }} 
        />
      )}

      {viewNote && (
        <NoteDetailView 
          note={viewNote}
          initialContent={tempNoteContent}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onClose={() => {
            setViewNote(null);
            setTempNoteContent(null);
          }}
          onUpdate={(updated) => {
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
          }}
        />
      )}
    </div>
  );
};

export default NotebookMain;