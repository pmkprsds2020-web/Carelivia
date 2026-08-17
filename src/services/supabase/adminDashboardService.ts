// ───────────────────────────────────────────────────────────────────────────
// adminDashboardService — aggregate stats for the telemedicine admin dashboard
// ───────────────────────────────────────────────────────────────────────────
// Separate from `dashboardService.ts` (which covers the palliative-care
// dashboard). This one backs /api/dashboard: totals, recent activity, and a
// few breakdowns for the doctor/consultation/order/homecare side of the app.
// Every query is wrapped so a single failure never crashes the whole route —
// missing pieces just come back as 0 / [].
// ───────────────────────────────────────────────────────────────────────────
import { supabase } from './_common';
import { getSupabaseAdmin } from '@/supabaseClient';

// This endpoint is admin-only and needs to see ALL rows across profiles,
// payments, etc. — not just what the anon-key/RLS-restricted client can see.
// Previously this used the plain anon `supabase` client even on the server,
// so RLS silently filtered out rows the caller had no session for, and every
// count came back 0 (masked by safeCount's error-swallowing below). We now
// prefer the service-role admin client (bypasses RLS) and only fall back to
// the anon client if SUPABASE_SERVICE_ROLE_KEY isn't configured — in which
// case results may legitimately be incomplete, which is at least explainable
// rather than a silent, confusing "0".
async function getDbClient() {
  const admin = await getSupabaseAdmin();
  return admin ?? supabase;
}

async function safeCount(builder: any, label: string): Promise<number> {
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

async function safeRows<T>(builder: any, label: string): Promise<T[]> {
  try {
    const { data, error } = await builder;
    if (error) {
      console.warn(`[Supabase:${label}]`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (e: any) {
    console.warn(`[Supabase:${label}] threw`, e?.message ?? e);
    return [];
  }
}

export const adminDashboardService = {
  async getStats() {
    const db = await getDbClient();
    const [
      totalPatients,
      totalDoctors,
      totalConsultations,
      totalOrders,
      totalHomeCareBookings,
      recentConsultations,
      recentPayments,
      consultationsLast6mo,
      doctorProfiles,
      topDoctorsRaw,
    ] = await Promise.all([
      safeCount(db.from('profiles').select('*', { head: true, count: 'exact' }).eq('role', 'Pasien'), 'adminDashboard.totalPatients'),
      safeCount(db.from('profiles').select('*', { head: true, count: 'exact' }).eq('role', 'Dokter'), 'adminDashboard.totalDoctors'),
      safeCount(db.from('consultations').select('*', { head: true, count: 'exact' }), 'adminDashboard.totalConsultations'),
      safeCount(db.from('orders').select('*', { head: true, count: 'exact' }), 'adminDashboard.totalOrders'),
      safeCount(db.from('homecare_bookings').select('*', { head: true, count: 'exact' }), 'adminDashboard.totalHomeCareBookings'),
      safeRows(
        db
          .from('consultations')
          .select('*, patient_profile:profiles!consultations_patient_id_fkey(id, full_name), doctor_profiles(specialization, profiles(id, full_name))')
          .order('created_at', { ascending: false })
          .limit(10),
        'adminDashboard.recentConsultations'
      ),
      safeRows(
        db
          .from('payments')
          .select('*, profiles(id, full_name, email)')
          .order('created_at', { ascending: false })
          .limit(10),
        'adminDashboard.recentPayments'
      ),
      safeRows<{ created_at: string }>(
        db
          .from('consultations')
          .select('created_at')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()),
        'adminDashboard.consultationsLast6mo'
      ),
      safeRows<{ specialization: string }>(
        db.from('doctor_profiles').select('specialization'),
        'adminDashboard.doctorProfiles'
      ),
      safeRows<{ doctor_id: string }>(
        db.from('consultations').select('doctor_id'),
        'adminDashboard.topDoctorsRaw'
      ),
    ]);

    // Revenue: sum of successful payments (fetched client-side since count-only
    // queries can't aggregate a sum).
    const successfulPayments = await safeRows<{ amount: number }>(
      db.from('payments').select('amount').eq('status', 'success'),
      'adminDashboard.successfulPayments'
    );
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    // Monthly consultation counts, last 6 months.
    const now = new Date();
    const monthlyStats: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = monthStart.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
      const count = consultationsLast6mo.filter((c) => {
        const d = new Date(c.created_at);
        return d >= monthStart && d <= monthEnd;
      }).length;
      monthlyStats.push({ month: monthName, count });
    }

    // Doctor specialization distribution.
    const specializationMap: Record<string, number> = {};
    for (const dp of doctorProfiles) {
      specializationMap[dp.specialization] = (specializationMap[dp.specialization] || 0) + 1;
    }
    const doctorSpecializationDistribution = Object.entries(specializationMap).map(([specialization, count]) => ({
      specialization,
      count,
    }));

    // Top 5 doctors by consultation count.
    const countByDoctor: Record<string, number> = {};
    for (const c of topDoctorsRaw) {
      if (!c.doctor_id) continue;
      countByDoctor[c.doctor_id] = (countByDoctor[c.doctor_id] || 0) + 1;
    }
    const topDoctorIds = Object.entries(countByDoctor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topDoctors = await Promise.all(
      topDoctorIds.map(async (doctorId) => {
        const rows = await safeRows<any>(
          db.from('doctor_profiles').select('*, profiles(full_name)').eq('id', doctorId).limit(1),
          'adminDashboard.topDoctorProfile'
        );
        const profile = rows[0];
        return {
          doctorId,
          name: profile?.profiles?.full_name ?? 'Unknown',
          specialization: profile?.specialization ?? '',
          consultationCount: countByDoctor[doctorId] ?? 0,
          rating: Number(profile?.rating ?? 0),
        };
      })
    );

    return {
      totalPatients,
      totalDoctors,
      totalConsultations,
      totalOrders,
      totalHomeCareBookings,
      totalRevenue,
      recentConsultations,
      recentPayments,
      monthlyStats,
      doctorSpecializationDistribution,
      topDoctors,
      // Lets the UI show a warning banner instead of silently trusting
      // possibly-incomplete numbers when the service-role key isn't set.
      usingServiceRole: db !== supabase,
    };
  },
};
