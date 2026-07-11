// ───────────────────────────────────────────────────────────────────────────
// socialService — Supabase CRUD for `social_assessments`
// ───────────────────────────────────────────────────────────────────────────
//
// NOTE: The DB table does not have per-item `*Notes` columns. Those TS fields
// are left `undefined` on read and silently dropped on write. If you need to
// persist notes, store them inside the `recommendations` JSON.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';
import type { SocialAssessmentRecord } from '@/lib/types';

function fromDb(row: any): SocialAssessmentRecord {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    housingCondition: row.housing_condition ?? 'layak',
    caregiverAvailability: row.caregiver_availability ?? 'tersedia',
    familySupportLevel: row.family_support_level ?? 'cukup',
    transportDifficulty: row.transport_difficulty ?? 'tidak_ada',
    economicConstraint: row.economic_constraint ?? 'tidak_ada',
    healthcareAccess: row.healthcare_access ?? 'mudah',
    medicalEquipmentNeed: row.medical_equipment_need ?? 'tidak_ada',
    socialAssistanceNeed: row.social_assistance_need ?? 'tidak_ada',
    socialIsolationRisk: row.social_isolation_risk ?? 'rendah',
    overallStatus: row.overall_status ?? 'lengkap',
    priorityLevel: row.priority_level ?? 'rendah',
    recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
    assessedBy: row.assessed_by ?? '',
    assessedByRole: (row.assessed_by_role as any) ?? 'palliative_team',
    assessedAt: row.assessed_at ?? new Date().toISOString(),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<SocialAssessmentRecord>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined) out.patient_id = data.palliativePatientId;
  if (data.housingCondition !== undefined) out.housing_condition = data.housingCondition;
  if (data.caregiverAvailability !== undefined) out.caregiver_availability = data.caregiverAvailability;
  if (data.familySupportLevel !== undefined) out.family_support_level = data.familySupportLevel;
  if (data.transportDifficulty !== undefined) out.transport_difficulty = data.transportDifficulty;
  if (data.economicConstraint !== undefined) out.economic_constraint = data.economicConstraint;
  if (data.healthcareAccess !== undefined) out.healthcare_access = data.healthcareAccess;
  if (data.medicalEquipmentNeed !== undefined) out.medical_equipment_need = data.medicalEquipmentNeed;
  if (data.socialAssistanceNeed !== undefined) out.social_assistance_need = data.socialAssistanceNeed;
  if (data.socialIsolationRisk !== undefined) out.social_isolation_risk = data.socialIsolationRisk;
  if (data.overallStatus !== undefined) out.overall_status = data.overallStatus;
  if (data.priorityLevel !== undefined) out.priority_level = data.priorityLevel;
  if (data.recommendations !== undefined) out.recommendations = data.recommendations;
  if (data.assessedBy !== undefined) out.assessed_by = data.assessedBy;
  if (data.assessedByRole !== undefined) out.assessed_by_role = data.assessedByRole;
  if (data.assessedAt !== undefined) out.assessed_at = data.assessedAt;
  return stripUndefined(out);
}

export const socialService = {
  async getAll(patientId: string): Promise<SocialAssessmentRecord[]> {
    const rows = await safeQuery(
      supabase
        .from('social_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('assessed_at', { ascending: false }),
      [] as any[],
      'socialService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<SocialAssessmentRecord>): Promise<SocialAssessmentRecord | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('social_assessments').insert(payload).select().single(),
      null as any,
      'socialService.create'
    );
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<SocialAssessmentRecord>): Promise<SocialAssessmentRecord | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('social_assessments').update(payload).eq('id', id).select().single(),
      null as any,
      'socialService.update'
    );
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('social_assessments').delete().eq('id', id),
      null as any,
      'socialService.remove'
    );
    return res !== null;
  },
};
