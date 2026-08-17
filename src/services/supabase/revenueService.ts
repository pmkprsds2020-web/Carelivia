// ───────────────────────────────────────────────────────────────────────────
// revenueService — real doctor/provider earnings, computed from actual paid
// payments (never from "consultation completed" alone, and never from
// pharmacy sales — see the migration file's header for why).
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, isValidUuid, getDbClient } from './_common';

export interface RevenueEntry {
  id: string;
  paymentId: string;
  referenceType: 'homecare_booking' | 'consultation';
  referenceId: string;
  payeeType: 'doctor' | 'provider';
  payeeId: string;
  patientId?: string;
  patientName?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'paid' | 'refunded';
  occurredAt: string;
  description: string;
}

export interface DoctorRevenueStats {
  todayNet: number;
  monthNet: number;
  totalNet: number;
  pendingNet: number; // sum of payments not yet confirmed for this doctor (informational only)
  entries: RevenueEntry[];
}

function entryFromDb(row: any): RevenueEntry {
  const label = row.reference_type === 'consultation' ? 'Konsultasi' : 'Home Care';
  return {
    id: row.id,
    paymentId: row.payment_id,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    payeeType: row.payee_type,
    payeeId: row.payee_id,
    patientId: row.patient_id ?? undefined,
    patientName: row.patient_profile?.full_name ?? undefined,
    grossAmount: Number(row.gross_amount ?? 0),
    platformFee: Number(row.platform_fee ?? 0),
    netAmount: Number(row.net_amount ?? 0),
    status: row.status,
    occurredAt: row.occurred_at,
    description: `${label}${row.patient_profile?.full_name ? ' - ' + row.patient_profile.full_name : ''}`,
  };
}

