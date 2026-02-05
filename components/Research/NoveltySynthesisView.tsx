
import React from 'react';
import { NoveltySynthesis, GapAnalysisRow } from '../../types';
import { 
  Trophy, 
  RefreshCcw, 
  Share2, 
  Download, 
  Map, 
  Lightbulb,
  FileText,
  Compass,
  Sparkles
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';

interface NoveltySynthesisViewProps {
  novelty: NoveltySynthesis;
  matrix: GapAnalysisRow[];
  onReset: () => void;
}

const NoveltySynthesisView: React.FC<NoveltySynthesisViewProps> = ({ novelty, matrix, onReset }) => {
  
  const handleShare = () => {
    navigator.clipboard.writeText(`RESEARCH NOVELTY DISCOVERED\n\nProposed Title: ${novelty.proposedTitle}\n\nSynthesis: ${novelty.narrative}`);
    showXeenapsToast('success', 'Synthesis copied to clipboard!');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1A0B2E] text-white overflow-y-auto custom-scrollbar war-room-bg p-6 md:p-12 pb-32 items-center relative">
      
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-10">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold rounded-full blur-[150px]" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-4xl w-full space-y-12 relative z-10 animate-in zoom-in-95 duration-1000">
        
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-2 bg-gold text-[#1A0B2E] rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-2xl">
            <Trophy size={16} /> Discovery Synchronized
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.5em] mt-6">Research Synthesis Output</p>
        </div>

        {/* PROPOSED TITLE TABLET */}
        <div className="bg-white/5 backdrop-blur-2xl border-2 border-gold/30 rounded-[3rem] p-10 md:p-16 text-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] space-y-8 relative overflow-hidden group">
          <Sparkles className="absolute top-10 left-10 text-gold/20 animate-pulse" size={40} />
          <Sparkles className="absolute bottom-10 right-10 text-gold/20 animate-pulse delay-700" size={40} />
          
          <div className="space-y-4 relative z-10">
            <h4 className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">Proposed Impactful Title</h4>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] text-white">
              {novelty.proposedTitle}
            </h2>
          </div>

          <div className="h-px w-24 bg-gold/30 mx-auto" />

          {/* NARRATIVE SECTION */}
          <div className="space-y-8 text-left max-w-2xl mx-auto">
            <div className="flex items-center gap-3 text-gold/60">
              <FileText size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Novelty Statement & Synthesis</span>
            </div>
            
            <div className="space-y-6 text-sm md:text-base text-gray-300 font-medium leading-relaxed italic">
              {novelty.narrative.split('\n\n').map((para, i) => (
                <p key={i} className="relative pl-6 border-l border-gold/10">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* TACTICAL DIRECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {novelty.futureDirections.map((dir, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-4 hover:border-gold/30 transition-all group">
              <div className="w-12 h-12 bg-gold/10 text-gold rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Compass size={24} />
              </div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Direction 0{i+1}</h5>
              <p className="text-xs font-bold text-gray-300 leading-relaxed">{dir}</p>
            </div>
          ))}
        </div>

        {/* REINFORCEMENT QUOTE */}
        <div className="bg-gold/5 border border-gold/10 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
           <div className="w-14 h-14 bg-gold text-[#1A0B2E] rounded-full flex items-center justify-center shadow-lg">
             <Lightbulb size={28} />
           </div>
           <div>
             <h4 className="text-sm font-black text-gold uppercase tracking-widest mb-1">Strategic Advantage</h4>
             <p className="text-xs text-gray-400 font-medium italic">"Identifying the void is the first step toward significant scientific contribution. This synthesis bridges ${matrix.length} distinct research viewpoints."</p>
           </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 pt-12 pb-20">
          <button 
            onClick={handleShare}
            className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <Share2 size={16} /> Copy Synthesis
          </button>
          <button 
            className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <Download size={16} /> Export PDF Tablet
          </button>
          <button 
            onClick={onReset}
            className="flex items-center gap-3 px-8 py-4 bg-gold text-[#1A0B2E] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <RefreshCcw size={16} /> New Analysis
          </button>
        </div>

      </div>
    </div>
  );
};

export default NoveltySynthesisView;