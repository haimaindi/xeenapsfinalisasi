import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { useNavigate, Routes, Route } from 'react-router-dom';
import { CVDocument } from '../../types';
import { fetchCVList, deleteCVDocument } from '../../services/CVService';
import { 
  FileUser, 
  Plus, 
  Trash2, 
  Download, 
  Eye, 
  FileText, 
  Clock, 
  LayoutGrid,
  Search,
  ExternalLink
} from 'lucide-react';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardPrimaryButton } from '../Common/ButtonComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import CVForm from './CVForm';

const CVGallery: React.FC = () => {
  const navigate = useNavigate();
  const [cvs, setCvs] = useState<CVDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchCVList();
    // Ensure descendant order (Newest first)
    const sortedData = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCvs(sortedData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteCVDocument(id);
      if (success) {
        showXeenapsToast('success', 'CV removed from cloud');
        loadData();
      }
    }
  };

  const handleView = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');
  };

  const filteredCvs = cvs.filter(cv => 
    cv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFullDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    } catch { return "-"; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-1 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between mb-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
            <FileUser size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">The Architect</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">CV Generation Engine</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1 max-w-3xl items-center">
          <div className="flex-1 w-full">
            <SmartSearchBox 
              value={searchQuery} 
              onChange={setSearchQuery} 
              phrases={["Search by CV Title...", "Find your generated CVs..."]}
              className="w-full"
            />
          </div>
          <StandardPrimaryButton onClick={() => navigate('/cv-architect/new')} icon={<Plus size={20} />}>
            Create CV
          </StandardPrimaryButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : filteredCvs.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
            <FileUser size={80} strokeWidth={1} className="text-[#004A74]" />
            <p className="text-sm font-black uppercase tracking-[0.4em]">No CV Documents Found</p>
            <p className="text-xs font-bold text-gray-400 italic">Click "Create CV" to initialize synthesis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
            {filteredCvs.map(cv => (
              <div 
                key={cv.id}
                onClick={(e) => handleView(e, cv.fileId)}
                className="group relative bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-[#004A74] leading-tight uppercase line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">{cv.title}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock size={10} />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">{formatFullDateTime(cv.createdAt)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, cv.id)} 
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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

const CVMain: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CVGallery />} />
      <Route path="/new" element={<CVForm />} />
    </Routes>
  );
};

export default CVMain;