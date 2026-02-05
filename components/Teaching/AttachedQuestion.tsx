import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QuestionItem, TeachingItem, BloomsLevel, LibraryItem } from '../../types';
import { fetchAllQuestionsPaginated } from '../../services/QuestionService';
import { fetchTeachingPaginated } from '../../services/TeachingService';
import { fetchLibrary } from '../../services/gasService';
import { 
  ArrowLeftIcon, 
  AcademicCapIcon, 
  PlayIcon,
  RectangleStackIcon,
  ClockIcon,
  TagIcon,
  CheckBadgeIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import CbtFocusMode from '../QuestionBank/CbtFocusMode';
import QuestionDetailView from '../QuestionBank/QuestionDetailView';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { StandardFilterButton } from '../Common/ButtonComponents';
import { useAsyncWorkflow } from '../../hooks/useAsyncWorkflow';

const getBloomColor = (level: BloomsLevel) => {
  if (level.includes('C1') || level.includes('C2')) return 'bg-green-500';
  if (level.includes('C3') || level.includes('C4')) return 'bg-[#004A74]';
  return 'bg-[#FED400] text-[#004A74]';
};

const AttachedQuestion: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const workflow = useAsyncWorkflow(30000);

  const [teaching, setTeaching] = useState<TeachingItem | null>((location.state as any)?.item || null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [activeBloomFilter, setSelectedBloomFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [activeSimulation, setActiveSimulation] = useState<'CBT' | 'FLASHCARD' | null>(null);
  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState<QuestionItem | null>(null);

  const bloomFilters = ['All', ...Object.values(BloomsLevel)];

  const loadData = useCallback(() => {
    workflow.execute(
      async (signal) => {
        setIsLoading(true);
        
        // 1. Fetch Teaching Session if missing
        let session = teaching;
        if (!session && sessionId) {
          // Fix: Added missing empty string for endDate parameter to align signal correctly
          const res = await fetchTeachingPaginated(1, 1000, "", "", "", signal);
          session = res.items.find(i => i.id === sessionId) || null;
          setTeaching(session);
        }

        // 2. Fetch Library Items to resolve root sources
        const libs = await fetchLibrary();
        setLibraryItems(libs);

        if (!session || !Array.isArray(session.questionBankId) || session.questionBankId.length === 0) {
          setQuestions([]);
          setIsLoading(false);
          return;
        }

        // 3. Fetch All Questions to filter (Simplest way to get full objects)
        const qRes = await fetchAllQuestionsPaginated(1, 1000, "", "", "", "All", "createdAt", "desc", signal);
        const attachedIds = session.questionBankId.map(q => q.id);
        const filtered = qRes.items.filter(q => attachedIds.includes(q.id));
        setQuestions(filtered);
      },
      () => setIsLoading(false),
      () => setIsLoading(false)
    );
  }, [sessionId, teaching, workflow]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQuestions = questions.filter(q => 
    activeBloomFilter === 'All' || q.bloomLevel === activeBloomFilter
  );

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return "-"; }
  };

  if (!teaching && !isLoading) return <div className="p-10 text-center">Session not found</div>;

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar relative">
      
      {activeSimulation && (
        <CbtFocusMode 
          questions={filteredQuestions}
          mode={activeSimulation}
          onClose={() => setActiveSimulation(null)}
        />
      )}

      {selectedQuestionDetail && (
        <QuestionDetailView 
          question={selectedQuestionDetail}
          collection={libraryItems.find(li => li.id === selectedQuestionDetail.collectionId) || ({ title: teaching?.courseTitle } as any)}
          onClose={() => setSelectedQuestionDetail(null)}
          onViewSource={() => {
            const sourceLibItem = libraryItems.find(li => li.id === selectedQuestionDetail.collectionId);
            if (sourceLibItem) {
              // ENHANCED: Pass return flag and teaching state to ensure back button works properly
              navigate('/', { state: { openItem: sourceLibItem, returnToAttachedQuestion: sessionId, teachingItem: teaching } });
            } else {
              // Redirection Fix: Ensure return state is passed back to substance tab
              navigate(`/teaching/${sessionId}`, { state: { activeTab: 'substance', item: teaching } });
            }
            setSelectedQuestionDetail(null);
          }}
        />
      )}

      {/* HEADER */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 bg-white shrink-0 sticky top-0 z-40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Redirection Fix: Ensure return state is passed back to substance tab */}
            <button onClick={() => navigate(`/teaching/${sessionId}`, { state: { activeTab: 'substance', item: teaching } })} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm">
              <ArrowLeftIcon className="w-[18px] h-[18px]" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-black text-[#004A74] uppercase tracking-tight">Attached Questions</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Session: {teaching?.label}</p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
             <button onClick={() => setActiveSimulation('FLASHCARD')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:text-[#004A74] transition-all">
                <RectangleStackIcon className="w-4 h-4" /> Flashcards
             </button>
             <button onClick={() => setActiveSimulation('CBT')} className="flex items-center gap-2 px-4 py-2 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all">
                <PlayIcon className="w-4 h-4" /> Exam Mode
             </button>
          </div>
        </div>

        <div className="mt-6 flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {bloomFilters.map(filter => (
            <StandardFilterButton 
              key={filter} 
              isActive={activeBloomFilter === filter} 
              onClick={() => setSelectedBloomFilter(filter)}
            >
              {filter}
            </StandardFilterButton>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 md:p-10 pb-32">
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 grayscale">
            <AcademicCapIcon className="w-16 h-16 mb-4 text-[#004A74]" />
            <h3 className="text-lg font-black uppercase tracking-widest">No attached questions</h3>
            <p className="text-xs font-medium mt-2">Questions linked to this session will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuestions.map((q) => (
              <div 
                key={q.id}
                onClick={() => setSelectedQuestionDetail(q)}
                className="group relative bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${getBloomColor(q.bloomLevel)}`}>
                    {q.bloomLevel}
                  </span>
                  <button className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg"><EyeIcon className="w-4 h-4" /></button>
                </div>

                <div className="mb-4 flex-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                    <TagIcon className="w-2.5 h-2.5" /> {q.customLabel}
                  </p>
                  <p className="text-sm font-bold text-[#004A74] leading-relaxed line-clamp-4">
                    "{q.questionText}"
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-1.5"><ClockIcon className="w-3 h-3" /> {formatShortDate(q.createdAt)}</div>
                  <div className="flex items-center gap-1.5 text-[#004A74]"><CheckBadgeIcon className="w-3 h-3" /> Correct: {q.correctAnswer}</div>
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

export default AttachedQuestion;