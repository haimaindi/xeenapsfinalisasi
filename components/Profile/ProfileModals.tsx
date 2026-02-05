import React, { useState } from 'react';
import { EducationEntry, CareerEntry } from '../../types';
import { X, Save, GraduationCap, Briefcase, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { FormField, FormDropdown } from '../Common/FormComponents';
import { showXeenapsConfirm } from '../../utils/swalUtils';

interface ModalProps {
  onClose: () => void;
  onOptimisticSave: (data: any) => void;
}

/**
 * YEAR INPUT COMPONENT - RE-STRUCTURED
 */
const YearInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  allowPresent?: boolean;
  placeholder?: string;
  required?: boolean;
}> = ({ value, onChange, allowPresent, placeholder, required }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#004A74]/10 transition-all">
        <input 
          type="text"
          required={required}
          pattern="^[0-9]{4}$"
          className={`flex-1 px-5 py-4 bg-transparent border-none outline-none font-mono font-bold text-sm ${value === 'Present' ? 'text-emerald-600 italic' : 'text-[#004A74]'} placeholder:text-gray-300`}
          placeholder={placeholder || "YYYY"}
          value={value === 'Present' ? '' : value}
          disabled={value === 'Present'}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
            onChange(val);
          }}
        />
      </div>
      {allowPresent && (
        <button 
          type="button"
          onClick={() => onChange(value === 'Present' ? '' : 'Present')}
          className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
            value === 'Present' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {value === 'Present' ? 'Active / Ongoing' : 'Set as Present'}
        </button>
      )}
    </div>
  );
};

/**
 * EDUCATION MODAL
 */
export const EducationModal: React.FC<ModalProps & { entry?: EducationEntry }> = ({ entry, onClose, onOptimisticSave }) => {
  const [formData, setFormData] = useState<EducationEntry>(entry || {
    id: crypto.randomUUID(), level: 'Bachelor', institution: '', major: '', degree: '', startYear: '', endYear: ''
  });

  const levels = ['Elementary School', 'Junior High School', 'Senior High School', 'Bachelor', 'Master', 'Doctoral', 'Professional'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOptimisticSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><GraduationCap size={24} /></div>
            <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">{entry ? 'Edit' : 'Add'} Education</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
          <FormField label="Institution / School Name"><input required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} /></FormField>
          <div className="grid grid-cols-2 gap-4">
             <FormField label="Level"><FormDropdown value={formData.level} options={levels} onChange={v => setFormData({...formData, level: v})} placeholder="Select level" /></FormField>
             <FormField label="Major / Study Program"><input className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.major} onChange={e => setFormData({...formData, major: e.target.value})} /></FormField>
          </div>
          <FormField label="Full Academic Degree"><input className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl" placeholder="e.g. Bachelor of Architecture" value={formData.degree} onChange={e => setFormData({...formData, degree: e.target.value})} /></FormField>
          <div className="grid grid-cols-2 gap-4 items-start">
             <FormField label="Start Year"><YearInput required value={formData.startYear} onChange={v => setFormData({...formData, startYear: v})} /></FormField>
             <FormField label="End Year"><YearInput allowPresent value={formData.endYear} onChange={v => setFormData({...formData, endYear: v})} /></FormField>
          </div>
          <div className="pt-6"><button type="submit" className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2"><Save size={20} /> Sync Record</button></div>
        </form>
      </div>
    </div>
  );
};

/**
 * CAREER MODAL
 */
export const CareerModal: React.FC<ModalProps & { entry?: CareerEntry }> = ({ entry, onClose, onOptimisticSave }) => {
  const [formData, setFormData] = useState<CareerEntry>(entry || {
    id: crypto.randomUUID(), company: '', position: '', type: 'Full-time', startDate: '', endDate: '', location: '', description: ''
  });

  const types = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Project'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOptimisticSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><Briefcase size={24} /></div>
            <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">{entry ? 'Edit' : 'Add'} Career</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
          <FormField label="Company / Institution"><input required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} /></FormField>
          <div className="grid grid-cols-2 gap-4">
             <FormField label="Job Position"><input required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} /></FormField>
             <FormField label="Work Type"><FormDropdown value={formData.type} options={types} onChange={v => setFormData({...formData, type: v})} placeholder="Type" /></FormField>
          </div>
          <FormField label="Location (City, Country)"><input className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></FormField>
          <div className="grid grid-cols-2 gap-4 items-start">
             <FormField label="Start Year"><YearInput required value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} /></FormField>
             <FormField label="End Year"><YearInput allowPresent value={formData.endDate} onChange={v => setFormData({...formData, endDate: v})} /></FormField>
          </div>
          <FormField label="Description / Achievements"><textarea className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></FormField>
          <div className="pt-6"><button type="submit" className="w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2"><Save size={20} /> Sync Career</button></div>
        </form>
      </div>
    </div>
  );
};

/**
 * UNIQUE ID EDIT MODAL
 */
export const UniqueIdModal: React.FC<{
  currentId: string;
  onClose: () => void;
  onConfirm: (newId: string) => void;
}> = ({ currentId, onClose, onConfirm }) => {
  const [newId, setNewId] = useState(currentId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newId.trim()) return;
    setIsSaving(true);
    const confirm = await showXeenapsConfirm(
      'FINAL CONFIRMATION', 
      'This will change your global identity. Are you absolutely sure?',
      'YES, UPDATE ID'
    );
    if (confirm.isConfirmed) {
      onConfirm(newId);
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-[#004A74]/40 backdrop-blur-xl animate-in zoom-in-95">
      <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-gray-100 text-center space-y-8">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm animate-pulse">
           <ShieldAlert size={32} />
        </div>
        <div className="space-y-2">
           <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Identity Overwrite</h3>
           <p className="text-xs font-medium text-gray-400">Modify your system tracking code with extreme caution.</p>
        </div>
        <div className="space-y-4">
           <input 
             className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-lg font-mono font-bold text-[#004A74] focus:ring-4 focus:ring-red-100 outline-none"
             value={newId}
             onChange={e => setNewId(e.target.value)}
           />
           <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-4 bg-[#004A74] text-[#FED400] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};