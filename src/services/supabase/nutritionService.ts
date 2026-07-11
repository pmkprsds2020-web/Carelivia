// ───────────────────────────────────────────────────────────────────────────
// nutritionService — Supabase CRUD for `nutrition`
// ───────────────────────────────────────────────────────────────────────────
//
// NOTE: The DB `nutrition` table only stores a subset of the
// `NutritionCalculationResult` fields (bmi, bmiCategory, totalCalorieNeeds,
// protein/carb/fat grams). The remaining calculation sub-fields (basal,
// corrections, kcal breakdowns) are reconstructed as 0 on read — callers
// that need the full breakdown should re-run the calculator.
// `age` and `gender` are not stored in the `nutrition` table; they are set to
// sensible defaults (0 / 'L') on read. Callers can re-derive them from the
// patient record if needed.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined, isValidUuid } from './_common';
import type { NutritionRecordInfo, NutritionCalculationResult } from '@/lib/types';

function fromDb(row: any): NutritionRecordInfo {
  const imt = row.imt != null ? Number(row.imt) : 0;
  const kaloriTarget = row.kalori_target != null ? Number(row.kalori_target) : 0;
  const protein = row.protein != null ? Number(row.protein) : 0;
  const karbo = row.karbo != null ? Number(row.karbo) : 0;
  const lemak = row.lemak != null ? Number(row.lemak) : 0;

  const calculation: NutritionCalculationResult = {
    bmi: imt,
    bmiCategory: (row.status_gizi as any) ?? 'normal',
    idealBodyWeight: 0,
    basalCalories: 0,
    ageCorrectionKcal: 0,
    ageCorrectionPercent: 0,
    activityCorrectionKcal: 0,
    activityCorrectionPercent: 0,
    weightCorrectionKcal: 0,
    weightCorrectionPercent: 0,
    stressCorrectionKcal: 0,
    stressCorrectionPercent: 0,
    specialConditionKcal: 0,
    totalCalorieNeeds: kaloriTarget,
    carbohydrateKcal: karbo * 4,
    proteinKcal: protein * 4,
    fatKcal: lemak * 9,
    mineralKcal: 0,
    carbohydrateGrams: karbo,
    proteinGrams: protein,
    fatGrams: lemak,
  };

  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    age: 0,
    gender: 'L',
    weight: row.bb != null ? Number(row.bb) : 0,
    height: row.tb != null ? Number(row.tb) : 0,
    activityLevel: (row.activity_level as any) ?? 'bed_rest',
    metabolicStress: (row.metabolic_stress as any) ?? 'tidak_ada',
    specialCondition: (row.special_condition as any) ?? 'tidak_ada',
    calculation,
    actualIntakeKcal: row.kalori_tercapai != null ? Number(row.kalori_tercapai) : undefined,
    notes: row.catatan ?? undefined,
    recordedBy: row.recorded_by ?? undefined,
    recordedAt: row.recorded_at ?? new Date().toISOString(),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<NutritionRecordInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  // patient_id is a NOT NULL uuid FK — only forward if it's a real UUID.
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.weight !== undefined) out.bb = data.weight;
  if (data.height !== undefined) out.tb = data.height;
  if (data.activityLevel !== undefined) out.activity_level = data.activityLevel;
  if (data.metabolicStress !== undefined) out.metabolic_stress = data.metabolicStress;
  if (data.specialCondition !== undefined) out.special_condition = data.specialCondition;
  if (data.actualIntakeKcal !== undefined) out.kalori_tercapai = data.actualIntakeKcal;
  if (data.notes !== undefined) out.catatan = data.notes;
  if (data.recordedBy !== undefined) out.recorded_by = data.recordedBy;
  if (data.recordedAt !== undefined) out.recorded_at = data.recordedAt;

  if (data.calculation !== undefined) {
    const c = data.calculation;
    if (c.bmi !== undefined) out.imt = c.bmi;
    if (c.bmiCategory !== undefined) out.status_gizi = c.bmiCategory;
    if (c.totalCalorieNeeds !== undefined) out.kalori_target = c.totalCalorieNeeds;
    if (c.proteinGrams !== undefined) out.protein = c.proteinGrams;
    if (c.carbohydrateGrams !== undefined) out.karbo = c.carbohydrateGrams;
    if (c.fatGrams !== undefined) out.lemak = c.fatGrams;
  }
  return stripUndefined(out);
}

export const nutritionService = {
  async getAll(patientId: string): Promise<NutritionRecordInfo[]> {
    const rows = await safeQuery(
      supabase
        .from('nutrition')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false }),
      [] as any[],
      'nutritionService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async getLatest(patientId: string): Promise<NutritionRecordInfo | null> {
    const rows = await safeQuery(
      supabase
        .from('nutrition')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(1),
      [] as any[],
      'nutritionService.getLatest'
    );
    const arr = rows as any[];
    return arr.length > 0 ? fromDb(arr[0]) : null;
  },

  async create(data: Partial<NutritionRecordInfo>): Promise<NutritionRecordInfo | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[nutritionService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[nutritionService.create] payload:', { patient_id: data.palliativePatientId });
    const row = await safeQuery(
      supabase.from('nutrition').insert(payload).select().single(),
      null as any,
      'nutritionService.create'
    );
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<NutritionRecordInfo>): Promise<NutritionRecordInfo | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('nutrition').update(payload).eq('id', id).select().single(),
      null as any,
      'nutritionService.update'
    );
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('nutrition').delete().eq('id', id),
      null as any,
      'nutritionService.remove'
    );
    return res !== null;
  },
};
