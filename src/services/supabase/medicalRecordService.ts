// ───────────────────────────────────────────────────────────────────────────
// medicalRecordService — Supabase CRUD for `medical_records`
// (replaces the old Prisma-backed /api/medical-records route — see
// supabase/migration_medical_records_prescriptions.sql)
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, stripUndefined } from './_common';
import { getSupabaseAdmin } from '@/supabaseClient';
import type { MedicalRecord } from '@/lib/types';

async function dbClient() {
  return (await getSupabaseAdmin()) ?? supabase;
}

function fromDb(row: any): MedicalRecord {
  return {
    id: row.id,
    patientId: row.patient_id,
    consultationId: row.consultation_id ?? undefined,
    rmNumber: row.rm_number ?? undefined,
    diagnosis: row.diagnosis ?? undefined,
    symptoms: row.symptoms ?? undefined,
    treatment: row.treatment ?? undefined,
    labResults: row.lab_results ?? undefined,
    radiologyResults: row.radiology_results ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    recordDate: row.record_date ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const medicalRecordService = {
  async create(input: {
    patientId: string;
    consultationId?: string;
    rmNumber?: string;
    diagnosis?: string;
    symptoms?: string;
    treatment?: string;
    notes?: string;
    status?: string;
  }): Promise<MedicalRecord | null> {
    const client = await dbClient();
    const { data: row, error } = await safeInsert<any>(
      client
        .from('medical_records')
        .insert(
          stripUndefined({
            patient_id: input.patientId,
            consultation_id: input.consultationId || null,
            rm_number: input.rmNumber || null,
            diagnosis: input.diagnosis || null,
            symptoms: input.symptoms || null,
            treatment: input.treatment || null,
            notes: input.notes || null,
            status: input.status ?? 'draft',
          })
        )
        .select('*')
        .single(),
      'medicalRecordService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async getById(id: string): Promise<MedicalRecord | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const row = await safeQuery(
      client.from('medical_records').select('*').eq('id', id).single(),
      null as any,
      'medicalRecordService.getById'
    );
    return row ? fromDb(row) : null;
  },

  async getByConsultation(consultationId: string): Promise<MedicalRecord | null> {
    if (!isValidUuid(consultationId)) return null;
    const client = await dbClient();
    const row = await safeQuery(
      client.from('medical_records').select('*').eq('consultation_id', consultationId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      null as any,
      'medicalRecordService.getByConsultation'
    );
    return row ? fromDb(row) : null;
  },

  async listForPatient(patientId: string): Promise<MedicalRecord[]> {
    if (!isValidUuid(patientId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('medical_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      [] as any[],
      'medicalRecordService.listForPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  async update(id: string, patch: Partial<MedicalRecord>): Promise<MedicalRecord | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const { data: row, error } = await safeInsert<any>(
      client
        .from('medical_records')
        .update(
          stripUndefined({
            diagnosis: patch.diagnosis,
            symptoms: patch.symptoms,
            treatment: patch.treatment,
            lab_results: patch.labResults,
            radiology_results: patch.radiologyResults,
            notes: patch.notes,
            status: patch.status,
          })
        )
        .eq('id', id)
        .select('*')
        .single(),
      'medicalRecordService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
