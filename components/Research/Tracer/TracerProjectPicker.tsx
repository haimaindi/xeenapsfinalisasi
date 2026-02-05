import React, { useState, useEffect, useCallback } from 'react';
import { LibraryItem, TracerProject } from '../../../types';
import { fetchTracerProjects, linkTracerReference } from '../../../services/TracerService';
import { 
  X, 
  Target, 
  Plus, 
  Loader2,
  Calendar,
  User
} from 'lucide-react';
import { SmartSearchBox } from '../../Common/SearchComponents';
import { 
  StandardTableFooter
} from '../../Common/TableComponents';
import { showXeenapsToast } from '../../../utils/toastUtils';

interface TracerProjectPickerProps {
  item: LibraryItem;
  onClose: () => void;
}

const TracerProjectPicker: React.FC<TracerProjectPickerProps> = ({ item, onClose }) => {
  const [projects, setProjects] = useState<TracerProject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  const itemsPerPage = 10;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchTracerProjects(currentPage, itemsPerPage, appliedSearch);
      setProjects(result.items);
      setTotalCount(result.totalCount);
    } catch (e) {
      console.error("Tracer projects fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, appliedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelect = async (project: TracerProject) => {
    setIsLinking(true);
    showXeenapsToast('info', `Anchoring collection to ${project.label}...`);
    
    try {
      const result = await linkTracerReference({
        projectId: project.id,
        collectionId: item.id
      });
      
      if (result) {
        showXeenapsToast('success', 'Collection anchored');
        onClose();
      } else {
        showXeenapsToast('error', 'Anchoring failed');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in">
       {/* FULL BODY OVERLAY LOADER */}
       {isLinking && (
         <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="flex flex-col items-center gap-4">
             <Loader2 size={48} className="text-[#004A74] animate-spin" />
             <p className="text-sm font-black text-[#004A74] uppercase tracking-[0.2em] animate-pulse">Please wait...</p>
           </div>
         </div>
       )}

       <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]">
          
          <div className="p-5 md:p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
             <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#004A74] text-[#FED400] rounded-xl flex items-center justify-center shadow-lg">
                   <Target className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                   <h2 className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tight">Research Tracer</h2>
                   <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select available research below</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
                <X className="w-6 h-6 md:w-7 md:h-7" />
             </button>
          </div>

          <div className="px-5 md:px-8 py-3 md:py-4 bg-white border-b border-gray-100 shrink-0">
             <SmartSearchBox 
               value={search} 
               onChange={setSearch} 
               className="w-full"
               onSearch={() => {
                 setAppliedSearch(search);
                 setCurrentPage(1);
               }}
               phrases={["Search Title...", "Search Author(s)...", "Search Label..."]}
             />
          </div>

          <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col bg-[#fcfcfc]">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {isLoading ? (
                  [...Array(6)].map((_, i) => <div key={i} className="h-24 w-full skeleton rounded-3xl" />)
                ) : projects.length === 0 ? (
                  <div className="py-20 text-center font-black text-gray-300 uppercase text-xs tracking-widest">No active tracer projects</div>
                ) : (
                  projects.map(p => (
                    <div key={p.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#004A74]/20 transition-all relative overflow-hidden group">
                        <div className="w-1.5 h-12 rounded-full shrink-0 bg-[#004A74] group-hover:bg-[#FED400] transition-colors" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-[#004A74]/5 text-[#004A74] text-[7px] font-black uppercase rounded-md">{p.label}</span>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Calendar size={10} />
                              <span className="text-[7px] font-bold uppercase">{p.startDate || '-'}</span>
                            </div>
                          </div>
                          <h4 className="text-sm font-black text-[#004A74] leading-tight uppercase truncate">{p.title || p.label}</h4>
                          <div className="flex items-center gap-2 text-gray-400 mt-1">
                              <User size={10} />
                              <span className="text-[8px] font-bold uppercase truncate">{Array.isArray(p.authors) ? p.authors.join(', ') : 'N/A'}</span>
                          </div>
                        </div>
                        <button 
                          disabled={isLinking}
                          onClick={() => handleSelect(p)}
                          className="shrink-0 px-6 py-2.5 bg-gray-50 text-[#004A74] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FED400] transition-all flex items-center justify-center gap-2 border border-gray-100 shadow-sm"
                        >
                          {isLinking ? <Loader2 size={12} className="animate-spin" /> : 'Select'}
                        </button>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
                <StandardTableFooter 
                  totalItems={totalCount} 
                  currentPage={currentPage} 
                  itemsPerPage={itemsPerPage} 
                  totalPages={Math.ceil(totalCount / itemsPerPage)} 
                  onPageChange={setCurrentPage} 
                />
              </div>
            </div>
          </div>
       </div>
    </div>
  );
};

export default TracerProjectPicker;