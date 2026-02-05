import React from 'react';
import { UserProfile } from '../../types';
import { 
  MapPin, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Calendar,
  Share2,
  Clock
} from 'lucide-react';

interface AcademicGridProps {
  profile: UserProfile;
  onUpdate: (field: keyof UserProfile, value: string) => void;
}

const AcademicGrid: React.FC<AcademicGridProps> = ({ profile, onUpdate }) => {
  
  const calculateAge = (dob: string) => {
    if (!dob) return "-";
    try {
      const birth = new Date(dob);
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      let days = now.getDate() - birth.getDate();
      
      if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      return `${years} Years, ${months} Months, ${days} Days`;
    } catch (e) {
      return "-";
    }
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm h-full animate-in slide-in-from-right duration-1000">
       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-10 flex items-center gap-3">
         Personal Metadata Hub
       </h3>
       
       <div className="space-y-10">
          
          {/* TANGGAL LAHIR & USIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Calendar size={14} className="text-[#FED400]" /> Date of Birth
                </label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-xs font-bold text-[#004A74] outline-none focus:bg-white focus:border-[#FED400] transition-all"
                  defaultValue={profile.birthDate ? profile.birthDate.substring(0, 10) : ""}
                  onBlur={(e) => onUpdate('birthDate', e.target.value)}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Clock size={14} className="text-emerald-500" /> Current Age
                </label>
                <div className="w-full bg-[#004A74]/5 border border-[#004A74]/10 px-5 py-4 rounded-2xl">
                   <p className="text-xs font-black text-[#004A74]">{calculateAge(profile.birthDate)}</p>
                </div>
             </div>
          </div>

          {/* ALAMAT LENGKAP - AUTO EXPANDABLE */}
          <div className="space-y-2">
             <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
               <MapPin size={14} /> Full Residence Address
             </label>
             <textarea 
               className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-xs font-bold text-[#004A74] outline-none focus:bg-white focus:border-[#FED400] transition-all resize-none overflow-hidden leading-relaxed"
               defaultValue={profile.address}
               onBlur={(e) => onUpdate('address', e.target.value)}
               onInput={(e) => {
                 const target = e.target as HTMLTextAreaElement;
                 target.style.height = 'auto';
                 target.style.height = target.scrollHeight + 'px';
               }}
               placeholder="Enter full address..."
               rows={2}
               ref={(el) => {
                 if (el) {
                   el.style.height = 'auto';
                   el.style.height = el.scrollHeight + 'px';
                 }
               }}
             />
          </div>

          {/* KONTAK: EMAIL & WHATSAPP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Mail size={14} /> Official Email
                </label>
                <input 
                  className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-[11px] font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                  defaultValue={profile.email}
                  onBlur={(e) => onUpdate('email', e.target.value)}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Phone size={14} /> WhatsApp Number
                </label>
                <input 
                  className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-[11px] font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                  defaultValue={profile.phone}
                  onBlur={(e) => onUpdate('phone', e.target.value)}
                />
             </div>
          </div>

          {/* SOCIAL MEDIA */}
          <div className="space-y-2">
             <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
               <Share2 size={14} /> Social Media Handle
             </label>
             <input 
               className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-xs font-bold text-[#004A74] outline-none focus:bg-white transition-all"
               defaultValue={profile.socialMedia}
               onBlur={(e) => onUpdate('socialMedia', e.target.value)}
               placeholder="@username or profile link..."
             />
          </div>

          {/* PEKERJAAN & AFILIASI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Briefcase size={14} /> Current Job Title
                </label>
                <input 
                  className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-xs font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                  defaultValue={profile.jobTitle}
                  onBlur={(e) => onUpdate('jobTitle', e.target.value)}
                  placeholder="Researcher, Professor, etc..."
                />
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Building2 size={14} /> Recent Affiliation
                </label>
                <input 
                  className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl text-xs font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                  defaultValue={profile.affiliation}
                  onBlur={(e) => onUpdate('affiliation', e.target.value)}
                  placeholder="University / Organization..."
                />
             </div>
          </div>

       </div>
    </div>
  );
};

export default AcademicGrid;