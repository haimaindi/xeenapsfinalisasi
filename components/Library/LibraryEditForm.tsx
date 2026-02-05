
import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { SourceType, FileFormat, LibraryItem, LibraryType } from '../../types';
import { saveLibraryItem } from '../../services/gasService';
import { GAS_WEB_APP_URL } from '../../constants';
import { 
  CheckIcon, 
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Bold, Italic } from 'lucide-react';
import { showXeenapsAlert, XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
// Fix: Added missing import for showXeenapsToast to resolve the "Cannot find name" error
import { showXeenapsToast } from '../../utils/toastUtils';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';

interface LibraryEditFormProps {
  onComplete: () => void;
  items: LibraryItem[];
}

const AbstractEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  disabled?: boolean 
}> = ({ value, onChange, disabled }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const updateActiveStates = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    updateActiveStates();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#004A74]/10 focus-within:border-[#004A74]/40 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
        <button type="button" onClick={() => execCommand('bold')} disabled={disabled} className={`p-1.5 rounded-lg transition-all ${isBold ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => execCommand('italic')} disabled={disabled} className={`p-1.5 rounded-lg transition-all ${isItalic ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}><Italic className="w-4 h-4" /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => {
          onChange(e.currentTarget.innerHTML);
          updateActiveStates();
        }}
        onKeyUp={updateActiveStates}
        onMouseUp={updateActiveStates}
        className="p-5 text-sm min-h-[180px] outline-none leading-relaxed custom-scrollbar font-medium text-gray-700"
        {...({ "data-placeholder": "Abstract content will appear here..." } as any)}
      />
    </div>
  );
};

