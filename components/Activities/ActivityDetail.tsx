
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ActivityItem, ActivityType, ActivityLevel, ActivityRole } from '../../types';
import { fetchActivitiesPaginated, saveActivity, deleteActivity, uploadVaultFile, deleteRemoteFile } from '../../services/ActivityService';
import { 
  Trash2, 
  Star,
  FolderOpen,
  CloudUpload,
  Loader2,
  Bold,
  Italic,
  User,
  MapPin,
  FileCheck,
  Zap,
  CheckCircle2,
  Link as LinkIcon,
  Eye,
  RefreshCcw
} from 'lucide-react';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';

/**
 * Rich Text Summary Editor (Identical to LibraryForm AbstractEditor)
 */
const SummaryEditor: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  disabled?: boolean 
}> = ({ value, onChange, disabled }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const updateActiveStates = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    updateActiveStates();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#004A74]/10 focus-within:border-[#004A74]/40 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
        <button type="button" onClick={() => execCommand('bold')} disabled={disabled} className={`p-1.5 rounded-lg transition-all ${isBold ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}><Bold size={14} /></button>
        <button type="button" onClick={() => execCommand('italic')} disabled={disabled} className={`p-1.5 rounded-lg transition-all ${isItalic ? 'bg-[#004A74] text-white shadow-inner' : 'hover:bg-white text-[#004A74]'}`}><Italic size={14} /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => {
          onChange(e.currentTarget.innerHTML);
          updateActiveStates();
        }}
        onKeyUp={updateActiveStates}
        onMouseUp={updateActiveStates}
        className="p-5 text-sm min-h-[250px] outline-none leading-relaxed custom-scrollbar font-medium text-gray-700"
        {...({ "data-placeholder": "Describe your activity summary and synthesis here..." } as any)}
      />
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #9CA3AF; pointer-events: none; display: block; }
      `}</style>
    </div>
  );
};

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [item, setItem] = useState<ActivityItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticCertPreview, setOptimisticCertPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      // INSTANT LOADING IF PASSED FROM VAULT OR MAIN
      const stateItem = (location.state as any)?.item;
      if (stateItem && stateItem.id === id) {
        setItem(stateItem);
        setIsLoading(false);
        return;
      }

      const res = await fetchActivitiesPaginated(1, 1000);
      const found = res.items.find(i => i.id === id);
      if (found) setItem(found);
      else navigate('/activities');
      setIsLoading(false);
    };
    load();
  }, [id, location.state, navigate]);

  // Background Auto-save Logic
  const handleFieldChange = (field: keyof ActivityItem, val: any) => {
    if (!item) return;
    const updated = { ...item, [field]: val, updatedAt: new Date().toISOString() };
    setItem(updated);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveActivity(updated);
    }, 1500);
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const success = await deleteActivity(item.id);
      if (success) {
        showXeenapsToast('success', 'Activity removed');
        navigate('/activities');
      } else {
        showXeenapsToast('error', 'Delete failed');
      }
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    // 1. OPTIMISTIC INSTANT PREVIEW
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOptimisticCertPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    setIsUploading(true);
    const oldFileId = item.certificateFileId;
    const oldNodeUrl = item.certificateNodeUrl;

    const result = await uploadVaultFile(file);
    if (result) {
      // 2. FORCE SYNC: Update state and save immediately to Registry
      const updatedItem = { 
        ...item, 
        certificateFileId: result.fileId, 
        certificateNodeUrl: result.nodeUrl,
        updatedAt: new Date().toISOString() 
      };
      
      setItem(updatedItem);
      await saveActivity(updatedItem); // Immediate Cloud Sync
      
      // 3. PERMANENT DELETION OF OLD CERTIFICATE
      if (oldFileId && oldNodeUrl) {
        await deleteRemoteFile(oldFileId, oldNodeUrl);
      }
      
      showXeenapsToast('success', 'Certificate Secured');
      setOptimisticCertPreview(null);
    } else {
      showXeenapsToast('error', 'Upload failed');
      setOptimisticCertPreview(null);
    }
    setIsUploading(false);
  };

  const handleClearCertificate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item || !item.certificateFileId) return;

    const confirmed = await showXeenapsDeleteConfirm(1);
    if (!confirmed) return;

    const oldFileId = item.certificateFileId;
    const oldNodeUrl = item.certificateNodeUrl;

    // Optimistic clear
    const updatedItem = {
      ...item,
      certificateFileId: '',
      certificateNodeUrl: '',
      updatedAt: new Date().toISOString()
    };
    setItem(updatedItem);
    setOptimisticCertPreview(null);
    await saveActivity(updatedItem);

    if (oldFileId && oldNodeUrl) {
      await deleteRemoteFile(oldFileId, oldNodeUrl);
    }
    showXeenapsToast('success', 'Certificate cleared');
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-[#004A74] uppercase tracking-widest">Loading Portfolio...</div>;
  if (!item) return null;

  const hasCertificate = !!(item.certificateFileId || optimisticCertPreview);
  const certificateUrl = optimisticCertPreview || (item.certificateFileId ? `https://lh3.googleusercontent.com/d/${item.certificateFileId}` : null);

  return (
    <FormPageContainer>
      <FormStickyHeader 
        title="Activity Detail" 
        subtitle="Manage your academic portfolio" 
        onBack={() => navigate('/activities')} 
        rightElement={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleFieldChange('isFavorite', !item.isFavorite)}
              className={`p-2.5 rounded-xl border transition-all shadow-sm active:scale-90 ${item.isFavorite ? 'bg-yellow-50 border-yellow-200 text-[#FED400]' : 'bg-white border-gray-100 text-gray-300 hover:text-[#FED400]'}`}
              title="Favorite"
            >
              <Star size={18} className={item.isFavorite ? "fill-[#FED400]" : ""} />
            </button>
            <button 
              onClick={() => navigate(`/activities/${item.id}/vault`, { state: { item } })}
              className="p-2.5 bg-white border border-gray-100 text-[#004A74] hover:bg-blue-50 rounded-xl transition-all shadow-sm active:scale-90"
              title="Documentation Gallery"
            >
              <FolderOpen size={18} />
            </button>
            <button 
              onClick={handleDelete}
              className="p-2.5 bg-white border border-gray-100 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm active:scale-90"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        }
      />

      <FormContentArea>
        <div className="space-y-12">
          
          {/* 1. IDENTITY BLOCK */}
          <section className="space-y-8">
            <FormField label="Activity / Event Title">
              <textarea 
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 text-lg font-black text-[#004A74] uppercase tracking-tight focus:bg-white focus:ring-2 focus:ring-[#004A74]/10 transition-all outline-none resize-none"
                placeholder="ENTER ACTIVITY TITLE..."
                value={item.eventName}
                onChange={(e) => handleFieldChange('eventName', e.target.value)}
                rows={2}
              />
            </FormField>

            {/* EVENT LINK - FULLWIDTH AS REQUESTED */}
            <FormField label="Event Link">
               <div className="relative group">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#004A74]" />
                  <input className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-blue-500 underline outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/10 transition-all" 
                    placeholder="https://event-link.com/..."
                    value={item.link} 
                    onChange={(e) => handleFieldChange('link', e.target.value)} 
                  />
               </div>
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
              {/* Left Stack */}
              <div className="space-y-6">
                <FormField label="Held By / Organizer">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#004A74]" 
                      value={item.organizer} onChange={(e) => handleFieldChange('organizer', e.target.value)} placeholder="Organization name..." />
                  </div>
                </FormField>
                <FormField label="Specific Location">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#004A74]" 
                      value={item.location} onChange={(e) => handleFieldChange('location', e.target.value)} placeholder="City / Venue / Online..." />
                  </div>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                   <FormField label="Start Date"><input type="date" className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold text-[#004A74]" value={item.startDate} onChange={(e) => handleFieldChange('startDate', e.target.value)} /></FormField>
                   <FormField label="End Date"><input type="date" className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold text-[#004A74]" value={item.endDate} onChange={(e) => handleFieldChange('endDate', e.target.value)} /></FormField>
                </div>
              </div>

              {/* Right Stack */}
              <div className="space-y-6">
                <FormField label="Activity Type">
                  <FormDropdown value={item.type} options={Object.values(ActivityType)} onChange={(v) => handleFieldChange('type', v)} placeholder="Select type" allowCustom={false} />
                </FormField>
                <FormField label="Recognition Magnitude">
                  <FormDropdown value={item.level} options={Object.values(ActivityLevel)} onChange={(v) => handleFieldChange('level', v)} placeholder="Select level" allowCustom={false} />
                </FormField>
                <FormField label="Assigned Role">
                  <FormDropdown value={item.role} options={Object.values(ActivityRole)} onChange={(v) => handleFieldChange('role', v)} placeholder="Select role" allowCustom={false} />
                </FormField>
              </div>
            </div>
          </section>

          {/* 2. CREDENTIAL BLOCK - A4 LANDSCAPE RATIO */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-gray-50 pt-10">
            {/* Left: Certificate Upload (Rasio 1.414 : 1) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Certificate File (A4 Landscape)</label>
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative group w-full aspect-[1.414/1] bg-gray-50 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden hover:bg-white hover:border-[#004A74]/30 ${hasCertificate ? 'border-[#004A74]/20' : 'border-gray-200'}`}
              >
                {isUploading && !optimisticCertPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[#004A74] animate-spin" />
                    <p className="text-[10px] font-black text-[#004A74] uppercase tracking-widest">Securing Document...</p>
                  </div>
                ) : hasCertificate ? (
                  <div className="relative w-full h-full">
                     {/* INSTANT SHARP PREVIEW */}
                     <img 
                       src={certificateUrl!} 
                       className="w-full h-full object-cover" 
                       alt="Certificate"
                       onClick={(e) => { e.stopPropagation(); window.open(certificateUrl!, '_blank'); }}
                     />
                     
                     {/* HOVER OVERLAY: THIN WHITE BLUR */}
                     <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] pointer-events-none" />
                     
                     {/* CONTROLS IN TOP RIGHT */}
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                        <button 
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="p-2.5 bg-white/90 text-[#004A74] hover:bg-[#FED400] rounded-xl shadow-lg transition-all active:scale-90"
                          title="Reload / Upload New"
                        >
                          <RefreshCcw size={16} strokeWidth={3} />
                        </button>
                        <button 
                          onClick={handleClearCertificate}
                          className="p-2.5 bg-white/90 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-lg transition-all active:scale-90"
                          title="Delete Certificate"
                        >
                          <Trash2 size={16} strokeWidth={3} />
                        </button>
                     </div>

                     {/* CLICK TO VIEW ICON OVERLAY */}
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-all">
                        <div className="bg-black/60 p-4 rounded-full text-white shadow-2xl">
                           <Eye size={32} />
                        </div>
                     </div>

                     {isUploading && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FED400] animate-pulse" />}
                  </div>
                ) : (
                  <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-300 group-hover:text-[#004A74] group-hover:bg-blue-50 transition-all mb-4">
                       <CloudUpload size={32} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#004A74] transition-colors">Upload Certificate</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleCertificateUpload} className="hidden" accept="image/*,application/pdf" />
            </div>

            {/* Right: Technical Info */}
            <div className="space-y-6">
               <FormField label="Certificate Number">
                  <div className="relative">
                    <FileCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#004A74]" 
                      placeholder="e.g. CERT-2024-XXXX"
                      value={item.certificateNumber} onChange={(e) => handleFieldChange('certificateNumber', e.target.value)} />
                  </div>
               </FormField>
               <FormField label="Academic Credit Points">
                  <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#004A74]" 
                      placeholder="e.g. 2.0 SKP"
                      value={item.credit} onChange={(e) => handleFieldChange('credit', e.target.value)} />
                  </div>
               </FormField>
            </div>
          </section>

          {/* 3. SUMMARY BLOCK */}
          <section className="border-t border-gray-50 pt-10">
             <FormField label="Activity Synthesis & Summary">
                <SummaryEditor 
                  value={item.description}
                  onChange={(val) => handleFieldChange('description', val)}
                />
             </FormField>
          </section>

        </div>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default ActivityDetail;
