// ───────────────────────────────────────────────────────────────────────────
// pharmacyService — real checkout flow for Apotek Online
// ───────────────────────────────────────────────────────────────────────────
// Replaces `pharmacy-panel.tsx handleCheckout`, which used to just show a
// success toast and clear the cart — no order, invoice, payment, or stock
// change was ever saved. This is the real flow:
//
//   checkout()       → creates orders + order_items (price/name snapshot)
//                       + a pending payment row (via paymentService)
//   confirmPayment() → marks the payment paid (idempotent), THEN atomically
//                       decrements stock per item via the
//                       decrement_medicine_stock() Postgres function, and
//                       moves the order to 'processing'
//
// Stock is intentionally decremented at PAYMENT time, not at checkout time —
// checkout only reserves nothing; this avoids silently losing sellable stock
// to abandoned carts. The atomic decrement function still protects against
// two concurrent payments overselling the same last few units.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, isValidUuid } from './_common';
import { paymentService, type PaymentRecord } from './paymentService';

export interface PharmacyOrderItemInput {
  medicineId: string;
  quantity: number;
}

export interface PharmacyOrderRecord {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  shippingAddress?: string;
  createdAt: string;
  items: {
    id: string;
    medicineId: string;
    medicineName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

function orderFromDb(row: any, items: any[]): PharmacyOrderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    totalAmount: Number(row.total_amount ?? 0),
    shippingFee: Number(row.shipping_fee ?? 0),
    shippingAddress: row.shipping_address ?? undefined,
    createdAt: row.created_at,
    items: items.map((it) => ({
      id: it.id,
      medicineId: it.medicine_id,
      medicineName: it.medicine_name_snapshot ?? it.medicine?.name ?? 'Obat',
      quantity: it.quantity,
      unitPrice: Number(it.price ?? 0),
      subtotal: Number(it.price ?? 0) * it.quantity,
    })),
  };
}

