// ───────────────────────────────────────────────────────────────────────────
// caregiverService — Supabase CRUD for `caregivers`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §8):
//   id, patient_id, name, role, relation, phone, email, address, schedule,
//   tasks (jsonb), is_active, zarit_score, zarit_level, family_apgar_score,
//   created_at, updated_at
//
// The TS type `CaregiverInfo` has extra fields (`relationOther`, `familyApgarLevel`,
// `notes`) that don't exist as DB columns — those are serialized into the
// `tasks` JSONB (or dropped) so we never lose data on a round-trip.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, safeJsonParse } from './_common';
import type { CaregiverInfo } from '@/lib/types';

function fromDb(row: any): CaregiverInfo {
  const tasks: any = safeJsonParse<any>(row.tasks, []);
  const extras = (tasks && typeof tasks === 'object' && !Array.isArray(tasks)) ? tasks.__extras : undefined;
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    name: row.name ?? '',
    role: (row.role as any) ?? 'pendamping',
    relation: (row.relation as any) ?? 'lainnya',
    relationOther: extras?.relationOther,
    phone: row.phone ?? '',
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    schedule: row.schedule ?? undefined,
    tasks: Array.isArray(tasks) ? tasks : [],
    isActive: row.is_active ?? true,
    zaritScore: row.zarit_score ?? undefined,
    zaritLevel: (row.zarit_level as any) ?? undefined,
    familyApgarScore: row.family_apgar_score ?? undefined,
    familyApgarLevel: extras?.familyApgarLevel,
    notes: extras?.notes,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<CaregiverInfo>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.name !== undefined) out.name = data.name;
  if (data.role !== undefined) out.role = data.role;
  if (data.relation !== undefined) out.relation = data.relation;
  if (data.phone !== undefined) out.phone = data.phone;
  if (data.email !== undefined) out.email = data.email;
  if (data.address !== undefined) out.address = data.address;
  if (data.schedule !== undefined) out.schedule = data.schedule;
  if (data.isActive !== undefined) out.is_active = data.isActive;
  if (data.zaritScore !== undefined) out.zarit_score = data.zaritScore;
  if (data.zaritLevel !== undefined) out.zarit_level = data.zaritLevel;
  if (data.familyApgarScore !== undefined) out.family_apgar_score = data.familyApgarScore;

  // `tasks` is JSONB. We store the array of tasks AND tuck extra TS-only
  // fields (relationOther, familyApgarLevel, notes) under `__extras` so they
  // survive a round-trip even though the DB has no dedicated columns.
  if (data.tasks !== undefined || data.relationOther !== undefined ||
      data.familyApgarLevel !== undefined || data.notes !== undefined) {
    const tasksArr = Array.isArray(data.tasks) ? data.tasks : [];
    const extras: Record<string, any> = {};
    if (data.relationOther !== undefined) extras.relationOther = data.relationOther;
    if (data.familyApgarLevel !== undefined) extras.familyApgarLevel = data.familyApgarLevel;
    if (data.notes !== undefined) extras.notes = data.notes;
    out.tasks = Object.keys(extras).length > 0 ? { items: tasksArr, __extras: extras } : tasksArr;
  }
  return stripUndefined(out);
}

export const caregiverService = {
  async getAll(patientId: string): Promise<CaregiverInfo[]> {
    const rows = await safeQuery(
      supabase
        .from('caregivers')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'caregiverService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<CaregiverInfo>): Promise<CaregiverInfo | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[caregiverService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[caregiverService.create] payload:', { patient_id: data.palliativePatientId, name: payload.name });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('caregivers').insert(payload).select().single(),
      'caregiverService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<CaregiverInfo>): Promise<CaregiverInfo | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('caregivers').update(payload).eq('id', id).select().single(),
      'caregiverService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('caregivers').delete().eq('id', id),
      null as any,
      'caregiverService.remove'
    );
    return res !== null;
  },
};
