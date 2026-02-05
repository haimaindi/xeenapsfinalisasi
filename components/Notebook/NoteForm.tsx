import React, { useState, useEffect, useRef } from 'react';
import { NoteItem, NoteContent, NoteAttachment, LibraryItem } from '../../types';
import { saveNote, fetchNoteContent, uploadNoteAttachment } from '../../services/NoteService';
import { deleteRemoteFile } from '../../services/ActivityService';
import { 
  X, 
  Save, 
  StickyNote, 
  Link as LinkIcon, 
  Paperclip, 
  Trash2, 
  Plus, 
  Loader2,
  Bold,
  Italic,
  Globe,
  FileIcon,
  ChevronRight,
  ImageIcon
} from 'lucide-react';
import { FormField } from '../Common/FormComponents';
import { showXeenapsToast } from '../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

interface NoteFormProps {
  note?: NoteItem;
  collectionId?: string;
  onClose: () => void;
  onComplete: (item: NoteItem, content: NoteContent) => void;
  libraryItems?: LibraryItem[];
}

const RichEditor: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
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

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    updateActiveStates();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="flex flex-col rounded-[2rem] border border-gray-200 overflow-hidden bg-white shadow-sm focus-within:ring-4 focus-within:ring-[#004A74]/5 transition-all">
       <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
          <button 
            type="button" 
            onClick={() => exec('bold')} 
            className={`p-2 rounded-xl transition-all ${isBold ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}
          >
            <Bold size={16} />
          </button>
          <button 
            type="button" 
            onClick={() => exec('italic')} 
            className={`p-2 rounded-xl transition-all ${isItalic ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}
          >
            <Italic size={16} />
          </button>
       </div>
       <div 
         ref={editorRef}
         contentEditable 
         onInput={(e) => {
           onChange(e.currentTarget.innerHTML);
           updateActiveStates();
         }}
         onKeyUp={updateActiveStates}
         onMouseUp={updateActiveStates}
         className="p-8 text-sm min-h-[300px] outline-none leading-relaxed text-[#004A74] font-medium"
         {...({ "data-placeholder": "Start composing your knowledge anchor..." } as any)}
       />
    </div>
  );
};

