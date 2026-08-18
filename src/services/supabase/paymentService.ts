// ───────────────────────────────────────────────────────────────────────────
// paymentService — Supabase CRUD for `payments`, with idempotency built in
// ───────────────────────────────────────────────────────────────────────────
// This replaces the payments-panel.tsx `demoPayments` hardcoded array and
// the `setTimeout()`-based fake "Bayar" flow. Every payment here is a real
// row, tied to a real invoice number, and safe against:
//   - double-clicking "Bayar" (markPaid is a compare-and-swap update)
//   - a checkout being retried/re-submitted (createPending reuses any
//     existing pending payment for the same reference instead of creating
//     a second one)
// ───────────────────────────────────────────────────────────────────────────
import { safeQuery, safeInsert, isValidUuid, getDbClient } from './_common';
import { revenueService } from './revenueService';

export type PaymentReferenceType = 'pharmacy_order' | 'homecare_booking' | 'consultation';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  invoiceNumber: string;
  userId: string;
  referenceType: PaymentReferenceType;
  referenceId: string;
  orderId?: string;
  amount: number;
  method?: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

const INVOICE_PREFIX: Record<PaymentReferenceType, string> = {
  pharmacy_order: 'INV-PH',
  homecare_booking: 'INV-HC',
  consultation: 'INV-CONS',
};

// Kept local (not in homecareService) to avoid a circular import —
// homecareService already imports paymentService. Only touches the booking
// if it's still 'pending'; a booking already 'confirmed'/'in_progress'/etc.
// (e.g. staff was already assigned at validation time) is left untouched.
async function confirmHomecareBookingAfterPayment(db: any, bookingId: string): Promise<void> {
  const { data: booking } = await db
    .from('homecare_bookings')
    .select('id, status, staff_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking || booking.status !== 'pending') return;

  const updatePayload: Record<string, any> = { status: 'confirmed', updated_at: new Date().toISOString() };

  if (!booking.staff_id) {
    const { data: availableStaff } = await db
      .from('homecare_staff')
      .select('id')
      .eq('is_available', true)
      .eq('current_status', 'available')
      .limit(1)
      .maybeSingle();
    if (availableStaff) updatePayload.staff_id = availableStaff.id;
  }

  await db.from('homecare_bookings').update(updatePayload).eq('id', bookingId);
}

function fromDb(row: any): PaymentRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    userId: row.user_id,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    orderId: row.order_id ?? undefined,
    amount: Number(row.amount ?? 0),
    method: row.method ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? undefined,
  };
}

