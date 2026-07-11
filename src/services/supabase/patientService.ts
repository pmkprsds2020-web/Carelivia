// ───────────────────────────────────────────────────────────────────────────
// patientService — Supabase CRUD for `patients`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';
import type { PalliativePatientInfo } from '@/lib/types';

/**
 * Map a DB row (snake_case) → PalliativePatientInfo (camelCase).
 * Special renames:
 *   rm → rmNumber, nama → patientName, tanggal_lahir → dateOfBirth,
 *   jenis_kelamin → gender, diagnosa → primaryDiagnosis,
 *   dokter_id → attendingDoctorId, dokter_nama → attendingDoctorName,
 *   status → patientStatus, risiko → riskLevel, program → careStatus,
 *   alamat → address.
 * `patientId` is always set equal to `id` (we use the DB id as patientId).
 */
function fromDb(row: any): PalliativePatientInfo {
  return {
    id: row.id,
    patientId: row.id,
    patientName: row.nama ?? '',
    rmNumber: row.rm ?? undefined,
    nik: row.nik ?? undefined,
    dateOfBirth: row.tanggal_lahir ?? undefined,
    gender: row.jenis_kelamin ?? undefined,
    primaryDiagnosis: row.diagnosa ?? undefined,
    attendingDoctorId: row.dokter_id ?? undefined,
    attendingDoctorName: row.dokter_nama ?? undefined,
    familyContactName: row.family_contact_name ?? undefined,
    familyContactRelation: row.family_contact_relation ?? undefined,
    familyContactPhone: row.family_contact_phone ?? undefined,
    address: row.alamat ?? undefined,
    patientStatus: row.status ?? 'aktif',
    riskLevel: row.risiko ?? 'hijau',
    careStatus: row.program ?? 'rawat_jalan',
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Map a partial PalliativePatientInfo → DB row (snake_case).
 * Only writes fields that are explicitly provided.
 */
function toDb(data: Partial<PalliativePatientInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.patientName !== undefined) out.nama = data.patientName;
  if (data.rmNumber !== undefined) out.rm = data.rmNumber;
  if (data.nik !== undefined) out.nik = data.nik;
  if (data.dateOfBirth !== undefined) out.tanggal_lahir = data.dateOfBirth;
  if (data.gender !== undefined) out.jenis_kelamin = data.gender;
  if (data.primaryDiagnosis !== undefined) out.diagnosa = data.primaryDiagnosis;
  if (data.attendingDoctorId !== undefined) out.dokter_id = data.attendingDoctorId;
  if (data.attendingDoctorName !== undefined) out.dokter_nama = data.attendingDoctorName;
  if (data.familyContactName !== undefined) out.family_contact_name = data.familyContactName;
  if (data.familyContactRelation !== undefined) out.family_contact_relation = data.familyContactRelation;
  if (data.familyContactPhone !== undefined) out.family_contact_phone = data.familyContactPhone;
  if (data.address !== undefined) out.alamat = data.address;
  if (data.patientStatus !== undefined) out.status = data.patientStatus;
  if (data.riskLevel !== undefined) out.risiko = data.riskLevel;
  if (data.careStatus !== undefined) out.program = data.careStatus;
  if (data.notes !== undefined) out.notes = data.notes;
  return stripUndefined(out);
}

export const patientService = {
  async getAll(): Promise<PalliativePatientInfo[]> {
    const rows = await safeQuery(
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      [] as any[],
      'patientService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async getById(id: string): Promise<PalliativePatientInfo | null> {
    const row = await safeQuery(
      supabase.from('patients').select('*').eq('id', id).maybeSingle(),
      null as any,
      'patientService.getById'
    );
    return row ? fromDb(row) : null;
  },

  async create(data: Partial<PalliativePatientInfo>): Promise<PalliativePatientInfo | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('patients').insert(payload).select().single(),
      null as any,
      'patientService.create'
    );
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<PalliativePatientInfo>): Promise<PalliativePatientInfo | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('patients').update(payload).eq('id', id).select().single(),
      null as any,
      'patientService.update'
    );
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('patients').delete().eq('id', id),
      null as any,
      'patientService.remove'
    );
    return res !== null;
  },
};
