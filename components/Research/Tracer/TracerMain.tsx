import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore - Resolving TS error for missing exported member
import { useNavigate } from 'react-router-dom';
import { TracerProject, TracerStatus } from '../../../types';
import { fetchTracerProjects, saveTracerProject, deleteTracerProject } from '../../../services/TracerService';
import { getCleanedProfileName } from '../../../services/ProfileService';
import { 
  Plus, 
  Trash2, 
  Target, 
  ChevronRight, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  Search 
} from 'lucide-react';
import { SmartSearchBox } from '../../Common/SearchComponents';
/* Corrected import source for StandardPrimaryButton */
import { StandardTableFooter } from '../../Common/TableComponents';
import { StandardPrimaryButton } from '../../Common/ButtonComponents';
import { CardGridSkeleton } from '../../Common/LoadingComponents';
import { useAsyncWorkflow } from '../../../hooks/useAsyncWorkflow';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../../utils/swalUtils';

const TracerMain: React.FC = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  const [projects, setProjects] = useState<TracerProject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchTracerProjects(currentPage, 12, appliedSearch, signal);
        setProjects(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, workflow.execute]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- GLOBAL SILENT SYNC LISTENERS ---
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const item = e.detail as TracerProject;
      setProjects(prev => {
        const index = prev.findIndex(p => p.id === item.id);
        if (index > -1) {
          return prev.map(p => p.id === item.id ? item : p);
        } else {
          return [item, ...prev];
        }
      });
    };

    const handleDelete = (e: any) => {
      const id = e.detail;
      setProjects(prev => prev.filter(p => p.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    };

    window.addEventListener('xeenaps-tracer-updated', handleUpdate);
    window.addEventListener('xeenaps-tracer-deleted', handleDelete);
    return () => {
      window.removeEventListener('xeenaps-tracer-updated', handleUpdate);
      window.removeEventListener('xeenaps-tracer-deleted', handleDelete);
    };
  }, [projects.length]);

  const handleCreate = async () => {
    const { value: label } = await Swal.fire({
      title: 'NEW AUDIT TRAIL',
      input: 'text',
      inputLabel: 'Project Label',
      inputPlaceholder: 'e.g., DNA-EXP-01...',
      showCancelButton: true,
      confirmButtonText: 'INITIALIZE',
      ...XEENAPS_SWAL_CONFIG,
      inputValidator: (v) => !v ? 'Label required' : null
    });

    if (label) {
      // START HANDSHAKE PROCESS
      Swal.fire({
        title: 'INITIALIZING...',
        text: 'Establishing secure cloud connection...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        ...XEENAPS_SWAL_CONFIG
      });

      try {
        // Fetch Cleaned Profile Name for dynamic initialization
        const cleanedAuthorName = await getCleanedProfileName();
        
        const id = crypto.randomUUID();
        const newItem: TracerProject = {
          id,
          title: '', // Initialized as empty
          label: label.toUpperCase(),
          topic: '',
          problemStatement: '',
          researchGap: '',
          researchQuestion: '',
          methodology: '',
          population: '',
          keywords: [],
          category: 'Experimental',
          authors: [cleanedAuthorName],
          startDate: new Date().toLocaleDateString('sv'), // TODAY() fix
          estEndDate: '',
          status: TracerStatus.IN_PROGRESS,
          progress: 0, // Initialized as 0
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const success = await saveTracerProject(newItem);
        Swal.close();

        if (success) {
          navigate(`/research/tracer/${id}`);
        } else {
          showXeenapsToast('error', 'Cloud sync failed');
        }
      } catch (err) {
        Swal.close();
        showXeenapsToast('error', 'Handshake interrupted');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await showXeenapsDeleteConfirm(1)) {
      if (await deleteTracerProject(id)) {
        showXeenapsToast('success', 'Project purged');
        loadData();
      }
    }
  };

  const getStatusColor = (s: TracerStatus) => {
    switch(s) {
      case TracerStatus.COMPLETED: return 'bg-green-500 text-white';
      case TracerStatus.ON_HOLD: return 'bg-orange-400 text-white';
      default: return 'bg-[#004A74] text-white';
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <Target size={24} />
           </div>
           <div>
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Tracer</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Research Audit Trail & Lab Logs</p>
           </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full lg:max-w-xl justify-end">
          <SmartSearchBox value={searchQuery} onChange={setSearchQuery} onSearch={() => setAppliedSearch(searchQuery)} className="w-full lg:max-w-md" />
          <StandardPrimaryButton onClick={handleCreate} icon={<Plus size={18} />}>Initialize Audit</StandardPrimaryButton>
        </div>
      </div>

      <div className="pb-20">
        {isLoading ? <CardGridSkeleton count={8} /> : projects.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-20">
             <Target size={80} strokeWidth={1} />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Audit Registry Empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-1">
            {projects.map(p => (
              <div key={p.id} onClick={() => navigate(`/research/tracer/${p.id}`)} className="group bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                   <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${getStatusColor(p.status)}`}>{p.status}</span>
                   <button onClick={(e) => handleDelete(e, p.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={16} /></button>
                </div>
                <h3 className="text-base font-black text-[#004A74] uppercase leading-tight line-clamp-2 mb-4 flex-1">{p.title || p.label}</h3>
                <div className="space-y-3 mb-6">
                   <div className="flex items-center gap-2 text-gray-400">
                     <User size={12} />
                     <span className="text-[10px] font-bold uppercase tracking-tight">
                       {Array.isArray(p.authors) && p.authors.length > 0 ? (p.authors[0] || 'Unknown Author') : 'Unknown Author'}
                     </span>
                   </div>
                   <div className="flex items-center gap-2 text-gray-400">
                     <Calendar size={12} />
                     <span className="text-[10px] font-bold uppercase tracking-tight">{p.startDate}</span>
                   </div>
                </div>
                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden mb-4">
                   <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.progress}% Completed</span>
                   <ChevronRight size={18} className="text-gray-300 group-hover:text-[#FED400] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <StandardTableFooter totalItems={totalCount} currentPage={currentPage} itemsPerPage={12} totalPages={Math.ceil(totalCount / 12)} onPageChange={setCurrentPage} />
    </div>
  );
};

export default TracerMain;