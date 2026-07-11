// ───────────────────────────────────────────────────────────────────────────
// notificationService — Supabase CRUD for `notifications`
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';

/**
 * A user notification row. Mirrors the `notifications` table.
 */
export interface AppNotification {
  id: string;
  userId: string;
  patientId?: string;
  title: string;
  body?: string;
  type?: string;
  isRead: boolean;
  data?: any;
  createdAt: string;
}

function fromDb(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    patientId: row.patient_id ?? undefined,
    title: row.title ?? '',
    body: row.body ?? undefined,
    type: row.type ?? 'info',
    isRead: row.is_read ?? false,
    data: row.data ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<AppNotification>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.userId !== undefined) out.user_id = data.userId;
  if (data.patientId !== undefined) out.patient_id = data.patientId;
  if (data.title !== undefined) out.title = data.title;
  if (data.body !== undefined) out.body = data.body;
  if (data.type !== undefined) out.type = data.type;
  if (data.isRead !== undefined) out.is_read = data.isRead;
  if (data.data !== undefined) out.data = data.data;
  return stripUndefined(out);
}

export const notificationService = {
  async getByUser(userId: string): Promise<AppNotification[]> {
    const rows = await safeQuery(
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'notificationService.getByUser'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<AppNotification>): Promise<AppNotification | null> {
    const payload = toDb(data);
    const row = await safeQuery(
      supabase.from('notifications').insert(payload).select().single(),
      null as any,
      'notificationService.create'
    );
    return row ? fromDb(row) : null;
  },

  async markRead(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('notifications').update({ is_read: true }).eq('id', id),
      null as any,
      'notificationService.markRead'
    );
    return res !== null;
  },

  async markAllRead(userId: string): Promise<boolean> {
    const res = await safeQuery(
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false),
      null as any,
      'notificationService.markAllRead'
    );
    return res !== null;
  },
};
