// ───────────────────────────────────────────────────────────────────────────
// emergencyContactService — Supabase CRUD for `emergency_contacts`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §11):
//   id, patient_id, name, role, phone, alternate_phone, notes, created_at
//
// The TS type `EmergencyContact` has extra fields (`isPrimary`, `updatedAt`)
// that don't exist as DB columns — `isPrimary` is tucked into `notes` as a
// marker prefix so it survives a round-trip; `updatedAt` falls back to
// `created_at`.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid } from './_common';
import type { EmergencyContact } from '@/lib/types';

const PRIMARY_MARKER = '[PRIMARY]';

function fromDb(row: any): EmergencyContact {
  const rawNotes: string = row.notes ?? '';
  const isPrimary = rawNotes.startsWith(PRIMARY_MARKER);
  const notes = isPrimary ? rawNotes.slice(PRIMARY_MARKER.length).trim() : rawNotes || undefined;
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    name: row.name ?? '',
    role: (row.role as any) ?? 'lainnya',
    phone: row.phone ?? '',
    alternatePhone: row.alternate_phone ?? undefined,
    isPrimary,
    notes,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<EmergencyContact>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.name !== undefined) out.name = data.name;
  if (data.role !== undefined) out.role = data.role;
  if (data.phone !== undefined) out.phone = data.phone;
  if (data.alternatePhone !== undefined) out.alternate_phone = data.alternatePhone;
  // Encode `isPrimary` into `notes` since there's no dedicated column.
  if (data.notes !== undefined || data.isPrimary !== undefined) {
    const isPrimary = data.isPrimary ?? false;
    const notes = data.notes ?? '';
    out.notes = isPrimary ? `${PRIMARY_MARKER} ${notes}`.trim() : notes;
  }
  return stripUndefined(out);
}

export const emergencyContactService = {
  async getAll(patientId: string): Promise<EmergencyContact[]> {
    const rows = await safeQuery(
      supabase
        .from('emergency_contacts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'emergencyContactService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<EmergencyContact>): Promise<EmergencyContact | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[emergencyContactService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[emergencyContactService.create] payload:', { patient_id: data.palliativePatientId, name: payload.name });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('emergency_contacts').insert(payload).select().single(),
      'emergencyContactService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<EmergencyContact>): Promise<EmergencyContact | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('emergency_contacts').update(payload).eq('id', id).select().single(),
      'emergencyContactService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('emergency_contacts').delete().eq('id', id),
      null as any,
      'emergencyContactService.remove'
    );
    return res !== null;
  },
};
