import React, { useState, useEffect, useMemo } from 'react';
import { TracerTodo } from '../../../../types';
import { saveTracerTodo, deleteTracerTodo } from '../../../../services/TracerService';
import { 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Zap
} from 'lucide-react';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import TodoFormModal from '../Modals/TodoFormModal';
import TodoCompletionModal from '../Modals/TodoCompletionModal';

interface TodoTabProps {
  projectId: string;
  todos: TracerTodo[];
  setTodos: React.Dispatch<React.SetStateAction<TracerTodo[]>>;
  onRefresh: () => Promise<void>;
}

const TodoTab: React.FC<TodoTabProps> = ({ projectId, todos, setTodos, onRefresh }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [viewAnchorDate, setViewAnchorDate] = useState(new Date());
  const [formModal, setFormModal] = useState<{ open: boolean; todo?: TracerTodo; mode: 'view' | 'edit' }>({ open: false, mode: 'view' });
  const [completionModal, setCompletionModal] = useState<{ open: boolean; todo?: TracerTodo }>({ open: false });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- GANTT ENGINE: ADAPTIVE 14/7 DAYS ---
  const numDays = isMobile ? 7 : 14;
  const todayOffset = isMobile ? 3 : 6;

  const timelineDays = useMemo(() => {
    const days = [];
    const start = new Date(viewAnchorDate);
    start.setDate(start.getDate() - todayOffset);
    for (let i = 0; i < numDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewAnchorDate, numDays, todayOffset]);

  // STABLE ORDERING: Newest Created/Updated Always on Top
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [todos]);

  const shiftWeek = (direction: number) => {
    const next = new Date(viewAnchorDate);
    next.setDate(next.getDate() + (direction * (isMobile ? 3 : 7)));
    setViewAnchorDate(next);
  };

  const getPriorityColor = (todo: TracerTodo) => {
    const isDone = todo.isDone === true || String(todo.isDone).toUpperCase() === 'TRUE';
    if (isDone) return 'bg-green-500';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(todo.deadline);
    if (today > deadline) return 'bg-red-500';
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'bg-yellow-400';
    return 'bg-[#004A74]';
  };

  const isDateInTaskRange = (date: Date, todo: TracerTodo) => {
    const dStr = date.toISOString().split('T')[0];
    return dStr >= todo.startDate && dStr <= todo.deadline;
  };

  const handleSaveTodo = async (data: TracerTodo) => {
    setFormModal({ open: false, mode: 'view' });
    
    // OPTIMISTIC PREPEND: Force new item to top
    setTodos(prev => {
      const exists = prev.find(t => t.id === data.id);
      if (exists) return prev.map(t => t.id === data.id ? data : t);
      return [data, ...prev]; 
    });

    if (await saveTracerTodo(data)) {
      // Trigger notification update (as new task might be urgent)
      window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await showXeenapsDeleteConfirm(1)) {
      setTodos(prev => prev.filter(t => t.id !== id));
      if (await deleteTracerTodo(id)) {
        window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
      }
    }
  };

  const handleFinalizeCompletion = async (completedDate: string, remarks: string) => {
    if (!completionModal.todo) return;
    setCompletionModal({ open: false });
    
    const updated: TracerTodo = { 
      ...completionModal.todo, 
      isDone: true, 
      completedDate, 
      completionRemarks: remarks,
      updatedAt: new Date().toISOString()
    };

    // Optimistic state update
    setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));

    if (await saveTracerTodo(updated)) {
      // Trigger notification update (remove from bell)
      window.dispatchEvent(new CustomEvent('xeenaps-notif-refresh'));
    }
  };

  const handleCompleteRequest = (e: React.MouseEvent, todo: TracerTodo) => {
    e.stopPropagation();
    setCompletionModal({ open: true, todo });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 md:px-2">
         <div className="space-y-1">
            <h3 className="text-[9px] md:text-[11px] font-black text-[#004A74] uppercase tracking-[0.3em] flex items-center gap-2">
              <Zap size={isMobile ? 12 : 16} className="text-[#FED400] fill-[#FED400]" /> {numDays}-Day Strategic Pulse
            </h3>
            <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">Chronological Matrix View</p>
         </div>

         <div className="flex items-center gap-2 bg-gray-100 p-1 md:p-1.5 rounded-xl border border-gray-200">
            <div className="flex gap-1 mr-1 md:mr-2 border-r border-gray-200 pr-1 md:pr-2">
               <button onClick={() => shiftWeek(-1)} className="p-1.5 bg-white hover:bg-[#004A74] hover:text-white rounded-lg transition-all active:scale-90"><ChevronLeft size={14} /></button>
               <button onClick={() => shiftWeek(1)} className="p-1.5 bg-white hover:bg-[#004A74] hover:text-white rounded-lg transition-all active:scale-90"><ChevronRight size={14} /></button>
            </div>
            <button 
              onClick={() => setFormModal({ open: true, mode: 'edit' })}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#004A74] text-[#FED400] rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all"
            >
              <Plus size={12} /> Add Task
            </button>
         </div>
      </div>

      <section className="bg-white border border-gray-100 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar-h">
          <div className="w-full min-w-0">
            {/* GRID HEADER: Execution column widened to 220px, dates narrowed */}
            <div className={`grid ${isMobile ? 'grid-cols-[140px_repeat(7,1fr)]' : 'grid-cols-[220px_repeat(14,1fr)]'} border-b border-gray-100 bg-gray-50/50`}>
               <div className="sticky left-0 z-30 bg-white border-r border-gray-200 px-5 py-3 flex items-center shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-[#004A74]">Project Execution Logs</span>
               </div>
               
               {timelineDays.map((day, idx) => {
                 const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                 const dayNames = ['S','M','T','W','T','F','S'];
                 const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                 
                 return (
                   <div key={idx} className={`flex flex-col items-center justify-center py-3 border-r border-gray-50 transition-all ${isToday ? 'bg-[#FED400]/10' : ''}`}>
                      <span className={`text-[7px] md:text-[8px] font-black uppercase mb-0.5 ${isToday ? 'text-[#004A74]' : 'text-gray-300'}`}>{dayNames[day.getDay()]}</span>
                      <span className={`text-[9px] md:text-[10px] font-black ${isToday ? 'text-[#004A74] bg-[#FED400] w-6 h-6 flex items-center justify-center rounded-lg shadow-sm' : 'text-[#004A74]'}`}>
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col items-center -space-y-1">
                        <span className="text-[6px] font-black text-gray-400 uppercase">{monthNames[day.getMonth()]}</span>
                        <span className="text-[6px] font-black text-gray-300 uppercase">{day.getFullYear()}</span>
                      </div>
                   </div>
                 );
               })}
            </div>

            {/* GRID BODY: TASK ROWS */}
            <div className="divide-y divide-gray-50">
               {sortedTodos.length === 0 ? (
                 <div className="py-20 text-center opacity-20">
                    <CheckCircle2 size={48} className="mx-auto mb-2 text-[#004A74]" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Pipeline Clear</p>
                 </div>
               ) : sortedTodos.map(todo => {
                 const isDone = todo.isDone === true || String(todo.isDone).toUpperCase() === 'TRUE';
                 return (
                 <div key={todo.id} className={`grid ${isMobile ? 'grid-cols-[140px_repeat(7,1fr)]' : 'grid-cols-[220px_repeat(14,1fr)]'} hover:bg-blue-50/20 transition-all group`}>
                    <div 
                      onClick={() => setFormModal({ open: true, todo, mode: 'view' })}
                      className="sticky left-0 z-20 bg-white border-r border-gray-200 px-4 py-4 flex items-center gap-3 cursor-pointer group-hover:bg-[#fcfcfc] shadow-[2px_0_10px_rgba(0,0,0,0.02)]"
                    >
                       <div className={`shrink-0 w-1.5 h-8 rounded-full ${getPriorityColor(todo)} shadow-sm`} />
                       <div className="min-w-0 flex-1">
                          <h4 className="text-[9px] md:text-[11px] font-black text-[#004A74] truncate leading-tight mb-0.5">{todo.title}</h4>
                          <div className="flex items-center gap-1.5">
                             <Clock size={10} className="text-gray-300" />
                             <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Deadline: {todo.deadline}</span>
                          </div>
                       </div>
                       
                       <div className="flex gap-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isDone && (
                            <button onClick={(e) => handleCompleteRequest(e, todo)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-all"><Check size={14} strokeWidth={4}/></button>
                          )}
                          <button onClick={(e) => handleDelete(e, todo.id)} className="p-1.5 text-red-200 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                       </div>
                    </div>

                    {timelineDays.map((day, idx) => {
                      const isActive = isDateInTaskRange(day, todo);
                      const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                      const colorClass = isActive ? getPriorityColor(todo) : 'bg-transparent';
                      return (
                        <div key={idx} className={`border-r border-gray-50 flex items-center justify-center p-0.5 min-h-[56px] ${isToday ? 'bg-[#FED400]/5' : ''}`}>
                           {isActive && (
                             <div 
                               onClick={() => setFormModal({ open: true, todo, mode: 'view' })}
                               className={`w-full h-full rounded-sm shadow-sm transition-all hover:scale-[1.03] cursor-pointer ${colorClass}`}
                             />
                           )}
                        </div>
                      );
                    })}
                 </div>
               );})}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-6 px-6 py-4 bg-white/50 rounded-3xl border border-gray-100 backdrop-blur-sm">
         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" /><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Done</span></div>
         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" /><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Alert</span></div>
         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" /><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Critical</span></div>
         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#004A74] shadow-sm" /><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active</span></div>
      </div>

      {formModal.open && <TodoFormModal projectId={projectId} todo={formModal.todo} mode={formModal.mode} onClose={() => setFormModal({ open: false, mode: 'view' })} onSave={handleSaveTodo} />}
      {completionModal.open && <TodoCompletionModal todo={completionModal.todo!} onClose={() => setCompletionModal({ open: false })} onConfirm={handleFinalizeCompletion} />}

      <style>{`.custom-scrollbar-h::-webkit-scrollbar { height: 4px; } .custom-scrollbar-h::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-h::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }`}</style>
    </div>
  );
};

export default TodoTab;