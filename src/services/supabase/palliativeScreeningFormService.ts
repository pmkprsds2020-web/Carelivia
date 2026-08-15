// ───────────────────────────────────────────────────────────────────────────
// palliativeScreeningFormService — Supabase CRUD for `palliative_screening_forms`
// (the multi-tool "Skrining Paliatif" envelope sent by a doctor via chat and
// filled in tool-by-tool by a patient — see
// supabase/migration_palliative_screening_forms.sql)
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, stripUndefined } from './_common';
import { getSupabaseAdmin } from '@/supabaseClient';
import type { PalliativeScreeningForm } from '@/lib/types';

async function dbClient() {
  return (await getSupabaseAdmin()) ?? supabase;
}

function fromDb(row: any): PalliativeScreeningForm {
  return {
    id: row.id,
    consultationId: row.consultation_id ?? '',
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    status: row.status,
    instructions: row.instructions ?? undefined,
    selectedTools: row.selected_tools ?? [],
    toolAnswers: row.tool_answers ?? {},
    toolResults: row.tool_results ?? {},
    doctorNotes: row.doctor_notes ?? undefined,
    completedAt: row.completed_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDbPatch(patch: Partial<PalliativeScreeningForm>): Record<string, any> {
  return stripUndefined({
    status: patch.status,
    instructions: patch.instructions,
    selected_tools: patch.selectedTools,
    tool_answers: patch.toolAnswers,
    tool_results: patch.toolResults,
    doctor_notes: patch.doctorNotes,
    completed_at: patch.completedAt,
    reviewed_at: patch.reviewedAt,
  });
}

export const palliativeScreeningFormService = {
  async create(input: {
    consultationId?: string;
    doctorId: string;
    patientId: string;
    instructions?: string;
    selectedTools: string[];
  }): Promise<PalliativeScreeningForm | null> {
    const client = await dbClient();
    const { data: row, error } = await safeInsert<any>(
      client
        .from('palliative_screening_forms')
        .insert(
          stripUndefined({
            consultation_id: input.consultationId || null,
            doctor_id: input.doctorId,
            patient_id: input.patientId,
            status: 'sent',
            instructions: input.instructions || null,
            selected_tools: input.selectedTools,
            tool_answers: {},
            tool_results: {},
            audit_log: [{ action: 'sent', performedBy: input.doctorId, timestamp: new Date().toISOString() }],
          })
        )
        .select('*')
        .single(),
      'palliativeScreeningFormService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async getById(id: string): Promise<PalliativeScreeningForm | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const row = await safeQuery(
      client.from('palliative_screening_forms').select('*').eq('id', id).single(),
      null as any,
      'palliativeScreeningFormService.getById'
    );
    return row ? fromDb(row) : null;
  },

  async listForPatient(patientId: string): Promise<PalliativeScreeningForm[]> {
    if (!isValidUuid(patientId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('palliative_screening_forms').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      [] as any[],
      'palliativeScreeningFormService.listForPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  async listForDoctor(doctorId: string): Promise<PalliativeScreeningForm[]> {
    if (!isValidUuid(doctorId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('palliative_screening_forms').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
      [] as any[],
      'palliativeScreeningFormService.listForDoctor'
    );
    return (rows as any[]).map(fromDb);
  },

  async update(
    id: string,
    patch: Partial<PalliativeScreeningForm>,
    audit?: { action: string; performedBy: string; details?: string }
  ): Promise<PalliativeScreeningForm | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();

    const updatePayload = toDbPatch(patch);

    if (audit) {
      const current = await safeQuery(
        client.from('palliative_screening_forms').select('audit_log').eq('id', id).single(),
        null as any,
        'palliativeScreeningFormService.update(audit lookup)'
      );
      const existingLog = Array.isArray((current as any)?.audit_log) ? (current as any).audit_log : [];
      updatePayload.audit_log = [
        ...existingLog,
        { action: audit.action, performedBy: audit.performedBy, timestamp: new Date().toISOString(), details: audit.details },
      ];
    }

    const { data: row, error } = await safeInsert<any>(
      client.from('palliative_screening_forms').update(updatePayload).eq('id', id).select('*').single(),
      'palliativeScreeningFormService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
