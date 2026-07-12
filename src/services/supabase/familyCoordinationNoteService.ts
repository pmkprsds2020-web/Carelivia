// ───────────────────────────────────────────────────────────────────────────
// familyCoordinationNoteService — Supabase CRUD for `family_coordination_notes`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §10):
//   id, patient_id, author_name, author_relation, content, type, is_completed,
//   due_date, created_at, updated_at
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid } from './_common';
import type { FamilyCoordinationNote } from '@/lib/types';

function fromDb(row: any): FamilyCoordinationNote {
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    authorName: row.author_name ?? '',
    authorRelation: row.author_relation ?? '',
    content: row.content ?? '',
    type: (row.type as any) ?? 'perkembangan',
    isCompleted: row.is_completed ?? false,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<FamilyCoordinationNote>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.authorName !== undefined) out.author_name = data.authorName;
  if (data.authorRelation !== undefined) out.author_relation = data.authorRelation;
  if (data.content !== undefined) out.content = data.content;
  if (data.type !== undefined) out.type = data.type;
  if (data.isCompleted !== undefined) out.is_completed = data.isCompleted;
  if (data.dueDate !== undefined) out.due_date = data.dueDate;
  return stripUndefined(out);
}

export const familyCoordinationNoteService = {
  async getAll(patientId: string): Promise<FamilyCoordinationNote[]> {
    const rows = await safeQuery(
      supabase
        .from('family_coordination_notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'familyCoordinationNoteService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<FamilyCoordinationNote>): Promise<FamilyCoordinationNote | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[familyCoordinationNoteService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[familyCoordinationNoteService.create] payload:', { patient_id: data.palliativePatientId, type: payload.type });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('family_coordination_notes').insert(payload).select().single(),
      'familyCoordinationNoteService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<FamilyCoordinationNote>): Promise<FamilyCoordinationNote | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('family_coordination_notes').update(payload).eq('id', id).select().single(),
      'familyCoordinationNoteService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('family_coordination_notes').delete().eq('id', id),
      null as any,
      'familyCoordinationNoteService.remove'
    );
    return res !== null;
  },
};
