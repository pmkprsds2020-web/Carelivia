-- ============================================================================
-- CareLivia — Hasil Lab (general patient lab results)
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- The "Hasil Lab" tab in a regular patient's Rekam Medis had NO real data
-- source at all — a previous cleanup removed fake demo lab results and left
-- a permanent "Belum ada hasil lab" empty state, with no way for a doctor
-- to actually enter results. This is separate from the palliative-only
-- `lab_results`-style data used inside Monitoring Paliatif → Pemeriksaan
-- Penunjang (that one is scoped to the `patients` palliative-record table,
-- which a regular outpatient may never have a row in).
--
-- This table is scoped directly to the patient's login account
-- (profiles.id), so it works for every patient, palliative or not.
-- ============================================================================

create table if not exists public.patient_lab_results (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  doctor_id        uuid references public.profiles(id),
  test_name        text not null,       -- e.g. "Gula Darah Puasa", "Hemoglobin"
  result_value     text not null,       -- kept as text: lab results aren't always purely numeric (e.g. "Negatif", "3+")
  unit             text,                -- e.g. "mg/dL", "g/dL"
  reference_range  text,                -- e.g. "70-110"
  is_abnormal      boolean not null default false,
  notes            text,
  performed_at      date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.patient_lab_results enable row level security;

drop policy if exists "patient_lab_results_select" on public.patient_lab_results;
create policy "patient_lab_results_select"
  on public.patient_lab_results for select
  to authenticated
  using (true);

drop policy if exists "patient_lab_results_write" on public.patient_lab_results;
create policy "patient_lab_results_write"
  on public.patient_lab_results for all
  to authenticated
  using (true)
  with check (true);

create index if not exists patient_lab_results_patient_idx
  on public.patient_lab_results(patient_id, performed_at desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'patient_lab_results'
  ) then
    alter publication supabase_realtime add table public.patient_lab_results;
  end if;
exception when undefined_object then
  null;
end $$;
