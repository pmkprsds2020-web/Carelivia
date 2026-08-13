export type UserRole = 'patient' | 'doctor' | 'pharmacist' | 'homecare_staff' | 'admin';

export type ConsultationType = 'chat' | 'video' | 'audio';
export type ConsultationStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'lab_result';

export type PaymentMethod = 'qris' | 'bank_transfer' | 'va' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type HomeCareBookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'on_the_way' | 'completed' | 'cancelled';

export type MedicineCategory = 'resep' | 'bebas' | 'vitamin' | 'alat_kesehatan';

export type NotificationType = 'consultation' | 'chat' | 'homecare' | 'pharmacy' | 'payment' | 'reminder' | 'screening' | 'clinical_alert';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  nik?: string;
  bpjsNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  doctorProfile?: DoctorProfile;
  patientProfile?: PatientProfile;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber?: string;
  hospital?: string;
  experience?: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  isOnline: boolean;
  isAvailable: boolean;
  bio?: string;
  education?: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  bloodType?: string;
  allergies?: string;
  medicalHistory?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  height?: number;
  weight?: number;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  status: ConsultationStatus;
  startTime?: string;
  endTime?: string;
  notes?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
  patient?: User;
  doctor?: User & { doctorProfile?: DoctorProfile };
  messages?: Message[];
  prescription?: Prescription;
  medicalRecord?: MedicalRecord;
}

export interface Message {
  id: string;
  consultationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  status: MessageStatus;
  createdAt: string;
  sender?: User;
}

export interface Prescription {
  id: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineName: string;
  dosage: string;
  quantity: number;
  frequency: string;
  duration: string;
  instructions?: string;
  price?: number;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: MedicineCategory;
  description?: string;
  price: number;
  stock: number;
  unit?: string;
  manufacturer?: string;
  image?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  shippingAddress?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  medicineId: string;
  quantity: number;
  price: number;
  medicine?: Medicine;
}

