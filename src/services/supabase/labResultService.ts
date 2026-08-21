// ───────────────────────────────────────────────────────────────────────────
// labResultService — Supabase CRUD for `patient_lab_results`
// ───────────────────────────────────────────────────────────────────────────
// Backs the "Hasil Lab" tab in Rekam Medis (both doctor-input and
// patient-view sides) — see migration_patient_lab_results.sql.
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';

export interface LabResultRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  testName: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  notes?: string;
  performedAt: string;
  createdAt: string;
}

export interface LabResultInput {
  patientId: string;
  doctorId?: string;
  testName: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  notes?: string;
  performedAt?: string;
}

function fromDb(row: any): LabResultRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id ?? undefined,
    testName: row.test_name,
    resultValue: row.result_value,
    unit: row.unit ?? undefined,
    referenceRange: row.reference_range ?? undefined,
    isAbnormal: row.is_abnormal ?? false,
    notes: row.notes ?? undefined,
    performedAt: row.performed_at,
    createdAt: row.created_at,
  };
}

export const labResultService = {
  async getForPatient(patientId: string): Promise<LabResultRecord[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase.from('patient_lab_results').select('*').eq('patient_id', patientId).order('performed_at', { ascending: false }).order('created_at', { ascending: false }),
      [] as any[],
      'labResultService.getForPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(input: LabResultInput): Promise<LabResultRecord> {
    if (!isValidUuid(input.patientId)) throw new Error('patientId tidak valid');
    const payload: Record<string, any> = {
      patient_id: input.patientId,
      test_name: input.testName,
      result_value: input.resultValue,
      unit: input.unit || null,
      reference_range: input.referenceRange || null,
      is_abnormal: input.isAbnormal ?? false,
      notes: input.notes || null,
      performed_at: input.performedAt || new Date().toISOString().split('T')[0],
    };
    if (input.doctorId && isValidUuid(input.doctorId)) payload.doctor_id = input.doctorId;

    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_lab_results').insert(payload).select().maybeSingle(),
      'labResultService.create'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Gagal menyimpan hasil lab.');
    return fromDb(row);
  },

  async remove(id: string): Promise<void> {
    if (!isValidUuid(id)) throw new Error('id tidak valid');
    const { error } = await supabase.from('patient_lab_results').delete().eq('id', id);
    if (error) throw new Error(error.message ?? 'Gagal menghapus hasil lab.');
  },
};
