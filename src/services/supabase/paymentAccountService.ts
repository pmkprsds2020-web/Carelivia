// ───────────────────────────────────────────────────────────────────────────
// paymentAccountService — Supabase CRUD for `payment_accounts`
// ───────────────────────────────────────────────────────────────────────────
// Backs the admin "Kelola Rekening Pembayaran" panel and the real bank/QRIS
// details shown to patients in the payment method dialog — see
// migration_payment_accounts.sql for why this exists.
import { safeQuery, safeInsert, getDbClient } from './_common';

export type PaymentAccountMethod = 'bank_transfer' | 'va' | 'qris';

export interface PaymentAccountRecord {
  id: string;
  method: PaymentAccountMethod;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrisImageUrl?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAccountInput {
  method: PaymentAccountMethod;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrisImageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}

function fromDb(row: any): PaymentAccountRecord {
  return {
    id: row.id,
    method: row.method,
    bankName: row.bank_name ?? undefined,
    accountNumber: row.account_number ?? undefined,
    accountHolder: row.account_holder ?? undefined,
    qrisImageUrl: row.qris_image_url ?? undefined,
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(input: Partial<PaymentAccountInput>): Record<string, any> {
  const out: Record<string, any> = {};
  if (input.method !== undefined) out.method = input.method;
  if (input.bankName !== undefined) out.bank_name = input.bankName || null;
  if (input.accountNumber !== undefined) out.account_number = input.accountNumber || null;
  if (input.accountHolder !== undefined) out.account_holder = input.accountHolder || null;
  if (input.qrisImageUrl !== undefined) out.qris_image_url = input.qrisImageUrl || null;
  if (input.isActive !== undefined) out.is_active = input.isActive;
  if (input.displayOrder !== undefined) out.display_order = input.displayOrder;
  return out;
}

export const paymentAccountService = {
  /** Admin-facing: every account, active or not. */
  async getAll(): Promise<PaymentAccountRecord[]> {
    const db = await getDbClient();
    const rows = await safeQuery(
      db.from('payment_accounts').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
      [] as any[],
      'paymentAccountService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  /** Patient-facing: only ACTIVE accounts, for the payment method dialog. */
  async getActive(): Promise<PaymentAccountRecord[]> {
    const db = await getDbClient();
    const rows = await safeQuery(
      db.from('payment_accounts').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      [] as any[],
      'paymentAccountService.getActive'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(input: PaymentAccountInput): Promise<PaymentAccountRecord> {
    const db = await getDbClient();
    const payload = { ...toDb(input), is_active: input.isActive ?? true, display_order: input.displayOrder ?? 0 };
    const { data: row, error } = await safeInsert<any>(
      db.from('payment_accounts').insert(payload).select().maybeSingle(),
      'paymentAccountService.create'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Gagal membuat rekening pembayaran.');
    return fromDb(row);
  },

  async update(id: string, input: Partial<PaymentAccountInput>): Promise<PaymentAccountRecord> {
    const db = await getDbClient();
    const payload = { ...toDb(input), updated_at: new Date().toISOString() };
    const { data: row, error } = await safeInsert<any>(
      db.from('payment_accounts').update(payload).eq('id', id).select().maybeSingle(),
      'paymentAccountService.update'
    );
    if (error) throw new Error(error);
    if (!row) throw new Error('Rekening pembayaran tidak ditemukan.');
    return fromDb(row);
  },

  async remove(id: string): Promise<void> {
    const db = await getDbClient();
    const { error } = await db.from('payment_accounts').delete().eq('id', id);
    if (error) throw new Error(error.message ?? 'Gagal menghapus rekening pembayaran.');
  },
};
