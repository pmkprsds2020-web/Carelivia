-- ============================================================================
-- MIGRATION: Anamnesis Sistem / Review of Systems (ROS)
-- ============================================================================
-- Adds ONE new table: `medical_system_review`.
--
-- Audit performed before writing this migration (see chat for details):
--   - No existing table stores a structured per-symptom system review.
--   - `screenings` already exists but is hard-coded to the palliative tools
--     (esas/pps/spict/distress_thermometer/zarit/eortc/ipos) via a CHECK
--     constraint — reusing it would require loosening that constraint and
--     would conflate two very different data shapes. A dedicated table is
--     the correct, non-duplicating choice here.
--   - `clinical_alerts` is reused as-is for the self-harm safety alert
--     (see `medicalSystemReviewService.ts`) — no changes needed there beyond
--     one new TypeScript-level `alertType` value.
--
-- Idempotent save strategy (fixes the "1 klik jadi 2 record" class of bug):
--   Every assessment session is tagged with a client-generated `encounter_id`
--   (uuid). Saving ALWAYS upserts on the unique key
--   (patient_id, encounter_id, symptom_code) — never a plain INSERT — so
--   re-submitting the same encounter (double click, retry, resumed draft)
--   updates the existing rows instead of creating new ones.
--
-- RLS NOTE: every other clinical table in this schema currently uses a
-- permissive `using (true)` policy (see the "Generic permissive policies"
-- block further down in schema.sql) because the app does not yet map
-- Supabase auth.uid() to doctor/patient roles at the database level —
-- access control is enforced in the application layer instead. This table
-- follows the SAME pattern for consistency with the rest of the schema.
-- Tightening this to real per-doctor/per-patient RLS would need to happen
-- across the whole schema at once (a larger, separate project), not just
-- for this one table, otherwise the app would break for every other module.
-- ============================================================================

create table if not exists public.medical_system_review (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid,
  encounter_id    uuid not null,
  assessment_date timestamptz not null default now(),
  system_name     text not null,   -- e.g. 'kardiovaskular'
  symptom_code    text not null,   -- e.g. 'CV_PALPITASI'
  symptom_name    text not null,   -- e.g. 'Berdebar'
  status          text not null default 'negative'
                    check (status in ('negative','positive','not_asked','unable_to_assess')),
  detail          text,            -- only meaningful when status = 'positive'
  review_status   text not null default 'draft'
                    check (review_status in ('draft','completed')),
  created_by      uuid,
  updated_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint medical_system_review_unique_item
    unique (patient_id, encounter_id, symptom_code)
);

create index if not exists medical_system_review_patient_idx
  on public.medical_system_review (patient_id, assessment_date desc);

create index if not exists medical_system_review_encounter_idx
  on public.medical_system_review (patient_id, encounter_id);

alter table public.medical_system_review enable row level security;

drop policy if exists "medical_system_review_all_read"  on public.medical_system_review;
drop policy if exists "medical_system_review_all_write" on public.medical_system_review;
drop policy if exists "medical_system_review_all_upd"   on public.medical_system_review;
drop policy if exists "medical_system_review_all_del"   on public.medical_system_review;
create policy "medical_system_review_all_read"  on public.medical_system_review for select using (true);
create policy "medical_system_review_all_write" on public.medical_system_review for insert with check (true);
create policy "medical_system_review_all_upd"   on public.medical_system_review for update using (true);
create policy "medical_system_review_all_del"   on public.medical_system_review for delete using (true);

-- Auto-maintain updated_at on every UPDATE (mirrors the pattern used for
-- `messages` in migration_fix_messages_updated_at.sql).
create or replace function public.set_medical_system_review_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_medical_system_review_updated_at on public.medical_system_review;
create trigger trg_medical_system_review_updated_at
  before update on public.medical_system_review
  for each row execute function public.set_medical_system_review_updated_at();

-- Add to realtime publication (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'medical_system_review'
  ) then
    alter publication supabase_realtime add table public.medical_system_review;
  end if;
end$$;
