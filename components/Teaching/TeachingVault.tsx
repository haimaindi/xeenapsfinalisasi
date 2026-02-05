
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TeachingVaultItem, TeachingItem } from '../../types';
import { fetchTeachingVaultContent, updateTeachingVaultContent, saveTeachingItem } from '../../services/TeachingService';
import { uploadVaultFile, deleteRemoteFile } from '../../services/ActivityService';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Link as LinkIcon, 
  X, 
  PlusCircle, 
  FileIcon, 
  Eye, 
  ArrowLeft, 
  LayoutGrid, 
  Loader2,
  CloudUpload,
  Globe,
  Save,
  ChevronRight,
  FileCode,
  FileCheck
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsConfirm } from '../../utils/swalUtils';

interface LinkQueueItem {
  url: string;
  label: string;
}

const TeachingVault: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [metadata, setMetadata] = useState<TeachingItem | null>((location.state as any)?.item || null);
  const [items, setItems] = useState<TeachingVaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [fileQueue, setFileQueue] = useState<any[]>([]);
  const [linkQueue, setLinkQueue] = useState<LinkQueueItem[]>([{ url: '', label: '' }]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadVault = async () => {
      if (!metadata?.vaultJsonId) return;
      setIsLoading(true);
      const content = await fetchTeachingVaultContent(metadata.vaultJsonId, metadata.storageNodeUrl);
      setItems(content);
      setIsLoading(false);
    };
    loadVault();
  }, [metadata?.vaultJsonId, metadata?.storageNodeUrl]);

  const handleSyncVault = async (newItems: TeachingVaultItem[]) => {
    if (!metadata || !sessionId) return;
    const result = await updateTeachingVaultContent(sessionId, metadata.vaultJsonId, newItems, metadata.storageNodeUrl);
    if (result.success) {
      const updatedMetadata: TeachingItem = { 
        ...metadata, 
        vaultJsonId: result.newVaultId || metadata.vaultJsonId,
        storageNodeUrl: result.newNodeUrl || metadata.storageNodeUrl,
        updatedAt: new Date().toISOString()
      };
      setMetadata(updatedMetadata);
      await saveTeachingItem(updatedMetadata);
    }
  };

  // HELPER: Modal closers with auto-reset
  const closeFileModal = () => {
    setFileQueue([]);
    setIsFileModalOpen(false);
  };

  const closeLinkModal = () => {
    setLinkQueue([{ url: '', label: '' }]);
    setIsLinkModalOpen(false);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newQueueItems = files.map(file => ({
      file,
      label: file.name,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFileQueue(prev => [...prev, ...newQueueItems]);
  };

  const handleUploadFiles = async () => {
    if (fileQueue.length === 0) return;
    
    // Copy queue for background processing and clear UI immediately
    const currentQueue = [...fileQueue];
    const optimisticBatchId = crypto.randomUUID();
    closeFileModal();

    // 1. OPTIMISTIC UI: Add items with unique processing markers
    const optimisticItems: TeachingVaultItem[] = currentQueue.map((q, idx) => ({
      type: 'FILE',
      label: q.label,
      mimeType: q.file.type,
      fileId: `optimistic_${optimisticBatchId}_${idx}_${q.previewUrl || 'no-preview'}`,
      nodeUrl: metadata?.storageNodeUrl
    }));
    
    setItems(prev => [...prev, ...optimisticItems]);

    try {
      const uploaded: TeachingVaultItem[] = [];
      for (const q of currentQueue) {
        const res = await uploadVaultFile(q.file);
        if (res) {
          uploaded.push({ 
            type: 'FILE', 
            fileId: res.fileId, 
            nodeUrl: res.nodeUrl, 
            label: q.label, 
            mimeType: q.file.type 
          });
        }
      }
      
      // 2. Finalize: Replace optimistic items in the list and sync
      setItems(prev => {
        const filtered = prev.filter(item => !item.fileId?.startsWith(`optimistic_${optimisticBatchId}`));
        const final = [...filtered, ...uploaded];
        handleSyncVault(final);
        return final;
      });
    } catch (err) {
      setItems(prev => prev.filter(item => !item.fileId?.startsWith(`optimistic_${optimisticBatchId}`)));
      showXeenapsToast('error', 'Batch upload failed');
    }
  };

  const handleSaveLinks = async () => {
    const validLinks = linkQueue.filter(l => l.url.trim() && l.label.trim());
    if (validLinks.length === 0) return;

    closeLinkModal();
    
    const newLinks: TeachingVaultItem[] = validLinks.map(l => ({
      type: 'LINK',
      url: l.url,
      label: l.label
    }));

    setItems(prev => {
      const updated = [...prev, ...newLinks];
      handleSyncVault(updated);
      return updated;
    });
  };

  const handleRemove = async (idx: number) => {
    const item = items[idx];
    const confirm = await showXeenapsConfirm('PURGE DOCUMENT?', 'This will permanently erase the file from Cloud Storage.', 'PURGE');
    if (confirm.isConfirmed) {
      const filtered = items.filter((_, i) => i !== idx);
      setItems(filtered);
      if (item.type === 'FILE' && item.fileId && item.nodeUrl && !item.fileId.startsWith('optimistic_')) {
        await deleteRemoteFile(item.fileId, item.nodeUrl);
      }
      await handleSyncVault(filtered);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in slide-in-from-right duration-500 overflow-hidden">
      <header className="px-4 md:px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0 z-50">
         <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => navigate(`/teaching/${sessionId}`, { state: { item: metadata } })} className="p-2 md:p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] rounded-xl transition-all shadow-sm">
               <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <h2 className="text-sm md:text-xl font-black text-[#004A74] uppercase tracking-tight truncate max-w-[150px] md:max-w-md">{metadata?.label || 'Session Vault'}</h2>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsLinkModalOpen(true)} 
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white text-[#004A74] border border-gray-100 rounded-2xl text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all"
            >
                <LinkIcon size={14} /> Add Links
            </button>
            <button 
              onClick={() => setIsFileModalOpen(true)} 
              className="flex items-center gap-2 px-5 md:px-6 py-2.5 bg-[#004A74] text-white rounded-2xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all"
            >
                <Plus size={14} /> Add Evidence
            </button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 pb-32">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="aspect-square skeleton rounded-[2.5rem]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-40 text-center opacity-20 flex flex-col items-center justify-center space-y-4">
             <LayoutGrid size={80} strokeWidth={1} className="text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Vault Empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {items.map((item, idx) => {
              const isOptimistic = item.fileId?.startsWith('optimistic_');
              const isImage = item.type === 'FILE' && (item.mimeType?.startsWith('image/') || isOptimistic);
              
              let displayUrl = '';
              if (item.type === 'LINK') {
                displayUrl = item.url || '';
              } else if (isOptimistic) {
                // Extract preview URL from optimistic ID if available
                const parts = item.fileId?.split('_') || [];
                displayUrl = parts.length > 3 ? parts.slice(3).join('_') : '';
              } else if (item.fileId) {
                if (isImage) {
                  displayUrl = `https://lh3.googleusercontent.com/d/${item.fileId}`;
                } else {
                  displayUrl = `https://drive.google.com/file/d/${item.fileId}/view`;
                }
              }

              return (
                <div key={idx} className={`group relative aspect-square bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ${isOptimistic ? 'opacity-60' : ''}`}>
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
                    {isImage ? (
                      <img src={displayUrl} className="w-full h-full object-cover" alt={item.label} />
                    ) : item.type === 'LINK' ? (
                      <div className="flex flex-col items-center gap-2 text-[#004A74]/30 group-hover:text-[#FED400] transition-colors">
                        <Globe size={40} strokeWidth={1.5} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Link</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#004A74]/30 group-hover:text-[#004A74] transition-colors">
                        <FileText size={40} strokeWidth={1.5} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Document</span>
                      </div>
                    )}
                    
                    {/* PER-ITEM LOADER OVERLAY (ONLY FOR FILES/IMAGES) */}
                    {isOptimistic && item.type === 'FILE' && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[3px] flex flex-col items-center justify-center z-20">
                        <Loader2 size={32} className="text-[#004A74] animate-spin" />
                        <span className="text-[7px] font-black uppercase mt-2 text-[#004A74] tracking-widest animate-pulse">Processing...</span>
                      </div>
                    )}

                    {/* ACTIONS: ONLY SHOW IF READY */}
                    {!isOptimistic && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-30">
                        <button onClick={() => displayUrl && window.open(displayUrl, '_blank')} className="p-3 bg-[#FED400] text-[#004A74] rounded-full hover:scale-110 transition-all shadow-lg"><Eye size={18} /></button>
                        <button onClick={() => handleRemove(idx)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all active:scale-95"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-white/90 backdrop-blur-sm border-t border-gray-100 z-10">
                     <p className="text-[9px] font-black text-[#004A74] truncate uppercase tracking-tight">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILE MODAL */}
      {isFileModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><CloudUpload size={24} /></div>
                    <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Batch File Ingestion</h2>
                 </div>
                 <button onClick={closeFileModal} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                 {fileQueue.length === 0 ? (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50 cursor-pointer hover:bg-white transition-all group">
                       <PlusCircle className="w-10 h-10 text-gray-300 group-hover:text-[#004A74] mb-3" />
                       <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Evidence Files</p>
                       <input type="file" className="hidden" multiple onChange={onFileSelect} />
                    </label>
                 ) : (
                    <div className="space-y-4">
                       {fileQueue.map((q, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-left-2">
                             <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-gray-100">
                                {q.previewUrl ? <img src={q.previewUrl} className="w-full h-full object-cover" /> : <FileIcon size={20} className="text-gray-300" />}
                             </div>
                             <input className="flex-1 bg-white border border-gray-100 px-3 py-2 rounded-lg text-[10px] font-bold text-[#004A74]" value={q.label} onChange={e => setFileQueue(prev => prev.map((item, idx) => idx === i ? {...item, label: e.target.value} : item))} />
                             <button onClick={() => setFileQueue(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-red-300"><X size={16} /></button>
                          </div>
                       ))}
                       <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[#004A74] hover:bg-white transition-all">+ Add More Files</button>
                       <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileSelect} />
                    </div>
                 )}
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                 <button onClick={closeFileModal} className="px-8 py-3 bg-white text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                 <button onClick={handleUploadFiles} disabled={fileQueue.length === 0} className="px-10 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase shadow-xl disabled:opacity-50">Secure Upload</button>
              </div>
           </div>
        </div>
      )}

      {/* LINK MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><LinkIcon size={24} /></div>
                    <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">External References</h2>
                 </div>
                 <button onClick={closeLinkModal} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                 {linkQueue.map((l, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group animate-in zoom-in-95">
                       <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-400">Destination URL</label>
                          <input type="url" className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-[11px] font-bold text-blue-500" value={l.url} placeholder="https://..." onChange={e => setLinkQueue(prev => prev.map((item, idx) => idx === i ? {...item, url: e.target.value} : item))} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-400">Custom Label</label>
                          <input className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-[11px] font-bold text-[#004A74]" value={l.label} placeholder="Reference Name" onChange={e => setLinkQueue(prev => prev.map((item, idx) => idx === i ? {...item, label: e.target.value} : item))} />
                       </div>
                       {linkQueue.length > 1 && (
                          <button onClick={() => setLinkQueue(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                       )}
                    </div>
                 ))}
                 <button onClick={() => setLinkQueue([...linkQueue, { url: '', label: '' }])} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[#004A74] hover:bg-white transition-all">+ Add More Links</button>
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                 <button onClick={closeLinkModal} className="px-8 py-3 bg-white text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                 <button onClick={handleSaveLinks} className="px-10 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2"><Save size={14} /> Confirm & Save</button>
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

export default TeachingVault;
