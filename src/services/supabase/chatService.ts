// ───────────────────────────────────────────────────────────────────────────
// chatService — Supabase CRUD for `chat_rooms` + `messages`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined } from './_common';
import type { PalliativeChatMessage } from '@/lib/types';

/**
 * Map a DB row from `messages` → PalliativeChatMessage.
 * `clinicalAlert` is stored inside the `form_data` JSONB under the key
 * `clinicalAlert` (no dedicated column exists).
 */
function messageFromDb(row: any): PalliativeChatMessage {
  const formData: any = row.form_data ?? undefined;
  const formResponse: any = row.form_response ?? undefined;
  const clinicalAlert = formData?.clinicalAlert ?? undefined;
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? '',
    senderRole: row.sender_role ?? 'system',
    type: row.type ?? 'text',
    content: row.content ?? '',
    status: row.status ?? 'sent',
    formType: row.form_type ?? undefined,
    formData,
    formResponse,
    screeningType: row.screening_type ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    clinicalAlert,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    readAt: row.read_at ?? undefined,
  };
}

function messageToDb(data: Partial<PalliativeChatMessage>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.roomId !== undefined) out.room_id = data.roomId;
  if (data.senderId !== undefined) out.sender_id = data.senderId;
  if (data.senderName !== undefined) out.sender_name = data.senderName;
  // sender_role CHECK constraint: ('doctor','patient','family','system')
  if (data.senderRole !== undefined) {
    const sr = String(data.senderRole).toLowerCase();
    if (['doctor', 'patient', 'family', 'system'].includes(sr)) out.sender_role = sr;
    else out.sender_role = 'system';
  }
  // type CHECK constraint: ('text','education','instruction','form_ttv',
  // 'form_keluhan','form_screening','form_monitoring_obat','form_response',
  // 'reminder','image','ai_summary','clinical_alert')
  if (data.type !== undefined) {
    const t = String(data.type);
    const allowed = ['text','education','instruction','form_ttv','form_keluhan','form_screening','form_monitoring_obat','form_response','reminder','image','ai_summary','clinical_alert'];
    out.type = allowed.includes(t) ? t : 'text';
  }
  if (data.content !== undefined) out.content = data.content;
  // status CHECK constraint: ('sent','delivered','read')
  if (data.status !== undefined) {
    const s = String(data.status);
    out.status = ['sent', 'delivered', 'read'].includes(s) ? s : 'sent';
  }
  if (data.formType !== undefined) out.form_type = data.formType;
  if (data.screeningType !== undefined) out.screening_type = data.screeningType;
  if (data.aiSummary !== undefined) out.ai_summary = data.aiSummary;
  if (data.imageUrl !== undefined) out.image_url = data.imageUrl;
  if (data.readAt !== undefined) out.read_at = data.readAt;

  // Persist formData, merging clinicalAlert into it if provided.
  if (data.formData !== undefined || data.clinicalAlert !== undefined) {
    const fd: any = data.formData ? { ...data.formData } : {};
    if (data.clinicalAlert !== undefined) fd.clinicalAlert = data.clinicalAlert;
    out.form_data = fd;
  }
  if (data.formResponse !== undefined) out.form_response = data.formResponse;
  return stripUndefined(out);
}

export interface SendMessageInput {
  senderId: string;
  senderName?: string;
  senderRole: PalliativeChatMessage['senderRole'];
  type?: PalliativeChatMessage['type'];
  content?: string;
  status?: PalliativeChatMessage['status'];
  formType?: PalliativeChatMessage['formType'];
  formData?: PalliativeChatMessage['formData'];
  formResponse?: PalliativeChatMessage['formResponse'];
  screeningType?: PalliativeChatMessage['screeningType'];
  aiSummary?: PalliativeChatMessage['aiSummary'];
  clinicalAlert?: PalliativeChatMessage['clinicalAlert'];
  imageUrl?: PalliativeChatMessage['imageUrl'];
}

export const chatService = {
  /**
   * Get-or-create a chat room for a (patientId, doctorId) pair.
   * Returns the room id, or null on failure.
   *
   * Both patient_id and doctor_id are uuid columns — we validate them before
   * querying so we never send a non-UUID string to Postgres.
   */
  async getOrCreateRoom(patientId: string, doctorId: string): Promise<string | null> {
    // patient_id is required and must be a UUID.
    if (!isValidUuid(patientId)) {
      console.error(
        '[chatService.getOrCreateRoom] ABORTED — patient_id is not a valid UUID.',
        { received: patientId }
      );
      return null;
    }
    // doctor_id is nullable — skip the filter if it's not a UUID.
    const validDoctorId = validUuidOrUndefined(doctorId);

    // Try select first
    let selectQ = supabase.from('chat_rooms').select('id').eq('patient_id', patientId);
    if (validDoctorId) selectQ = selectQ.eq('doctor_id', validDoctorId);
    const existing = await safeQuery(
      selectQ.limit(1),
      [] as any[],
      'chatService.getOrCreateRoom(select)'
    );
    if (Array.isArray(existing) && existing.length > 0) {
      return (existing[0] as any).id ?? null;
    }

    // Insert new room
    const insertPayload: Record<string, any> = { patient_id: patientId };
    if (validDoctorId) insertPayload.doctor_id = validDoctorId;
    const { data: inserted, error: insErr } = await safeInsert<any>(
      supabase
        .from('chat_rooms')
        .insert(insertPayload)
        .select('id')
        .single(),
      'chatService.getOrCreateRoom(insert)'
    );
    if (inserted && inserted.id) return inserted.id as string;

    // Race-condition fallback: someone else inserted between our select & insert
    let retryQ = supabase.from('chat_rooms').select('id').eq('patient_id', patientId);
    if (validDoctorId) retryQ = retryQ.eq('doctor_id', validDoctorId);
    const retry = await safeQuery(
      retryQ.limit(1),
      [] as any[],
      'chatService.getOrCreateRoom(retry)'
    );
    if (Array.isArray(retry) && retry.length > 0) {
      return (retry[0] as any).id ?? null;
    }
    return null;
  },

  async getMessages(roomId: string): Promise<PalliativeChatMessage[]> {
    const rows = await safeQuery(
      supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }),
      [] as any[],
      'chatService.getMessages'
    );
    return (rows as any[]).map(messageFromDb);
  },

  async sendMessage(roomId: string, data: SendMessageInput): Promise<PalliativeChatMessage | null> {
    // room_id is a NOT NULL uuid FK. Abort if it's not a real UUID — otherwise
    // Postgres rejects with "invalid input syntax for type uuid".
    if (!isValidUuid(roomId)) {
      console.error(
        '[chatService.sendMessage] ABORTED — room_id is not a valid UUID.',
        { received: roomId }
      );
      throw new Error('room_id is not a valid UUID — call getOrCreateRoom first');
    }
    const payload = messageToDb({ roomId, ...data });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('messages').insert(payload).select().single(),
      'chatService.sendMessage'
    );
    if (error) throw new Error(error);
    return row ? messageFromDb(row) : null;
  },

  async markRead(messageId: string): Promise<boolean> {
    const res = await safeQuery(
      supabase
        .from('messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', messageId),
      null as any,
      'chatService.markRead'
    );
    return res !== null;
  },
};
