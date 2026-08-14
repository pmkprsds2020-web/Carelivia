// ───────────────────────────────────────────────────────────────────────────
// consultationService — Supabase CRUD for `consultations` + `consultation_messages`
// ───────────────────────────────────────────────────────────────────────────
// Response shapes mirror `Consultation` / `User` / `Message` in `@/lib/types`
// so the existing frontend (chat-panel.tsx, doctor-panel.tsx, page.tsx) can
// consume them without changes.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';
import { notificationService } from './notificationService';
import { getSupabaseAdmin } from '@/supabaseClient';

// Prefer the service-role admin client when available (this service is only
// ever called from server-side API routes). Without it, the embedded
// `profiles(...)` joins below come back null — `profiles` RLS only grants
// SELECT `to authenticated`, but a server route using the anon key with no
// forwarded user session is neither anon-exempt nor authenticated — so
// doctor/patient names would silently disappear from consultation lists.
// See doctorService.ts for the identical issue/fix.
async function dbClient() {
  return (await getSupabaseAdmin()) ?? supabase;
}

interface PersonRow {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  status?: string;
}

function personToUser(id: string, p?: PersonRow, role: 'patient' | 'doctor' = 'patient') {
  if (!p) return undefined;
  return {
    id,
    email: p.email ?? '',
    name: p.full_name ?? '',
    phone: p.phone ?? undefined,
    role,
    isVerified: p.status === 'Active',
    isActive: p.status !== 'Suspended',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function messageFromDb(m: any) {
  return {
    id: m.id,
    consultationId: m.consultation_id,
    senderId: m.sender_id,
    content: m.content,
    type: m.type,
    fileUrl: m.file_url ?? undefined,
    status: m.status,
    createdAt: m.created_at,
    sender: m.profiles ? personToUser(m.profiles.id, m.profiles) : undefined,
  };
}

function fromDb(row: any): any {
  const doctorProfile = row.doctor_profiles ?? {};
  const doctorPerson = doctorProfile.profiles;
  const doctor = doctorPerson
    ? {
        ...personToUser(row.doctor_id, doctorPerson, 'doctor'),
        doctorProfile: {
          id: row.doctor_id,
          userId: row.doctor_id,
          specialization: doctorProfile.specialization ?? 'umum',
          rating: Number(doctorProfile.rating ?? 0),
          reviewCount: doctorProfile.review_count ?? 0,
          consultationFee: Number(doctorProfile.consultation_fee ?? 0),
          isOnline: !!doctorProfile.is_online,
          isAvailable: !!doctorProfile.is_available,
        },
      }
    : undefined;

  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    type: row.type ?? 'chat',
    status: row.status ?? 'waiting',
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    notes: row.notes ?? undefined,
    rating: row.rating ?? undefined,
    review: row.review ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    patient: row.patient_profile ? personToUser(row.patient_id, row.patient_profile, 'patient') : undefined,
    doctor,
    messages: Array.isArray(row.consultation_messages) ? row.consultation_messages.map(messageFromDb) : undefined,
  };
}

const LIST_SELECT = `*,
  patient_profile:profiles!consultations_patient_id_fkey(id, full_name, email, phone, status),
  doctor_profiles(specialization, rating, review_count, consultation_fee, is_online, is_available, profiles(id, full_name, email, phone, status)),
  consultation_messages(id, consultation_id, sender_id, content, type, file_url, status, created_at)`;

export interface ConsultationFilters {
  status?: string;
  patientId?: string;
  doctorProfileId?: string; // already resolved to doctor_profiles.id
  type?: string;
}

export const consultationService = {
  async getAll(filters: ConsultationFilters = {}): Promise<any[]> {
    const client = await dbClient();
    let q = client
      .from('consultations')
      .select(LIST_SELECT)
      // Only the most recent message per consultation is needed for a preview.
      .order('created_at', { foreignTable: 'consultation_messages', ascending: false })
      .limit(1, { foreignTable: 'consultation_messages' })
      .order('created_at', { ascending: false });

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.patientId && isValidUuid(filters.patientId)) q = q.eq('patient_id', filters.patientId);
    if (filters.doctorProfileId && isValidUuid(filters.doctorProfileId)) q = q.eq('doctor_id', filters.doctorProfileId);
    if (filters.type) q = q.eq('type', filters.type);

    const rows = await safeQuery(q, [] as any[], 'consultationService.getAll');
    return (rows as any[]).map(fromDb);
  },

  async create(input: {
    patientId: string;
    doctorProfileId: string;
    type?: string;
    notes?: string;
  }): Promise<any> {
    const client = await dbClient();
    const { data: row, error } = await safeInsert<any>(
      client
        .from('consultations')
        .insert({
          patient_id: input.patientId,
          doctor_id: input.doctorProfileId,
          type: input.type ?? 'chat',
          status: 'waiting',
          notes: input.notes ?? null,
        })
        .select(LIST_SELECT)
        .single(),
      'consultationService.create'
    );
    if (error) throw new Error(error);
    if (!row) return null;

    const patientName = row.patient_profile?.full_name ?? 'Pasien';
    await notificationService.create({
      userId: input.doctorProfileId,
      title: 'Konsultasi Baru',
      body: `Anda memiliki permintaan konsultasi baru dari ${patientName}.`,
      type: 'consultation',
      data: { consultationId: row.id },
    });

    return fromDb(row);
  },

  async getById(id: string): Promise<{ id: string; patientId: string; doctorId: string } | null> {
    if (!isValidUuid(id)) return null;
    const client = await dbClient();
    const row = await safeQuery(
      client.from('consultations').select('id, patient_id, doctor_id').eq('id', id).single(),
      null as any,
      'consultationService.getById'
    );
    return row ? { id: (row as any).id, patientId: (row as any).patient_id, doctorId: (row as any).doctor_id } : null;
  },

  async getMessages(consultationId: string) {
    if (!isValidUuid(consultationId)) return [];
    const client = await dbClient();
    const rows = await safeQuery(
      client
        .from('consultation_messages')
        .select('*, profiles(id, full_name, email, phone, status)')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true }),
      [] as any[],
      'consultationService.getMessages'
    );
    return (rows as any[]).map(messageFromDb);
  },

  async sendMessage(consultationId: string, input: {
    senderId: string;
    content: string;
    type?: string;
    fileUrl?: string;
  }) {
    if (!isValidUuid(consultationId)) throw new Error('consultationId is not a valid UUID');
    const client = await dbClient();

    const consult = await safeQuery(
      client.from('consultations').select('id, patient_id, doctor_id').eq('id', consultationId).single(),
      null as any,
      'consultationService.sendMessage(lookup)'
    );
    if (!consult) throw new Error('Consultation not found');
    const isParticipant = input.senderId === (consult as any).patient_id || input.senderId === (consult as any).doctor_id;
    if (!isParticipant) throw new Error('Not a participant in this consultation');

    const { data: row, error } = await safeInsert<any>(
      client
        .from('consultation_messages')
        .insert({
          consultation_id: consultationId,
          sender_id: input.senderId,
          content: input.content,
          type: input.type ?? 'text',
          file_url: input.fileUrl ?? null,
          status: 'sent',
        })
        .select('*, profiles(id, full_name, email, phone, status)')
        .single(),
      'consultationService.sendMessage'
    );
    if (error) throw new Error(error);
    if (!row) return null;

    const recipientId = input.senderId === (consult as any).patient_id ? (consult as any).doctor_id : (consult as any).patient_id;
    await notificationService.create({
      userId: recipientId,
      title: 'Pesan Baru',
      body: `${row.profiles?.full_name ?? 'Seseorang'}: ${String(input.content).slice(0, 80)}`,
      type: 'message',
      data: { consultationId },
    });

    return messageFromDb(row);
  },
};
