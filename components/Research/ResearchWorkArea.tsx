
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ResearchProject, 
  ResearchSource, 
  LibraryItem, 
  ResearchStatus,
  NoveltySynthesis
} from '../../types';
import { 
  fetchResearchProjects, 
  saveResearchProject, 
  fetchProjectSources, 
  saveProjectSource, 
  deleteProjectSource 
} from '../../services/ResearchService';
import { 
  fetchHybridSnippet, 
  analyzeSingleSourceGap, 
  synthesizeOverallNovelty 
} from '../../services/GapFinderService';
import { 
  ArrowLeft, 
  Plus, 
  Zap, 
  Trash2, 
  Sparkles, 
  Star, 
  ShieldAlert,
  Loader2,
  Bold,
  Italic,
  Tag as TagIcon,
  Database as CircleStackIcon,
  Languages as GlobeIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { GAS_WEB_APP_URL } from '../../constants';
import ResearchSourceSelectorModal from './ResearchSourceSelectorModal';
import LibraryDetailView from '../Library/LibraryDetailView';

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

/**
 * Xeenaps Branded Inline Skeleton for Research Detail
 */
const WorkAreaSkeleton: React.FC = () => (
  <div className="w-full h-full flex flex-col space-y-12 animate-in fade-in duration-500">
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
         <div className="h-4 w-48 skeleton rounded-lg" />
         <div className="h-10 w-32 skeleton rounded-2xl" />
      </div>
      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
         <div className="h-14 w-full bg-gray-50/50 border-b border-gray-100" />
         {[...Array(3)].map((_, i) => (
           <div key={i} className="p-8 grid grid-cols-5 gap-6 border-b border-gray-50 last:border-0">
              <div className="space-y-2"><div className="h-4 w-32 skeleton rounded-md"/><div className="h-3 w-20 skeleton rounded-md"/></div>
              <div className="space-y-2"><div className="h-3 w-full skeleton rounded-md"/><div className="h-3 w-full skeleton rounded-md"/></div>
              <div className="h-12 w-full skeleton rounded-2xl"/>
              <div className="space-y-2"><div className="h-3 w-full skeleton rounded-md"/><div className="h-3 w-1/2 skeleton rounded-md"/></div>
              <div className="h-10 w-10 skeleton rounded-xl mx-auto"/>
           </div>
         ))}
      </div>
    </div>
    <div className="space-y-6 max-w-6xl mx-auto w-full pt-10">
       <div className="flex justify-between items-end">
          <div className="space-y-2"><div className="h-3 w-32 skeleton rounded-md"/><div className="h-8 w-48 skeleton rounded-lg"/></div>
          <div className="h-14 w-40 skeleton rounded-[1.5rem]"/>
       </div>
       <div className="h-24 w-full skeleton rounded-[2.5rem]"/>
       <div className="h-80 w-full skeleton rounded-[2.5rem]"/>
    </div>
  </div>
);

/**
 * Rich Text Editor for Novelty Output
 */
const NoveltyEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  disabled?: boolean 
}> = ({ value, onChange, disabled }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className={`flex flex-col rounded-[2.5rem] border border-gray-200 overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#004A74]/10 transition-all ${disabled ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}>
      <div className="flex items-center gap-1 p-3 bg-gray-50 border-b border-gray-100">
        <button type="button" onClick={() => execCommand('bold')} disabled={disabled} className="p-2 hover:bg-white rounded-xl transition-all text-[#004A74]"><Bold size={16} /></button>
        <button type="button" onClick={() => execCommand('italic')} disabled={disabled} className="p-2 hover:bg-white rounded-xl transition-all text-[#004A74]"><Italic size={16} /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="p-8 text-sm min-h-[400px] outline-none leading-relaxed text-[#004A74] font-medium"
        {...({ "data-placeholder": "Awaiting novelty analysis..." } as any)}
      />
    </div>
  );
};

const ResearchWorkArea: React.FC<{ libraryItems: LibraryItem[] }> = ({ libraryItems }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Instant Identity Hydration from State
  const [project, setProject] = useState<ResearchProject | null>(() => (location.state as any)?.project || null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false); 
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [isNoveltyTranslating, setIsNoveltyTranslating] = useState(false);
  const [openTranslationMenu, setOpenTranslationMenu] = useState<string | null>(null); 
  const [selectedSourceForDetail, setSelectedSourceForDetail] = useState<LibraryItem | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      // Background re-fetch to ensure data is fresh and full metadata is loaded
      const allProjects = await fetchResearchProjects(1, 1000);
      const found = allProjects.items.find(p => p.id === projectId);
      
      if (found) {
        setProject(prev => prev ? { ...prev, ...found } : found);
        const sourceData = await fetchProjectSources(projectId);
        setSources(sourceData);
        setIsHydrated(true);
      } else if (!project) {
        navigate('/research');
      }
      
      setIsLoading(false);
    };
    loadData();
  }, [projectId]);

  /**
   * AUTO-SAVE ENGINE
   */
  useEffect(() => {
    if (!project || isLoading || !isHydrated) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveResearchProject(project);
      } catch (e) {
        console.error("Auto-save sync failed", e);
      }
    }, 1000); 

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [project?.proposedTitle, project?.noveltyNarrative, project?.status, project?.isFavorite, project?.isUsed, project?.projectName, isLoading, isHydrated]);

  const handleToggleStatus = () => {
    if (!project || isBusy) return;
    const nextStatus = project.status === ResearchStatus.DRAFT ? ResearchStatus.FINALIZED : ResearchStatus.DRAFT;
    setProject({ ...project, status: nextStatus, updatedAt: new Date().toISOString() });
    showXeenapsToast('info', `Project status changed to ${nextStatus}`);
  };

  const handleToggleProjectProp = async (prop: 'isFavorite' | 'isUsed') => {
    if (!project || isBusy) return;
    const updated = { ...project, [prop]: !project[prop], updatedAt: new Date().toISOString() };
    setProject(updated);
  };

  const handleStartAudit = async (selectedLibs: LibraryItem[]) => {
    if (!project) return;
    setIsSelectorOpen(false);
    setIsBusy(true);

    const newSources: ResearchSource[] = selectedLibs.map(lib => ({
      id: crypto.randomUUID(),
      projectId: project.id,
      sourceId: lib.id,
      title: lib.title,
      findings: '',
      methodology: '',
      limitations: '',
      isFavorite: false,
      isUsed: false,
      createdAt: new Date().toISOString(),
      isAnalyzing: true
    }));

    setSources(prev => [...prev, ...newSources]);

    for (const newSrc of newSources) {
      const libItem = libraryItems.find(it => it.id === newSrc.sourceId) || selectedLibs.find(it => it.id === newSrc.sourceId);
      if (!libItem) continue;

      try {
        const snippet = await fetchHybridSnippet(libItem);
        if (snippet) {
          const analysis = await analyzeSingleSourceGap(snippet, libItem.title);
          if (analysis) {
            const completed: ResearchSource = {
              ...newSrc,
              findings: analysis.findings || '',
              methodology: analysis.methodology || '',
              limitations: analysis.limitations || '',
              isAnalyzing: false
            };
            await saveProjectSource(completed);
            setSources(prev => prev.map(s => s.id === newSrc.id ? completed : s));
          } else {
            setSources(prev => prev.map(s => s.id === newSrc.id ? { ...s, isAnalyzing: false } : s));
          }
        }
      } catch (e) {
        showXeenapsToast('error', 'Audit segment interrupted.');
        setSources(prev => prev.map(s => s.id === newSrc.id ? { ...s, isAnalyzing: false } : s));
      }
    }

    setIsBusy(false);
    showXeenapsToast('success', 'Matrix segments updated.');
  };

  const handleTranslateRow = async (src: ResearchSource, langCode: string) => {
    if (translatingId || isBusy) return;
    setTranslatingId(src.id);
    setOpenTranslationMenu(null);
    
    try {
      const res = await fetch(GAS_WEB_APP_URL!, {
        method: 'POST',
        body: JSON.stringify({
          action: 'translateResearchSource',
          findings: src.findings,
          methodology: src.methodology,
          limitations: src.limitations,
          targetLang: langCode
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        const updated = {
          ...src,
          findings: result.findings,
          methodology: result.methodology,
          limitations: result.limitations
        };
        await saveProjectSource(updated);
        setSources(prev => prev.map(s => s.id === src.id ? updated : s));
        showXeenapsToast('success', 'Row translated.');
      }
    } catch (e) {
      showXeenapsToast('error', 'Translation failed.');
    } finally {
      setTranslatingId(null);
    }
  };

  const handleTranslateNovelty = async (langCode: string) => {
    if (!project || isNoveltyTranslating || isBusy) return;
    setIsNoveltyTranslating(true);
    setOpenTranslationMenu(null);
    
    try {
      const res = await fetch(GAS_WEB_APP_URL!, {
        method: 'POST',
        body: JSON.stringify({
          action: 'aiProxy',
          provider: 'gemini',
          prompt: `Translate the following research novelty synthesis into ${langCode}. Maintain HTML tags like <b> and <br/>. Return only the translated text.\n\n${project.noveltyNarrative}`
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        const updated = { ...project, noveltyNarrative: result.data, updatedAt: new Date().toISOString() };
        setProject(updated);
        showXeenapsToast('success', 'Novelty translated.');
      }
    } catch (e) {
      showXeenapsToast('error', 'Novelty translation failed.');
    } finally {
      setIsNoveltyTranslating(false);
    }
  };

  const handleRemoveSource = async (id: string) => {
    if (isBusy) return;
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (!confirmed) return;
    
    if (await deleteProjectSource(id)) {
      setSources(sources.filter(s => s.id !== id));
      showXeenapsToast('success', 'Source removed');
    }
  };

  const generateSynthesis = async () => {
    if (!project || sources.length === 0 || isBusy) return;
    setIsSynthesizing(true);
    setIsBusy(true);
    showXeenapsToast('info', 'Synthesizing global novelty...');

    try {
      const result = await synthesizeOverallNovelty(sources);
      if (result) {
        const updatedProject: ResearchProject = {
          ...project,
          status: ResearchStatus.FINALIZED,
          proposedTitle: result.proposedTitle,
          noveltyNarrative: result.narrative,
          futureDirections: JSON.stringify(result.futureDirections),
          updatedAt: new Date().toISOString()
        };
        setProject(updatedProject);
        showXeenapsToast('success', 'Novelty synthesis complete');
      }
    } catch (e) {
      showXeenapsToast('error', 'Synthesis engine failed.');
    } finally {
      setIsSynthesizing(false);
      setIsBusy(false);
    }
  };

  const handleOpenLibraryItem = (libId: string) => {
    const lib = libraryItems.find(it => it.id === libId);
    if (lib) {
      setSelectedSourceForDetail(lib);
    }
  };

  const canAnalyzeNovelty = sources.length > 0 && sources.every(s => !s.isAnalyzing) && !isBusy;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
      
      {isBusy && (
        <div className="fixed inset-0 z-[200] bg-white/20 backdrop-blur-[2px] cursor-wait flex items-center justify-center">
           {isSynthesizing && (
             <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 border border-gray-100 animate-in zoom-in-95">
                <Loader2 size={48} className="text-[#004A74] animate-spin" />
                <div className="text-center">
                  <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tighter">Novelty Synthesis in Progress</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cross-referencing matrix data...</p>
                </div>
             </div>
           )}
        </div>
      )}

      {/* HUD HEADER - OPTIMIZED FOR MOBILE ALIGNMENT */}
      <header className="px-6 md:px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex flex-col md:flex-row items-center md:justify-between gap-4 shrink-0 z-[90]">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => navigate('/research')} disabled={isBusy} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-50">
               <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
               <div className="flex flex-wrap items-center gap-2">
                 {isLoading && !isHydrated ? (
                   <div className="h-6 w-48 skeleton rounded-lg" />
                 ) : (
                   <h2 className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tighter leading-none truncate max-w-[200px] md:max-w-md">{project?.projectName}</h2>
                 )}
                 <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                    <button onClick={() => handleToggleProjectProp('isFavorite')} className="p-1.5 hover:bg-gray-50 rounded-lg transition-all" title="Add project to favorites">
                      <Star size={18} className={`${project?.isFavorite ? 'text-[#FED400] fill-[#FED400]' : 'text-[#FED400]'}`} />
                    </button>
                    <button 
                      onClick={() => handleToggleProjectProp('isUsed')} 
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all border ${
                        project?.isUsed ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
                      }`}
                    >
                      {project?.isUsed ? 'USED' : 'UNUSED'}
                    </button>
                 </div>
               </div>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Research Audit & Novelty Workspace</p>
            </div>
         </div>

         <div className="flex items-center justify-end w-full md:w-auto border-t md:border-t-0 border-gray-50 pt-2 md:pt-0">
            <button 
              onClick={handleToggleStatus}
              disabled={isBusy}
              className={`w-full md:w-auto px-6 py-2 md:py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 text-center ${
                 project?.status === ResearchStatus.FINALIZED 
                   ? 'bg-[#FED400] text-[#004A74] border-[#FED400]' 
                   : 'bg-[#004A74] text-white border-[#004A74]'
              }`}
              title="Click to toggle status (Draft / Finalized)"
            >
               {project?.status || '...' }
            </button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-12 pb-32">
        {isLoading && !isHydrated ? (
          <WorkAreaSkeleton />
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                  Research Gap Matrix Audit
                </h3>
                <button 
                  onClick={() => setIsSelectorOpen(true)}
                  disabled={isBusy}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#004A74] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg disabled:opacity-50"
                >
                  <Plus size={16} /> Add Literature
                </button>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[20%]">Literature Identity</th>
                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[25%]">Findings</th>
                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[20%]">Paradigm / Method</th>
                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[25%]">Limitations & Gaps</th>
                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 w-[10%] text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sources.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-24 text-center">
                            <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                               <CircleStackIcon size={40} className="mb-4 text-[#004A74]" />
                               <p className="text-[10px] font-black uppercase tracking-widest">Audit Matrix is Empty</p>
                            </div>
                          </td>
                        </tr>
                      ) : sources.map((src, idx) => (
                        <tr key={src.id} className={`transition-all duration-700 ${src.isAnalyzing ? 'bg-[#FED400]/5' : 'hover:bg-gray-50/30'}`}>
                          <td className="p-6 align-top">
                             <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                   <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">SOURCE 0{idx+1}</span>
                                </div>
                                <h4 
                                  onClick={() => handleOpenLibraryItem(src.sourceId)}
                                  className="text-xs font-black text-[#004A74] uppercase leading-snug hover:underline cursor-pointer transition-all"
                                >
                                  {src.title}
                                </h4>
                                {src.isAnalyzing && (
                                  <div className="flex items-center gap-1.5 text-[#004A74] animate-pulse">
                                     <Loader2 size={10} className="animate-spin" />
                                     <span className="text-[7px] font-black uppercase tracking-widest">AI Auditing Content...</span>
                                  </div>
                                )}
                             </div>
                          </td>
                          <td className="p-6 align-top">
                             {src.isAnalyzing ? (
                               <div className="space-y-2"><div className="h-3 w-full skeleton rounded-lg" /><div className="h-3 w-3/4 skeleton rounded-lg" /></div>
                             ) : (
                               <div className="text-[11px] font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">
                                  {src.findings}
                               </div>
                             )}
                          </td>
                          <td className="p-6 align-top">
                             {src.isAnalyzing ? (
                               <div className="h-10 w-full skeleton rounded-xl" />
                             ) : (
                               <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-[11px] font-bold italic text-[#004A74] whitespace-pre-wrap">
                                  "{src.methodology}"
                               </div>
                             )}
                          </td>
                          <td className="p-6 align-top">
                             {src.isAnalyzing ? (
                               <div className="space-y-2"><div className="h-3 w-full skeleton rounded-lg" /><div className="h-3 w-1/2 skeleton rounded-lg" /></div>
                             ) : (
                               <p className="text-[11px] font-bold text-gray-500 leading-relaxed whitespace-pre-wrap">{src.limitations}</p>
                             )}
                          </td>
                          <td className="p-6 text-center align-top">
                             <div className="flex flex-col items-center gap-2">
                               <div className="relative">
                                 <button 
                                   onClick={() => setOpenTranslationMenu(openTranslationMenu === src.id ? null : src.id)} 
                                   disabled={isBusy || !!translatingId} 
                                   className={`p-2.5 rounded-xl transition-all shadow-sm ${translatingId === src.id ? 'bg-[#004A74]/10 text-[#004A74] animate-pulse' : 'bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-white'}`}
                                   title="Translate Row"
                                 >
                                    {translatingId === src.id ? <Loader2 size={16} className="animate-spin" /> : <GlobeIcon size={16} />}
                                 </button>
                                 {openTranslationMenu === src.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
                                      <div className="p-2 border-b border-gray-50 mb-1">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {LANG_OPTIONS.map((lang) => (
                                          <button 
                                            key={lang.code}
                                            onClick={() => handleTranslateRow(src, lang.code)}
                                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center justify-between"
                                          >
                                            {lang.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                 )}
                               </div>
                               <button onClick={(e) => handleRemoveSource(src.id)} disabled={isBusy} className="p-2.5 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all disabled:opacity-20">
                                  <Trash2 size={16} />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="space-y-6 max-w-6xl mx-auto pt-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                       Discovery & Novelty Suggestions
                    </h3>
                    <h2 className="text-3xl font-black text-[#004A74] uppercase tracking-tighter">THE WHITE SPACE</h2>
                 </div>
                 
                 <button 
                   onClick={generateSynthesis}
                   disabled={!canAnalyzeNovelty}
                   className="flex items-center justify-center gap-3 px-12 py-5 bg-[#FED400] text-[#004A74] rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
                 >
                   {isSynthesizing ? <Loader2 size={18} className="animate-spin" /> : null}
                   <span className="text-center">Novelty Analysis</span>
                 </button>
              </div>

              <div className="space-y-10">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-4">Recommendation Research Title</label>
                    <textarea 
                       className="w-full px-8 py-6 bg-white border border-gray-100 rounded-[2.5rem] text-base font-bold text-[#004A74] uppercase tracking-tight shadow-sm outline-none focus:ring-4 focus:ring-[#004A74]/5 resize-none overflow-hidden min-h-[80px]"
                       placeholder="Awaiting Synthesis..."
                       value={project?.proposedTitle || ''}
                       onChange={(e) => {
                         if (project) setProject({...project, proposedTitle: e.target.value});
                         e.target.style.height = 'auto';
                         e.target.style.height = e.target.scrollHeight + 'px';
                       }}
                       onFocus={(e) => {
                         e.target.style.height = 'auto';
                         e.target.style.height = e.target.scrollHeight + 'px';
                       }}
                       disabled={isBusy}
                       rows={1}
                    />
                 </div>

                 <div className="space-y-2">
                    <div className="flex items-center justify-between ml-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Novelty Synthesis Narrative</label>
                      {project?.noveltyNarrative && !isBusy && (
                        <div className="relative">
                          <button 
                            onClick={() => setOpenTranslationMenu(openTranslationMenu === 'novelty' ? null : 'novelty')}
                            className="p-1.5 text-[#004A74] bg-white border border-gray-100 rounded-lg shadow-sm hover:scale-110 transition-all"
                          >
                            <GlobeIcon size={14} />
                          </button>
                          {openTranslationMenu === 'novelty' && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95">
                              <div className="p-2 border-b border-gray-50 mb-1">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                              </div>
                              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {LANG_OPTIONS.map((lang) => (
                                  <button 
                                    key={lang.code}
                                    onClick={() => handleTranslateNovelty(lang.code)}
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
                    <NoveltyEditor 
                      value={project?.noveltyNarrative || ''}
                      onChange={(val) => {
                        if (project) setProject({...project, noveltyNarrative: val});
                      }}
                      disabled={isBusy || isNoveltyTranslating}
                    />
                 </div>

                 {project?.noveltyNarrative && (
                   <div className="p-10 bg-[#004A74]/5 rounded-[3rem] border border-[#004A74]/10 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-16 h-16 bg-[#004A74] text-[#FED400] rounded-3xl flex items-center justify-center shrink-0 shadow-xl">
                         <ShieldAlert size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#004A74] uppercase tracking-widest mb-1">Scientific Integrity Guard</h4>
                        <p className="text-xs font-bold text-[#004A74]/60 leading-relaxed italic">
                          "The synthesis above identifies theoretical contradictions between selected sources. Manual checking and refinement is encouraged to align with your specific research niche."
                        </p>
                      </div>
                   </div>
                 )}
              </div>
            </section>
          </>
        )}
      </div>

      {isSelectorOpen && (
        <ResearchSourceSelectorModal 
          onClose={() => setIsSelectorOpen(false)}
          onAudit={handleStartAudit}
          currentMatrixCount={sources.length}
        />
      )}

      {selectedSourceForDetail && (
        <LibraryDetailView 
          item={selectedSourceForDetail} 
          onClose={() => setSelectedSourceForDetail(null)} 
          isLoading={false}
          isLocalOverlay={true}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ResearchWorkArea;