export const pharmacyService = {
  /**
   * Create a real pharmacy order from the cart. Validates every item's
   * price and stock server-side (never trusts the browser's cached price —
   * see master repair item #9), snapshots name+price onto order_items so a
   * later price change never rewrites history, and creates a pending
   * payment tied to this order.
   */
  async checkout(input: {
    userId: string;
    items: PharmacyOrderItemInput[];
    shippingAddress?: string;
    shippingFee?: number;
  }): Promise<{ order: PharmacyOrderRecord; payment: PaymentRecord }> {
    if (!isValidUuid(input.userId)) throw new Error('User tidak valid. Silakan login ulang.');
    if (!input.items || input.items.length === 0) throw new Error('Keranjang kosong.');

    // 1. Look up REAL current prices + stock from the DB — never trust the
    //    client's cached medicine.price, which may be stale.
    const medicineIds = input.items.map((i) => i.medicineId);
    const medicines = await safeQuery(
      supabase.from('medicines').select('*').in('id', medicineIds).eq('is_active', true),
      [] as any[],
      'pharmacyService.checkout(medicine lookup)'
    );
    const medicineMap = new Map((medicines as any[]).map((m) => [m.id, m]));

    const lineItems: { medicineId: string; name: string; unitPrice: number; quantity: number }[] = [];
    for (const item of input.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) throw new Error(`Obat dengan id=${item.medicineId} tidak ditemukan atau tidak aktif.`);
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Jumlah untuk ${med.name} tidak valid.`);
      }
      if (med.stock < item.quantity) {
        throw new Error(`Stok ${med.name} tidak mencukupi (tersedia ${med.stock}, diminta ${item.quantity}).`);
      }
      lineItems.push({ medicineId: med.id, name: med.name, unitPrice: Number(med.price), quantity: item.quantity });
    }

    const subtotal = lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0);
    const shippingFee = input.shippingFee ?? 0;
    const totalAmount = subtotal + shippingFee;

    // 2. Create the order.
    const { data: orderRow, error: orderErr } = await safeInsert<any>(
      supabase
        .from('orders')
        .insert({
          user_id: input.userId,
          status: 'pending',
          total_amount: totalAmount,
          shipping_fee: shippingFee,
          shipping_address: input.shippingAddress ?? null,
        })
        .select()
        .single(),
      'pharmacyService.checkout(create order)'
    );
    if (orderErr) throw new Error(orderErr);
    if (!orderRow) throw new Error('Gagal membuat pesanan.');

    // 3. Create order_items with a name+price SNAPSHOT (order_items.price
    //    already existed for this — we add medicine_name_snapshot too).
    const { data: itemRows, error: itemsErr } = await safeInsert<any>(
      supabase
        .from('order_items')
        .insert(
          lineItems.map((li) => ({
            order_id: orderRow.id,
            medicine_id: li.medicineId,
            medicine_name_snapshot: li.name,
            quantity: li.quantity,
            price: li.unitPrice,
          }))
        )
        .select(),
      'pharmacyService.checkout(create items)'
    );
    if (itemsErr) {
      // Order was created but items failed — don't leave an empty phantom
      // order sitting around; clean it up so retrying doesn't pile up junk.
      await supabase.from('orders').delete().eq('id', orderRow.id);
      throw new Error(itemsErr);
    }

    // 4. Create the pending payment tied to this order.
    const payment = await paymentService.createPending({
      userId: input.userId,
      referenceType: 'pharmacy_order',
      referenceId: orderRow.id,
      orderId: orderRow.id,
      amount: totalAmount,
    });

    return { order: orderFromDb(orderRow, itemRows ?? []), payment };
  },

  /**
   * Confirm payment for a pharmacy order: marks the payment paid
   * (idempotent — safe to call twice), then atomically decrements stock for
   * each line item and advances the order to 'processing'. If payment was
   * already confirmed by an earlier call, this is a no-op that just returns
   * the current state — it will NOT double-deduct stock.
   */
  async confirmPayment(paymentId: string, method?: string): Promise<{ order: PharmacyOrderRecord; alreadyPaid: boolean }> {
    const { payment, alreadyPaid } = await paymentService.markPaid(paymentId, method);
    if (payment.referenceType !== 'pharmacy_order') {
      throw new Error('Payment ini bukan untuk pesanan apotek.');
    }
    const orderId = payment.referenceId;

    if (!alreadyPaid) {
      // Only deduct stock the FIRST time this payment is confirmed.
      const items = await safeQuery(
        supabase.from('order_items').select('*').eq('order_id', orderId),
        [] as any[],
        'pharmacyService.confirmPayment(items lookup)'
      );
      for (const item of items as any[]) {
        const { data: ok, error } = await supabase.rpc('decrement_medicine_stock', {
          p_medicine_id: item.medicine_id,
          p_quantity: item.quantity,
        });
        if (error) {
          console.error('[pharmacyService.confirmPayment] stock decrement error:', error.message);
        } else if (!ok) {
          // Stock ran out between checkout and payment confirmation (e.g. a
          // long-idle cart). The payment already succeeded — in a real
          // payment-gateway integration this would trigger a refund flow;
          // here we log loudly so an admin can follow up, since there's no
          // gateway wired up yet to auto-refund.
          console.error(`[pharmacyService.confirmPayment] INSUFFICIENT STOCK for medicine_id=${item.medicine_id} on paid order ${orderId} — needs manual follow-up (refund or backorder).`);
        }
      }

      await supabase.from('orders').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', orderId);
    }

    const orderRow = await safeQuery(
      supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
      null as any,
      'pharmacyService.confirmPayment(order refetch)'
    );
    const items = await safeQuery(
      supabase.from('order_items').select('*').eq('order_id', orderId),
      [] as any[],
      'pharmacyService.confirmPayment(items refetch)'
    );
    if (!orderRow) throw new Error('Pesanan tidak ditemukan.');
    return { order: orderFromDb(orderRow, items as any[]), alreadyPaid };
  },

  async getOrdersForUser(userId: string): Promise<PharmacyOrderRecord[]> {
    if (!isValidUuid(userId)) return [];
    const orders = await safeQuery(
      supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      [] as any[],
      'pharmacyService.getOrdersForUser'
    );
    const results: PharmacyOrderRecord[] = [];
    for (const order of orders as any[]) {
      const items = await safeQuery(
        supabase.from('order_items').select('*').eq('order_id', order.id),
        [] as any[],
        'pharmacyService.getOrdersForUser(items)'
      );
      results.push(orderFromDb(order, items as any[]));
    }
    return results;
  },
};
