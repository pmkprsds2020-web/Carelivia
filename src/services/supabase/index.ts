// ───────────────────────────────────────────────────────────────────────────
// Supabase service layer — barrel exports
// ───────────────────────────────────────────────────────────────────────────
//
// Import any service like:
//   import { patientService, vitalService } from '@/services/supabase';
//
// Every method on every service is non-throwing: on Supabase error it logs
// `[Supabase:<label>]` and returns a fallback (null / []) so callers can
// gracefully fall back to local Zustand data.
// ───────────────────────────────────────────────────────────────────────────

export {
  supabase,
  safeQuery,
  safeInsert,
  snakeToCamelRow,
  camelToSnakeRow,
  UUID_RE,
  isValidUuid,
  validUuidOrUndefined,
} from './_common';

export { patientService } from './patientService';
export { vitalService } from './vitalService';
export { screeningService } from './screeningService';
export { medicationService } from './medicationService';
export type { MedicationWithExtras } from './medicationService';
export { nutritionService } from './nutritionService';
export { complaintService } from './complaintService';
export { medicalSystemReviewService } from './medicalSystemReviewService';
export { screeningFormService } from './screeningFormService';
export { palliativeScreeningFormService } from './palliativeScreeningFormService';
export { medicalRecordService } from './medicalRecordService';
export { prescriptionService } from './prescriptionService';
export { socialService } from './socialService';
export { acpService } from './acpService';
export { chatService } from './chatService';
export type { SendMessageInput } from './chatService';
export { documentService } from './documentService';
export type { PatientDocument } from './documentService';
export { notificationService } from './notificationService';
export type { AppNotification } from './notificationService';
export { dashboardService } from './dashboardService';
export type { DashboardStats } from './dashboardService';
export { aiService } from './aiService';
export type { AIReport } from './aiService';
// ── New services for previously local-only modules ─────────────────────────
export { caregiverService } from './caregiverService';
export { familyMeetingService } from './familyMeetingService';
export { familyCoordinationNoteService } from './familyCoordinationNoteService';
export { emergencyContactService } from './emergencyContactService';
export { financialSupportService } from './financialSupportService';
export { transportRecordService } from './transportRecordService';
export { familySupportMaterialService } from './familySupportMaterialService';
export { referralLetterService } from './referralLetterService';
export { palliativeResumeService } from './palliativeResumeService';
// ── Clinical Alert EWS module ───────────────────────────────────────────────
export { clinicalAlertService } from './clinicalAlertService';
export type { CreateAlertInput } from './clinicalAlertService';
export { evaluatePatient, evaluateAndPersist } from './clinicalAlertEngine';
export type { AlertCandidate, EnginePatientData } from './clinicalAlertEngine';
// ── Service catalog (Admin: Kelola Harga → Tambah Layanan) ──────────────────
export { serviceCatalogService } from './serviceCatalogService';
export type { ServiceItem, ServiceInput, ServiceStatus } from './serviceCatalogService';
// ── Supporting examinations (Pemeriksaan Penunjang) ─────────────────────────
export { supportingExamService } from './supportingExamService';
export {
  JENIS_USG_OPTIONS,
  JENIS_RADIOLOGI_OPTIONS,
  STORAGE_SETUP_SQL,
} from './supportingExamService';
export type {
  ExamType,
  LabResult,
  USGResult,
  ECGResult,
  RadiologyResult,
  SupportingExamUnion,
  LabInput,
  USGInput,
  ECGInput,
  RadiologyInput,
  UploadProgressCb,
} from './supportingExamService';
// ── Telemedicine module (doctors, medicines, consultations, homecare) ──────
export { doctorService } from './doctorService';
export type { DoctorRecord, DoctorFilters } from './doctorService';
export { medicineService } from './medicineService';
export type { MedicineRecord, MedicineFilters } from './medicineService';
export { consultationService } from './consultationService';
export type { ConsultationFilters } from './consultationService';
export { homecareService } from './homecareService';
export type { HomecareServiceRecord, HomecareBookingRecord, HomecareServiceInput, HomecareStaffRecord } from './homecareService';
export { paymentService } from './paymentService';
export type { PaymentRecord, PaymentReferenceType, PaymentStatus } from './paymentService';
export { paymentAccountService } from './paymentAccountService';
export type { PaymentAccountRecord, PaymentAccountInput, PaymentAccountMethod } from './paymentAccountService';
export { pharmacyService } from './pharmacyService';
export type { PharmacyOrderRecord, PharmacyOrderItemInput } from './pharmacyService';
export { revenueService } from './revenueService';
export type { RevenueEntry, DoctorRevenueStats } from './revenueService';
export { userService } from './userService';
export type { UserProfileRecord } from './userService';
export { adminDashboardService } from './adminDashboardService';
