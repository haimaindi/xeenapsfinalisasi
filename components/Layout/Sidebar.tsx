
import React, { useState, useEffect } from 'react';
// @ts-ignore - Resolving TS error for missing exported members
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Star, 
  Bookmark, 
  Search,
  Key,
  ChevronDown,
  Presentation,
  Target,
  Inbox,
  LayoutGrid,
  Handshake,
  LibraryBig,
  FileSearch,
  TextSearch,
  BrainCog,
  BookUp,
  Grip,
  Footprints,
  ListTodo,
  NotebookPen,
  CircleUserRound,
  BookOpen,
  Users,
  FileUser,
  Award,
  Youtube,
  FileText,
  Book
} from 'lucide-react';
import { BRAND_ASSETS, SPREADSHEET_CONFIG } from '../../assets';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [researchMenuOpen, setResearchMenuOpen] = useState(false);
  const [findLiteratureMenuOpen, setFindLiteratureMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItemsBlock1 = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Collaboration', path: '#', icon: Handshake, inactive: true },
    { name: 'Library', path: '/', icon: LibraryBig },
    { name: 'Favorite', path: '/favorite', icon: Star },
    { name: 'Bookmark', path: '/bookmark', icon: Bookmark },
  ];

  const navItemsBlock2 = [
    { name: 'Teaching', path: '/teaching', icon: Grip },
    { name: 'Activities', path: '/activities', icon: Award },
    { name: 'Presentation', path: '/presentations', icon: Presentation },
    { name: 'Question Bank', path: '/questions', icon: ListTodo },
    { name: 'Notebook', path: '/notebook', icon: NotebookPen },
    { name: 'Sharebox', path: '/sharbox', icon: Inbox },
    { name: 'Colleague', path: '/colleagues', icon: Users },
    { name: 'CV Generator', path: '/cv-architect', icon: FileUser },
    { name: 'Profile', path: '/profile', icon: CircleUserRound },
    { name: 'Tutorial', path: '#', icon: Youtube, inactive: false, isExternal: true },
  ];

  const isExpanded = isHoverExpanded || isMobileOpen;

  useEffect(() => {
    const updateOffset = () => {
      const isDesktop = window.innerWidth >= 1024;
      const offset = isDesktop ? (isExpanded ? '224px' : '64px') : '0px';
      document.documentElement.style.setProperty('--sidebar-offset', offset);
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [isExpanded]);

  const sidebarStyle: React.CSSProperties = {
    background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 25%, #004A74 100%)',
  };

  const handleExploreClick = async () => {
    if (await checkLock()) return;
    const spreadsheetUrl = SPREADSHEET_CONFIG.EXPLORE_MAINDI_CSV;
    if (onMobileClose) onMobileClose(); 
    const newWindow = window.open('about:blank', '_blank');
    setTimeout(async () => {
      try {
        const response = await fetch(spreadsheetUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvData = await response.text();
        const firstLine = csvData.split('\n')[0];
        const targetLink = firstLine.split(',')[0].replace(/"/g, '').trim();
        const finalLink = (targetLink && targetLink.startsWith('http')) ? targetLink : SPREADSHEET_CONFIG.EXPLORE_MAINDI_FALLBACK;
        if (newWindow) newWindow.location.href = finalLink;
        else window.open(finalLink, '_blank', 'noopener,noreferrer');
      } catch (e) {
        const fallback = SPREADSHEET_CONFIG.EXPLORE_MAINDI_FALLBACK;
        if (newWindow) newWindow.location.href = fallback;
        else window.open(fallback, '_blank', 'noopener,noreferrer');
      }
    }, 0);
  };

  const checkLock = async () => {
    const isDirty = (window as any).xeenaps_is_dirty;
    const isBusy = (window as any).xeenaps_is_busy;
    if (isDirty || isBusy) {
      const conf = await Swal.fire({
        title: 'UNSAVED CHANGES',
        text: 'System is currently synchronizing data. Leaving now might cause data loss. Proceed anyway?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'EXIT',
        cancelButtonText: 'STAY',
        ...XEENAPS_SWAL_CONFIG
      });
      return !conf.isConfirmed;
    }
    return false;
  };

  const handleNavClick = async (e: React.MouseEvent, path: string) => {
    if (path === location.pathname) {
       if (onMobileClose) onMobileClose();
       return;
    }
    e.preventDefault();
    if (await checkLock()) return;
    if (onMobileClose) onMobileClose();
    navigate(path);
  };

  return (
    <aside 
      className={`fixed lg:sticky top-0 left-0 h-[100dvh] flex flex-col z-[100] transition-all duration-500 ease-in-out rounded-r-[1.5rem] lg:rounded-r-[2rem] shadow-[8px_0_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden ${
        isExpanded ? 'w-52 md:w-56' : 'w-0 lg:w-16'
      } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={sidebarStyle}
      onMouseEnter={() => setIsHoverExpanded(true)}
      onMouseLeave={() => {
        setIsHoverExpanded(false);
        setSettingsMenuOpen(false);
        setResearchMenuOpen(false);
        setFindLiteratureMenuOpen(false);
      }}
    >
      <div className="relative h-20 lg:h-24 flex items-center justify-center overflow-hidden shrink-0">
        <div className={`absolute transition-all duration-700 ease-in-out transform ${isExpanded ? 'opacity-0 -translate-x-12 -rotate-180 pointer-events-none' : 'opacity-100 translate-x-0 rotate-0'}`}>
          <img src={BRAND_ASSETS.LOGO_ICON} className="w-8 lg:w-10 h-8 lg:h-10 object-contain" alt="Xeenaps Icon" />
        </div>
        <div className={`absolute inset-0 flex items-center justify-center p-10 lg:p-12 transition-all duration-700 ease-in-out transform ${isExpanded ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-12 scale-90 pointer-events-none'}`}>
          <img src={BRAND_ASSETS.LOGO_FULL} className="w-full h-auto object-contain" alt="Xeenaps Full" />
        </div>
      </div>

      <nav className="flex-1 mt-4 lg:mt-6 px-2 space-y-1 lg:space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navItemsBlock1.map((item) => {
          const isActive = location.pathname === item.path;
          if ((item as any).inactive) {
            return (
              <div key={item.name} className="relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 overflow-hidden text-black/30 cursor-not-allowed" title="Coming Soon">
                <div className="shrink-0 flex items-center justify-center w-7 md:w-8"><item.icon size={18} strokeWidth={2} className="lg:w-5 lg:h-5" /></div>
                <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">{item.name}</span></div>
              </div>
            );
          }
          return (
            <button
              key={item.name}
              onClick={(e) => handleNavClick(e, item.path)}
              className={`relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 overflow-hidden ${isActive ? 'bg-[#FED400] text-black shadow-md' : 'text-black hover:bg-[#FED400]/5 hover:text-black'}`}
            >
              <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="lg:w-5 lg:h-5" /></div>
              <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">{item.name}</span></div>
            </button>
          );
        })}

        <div className="relative" onMouseEnter={() => isExpanded && setFindLiteratureMenuOpen(true)}>
          <button onClick={() => isExpanded && setFindLiteratureMenuOpen(!findLiteratureMenuOpen)} className={`w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 ${findLiteratureMenuOpen || location.pathname === '/find-article' || location.pathname === '/find-book' ? 'bg-[#FED400]/10 text-black' : 'text-black hover:bg-[#FED400]/5 hover:text-black'}`}>
            <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><FileSearch size={18} strokeWidth={location.pathname === '/find-article' || location.pathname === '/find-book' ? 2.5 : 2} className="lg:w-5 lg:h-5" /></div>
            <div className={`flex-1 ml-2 flex items-center justify-between overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">Find Literature</span><ChevronDown size={14} className={`transition-transform duration-300 ${findLiteratureMenuOpen ? 'rotate-180' : ''}`} /></div>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out space-y-1 mt-1 ${findLiteratureMenuOpen && isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
            <button onClick={(e) => handleNavClick(e, '/find-article')} className={`w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg transition-all text-xs md:text-sm font-medium ${location.pathname === '/find-article' ? 'text-black bg-[#FED400]/10 font-bold' : 'text-black hover:text-black hover:bg-[#FED400]/5'}`}><FileText size={14} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Article</span></button>
            <button onClick={(e) => handleNavClick(e, '/find-book')} className={`w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg transition-all text-xs md:text-sm font-medium ${location.pathname === '/find-book' ? 'text-black bg-[#FED400]/10 font-bold' : 'text-black hover:text-black hover:bg-[#FED400]/5'}`}><Book size={14} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Book</span></button>
          </div>
        </div>

        <button onClick={(e) => handleNavClick(e, '/research/literature-review')} className={`relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 overflow-hidden ${location.pathname === '/research/literature-review' ? 'bg-[#FED400] text-black shadow-md' : 'text-black hover:bg-[#FED400]/5 hover:text-black'}`}>
          <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><BookOpen size={18} strokeWidth={location.pathname === '/research/literature-review' ? 2.5 : 2} className="lg:w-5 lg:h-5" /></div>
          <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">Literature Review</span></div>
        </button>

        <div className="relative" onMouseEnter={() => isExpanded && setResearchMenuOpen(true)}>
          <button onClick={() => isExpanded && setResearchMenuOpen(!researchMenuOpen)} className={`w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 ${researchMenuOpen || (location.pathname.startsWith('/research') && location.pathname !== '/research/literature-review') ? 'bg-[#FED400]/10 text-black' : 'text-black hover:bg-[#FED400]/5 hover:text-black'}`}>
            <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><Search size={18} strokeWidth={location.pathname.startsWith('/research') && location.pathname !== '/research/literature-review' ? 2.5 : 2} className="lg:w-5 lg:h-5" /></div>
            <div className={`flex-1 ml-2 flex items-center justify-between overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">Research</span><ChevronDown size={14} className={`transition-transform duration-300 ${researchMenuOpen ? 'rotate-180' : ''}`} /></div>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out space-y-1 mt-1 ${researchMenuOpen && isExpanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
            <button onClick={(e) => handleNavClick(e, '/research')} className={`w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg transition-all text-xs md:text-sm font-medium ${location.pathname === '/research' ? 'text-black bg-[#FED400]/10 font-bold' : 'text-black hover:text-black hover:bg-[#FED400]/5'}`}><TextSearch size={14} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Gap Finder</span></button>
            <button onClick={(e) => handleNavClick(e, '/research/brainstorming')} className={`w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg transition-all text-xs md:text-sm font-medium ${location.pathname === '/research/brainstorming' ? 'text-black bg-[#FED400]/10 font-bold' : 'text-black hover:text-black hover:bg-[#FED400]/5'}`}><BrainCog size={14} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Brainstorming</span></button>
            <button onClick={(e) => handleNavClick(e, '/research/tracer')} className={`w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg transition-all text-xs md:text-sm font-medium ${location.pathname.startsWith('/research/tracer') ? 'text-black bg-[#FED400]/10 font-bold' : 'text-black hover:text-black hover:bg-[#FED400]/5'}`}><Target size={14} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Tracer</span></button>
            <button onClick={(e) => handleNavClick(e, '/research/publication')} className={`w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg transition-all text-xs md:text-sm font-medium ${location.pathname === '/research/publication' ? 'text-black bg-[#FED400]/10 font-bold' : 'text-black hover:text-black hover:bg-[#FED400]/5'}`}><BookUp size={14} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Publication</span></button>
          </div>
        </div>

        {navItemsBlock2.map((item) => {
          const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
          if ((item as any).inactive) {
            return (
              <div key={item.name} className="relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 overflow-hidden text-black/30 cursor-not-allowed" title="Coming Soon">
                <div className="shrink-0 flex items-center justify-center w-7 md:w-8"><item.icon size={18} strokeWidth={2} className="lg:w-5 lg:h-5" /></div>
                <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">{item.name}</span></div>
              </div>
            );
          }
          if ((item as any).isExternal) {
            return (
              <button key={item.name} onClick={async () => { if (await checkLock()) return; if (onMobileClose) onMobileClose(); const res = await fetch(SPREADSHEET_CONFIG.TUTORIAL_CSV); const csv = await res.text(); const link = csv.split('\n')[0].split(',')[0].replace(/"/g, '').trim(); if (link.startsWith('http')) window.open(link, '_blank', 'noopener,noreferrer'); }} className="relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 overflow-hidden text-black hover:bg-[#FED400]/5 hover:text-black">
                <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><item.icon size={18} strokeWidth={2} className="lg:w-5 lg:h-5" /></div>
                <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">{item.name}</span></div>
              </button>
            );
          }
          return (
            <button key={item.name} onClick={(e) => handleNavClick(e, item.path)} className={`relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 overflow-hidden ${isActive ? 'bg-[#FED400] text-black shadow-md' : 'text-black hover:bg-[#FED400]/5 hover:text-black'}`}>
              <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="lg:w-5 lg:h-5" /></div>
              <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">{item.name}</span></div>
            </button>
          );
        })}

        <div className="relative pt-1 lg:pt-2" onMouseEnter={() => isExpanded && setSettingsMenuOpen(true)}>
          <button onClick={() => isExpanded && setSettingsMenuOpen(!settingsMenuOpen)} className={`w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 ${settingsMenuOpen ? 'bg-[#FED400] text-black shadow-md' : 'text-black hover:bg-[#FED400]/5 hover:text-black'}`}>
            <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:rotate-45 transition-transform duration-500"><Settings size={18} className="lg:w-5 lg:h-5" /></div>
            <div className={`flex-1 ml-2 flex items-center justify-between overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-semibold whitespace-nowrap">Setting</span><ChevronDown size={14} className={`transition-transform duration-300 ${settingsMenuOpen ? 'rotate-180' : ''}`} /></div>
          </button>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out space-y-1 mt-1 ${settingsMenuOpen && isExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
            <button onClick={(e) => handleNavClick(e, '/settings')} className="w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg text-black hover:text-black hover:bg-[#FED400]/5 transition-all text-xs md:text-sm font-medium"><Settings size={16} className="mr-2 shrink-0" /><span className="whitespace-nowrap">Configuration</span></button>
            <button onClick={async () => { if (await checkLock()) return; if (onMobileClose) onMobileClose(); if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey(); }} className="w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg text-black hover:text-black hover:bg-[#FED400]/5 transition-all text-xs md:text-sm font-medium text-left"><Key size={16} className="mr-2 shrink-0" /><span className="whitespace-nowrap">AI Key</span></button>
          </div>
        </div>
      </nav>

      <div className="shrink-0 flex flex-col">
        <div className="border-t border-white/20 mx-4" />
        <div className="px-2 pt-2 mb-4 lg:mb-6 space-y-0.5">
          <button onClick={handleExploreClick} className="w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 text-white/90 hover:bg-white/10 hover:text-[#FED400] outline-none">
            <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300"><img src={BRAND_ASSETS.MAINDI_LOGO} className="w-5 lg:w-6 h-5 lg:h-6 object-contain" alt="Maindi" /></div>
            <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}><span className="text-xs md:text-sm font-bold whitespace-nowrap">Explore Maindi</span></div>
          </button>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }`}</style>
    </aside>
  );
};

export default Sidebar;
