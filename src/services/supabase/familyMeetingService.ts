// ───────────────────────────────────────────────────────────────────────────
// familyMeetingService — Supabase CRUD for `family_meetings`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §9):
//   id, patient_id, title, scheduled_at, duration, status, participants (jsonb),
//   agenda, discussion_notes, resume, created_at, updated_at
//
// The TS type `FamilyMeetingRecord` has extra fields (`followUpActions`,
// `meetingUrl`, `createdBy`) that don't exist as DB columns — those are
// serialized into the `participants` JSONB under `__extras` so they survive
// a round-trip.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, safeJsonParse } from './_common';
import type { FamilyMeetingRecord, FamilyMeetingParticipant } from '@/lib/types';

function fromDb(row: any): FamilyMeetingRecord {
  const rawParticipants: any = safeJsonParse<any>(row.participants, []);
  let participants: FamilyMeetingParticipant[] = [];
  let extras: Record<string, any> | undefined;
  if (Array.isArray(rawParticipants)) {
    participants = rawParticipants;
  } else if (rawParticipants && typeof rawParticipants === 'object' && Array.isArray(rawParticipants.items)) {
    participants = rawParticipants.items;
    extras = rawParticipants.__extras;
  }
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    title: row.title ?? '',
    scheduledAt: row.scheduled_at ?? new Date().toISOString(),
    duration: row.duration ?? undefined,
    status: (row.status as any) ?? 'dijadwalkan',
    participants,
    agenda: row.agenda ?? undefined,
    discussionNotes: row.discussion_notes ?? undefined,
    resume: row.resume ?? undefined,
    followUpActions: extras?.followUpActions,
    meetingUrl: extras?.meetingUrl,
    createdBy: extras?.createdBy ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<FamilyMeetingRecord>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.title !== undefined) out.title = data.title;
  if (data.scheduledAt !== undefined) out.scheduled_at = data.scheduledAt;
  if (data.duration !== undefined) out.duration = data.duration;
  if (data.status !== undefined) out.status = data.status;
  if (data.agenda !== undefined) out.agenda = data.agenda;
  if (data.discussionNotes !== undefined) out.discussion_notes = data.discussionNotes;
  if (data.resume !== undefined) out.resume = data.resume;

  // `participants` is JSONB. Store the array AND tuck extra TS-only fields
  // (followUpActions, meetingUrl, createdBy) under `__extras`.
  if (data.participants !== undefined || data.followUpActions !== undefined ||
      data.meetingUrl !== undefined || data.createdBy !== undefined) {
    const items = Array.isArray(data.participants) ? data.participants : [];
    const extras: Record<string, any> = {};
    if (data.followUpActions !== undefined) extras.followUpActions = data.followUpActions;
    if (data.meetingUrl !== undefined) extras.meetingUrl = data.meetingUrl;
    if (data.createdBy !== undefined) extras.createdBy = data.createdBy;
    out.participants = Object.keys(extras).length > 0 ? { items, __extras: extras } : items;
  }
  return stripUndefined(out);
}

export const familyMeetingService = {
  async getAll(patientId: string): Promise<FamilyMeetingRecord[]> {
    const rows = await safeQuery(
      supabase
        .from('family_meetings')
        .select('*')
        .eq('patient_id', patientId)
        .order('scheduled_at', { ascending: false }),
      [] as any[],
      'familyMeetingService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<FamilyMeetingRecord>): Promise<FamilyMeetingRecord | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[familyMeetingService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[familyMeetingService.create] payload:', { patient_id: data.palliativePatientId, title: payload.title });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('family_meetings').insert(payload).select().single(),
      'familyMeetingService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<FamilyMeetingRecord>): Promise<FamilyMeetingRecord | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('family_meetings').update(payload).eq('id', id).select().single(),
      'familyMeetingService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('family_meetings').delete().eq('id', id),
      null as any,
      'familyMeetingService.remove'
    );
    return res !== null;
  },
};
