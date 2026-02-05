import React, { useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler 
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Line, Doughnut, Pie } from 'react-chartjs-2';
import { 
  LibraryItem, 
  LibraryType, 
  TeachingItem, 
  ActivityItem, 
  TracerProject, 
  PublicationItem,
  TracerStatus,
  PublicationStatus
} from '../../types';
import { 
  Library, 
  TrendingUp, 
  Target, 
  BookOpenCheck, 
  ClipboardCheck,
  ChevronRight,
  PieChart as PieChartIcon,
  MapPin,
  Award
} from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface DashboardMainProps {
  libraryItems: LibraryItem[];
  teachingItems: TeachingItem[];
  activityItems: ActivityItem[];
  tracerProjects: TracerProject[];
  publicationItems: PublicationItem[];
  onRefresh: () => Promise<void>;
}

const DashboardMain: React.FC<DashboardMainProps> = ({ 
  libraryItems, 
  teachingItems, 
  activityItems, 
  tracerProjects, 
  publicationItems 
}) => {
  const navigate = useNavigate();

  // --- AGGREGATION LOGIC ---

  // Block A: Library Growth (12 Months)
  const growthChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last12Months.push({
        label: `${months[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`,
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    const datasets = [
      { type: LibraryType.LITERATURE, color: '#004A74', label: 'Literature' },
      { type: LibraryType.PERSONAL, color: '#FED400', label: 'Personal' },
      { type: LibraryType.TASK, color: '#10B981', label: 'Task' },
      { type: LibraryType.OTHER, color: '#94A3B8', label: 'Other' }
    ];

    return {
      labels: last12Months.map(m => m.label),
      datasets: datasets.map(ds => {
        const counts = last12Months.map(m => {
          return libraryItems.filter(item => {
            const itemDate = new Date(item.createdAt);
            return item.type === ds.type && 
                   itemDate.getMonth() === m.month && 
                   itemDate.getFullYear() === m.year;
          }).length;
        });

        // Cumulative Growth
        let total = 0;
        const cumulative = counts.map(c => total += c);

        return {
          label: ds.label,
          data: cumulative,
          borderColor: ds.color,
          backgroundColor: `${ds.color}20`,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5
        };
      })
    };
  }, [libraryItems]);

  // Block B: Distribution
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    libraryItems.forEach(item => {
      if (item.category) counts[item.category] = (counts[item.category] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const otherCount = sorted.slice(5).reduce((acc, curr) => acc + curr[1], 0);

    return {
      labels: [...top5.map(x => x[0]), 'Others'],
      datasets: [{
        data: [...top5.map(x => x[1]), otherCount],
        backgroundColor: ['#004A74', '#FED400', '#10B981', '#6366F1', '#F43F5E', '#94A3B8'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }, [libraryItems]);

  const topicDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    libraryItems.forEach(item => {
      if (item.topic) counts[item.topic] = (counts[item.topic] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const otherCount = sorted.slice(5).reduce((acc, curr) => acc + curr[1], 0);

    return {
      labels: [...top5.map(x => x[0]), 'Others'],
      datasets: [{
        data: [...top5.map(x => x[1]), otherCount],
        backgroundColor: ['#004A74', '#FED400', '#10B981', '#6366F1', '#F43F5E', '#94A3B8'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }, [libraryItems]);

  // Block C: Research & Publication
  const pubStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    publicationItems.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });

    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#94A3B8', '#004A74', '#3B82F6', '#F59E0B', '#10B981', '#10B981', '#EF4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [publicationItems]);

  const upcomingTeaching = useMemo(() => {
    const now = new Date();
    now.setHours(0,0,0,0);
    return teachingItems
      .filter(t => new Date(t.teachingDate) >= now)
      .sort((a,b) => new Date(a.teachingDate).getTime() - new Date(b.teachingDate).getTime())
      .slice(0, 5);
  }, [teachingItems]);

  const recentActivities = useMemo(() => {
    return [...activityItems]
      .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5);
  }, [activityItems]);

  const tracerStats = useMemo(() => {
    const completed = tracerProjects.filter(t => t.status === TracerStatus.COMPLETED).length;
    const inProgress = tracerProjects.filter(t => t.status === TracerStatus.IN_PROGRESS).length;
    return { completed, inProgress };
  }, [tracerProjects]);

  return (
    <div className="flex flex-col space-y-8 pb-32 animate-in fade-in duration-700">
      
      {/* BLOK A: LIBRARY GROWTH */}
      <section className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-sm relative overflow-hidden group">
         <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="space-y-1">
               <h3 className="text-xl font-black text-[#004A74] flex items-center gap-3">
                  <TrendingUp className="text-[#FED400]" size={24} strokeWidth={3} />
                  Knowledge Base Velocity
               </h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">12-Month Cumulative Library Expansion</p>
            </div>
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 max-w-[200px] md:max-w-none">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#004A74]" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Literature</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#FED400]" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Personal</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Task</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                 <span className="text-[8px] font-black uppercase tracking-tighter">Other</span>
               </div>
            </div>
         </div>
         
         <div className="h-64 md:h-80 w-full relative z-10">
           <Line 
             data={growthChartData}
             options={{
               responsive: true,
               maintainAspectRatio: false,
               layout: {
                 padding: {
                   top: 20
                 }
               },
               plugins: { 
                 legend: { display: false }, 
                 tooltip: { 
                   backgroundColor: '#004A74',
                   titleFont: { size: 10, weight: 'bold' },
                   bodyFont: { size: 12, weight: 'bold' },
                   padding: 12,
                   cornerRadius: 16,
                   displayColors: true
                 },
                 datalabels: {
                   display: true,
                   align: 'top',
                   anchor: 'end',
                   offset: 4,
                   font: {
                     size: 9,
                     weight: 'bold'
                   },
                   color: (context) => (context.dataset.borderColor as string),
                   formatter: (value) => value > 0 ? value : ''
                 }
               },
               scales: { 
                 y: { 
                   display: false,
                   suggestedMax: Math.max(...growthChartData.datasets.flatMap(d => d.data)) + 5
                 }, 
                 x: { 
                   grid: { display: false }, 
                   ticks: { font: { size: 10, weight: 'bold' }, color: '#94A3B8' }
                 } 
               }
             }}
           />
         </div>
      </section>

      {/* BLOK B: LIBRARY DISTRIBUTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Total Card */}
         <div className="bg-[#004A74] rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -translate-y-12 translate-x-12 rounded-full group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10">
               <Library size={32} className="text-[#FED400] mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Total Knowledge Assets</p>
               <h2 className="text-6xl font-black tracking-tighter mt-2">{libraryItems.length}</h2>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="mt-10 flex items-center gap-2 text-[#FED400] font-black uppercase text-[10px] tracking-widest hover:translate-x-2 transition-all"
            >
              Open Library <ChevronRight size={14} />
            </button>
         </div>

         {/* Category Chart */}
         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6">Source Categories</h4>
            <div className="w-full h-40">
               <Doughnut data={categoryDistribution} options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false }}}} />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1">
               {categoryDistribution.labels.slice(0, 3).map((l, i) => (
                 <div key={l} className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryDistribution.datasets[0].backgroundColor[i] }} />
                   <span className="text-[8px] font-bold text-[#004A74] uppercase truncate max-w-[60px]">{l}</span>
                 </div>
               ))}
            </div>
         </div>

         {/* Topic Chart */}
         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6">Top Research Topics</h4>
            <div className="w-full h-40">
               <Doughnut data={topicDistribution} options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false }}}} />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1">
               {topicDistribution.labels.slice(0, 3).map((l, i) => (
                 <div key={l} className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topicDistribution.datasets[0].backgroundColor[i] }} />
                   <span className="text-[8px] font-bold text-[#004A74] uppercase truncate max-w-[60px]">{l}</span>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* BLOK C: RESEARCH & PUBLICATION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center space-y-6">
            <div className="space-y-1">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Research Tracer</h4>
               <p className="text-xl font-black text-[#004A74] uppercase tracking-tighter">Strategic Pipeline</p>
            </div>
            <div className="space-y-3">
               <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                     <Target size={20} className="text-emerald-500" />
                     <span className="text-[10px] font-black text-emerald-700 uppercase">Target Achieved</span>
                  </div>
                  <span className="text-xl font-black text-emerald-700">{tracerStats.completed}</span>
               </div>
               <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                     <TrendingUp size={20} className="text-blue-500" />
                     <span className="text-[10px] font-black text-blue-700 uppercase">Active Pipeline</span>
                  </div>
                  <span className="text-xl font-black text-blue-700">{tracerStats.inProgress}</span>
               </div>
            </div>
         </div>

         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center col-span-2">
            <div className="flex items-center justify-between w-full mb-6">
               <h3 className="text-sm font-black text-[#004A74] uppercase tracking-tighter flex items-center gap-2">
                  <PieChartIcon size={18} className="text-[#FED400]" /> Publication Lifecycle
               </h3>
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total: {publicationItems.length} Papers</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-8 items-center">
               <div className="h-48">
                  <Pie data={pubStatusData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 9, weight: 'bold' }, color: '#004A74', boxWidth: 8, boxHeight: 8, padding: 10 } }, datalabels: { display: false }}}} />
               </div>
               <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                     <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Recent Achievement</p>
                     {publicationItems.find(p => p.status === PublicationStatus.PUBLISHED) ? (
                        <h5 className="text-[11px] font-black text-[#004A74] uppercase leading-tight line-clamp-2">
                           {publicationItems.find(p => p.status === PublicationStatus.PUBLISHED)?.title}
                        </h5>
                     ) : (
                        <p className="text-[10px] text-gray-300 italic">No published items yet.</p>
                     )}
                  </div>
                  <button 
                    onClick={() => navigate('/research/publication')}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[9px] font-black text-gray-400 hover:text-[#004A74] hover:border-[#004A74] transition-all"
                  >
                    VIEW SHOWCASE
                  </button>
               </div>
            </div>
         </div>
      </section>

      {/* BLOK D: LIVE FEED */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
         {/* Upcoming Teaching */}
         <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                  <BookOpenCheck size={18} className="text-[#FED400]" /> Upcoming Teaching
               </h3>
               <button onClick={() => navigate('/teaching')} className="text-[9px] font-black text-gray-400 hover:text-[#004A74] uppercase tracking-widest">Full Schedule</button>
            </div>
            <div className="space-y-3">
               {upcomingTeaching.length === 0 ? (
                  <div className="p-10 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                     <p className="text-[10px] font-black uppercase text-gray-300">No scheduled sessions</p>
                  </div>
               ) : upcomingTeaching.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/teaching/${t.id}`, { state: { activeTab: 'schedule' } })}
                    className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer group"
                  >
                     <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: t.eventColor || '#004A74' }} />
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t.teachingDate}</span>
                           <span className="text-[8px] font-black text-[#004A74] bg-[#FED400]/20 px-2 py-0.5 rounded-full">{t.startTime}</span>
                        </div>
                        <h4 className="text-xs font-black text-[#004A74] uppercase truncate leading-tight group-hover:text-blue-600">{t.courseTitle || t.label}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                           <MapPin size={10} /> {t.location || 'N/A'}
                        </p>
                     </div>
                     <ChevronRight size={18} className="text-gray-200 group-hover:text-[#FED400] transition-transform group-hover:translate-x-1" />
                  </div>
               ))}
            </div>
         </div>

         {/* Recent Activities */}
         <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-[#FED400]" /> Recent Portfolio
               </h3>
               <button onClick={() => navigate('/activities')} className="text-[9px] font-black text-gray-400 hover:text-[#004A74] uppercase tracking-widest">All Activities</button>
            </div>
            <div className="space-y-3">
               {recentActivities.length === 0 ? (
                  <div className="p-10 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                     <p className="text-[10px] font-black uppercase text-gray-300">No activities recorded</p>
                  </div>
               ) : recentActivities.map(a => (
                  <div 
                    key={a.id} 
                    onClick={() => navigate(`/activities/${a.id}`)}
                    className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer group"
                  >
                     <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#004A74]/20 group-hover:bg-[#004A74] group-hover:text-[#FED400] transition-all">
                        <Award size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{a.startDate}</span>
                           <span className="text-[8px] font-black text-[#004A74] bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{a.role}</span>
                        </div>
                        <h4 className="text-xs font-black text-[#004A74] uppercase truncate leading-tight group-hover:text-blue-600">{a.eventName}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{a.organizer}</p>
                     </div>
                     <ChevronRight size={18} className="text-gray-200 group-hover:text-[#FED400] transition-transform group-hover:translate-x-1" />
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-20 text-center opacity-20">
         <div className="w-10 h-0.5 bg-[#004A74] mx-auto mb-4 rounded-full" />
         <p className="text-[8px] font-black text-[#004A74] uppercase tracking-[0.8em]">XEENAPS ANALYTIC INFRASTRUCTURE</p>
      </footer>
    </div>
  );
};

export default DashboardMain;