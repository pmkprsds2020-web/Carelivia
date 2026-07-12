// ───────────────────────────────────────────────────────────────────────────
// clinicalAlertService — Supabase CRUD for `clinical_alerts`
// ───────────────────────────────────────────────────────────────────────────
//
// The DB schema (supabase/schema.sql) has these columns:
//   id, patient_id, alert_type, severity (hijau|kuning|merah), title,
//   description, values (jsonb), is_read (bool), created_at
//
// The Clinical Alert EWS module needs richer fields:
//   severityLevel (LOW|MEDIUM|HIGH|CRITICAL), status (ACTIVE|ACKNOWLEDGED|RESOLVED),
//   sourceModule, sourceRecordId, kategori, recommendation,
//   acknowledgedBy, acknowledgedAt, resolvedBy, resolvedAt, doctorId, notes
//
// We store ALL extra fields inside the `values` JSONB column so we don't need
// DDL changes. The `severity` column maps: CRITICAL→merah, HIGH→merah,
// MEDIUM→kuning, LOW→hijau. The `is_read` column is true when status is
// ACKNOWLEDGED or RESOLVED.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, validUuidOrUndefined } from './_common';
import type {
  PalliativeClinicalAlert,
  ClinicalAlertSeverity,
  ClinicalAlertStatus,
  ClinicalAlertSource,
} from '@/lib/types';

// ── Severity mapping ────────────────────────────────────────────────────────

/** Map a rich severity level to the DB's hijau/kuning/merah enum. */
export function severityLevelToDb(level: ClinicalAlertSeverity): 'hijau' | 'kuning' | 'merah' {
  switch (level) {
    case 'CRITICAL':
    case 'HIGH':
      return 'merah';
    case 'MEDIUM':
      return 'kuning';
    case 'LOW':
    default:
      return 'hijau';
  }
}

/** Reverse-map the DB severity back to a rich level. */
export function dbToSeverityLevel(db: string): ClinicalAlertSeverity {
  switch (db) {
    case 'merah':
      return 'CRITICAL';
    case 'kuning':
      return 'MEDIUM';
    case 'hijau':
    default:
      return 'LOW';
  }
}

// ── Row mapping ─────────────────────────────────────────────────────────────

function fromDb(row: any): PalliativeClinicalAlert {
  const v = (row.values ?? {}) as Record<string, any>;
  return {
    id: row.id,
    patientId: row.patient_id ?? '',
    palliativePatientId: row.patient_id ?? undefined,
    alertType: row.alert_type ?? 'clinical_alert',
    severity: row.severity ?? 'kuning',
    title: row.title ?? '',
    description: row.description ?? '',
    values: v,
    isRead: !!row.is_read,
    createdAt: row.created_at ?? new Date().toISOString(),
    // Rich fields from JSONB
    severityLevel: v.severityLevel ?? dbToSeverityLevel(row.severity ?? 'kuning'),
    status: v.status ?? (row.is_read ? 'ACKNOWLEDGED' : 'ACTIVE'),
    sourceModule: v.sourceModule ?? 'manual',
    sourceRecordId: v.sourceRecordId ?? undefined,
    kategori: v.kategori ?? undefined,
    recommendation: v.recommendation ?? undefined,
    acknowledgedBy: v.acknowledgedBy ?? undefined,
    acknowledgedAt: v.acknowledgedAt ?? undefined,
    resolvedBy: v.resolvedBy ?? undefined,
    resolvedAt: v.resolvedAt ?? undefined,
    doctorId: v.doctorId ?? validUuidOrUndefined(row.doctor_id),
    notes: v.notes ?? undefined,
  };
}

/** Build the `values` JSONB payload from the alert's rich fields. */
function buildValuesPayload(data: Partial<PalliativeClinicalAlert>): Record<string, any> {
  const v: Record<string, any> = {};
  if (data.severityLevel !== undefined) v.severityLevel = data.severityLevel;
  if (data.status !== undefined) v.status = data.status;
  if (data.sourceModule !== undefined) v.sourceModule = data.sourceModule;
  if (data.sourceRecordId !== undefined) v.sourceRecordId = data.sourceRecordId;
  if (data.kategori !== undefined) v.kategori = data.kategori;
  if (data.recommendation !== undefined) v.recommendation = data.recommendation;
  if (data.acknowledgedBy !== undefined) v.acknowledgedBy = data.acknowledgedBy;
  if (data.acknowledgedAt !== undefined) v.acknowledgedAt = data.acknowledgedAt;
  if (data.resolvedBy !== undefined) v.resolvedBy = data.resolvedBy;
  if (data.resolvedAt !== undefined) v.resolvedAt = data.resolvedAt;
  if (data.doctorId !== undefined) v.doctorId = data.doctorId;
  if (data.notes !== undefined) v.notes = data.notes;
  return v;
}

function toDb(data: Partial<PalliativeClinicalAlert>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.alertType !== undefined) out.alert_type = data.alertType;
  if (data.severityLevel !== undefined) {
    out.severity = severityLevelToDb(data.severityLevel);
  } else if (data.severity !== undefined) {
    out.severity = data.severity;
  }
  if (data.title !== undefined) out.title = data.title;
  if (data.description !== undefined) out.description = data.description;
  // Merge rich fields into values JSONB
  const valuesPayload = buildValuesPayload(data);
  if (Object.keys(valuesPayload).length > 0) out.values = valuesPayload;
  // is_read = true when acknowledged or resolved
  if (data.status === 'ACKNOWLEDGED' || data.status === 'RESOLVED') {
    out.is_read = true;
  } else if (data.status === 'ACTIVE') {
    out.is_read = false;
  } else if (data.isRead !== undefined) {
    out.is_read = data.isRead;
  }
  return out;
}

