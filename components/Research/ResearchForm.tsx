
import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { LibraryItem, ResearchProject, ResearchStatus, LibraryType } from '../../types';
import { saveResearchProject, saveProjectSource } from '../../services/ResearchService';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';
import { 
  Plus as PlusIcon, 
  Database as CircleStackIcon, 
  CheckCircle2, 
  Sparkles as SparklesIcon,
  Layers as LayersIcon,
  Trash2
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

interface ResearchFormProps {
  items: LibraryItem[];
}

const ResearchForm: React.FC<ResearchFormProps> = ({ items }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    language: 'English'
  });
  
  const [selectedSources, setSelectedSources] = useState<LibraryItem[]>([]);

  const filteredLibrary = useMemo(() => {
    return items.filter(it => it.type === LibraryType.LITERATURE || it.type === LibraryType.TASK);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSources.length === 0) {
      showXeenapsToast('warning', 'Please select at least 1 source for initial audit.');
      return;
    }

    setIsSubmitting(true);
    Swal.fire({ title: 'Initializing Project...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...XEENAPS_SWAL_CONFIG });

    try {
      const projectId = crypto.randomUUID();
      const newProject: ResearchProject = {
        id: projectId,
        projectName: formData.projectName,
        language: formData.language,
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
        // Save initial sources to registry
        for (const it of selectedSources) {
          await saveProjectSource({
            id: crypto.randomUUID(),
            projectId: projectId,
            sourceId: it.id,
            title: it.title,
            findings: '',
            methodology: '',
            limitations: '',
            createdAt: new Date().toISOString()
          });
        }
        Swal.close();
        navigate(`/research/work/${projectId}`);
      } else {
        throw new Error("Backend save failed");
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'INIT FAILED', text: 'Connection lost. Please try again.', ...XEENAPS_SWAL_CONFIG });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormPageContainer>
      <FormStickyHeader 
        title="New Research Audit" 
        subtitle="Initialize sequential gap analysis" 
        onBack={() => navigate('/research')} 
      />
      <FormContentArea>
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Audit Project Label" required error={!formData.projectName}>
              <input 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-sm font-bold text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/10"
                placeholder="e.g., Green Architecture Review 2024..."
                value={formData.projectName}
                onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                required
              />
            </FormField>
            
            <FormField label="Synthesis Language">
              <FormDropdown 
                value={formData.language}
                options={['English', 'Indonesian', 'French', 'German']}
                onChange={(v) => setFormData({...formData, language: v})}
                placeholder="Select Language"
                allowCustom={false}
                showSearch={false}
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <FormField label="Source Literature Selection (Enumlist)" required>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <CircleStackIcon className="w-5 h-5 text-gray-300" />
                </div>
                <FormDropdown 
                  isMulti 
                  multiValues={selectedSources.map(s => s.title)}
                  onAddMulti={(val) => {
                    if (selectedSources.length >= 5) {
                      showXeenapsToast('warning', 'Maximum 5 initial sources allowed.');
                      return;
                    }
                    const found = items.find(it => it.title === val);
                    if (found && !selectedSources.some(s => s.id === found.id)) {
                      setSelectedSources([...selectedSources, found]);
                    }
                  }}
                  onRemoveMulti={(val) => {
                    setSelectedSources(selectedSources.filter(s => s.title !== val));
                  }}
                  options={filteredLibrary.map(it => it.title)}
                  placeholder="Smart Search library metadata..."
                  value="" onChange={() => {}}
                />
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 px-1">Selected: {selectedSources.length} / 5 Slots</p>
            </FormField>

            {/* PREVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {selectedSources.map(s => (
                 <div key={s.id} className="flex items-center justify-between p-4 bg-[#004A74]/5 rounded-2xl border border-[#004A74]/10 animate-in zoom-in-95">
                    <div className="flex items-center gap-3 min-w-0">
                       <CheckCircle2 size={16} className="text-[#004A74] shrink-0" />
                       <span className="text-xs font-bold text-[#004A74] truncate pr-2 uppercase">{s.title}</span>
                    </div>
                    <button onClick={() => setSelectedSources(selectedSources.filter(it => it.id !== s.id))} className="text-red-300 hover:text-red-500 p-1">
                       <Trash2 size={14} />
                    </button>
                 </div>
               ))}
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100">
             <button 
               type="submit"
               disabled={isSubmitting || selectedSources.length === 0}
               className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#004A74]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale"
             >
               <SparklesIcon size={20} /> Initialize Audit Workspace
             </button>
          </div>

        </form>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default ResearchForm;
