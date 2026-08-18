// ───────────────────────────────────────────────────────────────────────────
// soapService — Supabase CRUD for `palliative_soap_notes`
// ───────────────────────────────────────────────────────────────────────────
// Backs the "SOAP" tab in Monitoring Paliatif — see migration_palliative_soap.sql.
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';

export type SoapStatus = 'draft' | 'final';

export interface SoapNoteRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  encounterDate: string; // YYYY-MM-DD
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  sourceSummary?: Record<string, unknown>;
  status: SoapStatus;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  finalizedBy?: string;
}

function fromDb(row: any): SoapNoteRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id ?? undefined,
    encounterDate: row.encounter_date,
    subjective: row.subjective ?? '',
    objective: row.objective ?? '',
    assessment: row.assessment ?? '',
    plan: row.plan ?? '',
    sourceSummary: row.source_summary ?? undefined,
    status: row.status ?? 'draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finalizedAt: row.finalized_at ?? undefined,
    finalizedBy: row.finalized_by ?? undefined,
  };
}

export const soapService = {
  /** All SOAP notes for a patient, most recent encounter date first. */
  async getForPatient(patientId: string): Promise<SoapNoteRecord[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase.from('palliative_soap_notes').select('*').eq('patient_id', patientId).order('encounter_date', { ascending: false }),
      [] as any[],
      'soapService.getForPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  async getByDate(patientId: string, encounterDate: string): Promise<SoapNoteRecord | null> {
    if (!isValidUuid(patientId)) return null;
    const row = await safeQuery(
      supabase.from('palliative_soap_notes').select('*').eq('patient_id', patientId).eq('encounter_date', encounterDate).maybeSingle(),
      null as any,
      'soapService.getByDate'
    );
    return row ? fromDb(row) : null;
  },

  /**
   * Create-or-update the SOAP note for a given patient + date (one row per
   * day — see the unique constraint in the migration). Used both by
   * "Generate Draft SOAP" (which regenerates S/O/A/P from source data) and
   * by "Simpan Draft" (which persists the doctor's manual edits) — either
   * way it's the same upsert, never a fresh duplicate row for that date.
   */
  async upsert(input: {
    patientId: string;
    doctorId?: string;
    encounterDate: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    sourceSummary?: Record<string, unknown>;
  }): Promise<SoapNoteRecord> {
    if (!isValidUuid(input.patientId)) throw new Error('patientId tidak valid');

    const payload: Record<string, any> = {
      patient_id: input.patientId,
      encounter_date: input.encounterDate,
      subjective: input.subjective,
      objective: input.objective,
      assessment: input.assessment,
      plan: input.plan,
      updated_at: new Date().toISOString(),
    };
    if (input.doctorId && isValidUuid(input.doctorId)) payload.doctor_id = input.doctorId;
    if (input.sourceSummary) payload.source_summary = input.sourceSummary;

    const { data: row, error } = await safeInsert<any>(
      supabase.from('palliative_soap_notes').upsert(payload, { onConflict: 'patient_id,encounter_date' }).select().maybeSingle(),
      'soapService.upsert'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Gagal menyimpan SOAP.');
    return fromDb(row);
  },

  /**
   * Locks the SOAP note as Final. A finalized note can still be viewed and
   * (per the migration's design intent) edited by a doctor if truly needed —
   * this app doesn't yet implement a separate amendment-history mechanism,
   * so re-saving a finalized note simply updates it in place; `finalizedAt`/
   * `finalizedBy` are preserved from the original finalization.
   */
  async finalize(id: string, doctorId: string): Promise<SoapNoteRecord> {
    if (!isValidUuid(id)) throw new Error('id tidak valid');
    const payload: Record<string, any> = {
      status: 'final',
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (isValidUuid(doctorId)) payload.finalized_by = doctorId;

    const { data: row, error } = await safeInsert<any>(
      supabase.from('palliative_soap_notes').update(payload).eq('id', id).select().maybeSingle(),
      'soapService.finalize'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('SOAP tidak ditemukan.');
    return fromDb(row);
  },
};