const LibraryEditForm: React.FC<LibraryEditFormProps> = ({ onComplete, items = [] }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(true);

  const CATEGORY_OPTIONS = [
    "Algorithm", "Blog Post", "Book", "Book Chapter", "Business Report", "Case Report", "Case Series", 
    "Checklist", "Checklist Model", "Clinical Guideline", "Conference Paper", "Course Module", "Dataset", 
    "Dissertation", "Exam Bank", "Form", "Framework", "Guideline (Non-Clinical)", "Idea Draft", "Image", 
    "Infographic", "Journal Entry", "Lecture Note", "Magazine Article", "Manual", "Meeting Note", "Memo", 
    "Meta-analysis", "Mindmap", "Model", "Newspaper Article", "Original Research", "Podcast", "Policy Brief", 
    "Preprint", "Presentation Slide", "Proceedings", "Project Document", "Proposal", "Protocol", "Rapid Review", 
    "Reflection", "Review Article", "Scoping Review", "Standard Operating Procedure (SOP)", "Study Guide", 
    "Syllabus", "Summary", "Systematic Review", "Teaching Material", "Technical Report", "Template", "Thesis", 
    "Toolkit", "Video", "Web Article", "Webpage Snapshot", "White Paper", "Working Paper", "Other"
  ];
  
  const [formData, setFormData] = useState({
    type: LibraryType.LITERATURE, 
    category: '',
    topic: '',
    subTopic: '',
    title: '',
    authors: [] as string[],
    publisher: '',
    journalName: '',
    volume: '',
    issue: '',
    pages: '',
    year: '',
    fullDate: '',
    doi: '',
    issn: '',
    isbn: '',
    pmid: '',
    arxivId: '',
    bibcode: '',
    abstract: '',
    mainInfo: '', 
    keywords: [] as string[],
    labels: [] as string[],
    url: '',
    fileId: '',
    imageView: '',
    extractedText: '' 
  });

  useEffect(() => {
    const existingItem = items.find(i => i.id === id);
    if (existingItem) {
      setFormData({
        type: existingItem.type,
        category: existingItem.category || '',
        topic: existingItem.topic || '',
        subTopic: existingItem.subTopic || '',
        title: existingItem.title || '',
        authors: existingItem.authors || [],
        publisher: existingItem.publisher || '',
        journalName: existingItem.pubInfo?.journal || '',
        volume: existingItem.pubInfo?.vol || '',
        issue: existingItem.pubInfo?.issue || '',
        pages: existingItem.pubInfo?.pages || '',
        year: existingItem.year || '',
        fullDate: existingItem.fullDate || '',
        doi: existingItem.identifiers?.doi || '',
        issn: existingItem.identifiers?.issn || '',
        isbn: existingItem.identifiers?.isbn || '',
        pmid: existingItem.identifiers?.pmid || '',
        arxivId: existingItem.identifiers?.arxiv || '',
        bibcode: existingItem.identifiers?.bibcode || '',
        abstract: existingItem.abstract || '',
        mainInfo: existingItem.mainInfo || '',
        keywords: existingItem.tags?.keywords || [],
        labels: existingItem.tags?.labels || [],
        url: existingItem.url || '',
        fileId: existingItem.fileId || '',
        imageView: existingItem.imageView || '',
        extractedText: ''
      });
      setIsLoadingItem(false);
    } else if (items.length > 0) {
      showXeenapsAlert({ icon: 'error', title: 'NOT FOUND', text: 'Collection item not found in local library.' });
      navigate('/');
    }
  }, [id, items, navigate]);

  const existingValues = useMemo(() => ({
    topics: Array.from(new Set(items.map(i => i.topic).filter(Boolean))),
    subTopics: Array.from(new Set(items.map(i => i.subTopic).filter(Boolean))),
    publishers: Array.from(new Set(items.map(i => i.publisher).filter(Boolean))),
    journalNames: Array.from(new Set(items.map(i => i.journalName).filter(Boolean))),
    allAuthors: Array.from(new Set(items.flatMap(i => i.authors || []).filter(Boolean))),
    allKeywords: Array.from(new Set(items.flatMap(i => i.tags?.keywords || []).filter(Boolean))),
    allLabels: Array.from(new Set(items.flatMap(i => i.tags?.labels || []).filter(Boolean))),
  }), [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    Swal.fire({ title: 'Updating Item...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...XEENAPS_SWAL_CONFIG });
    
    try {
      const existingItem = items.find(i => i.id === id);
      const updatedItem: any = { 
        ...existingItem,
        ...formData, 
        id: id,
        updatedAt: new Date().toISOString(), 
        pubInfo: { journal: formData.journalName, vol: formData.volume, issue: formData.issue, pages: formData.pages }, 
        identifiers: { doi: formData.doi, issn: formData.issn, isbn: formData.isbn, pmid: formData.pmid, arxiv: formData.arxivId, bibcode: formData.bibcode }, 
        tags: { keywords: formData.keywords, labels: formData.labels }
      };
      
      const res = await fetch(GAS_WEB_APP_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'saveItem', item: updatedItem }) 
      });
      const result = await res.json();
      Swal.close();
      
      if (result.status === 'success') { 
        onComplete(); 
        // Redirect to main and auto-open detail view for the edited item
        navigate('/', { state: { openItem: updatedItem }, replace: true }); 
        showXeenapsToast('success', 'Update successful');
      } else {
        showXeenapsAlert({ icon: 'error', title: 'UPDATE FAILED', text: result.message || 'Error occurred.' });
      }
    } catch (err) {
      Swal.close();
      showXeenapsAlert({ icon: 'error', title: 'CONNECTION ERROR', text: 'Failed to update item on server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; 
    if (!val) { setFormData(prev => ({ ...prev, fullDate: '' })); return; }
    const d = new Date(val);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    setFormData(prev => ({ ...prev, fullDate: formatted }));
  };

  const getHtmlDateValue = (fullDate: string) => {
    if (!fullDate) return "";
    try {
      const parts = fullDate.split(' ');
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const m = months.indexOf(parts[1]);
        if (m === -1) return "";
        const d = new Date(parseInt(parts[2]), m, parseInt(parts[0]));
        const offset = d.getTimezoneOffset();
        const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
        return adjustedDate.toISOString().split('T')[0];
      }
    } catch(e) {}
    return "";
  };

  if (isLoadingItem) return null;

  return (
    <FormPageContainer>
      <FormStickyHeader title="Update Collection" subtitle="Refining your collection" onBack={() => {
        const item = items.find(i => i.id === id);
        navigate('/', { state: { openItem: item }, replace: true });
      }} />
      <FormContentArea>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Type" required><FormDropdown value={formData.type} onChange={(v) => setFormData({...formData, type: v as LibraryType})} options={Object.values(LibraryType)} placeholder="Select type..." disabled={isSubmitting} allowCustom={false} /></FormField>
            <FormField label="Category" required><FormDropdown value={formData.category} onChange={(v) => setFormData({...formData, category: v})} options={CATEGORY_OPTIONS} placeholder="Select category..." disabled={isSubmitting} /></FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Topic" required><FormDropdown value={formData.topic} onChange={(v) => setFormData({...formData, topic: v})} options={existingValues.topics} placeholder="Scientific topic..." disabled={isSubmitting} /></FormField>
            <FormField label="Sub Topic"><FormDropdown value={formData.subTopic} onChange={(v) => setFormData({...formData, subTopic: v})} options={existingValues.subTopics} placeholder="Specific area..." disabled={isSubmitting} /></FormField>
          </div>

          <FormField label="Title"><input className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#004A74]" placeholder="Enter title..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isSubmitting} /></FormField>
          <FormField label="Author(s)"><FormDropdown isMulti multiValues={formData.authors} onAddMulti={(v) => setFormData({...formData, authors: [...formData.authors, v]})} onRemoveMulti={(v) => setFormData({...formData, authors: formData.authors.filter(a => a !== v)})} options={existingValues.allAuthors} placeholder="Identify authors..." value="" onChange={() => {}} disabled={isSubmitting} /></FormField>

          <div className="space-y-6 bg-gray-50/30 p-6 rounded-[2rem] border border-gray-100">
            <FormField label="Publisher"><FormDropdown value={formData.publisher} onChange={(v) => setFormData({...formData, publisher: v})} options={existingValues.publishers} placeholder="Publisher name..." disabled={isSubmitting} /></FormField>
            <FormField label="Journal"><FormDropdown value={formData.journalName} onChange={(v) => setFormData({...formData, journalName: v})} options={existingValues.journalNames} placeholder="Journal name..." disabled={isSubmitting} /></FormField>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Volume"><input className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-sm" placeholder="Volume" value={formData.volume} onChange={(e) => setFormData({...formData, volume: e.target.value})} disabled={isSubmitting} /></FormField>
              <FormField label="Issue"><input className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-sm" placeholder="Issue" value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})} disabled={isSubmitting} /></FormField>
              <FormField label="Pages"><input className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-sm" placeholder="Pages" value={formData.pages} onChange={(e) => setFormData({...formData, pages: e.target.value})} disabled={isSubmitting} /></FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Year"><input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-mono font-bold" placeholder="YYYY" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value.substring(0, 4)})} disabled={isSubmitting} /></FormField>
            <FormField label="Date"><input type="date" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-mono font-bold" value={getHtmlDateValue(formData.fullDate)} onChange={handleDateChange} disabled={isSubmitting} /></FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
            <FormField label="DOI"><input className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-mono" placeholder="DOI" value={formData.doi} onChange={(e) => setFormData({...formData, doi: e.target.value})} disabled={isSubmitting} /></FormField>
            <FormField label="ISBN"><input className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-mono" placeholder="ISBN" value={formData.isbn} onChange={(e) => setFormData({...formData, isbn: e.target.value})} disabled={isSubmitting} /></FormField>
            <FormField label="PMID"><input className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-mono" placeholder="PMID" value={formData.pmid} onChange={(e) => setFormData({...formData, pmid: e.target.value})} disabled={isSubmitting} /></FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Keyword(s)"><FormDropdown isMulti multiValues={formData.keywords} onAddMulti={(v) => setFormData({...formData, keywords: [...formData.keywords, v]})} onRemoveMulti={(v) => setFormData({...formData, keywords: formData.keywords.filter(k => k !== v)})} options={existingValues.allKeywords} placeholder="Select or type..." value="" onChange={() => {}} disabled={isSubmitting} /></FormField>
            <FormField label="Label(s)"><FormDropdown isMulti multiValues={formData.labels} onAddMulti={(v) => setFormData({...formData, labels: [...formData.labels, v]})} onRemoveMulti={(v) => setFormData({...formData, labels: formData.labels.filter(l => l !== v)})} options={existingValues.allLabels} placeholder="Thematic labels..." value="" onChange={() => {}} disabled={isSubmitting} /></FormField>
          </div>

          <FormField label="Abstract">
            <AbstractEditor value={formData.abstract} onChange={(val) => setFormData({...formData, abstract: val})} disabled={isSubmitting} />
          </FormField>

          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button type="button" onClick={() => {
              const item = items.find(i => i.id === id);
              navigate('/', { state: { openItem: item }, replace: true });
            }} disabled={isSubmitting} className="w-full md:px-10 py-5 bg-gray-100 text-gray-400 rounded-[1.5rem] font-black text-sm uppercase">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-[#004A74] text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 uppercase">{isSubmitting ? 'UPDATING DATA...' : <><CheckIcon className="w-5 h-5" /> Save Changes</>}</button>
          </div>
        </form>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default LibraryEditForm;
