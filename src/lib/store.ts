import { create } from 'zustand';
import { supabaseSync as firestoreSync } from '@/lib/supabase-sync';
import { patientService, isValidUuid } from '@/services/supabase';
import { toast } from '@/hooks/use-toast';
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
  FinancialSupportRecord, TransportRecord, FamilySupportMaterial, SocialMonitoringAlert,
  AISocialAnalysisResult, AISocialAnalysisRecord, AISocialPopulationStats,
  PatientTransportRequest, PatientCareUpdate, PatientPaliatifChatMessage,
  DailyComplaintRecord
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

  // Pending payment focus — set by a checkout flow (Apotek Online, Home
  // Care after admin validation, etc.) right before navigating to the
  // Payments panel, so that panel can jump straight to "choose a payment
  // method" for THAT specific payment instead of dropping the user on the
  // generic payment list.
  pendingPaymentFocusId: string | null;
  setPendingPaymentFocusId: (paymentId: string | null) => void;

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
  addPalliativePatient: (patient: PalliativePatientInfo) => Promise<PalliativePatientInfo | null>;
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
  acknowledgePalliativeAlert: (alertId: string, acknowledgedBy: string, notes?: string) => void;
  resolvePalliativeAlert: (alertId: string, resolvedBy: string, notes?: string) => void;
  addPalliativeAlertNote: (alertId: string, note: string) => void;
  updatePalliativeClinicalAlert: (alertId: string, data: Partial<PalliativeClinicalAlert>) => void;
  setPalliativeClinicalAlerts: (alerts: PalliativeClinicalAlert[]) => void;
  runClinicalAlertEngine: (patientId: string) => Promise<number>;
  forceRunClinicalAlertEngine: (patientId: string) => Promise<number>;
  palliativeAuditLog: PalliativeAuditEntry[];
  addPalliativeAuditEntry: (entry: PalliativeAuditEntry) => void;

  // Palliative Monitoring Integration
  palliativeMonitoringNotifications: PalliativeMonitoringNotification[];
  addPalliativeMonitoringNotification: (notification: PalliativeMonitoringNotification) => void;
  markPalliativeNotificationRead: (notificationId: string) => void;
  markPatientAsPalliative: (consultationId: string, doctorId: string, patientId: string, patientName: string, markingData: PalliativeMarkingData) => Promise<PalliativePatientInfo | null>;
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
  // Which tab Monitoring Paliatif should open on next time it mounts — used
  // to resume the "Skrining" tab after finishing a screening deep-linked
  // from Monitoring Paliatif, instead of always resetting to 'dashboard'.
  monitoringReturnTab: string | null;
  setMonitoringReturnTab: (tab: string | null) => void;

  // Palliative Program Completion
  palliativeProgramCompletions: PalliativeProgramCompletion[];
  completePalliativeProgram: (patientId: string, completionData: Omit<PalliativeProgramCompletion, 'id' | 'createdAt'>) => void;

  // Daily Complaint (Keluhan Harian)
  dailyComplaints: DailyComplaintRecord[];
  setDailyComplaints: (complaints: DailyComplaintRecord[]) => void;
  addDailyComplaint: (complaint: DailyComplaintRecord) => void;

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
  setPalliativeResumes: (resumes: PalliativeResumeMedis[]) => void;
  addPalliativeResume: (resume: PalliativeResumeMedis) => void;
  updatePalliativeResume: (resumeId: string, data: Partial<PalliativeResumeMedis>) => void;
  palliativeReferralLetters: PalliativeReferralLetter[];
  setPalliativeReferralLetters: (letters: PalliativeReferralLetter[]) => void;
  addPalliativeReferralLetter: (letter: PalliativeReferralLetter) => void;
  updatePalliativeReferralLetter: (letterId: string, data: Partial<PalliativeReferralLetter>) => void;
  palliativeDocumentAuditLog: PalliativeDocumentAuditEntry[];
  addPalliativeDocumentAuditEntry: (entry: PalliativeDocumentAuditEntry) => void;

  // Social Support Management
  socialAssessments: SocialAssessmentRecord[];
  setSocialAssessments: (records: SocialAssessmentRecord[]) => void;
  addSocialAssessment: (record: SocialAssessmentRecord) => void;
  updateSocialAssessment: (id: string, data: Partial<SocialAssessmentRecord>) => void;
  caregivers: CaregiverInfo[];
  setCaregivers: (caregivers: CaregiverInfo[]) => void;
  addCaregiver: (caregiver: CaregiverInfo) => void;
  updateCaregiver: (id: string, data: Partial<CaregiverInfo>) => void;
  removeCaregiver: (id: string) => void;
  familyMeetings: FamilyMeetingRecord[];
  setFamilyMeetings: (meetings: FamilyMeetingRecord[]) => void;
  addFamilyMeeting: (meeting: FamilyMeetingRecord) => void;
  updateFamilyMeeting: (id: string, data: Partial<FamilyMeetingRecord>) => void;
  eduMaterials: EduMaterial[];
  addEduMaterial: (material: EduMaterial) => void;
  updateEduMaterial: (id: string, data: Partial<EduMaterial>) => void;
  logEduMaterialAccess: (materialId: string, accessedBy: string) => void;
  familyCoordinationNotes: FamilyCoordinationNote[];
  setFamilyCoordinationNotes: (notes: FamilyCoordinationNote[]) => void;
  addFamilyCoordinationNote: (note: FamilyCoordinationNote) => void;
  updateFamilyCoordinationNote: (id: string, data: Partial<FamilyCoordinationNote>) => void;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  updateEmergencyContact: (id: string, data: Partial<EmergencyContact>) => void;
  removeEmergencyContact: (id: string) => void;
  financialSupportRecords: FinancialSupportRecord[];
  setFinancialSupportRecords: (records: FinancialSupportRecord[]) => void;
  addFinancialSupportRecord: (record: FinancialSupportRecord) => void;
  updateFinancialSupportRecord: (id: string, data: Partial<FinancialSupportRecord>) => void;
  transportRecords: TransportRecord[];
  setTransportRecords: (records: TransportRecord[]) => void;
  addTransportRecord: (record: TransportRecord) => void;
  updateTransportRecord: (id: string, data: Partial<TransportRecord>) => void;
  familySupportMaterials: FamilySupportMaterial[];
  setFamilySupportMaterials: (materials: FamilySupportMaterial[]) => void;
  addFamilySupportMaterial: (material: FamilySupportMaterial) => void;
  updateFamilySupportMaterial: (id: string, data: Partial<FamilySupportMaterial>) => void;
  removeFamilySupportMaterial: (id: string) => void;
  socialAlerts: SocialMonitoringAlert[];
  addSocialAlert: (alert: SocialMonitoringAlert) => void;
  markSocialAlertRead: (alertId: string) => void;

  // AI Social Needs Analysis
  aiSocialAnalysisResult: AISocialAnalysisResult | null;
  setAiSocialAnalysisResult: (result: AISocialAnalysisResult | null) => void;
  aiSocialAnalysisLoading: boolean;
  setAiSocialAnalysisLoading: (loading: boolean) => void;
  aiSocialAnalysisRecords: AISocialAnalysisRecord[];
  addAiSocialAnalysisRecord: (record: AISocialAnalysisRecord) => void;
  aiSocialPopulationStats: AISocialPopulationStats | null;
  setAiSocialPopulationStats: (stats: AISocialPopulationStats | null) => void;

  // Patient Paliatif Module
  patientTransportRequests: PatientTransportRequest[];
  addPatientTransportRequest: (request: PatientTransportRequest) => void;
  updatePatientTransportRequest: (id: string, data: Partial<PatientTransportRequest>) => void;
  patientCareUpdates: PatientCareUpdate[];
  addPatientCareUpdate: (update: PatientCareUpdate) => void;
  markCareUpdateViewed: (id: string) => void;
  patientPaliatifMessages: PatientPaliatifChatMessage[];
  addPatientPaliatifMessage: (message: PatientPaliatifChatMessage) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// reconcileOptimisticRecord