// ── Service ─────────────────────────────────────────────────────────────────

export interface CreateAlertInput {
  patientId: string;
  doctorId?: string;
  alertType: PalliativeClinicalAlert['alertType'];
  severityLevel: ClinicalAlertSeverity;
  title: string;
  description: string;
  sourceModule: ClinicalAlertSource;
  sourceRecordId?: string;
  kategori?: string;
  recommendation?: string;
  status?: ClinicalAlertStatus;
}

export const clinicalAlertService = {
  /**
   * Get all alerts for a patient, newest first.
   */
  async getByPatient(patientId: string): Promise<PalliativeClinicalAlert[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('clinical_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'clinicalAlertService.getByPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Get ALL alerts for ALL patients (for the doctor's cross-patient view).
   */
  async getAll(limit = 500): Promise<PalliativeClinicalAlert[]> {
    const rows = await safeQuery(
      supabase
        .from('clinical_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      [] as any[],
      'clinicalAlertService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Get active (non-resolved) alerts for a patient.
   */
  async getActive(patientId: string): Promise<PalliativeClinicalAlert[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('clinical_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'clinicalAlertService.getActive'
    );
    return (rows as any[])
      .map(fromDb)
      .filter((a) => a.status !== 'RESOLVED');
  },

  /**
   * Create a new alert. Deduplicates by (patient_id, alert_type, source_record_id)
   * — if an ACTIVE alert with the same source already exists, it is NOT recreated.
   */
  async create(input: CreateAlertInput): Promise<PalliativeClinicalAlert | null> {
    if (!isValidUuid(input.patientId)) {
      console.error(
        '[clinicalAlertService.create] ABORTED — patient_id is not a valid UUID.',
        { received: input.patientId }
      );
      return null;
    }

    // ── Deduplication ───────────────────────────────────────────────────
    // If sourceRecordId is provided, check whether an ACTIVE alert for the
    // same patient + sourceRecordId already exists. This prevents duplicate
    // alerts when the Rule Engine runs multiple times.
    if (input.sourceRecordId) {
      const existing = await this.getByPatient(input.patientId);
      const dup = existing.find(
        (a) =>
          a.status !== 'RESOLVED' &&
          a.sourceRecordId === input.sourceRecordId &&
          a.alertType === input.alertType
      );
      if (dup) {
        // Already have an active alert for this source — skip.
        return dup;
      }
    }

    const alertData: Partial<PalliativeClinicalAlert> = {
      palliativePatientId: input.patientId,
      alertType: input.alertType,
      severityLevel: input.severityLevel,
      title: input.title,
      description: input.description,
      sourceModule: input.sourceModule,
      sourceRecordId: input.sourceRecordId,
      kategori: input.kategori,
      recommendation: input.recommendation,
      status: input.status ?? 'ACTIVE',
      doctorId: input.doctorId,
      isRead: false,
    };
    const payload = toDb(alertData);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('clinical_alerts').insert(payload).select().single(),
      'clinicalAlertService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  /**
   * Acknowledge an alert — sets status to ACKNOWLEDGED and records who/when.
   */
  async acknowledge(
    alertId: string,
    acknowledgedBy: string,
    notes?: string
  ): Promise<PalliativeClinicalAlert | null> {
    const valuesPayload: Record<string, any> = {
      status: 'ACKNOWLEDGED',
      acknowledgedBy,
      acknowledgedAt: new Date().toISOString(),
    };
    if (notes) valuesPayload.notes = notes;
    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('clinical_alerts')
        .update({ is_read: true, values: valuesPayload })
        .eq('id', alertId)
        .select()
        .single(),
      'clinicalAlertService.acknowledge'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  /**
   * Resolve an alert — sets status to RESOLVED and records who/when.
   */
  async resolve(
    alertId: string,
    resolvedBy: string,
    notes?: string
  ): Promise<PalliativeClinicalAlert | null> {
    const valuesPayload: Record<string, any> = {
      status: 'RESOLVED',
      resolvedBy,
      resolvedAt: new Date().toISOString(),
    };
    if (notes) valuesPayload.notes = notes;
    const { data: row, error } = await safeInsert<any>(
      supabase
        .from('clinical_alerts')
        .update({ is_read: true, values: valuesPayload })
        .eq('id', alertId)
        .select()
        .single(),
      'clinicalAlertService.resolve'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  /**
   * Add a note to an existing alert (merges into the values JSONB).
   */
  async addNote(alertId: string, note: string): Promise<boolean> {
    // Fetch current values, append note, then update.
    const { data: current } = await supabase
      .from('clinical_alerts')
      .select('values')
      .eq('id', alertId)
      .single();
    const existingValues = (current?.values ?? {}) as Record<string, any>;
    const existingNotes = (existingValues.notes as string) ?? '';
    const updatedNotes = existingNotes
      ? `${existingNotes}\n---\n[${new Date().toISOString()}] ${note}`
      : `[${new Date().toISOString()}] ${note}`;
    const { error } = await supabase
      .from('clinical_alerts')
      .update({ values: { ...existingValues, notes: updatedNotes } })
      .eq('id', alertId);
    if (error) {
      console.error('[clinicalAlertService.addNote]', error.message);
      return false;
    }
    return true;
  },

  /**
   * Permanently delete an alert (admin only — normally alerts are RESOLVED, not deleted).
   */
  async remove(alertId: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('clinical_alerts').delete().eq('id', alertId),
      null as any,
      'clinicalAlertService.remove'
    );
    return res !== null;
  },
};
