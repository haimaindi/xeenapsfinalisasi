import React, { useState, useEffect } from 'react';
import { LibraryItem, TracerReference } from '../../../../types';
import { linkTracerReference, unlinkTracerReference } from '../../../../services/TracerService';
import { fetchLibraryPaginated } from '../../../../services/gasService';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Loader2, 
  Quote,
  Library,
  BookOpen,
  Calendar
} from 'lucide-react';
import { SmartSearchBox } from '../../../Common/SearchComponents';
import { showXeenapsToast } from '../../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import ReferenceDetailView from '../Modals/ReferenceDetailView';

interface ReferenceTabProps {
  projectId: string;
  libraryItems: LibraryItem[];
  references: TracerReference[];
  setReferences: React.Dispatch<React.SetStateAction<TracerReference[]>>;
  onRefresh: () => Promise<void>;
  reopenedRef?: (LibraryItem & { refRow: TracerReference }) | null;
}

const ReferenceTab: React.FC<ReferenceTabProps> = ({ projectId, libraryItems, references, setReferences, onRefresh, reopenedRef }) => {
  const [localSearch, setLocalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRef, setSelectedRef] = useState<LibraryItem & { refRow?: TracerReference } | null>(null);

  // AUTO-OPEN LOGIC
  useEffect(() => {
    if (reopenedRef) {
      setSelectedRef(reopenedRef);
    }
  }, [reopenedRef]);

  const handleSearch = async () => {
    if (localSearch.length < 3) return;
    setIsSearching(true);
    const result = await fetchLibraryPaginated(1, 10, localSearch, 'Literature', 'research');
    setSearchResults(result.items);
    setIsSearching(false);
  };

  const handleLink = async (lib: LibraryItem) => {
    if (references.some(r => r.collectionId === lib.id)) {
      showXeenapsToast('warning', 'Document already anchored');
      return;
    }

    // OPTIMISTIC ADD: Instant UI feedback
    const tempId = crypto.randomUUID();
    const mockRef: TracerReference = {
      id: tempId,
      projectId,
      collectionId: lib.id,
      contentJsonId: '',
      storageNodeUrl: '',
      createdAt: new Date().toISOString()
    };
    
    setReferences(prev => [mockRef, ...prev]);
    setSearchResults([]);
    setLocalSearch('');

    // Background Sync
    const realData = await linkTracerReference({ projectId, collectionId: lib.id });
    if (realData) {
      // Synchronize state with real ID from database
      setReferences(prev => prev.map(r => r.id === tempId ? realData : r));
      showXeenapsToast('success', 'Reference anchored');
    } else {
      // Rollback on failure
      setReferences(prev => prev.filter(r => r.id !== tempId));
      showXeenapsToast('error', 'Anchoring failed');
    }
  };

  const handleUnlink = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const originalRefs = [...references];
      // Optimistic Remove
      setReferences(prev => prev.filter(t => t.id !== id));

      // Background Sync
      const success = await unlinkTracerReference(id);
      if (success) {
        showXeenapsToast('success', 'Anchor removed');
      } else {
        // Rollback
        setReferences(originalRefs);
        showXeenapsToast('error', 'Removal failed. Rollback synchronized.');
      }
    }
  };

  const associatedItems = references.map(r => {
    const lib = libraryItems.find(it => it.id === r.collectionId);
    return lib ? { ...lib, refRow: r } : null;
  }).filter(Boolean) as (LibraryItem & { refRow: TracerReference })[];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {selectedRef && (
        <ReferenceDetailView 
          item={selectedRef} 
          refRow={selectedRef.refRow!} 
          onClose={() => setSelectedRef(null)} 
        />
      )}

      {/* SEARCH SECTION */}
      <section className="space-y-4">
         <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Anchor New Knowledge Source</h3>
         <div className="relative">
            <SmartSearchBox value={localSearch} onChange={setLocalSearch} onSearch={handleSearch} className="w-full" phrases={["Search in main library to link..."]} />
            {isSearching && <div className="absolute right-16 top-1/2 -translate-y-1/2"><Loader2 size={16} className="animate-spin text-[#004A74]" /></div>}
         </div>

         {searchResults.length > 0 && (
           <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-top-2 duration-500">
              {searchResults.map(lib => (
                <div key={lib.id} onClick={() => handleLink(lib)} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between cursor-pointer hover:border-[#FED400] hover:shadow-lg transition-all group">
                   <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-[#004A74] uppercase truncate">{lib.title}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase">{lib.authors[0]} • {lib.year}</p>
                   </div>
                   <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-[#004A74] group-hover:text-white transition-all">
                      <Plus size={18} strokeWidth={3} />
                   </div>
                </div>
              ))}
           </div>
         )}
      </section>

      {/* ASSOCIATED REFERENCES - LIST MODEL */}
      <section className="space-y-6">
         <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2">
               <Library size={16} className="text-[#FED400]" /> Integrated Literature Hub
            </h3>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{associatedItems.length} Sources Linked</span>
         </div>
         
         <div className="grid grid-cols-1 gap-3">
            {associatedItems.length === 0 ? (
              <div className="py-20 text-center opacity-20 bg-white border border-dashed border-gray-200 rounded-[2.5rem]">
                 <BookOpen size={48} className="mx-auto mb-2 text-[#004A74]" />
                 <p className="text-[10px] font-black uppercase tracking-widest">No references anchored yet</p>
              </div>
            ) : associatedItems.map((lib, idx) => (
              <div 
                key={lib.id} 
                onClick={() => setSelectedRef(lib)} 
                className="group bg-white p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-xl hover:border-[#FED400]/40 transition-all duration-300 cursor-pointer relative overflow-hidden"
              >
                 <div className="absolute top-0 left-0 w-1 h-full bg-gray-100 group-hover:bg-[#FED400] transition-colors" />
                 
                 <div className="shrink-0 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#004A74] shadow-inner group-hover:bg-[#004A74] group-hover:text-white transition-all">
                    <span className="text-xs font-black">{idx + 1}</span>
                 </div>

                 <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#004A74] uppercase leading-tight truncate mb-1">{lib.title}</h4>
                    <div className="flex items-center gap-4 text-gray-400">
                       <span className="text-[9px] font-bold uppercase tracking-tight truncate max-w-[150px]">{lib.authors[0]}</span>
                       <div className="w-1 h-1 rounded-full bg-gray-200" />
                       <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter">
                          <Calendar size={10} /> {lib.year}
                       </div>
                       <div className="w-1 h-1 rounded-full bg-gray-200" />
                       <span className="text-[9px] font-black bg-gray-50 px-2 py-0.5 rounded-md text-gray-500 uppercase">{lib.topic}</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={(e) => handleUnlink(e, lib.refRow.id)} 
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      title="Remove Anchor"
                    >
                       <Trash2 size={16} />
                    </button>
                    <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl group-hover:bg-[#FED400]/20 group-hover:text-[#004A74] transition-all shadow-sm">
                       <ChevronRight size={20} />
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
};

export default ReferenceTab;