// ─────────────────────────────────────────────────────────────────────────
// Several store slices (caregivers, family meetings, family coordination
// notes, emergency contacts, financial support, transport records, resumes,
// referral letters) add a record to the UI optimistically with a locally
// generated id (e.g. "fcn-1786722...") BEFORE the Supabase insert resolves.
// Supabase assigns its own UUID `id` on insert, and that UUID is what the
// realtime subscription later delivers back to every client (including this
// one). If we never swap the local temp id for the real DB id, the realtime
// handler doesn't recognize the incoming row as "the one we just added" (the
// ids don't match) and appends a second, duplicate row — this is the root
// cause of the "beli obat generik" showing up twice. It's also why an update
// shortly after creation could throw `invalid input syntax for type uuid`:
// the temp id was sent straight into a Supabase `.eq('id', ...)` filter.
//
// Call this right after firing the optimistic `set()` + persist call: once
// the persist promise resolves with the DB row, we replace the temp record
// (matched by its temp id) with the real one. If the persist failed (the
// service layer catches its own errors and resolves `null`), we roll back
// the optimistic record instead of leaving unsynced phantom data in the UI.
function reconcileOptimisticRecord<T extends { id: string }>(
  key: keyof TelemedicineStore,
  tempId: string,
  pending: Promise<T | null>
) {
  pending.then((saved) => {
    useStore.setState((state: any) => {
      const list = state[key] as T[];
      if (saved && saved.id) {
        return { [key]: list.map((x) => (x.id === tempId ? saved : x)) };
      }
      return { [key]: list.filter((x) => x.id !== tempId) };
    });
  });
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
  // NOTE: previously seeded with hardcoded demo doctors (Sarah Wijaya, Ahmad Rizki, etc).
  // That array was never being replaced by real data because /api/dashboard doesn't
  // return a `doctors` field and /api/doctors was never fetched in page.tsx — so every
  // patient's Chat Dokter showed these fake names regardless of who was actually
  // registered. Real doctors now load via /api/doctors in page.tsx's loadDataInBackground.
  // Do not reintroduce hardcoded doctors here as a "fallback" — an empty list with a
  // loading state is correct; a fake doctor name is not.
  doctors: [] as User[],
  setDoctors: (doctors) => set({ doctors }),
  onlineDoctors: [] as string[],
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
  // NOTE: the 12-item hardcoded demo array (Paracetamol 500mg with id
  // 'med-1', etc.) has been removed. Those fake ids never matched real
  // UUIDs in the `medicines` table, so checkout would fail with "Obat
  // tidak ditemukan" the moment the real backend tried to look them up —
  // this is exactly the bug that broke Apotek checkout. Real medicines now
  // load from GET /api/medicines on page mount (see page.tsx) and are
  // seeded into the database by supabase/migration_medicines_seed.sql.
  medicines: [] as Medicine[],
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
    { id: 'notif-1', userId: '', title: 'Selamat Datang!', message: "Selamat datang di CareLivia. Mulai konsultasi dengan dokter sekarang!", type: 'chat' as const, isRead: false, createdAt: new Date().toISOString() },
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

  pendingPaymentFocusId: null,
  setPendingPaymentFocusId: (paymentId) => set({ pendingPaymentFocusId: paymentId }),

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

  // Palliative Monitoring — initial state is EMPTY. All data is loaded
  // from Supabase by SupabaseSyncProvider on mount, and kept in sync via
  // Realtime subscriptions. Dummy/demo data has been removed.
  palliativePatients: [] as PalliativePatientInfo[],
  setPalliativePatients: (patients) => set({ palliativePatients: patients }),
  addPalliativePatient: async (patient) => {
    // ── If the patient already has a real UUID (e.g. from a Supabase
    //    Realtime event), just add it to local state — don't re-create.
    if (isValidUuid(patient.id)) {
      set((state) => {
        // Avoid duplicates
        if (state.palliativePatients.some((p) => p.id === patient.id)) return state;
        return { palliativePatients: [...state.palliativePatients, patient] };
      });
      return patient;
    }

    // ── Otherwise, this is a NEW patient from the form. The `id` field
    //    (if present) is a custom temporary string like "pp-..." which is
    //    NOT a valid UUID. We MUST call Supabase to create the patient and
    //    get the real auto-generated UUID, then store that.
    console.log('[Store.addPalliativePatient] creating patient in Supabase (patient has no valid UUID yet):', {
      name: patient.patientName,
      rm: patient.rmNumber,
      temporaryId: patient.id,
    });

    try {
      const created = await patientService.create(patient);
      if (created) {
        console.log('[Store.addPalliativePatient] SUCCESS — real UUID from Supabase:', created.id);
        set((state) => {
          // Avoid duplicates
          if (state.palliativePatients.some((p) => p.id === created.id)) return state;
          return { palliativePatients: [...state.palliativePatients, created] };
        });
        return created;
      }
      console.error('[Store.addPalliativePatient] patientService.create returned null — patient NOT saved to Supabase');
      return null;
    } catch (err) {
      console.error('[Store.addPalliativePatient] error creating patient in Supabase:', err);
      toast({
        title: 'Gagal menyimpan pasien',
        description: err instanceof Error ? err.message : 'Pasien tidak tersimpan ke database',
        variant: 'destructive',
      });
      return null;
    }
  },
  updatePalliativePatient: (patientId, data) => {
    set((state) => ({
      palliativePatients: state.palliativePatients.map(p =>
        p.id === patientId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      ),
    }));
    // Persist to Firestore
    firestoreSync.updatePatient(patientId, data).catch(err => console.error('[Store] Firestore sync error (updatePatient):', err));
  },
  removePalliativePatient: (patientId) => {
    set((state) => ({
      palliativePatients: state.palliativePatients.filter(p => p.id !== patientId),
    }));
    // Persist to Firestore
    firestoreSync.deletePatient(patientId).catch(err => console.error('[Store] Firestore sync error (removePatient):', err));
  },
  selectedPalliativePatientId: null,
  setSelectedPalliativePatientId: (id) => set({ selectedPalliativePatientId: id }),
  vitalSignRecords: [] as VitalSignRecordInfo[],
  setVitalSignRecords: (records) => set({ vitalSignRecords: records }),
  addVitalSignRecord: (record) => {
    set((state) => ({ vitalSignRecords: [...state.vitalSignRecords, record] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('vitalSignRecords', record.id,
      firestoreSync.addTTV(record.palliativePatientId, { ...record }));
    // Run Clinical Alert Rule Engine for this patient (fire-and-forget)
    if (record.palliativePatientId) {
      useStore.getState().runClinicalAlertEngine(record.palliativePatientId).catch(() => {});
    }
  },
  palliativeMedications: [] as PalliativeMedicationInfo[],
  setPalliativeMedications: (meds) => set({ palliativeMedications: meds }),
  addPalliativeMedication: (med) => {
    set((state) => ({ palliativeMedications: [...state.palliativeMedications, med] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('palliativeMedications', med.id,
      firestoreSync.addObat(med.palliativePatientId, { ...med }));
    // Run Clinical Alert Rule Engine for this patient (fire-and-forget)
    if (med.palliativePatientId) {
      useStore.getState().runClinicalAlertEngine(med.palliativePatientId).catch(() => {});
    }
  },
  updatePalliativeMedication: (medId, data) => {
    const state = useStore.getState();
    const med = state.palliativeMedications.find(m => m.id === medId);
    set((state) => ({
      palliativeMedications: state.palliativeMedications.map(m =>
        m.id === medId ? { ...m, ...data, updatedAt: new Date().toISOString() } : m
      ),
    }));
    // Persist to Firestore
    if (med) {
      firestoreSync.updateObat(med.palliativePatientId, medId, data).catch(err => console.error('[Store] Firestore sync error (updateObat):', err));
    }
  },
  advanceCarePlans: [] as AdvanceCarePlanInfo[],
  setAdvanceCarePlans: (plans) => set({ advanceCarePlans: plans }),
  addAdvanceCarePlan: (plan) => {
    set((state) => ({ advanceCarePlans: [...state.advanceCarePlans, plan] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('advanceCarePlans', plan.id,
      firestoreSync.addACP(plan.palliativePatientId, { ...plan }));
  },
  updateAdvanceCarePlan: (planId, data) => {
    const state = useStore.getState();
    const plan = state.advanceCarePlans.find(p => p.id === planId);
    set((state) => ({
      advanceCarePlans: state.advanceCarePlans.map(p =>
        p.id === planId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      ),
    }));
    // Persist to Firestore
    if (plan) {
      firestoreSync.updateACP(plan.palliativePatientId, planId, data).catch(err => console.error('[Store] Firestore sync error (updateACP):', err));
    }
  },
  palliativeScreeningRecords: [] as PalliativeScreeningRecordInfo[],
  setPalliativeScreeningRecords: (records) => set({ palliativeScreeningRecords: records }),
  addPalliativeScreeningRecord: (record) => {
    set((state) => ({ palliativeScreeningRecords: [...state.palliativeScreeningRecords, record] }));
    // Persist to Supabase, then reconcile the temp id → real DB id (this is
    // the fix for the duplicate screening-history-row bug).
    reconcileOptimisticRecord('palliativeScreeningRecords', record.id,
      firestoreSync.addSkrining(record.palliativePatientId, { ...record }));
    // Run Clinical Alert Rule Engine for this patient (fire-and-forget)
    if (record.palliativePatientId) {
      useStore.getState().runClinicalAlertEngine(record.palliativePatientId).catch(() => {});
    }
  },
  palliativeAiSummary: '',
  setPalliativeAiSummary: (summary) => set({ palliativeAiSummary: summary }),
  nutritionRecords: [] as NutritionRecordInfo[],
  setNutritionRecords: (records) => set({ nutritionRecords: records }),
  addNutritionRecord: (record) => {
    set((state) => ({ nutritionRecords: [...state.nutritionRecords, record] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('nutritionRecords', record.id,
      firestoreSync.addNutrisi(record.palliativePatientId, { ...record }));
    // Run Clinical Alert Rule Engine for this patient (fire-and-forget)
    if (record.palliativePatientId) {
      useStore.getState().runClinicalAlertEngine(record.palliativePatientId).catch(() => {});
    }
  },
  nutritionAiRecommendation: null,
  setNutritionAiRecommendation: (rec) => set({ nutritionAiRecommendation: rec }),

  // Palliative Chat — empty initial state; loaded from Supabase
  palliativeChatMessages: [] as PalliativeChatMessage[],
  setPalliativeChatMessages: (messages) => set({ palliativeChatMessages: messages }),
  addPalliativeChatMessage: (message) => {
    set((state) => ({ palliativeChatMessages: [...state.palliativeChatMessages, message] }));
    // Resolve patient_id for Supabase persistence. The message may carry
    // `palliativePatientId` directly, OR we extract it from the `roomId`
    // (which can be `${patientId}_${doctorId}` or `room-${patientId}`).
    let pid = (message as any).palliativePatientId as string | undefined;
    if (!isValidUuid(pid) && message.roomId) {
      // Try format: ${patientId}_${doctorId}
      const underscoreParts = message.roomId.split('_');
      if (underscoreParts.length > 0 && isValidUuid(underscoreParts[0])) {
        pid = underscoreParts[0];
      } else {
        // Try format: room-${patientId}
        const roomMatch = message.roomId.match(/^room-(.+)$/);
        if (roomMatch && isValidUuid(roomMatch[1])) pid = roomMatch[1];
      }
    }
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('palliativeChatMessages', message.id,
      firestoreSync.addChatMessage(pid || '', { ...message, palliativePatientId: pid }));
  },
  updatePalliativeChatMessage: (msgId, data) => {
    const state = useStore.getState();
    const msg = state.palliativeChatMessages.find(m => m.id === msgId);
    set((state) => ({
      palliativeChatMessages: state.palliativeChatMessages.map(m =>
        m.id === msgId ? { ...m, ...data } : m
      ),
    }));
    // Persist to Firestore
    if (msg) {
      firestoreSync.updateChatMessage(msg.palliativePatientId || '', msgId, data).catch(err => console.error('[Store] Firestore sync error (updateChat):', err));
    }
  },
  palliativeClinicalAlerts: [] as PalliativeClinicalAlert[],
  addPalliativeClinicalAlert: (alert) => {
    set((state) => ({ palliativeClinicalAlerts: [...state.palliativeClinicalAlerts, alert] }));
    // Persist to Firestore
    firestoreSync.addClinicalAlert(alert.palliativePatientId || alert.patientId, { ...alert }).catch(err => console.error('[Store] Firestore sync error (addAlert):', err));
  },
  markPalliativeAlertRead: (alertId) => {
    const state = useStore.getState();
    const alert = state.palliativeClinicalAlerts.find(a => a.id === alertId);
    set((state) => ({
      palliativeClinicalAlerts: state.palliativeClinicalAlerts.map(a =>
        a.id === alertId ? { ...a, isRead: true } : a
      ),
    }));
    // Persist to Firestore
    if (alert) {
      firestoreSync.markAlertRead(alert.palliativePatientId || alert.patientId, alertId).catch(err => console.error('[Store] Firestore sync error (markAlertRead):', err));
    }
  },
  acknowledgePalliativeAlert: (alertId, acknowledgedBy, notes) => {
    const state = useStore.getState();
    const alert = state.palliativeClinicalAlerts.find(a => a.id === alertId);
    const now = new Date().toISOString();
    set((state) => ({
      palliativeClinicalAlerts: state.palliativeClinicalAlerts.map(a =>
        a.id === alertId
          ? { ...a, isRead: true, status: 'ACKNOWLEDGED', acknowledgedBy, acknowledgedAt: now, notes: notes ? `${a.notes ?? ''}\n---\n[${now}] ${notes}`.trim() : a.notes }
          : a
      ),
    }));
    // Persist to Supabase + audit log
    if (alert) {
      // Pass existing values from local state to avoid a SELECT round-trip
      const existingValues: Record<string, any> = {
        severityLevel: alert.severityLevel,
        status: alert.status,
        sourceModule: alert.sourceModule,
        sourceRecordId: alert.sourceRecordId,
        kategori: alert.kategori,
        recommendation: alert.recommendation,
        doctorId: alert.doctorId,
        notes: alert.notes,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt,
      };
      firestoreSync.acknowledgeAlert(alertId, acknowledgedBy, notes, existingValues).catch(err => console.error('[Store] sync error (acknowledgeAlert):', err));
      useStore.getState().addPalliativeAuditEntry({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        patientId: alert.palliativePatientId || alert.patientId,
        action: 'alert_followed_up',
        performedBy: acknowledgedBy,
        performedByRole: 'doctor',
        details: `Alert acknowledged: ${alert.title}${notes ? ` | Note: ${notes}` : ''}`,
        createdAt: now,
      });
    }
  },
  resolvePalliativeAlert: (alertId, resolvedBy, notes) => {
    const state = useStore.getState();
    const alert = state.palliativeClinicalAlerts.find(a => a.id === alertId);
    const now = new Date().toISOString();
    set((state) => ({
      palliativeClinicalAlerts: state.palliativeClinicalAlerts.map(a =>
        a.id === alertId
          ? { ...a, isRead: true, status: 'RESOLVED', resolvedBy, resolvedAt: now, notes: notes ? `${a.notes ?? ''}\n---\n[${now}] ${notes}`.trim() : a.notes }
          : a
      ),
    }));
    // Persist to Supabase + audit log
    if (alert) {
      const existingValues: Record<string, any> = {
        severityLevel: alert.severityLevel,
        status: alert.status,
        sourceModule: alert.sourceModule,
        sourceRecordId: alert.sourceRecordId,
        kategori: alert.kategori,
        recommendation: alert.recommendation,
        doctorId: alert.doctorId,
        notes: alert.notes,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt,
      };
      firestoreSync.resolveAlert(alertId, resolvedBy, notes, existingValues).catch(err => console.error('[Store] sync error (resolveAlert):', err));
      useStore.getState().addPalliativeAuditEntry({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        patientId: alert.palliativePatientId || alert.patientId,
        action: 'alert_followed_up',
        performedBy: resolvedBy,
        performedByRole: 'doctor',
        details: `Alert resolved: ${alert.title}${notes ? ` | Note: ${notes}` : ''}`,
        createdAt: now,
      });
    }
  },
  addPalliativeAlertNote: (alertId, note) => {
    const state = useStore.getState();
    const alert = state.palliativeClinicalAlerts.find(a => a.id === alertId);
    set((state) => ({
      palliativeClinicalAlerts: state.palliativeClinicalAlerts.map(a =>
        a.id === alertId
          ? { ...a, notes: `${a.notes ?? ''}\n---\n[${new Date().toISOString()}] ${note}`.trim() }
          : a
      ),
    }));
    if (alert) {
      const existingValues: Record<string, any> = {
        severityLevel: alert.severityLevel,
        status: alert.status,
        sourceModule: alert.sourceModule,
        sourceRecordId: alert.sourceRecordId,
        kategori: alert.kategori,
        recommendation: alert.recommendation,
        doctorId: alert.doctorId,
        notes: alert.notes,
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt,
      };
      firestoreSync.addAlertNote(alertId, note, existingValues).catch(err => console.error('[Store] sync error (addAlertNote):', err));
    }
  },
  updatePalliativeClinicalAlert: (alertId, data) => {
    set((state) => ({
      palliativeClinicalAlerts: state.palliativeClinicalAlerts.map(a =>
        a.id === alertId ? { ...a, ...data } : a
      ),
    }));
  },
  setPalliativeClinicalAlerts: (alerts) => {
    set({ palliativeClinicalAlerts: alerts });
  },
  runClinicalAlertEngine: async (patientId) => {
    try {
      // Lazy-import the engine to avoid circular dependencies at load time.
      const { evaluateAndPersist, canScan } = await import('@/services/supabase/clinicalAlertEngine');
      // Throttle: skip if this patient was scanned less than 30s ago.
      // This prevents the realtime → scan → insert → realtime loop that
      // caused thousands of duplicate alerts.
      if (!canScan(patientId)) {
        console.log(`[Store] runClinicalAlertEngine THROTTLED for patient ${patientId}`);
        return 0;
      }
      const state = useStore.getState();
      const patient = state.palliativePatients.find(p => p.id === patientId);
      const doctorId = patient?.attendingDoctorId;
      const data = {
        patientId,
        doctorId,
        vitals: state.vitalSignRecords.filter(v => v.palliativePatientId === patientId),
        screenings: state.palliativeScreeningRecords.filter(s => s.palliativePatientId === patientId),
        medications: state.palliativeMedications.filter(m => m.palliativePatientId === patientId),
        nutrition: state.nutritionRecords.filter(n => n.palliativePatientId === patientId),
        dailyComplaints: state.dailyComplaints.filter(d => d.palliativePatientId === patientId),
        socialAssessments: state.socialAssessments.filter(s => s.palliativePatientId === patientId),
      };
      const created = await evaluateAndPersist(data);
      return created;
    } catch (err) {
      console.error('[Store] runClinicalAlertEngine error:', err);
      return 0;
    }
  },
  /**
   * Force-run the Clinical Alert Engine for a patient, bypassing the throttle.
   * Used by the manual "Scan" button in the Clinical Alert panel.
   */
  forceRunClinicalAlertEngine: async (patientId) => {
    try {
      const { evaluateAndPersist, resetThrottle } = await import('@/services/supabase/clinicalAlertEngine');
      resetThrottle(patientId);
      const state = useStore.getState();
      const patient = state.palliativePatients.find(p => p.id === patientId);
      const doctorId = patient?.attendingDoctorId;
      const data = {
        patientId,
        doctorId,
        vitals: state.vitalSignRecords.filter(v => v.palliativePatientId === patientId),
        screenings: state.palliativeScreeningRecords.filter(s => s.palliativePatientId === patientId),
        medications: state.palliativeMedications.filter(m => m.palliativePatientId === patientId),
        nutrition: state.nutritionRecords.filter(n => n.palliativePatientId === patientId),
        dailyComplaints: state.dailyComplaints.filter(d => d.palliativePatientId === patientId),
        socialAssessments: state.socialAssessments.filter(s => s.palliativePatientId === patientId),
      };
      const created = await evaluateAndPersist(data);
      return created;
    } catch (err) {
      console.error('[Store] forceRunClinicalAlertEngine error:', err);
      return 0;
    }
  },
  palliativeAuditLog: [] as PalliativeAuditEntry[],
  addPalliativeAuditEntry: (entry) => {
    set((state) => ({ palliativeAuditLog: [...state.palliativeAuditLog, entry] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('palliativeAuditLog', entry.id,
      firestoreSync.addAuditEntry(entry.patientId || '', { ...entry }));
  },

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
  markPatientAsPalliative: async (consultationId, doctorId, patientId, patientName, markingData) => {
    // Check if patient already exists in palliative patients
    const existing = useStore.getState().palliativePatients.some(p => p.patientId === patientId || p.id === patientId);
    if (existing) {
      console.log('[Store.markPatientAsPalliative] patient already exists, skipping');
      return null;
    }

    // Build the patient object WITHOUT a custom id — let Supabase generate
    // the real UUID. We never use "pp-..." style ids anymore.
    const newPatientData: PalliativePatientInfo = {
      id: '', // will be replaced by Supabase-generated UUID
      patientId,
      patientName,
      primaryDiagnosis: markingData.primaryDiagnosis,
      secondaryDiagnosis: markingData.secondaryDiagnosis,
      attendingDoctorId: doctorId,
      attendingDoctorName: useStore.getState().doctors.find(d => d.id === doctorId)?.name,
      careStatus: 'rawat_jalan',
      patientStatus: 'aktif',
      monitoringStatus: 'monitoring_aktif',
      riskLevel: 'kuning',
      markingData,
      consultationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[Store.markPatientAsPalliative] creating patient in Supabase:', {
      name: patientName,
      doctorId,
      doctorIdIsUuid: isValidUuid(doctorId),
    });

    try {
      const created = await patientService.create(newPatientData);
      if (!created) {
        console.error('[Store.markPatientAsPalliative] patientService.create returned null');
        return null;
      }
      console.log('[Store.markPatientAsPalliative] SUCCESS — real UUID:', created.id);

      // Add to local state with the real UUID
      set((state) => ({
        palliativePatients: [...state.palliativePatients, created],
      }));

      // Create notification (local-only — uses the real UUID as patientId)
      const notification: PalliativeMonitoringNotification = {
        id: `pn-${Date.now()}`,
        patientId: created.id,
        patientName,
        type: 'status_change',
        title: 'Pasien Baru Monitoring Paliatif',
        description: `${patientName} telah ditambahkan ke program monitoring paliatif`,
        severity: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        palliativeMonitoringNotifications: [notification, ...state.palliativeMonitoringNotifications],
      }));

      return created;
    } catch (err) {
      console.error('[Store.markPatientAsPalliative] error:', err);
      toast({
        title: 'Gagal menandai pasien paliatif',
        description: err instanceof Error ? err.message : 'Pasien tidak tersimpan ke database',
        variant: 'destructive',
      });
      return null;
    }
  },
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
  monitoringReturnTab: null as string | null,
  setMonitoringReturnTab: (tab) => set({ monitoringReturnTab: tab }),
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

  // Daily Complaint (Keluhan Harian)
  dailyComplaints: [] as DailyComplaintRecord[],
  setDailyComplaints: (complaints) => set({ dailyComplaints: complaints }),
  addDailyComplaint: (complaint) => {
    set((state) => ({ dailyComplaints: [complaint, ...state.dailyComplaints] }));
    // NOTE: Supabase persistence is handled by the /api/daily-complaints route
    // (called from the form panel). We intentionally do NOT call
    // firestoreSync.addKeluhan here — that would create a duplicate row.
  },

  // RVSM — empty initial state; data is populated when a device connects
  rvsmDevices: [] as WearableDevice[],
  addRvsmDevice: (device) => set((state) => ({ rvsmDevices: [...state.rvsmDevices, device] })),
  updateRvsmDevice: (deviceId, data) => set((state) => ({
    rvsmDevices: state.rvsmDevices.map(d => d.id === deviceId ? { ...d, ...data } : d),
  })),
  removeRvsmDevice: (deviceId) => set((state) => ({ rvsmDevices: state.rvsmDevices.filter(d => d.id !== deviceId) })),

  rvsmVitalData: [] as WearableVitalData[],
  addRvsmVitalData: (d) => set((state) => ({ rvsmVitalData: [...state.rvsmVitalData, d] })),

  rvsmAlerts: [] as RVSMAlert[],
  addRvsmAlert: (alert) => set((state) => ({ rvsmAlerts: [...state.rvsmAlerts, alert] })),
  markRvsmAlertRead: (alertId) => set((state) => ({
    rvsmAlerts: state.rvsmAlerts.map(a => a.id === alertId ? { ...a, isRead: true } : a),
  })),
  acknowledgeRvsmAlert: (alertId, acknowledgedBy) => set((state) => ({
    rvsmAlerts: state.rvsmAlerts.map(a => a.id === alertId ? { ...a, isAcknowledged: true, acknowledgedBy, acknowledgedAt: new Date().toISOString() } : a),
  })),

  rvsmDailyReports: [] as RVSMDailyReport[],
  addRvsmDailyReport: (report) => set((state) => ({ rvsmDailyReports: [...state.rvsmDailyReports, report] })),

  rvsmFamilyAccess: [] as RVSMFamilyAccess[],
  addRvsmFamilyAccess: (access) => set((state) => ({ rvsmFamilyAccess: [...state.rvsmFamilyAccess, access] })),
  removeRvsmFamilyAccess: (accessId) => set((state) => ({ rvsmFamilyAccess: state.rvsmFamilyAccess.filter(a => a.id !== accessId) })),

  rvsmAuditLog: [] as RVSMAuditEntry[],
  addRvsmAuditEntry: (entry) => set((state) => ({ rvsmAuditLog: [...state.rvsmAuditLog, entry] })),

  rvsmPalliativeEstimates: [] as RVSMPalliativeScoreEstimate[],
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
  setPalliativeResumes: (resumes) => set({ palliativeResumes: resumes }),
  addPalliativeResume: (resume) => {
    set((state) => ({ palliativeResumes: [...state.palliativeResumes, resume] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('palliativeResumes', resume.id,
      firestoreSync.addResume(resume.palliativePatientId, { ...resume }));
  },
  updatePalliativeResume: (resumeId, data) => {
    const state = useStore.getState();
    const resume = state.palliativeResumes.find(r => r.id === resumeId);
    set((state) => ({
      palliativeResumes: state.palliativeResumes.map(r =>
        r.id === resumeId ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
      ),
    }));
    // Persist to Firestore
    if (resume) {
      firestoreSync.updateResume(resume.palliativePatientId, resumeId, data).catch(err => console.error('[Store] Firestore sync error (updateResume):', err));
    }
  },
  palliativeReferralLetters: [] as PalliativeReferralLetter[],
  setPalliativeReferralLetters: (letters) => set({ palliativeReferralLetters: letters }),
  addPalliativeReferralLetter: (letter) => {
    set((state) => ({ palliativeReferralLetters: [...state.palliativeReferralLetters, letter] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('palliativeReferralLetters', letter.id,
      firestoreSync.addReferralLetter(letter.palliativePatientId, { ...letter }));
  },
  updatePalliativeReferralLetter: (letterId, data) => {
    const existing = useStore.getState().palliativeReferralLetters.find(l => l.id === letterId);
    set((state) => ({
      palliativeReferralLetters: state.palliativeReferralLetters.map(l =>
        l.id === letterId ? { ...l, ...data, updatedAt: new Date().toISOString() } : l
      ),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateReferralLetter(existing.palliativePatientId, letterId, data).catch(err => console.error('[Store] Firestore sync error (updateReferralLetter):', err));
    }
  },
  palliativeDocumentAuditLog: [] as PalliativeDocumentAuditEntry[],
  addPalliativeDocumentAuditEntry: (entry) => set((state) => ({ palliativeDocumentAuditLog: [...state.palliativeDocumentAuditLog, entry] })),

  // Social Support Management — empty initial state; loaded from Supabase
  socialAssessments: [] as SocialAssessmentRecord[],
  setSocialAssessments: (records) => set({ socialAssessments: records }),
  addSocialAssessment: (record) => {
    set((state) => ({ socialAssessments: [...state.socialAssessments, record] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('socialAssessments', record.id,
      firestoreSync.addSosial(record.palliativePatientId, { ...record }));
  },
  updateSocialAssessment: (id, data) => {
    set((state) => ({
      socialAssessments: state.socialAssessments.map(a => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a),
    }));
    // Persist to Supabase
    const existing = useStore.getState().socialAssessments.find(a => a.id === id);
    if (existing) {
      firestoreSync.updateSosial(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateSosial):', err));
    }
  },
  caregivers: [] as CaregiverInfo[],
  setCaregivers: (caregivers) => set({ caregivers }),
  addCaregiver: (caregiver) => {
    set((state) => ({ caregivers: [...state.caregivers, caregiver] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('caregivers', caregiver.id,
      firestoreSync.addCaregiver(caregiver.palliativePatientId, { ...caregiver }));
  },
  updateCaregiver: (id, data) => {
    const existing = useStore.getState().caregivers.find(c => c.id === id);
    set((state) => ({
      caregivers: state.caregivers.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateCaregiver(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateCaregiver):', err));
    }
  },
  removeCaregiver: (id) => {
    const existing = useStore.getState().caregivers.find(c => c.id === id);
    set((state) => ({ caregivers: state.caregivers.filter(c => c.id !== id) }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.removeCaregiver(existing.palliativePatientId, id).catch(err => console.error('[Store] Firestore sync error (removeCaregiver):', err));
    }
  },
  familyMeetings: [] as FamilyMeetingRecord[],
  setFamilyMeetings: (meetings) => set({ familyMeetings: meetings }),
  addFamilyMeeting: (meeting) => {
    set((state) => ({ familyMeetings: [...state.familyMeetings, meeting] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('familyMeetings', meeting.id,
      firestoreSync.addFamilyMeeting(meeting.palliativePatientId, { ...meeting }));
  },
  updateFamilyMeeting: (id, data) => {
    const existing = useStore.getState().familyMeetings.find(m => m.id === id);
    set((state) => ({
      familyMeetings: state.familyMeetings.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateFamilyMeeting(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateFamilyMeeting):', err));
    }
  },
  // Edu materials are general (not patient-specific) — kept as default catalog
  eduMaterials: [
    { id: 'edu-1', title: 'Panduan Perawatan Pasien Paliatif di Rumah', category: 'perawatan_rumah' as const, description: 'Panduan lengkap perawatan harian pasien paliatif di rumah', type: 'pdf' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-2', title: 'Cara Mengelola Nyeri di Rumah', category: 'perawatan_rumah' as const, description: 'Tips dan panduan manajemen nyeri untuk caregiver', type: 'artikel' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-3', title: 'Panduan Caregiver: Menjaga Kesehatan Mental', category: 'panduan_caregiver' as const, description: 'Self-care untuk caregiver agar tidak burnout', type: 'artikel' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-4', title: 'Video: Posisi Nyaman Pasien Bed Rest', category: 'video_edukasi' as const, description: 'Video tutorial posisi nyaman dan pencegahan dekubitus', type: 'video' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-5', title: 'Dukungan Psikososial untuk Keluarga', category: 'dukungan_psikososial' as const, description: 'Mengenali tanda stres dan cara mengatasinya', type: 'artikel' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-6', title: 'Kapan Harus ke UGD?', category: 'gawat_darurat' as const, description: 'Panduan mengenali tanda bahaya yang memerlukan penanganan darurat', type: 'infografis' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-7', title: 'Persiapan Akhir Kehidupan', category: 'end_of_life' as const, description: 'Panduan mempersiapkan tahap akhir kehidupan dengan bermartabat', type: 'pdf' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'edu-8', title: 'FAQ: Pertanyaan Umum Keluarga Pasien Paliatif', category: 'faq' as const, description: 'Jawaban atas pertanyaan yang sering diajukan keluarga', type: 'faq' as const, accessCount: 0, accessLogs: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
  familyCoordinationNotes: [] as FamilyCoordinationNote[],
  setFamilyCoordinationNotes: (notes) => set({ familyCoordinationNotes: notes }),
  addFamilyCoordinationNote: (note) => {
    set((state) => ({ familyCoordinationNotes: [...state.familyCoordinationNotes, note] }));
    // Persist to Supabase, then reconcile the temp id → real DB id (this is
    // the fix for the duplicate "beli obat generik" row bug).
    reconcileOptimisticRecord('familyCoordinationNotes', note.id,
      firestoreSync.addFamilyCoordinationNote(note.palliativePatientId, { ...note }));
  },
  updateFamilyCoordinationNote: (id, data) => {
    const existing = useStore.getState().familyCoordinationNotes.find(n => n.id === id);
    set((state) => ({
      familyCoordinationNotes: state.familyCoordinationNotes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateFamilyCoordinationNote(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateFamilyCoordinationNote):', err));
    }
  },
  emergencyContacts: [] as EmergencyContact[],
  setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),
  addEmergencyContact: (contact) => {
    set((state) => ({ emergencyContacts: [...state.emergencyContacts, contact] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('emergencyContacts', contact.id,
      firestoreSync.addEmergencyContact(contact.palliativePatientId, { ...contact }));
  },
  updateEmergencyContact: (id, data) => {
    const existing = useStore.getState().emergencyContacts.find(c => c.id === id);
    set((state) => ({
      emergencyContacts: state.emergencyContacts.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateEmergencyContact(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateEmergencyContact):', err));
    }
  },
  removeEmergencyContact: (id) => {
    const existing = useStore.getState().emergencyContacts.find(c => c.id === id);
    set((state) => ({ emergencyContacts: state.emergencyContacts.filter(c => c.id !== id) }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.removeEmergencyContact(existing.palliativePatientId, id).catch(err => console.error('[Store] Firestore sync error (removeEmergencyContact):', err));
    }
  },
  financialSupportRecords: [] as FinancialSupportRecord[],
  setFinancialSupportRecords: (records) => set({ financialSupportRecords: records }),
  addFinancialSupportRecord: (record) => {
    set((state) => ({ financialSupportRecords: [...state.financialSupportRecords, record] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('financialSupportRecords', record.id,
      firestoreSync.addFinancialSupport(record.palliativePatientId, { ...record }));
  },
  updateFinancialSupportRecord: (id, data) => {
    const existing = useStore.getState().financialSupportRecords.find(r => r.id === id);
    set((state) => ({
      financialSupportRecords: state.financialSupportRecords.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateFinancialSupport(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateFinancialSupport):', err));
    }
  },
  transportRecords: [] as TransportRecord[],
  setTransportRecords: (records) => set({ transportRecords: records }),
  addTransportRecord: (record) => {
    set((state) => ({ transportRecords: [...state.transportRecords, record] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('transportRecords', record.id,
      firestoreSync.addTransportRecord(record.palliativePatientId, { ...record }));
  },
  updateTransportRecord: (id, data) => {
    const existing = useStore.getState().transportRecords.find(r => r.id === id);
    set((state) => ({
      transportRecords: state.transportRecords.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateTransportRecord(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateTransportRecord):', err));
    }
  },
  familySupportMaterials: [] as FamilySupportMaterial[],
  setFamilySupportMaterials: (materials) => set({ familySupportMaterials: materials }),
  addFamilySupportMaterial: (material) => {
    set((state) => ({ familySupportMaterials: [...state.familySupportMaterials, material] }));
    // Persist to Supabase, then reconcile the temp id → real DB id.
    reconcileOptimisticRecord('familySupportMaterials', material.id,
      firestoreSync.addFamilySupportMaterial(material.palliativePatientId, { ...material }));
  },
  updateFamilySupportMaterial: (id, data) => {
    const existing = useStore.getState().familySupportMaterials.find(m => m.id === id);
    set((state) => ({
      familySupportMaterials: state.familySupportMaterials.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m),
    }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.updateFamilySupportMaterial(existing.palliativePatientId, id, data).catch(err => console.error('[Store] Firestore sync error (updateFamilySupportMaterial):', err));
    }
  },
  removeFamilySupportMaterial: (id) => {
    const existing = useStore.getState().familySupportMaterials.find(m => m.id === id);
    set((state) => ({ familySupportMaterials: state.familySupportMaterials.filter(m => m.id !== id) }));
    // Persist to Supabase
    if (existing) {
      firestoreSync.removeFamilySupportMaterial(existing.palliativePatientId, id).catch(err => console.error('[Store] Firestore sync error (removeFamilySupportMaterial):', err));
    }
  },
  socialAlerts: [] as SocialMonitoringAlert[],
  addSocialAlert: (alert) => set((state) => ({ socialAlerts: [...state.socialAlerts, alert] })),
  markSocialAlertRead: (alertId) => set((state) => ({
    socialAlerts: state.socialAlerts.map(a => a.id === alertId ? { ...a, isRead: true } : a),
  })),

  // AI Social Needs Analysis
  aiSocialAnalysisResult: null,
  setAiSocialAnalysisResult: (result) => set({ aiSocialAnalysisResult: result }),
  aiSocialAnalysisLoading: false,
  setAiSocialAnalysisLoading: (loading) => set({ aiSocialAnalysisLoading: loading }),
  aiSocialAnalysisRecords: [],
  addAiSocialAnalysisRecord: (record) => set((state) => ({ aiSocialAnalysisRecords: [...state.aiSocialAnalysisRecords, record] })),
  aiSocialPopulationStats: null,
  setAiSocialPopulationStats: (stats) => set({ aiSocialPopulationStats: stats }),

  // Patient Paliatif Module — empty initial state; loaded from Supabase
  patientTransportRequests: [] as PatientTransportRequest[],
  addPatientTransportRequest: (request) => set((state) => ({ patientTransportRequests: [...state.patientTransportRequests, request] })),
  updatePatientTransportRequest: (id, data) => set((state) => ({
    patientTransportRequests: state.patientTransportRequests.map(r =>
      r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
    ),
  })),
  patientCareUpdates: [] as PatientCareUpdate[],
  addPatientCareUpdate: (update) => set((state) => ({ patientCareUpdates: [...state.patientCareUpdates, update] })),
  markCareUpdateViewed: (id) => set((state) => ({
    patientCareUpdates: state.patientCareUpdates.map(u =>
      u.id === id ? { ...u, viewedByDoctor: true } : u
    ),
  })),
  patientPaliatifMessages: [] as PatientPaliatifChatMessage[],
  addPatientPaliatifMessage: (message) => set((state) => ({ patientPaliatifMessages: [...state.patientPaliatifMessages, message] })),
}));
