// ───────────────────────────────────────────────────────────────────────────
// medicationService — Supabase CRUD for `medications`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';
import type { PalliativeMedicationInfo, MedicationAdherenceInfo } from '@/lib/types';

/**
 * Extend the base type with the extra DB columns (efek_samping, stok)
 * so callers can read/write them too.
 */
export type MedicationWithExtras = PalliativeMedicationInfo & {
  sideEffects?: string;
  stock?: string;
};

function fromDb(row: any): MedicationWithExtras {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    medicineName: row.nama_obat ?? '',
    dosage: row.dosis ?? '',
    frequency: row.frekuensi ?? '',
    route: row.rute ?? undefined,
    startDate: row.tanggal_mulai ?? undefined,
    endDate: row.tanggal_selesai ?? undefined,
    indication: row.indikasi ?? undefined,
    isActive: row.is_active ?? true,
    notes: row.catatan ?? undefined,
    adherences: (row.kepatuhan as MedicationAdherenceInfo[]) ?? [],
    sideEffects: row.efek_samping ?? undefined,
    stock: row.stok ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<MedicationWithExtras>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined) out.patient_id = data.palliativePatientId;
  if (data.medicineName !== undefined) out.nama_obat = data.medicineName;
  if (data.dosage !== undefined) out.dosis = data.dosage;
  if (data.frequency !== undefined) out.frekuensi = data.frequency;
  if (data.route !== undefined) out.rute = data.route;
  if (data.startDate !== undefined) out.tanggal_mulai = data.startDate;
  if (data.endDate !== undefined) out.tanggal_selesai = data.endDate;
  if (data.indication !== undefined) out.indikasi = data.indication;
  if (data.isActive !== undefined) out.is_active = data.isActive;
  if (data.notes !== undefined) out.catatan = data.notes;
  if (data.adherences !== undefined) out.kepatuhan = data.adherences;
  if (data.sideEffects !== undefined) out.efek_samping = data.sideEffects;
  if (data.stock !== undefined) out.stok = data.stock;
  return stripUndefined(out);
}

export const medicationService = {
  async getAll(patientId: string): Promise<MedicationWithExtras[]> {
    const rows = await safeQuery(
      supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'medicationService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<MedicationWithExtras>): Promise<MedicationWithExtras | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('medications').insert(payload).select().single(),
      null as any,
      'medicationService.create'
    );
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<MedicationWithExtras>): Promise<MedicationWithExtras | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('medications').update(payload).eq('id', id).select().single(),
      null as any,
      'medicationService.update'
    );
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('medications').delete().eq('id', id),
      null as any,
      'medicationService.remove'
    );
    return res !== null;
  },
};
