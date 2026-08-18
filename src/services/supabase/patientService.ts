// ───────────────────────────────────────────────────────────────────────────
// patientService — Supabase CRUD for `patients`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, validUuidOrUndefined } from './_common';
import type { PalliativePatientInfo } from '@/lib/types';

/**
 * Normalize patient `status` to one of the DB-allowed values:
 *   'aktif', 'meninggal', 'lost_follow_up', 'pindah_faskes', 'program_selesai'
 * The frontend sometimes sends 'Aktif', 'Meninggal', 'selesai', etc.
 */
function normalizeStatus(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'aktif';
  const s = raw.toLowerCase().trim();
  if (s === 'aktif' || s === 'active') return 'aktif';
  if (s === 'meninggal' || s === 'death' || s === 'died') return 'meninggal';
  if (s.includes('lost') || s.includes('follow')) return 'lost_follow_up';
  if (s.includes('pindah') || s.includes('transfer')) return 'pindah_faskes';
  if (s.includes('selesai') || s.includes('completed') || s.includes('program_selesai')) return 'program_selesai';
  return 'aktif';
}

/**
 * Normalize `risiko` to 'hijau' | 'kuning' | 'merah' (CHECK constraint).
 */
function normalizeRisiko(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'hijau';
  const s = raw.toLowerCase().trim();
  if (s === 'hijau' || s === 'green') return 'hijau';
  if (s === 'kuning' || s === 'yellow') return 'kuning';
  if (s === 'merah' || s === 'red') return 'merah';
  return 'hijau';
}

/**
 * Normalize `program` (careStatus) to one of:
 *   'rawat_jalan', 'home_care', 'hospice', 'rawat_inap'
 */
function normalizeProgram(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'rawat_jalan';
  const s = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (s === 'rawat_jalan' || s === 'outpatient') return 'rawat_jalan';
  if (s === 'home_care' || s === 'homecare') return 'home_care';
  if (s === 'hospice') return 'hospice';
  if (s === 'rawat_inap' || s === 'inpatient') return 'rawat_inap';
  return 'rawat_jalan';
}

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
    // The real logged-in patient account id (profiles.id) — see
    // migration_patients_account_link.sql. Falls back to the row's own id
    // for legacy rows created before that column existed (those rows can
    // never be matched to a login account, and effectively behave as
    // "unlinked" — the doctor should re-mark the patient once to get a
    // correctly linked record).
    patientId: row.patient_account_id ?? row.id,
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
  // `patientId` (when it's a real UUID — the logged-in patient's account id
  // from `profiles`, NOT a temp/local string) links this clinical record
  // back to who can actually log in and see it. See
  // migration_patients_account_link.sql.
  const accountId = validUuidOrUndefined(data.patientId);
  if (accountId) out.patient_account_id = accountId;
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
  // Normalize enum values so we never violate the CHECK constraints.
  if (data.patientStatus !== undefined) out.status = normalizeStatus(data.patientStatus);
  if (data.riskLevel !== undefined) out.risiko = normalizeRisiko(data.riskLevel);
  if (data.careStatus !== undefined) out.program = normalizeProgram(data.careStatus);
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

  /**
   * Find the palliative-patient record already linked to a given login
   * account (patient_account_id), if any. Used to guard "Jadikan Pasien
   * Monitoring Paliatif" against creating a duplicate — checking the local
   * Zustand cache alone isn't reliable (it can be stale across tabs/
   * sessions), so this hits the database directly right before insert.
   */
  async getByAccountId(accountId: string): Promise<PalliativePatientInfo | null> {
    if (!accountId) return null;
    const row = await safeQuery(
      supabase.from('patients').select('*').eq('patient_account_id', accountId).maybeSingle(),
      null as any,
      'patientService.getByAccountId'
    );
    return row ? fromDb(row) : null;
  },

  async create(data: Partial<PalliativePatientInfo>): Promise<PalliativePatientInfo | null> {
    const payload = toDb(data);
    console.log('[patientService.create] payload (no id — Supabase auto-generates UUID):', payload);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patients').insert(payload).select().single(),
      'patientService.create'
    );
    if (error) {
      // Re-throw so the supabase-sync / store layer can toast the user.
      throw new Error(error);
    }
    if (row) {
      console.log('[patientService.create] SUCCESS — new patient UUID:', row.id);
    }
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<PalliativePatientInfo>): Promise<PalliativePatientInfo | null> {
    const payload = toDb(data);
    // .maybeSingle() instead of .single(): when RLS or a stale/mismatched
    // `id` means 0 rows were actually updated, .single() used to throw the
    // opaque Postgrest error "Cannot coerce the result to a single JSON
    // object" (PGRST116). We now detect that explicitly and raise a message
    // that actually explains what happened.
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patients').update(payload).eq('id', id).select().maybeSingle(),
      'patientService.update'
    );
    if (error) throw new Error(error);
    if (!row) {
      throw new Error(`Update pasien gagal: tidak ada baris dengan id=${id} yang cocok (kemungkinan id lokal belum tersinkron ke Supabase, atau data sudah dihapus).`);
    }
    return fromDb(row);
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
