import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
// Fix: Added missing SupportingData import from types to resolve the error on line 413
import { LibraryItem, PubInfo, Identifiers, SupportingData } from '../../types';
import { 
  XMarkIcon, 
  ArrowLeftIcon,
  EyeIcon,
  BookmarkIcon,
  StarIcon,
  EllipsisVerticalIcon,
  PresentationChartBarIcon,
  ClipboardDocumentListIcon,
  ChatBubbleBottomCenterTextIcon,
  ShareIcon,
  AcademicCapIcon,
  LinkIcon,
  VideoCameraIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  HashtagIcon,
  TagIcon,
  BeakerIcon,
  ClockIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  LanguageIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';
import { 
  StickyNote, 
  Share2, 
  Target, 
  BookOpenCheck,
  Presentation,
  ListTodo,
  NotebookPen,
  Grip
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { saveLibraryItem, deleteLibraryItem, generateCitations, generateInsight, fetchFileContent, translateInsightSection } from '../../services/gasService';
import { FormDropdown } from '../Common/FormComponents';
import Header from '../Layout/Header';
import RelatedPresentations from '../Presenter/RelatedPresentations';
import RelatedQuestion from '../QuestionBank/RelatedQuestion';
import ConsultationGallery from '../Consultation/ConsultationGallery';
import NotebookMain from '../Notebook/NotebookMain';
import SharboxWorkflowModal from '../Sharbox/SharboxWorkflowModal';
import TracerProjectPicker from '../Research/Tracer/TracerProjectPicker';
import TeachingSessionPicker from '../Teaching/TeachingSessionPicker';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
  isLoading?: boolean;
  isMobileSidebarOpen?: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateOptimistic?: (updatedItem: LibraryItem) => void;
  onDeleteOptimistic?: (id: string) => void;
  isLocalOverlay?: boolean;
}

/**
 * Tooltip Component for Premium Hover Effect
 */
const MiniTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-[100]">
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#004A74]"></div>
  </div>
);

/**
 * Citation Modal Component
 */
