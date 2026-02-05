
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LibraryItem, LibraryType } from '../../types';
import { 
  Search, 
  BookOpen, 
  Trash2, 
  ArrowRight, 
  Sparkles,
  Layers
} from 'lucide-react';

interface GapSelectionViewProps {
  items: LibraryItem[];
  onProceed: (selected: LibraryItem[]) => void;
}

const GapSelectionView: React.FC<GapSelectionViewProps> = ({ items, onProceed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<LibraryItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items (only Literature/Task types) and exclude already selected
  const availableItems = useMemo(() => {
    return items.filter(item => 
      (item.type === LibraryType.LITERATURE || item.type === LibraryType.TASK) &&
      !selected.some(s => s.id === item.id) &&
      (item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.topic.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [items, selected, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: LibraryItem) => {
    if (selected.length < 5) {
      setSelected([...selected, item]);
      setSearchTerm('');
      setIsDropdownOpen(false);
    }
  };

  const removeSelected = (id: string) => {
    setSelected(selected.filter(s => s.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-white war-room-bg">
      <div className="max-w-3xl w-full space-y-12 animate-in slide-in-from-bottom-8 duration-1000">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-gold text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <Sparkles size={14} /> Gap Finder Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
            UNCOVER THE <span className="text-gold">WHITE SPACE</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-medium max-w-lg mx-auto">
            Select 1 to 5 scientific papers to identify research contradictions, methodology omissions, and ultimate novelty.
          </p>
        </div>

        {/* Selection Interface */}
        <div className="relative space-y-8">
          
          {/* Slots Visualization */}
          <div className="flex justify-center gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-12 h-1 bg-white/10 rounded-full overflow-hidden`}>
                <div 
                  className={`h-full bg-gold transition-all duration-500 ${i < selected.length ? 'w-full' : 'w-0'}`} 
                />
              </div>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-3xl focus-within:border-gold/50 focus-within:ring-4 focus-within:ring-gold/5 transition-all duration-500 group">
              <Search className="text-gray-500 group-focus-within:text-gold" size={24} />
              <input 
                type="text"
                placeholder="Search literature title or topic..."
                className="flex-1 bg-transparent border-none outline-none text-lg font-bold placeholder:text-gray-600"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-3">
                {selected.length}/5 Slots
              </div>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && searchTerm.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[#1A0B2E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                  {availableItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-xs font-black uppercase tracking-widest">No Matches Found</p>
                    </div>
                  ) : (
                    availableItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-start gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                      >
                        <div className="p-2 bg-white/5 text-gray-400 group-hover:text-gold transition-colors rounded-xl">
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-gold truncate">{item.title}</h4>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mt-0.5">{item.topic} • {item.publisher}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Badges */}
          <div className="flex flex-wrap justify-center gap-3">
            {selected.map(item => (
              <div 
                key={item.id}
                className="flex items-center gap-3 pl-4 pr-2 py-2 bg-white/5 border border-white/10 rounded-2xl animate-in zoom-in-90 duration-300 group hover:border-gold/30"
              >
                <span className="text-xs font-bold text-white/80 line-clamp-1 max-w-[200px]">{item.title}</span>
                <button 
                  onClick={() => removeSelected(item.id)}
                  className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Proceed Button */}
        <div className="flex flex-col items-center gap-6 pt-8">
          <button
            onClick={() => onProceed(selected)}
            disabled={selected.length === 0}
            className={`group relative flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm transition-all duration-700 ${
              selected.length > 0 
                ? 'bg-gold text-[#1A0B2E] shadow-[0_0_50px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95' 
                : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            Enter the War Room
            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
          </button>
          
          <div className="flex items-center gap-2 text-gray-500">
            <Layers size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Powered by Gemini 3 Analysis Engine</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GapSelectionView;