// ───────────────────────────────────────────────────────────────────────────
// chatService — Supabase CRUD for `chat_rooms` + `messages`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined } from './_common';
import type { PalliativeChatMessage } from '@/lib/types';

/**
 * Map a DB row from `messages` → PalliativeChatMessage.
 * `clinicalAlert` is stored inside the `form_data` JSONB under the key
 * `clinicalAlert` (no dedicated column exists).
 *
 * CRITICAL: We map `row.patient_id` → `palliativePatientId` so the chat panel
 * can filter messages by patient UUID (the DB `room_id` is a real UUID that
 * doesn't match the local composite `${patientId}_${doctorId}` filter).
 */
function messageFromDb(row: any): PalliativeChatMessage {
  const formData: any = row.form_data ?? undefined;
  const formResponse: any = row.form_response ?? undefined;
  const clinicalAlert = formData?.clinicalAlert ?? undefined;
  return {
    id: row.id,
    roomId: row.room_id,
    palliativePatientId: row.patient_id ?? undefined,
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

/**
 * Build the DB row from a partial message.
 *
 * CRITICAL: `roomId` is taken from the explicit function parameter, NOT from
 * `data.roomId`. The caller may pass a `data` object that still contains the
 * local composite `roomId` (e.g. `${patientId}_${doctorId}`) — that string is
 * NOT a UUID and would cause `invalid input syntax for type uuid` if it leaked
 * into `room_id`. The explicit `roomId` parameter is the real UUID resolved
 * via `getOrCreateRoom()`.
 *
 * Likewise `patient_id` and `doctor_id` are validated — only forwarded if they
 * are real UUIDs. The schema allows both to be NULL.
 */
function messageToDb(roomId: string, data: Partial<PalliativeChatMessage>): Record<string, any> {
  const out: Record<string, any> = {};
  // room_id — always use the explicit UUID parameter (never data.roomId)
  out.room_id = roomId;

  // patient_id — nullable uuid. Only forward if it's a real UUID.
  const pid = (data as any).palliativePatientId as string | undefined;
  if (pid && isValidUuid(pid)) out.patient_id = pid;

  // doctor_id — nullable uuid. Only forward if it's a real UUID.
  const did = (data as any).doctorId as string | undefined;
  if (did && isValidUuid(did)) out.doctor_id = did;

  // sender_id is `text NOT NULL` in the schema — any non-empty string is OK.
  // Coerce falsy values to 'system' to satisfy the NOT NULL constraint.
  if (data.senderId !== undefined && data.senderId !== null && data.senderId !== '') {
    out.sender_id = data.senderId;
  } else {
    out.sender_id = 'system';
  }
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

  /**
   * Insert a new message into the `messages` table.
   *
   * CRITICAL: The `roomId` parameter MUST be a real UUID (from chat_rooms.id).
   * The `data` object may still carry a local composite `roomId` (e.g.
   * `${patientId}_${doctorId}`) — we IGNORE that and use the explicit
   * parameter, because the composite string is not a UUID and would trigger
   * `invalid input syntax for type uuid`.
   */
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

    // Build the DB row. NOTE: messageToDb uses the explicit `roomId` parameter,
    // NOT data.roomId (which may be a composite string from the local store).
    const payload = messageToDb(roomId, data as Partial<PalliativeChatMessage>);

    // Diagnostic logging — make it easy to spot a malformed payload at a glance.
    console.log('[chatService.sendMessage] payload:', {
      room_id: payload.room_id,
      patient_id: payload.patient_id ?? '(null)',
      doctor_id: payload.doctor_id ?? '(null)',
      sender_id: payload.sender_id,
      sender_role: payload.sender_role,
      type: payload.type,
    });

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
