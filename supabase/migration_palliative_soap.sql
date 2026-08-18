-- ============================================================================
-- CareLivia — Palliative SOAP notes (Clinical Timeline + SOAP Documentation)
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- This backs the new "SOAP" tab in Monitoring Paliatif: one row per SOAP
-- note (per patient, per encounter date). The doctor can auto-generate a
-- draft from that day's Keluhan/TTV/Skrining/Obat/Pemeriksaan Penunjang/
-- Nutrisi data, edit it, save as draft, or finalize it.
-- ============================================================================

create table if not exists public.palliative_soap_notes (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  doctor_id        uuid,
  encounter_date   date not null default current_date,
  subjective       text,
  objective        text,
  assessment       text,
  plan             text,
  -- Which data sources were included when the draft was generated, and the
  -- date-range window used — kept for traceability without needing a
  -- separate per-field source-link table (the timeline already shows the
  -- raw source rows inline, so a doctor reviewing a SOAP note can always
  -- cross-check against the Keluhan/TTV/Skrining/Obat/Lab/Nutrisi tabs for
  -- the same date).
  source_summary   jsonb,
  status           text not null default 'draft' check (status in ('draft', 'final')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  finalized_at     timestamptz,
  finalized_by     uuid,
  -- One SOAP note per patient per day — regenerating a draft or editing
  -- always updates THIS row rather than creating a duplicate for the same
  -- date (prevents "generate SOAP membuat duplicate record").
  unique (patient_id, encounter_date)
);

alter table public.palliative_soap_notes enable row level security;

drop policy if exists "palliative_soap_notes_select" on public.palliative_soap_notes;
create policy "palliative_soap_notes_select"
  on public.palliative_soap_notes for select
  to authenticated
  using (true);

drop policy if exists "palliative_soap_notes_write" on public.palliative_soap_notes;
create policy "palliative_soap_notes_write"
  on public.palliative_soap_notes for all
  to authenticated
  using (true)
  with check (true);

create index if not exists palliative_soap_notes_patient_date_idx
  on public.palliative_soap_notes(patient_id, encounter_date desc);

-- Realtime, consistent with the other palliative monitoring tables (vital_signs,
-- screening_records, medications, nutrition_records, daily_complaints, etc.)
-- so a SOAP note saved by one doctor's tab reflects live in another tab.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'palliative_soap_notes'
  ) then
    alter publication supabase_realtime add table public.palliative_soap_notes;
  end if;
exception when undefined_object then
  -- supabase_realtime publication doesn't exist in this project — skip.
  null;
end $$;
