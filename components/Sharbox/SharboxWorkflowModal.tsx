import React, { useState, useEffect, useCallback } from 'react';
import { ColleagueItem, LibraryItem } from '../../types';
import { fetchColleaguesPaginated } from '../../services/ColleagueService';
import { fetchLibraryPaginated } from '../../services/gasService';
import { shareToColleague } from '../../services/SharboxService';
import { 
  XMarkIcon, 
  UserIcon, 
  ShareIcon, 
  ArrowPathIcon, 
  ArrowLeftIcon, 
  PaperAirplaneIcon, 
  ChatBubbleBottomCenterTextIcon, 
  BuildingLibraryIcon, 
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardTableFooter
} from '../Common/TableComponents';
import { showXeenapsToast } from '../../utils/toastUtils';
import { BRAND_ASSETS } from '../../assets';

type WorkflowStep = 'PICK_COLLEAGUE' | 'PICK_LIBRARY' | 'CONFIRM';

interface SharboxWorkflowModalProps {
  initialItem?: LibraryItem;
  initialColleague?: ColleagueItem;
  onClose: () => void;
}

const SharboxWorkflowModal: React.FC<SharboxWorkflowModalProps> = ({ initialItem, initialColleague, onClose }) => {
  const [step, setStep] = useState<WorkflowStep>(() => {
    if (initialItem && !initialColleague) return 'PICK_COLLEAGUE';
    if (!initialItem && initialColleague) return 'PICK_LIBRARY';
    return 'PICK_COLLEAGUE';
  });

  const [selectedColleague, setSelectedColleague] = useState<ColleagueItem | null>(initialColleague || null);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(initialItem || null);
  const [message, setMessage] = useState('');
  
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const itemsPerPage = 10;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (step === 'PICK_COLLEAGUE') {
        const result = await fetchColleaguesPaginated(currentPage, itemsPerPage, search);
        setDataList(result.items);
        setTotalCount(result.totalCount);
      } else if (step === 'PICK_LIBRARY') {
        const result = await fetchLibraryPaginated(currentPage, itemsPerPage, search, 'All', 'research');
        setDataList(result.items);
        setTotalCount(result.totalCount);
      }
    } catch (e) {
      console.error("Workflow fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }, [step, currentPage, search]);

  useEffect(() => {
    if (step !== 'CONFIRM') loadData();
  }, [loadData, step]);

  const handleShare = async () => {
    if (!selectedColleague || !selectedItem) return;
    setIsSharing(true);
    showXeenapsToast('info', 'Executing secure transmission...');

    try {
      const success = await shareToColleague(
        selectedColleague.uniqueAppId,
        selectedColleague.name,
        selectedColleague.photoUrl || '',
        message,
        selectedItem,
        { email: selectedColleague.email, phone: selectedColleague.phone, socialMedia: selectedColleague.socialMedia }
      );

      if (success) {
        showXeenapsToast('success', 'Knowledge shared successfully');
        onClose();
      } else {
        showXeenapsToast('error', 'Transmission failed');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection lost');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh] border border-white/20">
        
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                 <ShareIcon className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Sharbox Workflow</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   {step === 'PICK_COLLEAGUE' ? 'Step 1: Identify Partner' : step === 'PICK_LIBRARY' ? 'Step 2: Select Knowledge' : 'Step 3: Final Authorization'}
                 </p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><XMarkIcon className="w-8 h-8" /></button>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-1 bg-gray-100 flex">
           <div className={`h-full bg-[#004A74] transition-all duration-700 ${step === 'PICK_COLLEAGUE' ? 'w-1/3' : step === 'PICK_LIBRARY' ? 'w-2/3' : 'w-full'}`} />
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#fcfcfc]">
           {step === 'CONFIRM' ? (
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-10 animate-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Summary Partner */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Receiving Partner</label>
                      <div className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm flex items-center gap-5">
                         <img src={selectedColleague?.photoUrl || BRAND_ASSETS.USER_DEFAULT} className="w-16 h-16 rounded-full border-2 border-[#FED400] object-cover shadow-md" alt="" />
                         <div className="min-w-0">
                            <h4 className="text-sm font-black text-[#004A74] uppercase truncate">{selectedColleague?.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedColleague?.affiliation}</p>
                         </div>
                      </div>
                   </div>
                   {/* Summary Item */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Shared Asset</label>
                      <div className="p-6 bg-[#004A74] rounded-[2.5rem] shadow-xl flex items-center gap-5 text-white">
                         <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0"><BuildingLibraryIcon className="w-8 h-8 text-[#FED400]" /></div>
                         <div className="min-w-0">
                            <h4 className="text-xs font-black uppercase truncate">{selectedItem?.title}</h4>
                            <p className="text-[9px] font-bold text-white/60 uppercase">{selectedItem?.topic} • {selectedItem?.year}</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Accompanying Message (Optional)</label>
                   <div className="relative group">
                      <ChatBubbleBottomCenterTextIcon className="absolute left-6 top-8 w-6 h-6 text-gray-200 group-focus-within:text-[#004A74] transition-colors" />
                      <textarea 
                        className="w-full bg-white p-8 pl-16 border border-gray-200 rounded-[3rem] outline-none text-sm font-bold text-[#004A74] placeholder:text-gray-200 resize-none focus:ring-8 focus:ring-[#004A74]/5 transition-all min-h-[150px]"
                        placeholder="Type your message to the colleague..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                      />
                   </div>
                </div>

                <div className="pt-6 flex gap-4">
                   <button onClick={() => setStep('PICK_LIBRARY')} className="px-8 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all flex items-center gap-2"><ArrowLeftIcon className="w-4 h-4" /> Back</button>
                   <button 
                     onClick={handleShare}
                     disabled={isSharing}
                     className="flex-1 py-5 bg-[#004A74] text-[#FED400] rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                   >
                     {isSharing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />}
                     {isSharing ? 'TRANSMITTING...' : 'AUTHORIZE & SEND'}
                   </button>
                </div>
             </div>
           ) : (
             /* PICKER LIST UI (COLLEAGUE OR LIBRARY) */
             <div className="flex-1 flex flex-col overflow-hidden p-6">
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
                   <SmartSearchBox 
                    value={search} 
                    onChange={setSearch} 
                    onSearch={() => setCurrentPage(1)} 
                    className="flex-1"
                    phrases={step === 'PICK_COLLEAGUE' ? ["Search colleague name...", "Search unique ID..."] : ["Search document title...", "Search topic..."]}
                   />
                   {step === 'PICK_LIBRARY' && selectedColleague && (
                     <div className="flex items-center gap-3 px-4 py-2 bg-[#004A74] text-white rounded-xl shadow-md border border-white/10 max-w-[200px] shrink-0">
                        <img src={selectedColleague.photoUrl || BRAND_ASSETS.USER_DEFAULT} className="w-6 h-6 rounded-full border border-white/20 object-cover" alt="" />
                        <span className="text-[9px] font-black uppercase truncate">{selectedColleague.name}</span>
                     </div>
                   )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 pb-4">
                   {isLoading ? (
                     [...Array(6)].map((_, i) => <div key={i} className="h-16 w-full skeleton rounded-2xl" />)
                   ) : dataList.length === 0 ? (
                     <div className="py-20 text-center opacity-30 flex flex-col items-center">
                        {step === 'PICK_COLLEAGUE' ? <UserIcon className="w-12 h-12" /> : <BuildingLibraryIcon className="w-12 h-12" />}
                        <p className="text-[10px] font-black uppercase mt-4">No results found</p>
                     </div>
                   ) : (
                     dataList.map((li) => (
                       <div 
                         key={li.id}
                         className="bg-white border border-gray-100 rounded-2xl p-3.5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#004A74]/20 transition-all group"
                       >
                          {/* Left Visual: Photo for Colleague, None for Library */}
                          {step === 'PICK_COLLEAGUE' ? (
                            <img src={li.photoUrl || BRAND_ASSETS.USER_DEFAULT} className="w-10 h-10 rounded-full border border-gray-50 object-cover shadow-sm shrink-0" alt="" />
                          ) : null}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-black text-[#004A74] uppercase truncate leading-tight">{li.name || li.title}</h4>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">
                                  {step === 'PICK_COLLEAGUE' ? (li.affiliation || 'Independent') : (li.authors?.join(', ') || 'Unknown Author')}
                                </span>
                             </div>
                          </div>

                          {/* Action */}
                          <button 
                            onClick={() => {
                              if (step === 'PICK_COLLEAGUE') {
                                setSelectedColleague(li);
                                if (initialItem) setStep('CONFIRM');
                                else setStep('PICK_LIBRARY');
                              } else {
                                setSelectedItem(li);
                                setStep('CONFIRM');
                              }
                              setSearch('');
                              setCurrentPage(1);
                            }}
                            className="shrink-0 px-5 py-2.5 bg-gray-50 text-[#004A74] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FED400] transition-all border border-gray-100 flex items-center gap-2"
                          >
                             Select <ChevronRightIcon className="w-3 h-3 stroke-[4]" />
                          </button>
                       </div>
                     ))
                   )}
                </div>

                <div className="shrink-0 border-t border-gray-100 pt-4 mt-2">
                   <StandardTableFooter 
                    totalItems={totalCount} 
                    currentPage={currentPage} 
                    itemsPerPage={itemsPerPage} 
                    totalPages={Math.ceil(totalCount / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                   />
                </div>
             </div>
           )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SharboxWorkflowModal;