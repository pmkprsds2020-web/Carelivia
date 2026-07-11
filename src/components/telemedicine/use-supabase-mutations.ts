// ───────────────────────────────────────────────────────────────────────────
// useSupabaseMutations — write-through hook for Monitoring-Paliatif data.
//
// Pattern: every mutation does TWO things in order:
//   1. Updates the local Zustand store synchronously (UI is immediately
//      responsive — no waiting on the network).
//   2. Writes through to Supabase via the service layer, fire-and-forget.
//      Failures are logged via `.catch()` and never break the flow.
//
// All functions return the local record so callers can use it immediately.
// ───────────────────────────────────────────────────────────────────────────
'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import * as svc from '@/services/supabase';
import { supabase, safeQuery } from '@/services/supabase';
import type {
  PalliativePatientInfo,
  VitalSignRecordInfo,
  PalliativeMedicationInfo,
  PalliativeScreeningRecordInfo,
  NutritionRecordInfo,
  DailyComplaintRecord,
  SocialAssessmentRecord,
  AdvanceCarePlanInfo,
  PalliativeClinicalAlert,
  PalliativeAuditEntry,
} from '@/lib/types';

export function useSupabaseMutations() {
  const store = useStore();

  // ── Patients ────────────────────────────────────────────────────────────

  const createPatient = useCallback(
    async (data: PalliativePatientInfo): Promise<PalliativePatientInfo | null> => {
      // store.addPalliativePatient now handles the Supabase create internally
      // and returns the created patient with the real UUID. We must NOT call
      // svc.patientService.create() separately here — that would create a
      // duplicate row in Supabase.
      console.log('[useSupabaseMutations.createPatient] delegating to store.addPalliativePatient:', {
        name: data.patientName,
        rm: data.rmNumber,
        temporaryId: data.id,
      });
      return store.addPalliativePatient(data);
    },
    [store]
  );

  const updatePatient = useCallback(
    (id: string, data: Partial<PalliativePatientInfo>): void => {
      store.updatePalliativePatient(id, data);
      svc.patientService
        .update(id, data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] updatePatient skipped:', e));
    },
    [store]
  );

  const deletePatient = useCallback(
    (id: string): void => {
      store.removePalliativePatient(id);
      svc.patientService
        .remove(id)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] deletePatient skipped:', e));
    },
    [store]
  );

  // ── Vitals ──────────────────────────────────────────────────────────────

  const createVital = useCallback(
    (data: VitalSignRecordInfo): VitalSignRecordInfo => {
      store.addVitalSignRecord(data);
      svc.vitalService
        .create(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createVital skipped:', e));
      return data;
    },
    [store]
  );

  // ── Screenings ──────────────────────────────────────────────────────────

  const createScreening = useCallback(
    (data: PalliativeScreeningRecordInfo): PalliativeScreeningRecordInfo => {
      store.addPalliativeScreeningRecord(data);
      svc.screeningService
        .create(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createScreening skipped:', e));
      return data;
    },
    [store]
  );

  // ── Medications ─────────────────────────────────────────────────────────

  const createMedication = useCallback(
    (data: PalliativeMedicationInfo): PalliativeMedicationInfo => {
      store.addPalliativeMedication(data);
      svc.medicationService
        .create(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createMedication skipped:', e));
      return data;
    },
    [store]
  );

  const updateMedication = useCallback(
    (id: string, data: Partial<PalliativeMedicationInfo>): void => {
      store.updatePalliativeMedication(id, data);
      svc.medicationService
        .update(id, data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] updateMedication skipped:', e));
    },
    [store]
  );

  const deleteMedication = useCallback(
    (id: string): void => {
      // The store doesn't expose a removeMedication action — filter directly.
      useStore.setState((s) => ({
        palliativeMedications: s.palliativeMedications.filter((m) => m.id !== id),
      }));
      svc.medicationService
        .remove(id)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] deleteMedication skipped:', e));
    },
    [store]
  );

  // ── Nutrition ───────────────────────────────────────────────────────────

  const createNutrition = useCallback(
    (data: NutritionRecordInfo): NutritionRecordInfo => {
      store.addNutritionRecord(data);
      svc.nutritionService
        .create(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createNutrition skipped:', e));
      return data;
    },
    [store]
  );

  // ── Daily Complaints ────────────────────────────────────────────────────

  const createComplaint = useCallback(
    (data: DailyComplaintRecord): DailyComplaintRecord => {
      store.addDailyComplaint(data);
      svc.complaintService
        .create(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createComplaint skipped:', e));
      return data;
    },
    [store]
  );

  // ── Social Assessments ──────────────────────────────────────────────────

  const createSocialAssessment = useCallback(
    (data: SocialAssessmentRecord): SocialAssessmentRecord => {
      store.addSocialAssessment(data);
      svc.socialService
        ?.create?.(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createSocialAssessment skipped:', e));
      return data;
    },
    [store]
  );

  // ── Advance Care Planning ───────────────────────────────────────────────

  const createACP = useCallback(
    (data: AdvanceCarePlanInfo): AdvanceCarePlanInfo => {
      store.addAdvanceCarePlan(data);
      svc.acpService
        ?.create?.(data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] createACP skipped:', e));
      return data;
    },
    [store]
  );

  const updateACP = useCallback(
    (id: string, data: Partial<AdvanceCarePlanInfo>): void => {
      store.updateAdvanceCarePlan(id, data);
      svc.acpService
        ?.update?.(id, data)
        .catch((e: unknown) => console.warn('[useSupabaseMutations] updateACP skipped:', e));
    },
    [store]
  );

  // ── Clinical Alerts ─────────────────────────────────────────────────────
  //
  // Alerts are mostly internal — there's no dedicated `alertService` in the
  // sibling agent's contract, but we still try to persist them via a direct
  // Supabase insert wrapped in `safeQuery` so it never throws.

  const createAlert = useCallback(
    (data: PalliativeClinicalAlert): PalliativeClinicalAlert => {
      store.addPalliativeClinicalAlert(data);
      safeQuery(
        supabase.from('clinical_alerts').insert({
          id: data.id,
          patient_id: data.patientId,
          alert_type: data.alertType,
          severity: data.severity,
          title: data.title,
          description: data.description,
          values: data.values ?? null,
          is_read: data.isRead,
          created_at: data.createdAt,
        }),
        null,
        'useSupabaseMutations.createAlert'
      ).catch((e: unknown) => console.warn('[useSupabaseMutations] createAlert skipped:', e));
      return data;
    },
    [store]
  );

  // ── Audit Entries ───────────────────────────────────────────────────────
  //
  // Same pattern as alerts — no dedicated service, so write directly.

  const createAuditEntry = useCallback(
    (data: PalliativeAuditEntry): PalliativeAuditEntry => {
      store.addPalliativeAuditEntry(data);
      safeQuery(
        supabase.from('audit_log').insert({
          id: data.id,
          patient_id: data.patientId,
          action: data.action,
          performed_by: data.performedBy,
          performed_by_role: data.performedByRole,
          details: data.details ?? null,
          ip_address: data.ipAddress ?? null,
          device: data.device ?? null,
          created_at: data.createdAt,
        }),
        null,
        'useSupabaseMutations.createAuditEntry'
      ).catch((e: unknown) => console.warn('[useSupabaseMutations] createAuditEntry skipped:', e));
      return data;
    },
    [store]
  );

  return {
    createPatient,
    updatePatient,
    deletePatient,
    createVital,
    createScreening,
    createMedication,
    updateMedication,
    deleteMedication,
    createNutrition,
    createComplaint,
    createSocialAssessment,
    createACP,
    updateACP,
    createAlert,
    createAuditEntry,
  };
}
