
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore - Resolving TS error for missing exported members in some environments
import { Routes, Route, useNavigate } from 'react-router-dom';
import { TeachingItem, SessionStatus, SessionMode, TeachingRole, CourseType, EducationLevel, AssignmentType } from '../../types';
import { fetchTeachingPaginated, deleteTeachingItem, saveTeachingItem } from '../../services/TeachingService';
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  School,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  LayoutGrid,
  CalendarDays,
  X,
  ChevronLeft,
  Search,
  CheckCircle2,
  CalendarPlus
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardPrimaryButton } from '../Common/ButtonComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import TeachingDetail from './TeachingDetail';
import TeachingVault from './TeachingVault';
import AttachedQuestion from './AttachedQuestion';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

const TeachingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  
  const [items, setItems] = useState<TeachingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  // Date Filter States
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });
  const [appliedDateRange, setAppliedDateRange] = useState({ start: '', end: '' });

  // View States - Default to Calendar
  const [viewMode, setViewMode] = useState<'card' | 'calendar'>('calendar');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const teachingPhrases = [
    "Search Course Title...",
    "Search Teaching Topic...",
    "Search Session Label...",
    "Search Lecturer Role...",
    "Search Institution..."
  ];

  // Helper to convert "8:00" or "10:00" to total minutes for correct numeric sorting
  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const parts = time.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return (hours * 60) + minutes;
  };

  // Helper for safe local ISO date (YYYY-MM-DD)
  const getLocalDateStr = (d: Date = new Date()) => d.toLocaleDateString('sv');

  // Unified loadData: triggered by both appliedSearch and appliedDateRange changes (Server-Side)
  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        // Sync with backend: pass search + dates for accurate pagination
        const result = await fetchTeachingPaginated(
          1, 
          1000, 
          appliedSearch, 
          appliedDateRange.start, 
          appliedDateRange.end, 
          signal
        );
        setItems(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [appliedSearch, appliedDateRange, workflow.execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateNew = async (prefilledDate?: string) => {
    const { value: label } = await Swal.fire({
      title: 'NEW TEACHING LOG',
      input: 'text',
      inputLabel: 'Session Label / Period',
      inputPlaceholder: 'e.g., Pertemuan 1 - Arsitektur Dasar...',
      showCancelButton: true,
      confirmButtonText: 'INITIALIZE',
      ...XEENAPS_SWAL_CONFIG,
      inputValidator: (value) => {
        if (!value) return 'Label is mandatory!';
        return null;
      }
    });

    if (label) {
      // Freeze UI and show loading
      Swal.fire({
        title: 'INITIALIZING SESSION...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        ...XEENAPS_SWAL_CONFIG
      });

      const id = crypto.randomUUID();
      const newItem: TeachingItem = {
        id,
        label,
        teachingDate: prefilledDate || getLocalDateStr(),
        startTime: '08:00',
        endTime: '10:00',
        institution: '',
        faculty: '',
        program: '', 
        academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        semester: '1',
        classGroup: '',
        meetingNo: 1,
        mode: SessionMode.OFFLINE,
        plannedStudents: 0,
        location: '',
        eventColor: '#004A74',
        courseTitle: '',
        courseCode: '',
        learningOutcomes: '',
        method: 'Lecture',
        theoryCredits: 2,
        practicalCredits: 0,
        courseType: CourseType.WAJIB_PRODI,
        educationLevel: EducationLevel.S1,
        topic: '',
        role: TeachingRole.MANDIRI,
        referenceLinks: [],
        presentationId: [],
        questionBankId: [],
        attachmentLink: [],
        assignmentType: AssignmentType.NONE,
        assessmentCriteria: '',
        status: SessionStatus.PLANNED, 
        vaultJsonId: '',
        storageNodeUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await saveTeachingItem(newItem);
      Swal.close();
      
      if (success) {
        navigate(`/teaching/${id}`, { state: { item: newItem } });
      } else {
        showXeenapsToast('error', 'Handshake failed');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteTeachingItem(id);
      if (success) {
        showXeenapsToast('success', 'Record removed');
        loadData();
      }
    }
  };

  const handleApplyRange = () => {
    setAppliedDateRange({ ...tempDateRange });
    showXeenapsToast('success', 'Filter synchronized');
  };

  // filteredItems is now used only for client-side multi-layer sorting since data is clean from server
  const filteredItems = useMemo(() => {
    // Sorting for Card Mode: Date (DESC) -> StartTime (DESC) -> EndTime (DESC)
    return [...items].sort((a, b) => {
      const dateCmp = b.teachingDate.localeCompare(a.teachingDate);
      if (dateCmp !== 0) return dateCmp;
      
      const startA = timeToMinutes(a.startTime);
      const startB = timeToMinutes(b.startTime);
      if (startB !== startA) return startB - startA;
      
      const endA = timeToMinutes(a.endTime);
      const endB = timeToMinutes(b.endTime);
      return endB - endA;
    });
  }, [items]);

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
      case SessionStatus.CANCELLED: return 'bg-red-100 text-red-700 border-red-200';
      case SessionStatus.RESCHEDULED: return 'bg-orange-100 text-orange-700 border-orange-200';
      case SessionStatus.PLANNED: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  // --- CALENDAR ENGINE ---
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [selectedMonth]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, TeachingItem[]> = {};
    items.forEach(item => {
      const dateStr = item.teachingDate;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(item);
    });
    return map;
  }, [items]);

  const dailySessions = useMemo(() => {
    if (!selectedDate) return [];
    const rawSessions = sessionsByDate[selectedDate] || [];
    // Multi-layer Sorting for Calendar Mode Daily List: StartTime (ASC) -> EndTime (ASC)
    return [...rawSessions].sort((a, b) => {
      const startA = timeToMinutes(a.startTime);
      const startB = timeToMinutes(b.startTime);
      if (startA !== startB) return startA - startB;
      
      const endA = timeToMinutes(a.endTime);
      const endB = timeToMinutes(b.endTime);
      return endA - endB;
    });
  }, [selectedDate, sessionsByDate]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* HEADER SECTION - Only visible in CARD mode */}
      {viewMode === 'card' && (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto flex-1">
            <SmartSearchBox 
              value={localSearch} 
              onChange={setLocalSearch} 
              onSearch={() => { setAppliedSearch(localSearch); }} 
              phrases={teachingPhrases}
              className="w-full lg:max-w-md"
            />
            <div className="flex flex-col items-stretch md:flex-row md:items-center gap-2 bg-gray-50/80 p-1 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2 md:py-0">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter w-8">From</span>
                <input type="date" className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#004A74] outline-none cursor-pointer flex-1" value={tempDateRange.start} onChange={(e) => setTempDateRange({...tempDateRange, start: e.target.value})} />
              </div>
              <div className="hidden md:block w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-2 px-3 py-2 md:py-0">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter w-8">Until</span>
                <input type="date" className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#004A74] outline-none cursor-pointer flex-1" value={tempDateRange.end} onChange={(e) => setTempDateRange({...tempDateRange, end: e.target.value})} />
              </div>
              {(tempDateRange.start || tempDateRange.end) && (
                <button onClick={handleApplyRange} className="w-full md:w-auto px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#003859] transition-all shadow-md md:ml-1">APPLY</button>
              )}
              {(appliedDateRange.start || appliedDateRange.end) && (
                <button onClick={() => { setTempDateRange({start: '', end: ''}); setAppliedDateRange({start: '', end: ''}); }} className="p-2 hover:bg-gray-200 rounded-lg transition-all flex justify-center text-red-400"><X size={16} /></button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
             <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-100 shrink-0 shadow-sm">
                <button onClick={() => setViewMode('card')} className={`p-2 rounded-xl transition-all bg-[#004A74] text-white shadow-md`}><LayoutGrid size={18} /></button>
                <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-xl transition-all text-gray-400`}><CalendarDays size={18} /></button>
             </div>
             {/* RESPONSIVE OPTIMIZATION: Full width on mobile/tablet, auto on desktop */}
             <StandardPrimaryButton 
               onClick={() => handleCreateNew()} 
               icon={<Plus size={18} />} 
               className="w-full md:w-auto !px-4 !py-3 !text-[10px] md:!text-sm shadow-xl"
             >
               Record Session
             </StandardPrimaryButton>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {isLoading ? (
          <CardGridSkeleton count={8} />
        ) : viewMode === 'card' ? (
          /* CARD MODE */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
                <School size={80} strokeWidth={1} className="text-[#004A74]" />
                <p className="text-sm font-black uppercase tracking-[0.4em]">No Teaching Logs Found</p>
              </div>
            ) : filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => navigate(`/teaching/${item.id}`, { state: { item } })}
                className="group relative bg-white border border-gray-100 border-l-[6px] rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col h-full"
                style={{ borderLeftColor: item.eventColor || '#004A74' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 bg-gray-50 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full truncate max-w-[150px]">{item.label}</span>
                  <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                </div>
                <h3 className="text-base font-black text-[#004A74] leading-tight mb-2 uppercase line-clamp-2">{item.courseTitle || 'Untitled Course'}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 italic">{item.courseCode || 'No Code'}</p>
                <div className="space-y-3 mb-6 flex-1">
                   <div className="flex items-center gap-2 text-gray-500"><CalendarIcon size={14} className="shrink-0 text-[#FED400]" /><span className="text-[10px] font-bold uppercase tracking-tight">{item.teachingDate}</span></div>
                   <div className="flex items-center gap-2 text-gray-500"><Clock size={14} className="shrink-0" /><span className="text-[10px] font-bold uppercase tracking-tight">{item.startTime} - {item.endTime}</span></div>
                   <div className="flex items-center gap-2 text-gray-500"><Users size={14} className="shrink-0" /><span className="text-[10px] font-bold uppercase tracking-tight">{item.totalStudentsPresent || 0} / {item.plannedStudents} Present</span></div>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                   <span className={`px-3 py-1 border text-[8px] font-black uppercase tracking-widest rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                   <ChevronRight size={18} className="text-gray-300 group-hover:text-[#FED400] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* CALENDAR MODE */
          <div className="space-y-8 max-w-5xl mx-auto px-1 animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
              <div className="p-4 md:p-8 bg-gray-50/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100">
                 <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-black text-[#004A74] uppercase tracking-tighter">
                       {monthNames[selectedMonth.getMonth()]} <span className="text-gray-400 font-bold ml-1">{selectedMonth.getFullYear()}</span>
                    </h3>
                    <div className="flex bg-white/80 p-1 rounded-xl border border-gray-100 shadow-sm">
                      <button onClick={() => setViewMode('card')} className="p-1.5 text-gray-400 hover:text-[#004A74] transition-all" title="Card View"><LayoutGrid size={16} /></button>
                      <button className="p-1.5 bg-[#004A74] text-white rounded-lg shadow-sm" title="Calendar View"><CalendarDays size={16} /></button>
                    </div>
                 </div>
                 
                 <div className="flex gap-2">
                    <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-white active:scale-90 transition-all text-[#004A74] shadow-sm"><ChevronLeft size={20} /></button>
                    <button onClick={() => setSelectedMonth(new Date())} className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FED400] transition-all text-[#004A74] shadow-sm">Today</button>
                    <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-white active:scale-90 transition-all text-[#004A74] shadow-sm"><ChevronRight size={20} /></button>
                 </div>
              </div>

              <div className="p-4 md:p-8">
                 <div className="grid grid-cols-7 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest py-3">{day}</div>
                    ))}
                 </div>
                 <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-[1.5rem] overflow-hidden">
                    {calendarDays.map((date, idx) => {
                      if (!date) return <div key={`pad-${idx}`} className="bg-white/30 h-24 md:h-32" />;
                      
                      const dateStr = getLocalDateStr(date);
                      const daySessions = sessionsByDate[dateStr] || [];
                      const isToday = dateStr === getLocalDateStr();
                      const isSelected = selectedDate === dateStr;
                      
                      return (
                        <div 
                          key={dateStr} 
                          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                          className={`bg-white min-h-[96px] md:min-h-[128px] p-2 md:p-3 relative group cursor-pointer transition-all ${isSelected ? 'ring-2 ring-inset ring-[#004A74] z-10' : 'hover:bg-blue-50/40'}`}
                        >
                           <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black transition-all ${isToday ? 'bg-[#FED400] text-[#004A74] shadow-md' : isSelected ? 'bg-[#004A74] text-white' : 'text-gray-400 group-hover:text-[#004A74]'}`}>
                              {date.getDate()}
                           </div>
                           <div className="mt-2 flex flex-wrap gap-1 max-w-full">
                              {daySessions.map(s => (
                                <div key={s.id} className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shadow-sm shrink-0" style={{ backgroundColor: s.eventColor || '#004A74' }} />
                              ))}
                           </div>
                           {daySessions.length > 0 && (
                             <p className="hidden md:block mt-auto text-[8px] font-black text-gray-300 uppercase truncate">
                                {daySessions.length} Session{daySessions.length > 1 ? 's' : ''}
                             </p>
                           )}
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>

            {selectedDate && (
              <div className="animate-in slide-in-from-top-4 duration-500 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
                 <div className="px-6 md:px-8 py-6 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                       <div className="min-w-0">
                          <h4 className="text-base md:text-lg font-black text-[#004A74] uppercase tracking-tighter truncate">Schedule: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dailySessions.length} Sessions Found</p>
                       </div>
                    </div>
                    {/* RESPONSIVE ADD BUTTON */}
                    <button 
                      onClick={() => handleCreateNew(selectedDate)}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
                    >
                       <CalendarPlus size={16} /> Add Session
                    </button>
                 </div>
                 <div className="p-4 md:p-8 space-y-4">
                    {dailySessions.length === 0 ? (
                      <div className="py-12 text-center text-gray-300 italic text-sm">No ledger entries for this date.</div>
                    ) : dailySessions.map(s => {
                      const metaLine = [s.institution, s.faculty, s.program, s.classGroup].filter(Boolean).join(' | ');
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => navigate(`/teaching/${s.id}`, { state: { item: s } })}
                          className="group flex flex-col md:flex-row md:items-center gap-4 p-5 bg-white border border-gray-100 rounded-3xl hover:border-[#004A74]/30 hover:shadow-lg transition-all cursor-pointer"
                        >
                           <div className="w-2 h-10 rounded-full shrink-0 hidden md:block" style={{ backgroundColor: s.eventColor || '#004A74' }} />
                           <div className="flex items-center gap-3 shrink-0">
                              <Clock size={16} className="text-gray-300" />
                              <span className="text-sm font-black text-[#004A74]">{s.startTime} - {s.endTime}</span>
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-gray-100 text-[#004A74] text-[7px] font-black uppercase rounded-md">{s.label}</span>
                              </div>
                              <h5 className="text-sm font-black text-[#004A74] uppercase truncate leading-tight">{s.courseTitle || 'Untitled Course'}</h5>
                              {metaLine && (
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">
                                   {metaLine}
                                </p>
                              )}
                           </div>
                           <div className="flex items-center justify-end gap-3 shrink-0 ml-auto">
                              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(s.status)}`}>{s.status}</span>
                              <ChevronRight size={18} className="text-gray-300 group-hover:text-[#FED400] transition-all" />
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.2); }
      `}</style>
    </div>
  );
};

const TeachingMain: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<TeachingDashboard />} />
      <Route path="/:sessionId" element={<TeachingDetail />} />
      <Route path="/:sessionId/vault" element={<TeachingVault />} />
      <Route path="/:sessionId/questions" element={<AttachedQuestion />} />
    </Routes>
  );
};

export default TeachingMain;
