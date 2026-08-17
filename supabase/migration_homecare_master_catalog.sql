-- ============================================================================
-- CareLivia — Home Care Master Catalog fix
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- `public.homecare_services` already existed (see migration_telemedicine.sql)
-- and is what the PATIENT side reads from (via homecareService.getServices()
-- / GET /api/homecare). But the Admin "Kelola Harga → Harga Home Care" tab
-- was never wired to this table — it only edited a hardcoded in-memory array
-- in the browser, and the Admin "Tarif Dokter" save POSTed to a dead
-- Prisma/SQLite route (/api/admin/pricing) that has no working connection in
-- production. Net effect: nothing an admin did on that screen ever reached
-- the database, so patients always saw "Belum ada layanan tersedia".
--
-- This migration only ADDS columns/data — it never drops anything, and is
-- safe to re-run (every statement is idempotent).
-- ============================================================================

-- 1. Add the extra master-data columns the Admin catalog UI needs, on top of
--    the columns that already exist (id, name, description, price,
--    duration_minutes, is_active, created_at, updated_at).
alter table public.homecare_services
  add column if not exists category        text not null default 'Lainnya',
  add column if not exists display_order    integer not null default 0,
  add column if not exists created_by       uuid,
  add column if not exists updated_by       uuid;

-- 2. Price/name SNAPSHOT columns on bookings, so that if an admin later
--    edits a service's name or price, historical bookings/invoices keep
--    showing what the patient actually paid at the time.
alter table public.homecare_bookings
  add column if not exists service_name_snapshot text,
  add column if not exists unit_price             numeric(12,2);

-- Backfill snapshot columns for any existing bookings from their current
-- linked service (best effort — future bookings get the real snapshot at
-- creation time going forward).
update public.homecare_bookings b
set
  service_name_snapshot = coalesce(b.service_name_snapshot, s.name),
  unit_price             = coalesce(b.unit_price, s.price)
from public.homecare_services s
where b.service_id = s.id
  and (b.service_name_snapshot is null or b.unit_price is null);

-- 3. Seed the 8 common services (matches what the admin UI used to show as
--    fake/local-only data) ONLY if the table is currently empty — this does
--    NOT run if you've already added real services, so it never overwrites
--    anything.
insert into public.homecare_services (name, category, description, price, duration_minutes, is_active, display_order)
select * from (values
  ('Perawatan Luka',        'Perawatan Luka',    'Perawatan luka di rumah oleh tenaga kesehatan.', 150000, 45, true, 1),
  ('Pemasangan Infus',      'Infus',              'Pemasangan infus oleh perawat bersertifikat.',   200000, 30, true, 2),
  ('Injeksi/Injeksi IM',    'Injeksi',            'Penyuntikan obat sesuai resep dokter.',           100000, 20, true, 3),
  ('Pemeriksaan Lansia',    'Pemeriksaan Lansia', 'Pemeriksaan kesehatan rutin untuk lansia.',       175000, 60, true, 4),
  ('Kunjungan Dokter',      'Kunjungan Dokter',   'Kunjungan dokter umum ke rumah pasien.',          350000, 45, true, 5),
  ('Kunjungan Bidan',       'Kunjungan Bidan',    'Kunjungan bidan untuk perawatan ibu dan anak.',   250000, 45, true, 6),
  ('Pengambilan Sampel Lab','Sampel Lab',         'Pengambilan sampel laboratorium di rumah.',       125000, 30, true, 7),
  ('Fisioterapi',           'Fisioterapi',        'Sesi fisioterapi di rumah pasien.',               300000, 60, true, 8)
) as seed(name, category, description, price, duration_minutes, is_active, display_order)
where not exists (select 1 from public.homecare_services limit 1);

-- 4. Index for the admin catalog's default sort order.
create index if not exists homecare_services_display_order_idx
  on public.homecare_services(display_order, name);
