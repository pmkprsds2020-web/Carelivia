// ───────────────────────────────────────────────────────────────────────────
// medicalSystemReviewService — Supabase CRUD for `medical_system_review`
// (Anamnesis Sistem / Review of Systems)
// ───────────────────────────────────────────────────────────────────────────
//
// Idempotency: `saveEncounter()` always UPSERTs on the unique key
// (patient_id, encounter_id, symptom_code) — it never plain-INSERTs. Calling
// it twice with the same encounterId (double click, retry, resumed draft)
// updates the same ~90 rows instead of creating duplicates. The caller is
// still responsible for disabling the Save button while a save is in
// flight (see AnamnesisSistemPanel) — this service only guarantees that a
// *duplicate request* cannot create duplicate *rows*.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, validUuidOrUndefined, stripUndefined } from './_common';
import type { RosItemRecord, RosEncounterSummary, RosReviewStatus } from '@/lib/types';

function fromDb(row: any): RosItemRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id ?? undefined,
    encounterId: row.encounter_id,
    assessmentDate: row.assessment_date ?? row.created_at,
    systemName: row.system_name,
    symptomCode: row.symptom_code,
    symptomName: row.symptom_name,
    status: row.status,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(
  item: RosItemRecord,
  reviewStatus: RosReviewStatus,
  actorId?: string
): Record<string, any> {
  return stripUndefined({
    patient_id: item.patientId,
    doctor_id: validUuidOrUndefined(item.doctorId),
    encounter_id: item.encounterId,
    assessment_date: item.assessmentDate,
    system_name: item.systemName,
    symptom_code: item.symptomCode,
    symptom_name: item.symptomName,
    // Only persist detail text when the item is actually positive — matches
    // spec §16 ("detail hanya boleh disimpan jika status = positive").
    status: item.status,
    detail: item.status === 'positive' ? (item.detail?.trim() || null) : null,
    review_status: reviewStatus,
    updated_by: validUuidOrUndefined(actorId),
  });
}

export const medicalSystemReviewService = {
  /**
   * Save (create or update) one full Anamnesis Sistem encounter.
   * `items` should normally be the FULL set of ~90 items (not just the
   * changed ones) so the encounter always reflects the complete form.
   */
  async saveEncounter(
    items: RosItemRecord[],
    reviewStatus: RosReviewStatus,
    actorId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (items.length === 0) return { ok: true };
    const patientId = items[0].patientId;
    if (!isValidUuid(patientId)) {
      console.error('[medicalSystemReviewService.saveEncounter] ABORTED — invalid patient_id', patientId);
      return { ok: false, error: 'ID pasien tidak valid.' };
    }

    const rows = items.map((item) => ({
      ...toDb(item, reviewStatus, actorId),
      created_by: validUuidOrUndefined(item.doctorId),
    }));

    const { error } = await safeInsert<any>(
      supabase
        .from('medical_system_review')
        .upsert(rows, { onConflict: 'patient_id,encounter_id,symptom_code' })
        .select(),
      'medicalSystemReviewService.saveEncounter'
    );
    if (error) return { ok: false, error };
    return { ok: true };
  },

  /** Fetch every item belonging to one encounter (for resuming a draft or viewing detail). */
  async getEncounter(patientId: string, encounterId: string): Promise<RosItemRecord[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('medical_system_review')
        .select('*')
        .eq('patient_id', patientId)
        .eq('encounter_id', encounterId)
        .order('created_at', { ascending: true }),
      [] as any[],
      'medicalSystemReviewService.getEncounter'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Fetch every encounter for a patient, most recent first, grouped and
   * ready for a history list. Each encounter's `reviewStatus` is taken from
   * its rows (they're all written with the same value in saveEncounter).
   */
  async getHistory(patientId: string, doctorNameLookup?: (doctorId?: string) => string | undefined): Promise<RosEncounterSummary[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('medical_system_review')
        .select('*')
        .eq('patient_id', patientId)
        .order('assessment_date', { ascending: false }),
      [] as any[],
      'medicalSystemReviewService.getHistory'
    );
    const items = (rows as any[]).map(fromDb);

    const byEncounter = new Map<string, RosItemRecord[]>();
    for (const item of items) {
      const list = byEncounter.get(item.encounterId) ?? [];
      list.push(item);
      byEncounter.set(item.encounterId, list);
    }

    // review_status isn't on RosItemRecord (the UI doesn't need it per item),
    // so read it straight from the raw rows instead.
    const reviewStatusByEncounter = new Map<string, RosReviewStatus>();
    for (const r of rows as any[]) {
      reviewStatusByEncounter.set(r.encounter_id, r.review_status);
    }

    const summaries: RosEncounterSummary[] = [];
    for (const [encounterId, encItems] of byEncounter) {
      const first = encItems[0];
      summaries.push({
        encounterId,
        patientId,
        doctorId: first.doctorId,
        doctorName: doctorNameLookup?.(first.doctorId),
        assessmentDate: first.assessmentDate,
        reviewStatus: reviewStatusByEncounter.get(encounterId) ?? 'completed',
        items: encItems,
      });
    }

    summaries.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
    return summaries;
  },

  /** Convenience: latest encounter for a patient (for the dashboard widget). */
  async getLatest(patientId: string): Promise<RosEncounterSummary | null> {
    const history = await this.getHistory(patientId);
    return history[0] ?? null;
  },
};