export const paymentService = {
  /**
   * Create a pending payment for a reference (pharmacy order, home care
   * booking, consultation). If a payment already exists for this exact
   * reference:
   *   - status='pending' → return the EXISTING row instead of creating a
   *     second one (handles a checkout being submitted twice).
   *   - status='success' → throw, so the caller doesn't silently create a
   *     second charge for something already paid.
   */
  async createPending(input: {
    userId: string;
    referenceType: PaymentReferenceType;
    referenceId: string;
    orderId?: string;
    amount: number;
    method?: string;
  }): Promise<PaymentRecord> {
    if (!isValidUuid(input.userId)) throw new Error('userId tidak valid');
    if (!isValidUuid(input.referenceId)) throw new Error('referenceId tidak valid');

    const db = await getDbClient();
    const existing = await safeQuery(
      db
        .from('payments')
        .select('*')
        .eq('reference_type', input.referenceType)
        .eq('reference_id', input.referenceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      null as any,
      'paymentService.createPending(existing check)'
    );
    if (existing) {
      const row = existing as any;
      if (row.status === 'success') {
        throw new Error(`Transaksi ini sudah dibayar (invoice ${row.invoice_number}).`);
      }
      if (row.status === 'pending') {
        return fromDb(row); // reuse — no duplicate payment/invoice created
      }
      // status === 'failed' or 'refunded' → fall through and create a fresh one
    }

    const { data: invoiceNumber, error: invErr } = await db.rpc('generate_invoice_number', {
      prefix: INVOICE_PREFIX[input.referenceType],
    });
    if (invErr) {
      console.error('[Supabase:paymentService.createPending] invoice generation failed:', invErr.message);
      throw new Error('Gagal membuat nomor invoice. Silakan coba lagi.');
    }

    const { data: row, error } = await safeInsert<any>(
      db
        .from('payments')
        .insert({
          user_id: input.userId,
          reference_type: input.referenceType,
          reference_id: input.referenceId,
          order_id: input.orderId ?? null,
          amount: input.amount,
          method: input.method ?? null,
          status: 'pending',
          invoice_number: invoiceNumber,
        })
        .select()
        .single(),
      'paymentService.createPending'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Gagal membuat pembayaran.');
    return fromDb(row);
  },

  /**
   * Mark a payment as paid. Idempotent: the UPDATE only touches the row if
   * it's still 'pending' (a compare-and-swap). If the person double-clicks
   * "Bayar", the second call's UPDATE affects 0 rows — we detect that,
   * re-fetch the row, and return it as-is (already paid) instead of
   * erroring or double-processing.
   */
  async markPaid(paymentId: string, method?: string): Promise<{ payment: PaymentRecord; alreadyPaid: boolean }> {
    if (!isValidUuid(paymentId)) throw new Error('paymentId tidak valid');

    const db = await getDbClient();
    const { data: updated, error } = await safeInsert<any>(
      db
        .from('payments')
        .update({
          status: 'success',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(method ? { method } : {}),
        })
        .eq('id', paymentId)
        .eq('status', 'pending') // ← the compare-and-swap guard
        .select()
        .maybeSingle(),
      'paymentService.markPaid'
    );
    if (error) throw new Error(error);

    if (updated) {
      const paid = fromDb(updated);
      // Doctor/provider revenue is recorded here, right after payment
      // actually succeeds — never from "consultation completed" alone, and
      // never for pharmacy_order (see revenueService for why). Failures
      // here are logged but don't fail the payment confirmation itself —
      // the payment genuinely succeeded either way.
      await revenueService.recordForPayment({
        id: paid.id,
        referenceType: paid.referenceType,
        referenceId: paid.referenceId,
        amount: paid.amount,
      }).catch((e) => console.error('[paymentService.markPaid] revenue recording failed:', e));

      // A Home Care booking that's still 'pending' at the moment its
      // payment succeeds gets bumped to 'confirmed' (assigning staff if one
      // wasn't already picked at admin-validation time) — otherwise the
      // patient's "Pesanan Saya" list kept showing "Menunggu" with the
      // "Bayar Sekarang"/"Batalkan" buttons even after payment actually
      // went through, because nothing here ever touched the booking row.
      if (paid.referenceType === 'homecare_booking') {
        await confirmHomecareBookingAfterPayment(db, paid.referenceId).catch((e) =>
          console.error('[paymentService.markPaid] homecare booking confirm failed:', e)
        );
      }

      return { payment: paid, alreadyPaid: false };
    }

    // 0 rows updated: either it's already paid (race with another click),
    // or the id doesn't exist. Distinguish the two.
    const current = await safeQuery(
      db.from('payments').select('*').eq('id', paymentId).maybeSingle(),
      null as any,
      'paymentService.markPaid(refetch)'
    );
    if (!current) throw new Error(`Pembayaran dengan id=${paymentId} tidak ditemukan.`);
    return { payment: fromDb(current), alreadyPaid: true };
  },

  async markFailed(paymentId: string): Promise<PaymentRecord | null> {
    const db = await getDbClient();
    const { data: row, error } = await safeInsert<any>(
      db
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .eq('status', 'pending')
        .select()
        .maybeSingle(),
      'paymentService.markFailed'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async getForUser(userId: string): Promise<PaymentRecord[]> {
    if (!isValidUuid(userId)) return [];
    const db = await getDbClient();
    const rows = await safeQuery(
      db.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      [] as any[],
      'paymentService.getForUser'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Latest payment per reference id, for a batch of Home Care bookings (or
   * any other reference type). Uses the service-role client because the
   * caller here is staff/admin looking up OTHER people's (patients')
   * payments — RLS would normally scope payments to their own owner.
   * Returns a map keyed by referenceId; bookings with no payment row yet
   * are simply absent from the map.
   */
  async getLatestForReferenceIds(
    referenceType: PaymentReferenceType,
    referenceIds: string[]
  ): Promise<Record<string, PaymentRecord>> {
    const validIds = referenceIds.filter(isValidUuid);
    if (validIds.length === 0) return {};

    const db = await getDbClient();
    const rows = await safeQuery(
      db
        .from('payments')
        .select('*')
        .eq('reference_type', referenceType)
        .in('reference_id', validIds)
        .order('created_at', { ascending: false }),
      [] as any[],
      'paymentService.getLatestForReferenceIds'
    );

    const map: Record<string, PaymentRecord> = {};
    for (const row of rows as any[]) {
      // Rows arrive newest-first, so the first one seen per reference_id is
      // the latest — matches the "most recent payment wins" behavior used
      // elsewhere (e.g. a failed attempt followed by a fresh pending one).
      if (!map[row.reference_id]) {
        map[row.reference_id] = fromDb(row);
      }
    }
    return map;
  },

  async getById(id: string): Promise<PaymentRecord | null> {
    if (!isValidUuid(id)) return null;
    const db = await getDbClient();
    const row = await safeQuery(
      db.from('payments').select('*').eq('id', id).maybeSingle(),
      null as any,
      'paymentService.getById'
    );
    return row ? fromDb(row) : null;
  },
};
