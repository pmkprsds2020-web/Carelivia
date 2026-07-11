// ───────────────────────────────────────────────────────────────────────────
// complaintService — Supabase CRUD for `daily_complaints`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';
import type { DailyComplaintRecord } from '@/lib/types';

function fromDb(row: any): DailyComplaintRecord {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    kondisiHariIni: row.kondisi_hari_ini ?? 'baik',
    alasanKondisi: row.alasan_kondisi ?? undefined,
    keluhanBaru: row.keluhan_baru ?? 'tidak_ada',
    deskripsiKeluhanBaru: row.deskripsi_keluhan ?? undefined,
    kondisiNyeri: row.kondisi_nyeri ?? 'tidak_nyeri',
    kondisiSesak: row.kondisi_sesak ?? 'tidak_sesak',
    makanMinum: row.makan_minum ?? 'tidak',
    alasanMakanMinum: row.alasan_makan_minum ?? undefined,
    tidur: row.tidur ?? 'tidak',
    alasanTidur: row.alasan_tidur ?? undefined,
    masalahObat: row.masalah_obat ?? 'tidak',
    deskripsiMasalahObat: row.deskripsi_masalah ?? undefined,
    severityLevel: row.severity_level ?? 'hijau',
    sumberPengisian: row.sumber_pengisian ?? 'manual',
    submittedAt: row.submitted_at ?? new Date().toISOString(),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<DailyComplaintRecord>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined) out.patient_id = data.palliativePatientId;
  if (data.kondisiHariIni !== undefined) out.kondisi_hari_ini = data.kondisiHariIni;
  if (data.alasanKondisi !== undefined) out.alasan_kondisi = data.alasanKondisi;
  if (data.keluhanBaru !== undefined) out.keluhan_baru = data.keluhanBaru;
  if (data.deskripsiKeluhanBaru !== undefined) out.deskripsi_keluhan = data.deskripsiKeluhanBaru;
  if (data.kondisiNyeri !== undefined) out.kondisi_nyeri = data.kondisiNyeri;
  if (data.kondisiSesak !== undefined) out.kondisi_sesak = data.kondisiSesak;
  if (data.makanMinum !== undefined) out.makan_minum = data.makanMinum;
  if (data.alasanMakanMinum !== undefined) out.alasan_makan_minum = data.alasanMakanMinum;
  if (data.tidur !== undefined) out.tidur = data.tidur;
  if (data.alasanTidur !== undefined) out.alasan_tidur = data.alasanTidur;
  if (data.masalahObat !== undefined) out.masalah_obat = data.masalahObat;
  if (data.deskripsiMasalahObat !== undefined) out.deskripsi_masalah = data.deskripsiMasalahObat;
  if (data.severityLevel !== undefined) out.severity_level = data.severityLevel;
  if (data.sumberPengisian !== undefined) out.sumber_pengisian = data.sumberPengisian;
  if (data.submittedAt !== undefined) out.submitted_at = data.submittedAt;
  return stripUndefined(out);
}

export const complaintService = {
  async getAll(patientId: string): Promise<DailyComplaintRecord[]> {
    const rows = await safeQuery(
      supabase
        .from('daily_complaints')
        .select('*')
        .eq('patient_id', patientId)
        .order('submitted_at', { ascending: false }),
      [] as any[],
      'complaintService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<DailyComplaintRecord>): Promise<DailyComplaintRecord | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('daily_complaints').insert(payload).select().single(),
      null as any,
      'complaintService.create'
    );
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('daily_complaints').delete().eq('id', id),
      null as any,
      'complaintService.remove'
    );
    return res !== null;
  },
};
