
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { ReviewItem } from '../../../types';
import { fetchReviewsPaginated, deleteReview, saveReview } from '../../../services/ReviewService';
import { 
  Plus, 
  Trash2, 
  Star, 
  BookOpen, 
  ChevronRight, 
  Clock, 
  Eye, 
  Calendar 
} from 'lucide-react';
import { SmartSearchBox } from '../../Common/SearchComponents';
import { StandardPrimaryButton } from '../../Common/ButtonComponents';
import { CardGridSkeleton } from '../../Common/LoadingComponents';
import { StandardTableFooter } from '../../Common/TableComponents';
import { useAsyncWorkflow } from '../../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../../hooks/useOptimisticUpdate';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../../utils/swalUtils';

const AllReview: React.FC = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<ReviewItem>();
  
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const itemsPerPage = 12;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- MULTI-LAYER SORTING LOGIC ---
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    
    workflow.execute(
      async (signal) => {
        const result = await fetchReviewsPaginated(currentPage, itemsPerPage, appliedSearch, "createdAt", "desc", signal);
        setItems(result.items || []);
        setTotalCount(result.totalCount || 0);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, itemsPerPage, workflow.execute]);

  useEffect(() => {
    loadData();
  }, [loadData, appliedSearch]);

  // --- REAL-TIME EVENT SYNC (UPSERT LOGIC) ---
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const updatedItem = e.detail as ReviewItem;
      setItems(prev => {
        const index = prev.findIndex(i => i.id === updatedItem.id);
        if (index > -1) {
           // Update Existing
           return prev.map(i => i.id === updatedItem.id ? { ...i, ...updatedItem } : i);
        } else {
           // Insert New Instantly
           return [updatedItem, ...prev];
        }
      });
      // Correct total count if it's a new item
      setTotalCount(prev => items.some(i => i.id === updatedItem.id) ? prev : prev + 1);
    };

    const handleDeleteEvent = (e: any) => {
      const id = e.detail;
      setItems(prev => prev.filter(i => i.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    };

    window.addEventListener('xeenaps-review-updated', handleUpdate);
    window.addEventListener('xeenaps-review-deleted', handleDeleteEvent);
    return () => {
      window.removeEventListener('xeenaps-review-updated', handleUpdate);
      window.removeEventListener('xeenaps-review-deleted', handleDeleteEvent);
    };
  }, [items.length]);

  const handleNewReview = async () => {
    const { value: label } = await Swal.fire({
      title: 'NEW LITERATURE REVIEW',
      input: 'text',
      inputLabel: 'Review Label',
      inputPlaceholder: 'e.g., AI in Healthcare Synthesis...',
      showCancelButton: true,
      confirmButtonText: 'CREATE',
      ...XEENAPS_SWAL_CONFIG,
      inputValidator: (value) => {
        if (!value) return 'Label is mandatory!';
        return null;
      }
    });

    if (label) {
      Swal.fire({
        title: 'CREATING WORKSPACE...',
        text: 'Preparing workspace for new review project...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        ...XEENAPS_SWAL_CONFIG
      });

      const id = crypto.randomUUID();
      const newItem: ReviewItem = {
        id,
        label: label.toUpperCase(),
        centralQuestion: '',
        reviewJsonId: '',
        storageNodeUrl: '',
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await saveReview(newItem, { matrix: [], finalSynthesis: '' });
      Swal.close();
      
      if (success) {
        // PASS STATE FOR INSTANT DETAIL LOADING
        navigate(`/research/literature-review/${id}`, { state: { review: newItem } });
      } else {
        showXeenapsToast('error', 'Cloud sync failed. Please try again.');
      }
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, review: ReviewItem) => {
    e.stopPropagation();
    await performUpdate(
      items,
      setItems,
      [review.id],
      (i) => ({ ...i, isFavorite: !i.isFavorite }),
      async (updated) => {
        return await saveReview(updated, undefined as any);
      }
    );
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // Optimistic Delete via performDelete for instant removal
      await performDelete(
        items,
        setItems,
        [id],
        async (deleteId) => await deleteReview(deleteId)
      );
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

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar animate-in fade-in duration-500 pr-1">
      {/* MODULE HEADER */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8 shrink-0 px-1">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen size={24} />
           </div>
           <div>
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Literature Review</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Summaryze Knowledge Across Literatures</p>
           </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1 max-w-2xl justify-end">
          <SmartSearchBox 
            value={localSearch} 
            onChange={setLocalSearch} 
            onSearch={() => { setAppliedSearch(localSearch); setCurrentPage(1); }}
            phrases={["Search label...", "Search question...", "Search summary..."]}
            className="w-full lg:max-w-md"
          />
          <StandardPrimaryButton onClick={handleNewReview} icon={<Plus size={20} />}>
            Create
          </StandardPrimaryButton>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 pb-10">
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-20 grayscale">
             <BookOpen size={80} strokeWidth={1} className="text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">No reviews created</p>
          </div>
        ) : isMobile ? (
          /* MOBILE ELEGANT LIST ROW (Consistent with Presentation Module) */
          <div className="flex flex-col gap-4 animate-in fade-in duration-500 px-1">
            {sortedItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate(`/research/literature-review/${item.id}`, { state: { review: item } })}
                className="bg-white border border-gray-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden"
              >
                <div className="w-1.5 h-12 rounded-full shrink-0 bg-[#004A74]" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-[#004A74] truncate uppercase leading-tight">{item.label}</h4>
                  <p className="text-[10px] font-medium text-gray-400 truncate italic mt-0.5">
                    {item.centralQuestion || "Question not formulated yet..."}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-300 mt-1 uppercase tracking-widest">
                      <Calendar size={12} className="w-3 h-3" /> {formatShortDate(item.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={(e) => handleToggleFavorite(e, item)} className="p-2 text-[#FED400] bg-yellow-50/30 rounded-xl transition-all">
                    {item.isFavorite ? <Star size={18} fill="currentColor" /> : <Star size={18} />}
                  </button>
                  <button onClick={() => navigate(`/research/literature-review/${item.id}`, { state: { review: item } })} className="p-2.5 text-cyan-600 bg-cyan-50 rounded-xl active:scale-90 transition-all">
                    <Eye size={18} />
                  </button>
                  <button onClick={(e) => handleDelete(e, item.id)} className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-90 transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* DESKTOP GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1 pb-12">
            {sortedItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/research/literature-review/${item.id}`, { state: { review: item } })}
                className="group relative bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full"
              >
                {/* Baris 1: Kontainer Quick Action */}
                <div className="flex items-center justify-start gap-2 mb-4" onClick={e => e.stopPropagation()}>
                   <button onClick={e => handleToggleFavorite(e, item)} className="p-2 hover:scale-125 transition-transform text-[#FED400]">
                      <Star size={22} className={item.isFavorite ? 'fill-current' : ''} />
                   </button>
                   <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-red-200 hover:text-red-500 rounded-xl transition-all active:scale-90 ml-auto">
                      <Trash2 size={18} />
                   </button>
                </div>

                {/* Baris 2: Label Proyek */}
                <div className="mb-6">
                   <h3 className="text-base font-black text-[#004A74] uppercase leading-tight line-clamp-3">{item.label}</h3>
                </div>

                <div className="space-y-4 flex-1">
                   <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Main Question</p>
                      <p className="text-xs font-semibold text-[#004A74] line-clamp-2 italic leading-relaxed">
                        {item.centralQuestion || 'Question not formulated yet...'}
                      </p>
                   </div>
                </div>

                <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-50">
                   <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock size={12} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{formatShortDate(item.createdAt)}</span>
                   </div>
                   <div className="flex items-center gap-2 text-[#004A74] group-hover:text-blue-600 transition-colors">
                      <span className="text-[9px] font-black uppercase tracking-widest">Open</span>
                      <ChevronRight size={14} strokeWidth={3} />
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-1 pb-20">
        <StandardTableFooter 
          totalItems={totalCount} 
          currentPage={currentPage} 
          itemsPerPage={itemsPerPage} 
          totalPages={Math.ceil(totalCount / itemsPerPage)} 
          onPageChange={setCurrentPage} 
        />
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

export default AllReview;
