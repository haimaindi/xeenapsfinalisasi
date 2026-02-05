import React, { useState, useEffect, useCallback } from 'react';
import { LibraryItem, TeachingItem, PresentationItem, QuestionItem } from '../../types';
import { fetchTeachingPaginated, saveTeachingItem } from '../../services/TeachingService';
import { 
  X, 
  BookOpenCheck, 
  Plus, 
  Loader2,
  Calendar,
  School
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardTableFooter
} from '../Common/TableComponents';
import { showXeenapsToast } from '../../utils/toastUtils';

interface TeachingSessionPickerProps {
  item: LibraryItem | PresentationItem | QuestionItem | QuestionItem[];
  onClose: () => void;
}

const TeachingSessionPicker: React.FC<TeachingSessionPickerProps> = ({ item, onClose }) => {
  const [sessions, setSessions] = useState<TeachingItem[]>([]);
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
      const result = await fetchTeachingPaginated(currentPage, itemsPerPage, appliedSearch);
      setSessions(result.items);
      setTotalCount(result.totalCount);
    } catch (e) {
      console.error("Teaching sessions fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, appliedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelect = async (session: TeachingItem) => {
    setIsLinking(true);
    
    try {
      const isArray = Array.isArray(item);
      const firstItem = isArray ? item[0] : item;
      
      const isQuestion = 'questionText' in firstItem;
      const isPresentation = !isQuestion && 'gSlidesId' in firstItem;
      
      let field: keyof TeachingItem = 'referenceLinks';
      if (isQuestion) field = 'questionBankId';
      else if (isPresentation) field = 'presentationId';

      const currentArray = Array.isArray(session[field]) ? (session[field] as any[]) : [];
      const incomingItems = isArray ? item : [item];
      
      const newToAttach = incomingItems.filter(inc => !currentArray.some(curr => curr.id === inc.id));

      if (newToAttach.length === 0) {
        showXeenapsToast('warning', 'Selected items already attached to this session');
        setIsLinking(false);
        return;
      }

      showXeenapsToast('info', `Attaching ${newToAttach.length} item(s) to ${session.courseTitle || session.label}...`);

      const formattedAttachments = newToAttach.map(it => {
        if ('questionText' in it) return { id: it.id, label: it.customLabel, questionText: it.questionText };
        if ('gSlidesId' in it) return { id: it.id, title: it.title, gSlidesId: it.gSlidesId };
        return { id: it.id, title: it.title };
      });

      const updatedSession = {
        ...session,
        [field]: [...currentArray, ...formattedAttachments],
        updatedAt: new Date().toISOString()
      };

      const success = await saveTeachingItem(updatedSession);
      
      if (success) {
        showXeenapsToast('success', `${newToAttach.length} Item(s) Anchored`);
        onClose();
      } else {
        showXeenapsToast('error', 'Attachment failed');
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
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#004A74] text-[#FED400] rounded-xl flex items-center justify-center shadow-lg">
                   <BookOpenCheck className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                   <h2 className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tight">Teaching Session</h2>
                   <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select session to anchor knowledge</p>
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
               phrases={["Search course title...", "Search institution...", "Search session label..."]}
             />
          </div>

          <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col bg-[#fcfcfc]">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {isLoading ? (
                  [...Array(6)].map((_, i) => <div key={i} className="h-24 w-full skeleton rounded-3xl" />)
                ) : sessions.length === 0 ? (
                  <div className="py-20 text-center font-black text-gray-300 uppercase text-xs tracking-widest">No matching teaching sessions</div>
                ) : (
                  sessions.map(s => (
                    <div key={s.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#004A74]/20 transition-all relative overflow-hidden group">
                        <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: s.eventColor || '#004A74' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-[#004A74]/5 text-[#004A74] text-[7px] font-black uppercase rounded-md">{s.label}</span>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Calendar size={10} />
                              <span className="text-[7px] font-mono font-black">{s.teachingDate}</span>
                            </div>
                          </div>
                          <h4 className="text-sm font-black text-[#004A74] leading-tight uppercase truncate">{s.courseTitle || 'Untitled Course'}</h4>
                          <div className="flex items-center gap-2 text-gray-400 mt-1">
                              <School size={10} />
                              <span className="text-[8px] font-bold uppercase truncate">{s.institution || 'N/A'}</span>
                          </div>
                        </div>
                        <button 
                          disabled={isLinking}
                          onClick={() => handleSelect(s)}
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

export default TeachingSessionPicker;