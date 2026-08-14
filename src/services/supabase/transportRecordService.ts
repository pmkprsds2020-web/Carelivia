// ───────────────────────────────────────────────────────────────────────────
// transportRecordService — Supabase CRUD for `transport_records`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §13):
//   id, patient_id, need_type, status, pickup_location, destination,
//   scheduled_at, notes, created_at
//
// The TS type `TransportRecord` has extra fields (`type`↔`need_type`,
// `origin`↔`pickup_location`, `completedAt`, `requestedBy`, `updatedAt`) —
// the extra fields are tucked into `notes` as a JSON prefix.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, safeJsonParse } from './_common';
import type { TransportRecord } from '@/lib/types';

const EXTRAS_PREFIX = '__EXTRAS__:';

interface TransportExtras {
  completedAt?: string;
  requestedBy?: string;
  source?: 'patient' | 'doctor';
  requestedTime?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  rejectionReason?: string;
}

function fromDb(row: any): TransportRecord {
  const rawNotes: string = row.notes ?? '';
  let extras: TransportExtras = {};
  let notes: string | undefined = rawNotes;
  if (rawNotes.startsWith(EXTRAS_PREFIX)) {
    extras = safeJsonParse<any>(rawNotes.slice(EXTRAS_PREFIX.length), {});
    notes = undefined;
  }
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    type: (row.need_type as any) ?? 'kendaraan_pribadi',
    status: (row.status as any) ?? 'belum_dipesan',
    scheduledAt: row.scheduled_at ?? undefined,
    completedAt: extras.completedAt,
    origin: row.pickup_location ?? '',
    destination: row.destination ?? '',
    notes,
    requestedBy: extras.requestedBy ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.created_at ?? new Date().toISOString(),
    source: extras.source,
    requestedTime: extras.requestedTime,
    confirmedBy: extras.confirmedBy,
    confirmedAt: extras.confirmedAt,
    rejectionReason: extras.rejectionReason,
  };
}

function toDb(data: Partial<TransportRecord>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.type !== undefined) out.need_type = data.type;
  if (data.status !== undefined) out.status = data.status;
  if (data.origin !== undefined) out.pickup_location = data.origin;
  if (data.destination !== undefined) out.destination = data.destination;
  if (data.scheduledAt !== undefined) out.scheduled_at = data.scheduledAt;

  // Encode extra TS-only fields (not columns of their own) into `notes`,
  // prefixed so fromDb() can tell it apart from a genuine free-text note.
  const extraKeys: (keyof TransportExtras)[] = [
    'completedAt', 'requestedBy', 'source', 'requestedTime', 'confirmedBy', 'confirmedAt', 'rejectionReason',
  ];
  const touchesExtras = extraKeys.some((k) => (data as any)[k] !== undefined) || data.notes !== undefined;
  if (touchesExtras) {
    const extras: Record<string, any> = {};
    for (const k of extraKeys) {
      if ((data as any)[k] !== undefined) extras[k] = (data as any)[k];
    }
    const userNotes = data.notes ?? '';
    out.notes = Object.keys(extras).length > 0
      ? `${EXTRAS_PREFIX}${JSON.stringify(extras)}${userNotes ? ' ' + userNotes : ''}`
      : userNotes;
  }
  return stripUndefined(out);
}

export const transportRecordService = {
  async getAll(patientId: string): Promise<TransportRecord[]> {
    const rows = await safeQuery(
      supabase
        .from('transport_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'transportRecordService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<TransportRecord>): Promise<TransportRecord | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[transportRecordService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[transportRecordService.create] payload:', { patient_id: data.palliativePatientId });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('transport_records').insert(payload).select().single(),
      'transportRecordService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<TransportRecord>): Promise<TransportRecord | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('transport_records').update(payload).eq('id', id).select().single(),
      'transportRecordService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('transport_records').delete().eq('id', id),
      null as any,
      'transportRecordService.remove'
    );
    return res !== null;
  },
};
