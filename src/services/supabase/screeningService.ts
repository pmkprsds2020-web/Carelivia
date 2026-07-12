// ───────────────────────────────────────────────────────────────────────────
// screeningService — Supabase CRUD for `screenings`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, safeJsonParse, isValidUuid, validUuidOrUndefined } from './_common';
import type { PalliativeScreeningRecordInfo } from '@/lib/types';

/**
 * The DB CHECK constraint on `screenings.jenis_skrining` only allows:
 *   'esas', 'pps', 'spict', 'distress_thermometer', 'zarit', 'eortc', 'ipos'
 *
 * The frontend uses shorter ids (`esas`, `distress`, `spict`, `pps`, `zarit`,
 * `eortc`). We normalize them here so the insert never violates the CHECK
 * constraint ("new row for relation screenings violates check constraint").
 *
 * Any unknown type is mapped to `esas` as a safe fallback (it's the most
 * generic symptom-assessment tool).
 */
const SCREENING_TYPE_DB_MAP: Record<string, string> = {
  esas: 'esas',
  distress: 'distress_thermometer',
  distress_thermometer: 'distress_thermometer',
  spict: 'spict',
  pps: 'pps',
  zarit: 'zarit',
  eortc: 'eortc',
  ipos: 'ipos',
  // Legacy/alias types used in some chat-form code → map to a valid value.
  penilaian_nyeri: 'esas',
  penilaian_sesak: 'esas',
  penilaian_nutrisi: 'esas',
};

function normalizeScreeningType(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'esas';
  const lower = raw.toLowerCase();
  return SCREENING_TYPE_DB_MAP[lower] ?? 'esas';
}

/**
 * Map a DB row → PalliativeScreeningRecordInfo.
 * `jawaban` (JSONB) is stringified into `details` (string).
 * `scoreLabel` is stored inside the `jawaban` JSON (key `scoreLabel`).
 */
function fromDb(row: any): PalliativeScreeningRecordInfo {
  const jawaban: any = safeJsonParse<any>(row.jawaban, {});
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    doctorId: row.doctor_id ?? undefined,
    screeningType: row.jenis_skrining,
    score: row.score != null ? Number(row.score) : undefined,
    scoreLabel: jawaban?.scoreLabel ?? undefined,
    interpretation: row.interpretasi ?? undefined,
    ewsLevel: row.ews ?? undefined,
    details: row.jawaban != null ? JSON.stringify(row.jawaban) : undefined,
    performedAt: row.tanggal ?? new Date().toISOString(),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<PalliativeScreeningRecordInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  // patient_id is a NOT NULL uuid FK — only forward if it's a real UUID.
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  // doctor_id is a nullable uuid — only forward if it's a real UUID.
  const doctorId = validUuidOrUndefined(data.doctorId);
  if (doctorId) out.doctor_id = doctorId;
  if (data.screeningType !== undefined) {
    // Normalize to a DB-allowed value so we never hit the CHECK constraint.
    out.jenis_skrining = normalizeScreeningType(data.screeningType);
  }
  if (data.score !== undefined) out.score = data.score;
  if (data.interpretation !== undefined) out.interpretasi = data.interpretation;
  // ews must be 'hijau' | 'kuning' | 'merah' (CHECK constraint). Drop anything else.
  if (data.ewsLevel !== undefined) {
    const e = String(data.ewsLevel).toLowerCase();
    if (e === 'hijau' || e === 'kuning' || e === 'merah') out.ews = e;
  }
  if (data.performedAt !== undefined) out.tanggal = data.performedAt;

  // `details` (string) → jawaban (JSONB). Merge scoreLabel in if present.
  if (data.details !== undefined || data.scoreLabel !== undefined) {
    let jawaban: any = safeJsonParse<any>(data.details, {});
    if (typeof jawaban !== 'object' || jawaban == null) jawaban = {};
    if (data.scoreLabel !== undefined) jawaban.scoreLabel = data.scoreLabel;
    out.jawaban = jawaban;
  }
  return stripUndefined(out);
}

export const screeningService = {
  async getAll(patientId: string): Promise<PalliativeScreeningRecordInfo[]> {
    const rows = await safeQuery(
      supabase
        .from('screenings')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'screeningService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<PalliativeScreeningRecordInfo>): Promise<PalliativeScreeningRecordInfo | null> {
    // ── UUID validation ──────────────────────────────────────────────────
    // patient_id is a NOT NULL uuid FK. Abort early with a clear error if
    // the caller passes a custom string instead of a real UUID.
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[screeningService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId, payload: data }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[screeningService.create] payload:', {
      patient_id: data.palliativePatientId,
      doctor_id: validUuidOrUndefined(data.doctorId) ?? '(skipped — not a UUID)',
      jenis_skrining: payload.jenis_skrining,
      score: payload.score,
    });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('screenings').insert(payload).select().single(),
      'screeningService.create'
    );
    if (error) {
      // Re-throw so the supabase-sync layer can toast the user.
      throw new Error(error);
    }
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('screenings').delete().eq('id', id),
      null as any,
      'screeningService.remove'
    );
    return res !== null;
  },
};
