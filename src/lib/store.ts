import { create } from 'zustand';
import type { 
  User, Consultation, Message, Medicine, CartItem, 
  HomeCareService, HomeCareBooking, Notification, Article,
  ActivePanel, DashboardStats, MedicalRecord, Payment,
  MedicineCategory, Prescription, MedicalRecordStatus,
  ScreeningForm, ScreeningAuditLog
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
}));