export interface HomeCareService {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  duration?: number;
  image?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeCareBooking {
  id: string;
  patientId: string;
  staffId?: string;
  serviceId: string;
  status: HomeCareBookingStatus;
  scheduledAt: string;
  completedAt?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  staffLat?: number;
  staffLng?: number;
  eta?: string;
  createdAt: string;
  updatedAt: string;
  service?: HomeCareService;
  patient?: User;
  staff?: User & { homeCareStaff?: HomeCareStaffProfile };
}

export interface HomeCareStaffProfile {
  id: string;
  userId: string;
  certification?: string;
  isAvailable: boolean;
  currentStatus: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  type: string;
  referenceId?: string;
  invoiceNumber?: string;
  paymentProof?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MedicalRecordStatus = 'draft' | 'selesai' | 'ditinjau';

export interface MedicalRecord {
  id: string;
  patientId: string;
  consultationId?: string;
  rmNumber?: string;
  diagnosis?: string;
  symptoms?: string;
  treatment?: string;
  labResults?: string;
  radiologyResults?: string;
  notes?: string;
  status?: MedicalRecordStatus;
  recordDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  category?: string;
  image?: string;
  author?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalConsultations: number;
  totalOrders: number;
  totalHomeCareBookings: number;
  totalRevenue: number;
  recentConsultations: Consultation[];
  recentPayments: Payment[];
  monthlyStats: { month: string; count: number }[];
  doctorSpecializationDistribution: { specialization: string; count: number }[];
  topDoctors: { doctorId: string; name: string; count: number }[];
}

// ── Screening Types (Skrining Komprehensif Telemedicine) ──────────────────

export type ScreeningModuleId =
  | 'keluhan_utama' | 'tanda_bahaya' | 'tanda_vital' | 'penyakit_kronis'
  | 'nyeri' | 'kesehatan_mental' | 'nutrisi' | 'risiko_jatuh'
  | 'status_fungsional' | 'home_care' | 'paliatif' | 'bukti_klinis';

export type ScreeningStatus = 'sent' | 'opened' | 'in_progress' | 'draft' | 'completed' | 'reviewed';

export type RiskCategory = 'rendah' | 'sedang' | 'tinggi';

export type TriageLevel = 'hijau' | 'kuning' | 'oranye' | 'merah';

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: 'radio' | 'checkbox' | 'number' | 'text' | 'scale' | 'file_upload';
  options?: { label: string; value: string | number; score: number }[];
  required: boolean;
  section?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string; // e.g. 'kg', 'cm', 'mmHg', 'bpm', '%', '°C'
  conditionalLogic?: { showIfQuestionId: string; showIfValue: string | number };
}

export interface ScreeningModule {
  id: ScreeningModuleId;
  name: string;
  icon: string;
  description: string;
  estimatedMinutes: number;
  isRequired: boolean; // whether this module is required in the screening
  targetAudience: 'all' | 'lansia' | 'kronis' | 'paliatif'; // who should fill this
  questions: ScreeningQuestion[];
  scoringAlgorithm?: {
    type: 'sum' | 'weighted' | 'custom';
    ranges: { min: number; max: number; category: RiskCategory; label: string; recommendations: string[] }[];
  };
  customOutput?: (answers: Record<string, string | number | string[]>) => { label: string; value: string; details?: string };
}

export interface ClinicalFile {
  id: string;
  type: 'foto_luka' | 'foto_obat' | 'foto_lab' | 'foto_radiologi' | 'video_pernapasan' | 'video_mobilisasi' | 'dokumen_medis';
  name: string;
  url: string; // base64 or blob URL
  uploadedAt: string;
}

export interface TriageResult {
  level: TriageLevel;
  label: string;
  description: string;
  recommendation: string;
  calculatedAt: string;
}

export interface ClinicalSummary {
  chiefComplaint: string;
  riskFactors: string[];
  chronicDiseases: string[];
  painScore: number | null;
  mentalStatus: string;
  functionalStatus: string;
  homeCareNeed: string;
  palliativeStatus: string;
  redFlags: string[];
  vitalSigns: {
    weight?: number; height?: number; temperature?: number;
    bloodPressure?: string; heartRate?: number; oxygenSat?: number; bloodSugar?: number;
  };
}

export interface ScreeningForm {
  id: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  status: ScreeningStatus;
  instructions?: string;
  deadline?: string;
  selectedModules?: ScreeningModuleId[];
  moduleAnswers: Record<ScreeningModuleId, Record<string, string | number | string[]>>;
  moduleScores: Record<ScreeningModuleId, { score: number; riskCategory: RiskCategory; label: string; recommendations: string[] }>;
  clinicalFiles: ClinicalFile[];
  triageResult?: TriageResult;
  clinicalSummary?: ClinicalSummary;
  doctorNotes?: string;
  followUp?: string;
  aiAnalysis?: string;
  completedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningAuditLog {
  id: string;
  screeningId: string;
  action: 'sent' | 'opened' | 'in_progress' | 'draft_saved' | 'completed' | 'reviewed' | 'commented';
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

// ── Palliative Screening Types ────────────────────────────────────────────

export type PalliativeToolType = 'esas' | 'distress' | 'spict' | 'pps' | 'zarit' | 'eortc';

export type PalliativeEwsLevel = 'merah' | 'kuning' | 'hijau';

export interface PalliativeScreeningForm {
  id: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  status: ScreeningStatus;
  instructions?: string;
  selectedTools: PalliativeToolType[];
  // Per-tool answers: bisa datar (jawaban per pertanyaan) atau nested
  // (record jawaban per tool saat skrining inline dari chat).
  toolAnswers: Record<string, number | string | string[] | Record<string, number | string | string[]>>;
  toolResults: Record<PalliativeToolType, {
    score: number;
    scoreLabel: string;
    interpretation: string;
    ewsLevel: PalliativeEwsLevel;
    details: Record<string, unknown>;
  }>;
  doctorNotes?: string;
  completedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivePanel = 
  | 'home' 
  | 'chat' 
  | 'video' 
  | 'pharmacy' 
  | 'homecare' 
  | 'medical-records' 
  | 'doctor-panel' 
  | 'pharmacist-panel'
  | 'homecare-staff-panel'
  | 'admin' 
  | 'admin-pricing'
  | 'admin-users'
  | 'notifications'
  | 'payments'
  | 'reports'
  | 'profile'
  | 'screening'
  | 'palliative-screening'
  | 'palliative-monitoring'
  | 'rvsm'
  | 'patient-paliatif';

// ── Palliative Monitoring Types ──────────────────────────────────────────

export type PalliativeCareStatus = 'rawat_jalan' | 'home_care' | 'hospice' | 'rawat_inap';
export type PalliativePatientStatus = 'aktif' | 'meninggal' | 'lost_follow_up' | 'pindah_faskes' | 'program_selesai';

export type PalliativeProgramCompletionReason =
  | 'sembuh_stabil'
  | 'meninggal_dunia'
  | 'dirujuk'
  | 'pindah_faskes'
  | 'permintaan_pasien_keluarga'
  | 'lainnya';

export interface PalliativeProgramCompletion {
  id: string;
  palliativePatientId: string;
  patientName?: string;
  rmNumber?: string;
  completionDate: string;
  reason: PalliativeProgramCompletionReason;
  otherReason?: string;
  closingNotes?: string;
  programStartDate: string;
  programEndDate: string;
  monitoringDurationDays: number;
  performedBy: string;
  performedByRole: 'doctor' | 'admin';
  createdAt: string;
}
export type PalliativeRiskLevel = 'hijau' | 'kuning' | 'merah';

export interface PalliativePatientInfo {
  id: string;
  patientId: string;
  patientName?: string;
  rmNumber?: string;
  bpjsNumber?: string;
  nik?: string;
  dateOfBirth?: string;
  gender?: string;
  primaryDiagnosis?: string;
  secondaryDiagnosis?: string;
  diseaseStage?: string;
  attendingDoctorId?: string;
  attendingDoctorName?: string;
  familyContactName?: string;
  familyContactRelation?: string;
  familyContactPhone?: string;
  address?: string;
  careStatus: PalliativeCareStatus;
  patientStatus: PalliativePatientStatus;
  monitoringStatus?: PalliativeMonitoringStatus;
  riskLevel: PalliativeRiskLevel;
  notes?: string;
  markingData?: PalliativeMarkingData;
  consultationId?: string;
  vitalSigns?: VitalSignRecordInfo[];
  medications?: PalliativeMedicationInfo[];
  acpDocuments?: AdvanceCarePlanInfo[];
  screeningRecords?: PalliativeScreeningRecordInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface VitalSignRecordInfo {
  id: string;
  palliativePatientId: string;
  recordedBy?: string;
  doctorId?: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSat?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  recordedAt: string;
  createdAt: string;
}

export interface PalliativeMedicationInfo {
  id: string;
  palliativePatientId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  indication?: string;
  isActive: boolean;
  notes?: string;
  adherences?: MedicationAdherenceInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicationAdherenceInfo {
  id: string;
  medicationId: string;
  palliativePatientId: string;
  date: string;
  takenOnTime: boolean;
  missedDose: boolean;
  sideEffects?: string;
  complaints?: string;
  createdAt: string;
}

export interface AdvanceCarePlanInfo {
  id: string;
  palliativePatientId: string;
  decisionMakerName?: string;
  decisionMakerRelation?: string;
  decisionMakerPhone?: string;
  preferredCareLocation?: string;
  careGoal?: string;
  resuscitationPref?: string;
  ventilatorPref?: string;
  icuPref?: string;
  artificialNutrition?: string;
  dialysisPref?: string;
  organDonation?: string;
  patientHopes?: string;
  patientWorries?: string;
  lifeValues?: string;
  endOfLifePrefs?: string;
  patientSigned: boolean;
  familySigned: boolean;
  doctorSigned: boolean;
  signedAt?: string;
  isActive: boolean;
  revisions?: ACPRevisionInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface ACPRevisionInfo {
  id: string;
  acpId: string;
  revisedBy?: string;
  changes?: string;
  reason?: string;
  createdAt: string;
}

export interface PalliativeScreeningRecordInfo {
  id: string;
  palliativePatientId: string;
  doctorId?: string;
  screeningType: PalliativeToolType;
  score?: number;
  scoreLabel?: string;
  interpretation?: string;
  ewsLevel?: PalliativeEwsLevel;
  details?: string;
  performedAt: string;
  createdAt: string;
}

// ── Palliative Chat Types ──────────────────────────────────────────────────

export type PalliativeFormType = 'ttv' | 'keluhan' | 'screening' | 'monitoring_obat';
export type PalliativeChatMsgType = 'text' | 'education' | 'instruction' | 'form_ttv' | 'form_keluhan' | 'form_screening' | 'form_monitoring_obat' | 'form_response' | 'reminder' | 'image' | 'ai_summary' | 'clinical_alert';

export interface PalliativeChatMessage {
  id: string;
  roomId: string;
  /** Patient UUID — used for Supabase persistence (FK to patients.id). */
  palliativePatientId?: string;
  senderId: string;
  senderName: string;
  senderRole: 'doctor' | 'patient' | 'family' | 'system';
  type: PalliativeChatMsgType;
  content: string;
  status: MessageStatus;
  formType?: PalliativeFormType;
  formData?: PalliativeFormData;
  formResponse?: PalliativeFormResponse;
  screeningType?: PalliativeToolType;
  aiSummary?: string;
  clinicalAlert?: PalliativeClinicalAlert;
  imageUrl?: string;
  createdAt: string;
  readAt?: string;
}

export interface PalliativeFormData {
  id: string;
  formType: PalliativeFormType;
  screeningType?: PalliativeToolType;
  status: 'sent' | 'opened' | 'in_progress' | 'draft' | 'submitted';
  progress: number; // 0-100
  submittedAt?: string;
  submittedBy?: string;
}

export interface TTVFormAnswers {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSat?: number;
  weight?: number;
  bloodSugar?: number;
  symptoms: {
    nyeri: boolean;
    sesak: boolean;
    batuk: boolean;
    mual: boolean;
    muntah: boolean;
    sulit_menelan: boolean;
    sulit_tidur: boolean;
    lemas: boolean;
    nafsu_makan_menurun: boolean;
    konstipasi: boolean;
    diare: boolean;
    lainnya: string;
  };
  painScore?: number;
  notes?: string;
}

export interface KeluhanFormAnswers {
  kondisiHariIni: 'baik' | 'cukup' | 'kurang' | 'buruk';
  keluhanBaru: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  nyeriBertambah: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  sesakBertambah: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  makanMinum: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  tidur: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  masalahObat: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  catatanTambahan?: string;
}

// ── Daily Complaint Form (Form Keluhan Harian) ──

export type DailyCondition = 'baik' | 'tidak_baik';
export type DailyComplaintYesNo = 'tidak_ada' | 'ada';
export type DailyPainCondition = 'tidak_nyeri' | 'berkurang' | 'sama' | 'bertambah';
export type DailyDyspneaCondition = 'tidak_sesak' | 'berkurang' | 'sama' | 'bertambah';
export type DailyYesNo = 'ya' | 'tidak';
export type DailyMedicineProblem = 'tidak' | 'ya';
export type DailyComplaintSeverity = 'hijau' | 'kuning' | 'merah';
export type DailyComplaintSource = 'monitoring' | 'chat';

export interface DailyComplaintRecord {
  id: string;
  palliativePatientId: string;
  patientName?: string;
  kondisiHariIni: DailyCondition;
  alasanKondisi?: string;
  keluhanBaru: DailyComplaintYesNo;
  deskripsiKeluhanBaru?: string;
  kondisiNyeri: DailyPainCondition;
  kondisiSesak: DailyDyspneaCondition;
  makanMinum: DailyYesNo;
  alasanMakanMinum?: string;
  tidur: DailyYesNo;
  alasanTidur?: string;
  masalahObat: DailyMedicineProblem;
  deskripsiMasalahObat?: string;
  severityLevel: DailyComplaintSeverity;
  sumberPengisian: DailyComplaintSource;
  submittedAt: string;
  createdAt: string;
}

export interface DailyComplaintFormInput {
  palliativePatientId: string;
  kondisiHariIni: DailyCondition;
  alasanKondisi?: string;
  keluhanBaru: DailyComplaintYesNo;
  deskripsiKeluhanBaru?: string;
  kondisiNyeri: DailyPainCondition;
  kondisiSesak: DailyDyspneaCondition;
  makanMinum: DailyYesNo;
  alasanMakanMinum?: string;
  tidur: DailyYesNo;
  alasanTidur?: string;
  masalahObat: DailyMedicineProblem;
  deskripsiMasalahObat?: string;
  sumberPengisian?: DailyComplaintSource;
}

// ── Daily Complaint AI Classification (Analisis Keluhan Harian via Chat AI) ──
export type DailyComplaintCategory =
  | 'nyeri'
  | 'sesak_napas'
  | 'mual'
  | 'muntah'
  | 'nafsu_makan_menurun'
  | 'kelelahan'
  | 'gangguan_tidur'
  | 'konstipasi'
  | 'diare'
  | 'batuk'
  | 'kecemasan'
  | 'depresi'
  | 'masalah_spiritual'
  | 'masalah_sosial'
  | 'keluhan_lainnya';
/** Keparahan keluhan versi AI chat (ringan/sedang/berat) — berbeda dari
 *  `DailyComplaintSeverity` (hijau/kuning/merah) milik form monitoring. */
export type DailyComplaintAISeverity = 'ringan' | 'sedang' | 'berat';
export type DailyComplaintImpact =
  | 'tidak_mengganggu'
  | 'sedikit_mengganggu'
  | 'mengganggu_aktivitas'
  | 'sangat_mengganggu';
export type DailyComplaintFollowUpStatus =
  | 'belum_ditindaklanjuti'
  | 'sedang_diproses'
  | 'selesai';
export type DailyAlertLevel = 'hijau' | 'kuning' | 'merah';
export type DailyComplaintInputSource = 'pasien' | 'keluarga' | 'dokter' | 'perawat';
export type DailyComplaintDataSource = 'chat' | 'manual' | 'ai_classification';

export interface DailyComplaintEntry {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string;
  date: string;
  time: string;
  category: DailyComplaintCategory;
  severity: DailyComplaintAISeverity;
  severityScore: number;
  description: string;
  impact: DailyComplaintImpact;
  inputSource: DailyComplaintInputSource;
  dataSource: DailyComplaintDataSource;
  followUpStatus: DailyComplaintFollowUpStatus;
  clinicalNote?: string;
  validatedBy?: string;
  chatMessageId?: string;
  alertLevel: DailyAlertLevel;
  createdAt: string;
  updatedAt: string;
}

export type DailyComplaintTrend = { date: string } & Partial<
  Record<DailyComplaintCategory, number>
>;

export interface DailyComplaintAlert {
  id: string;
  complaintId: string;
  patientId: string;
  patientName: string;
  alertLevel: DailyAlertLevel;
  title: string;
  description: string;
  triggerReason: string;
  createdAt: string;
  isRead: boolean;
  isResolved: boolean;
}

export interface DailyComplaintAIResult {
  category: DailyComplaintCategory;
  severityScore: number;
  severity: DailyComplaintAISeverity;
  impact: DailyComplaintImpact;
  extractedComplaints: string[];
  additionalNotes: string;
  alertLevel: DailyAlertLevel;
  suggestedFollowUp: string;
}

// ── Social Needs Screening (Skrining Kebutuhan Sosial) ──────────────────────
export type SocialNeedsCategory =
  | 'dukungan_keluarga'
  | 'caregiver'
  | 'tempat_tinggal'
  | 'akses_layanan'
  | 'ekonomi'
  | 'transportasi'
  | 'interaksi_sosial'
  | 'kebutuhan_informasi'
  | 'pertanyaan_terbuka';
export type SocialNeedsRiskLevel = 'rendah' | 'sedang' | 'tinggi' | 'sangat_tinggi';
export type SocialNeedsQuestionType = 'single_choice' | 'multiple_choice' | 'text_area';

export interface SocialNeedsQuestionOption {
  label: string;
  value: string;
  score: number;
  tooltip?: string;
}

export interface SocialNeedsQuestion {
  id: string;
  category: SocialNeedsCategory;
  categoryLabel: string;
  questionNumber: number;
  questionText: string;
  type: SocialNeedsQuestionType;
  required?: boolean;
  hasTooltip?: boolean;
  options?: SocialNeedsQuestionOption[];
}

export interface SocialNeedsCategoryScore {
  category: SocialNeedsCategory;
  categoryLabel: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: SocialNeedsRiskLevel;
}

export interface SocialNeedsScreeningResult {
  totalScore: number;
  maxScore: number;
  overallPercentage: number;
  overallRiskLevel: SocialNeedsRiskLevel;
  categoryScores: SocialNeedsCategoryScore[];
  completedAt: string;
}

export interface SocialNeedsAIRecommendation {
  priority: number;
  action: string;
  reason: string;
  category: string;
}

export interface SocialNeedsEarlyWarning {
  type: string;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
}

export interface SocialNeedsAIResult {
  familySupportScore: SocialNeedsRiskLevel;
  socialRiskScore: SocialNeedsRiskLevel;
  caregiverBurnoutScore: SocialNeedsRiskLevel;
  accessToCareScore: SocialNeedsRiskLevel;
  financialRiskScore: SocialNeedsRiskLevel;
  socialIsolationScore: SocialNeedsRiskLevel;
  recommendations: SocialNeedsAIRecommendation[];
  analysisSummary: string;
  earlyWarnings: SocialNeedsEarlyWarning[];
  generatedAt: string;
}

export interface PalliativeFormResponse {
  formId: string;
  formType: PalliativeFormType;
  screeningType?: PalliativeToolType;
  ttvAnswers?: TTVFormAnswers;
  keluhanAnswers?: KeluhanFormAnswers;
  screeningAnswers?: Record<string, number | string | string[]>;
  screeningResult?: {
    score: number;
    scoreLabel: string;
    interpretation: string;
    ewsLevel: PalliativeEwsLevel;
  };
  medicationMonitoringAnswers?: MedicationMonitoringFormAnswers;
  dailyComplaint?: DailyComplaintRecord;
  submittedAt: string;
}

// ── Clinical Alert severity & status (new EWS module) ──────────────────────
export type ClinicalAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ClinicalAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type ClinicalAlertSource =
  | 'vital_signs'
  | 'screenings'
  | 'medications'
  | 'nutrition'
  | 'daily_complaints'
  | 'social_assessments'
  | 'laboratory_results'
  | 'pemeriksaan_penunjang'
  | 'ai'
  | 'manual';

export interface PalliativeClinicalAlert {
  id: string;
  patientId: string;
  /** Patient UUID — used for Supabase persistence (FK to patients.id). */
  palliativePatientId?: string;
  alertType: 'ttv_abnormal' | 'gejala_berat' | 'distres_tinggi' | 'pps_penurunan' | 'perburukan' | 'obat_tidak_diminum' | 'efek_samping_berat' | 'nyeri_meningkat' | 'sesak_napas' | 'kepatuhan_menurun' | 'form_tidak_diisi' | 'hipoksemia' | 'distres_pernapasan' | 'krisis_hipertensi' | 'hipotensi' | 'takikardia' | 'demam_tinggi' | 'nyeri_berat' | 'sesak_berat' | 'distres_psikologis' | 'penurunan_fungsi' | 'spict_positif' | 'obat_hampir_habis' | 'risiko_malnutrisi' | 'risiko_dehidrasi' | 'penurunan_bb' | 'konstipasi_berat' | 'retensi_urin' | 'risiko_burnout_caregiver' | 'risiko_dukungan_sosial' | 'high_risk_deterioration' | 'hba1c_tinggi' | 'gdp_tinggi' | 'gds_tinggi' | 'ldl_tinggi' | 'kreatinin_tinggi' | 'mikroalbumin_positif' | 'clinical_alert';
  severity: 'hijau' | 'kuning' | 'merah';
  title: string;
  description: string;
  values?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  // ── New EWS fields (stored in `values` JSONB in Supabase) ──────────────
  /** Rich severity level from the Rule Engine (LOW/MEDIUM/HIGH/CRITICAL). */
  severityLevel?: ClinicalAlertSeverity;
  /** Lifecycle status of the alert. */
  status?: ClinicalAlertStatus;
  /** Which module triggered this alert. */
  sourceModule?: ClinicalAlertSource;
  /** UUID of the originating record (e.g. vital_signs.id). */
  sourceRecordId?: string;
  /** Clinical category for grouping (e.g. "Pernapasan", "Kardiovaskular"). */
  kategori?: string;
  /** AI or rule-based recommendation text. */
  recommendation?: string;
  /** Doctor UUID who acknowledged the alert. */
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  /** Doctor UUID responsible for this patient. */
  doctorId?: string;
  /** Free-text notes added by the doctor. */
  notes?: string;
}

export interface PalliativeAuditEntry {
  id: string;
  patientId: string;
  action: 'chat_sent' | 'form_sent' | 'form_opened' | 'form_filled' | 'form_submitted' | 'result_read' | 'ai_generated' | 'alert_triggered' | 'clinical_action' | 'medication_not_taken' | 'side_effect_reported' | 'alert_followed_up' | 'ai_analysis_generated' | 'program_completed' | 'resume_generated' | 'resume_viewed' | 'resume_downloaded' | 'resume_printed' | 'resume_signed' | 'resume_sent' | 'referral_generated' | 'referral_viewed' | 'referral_downloaded' | 'referral_sent' | 'referral_signed';
  performedBy: string;
  performedByRole: 'doctor' | 'patient' | 'family' | 'system';
  details?: string;
  ipAddress?: string;
  device?: string;
  createdAt: string;
}

// ── TelePalliative Care Integration Types ──────────────────────────────────

// ── Nutrition & Calorie Calculator Types ──────────────────────────────────

export type NutritionActivityLevel = 'bed_rest' | 'ringan' | 'sedang' | 'berat';
export type NutritionWeightStatus = 'underweight' | 'normal' | 'overweight' | 'obesitas';
export type NutritionMetabolicStress = 'ringan' | 'sedang' | 'berat' | 'tidak_ada';
export type NutritionSpecialCondition = 'tidak_ada' | 'hamil' | 'laktasi';

export interface NutritionCalculationResult {
  bmi: number;
  bmiCategory: NutritionWeightStatus;
  idealBodyWeight: number;
  basalCalories: number;
  ageCorrectionKcal: number;
  ageCorrectionPercent: number;
  activityCorrectionKcal: number;
  activityCorrectionPercent: number;
  weightCorrectionKcal: number;
  weightCorrectionPercent: number;
  stressCorrectionKcal: number;
  stressCorrectionPercent: number;
  specialConditionKcal: number;
  totalCalorieNeeds: number;
  carbohydrateKcal: number;
  proteinKcal: number;
  fatKcal: number;
  mineralKcal: number;
  carbohydrateGrams: number;
  proteinGrams: number;
  fatGrams: number;
}

export interface NutritionRecordInfo {
  id: string;
  palliativePatientId: string;
  age: number;
  gender: 'L' | 'P';
  weight: number;
  height: number;
  activityLevel: NutritionActivityLevel;
  metabolicStress: NutritionMetabolicStress;
  specialCondition: NutritionSpecialCondition;
  calculation: NutritionCalculationResult;
  actualIntakeKcal?: number;
  notes?: string;
  recordedBy?: string;
  recordedAt: string;
  createdAt: string;
}

export interface NutritionAIRecommendation {
  targetCalories: number;
  targetProteinGrams: number;
  mealPattern: string;
  mealFrequency: string;
  supplementRecommendation: string;
  malnutritionRisk: 'rendah' | 'sedang' | 'tinggi';
  recommendations: string[];
  generatedAt: string;
}

// ── TelePalliative Care Integration Types (continued) ──────────────────────

export type PalliativeMonitoringStatus =
  | 'monitoring_aktif'
  | 'stabil'
  | 'membutuhkan_home_visit'
  | 'membutuhkan_telekonsultasi'
  | 'membutuhkan_rujukan'
  | 'terminal'
  | 'meninggal_dunia'
  | 'program_selesai';

export type PalliativeMonitoringFormType =
  | 'ttv'
  | 'pps'
  | 'spict'
  | 'esas'
  | 'eortc'
  | 'penilaian_nyeri'
  | 'penilaian_sesak'
  | 'penilaian_nutrisi'
  | 'acp';

export interface PalliativeMarkingData {
  primaryDiagnosis: string;
  secondaryDiagnosis?: string;
  initialPPS?: number;
  diseaseCategory?: string;
  reasonForPalliative?: string;
  doctorNotes?: string;
}

export interface PalliativeCommunicationPatient {
  patientId: string;
  palliativePatientId: string;
  patientName: string;
  rmNumber?: string;
  primaryDiagnosis?: string;
  lastPPS?: number;
  monitoringStatus: PalliativeMonitoringStatus;
  lastChatAt?: string;
  unreadCount: number;
  riskLevel: PalliativeRiskLevel;
}

export interface PalliativeMonitoringNotification {
  id: string;
  patientId: string;
  patientName?: string;
  type: 'new_message' | 'screening_completed' | 'pps_decline' | 'pain_increase' | 'dyspnea_worsen' | 'ttv_abnormal' | 'monitoring_overdue' | 'status_change';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  referenceId?: string;
  createdAt: string;
}

export interface PalliativeClinicalSummary {
  primaryDiagnosis?: string;
  latestPPS?: number;
  latestScreeningResult?: {
    toolType: PalliativeToolType;
    scoreLabel: string;
    ewsLevel: PalliativeEwsLevel;
    performedAt: string;
  };
  activeMedications: number;
  latestACP?: {
    status: string;
    createdAt: string;
  };
  latestTTV?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSat?: number;
    recordedAt: string;
  };
}

// ── Remote Vital Sign Monitoring (RVSM) Types ─────────────────────────────

export type WearableDeviceType = 
  | 'apple_watch' | 'samsung_galaxy_watch' | 'garmin_watch' 
  | 'huawei_watch' | 'xiaomi_smart_band' | 'fitbit' 
  | 'wear_os' | 'bluetooth_health';

export type WearableIntegrationMethod = 
  | 'apple_healthkit' | 'google_health_connect' | 'samsung_health' 
  | 'fitbit_api' | 'bluetooth_health_device' | 'rest_api';

export type WearableDeviceStatus = 
  | 'connected' | 'sync_pending' | 'offline' | 'low_battery' | 'inactive';

export type RVSMAlertSeverity = 'normal' | 'attention' | 'critical';

export type RVSMTimeRange = '24h' | '7d' | '30d' | '90d';

export interface WearableDevice {
  id: string;
  patientId: string;
  deviceType: WearableDeviceType;
  deviceName: string;
  integrationMethod: WearableIntegrationMethod;
  status: WearableDeviceStatus;
  batteryLevel?: number;
  lastSyncAt?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  isConnected: boolean;
  registeredAt: string;
  deactivatedAt?: string;
}

export interface WearableVitalData {
  id: string;
  deviceId: string;
  patientId: string;
  timestamp: string;
  // Cardiovascular
  heartRate?: number;
  heartRateVariability?: number;
  heartRhythm?: 'normal_sinus' | 'sinus_tachycardia' | 'sinus_bradycardia' | 'atrial_fibrillation' | 'other';
  arrhythmiaDetected?: boolean;
  // Respiratory
  respiratoryRate?: number;
  respiratoryPattern?: 'normal' | 'tachypneic' | 'bradypneic' | 'irregular';
  apneaEpisode?: boolean;
  // Oxygenation
  oxygenSat?: number;
  // Body weight (kg)
  weight?: number;
  // Activity
  steps?: number;
  distance?: number; // meters
  walkDuration?: number; // minutes
  dailyActivityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
  // Mobility
  sittingDuration?: number; // minutes
  standingDuration?: number; // minutes
  lyingDuration?: number; // minutes
  postureChangeCount?: number;
  // Sleep
  sleepDuration?: number; // minutes
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  sleepDisturbances?: number;
  sleepPattern?: 'normal' | 'insomnia' | 'hypersomnia' | 'fragmented';
  // Temperature
  skinTemperature?: number;
  estimatedCoreTemp?: number;
  // Pain/Symptoms (if supported)
  painScore?: number;
  stressLevel?: number; // 0-100
  fatigueLevel?: number; // 0-100
  // Blood pressure
  systolicBP?: number;
  diastolicBP?: number;
}

export interface RVSMAlert {
  id: string;
  patientId: string;
  patientName?: string;
  deviceId?: string;
  category: 'cardiovascular' | 'oxygenation' | 'respiratory' | 'activity' | 'sleep' | 'mobility' | 'temperature' | 'pain';
  severity: RVSMAlertSeverity;
  title: string;
  description: string;
  values?: Record<string, string | number>;
  threshold?: { parameter: string; operator: string; value: number };
  actualValue?: number;
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface RVSMPalliativeScoreEstimate {
  patientId: string;
  estimatedAt: string;
  ppsEstimate?: {
    currentEstimate: number;
    previousEstimate?: number;
    change?: number;
    confidence: number; // 0-1
    factors: string[];
  };
  esasEstimate?: {
    fatigueLevel: number;
    sleepDisturbance: number;
    activityDecline: number;
    estimatedTotalScore: number;
  };
  spictEstimate?: {
    deteriorationRisk: 'low' | 'moderate' | 'high';
    indicators: string[];
  };
}

export interface RVSMDailyReport {
  id: string;
  patientId: string;
  patientName?: string;
  reportDate: string;
  activityChangePercent?: number;
  avgSpO2?: number;
  avgHeartRate?: number;
  avgRespiratoryRate?: number;
  sleepDurationHours?: number;
  lyingDurationHours?: number;
  stepsCount?: number;
  painScoreAvg?: number;
  stressLevelAvg?: number;
  fatigueLevelAvg?: number;
  aiSummary?: string;
  riskPrediction?: {
    hospitalizationRisk: 'low' | 'moderate' | 'high';
    symptomWorseningRisk: 'low' | 'moderate' | 'high';
    ppsDeclineRisk: 'low' | 'moderate' | 'high';
    homeVisitNeedRisk: 'low' | 'moderate' | 'high';
  };
  createdAt: string;
}

export interface RVSMFamilyAccess {
  id: string;
  patientId: string;
  familyMemberId: string;
  familyMemberName: string;
  relationship: string;
  canViewActivity: boolean;
  canViewDeviceStatus: boolean;
  canViewHealthGraphs: boolean;
  canReceiveAlerts: boolean;
  canViewSchedule: boolean;
  grantedAt: string;
}

export interface RVSMAuditEntry {
  id: string;
  patientId: string;
  action: 'device_connected' | 'device_disconnected' | 'data_received' | 'data_analyzed' | 'alert_generated' | 'alert_acknowledged' | 'alert_viewed' | 'followup_action' | 'report_generated' | 'family_access_granted' | 'family_access_revoked';
  performedBy: string;
  performedByRole: 'doctor' | 'patient' | 'family' | 'system';
  details?: string;
  ipAddress?: string;
  deviceId?: string;
  createdAt: string;
}

// ── Medication Monitoring Form Types ──────────────────────────────────────

export type MedicationConsumptionStatus = 'sudah_diminum' | 'belum_diminum' | 'tidak_diminum';

export type NotTakenReason =
  | 'lupa' | 'belum_waktunya' | 'sedang_tidur' | 'obat_tidak_tersedia' | 'alasan_lain';

export type NotConsumedReason =
  | 'efek_samping' | 'merasa_sudah_membaik' | 'tidak_ada_obat'
  | 'tidak_mampu_membeli' | 'tidak_ingin_minum' | 'sulit_menelan'
  | 'mual_muntah' | 'instruksi_keluarga' | 'alasan_lainnya';

export type SideEffectType =
  | 'mual' | 'muntah' | 'pusing' | 'mengantuk_berlebihan'
  | 'sulit_tidur' | 'konstipasi' | 'diare' | 'nyeri_bertambah'
  | 'sesak_napas' | 'nafsu_makan_menurun' | 'reaksi_alergi' | 'lainnya';

export type MedicationFormSchedule = 'sekali' | 'harian' | 'mingguan' | 'sesuai_jadwal_obat';

export interface MedicationMonitoringFormItem {
  medicationId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route?: string;
  indication?: string;
  consumptionStatus: MedicationConsumptionStatus | null;
  // If "sudah_diminum"
  consumptionDate?: string;
  consumptionTime?: string;
  hasComplaints?: boolean;
  sideEffects?: SideEffectType[];
  otherComplaint?: string;
  complaintSeverity?: number; // 0-10
  complaintNotes?: string;
  // If "belum_diminum"
  notTakenReason?: NotTakenReason;
  notTakenOtherReason?: string;
  // If "tidak_diminum"
  notConsumedReason?: NotConsumedReason;
  notConsumedOtherReason?: string;
  notConsumedExplanation?: string; // required
}

export interface MedicationMonitoringFormAnswers {
  medications: MedicationMonitoringFormItem[];
  overallNotes?: string;
}

export interface MedicationMonitoringFormInfo {
  id: string;
  palliativePatientId: string;
  doctorId: string;
  patientId: string;
  selectedMedicationIds: string[];
  schedule: MedicationFormSchedule;
  deadline?: string;
  status: 'sent' | 'opened' | 'in_progress' | 'submitted' | 'expired';
  responses: MedicationMonitoringFormAnswers[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicationMonitoringAlert {
  id: string;
  patientId: string;
  patientName?: string;
  alertType: 'obat_tidak_diminum' | 'efek_samping_berat' | 'nyeri_meningkat' | 'sesak_napas' | 'form_tidak_diisi' | 'kepatuhan_menurun';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  medicationName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface MedicationMonitoringAuditEntry {
  id: string;
  patientId: string;
  action: 'form_sent' | 'form_opened' | 'form_filled' | 'form_submitted' | 'side_effect_reported' | 'medication_not_taken' | 'alert_generated' | 'alert_followed_up' | 'ai_analysis_generated';
  performedBy: string;
  performedByRole: 'doctor' | 'patient' | 'family' | 'system';
  details?: string;
  createdAt: string;
}

export interface MedicationComplianceSummary {
  patientId: string;
  period: 'daily' | 'weekly' | 'monthly';
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  notConsumedDoses: number;
  complianceRate: number; // percentage 0-100
  sideEffectCount: number;
  topSideEffects: { type: SideEffectType; count: number }[];
  topNotConsumedReasons: { reason: NotConsumedReason; count: number }[];
}

// ── Palliative Resume Medis & Surat Rujukan Types ────────────────────────

export type ReferralTargetDepartment =
  | 'penyakit_dalam'
  | 'onkologi'
  | 'neurologi'
  | 'jantung'
  | 'pulmonologi'
  | 'geriatri'
  | 'kedokteran_paliatif'
  | 'rehabilitasi_medik'
  | 'rumah_sakit_rujukan_lanjutan';

export type ReferralStatus = 'belum_dirujuk' | 'menunggu' | 'sudah_dirujuk' | 'selesai';

export interface PalliativeResumeDataPasien {
  nama: string | null;
  tanggalLahir: string | null;
  umur?: string | null;
  jenisKelamin: string | null;
  nik: string | null;
  noRM: string | null;
  noBPJS: string | null;
  alamat: string | null;
  noTelepon?: string | null;
  diagnosaUtama: string | null;
  diagnosaPenyerta: string | null;
  stadiumPenyakit: string | null;
  dpjp: string | null;
  dpjpSpesialisasi: string | null;
  dpjpSIP: string | null;
  statusPerawatan: string;
  statusPasien: string;
  tingkatRisiko: string;
  tanggalRegistrasi?: string | null;
  kontakKeluarga: {
    nama: string | null;
    hubungan: string | null;
    telepon: string | null;
  };
}

export interface PalliativeResumeTTVRecord {
  tanggal: string;
  sistolik: number | null;
  diastolik: number | null;
  nadi: number | null;
  rr: number | null;
  suhu: number | null;
  spo2: number | null;
  berat: number | null;
  tinggi: number | null;
  bmi: number | null;
  catatan: string | null;
  alasanKritis?: string[];
}

export interface PalliativeResumeKeluhan {
  keluhanAwal: Record<string, unknown> | null;
  keluhanTerberat: Record<string, unknown> | null;
  keluhanTerakhir: Record<string, unknown> | null;
  analisis: string;
}

export interface PalliativeResumeAIAnalysis {
  ringkasanPerjalananKlinis: string;
  identifikasiKondisiKritis: string;
  analisisTrenPasien: string;
  ringkasanSkrining: {
    domainFisik: string;
    domainPsikologis: string;
    domainSosial: string;
    domainSpiritual: string;
    kebutuhanEdukasi: string;
    bebanCaregiver: string;
  };
  ringkasanNutrisi: string;
  ringkasanSosial: string;
  ringkasanACP: string;
  kesimpulanTelepaliatif: {
    diagnosisUtama: string;
    statusFungsionalAwal: string;
    statusFungsionalTerakhir: string;
    masalahPaliatifUtama: string;
    keluhanDominan: string;
    kondisiPalingKritis: string;
    responsTerhadapIntervensi: string;
    kondisiKlinisSaatIni: string;
    tujuanPerawatanSaatIni: string;
    rencanaTindakLanjut: string;
    lokasiPerawatanSaatIni: string;
    jadwalMonitoringBerikutnya: string;
  };
  rekomendasi: string[];
}

export interface PalliativeResumeMedis {
  id: string;
  palliativePatientId: string;
  patientName?: string;
  rmNumber?: string;
  documentNumber: string;
  generatedAt: string;
  generatedBy: string;
  generatedByRole: 'doctor' | 'admin';
  doctorSip?: string;
  doctorName?: string;
  // Comprehensive structured data
  dataPasien?: PalliativeResumeDataPasien;
  ttvSerial?: {
    ttvAwal: PalliativeResumeTTVRecord | null;
    ttvKritis: PalliativeResumeTTVRecord | null;
    ttvTerakhir: PalliativeResumeTTVRecord | null;
  };
  keluhanHarian?: PalliativeResumeKeluhan;
  skriningPaliatif?: Record<string, unknown>;
  esasScores?: {
    skorAwal: Record<string, unknown> | null;
    skorTertinggi: Record<string, unknown> | null;
    skorTerakhir: Record<string, unknown> | null;
  };
  obat?: Record<string, unknown>;
  nutrisi?: Record<string, unknown>;
  sosial?: Record<string, unknown>;
  acp?: Record<string, unknown>;
  aiAnalysis?: PalliativeResumeAIAnalysis;
  // Legacy fields (for backward compatibility)
  ringkasanKondisi?: string;
  ringkasanPemeriksaan?: string;
  ringkasanTerapi?: string;
  ringkasanACP?: string;
  kesimpulanKlinis?: string;
  rekomendasiAI?: string[];
  // Full content as markdown
  fullContent: string;
  // Version tracking
  version: number;
  previousVersionId?: string;
  // Status
  isSigned: boolean;
  signedAt?: string;
  qrCode?: string;
  // Delivery tracking
  sentToChatAt?: string;
  sentToEmailAt?: string;
  sentToWhatsAppAt?: string;
  downloadCount: number;
  printCount: number;
  lastDownloadAt?: string;
  lastPrintAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PalliativeReferralLetter {
  id: string;
  palliativePatientId: string;
  patientName?: string;
  rmNumber?: string;
  documentNumber: string;
  generatedAt: string;
  generatedBy: string;
  generatedByRole: 'doctor' | 'admin';
  doctorSip?: string;
  doctorName?: string;
  // Referral content
  nik?: string;
  bpjsNumber?: string;
  primaryDiagnosis: string;
  secondaryDiagnosis?: string;
  referralReason: string;
  clinicalSummary: string;
  targetDepartment: ReferralTargetDepartment;
  consultationRequest: string;
  // AI-generated content
  fullContent: string;
  // Status
  referralStatus: ReferralStatus;
  referredAt?: string;
  referredTo?: string;
  completedAt?: string;
  // Version tracking
  version: number;
  previousVersionId?: string;
  // Signing
  isSigned: boolean;
  signedAt?: string;
  qrCode?: string;
  // Delivery tracking
  sentToChatAt?: string;
  sentToEmailAt?: string;
  sentToWhatsAppAt?: string;
  downloadCount: number;
  printCount: number;
  lastDownloadAt?: string;
  lastPrintAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PalliativeDocumentAuditEntry {
  id: string;
  documentType: 'resume_medis' | 'surat_rujukan';
  documentId: string;
  patientId: string;
  action: 'generated' | 'viewed' | 'revised' | 'signed' | 'downloaded' | 'printed' | 'sent_to_chat' | 'sent_to_email' | 'sent_to_whatsapp';
  performedBy: string;
  performedByRole: 'doctor' | 'admin';
  details?: string;
  createdAt: string;
}

// ── Social Support Management Types ───────────────────────────────────────

export type SocialScreeningPriority = 'rendah' | 'sedang' | 'tinggi';
export type SocialScreeningStatus = 'lengkap' | 'sebagian' | 'belum_dilakukan';
export type HousingCondition = 'layak' | 'kurang_layak' | 'tidak_layak';
export type CaregiverAvailability = 'tersedia' | 'terbatas' | 'tidak_tersedia';
export type FamilySupportLevel = 'kuat' | 'cukup' | 'lemah' | 'tidak_ada';
export type TransportDifficulty = 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
export type EconomicConstraint = 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
export type HealthcareAccess = 'mudah' | 'cukup' | 'sulit' | 'sangat_sulit';
export type MedicalEquipmentNeed = 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
export type SocialAssistanceNeed = 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
export type SocialIsolationRisk = 'rendah' | 'sedang' | 'tinggi';

export interface SocialAssessmentRecord {
  id: string;
  palliativePatientId: string;
  // Screening items
  housingCondition: HousingCondition;
  housingNotes?: string;
  caregiverAvailability: CaregiverAvailability;
  caregiverNotes?: string;
  familySupportLevel: FamilySupportLevel;
  familySupportNotes?: string;
  transportDifficulty: TransportDifficulty;
  transportNotes?: string;
  economicConstraint: EconomicConstraint;
  economicNotes?: string;
  healthcareAccess: HealthcareAccess;
  healthcareAccessNotes?: string;
  medicalEquipmentNeed: MedicalEquipmentNeed;
  medicalEquipmentNotes?: string;
  socialAssistanceNeed: SocialAssistanceNeed;
  socialAssistanceNotes?: string;
  socialIsolationRisk: SocialIsolationRisk;
  socialIsolationNotes?: string;
  // Results
  overallStatus: SocialScreeningStatus;
  priorityLevel: SocialScreeningPriority;
  recommendations: string[];
  assessedBy: string;
  assessedByRole: 'doctor' | 'nurse' | 'social_worker' | 'palliative_team';
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CaregiverRole = 'utama' | 'pendamping';
export type CaregiverRelation = 'suami' | 'istri' | 'anak' | 'orang_tua' | 'saudara' | 'teman' | 'pembantu' | 'perawat' | 'lainnya';

export interface CaregiverInfo {
  id: string;
  palliativePatientId: string;
  name: string;
  role: CaregiverRole;
  relation: CaregiverRelation;
  relationOther?: string;
  phone: string;
  email?: string;
  address?: string;
  schedule?: string;
  tasks?: string[];
  isActive: boolean;
  zaritScore?: number;
  zaritLevel?: 'beban_ringan' | 'beban_sedang' | 'beban_berat';
  familyApgarScore?: number;
  familyApgarLevel?: 'dysfunctional' | 'severe_dysfunction' | 'moderate_dysfunction' | 'good' | 'high_functional';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MeetingStatus = 'dijadwalkan' | 'berlangsung' | 'selesai' | 'dibatalkan';

export interface FamilyMeetingRecord {
  id: string;
  palliativePatientId: string;
  title: string;
  scheduledAt: string;
  duration?: number; // minutes
  status: MeetingStatus;
  participants: FamilyMeetingParticipant[];
  agenda?: string;
  discussionNotes?: string;
  resume?: string;
  followUpActions?: string[];
  meetingUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMeetingParticipant {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  attended: boolean;
}

export type EduMaterialCategory = 'perawatan_rumah' | 'panduan_caregiver' | 'video_edukasi' | 'dukungan_psikososial' | 'gawat_darurat' | 'end_of_life' | 'faq';

export interface EduMaterialAccessLog {
  materialId: string;
  accessedBy: string;
  accessedAt: string;
}

export interface EduMaterial {
  id: string;
  title: string;
  category: EduMaterialCategory;
  description?: string;
  type: 'artikel' | 'video' | 'pdf' | 'infografis' | 'faq';
  url?: string;
  content?: string;
  accessCount: number;
  accessLogs: EduMaterialAccessLog[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyCoordinationNote {
  id: string;
  palliativePatientId: string;
  authorName: string;
  authorRelation: string;
  content: string;
  type: 'perkembangan' | 'tugas' | 'pengingat_obat' | 'pengingat_kontrol' | 'tanggung_jawab' | 'lainnya';
  isCompleted: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  palliativePatientId: string;
  name: string;
  role: 'dokter' | 'perawat' | 'caregiver_utama' | 'keluarga' | 'ambulans' | 'rumah_sakit' | 'gawat_darurat' | 'lainnya';
  phone: string;
  alternatePhone?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InsuranceStatus = 'bpjs' | 'asuransi_swasta' | 'tidak_memiliki' | 'campuran';
export type SocialAidStatus = 'menerima' | 'pernah_menerima' | 'belum_menerima' | 'tidak_berhak';

export interface FinancialSupportRecord {
  id: string;
  palliativePatientId: string;
  insuranceStatus: InsuranceStatus;
  insuranceDetails?: string;
  bpjsNumber?: string;
  socialAidStatus: SocialAidStatus;
  socialAidDetails?: string;
  treatmentCostNeed: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  medicalEquipmentCostNeed: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  transportCostNeed: 'tidak_ada' | 'ringan' | 'sedang' | 'berat';
  recommendedPrograms: string[];
  notes?: string;
  assessedBy: string;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type TransportNeedType = 'ambulans' | 'ambulans_darurat' | 'kendaraan_pribadi' | 'transportasi_medis' | 'lainnya';
export type TransportStatus = 'belum_dipesan' | 'dipesan' | 'dalam_perjalanan' | 'selesai' | 'dibatalkan';

export interface TransportRecord {
  id: string;
  palliativePatientId: string;
  type: TransportNeedType;
  status: TransportStatus;
  scheduledAt?: string;
  completedAt?: string;
  origin: string;
  destination: string;
  notes?: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMonitoringAlert {
  id: string;
  patientId: string;
  patientName?: string;
  type: 'isolasi_sosial' | 'beban_caregiver' | 'kendala_ekonomi' | 'akses_kesehatan' | 'transportasi' | 'dukungan_keluarga';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

// ── AI Social Needs Analysis Types ─────────────────────────────────────────

export type SocialRiskLevel = 'rendah' | 'sedang' | 'tinggi';

export interface AISocialRisk {
  riskType: 'isolasi_sosial' | 'caregiver_burnout' | 'ketidakpatuhan_terapi' | 'putus_pengobatan' | 'masalah_finansial' | 'akses_layanan' | 'konflik_keluarga' | 'kebutuhan_spiritual' | 'rawat_inap_berulang' | 'penurunan_kualitas_hidup';
  level: SocialRiskLevel;
  reason: string;
}

export interface AIFamilySupportAnalysis {
  familySupportScore: number; // 0-100
  caregiverBurnoutRiskScore: number; // 0-100
  activeFamilyMembers: number;
  familyInvolvementLevel: 'tinggi' | 'sedang' | 'rendah';
  needFamilyMeeting: boolean;
  needFamilyEducation: boolean;
  recommendations: string[];
}

export interface AICaregiverAnalysis {
  status: 'normal' | 'ringan' | 'sedang' | 'berat';
  zaritScore?: number;
  physicalBurden: 'rendah' | 'sedang' | 'tinggi';
  emotionalBurden: 'rendah' | 'sedang' | 'tinggi';
  companionDuration: string;
  stressLevel: 'rendah' | 'sedang' | 'tinggi';
  recommendations: string[];
}

export interface AIFinancialAnalysis {
  priorityNeeds: ('bantuan_finansial' | 'alat_kesehatan' | 'nutrisi' | 'transportasi' | 'home_care' | 'pendampingan_sosial')[];
  bpjsStatus?: string;
  insuranceStatus?: string;
  economicConstraintLevel: SocialRiskLevel;
  socialAssistanceRecommendations: string[];
}

export interface AITransportAnalysis {
  accessRiskLevel: SocialRiskLevel;
  controlDelayRisk: SocialRiskLevel;
  accessLossRisk: SocialRiskLevel;
  teleconsultationRecommended: boolean;
  homeVisitRecommended: boolean;
  ambulanceRecommended: boolean;
  recommendations: string[];
}

export interface AIActionPlanItem {
  action: string;
  priority: 'tinggi' | 'sedang' | 'rendah';
  deadline: string;
  category: 'family_meeting' | 'caregiver_support' | 'home_visit' | 'family_education' | 'monitoring' | 'financial_support' | 'transport_support' | 'psychosocial' | 'other';
}

export interface AIEarlyWarning {
  id: string;
  patientId: string;
  type: 'penurunan_dukungan_keluarga' | 'caregiver_burden_meningkat' | 'risiko_putus_pengobatan' | 'distress_tinggi' | 'isolasi_sosial' | 'masalah_finansial_berat' | 'tidak_ada_caregiver_aktif' | 'monitoring_terlambat';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  isRead: boolean;
  detectedAt: string;
  createdAt: string;
}

export interface AISocialAnalysisResult {
  // Section 1: Ringkasan Kondisi Sosial
  socialConditionSummary: string;
  // Section 2: Identifikasi Risiko Sosial
  socialRisks: AISocialRisk[];
  // Section 3: Family Support Analysis
  familySupportAnalysis: AIFamilySupportAnalysis;
  // Section 4: Caregiver Analysis
  caregiverAnalysis: AICaregiverAnalysis;
  // Section 5: Financial Analysis
  financialAnalysis: AIFinancialAnalysis;
  // Section 6: Transport Analysis
  transportAnalysis: AITransportAnalysis;
  // Section 7: Action Plan
  actionPlan: AIActionPlanItem[];
  // Section 8: Early Warnings
  earlyWarnings: AIEarlyWarning[];
  // Metadata
  generatedAt: string;
  dataSourcesUsed: string[];
}

export interface AISocialAnalysisRecord {
  id: string;
  palliativePatientId: string;
  result: AISocialAnalysisResult;
  generatedBy: string;
  acceptedActions: string[];
  rejectedActions: string[];
  modifiedActions: AIActionPlanItem[];
  notes?: string;
  createdAt: string;
}

export interface AISocialPopulationStats {
  totalActivePatients: number;
  highSocialRiskCount: number;
  caregiverBurnoutCount: number;
  topSocialNeeds: { need: string; count: number }[];
  familySupportDistribution: { level: string; count: number }[];
  socialTrendData: { month: string; highRisk: number; mediumRisk: number; lowRisk: number }[];
  predictedNeeds30Days: { category: string; estimatedCount: number }[];
  predictedNeeds90Days: { category: string; estimatedCount: number }[];
  generatedAt: string;
}

// ── Patient Paliatif Module Types ──────────────────────────────────────────

export type PatientTransportRequestType = 'kontrol_faskes' | 'kunjungan_rumah' | 'transportasi_darurat' | 'pengambilan_obat' | 'lainnya';
export type PatientTransportRequestStatus = 'menunggu_konfirmasi' | 'disetujui' | 'dijadwalkan' | 'selesai' | 'ditolak';

export interface PatientTransportRequest {
  id: string;
  palliativePatientId: string;
  requestType: PatientTransportRequestType;
  requestDate: string;
  requestTime: string;
  pickupLocation: string;
  destination: string;
  notes?: string;
  status: PatientTransportRequestStatus;
  requestedBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatientConditionStatus = 'membaik' | 'stabil' | 'menurun' | 'keluhan_baru';

export interface PatientCareUpdate {
  id: string;
  palliativePatientId: string;
  conditionStatus: PatientConditionStatus;
  newComplaints: boolean;
  activityChange: boolean;
  appetiteChange: boolean;
  sleepQualityChange: boolean;
  additionalNotes?: string;
  submittedBy: string;
  viewedByDoctor: boolean;
  createdAt: string;
}

export interface PatientPaliatifChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'doctor' | 'perawat' | 'tim_paliatif' | 'system';
  content: string;
  type: 'text' | 'form_ttv' | 'form_keluhan' | 'form_esas' | 'form_pps' | 'form_distress' | 'form_screening' | 'image' | 'document' | 'system';
  status: 'sent' | 'delivered' | 'read';
  imageUrl?: string;
  documentUrl?: string;
  createdAt: string;
  readAt?: string;
}
