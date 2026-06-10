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
  toolAnswers: Record<string, number | string | string[]>;
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
  | 'notifications'
  | 'payments'
  | 'reports'
  | 'profile'
  | 'screening'
  | 'palliative-screening'
  | 'palliative-monitoring';

// ── Palliative Monitoring Types ──────────────────────────────────────────

export type PalliativeCareStatus = 'rawat_jalan' | 'home_care' | 'hospice' | 'rawat_inap';
export type PalliativePatientStatus = 'aktif' | 'meninggal' | 'lost_follow_up' | 'pindah_faskes';
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

export type PalliativeFormType = 'ttv' | 'keluhan' | 'screening';
export type PalliativeChatMsgType = 'text' | 'education' | 'instruction' | 'form_ttv' | 'form_keluhan' | 'form_screening' | 'form_response' | 'reminder' | 'image' | 'ai_summary' | 'clinical_alert';

export interface PalliativeChatMessage {
  id: string;
  roomId: string;
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
  submittedAt: string;
}

export interface PalliativeClinicalAlert {
  id: string;
  patientId: string;
  alertType: 'ttv_abnormal' | 'gejala_berat' | 'distres_tinggi' | 'pps_penurunan' | 'perburukan';
  severity: 'hijau' | 'kuning' | 'merah';
  title: string;
  description: string;
  values?: Record<string, string | number>;
  isRead: boolean;
  createdAt: string;
}

export interface PalliativeAuditEntry {
  id: string;
  patientId: string;
  action: 'chat_sent' | 'form_sent' | 'form_opened' | 'form_filled' | 'form_submitted' | 'result_read' | 'ai_generated' | 'alert_triggered' | 'clinical_action';
  performedBy: string;
  performedByRole: 'doctor' | 'patient' | 'family' | 'system';
  details?: string;
  ipAddress?: string;
  device?: string;
  createdAt: string;
}

// ── TelePalliative Care Integration Types ──────────────────────────────────

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
