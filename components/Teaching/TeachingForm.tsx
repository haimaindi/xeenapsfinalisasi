import React, { useState, useEffect } from 'react';
// @ts-ignore - Resolving TS error for missing exported members in some environments
import { useNavigate, useParams } from 'react-router-dom';
import { 
  TeachingItem, 
  SessionMode, 
  TeachingRole, 
  EducationLevel, 
  CourseType, 
  AssignmentType, 
  SessionStatus 
} from '../../types';
import { saveTeachingItem, fetchTeachingPaginated } from '../../services/TeachingService';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  ClipboardCheck, 
  FileText,
  Save,
  ChevronRight,
  ChevronLeft,
  Layout,
  Layers,
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import ResourcePicker from './ResourcePicker';

const TeachingForm: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false);

  // Fix: Renamed properties to correctly match TeachingItem interface definition (presentationId, questionBankId, attachmentLink)
  const [formData, setFormData] = useState<TeachingItem>({
    id: crypto.randomUUID(),
    label: '', 
    courseCode: '',
    courseTitle: '',
    institution: '',
    faculty: '',
    program: '', 
    academicYear: '2024/2025',
    semester: 'Ganjil',
    classGroup: '',
    meetingNo: 1,
    teachingDate: new Date().toISOString().substring(0, 10),
    startTime: '08:00',
    endTime: '10:00',
    mode: SessionMode.OFFLINE,
    location: '',
    role: TeachingRole.MANDIRI,
    plannedStudents: 40,
    eventColor: '#004A74',
    skReference: '',
    theoryCredits: 2,
    practicalCredits: 0,
    courseType: CourseType.WAJIB_PRODI,
    educationLevel: EducationLevel.S1,
    learningOutcomes: '',
    topic: '',
    method: 'Lecture',
    referenceLinks: [],
    // Fix: Corrected property name from presentationIds to presentationId
    presentationId: [],
    // Fix: Corrected property name from questionBankIds to questionBankId
    questionBankId: [],
    // Fix: Corrected property name from externalLinks to attachmentLink
    attachmentLink: [],
    syllabusLink: '',
    lectureNotesLink: '',
    assignmentType: AssignmentType.NONE,
    assessmentCriteria: '',
    status: SessionStatus.COMPLETED,
    vaultJsonId: '', 
    storageNodeUrl: '', 
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    if (sessionId) {
      const load = async () => {
        const res = await fetchTeachingPaginated(1, 1000);
        const found = res.items.find(i => i.id === sessionId);
        if (found) setFormData(found);
      };
      load();
    }
  }, [sessionId]);

  const handleSave = async () => {
    setIsSubmitting(true);
    Swal.fire({ title: 'Synchronizing Cloud Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...XEENAPS_SWAL_CONFIG });
    
    try {
      const success = await saveTeachingItem({ ...formData, updatedAt: new Date().toISOString() });
      Swal.close();
      if (success) {
        showXeenapsToast('success', 'Teaching record synchronized');
        navigate('/teaching');
      } else {
        showXeenapsToast('error', 'Cloud sync failed');
      }
    } catch (e) {
      Swal.close();
      showXeenapsToast('error', 'Network failure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: 'Planning', icon: Calendar, color: 'text-blue-500' },
    { id: 2, label: 'Preparing', icon: BookOpen, color: 'text-orange-500' },
    { id: 3, label: 'Reporting', icon: ClipboardCheck, color: 'text-green-500' }
  ];

  return (
    <FormPageContainer>
      <FormStickyHeader 
        title={sessionId ? "Edit Session" : "New Teaching Record"} 
        subtitle="Lecturer Performance & BKD Compliance" 
        onBack={() => navigate('/teaching')}
        rightElement={
          <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
            {steps.map(step => (
              <button 
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeStep === step.id ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}
              >
                <step.icon size={14} /> {step.label}
              </button>
            ))}
          </div>
        }
      />

      <FormContentArea>
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
          
          {/* STEP 1: PLANNING (Logistics) */}
          {activeStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Course Code" required>
                    <input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold uppercase" value={formData.courseCode} onChange={e => setFormData({...formData, courseCode: e.target.value.toUpperCase()})} placeholder="e.g. AR123" />
                  </FormField>
                  <FormField label="Full Course Title" required>
                    <input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.courseTitle} onChange={e => setFormData({...formData, courseTitle: e.target.value})} placeholder="e.g. Architectural Design II" />
                  </FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Academic Year"><FormDropdown value={formData.academicYear} options={['2023/2024', '2024/2025', '2025/2026']} onChange={v => setFormData({...formData, academicYear: v})} placeholder="Year" /></FormField>
                  <FormField label="Semester"><FormDropdown value={formData.semester} options={['Ganjil', 'Genap', 'Antara']} onChange={v => setFormData({...formData, semester: v})} placeholder="Semester" /></FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField label="Meeting Number"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={formData.meetingNo} onChange={e => setFormData({...formData, meetingNo: parseInt(e.target.value) || 1})} /></FormField>
                  <FormField label="Class Group"><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={formData.classGroup} onChange={e => setFormData({...formData, classGroup: e.target.value})} placeholder="e.g. Class A" /></FormField>
                  <FormField label="Teaching Mode"><FormDropdown value={formData.mode} options={Object.values(SessionMode)} onChange={v => setFormData({...formData, mode: v as SessionMode})} placeholder="Mode" /></FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField label="Date"><input type="date" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.teachingDate} onChange={e => setFormData({...formData, teachingDate: e.target.value})} /></FormField>
                  <FormField label="Start Time"><input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></FormField>
                  <FormField label="End Time"><input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Location / Venue">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Room name or Zoom link..." />
                    </div>
                  </FormField>
                  <FormField label="Assigned Role"><FormDropdown value={formData.role} options={Object.values(TeachingRole)} onChange={v => setFormData({...formData, role: v as TeachingRole})} placeholder="Role" /></FormField>
               </div>

               <div className="flex justify-between pt-10">
                  <div />
                  <button type="button" onClick={() => setActiveStep(2)} className="flex items-center gap-2 px-10 py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 active:scale-95 transition-all">
                    Next: Preparing <ChevronRight size={16} />
                  </button>
               </div>
            </div>
          )}

          {/* STEP 2: PREPARING (Pedagogy) */}
          {activeStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <FormField label="Theory Credits"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={formData.theoryCredits} onChange={e => setFormData({...formData, theoryCredits: parseFloat(e.target.value) || 0})} /></FormField>
                  <FormField label="Practical Credits"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={formData.practicalCredits} onChange={e => setFormData({...formData, practicalCredits: parseFloat(e.target.value) || 0})} /></FormField>
                  <div className="col-span-2">
                    <FormField label="Course Category">
                      <FormDropdown value={formData.courseType} options={Object.values(CourseType)} onChange={v => setFormData({...formData, courseType: v as CourseType})} placeholder="Type" />
                    </FormField>
                  </div>
               </div>

               <FormField label="Planned Topic / Subject Matter" required>
                  <input className="w-full px-5 py-4 bg-[#004A74]/5 border border-[#004A74]/10 rounded-2xl text-base font-bold text-[#004A74] uppercase placeholder:text-gray-300" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} placeholder="WHAT ARE YOU TEACHING TODAY?" />
               </FormField>

               <FormField label="Teaching Method (IKU-7 Compliance)">
                  <FormDropdown value={formData.method} options={['Lecture', 'Case Method', 'Team-Based Project', 'Discussion', 'Laboratory Work', 'Field Study']} onChange={v => setFormData({...formData, method: v})} placeholder="Method" />
               </FormField>

               <FormField label="Learning Outcomes (Sub-CPMK)">
                  <textarea className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium min-h-[100px] leading-relaxed" value={formData.learningOutcomes} onChange={e => setFormData({...formData, learningOutcomes: e.target.value})} placeholder="What should students achieve after this session?" />
               </FormField>

               <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Library Resources & References</label>
                    <button type="button" onClick={() => setIsResourcePickerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FED400]/20 text-[#004A74] rounded-lg text-[8px] font-black uppercase tracking-widest border border-[#FED400]/40 hover:bg-[#FED400] transition-all">
                       <Plus size={12} /> Attach from Librarian
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {formData.referenceLinks.length === 0 ? (
                      <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-[2rem] opacity-30">
                        <BookOpen size={40} className="mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">No Library Items Attached</p>
                      </div>
                    ) : formData.referenceLinks.map((ref, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                         <div className="flex items-center gap-3">
                            <Layers size={14} className="text-[#004A74]" />
                            <span className="text-[10px] font-bold text-[#004A74] uppercase truncate max-w-sm">{ref.title}</span>
                         </div>
                         <button type="button" onClick={() => setFormData({...formData, referenceLinks: formData.referenceLinks.filter(r => r.id !== ref.id)})} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={14} />
                         </button>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="flex justify-between pt-10">
                  <button type="button" onClick={() => setActiveStep(1)} className="flex items-center gap-2 px-10 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button type="button" onClick={() => setActiveStep(3)} className="flex items-center gap-2 px-10 py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 active:scale-95 transition-all">
                    Next: Reporting <ChevronRight size={16} />
                  </button>
               </div>
            </div>
          )}

          {/* STEP 3: REPORTING (Realization) */}
          {activeStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Session Realization Status">
                    <FormDropdown value={formData.status} options={Object.values(SessionStatus)} onChange={v => setFormData({...formData, status: v as SessionStatus})} placeholder="Status" />
                  </FormField>
                  <FormField label="Total Students Present">
                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={formData.totalStudentsPresent} onChange={e => setFormData({...formData, totalStudentsPresent: parseInt(e.target.value) || 0})} />
                  </FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Actual Start"><input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.actualStartTime} onChange={e => setFormData({...formData, actualStartTime: e.target.value})} /></FormField>
                  <FormField label="Actual End"><input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={formData.actualEndTime} onChange={e => setFormData({...formData, actualEndTime: e.target.value})} /></FormField>
               </div>

               <FormField label="Attendance List (Link/ID)">
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-blue-500 underline" value={formData.attendanceListLink} onChange={e => setFormData({...formData, attendanceListLink: e.target.value})} placeholder="Google Sheet or Drive Folder Link..." />
                  </div>
               </FormField>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <FormField label="Assignment Plan">
                    <FormDropdown value={formData.assignmentType} options={Object.values(AssignmentType)} onChange={v => setFormData({...formData, assignmentType: v as AssignmentType})} placeholder="Assignment" />
                  </FormField>
                  <FormField label="Assessment Criteria">
                    <input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.assessmentCriteria} onChange={e => setFormData({...formData, assessmentCriteria: e.target.value})} placeholder="e.g. rubrics, accuracy, quiz score..." />
                  </FormField>
               </div>

               <FormField label="Obstacles & Problems (BKD Report Requirement)">
                  <textarea className="w-full px-5 py-4 bg-red-50/30 border border-red-100 rounded-2xl text-xs font-medium min-h-[80px]" value={formData.problems} onChange={e => setFormData({...formData, problems: e.target.value})} placeholder="Mention projector failure, connection issues, or student lack of focus..." />
               </FormField>

               <FormField label="Lecturer Self-Reflection">
                  <textarea className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium min-h-[120px]" value={formData.reflection} onChange={e => setFormData({...formData, reflection: e.target.value})} placeholder="What can be improved for the next session?" />
               </FormField>

               <div className="flex justify-between pt-10">
                  <button type="button" onClick={() => setActiveStep(2)} className="flex items-center gap-2 px-10 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button type="button" onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-3 px-12 py-5 bg-[#004A74] text-[#FED400] rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#004A74]/20 hover:scale-105 active:scale-95 transition-all">
                    <Save size={18} /> {isSubmitting ? 'Syncing...' : 'Finalize Record'}
                  </button>
               </div>
            </div>
          )}

        </div>
      </FormContentArea>

      {isResourcePickerOpen && (
        <ResourcePicker 
          type="LIBRARY"
          onClose={() => setIsResourcePickerOpen(false)}
          onSelect={(data) => {
            if (!Array.isArray(data)) return;
            const current = formData.referenceLinks || [];
            const newItems = data.filter(res => !current.some(r => r.id === res.id))
                                 .map(res => ({ id: res.id, title: res.title }));
            if (newItems.length > 0) {
              setFormData({...formData, referenceLinks: [...current, ...newItems]});
            }
            setIsResourcePickerOpen(false);
          }}
        />
      )}
    </FormPageContainer>
  );
};

export default TeachingForm;