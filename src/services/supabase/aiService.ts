// ───────────────────────────────────────────────────────────────────────────
// aiService — Supabase CRUD for `ai_reports`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';

/**
 * A stored AI report — one row per AI generation (analysis, summary, etc.).
 */
export interface AIReport {
  id: string;
  patientId: string;
  reportType: string;
  prompt?: string;
  response?: string;
  metadata?: any;
  generatedBy?: string;
  createdAt: string;
}

function fromDb(row: any): AIReport {
  return {
    id: row.id,
    patientId: row.patient_id,
    reportType: row.report_type ?? '',
    prompt: row.prompt ?? undefined,
    response: row.response ?? undefined,
    metadata: row.metadata ?? undefined,
    generatedBy: row.generated_by ?? 'ai',
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<AIReport>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.patientId !== undefined) out.patient_id = data.patientId;
  if (data.reportType !== undefined) out.report_type = data.reportType;
  if (data.prompt !== undefined) out.prompt = data.prompt;
  if (data.response !== undefined) out.response = data.response;
  if (data.metadata !== undefined) out.metadata = data.metadata;
  if (data.generatedBy !== undefined) out.generated_by = data.generatedBy;
  return stripUndefined(out);
}

export const aiService = {
  /**
   * Persist an AI generation. Returns the inserted row, or null on failure.
   */
  async save(
    patientId: string,
    reportType: string,
    prompt?: string,
    response?: string,
    metadata?: any,
    generatedBy: string = 'ai'
  ): Promise<AIReport | null> {
    const payload = toDb({ patientId, reportType, prompt, response, metadata, generatedBy });
    const row = await safeQuery(
      supabase.from('ai_reports').insert(payload).select().single(),
      null as any,
      'aiService.save'
    );
    return row ? fromDb(row) : null;
  },

  /**
   * Get the latest N AI reports for a patient (any type). Default N = 20.
   */
  async getByPatient(patientId: string, limit: number = 20): Promise<AIReport[]> {
    const rows = await safeQuery(
      supabase
        .from('ai_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(limit),
      [] as any[],
      'aiService.getByPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Get the single most-recent AI report of the given type for a patient.
   */
  async getLatest(patientId: string, reportType: string): Promise<AIReport | null> {
    const rows = await safeQuery(
      supabase
        .from('ai_reports')
        .select('*')
        .eq('patient_id', patientId)
        .eq('report_type', reportType)
        .order('created_at', { ascending: false })
        .limit(1),
      [] as any[],
      'aiService.getLatest'
    );
    const arr = rows as any[];
    return arr.length > 0 ? fromDb(arr[0]) : null;
  },
};