const NoteForm: React.FC<NoteFormProps> = ({ note, collectionId, onClose, onComplete, libraryItems = [] }) => {
  const [isLoading, setIsLoading] = useState(!!note);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingUploadsCount, setPendingUploadsCount] = useState(0);
  
  const [metadata, setMetadata] = useState<NoteItem>(note || {
    id: crypto.randomUUID(),
    collectionId: collectionId || '',
    collectionTitle: '',
    label: '',
    noteJsonId: '',
    storageNodeUrl: '',
    isFavorite: false,
    isUsed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [content, setContent] = useState<NoteContent>({
    description: '',
    attachments: []
  });

  // Track background uploads to wait on save or cleanup on cancel
  const uploadPromises = useRef<Map<string, Promise<any>>>(new Map());
  const newlyUploadedFiles = useRef<{fileId: string, nodeUrl: string}[]>([]);

  useEffect(() => {
    if (note?.noteJsonId) {
      const load = async () => {
        const data = await fetchNoteContent(note.noteJsonId, note.storageNodeUrl);
        if (data) setContent(data);
        setIsLoading(false);
      };
      load();
    }
  }, [note]);

  const handleAddLink = () => {
    setContent(prev => ({ ...prev, attachments: [...prev.attachments, { type: 'LINK', label: '', url: '' }] }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempId = crypto.randomUUID();
    let previewUrl: string | undefined;

    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    // INSTANT UI FEEDBACK (OPTIMISTIC)
    const placeholder: NoteAttachment = {
      type: 'FILE',
      label: file.name, // Initial value automatically matches filename
      url: previewUrl, 
      fileId: `pending_${tempId}`,
      mimeType: file.type
    };

    setContent(prev => ({ ...prev, attachments: [...prev.attachments, placeholder] }));
    setPendingUploadsCount(prev => prev + 1);

    // START PARALLEL SYNC
    const uploadPromise = uploadNoteAttachment(file).then(result => {
      if (result) {
        newlyUploadedFiles.current.push({ fileId: result.fileId, nodeUrl: result.nodeUrl });
        
        // Smart URL mapping based on file type
        const finalUrl = result.mimeType.startsWith('image/') 
          ? `https://lh3.googleusercontent.com/d/${result.fileId}`
          : `https://drive.google.com/file/d/${result.fileId}/view`;

        // Update the item once finished
        setContent(prev => ({
          ...prev,
          attachments: prev.attachments.map(at => 
            at.fileId === `pending_${tempId}` 
              ? { ...at, fileId: result.fileId, nodeUrl: result.nodeUrl, url: finalUrl } 
              : at
          )
        }));
      } else {
        // Silent rollback on error
        setContent(prev => ({
          ...prev,
          attachments: prev.attachments.filter(at => at.fileId !== `pending_${tempId}`)
        }));
      }
      setPendingUploadsCount(prev => Math.max(0, prev - 1));
      uploadPromises.current.delete(tempId);
    }).catch(() => {
      setPendingUploadsCount(prev => Math.max(0, prev - 1));
      uploadPromises.current.delete(tempId);
    });

    uploadPromises.current.set(tempId, uploadPromise);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = async () => {
    if (newlyUploadedFiles.current.length > 0) {
      // Background Cleanup
      newlyUploadedFiles.current.forEach(f => {
        deleteRemoteFile(f.fileId, f.nodeUrl);
      });
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadata.label.trim() || pendingUploadsCount > 0) return;

    // --- OPTIMISTIC UI: Close and Notify Parent Instantly with updated metadata ---
    const finalContent = { ...content };
    let finalMetadata = { ...metadata, updatedAt: new Date().toISOString() };
    if (finalMetadata.collectionId && libraryItems.length > 0) {
      const col = libraryItems.find(it => it.id === finalMetadata.collectionId);
      if (col) finalMetadata.collectionTitle = col.title;
    }
    
    onComplete(finalMetadata, finalContent);
    
    // START SILENT BACKGROUND PROCESS
    (async () => {
      if (uploadPromises.current.size > 0) {
        await Promise.all(uploadPromises.current.values());
      }
      // Silent sync to cloud
      await saveNote(finalMetadata, finalContent);
    })();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-full border border-white/20">
        
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                 <StickyNote size={24} />
              </div>
              <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">{note ? 'Refine Note' : 'Create Knowledge Anchor'}</h2>
           </div>
           <button onClick={handleCancel} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-12">
           
           <FormField label="Note Label / Summary Title" required>
              <input 
                required
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-lg font-black text-[#004A74] uppercase outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all"
                value={metadata.label}
                onChange={e => setMetadata({...metadata, label: e.target.value.toUpperCase()})}
                placeholder="ENTER LABEL..."
              />
           </FormField>

           <FormField label="Knowledge Description (Rich Text)">
              <RichEditor value={content.description} onChange={v => setContent({...content, description: v})} />
           </FormField>

           <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2"><Paperclip size={14} /> Attachments Matrix</h3>
                 <div className="flex gap-2">
                    <button type="button" onClick={handleAddLink} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#004A74] hover:bg-gray-50 shadow-sm transition-all"><LinkIcon size={12} /> Add Link</button>
                    <label className="flex items-center gap-1.5 px-4 py-2 bg-[#004A74] text-white rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#003859] shadow-md transition-all">
                       <Plus size={12} /> Attach File
                       <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                    </label>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {content.attachments.map((at, idx) => {
                    const isPending = at.fileId?.startsWith('pending_');
                    const isImage = at.mimeType?.startsWith('image/') || at.url?.includes('lh3.googleusercontent');

                    return (
                      <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group animate-in slide-in-from-bottom-2 relative overflow-hidden">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#004A74]/30 shadow-sm overflow-hidden shrink-0 relative">
                            {isImage ? (
                               <img src={at.url} className="w-full h-full object-cover" />
                            ) : at.type === 'LINK' ? (
                               <Globe size={18} />
                            ) : (
                               <FileIcon size={18} />
                            )}
                            {isPending && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                                <Loader2 size={16} className="text-[#004A74] animate-spin" />
                              </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <input 
                              className="w-full bg-transparent border-none p-0 text-[10px] font-black text-[#004A74] uppercase outline-none"
                              placeholder="LABEL..."
                              value={at.label}
                              onChange={e => {
                                const newAt = [...content.attachments];
                                newAt[idx].label = e.target.value;
                                setContent({...content, attachments: newAt});
                              }}
                            />
                            {at.type === 'LINK' ? (
                              <input 
                                className="w-full bg-transparent border-none p-0 text-[9px] font-medium text-blue-500 underline outline-none"
                                placeholder="https://..."
                                value={at.url}
                                onChange={e => {
                                  const newAt = [...content.attachments];
                                  newAt[idx].url = e.target.value;
                                  setContent({...content, attachments: newAt});
                                }}
                              />
                            ) : (
                               <div className="flex items-center justify-between pr-2">
                                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{at.type}</span>
                               </div>
                            )}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            setContent({...content, attachments: content.attachments.filter((_, i) => i !== idx)});
                          }}
                          className="p-2 text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                           <Trash2 size={16} />
                        </button>
                      </div>
                    );
                 })}
              </div>
           </div>

           <div className="pt-10 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting || !metadata.label.trim() || pendingUploadsCount > 0}
                className={`w-full md:w-auto px-12 py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all flex items-center justify-center gap-3 ${isSubmitting || pendingUploadsCount > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              >
                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                 {isSubmitting ? 'SYNCHRONIZING...' : 'AUTHORIZE & SAVE'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default NoteForm;