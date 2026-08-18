-- ============================================================================
-- CareLivia — Home Care: require admin validation before payment
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- Home Care bookings used to get a pending payment (and an auto-assigned
-- staff member) the instant a patient checked out — there was no admin
-- review step at all. The requirement is: a patient books → an admin
-- reviews/validates the booking → ONLY THEN does a pending payment appear
-- and can the patient pay. This migration adds the columns that gate that:
--
--   admin_validated  — false until an admin approves the booking
--   validated_at     — when it was approved
--   validated_by     — which admin approved it (profiles.id)
--
-- Safe to re-run (every statement is idempotent). Only adds columns/index,
-- never drops anything.
-- ============================================================================

alter table public.homecare_bookings
  add column if not exists admin_validated boolean not null default false,
  add column if not exists validated_at     timestamptz,
  add column if not exists validated_by     uuid;

-- Backfill: any booking that already has a payment row (created under the
-- OLD flow, before this migration) is treated as already validated, so
-- existing in-flight bookings/payments keep working exactly as before.
update public.homecare_bookings b
set admin_validated = true,
    validated_at = coalesce(b.validated_at, b.created_at)
where b.admin_validated = false
  and exists (
    select 1 from public.payments p
    where p.reference_type = 'homecare_booking'
      and p.reference_id = b.id
  );

-- Speeds up the admin "menunggu validasi" queue (bookings where
-- admin_validated = false), which is the main new admin-side query.
create index if not exists homecare_bookings_admin_validated_idx
  on public.homecare_bookings(admin_validated, created_at desc);
