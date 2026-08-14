// ───────────────────────────────────────────────────────────────────────────
// familySupportMaterialService — Supabase CRUD for `family_support_materials`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §13b):
//   id, patient_id, doctor_id, doctor_name, title, category, content,
//   instructions, attachment_url, status, created_at, updated_at
//
// `status` gates patient visibility: only 'published' materials should be
// shown on the patient side (drafts are doctor-only). That filtering happens
// on the read side (in the UI / store selector), not here — getAll() always
// returns everything for the given patient so the doctor's own view isn't
// missing their drafts.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined } from './_common';
import type { FamilySupportMaterial } from '@/lib/types';

function fromDb(row: any): FamilySupportMaterial {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    doctorId: row.doctor_id ?? undefined,
    doctorName: row.doctor_name ?? undefined,
    title: row.title ?? '',
    category: (row.category as any) ?? 'lainnya',
    content: row.content ?? '',
    instructions: row.instructions ?? undefined,
    attachmentUrl: row.attachment_url ?? undefined,
    status: (row.status as any) ?? 'draft',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<FamilySupportMaterial>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  // doctor_id is nullable — silently skip a non-UUID (e.g. a demo/local id)
  // instead of throwing, same pattern used elsewhere for optional FKs.
  if (data.doctorId !== undefined) out.doctor_id = validUuidOrUndefined(data.doctorId) ?? null;
  if (data.doctorName !== undefined) out.doctor_name = data.doctorName;
  if (data.title !== undefined) out.title = data.title;
  if (data.category !== undefined) out.category = data.category;
  if (data.content !== undefined) out.content = data.content;
  if (data.instructions !== undefined) out.instructions = data.instructions;
  if (data.attachmentUrl !== undefined) out.attachment_url = data.attachmentUrl;
  if (data.status !== undefined) out.status = data.status;
  return stripUndefined(out);
}

export const familySupportMaterialService = {
  async getAll(patientId: string): Promise<FamilySupportMaterial[]> {
    const rows = await safeQuery(
      supabase
        .from('family_support_materials')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'familySupportMaterialService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<FamilySupportMaterial>): Promise<FamilySupportMaterial | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[familySupportMaterialService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    if (!data.title || !data.content) {
      console.error('[familySupportMaterialService.create] ABORTED — title and content are required.');
      return null;
    }
    const payload = toDb(data);
    console.log('[familySupportMaterialService.create] payload:', { patient_id: data.palliativePatientId, status: payload.status });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('family_support_materials').insert(payload).select().single(),
      'familySupportMaterialService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<FamilySupportMaterial>): Promise<FamilySupportMaterial | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('family_support_materials').update(payload).eq('id', id).select().single(),
      'familySupportMaterialService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('family_support_materials').delete().eq('id', id),
      null as any,
      'familySupportMaterialService.remove'
    );
    return res !== null;
  },
};
