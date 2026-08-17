-- ============================================================================
-- CareLivia — Revenue Ledger
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- The doctor "Pendapatan" tab (doctor-panel.tsx) rendered a hardcoded
-- `monthlyEarnings` array ("Demo earnings data") including a fake "+12%
-- dari bulan lalu" growth indicator, and its transaction list counted
-- EVERY completed consultation (regardless of whether it was ever paid)
-- multiplied by the consultation fee — never checking `payments.status`.
--
-- DEFAULT BUSINESS RULE (safe placeholder — see platform_fee_percent below):
--   Doctor keeps 100% of consultation revenue, 0% platform fee, UNTIL an
--   admin configures otherwise. This was NOT specified by the business
--   owner, so it defaults to the simplest, most conservative option
--   (nothing is silently taken from the doctor) rather than guessing a
--   percentage. Change `platform_fee_percent` in `platform_settings` below
--   once the real business rule is decided.
--
-- Pharmacy revenue is deliberately EXCLUDED from doctor revenue (per the
-- repair brief: "jangan otomatis memasukkan seluruh omzet obat sebagai
-- pendapatan dokter") — no ledger row is created for pharmacy_order
-- payments; pharmacy sales stay their own thing in `orders`/`payments`.
-- ============================================================================

-- 1. Platform-wide settings (single row). Admin-editable later; for now it
--    just holds the platform fee percentage applied to doctor/provider
--    revenue, defaulting to 0 (doctor keeps 100%).
create table if not exists public.platform_settings (
  id                      integer primary key default 1,
  platform_fee_percent    numeric(5,2) not null default 0 check (platform_fee_percent >= 0 and platform_fee_percent <= 100),
  updated_at              timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 1)
);
insert into public.platform_settings (id, platform_fee_percent)
values (1, 0)
on conflict (id) do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists "platform_settings_read" on public.platform_settings;
create policy "platform_settings_read" on public.platform_settings for select using (true);
drop policy if exists "platform_settings_write" on public.platform_settings;
create policy "platform_settings_write" on public.platform_settings for update using (true);

-- 2. The ledger itself. One row per successful payment that has a
--    doctor/provider payee. Never created for 'pending'/'failed' payments —
--    only once `payments.status = 'success'` (see payment_reference below).
create table if not exists public.revenue_ledger (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments(id) on delete cascade,
  reference_type    text not null check (reference_type in ('homecare_booking','consultation')),
  reference_id      uuid not null,
  payee_type        text not null check (payee_type in ('doctor','provider')),
  payee_id          uuid not null,
  patient_id        uuid references public.profiles(id),
  gross_amount      numeric(12,2) not null default 0,
  platform_fee      numeric(12,2) not null default 0,
  net_amount        numeric(12,2) not null default 0,
  status            text not null default 'paid' check (status in ('paid','refunded')),
  occurred_at       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- One ledger row per payment — this is what makes ledger creation
-- idempotent: if the same payment is (somehow) confirmed twice, the second
-- insert just fails the unique constraint instead of double-counting
-- revenue. The app code also checks for an existing row first.
create unique index if not exists revenue_ledger_payment_uidx on public.revenue_ledger(payment_id);
create index if not exists revenue_ledger_payee_idx on public.revenue_ledger(payee_type, payee_id, occurred_at desc);

alter table public.revenue_ledger enable row level security;
drop policy if exists "revenue_ledger_read" on public.revenue_ledger;
create policy "revenue_ledger_read" on public.revenue_ledger for select using (true);
drop policy if exists "revenue_ledger_write" on public.revenue_ledger;
create policy "revenue_ledger_write" on public.revenue_ledger for insert with check (true);
drop policy if exists "revenue_ledger_upd" on public.revenue_ledger;
create policy "revenue_ledger_upd" on public.revenue_ledger for update using (true);
