-- ============================================================================
-- MIGRATION: Palliative Screening Form persistence ("Skrining Paliatif")
-- ============================================================================
-- Fixes the same class of bug as migration_screening_forms.sql, but for the
-- OTHER "send a form to a patient via chat" flow: a doctor picks a bundle of
-- palliative tools (ESAS, Distress Thermometer, SPICT, PPS, Zarit, EORTC),
-- the patient fills each one inline from the chat message. This was local
-- Zustand state only — never persisted — so it vanished on reload and was
-- invisible cross-device, and (after chat messages started polling the
-- server for real) its chat announcement message was actively being wiped.
--
-- NOTE: this is deliberately a separate table from the pre-existing
-- `screenings` table. `screenings` stores ONE completed palliative
-- assessment per row for a `palliative_patient_id` under long-term
-- palliative monitoring (a different, already-working feature — see
-- palliative-monitoring-panel.tsx). This table instead tracks the
-- *envelope* sent through chat: which tools were selected, per-tool
-- answers/results while the patient works through them, and the envelope's
-- own status (sent/opened/in_progress/completed/reviewed). Reusing
-- `screenings` here would conflate two different concepts and would need
-- loosening its `jenis_skrining` CHECK constraint for no real benefit.
-- ============================================================================

create table if not exists public.palliative_screening_forms (
  id               uuid primary key default gen_random_uuid(),
  consultation_id  uuid references public.consultations(id) on delete set null,
  doctor_id        uuid not null references public.doctor_profiles(id) on delete cascade,
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'sent'
                      check (status in ('sent','opened','in_progress','draft','completed','reviewed')),
  instructions     text,
  selected_tools   jsonb not null default '[]',
  tool_answers     jsonb not null default '{}',
  tool_results     jsonb not null default '{}',
  doctor_notes     text,
  audit_log        jsonb not null default '[]',
  completed_at     timestamptz,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists palliative_screening_forms_patient_idx      on public.palliative_screening_forms (patient_id, created_at desc);
create index if not exists palliative_screening_forms_doctor_idx       on public.palliative_screening_forms (doctor_id, created_at desc);
create index if not exists palliative_screening_forms_consultation_idx on public.palliative_screening_forms (consultation_id);

alter table public.palliative_screening_forms enable row level security;

drop policy if exists "palliative_screening_forms_all_read"  on public.palliative_screening_forms;
drop policy if exists "palliative_screening_forms_all_write" on public.palliative_screening_forms;
drop policy if exists "palliative_screening_forms_all_upd"   on public.palliative_screening_forms;
drop policy if exists "palliative_screening_forms_all_del"   on public.palliative_screening_forms;
-- Permissive, consistent with every other clinical table in this schema.
create policy "palliative_screening_forms_all_read"  on public.palliative_screening_forms for select using (true);
create policy "palliative_screening_forms_all_write" on public.palliative_screening_forms for insert with check (true);
create policy "palliative_screening_forms_all_upd"   on public.palliative_screening_forms for update using (true);
create policy "palliative_screening_forms_all_del"   on public.palliative_screening_forms for delete using (true);

create or replace function public.set_palliative_screening_forms_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_palliative_screening_forms_updated_at on public.palliative_screening_forms;
create trigger trg_palliative_screening_forms_updated_at
  before update on public.palliative_screening_forms
  for each row execute function public.set_palliative_screening_forms_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'palliative_screening_forms'
  ) then
    alter publication supabase_realtime add table public.palliative_screening_forms;
  end if;
end$$;

notify pgrst, 'reload schema';
