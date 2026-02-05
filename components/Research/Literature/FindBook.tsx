import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
// Fix: Removed duplicate 'Book' identifier from lucide-react imports
import { 
  Search, 
  Archive, 
  ExternalLink, 
  Sparkles, 
  Save, 
  X, 
  BookOpen,
  Book, 
  ChevronRight,
  Info,
  Calendar,
  Loader2,
  Library as LibraryIcon
} from 'lucide-react';
import { LiteratureArticle } from '../../../types';
import { searchBooks, archiveBook, getBookSearchCache, setBookSearchCache } from '../../../services/LiteratureService';
import { showXeenapsToast } from '../../../utils/toastUtils';

const FindBook: React.FC = () => {
  const navigate = useNavigate();
  
  const cache = getBookSearchCache();
  const [query, setQuery] = useState(cache.query);
  const [yearStart, setYearStart] = useState<string>(cache.yearStart);
  const [yearEnd, setYearEnd] = useState<string>(cache.yearEnd);
  const [results, setResults] = useState<LiteratureArticle[]>(cache.results);
  
  const [isSearching, setIsSearching] = useState(false);
  const [previewItem, setPreviewItem] = useState<LiteratureArticle | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [itemToSave, setItemToSave] = useState<LiteratureArticle | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    const data = await searchBooks(
      query, 
      yearStart ? parseInt(yearStart) : undefined, 
      yearEnd ? parseInt(yearEnd) : undefined
    );
    
    const sortedData = [...data].sort((a, b) => (b.year || 0) - (a.year || 0));
    setResults(sortedData);
    setBookSearchCache({ query, yearStart, yearEnd, results: sortedData });
    
    setIsSearching(false);
    if (data.length === 0) {
      showXeenapsToast('info', 'No books found. Try different titles.');
    }
  };

  const handleOpenSaveModal = (item: LiteratureArticle) => {
    setItemToSave(item);
    setSaveLabel('');
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!itemToSave || !saveLabel.trim()) return;
    
    setIsArchiving(true);
    const success = await archiveBook(itemToSave, saveLabel);
    setIsArchiving(false);

    if (success) {
      showXeenapsToast('success', 'Book archived successfully');
      setIsSaveModalOpen(false);
      setItemToSave(null);
    } else {
      showXeenapsToast('error', 'Failed to archive book');
    }
  };

  const handleAddToLibrary = (item: LiteratureArticle) => {
    if (!item.isbn) {
      showXeenapsToast('warning', 'No ISBN identifier found for this book.');
      return;
    }
    navigate('/add', { state: { prefilledDoi: item.isbn } });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar bg-white animate-in fade-in duration-500">
      <div className="px-6 md:px-10 py-8 border-b border-gray-100 bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight leading-none">Find Book</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Global Book Database Discovery</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/archived-books')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-[#004A74] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#FED400]/20 transition-all shadow-sm group"
          >
            <Archive className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Book Archive
          </button>
        </div>

        <form onSubmit={handleSearch} className="max-w-4xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#004A74] transition-colors" />
              <input 
                type="text"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-[#004A74]/5 focus:border-[#004A74]/30 text-sm font-bold text-[#004A74] transition-all placeholder:text-gray-300"
                placeholder="Search book title, author, or ISBN..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 shrink-0">
               <Calendar className="w-4 h-4 text-gray-400 ml-2" />
               <input 
                 type="number" 
                 placeholder="From" 
                 className="w-16 bg-transparent border-none outline-none text-[10px] font-black text-[#004A74] text-center"
                 value={yearStart}
                 onChange={(e) => setYearStart(e.target.value)}
               />
               <span className="text-gray-300">-</span>
               <input 
                 type="number" 
                 placeholder="To" 
                 className="w-16 bg-transparent border-none outline-none text-[10px] font-black text-[#004A74] text-center"
                 value={yearEnd}
                 onChange={(e) => setYearEnd(e.target.value)}
               />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="px-10 py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-[#004A74]/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="px-6 md:px-10 py-10">
        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 w-full skeleton rounded-[2.5rem]" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-20 py-20">
            <Book className="w-20 h-20 mb-4 text-[#004A74]" />
            <h3 className="text-lg font-black text-[#004A74] uppercase tracking-[0.3em]">Explore Library</h3>
            <p className="text-sm font-medium mt-2">Discover physical and digital books repository.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
            {results.map((book) => (
              <div 
                key={book.paperId}
                onClick={() => setPreviewItem(book)}
                className="group bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col h-full cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">
                    {book.year || 'n.d.'}
                  </span>
                </div>

                <h3 className="text-sm font-black text-[#004A74] leading-tight mb-4 uppercase line-clamp-3 flex-1 group-hover:text-blue-600 transition-colors">
                  {book.title}
                </h3>

                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-6 truncate italic">
                  {book.authors?.map(a => a.name).join(', ') || 'Unknown Authors'}
                </p>

                <div className="h-px bg-gray-50 mb-6" />

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(book); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-[#004A74] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                  >
                    <Book className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenSaveModal(book); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#004A74] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#003859] transition-all active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] border border-white/20">
            <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                    <Book className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight truncate max-w-md">Book Metadata</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Global Repository Identity</p>
                  </div>
               </div>
               <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
                  <X className="w-8 h-8" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-6">
               <div className="space-y-4">
                  <h1 className="text-2xl font-black text-[#004A74] leading-tight uppercase">{previewItem.title}</h1>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[10px] font-black uppercase tracking-widest rounded-full">{previewItem.year || 'n.d.'}</span>
                    <p className="text-sm font-bold text-gray-600 italic">{previewItem.authors?.map(a => a.name).join(', ')}</p>
                  </div>
               </div>

               <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100/50 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-[#004A74] uppercase tracking-[0.2em]">
                     <Info className="w-4 h-4" /> Validity Warning
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    This metadata may be irrelevant or invalid. You can access the full book details and availability on their official platform.
                  </p>
               </div>

               {previewItem.isbn && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                     <span className="text-[9px] font-black uppercase tracking-widest">ISBN:</span>
                     <span className="font-mono text-[11px] text-[#004A74] opacity-70">{previewItem.isbn}</span>
                  </div>
               )}
            </div>

            <div className="px-10 py-8 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/30">
               <button 
                 onClick={() => window.open(previewItem.url, '_blank')}
                 className="px-6 py-4 text-gray-400 bg-white border border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:text-[#004A74] transition-all flex items-center gap-2"
               >
                 <ExternalLink className="w-4 h-4" /> Open Library
               </button>
               
               <div className="flex items-center gap-3">
                 {previewItem.isbn && (
                    <button 
                      onClick={() => handleAddToLibrary(previewItem)}
                      className="px-8 py-4 bg-[#FED400] text-[#004A74] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#FED400]/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <LibraryIcon className="w-4 h-4" /> Add to Library
                    </button>
                 )}
                 <button 
                   onClick={() => handleOpenSaveModal(previewItem)}
                   className="px-8 py-4 bg-[#004A74] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#004A74]/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                 >
                   <Save className="w-4 h-4" /> Archive Book
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-in zoom-in-95">
           <div className="bg-white p-8 md:p-12 rounded-[3rem] w-full max-w-md shadow-2xl relative border border-gray-100 text-center">
              <div className="w-16 h-16 bg-[#FED400]/20 text-[#004A74] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <Save className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight mb-2">Assign Label</h3>
              <p className="text-xs font-medium text-gray-400 mb-8">Set a label for this book in your archive.</p>
              
              <div className="space-y-6">
                 <input 
                    autoFocus
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-[#004A74]/5 focus:border-[#004A74]/30 text-sm font-bold text-[#004A74] text-center uppercase tracking-widest"
                    placeholder="e.g. TEXTBOOK, REFERENCE..."
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
                 />
                 
                 <div className="flex gap-3">
                    <button 
                      onClick={() => setIsSaveModalOpen(false)}
                      disabled={isArchiving}
                      className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleConfirmSave}
                      disabled={isArchiving || !saveLabel.trim()}
                      className="flex-1 py-4 bg-[#004A74] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#004A74]/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      Archive
                    </button>
                 </div>
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
    </div>
  );
};

export default FindBook;
