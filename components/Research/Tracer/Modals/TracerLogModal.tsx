import React, { useState, useEffect, useRef } from 'react';
import { TracerLog, TracerLogContent, TracerLogAttachment } from '../../../../types';
import { fetchFileContent } from '../../../../services/gasService';
import { uploadVaultFile, deleteRemoteFile } from '../../../../services/ActivityService';
import { 
  X, 
  Save, 
  Calendar, 
  FileText, 
  Layout, 
  Clock, 
  Trash2, 
  Bold, 
  Italic,
  Loader2,
  Paperclip,
  Link as LinkIcon,
  Plus,
  PlusCircle,
  Globe,
  FileIcon,
  ImageIcon,
  Eye,
  CloudUpload,
  ExternalLink
} from 'lucide-react';
import { FormField } from '../../../Common/FormComponents';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../../utils/toastUtils';

interface TracerLogModalProps {
  projectId: string;
  log?: TracerLog;
  initialContent?: TracerLogContent;
  onClose: () => void;
  onSave: (item: TracerLog, content: TracerLogContent) => void;
  onDelete: (id: string) => void;
}

const RichEditor: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
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
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm transition-all focus-within:ring-4 focus-within:ring-[#004A74]/5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
        <button type="button" onClick={() => execCommand('bold')} disabled={disabled} className={`p-1.5 rounded-lg transition-all ${isBold ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}><Bold size={14} /></button>
        <button type="button" onClick={() => execCommand('italic')} disabled={disabled} className={`p-1.5 rounded-lg transition-all ${isItalic ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}><Italic size={14} /></button>
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
        className="p-5 text-sm min-h-[200px] outline-none leading-relaxed custom-scrollbar font-medium text-gray-700"
        {...({ "data-placeholder": "Describe what happened..." } as any)}
      />
      <style>{`[contenteditable]:empty:before { content: attr(data-placeholder); color: #9CA3AF; pointer-events: none; display: block; }`}</style>
    </div>
  );
};

