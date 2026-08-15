// ───────────────────────────────────────────────────────────────────────────
// prescriptionService — Supabase CRUD for `prescriptions`
// (replaces the old Prisma-backed /api/prescriptions route — see
// supabase/migration_medical_records_prescriptions.sql)
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, stripUndefined } from './_common';
import { getSupabaseAdmin } from '@/supabaseClient';
import { randomUUID } from 'crypto';
import type { Prescription, PrescriptionItem } from '@/lib/types';

async function dbClient() {
  return (await getSupabaseAdmin()) ?? supabase;
}

function fromDb(row: any): Prescription {
  return {
    id: row.id,
    consultationId: row.consultation_id ?? '',
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    status: row.status,
    notes: row.notes ?? undefined,
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const prescriptionService = {
  async create(input: {
    consultationId?: string;
    doctorId: string;
    patientId: string;
    notes?: string;
    items: Array<Omit<PrescriptionItem, 'id' | 'prescriptionId'>>;
  }): Promise<Prescription | null> {
    const client = await dbClient();
    const prescriptionId = randomUUID();
    const items: PrescriptionItem[] = input.items.map((item) => ({
      ...item,
      id: randomUUID(),
      prescriptionId,
    }));
    const { data: row, error } = await safeInsert<any>(
      client
        .from('prescriptions')
        .insert(
          stripUndefined({
            id: prescriptionId,
            consultation_id: input.consultationId || null,
            doctor_id: input.doctorId,
            patient_id: input.patientId,
            status: 'pending',
            notes: input.notes || null,
            items,
          })
        )
        .select('*')
        .single(),
      'prescriptionService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async getById(id: string): Promise<Prescription | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const row = await safeQuery(
      client.from('prescriptions').select('*').eq('id', id).single(),
      null as any,
      'prescriptionService.getById'
    );
    return row ? fromDb(row) : null;
  },

  async listForPatient(patientId: string): Promise<Prescription[]> {
    if (!isValidUuid(patientId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      [] as any[],
      'prescriptionService.listForPatient'
    );
    return (rows as any[]).map(fromDb);
  },

  async listForDoctor(doctorId: string): Promise<Prescription[]> {
    if (!isValidUuid(doctorId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client.from('prescriptions').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
      [] as any[],
      'prescriptionService.listForDoctor'
    );
    return (rows as any[]).map(fromDb);
  },

  async update(id: string, patch: { status?: string; notes?: string; items?: PrescriptionItem[] }): Promise<Prescription | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const { data: row, error } = await safeInsert<any>(
      client
        .from('prescriptions')
        .update(stripUndefined({ status: patch.status, notes: patch.notes, items: patch.items }))
        .eq('id', id)
        .select('*')
        .single(),
      'prescriptionService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
