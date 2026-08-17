-- ============================================================================
-- CareLivia — Real Payment + Pharmacy Checkout system
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- Two screens were found to be completely fake / demo-only:
--
-- 1. Apotek Online checkout (`pharmacy-panel.tsx handleCheckout`) only
--    showed a success toast and cleared the cart. No order, no invoice, no
--    payment, no stock deduction — nothing was ever saved. That's why
--    "transaksi menghilang setelah checkout".
--
-- 2. The whole Pembayaran screen (`payments-panel.tsx`) rendered a
--    hardcoded `demoPayments` array — the exact same 4 fake invoices for
--    every account, patient or doctor. "Bayar" used `setTimeout()` to fake
--    processing and only ever mutated local Zustand state.
--
-- This migration only ADDS columns/tables/functions — nothing is dropped,
-- and every statement is safe to re-run.
-- ============================================================================

-- 1. Give `payments` a real invoice number, generic reference (so ONE table
--    can represent pharmacy / home care / consultation payments — today it
--    can only reference `orders`), and an idempotency key.
alter table public.payments
  add column if not exists invoice_number   text,
  add column if not exists reference_type   text check (reference_type in ('pharmacy_order','homecare_booking','consultation')),
  add column if not exists reference_id     uuid,
  add column if not exists idempotency_key  text,
  add column if not exists paid_at          timestamptz,
  add column if not exists updated_at       timestamptz not null default now();

-- Unique constraints — these are what make "double-click Bayar" and "webhook
-- called twice" safe: a second attempt with the same key simply fails the
-- insert (caught in app code) instead of creating a duplicate row.
create unique index if not exists payments_invoice_number_uidx
  on public.payments(invoice_number) where invoice_number is not null;
create unique index if not exists payments_idempotency_key_uidx
  on public.payments(idempotency_key) where idempotency_key is not null;

create index if not exists payments_reference_idx
  on public.payments(reference_type, reference_id);

-- 2. Invoice number sequence + generator. Format: INV-{TYPE}-{YEAR}-{seq}
--    e.g. INV-PH-2026-000001 (pharmacy), INV-HC-2026-000001 (home care),
--    INV-CONS-2026-000001 (consultation). One global sequence keeps this
--    trivial and still guaranteed-unique; the year in the string is cosmetic.
create sequence if not exists public.invoice_number_seq;

create or replace function public.generate_invoice_number(prefix text)
returns text
language sql
as $$
  select prefix || '-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;

-- 3. Price/name SNAPSHOT columns on order_items (medicines table already has
--    `price` but it can change after purchase — same reasoning as the
--    home-care snapshot migration). `order_items.price` already existed and
--    IS the price snapshot; we just add the name snapshot so a receipt still
--    shows the right medicine name even if it's later renamed.
alter table public.order_items
  add column if not exists medicine_name_snapshot text;

-- Backfill for any existing rows.
update public.order_items oi
set medicine_name_snapshot = m.name
from public.medicines m
where oi.medicine_id = m.id
  and oi.medicine_name_snapshot is null;

-- 4. ATOMIC stock decrement — this is what prevents overselling when two
--    patients buy the last few units at the same time. Runs as a single
--    UPDATE ... WHERE stock >= quantity, so if the stock check fails the
--    row is untouched, no separate SELECT-then-UPDATE race condition.
create or replace function public.decrement_medicine_stock(p_medicine_id uuid, p_quantity integer)
returns boolean
language plpgsql
as $$
declare
  updated_rows integer;
begin
  update public.medicines
  set stock = stock - p_quantity,
      updated_at = now()
  where id = p_medicine_id
    and stock >= p_quantity;

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

-- 5. RLS: payments already has a permissive "using(true)" policy from
--    migration_telemedicine.sql's shared loop, so the new columns above
--    don't need a new policy — this note is just so the next person reading
--    this file doesn't wonder why no `create policy` appears here.
