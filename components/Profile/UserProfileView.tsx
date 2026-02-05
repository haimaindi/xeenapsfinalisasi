import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, EducationEntry, CareerEntry } from '../../types';
import { 
  fetchUserProfile, 
  fetchEducationHistory, 
  fetchCareerHistory, 
  saveUserProfile, 
  deleteProfilePhoto,
  saveEducationEntry,
  saveCareerEntry,
  deleteEducationEntry,
  deleteCareerEntry
} from '../../services/ProfileService';
import IDCardSection from './IDCardSection';
import AcademicGrid from './AcademicGrid';
import HistoryTimeline from './HistoryTimeline';
import { EducationModal, CareerModal, UniqueIdModal } from './ProfileModals';
import { 
  GraduationCap, 
  Briefcase, 
  Plus, 
  Loader2,
  Award,
  BookMarked,
  Globe,
  Link as LinkIcon
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsConfirm } from '../../utils/swalUtils';
import { BRAND_ASSETS } from '../../assets';

const UserProfileView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [career, setCareer] = useState<CareerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals state
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [isUniqueIdModalOpen, setIsUniqueIdModalOpen] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState<EducationEntry | undefined>();
  const [selectedCareer, setSelectedCareer] = useState<CareerEntry | undefined>();

  const loadAllData = useCallback(async (isInitial = true) => {
    if (isInitial) setIsLoading(true);
    try {
      const [p, e, c] = await Promise.all([
        fetchUserProfile(),
        fetchEducationHistory(),
        fetchCareerHistory()
      ]);
      
      const defaultProfile: UserProfile = {
        fullName: "Xeenaps User, Degree",
        photoUrl: "",
        photoFileId: "",
        photoNodeUrl: "",
        birthDate: "",
        address: "Not set",
        email: "user@xeenaps.app",
        phone: "-",
        sintaId: "",
        scopusId: "",
        wosId: "",
        googleScholarId: "",
        jobTitle: "Researcher",
        affiliation: "Independent",
        uniqueAppId: `XN-${Math.random().toString(36).substring(7).toUpperCase()}`,
        socialMedia: ""
      };

      const finalProfile = p || defaultProfile;
      setProfile(finalProfile);
      setLocalProfile(finalProfile);
      setEducation(e);
      setCareer(c);
    } catch (err) {
      showXeenapsToast('error', 'Failed to synchronize profile data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const dispatchProfileUpdate = (updatedProfile: UserProfile) => {
    // Kirim payload lengkap agar Header tidak perlu fetch ulang
    window.dispatchEvent(new CustomEvent('xeenaps-profile-updated', { detail: updatedProfile }));
  };

  // --- OPTIMISTIC HISTORY HANDLERS ---

  const handleSaveEducation = async (data: EducationEntry) => {
    const original = [...education];
    const isEdit = education.some(item => item.id === data.id);
    
    // 1. Instant UI Update
    setEducation(prev => isEdit 
      ? prev.map(item => item.id === data.id ? data : item)
      : [...prev, data]
    );
    setIsEduModalOpen(false);

    // 2. Background Sync (Silent)
    setIsSyncing(true);
    const success = await saveEducationEntry(data);
    if (!success) {
      setEducation(original);
      showXeenapsToast('error', 'Cloud sync failed. History rolled back.');
    }
    setIsSyncing(false);
  };

  const handleDeleteEducation = async (id: string) => {
    const original = [...education];
    setEducation(prev => prev.filter(item => item.id !== id));
    
    setIsSyncing(true);
    const success = await deleteEducationEntry(id);
    if (!success) {
      setEducation(original);
      showXeenapsToast('error', 'Delete sync failed. Item restored.');
    }
    setIsSyncing(false);
  };

  const handleSaveCareer = async (data: CareerEntry) => {
    const original = [...career];
    const isEdit = career.some(item => item.id === data.id);
    
    setCareer(prev => isEdit 
      ? prev.map(item => item.id === data.id ? data : item)
      : [...prev, data]
    );
    setIsCareerModalOpen(false);

    setIsSyncing(true);
    const success = await saveCareerEntry(data);
    if (!success) {
      setCareer(original);
      showXeenapsToast('error', 'Cloud sync failed. Career history restored.');
    }
    setIsSyncing(false);
  };

  const handleDeleteCareer = async (id: string) => {
    const original = [...career];
    setCareer(prev => prev.filter(item => item.id !== id));
    
    setIsSyncing(true);
    const success = await deleteCareerEntry(id);
    if (!success) {
      setCareer(original);
      showXeenapsToast('error', 'Delete sync failed. Item restored.');
    }
    setIsSyncing(false);
  };

  // --- IDENTITY HANDLERS ---

  const handleFieldUpdate = async (field: keyof UserProfile, value: string) => {
    if (!localProfile || !profile) return;
    if (localProfile[field] === value) return;

    const newProfile = { ...localProfile, [field]: value };
    setLocalProfile(newProfile);
    
    // Update Header instantly for 'fullName' field (OPTIMISTIC)
    if (field === 'fullName') {
      dispatchProfileUpdate(newProfile);
    }

    setIsSyncing(true);
    
    const success = await saveUserProfile(newProfile);
    if (success) {
      setProfile(newProfile);
      dispatchProfileUpdate(newProfile);
    } else {
      setLocalProfile(profile); 
      showXeenapsToast('error', 'Cloud sync failed');
      dispatchProfileUpdate(profile); // Rollback header
    }
    setIsSyncing(false);
  };

  const handlePhotoUpdate = async (url: string, fileId: string, nodeUrl: string) => {
    if (!localProfile) return;
    
    // CAPTURE OLD METADATA BEFORE UPDATING STATE
    const oldFileId = localProfile.photoFileId;
    const oldNodeUrl = localProfile.photoNodeUrl;

    const updatedProfile = { 
      ...localProfile, 
      photoUrl: url, 
      photoFileId: fileId, 
      photoNodeUrl: nodeUrl 
    };

    setLocalProfile(updatedProfile);
    setIsSyncing(true);

    const success = await saveUserProfile(updatedProfile);
    if (success) {
      setProfile(updatedProfile);
      dispatchProfileUpdate(updatedProfile);

      // PERFORM CLEANUP ONLY IF PREVIOUS FILE EXISTS AND IS DIFFERENT
      if (oldFileId && oldFileId !== fileId && oldNodeUrl) {
         await deleteProfilePhoto(oldFileId, oldNodeUrl);
      }
    }
    setIsSyncing(false);
  };

  const handleUniqueIdUpdate = async (newId: string) => {
    if (!localProfile) return;
    await handleFieldUpdate('uniqueAppId', newId);
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-10 bg-white z-[100]">
        <img src={BRAND_ASSETS.LOGO_ICON} className="w-16 h-16 animate-spin mb-4" alt="Loading" />
        <p className="text-[10px] font-black text-[#004A74] uppercase tracking-[0.4em] animate-pulse">Syncing Identity</p>
      </div>
    );
  }

  const idCards = [
    { key: 'sintaId' as keyof UserProfile, label: 'SINTA ID', icon: Award, color: 'text-orange-500' },
    { key: 'scopusId' as keyof UserProfile, label: 'Scopus ID', icon: BookMarked, color: 'text-emerald-500' },
    { key: 'wosId' as keyof UserProfile, label: 'WoS ID', icon: Globe, color: 'text-blue-500' },
    { key: 'googleScholarId' as keyof UserProfile, label: 'Scholar ID', icon: LinkIcon, color: 'text-indigo-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfcfc] animate-in fade-in duration-700 h-full">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
        
        {/* BLOK ATAS: 50% 50% SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="h-full">
            <IDCardSection 
              profile={localProfile!} 
              onUpdate={handleFieldUpdate}
              onPhotoChange={handlePhotoUpdate}
              onEditUniqueId={() => setIsUniqueIdModalOpen(true)}
            />
          </div>

          <div className="h-full">
            <AcademicGrid 
              profile={localProfile!} 
              onUpdate={handleFieldUpdate}
            />
          </div>
        </div>

        {/* BLOK TENGAH: FULL WIDTH ACADEMIC IDS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6 px-2">Academic Meta-Identifiers</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {idCards.map((id) => (
                <div key={id.key} className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-[#FED400] transition-all">
                   <label className={`text-[8px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${id.color}`}>
                      <id.icon size={12} /> {id.label}
                   </label>
                   <input 
                     className="w-full bg-transparent border-none p-0 text-[10px] font-mono font-bold text-[#004A74] outline-none placeholder:text-gray-200"
                     defaultValue={localProfile![id.key]}
                     onBlur={(e) => handleFieldUpdate(id.key, e.target.value)}
                     placeholder="CODE..."
                   />
                </div>
              ))}
           </div>
        </div>

        {/* BLOK BAWAH: 50% 50% HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                <GraduationCap size={18} /> Education History
              </h3>
              <button 
                onClick={() => { setSelectedEdu(undefined); setIsEduModalOpen(true); }}
                className="p-2 bg-[#004A74] text-[#FED400] rounded-xl hover:scale-110 active:scale-95 transition-all shadow-md"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
            <HistoryTimeline 
              type="education"
              items={education}
              onEdit={(item) => { setSelectedEdu(item as EducationEntry); setIsEduModalOpen(true); }}
              onDelete={handleDeleteEducation}
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                <Briefcase size={18} /> Career Journey
              </h3>
              <button 
                onClick={() => { setSelectedCareer(undefined); setIsCareerModalOpen(true); }}
                className="p-2 bg-[#004A74] text-[#FED400] rounded-xl hover:scale-110 active:scale-95 transition-all shadow-md"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
            <HistoryTimeline 
              type="career"
              items={career}
              onEdit={(item) => { setSelectedCareer(item as CareerEntry); setIsCareerModalOpen(true); }}
              onDelete={handleDeleteCareer}
            />
          </div>
        </div>

        <footer className="pt-20 pb-10 opacity-20 text-center">
          <div className="w-10 h-0.5 bg-[#004A74] mx-auto mb-4 rounded-full" />
          <p className="text-[8px] font-black text-[#004A74] uppercase tracking-[0.8em]">XEENAPS IDENTITY ECOSYSTEM</p>
        </footer>
      </div>

      {isEduModalOpen && (
        <EducationModal 
          entry={selectedEdu} 
          onClose={() => setIsEduModalOpen(false)} 
          onOptimisticSave={handleSaveEducation}
        />
      )}

      {isCareerModalOpen && (
        <CareerModal 
          entry={selectedCareer} 
          onClose={() => setIsCareerModalOpen(false)} 
          onOptimisticSave={handleSaveCareer}
        />
      )}

      {isUniqueIdModalOpen && (
        <UniqueIdModal 
          currentId={localProfile?.uniqueAppId || ''} 
          onClose={() => setIsUniqueIdModalOpen(false)} 
          onConfirm={handleUniqueIdUpdate} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UserProfileView;