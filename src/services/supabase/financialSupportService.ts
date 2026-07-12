// ───────────────────────────────────────────────────────────────────────────
// financialSupportService — Supabase CRUD for `financial_support`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §12):
//   id, patient_id, insurance_status, insurance_details, bpjs_number,
//   social_aid_status, social_aid_details, treatment_cost_need,
//   medical_equipment_cost_need, transport_cost_need, notes,
//   created_at, updated_at
//
// The TS type `FinancialSupportRecord` has extra fields (`recommendedPrograms`,
// `assessedBy`, `assessedAt`) that don't exist as DB columns — those are
// tucked into `notes` as a JSON prefix so they survive a round-trip.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, safeJsonParse } from './_common';
import type { FinancialSupportRecord } from '@/lib/types';

const EXTRAS_PREFIX = '__EXTRAS__:';

function fromDb(row: any): FinancialSupportRecord {
  const rawNotes: string = row.notes ?? '';
  let extras: { recommendedPrograms?: string[]; assessedBy?: string; assessedAt?: string } = {};
  let notes: string | undefined = rawNotes;
  if (rawNotes.startsWith(EXTRAS_PREFIX)) {
    extras = safeJsonParse<any>(rawNotes.slice(EXTRAS_PREFIX.length), {});
    notes = undefined;
  }
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    insuranceStatus: (row.insurance_status as any) ?? 'tidak_memiliki',
    insuranceDetails: row.insurance_details ?? undefined,
    bpjsNumber: row.bpjs_number ?? undefined,
    socialAidStatus: (row.social_aid_status as any) ?? 'belum_menerima',
    socialAidDetails: row.social_aid_details ?? undefined,
    treatmentCostNeed: (row.treatment_cost_need as any) ?? 'tidak_ada',
    medicalEquipmentCostNeed: (row.medical_equipment_cost_need as any) ?? 'tidak_ada',
    transportCostNeed: (row.transport_cost_need as any) ?? 'tidak_ada',
    recommendedPrograms: extras.recommendedPrograms ?? [],
    notes,
    assessedBy: extras.assessedBy ?? '',
    assessedAt: extras.assessedAt ?? row.created_at ?? new Date().toISOString(),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<FinancialSupportRecord>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.insuranceStatus !== undefined) out.insurance_status = data.insuranceStatus;
  if (data.insuranceDetails !== undefined) out.insurance_details = data.insuranceDetails;
  if (data.bpjsNumber !== undefined) out.bpjs_number = data.bpjsNumber;
  if (data.socialAidStatus !== undefined) out.social_aid_status = data.socialAidStatus;
  if (data.socialAidDetails !== undefined) out.social_aid_details = data.socialAidDetails;
  if (data.treatmentCostNeed !== undefined) out.treatment_cost_need = data.treatmentCostNeed;
  if (data.medicalEquipmentCostNeed !== undefined) out.medical_equipment_cost_need = data.medicalEquipmentCostNeed;
  if (data.transportCostNeed !== undefined) out.transport_cost_need = data.transportCostNeed;

  // Encode extra TS-only fields (recommendedPrograms, assessedBy, assessedAt)
  // into `notes` as a JSON prefix, then append any actual notes.
  if (data.recommendedPrograms !== undefined || data.assessedBy !== undefined ||
      data.assessedAt !== undefined || data.notes !== undefined) {
    const extras: Record<string, any> = {};
    if (data.recommendedPrograms !== undefined) extras.recommendedPrograms = data.recommendedPrograms;
    if (data.assessedBy !== undefined) extras.assessedBy = data.assessedBy;
    if (data.assessedAt !== undefined) extras.assessedAt = data.assessedAt;
    const userNotes = data.notes ?? '';
    out.notes = Object.keys(extras).length > 0
      ? `${EXTRAS_PREFIX}${JSON.stringify(extras)}${userNotes ? ' ' + userNotes : ''}`
      : userNotes;
  }
  return stripUndefined(out);
}

export const financialSupportService = {
  async getAll(patientId: string): Promise<FinancialSupportRecord[]> {
    const rows = await safeQuery(
      supabase
        .from('financial_support')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'financialSupportService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<FinancialSupportRecord>): Promise<FinancialSupportRecord | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[financialSupportService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[financialSupportService.create] payload:', { patient_id: data.palliativePatientId });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('financial_support').insert(payload).select().single(),
      'financialSupportService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<FinancialSupportRecord>): Promise<FinancialSupportRecord | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('financial_support').update(payload).eq('id', id).select().single(),
      'financialSupportService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('financial_support').delete().eq('id', id),
      null as any,
      'financialSupportService.remove'
    );
    return res !== null;
  },
};
