
import React, { useState, useEffect } from 'react';
import { LibraryItem, GapAnalysisRow, NoveltySynthesis } from '../../types';
import { 
  fetchHybridSnippet, 
  analyzeSingleSourceGap, 
  checkStoredGap, 
  saveGapToRegistry,
  synthesizeOverallNovelty
} from '../../services/GapFinderService';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Zap,
  CheckCircle2,
  Lock,
  SearchCode
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';

interface GapFinderViewProps {
  sources: LibraryItem[];
  onBack: () => void;
  onComplete: (novelty: NoveltySynthesis, matrix: GapAnalysisRow[]) => void;
}

const GapFinderView: React.FC<GapFinderViewProps> = ({ sources, onBack, onComplete }) => {
  const [matrix, setMatrix] = useState<GapAnalysisRow[]>([]);
  const [processingIdx, setProcessingIdx] = useState<number | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Sequential Processing
  useEffect(() => {
    const processAudit = async () => {
      const results: GapAnalysisRow[] = [];
      
      for (let i = 0; i < sources.length; i++) {
        setProcessingIdx(i);
        const source = sources[i];
        
        // 1. Check if already audited in Spreadsheet
        const existing = await checkStoredGap(source.id);
        if (existing) {
          results.push(existing);
          setMatrix([...results]);
          continue;
        }

        // 2. Fetch Hybrid Snippet (Intro + Conclusion)
        const snippet = await fetchHybridSnippet(source);
        if (!snippet) {
          showXeenapsToast('warning', `Failed to access content for: ${source.title.substring(0, 20)}...`);
          continue;
        }

        // 3. AI Audit Matrix
        const aiAnalysis = await analyzeSingleSourceGap(snippet, source.title);
        if (aiAnalysis) {
          const log: GapAnalysisRow = {
            id: crypto.randomUUID(),
            sourceId: source.id,
            title: source.title,
            findings: aiAnalysis.findings || '',
            methodology: aiAnalysis.methodology || '',
            limitations: aiAnalysis.limitations || '',
            createdAt: new Date().toISOString()
          };
          
          await saveGapToRegistry(log);
          results.push(log);
          setMatrix([...results]);
        }
      }
      
      setProcessingIdx(null);
    };

    processAudit();
  }, [sources]);

  const handleStartSynthesis = async () => {
    if (matrix.length === 0) return;
    setIsSynthesizing(true);
    try {
      const novelty = await synthesizeOverallNovelty(matrix);
      if (novelty) {
        onComplete(novelty, matrix);
      } else {
        showXeenapsToast('error', 'Synthesis engine failed.');
      }
    } catch (e) {
      showXeenapsToast('error', 'Synthesis interrupted.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1A0B2E] text-white overflow-hidden war-room-bg p-6 md:p-12 relative">
      
      {/* HUD Header */}
      <div className="flex items-center justify-between mb-12 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl border border-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-gold" /> RESEARCH MATRIX AUDIT
            </h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Sequential Literature Validation Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Audit Progress</span>
            <div className="flex gap-1.5">
              {sources.map((_, i) => (
                <div key={i} className={`w-6 h-1.5 rounded-full ${i < matrix.length ? 'bg-gold' : i === processingIdx ? 'bg-gold animate-pulse' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="flex-1 overflow-x-auto custom-scrollbar relative">
        <div className="min-w-[1000px] border border-white/5 rounded-[2.5rem] overflow-hidden bg-white/5 backdrop-blur-sm shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[25%]">Source Identity</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[25%]">Primary Findings</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[25%]">Paradigm & Method</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gold/60 w-[25%]">Limits & Gaps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {sources.map((source, idx) => {
                const rowData = matrix.find(m => m.sourceId === source.id);
                const isProcessing = idx === processingIdx;
                
                return (
                  <tr 
                    key={source.id} 
                    className={`transition-all duration-700 ${isProcessing ? 'bg-gold/5' : ''}`}
                  >
                    {/* Source Identity */}
                    <td className="p-6 align-top">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {rowData ? (
                            <CheckCircle2 size={16} className="text-gold" />
                          ) : isProcessing ? (
                            <Sparkles size={16} className="text-gold animate-spin" />
                          ) : (
                            <Lock size={16} className="text-white/10" />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-widest text-gold/80">Source {idx+1}</span>
                        </div>
                        <h4 className={`text-sm font-black leading-tight ${rowData ? 'text-white' : 'text-gray-600'}`}>{source.title}</h4>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">{source.authors[0]} • {source.year}</p>
                      </div>
                    </td>

                    {/* Findings */}
                    <td className="p-6 align-top">
                      {rowData ? (
                        <div className="text-xs text-gray-300 leading-relaxed space-y-1">
                          {rowData.findings.split('\n').map((line, i) => (
                            <p key={i} className="flex gap-2">
                              <span className="text-gold shrink-0">•</span> {line.replace(/^[•-]\s*/, '')}
                            </p>
                          ))}
                        </div>
                      ) : isProcessing ? (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 w-full bg-white/5 rounded-lg" />
                          <div className="h-3 w-3/4 bg-white/5 rounded-lg" />
                        </div>
                      ) : null}
                    </td>

                    {/* Methodology */}
                    <td className="p-6 align-top">
                      {rowData ? (
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-gray-300 italic">
                          "{rowData.methodology}"
                        </div>
                      ) : isProcessing ? (
                        <div className="h-12 w-full bg-white/5 rounded-2xl animate-pulse" />
                      ) : null}
                    </td>

                    {/* Limitations */}
                    <td className="p-6 align-top">
                      {rowData ? (
                        <div className="text-xs text-gold/90 font-bold leading-relaxed">
                          {rowData.limitations}
                        </div>
                      ) : isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-20 text-gold/30">
                          <SearchCode size={24} className="animate-bounce" />
                          <span className="text-[8px] font-black uppercase tracking-widest mt-2">Analyzing Gaps...</span>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synthesis Footer Overlay */}
      {matrix.length > 0 && !processingIdx && (
        <div className="mt-12 flex flex-col items-center gap-6 animate-in slide-in-from-bottom-10 duration-1000">
          <div className="flex items-center gap-3 px-6 py-3 bg-gold/10 border border-gold/20 rounded-2xl">
            <Zap size={18} className="text-gold fill-gold" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Matrix Ready for Unified Synthesis</p>
          </div>
          
          <button 
            onClick={handleStartSynthesis}
            disabled={isSynthesizing}
            className="group relative px-20 py-6 bg-gold text-[#1A0B2E] rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-[0_0_60px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all duration-500 overflow-hidden"
          >
            <div className="relative z-10 flex items-center gap-4">
              {isSynthesizing ? <Sparkles className="animate-spin" /> : 'Synthesize Ultimate Novelty'}
            </div>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        </div>
      )}

      {/* Loading Shimmer for Active Row */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default GapFinderView;