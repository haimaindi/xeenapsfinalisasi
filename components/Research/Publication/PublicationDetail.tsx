import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore - Resolving TS error for missing exported members useParams, useNavigate, useLocation
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PublicationItem, PublicationStatus } from '../../../types';
import { savePublication, fetchPublicationsPaginated, deletePublication } from '../../../services/PublicationService';
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  Target, 
  Layers,
  FileText,
  Link as LinkIcon,
  Globe,
  Loader2,
  Tag,
  Share2,
  Star,
  Trash2
} from 'lucide-react';
import { showXeenapsToast } from '../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { FormField, FormDropdown } from '../../Common/FormComponents';

const PublicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState<PublicationItem | null>(() => (location.state as any)?.item || null);
  const [isBusy, setIsBusy] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      if (item && item.id === id) return;
      const res = await fetchPublicationsPaginated(1, 1000);
      const found = res.items.find(i => i.id === id);
      if (found) setItem(found);
      else navigate('/research/publication');
    };
    load();
  }, [id, item, navigate]);

  const handleSave = async (updated?: PublicationItem) => {
    const target = updated || item;
    if (!target) return;
    await savePublication({ ...target, updatedAt: new Date().toISOString() });
  };

  useEffect(() => {
    if (!item) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(), 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [item]);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [item?.title]);

  const handleToggleFavorite = async () => {
    if (!item) return;
    const updated = { ...item, isFavorite: !item.isFavorite };
    setItem(updated);
    showXeenapsToast('success', updated.isFavorite ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      setIsBusy(true);
      const success = await deletePublication(item.id);
      if (success) {
        showXeenapsToast('success', 'Publication removed');
        navigate('/research/publication');
      } else {
        setIsBusy(false);
        showXeenapsToast('error', 'Failed to delete');
      }
    }
  };

  if (!item) return <div className="p-10 text-center animate-pulse font-black text-[#004A74] uppercase tracking-widest">Initializing Workspace...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative animate-in slide-in-from-right duration-500">
      {/* HUD Header - Optimized for mobile: Always in row */}
      <header className="px-4 md:px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex flex-row items-center justify-between gap-2 md:gap-4 shrink-0 z-[90]">
         <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <button onClick={() => navigate('/research/publication')} className="p-2 md:p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90 shrink-0">
               <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
               <h2 className="text-sm md:text-xl font-black text-[#004A74] uppercase tracking-tighter truncate">Publication Workspace</h2>
               <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">Output Management & Tracker</p>
            </div>
         </div>
         <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            <button 
              onClick={handleToggleFavorite}
              className="p-2 md:p-3 bg-white text-[#FED400] hover:bg-yellow-50 rounded-xl transition-all shadow-sm active:scale-90 border border-gray-100"
              title="Toggle Favorite"
            >
              <Star size={18} className={item.isFavorite ? "fill-[#FED400]" : ""} />
            </button>
            <button 
              onClick={handleDelete}
              disabled={isBusy}
              className="p-2 md:p-3 bg-white text-red-400 hover:bg-red-50 rounded-xl transition-all shadow-sm active:scale-90 border border-gray-100 disabled:opacity-50"
              title="Delete Publication"
            >
              {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-10">
           
           {/* SECTION 1: FULL WIDTH (TOP) - IDENTITY */}
           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                 <div className="flex-1 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                       <FileText size={14} /> Full Manuscript Title
                    </label>
                    <textarea 
                      ref={titleRef}
                      className="w-full bg-transparent border-none outline-none text-xl md:text-3xl font-black text-[#004A74] uppercase tracking-tighter leading-tight placeholder:text-gray-100 resize-none overflow-hidden"
                      value={item.title}
                      placeholder="ENTER TITLE..."
                      onChange={(e) => setItem({ ...item, title: e.target.value })}
                      rows={1}
                    />
                 </div>
                 <div className="shrink-0 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 flex justify-end">Publication Status</label>
                    <FormDropdown 
                      value={item.status}
                      options={Object.values(PublicationStatus)}
                      onChange={(v) => setItem({ ...item, status: v as PublicationStatus })}
                      placeholder="Select Status"
                      allowCustom={false}
                    />
                 </div>
              </div>
           </div>

           {/* SECTION 2: 2 COLUMN GRID (MIDDLE) - CORE METADATA VS TECHNICAL/DATES */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column: Core Metadata */}
              <div className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2 mb-6">
                    <Layers size={16} className="text-[#FED400]" /> Core Classification
                 </h3>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <FormField label="Publication Type">
                       <FormDropdown 
                         value={item.type}
                         options={['Journal', 'Conference Paper', 'Book Chapter', 'Book', 'Preprint']}
                         onChange={(v) => setItem({ ...item, type: v })}
                         placeholder="Type"
                       />
                    </FormField>
                    <FormField label="Target/Publisher Name">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-[#004A74]" 
                         value={item.publisherName || ''} onChange={(e) => setItem({...item, publisherName: e.target.value})} />
                    </FormField>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <FormField label="Research Domain">
                       <FormDropdown 
                         value={item.researchDomain || ''}
                         options={[]}
                         onChange={(v) => setItem({ ...item, researchDomain: v })}
                         placeholder="e.g. Cardiology"
                         allowCustom={true}
                       />
                    </FormField>
                    <FormField label="Affiliation">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-[#004A74]" 
                         placeholder="Institution name..."
                         value={item.affiliation || ''} onChange={(e) => setItem({...item, affiliation: e.target.value})} />
                    </FormField>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <FormField label="Indexing (Scopus/WoS)">
                       <FormDropdown 
                         value={item.indexing || ''}
                         options={['Scopus', 'Web of Science', 'Sinta', 'Google Scholar', 'Others']}
                         onChange={(v) => setItem({ ...item, indexing: v })}
                         placeholder="Indexing"
                       />
                    </FormField>
                    <FormField label="Quartile (Q1-Q4)">
                       <FormDropdown 
                         value={item.quartile || ''}
                         options={['Q1', 'Q2', 'Q3', 'Q4', 'Non-Q']}
                         onChange={(v) => setItem({ ...item, quartile: v })}
                         placeholder="Rank"
                       />
                    </FormField>
                 </div>

                 <FormField label="Author List">
                    <FormDropdown 
                      isMulti
                      multiValues={item.authors || []}
                      options={['Xeenaps User']}
                      onAddMulti={(v) => setItem({...item, authors: [...(item.authors || []), v]})}
                      onRemoveMulti={(v) => setItem({...item, authors: (item.authors || []).filter(a => a !== v)})}
                      placeholder="Add Authors..."
                      value="" onChange={() => {}}
                    />
                 </FormField>
                 
                 <FormField label="Manuscript / Source Link">
                    <div className="relative group">
                       <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#004A74]" />
                       <input className="w-full bg-gray-50 border-none pl-12 pr-4 py-3 rounded-xl text-xs font-bold text-blue-500 underline outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/10 transition-all" 
                         placeholder="Paste Drive or Web link..."
                         value={item.manuscriptLink || ''} onChange={(e) => setItem({...item, manuscriptLink: e.target.value})} />
                    </div>
                 </FormField>
              </div>

              {/* Right Column: Technical Details & Dates */}
              <div className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2 mb-6">
                    <Globe size={16} className="text-[#FED400]" /> Metadata & Timeline
                 </h3>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="DOI Number">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-mono font-bold text-[#004A74]" 
                         placeholder="10.xxxx/xxx"
                         value={item.doi || ''} onChange={(e) => setItem({...item, doi: e.target.value})} />
                    </FormField>
                    <FormField label="ISSN / ISBN">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-mono font-bold text-[#004A74]" 
                         value={item.issn_isbn || ''} onChange={(e) => setItem({...item, issn_isbn: e.target.value})} />
                    </FormField>
                 </div>

                 <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1"><FormField label="Vol"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.volume || ''} onChange={(e) => setItem({...item, volume: e.target.value})} /></FormField></div>
                    <div className="col-span-1"><FormField label="Issue"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.issue || ''} onChange={(e) => setItem({...item, issue: e.target.value})} /></FormField></div>
                    <div className="col-span-1"><FormField label="Pages"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.pages || ''} onChange={(e) => setItem({...item, pages: e.target.value})} /></FormField></div>
                    <div className="col-span-1"><FormField label="Year"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.year || ''} onChange={(e) => setItem({...item, year: e.target.value})} /></FormField></div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Submission">
                       <input type="date" className="w-full bg-gray-50 border-none px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter" 
                         value={item.submissionDate || ''} onChange={(e) => setItem({...item, submissionDate: e.target.value})} />
                    </FormField>
                    <FormField label="Acceptance">
                       <input type="date" className="w-full bg-gray-50 border-none px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter" 
                         value={item.acceptanceDate || ''} onChange={(e) => setItem({...item, acceptanceDate: e.target.value})} />
                    </FormField>
                    <FormField label="Published">
                       <input type="date" className="w-full bg-gray-50 border-none px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter" 
                         value={item.publicationDate || ''} onChange={(e) => setItem({...item, publicationDate: e.target.value})} />
                    </FormField>
                 </div>
              </div>
           </div>

           {/* SECTION 3: FULL WIDTH (BOTTOM) - CONTENT */}
           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                    <BookOpen size={14} /> Abstract Content
                 </label>
                 <textarea 
                   className="w-full bg-gray-50 p-6 border border-gray-100 rounded-3xl outline-none text-sm font-medium text-[#004A74] leading-relaxed transition-all focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 min-h-[200px]"
                   placeholder="Enter final abstract here..."
                   value={item.abstract || ''}
                   onChange={(e) => setItem({ ...item, abstract: e.target.value })}
                 />
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                    <Target size={14} /> Strategic Keywords
                 </label>
                 <FormDropdown 
                    isMulti
                    multiValues={item.keywords || []}
                    options={[]}
                    onAddMulti={(v) => setItem({...item, authors: [...(item.authors || []), v]})}
                    onRemoveMulti={(v) => setItem({...item, authors: (item.authors || []).filter(a => a !== v)})}
                    placeholder="Add keywords..."
                    value="" onChange={() => {}}
                 />
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                    <Tag size={14} /> Process Remarks / Review Log
                 </label>
                 <textarea 
                   className="w-full bg-[#FED400]/5 p-6 border border-[#FED400]/10 rounded-3xl outline-none text-xs font-bold text-[#004A74] leading-relaxed transition-all focus:bg-white focus:ring-4 focus:ring-[#FED400]/5 min-h-[150px]"
                   placeholder="Notes on review process, editor feedback, etc..."
                   value={item.remarks || ''}
                   onChange={(e) => setItem({ ...item, remarks: e.target.value })}
                 />
              </div>
           </div>

           {/* Branded Footer */}
           <footer className="pt-20 pb-10 space-y-3 opacity-20 text-center">
              <Share2 size={48} className="mx-auto text-[#004A74]" />
              <p className="text-[8px] font-black uppercase tracking-[0.8em] text-[#004A74]">XEENAPS PUBLICATION INFRASTRUCTURE</p>
           </footer>
        </div>
      </div>
    </div>
  );
};

export default PublicationDetail;