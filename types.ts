export enum SourceType {
  LINK = 'LINK',
  FILE = 'FILE',
  NOTE = 'NOTE',
  BOOK = 'BOOK',
  VIDEO = 'VIDEO'
}

export enum FileFormat {
  PDF = 'PDF',
  DOCX = 'DOCX',
  MD = 'MD',
  MP4 = 'MP4',
  URL = 'URL',
  EPUB = 'EPUB',
  PPTX = 'PPTX',
  TXT = 'TXT',
  XLSX = 'XLSX',
  CSV = 'CSV',
  DOC = 'DOC',
  XLS = 'XLS',
  PPT = 'PPT'
}

export enum LibraryType {
  LITERATURE = 'Literature',
  TASK = 'Task',
  PERSONAL = 'Personal',
  OTHER = 'Other'
}

export enum BloomsLevel {
  C1_REMEMBER = 'C1 Remember',
  C2_UNDERSTAND = 'C2 Understand',
  C3_APPLY = 'C3 Apply',
  C4_ANALYZE = 'C4 Analyze',
  C5_EVALUATE = 'C5 Evaluate',
  C6_CREATE = 'C6 Create'
}

export interface QuestionOption {
  key: string; // e.g., 'A', 'B', 'C', 'D', 'E'
  text: string;
}

export interface QuestionItem {
  id: string;
  collectionId: string;
  bloomLevel: BloomsLevel;
  customLabel: string;
  questionText: string;
  options: QuestionOption[];
  correctAnswer: string; // The key (A-E)
  reasoningCorrect: string;
  reasoningDistractors: Record<string, string>; // Key (A-E) -> Reason why it's wrong
  verbatimReference: string; // Mandatory sentence from source text
  language: string;
  createdAt: string;
}

export interface PubInfo {
  journal?: string;
  vol?: string;
  issue?: string;
  pages?: string;
}

export interface Identifiers {
  doi?: string;
  issn?: string;
  isbn?: string;
  pmid?: string;
  arxiv?: string;
  bibcode?: string;
}

export interface TagsData {
  keywords: string[];
  labels: string[];
}

