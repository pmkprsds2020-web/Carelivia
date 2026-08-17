-- ============================================================================
-- CareLivia — Lock down financial tables (payments, orders, revenue)
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- IMPORTANT: Run this AFTER deploying the updated paymentService.ts /
-- pharmacyService.ts / revenueService.ts (they now use the service-role
-- admin client for these tables). If you run this migration before
-- deploying that code, checkout/payment/revenue features WILL break.
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- Every table in this app currently has a fully permissive RLS policy —
-- `using (true)` for select/insert/update/delete — meaning ANY visitor,
-- logged in or not, could directly INSERT/UPDATE/DELETE rows in `payments`,
-- `orders`, or (once it existed) `revenue_ledger` straight from browser dev
-- tools, without going through any of the idempotency/validation logic in
-- paymentService or pharmacyService. That's a real risk for money-related
-- tables specifically.
--
-- SCOPE: this migration ONLY touches 5 tables — payments, orders,
-- order_items, revenue_ledger, platform_settings. It does NOT touch any
-- other table (consultations, homecare_services, medicines, chat, clinical
-- data, etc.), because many of those are read/written DIRECTLY from
-- client-side ('use client') components using the anon key — locking them
-- down blind, without a live environment to test against, risks breaking
-- large parts of the app (chat, screening, monitoring...). A full RLS audit
-- across every table is real, necessary future work, but needs to happen
-- with actual test coverage, one module at a time — not as a single blind
-- migration.
--
-- WHAT CHANGES: browser (anon key) can still SELECT (read) its own
-- payment/order history — the app already scopes those reads by user_id in
-- application code. But INSERT/UPDATE/DELETE from the anon/authenticated
-- role is removed; only the service-role key (used exclusively by
-- server-side Next.js API routes in this codebase — see getDbClient() in
-- _common.ts) can write to these 5 tables from now on.
-- ============================================================================

-- payments
drop policy if exists "payments_all_write" on public.payments;
drop policy if exists "payments_all_upd"   on public.payments;
drop policy if exists "payments_all_del"   on public.payments;
-- payments_all_read (select) is left in place — patients/doctors still need
-- to read their own payment history through the app's existing queries.

-- orders
drop policy if exists "orders_all_write" on public.orders;
drop policy if exists "orders_all_upd"   on public.orders;
drop policy if exists "orders_all_del"   on public.orders;

-- order_items
drop policy if exists "order_items_all_write" on public.order_items;
drop policy if exists "order_items_all_upd"   on public.order_items;
drop policy if exists "order_items_all_del"   on public.order_items;

-- revenue_ledger — was created with anon-writable policies in
-- migration_revenue_ledger.sql (needed at the time, before this lockdown
-- existed). Tighten now that services use the service-role client.
drop policy if exists "revenue_ledger_write" on public.revenue_ledger;
drop policy if exists "revenue_ledger_upd"   on public.revenue_ledger;

-- platform_settings — same reasoning; reads stay open (harmless — it's
-- just a fee percentage), writes become admin/service-role only.
drop policy if exists "platform_settings_write" on public.platform_settings;

-- Sanity check query — after running this, each of these should show ONLY
-- a "_read" (select) policy remaining for the anon/authenticated roles:
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('payments','orders','order_items','revenue_ledger','platform_settings')
--   order by tablename, cmd;
