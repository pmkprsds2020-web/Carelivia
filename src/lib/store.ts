import { create } from 'zustand';
import type { 
  User, Consultation, Message, Medicine, CartItem, 
  HomeCareService, HomeCareBooking, Notification, Article,
  ActivePanel, DashboardStats, MedicalRecord, Payment,
  MedicineCategory, Prescription, MedicalRecordStatus,
  ScreeningForm, ScreeningAuditLog, ScreeningModuleId,
  PalliativeScreeningForm, PalliativeToolType,
  PalliativePatientInfo, VitalSignRecordInfo, PalliativeMedicationInfo,
  AdvanceCarePlanInfo, PalliativeScreeningRecordInfo,
  PalliativeChatMessage, PalliativeClinicalAlert, PalliativeAuditEntry
} from './types';

interface TelemedicineStore {
  // Navigation
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Dashboard
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats | null) => void;
  
  // Doctors
  doctors: User[];
  setDoctors: (doctors: User[]) => void;
  onlineDoctors: string[];
  setOnlineDoctors: (ids: string[]) => void;
  
  // Consultations
  consultations: Consultation[];
  setConsultations: (consultations: Consultation[]) => void;
  updateConsultation: (consultationId: string, data: Partial<Consultation>) => void;
  activeConsultation: Consultation | null;
  setActiveConsultation: (consultation: Consultation | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  typingUsers: Map<string, string[]>;
  setTypingUsers: (map: Map<string, string[]>) => void;
  
  // Pharmacy
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (medicineId: string) => void;
  updateCartQuantity: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Home Care
  homeCareServices: HomeCareService[];
  setHomeCareServices: (services: HomeCareService[]) => void;
  homeCareBookings: HomeCareBooking[];
  setHomeCareBookings: (bookings: HomeCareBooking[]) => void;
  
  // Medical Records
  medicalRecords: MedicalRecord[];
  setMedicalRecords: (records: MedicalRecord[]) => void;
  addMedicalRecord: (record: MedicalRecord) => void;
  updateMedicalRecord: (recordId: string, data: Partial<MedicalRecord>) => void;
  
  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  
  // Payments
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  
  // Prescriptions
  prescriptions: Prescription[];
  setPrescriptions: (prescriptions: Prescription[]) => void;
  addPrescription: (prescription: Prescription) => void;
  updatePrescriptionStatus: (prescriptionId: string, status: string) => void;
  
  // Articles
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  
  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedChatDoctor: User | null;
  setSelectedChatDoctor: (doctor: User | null) => void;

  // Prescription Checkout
  pendingPrescriptionCheckout: Prescription | null;
  setPendingPrescriptionCheckout: (prescription: Prescription | null) => void;

  // Screening
  screeningForms: ScreeningForm[];
  setScreeningForms: (forms: ScreeningForm[]) => void;
  addScreeningForm: (form: ScreeningForm) => void;
  updateScreeningForm: (formId: string, data: Partial<ScreeningForm>) => void;
  screeningAuditLog: ScreeningAuditLog[];
  addAuditLog: (log: ScreeningAuditLog) => void;
  clinicalAlerts: Notification[];
  addClinicalAlert: (alert: Notification) => void;

  // Palliative Screening
  palliativeScreeningForms: PalliativeScreeningForm[];
  setPalliativeScreeningForms: (forms: PalliativeScreeningForm[]) => void;
  addPalliativeScreeningForm: (form: PalliativeScreeningForm) => void;
  updatePalliativeScreeningForm: (formId: string, data: Partial<PalliativeScreeningForm>) => void;
  activePalliativeFormId: string | null;
  setActivePalliativeFormId: (id: string | null) => void;

  // Palliative Monitoring
  palliativePatients: PalliativePatientInfo[];
  setPalliativePatients: (patients: PalliativePatientInfo[]) => void;
  addPalliativePatient: (patient: PalliativePatientInfo) => void;
  updatePalliativePatient: (patientId: string, data: Partial<PalliativePatientInfo>) => void;
  removePalliativePatient: (patientId: string) => void;
  selectedPalliativePatientId: string | null;
  setSelectedPalliativePatientId: (id: string | null) => void;
  vitalSignRecords: VitalSignRecordInfo[];
  setVitalSignRecords: (records: VitalSignRecordInfo[]) => void;
  addVitalSignRecord: (record: VitalSignRecordInfo) => void;
  palliativeMedications: PalliativeMedicationInfo[];
  setPalliativeMedications: (meds: PalliativeMedicationInfo[]) => void;
  addPalliativeMedication: (med: PalliativeMedicationInfo) => void;
  updatePalliativeMedication: (medId: string, data: Partial<PalliativeMedicationInfo>) => void;
  advanceCarePlans: AdvanceCarePlanInfo[];
  setAdvanceCarePlans: (plans: AdvanceCarePlanInfo[]) => void;
  addAdvanceCarePlan: (plan: AdvanceCarePlanInfo) => void;
  updateAdvanceCarePlan: (planId: string, data: Partial<AdvanceCarePlanInfo>) => void;
  palliativeScreeningRecords: PalliativeScreeningRecordInfo[];
  setPalliativeScreeningRecords: (records: PalliativeScreeningRecordInfo[]) => void;
  addPalliativeScreeningRecord: (record: PalliativeScreeningRecordInfo) => void;
  palliativeAiSummary: string;
  setPalliativeAiSummary: (summary: string) => void;

  // Palliative Chat
  palliativeChatMessages: PalliativeChatMessage[];
  setPalliativeChatMessages: (messages: PalliativeChatMessage[]) => void;
  addPalliativeChatMessage: (message: PalliativeChatMessage) => void;
  updatePalliativeChatMessage: (msgId: string, data: Partial<PalliativeChatMessage>) => void;
  palliativeClinicalAlerts: PalliativeClinicalAlert[];
  addPalliativeClinicalAlert: (alert: PalliativeClinicalAlert) => void;
  markPalliativeAlertRead: (alertId: string) => void;
  palliativeAuditLog: PalliativeAuditEntry[];
  addPalliativeAuditEntry: (entry: PalliativeAuditEntry) => void;
}

