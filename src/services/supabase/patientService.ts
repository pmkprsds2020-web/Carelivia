// ───────────────────────────────────────────────────────────────────────────
// patientService — Supabase CRUD for `patients`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined, validUuidOrUndefined } from './_common';
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
 *
 * NOTE on `dokter_id`: the DB column is `uuid`, but the app uses string IDs
 * like "doc-sarah" for doctors (they live in Prisma/SQLite, not Supabase).
 * We only forward `dokter_id` when it looks like a real UUID; otherwise we
 * skip it and rely on `dokter_nama` for display.
 *
 * IMPORTANT: We NEVER send a custom `id` (like "pp-...") — Supabase
 * auto-generates a real UUID via `gen_random_uuid()`.
 */
function toDb(data: Partial<PalliativePatientInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  // Never send `id` — let Supabase auto-generate the UUID.
  if (data.patientName !== undefined) out.nama = data.patientName;
  if (data.rmNumber !== undefined) out.rm = data.rmNumber;
  if (data.nik !== undefined) out.nik = data.nik;
  if (data.dateOfBirth !== undefined) out.tanggal_lahir = data.dateOfBirth;
  if (data.gender !== undefined) {
    // DB accepts 'L' or 'P'. Frontend may send 'Laki-laki'/'Perempuan'.
    const g = String(data.gender).toLowerCase();
    if (g === 'l' || g === 'p') out.jenis_kelamin = g;
    else if (g.startsWith('l')) out.jenis_kelamin = 'L';
    else if (g.startsWith('p')) out.jenis_kelamin = 'P';
  }
  if (data.primaryDiagnosis !== undefined) out.diagnosa = data.primaryDiagnosis;
  // dokter_id is a UUID column — only forward if it's a real UUID.
  const dokterId = validUuidOrUndefined(data.attendingDoctorId);
  if (dokterId) out.dokter_id = dokterId;
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
    console.log('[patientService.create] payload (no id — Supabase auto-generates UUID):', payload);
    const row = await safeQuery(
      supabase.from('patients').insert(payload).select().single(),
      null as any,
      'patientService.create'
    );
    if (row) {
      console.log('[patientService.create] SUCCESS — new patient UUID:', row.id);
    }
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
