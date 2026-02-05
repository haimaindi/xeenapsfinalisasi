import React, { useState } from 'react';
import { TracerTodo } from '../../../../types';
import { 
  X, 
  Save, 
  Edit3, 
  Calendar, 
  Link as LinkIcon, 
  FileText, 
  Target,
  ArrowLeft,
  Layout,
  Clock,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { FormField } from '../../../Common/FormComponents';

interface TodoFormModalProps {
  projectId: string;
  todo?: TracerTodo;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (data: TracerTodo) => void;
}

const TodoFormModal: React.FC<TodoFormModalProps> = ({ projectId, todo, mode: initialMode, onClose, onSave }) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TracerTodo>(todo || {
    id: crypto.randomUUID(),
    projectId,
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date().toISOString().split('T')[0],
    linkLabel: '',
    linkUrl: '',
    isDone: false,
    completedDate: '',
    completionRemarks: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave({ ...formData, updatedAt: new Date().toISOString() });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                 <Target size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Task Architecture</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{mode === 'view' ? 'View Intel' : 'Modify Parameters'}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              {mode === 'view' && !formData.isDone && (
                <button 
                  onClick={() => setMode('edit')}
                  className="p-2.5 bg-white text-[#004A74] hover:bg-[#FED400] border border-gray-100 rounded-xl transition-all shadow-sm active:scale-90"
                >
                  <Edit3 size={20} />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={28} /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10">
           {mode === 'view' ? (
             /* VIEW MODE UI */
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                   <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">Inquiry Title</span>
                   <h1 className="text-2xl md:text-3xl font-black text-[#004A74] leading-tight">{formData.title}</h1>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> Execution Start</span>
                      <p className="text-sm font-bold text-[#004A74]">{formData.startDate}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Hard Deadline</span>
                      <p className="text-sm font-bold text-red-500">{formData.deadline}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14} /> Description</h4>
                   <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 text-sm text-[#004A74] leading-relaxed italic">
                      {formData.description || 'No additional parameters provided.'}
                   </div>
                </div>

                {formData.linkUrl && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Link</h4>
                    <button 
                      onClick={() => window.open(formData.linkUrl, '_blank')}
                      className="w-full p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-[#004A74] transition-all group"
                    >
                       <div className="flex items-center gap-3">
                          <LinkIcon size={16} className="text-blue-500" />
                          <span className="text-xs font-bold text-[#004A74] uppercase">{formData.linkLabel}</span>
                       </div>
                       <ExternalLink size={16} className="text-gray-300 group-hover:text-[#004A74]" />
                    </button>
                  </div>
                )}

                {formData.isDone && (
                   <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100 space-y-4">
                      <div className="flex items-center gap-3 text-green-700">
                         <CheckCircle2 size={24} />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em]">Completion Report</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                         <p className="text-[11px] font-bold text-green-800 italic">"{formData.completionRemarks}"</p>
                         <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Finished on: {formData.completedDate}</p>
                      </div>
                   </div>
                )}
             </div>
           ) : (
             /* EDIT MODE FORM */
             <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-top-2">
                <FormField label="To Do Title" required>
                   <input 
                     autoFocus
                     className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-lg font-black text-[#004A74] outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all"
                     value={formData.title}
                     onChange={e => setFormData({...formData, title: e.target.value})}
                     placeholder="WHAT NEEDS TO BE DONE?"
                     required
                   />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField label="Start Date">
                      <input type="date" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                   </FormField>
                   <FormField label="Deadline" required>
                      <input type="date" className="w-full px-5 py-3 bg-red-50 border border-red-200 rounded-xl font-bold text-red-600" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} required />
                   </FormField>
                </div>

                <FormField label="Strategic Details">
                   <textarea 
                     className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-[#004A74] outline-none focus:bg-white min-h-[120px]"
                     value={formData.description}
                     onChange={e => setFormData({...formData, description: e.target.value})}
                     placeholder="Describe the context or objective..."
                   />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                   <FormField label="Reference Link Label">
                      <input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.linkLabel} onChange={e => setFormData({...formData, linkLabel: e.target.value})} placeholder="e.g. Source Website" />
                   </FormField>
                   <FormField label="Reference Link URL">
                      <input type="url" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-blue-500" value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} placeholder="https://..." />
                   </FormField>
                </div>

                <div className="pt-6">
                   <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {isSubmitting ? 'SYCHRONIZING...' : 'Synchronize Task'}
                   </button>
                </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};

export default TodoFormModal;