import React, { useState } from 'react';
import { TracerTodo } from '../../../../types';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { FormField } from '../../../Common/FormComponents';

interface TodoCompletionModalProps {
  todo: TracerTodo;
  onClose: () => void;
  onConfirm: (date: string, remarks: string) => void;
}

const TodoCompletionModal: React.FC<TodoCompletionModalProps> = ({ todo, onClose, onConfirm }) => {
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim() || isSyncing) return;
    
    setIsSyncing(true);
    await onConfirm(completedDate, remarks);
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-[#004A74]/40 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
      <div className="bg-white p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl border border-gray-100 text-center space-y-8">
        
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl border border-emerald-100">
           <CheckCircle2 size={40} />
        </div>

        <div className="space-y-2">
           <h3 className="text-2xl font-black text-[#004A74] uppercase tracking-tighter leading-none">Task Completed</h3>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate">{todo.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
           <FormField label="Completion Date">
              <div className="relative">
                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                 <input 
                    type="date"
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#004A74] outline-none focus:ring-4 focus:ring-[#004A74]/5 transition-all"
                    value={completedDate}
                    onChange={e => setCompletedDate(e.target.value)}
                 />
              </div>
           </FormField>

           <FormField label="Executive Report / Remarks" required>
              <div className="relative">
                 <FileText className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
                 <textarea 
                    autoFocus
                    required
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-[#004A74] outline-none focus:bg-white min-h-[120px] resize-none leading-relaxed transition-all focus:ring-4 focus:ring-[#004A74]/5"
                    placeholder="Describe the final outcome..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                 />
              </div>
           </FormField>

           <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSyncing || !remarks.trim()}
                className="flex-1 py-4 bg-[#004A74] text-[#FED400] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Sync Report
              </button>
           </div>
        </form>

      </div>
    </div>
  );
};

export default TodoCompletionModal;