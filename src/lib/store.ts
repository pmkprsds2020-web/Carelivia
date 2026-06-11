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
  PalliativeChatMessage, PalliativeClinicalAlert, PalliativeAuditEntry,
  PalliativeMonitoringStatus, PalliativeMarkingData, PalliativeMonitoringNotification,
  PalliativeProgramCompletion, PalliativeProgramCompletionReason,
  PalliativeClinicalSummary, PalliativeCommunicationPatient, PalliativeMonitoringFormType,
  WearableDevice, WearableVitalData, RVSMAlert, RVSMDailyReport,
  RVSMFamilyAccess, RVSMAuditEntry, RVSMPalliativeScoreEstimate,
  MedicationMonitoringFormInfo, MedicationMonitoringAlert, MedicationMonitoringAuditEntry,
  MedicationComplianceSummary,
  PalliativeResumeMedis, PalliativeReferralLetter, PalliativeDocumentAuditEntry,
  ReferralTargetDepartment, ReferralStatus,
  NutritionRecordInfo, NutritionAIRecommendation, NutritionActivityLevel,
  NutritionWeightStatus, NutritionMetabolicStress, NutritionSpecialCondition,
  NutritionCalculationResult,
  SocialAssessmentRecord, CaregiverInfo, FamilyMeetingRecord,
  EduMaterial, FamilyCoordinationNote, EmergencyContact,
  FinancialSupportRecord, TransportRecord, SocialMonitoringAlert
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

  // Nutrition Records
  nutritionRecords: NutritionRecordInfo[];
  setNutritionRecords: (records: NutritionRecordInfo[]) => void;
  addNutritionRecord: (record: NutritionRecordInfo) => void;
  nutritionAiRecommendation: NutritionAIRecommendation | null;
  setNutritionAiRecommendation: (rec: NutritionAIRecommendation | null) => void;

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

  // Palliative Monitoring Integration
  palliativeMonitoringNotifications: PalliativeMonitoringNotification[];
  addPalliativeMonitoringNotification: (notification: PalliativeMonitoringNotification) => void;
  markPalliativeNotificationRead: (notificationId: string) => void;
  markPatientAsPalliative: (consultationId: string, doctorId: string, patientId: string, patientName: string, markingData: PalliativeMarkingData) => void;
  updatePalliativeMonitoringStatus: (patientId: string, status: PalliativeMonitoringStatus) => void;
  activeInlineScreeningFormId: string | null;
  setActiveInlineScreeningFormId: (id: string | null) => void;
  activeInlineScreeningType: PalliativeMonitoringFormType | null;
  setActiveInlineScreeningType: (type: PalliativeMonitoringFormType | null) => void;

  // Screening Navigation (from Monitoring Paliatif to Skrining Paliatif)
  screeningNavigationFrom: 'monitoring' | null;
  setScreeningNavigationFrom: (from: 'monitoring' | null) => void;
  screeningPreselectedPatientId: string | null;
  setScreeningPreselectedPatientId: (id: string | null) => void;

  // Palliative Program Completion
  palliativeProgramCompletions: PalliativeProgramCompletion[];
  completePalliativeProgram: (patientId: string, completionData: Omit<PalliativeProgramCompletion, 'id' | 'createdAt'>) => void;

  // RVSM (Remote Vital Sign Monitoring)
  rvsmDevices: WearableDevice[];
  addRvsmDevice: (device: WearableDevice) => void;
  updateRvsmDevice: (deviceId: string, data: Partial<WearableDevice>) => void;
  removeRvsmDevice: (deviceId: string) => void;
  rvsmVitalData: WearableVitalData[];
  addRvsmVitalData: (data: WearableVitalData) => void;
  rvsmAlerts: RVSMAlert[];
  addRvsmAlert: (alert: RVSMAlert) => void;
  markRvsmAlertRead: (alertId: string) => void;
  acknowledgeRvsmAlert: (alertId: string, acknowledgedBy: string) => void;
  rvsmDailyReports: RVSMDailyReport[];
  addRvsmDailyReport: (report: RVSMDailyReport) => void;
  rvsmFamilyAccess: RVSMFamilyAccess[];
  addRvsmFamilyAccess: (access: RVSMFamilyAccess) => void;
  removeRvsmFamilyAccess: (accessId: string) => void;
  rvsmAuditLog: RVSMAuditEntry[];
  addRvsmAuditEntry: (entry: RVSMAuditEntry) => void;
  rvsmPalliativeEstimates: RVSMPalliativeScoreEstimate[];
  addRvsmPalliativeEstimate: (estimate: RVSMPalliativeScoreEstimate) => void;
  rvsmAiSummary: string;
  setRvsmAiSummary: (summary: string) => void;

  // Medication Monitoring
  medicationMonitoringForms: MedicationMonitoringFormInfo[];
  addMedicationMonitoringForm: (form: MedicationMonitoringFormInfo) => void;
  updateMedicationMonitoringForm: (formId: string, data: Partial<MedicationMonitoringFormInfo>) => void;
  medicationMonitoringAlerts: MedicationMonitoringAlert[];
  addMedicationMonitoringAlert: (alert: MedicationMonitoringAlert) => void;
  markMedicationMonitoringAlertRead: (alertId: string) => void;
  medicationMonitoringAuditLog: MedicationMonitoringAuditEntry[];
  addMedicationMonitoringAuditEntry: (entry: MedicationMonitoringAuditEntry) => void;
  medicationComplianceSummaries: MedicationComplianceSummary[];
  addMedicationComplianceSummary: (summary: MedicationComplianceSummary) => void;

  // Palliative Resume Medis & Surat Rujukan
  palliativeResumes: PalliativeResumeMedis[];
  addPalliativeResume: (resume: PalliativeResumeMedis) => void;
  updatePalliativeResume: (resumeId: string, data: Partial<PalliativeResumeMedis>) => void;
  palliativeReferralLetters: PalliativeReferralLetter[];
  addPalliativeReferralLetter: (letter: PalliativeReferralLetter) => void;
  updatePalliativeReferralLetter: (letterId: string, data: Partial<PalliativeReferralLetter>) => void;
  palliativeDocumentAuditLog: PalliativeDocumentAuditEntry[];
  addPalliativeDocumentAuditEntry: (entry: PalliativeDocumentAuditEntry) => void;

  // Social Support Management
  socialAssessments: SocialAssessmentRecord[];
  addSocialAssessment: (record: SocialAssessmentRecord) => void;
  updateSocialAssessment: (id: string, data: Partial<SocialAssessmentRecord>) => void;
  caregivers: CaregiverInfo[];
  addCaregiver: (caregiver: CaregiverInfo) => void;
  updateCaregiver: (id: string, data: Partial<CaregiverInfo>) => void;
  removeCaregiver: (id: string) => void;
  familyMeetings: FamilyMeetingRecord[];
  addFamilyMeeting: (meeting: FamilyMeetingRecord) => void;
  updateFamilyMeeting: (id: string, data: Partial<FamilyMeetingRecord>) => void;
  eduMaterials: EduMaterial[];
  addEduMaterial: (material: EduMaterial) => void;
  updateEduMaterial: (id: string, data: Partial<EduMaterial>) => void;
  logEduMaterialAccess: (materialId: string, accessedBy: string) => void;
  familyCoordinationNotes: FamilyCoordinationNote[];
  addFamilyCoordinationNote: (note: FamilyCoordinationNote) => void;
  updateFamilyCoordinationNote: (id: string, data: Partial<FamilyCoordinationNote>) => void;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: EmergencyContact) => void;
  updateEmergencyContact: (id: string, data: Partial<EmergencyContact>) => void;
  removeEmergencyContact: (id: string) => void;
  financialSupportRecords: FinancialSupportRecord[];
  addFinancialSupportRecord: (record: FinancialSupportRecord) => void;
  updateFinancialSupportRecord: (id: string, data: Partial<FinancialSupportRecord>) => void;
  transportRecords: TransportRecord[];
  addTransportRecord: (record: TransportRecord) => void;
  updateTransportRecord: (id: string, data: Partial<TransportRecord>) => void;
  socialAlerts: SocialMonitoringAlert[];
  addSocialAlert: (alert: SocialMonitoringAlert) => void;
  markSocialAlertRead: (alertId: string) => void;
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
  nutritionRecords: [
    {
      id: 'nr-1', palliativePatientId: 'pp-1', age: 81, gender: 'P', weight: 48, height: 155,
      activityLevel: 'bed_rest', metabolicStress: 'sedang', specialCondition: 'tidak_ada',
      calculation: {
        bmi: 19.98, bmiCategory: 'normal', idealBodyWeight: 49.5, basalCalories: 1237.5,
        ageCorrectionKcal: -247.5, ageCorrectionPercent: -20, activityCorrectionKcal: 123.75, activityCorrectionPercent: 10,
        weightCorrectionKcal: 0, weightCorrectionPercent: 0, stressCorrectionKcal: 247.5, stressCorrectionPercent: 20,
        specialConditionKcal: 0, totalCalorieNeeds: 1361.25,
        carbohydrateKcal: 612.56, proteinKcal: 340.31, fatKcal: 272.25, mineralKcal: 136.13,
        carbohydrateGrams: 153.14, proteinGrams: 85.08, fatGrams: 30.25,
      },
      actualIntakeKcal: 1100, notes: 'Pasien makan sedikit, sering mual',
      recordedBy: 'dr. Sarah Wijaya', recordedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'nr-2', palliativePatientId: 'pp-2', age: 72, gender: 'L', weight: 55, height: 165,
      activityLevel: 'ringan', metabolicStress: 'ringan', specialCondition: 'tidak_ada',
      calculation: {
        bmi: 20.2, bmiCategory: 'normal', idealBodyWeight: 58.5, basalCalories: 1755,
        ageCorrectionKcal: -351, ageCorrectionPercent: -20, activityCorrectionKcal: 263.25, activityCorrectionPercent: 15,
        weightCorrectionKcal: 0, weightCorrectionPercent: 0, stressCorrectionKcal: 175.5, stressCorrectionPercent: 10,
        specialConditionKcal: 0, totalCalorieNeeds: 1842.75,
        carbohydrateKcal: 829.24, proteinKcal: 460.69, fatKcal: 368.55, mineralKcal: 184.28,
        carbohydrateGrams: 207.31, proteinGrams: 115.17, fatGrams: 40.95,
      },
      actualIntakeKcal: 1500, notes: 'Nafsu makan menurun, sesak saat makan',
      recordedBy: 'dr. Lisa Permata', recordedAt: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'nr-3', palliativePatientId: 'pp-3', age: 68, gender: 'P', weight: 40, height: 150,
      activityLevel: 'bed_rest', metabolicStress: 'berat', specialCondition: 'tidak_ada',
      calculation: {
        bmi: 17.78, bmiCategory: 'underweight', idealBodyWeight: 45, basalCalories: 1125,
        ageCorrectionKcal: -112.5, ageCorrectionPercent: -10, activityCorrectionKcal: 112.5, activityCorrectionPercent: 10,
        weightCorrectionKcal: 225, weightCorrectionPercent: 20, stressCorrectionKcal: 337.5, stressCorrectionPercent: 30,
        specialConditionKcal: 0, totalCalorieNeeds: 1687.5,
        carbohydrateKcal: 759.38, proteinKcal: 421.88, fatKcal: 337.5, mineralKcal: 168.75,
        carbohydrateGrams: 189.84, proteinGrams: 105.47, fatGrams: 37.5,
      },
      actualIntakeKcal: 650, notes: 'Cachexia berat, mual muntah terus menerus',
      recordedBy: 'dr. Lisa Permata', recordedAt: new Date(Date.now() - 259200000).toISOString(), createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ] as NutritionRecordInfo[],
  setNutritionRecords: (records) => set({ nutritionRecords: records }),
  addNutritionRecord: (record) => set((state) => ({ nutritionRecords: [...state.nutritionRecords, record] })),
  nutritionAiRecommendation: null,
  setNutritionAiRecommendation: (rec) => set({ nutritionAiRecommendation: rec }),

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

  // Palliative Monitoring Integration
  palliativeMonitoringNotifications: [] as PalliativeMonitoringNotification[],
  addPalliativeMonitoringNotification: (notification) => set((state) => ({
    palliativeMonitoringNotifications: [notification, ...state.palliativeMonitoringNotifications],
  })),
  markPalliativeNotificationRead: (notificationId) => set((state) => ({
    palliativeMonitoringNotifications: state.palliativeMonitoringNotifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    ),
  })),
  markPatientAsPalliative: (consultationId, doctorId, patientId, patientName, markingData) => set((state) => {
    // Check if patient already exists in palliative patients
    const exists = state.palliativePatients.some(p => p.patientId === patientId);
    if (exists) return state;

    const newPatient: PalliativePatientInfo = {
      id: `pp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      patientName,
      primaryDiagnosis: markingData.primaryDiagnosis,
      secondaryDiagnosis: markingData.secondaryDiagnosis,
      attendingDoctorId: doctorId,
      attendingDoctorName: state.doctors.find(d => d.id === doctorId)?.name,
      careStatus: 'rawat_jalan',
      patientStatus: 'aktif',
      monitoringStatus: 'monitoring_aktif',
      riskLevel: 'kuning',
      markingData,
      consultationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create notification
    const notification: PalliativeMonitoringNotification = {
      id: `pn-${Date.now()}`,
      patientId,
      patientName,
      type: 'status_change',
      title: 'Pasien Baru Monitoring Paliatif',
      description: `${patientName} telah ditambahkan ke program monitoring paliatif`,
      severity: 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    return {
      palliativePatients: [...state.palliativePatients, newPatient],
      palliativeMonitoringNotifications: [notification, ...state.palliativeMonitoringNotifications],
    };
  }),
  updatePalliativeMonitoringStatus: (patientId, status) => set((state) => ({
    palliativePatients: state.palliativePatients.map(p =>
      p.id === patientId ? { ...p, monitoringStatus: status, updatedAt: new Date().toISOString() } : p
    ),
  })),
  activeInlineScreeningFormId: null as string | null,
  setActiveInlineScreeningFormId: (id) => set({ activeInlineScreeningFormId: id }),
  activeInlineScreeningType: null as PalliativeMonitoringFormType | null,
  setActiveInlineScreeningType: (type) => set({ activeInlineScreeningType: type }),

  // Screening Navigation state
  screeningNavigationFrom: null as 'monitoring' | null,
  setScreeningNavigationFrom: (from) => set({ screeningNavigationFrom: from }),
  screeningPreselectedPatientId: null as string | null,
  setScreeningPreselectedPatientId: (id) => set({ screeningPreselectedPatientId: id }),

  // Palliative Program Completion
  palliativeProgramCompletions: [] as PalliativeProgramCompletion[],
  completePalliativeProgram: (patientId, completionData) => set((state) => {
    const completion: PalliativeProgramCompletion = {
      ...completionData,
      id: `pcomp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    // Update patient status to program_selesai
    const updatedPatients = state.palliativePatients.map(p =>
      p.id === patientId
        ? { ...p, patientStatus: 'program_selesai' as const, monitoringStatus: 'program_selesai' as PalliativeMonitoringStatus, updatedAt: new Date().toISOString() }
        : p
    );
    return {
      palliativeProgramCompletions: [...state.palliativeProgramCompletions, completion],
      palliativePatients: updatedPatients,
    };
  }),

  // RVSM
  rvsmDevices: [
    {
      id: 'wd-1', patientId: 'pp-1', deviceType: 'apple_watch' as const,
      deviceName: 'Apple Watch Series 9', integrationMethod: 'apple_healthkit' as const,
      status: 'connected' as const, batteryLevel: 72, isConnected: true,
      lastSyncAt: new Date(Date.now() - 300000).toISOString(),
      firmwareVersion: '10.3.1', serialNumber: 'AW9-2024-00123',
      registeredAt: new Date(Date.now() - 2592000000).toISOString(),
    },
    {
      id: 'wd-2', patientId: 'pp-2', deviceType: 'samsung_galaxy_watch' as const,
      deviceName: 'Samsung Galaxy Watch 6', integrationMethod: 'samsung_health' as const,
      status: 'connected' as const, batteryLevel: 45, isConnected: true,
      lastSyncAt: new Date(Date.now() - 600000).toISOString(),
      firmwareVersion: '5.0.2', serialNumber: 'SGW6-2024-00456',
      registeredAt: new Date(Date.now() - 1728000000).toISOString(),
    },
    {
      id: 'wd-3', patientId: 'pp-3', deviceType: 'garmin_watch' as const,
      deviceName: 'Garmin Vivosmart 5', integrationMethod: 'rest_api' as const,
      status: 'low_battery' as const, batteryLevel: 12, isConnected: true,
      lastSyncAt: new Date(Date.now() - 1800000).toISOString(),
      firmwareVersion: '8.15', serialNumber: 'GV5-2024-00789',
      registeredAt: new Date(Date.now() - 864000000).toISOString(),
    },
  ] as WearableDevice[],
  addRvsmDevice: (device) => set((state) => ({ rvsmDevices: [...state.rvsmDevices, device] })),
  updateRvsmDevice: (deviceId, data) => set((state) => ({
    rvsmDevices: state.rvsmDevices.map(d => d.id === deviceId ? { ...d, ...data } : d),
  })),
  removeRvsmDevice: (deviceId) => set((state) => ({ rvsmDevices: state.rvsmDevices.filter(d => d.id !== deviceId) })),

  rvsmVitalData: (() => {
    const now = Date.now();
    const data: WearableVitalData[] = [];
    // Generate 24 data points for each palliative patient over last 24h
    const patients = [
      { id: 'pp-1', deviceId: 'wd-1', hr: 88, spo2: 93, rr: 22, steps: 450, sleep: 420, temp: 36.8 },
      { id: 'pp-2', deviceId: 'wd-2', hr: 78, spo2: 96, rr: 18, steps: 3200, sleep: 390, temp: 36.6 },
      { id: 'pp-3', deviceId: 'wd-3', hr: 95, spo2: 88, rr: 26, steps: 120, sleep: 540, temp: 37.5 },
    ];
    patients.forEach(p => {
      for (let i = 23; i >= 0; i--) {
        const t = now - i * 3600000;
        const hrVar = Math.round(p.hr + (Math.random() - 0.5) * 10);
        const spo2Var = Math.round(p.spo2 + (Math.random() - 0.5) * 3);
        const rrVar = Math.round(p.rr + (Math.random() - 0.5) * 4);
        data.push({
          id: `rvd-${p.id}-${i}`,
          deviceId: p.deviceId,
          patientId: p.id,
          timestamp: new Date(t).toISOString(),
          heartRate: hrVar,
          heartRateVariability: Math.round(30 + Math.random() * 40),
          heartRhythm: hrVar > 100 ? 'sinus_tachycardia' : hrVar < 60 ? 'sinus_bradycardia' : 'normal_sinus',
          arrhythmiaDetected: Math.random() < 0.05,
          respiratoryRate: rrVar,
          respiratoryPattern: rrVar > 24 ? 'tachypneic' : rrVar < 10 ? 'bradypneic' : 'normal',
          apneaEpisode: Math.random() < 0.03,
          oxygenSat: spo2Var,
          steps: i < 12 ? Math.round(p.steps / 12 + (Math.random() - 0.5) * 50) : undefined,
          distance: i < 12 ? Math.round(p.steps * 0.7 + (Math.random() - 0.5) * 200) : undefined,
          walkDuration: i < 12 ? Math.round(p.steps / 10 + (Math.random() - 0.5) * 5) : undefined,
          dailyActivityLevel: p.steps < 500 ? 'sedentary' : p.steps < 3000 ? 'light' : 'moderate',
          sittingDuration: i === 0 ? Math.round(180 + Math.random() * 120) : undefined,
          standingDuration: i === 0 ? Math.round(30 + Math.random() * 60) : undefined,
          lyingDuration: i === 0 ? Math.round(p.sleep + Math.random() * 60) : undefined,
          postureChangeCount: i === 0 ? Math.round(5 + Math.random() * 10) : undefined,
          sleepDuration: i === 0 ? p.sleep : undefined,
          sleepQuality: p.sleep < 300 ? 'poor' : p.sleep < 420 ? 'fair' : 'good',
          sleepDisturbances: Math.round(Math.random() * 5),
          sleepPattern: p.sleep > 540 ? 'hypersomnia' : p.sleep < 300 ? 'insomnia' : 'normal',
          skinTemperature: Math.round((p.temp - 0.5 + Math.random()) * 10) / 10,
          estimatedCoreTemp: p.temp,
          painScore: p.id === 'pp-3' ? Math.round(6 + Math.random() * 3) : p.id === 'pp-1' ? Math.round(3 + Math.random() * 3) : Math.round(1 + Math.random() * 2),
          stressLevel: Math.round(p.id === 'pp-3' ? 65 + Math.random() * 25 : p.id === 'pp-1' ? 40 + Math.random() * 30 : 20 + Math.random() * 20),
          fatigueLevel: Math.round(p.id === 'pp-3' ? 70 + Math.random() * 20 : p.id === 'pp-1' ? 50 + Math.random() * 25 : 25 + Math.random() * 15),
          systolicBP: p.id === 'pp-1' ? 105 + Math.round((Math.random() - 0.5) * 10) : p.id === 'pp-2' ? 130 + Math.round((Math.random() - 0.5) * 10) : 90 + Math.round((Math.random() - 0.5) * 8),
          diastolicBP: p.id === 'pp-1' ? 65 + Math.round((Math.random() - 0.5) * 8) : p.id === 'pp-2' ? 82 + Math.round((Math.random() - 0.5) * 8) : 60 + Math.round((Math.random() - 0.5) * 6),
        });
      }
    });
    return data;
  })() as WearableVitalData[],
  addRvsmVitalData: (d) => set((state) => ({ rvsmVitalData: [...state.rvsmVitalData, d] })),

  rvsmAlerts: [
    {
      id: 'rva-1', patientId: 'pp-3', patientName: 'Maria Susanti', deviceId: 'wd-3',
      category: 'oxygenation' as const, severity: 'critical' as const,
      title: 'SpO2 Sangat Rendah',
      description: 'Saturasi oksigen pasien turun di bawah 90%. Diperlukan tindakan segera.',
      values: { oxygenSat: 88 }, threshold: { parameter: 'oxygenSat', operator: '<', value: 92 },
      actualValue: 88, isRead: false, isAcknowledged: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'rva-2', patientId: 'pp-1', patientName: 'Siti Rahayu', deviceId: 'wd-1',
      category: 'cardiovascular' as const, severity: 'attention' as const,
      title: 'Takikardia Deteksi',
      description: 'Denyut jantung pasien melebihi 100 bpm secara konsisten.',
      values: { heartRate: 105 }, threshold: { parameter: 'heartRate', operator: '>', value: 100 },
      actualValue: 105, isRead: false, isAcknowledged: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'rva-3', patientId: 'pp-3', patientName: 'Maria Susanti', deviceId: 'wd-3',
      category: 'mobility' as const, severity: 'attention' as const,
      title: 'Penurunan Aktivitas Signifikan',
      description: 'Aktivitas pasien menurun lebih dari 30% dibanding baseline. Pasien lebih banyak berbaring.',
      values: { activityChange: -35, lyingHours: 12.5 },
      actualValue: -35, isRead: true, isAcknowledged: true,
      acknowledgedBy: 'dr. Sarah Wijaya',
      acknowledgedAt: new Date(Date.now() - 900000).toISOString(),
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'rva-4', patientId: 'pp-1', patientName: 'Siti Rahayu', deviceId: 'wd-1',
      category: 'sleep' as const, severity: 'attention' as const,
      title: 'Gangguan Tidur',
      description: 'Kualitas tidur pasien menurun. Durasi tidur hanya 4.2 jam dengan 5 kali gangguan.',
      values: { sleepDuration: 252, sleepDisturbances: 5 },
      isRead: false, isAcknowledged: false,
      createdAt: new Date(Date.now() - 5400000).toISOString(),
    },
  ] as RVSMAlert[],
  addRvsmAlert: (alert) => set((state) => ({ rvsmAlerts: [...state.rvsmAlerts, alert] })),
  markRvsmAlertRead: (alertId) => set((state) => ({
    rvsmAlerts: state.rvsmAlerts.map(a => a.id === alertId ? { ...a, isRead: true } : a),
  })),
  acknowledgeRvsmAlert: (alertId, acknowledgedBy) => set((state) => ({
    rvsmAlerts: state.rvsmAlerts.map(a => a.id === alertId ? { ...a, isAcknowledged: true, acknowledgedBy, acknowledgedAt: new Date().toISOString() } : a),
  })),

  rvsmDailyReports: [
    {
      id: 'rdr-1', patientId: 'pp-1', patientName: 'Siti Rahayu',
      reportDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      activityChangePercent: -25, avgSpO2: 92, avgHeartRate: 90, avgRespiratoryRate: 23,
      sleepDurationHours: 4.2, lyingDurationHours: 14, stepsCount: 450, painScoreAvg: 4.5,
      stressLevelAvg: 55, fatigueLevelAvg: 62,
      aiSummary: 'Aktivitas pasien menurun 25% dibanding minggu sebelumnya. Rata-rata SpO2 92% (menurun dari 94%). Durasi tidur hanya 4.2 jam menunjukkan insomnia. Temuan mengindikasikan penurunan status fungsional.',
      riskPrediction: { hospitalizationRisk: 'moderate', symptomWorseningRisk: 'high', ppsDeclineRisk: 'moderate', homeVisitNeedRisk: 'high' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'rdr-2', patientId: 'pp-3', patientName: 'Maria Susanti',
      reportDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      activityChangePercent: -45, avgSpO2: 88, avgHeartRate: 96, avgRespiratoryRate: 26,
      sleepDurationHours: 9.5, lyingDurationHours: 20, stepsCount: 80, painScoreAvg: 7.5,
      stressLevelAvg: 78, fatigueLevelAvg: 82,
      aiSummary: 'Penurunan aktivitas signifikan 45%. SpO2 konsisten rendah (rata-rata 88%). Pasien hampir sepenuhnya bed rest. Nyeri tinggi (7.5/10) dan fatigue berat (82/100). Risiko perburukan TINGGI.',
      riskPrediction: { hospitalizationRisk: 'high', symptomWorseningRisk: 'high', ppsDeclineRisk: 'high', homeVisitNeedRisk: 'high' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ] as RVSMDailyReport[],
  addRvsmDailyReport: (report) => set((state) => ({ rvsmDailyReports: [...state.rvsmDailyReports, report] })),

  rvsmFamilyAccess: [
    {
      id: 'rfa-1', patientId: 'pp-1', familyMemberId: 'fam-budi', familyMemberName: 'Budi Rahayu',
      relationship: 'Anak', canViewActivity: true, canViewDeviceStatus: true,
      canViewHealthGraphs: true, canReceiveAlerts: true, canViewSchedule: true,
      grantedAt: new Date(Date.now() - 2592000000).toISOString(),
    },
    {
      id: 'rfa-2', patientId: 'pp-3', familyMemberId: 'fam-yohanes', familyMemberName: 'Yohanes Susanti',
      relationship: 'Suami', canViewActivity: true, canViewDeviceStatus: true,
      canViewHealthGraphs: true, canReceiveAlerts: true, canViewSchedule: true,
      grantedAt: new Date(Date.now() - 1728000000).toISOString(),
    },
  ] as RVSMFamilyAccess[],
  addRvsmFamilyAccess: (access) => set((state) => ({ rvsmFamilyAccess: [...state.rvsmFamilyAccess, access] })),
  removeRvsmFamilyAccess: (accessId) => set((state) => ({ rvsmFamilyAccess: state.rvsmFamilyAccess.filter(a => a.id !== accessId) })),

  rvsmAuditLog: [
    { id: 'ra-1', patientId: 'pp-1', action: 'data_received' as const, performedBy: 'wd-1', performedByRole: 'system' as const, details: 'Data vital diterima dari Apple Watch', deviceId: 'wd-1', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'ra-2', patientId: 'pp-3', action: 'alert_generated' as const, performedBy: 'system', performedByRole: 'system' as const, details: 'Alert: SpO2 rendah terdeteksi (88%)', deviceId: 'wd-3', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'ra-3', patientId: 'pp-3', action: 'alert_acknowledged' as const, performedBy: 'doc-sarah', performedByRole: 'doctor' as const, details: 'Dokter mengakui alert SpO2 rendah', createdAt: new Date(Date.now() - 900000).toISOString() },
  ] as RVSMAuditEntry[],
  addRvsmAuditEntry: (entry) => set((state) => ({ rvsmAuditLog: [...state.rvsmAuditLog, entry] })),

  rvsmPalliativeEstimates: [
    {
      patientId: 'pp-1', estimatedAt: new Date(Date.now() - 3600000).toISOString(),
      ppsEstimate: { currentEstimate: 40, previousEstimate: 50, change: -10, confidence: 0.78, factors: ['Penurunan aktivitas 25%', 'SpO2 menurun', 'Durasi tidur berkurang'] },
      esasEstimate: { fatigueLevel: 7, sleepDisturbance: 6, activityDecline: 5, estimatedTotalScore: 45 },
      spictEstimate: { deteriorationRisk: 'high', indicators: ['Penurunan fungsi fisik', 'Hipoksemia berulang', 'Penurunan berat badan'] },
    },
    {
      patientId: 'pp-3', estimatedAt: new Date(Date.now() - 3600000).toISOString(),
      ppsEstimate: { currentEstimate: 20, previousEstimate: 30, change: -10, confidence: 0.85, factors: ['Bed rest total', 'SpO2 konsisten rendah', 'Nyeri tidak terkontrol'] },
      esasEstimate: { fatigueLevel: 9, sleepDisturbance: 8, activityDecline: 9, estimatedTotalScore: 72 },
      spictEstimate: { deteriorationRisk: 'high', indicators: ['Ketergantungan total', 'Hipoksemia persisten', 'Penurunan kesadaran', 'Disfungsi multiorgan'] },
    },
  ] as RVSMPalliativeScoreEstimate[],
  addRvsmPalliativeEstimate: (estimate) => set((state) => ({ rvsmPalliativeEstimates: [...state.rvsmPalliativeEstimates, estimate] })),

  rvsmAiSummary: '',
  setRvsmAiSummary: (summary) => set({ rvsmAiSummary: summary }),

  // Medication Monitoring
  medicationMonitoringForms: [] as MedicationMonitoringFormInfo[],
  addMedicationMonitoringForm: (form) => set((state) => ({ medicationMonitoringForms: [...state.medicationMonitoringForms, form] })),
  updateMedicationMonitoringForm: (formId, data) => set((state) => ({
    medicationMonitoringForms: state.medicationMonitoringForms.map(f =>
      f.id === formId ? { ...f, ...data, updatedAt: new Date().toISOString() } : f
    ),
  })),
  medicationMonitoringAlerts: [] as MedicationMonitoringAlert[],
  addMedicationMonitoringAlert: (alert) => set((state) => ({ medicationMonitoringAlerts: [...state.medicationMonitoringAlerts, alert] })),
  markMedicationMonitoringAlertRead: (alertId) => set((state) => ({
    medicationMonitoringAlerts: state.medicationMonitoringAlerts.map(a =>
      a.id === alertId ? { ...a, isRead: true } : a
    ),
  })),
  medicationMonitoringAuditLog: [] as MedicationMonitoringAuditEntry[],
  addMedicationMonitoringAuditEntry: (entry) => set((state) => ({ medicationMonitoringAuditLog: [...state.medicationMonitoringAuditLog, entry] })),
  medicationComplianceSummaries: [] as MedicationComplianceSummary[],
  addMedicationComplianceSummary: (summary) => set((state) => ({ medicationComplianceSummaries: [...state.medicationComplianceSummaries, summary] })),

  // Palliative Resume Medis & Surat Rujukan
  palliativeResumes: [] as PalliativeResumeMedis[],
  addPalliativeResume: (resume) => set((state) => ({ palliativeResumes: [...state.palliativeResumes, resume] })),
  updatePalliativeResume: (resumeId, data) => set((state) => ({
    palliativeResumes: state.palliativeResumes.map(r =>
      r.id === resumeId ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
    ),
  })),
  palliativeReferralLetters: [] as PalliativeReferralLetter[],
  addPalliativeReferralLetter: (letter) => set((state) => ({ palliativeReferralLetters: [...state.palliativeReferralLetters, letter] })),
  updatePalliativeReferralLetter: (letterId, data) => set((state) => ({
    palliativeReferralLetters: state.palliativeReferralLetters.map(l =>
      l.id === letterId ? { ...l, ...data, updatedAt: new Date().toISOString() } : l
    ),
  })),
  palliativeDocumentAuditLog: [] as PalliativeDocumentAuditEntry[],
  addPalliativeDocumentAuditEntry: (entry) => set((state) => ({ palliativeDocumentAuditLog: [...state.palliativeDocumentAuditLog, entry] })),

  // Social Support Management
  socialAssessments: [
    {
      id: 'sa-1', palliativePatientId: 'pp-1',
      housingCondition: 'kurang_layak' as const, housingNotes: 'Rumah tidak luas, akses jalan sulit',
      caregiverAvailability: 'terbatas' as const, caregiverNotes: 'Anak bekerja di siang hari',
      familySupportLevel: 'cukup' as const, familySupportNotes: 'Keluarga rutin menengok',
      transportDifficulty: 'sedang' as const, transportNotes: 'Jarak ke RS 15km, tidak ada kendaraan',
      economicConstraint: 'sedang' as const, economicNotes: 'Penghasilan terbatas, bergantung BPJS',
      healthcareAccess: 'sulit' as const, healthcareAccessNotes: 'Fasilitas kesehatan terdekat 10km',
      medicalEquipmentNeed: 'sedang' as const, medicalEquipmentNotes: 'Perlu oksigen konsentrator dan kasur anti dekubitus',
      socialAssistanceNeed: 'sedang' as const, socialAssistanceNotes: 'Perlu bantuan biaya transportasi',
      socialIsolationRisk: 'sedang' as const, socialIsolationNotes: 'Pasien jarang keluar rumah',
      overallStatus: 'sebagian' as const, priorityLevel: 'sedang' as const,
      recommendations: ['Fasilitas kunjungan rumah', 'Bantuan transportasi medis', 'Alat kesehatan rumahan'],
      assessedBy: 'dr. Sarah Wijaya', assessedByRole: 'doctor' as const,
      assessedAt: new Date(Date.now() - 172800000).toISOString(),
      createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'sa-2', palliativePatientId: 'pp-3',
      housingCondition: 'layak' as const,
      caregiverAvailability: 'tersedia' as const,
      familySupportLevel: 'kuat' as const,
      transportDifficulty: 'ringan' as const,
      economicConstraint: 'berat' as const, economicNotes: 'Biaya pengobatan sangat memberatkan',
      healthcareAccess: 'cukup' as const,
      medicalEquipmentNeed: 'berat' as const, medicalEquipmentNotes: 'Perlu ventilator portabel, suction, dan nebulizer',
      socialAssistanceNeed: 'berat' as const, socialAssistanceNotes: 'Perlu bantuan biaya pengobatan dan alat kesehatan',
      socialIsolationRisk: 'rendah' as const,
      overallStatus: 'lengkap' as const, priorityLevel: 'tinggi' as const,
      recommendations: ['Bantuan biaya pengobatan', 'Pengadaan alat kesehatan', 'Program JKN-KIS'],
      assessedBy: 'dr. Sarah Wijaya', assessedByRole: 'doctor' as const,
      assessedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ] as SocialAssessmentRecord[],
  addSocialAssessment: (record) => set((state) => ({ socialAssessments: [...state.socialAssessments, record] })),
  updateSocialAssessment: (id, data) => set((state) => ({
    socialAssessments: state.socialAssessments.map(a => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a),
  })),
  caregivers: [
    {
      id: 'cg-1', palliativePatientId: 'pp-1', name: 'Budi Rahayu', role: 'utama' as const, relation: 'anak' as const,
      phone: '081234567890', email: 'budi.rahayu@email.com', address: 'Jl. Melati No. 12, Bandung',
      schedule: 'Senin-Sabtu, 08:00-17:00', tasks: ['Pemberian obat', 'Monitoring TTV', 'Memasak makanan'],
      isActive: true, zaritScore: 28, zaritLevel: 'beban_sedang' as const,
      familyApgarScore: 7, familyApgarLevel: 'good' as const,
      notes: 'Kadang merasa terbebani namun berusaha ikhlas',
      createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'cg-2', palliativePatientId: 'pp-1', name: 'Sari Rahayu', role: 'pendamping' as const, relation: 'anak' as const,
      phone: '082345678901', schedule: 'Minggu dan malam hari', tasks: ['Menemani ibu', 'Bantu makan'],
      isActive: true, zaritScore: 18, zaritLevel: 'beban_ringan' as const,
      notes: 'Membantu kakak di akhir pekan',
      createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'cg-3', palliativePatientId: 'pp-3', name: 'Yohanes Susanti', role: 'utama' as const, relation: 'suami' as const,
      phone: '083456789012', address: 'Jl. Anggrek No. 8, Surabaya',
      schedule: 'Setiap hari, 24 jam', tasks: ['Perawatan lengkap', 'Pemberian obat', 'Monitoring kondisi', 'Koordinasi dokter'],
      isActive: true, zaritScore: 42, zaritLevel: 'beban_berat' as const,
      familyApgarScore: 5, familyApgarLevel: 'moderate_dysfunction' as const,
      notes: 'Beban sangat berat, perlu dukungan psikologis',
      createdAt: new Date(Date.now() - 432000000).toISOString(), updatedAt: new Date(Date.now() - 432000000).toISOString(),
    },
  ] as CaregiverInfo[],
  addCaregiver: (caregiver) => set((state) => ({ caregivers: [...state.caregivers, caregiver] })),
  updateCaregiver: (id, data) => set((state) => ({
    caregivers: state.caregivers.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
  })),
  removeCaregiver: (id) => set((state) => ({ caregivers: state.caregivers.filter(c => c.id !== id) })),
  familyMeetings: [
    {
      id: 'fm-1', palliativePatientId: 'pp-1', title: 'Family Meeting: Rencana Perawatan Lanjutan',
      scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(), duration: 60,
      status: 'dijadwalkan' as const,
      participants: [
        { name: 'Budi Rahayu', role: 'Anak/Caregiver', phone: '081234567890', attended: false },
        { name: 'Sari Rahayu', role: 'Anak', phone: '082345678901', attended: false },
        { name: 'dr. Sarah Wijaya', role: 'Dokter', attended: false },
      ],
      agenda: 'Diskusi perawatan lanjutan dan kebutuhan alat kesehatan di rumah',
      createdBy: 'dr. Sarah Wijaya',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      id: 'fm-2', palliativePatientId: 'pp-3', title: 'Family Meeting: Evaluasi Kondisi dan Dukungan',
      scheduledAt: new Date(Date.now() - 172800000).toISOString(), duration: 45,
      status: 'selesai' as const,
      participants: [
        { name: 'Yohanes Susanti', role: 'Suami/Caregiver', phone: '083456789012', attended: true },
        { name: 'Maria Susanti Jr', role: 'Anak', phone: '084567890123', attended: true },
        { name: 'dr. Sarah Wijaya', role: 'Dokter', attended: true },
      ],
      agenda: 'Evaluasi kondisi pasien, beban caregiver, dan dukungan finansial',
      discussionNotes: 'Pasien membutuhkan perawatan intensif. Suami merasa sangat terbebani. Perlu bantuan caregiver tambahan.',
      resume: 'Disepakati untuk menambah perawat shift malam dan mengajukan bantuan sosial',
      followUpActions: ['Menghubungi perawat home care', 'Mengajukan bantuan JKN-KIS', 'Konseling caregiver'],
      createdBy: 'dr. Sarah Wijaya',
      createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ] as FamilyMeetingRecord[],
  addFamilyMeeting: (meeting) => set((state) => ({ familyMeetings: [...state.familyMeetings, meeting] })),
  updateFamilyMeeting: (id, data) => set((state) => ({
    familyMeetings: state.familyMeetings.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m),
  })),
  eduMaterials: [
    { id: 'edu-1', title: 'Panduan Perawatan Pasien Paliatif di Rumah', category: 'perawatan_rumah' as const, description: 'Panduan lengkap perawatan harian pasien paliatif di rumah', type: 'pdf' as const, accessCount: 45, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-2', title: 'Cara Mengelola Nyeri di Rumah', category: 'perawatan_rumah' as const, description: 'Tips dan panduan manajemen nyeri untuk caregiver', type: 'artikel' as const, accessCount: 38, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-3', title: 'Panduan Caregiver: Menjaga Kesehatan Mental', category: 'panduan_caregiver' as const, description: 'Self-care untuk caregiver agar tidak burnout', type: 'artikel' as const, accessCount: 22, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-4', title: 'Video: Posisi Nyaman Pasien Bed Rest', category: 'video_edukasi' as const, description: 'Video tutorial posisi nyaman dan pencegahan dekubitus', type: 'video' as const, accessCount: 56, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-5', title: 'Dukungan Psikososial untuk Keluarga', category: 'dukungan_psikososial' as const, description: 'Mengenali tanda stres dan cara mengatasinya', type: 'artikel' as const, accessCount: 18, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-6', title: 'Kapan Harus ke UGD?', category: 'gawat_darurat' as const, description: 'Panduan mengenali tanda bahaya yang memerlukan penanganan darurat', type: 'infografis' as const, accessCount: 62, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-7', title: 'Persiapan Akhir Kehidupan', category: 'end_of_life' as const, description: 'Panduan mempersiapkan tahap akhir kehidupan dengan bermartabat', type: 'pdf' as const, accessCount: 12, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-8', title: 'FAQ: Pertanyaan Umum Keluarga Pasien Paliatif', category: 'faq' as const, description: 'Jawaban atas pertanyaan yang sering diajukan keluarga', type: 'faq' as const, accessCount: 89, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ] as EduMaterial[],
  addEduMaterial: (material) => set((state) => ({ eduMaterials: [...state.eduMaterials, material] })),
  updateEduMaterial: (id, data) => set((state) => ({
    eduMaterials: state.eduMaterials.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m),
  })),
  logEduMaterialAccess: (materialId, accessedBy) => set((state) => ({
    eduMaterials: state.eduMaterials.map(m => m.id === materialId ? {
      ...m, accessCount: m.accessCount + 1,
      accessLogs: [...m.accessLogs, { materialId, accessedBy, accessedAt: new Date().toISOString() }],
    } : m),
  })),
  familyCoordinationNotes: [
    { id: 'fcn-1', palliativePatientId: 'pp-1', authorName: 'Budi Rahayu', authorRelation: 'Anak', content: 'Ibu hari ini makan lebih banyak, sesak berkurang', type: 'perkembangan' as const, isCompleted: false, createdAt: new Date(Date.now() - 43200000).toISOString(), updatedAt: new Date(Date.now() - 43200000).toISOString() },
    { id: 'fcn-2', palliativePatientId: 'pp-1', authorName: 'Sari Rahayu', authorRelation: 'Anak', content: 'Beli obat Morfine di apotek', type: 'tugas' as const, isCompleted: false, dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'fcn-3', palliativePatientId: 'pp-3', authorName: 'Yohanes Susanti', authorRelation: 'Suami', content: 'Jadwal kontrol dr. Sarah tanggal 15', type: 'pengingat_kontrol' as const, isCompleted: false, dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString() },
  ] as FamilyCoordinationNote[],
  addFamilyCoordinationNote: (note) => set((state) => ({ familyCoordinationNotes: [...state.familyCoordinationNotes, note] })),
  updateFamilyCoordinationNote: (id, data) => set((state) => ({
    familyCoordinationNotes: state.familyCoordinationNotes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n),
  })),
  emergencyContacts: [
    { id: 'ec-1', palliativePatientId: 'pp-1', name: 'dr. Sarah Wijaya', role: 'dokter' as const, phone: '081111111111', isPrimary: true, notes: 'Dokter penanggung jawab', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'ec-2', palliativePatientId: 'pp-1', name: 'Budi Rahayu', role: 'caregiver_utama' as const, phone: '081234567890', isPrimary: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'ec-3', palliativePatientId: 'pp-1', name: 'Ambulans 119', role: 'ambulans' as const, phone: '119', isPrimary: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'ec-4', palliativePatientId: 'pp-1', name: 'RS Hasan Sadikin', role: 'rumah_sakit' as const, phone: '0222034953', isPrimary: false, notes: 'RS rujukan utama', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'ec-5', palliativePatientId: 'pp-3', name: 'dr. Sarah Wijaya', role: 'dokter' as const, phone: '081111111111', isPrimary: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'ec-6', palliativePatientId: 'pp-3', name: 'Yohanes Susanti', role: 'caregiver_utama' as const, phone: '083456789012', isPrimary: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'ec-7', palliativePatientId: 'pp-3', name: 'UGD RS Dr. Soetomo', role: 'gawat_darurat' as const, phone: '0315501171', isPrimary: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ] as EmergencyContact[],
  addEmergencyContact: (contact) => set((state) => ({ emergencyContacts: [...state.emergencyContacts, contact] })),
  updateEmergencyContact: (id, data) => set((state) => ({
    emergencyContacts: state.emergencyContacts.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
  })),
  removeEmergencyContact: (id) => set((state) => ({ emergencyContacts: state.emergencyContacts.filter(c => c.id !== id) })),
  financialSupportRecords: [
    {
      id: 'fs-1', palliativePatientId: 'pp-1', insuranceStatus: 'bpjs' as const, bpjsNumber: '0001234567890',
      insuranceDetails: 'BPJS Kesehatan Kelas 2', socialAidStatus: 'menerima' as const, socialAidDetails: 'PKH, BPNT',
      treatmentCostNeed: 'sedang' as const, medicalEquipmentCostNeed: 'sedang' as const, transportCostNeed: 'ringan' as const,
      recommendedPrograms: ['BPJS Kesehatan', 'Program Keluarga Harapan', 'Bantuan Sosial DA'],
      notes: 'Biaya transportasi masih menjadi kendala', assessedBy: 'Pekerja Sosial',
      assessedAt: new Date(Date.now() - 172800000).toISOString(),
      createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'fs-2', palliativePatientId: 'pp-3', insuranceStatus: 'campuran' as const,
      insuranceDetails: 'BPJS + Asuransi Prudential', socialAidStatus: 'belum_menerima' as const,
      treatmentCostNeed: 'berat' as const, medicalEquipmentCostNeed: 'berat' as const, transportCostNeed: 'ringan' as const,
      recommendedPrograms: ['JKN-KIS', 'Kartu Indonesia Pintar', 'Bantuan Medis Hospice', 'Program CSR RS'],
      notes: 'Biaya perawatan sangat memberatkan keluarga', assessedBy: 'Pekerja Sosial',
      assessedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ] as FinancialSupportRecord[],
  addFinancialSupportRecord: (record) => set((state) => ({ financialSupportRecords: [...state.financialSupportRecords, record] })),
  updateFinancialSupportRecord: (id, data) => set((state) => ({
    financialSupportRecords: state.financialSupportRecords.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r),
  })),
  transportRecords: [
    { id: 'tr-1', palliativePatientId: 'pp-1', type: 'transportasi_medis' as const, status: 'selesai' as const, scheduledAt: new Date(Date.now() - 86400000 * 7).toISOString(), completedAt: new Date(Date.now() - 86400000 * 7).toISOString(), origin: 'Jl. Melati No. 12, Bandung', destination: 'RS Hasan Sadikin', notes: 'Kontrol rutin', requestedBy: 'Budi Rahayu', createdAt: new Date(Date.now() - 86400000 * 8).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: 'tr-2', palliativePatientId: 'pp-3', type: 'ambulans_darurat' as const, status: 'selesai' as const, scheduledAt: new Date(Date.now() - 259200000).toISOString(), completedAt: new Date(Date.now() - 259200000).toISOString(), origin: 'Jl. Anggrek No. 8, Surabaya', destination: 'RS Dr. Soetomo', notes: 'Sesak napas berat', requestedBy: 'Yohanes Susanti', createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 259200000).toISOString() },
  ] as TransportRecord[],
  addTransportRecord: (record) => set((state) => ({ transportRecords: [...state.transportRecords, record] })),
  updateTransportRecord: (id, data) => set((state) => ({
    transportRecords: state.transportRecords.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r),
  })),
  socialAlerts: [
    { id: 'sal-1', patientId: 'pp-3', patientName: 'Maria Susanti', type: 'beban_caregiver' as const, severity: 'critical' as const, title: 'Beban Caregiver Berat', description: 'Skor Zarit 42/48 - Suami pasien mengalami beban caregiver berat, perlu intervensi segera', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'sal-2', patientId: 'pp-1', patientName: 'Siti Rahayu', type: 'kendala_ekonomi' as const, severity: 'warning' as const, title: 'Kendala Ekonomi Sedang', description: 'Pasien mengalami kendala ekonomi sedang, perlu evaluasi bantuan sosial', isRead: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ] as SocialMonitoringAlert[],
  addSocialAlert: (alert) => set((state) => ({ socialAlerts: [...state.socialAlerts, alert] })),
  markSocialAlertRead: (alertId) => set((state) => ({
    socialAlerts: state.socialAlerts.map(a => a.id === alertId ? { ...a, isRead: true } : a),
  })),
}));