const CitationModal: React.FC<{ 
  item: LibraryItem; 
  onClose: () => void 
}> = ({ item, onClose }) => {
  const [style, setStyle] = useState('Harvard');
  const [language, setLanguage] = useState('English');
  const [results, setResults] = useState<{ parenthetical: string; narrative: string; bibliography: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Editable states
  const [editableParenthetical, setEditableParenthetical] = useState('');
  const [editableNarrative, setEditableNarrative] = useState('');
  const [editableBibliography, setEditableBibliography] = useState('');

  const styles = ['Harvard', 'APA 7th Edition', 'IEEE', 'Chicago', 'Vancouver', 'MLA 9th Edition'];
  const languages = ['English', 'Indonesian', 'French', 'German', 'Dutch'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    const data = await generateCitations(item, style, language);
    if (data) {
      setResults(data);
      setEditableParenthetical(data.parenthetical);
      setEditableNarrative(data.narrative);
      setEditableBibliography(data.bibliography);
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Citation Copied!');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative border border-white/20 flex flex-col max-h-[85vh] min-h-[450px] md:min-h-[580px]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <AcademicCapIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Citation Generator</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Premium Academic Standards</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          {/* Configuration Grid using Xeenaps FormDropdown (Search disabled for fixed options) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Citation Style</label>
              <FormDropdown 
                value={style} 
                onChange={(v) => setStyle(v)} 
                options={styles} 
                placeholder="Select style..."
                allowCustom={false}
                showSearch={false}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Language</label>
              <FormDropdown 
                value={language} 
                onChange={(v) => setLanguage(v)} 
                options={languages} 
                placeholder="Select language..."
                allowCustom={false}
                showSearch={false}
                disabled={isGenerating}
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#004A74]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
            {isGenerating ? 'Processing...' : 'Cite Now'}
          </button>

          {/* Results Section */}
          {results && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 pb-4">
              <div className="h-px bg-gray-100 w-full" />
              
              {/* In-Text Parenthetical */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In-Text (Parenthetical)</span>
                  <button onClick={() => copyToClipboard(editableParenthetical)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableParenthetical}
                  onChange={(e) => setEditableParenthetical(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]"
                />
              </div>

              {/* In-Text Narrative */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Narrative Citation</span>
                  <button onClick={() => copyToClipboard(editableNarrative)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableNarrative}
                  onChange={(e) => setEditableNarrative(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]"
                />
              </div>

              {/* Bibliography */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bibliographic Citation</span>
                  <button onClick={() => copyToClipboard(editableBibliography)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableBibliography}
                  onChange={(e) => setEditableBibliography(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[100px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to safely format dates from ISO or raw strings.
 */
const formatDate = (dateStr: any) => {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Unknown') return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      if (/^\d{4}$/.test(String(dateStr).trim())) return dateStr;
      return null;
    }
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    if (String(dateStr).includes('T00:00:00') || String(dateStr).length < 10) return year.toString();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
};

/**
 * Helper to format creation/update time in "DD Mmm YYYY hh:mm"
 */
const formatTimeMeta = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch {
    return "-";
  }
};

/**
 * Helper to parse dynamic JSON fields
 */
const parseJsonField = (field: any, defaultValue: any = {}) => {
  if (!field) return defaultValue;
  if (typeof field === 'object' && !Array.isArray(field)) return field;
  try {
    const parsed = typeof field === 'string' ? JSON.parse(field) : field;
    return parsed || defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Enhanced List Component with Primary Circle and Yellow Text
 * MODIFIED: Supports Narrative HTML blocks without numeric markers if complex tags are detected.
 */
const ElegantList: React.FC<{ text?: any; className?: string; isLoading?: boolean }> = ({ text, className = "", isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-6 h-6 rounded-full skeleton shrink-0" />
            <div className="h-4 w-full skeleton rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (text === null || text === undefined || text === 'N/A') return null;
  
  // NARRATIVE DETECTION: If text contains specific HTML highlight tags or is very long narrative
  const isNarrative = typeof text === 'string' && (text.includes('<span') || text.includes('<b') || text.length > 500);

  if (isNarrative) {
    return (
      <div 
        className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} 
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }

  let items: string[] = [];
  if (Array.isArray(text)) {
    items = text.map(i => String(i).trim()).filter(Boolean);
  } else if (typeof text === 'string') {
    const trimmedText = text.trim();
    if (trimmedText === '') return null;
    items = trimmedText.split(/\n|(?=\d+\.)|(?=•)/)
      .map(i => i.replace(/^\d+\.\s*|•\s*/, '').trim())
      .filter(Boolean);
  } else {
    const strVal = String(text).trim();
    if (strVal === '') return null;
    items = [strVal];
  }

  if (items.length === 0) return null;

  if (items.length === 1 && typeof text === 'string' && !text.match(/\n|(?=\d+\.)|(?=•)/)) {
    return (
      <div className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} dangerouslySetInnerHTML={{ __html: text }} />
    );
  }

  return (
    <ol className={`space-y-3 list-none ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 items-start group">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">
            {idx + 1}
          </span>
          <span className="text-sm text-[#004A74]/90 leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
};

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose, isLoading, isMobileSidebarOpen, onRefresh, onUpdateOptimistic, onDeleteOptimistic, isLocalOverlay }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [showPresentations, setShowPresentations] = useState(false); 
  const [showQuestions, setShowQuestions] = useState(false); 
  const [showConsultations, setShowConsultations] = useState(false); 
  const [showNotebook, setShowNotebook] = useState(false); 
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); 
  const [isTracerPickerOpen, setIsTracerPickerOpen] = useState(false);
  const [isTeachingPickerOpen, setIsTeachingPickerOpen] = useState(false);
  const [dummySearch, setDummySearch] = useState('');
  
  const [isBookmarked, setIsBookmarked] = useState(!!item.isBookmarked);
  const [isFavorite, setIsFavorite] = useState(!!item.isFavorite);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isFetchingStoredInsights, setIsFetchingStoredInsights] = useState(false);

  // New state for section-specific translation
  const [translatingSection, setTranslatingSection] = useState<string | null>(null);
  const [openTranslationMenu, setOpenTranslationMenu] = useState<string | null>(null);

  const [currentItem, setCurrentItem] = useState(item);

  // MOUNT-TIME STATE MEMORY: Mengunci status awal pembukaan (PENTING!)
  // Gunakan Ref agar nilainya tidak berubah saat parent membersihkan location.state
  const wasOpenedViaExternalRef = useRef(!!(location.state as any)?.openItem);

  useEffect(() => {
    const loadJsonInsights = async () => {
      if (item.insightJsonId) {
        setIsFetchingStoredInsights(true);
        const jsonInsights = await fetchFileContent(item.insightJsonId, item.storageNodeUrl);
        if (jsonInsights && Object.keys(jsonInsights).length > 0) {
          setCurrentItem(prev => ({
            ...prev,
            ...jsonInsights
          }));
        }
        setIsFetchingStoredInsights(false);
      }
    };
    
    setCurrentItem(item);
    loadJsonInsights();
  }, [item]);

  const pubInfo: PubInfo = useMemo(() => parseJsonField(currentItem.pubInfo), [currentItem.pubInfo]);
  const identifiers: Identifiers = useMemo(() => parseJsonField(currentItem.identifiers), [currentItem.identifiers]);
  const tags = useMemo(() => parseJsonField(currentItem.tags, { keywords: [], labels: [] }), [currentItem.tags]);
  const supportingData: SupportingData = useMemo(() => parseJsonField(currentItem.supportingReferences, { references: [], videoUrl: null }), [currentItem.supportingReferences]);
  
  const displayDate = formatDate(currentItem.fullDate || currentItem.year);
  const authorsText = Array.isArray(currentItem.authors) ? currentItem.authors.join(', ') : (currentItem.authors || 'Unknown');

  const LANG_OPTIONS = [
    { label: "English", code: "en" },
    { label: "Indonesian", code: "id" },
    { label: "Portuguese", code: "pt" },
    { label: "Spanish", code: "es" },
    { label: "German", code: "de" },
    { label: "French", code: "fr" },
    { label: "Dutch", code: "nl" },
    { label: "Mandarin", code: "zh" },
    { label: "Japanese", code: "ja" },
    { label: "Vietnamese", code: "vi" },
    { label: "Thai", code: "th" },
    { label: "Hindi", code: "hi" },
    { label: "Turkish", code: "tr" },
    { label: "Russian", code: "ru" },
    { label: "Arabic", code: "ar" }
  ];

  const handleOpenLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Reference Copied!');
  };

  const handleToggleAction = async (property: 'isBookmarked' | 'isFavorite') => {
    const newValue = property === 'isBookmarked' ? !isBookmarked : !isFavorite;
    
    if (property === 'isBookmarked') setIsBookmarked(newValue);
    else setIsFavorite(newValue);
    
    const updatedItem = { ...currentItem, [property]: newValue };
    
    if (onUpdateOptimistic) {
      onUpdateOptimistic(updatedItem);
    }

    try {
      await saveLibraryItem(updatedItem);
    } catch (e) {
      if (property === 'isBookmarked') setIsBookmarked(!newValue);
      else setIsFavorite(!newValue);
      if (onUpdateOptimistic) onUpdateOptimistic(item);
      showXeenapsToast('error', 'Failed to sync with server');
    }
  };

  const handleGenerateInsights = async () => {
    if (isGeneratingInsights || isFetchingStoredInsights) return;
    setIsGeneratingInsights(true);
    showXeenapsToast('info', 'AI Insighter is analyzing content...');

    try {
      const data = await generateInsight(currentItem);
      if (data) {
        const updated = {
          ...currentItem,
          researchMethodology: data.researchMethodology,
          summary: data.summary,
          strength: data.strength,
          weakness: data.weakness,
          unfamiliarTerminology: data.unfamiliarTerminology,
          quickTipsForYou: data.quickTipsForYou,
          updatedAt: new Date().toISOString()
        };
        setCurrentItem(updated);
        showXeenapsToast('success', 'Deep Insights Generated!');
      } else {
        showXeenapsToast('error', 'Analysis failed on server');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error during analysis');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleTranslateSection = async (sectionName: string, langCode: string) => {
    if (translatingSection) return;
    setTranslatingSection(sectionName);
    setOpenTranslationMenu(null);
    showXeenapsToast('info', 'Translating content...');

    try {
      const translated = await translateInsightSection(currentItem, sectionName, langCode);
      if (translated) {
        setCurrentItem(prev => ({
          ...prev,
          [sectionName]: translated
        }));
        showXeenapsToast('success', 'Translation successful!');
      } else {
        showXeenapsToast('error', 'Translation service error');
      }
    } catch (e) {
      showXeenapsToast('error', 'Translation failed');
    } finally {
      setTranslatingSection(null);
    }
  };

  const handleViewCollection = () => {
    let targetUrl = '';
    if (currentItem.fileId) {
      targetUrl = `https://drive.google.com/file/d/${currentItem.fileId}/view`;
    } else if (currentItem.url) {
      targetUrl = currentItem.url;
    }
    
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUpdate = () => {
    navigate(`/edit/${currentItem.id}`);
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      if (onDeleteOptimistic) {
        onDeleteOptimistic(currentItem.id);
      }
      onClose();
      navigate('/');
      showXeenapsToast('success', 'Processing Deletion...');

      try {
        await deleteLibraryItem(currentItem.id);
      } catch (e) {
        showXeenapsToast('error', 'Critical Error: Deletion failed on server');
        if (onRefresh) onRefresh();
      }
    }
  };

  // SMART REFERRER-AWARE BACK LOGIC
  const handleBack = () => {
    // 1. Jika mode overlay lokal eksplisit (misal dari Matrix), tutup tanpa sentuh history
    if (isLocalOverlay) {
      onClose();
      return;
    }

    const state = location.state as any;

    // 2. Periksa flag pengembalian modul spesifik (Prioritas Tertinggi)
    if (state?.returnToTracerProject) {
      navigate(`/research/tracer/${state.returnToTracerProject}`, { 
        state: { reopenReference: state.returnToRef }, 
        replace: true 
      });
      return;
    } 
    
    if (state?.returnToTeaching) {
      navigate(`/teaching/${state.returnToTeaching}`, { 
        state: { activeTab: state.activeTab || 'substance' }, 
        replace: true 
      });
      return;
    } 
    
    if (state?.returnToAttachedQuestion) {
      navigate(`/teaching/${state.returnToAttachedQuestion}/questions`, { 
        state: { item: state.teachingItem }, 
        replace: true 
      });
      return;
    } 
    
    if (state?.returnToPPT) {
      navigate('/presentations', { state: { reopenPPT: state.returnToPPT }, replace: true });
      return;
    } 
    
    if (state?.returnToQuestion) {
      navigate('/questions', { state: { reopenQuestion: state.returnToQuestion }, replace: true });
      return;
    }

    if (state?.returnToAudit) {
      const audit = state.returnToAudit;
      if (audit.roughIdea !== undefined) {
        navigate(`/research/brainstorming/${audit.id}`, { state: { item: audit }, replace: true });
      } else if (audit.gSlidesId !== undefined || audit.templateName !== undefined) {
        navigate('/presentations', { state: { reopenPPT: audit }, replace: true });
      } else if (audit.projectName !== undefined) {
        navigate(`/research/work/${audit.id}`, { replace: true });
      } else {
        onClose();
      }
      return;
    }

    // 3. Periksa referrer generic
    if (state?.fromPath) {
      navigate(state.fromPath, { replace: true, state: state.fromState });
      return;
    }

    // 4. FALLBACK: Jika dibuka dari state eksternal, cukup panggil onClose (lokal)
    // Gunakan wasOpenedViaExternalRef karena state openItem mungkin sudah dibersihkan oleh parent
    if (wasOpenedViaExternalRef.current) {
      onClose();
    } 
    // 5. Jika tidak ada sejarah transisi state, biarkan history stack browser bekerja
    else if (window.history.length > 1) {
      navigate(-1);
    } 
    else {
      onClose();
    }
  };

  const hasViewLink = !!(currentItem.fileId || currentItem.url);

  const isAnyLoading = isGeneratingInsights || isFetchingStoredInsights;

  // New Subcomponent for Section Header with Translation Button
  const SectionHeader: React.FC<{ 
    label: string; 
    icon: React.ReactNode; 
    sectionName: string;
    hasContent: boolean;
  }> = ({ label, icon, sectionName, hasContent }) => (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
        {icon} {label}
      </h3>
      {hasContent && !isAnyLoading && (
        <div className="relative group">
          <button 
            onClick={() => setOpenTranslationMenu(openTranslationMenu === sectionName ? null : sectionName)}
            className="p-1.5 text-[#004A74] bg-white border border-gray-100 rounded-lg shadow-sm hover:scale-110 transition-all z-10"
          >
            <LanguageIcon className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <MiniTooltip text="Translate Section" />
          {openTranslationMenu === sectionName && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
              <div className="p-2 border-b border-gray-50 mb-1">
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {LANG_OPTIONS.map((lang) => (
                  <button 
                    key={lang.code}
                    onClick={() => handleTranslateSection(sectionName, lang.code)}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center justify-between"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div 
      className={`fixed top-0 right-0 bottom-0 z-[1000] bg-white flex flex-col will-change-transform overflow-hidden transition-all border-l border-gray-100 ${
        isMobileSidebarOpen ? 'blur-[15px] opacity-40 pointer-events-none scale-[0.98]' : ''
      } ${
        wasOpenedViaExternalRef.current 
          ? 'animate-in fade-in duration-200' 
          : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'
      }`}
      style={{ 
        left: 'var(--sidebar-offset, 0px)',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {showCiteModal && <CitationModal item={currentItem} onClose={() => setShowCiteModal(false)} />}
      {isShareModalOpen && (
        <SharboxWorkflowModal 
          initialItem={currentItem} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
      {isTracerPickerOpen && (
        <TracerProjectPicker 
          item={currentItem} 
          onClose={() => setIsTracerPickerOpen(false)} 
        />
      )}
      {isTeachingPickerOpen && (
        <TeachingSessionPicker 
          item={currentItem} 
          onClose={() => setIsTeachingPickerOpen(false)} 
        />
      )}
      
      {/* 1. STICKY TOP AREA: MAINTAIN APP HEADER */}
      <div className="sticky top-0 z-[90] bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 md:px-8">
           <Header 
            searchQuery={dummySearch} 
            setSearchQuery={setDummySearch} 
            onRefresh={onRefresh}
           />
        </div>

        {/* 2. DETAIL NAVIGATION BAR */}
        {(!showPresentations && !showQuestions && !showConsultations && !showNotebook) && (
          <nav className="px-4 md:px-8 py-3 flex items-center justify-between border-t border-gray-50/50">
            <button onClick={handleBack} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 px-3 py-2 rounded-xl transition-all">
              <ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCiteModal(true)}
                className="flex items-center gap-2 px-5 py-2 bg-[#FED400] text-[#004A74] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md hover:scale-105 transition-all"
              >
                Cite
              </button>
              
              {hasViewLink && (
                <div className="relative group">
                  <button 
                    onClick={handleViewCollection}
                    className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all outline-none"
                  >
                    <EyeIcon className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <MiniTooltip text="View Document" />
                </div>
              )}

              <div className="relative group">
                <button 
                  onClick={() => handleToggleAction('isBookmarked')}
                  className="p-2 text-[#004A74] hover:bg-[#004A74]/5 rounded-xl transition-all outline-none"
                >
                  {isBookmarked ? <BookmarkSolid className="w-5 h-5 text-[#004A74]" /> : <BookmarkIcon className="w-5 h-5 stroke-[2.5]" />}
                </button>
                <MiniTooltip text={isBookmarked ? "Unbookmark" : "Bookmark"} />
              </div>

              <div className="relative group">
                <button 
                  onClick={() => handleToggleAction('isFavorite')}
                  className="p-2 text-[#FED400] hover:bg-[#FED400]/10 rounded-xl transition-all outline-none"
                >
                  {isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5 stroke-[2.5]" />}
                </button>
                <MiniTooltip text={isFavorite ? "Remove from Favorites" : "Add to Favorites"} />
              </div>
              
              <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-[#004A74] hover:bg-gray-50 rounded-xl transition-all"><EllipsisVerticalIcon className="w-5 h-5 stroke-[2.5]" /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-2 z-[90] animate-in fade-in zoom-in-95">
                    <button onClick={handleUpdate} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <PencilIcon className="w-4 h-4" /> Update
                    </button>
                    <button onClick={() => { setShowPresentations(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all"><Presentation className="w-4 h-4" /> Presentation</button>
                    <button onClick={() => { setShowQuestions(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <ListTodo className="w-4 h-4" /> Question Bank
                    </button>
                    <button onClick={() => { setShowConsultations(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <ChatBubbleLeftRightIcon className="w-4 h-4" /> Consultation
                    </button>
                    <button onClick={() => { setShowNotebook(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <NotebookPen className="w-4 h-4" /> Note
                    </button>
                    <button onClick={() => { setIsTracerPickerOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all"><Target className="w-4 h-4" /> Tracer Attachment</button>
                    <button onClick={() => { setIsTeachingPickerOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all"><Grip className="w-4 h-4" /> Teaching Attachment</button>
                    <button onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all"><ShareIcon className="w-4 h-4" /> Share</button>
                    <div className="h-px bg-gray-50 my-1 mx-2" />
                    <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {showPresentations ? (
          <RelatedPresentations 
            collection={currentItem} 
            onBack={() => setShowPresentations(false)} 
          />
        ) : showQuestions ? (
          <RelatedQuestion 
            collection={currentItem}
            onBack={() => setShowQuestions(false)}
          />
        ) : showConsultations ? (
          <ConsultationGallery 
            collection={currentItem}
            onBack={() => setShowConsultations(false)}
          />
        ) : showNotebook ? (
          <NotebookMain 
            collectionId={currentItem.id}
            onBackToLibrary={() => setShowNotebook(false)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 space-y-4">
              
              <header className="bg-gray-50/50 p-6 md:p-10 rounded-[2.5rem] border border-gray-100 space-y-4 relative overflow-hidden">
                {isLoading && !isSyncing ? (
                  <div className="space-y-4">
                    <div className="flex gap-2"><div className="h-6 w-20 skeleton rounded-full"/><div className="h-6 w-20 skeleton rounded-full"/></div>
                    <div className="h-10 w-full skeleton rounded-2xl"/>
                    <div className="h-4 w-1/2 skeleton rounded-lg"/>
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                       <div className="h-3 w-1/4 skeleton rounded-md"/>
                       <div className="h-3 w-1/3 skeleton rounded-md"/>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.type}</span>
                      {currentItem.category && <span className="px-3 py-1 bg-[#004A74]/10 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.category}</span>}
                      <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.topic}</span>
                      {currentItem.subTopic && <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.subTopic}</span>}
                    </div>

                    <h1 className="text-xl md:text-2xl font-black text-[#004A74] leading-[1.2] break-words uppercase">{currentItem.title}</h1>
                    
                    <div className="flex flex-col gap-1">
                      {displayDate && <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{displayDate}</p>}
                      <p className="text-sm font-bold text-[#004A74]">{authorsText === 'N/A' ? 'Unknown' : authorsText}</p>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-0.5 opacity-60 md:absolute md:bottom-4 md:right-8 transition-all">
                       <div className="flex items-center gap-1.5">
                          <ClockIcon className="w-2.5 h-2.5" />
                          <span className="text-[7px] font-black uppercase tracking-tighter">Created: {formatTimeMeta(currentItem.createdAt)}</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                          <ArrowPathIcon className="w-2.5 h-2.5" />
                          <span className="text-[7px] font-black uppercase tracking-tighter">Updated: {formatTimeMeta(currentItem.updatedAt)}</span>
                       </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-gray-100">
                      {currentItem.publisher && (
                        <div className="flex items-start gap-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Publisher</span>
                          <p className="text-[11px] font-bold text-gray-600">{currentItem.publisher}</p>
                        </div>
                      )}
                      
                      {(pubInfo.journal || pubInfo.vol || pubInfo.issue || pubInfo.pages) && (
                        <div className="flex items-start gap-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Publication</span>
                          <p className="text-[11px] font-bold text-[#004A74]">
                            {[pubInfo.journal, pubInfo.vol ? `Vol. ${pubInfo.vol}` : '', pubInfo.issue ? `No. ${pubInfo.issue}` : '', pubInfo.pages ? `pp. ${pubInfo.pages}` : ''].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      )}

                      {Object.values(identifiers).some(v => v) && (
                        <div className="flex items-start gap-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Identifiers</span>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {identifiers.doi && <p className="text-[9px] font-mono font-bold text-gray-400 italic">DOI: {identifiers.doi}</p>}
                            {identifiers.issn && <p className="text-[9px] font-mono font-bold text-gray-400 italic">ISSN: {identifiers.issn}</p>}
                            {identifiers.isbn && <p className="text-[9px] font-mono font-bold text-gray-400 italic">ISBN: {identifiers.isbn}</p>}
                            {identifiers.pmid && <p className="text-[9px] font-mono font-bold text-gray-400 italic">PMID: {identifiers.pmid}</p>}
                            {identifiers.arxiv && <p className="text-[9px] font-mono font-bold text-gray-400 italic">arXiv: {identifiers.arxiv}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><HashtagIcon className="w-3 h-3" /> Keywords</h3>
                  {isLoading && !isSyncing ? <div className="h-10 w-full skeleton rounded-xl" /> : (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.keywords?.length > 0 ? tags.keywords.map((k: string) => <span key={k} className="px-2.5 py-1 bg-[#004A74]/5 border border-[#004A74]/10 rounded-lg text-[9px] font-bold text-[#004A74]">{k}</span>) : <p className="text-[9px] text-gray-300 italic">No keywords.</p>}
                    </div>
                  )}
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><TagIcon className="w-3 h-3" /> Labels</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.labels?.length > 0 ? tags.labels.map((l: string) => <span key={l} className="px-2.5 py-1 bg-[#FED400]/10 border border-[#FED400]/20 rounded-lg text-[9px] font-bold text-[#004A74]">{l}</span>) : <p className="text-[9px] text-gray-300 italic">No labels.</p>}
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-3.5 h-3.5" /> Abstract</h3>
                {isLoading && !isSyncing ? (
                   <div className="space-y-2"><div className="h-4 w-full skeleton rounded-md"/><div className="h-4 w-full skeleton rounded-md"/><div className="h-4 w-3/4 skeleton rounded-md"/></div>
                ) : (
                  <div className="text-sm leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentItem.abstract || 'No abstract content found.' }} />
                )}
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#004A74] flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-[#004A74]" /> INSIGHTS
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleGenerateInsights}
                      disabled={isAnyLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#004A74]/20 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isGeneratingInsights ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                      {isGeneratingInsights ? 'Analyzing...' : 'Generate'}
                    </button>
                    <button onClick={() => setShowTips(true)} className="p-2 bg-[#FED400] text-[#004A74] rounded-xl shadow-md hover:rotate-12 transition-all">
                      <LightBulbIcon className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 md:col-span-2">
                    <SectionHeader 
                      label="Summary" 
                      icon={<ClipboardDocumentListIcon className="w-3.5 h-3.5" />} 
                      sectionName="summary"
                      hasContent={!!currentItem.summary}
                    />
                    {isAnyLoading || translatingSection === 'summary' ? (
                      <div className="space-y-3">
                        <div className="h-4 w-full skeleton rounded-md" />
                        <div className="h-4 w-full skeleton rounded-md" />
                        <div className="h-4 w-3/4 skeleton rounded-md" />
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed text-[#004A74] font-medium" dangerouslySetInnerHTML={{ __html: currentItem.summary || 'Summary pending analysis.' }} />
                    )}
                  </div>

                  <div className="bg-green-50 p-6 rounded-[2.5rem] border border-green-100/50 shadow-sm space-y-4">
                    <SectionHeader 
                      label="Strengths" 
                      icon={<ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />} 
                      sectionName="strength"
                      hasContent={!!currentItem.strength}
                    />
                    {translatingSection === 'strength' ? (
                      <div className="h-20 w-full skeleton rounded-xl" />
                    ) : (
                      <ElegantList text={currentItem.strength} isLoading={isAnyLoading} />
                    )}
                  </div>

                  <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100/50 shadow-sm space-y-4">
                    <SectionHeader 
                      label="Weaknesses" 
                      icon={<ExclamationTriangleIcon className="w-3.5 h-3.5" />} 
                      sectionName="weakness"
                      hasContent={!!currentItem.weakness}
                    />
                    {translatingSection === 'weakness' ? (
                      <div className="h-20 w-full skeleton rounded-xl" />
                    ) : (
                      <ElegantList text={currentItem.weakness} isLoading={isAnyLoading} />
                    )}
                  </div>

                  <div className="bg-[#004A74]/5 p-6 rounded-[2.5rem] border border-[#004A74]/10 shadow-sm space-y-3 md:col-span-2">
                    <SectionHeader 
                      label="Unfamiliar Terminology" 
                      icon={<ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" />} 
                      sectionName="unfamiliarTerminology"
                      hasContent={!!(currentItem.unfamiliarTerminology || currentItem.quickTipsForYou)}
                    />
                    {translatingSection === 'unfamiliarTerminology' ? (
                      <div className="h-20 w-full skeleton rounded-xl" />
                    ) : (
                      <ElegantList text={currentItem.unfamiliarTerminology || currentItem.quickTipsForYou} isLoading={isAnyLoading} />
                    )}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <div className="space-y-4">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5" /> Supporting References
                  </h3>
                  <div className="space-y-3">
                    {isLoading && !isSyncing ? [...Array(2)].map((_, i) => <div key={i} className="h-20 w-full skeleton rounded-3xl" />) : (
                      supportingData.references?.length > 0 ? supportingData.references.map((ref: string, idx: number) => {
                        const urlMatch = ref.match(/https?:\/\/[^\s<]+/);
                        const url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                        return (
                          <div key={idx} className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-4 transition-all hover:bg-white group">
                            <div className="flex gap-4">
                              <span className="shrink-0 w-7 h-7 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">{idx + 1}</span>
                              <p className="text-xs font-bold text-[#004A74]/80 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: ref }} />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              {/* Fix: Added missing event argument to handleCopy call to fix the "Expected 2 arguments, but got 1" error. */}
                              <button 
                                onClick={(e) => handleCopy(e, ref.replace(/<[^>]*>/g, ''))}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#004A74] rounded-lg border border-gray-100 text-[9px] font-black uppercase tracking-tight shadow-sm hover:bg-[#FED400] transition-all"
                              >
                                <DocumentDuplicateIcon className="w-3 h-3" /> Copy
                              </button>
                              {url && (
                                <button 
                                  onClick={() => handleOpenLink(url)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004A74] text-white rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm hover:scale-105 transition-all"
                                >
                                  <ArrowTopRightOnSquareIcon className="w-3 h-3" /> Visit
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }) : <div className="py-6 text-center text-gray-300 text-[10px] font-bold uppercase italic">No supporting links.</div>
                    )}
                  </div>
                </div>

                <div className="bg-[#004A74] p-6 rounded-[2.5rem] shadow-xl space-y-4 flex flex-col">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-white/50 flex items-center gap-2"><VideoCameraIcon className="w-3.5 h-3.5" /> Video Recommendation</h3>
                  <div className="1-flex flex-col justify-center">
                    {isLoading && !isSyncing ? <div className="aspect-video w-full skeleton rounded-2xl" /> : (
                      supportingData.videoUrl ? (
                        <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border-4 border-white/10 group transition-all hover:scale-[1.01]">
                          <iframe className="w-full h-full" src={supportingData.videoUrl} frameBorder="0" allowFullScreen></iframe>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-2xl bg-white/5 flex flex-col items-center justify-center border-2 border-dashed border-white/10">
                          <VideoCameraIcon className="w-10 h-10 text-white/10 mb-2" />
                          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Video recommendation unavailable</p>
                        </div>
                      )
                    )}
                    <p className="mt-4 text-[10px] text-[#FED400]/80 font-bold italic text-center px-4 leading-relaxed">"This video may irrelevant, please watch it thoroughly."</p>
                  </div>
                </div>
              </section>

              <footer className="py-8 text-center">
                 <div className="w-10 h-0.5 bg-gray-100 mx-auto mb-4 rounded-full" />
                 <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.6em]">XEENAPS PKM SYSTEMS</p>
              </footer>
            </div>
          </div>
        )}
      </div>

      {showTips && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#004A74] text-white p-8 md:p-12 rounded-[3rem] max-w-lg shadow-2xl relative border border-white/10">
            <button onClick={() => setShowTips(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"><XMarkIcon className="w-6 h-6" /></button>
            <LightBulbIcon className="w-10 h-10 text-[#FED400] mb-6 drop-shadow-[0_0_10px_rgba(254,212,0,0.5)]" />
            <h3 className="text-xl font-black mb-4 uppercase tracking-widest">Knowledge Anchor Tips</h3>
            <p className="text-sm font-medium italic leading-relaxed opacity-90 border-l-2 border-[#FED400] pl-4">"{currentItem.quickTipsForYou || 'Generate AI insights to unlock specific tips for this collection.'}"</p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #004A7430; border-radius: 10px; }
      `}</style>
    </div>
  );
}; 


export default LibraryDetailView;