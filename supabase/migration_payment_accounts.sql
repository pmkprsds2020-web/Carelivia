-- ============================================================================
-- CareLivia — Admin-managed payment destination accounts
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- The "Detail Transfer Bank" a patient sees when paying (bank name, account
-- number, account holder) was completely HARDCODED in the frontend — every
-- patient saw the same fake "BCA 8720-3456-7890 / PT CareLivia Indonesia"
-- placeholder, and the admin had no way to change it to a real account.
-- This table lets the admin manage one or more real destination accounts
-- (bank transfer / virtual account / QRIS), which patients then see live in
-- the payment method dialog.
-- ============================================================================

create table if not exists public.payment_accounts (
  id              uuid primary key default gen_random_uuid(),
  method          text not null check (method in ('bank_transfer', 'va', 'qris')),
  bank_name       text,          -- e.g. "BCA", "Mandiri" — for bank_transfer/va
  account_number  text,          -- account or VA number — for bank_transfer/va
  account_holder  text,          -- name on the account — for bank_transfer/va
  qris_image_url  text,          -- QR code image URL — for qris
  is_active       boolean not null default true,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.payment_accounts enable row level security;

-- Everyone logged in can READ active accounts (patients need this to pay).
-- Writes are only ever performed through the server's admin API routes
-- (service-role client), consistent with how other admin-managed tables in
-- this schema are protected — the check itself happens in application code,
-- not via a role-specific RLS policy, matching the existing pattern.
drop policy if exists "payment_accounts_select" on public.payment_accounts;
create policy "payment_accounts_select"
  on public.payment_accounts for select
  to authenticated
  using (true);

drop policy if exists "payment_accounts_write" on public.payment_accounts;
create policy "payment_accounts_write"
  on public.payment_accounts for all
  to authenticated
  using (true)
  with check (true);

create index if not exists payment_accounts_active_idx
  on public.payment_accounts(is_active, display_order);