const TracerLogModal: React.FC<TracerLogModalProps> = ({ projectId, log, initialContent, onClose, onSave, onDelete }) => {
  const [isLoadingContent, setIsLoadingContent] = useState(!!log && !initialContent);
  const [formData, setFormData] = useState<TracerLog>(log || {
    id: crypto.randomUUID(),
    projectId,
    date: new Date().toISOString().split('T')[0],
    title: '',
    logJsonId: '',
    storageNodeUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [content, setContent] = useState<TracerLogContent>(() => {
    if (initialContent) return {
      description: initialContent.description || '',
      attachments: Array.isArray(initialContent.attachments) ? initialContent.attachments : []
    };
    return {
      description: '',
      attachments: []
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPromises = useRef<Map<string, Promise<any>>>(new Map());

  useEffect(() => {
    if (log?.logJsonId && !initialContent) {
      const load = async () => {
        const data = await fetchFileContent(log.logJsonId, log.storageNodeUrl);
        if (data) {
          setContent({
            description: data.description || '',
            attachments: Array.isArray(data.attachments) ? data.attachments : []
          });
        }
        setIsLoadingContent(false);
      };
      load();
    }
  }, [log, initialContent]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const tempId = crypto.randomUUID();
      let previewUrl: string | undefined;

      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      const placeholder: TracerLogAttachment = {
        type: 'FILE',
        label: file.name,
        url: previewUrl, 
        fileId: `pending_${tempId}`,
        mimeType: file.type
      };

      setContent(prev => ({ ...prev, attachments: [...(prev.attachments || []), placeholder] }));

      const uploadPromise = uploadVaultFile(file).then(result => {
        if (result) {
          const isImage = file.type.startsWith('image/');
          const finalUrl = isImage
            ? `https://lh3.googleusercontent.com/d/${result.fileId}`
            : `https://drive.google.com/file/d/${result.fileId}/view`;

          setContent(prev => ({
            ...prev,
            attachments: prev.attachments.map(at => 
              at.fileId === `pending_${tempId}` 
                ? { ...at, fileId: result.fileId, nodeUrl: result.nodeUrl, url: finalUrl } 
                : at
            )
          }));
        } else {
          showXeenapsToast('error', `Failed to upload ${file.name}`);
          setContent(prev => ({ ...prev, attachments: prev.attachments.filter(at => at.fileId !== `pending_${tempId}`) }));
        }
        uploadPromises.current.delete(tempId);
      });
      uploadPromises.current.set(tempId, uploadPromise);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = () => {
    setContent(prev => ({ ...prev, attachments: [...(prev.attachments || []), { type: 'LINK', label: '', url: '' }] }));
  };

  const handleRemoveAttachment = async (idx: number) => {
    const target = content.attachments[idx];
    setContent(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));

    if (target.type === 'FILE' && target.fileId && target.nodeUrl && !target.fileId.startsWith('pending_')) {
      deleteRemoteFile(target.fileId, target.nodeUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    if (uploadPromises.current.size > 0) {
      showXeenapsToast('info', 'Finishing file uploads...');
      await Promise.all(uploadPromises.current.values());
    }

    onSave({ ...formData, updatedAt: new Date().toISOString() }, content);
  };

  const handleDeleteClick = async () => {
    if (!log) return;
    if (await showXeenapsDeleteConfirm(1)) {
      onDelete(log.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                 <Layout size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Journal Record</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{log ? 'Modify Entry' : 'New Chronological Log'}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              {log && (
                <button onClick={handleDeleteClick} className="p-2.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 size={20} /></button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28} /></button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-10">
           {isLoadingContent ? (
             <div className="space-y-10 animate-pulse">
                <div className="h-16 skeleton rounded-2xl"/>
                <div className="h-48 skeleton rounded-2xl"/>
             </div>
           ) : (
             <>
               <FormField label="Log Title" required>
                  <input autoFocus className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-[#004A74] outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="E.G., Phase 1 Data Collection" required />
               </FormField>

               <FormField label="Narrative Synthesis">
                  <RichEditor value={content.description} onChange={v => setContent({...content, description: v})} />
               </FormField>

               <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2"><Paperclip size={14} /> Documentation Matrix</h3>
                    <div className="flex gap-2">
                        <button type="button" onClick={handleAddLink} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#004A74] hover:bg-gray-50 shadow-sm transition-all"><LinkIcon size={12} /> Add Link</button>
                        <label className="flex items-center gap-1.5 px-4 py-2 bg-[#004A74] text-white rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#003859] shadow-md transition-all">
                           <Plus size={12} /> Attach Files
                           <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                        </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {(content.attachments || []).map((at, idx) => {
                        const isPending = at.fileId?.startsWith('pending_');
                        const isImage = at.mimeType?.startsWith('image/') || (at.url && at.url.includes('lh3.googleusercontent'));
                        
                        // Fungsionalitas view sesuai protokol yang diminta
                        const handleView = () => {
                          if (isPending) return;
                          let targetUrl = at.url;
                          if (at.type === 'FILE' && at.fileId) {
                            targetUrl = isImage 
                              ? `https://lh3.googleusercontent.com/d/${at.fileId}`
                              : `https://drive.google.com/file/d/${at.fileId}/view`;
                          }
                          if (targetUrl) window.open(targetUrl, '_blank');
                        };

                        return (
                          <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group animate-in slide-in-from-bottom-2 relative overflow-hidden">
                            <div 
                              onClick={handleView}
                              className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#004A74]/30 shadow-sm overflow-hidden shrink-0 relative ${!isPending ? 'cursor-pointer hover:bg-gray-100 transition-all' : ''}`}
                            >
                                {isImage ? (
                                   <img src={at.url} className="w-full h-full object-cover" />
                                ) : at.type === 'LINK' ? (
                                   <Globe size={18} />
                                ) : (
                                   <FileIcon size={18} />
                                )}
                                {isPending && (
                                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                    <Loader2 size={12} className="animate-spin text-[#004A74]" />
                                  </div>
                                )}
                                {!isPending && (
                                  <div className="absolute inset-0 bg-[#004A74]/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <Eye size={12} className="text-[#004A74]" />
                                  </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                                <input className="w-full bg-transparent border-none p-0 text-[10px] font-black text-[#004A74] uppercase outline-none" placeholder="LABEL..." value={at.label} onChange={e => {
                                  const newAt = [...content.attachments];
                                  newAt[idx].label = e.target.value;
                                  setContent({...content, attachments: newAt});
                                }} />
                                {at.type === 'LINK' ? (
                                  <input className="w-full bg-transparent border-none p-0 text-[9px] font-medium text-blue-500 underline outline-none" placeholder="https://..." value={at.url} onChange={e => {
                                    const newAt = [...content.attachments];
                                    newAt[idx].url = e.target.value;
                                    setContent({...content, attachments: newAt});
                                  }} />
                                ) : (
                                   <div className="flex items-center justify-between pr-2">
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{at.type}</span>
                                      {!isPending && (
                                        <button type="button" onClick={handleView} className="text-[#004A74]/40 hover:text-[#004A74] transition-all">
                                          <ExternalLink size={10} />
                                        </button>
                                      )}
                                   </div>
                                )}
                            </div>
                            <button type="button" onClick={() => handleRemoveAttachment(idx)} className="p-2 text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                          </div>
                        );
                     })}
                  </div>
               </div>

               <div className="pt-6">
                  <button type="submit" className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"><Save size={18} /> {log ? 'Synchronize Updates' : 'Authorize & Sync Entry'}</button>
               </div>
             </>
           )}
        </form>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }`}</style>
    </div>
  );
};

export default TracerLogModal;