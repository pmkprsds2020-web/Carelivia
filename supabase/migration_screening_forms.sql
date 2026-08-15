-- ============================================================================
-- MIGRATION: Comprehensive Screening Form persistence ("Skrining Pasien")
-- ============================================================================
-- Fixes: doctor sends a 12-module screening form to a patient via chat, the
-- patient fills it in (Skrining Pasien panel) — none of this was ever
-- persisted to Supabase (it lived only in local Zustand state), so it
-- disappeared on reload and was never visible across devices/sessions.
--
-- The nested per-module answers/scores/files/results don't need to be
-- queried individually by Postgres, so they're stored as JSONB (same
-- approach already used for `clinical_alerts.values` elsewhere in this
-- schema) rather than fully normalized into many extra tables.
-- ============================================================================

create table if not exists public.screening_forms (
  id                 uuid primary key default gen_random_uuid(),
  consultation_id    uuid references public.consultations(id) on delete set null,
  doctor_id          uuid not null references public.doctor_profiles(id) on delete cascade,
  patient_id         uuid not null references public.profiles(id) on delete cascade,
  status             text not null default 'sent'
                        check (status in ('sent','opened','in_progress','draft','completed','reviewed')),
  instructions       text,
  deadline           timestamptz,
  selected_modules   jsonb not null default '[]',
  module_answers     jsonb not null default '{}',
  module_scores      jsonb not null default '{}',
  clinical_files     jsonb not null default '[]',
  triage_result      jsonb,
  clinical_summary   jsonb,
  doctor_notes       text,
  follow_up          text,
  ai_analysis        text,
  audit_log          jsonb not null default '[]',
  completed_at       timestamptz,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists screening_forms_patient_idx      on public.screening_forms (patient_id, created_at desc);
create index if not exists screening_forms_doctor_idx       on public.screening_forms (doctor_id, created_at desc);
create index if not exists screening_forms_consultation_idx on public.screening_forms (consultation_id);

alter table public.screening_forms enable row level security;

drop policy if exists "screening_forms_all_read"  on public.screening_forms;
drop policy if exists "screening_forms_all_write" on public.screening_forms;
drop policy if exists "screening_forms_all_upd"   on public.screening_forms;
drop policy if exists "screening_forms_all_del"   on public.screening_forms;
-- Permissive, consistent with every other clinical table in this schema —
-- see the RLS note in migration_medical_system_review.sql for why.
create policy "screening_forms_all_read"  on public.screening_forms for select using (true);
create policy "screening_forms_all_write" on public.screening_forms for insert with check (true);
create policy "screening_forms_all_upd"   on public.screening_forms for update using (true);
create policy "screening_forms_all_del"   on public.screening_forms for delete using (true);

create or replace function public.set_screening_forms_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_screening_forms_updated_at on public.screening_forms;
create trigger trg_screening_forms_updated_at
  before update on public.screening_forms
  for each row execute function public.set_screening_forms_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'screening_forms'
  ) then
    alter publication supabase_realtime add table public.screening_forms;
  end if;
end$$;

notify pgrst, 'reload schema';
