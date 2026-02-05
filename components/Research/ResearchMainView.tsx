
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ResearchProject, ResearchStatus } from '../../types';
import { fetchResearchProjects, deleteResearchProject, saveResearchProject } from '../../services/ResearchService';
import { 
  Plus as PlusIcon, 
  Trash2 as TrashIcon, 
  Eye as EyeIcon, 
  Star,
  Layers as LayersIcon,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  ArrowUpDown as ArrowsUpDownIcon,
  Check as CheckIcon,
  Settings2 as AdjustmentsHorizontalIcon,
  Calendar
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd, 
  StandardTableFooter, 
  StandardCheckbox,
  ElegantTooltip,
  StandardGridContainer,
  StandardItemCard
} from '../Common/TableComponents';
import { 
  StandardPrimaryButton as AddButton,
  StandardQuickAccessBar,
  StandardQuickActionButton
} from '../Common/ButtonComponents';
import { TableSkeletonRows, CardGridSkeleton } from '../Common/LoadingComponents';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

interface ResearchMainViewProps {
  items: any[]; 
}

const ResearchMainView: React.FC<ResearchMainViewProps> = () => {
  const navigate = useNavigate();
  const workflow = useAsyncWorkflow(30000);
  const { performUpdate, performDelete } = useOptimisticUpdate<ResearchProject>();
  
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const itemsPerPage = isMobile ? 12 : 20;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        const result = await fetchResearchProjects(currentPage, itemsPerPage, appliedSearch, sortConfig.key, sortConfig.dir, signal);
        setProjects(result.items);
        setTotalCount(result.totalCount);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [currentPage, appliedSearch, sortConfig, itemsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewAudit = async () => {
    const { value: label } = await Swal.fire({
      title: 'NEW AUDIT',
      input: 'text',
      inputLabel: 'Project Name / Label',
      inputPlaceholder: 'e.g., Green Architecture Review 2024...',
      showCancelButton: true,
      confirmButtonText: 'INITIALIZE',
      ...XEENAPS_SWAL_CONFIG,
      inputAttributes: {
        autocapitalize: 'off'
      },
      inputValidator: (value) => {
        if (!value) return 'Label is mandatory!';
        return null;
      }
    });

    if (label) {
      Swal.fire({ 
        title: 'CREATING WORKSPACE...', 
        text: 'Preparing workspace for your audit...',
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading(), 
        ...XEENAPS_SWAL_CONFIG 
      });

      try {
        const projectId = crypto.randomUUID();
        const newProject: ResearchProject = {
          id: projectId,
          projectName: label.toUpperCase(),
          language: 'English',
          status: ResearchStatus.DRAFT,
          isFavorite: false,
          proposedTitle: '',
          noveltyNarrative: '',
          futureDirections: '[]',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const success = await saveResearchProject(newProject);
        if (success) {
          Swal.close();
          // Identical to Literature Review: Pass state for seamless transition
          navigate(`/research/work/${projectId}`, { state: { project: newProject } });
        } else {
          throw new Error("Backend save failed");
        }
      } catch (e) {
        Swal.fire({ icon: 'error', title: 'INIT FAILED', text: 'Cloud synchronization interrupted.', ...XEENAPS_SWAL_CONFIG });
      }
    }
  };

  const handleSearchTrigger = () => {
    setAppliedSearch(localSearch);
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowsUpDownIcon size={12} className="text-gray-300" />;
    return sortConfig.dir === 'asc' ? <ChevronUpIcon size={12} className="text-[#004A74]" /> : <ChevronDownIcon size={12} className="text-[#004A74]" />;
  };

  const toggleFavorite = async (e: React.MouseEvent, project: ResearchProject) => {
    e.stopPropagation();
    await performUpdate(
      projects,
      setProjects,
      [project.id],
      (p) => ({ ...p, isFavorite: !p.isFavorite }),
      async (updated) => await saveResearchProject(updated)
    );
    showXeenapsToast('success', 'Project preferences updated');
  };

  const toggleUsed = async (e: React.MouseEvent, project: ResearchProject) => {
    e.stopPropagation();
    await performUpdate(
      projects,
      setProjects,
      [project.id],
      (p) => ({ ...p, isUsed: !p.isUsed }),
      async (updated) => await saveResearchProject(updated)
    );
    showXeenapsToast('success', 'Project status updated');
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === projects.length && projects.length > 0) setSelectedIds([]);
    else setSelectedIds(projects.map(p => p.id));
  };

  const handleBatchAction = async (property: 'isFavorite' | 'isUsed') => {
    if (selectedIds.length === 0) return;
    const selectedProjects = projects.filter(p => selectedIds.includes(p.id));
    const anyFalse = selectedProjects.some(p => !p[property]);
    const newValue = anyFalse;

    await performUpdate(
      projects,
      setProjects,
      selectedIds,
      (p) => ({ ...p, [property]: newValue }),
      async (updated) => await saveResearchProject(updated),
      () => showXeenapsToast('error', 'Batch update failed')
    );
    showXeenapsToast('success', `Bulk update complete`);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showXeenapsDeleteConfirm(selectedIds.length);
    if (!confirmed) return;
    
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);
    await performDelete(
      projects,
      setProjects,
      idsToDelete,
      async (pid) => await deleteResearchProject(pid)
    );
    showXeenapsToast('success', 'Projects removed permanently');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      await performDelete(
        projects,
        setProjects,
        [id],
        async (pid) => await deleteResearchProject(pid)
      );
      showXeenapsToast('success', 'Project removed permanently');
    }
  };

  const getStatusColor = (status: ResearchStatus) => {
    switch (status) {
      case ResearchStatus.UTILIZED: return 'bg-green-100 text-green-700 border-green-200';
      case ResearchStatus.FINALIZED: return 'bg-[#004A74]/10 text-[#004A74] border-[#004A74]/20';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return '-'; }
  };

  const { anyUnfavorited, anyUnused } = useMemo(() => {
    const selected = projects.filter(p => selectedIds.includes(p.id));
    return {
      anyUnfavorited: selected.some(p => !p.isFavorite),
      anyUnused: selected.some(p => !p.isUsed)
    };
  }, [selectedIds, projects]);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-1">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
        <SmartSearchBox 
          value={localSearch} 
          onChange={setLocalSearch} 
          onSearch={handleSearchTrigger} 
          phrases={["Search project name...", "Search research gaps..."]}
        />
        <AddButton onClick={handleNewAudit} icon={<PlusIcon size={20} />}>
          Create
        </AddButton>
      </div>

      {/* MOBILE SORT & SELECT ALL BAR */}
      <div className="lg:hidden flex items-center justify-start gap-4 px-1 py-1 shrink-0 mb-4">
        <div className="relative">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}><AdjustmentsHorizontalIcon size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Sort</span></button>
          {showSortMenu && (
            <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
              {['projectName', 'status', 'createdAt'].map((k) => (
                <button key={k} onClick={() => { handleSort(k); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === k ? 'bg-[#004A74]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}><span>{k === 'projectName' ? 'Name' : k.charAt(0).toUpperCase() + k.slice(1)}</span>{sortConfig.key === k && (sortConfig.dir === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />)}</button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <button onClick={toggleSelectAll} className={`text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.length === projects.length && projects.length > 0 ? 'text-red-500' : 'text-[#004A74]'}`}>{selectedIds.length === projects.length && projects.length > 0 ? 'Deselect All' : 'Select All'}</button>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete} title="Mass Delete"><TrashIcon size={18} /></StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={() => handleBatchAction('isFavorite')} title="Mass Favorite">
          {anyUnfavorited ? <Star size={18} className="text-[#FED400]" /> : <Star size={18} className="text-[#FED400] fill-[#FED400]" />}
        </StandardQuickActionButton>
        <button 
          onClick={() => handleBatchAction('isUsed')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-90 border ${
            anyUnused ? 'bg-green-500 text-white border-green-600 hover:bg-green-600' : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
          }`}
        >
          {anyUnused ? 'USED' : 'UNUSED'}
        </button>
      </StandardQuickAccessBar>

      <div className="flex-1 mt-4">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden lg:block">
          <StandardTableContainer>
            <StandardTableWrapper>
              <thead>
                <tr>
                  <th className="sticky left-0 z-50 px-6 py-4 w-12 bg-gray-50 border-r border-gray-100/50 shadow-sm text-center">
                    <div className="flex items-center justify-center">
                      <StandardCheckbox onChange={toggleSelectAll} checked={projects.length > 0 && selectedIds.length === projects.length} />
                    </div>
                  </th>
                  <StandardTh width="180px" onClick={() => handleSort('status')} isActiveSort={sortConfig.key === 'status'}>
                    <div className="flex items-center gap-2">Status {getSortIcon('status')}</div>
                  </StandardTh>
                  <StandardTh width="250px" onClick={() => handleSort('projectName')} isActiveSort={sortConfig.key === 'projectName'}>
                    <div className="flex items-center gap-2">Project Name {getSortIcon('projectName')}</div>
                  </StandardTh>
                  <StandardTh width="400px">Novelty Suggestion</StandardTh>
                  <StandardTh width="150px" onClick={() => handleSort('createdAt')} isActiveSort={sortConfig.key === 'createdAt'}>
                    <div className="flex items-center gap-2">Created At {getSortIcon('createdAt')}</div>
                  </StandardTh>
                  <StandardTh width="120px" className="sticky right-0 bg-gray-50">Action</StandardTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableSkeletonRows count={8} />
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <LayersIcon size={48} className="mb-4 text-[#004A74]" />
                        <h3 className="text-lg font-black uppercase tracking-widest">No Research Projects</h3>
                        <p className="text-sm font-medium mt-2">Start your first gap analysis audit now.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <StandardTr key={p.id} onClick={() => navigate(`/research/work/${p.id}`, { state: { project: p } })} className="cursor-pointer">
                      <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-hover:bg-[#f0f7fa] shadow-sm text-center" onClick={e => e.stopPropagation()}>
                         <StandardCheckbox checked={selectedIds.includes(p.id)} onChange={() => toggleSelectItem(p.id)} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => toggleFavorite(e, p)}>
                            <Star size={16} className={`${p.isFavorite ? 'text-[#FED400] fill-[#FED400]' : 'text-[#FED400]'}`} />
                          </button>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border tracking-tight ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                          <button 
                            onClick={(e) => toggleUsed(e, p)}
                            className={`px-2 py-0.5 text-[7px] font-black rounded-full shadow-sm tracking-widest border transition-all ${
                              p.isUsed ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
                            }`}
                          >
                            {p.isUsed ? 'USED' : 'UNUSED'}
                          </button>
                        </div>
                      </td>
                      <StandardTd>
                        <ElegantTooltip text={p.projectName}>
                          <p className="text-sm font-bold text-[#004A74] uppercase line-clamp-1">{p.projectName}</p>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd>
                        <ElegantTooltip text={p.noveltyNarrative || 'No synthesis yet'}>
                          <p className="text-xs text-gray-500 line-clamp-2 italic leading-relaxed">
                            {p.noveltyNarrative ? p.noveltyNarrative.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'Matrix initialized, synthesis pending...'}
                          </p>
                        </ElegantTooltip>
                      </StandardTd>
                      <StandardTd className="text-center">
                         <span className="text-[10px] font-bold text-gray-400">{formatDateTime(p.createdAt)}</span>
                      </StandardTd>
                      <StandardTd className="sticky right-0 bg-white group-hover:bg-[#f0f7fa] text-center shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                         <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => navigate(`/research/work/${p.id}`, { state: { project: p } })} className="p-2 text-[#004A74] hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-gray-100">
                               <EyeIcon size={18} />
                            </button>
                            <button onClick={(e) => handleDelete(e, p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                               <TrashIcon size={18} />
                            </button>
                         </div>
                      </StandardTd>
                    </StandardTr>
                  ))
                )}
              </tbody>
            </StandardTableWrapper>
            <StandardTableFooter 
              totalItems={totalCount} 
              currentPage={currentPage} 
              itemsPerPage={itemsPerPage} 
              totalPages={Math.ceil(totalCount / itemsPerPage)} 
              onPageChange={setCurrentPage} 
            />
          </StandardTableContainer>
        </div>

        {/* MOBILE LIST CARD VIEW - REFACTORED TO LIST MODE */}
        <div className="lg:hidden">
          {isLoading ? (
            <CardGridSkeleton count={8} />
          ) : projects.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-2 bg-white border border-gray-100/50 rounded-[2rem] shadow-sm mx-1">
              <LayersIcon size={48} className="mb-4 text-[#004A74] opacity-20" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Projects Found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in duration-500 px-1">
              {projects.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => navigate(`/research/work/${p.id}`, { state: { project: p } })}
                  className={`bg-white border border-gray-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden ${
                    selectedIds.includes(p.id) ? 'ring-2 ring-[#004A74] bg-blue-50' : ''
                  }`}
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelectItem(p.id); }}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-200 hover:border-[#004A74]/30'}`}
                  >
                    {selectedIds.includes(p.id) && <CheckIcon size={14} strokeWidth={4} />}
                  </div>
                  <div className="w-1.5 h-12 rounded-full shrink-0 bg-[#004A74]" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#004A74] truncate uppercase leading-tight">{p.projectName}</h4>
                    <p className="text-[10px] font-medium text-gray-400 truncate italic mt-0.5">
                      {p.noveltyNarrative ? p.noveltyNarrative.replace(/<[^>]*>/g, '') : "Synthesis pending..."}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border tracking-tight ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                      <span className={`px-2 py-0.5 text-[7px] font-black rounded-full shadow-sm tracking-widest border transition-all ${
                        p.isUsed ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'
                      }`}>
                        {p.isUsed ? 'USED' : 'UNUSED'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-300 mt-2 uppercase tracking-widest">
                        <Calendar size={12} className="w-3 h-3" /> {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => toggleFavorite(e, p)} className="p-2 text-[#FED400] bg-yellow-50/30 rounded-xl transition-all">
                      {p.isFavorite ? <Star size={18} fill="currentColor" /> : <Star size={18} />}
                    </button>
                    <button onClick={() => navigate(`/research/work/${p.id}`, { state: { project: p } })} className="p-2.5 text-cyan-600 bg-cyan-50 rounded-xl active:scale-90 transition-all">
                      <EyeIcon size={18} />
                    </button>
                    <button onClick={(e) => handleDelete(e, p.id)} className="p-2.5 text-red-500 bg-red-50 rounded-xl active:scale-90 transition-all">
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalCount > itemsPerPage && (
            <div className="pt-8">
              <StandardTableFooter 
                totalItems={totalCount} 
                currentPage={currentPage} 
                itemsPerPage={itemsPerPage} 
                totalPages={Math.ceil(totalCount / itemsPerPage)} 
                onPageChange={setCurrentPage} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchMainView;
