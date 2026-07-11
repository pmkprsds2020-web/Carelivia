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
