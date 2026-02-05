import React, { useRef, useState } from 'react';
import { UserProfile } from '../../types';
import { BRAND_ASSETS } from '../../assets';
import { Camera, Trash2, Loader2, Sparkles, ShieldCheck, Edit3 } from 'lucide-react';
import { uploadProfilePhoto, deleteProfilePhoto, saveUserProfile } from '../../services/ProfileService';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsConfirm } from '../../utils/swalUtils';

interface IDCardSectionProps {
  profile: UserProfile;
  onUpdate: (field: keyof UserProfile, value: string) => void;
  onPhotoChange: (url: string, id: string, node: string) => void;
  onEditUniqueId: () => void;
}

const IDCardSection: React.FC<IDCardSectionProps> = ({ profile, onUpdate, onPhotoChange, onEditUniqueId }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // STEP 1: INSTANT PREVIEW (Optimistic UI)
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        setPreviewUrl(url);
        // DISPATCH EVENT UNTUK HEADER
        window.dispatchEvent(new CustomEvent('xeenaps-instant-photo', { detail: url }));
      }
    };
    reader.readAsDataURL(file);

    // STEP 2: BACKEND SYNC (Silent)
    const result = await uploadProfilePhoto(file);
    if (result) {
      onPhotoChange(result.photoUrl, result.fileId, result.nodeUrl);
      setPreviewUrl(null); // Reset preview and let parent's URL take over
    } else {
      showXeenapsToast('error', 'Upload failed. Check storage quota.');
      setPreviewUrl(null); // Rollback preview
    }
  };

  const handleDeletePhoto = async () => {
    if (!profile.photoFileId || !profile.photoNodeUrl) return;
    
    const confirm = await showXeenapsConfirm(
      'DELETE PHOTO?', 
      'This will permanently remove your profile image from the storage node.',
      'DELETE'
    );

    if (confirm.isConfirmed) {
      // INSTANT UI FEEDBACK (OPTIMISTIC)
      onPhotoChange(BRAND_ASSETS.USER_DEFAULT, "", ""); 
      setPreviewUrl(null);
      
      const success = await deleteProfilePhoto(profile.photoFileId, profile.photoNodeUrl);
      if (!success) {
        showXeenapsToast('error', 'Server removal failed, but display updated.');
      }
    }
  };

  const handleUniqueIdRequest = async () => {
    const confirm = await showXeenapsConfirm(
      'MODIFY SYSTEM IDENTITY?', 
      'Changing your Unique App ID is a critical action. Proceed?',
      'AUTHORIZE'
    );
    if (confirm.isConfirmed) {
      onEditUniqueId();
    }
  };

  const photoDisplay = previewUrl || profile.photoUrl || BRAND_ASSETS.USER_DEFAULT;

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full animate-in slide-in-from-left duration-700 min-h-[650px]">
      
      {/* CARD HEADER - EXECUTIVE NAVY */}
      <div className="bg-[#004A74] px-8 py-10 relative overflow-hidden shrink-0">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 -translate-y-24 translate-x-24 rounded-full" />
         <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
               <h2 className="text-white text-xl font-black tracking-tighter uppercase leading-none">XEENAPS IDENTITY</h2>
               <p className="text-[#FED400] text-[8px] font-black uppercase tracking-[0.5em]">Global Academic Passport</p>
            </div>
            <img src={BRAND_ASSETS.LOGO_ICON} className="w-10 h-10 brightness-0 invert opacity-40" alt="Logo" />
         </div>
      </div>

      {/* CARD BODY */}
      <div className="flex-1 p-10 flex flex-col items-center justify-center space-y-10 relative bg-gradient-to-b from-white to-gray-50/30">
         
         {/* 1. PHOTO AREA (TOP) */}
         <div className="relative group">
            <div className="absolute inset-0 bg-[#FED400]/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-56 h-72 rounded-[2.5rem] p-1.5 bg-white shadow-xl border border-gray-100 overflow-hidden group">
               <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-gray-50 border border-gray-100">
                  <img src={photoDisplay} className="w-full h-full object-cover transition-all duration-700" alt="Profile" />
               </div>

               {/* HOVER OVERLAY */}
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 bg-white text-[#004A74] rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl"
                  >
                    <Camera size={24} />
                  </button>
                  {profile.photoUrl && profile.photoUrl !== BRAND_ASSETS.USER_DEFAULT && (
                    <button 
                      onClick={handleDeletePhoto}
                      className="p-4 bg-red-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
               </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
         </div>

         {/* 2. IDENTITY INPUTS - NAME & DEGREE (MIDDLE) */}
         <div className="w-full space-y-2 text-center">
            <div className="space-y-1">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] block mb-2">Authenticated Name & Degree</span>
               <textarea 
                 className="w-full bg-transparent border-none text-2xl md:text-3xl font-black text-[#004A74] text-center focus:ring-0 placeholder:text-gray-100 outline-none resize-none overflow-hidden tracking-tight leading-tight"
                 defaultValue={profile.fullName}
                 onBlur={(e) => onUpdate('fullName', e.target.value)}
                 onInput={(e) => {
                   const target = e.target as HTMLTextAreaElement;
                   target.style.height = 'auto';
                   target.style.height = target.scrollHeight + 'px';
                 }}
                 placeholder="Full Name & Academic Degree..."
                 rows={1}
               />
            </div>
         </div>

         {/* 3. UNIQUE ID (BOTTOM) */}
         <div className="w-full pt-10 flex flex-col items-center gap-4 border-t border-dashed border-gray-100">
            <div className="flex items-center gap-3 px-6 py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm relative group/id">
               <ShieldCheck size={14} className="text-[#004A74]" />
               <span className="text-[11px] font-mono font-bold text-[#004A74] tracking-widest">{profile.uniqueAppId}</span>
               <button 
                 onClick={handleUniqueIdRequest}
                 className="ml-2 p-1 text-gray-300 hover:text-red-400 transition-all opacity-0 group-hover/id:opacity-100"
               >
                 <Edit3 size={12} />
               </button>
            </div>
            <div className="flex items-center gap-3 opacity-30">
               <Sparkles size={14} className="text-[#FED400]" />
               <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#004A74]">Verified Academic Identity</span>
            </div>
         </div>

      </div>

      {/* DECORATIVE STRIP */}
      <div className="h-4 bg-[#FED400] w-full shrink-0" />

    </div>
  );
};

export default IDCardSection;