-- ============================================================================
-- CareLivia — Seed real Apotek Online medicines
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- The Apotek Online shop was reading a HARDCODED 12-item demo array from
-- the frontend Zustand store (ids like 'med-1', 'med-2'...) as its fallback
-- until real data loaded. Because the real `medicines` table in Supabase
-- was empty, GET /api/medicines always returned an empty array, so the
-- store kept the fake demo array forever — patients saw "real-looking"
-- medicines that could never actually be bought: checkout tried to look up
-- 'med-1' in the real `medicines` table, found nothing, and failed with a
-- 500 error ("Obat tidak ditemukan").
--
-- This is the exact same root cause as the earlier Home Care /
-- Tarif Dokter bugs — a demo array standing in for a database that was
-- never seeded.
--
-- This migration ONLY inserts rows, and ONLY if the table is currently
-- empty — it will never overwrite or duplicate real medicines you've
-- already added through the admin panel.
-- ============================================================================

alter table public.order_items
  add column if not exists medicine_name_snapshot text; -- safe no-op if migration_payments_pharmacy.sql already added this

insert into public.medicines (name, generic_name, category, price, stock, unit, manufacturer, is_active)
select * from (values
  ('Paracetamol 500mg',      'Paracetamol',                                   'bebas',           15000::numeric,  150, 'Tablet (10)',   'Kimia Farma', true),
  ('Amoxicillin 500mg',      'Amoxicillin',                                   'resep',           25000::numeric,   80, 'Kapsul (10)',   'Sanbe Farma', true),
  ('Omeprazole 20mg',        'Omeprazole',                                    'resep',           35000::numeric,   60, 'Kapsul (10)',   'Bernofarm', true),
  ('CTM (Chlorpheniramine)', 'Chlorpheniramine Maleate',                      'bebas',            8000::numeric,  200, 'Tablet (10)',   'Kimia Farma', true),
  ('Vitamin C 1000mg',       'Ascorbic Acid',                                 'vitamin',         45000::numeric,  120, 'Tablet (20)',   'Nature Made', true),
  ('Ibuprofen 400mg',        'Ibuprofen',                                     'bebas',           18000::numeric,   90, 'Tablet (10)',   'Pharos', true),
  ('Metformin 500mg',        'Metformin HCl',                                 'resep',           22000::numeric,  100, 'Tablet (20)',   'Indofarma', true),
  ('Loratadine 10mg',        'Loratadine',                                    'bebas',           28000::numeric,   75, 'Tablet (10)',   'Kalbe Farma', true),
  ('Termometer Digital',     null,                                            'alat_kesehatan',  85000::numeric,   30, 'Unit',          'Omron', true),
  ('Tensimeter Digital',     null,                                            'alat_kesehatan', 350000::numeric,   15, 'Unit',          'Omron', true),
  ('Vitamin D3 1000IU',      'Cholecalciferol',                               'vitamin',         65000::numeric,   85, 'Softgel (30)',  'Nature Made', true),
  ('Antasida Sirup',         'Aluminium Hydroxide + Magnesium Hydroxide',     'bebas',           22000::numeric,   60, 'Botol (60ml)',  'Kimia Farma', true)
) as seed(name, generic_name, category, price, stock, unit, manufacturer, is_active)
where not exists (select 1 from public.medicines limit 1);
