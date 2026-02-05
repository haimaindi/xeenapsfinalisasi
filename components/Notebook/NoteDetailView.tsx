import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NoteItem, NoteContent, NoteAttachment } from '../../types';
import { fetchNoteContent } from '../../services/NoteService';
import { 
  X, 
  Clock, 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  Library, 
  Paperclip, 
  Eye, 
  Globe,
  FileIcon
} from 'lucide-react';

interface NoteDetailViewProps {
  note: NoteItem;
  initialContent?: NoteContent | null;
  onClose: () => void;
  onUpdate?: (updatedNote: NoteItem) => void;
  isMobileSidebarOpen?: boolean;
}

const NoteDetailView: React.FC<NoteDetailViewProps> = ({ note, initialContent, onClose, isMobileSidebarOpen }) => {
  const [content, setContent] = useState<NoteContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Handover Optimistic: Gunakan data yang dipassing jika ada (mencegah race condition)
    if (initialContent) {
      setContent(initialContent);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchNoteContent(note.noteJsonId, note.storageNodeUrl);
        setContent(data);
      } catch (e) {
        console.error("Failed to fetch note content", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [note, initialContent]);

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return "-"; }
  };

  return createPortal(
    <div 
      className={`fixed top-0 right-0 bottom-0 z-[2000] bg-white flex flex-col will-change-transform overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-10 border-l border-gray-100 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] ${
        isMobileSidebarOpen ? 'blur-[15px] opacity-40 pointer-events-none scale-[0.98]' : ''
      }`}
      style={{ 
        left: 'var(--sidebar-offset, 0px)',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* Top Header Navigation */}
      <header className="px-6 md:px-10 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all active:scale-90 shadow-sm">
               <ArrowLeft size={20} strokeWidth={3} />
            </button>
            <div className="min-w-0">
               <h2 className="text-sm font-black text-[#004A74] uppercase tracking-widest truncate">View Note</h2>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Knowledge Synthesis Hub</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all active:scale-90">
               <X size={24} />
            </button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
         <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
            
            {/* Read-Only Identity Section */}
            <header className="space-y-8">
               <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">Knowledge Anchor</span>
                  {note.collectionId && (
                     <span className="px-3 py-1 bg-[#FED400]/10 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm"><Library size={10} /> Source Linked</span>
                  )}
               </div>
               
               <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Note Label / Summary Title</label>
                  {/* Visual Fix: Simplified layout to avoid box-in-box conflict */}
                  <div className="w-full border-l-8 border-[#FED400] pl-6 py-2">
                     <h1 className="text-2xl md:text-5xl font-black text-[#004A74] uppercase tracking-tighter leading-tight">
                        {note.label}
                     </h1>
                  </div>
               </div>

               <div className="flex items-center gap-6 pt-4 text-gray-400">
                  <div className="flex items-center gap-2">
                     <Calendar size={14} className="text-[#FED400]" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">{formatFullDate(note.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Clock size={14} />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Last Synced: {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
               </div>
            </header>

            {isLoading ? (
              <div className="space-y-6">
                 <div className="h-[400px] w-full skeleton rounded-[3rem]" />
                 <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 skeleton rounded-2xl" />
                    <div className="h-24 skeleton rounded-2xl" />
                 </div>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in duration-700">
                 
                 {/* Read-Only Synthesis Area */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-gray-400 px-2">
                       <Sparkles size={14} className="text-[#FED400]" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em]">Synthesis Content</span>
                    </div>
                    <div className="bg-white p-8 md:p-12 border border-gray-100 rounded-[3rem] shadow-xl relative min-h-[400px]">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-[#FED400]/5 -translate-y-24 translate-x-24 rounded-full" />
                       <div 
                         className="text-sm md:text-lg leading-[1.8] text-[#004A74] font-medium relative z-10 note-body-output"
                         dangerouslySetInnerHTML={{ __html: content?.description || '<p className="text-gray-300 text-center py-20 uppercase font-black tracking-widest">No narrative provided</p>' }}
                       />
                    </div>
                 </div>

                 {/* Read-Only Documentation Matrix */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2"><Paperclip size={14} /> Documentation Matrix</h3>
                       <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{content?.attachments.length || 0} Assets Linked</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {content?.attachments.map((at, i) => {
                          const isImage = at.mimeType?.startsWith('image/') || at.url?.includes('lh3.googleusercontent');
                          const viewUrl = at.type === 'LINK' 
                             ? at.url 
                             : (isImage 
                                ? at.url 
                                : `https://drive.google.com/file/d/${at.fileId}/view`
                               );

                          return (
                             <div 
                               key={i}
                               className="group relative bg-white border border-gray-100 rounded-[2.5rem] p-5 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col"
                             >
                                <div className="aspect-video bg-gray-50 rounded-[1.5rem] mb-4 overflow-hidden relative border border-gray-100">
                                   {isImage ? (
                                      <img src={viewUrl} className="w-full h-full object-cover" />
                                   ) : at.type === 'LINK' ? (
                                      <div className="w-full h-full flex items-center justify-center text-gray-200"><Globe size={40} /></div>
                                   ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-200"><FileIcon size={40} /></div>
                                   )}
                                   
                                   <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button 
                                        onClick={() => viewUrl && window.open(viewUrl, '_blank')}
                                        className="p-3 bg-[#FED400] text-[#004A74] rounded-full hover:scale-110 transition-all shadow-lg"
                                      >
                                           <Eye size={20} />
                                      </button>
                                   </div>
                                </div>

                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-[#004A74] uppercase truncate">{at.label}</p>
                                   <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{at.type}</span>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
            )}

            <footer className="pt-20 pb-10 space-y-3 opacity-20 text-center">
               <Library size={48} className="mx-auto text-[#004A74]" />
               <p className="text-[8px] font-black uppercase tracking-[0.8em] text-[#004A74]">XEENAPS NOTEBOOK INFRASTRUCTURE</p>
            </footer>

         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.08); border-radius: 10px; }
        .note-body-output b { font-weight: 800; color: #004A74; }
        .note-body-output i { font-style: italic; color: #64748B; }
      `}</style>
    </div>,
    document.body
  );
};

export default NoteDetailView;