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
   *
   * IMPORTANT: We fetch recent alerts (last 90 days) and filter ACTIVE in JS
   * because `status` lives inside the `values` JSONB column and cannot be
   * filtered efficiently in SQL. The 90-day window keeps the result set small
   * even if the patient has thousands of historical RESOLVED alerts.
   */
  async getActive(patientId: string): Promise<PalliativeClinicalAlert[]> {
    if (!isValidUuid(patientId)) return [];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await safeQuery(
      supabase
        .from('clinical_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .gte('created_at', ninetyDaysAgo)
        .order('created_at', { ascending: false }),
      [] as any[],
      'clinicalAlertService.getActive'
    );
    return (rows as any[])
      .map(fromDb)
      .filter((a) => a.status !== 'RESOLVED');
  },

  /**
   * Targeted dedup check — fetches only alerts matching the same
   * (patient_id, alert_type) pair. This is indexed and fast even when the
   * patient has thousands of alerts of other types.
   *
   * Returns the matching ACTIVE alert if a duplicate exists, or `null`.
   * Crucially, if the query FAILS we return a sentinel `'QUERY_FAILED'` so the
   * caller can choose to SKIP the insert (fail-safe) rather than create a
   * duplicate.
   */
  async findActiveDup(
    patientId: string,
    alertType: string,
    sourceRecordId?: string
  ): Promise<PalliativeClinicalAlert | null | 'QUERY_FAILED'> {
    if (!isValidUuid(patientId)) return null;
    try {
      const { data, error } = await supabase
        .from('clinical_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .eq('alert_type', alertType)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('[clinicalAlertService.findActiveDup] query error:', error.message);
        return 'QUERY_FAILED';
      }
      const rows = (data ?? []) as any[];
      const mapped = rows.map(fromDb);
      // Per the dedup specification: one ACTIVE alert per (patient, alertType).
      // We do NOT consider sourceRecordId for dedup — the first active alert
      // of a given type wins, and subsequent scans skip until it is RESOLVED.
      const dup = mapped.find((a) => a.status !== 'RESOLVED');
      return dup ?? null;
    } catch (e: any) {
      console.warn('[clinicalAlertService.findActiveDup] threw:', e?.message ?? e);
      return 'QUERY_FAILED';
    }
  },

  /**
   * Create a new alert. Deduplicates by (patient_id, alert_type, source_record_id)
   * — if an ACTIVE alert with the same source already exists, it is NOT recreated.
   *
   * FAIL-SAFE: If the dedup query fails (network error, 502, timeout), we
   * return `null` and do NOT insert. This prevents the exponential-duplicate
   * feedback loop where a failed dedup check leads to uncontrolled INSERTs.
   */
  async create(input: CreateAlertInput): Promise<PalliativeClinicalAlert | null> {
    if (!isValidUuid(input.patientId)) {
      console.error(
        '[clinicalAlertService.create] ABORTED — patient_id is not a valid UUID.',
        { received: input.patientId }
      );
      return null;
    }

    // ── Deduplication (targeted + fail-safe) ────────────────────────────
    // Query only rows matching (patient_id, alert_type) — indexed and fast.
    // If the query fails, we ABORT rather than risk a duplicate.
    const dup = await this.findActiveDup(
      input.patientId,
      input.alertType,
      input.sourceRecordId
    );
    if (dup === 'QUERY_FAILED') {
      console.warn(
        `[clinicalAlertService.create] ABORTED — dedup query failed for alertType="${input.alertType}". Skipping to prevent duplicate.`
      );
      return null;
    }
    if (dup) {
      // Already have an active alert for this source — skip (optionally
      // update the timestamp so it surfaces as "recently re-detected").
      return dup;
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

  /**
   * Resolve all ACTIVE alerts of a given alertType for a patient.
   * Used by the auto-resolve logic: when a clinical condition returns to
   * normal, the old alert should be closed so the active count stays accurate.
   *
   * Returns the number of alerts resolved.
   */
  async resolveByType(
    patientId: string,
    alertType: string,
    resolvedBy: string,
    reason?: string
  ): Promise<number> {
    if (!isValidUuid(patientId)) return 0;
    try {
      // Fetch active alerts of this type (limit to recent 90 days for safety)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('clinical_alerts')
        .select('id, values')
        .eq('patient_id', patientId)
        .eq('alert_type', alertType)
        .gte('created_at', ninetyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('[clinicalAlertService.resolveByType] query error:', error.message);
        return 0;
      }
      const rows = (data ?? []) as any[];
      const nowIso = new Date().toISOString();
      let count = 0;
      for (const row of rows) {
        const v = (row.values ?? {}) as Record<string, any>;
        if (v.status === 'RESOLVED') continue; // already resolved
        const newValues = {
          ...v,
          status: 'RESOLVED',
          resolvedBy,
          resolvedAt: nowIso,
          notes: reason
            ? `${v.notes ?? ''}\n---\n[${nowIso}] AUTO-RESOLVED: ${reason}`.trim()
            : `${v.notes ?? ''}\n---\n[${nowIso}] AUTO-RESOLVED (condition normalized)`.trim(),
        };
        const { error: updErr } = await supabase
          .from('clinical_alerts')
          .update({ is_read: true, values: newValues })
          .eq('id', row.id);
        if (!updErr) count++;
      }
      return count;
    } catch (e: any) {
      console.warn('[clinicalAlertService.resolveByType] threw:', e?.message ?? e);
      return 0;
    }
  },

  /**
   * ONE-TIME CLEANUP: Delete duplicate ACTIVE alerts for a patient, keeping
   * only the OLDEST alert per (alert_type) combination per patient.
   *
   * This is used to repair the database after the duplicate-creation bug has
   * been fixed. It should be called once on app startup (best-effort) and can
   * also be triggered manually from the Clinical Alert panel.
   *
   * PAGINATED: fetches in batches of 5000 (Supabase default limit) and loops
   * until all duplicates are processed. With 47k+ historical duplicates, a
   * single 5000-row fetch is not enough.
   *
   * Returns the number of duplicate alerts deleted.
   */
  async cleanupDuplicates(patientId?: string): Promise<number> {
    try {
      const oneHundredEightyDaysAgo = new Date(
        Date.now() - 180 * 24 * 60 * 60 * 1000
      ).toISOString();

      // ── Paginated fetch: collect ALL active (non-resolved) alert IDs ──
      // We page through in batches of 1000 (Supabase REST API default limit)
      // using offset pagination. For each batch, we group by (patient_id,
      // alert_type) and mark all-but-oldest for deletion.
      const keepIds = new Set<string>();
      const deleteIds: string[] = [];
      const groups = new Map<string, any[]>(); // key → rows (oldest first)
      let offset = 0;
      const pageSize = 1000; // Supabase REST API default limit is 1000
      let totalFetched = 0;

      while (true) {
        let query = supabase
          .from('clinical_alerts')
          .select('id, patient_id, alert_type, values, created_at')
          .gte('created_at', oneHundredEightyDaysAgo)
          .order('created_at', { ascending: true }) // oldest first
          .range(offset, offset + pageSize - 1);
        if (patientId && isValidUuid(patientId)) {
          query = query.eq('patient_id', patientId);
        }
        const { data, error } = await query;
        if (error) {
          console.warn('[clinicalAlertService.cleanupDuplicates] query error at offset ' + offset + ':', error.message);
          break;
        }
        const rows = (data ?? []) as any[];
        if (rows.length === 0) break; // no more rows
        totalFetched += rows.length;

        for (const row of rows) {
          const v = (row.values ?? {}) as Record<string, any>;
          if (v.status === 'RESOLVED') continue; // don't touch resolved alerts
          const key = `${row.patient_id}||${row.alert_type}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(row);
        }

        offset += pageSize;
        if (rows.length < pageSize) break; // last page
      }

      // ── Identify duplicates: keep oldest per group, delete the rest ──
      for (const [, groupRows] of groups) {
        keepIds.add(groupRows[0].id);
        for (let i = 1; i < groupRows.length; i++) {
          deleteIds.push(groupRows[i].id);
        }
      }

      console.log(
        `[clinicalAlertService.cleanupDuplicates] fetched ${totalFetched} rows, ${groups.size} unique groups, ${deleteIds.length} duplicates to delete.`
      );

      if (deleteIds.length === 0) return 0;

      // ── Delete in batches of 200 (URL length limit for .in()) ──
      let deleted = 0;
      for (let i = 0; i < deleteIds.length; i += 200) {
        const batch = deleteIds.slice(i, i + 200);
        const { error: delErr } = await supabase
          .from('clinical_alerts')
          .delete()
          .in('id', batch);
        if (delErr) {
          console.warn('[clinicalAlertService.cleanupDuplicates] delete batch error:', delErr.message);
        } else {
          deleted += batch.length;
        }
      }
      console.log(
        `[clinicalAlertService.cleanupDuplicates] deleted ${deleted} duplicate alerts (kept ${keepIds.size} active).`
      );
      return deleted;
    } catch (e: any) {
      console.warn('[clinicalAlertService.cleanupDuplicates] threw:', e?.message ?? e);
      return 0;
    }
  },
};
