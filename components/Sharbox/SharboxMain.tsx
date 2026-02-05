import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { SharboxItem, SharboxStatus } from '../../types';
import { fetchSharboxItems, claimSharboxItem, deleteSharboxItem, markSharboxItemAsRead } from '../../services/SharboxService';
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  PlusIcon,
  TrashIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  SparklesIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ChatBubbleBottomCenterTextIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { SmartSearchBox } from '../Common/SearchComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { BRAND_ASSETS } from '../../assets';
import SharboxWorkflowModal from './SharboxWorkflowModal';
import SharboxDetailView from './SharboxDetailView';

const SharboxMain: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'Inbox' | 'Sent'>('Inbox');
  const [items, setItems] = useState<SharboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SharboxItem | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchSharboxItems(activeTab);
    setItems(data);
    
    // AUTO-OPEN LOGIC FROM NOTIFICATION
    const state = location.state as any;
    if (state?.openItemId && activeTab === 'Inbox') {
       const found = data.find(i => i.id === state.openItemId);
       if (found) {
         setSelectedItem(found);
         if (!found.isRead) {
            markSharboxItemAsRead(found.id);
            window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
         }
       }
    }
    
    setIsLoading(false);
  }, [activeTab, location.state]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleItemClick = (item: SharboxItem) => {
    setSelectedItem(item);
    if (activeTab === 'Inbox' && !item.isRead) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isRead: true } : i));
      markSharboxItemAsRead(item.id);
      // Trigger notification update
      window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
    }
  };

  const handleClaim = async (item: SharboxItem) => {
    showXeenapsToast('info', 'Importing knowledge to your library...');
    const success = await claimSharboxItem(item.id);
    if (success) {
      showXeenapsToast('success', 'Claimed successfully');
      // Trigger notification update (as status changed from UNCLAIMED)
      window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
      loadItems();
      setSelectedItem(null);
    } else {
      showXeenapsToast('error', 'Import failed');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteSharboxItem(id, activeTab);
      if (success) {
        showXeenapsToast('success', 'Record removed');
        window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
        loadItems();
      } else {
        showXeenapsToast('error', 'Delete failed');
      }
    }
  };

  const filteredItems = items.filter(i => {
    const s = search.toLowerCase();
    const titleMatch = (i.title || '').toLowerCase().includes(s);
    const senderMatch = (i.senderName || '').toLowerCase().includes(s);
    const receiverMatch = (i.receiverName || '').toLowerCase().includes(s);
    const affiliationMatch = (i.senderAffiliation || '').toLowerCase().includes(s);
    const messageMatch = (i.message || '').toLowerCase().includes(s);
    
    return titleMatch || senderMatch || receiverMatch || affiliationMatch || messageMatch;
  });

  const formatTimestamp = (iso: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "-";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return "-"; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      {selectedItem && (
        <SharboxDetailView 
          item={selectedItem} 
          activeTab={activeTab} 
          onClose={() => setSelectedItem(null)} 
          onRefresh={loadItems}
          onClaim={() => handleClaim(selectedItem)}
        />
      )}

      {isWorkflowOpen && (
        <SharboxWorkflowModal 
          onClose={() => setIsWorkflowOpen(false)} 
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between mb-8 shrink-0 px-1">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <InboxIcon className="w-6 h-6" />
           </div>
           <div>
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Sharbox</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cross-User Knowledge Hub</p>
           </div>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-100 shrink-0">
          <button 
            onClick={() => setActiveTab('Inbox')} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'Inbox' ? 'bg-[#004A74] text-white shadow-md' : 'text-gray-400 hover:text-[#004A74]'}`}
          >
            <InboxIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Inbox</span>
          </button>
          <button 
            onClick={() => setActiveTab('Sent')} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'Sent' ? 'bg-[#004A74] text-white shadow-md' : 'text-gray-400 hover:text-[#004A74]'}`}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sent</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 px-1 items-center">
        <div className="flex-1 w-full">
          <SmartSearchBox 
            value={search} 
            onChange={setSearch} 
            className="w-full lg:max-w-2xl"
            phrases={["Search incoming items...", "Find shared history...", "Search by sender..."]}
          />
        </div>
        {activeTab === 'Sent' && (
          <button 
            onClick={() => setIsWorkflowOpen(true)}
            className="flex items-center justify-center gap-3 px-8 py-3.5 bg-[#FED400] text-[#004A74] rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 transition-all w-full md:w-auto"
          >
            <ShareIcon className="w-4 h-4 stroke-[3]" /> Share New Knowledge
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : filteredItems.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-20 grayscale">
             <InboxIcon className="w-20 h-20 text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">No activity found in your {activeTab}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col h-full ${activeTab === 'Inbox' && !item.isRead ? 'ring-2 ring-blue-500/20' : ''}`}
              >
                {activeTab === 'Inbox' && !item.isRead && (
                   <span className="absolute top-6 right-6 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                )}

                <div className="mb-6 flex items-center gap-3">
                   <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm bg-white shrink-0">
                      <img 
                        src={(activeTab === 'Inbox' ? item.senderPhotoUrl : item.receiverPhotoUrl) || BRAND_ASSETS.USER_DEFAULT} 
                        className="w-full h-full object-cover" 
                        alt="Profile" 
                      />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{activeTab === 'Inbox' ? 'SENDER' : 'RECIPIENT'}</p>
                      <h4 className="text-xs font-bold text-[#004A74] truncate uppercase">{activeTab === 'Inbox' ? item.senderName : item.receiverName}</h4>
                   </div>
                </div>

                <div className="flex-1 space-y-4">
                   <div className="space-y-1">
                      <h3 className="text-sm font-black text-[#004A74] uppercase leading-tight line-clamp-2">{item.title}</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{item.topic} • {item.year}</p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
                      <ChatBubbleBottomCenterTextIcon className="absolute -top-2 -left-2 w-6 h-6 text-[#FED400]/20" />
                      <p className="text-[10px] text-gray-500 italic font-medium line-clamp-2">"{item.message || 'No message provided.'}"</p>
                   </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-gray-400">
                      <ClockIcon className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{formatTimestamp(item.timestamp)}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${item.status === 'CLAIMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {item.status}
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-[#FED400] transition-colors" />
                   </div>
                </div>

                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="absolute bottom-4 left-6 p-2 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                   <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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

export default SharboxMain;