import React, { useState, useEffect, useCallback } from 'react';
import { LibraryItem, PresentationItem, QuestionItem, LibraryType, BloomsLevel } from '../../types';
import { fetchLibrary, fetchLibraryPaginated } from '../../services/gasService';
import { fetchPresentationsPaginated } from '../../services/PresentationService';
import { fetchAllQuestionsPaginated } from '../../services/QuestionService';
import { 
  X, 
  Search, 
  BookOpen, 
  Plus,
  Loader2,
  Presentation,
  GraduationCap,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';

export type PickerType = 'LIBRARY' | 'PRESENTATION' | 'QUESTION';

interface ResourcePickerProps {
  type: PickerType;
  onClose: () => void;
  onSelect: (items: any[]) => void;
}

const ResourcePicker: React.FC<ResourcePickerProps> = ({ type, onClose, onSelect }) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [libraryLookup, setLibraryLookup] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  const itemsPerPage = 10;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (type === 'QUESTION' && Object.keys(libraryLookup).length === 0) {
        const libs = await fetchLibrary();
        const lookup: Record<string, string> = {};
        libs.forEach(l => lookup[l.id] = l.title);
        setLibraryLookup(lookup);
      }

      if (type === 'LIBRARY') {
        const res = await fetchLibraryPaginated(currentPage, itemsPerPage, appliedSearch, 'All', '', 'createdAt', 'desc');
        setItems(res.items);
        setTotalCount(res.totalCount);
      } else if (type === 'PRESENTATION') {
        const res = await fetchPresentationsPaginated(currentPage, itemsPerPage, appliedSearch);
        setItems(res.items);
        setTotalCount(res.totalCount);
      } else if (type === 'QUESTION') {
        const res = await fetchAllQuestionsPaginated(currentPage, itemsPerPage, appliedSearch);
        setItems(res.items);
        setTotalCount(res.totalCount);
      }
    } catch (e) {
      console.error("Picker load error", e);
    } finally {
      setIsLoading(false);
    }
  }, [type, currentPage, appliedSearch, libraryLookup]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    let finalSearch = localSearch;
    // Smart Search: Jika mencari di Question, cek apakah query cocok dengan judul buku/koleksi
    if (type === 'QUESTION' && localSearch.trim()) {
      const matchedId = Object.entries(libraryLookup).find(([id, title]) => 
        title.toLowerCase().includes(localSearch.toLowerCase())
      )?.[0];
      if (matchedId) finalSearch = matchedId;
    }
    setAppliedSearch(finalSearch);
    setCurrentPage(1);
  };

  const toggleSelect = (item: any) => {
    if (selectedItems.some(i => i.id === item.id)) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const getIcon = () => {
    if (type === 'PRESENTATION') return <Presentation size={24} />;
    if (type === 'QUESTION') return <GraduationCap size={24} />;
    return <BookOpen size={24} />;
  };

  const getTitle = () => {
    if (type === 'PRESENTATION') return "Presentation Repository";
    if (type === 'QUESTION') return "AI Question Bank";
    return "Xeenaps Librarian";
  };

  const getBloomColor = (level: string) => {
    if (level.includes('C1') || level.includes('C2')) return 'bg-green-500';
    if (level.includes('C3') || level.includes('C4')) return 'bg-[#004A74]';
    return 'bg-[#FED400] text-[#004A74]';
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('sv');
    } catch { return "-"; }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const start = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in">
       <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          
          <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                   {getIcon()}
                </div>
                <div>
                   <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">{getTitle()}</h2>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select multiple resources for your session</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
          </div>

          <div className="px-8 py-4 bg-white border-b border-gray-100 shrink-0">
             <SmartSearchBox 
               value={localSearch} 
               onChange={setLocalSearch} 
               onSearch={handleSearch} 
               className="w-full"
               phrases={["Search title...", "Search keywords...", "Search by collection source..."]}
             />
          </div>

          <div className="flex-1 overflow-hidden p-6 flex flex-col bg-[#fcfcfc]">
             <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {isLoading ? (
                   <CardGridSkeleton count={itemsPerPage} />
                ) : items.length === 0 ? (
                   <div className="py-20 text-center font-black text-gray-300 uppercase text-xs tracking-widest">No matching items found</div>
                ) : (
                   items.map(item => {
                     const isSelected = selectedItems.some(i => i.id === item.id);
                     return (
                       <div 
                         key={item.id} 
                         onClick={() => toggleSelect(item)}
                         className={`group bg-white border rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${isSelected ? 'border-[#004A74] ring-2 ring-[#004A74]/5' : 'border-gray-100'}`}
                       >
                          {/* Checkbox */}
                          <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200'}`}>
                             {isSelected && <Check size={14} strokeWidth={4} />}
                          </div>

                          {/* Side Indicator */}
                          <div className={`w-1.5 h-12 rounded-full shrink-0 ${type === 'QUESTION' ? getBloomColor(item.bloomLevel) : 'bg-[#004A74] group-hover:bg-[#FED400]'} transition-colors`} />
                          
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                {type === 'LIBRARY' && (
                                   <>
                                      <span className="px-2 py-0.5 bg-[#004A74]/5 text-[#004A74] text-[7px] font-black uppercase rounded-md">{item.category}</span>
                                      <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[7px] font-black uppercase rounded-md">{item.topic}</span>
                                   </>
                                )}
                                {type === 'PRESENTATION' && (
                                   <span className="px-2 py-0.5 bg-[#FED400]/20 text-[#004A74] text-[7px] font-black uppercase rounded-md">Presentation</span>
                                )}
                                {type === 'QUESTION' && (
                                   <>
                                      <span className={`px-2 py-0.5 text-white text-[7px] font-black uppercase rounded-md ${getBloomColor(item.bloomLevel)}`}>{item.bloomLevel}</span>
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[7px] font-black uppercase rounded-md">{item.customLabel}</span>
                                   </>
                                )}
                             </div>

                             <h4 className="text-sm font-black text-[#004A74] uppercase leading-tight truncate">
                                {item.title || item.questionText || 'Untitled'}
                             </h4>

                             <div className="flex items-center gap-4 mt-1 text-gray-400">
                                <div className="flex items-center gap-1">
                                   <User size={10} />
                                   <span className="text-[9px] font-bold uppercase truncate max-w-[150px]">
                                      {item.authors ? item.authors.join(', ') : (item.presenters ? item.presenters.join(', ') : (libraryLookup[item.collectionId] || 'AI Generated'))}
                                   </span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-gray-200" />
                                <div className="flex items-center gap-1">
                                   <Calendar size={10} />
                                   <span className="text-[9px] font-mono font-bold">{item.year || formatShortDate(item.createdAt)}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                     );
                   })
                )}
             </div>
             
             {/* Integrated Multi-Action Footer */}
             <div className="mt-4 pt-4 border-t border-gray-100 shrink-0 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between px-8 py-4 gap-4">
                <div className="flex flex-col gap-1 items-center md:items-start flex-1">
                   <p className="text-xs text-gray-500 font-medium">
                     Showing <span className="font-bold">{start}</span> to <span className="font-bold">{end}</span> of <span className="font-bold">{totalCount}</span> items
                   </p>
                   <div className="flex items-center gap-1 mt-1">
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
                      <div className="flex gap-1">
                         {[...Array(totalPages)].map((_, i) => (
                           <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-[#004A74] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-400 hover:text-[#004A74]'}`}>{i + 1}</button>
                         )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                      </div>
                      <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(currentPage + 1)} className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
                   </div>
                </div>

                {selectedItems.length > 0 && (
                   <button 
                     onClick={() => onSelect(selectedItems)}
                     className="px-8 py-3.5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shrink-0 animate-in slide-in-from-right-2"
                   >
                     Add Selected ({selectedItems.length}) <Plus size={16} strokeWidth={4} />
                   </button>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default ResourcePicker;