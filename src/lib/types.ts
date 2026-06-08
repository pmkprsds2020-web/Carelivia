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

// ── Screening Types ─────────────────────────────────────────────────────────

export type ScreeningCategory = 
  | 'bayi' | 'balita' | 'anak_sekolah' | 'remaja' | 'dewasa' | 'lansia'
  | 'ibu_hamil' | 'nifas' | 'penyakit_kronis' | 'kesehatan_jiwa'
  | 'haji_umroh' | 'gaya_hidup' | 'ptm';

export type ScreeningStatus = 'sent' | 'opened' | 'in_progress' | 'draft' | 'completed' | 'reviewed';

export type RiskCategory = 'rendah' | 'sedang' | 'tinggi';

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: 'radio' | 'checkbox' | 'number' | 'text' | 'scale';
  options?: { label: string; value: string | number; score: number }[];
  required: boolean;
  section?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface ScreeningTemplate {
  id: string;
  name: string;
  category: ScreeningCategory;
  standard: string; // e.g. 'FINDRISC', 'PHQ-9', 'Framingham'
  description: string;
  estimatedMinutes: number;
  questions: ScreeningQuestion[];
  scoringAlgorithm: {
    type: 'sum' | 'weighted' | 'custom';
    ranges: { min: number; max: number; category: RiskCategory; label: string; recommendations: string[] }[];
  };
}

export interface ScreeningForm {
  id: string;
  templateId: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  status: ScreeningStatus;
  instructions?: string;
  deadline?: string;
  answers: Record<string, string | number | string[]>;
  score?: number;
  riskCategory?: RiskCategory;
  recommendations?: string[];
  doctorNotes?: string;
  followUp?: string;
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
  | 'screening';
