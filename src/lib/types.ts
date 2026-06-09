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
  | 'palliative-screening';
