// ───────────────────────────────────────────────────────────────────────────
// screeningFormService — Supabase CRUD for `screening_forms`
// (the comprehensive 12-module "Skrining Pasien" sent by a doctor and
// filled in by a patient — see supabase/migration_screening_forms.sql)
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, stripUndefined } from './_common';
import { getSupabaseAdmin } from '@/supabaseClient';
import type { ScreeningForm, ScreeningAuditLog } from '@/lib/types';

// Prefer the service-role admin client (server-only routes) so this never
// hits the `profiles`-embed RLS gap described in doctorService.ts. This
// table doesn't currently embed `profiles`, but staying consistent avoids
// surprises if that's added later.
async function dbClient() {
  return (await getSupabaseAdmin()) ?? supabase;
}

function fromDb(row: any): ScreeningForm {
  return {
    id: row.id,
    consultationId: row.consultation_id ?? '',
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    status: row.status,
    instructions: row.instructions ?? undefined,
    deadline: row.deadline ?? undefined,
    selectedModules: row.selected_modules ?? [],
    moduleAnswers: row.module_answers ?? {},
    moduleScores: row.module_scores ?? {},
    clinicalFiles: row.clinical_files ?? [],
    triageResult: row.triage_result ?? undefined,
    clinicalSummary: row.clinical_summary ?? undefined,
    doctorNotes: row.doctor_notes ?? undefined,
    followUp: row.follow_up ?? undefined,
    aiAnalysis: row.ai_analysis ?? undefined,
    completedAt: row.completed_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDbPatch(patch: Partial<ScreeningForm>): Record<string, any> {
  return stripUndefined({
    status: patch.status,
    instructions: patch.instructions,
    deadline: patch.deadline,
    selected_modules: patch.selectedModules,
    module_answers: patch.moduleAnswers,
    module_scores: patch.moduleScores,
    clinical_files: patch.clinicalFiles,
    triage_result: patch.triageResult,
    clinical_summary: patch.clinicalSummary,
    doctor_notes: patch.doctorNotes,
    follow_up: patch.followUp,
    ai_analysis: patch.aiAnalysis,
    completed_at: patch.completedAt,
    reviewed_at: patch.reviewedAt,
  });
}

export const screeningFormService = {
  async create(input: {
    consultationId?: string;
    doctorId: string;
    patientId: string;
    instructions?: string;
    deadline?: string;
    selectedModules: string[];
  }): Promise<ScreeningForm | null> {
    const client = await dbClient();
    const { data: row, error } = await safeInsert<any>(
      client
        .from('screening_forms')
        .insert(
          stripUndefined({
            consultation_id: input.consultationId || null,
            doctor_id: input.doctorId,
            patient_id: input.patientId,
            status: 'sent',
            instructions: input.instructions || null,
            deadline: input.deadline || null,
            selected_modules: input.selectedModules,
            module_answers: {},
            module_scores: {},
            clinical_files: [],
            audit_log: [{ action: 'sent', performedBy: input.doctorId, timestamp: new Date().toISOString() }],
          })
        )
        .select('*')
        .single(),
      'screeningFormService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async getById(id: string): Promise<ScreeningForm | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const row = await safeQuery(
      client.from('screening_forms').select('*').eq('id', id).single(),
      null as any,
      'screeningFormService.getById'
    );
    return row ? fromDb(row) : null;
  },

  async listForPatient(patientId: string): Promise<ScreeningForm[]> {
    if (!isValidUuid(patientId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('screening_forms').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      [] as any[],
      'screeningFormService.listForPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  async listForDoctor(doctorId: string): Promise<ScreeningForm[]> {
    if (!isValidUuid(doctorId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('screening_forms').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
      [] as any[],
      'screeningFormService.listForDoctor'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Patch a form's mutable fields (answers, status, scores, doctor review…).
   * Also appends one entry to `audit_log` when `audit` is given, so every
   * meaningful transition (opened, in_progress, completed, reviewed) has a
   * durable trail — mirrors what the old local-only `addAuditLog` store
   * action used to do, but persisted this time.
   */
  async update(
    id: string,
    patch: Partial<ScreeningForm>,
    audit?: { action: ScreeningAuditLog['action']; performedBy: string; details?: string }
  ): Promise<ScreeningForm | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();

    const updatePayload = toDbPatch(patch);

    if (audit) {
      const current = await safeQuery(
        client.from('screening_forms').select('audit_log').eq('id', id).single(),
        null as any,
        'screeningFormService.update(audit lookup)'
      );
      const existingLog = Array.isArray((current as any)?.audit_log) ? (current as any).audit_log : [];
      updatePayload.audit_log = [
        ...existingLog,
        { action: audit.action, performedBy: audit.performedBy, timestamp: new Date().toISOString(), details: audit.details },
      ];
    }

    const { data: row, error } = await safeInsert<any>(
      client.from('screening_forms').update(updatePayload).eq('id', id).select('*').single(),
      'screeningFormService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
