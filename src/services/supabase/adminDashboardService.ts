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
      safeCount(supabase.from('profiles').select('*', { head: true, count: 'exact' }).eq('role', 'Pasien'), 'adminDashboard.totalPatients'),
      safeCount(supabase.from('profiles').select('*', { head: true, count: 'exact' }).eq('role', 'Dokter'), 'adminDashboard.totalDoctors'),
      safeCount(supabase.from('consultations').select('*', { head: true, count: 'exact' }), 'adminDashboard.totalConsultations'),
      safeCount(supabase.from('orders').select('*', { head: true, count: 'exact' }), 'adminDashboard.totalOrders'),
      safeCount(supabase.from('homecare_bookings').select('*', { head: true, count: 'exact' }), 'adminDashboard.totalHomeCareBookings'),
      safeRows(
        supabase
          .from('consultations')
          .select('*, patient_profile:profiles!consultations_patient_id_fkey(id, full_name), doctor_profiles(specialization, profiles(id, full_name))')
          .order('created_at', { ascending: false })
          .limit(10),
        'adminDashboard.recentConsultations'
      ),
      safeRows(
        supabase
          .from('payments')
          .select('*, profiles(id, full_name, email)')
          .order('created_at', { ascending: false })
          .limit(10),
        'adminDashboard.recentPayments'
      ),
      safeRows<{ created_at: string }>(
        supabase
          .from('consultations')
          .select('created_at')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()),
        'adminDashboard.consultationsLast6mo'
      ),
      safeRows<{ specialization: string }>(
        supabase.from('doctor_profiles').select('specialization'),
        'adminDashboard.doctorProfiles'
      ),
      safeRows<{ doctor_id: string }>(
        supabase.from('consultations').select('doctor_id'),
        'adminDashboard.topDoctorsRaw'
      ),
    ]);

    // Revenue: sum of successful payments (fetched client-side since count-only
    // queries can't aggregate a sum).
    const successfulPayments = await safeRows<{ amount: number }>(
      supabase.from('payments').select('amount').eq('status', 'success'),
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
          supabase.from('doctor_profiles').select('*, profiles(full_name)').eq('id', doctorId).limit(1),
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
    };
  },
};