export interface SupportingData {
  references: string[];
  videoUrl?: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  type: LibraryType;
  category: string;
  topic: string;
  subTopic: string;
  authors: string[]; 
  publisher: string;
  year: string;
  fullDate?: string;
  pubInfo: PubInfo;
  identifiers: Identifiers;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  issn?: string;
  isbn?: string;
  pmid?: string;
  arxivId?: string;
  bibcode?: string;
  source: SourceType;
  format: FileFormat;
  url?: string;
  fileId?: string;
  imageView?: string;
  youtubeId?: string;
  tags: TagsData;
  abstract?: string;
  mainInfo?: string; 
  summary?: string;
  strength?: string;
  weakness?: string;
  researchMethodology?: string;
  unfamiliarTerminology?: string;
  quickTipsForYou?: string;
  supportingReferences?: SupportingData; 
  inTextHarvard?: string;
  bibHarvard?: string;
  extractedJsonId?: string;
  insightJsonId?: string;
  storageNodeUrl?: string;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- SHARBOX MODULE TYPES ---

export enum SharboxStatus {
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
  SENT = 'SENT'
}

export interface SharboxItem extends LibraryItem {
  id: string; // Transaction ID
  senderName?: string;
  senderPhotoUrl?: string;
  senderAffiliation?: string;
  senderUniqueAppId?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderSocialMedia?: string;
  receiverName?: string;
  receiverPhotoUrl?: string;
  receiverUniqueAppId?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  receiverSocialMedia?: string;
  message?: string;
  timestamp: string;
  status: SharboxStatus;
  id_item: string; // Original library ID
  isRead?: boolean;
}

// --- NOTEBOOK MODULE TYPES ---

export interface NoteAttachment {
  type: 'LINK' | 'FILE';
  label: string;
  url?: string;
  fileId?: string;
  nodeUrl?: string;
  mimeType?: string;
}

export interface NoteItem {
  id: string;
  collectionId: string; // Opsional: relasi ke library
  collectionTitle?: string; // New: Persistent collection title for backend search
  label: string;
  noteJsonId: string; // ID file sharding di Drive
  storageNodeUrl: string;
  searchIndex?: string; // New: Concatenated text (desc + attachments) for backend search
  isFavorite: boolean;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteContent {
  description: string; // Isi teks catatan (HTML/Rich Text)
  attachments: NoteAttachment[];
}

// --- LITERATURE REVIEW MODULE TYPES ---

export interface ReviewMatrixRow {
  collectionId: string;
  title: string;
  answer: string;
  verbatim: string;
}

export interface ReviewContent {
  matrix: ReviewMatrixRow[];
  finalSynthesis: string;
}

export interface ReviewItem {
  id: string;
  label: string;
  centralQuestion: string;
  reviewJsonId: string;
  storageNodeUrl: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- ACTIVITIES TYPES ---

export enum ActivityType {
  SEMINAR = 'Seminar',
  WORKSHOP = 'Workshop',
  TRAINING = 'Training',
  AWARD = 'Award',
  CERTIFICATION = 'Certification',
  PROJECT = 'Project',
  OTHER = 'Other'
}

export enum ActivityLevel {
  INTERNATIONAL = 'International',
  NATIONAL = 'National',
  REGIONAL = 'Regional',
  LOCAL = 'Local',
  INSTITUTIONAL = 'Institutional'
}

export enum ActivityRole {
  PARTICIPANT = 'Participant',
  SPEAKER = 'Speaker',
  MODERATOR = 'Moderator',
  COMMITTEE = 'Committee',
  AWARDEE = 'Awardee'
}

export interface ActivityVaultItem {
  type: 'FILE' | 'LINK';
  fileId?: string;
  url?: string;
  label: string;
  mimeType?: string;
  nodeUrl?: string; // New field for per-item sharding
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  eventName: string;
  organizer: string;
  location: string;
  level: ActivityLevel;
  startDate: string;
  endDate: string;
  role: ActivityRole;
  description: string;
  notes: string;
  certificateNumber: string;
  credit: string;
  link: string;
  isFavorite: boolean;
  vaultJsonId: string;
  storageNodeUrl: string;
  certificateFileId?: string;
  certificateNodeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// --- TEACHING MODULE TYPES ---

export enum TeachingRole {
  MANDIRI = 'Mandiri',
  TEAM_TEACHING = 'Team Teaching',
  COORDINATOR = 'Koordinator'
}

export enum SessionMode {
  OFFLINE = 'Offline',
  ONLINE = 'Online',
  HYBRID = 'Hybrid'
}

export enum EducationLevel {
  DIPLOMA = 'Diploma',
  S1 = 'S1',
  S2 = 'S2',
  S3 = 'S3'
}

export enum CourseType {
  WAJIB_PRODI = 'Wajib Prodi',
  WAJIB_NASIONAL = 'Wajib Nasional',
  PILIHAN = 'Mata Kuliah Pilihan'
}

export enum AssignmentType {
  QUIZ = 'Quiz',
  INDIVIDUAL_TASK = 'Individual Task',
  GROUP_PROJECT = 'Group Project',
  NONE = 'None'
}

export enum SessionStatus {
  PLANNED = 'Planned',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  RESCHEDULED = 'Rescheduled',
  SUBSTITUTED = 'Substituted'
}

export interface TeachingVaultItem {
  type: 'FILE' | 'LINK';
  fileId?: string;
  url?: string;
  label: string;
  mimeType?: string;
  nodeUrl?: string;
}

export interface ExternalLinkItem {
  label: string;
  url: string;
}

export interface TeachingItem {
  // Logic Identity
  id: string;
  label: string; 
  
  // Phase 1: Planning (Schedule)
  teachingDate: string;
  startTime: string;
  endTime: string;
  institution: string;
  faculty: string;
  program: string;
  academicYear: string;
  semester: string;
  classGroup: string;
  meetingNo: number;
  mode: SessionMode;
  plannedStudents: number;
  location: string;
  eventColor?: string;
  skReference?: string;

  // Phase 2: Preparing (Substance)
  courseTitle: string;
  courseCode: string;
  learningOutcomes: string;
  method: string;
  theoryCredits: number;
  practicalCredits: number;
  courseType: CourseType;
  educationLevel: EducationLevel;
  topic: string;
  role: TeachingRole;
  referenceLinks: { id: string; title: string }[]; // Updated
  presentationId: { id: string; title: string }[]; // Updated
  questionBankId: { id: string; label: string; questionText: string }[]; // Updated
  attachmentLink: ExternalLinkItem[]; // Manual Links
  syllabusLink?: string;
  lectureNotesLink?: string;

