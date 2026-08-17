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
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';

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

    const existing = await safeQuery(
      supabase
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

    const { data: invoiceNumber, error: invErr } = await supabase.rpc('generate_invoice_number', {
      prefix: INVOICE_PREFIX[input.referenceType],
    });
    if (invErr) {
      console.error('[Supabase:paymentService.createPending] invoice generation failed:', invErr.message);
      throw new Error('Gagal membuat nomor invoice. Silakan coba lagi.');
    }

    const { data: row, error } = await safeInsert<any>(
      supabase
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

    const { data: updated, error } = await safeInsert<any>(
      supabase
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
      return { payment: fromDb(updated), alreadyPaid: false };
    }

    // 0 rows updated: either it's already paid (race with another click),
    // or the id doesn't exist. Distinguish the two.
    const current = await safeQuery(
      supabase.from('payments').select('*').eq('id', paymentId).maybeSingle(),
      null as any,
      'paymentService.markPaid(refetch)'
    );
    if (!current) throw new Error(`Pembayaran dengan id=${paymentId} tidak ditemukan.`);
    return { payment: fromDb(current), alreadyPaid: true };
  },

  async markFailed(paymentId: string): Promise<PaymentRecord | null> {
    const { data: row, error } = await safeInsert<any>(
      supabase
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
    const rows = await safeQuery(
      supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      [] as any[],
      'paymentService.getForUser'
    );
    return (rows as any[]).map(fromDb);
  },

  async getById(id: string): Promise<PaymentRecord | null> {
    if (!isValidUuid(id)) return null;
    const row = await safeQuery(
      supabase.from('payments').select('*').eq('id', id).maybeSingle(),
      null as any,
      'paymentService.getById'
    );
    return row ? fromDb(row) : null;
  },
};
