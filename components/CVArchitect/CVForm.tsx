import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { 
  CVTemplateType, 
  UserProfile, 
  EducationEntry, 
  CareerEntry, 
  PublicationItem, 
  ActivityItem 
} from '../../types';
import { fetchSourceDataForCV, generateCVPdf } from '../../services/CVService';
import { callAiProxy } from '../../services/gasService';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField 
} from '../Common/FormComponents';
import { 
  Sparkles, 
  Loader2, 
  Check,
  Eye,
  GraduationCap,
  Briefcase,
  Share2,
  ClipboardCheck,
  CheckSquare,
  Square,
  FileUser,
  X,
  FileText,
  ExternalLink,
  Save,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

/**
 * Internal Skeleton Component for selection cards
 */
const SelectionSkeleton: React.FC<{ count?: number, height?: string }> = ({ count = 3, height = "72px" }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} style={{ height }} className="w-full skeleton rounded-2xl border border-gray-100/50" />
    ))}
  </div>
);

const CVForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCv, setGeneratedCv] = useState<any>(null);

  const [pubFilter, setPubFilter] = useState({ start: '', end: '' });
  const [actFilter, setActFilter] = useState({ start: '', end: '' });

  const [sourceData, setSourceData] = useState<{
    profile: UserProfile | null,
    education: EducationEntry[],
    career: CareerEntry[],
    publications: PublicationItem[],
    activities: ActivityItem[]
  }>({ profile: null, education: [], career: [], publications: [], activities: [] });

  const [config, setConfig] = useState({
    title: `CV ARCHIVE - ${new Date().getFullYear()}`,
    template: CVTemplateType.MODERN_ACADEMIC,
    selectedEducationIds: [] as string[],
    selectedCareerIds: [] as string[],
    selectedPublicationIds: [] as string[],
    selectedActivityIds: [] as string[],
    includePhoto: true,
    aiSummary: ''
  });

  useEffect(() => {
    const load = async () => {
      const data = await fetchSourceDataForCV();
      setSourceData(data);
      setConfig(prev => ({
        ...prev,
        selectedEducationIds: data.education.map(e => e.id),
        selectedCareerIds: data.career.map(c => c.id),
        selectedPublicationIds: data.publications.map(p => p.id),
        selectedActivityIds: data.activities.map(a => a.id)
      }));
      setIsLoading(false);
    };
    load();
  }, []);

  const filteredPubs = useMemo(() => {
    if (!pubFilter.start && !pubFilter.end) return sourceData.publications;
    return sourceData.publications.filter(p => {
      const yr = parseInt(p.year);
      if (pubFilter.start && yr < parseInt(pubFilter.start)) return false;
      if (pubFilter.end && yr > parseInt(pubFilter.end)) return false;
      return true;
    }).sort((a,b) => String(b.year).localeCompare(String(a.year)));
  }, [sourceData.publications, pubFilter]);

  const filteredActs = useMemo(() => {
    if (!actFilter.start && !actFilter.end) return sourceData.activities;
    return sourceData.activities.filter(a => {
      const date = new Date(a.startDate).getFullYear();
      if (actFilter.start && date < parseInt(actFilter.start)) return false;
      if (actFilter.end && date > parseInt(actFilter.end)) return false;
      return true;
    }).sort((a,b) => String(b.startDate).localeCompare(String(a.startDate)));
  }, [sourceData.activities, actFilter]);

  const handleGenerateSummary = async () => {
    if (!sourceData.profile) return;
    setIsGenerating(true);
    showXeenapsToast('info', 'AI is architecting your summary...');

    const eduText = sourceData.education
      .filter(e => config.selectedEducationIds.includes(e.id))
      .map(e => `${e.level} ${e.major} at ${e.institution}`)
      .join(', ');
    
    const careerText = sourceData.career
      .filter(c => config.selectedCareerIds.includes(c.id))
      .map(c => `${c.position} at ${c.company}`)
      .join(', ');

    const prompt = `ACT AS A CV BRANDING ARCHITECT.
    Draft a concise 3-sentence professional executive summary.
    NAME: ${sourceData.profile.fullName}
    CURRENT: ${sourceData.profile.jobTitle} at ${sourceData.profile.affiliation}
    EDU: ${eduText}
    EXP: ${careerText}
    
    RULE: RETURN ONLY CLEAN TEXT STRING. NO JSON. NO QUOTES.`;

    try {
      const result = await callAiProxy('groq', prompt, undefined, undefined, 'text');
      if (result) setConfig({ ...config, aiSummary: result });
    } catch (e) {
      showXeenapsToast('error', 'Synthesis failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsGenerating(true);
    Swal.fire({ title: 'Synthesizing PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...XEENAPS_SWAL_CONFIG });
    try {
      const result = await generateCVPdf(config);
      Swal.close();
      if (result) {
        showXeenapsToast('success', 'PDF Synchronized');
        setGeneratedCv(result);
      } else throw new Error("Backend failed");
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'SYNTHESIS FAILED', text: 'Cloud Engine Timeout.', ...XEENAPS_SWAL_CONFIG });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (listKey: 'selectedEducationIds' | 'selectedCareerIds' | 'selectedPublicationIds' | 'selectedActivityIds', id: string) => {
    setConfig(prev => ({
      ...prev,
      [listKey]: prev[listKey].includes(id) 
        ? prev[listKey].filter(i => i !== id) 
        : [...prev[listKey], id]
    }));
  };

  const bulkToggle = (listKey: 'selectedEducationIds' | 'selectedCareerIds' | 'selectedPublicationIds' | 'selectedActivityIds', items: any[], isAll: boolean) => {
    setConfig({ ...config, [listKey]: isAll ? items.map(i => i.id) : [] });
  };

  return (
    <FormPageContainer>
      <FormStickyHeader 
        title="Create CV" 
        subtitle="Professional Synthesis Workspace" 
        onBack={() => navigate('/cv-architect')}
      />

      <FormContentArea>
        <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in duration-500">
          
          {/* FULL WIDTH TITLE */}
          <FormField label="Document Title">
            <input 
              className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-black text-[#004A74] uppercase outline-none focus:ring-4 focus:ring-[#004A74]/5 transition-all" 
              value={config.title} 
              onChange={e => setConfig({...config, title: e.target.value})} 
              placeholder="e.g. CV PROFESSIONAL 2024" 
              disabled={isLoading}
            />
          </FormField>

          {/* GRID 1: EDUCATION | CAREER */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Education Selection */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2"><GraduationCap size={16} /> Education</h3>
                {!isLoading && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => bulkToggle('selectedEducationIds', sourceData.education, true)} className="text-[10px] font-black text-[#004A74] hover:underline uppercase">Select All</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={() => bulkToggle('selectedEducationIds', sourceData.education, false)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {isLoading ? (
                  <SelectionSkeleton count={3} height="76px" />
                ) : sourceData.education.length === 0 ? (
                  <p className="text-[10px] font-bold text-gray-300 uppercase italic p-4 text-center">No education records found</p>
                ) : (
                  sourceData.education.map(edu => (
                    <div key={edu.id} onClick={() => toggleSelection('selectedEducationIds', edu.id)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${config.selectedEducationIds.includes(edu.id) ? 'border-[#004A74] bg-blue-50' : 'border-gray-100 opacity-60'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.selectedEducationIds.includes(edu.id) ? 'bg-[#004A74] border-[#004A74] text-white' : 'border-gray-200'}`}>{config.selectedEducationIds.includes(edu.id) && <Check size={12} strokeWidth={4} />}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-[#004A74] uppercase truncate">{edu.institution}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">{edu.level} • {edu.startYear}-{edu.endYear}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Career Selection */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2"><Briefcase size={16} /> Experience</h3>
                {!isLoading && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => bulkToggle('selectedCareerIds', sourceData.career, true)} className="text-[10px] font-black text-[#004A74] hover:underline uppercase">Select All</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={() => bulkToggle('selectedCareerIds', sourceData.career, false)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {isLoading ? (
                  <SelectionSkeleton count={3} height="76px" />
                ) : sourceData.career.length === 0 ? (
                  <p className="text-[10px] font-bold text-gray-300 uppercase italic p-4 text-center">No career records found</p>
                ) : (
                  sourceData.career.map(job => (
                    <div key={job.id} onClick={() => toggleSelection('selectedCareerIds', job.id)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${config.selectedCareerIds.includes(job.id) ? 'border-[#004A74] bg-blue-50' : 'border-gray-100 opacity-60'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.selectedCareerIds.includes(job.id) ? 'bg-[#004A74] border-[#004A74] text-white' : 'border-gray-200'}`}>{config.selectedCareerIds.includes(job.id) && <Check size={12} strokeWidth={4} />}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-[#004A74] uppercase truncate">{job.company}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">{job.position} • {job.startDate}-{job.endDate}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* GRID 2: PUBLICATIONS | ACTIVITIES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Publication Selection */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2"><Share2 size={16} /> Publications</h3>
                {!isLoading && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-100 mr-2">
                      <input type="number" placeholder="From" className="w-10 bg-transparent border-none outline-none text-[9px] font-black text-[#004A74] text-center p-0" value={pubFilter.start} onChange={e => setPubFilter({...pubFilter, start: e.target.value})} />
                      <span className="text-gray-300 text-[9px]">-</span>
                      <input type="number" placeholder="To" className="w-10 bg-transparent border-none outline-none text-[9px] font-black text-[#004A74] text-center p-0" value={pubFilter.end} onChange={e => setPubFilter({...pubFilter, end: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => bulkToggle('selectedPublicationIds', filteredPubs, true)} className="text-[10px] font-black text-[#004A74] hover:underline uppercase">All</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => bulkToggle('selectedPublicationIds', filteredPubs, false)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {isLoading ? (
                  <SelectionSkeleton count={4} height="64px" />
                ) : filteredPubs.length === 0 ? (
                  <p className="text-[10px] font-bold text-gray-300 uppercase italic p-4 text-center">No publications matching filters</p>
                ) : (
                  filteredPubs.map(p => (
                    <div key={p.id} onClick={() => toggleSelection('selectedPublicationIds', p.id)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${config.selectedPublicationIds.includes(p.id) ? 'border-[#004A74] bg-[#004A74]/5' : 'border-gray-100 opacity-60'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${config.selectedPublicationIds.includes(p.id) ? 'bg-[#004A74] border-[#004A74] text-white' : 'border-gray-200'}`}>{config.selectedPublicationIds.includes(p.id) && <Check size={10} strokeWidth={4} />}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#004A74] uppercase truncate">{p.title}</p>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">YEAR: {p.year}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Activities Selection */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2"><ClipboardCheck size={16} /> Activities</h3>
                {!isLoading && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-100 mr-2">
                      <input type="number" placeholder="From" className="w-10 bg-transparent border-none outline-none text-[9px] font-black text-[#004A74] text-center p-0" value={actFilter.start} onChange={e => setActFilter({...actFilter, start: e.target.value})} />
                      <span className="text-gray-300 text-[9px]">-</span>
                      <input type="number" placeholder="To" className="w-10 bg-transparent border-none outline-none text-[9px] font-black text-[#004A74] text-center p-0" value={actFilter.end} onChange={e => setActFilter({...actFilter, end: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => bulkToggle('selectedActivityIds', filteredActs, true)} className="text-[10px] font-black text-[#004A74] hover:underline uppercase">All</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => bulkToggle('selectedActivityIds', filteredActs, false)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {isLoading ? (
                  <SelectionSkeleton count={4} height="64px" />
                ) : filteredActs.length === 0 ? (
                  <p className="text-[10px] font-bold text-gray-300 uppercase italic p-4 text-center">No activities matching filters</p>
                ) : (
                  filteredActs.map(a => (
                    <div key={a.id} onClick={() => toggleSelection('selectedActivityIds', a.id)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${config.selectedActivityIds.includes(a.id) ? 'border-[#004A74] bg-[#004A74]/5' : 'border-gray-100 opacity-60'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${config.selectedActivityIds.includes(a.id) ? 'bg-[#004A74] border-[#004A74] text-white' : 'border-gray-200'}`}>{config.selectedActivityIds.includes(a.id) && <Check size={10} strokeWidth={4} />}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#004A74] uppercase truncate">{a.eventName}</p>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">YEAR: {new Date(a.startDate).getFullYear()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* PROFESSIONAL STATEMENT */}
          <div className="space-y-6 pt-10 border-t border-gray-100">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-sm font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2"><Sparkles size={18} className="text-[#FED400]" /> Professional Statement</h3>
              {!isLoading && (
                <button 
                  onClick={handleGenerateSummary} 
                  disabled={isGenerating} 
                  className="px-6 py-2.5 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Draft with AI
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="w-full h-[250px] skeleton rounded-[3rem]" />
            ) : (
              <textarea 
                className="w-full p-10 bg-white border border-gray-200 rounded-[3rem] shadow-inner outline-none text-sm font-medium text-[#004A74] leading-relaxed italic text-center resize-none transition-all focus:ring-4 focus:ring-[#004A74]/5 min-h-[250px]" 
                placeholder="Draft your executive summary or use the AI Architect..." 
                value={config.aiSummary} 
                onChange={e => setConfig({...config, aiSummary: e.target.value})} 
              />
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-center pt-10">
            <button 
              onClick={handleFinalSubmit} 
              disabled={isGenerating || isLoading} 
              className={`w-full max-w-2xl py-6 bg-[#004A74] text-[#FED400] rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-2xl transition-all flex items-center justify-center gap-4 ${isGenerating || isLoading ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95'}`}
            >
              {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              {isGenerating ? 'Architecting PDF...' : isLoading ? 'Synchronizing Intelligence...' : 'Synchronize & Generate CV'}
            </button>
          </div>
        </div>
      </FormContentArea>

      {/* SUCCESS MODAL */}
      {generatedCv && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-2xl border border-gray-100 text-center space-y-8">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-emerald-100">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tighter mb-2">CV Generated!</h2>
              <p className="text-xs font-medium text-gray-400">Your synthesis is ready and archived in the cloud.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.open(`https://drive.google.com/file/d/${generatedCv.fileId}/view`, '_blank')}
                className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-all"
              >
                <ExternalLink size={18} /> Open CV
              </button>
              <button 
                onClick={() => navigate('/cv-architect')}
                className="w-full py-4 bg-gray-50 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
              >
                Go to Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.2); }
      `}</style>
    </FormPageContainer>
  );
};

export default CVForm;