export const revenueService = {
  /**
   * Create a revenue ledger row for a successful payment, if this payment
   * type has a resolvable doctor/provider payee. Called from
   * paymentService.markPaid() right after a payment is confirmed.
   *
   * Idempotent: if a ledger row for this payment_id already exists (the
   * unique index in the migration), the insert is skipped rather than
   * erroring — so calling this twice for the same payment never double
   * counts revenue.
   */
  async recordForPayment(payment: { id: string; referenceType: string; referenceId: string; amount: number }): Promise<void> {
    if (payment.referenceType !== 'consultation' && payment.referenceType !== 'homecare_booking') {
      return; // pharmacy_order — deliberately excluded from doctor/provider revenue
    }

    const db = await getDbClient();

    // Already recorded? (idempotency guard, on top of the DB unique index)
    const existing = await safeQuery(
      db.from('revenue_ledger').select('id').eq('payment_id', payment.id).maybeSingle(),
      null as any,
      'revenueService.recordForPayment(existing check)'
    );
    if (existing) return;

    // Resolve who actually gets paid.
    let payeeType: 'doctor' | 'provider' | null = null;
    let payeeId: string | null = null;
    let patientId: string | null = null;

    if (payment.referenceType === 'consultation') {
      const consult = await safeQuery(
        supabase.from('consultations').select('doctor_id, patient_id').eq('id', payment.referenceId).maybeSingle(),
        null as any,
        'revenueService.recordForPayment(consultation lookup)'
      );
      if (consult) {
        payeeType = 'doctor';
        payeeId = (consult as any).doctor_id;
        patientId = (consult as any).patient_id;
      }
    } else {
      const booking = await safeQuery(
        supabase.from('homecare_bookings').select('staff_id, patient_id').eq('id', payment.referenceId).maybeSingle(),
        null as any,
        'revenueService.recordForPayment(booking lookup)'
      );
      if (booking && (booking as any).staff_id) {
        patientId = (booking as any).patient_id;
        // A homecare_staff row is a doctor's earnings only if that staff
        // member's underlying profile role is actually 'Dokter' — most
        // home care staff are nurses ('Perawat'), whose earnings are
        // 'provider' revenue, not doctor revenue (see migration header).
        const staffProfile = await safeQuery(
          supabase.from('profiles').select('id, role').eq('id', (booking as any).staff_id).maybeSingle(),
          null as any,
          'revenueService.recordForPayment(staff profile lookup)'
        );
        payeeId = (booking as any).staff_id;
        payeeType = (staffProfile as any)?.role === 'Dokter' ? 'doctor' : 'provider';
      }
    }

    if (!payeeType || !payeeId || !isValidUuid(payeeId)) {
      // No resolvable payee (e.g. home care booking with no staff assigned
      // yet) — nothing to record. This can be backfilled later if needed.
      return;
    }

    const settings = await safeQuery(
      db.from('platform_settings').select('platform_fee_percent').eq('id', 1).maybeSingle(),
      { platform_fee_percent: 0 } as any,
      'revenueService.recordForPayment(settings)'
    );
    const feePercent = Number((settings as any)?.platform_fee_percent ?? 0);
    const gross = payment.amount;
    const platformFee = Math.round((gross * feePercent) / 100);
    const net = gross - platformFee;

    const { error } = await db.from('revenue_ledger').insert({
      payment_id: payment.id,
      reference_type: payment.referenceType,
      reference_id: payment.referenceId,
      payee_type: payeeType,
      payee_id: payeeId,
      patient_id: patientId,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: net,
      status: 'paid',
    });
    if (error) {
      // Unique-constraint violation here just means a concurrent call beat
      // us to it — that's fine, not a real error.
      if (!error.message?.includes('duplicate key')) {
        console.error('[Supabase:revenueService.recordForPayment] insert failed:', error.message);
      }
    }
  },

  /** Real earnings for a doctor — today / this month / all-time, plus a transaction list. */
  async getDoctorStats(doctorId: string): Promise<DoctorRevenueStats> {
    if (!isValidUuid(doctorId)) {
      return { todayNet: 0, monthNet: 0, totalNet: 0, pendingNet: 0, entries: [] };
    }
    const db = await getDbClient();

    const rows = await safeQuery(
      db
        .from('revenue_ledger')
        .select('*, patient_profile:profiles!revenue_ledger_patient_id_fkey(full_name)')
        .eq('payee_type', 'doctor')
        .eq('payee_id', doctorId)
        .eq('status', 'paid')
        .order('occurred_at', { ascending: false }),
      [] as any[],
      'revenueService.getDoctorStats'
    );
    const entries = (rows as any[]).map(entryFromDb);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayNet = entries.filter((e) => new Date(e.occurredAt) >= startOfToday).reduce((s, e) => s + e.netAmount, 0);
    const monthNet = entries.filter((e) => new Date(e.occurredAt) >= startOfMonth).reduce((s, e) => s + e.netAmount, 0);
    const totalNet = entries.reduce((s, e) => s + e.netAmount, 0);

    // "Pending" = payments tied to this doctor's consultations that exist
    // but haven't been confirmed paid yet — informational, not counted in
    // totalNet (per master rule: pending payments are never revenue).
    const pendingPayments = await safeQuery(
      db
        .from('payments')
        .select('amount, reference_id, reference_type')
        .eq('status', 'pending')
        .eq('reference_type', 'consultation'),
      [] as any[],
      'revenueService.getDoctorStats(pending)'
    );
    let pendingNet = 0;
    if ((pendingPayments as any[]).length > 0) {
      const consultIds = (pendingPayments as any[]).map((p) => p.reference_id);
      const consults = await safeQuery(
        supabase.from('consultations').select('id, doctor_id').in('id', consultIds),
        [] as any[],
        'revenueService.getDoctorStats(pending consultations)'
      );
      const myConsultIds = new Set((consults as any[]).filter((c) => c.doctor_id === doctorId).map((c) => c.id));
      pendingNet = (pendingPayments as any[])
        .filter((p) => myConsultIds.has(p.reference_id))
        .reduce((s, p) => s + Number(p.amount ?? 0), 0);
    }

    return { todayNet, monthNet, totalNet, pendingNet, entries };
  },
};
