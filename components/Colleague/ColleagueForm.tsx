import React, { useState, useRef } from 'react';
import { ColleagueItem } from '../../types';
import { saveColleague, uploadColleaguePhoto } from '../../services/ColleagueService';
import { 
  X, 
  Save, 
  Users, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  Share2, 
  Camera, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { FormField } from '../Common/FormComponents';
import { showXeenapsToast } from '../../utils/toastUtils';
import { BRAND_ASSETS } from '../../assets';

interface ColleagueFormProps {
  item?: ColleagueItem;
  onClose: () => void;
  onComplete: () => void;
}

const ColleagueForm: React.FC<ColleagueFormProps> = ({ item, onClose, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ColleagueItem>(item || {
    id: crypto.randomUUID(),
    name: '',
    uniqueAppId: '',
    affiliation: '',
    email: '',
    phone: '',
    socialMedia: '',
    photoUrl: '',
    photoFileId: '',
    photoNodeUrl: '',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const isInvalid = !formData.name.trim() || !formData.uniqueAppId.trim();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const result = await uploadColleaguePhoto(file);
    if (result) {
      setFormData({ 
        ...formData, 
        photoUrl: result.photoUrl, 
        photoFileId: result.fileId, 
        photoNodeUrl: result.nodeUrl 
      });
      showXeenapsToast('success', 'Profile photo updated');
    } else {
      showXeenapsToast('error', 'Upload failed');
    }
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) return;

    setIsSubmitting(true);
    const success = await saveColleague({ 
      ...formData, 
      updatedAt: new Date().toISOString() 
    });

    if (success) {
      showXeenapsToast('success', item ? 'Colleague updated' : 'Colleague registered');
      onComplete();
    } else {
      showXeenapsToast('error', 'Failed to synchronize cloud data');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <Users size={24} />
            </div>
            <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">
              {item ? 'Edit Colleague' : 'Register Colleague'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          
          {/* PHOTO UPLOAD AREA */}
          <div className="flex flex-col items-center space-y-4">
             <div className="relative group">
                <div className="w-32 h-32 rounded-full p-1 border-4 border-[#FED400] bg-white shadow-xl overflow-hidden">
                   <img src={formData.photoUrl || BRAND_ASSETS.USER_DEFAULT} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-1 right-1 p-2.5 bg-[#004A74] text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                   {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Colleague Portrait</p>
          </div>

          {/* MANDATORY FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField label="Full Name" required error={!formData.name.trim()}>
                <input 
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#004A74] outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Authenticated Name..."
                />
             </FormField>
             <FormField label="Unique App ID" required error={!formData.uniqueAppId.trim()}>
                <div className="relative">
                   <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                   <input 
                     required
                     className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-mono font-bold text-[#004A74] tracking-widest outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all"
                     value={formData.uniqueAppId}
                     onChange={e => setFormData({...formData, uniqueAppId: e.target.value})}
                     placeholder="XN-XXXXXX"
                   />
                </div>
             </FormField>
          </div>

          <div className="h-px bg-gray-50" />

          {/* OPTIONAL FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField label="Affiliation / Institution">
                <div className="relative">
                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                   <input 
                     className="w-full pl-11 pr-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                     value={formData.affiliation || ''}
                     onChange={e => setFormData({...formData, affiliation: e.target.value})}
                     placeholder="Organization Name..."
                   />
                </div>
             </FormField>
             <FormField label="Official Email">
                <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                   <input 
                     type="email"
                     className="w-full pl-11 pr-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-blue-500 outline-none focus:bg-white transition-all"
                     value={formData.email || ''}
                     onChange={e => setFormData({...formData, email: e.target.value})}
                     placeholder="colleague@email.com"
                   />
                </div>
             </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField label="WhatsApp / Phone">
                <div className="relative">
                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                   <input 
                     className="w-full pl-11 pr-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                     value={formData.phone || ''}
                     onChange={e => setFormData({...formData, phone: e.target.value})}
                     placeholder="+62..."
                   />
                </div>
             </FormField>
             <FormField label="Social Media Link">
                <div className="relative">
                   <Share2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                   <input 
                     className="w-full pl-11 pr-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:bg-white transition-all"
                     value={formData.socialMedia || ''}
                     onChange={e => setFormData({...formData, socialMedia: e.target.value})}
                     placeholder="IG / LinkedIn / X..."
                   />
                </div>
             </FormField>
          </div>

          {isInvalid && (
             <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl animate-in slide-in-from-top-2">
                <AlertCircle className="text-orange-500 shrink-0" size={18} />
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest leading-relaxed">
                   Validation required: "Name" and "Unique App ID" must be filled to authorize cloud synchronization.
                </p>
             </div>
          )}

          <div className="pt-6">
             <button 
               type="submit" 
               disabled={isSubmitting || isInvalid}
               className={`w-full py-5 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${isSubmitting || isInvalid ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
             >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSubmitting ? 'SYCHRONIZING...' : 'AUTHORIZE & SYNC'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColleagueForm;