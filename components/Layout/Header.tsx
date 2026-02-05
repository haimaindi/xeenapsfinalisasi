
import React, { useState, useEffect, useRef } from 'react';
import { ArrowPathIcon, BellIcon, InboxIcon, CheckCircleIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Target } from 'lucide-react';
// @ts-ignore
import { useLocation, useNavigate } from 'react-router-dom';
import { BRAND_ASSETS } from '../../assets';
import { fetchUserProfile } from '../../services/ProfileService';
import { fetchNotifications, NotificationData, getUrgencyColor, getUrgencyLabel } from '../../services/NotificationService';
import { SharboxItem, TracerTodo } from '../../types';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefresh?: () => Promise<void>;
}

let profileCache = {
  name: "",
  photo: "",
  isLoaded: false
};

const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery, onRefresh }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!profileCache.isLoaded);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData>({ sharbox: [], todos: [] });
  const notifRef = useRef<HTMLDivElement>(null);
  
  const [userProfile, setUserProfile] = useState<{name: string, photo: string}>({
    name: profileCache.name || "Xeenaps User",
    photo: profileCache.photo || BRAND_ASSETS.USER_DEFAULT
  });

  const extractCleanName = (fullName: string): string => {
    if (!fullName) return "Xeenaps User";
    let name = fullName.split(',')[0].trim();
    name = name.replace(/^([A-Za-z]+\.\s*)+/i, '').trim();
    return name || "Xeenaps User";
  };

  const loadProfile = async (forceRefresh = false) => {
    if (profileCache.isLoaded && !forceRefresh) {
      setIsInitialLoading(false);
      return;
    }
    const profile = await fetchUserProfile();
    if (profile) {
      const displayName = extractCleanName(profile.fullName);
      const displayPhoto = profile.photoUrl || BRAND_ASSETS.USER_DEFAULT;
      profileCache = { name: displayName, photo: displayPhoto, isLoaded: true };
      setUserProfile({ name: displayName, photo: displayPhoto });
    }
    setIsInitialLoading(false);
  };

  const loadNotifications = async () => {
    const data = await fetchNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    loadProfile();
    loadNotifications();
    
    const interval = setInterval(loadNotifications, 60000 * 5);

    const handleProfileUpdate = (e: any) => {
      const profileData = e.detail;
      if (!profileData) return;
      const newName = extractCleanName(profileData.fullName || "");
      const newPhoto = profileData.photoUrl || BRAND_ASSETS.USER_DEFAULT;
      profileCache = { ...profileCache, name: newName, photo: newPhoto };
      setUserProfile({ name: newName, photo: newPhoto });
    };

    const handleInstantPhoto = (e: any) => {
      const newPhoto = e.detail || BRAND_ASSETS.USER_DEFAULT;
      profileCache.photo = newPhoto;
      setUserProfile(prev => ({ ...prev, photo: newPhoto }));
    };

    const handleRefreshSignal = () => {
      loadNotifications();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };

    window.addEventListener('xeenaps-profile-updated', handleProfileUpdate);
    window.addEventListener('xeenaps-instant-photo', handleInstantPhoto);
    window.addEventListener('xeenaps-notif-refresh', handleRefreshSignal);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('xeenaps-profile-updated', handleProfileUpdate);
      window.removeEventListener('xeenaps-instant-photo', handleInstantPhoto);
      window.removeEventListener('xeenaps-notif-refresh', handleRefreshSignal);
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const handleRefreshClick = async () => {
    const isDirty = (window as any).xeenaps_is_dirty;
    const isBusy = (window as any).xeenaps_is_busy;
    if (isDirty || isBusy) {
      const conf = await Swal.fire({
        title: 'SYNC IN PROGRESS',
        text: 'Refreshing now might interrupt data transmission to Cloud Registry. Proceed anyway?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'REFRESH',
        cancelButtonText: 'WAIT',
        ...XEENAPS_SWAL_CONFIG
      });
      if (!conf.isConfirmed) return;
    }
    window.location.reload();
  };

  const handleInboxClick = (item: SharboxItem) => {
    setIsNotifOpen(false);
    navigate('/sharbox', { state: { openItemId: item.id } });
  };

  const handleTodoClick = (todo: TracerTodo) => {
    setIsNotifOpen(false);
    navigate(`/research/tracer/${todo.projectId}`, { state: { activeTab: 'todo' } });
  };

  const totalNotifCount = notifications.sharbox.length + notifications.todos.length;
  const placeholderUrl = BRAND_ASSETS.USER_DEFAULT;

  return (
    <header className="sticky top-0 z-[100] w-full py-4 lg:py-6 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-gray-100/50 px-1">
      <style>{`
        @keyframes refresh-glow { 0% { color: #ef4444; } 50% { color: #fbbf24; } 100% { color: #ef4444; } }
        .refresh-loading { animation: spin 1s linear infinite, refresh-glow 2s ease-in-out infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .notif-scroll::-webkit-scrollbar { width: 3px; } .notif-scroll::-webkit-scrollbar-track { background: transparent; } .notif-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>

      <div className="flex flex-col min-w-0">
        <span className="text-[9px] md:text-[11px] uppercase font-normal tracking-[0.2em] text-[#004A74] opacity-90">WELCOME,</span>
        {isInitialLoading ? <div className="h-8 w-48 skeleton rounded-lg mt-1" /> : <h1 className="text-xl md:text-3xl font-bold text-[#004A74] leading-tight truncate pr-4">{userProfile.name}!</h1>}
      </div>

      <div className="flex items-center gap-1 md:gap-3 shrink-0">
        <button onClick={handleRefreshClick} disabled={isRefreshing} className="p-2 text-[#004A74] hover:bg-gray-50 rounded-full transition-all duration-300 outline-none group" title="Refresh Data">
          <ArrowPathIcon className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-500 ${isRefreshing ? 'refresh-loading' : 'group-active:scale-90'}`} />
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-2 text-[#004A74] hover:bg-gray-50 rounded-full transition-all duration-300 relative group ${isNotifOpen ? 'bg-gray-100' : ''}`} title="Notifications">
            <BellIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            {totalNotifCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">{totalNotifCount > 9 ? '9+' : totalNotifCount}</span>}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[280px] md:w-[340px] bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <h3 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">Notification</h3>
                 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{totalNotifCount} Alerts</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto notif-scroll">
                {totalNotifCount === 0 ? <div className="py-12 text-center opacity-30 flex flex-col items-center"><CheckCircleIcon className="w-10 h-10 mb-3 text-[#004A74]" /><p className="text-[9px] font-black uppercase tracking-widest">System Stable</p></div> : (
                  <div className="flex flex-col divide-y divide-gray-50">
                    {notifications.sharbox.length > 0 && (
                      <div className="flex flex-col">
                        <div className="px-5 py-2 bg-blue-50/50"><span className="text-[7px] font-black text-[#004A74] uppercase tracking-widest">Unread Inbox</span></div>
                        {notifications.sharbox.map(item => (
                          <button key={item.id} onClick={() => handleInboxClick(item)} className="w-full p-4 flex items-start gap-3 hover:bg-[#FED400]/5 transition-all text-left group">
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 shrink-0 bg-white"><img src={item.senderPhotoUrl || BRAND_ASSETS.USER_DEFAULT} className="w-full h-full object-cover" /></div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[9px] font-bold text-[#004A74] truncate group-hover:text-blue-600 transition-colors uppercase leading-tight">{item.title}</p>
                               <p className="text-[8px] text-gray-400 truncate mt-0.5">From: {item.senderName}</p>
                               <div className="flex items-center gap-1.5 mt-1.5 opacity-50"><InboxIcon className="w-2.5 h-2.5" /><span className="text-[6px] font-black uppercase tracking-widest">UNREAD</span></div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {notifications.todos.length > 0 && (
                      <div className="flex flex-col">
                        <div className="px-5 py-2 bg-orange-50/50"><span className="text-[7px] font-black text-[#004A74] uppercase tracking-widest">To Do</span></div>
                        {notifications.todos.map(todo => {
                          const uColor = getUrgencyColor(todo);
                          const uLabel = getUrgencyLabel(todo);
                          return (
                            <button key={todo.id} onClick={() => handleTodoClick(todo)} className="w-full p-4 flex items-start gap-3 hover:bg-red-50/30 transition-all text-left group">
                              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-[#004A74] shrink-0 border border-gray-100 group-hover:bg-white transition-all"><ClockIcon className={`w-4 h-4 ${uColor}`} /></div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-bold text-[#004A74] truncate uppercase leading-tight group-hover:text-red-500 transition-colors">{todo.title}</p><span className={`shrink-0 text-[6px] font-black uppercase tracking-tighter ${uColor}`}>{uLabel}</span></div>
                                 <p className="text-[8px] text-gray-400 line-clamp-1 mt-0.5">{todo.description || 'Action required.'}</p>
                                 <div className="flex items-center gap-1.5 mt-1.5 opacity-50"><Target className="w-2.5 h-2.5 text-red-400" /><span className="text-[6px] font-black uppercase tracking-widest">PENDING TASK</span></div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => navigate('/profile')} className="flex items-center focus:outline-none p-1 relative group"><div className="relative"><div className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-[#FED400] p-0.5 group-hover:border-[#004A74] transition-colors duration-300 overflow-hidden shadow-sm bg-white"><img src={userProfile.photo || placeholderUrl} alt="User Profile" className="w-full h-full object-cover rounded-full bg-gray-50 group-hover:scale-110 transition-transform duration-500" /></div><span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FED400] rounded-full border-2 border-white shadow-sm scale-90"></span></div></button>
      </div>
    </header>
  );
};

export default Header;
