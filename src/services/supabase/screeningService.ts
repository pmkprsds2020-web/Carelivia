// ───────────────────────────────────────────────────────────────────────────
// screeningService — Supabase CRUD for `screenings`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined, safeJsonParse } from './_common';
import type { PalliativeScreeningRecordInfo } from '@/lib/types';

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
  if (data.palliativePatientId !== undefined) out.patient_id = data.palliativePatientId;
  if (data.screeningType !== undefined) out.jenis_skrining = data.screeningType;
  if (data.score !== undefined) out.score = data.score;
  if (data.interpretation !== undefined) out.interpretasi = data.interpretation;
  if (data.ewsLevel !== undefined) out.ews = data.ewsLevel;
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
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('screenings').insert(payload).select().single(),
      null as any,
      'screeningService.create'
    );
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
