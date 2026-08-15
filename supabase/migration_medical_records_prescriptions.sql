-- ============================================================================
-- MIGRATION: Medical Records + Prescriptions persistence ("Rekam Medis" & "E-Resep")
-- ============================================================================
-- Same bug class as the two previous migrations: `/api/medical-records` and
-- `/api/prescriptions` only ever had a GET handler, and that handler read
-- from the OLD Prisma database (`@/lib/db`) — a separate system from
-- Supabase that isn't wired up in this deployment. So "Rekam Medis" and
-- "E-Resep" created from the chat panel only ever existed in local Zustand
-- state: never saved, invisible to the patient, and (after chat messages
-- started polling the server for real) their chat announcement messages
-- were actively being wiped by that poll.
--
-- Prescription items are stored as JSONB on the prescription row rather
-- than a separate child table — there's no need to query an individual
-- item outside the context of its prescription, and this keeps the read
-- path a single row fetch (same approach as `screening_forms.module_answers`
-- etc. elsewhere in this schema).
-- ============================================================================

create table if not exists public.medical_records (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.profiles(id) on delete cascade,
  consultation_id   uuid references public.consultations(id) on delete set null,
  rm_number         text,
  diagnosis         text,
  symptoms          text,
  treatment         text,
  lab_results       text,
  radiology_results text,
  notes             text,
  status            text not null default 'draft' check (status in ('draft','selesai','ditinjau')),
  record_date       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists medical_records_patient_idx      on public.medical_records (patient_id, created_at desc);
create index if not exists medical_records_consultation_idx on public.medical_records (consultation_id);

alter table public.medical_records enable row level security;

drop policy if exists "medical_records_all_read"  on public.medical_records;
drop policy if exists "medical_records_all_write" on public.medical_records;
drop policy if exists "medical_records_all_upd"   on public.medical_records;
drop policy if exists "medical_records_all_del"   on public.medical_records;
create policy "medical_records_all_read"  on public.medical_records for select using (true);
create policy "medical_records_all_write" on public.medical_records for insert with check (true);
create policy "medical_records_all_upd"   on public.medical_records for update using (true);
create policy "medical_records_all_del"   on public.medical_records for delete using (true);

create or replace function public.set_medical_records_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_medical_records_updated_at on public.medical_records;
create trigger trg_medical_records_updated_at
  before update on public.medical_records
  for each row execute function public.set_medical_records_updated_at();

-- ============================================================================

create table if not exists public.prescriptions (
  id               uuid primary key default gen_random_uuid(),
  consultation_id  uuid references public.consultations(id) on delete set null,
  doctor_id        uuid not null references public.doctor_profiles(id) on delete cascade,
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending','processed','ready','delivered','cancelled')),
  notes            text,
  items            jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists prescriptions_patient_idx      on public.prescriptions (patient_id, created_at desc);
create index if not exists prescriptions_doctor_idx       on public.prescriptions (doctor_id, created_at desc);
create index if not exists prescriptions_consultation_idx on public.prescriptions (consultation_id);

alter table public.prescriptions enable row level security;

drop policy if exists "prescriptions_all_read"  on public.prescriptions;
drop policy if exists "prescriptions_all_write" on public.prescriptions;
drop policy if exists "prescriptions_all_upd"   on public.prescriptions;
drop policy if exists "prescriptions_all_del"   on public.prescriptions;
create policy "prescriptions_all_read"  on public.prescriptions for select using (true);
create policy "prescriptions_all_write" on public.prescriptions for insert with check (true);
create policy "prescriptions_all_upd"   on public.prescriptions for update using (true);
create policy "prescriptions_all_del"   on public.prescriptions for delete using (true);

create or replace function public.set_prescriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prescriptions_updated_at on public.prescriptions;
create trigger trg_prescriptions_updated_at
  before update on public.prescriptions
  for each row execute function public.set_prescriptions_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'medical_records'
  ) then
    alter publication supabase_realtime add table public.medical_records;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prescriptions'
  ) then
    alter publication supabase_realtime add table public.prescriptions;
  end if;
end$$;

notify pgrst, 'reload schema';
