// ───────────────────────────────────────────────────────────────────────────
// acpService — Supabase CRUD for `acp` (Advance Care Planning)
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid } from './_common';
import type { AdvanceCarePlanInfo, ACPRevisionInfo } from '@/lib/types';

function fromDb(row: any): AdvanceCarePlanInfo {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    decisionMakerName: row.decision_maker_name ?? undefined,
    decisionMakerRelation: row.decision_maker_relation ?? undefined,
    decisionMakerPhone: row.decision_maker_phone ?? undefined,
    preferredCareLocation: row.preferred_care_location ?? undefined,
    careGoal: row.care_goal ?? undefined,
    resuscitationPref: row.resuscitation_pref ?? undefined,
    ventilatorPref: row.ventilator_pref ?? undefined,
    icuPref: row.icu_pref ?? undefined,
    artificialNutrition: row.artificial_nutrition ?? undefined,
    dialysisPref: row.dialysis_pref ?? undefined,
    organDonation: row.organ_donation ?? undefined,
    patientHopes: row.patient_hopes ?? undefined,
    patientWorries: row.patient_worries ?? undefined,
    lifeValues: row.life_values ?? undefined,
    endOfLifePrefs: row.end_of_life_prefs ?? undefined,
    patientSigned: row.patient_signed ?? false,
    familySigned: row.family_signed ?? false,
    doctorSigned: row.doctor_signed ?? false,
    signedAt: row.signed_at ?? undefined,
    isActive: row.is_active ?? true,
    revisions: Array.isArray(row.revisions) ? (row.revisions as ACPRevisionInfo[]) : [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<AdvanceCarePlanInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  // patient_id is a NOT NULL uuid FK — only forward if it's a real UUID.
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.decisionMakerName !== undefined) out.decision_maker_name = data.decisionMakerName;
  if (data.decisionMakerRelation !== undefined) out.decision_maker_relation = data.decisionMakerRelation;
  if (data.decisionMakerPhone !== undefined) out.decision_maker_phone = data.decisionMakerPhone;
  if (data.preferredCareLocation !== undefined) out.preferred_care_location = data.preferredCareLocation;
  if (data.careGoal !== undefined) out.care_goal = data.careGoal;
  if (data.resuscitationPref !== undefined) out.resuscitation_pref = data.resuscitationPref;
  if (data.ventilatorPref !== undefined) out.ventilator_pref = data.ventilatorPref;
  if (data.icuPref !== undefined) out.icu_pref = data.icuPref;
  if (data.artificialNutrition !== undefined) out.artificial_nutrition = data.artificialNutrition;
  if (data.dialysisPref !== undefined) out.dialysis_pref = data.dialysisPref;
  if (data.organDonation !== undefined) out.organ_donation = data.organDonation;
  if (data.patientHopes !== undefined) out.patient_hopes = data.patientHopes;
  if (data.patientWorries !== undefined) out.patient_worries = data.patientWorries;
  if (data.lifeValues !== undefined) out.life_values = data.lifeValues;
  if (data.endOfLifePrefs !== undefined) out.end_of_life_prefs = data.endOfLifePrefs;
  if (data.patientSigned !== undefined) out.patient_signed = data.patientSigned;
  if (data.familySigned !== undefined) out.family_signed = data.familySigned;
  if (data.doctorSigned !== undefined) out.doctor_signed = data.doctorSigned;
  if (data.signedAt !== undefined) out.signed_at = data.signedAt;
  if (data.isActive !== undefined) out.is_active = data.isActive;
  if (data.revisions !== undefined) out.revisions = data.revisions;
  return stripUndefined(out);
}

export const acpService = {
  async getAll(patientId: string): Promise<AdvanceCarePlanInfo[]> {
    const rows = await safeQuery(
      supabase
        .from('acp')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'acpService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async getActive(patientId: string): Promise<AdvanceCarePlanInfo | null> {
    const rows = await safeQuery(
      supabase
        .from('acp')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1),
      [] as any[],
      'acpService.getActive'
    );
    const arr = rows as any[];
    return arr.length > 0 ? fromDb(arr[0]) : null;
  },

  async create(data: Partial<AdvanceCarePlanInfo>): Promise<AdvanceCarePlanInfo | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[acpService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[acpService.create] payload:', { patient_id: data.palliativePatientId });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('acp').insert(payload).select().single(),
      'acpService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<AdvanceCarePlanInfo>): Promise<AdvanceCarePlanInfo | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('acp').update(payload).eq('id', id).select().single(),
      'acpService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('acp').delete().eq('id', id),
      null as any,
      'acpService.remove'
    );
    return res !== null;
  },
};
