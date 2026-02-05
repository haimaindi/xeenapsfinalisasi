import React, { useState, useEffect, useRef } from 'react';
import { TracerFinanceItem, TracerFinanceContent, TracerFinanceAttachment } from '../../../../types';
import { saveTracerFinance } from '../../../../services/TracerService';
import { fetchFileContent } from '../../../../services/gasService';
import { uploadVaultFile, deleteRemoteFile } from '../../../../services/ActivityService';
import { 
  X, 
  Save, 
  Banknote, 
  Plus, 
  Trash2, 
  Loader2, 
  Clock, 
  FileText, 
  Globe, 
  FileIcon, 
  Eye, 
  ArrowUpCircle,
  ArrowDownCircle,
  PlusCircle
} from 'lucide-react';
import { FormField } from '../../../Common/FormComponents';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../../utils/toastUtils';

interface FinanceFormModalProps {
  projectId: string;
  item?: TracerFinanceItem;
  currencySymbol: string;
  latestDate: string | null;
  onClose: () => void;
  onSave: (data: TracerFinanceItem) => void;
}

const FinanceFormModal: React.FC<FinanceFormModalProps> = ({ projectId, item, currencySymbol, latestDate, onClose, onSave }) => {
  const [isCredit, setIsCredit] = useState(item ? (item.credit > 0) : true);
  const [amountStr, setAmountStr] = useState(item ? (item.credit || item.debit).toString() : '0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(!!item?.attachmentsJsonId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get strictly Local ISO String for NOW()
  const getLocalNowISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString();
  };

  const [formData, setFormData] = useState<TracerFinanceItem>(item || {
    id: crypto.randomUUID(),
    projectId,
    date: getLocalNowISO(), // Force Local User Time NOW()
    credit: 0,
    debit: 0,
    balance: 0,
    description: '',
    attachmentsJsonId: '',
    storageNodeUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [content, setContent] = useState<TracerFinanceContent>({ attachments: [] });
  // Track newly uploaded files for cleanup if not saved
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState<{fileId: string, nodeUrl: string}[]>([]);

  useEffect(() => {
    if (item?.attachmentsJsonId) {
      const load = async () => {
        const data = await fetchFileContent(item.attachmentsJsonId, item.storageNodeUrl);
        if (data) setContent(data);
        setIsLoadingContent(false);
      };
      load();
    }
  }, [item]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(val);
  };

  const formattedAmount = new Intl.NumberFormat('id-ID').format(parseInt(amountStr) || 0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const tempId = crypto.randomUUID();
      const placeholder: TracerFinanceAttachment = {
        type: 'FILE',
        label: file.name,
        fileId: `pending_${tempId}`,
        mimeType: file.type
      };
      setContent(prev => ({ attachments: [...prev.attachments, placeholder] }));

      const res = await uploadVaultFile(file);
      if (res) {
        setNewlyUploadedFiles(prev => [...prev, { fileId: res.fileId, nodeUrl: res.nodeUrl }]);
        setContent(prev => ({
          attachments: prev.attachments.map(at => 
            at.fileId === `pending_${tempId}` 
              ? { ...at, fileId: res.fileId, nodeUrl: res.nodeUrl, url: res.fileId } 
              : at
          )
        }));
      } else {
        setContent(prev => ({ attachments: prev.attachments.filter(at => at.fileId !== `pending_${tempId}`) }));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = async (idx: number) => {
    const target = content.attachments[idx];
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (!confirmed) return;

    setContent(prev => ({ attachments: prev.attachments.filter((_, i) => i !== idx) }));
    if (target.type === 'FILE' && target.fileId && target.nodeUrl && !target.fileId.startsWith('pending_')) {
      await deleteRemoteFile(target.fileId, target.nodeUrl);
      setNewlyUploadedFiles(prev => prev.filter(f => f.fileId !== target.fileId));
    }
  };

  const handleClose = async () => {
    if (!item && newlyUploadedFiles.length > 0) {
      for (const f of newlyUploadedFiles) {
        await deleteRemoteFile(f.fileId, f.nodeUrl);
      }
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || isSubmitting) return;

    // VALIDATION: Date must be newer than latest entry
    if (!item && latestDate && new Date(formData.date) < new Date(latestDate)) {
       showXeenapsToast('warning', 'Backdating is not allowed for balance integrity.');
       return;
    }

    setIsSubmitting(true);
    const amount = parseInt(amountStr) || 0;
    const finalItem = {
      ...formData,
      credit: isCredit ? amount : 0,
      debit: !isCredit ? amount : 0,
      updatedAt: new Date().toISOString()
    };

    try {
      const success = await saveTracerFinance(finalItem, content);
      if (success) {
        onSave(finalItem);
      } else {
        showXeenapsToast('error', 'Failed to synchronize with cloud ledger.');
      }
    } catch (err) {
      showXeenapsToast('error', 'Network failure during synchronization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isViewOnly = !!item;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in">
      <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><Banknote size={24} /></div>
              <div>
                 <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">{isViewOnly ? 'Transaction Detail' : 'Add Ledger Entry'}</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Financial Audit Protocol</p>
              </div>
           </div>
           <button onClick={handleClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-10">
           
           {!isViewOnly && (
             <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] border border-gray-200">
                <button type="button" onClick={() => setIsCredit(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${isCredit ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400 hover:text-green-600'}`}>
                   <ArrowUpCircle size={14} /> Credit (Income)
                </button>
                <button type="button" onClick={() => setIsCredit(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${!isCredit ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-green-600'}`}>
                   <ArrowDownCircle size={14} /> Debit (Expense)
                </button>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <FormField label="Nominal Value" required>
                 <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 group-focus-within:text-[#004A74]">{currencySymbol}</span>
                    <input 
                      className={`w-full pl-16 pr-6 py-5 bg-gray-50 border border-gray-200 rounded-[2rem] text-3xl font-black text-[#004A74] outline-none focus:bg-white focus:ring-8 focus:ring-[#004A74]/5 transition-all ${isViewOnly ? 'pointer-events-none' : ''}`}
                      value={formattedAmount}
                      onChange={handleAmountChange}
                      disabled={isViewOnly}
                    />
                 </div>
              </FormField>

              <FormField label="Timestamp Protocol" required>
                 <div className="flex gap-2">
                    <input type="date" className="flex-1 bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-[10px] font-black text-[#004A74]" value={formData.date.substring(0,10)} onChange={e => setFormData({...formData, date: e.target.value + 'T' + formData.date.substring(11)})} disabled={isViewOnly} />
                    <input type="time" className="w-24 bg-gray-50 border border-gray-200 px-2 py-3 rounded-xl text-[10px] font-black text-[#004A74] text-center" value={formData.date.substring(11,16)} onChange={e => setFormData({...formData, date: formData.date.substring(0,10) + 'T' + e.target.value})} disabled={isViewOnly} />
                 </div>
              </FormField>
           </div>

           <FormField label="Narrative Description" required>
              <textarea 
                className={`w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-[2rem] text-sm font-bold text-[#004A74] outline-none focus:bg-white transition-all min-h-[100px] resize-none ${isViewOnly ? 'pointer-events-none opacity-80' : ''}`}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="DESCRIBE TRANSACTION PURPOSE..."
                disabled={isViewOnly}
              />
           </FormField>

           <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between px-2">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Supporting Evidence</h4>
                 {!isViewOnly && (
                   <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-[#004A74] rounded-xl text-[9px] font-black uppercase border border-gray-200 hover:bg-white shadow-sm transition-all"><Plus size={14} /> Attach File</button>
                 )}
              </div>

              {isLoadingContent ? (
                <div className="h-20 w-full skeleton rounded-2xl" />
              ) : content.attachments.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-[2rem] opacity-20">
                   <PlusCircle size={40} className="mx-auto mb-2 text-gray-300" />
                   <p className="text-[9px] font-black uppercase">No Documentation Attached</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {content.attachments.map((at, idx) => {
                      const isPending = at.fileId?.startsWith('pending_');
                      const isImage = at.mimeType?.startsWith('image/');
                      const viewUrl = at.fileId ? (isImage ? `https://lh3.googleusercontent.com/d/${at.fileId}` : `https://drive.google.com/file/d/${at.fileId}/view`) : at.url;

                      return (
                        <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3 relative group">
                           <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-gray-100">
                              {isImage ? <img src={viewUrl} className="w-full h-full object-cover" /> : at.type === 'LINK' ? <Globe size={16} className="text-gray-300" /> : <FileIcon size={16} className="text-gray-300" />}
                              {isPending && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 size={12} className="animate-spin text-[#004A74]" /></div>}
                           </div>
                           <p className="text-[9px] font-bold text-[#004A74] uppercase truncate flex-1">{at.label}</p>
                           <div className="flex items-center gap-1">
                              {!isPending && viewUrl && (
                                <button type="button" onClick={() => window.open(viewUrl, '_blank')} className="p-1.5 text-blue-500 hover:bg-white rounded-lg transition-all"><Eye size={14} /></button>
                              )}
                              {!isViewOnly && (
                                <button type="button" onClick={() => handleRemoveAttachment(idx)} className="p-1.5 text-red-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                              )}
                           </div>
                        </div>
                      );
                   })}
                </div>
              )}
           </div>

           {!isViewOnly && (
             <div className="pt-8">
                <button type="submit" disabled={isSubmitting || !formData.description.trim()} className={`w-full py-5 bg-[#004A74] text-[#FED400] rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#004A74]/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 grayscale' : ''}`}>
                   {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                   Commit Ledger Entry
                </button>
             </div>
           )}

           <input type="file" ref={fileInputRef} className="hidden" />
        </form>
      </div>
    </div>
  );
};

export default FinanceFormModal;