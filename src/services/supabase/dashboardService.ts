// ───────────────────────────────────────────────────────────────────────────
// dashboardService — Aggregate count queries for the dashboard
// ───────────────────────────────────────────────────────────────────────────
//
// Every count below comes from a real Supabase query (using `head: true,
// count: 'exact'`). If a query fails (table missing, RLS, network), we log
// the error and fall back to 0 — the dashboard never crashes.
//
// We can't use the shared `safeQuery` helper for count queries because
// Supabase returns `count` as a sibling of `data` (not inside it). So we
// have a dedicated `safeCount` wrapper here.
// ───────────────────────────────────────────────────────────────────────────
import { supabase } from './_common';

export interface DashboardStats {
  totalActive: number;
  totalCompleted: number;
  riskMerah: number;
  riskKuning: number;
  activeAlerts: number;
  activeChats: number;
}

/**
 * Run a count query against Supabase and return the integer count.
 * Never throws — returns 0 on any error.
 */
async function safeCount(
  builder: any,
  label: string
): Promise<number> {
  try {
    const { count, error } = await builder;
    if (error) {
      console.warn(`[Supabase:${label}]`, error.message);
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  } catch (e: any) {
    console.warn(`[Supabase:${label}] threw`, e?.message ?? e);
    return 0;
  }
}

function countWhereBuilder(table: string, column: string, value: any) {
  return supabase
    .from(table)
    .select('*', { head: true, count: 'exact' })
    .eq(column, value);
}

function countAllBuilder(table: string) {
  return supabase
    .from(table)
    .select('*', { head: true, count: 'exact' });
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [
      totalActive,
      totalCompleted,
      riskMerah,
      riskKuning,
      activeAlerts,
      activeChats,
    ] = await Promise.all([
      safeCount(countWhereBuilder('patients', 'status', 'aktif'), 'dashboard.totalActive'),
      safeCount(countWhereBuilder('patients', 'status', 'program_selesai'), 'dashboard.totalCompleted'),
      safeCount(countWhereBuilder('patients', 'risiko', 'merah'), 'dashboard.riskMerah'),
      safeCount(countWhereBuilder('patients', 'risiko', 'kuning'), 'dashboard.riskKuning'),
      safeCount(countWhereBuilder('clinical_alerts', 'is_read', false), 'dashboard.activeAlerts'),
      safeCount(countAllBuilder('chat_rooms'), 'dashboard.activeChats'),
    ]);

    return {
      totalActive,
      totalCompleted,
      riskMerah,
      riskKuning,
      activeAlerts,
      activeChats,
    };
  },
};