  // Phase 3: Reporting
  actualStartTime?: string;
  actualEndTime?: string;
  teachingDuration?: string; // Computed
  totalStudentsPresent?: number;
  attendancePercentage?: number; // Computed
  attendanceListLink?: string;
  problems?: string;
  reflection?: string;
  assignmentType: AssignmentType;
  assessmentCriteria: string;

  // System
  vaultJsonId: string;
  storageNodeUrl: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

// --- RESEARCH PROJECT RESEARCH PROJECT TYPES ---

export enum ResearchStatus {
  DRAFT = 'Draft',
  FINALIZED = 'Finalized',
  UTILIZED = 'Utilized'
}

export interface ResearchProject {
  id: string;
  projectName: string;
  language: string;
  status: ResearchStatus;
  isFavorite: boolean;
  isUsed?: boolean;
  proposedTitle: string;
  noveltyNarrative: string;
  futureDirections: string; // JSON string array
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSource extends GapAnalysisRow {
  projectId: string;
  isAnalyzing?: boolean; 
  isFavorite?: boolean;
  isUsed?: boolean;
}

// --- TRACER MODULE TYPES ---

export enum TracerStatus {
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold',
  CANCELLED = 'Cancelled'
}

export interface TracerProject {
  id: string;
  title: string;
  label: string;
  topic: string;
  problemStatement: string;
  researchGap: string;
  researchQuestion: string;
  methodology: string;
  population: string;
  keywords: string[];
  category: string;
  authors: string[];
  startDate: string;
  estEndDate: string;
  status: TracerStatus;
  progress: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export interface TracerLogAttachment {
  type: 'FILE' | 'LINK';
  label: string;
  url?: string;
  fileId?: string;
  nodeUrl?: string;
  mimeType?: string;
}

export interface TracerLogContent {
  description: string;
  attachments: TracerLogAttachment[];
}

export interface TracerLog {
  id: string;
  projectId: string;
  date: string;
  title: string;
  logJsonId: string; // Sharding ID
  storageNodeUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface TracerTodo {
  id: string;
  projectId: string;
  title: string;
  description: string;
  startDate: string;
  deadline: string;
  linkLabel: string;
  linkUrl: string;
  isDone: boolean;
  completedDate: string;
  completionRemarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface TracerSavedQuote {
  id: string;
  originalText: string;
  enhancedText: string;
  lang: string;
  createdAt: string;
}

export interface TracerReferenceContent {
  quotes: TracerSavedQuote[];
}

export interface TracerReference {
  id: string;
  projectId: string;
  collectionId: string; // Links to LibraryItem
  contentJsonId: string; // Sharding ID for quotes
  storageNodeUrl: string; // Sharding node URL
  createdAt: string;
}

export interface TracerQuote {
  originalText: string;
  contextFound: string;
  enhancedText: string;
  citation: string;
}

// --- NEW TRACER FINANCE TYPES ---

export interface TracerFinanceAttachment {
  type: 'FILE' | 'LINK';
  label: string;
  url?: string;
  fileId?: string;
  nodeUrl?: string;
  mimeType?: string;
}

export interface TracerFinanceContent {
  attachments: TracerFinanceAttachment[];
}

export interface TracerFinanceItem {
  id: string;
  projectId: string;
  date: string; // ISO String (DD/MM/YY HH:MM format in UI)
  credit: number;
  debit: number;
  balance: number;
  description: string;
  attachmentsJsonId: string;
  storageNodeUrl: string;
  createdAt: string;
  updatedAt: string;
}

// --- BRAINSTORMING TYPES ---

export interface BrainstormingItem {
  id: string;
  label: string;
  roughIdea: string;
  proposedTitle: string;
  problemStatement: string;
  researchGap: string;
  researchQuestion: string;
  methodology: string;
  population: string;
  keywords: string[];
  pillars: string[];
  proposedAbstract: string;
  externalRefs: string[]; // Persistent results from OpenAlex
  internalRefs: string[]; // Persistent IDs from Internal Library
  isFavorite: boolean;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- PUBLICATION TYPES ---

export enum PublicationStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  REVISION = 'Revision',
  ACCEPTED = 'Accepted',
  PUBLISHED = 'Published',
  REJECTED = 'Rejected'
}

export interface PublicationItem {
  id: string;
  title: string;
  authors: string[];
  type: string; // Journal, Conference, Book, etc.
  status: PublicationStatus;
  publisherName: string;
  researchDomain: string;
  affiliation: string;
  indexing: string;
  quartile: string;
  doi: string;
  issn_isbn: string;
  volume: string;
  issue: string;
  pages: string;
  year: string;
  submissionDate: string;
  acceptanceDate: string;
  publicationDate: string;
  brainstormingId?: string;
  libraryId?: string;
  manuscriptLink: string;
  abstract: string;
  keywords: string[];
  remarks: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- LITERATURE SEARCH TYPES ---

export interface LiteratureArticle {
  paperId: string;
  title: string;
  authors: { name: string }[];
  year: number;
  doi: string;
  isbn?: string;
  url: string;
  venue: string;
  citationCount: number;
  abstract: string;
}

export interface ArchivedArticleItem {
  id: string;
  title: string;
  citationHarvard: string;
  doi: string;
  url: string;
  info: string;
  label: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface ArchivedBookItem {
  id: string;
  title: string;
  citationHarvard: string;
  isbn: string;
  url: string;
  info: string;
  label: string;
  isFavorite: boolean;
  createdAt: string;
}

// --- NEW PRESENTATION TYPES ---

export enum PresentationTemplate {
  MODERN = 'Modern Minimalist',
  CORPORATE = 'Corporate Professional',
  CREATIVE = 'Creative Dynamic',
  ACADEMIC = 'Academic Clean'
}

export interface PresentationThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headingFont: string;
}

export interface PresentationItem {
  id: string;
  collectionIds: string[]; 
  gSlidesId: string;
  title: string;
  presenters: string[]; 
  templateName: PresentationTemplate;
  themeConfig: PresentationThemeConfig;
  slidesCount: number;
  storageNodeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// --- NEW RESEARCH GAP TYPES ---

export interface GapAnalysisRow {
  id: string;
  sourceId: string;
  title: string;
  findings: string;
  methodology: string;
  limitations: string;
  createdAt: string;
}

export interface NoveltySynthesis {
  narrative: string;
  proposedTitle: string;
  futureDirections: string[];
}

// --- PROFILE TYPES ---

export interface UserProfile {
  fullName: string;
  photoUrl: string;
  photoFileId: string;
  photoNodeUrl: string;
  birthDate: string;
  address: string;
  email: string;
  phone: string;
  sintaId: string;
  scopusId: string;
  wosId: string;
  googleScholarId: string;
  jobTitle: string;
  affiliation: string;
  uniqueAppId: string;
  socialMedia: string;
}

export interface EducationEntry {
  id: string;
  level: string; // Flexible string (Dropdown + manual)
  institution: string;
  major: string;
  degree: string;
  startYear: string;
  endYear: string;
}

export interface CareerEntry {
  id: string;
  company: string;
  position: string;
  type: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
}

// --- CV ARCHITECT TYPES ---

export enum CVTemplateType {
  MODERN_ACADEMIC = 'Template A',
  EXECUTIVE_BLUE = 'Template B',
  INSTITUTIONAL_CLASSIC = 'Template C'
}

export interface CVDocument {
  id: string;
  title: string;
  template: CVTemplateType;
  fileId: string; // PDF in Drive
  storageNodeUrl: string;
  selectedEducationIds: string[];
  selectedCareerIds: string[];
  selectedPublicationIds: string[];
  selectedActivityIds: string[];
  includePhoto: boolean;
  aiSummary: string;
  createdAt: string;
  updatedAt: string;
}

// --- COLLEAGUE MODULE TYPES ---

export interface ColleagueItem {
  id: string;
  name: string; // Mandatory
  uniqueAppId: string; // Mandatory
  affiliation?: string;
  email?: string;
  phone?: string;
  socialMedia?: string;
  photoUrl?: string;
  photoFileId?: string;
  photoNodeUrl?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- CONSULTATION MODULE TYPES ---

export interface ConsultationItem {
  id: string;
  collectionId: string;
  question: string;
  answerJsonId: string;
  nodeUrl: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationAnswerContent {
  answer: string;
  reasoning?: string;
}

export interface GASResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface ExtractionResult extends Partial<LibraryItem> {
  fullText?: string;
  chunks?: string[];
  aiSnippet?: string;
}

export type ViewState = 'LIBRARY' | 'ADD_ITEM' | 'SETTINGS' | 'AI_CHAT' | 'BRAINSTORMING';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}