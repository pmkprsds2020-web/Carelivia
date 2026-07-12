// ───────────────────────────────────────────────────────────────────────────
// vitalService — Supabase CRUD for `vital_signs`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, combineDateAndTime, splitIsoToTanggalJam, isValidUuid, validUuidOrUndefined } from './_common';
import type { VitalSignRecordInfo } from '@/lib/types';

/**
 * Map a DB row → VitalSignRecordInfo.
 * Special: `tanggal` + `jam` are combined into `recordedAt` (ISO).
 */
function fromDb(row: any): VitalSignRecordInfo {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    doctorId: row.doctor_id ?? undefined,
    systolicBP: row.sistol ?? undefined,
    diastolicBP: row.diastol ?? undefined,
    heartRate: row.nadi ?? undefined,
    respiratoryRate: row.rr ?? undefined,
    temperature: row.suhu != null ? Number(row.suhu) : undefined,
    oxygenSat: row.spo2 ?? undefined,
    weight: row.bb != null ? Number(row.bb) : undefined,
    height: row.tb != null ? Number(row.tb) : undefined,
    bmi: row.bmi != null ? Number(row.bmi) : undefined,
    notes: row.catatan ?? undefined,
    recordedBy: row.input_by ?? undefined,
    recordedAt: combineDateAndTime(row.tanggal, row.jam),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<VitalSignRecordInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  // patient_id is a NOT NULL uuid FK — only forward if it's a real UUID.
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  // doctor_id is a nullable uuid — only forward if it's a real UUID.
  const doctorId = validUuidOrUndefined(data.doctorId);
  if (doctorId) out.doctor_id = doctorId;
  if (data.systolicBP !== undefined) out.sistol = data.systolicBP;
  if (data.diastolicBP !== undefined) out.diastol = data.diastolicBP;
  if (data.heartRate !== undefined) out.nadi = data.heartRate;
  if (data.respiratoryRate !== undefined) out.rr = data.respiratoryRate;
  if (data.temperature !== undefined) out.suhu = data.temperature;
  if (data.oxygenSat !== undefined) out.spo2 = data.oxygenSat;
  if (data.weight !== undefined) out.bb = data.weight;
  if (data.height !== undefined) out.tb = data.height;
  if (data.bmi !== undefined) out.bmi = data.bmi;
  // nyeri has a CHECK constraint (0-10). Clamp invalid values.
  if ((data as any).painScore !== undefined) {
    const n = Number((data as any).painScore);
    if (!isNaN(n)) out.nyeri = Math.max(0, Math.min(10, n));
  }
  if (data.notes !== undefined) out.catatan = data.notes;
  if (data.recordedBy !== undefined) out.input_by = data.recordedBy;
  if (data.recordedAt !== undefined) {
    const { tanggal, jam } = splitIsoToTanggalJam(data.recordedAt);
    out.tanggal = tanggal;
    out.jam = jam;
  }
  return stripUndefined(out);
}

export const vitalService = {
  async getAll(patientId: string): Promise<VitalSignRecordInfo[]> {
    const rows = await safeQuery(
      supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'vitalService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async getLatest(patientId: string): Promise<VitalSignRecordInfo | null> {
    const rows = await safeQuery(
      supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1),
      [] as any[],
      'vitalService.getLatest'
    );
    const arr = rows as any[];
    return arr.length > 0 ? fromDb(arr[0]) : null;
  },

  async create(data: Partial<VitalSignRecordInfo>): Promise<VitalSignRecordInfo | null> {
    // ── UUID validation ──────────────────────────────────────────────────
    // patient_id is a NOT NULL uuid FK. If the caller passes a custom string
    // (e.g. "pp-1783801594909-h4i6") we must abort early with a clear error
    // instead of letting Postgres reject it with "invalid input syntax".
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[vitalService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId, payload: data }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[vitalService.create] payload:', { ...payload, patient_id: data.palliativePatientId });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('vital_signs').insert(payload).select().single(),
      'vitalService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<VitalSignRecordInfo>): Promise<VitalSignRecordInfo | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('vital_signs').update(payload).eq('id', id).select().single(),
      'vitalService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('vital_signs').delete().eq('id', id),
      null as any,
      'vitalService.remove'
    );
    return res !== null;
  },
};
