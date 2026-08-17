// ───────────────────────────────────────────────────────────────────────────
// userService — real user listing for Admin "Kelola Pengguna"
// ───────────────────────────────────────────────────────────────────────────
// Replaces `admin-users-panel.tsx`'s hardcoded `demoUsers` array (13 fake
// people including the same "dr. Sarah Wijaya" placeholder doctor found
// elsewhere in the app) — admins were managing a screen that had no
// connection to who's actually registered.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid, getDbClient } from './_common';

export interface UserProfileRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // real DB values: 'Admin' | 'Dokter' | 'Perawat' | 'Caregiver' | 'Pasien'
  isActive: boolean;
  joinedAt: string;
}

function fromDb(row: any): UserProfileRecord {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    isActive: row.status === 'Active',
    joinedAt: row.created_at,
  };
}

export const userService = {
  /**
   * Admin-only: list every registered profile. Uses the service-role admin
   * client (see _common.ts) because `profiles` RLS restricts SELECT to
   * `authenticated` sessions, and this route runs server-side with no
   * forwarded user session — see doctorService.getAll() for the same
   * pattern/reasoning.
   */
  async getAll(): Promise<UserProfileRecord[]> {
    const db = await getDbClient();
    const rows = await safeQuery(
      db.from('profiles').select('*').order('created_at', { ascending: false }),
      [] as any[],
      'userService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  /** Toggle a user between Active/Suspended (soft — never deletes an account). */
  async toggleStatus(userId: string): Promise<UserProfileRecord | null> {
    if (!isValidUuid(userId)) throw new Error('userId tidak valid');
    const db = await getDbClient();

    const current = await safeQuery(
      db.from('profiles').select('status').eq('id', userId).maybeSingle(),
      null as any,
      'userService.toggleStatus(lookup)'
    );
    if (!current) throw new Error(`Pengguna dengan id=${userId} tidak ditemukan.`);
    const nextStatus = (current as any).status === 'Active' ? 'Suspended' : 'Active';

    const { data: row, error } = await safeInsert<any>(
      db.from('profiles').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', userId).select().maybeSingle(),
      'userService.toggleStatus'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },
};