export const useStore = create<TelemedicineStore>((set) => ({
  // Debug: expose store to window
  _debugInit: (() => { if (typeof window !== 'undefined') { (window as unknown as Record<string, unknown>).__STORE__ = () => useStore.getState(); } })(),
  // Navigation
  activePanel: 'home' as ActivePanel,
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  // User
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Dashboard
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  
  // Doctors
  doctors: [
    {
      id: 'doc-sarah',
      email: 'sarah@medikalinku.id',
      name: 'dr. Sarah Wijaya',
      role: 'doctor' as const,
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doctorProfile: {
        id: 'dp-doc-sarah',
        userId: 'doc-sarah',
        specialization: 'umum',
        rating: 4.9,
        reviewCount: 156,
        consultationFee: 150000,
        isOnline: true,
        isAvailable: true,
      }
    },
    {
      id: 'doc-ahmad',
      email: 'ahmad@medikalinku.id',
      name: 'dr. Ahmad Rizki',
      role: 'doctor' as const,
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doctorProfile: {
        id: 'dp-doc-ahmad',
        userId: 'doc-ahmad',
        specialization: 'anak',
        rating: 4.8,
        reviewCount: 98,
        consultationFee: 175000,
        isOnline: true,
        isAvailable: true,
      }
    },
    {
      id: 'doc-lisa',
      email: 'lisa@medikalinku.id',
      name: 'dr. Lisa Permata',
      role: 'doctor' as const,
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doctorProfile: {
        id: 'dp-doc-lisa',
        userId: 'doc-lisa',
        specialization: 'penyakit_dalam',
        rating: 4.7,
        reviewCount: 73,
        consultationFee: 200000,
        isOnline: true,
        isAvailable: true,
      }
    },
    {
      id: 'doc-dewi',
      email: 'dewi@medikalinku.id',
      name: 'dr. Dewi Sartika',
      role: 'doctor' as const,
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doctorProfile: {
        id: 'dp-doc-dewi',
        userId: 'doc-dewi',
        specialization: 'kebidanan',
        rating: 4.9,
        reviewCount: 112,
        consultationFee: 175000,
        isOnline: false,
        isAvailable: true,
      }
    },
    {
      id: 'doc-budi',
      email: 'budi@medikalinku.id',
      name: 'drg. Budi Santoso',
      role: 'doctor' as const,
      avatar: '',
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doctorProfile: {
        id: 'dp-doc-budi',
        userId: 'doc-budi',
        specialization: 'gigi',
        rating: 4.6,
        reviewCount: 45,
        consultationFee: 200000,
        isOnline: true,
        isAvailable: true,
      }
    }
  ] as User[],
  setDoctors: (doctors) => set({ doctors }),
  onlineDoctors: ['doc-sarah', 'doc-ahmad', 'doc-lisa', 'doc-budi'],
  setOnlineDoctors: (ids) => set({ onlineDoctors: ids }),
  
  // Consultations
  consultations: [],
  setConsultations: (consultations) => set({ consultations }),
  updateConsultation: (consultationId, data) => set((state) => ({
    consultations: state.consultations.map(c =>
      c.id === consultationId ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ),
    activeConsultation: state.activeConsultation?.id === consultationId
      ? { ...state.activeConsultation, ...data, updatedAt: new Date().toISOString() }
      : state.activeConsultation,
  })),
  activeConsultation: null,
  setActiveConsultation: (consultation) => set({ activeConsultation: consultation }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  typingUsers: new Map(),
  setTypingUsers: (map) => set({ typingUsers: map }),
  
  // Pharmacy
  medicines: [
    { id: 'med-1', name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'bebas' as MedicineCategory, price: 15000, stock: 150, unit: 'Tablet (10)', manufacturer: 'Kimia Farma', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-2', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'resep' as MedicineCategory, price: 25000, stock: 80, unit: 'Kapsul (10)', manufacturer: 'Sanbe Farma', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-3', name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'resep' as MedicineCategory, price: 35000, stock: 60, unit: 'Kapsul (10)', manufacturer: 'Bernofarm', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-4', name: 'CTM (Chlorpheniramine)', genericName: 'Chlorpheniramine Maleate', category: 'bebas' as MedicineCategory, price: 8000, stock: 200, unit: 'Tablet (10)', manufacturer: 'Kimia Farma', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-5', name: 'Vitamin C 1000mg', genericName: 'Ascorbic Acid', category: 'vitamin' as MedicineCategory, price: 45000, stock: 120, unit: 'Tablet (20)', manufacturer: 'Nature Made', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-6', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'bebas' as MedicineCategory, price: 18000, stock: 90, unit: 'Tablet (10)', manufacturer: 'Pharos', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-7', name: 'Metformin 500mg', genericName: 'Metformin HCl', category: 'resep' as MedicineCategory, price: 22000, stock: 100, unit: 'Tablet (20)', manufacturer: 'Indofarma', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-8', name: 'Loratadine 10mg', genericName: 'Loratadine', category: 'bebas' as MedicineCategory, price: 28000, stock: 75, unit: 'Tablet (10)', manufacturer: 'Kalbe Farma', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-9', name: 'Termometer Digital', category: 'alat_kesehatan' as MedicineCategory, price: 85000, stock: 30, unit: 'Unit', manufacturer: 'Omron', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-10', name: 'Tensimeter Digital', category: 'alat_kesehatan' as MedicineCategory, price: 350000, stock: 15, unit: 'Unit', manufacturer: 'Omron', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-11', name: 'Vitamin D3 1000IU', genericName: 'Cholecalciferol', category: 'vitamin' as MedicineCategory, price: 65000, stock: 85, unit: 'Softgel (30)', manufacturer: 'Nature Made', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'med-12', name: 'Antasida Sirup', genericName: 'Aluminium Hydroxide + Magnesium Hydroxide', category: 'bebas' as MedicineCategory, price: 22000, stock: 60, unit: 'Botol (60ml)', manufacturer: 'Kimia Farma', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ] as Medicine[],
  setMedicines: (medicines) => set({ medicines }),
  cart: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(c => c.medicine.id === item.medicine.id);
    if (existing) {
      return {
        cart: state.cart.map(c => 
          c.medicine.id === item.medicine.id 
            ? { ...c, quantity: c.quantity + item.quantity }
            : c
        )
      };
    }
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (medicineId) => set((state) => ({
    cart: state.cart.filter(c => c.medicine.id !== medicineId)
  })),
  updateCartQuantity: (medicineId, quantity) => set((state) => ({
    cart: state.cart.map(c => 
      c.medicine.id === medicineId ? { ...c, quantity } : c
    )
  })),
  clearCart: () => set({ cart: [] }),
  
  // Home Care
  homeCareServices: [
    { id: 'hc-1', name: 'Perawatan Luka', description: 'Perawatan luka di rumah oleh perawat profesional', category: 'perawatan', price: 150000, duration: 60, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'hc-2', name: 'Injeksi/Suntik', description: 'Pemberian injeksi obat sesuai resep dokter', category: 'perawatan', price: 100000, duration: 30, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'hc-3', name: 'Cek Kesehatan Umum', description: 'Pemeriksaan kesehatan umum di rumah', category: 'pemeriksaan', price: 200000, duration: 45, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'hc-4', name: 'Fisioterapi', description: 'Terapi fisik di rumah', category: 'terapi', price: 250000, duration: 60, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'hc-5', name: 'Perawatan Lansia', description: 'Perawatan dan pendampingan lansia', category: 'pendampingan', price: 300000, duration: 120, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ] as HomeCareService[],
  setHomeCareServices: (services) => set({ homeCareServices: services }),
  homeCareBookings: [],
  setHomeCareBookings: (bookings) => set({ homeCareBookings: bookings }),
  
  // Medical Records
  medicalRecords: [],
  setMedicalRecords: (records) => set({ medicalRecords: records }),
  addMedicalRecord: (record) => set((state) => ({ medicalRecords: [...state.medicalRecords, record] })),
  updateMedicalRecord: (recordId, data) => set((state) => ({
    medicalRecords: state.medicalRecords.map(r => 
      r.id === recordId ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
    )
  })),
  
  // Notifications
  notifications: [
    { id: 'notif-1', userId: '', title: 'Selamat Datang!', message: 'Selamat datang di MedikaLink. Mulai konsultasi dengan dokter sekarang!', type: 'chat' as const, isRead: false, createdAt: new Date().toISOString() },
    { id: 'notif-2', userId: '', title: 'Promo Spesial', message: 'Diskon 20% untuk pembelian vitamin minggu ini!', type: 'pharmacy' as const, isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'notif-3', userId: '', title: 'Jadwal Konsultasi', message: 'Konsultasi Anda akan dimulai dalam 30 menit', type: 'consultation' as const, isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  ] as Notification[],
  setNotifications: (notifications) => set({ notifications }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  // Payments
  payments: [],
  setPayments: (payments) => set({ payments }),
  
  // Prescriptions
  prescriptions: [],
  setPrescriptions: (prescriptions) => set({ prescriptions }),
  addPrescription: (prescription) => set((state) => ({ prescriptions: [...state.prescriptions, prescription] })),
  updatePrescriptionStatus: (prescriptionId, status) => set((state) => ({
    prescriptions: state.prescriptions.map(p => 
      p.id === prescriptionId ? { ...p, status } : p
    )
  })),
  
  // Articles
  articles: [],
  setArticles: (articles) => set({ articles }),
  
  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  selectedChatDoctor: null,
  setSelectedChatDoctor: (doctor) => set({ selectedChatDoctor: doctor }),

  // Prescription Checkout
  pendingPrescriptionCheckout: null,
  setPendingPrescriptionCheckout: (prescription) => set({ pendingPrescriptionCheckout: prescription }),

  // Screening
  screeningForms: [],
  setScreeningForms: (forms) => set({ screeningForms: forms }),
  addScreeningForm: (form) => set((state) => ({ screeningForms: [...state.screeningForms, form] })),
  updateScreeningForm: (formId, data) => set((state) => ({
    screeningForms: state.screeningForms.map((f) =>
      f.id === formId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f
    ),
  })),
  screeningAuditLog: [],
  addAuditLog: (log) => set((state) => ({ screeningAuditLog: [...state.screeningAuditLog, log] })),
  clinicalAlerts: [],
  addClinicalAlert: (alert) => set((state) => ({ clinicalAlerts: [...state.clinicalAlerts, alert] })),

  // Palliative Screening
  palliativeScreeningForms: [],
  setPalliativeScreeningForms: (forms) => set({ palliativeScreeningForms: forms }),
  addPalliativeScreeningForm: (form) => set((state) => ({ palliativeScreeningForms: [...state.palliativeScreeningForms, form] })),
  updatePalliativeScreeningForm: (formId, data) => set((state) => ({
    palliativeScreeningForms: state.palliativeScreeningForms.map((f) =>
      f.id === formId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f
    ),
  })),
  activePalliativeFormId: null,
  setActivePalliativeFormId: (id) => set({ activePalliativeFormId: id }),

  // Palliative Monitoring
  palliativePatients: [
    {
      id: 'pp-1',
      patientId: 'patient-1',
      patientName: 'Siti Rahayu',
      rmNumber: 'RM-2025-001',
      bpjsNumber: '0001234567890',
      nik: '3201014505870001',
      dateOfBirth: '1945-05-08',
      gender: 'Perempuan',
      primaryDiagnosis: 'Kanker Payudara Stadium IV',
      secondaryDiagnosis: 'Diabetes Melitus Tipe 2, Hipertensi',
      diseaseStage: 'Stadium IV',
      attendingDoctorId: 'doc-sarah',
      attendingDoctorName: 'dr. Sarah Wijaya',
      familyContactName: 'Budi Rahayu',
      familyContactRelation: 'Anak',
      familyContactPhone: '081234567890',
      address: 'Jl. Melati No. 12, Bandung',
      careStatus: 'home_care',
      patientStatus: 'aktif',
      riskLevel: 'merah',
      notes: 'Pasien memerlukan perawatan paliatif intensif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pp-2',
      patientId: 'patient-2',
      patientName: 'Ahmad Sudrajat',
      rmNumber: 'RM-2025-002',
      bpjsNumber: '0009876543210',
      nik: '3201015003790002',
      dateOfBirth: '1950-03-15',
      gender: 'Laki-laki',
      primaryDiagnosis: 'PPOK Stadium Berat',
      secondaryDiagnosis: 'Gagal Jantung Kongestif',
      diseaseStage: 'Stadium Berat',
      attendingDoctorId: 'doc-lisa',
      attendingDoctorName: 'dr. Lisa Permata',
      familyContactName: 'Dewi Sudrajat',
      familyContactRelation: 'Istri',
      familyContactPhone: '082345678901',
      address: 'Jl. Kenanga No. 5, Jakarta',
      careStatus: 'rawat_jalan',
      patientStatus: 'aktif',
      riskLevel: 'kuning',
      notes: 'Kondisi stabil namun perlu monitoring rutin',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'pp-3',
      patientId: 'patient-3',
      patientName: 'Maria Susanti',
      rmNumber: 'RM-2025-003',
      primaryDiagnosis: 'Stroke Berat',
      secondaryDiagnosis: 'Hipertensi',
      diseaseStage: 'Kronis',
      attendingDoctorId: 'doc-sarah',
      attendingDoctorName: 'dr. Sarah Wijaya',
      familyContactName: 'Yohanes Susanti',
      familyContactRelation: 'Suami',
      familyContactPhone: '083456789012',
      address: 'Jl. Anggrek No. 8, Surabaya',
      careStatus: 'hospice',
      patientStatus: 'aktif',
      riskLevel: 'merah',
      notes: 'Pasien bed rest total, perlu perawatan paliatif penuh',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ] as PalliativePatientInfo[],
  setPalliativePatients: (patients) => set({ palliativePatients: patients }),
  addPalliativePatient: (patient) => set((state) => ({ palliativePatients: [...state.palliativePatients, patient] })),
  updatePalliativePatient: (patientId, data) => set((state) => ({
    palliativePatients: state.palliativePatients.map(p =>
      p.id === patientId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ),
  })),
  removePalliativePatient: (patientId) => set((state) => ({
    palliativePatients: state.palliativePatients.filter(p => p.id !== patientId),
  })),
  selectedPalliativePatientId: null,
  setSelectedPalliativePatientId: (id) => set({ selectedPalliativePatientId: id }),
  vitalSignRecords: [
    {
      id: 'vs-1', palliativePatientId: 'pp-1', recordedBy: 'doctor',
      systolicBP: 110, diastolicBP: 70, heartRate: 88, respiratoryRate: 22,
      temperature: 36.8, oxygenSat: 93, weight: 52, height: 155, bmi: 21.6,
      notes: 'Saturasi perlu dimonitor', recordedAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'vs-2', palliativePatientId: 'pp-1', recordedBy: 'family',
      systolicBP: 105, diastolicBP: 65, heartRate: 92, respiratoryRate: 24,
      temperature: 37.1, oxygenSat: 91, weight: 51.5, height: 155, bmi: 21.4,
      notes: 'Pasien sesak ringan', recordedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'vs-3', palliativePatientId: 'pp-1', recordedBy: 'nurse',
      systolicBP: 115, diastolicBP: 72, heartRate: 85, respiratoryRate: 20,
      temperature: 36.5, oxygenSat: 95, weight: 52.5, height: 155, bmi: 21.8,
      recordedAt: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'vs-4', palliativePatientId: 'pp-2', recordedBy: 'doctor',
      systolicBP: 135, diastolicBP: 85, heartRate: 78, respiratoryRate: 18,
      temperature: 36.6, oxygenSat: 96, weight: 68, height: 170, bmi: 23.5,
      recordedAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'vs-5', palliativePatientId: 'pp-2', recordedBy: 'patient',
      systolicBP: 130, diastolicBP: 82, heartRate: 80, respiratoryRate: 20,
      temperature: 36.7, oxygenSat: 94, weight: 67.5, height: 170, bmi: 23.4,
      recordedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'vs-6', palliativePatientId: 'pp-3', recordedBy: 'nurse',
      systolicBP: 90, diastolicBP: 60, heartRate: 95, respiratoryRate: 26,
      temperature: 37.5, oxygenSat: 88, weight: 45, height: 160, bmi: 17.6,
      notes: 'Tekanan darah rendah, saturasi kritis', recordedAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ] as VitalSignRecordInfo[],
  setVitalSignRecords: (records) => set({ vitalSignRecords: records }),
  addVitalSignRecord: (record) => set((state) => ({ vitalSignRecords: [...state.vitalSignRecords, record] })),
  palliativeMedications: [
    { id: 'pm-1', palliativePatientId: 'pp-1', medicineName: 'Morfine 10mg', dosage: '10mg', frequency: '3x1', route: 'oral', startDate: '2025-01-15', indication: 'Nyeri kronis', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pm-2', palliativePatientId: 'pp-1', medicineName: 'Ondansetron 4mg', dosage: '4mg', frequency: '2x1', route: 'oral', startDate: '2025-01-15', indication: 'Mual', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pm-3', palliativePatientId: 'pp-1', medicineName: 'Metformin 500mg', dosage: '500mg', frequency: '2x1', route: 'oral', startDate: '2024-06-01', indication: 'Diabetes', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pm-4', palliativePatientId: 'pp-2', medicineName: 'Salbutamol Inhaler', dosage: '2 puff', frequency: '4x1', route: 'inhalasi', startDate: '2025-02-01', indication: 'Sesak napas PPOK', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pm-5', palliativePatientId: 'pp-2', medicineName: 'Amlodipine 5mg', dosage: '5mg', frequency: '1x1', route: 'oral', startDate: '2024-03-15', indication: 'Hipertensi', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pm-6', palliativePatientId: 'pp-3', medicineName: 'Morfine 20mg', dosage: '20mg', frequency: '2x1', route: 'oral', startDate: '2025-01-01', indication: 'Nyeri berat', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'pm-7', palliativePatientId: 'pp-3', medicineName: 'Diazepam 5mg', dosage: '5mg', frequency: '1x1', route: 'oral', startDate: '2025-01-10', indication: 'Kecemasan, insomnia', isActive: true, notes: 'Diberikan malam hari', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ] as PalliativeMedicationInfo[],
  setPalliativeMedications: (meds) => set({ palliativeMedications: meds }),
  addPalliativeMedication: (med) => set((state) => ({ palliativeMedications: [...state.palliativeMedications, med] })),
  updatePalliativeMedication: (medId, data) => set((state) => ({
    palliativeMedications: state.palliativeMedications.map(m =>
      m.id === medId ? { ...m, ...data, updatedAt: new Date().toISOString() } : m
    ),
  })),
  advanceCarePlans: [
    {
      id: 'acp-1', palliativePatientId: 'pp-1',
      decisionMakerName: 'Budi Rahayu', decisionMakerRelation: 'Anak', decisionMakerPhone: '081234567890',
      preferredCareLocation: 'rumah', careGoal: 'fokus_kenyamanan',
      resuscitationPref: 'dnr', ventilatorPref: 'tidak_bersedia',
      icuPref: 'tidak_bersedia', artificialNutrition: 'bersedia',
      dialysisPref: 'tidak_bersedia', organDonation: 'tidak',
      patientHopes: 'Ingin menghabiskan waktu bersama keluarga di rumah',
      patientWorries: 'Khawatir menjadi beban keluarga dan rasa sakit yang tidak terkontrol',
      lifeValues: 'Keluarga adalah segalanya, ingin meninggal dengan tenang',
      endOfLifePrefs: 'Ingin dirawat di rumah dengan keluarga di sekitar',
      patientSigned: true, familySigned: true, doctorSigned: true,
      signedAt: new Date(Date.now() - 259200000).toISOString(),
      isActive: true,
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'acp-2', palliativePatientId: 'pp-3',
      decisionMakerName: 'Yohanes Susanti', decisionMakerRelation: 'Suami', decisionMakerPhone: '083456789012',
      preferredCareLocation: 'hospice', careGoal: 'mengurangi_gejala',
      resuscitationPref: 'dnr', ventilatorPref: 'tidak_bersedia',
      icuPref: 'tidak_bersedia', artificialNutrition: 'tidak_bersedia',
      dialysisPref: 'tidak_bersedia', organDonation: 'ya',
      patientHopes: 'Tidak ingin menderita lama',
      patientWorries: 'Takut kesakitan saat menjelang wafat',
      lifeValues: 'Ingin damai dan dikelilingi keluarga',
      endOfLifePrefs: 'Dirawat di hospice, didoakan bersama',
      patientSigned: true, familySigned: true, doctorSigned: false,
      isActive: true,
      createdAt: new Date(Date.now() - 432000000).toISOString(),
      updatedAt: new Date(Date.now() - 432000000).toISOString(),
    },
  ] as AdvanceCarePlanInfo[],
  setAdvanceCarePlans: (plans) => set({ advanceCarePlans: plans }),
  addAdvanceCarePlan: (plan) => set((state) => ({ advanceCarePlans: [...state.advanceCarePlans, plan] })),
  updateAdvanceCarePlan: (planId, data) => set((state) => ({
    advanceCarePlans: state.advanceCarePlans.map(p =>
      p.id === planId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ),
  })),
  palliativeScreeningRecords: [
    { id: 'psr-1', palliativePatientId: 'pp-1', screeningType: 'esas', score: 45, scoreLabel: 'Gejala Berat', interpretation: 'Skor ESAS 45/90 menunjukkan beban gejala berat', ewsLevel: 'merah', performedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'psr-2', palliativePatientId: 'pp-1', screeningType: 'pps', score: 40, scoreLabel: 'Ketergantungan', interpretation: 'PPS 40% - Pasien memerlukan bantuan substantial', ewsLevel: 'merah', performedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'psr-3', palliativePatientId: 'pp-2', screeningType: 'esas', score: 25, scoreLabel: 'Gejala Sedang', interpretation: 'Skor ESAS 25/90 menunjukkan beban gejala sedang', ewsLevel: 'kuning', performedAt: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'psr-4', palliativePatientId: 'pp-3', screeningType: 'distress', score: 8, scoreLabel: 'Distress Berat', interpretation: 'Skor 8/10 menunjukkan distress berat', ewsLevel: 'merah', performedAt: new Date(Date.now() - 43200000).toISOString(), createdAt: new Date(Date.now() - 43200000).toISOString() },
  ] as PalliativeScreeningRecordInfo[],
  setPalliativeScreeningRecords: (records) => set({ palliativeScreeningRecords: records }),
  addPalliativeScreeningRecord: (record) => set((state) => ({ palliativeScreeningRecords: [...state.palliativeScreeningRecords, record] })),
  palliativeAiSummary: '',
  setPalliativeAiSummary: (summary) => set({ palliativeAiSummary: summary }),

  // Palliative Chat
  palliativeChatMessages: [
    {
      id: 'pcm-1',
      roomId: 'pp-1_doc-sarah',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      senderRole: 'doctor',
      type: 'text',
      content: 'Selamat pagi Bu Siti, bagaimana kondisi Anda hari ini?',
      status: 'read',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      readAt: new Date(Date.now() - 7000000).toISOString(),
    },
    {
      id: 'pcm-2',
      roomId: 'pp-1_doc-sarah',
      senderId: 'patient-1',
      senderName: 'Siti Rahayu',
      senderRole: 'patient',
      type: 'text',
      content: 'Selamat pagi Dok, agak sesak hari ini dan nafsu makan berkurang.',
      status: 'read',
      createdAt: new Date(Date.now() - 6800000).toISOString(),
    },
    {
      id: 'pcm-3',
      roomId: 'pp-1_doc-sarah',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      senderRole: 'doctor',
      type: 'form_ttv',
      content: 'Silakan isi formulir TTV untuk memantau kondisi Anda hari ini.',
      status: 'delivered',
      formType: 'ttv',
      formData: {
        id: 'form-ttv-1',
        formType: 'ttv',
        status: 'sent',
        progress: 0,
      },
      createdAt: new Date(Date.now() - 6000000).toISOString(),
    },
    {
      id: 'pcm-4',
      roomId: 'pp-1_doc-sarah',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      senderRole: 'doctor',
      type: 'form_keluhan',
      content: 'Mohon isi form keluhan harian untuk evaluasi gejala Anda.',
      status: 'delivered',
      formType: 'keluhan',
      formData: {
        id: 'form-keluhan-1',
        formType: 'keluhan',
        status: 'sent',
        progress: 0,
      },
      createdAt: new Date(Date.now() - 5800000).toISOString(),
    },
    {
      id: 'pcm-5',
      roomId: 'pp-1_doc-sarah',
      senderId: 'patient-1',
      senderName: 'Siti Rahayu',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form TTV telah diisi.',
      formType: 'ttv',
      formResponse: {
        formId: 'form-ttv-1',
        formType: 'ttv',
        ttvAnswers: {
          systolicBP: 105,
          diastolicBP: 65,
          heartRate: 92,
          respiratoryRate: 24,
          temperature: 37.1,
          oxygenSat: 91,
          weight: 51.5,
          symptoms: {
            nyeri: true, sesak: true, batuk: false, mual: true, muntah: false,
            sulit_menelan: false, sulit_tidur: true, lemas: true, nafsu_makan_menurun: true,
            konstipasi: false, diare: false, lainnya: '',
          },
          painScore: 5,
          notes: 'Sesak terasa saat berbaring',
        },
        submittedAt: new Date(Date.now() - 5000000).toISOString(),
      },
      status: 'read',
      createdAt: new Date(Date.now() - 5000000).toISOString(),
    },
    {
      id: 'pcm-6',
      roomId: 'pp-1_doc-sarah',
      senderId: 'system',
      senderName: 'Sistem',
      senderRole: 'system',
      type: 'clinical_alert',
      content: 'Peringatan: SpO2 rendah (91%) dan frekuensi napas meningkat (24/menit).',
      clinicalAlert: {
        id: 'alert-1',
        patientId: 'pp-1',
        alertType: 'ttv_abnormal',
        severity: 'kuning',
        title: 'TTV Abnormal',
        description: 'SpO2 rendah (91%) dan frekuensi napas meningkat (24/menit)',
        values: { oxygenSat: 91, respiratoryRate: 24 },
        isRead: false,
        createdAt: new Date(Date.now() - 4900000).toISOString(),
      },
      status: 'delivered',
      createdAt: new Date(Date.now() - 4900000).toISOString(),
    },
    {
      id: 'pcm-7',
      roomId: 'pp-1_doc-sarah',
      senderId: 'system',
      senderName: 'AI Clinical Assistant',
      senderRole: 'system',
      type: 'ai_summary',
      content: 'Ringkasan AI: Pasien menunjukkan penurunan SpO2 dan peningkatan frekuensi napas. Nyeri terkontrol dengan skor 5/10. Gejala utama: sesak, mual, lemas.',
      aiSummary: 'S: Pasien Siti Rahayu mengeluhkan sesak napas terutama saat berbaring, nafsu makan menurun, dan lemas.\nO: TD 105/65 mmHg, Nadi 92 x/menit, RR 24/menit, Suhu 37.1°C, SpO2 91%, BB 51.5 kg. Nyeri 5/10.\nA: Penurunan saturasi oksigen dengan peningkatan frekuensi napas. Gejala sesak dan mual perlu pemantauan.\nP: Evaluasi oksigen tambahan, optimasi manajemen sesak, monitoring ulang 6 jam.',
      status: 'delivered',
      createdAt: new Date(Date.now() - 4800000).toISOString(),
    },
    {
      id: 'pcm-8',
      roomId: 'pp-3_doc-sarah',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      senderRole: 'doctor',
      type: 'text',
      content: 'Ibu Maria, hari ini saya akan kirimkan form skrining untuk evaluasi kondisi Anda.',
      status: 'sent',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ] as PalliativeChatMessage[],
  setPalliativeChatMessages: (messages) => set({ palliativeChatMessages: messages }),
  addPalliativeChatMessage: (message) => set((state) => ({ palliativeChatMessages: [...state.palliativeChatMessages, message] })),
  updatePalliativeChatMessage: (msgId, data) => set((state) => ({
    palliativeChatMessages: state.palliativeChatMessages.map(m =>
      m.id === msgId ? { ...m, ...data } : m
    ),
  })),
  palliativeClinicalAlerts: [
    {
      id: 'alert-1',
      patientId: 'pp-1',
      alertType: 'ttv_abnormal',
      severity: 'kuning',
      title: 'TTV Abnormal',
      description: 'SpO2 rendah (91%) dan frekuensi napas meningkat (24/menit)',
      values: { oxygenSat: 91, respiratoryRate: 24 },
      isRead: false,
      createdAt: new Date(Date.now() - 4900000).toISOString(),
    },
    {
      id: 'alert-2',
      patientId: 'pp-3',
      alertType: 'ttv_abnormal',
      severity: 'merah',
      title: 'TTV Kritis',
      description: 'SpO2 sangat rendah (88%), hipotensi (90/60), dan takipnea (26/menit)',
      values: { oxygenSat: 88, systolicBP: 90, diastolicBP: 60, respiratoryRate: 26 },
      isRead: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ] as PalliativeClinicalAlert[],
  addPalliativeClinicalAlert: (alert) => set((state) => ({ palliativeClinicalAlerts: [...state.palliativeClinicalAlerts, alert] })),
  markPalliativeAlertRead: (alertId) => set((state) => ({
    palliativeClinicalAlerts: state.palliativeClinicalAlerts.map(a =>
      a.id === alertId ? { ...a, isRead: true } : a
    ),
  })),
  palliativeAuditLog: [
    {
      id: 'audit-1',
      patientId: 'pp-1',
      action: 'form_sent',
      performedBy: 'doc-sarah',
      performedByRole: 'doctor',
      details: 'Dokter mengirim Form TTV kepada pasien Siti Rahayu',
      createdAt: new Date(Date.now() - 6000000).toISOString(),
    },
    {
      id: 'audit-2',
      patientId: 'pp-1',
      action: 'form_submitted',
      performedBy: 'patient-1',
      performedByRole: 'patient',
      details: 'Pasien mengirimkan hasil Form TTV',
      createdAt: new Date(Date.now() - 5000000).toISOString(),
    },
    {
      id: 'audit-3',
      patientId: 'pp-1',
      action: 'alert_triggered',
      performedBy: 'system',
      performedByRole: 'system',
      details: 'Alert: SpO2 rendah (91%) dan RR tinggi (24/menit)',
      createdAt: new Date(Date.now() - 4900000).toISOString(),
    },
    {
      id: 'audit-4',
      patientId: 'pp-1',
      action: 'ai_generated',
      performedBy: 'system',
      performedByRole: 'system',
      details: 'AI menghasilkan ringkasan klinis otomatis',
      createdAt: new Date(Date.now() - 4800000).toISOString(),
    },
  ] as PalliativeAuditEntry[],
  addPalliativeAuditEntry: (entry) => set((state) => ({ palliativeAuditLog: [...state.palliativeAuditLog, entry] })),
}));
