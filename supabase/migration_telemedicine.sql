-- ============================================================================
-- 31. TELEMEDICINE MODULE (doctors, medicines, consultations, homecare, orders)
-- ============================================================================
-- Migrates /api/doctors, /api/medicines, /api/consultations, /api/homecare,
-- /api/dashboard, /api/seed off Prisma (which pointed at an invalid
-- DATABASE_URL and always failed with 500) onto Supabase, consistent with the
-- rest of the app. `profiles` (role='Dokter' / 'Pasien') is reused as the
-- identity table instead of introducing a parallel Users table.
-- ============================================================================

-- DOCTOR_PROFILES — extends a `profiles` row (role='Dokter') with
-- telemedicine-specific fields (specialization, fee, rating, availability).
create table if not exists public.doctor_profiles (
  id                uuid primary key references public.profiles(id) on delete cascade,
  specialization    text not null default 'umum',
  license_number    text,
  hospital          text,
  experience_years  integer,
  rating            numeric(3,2) not null default 0,
  review_count      integer not null default 0,
  consultation_fee  numeric(12,2) not null default 75000,
  is_online         boolean not null default false,
  is_available      boolean not null default true,
  bio               text,
  education         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists doctor_profiles_specialization_idx on public.doctor_profiles(specialization);
alter table public.doctor_profiles enable row level security;

-- MEDICINES — pharmacy catalog.
create table if not exists public.medicines (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  generic_name  text,
  category      text not null default 'bebas' check (category in ('resep','bebas','vitamin','alat_kesehatan')),
  description   text,
  price         numeric(12,2) not null default 0,
  stock         integer not null default 0,
  unit          text,
  manufacturer  text,
  image         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists medicines_category_idx on public.medicines(category);
alter table public.medicines enable row level security;

-- CONSULTATIONS — telemedicine chat/video consult (separate from the
-- palliative `chat_rooms`/`messages` pair, which is a different feature).
create table if not exists public.consultations (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.profiles(id) on delete cascade,
  doctor_id    uuid not null references public.doctor_profiles(id) on delete cascade,
  type         text not null default 'chat' check (type in ('chat','video','audio')),
  status       text not null default 'waiting' check (status in ('waiting','active','completed','cancelled')),
  start_time   timestamptz,
  end_time     timestamptz,
  notes        text,
  rating       integer,
  review       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists consultations_patient_idx on public.consultations(patient_id, created_at desc);
create index if not exists consultations_doctor_idx  on public.consultations(doctor_id, created_at desc);
alter table public.consultations enable row level security;

-- CONSULTATION_MESSAGES
create table if not exists public.consultation_messages (
  id               uuid primary key default gen_random_uuid(),
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  sender_id        uuid not null,
  content          text not null,
  type             text not null default 'text' check (type in ('text','image','file','voice','lab_result')),
  file_url         text,
  status           text not null default 'sent' check (status in ('sent','delivered','read')),
  created_at       timestamptz not null default now()
);
create index if not exists consultation_messages_idx on public.consultation_messages(consultation_id, created_at asc);
alter table public.consultation_messages enable row level security;

-- HOMECARE_SERVICES — bookable service catalog.
create table if not exists public.homecare_services (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  price             numeric(12,2) not null default 0,
  duration_minutes  integer,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.homecare_services enable row level security;

-- HOMECARE_STAFF — extends a `profiles` row with dispatch fields.
create table if not exists public.homecare_staff (
  id              uuid primary key references public.profiles(id) on delete cascade,
  certification   text,
  latitude        double precision,
  longitude       double precision,
  is_available    boolean not null default true,
  current_status  text not null default 'available' check (current_status in ('available','on_duty','off_duty')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.homecare_staff enable row level security;

-- HOMECARE_BOOKINGS
create table if not exists public.homecare_bookings (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  service_id    uuid not null references public.homecare_services(id),
  staff_id      uuid references public.homecare_staff(id),
  scheduled_at  timestamptz not null,
  address       text not null,
  latitude      double precision,
  longitude     double precision,
  notes         text,
  status        text not null default 'pending' check (status in ('pending','confirmed','on_the_way','in_progress','completed','cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists homecare_bookings_patient_idx on public.homecare_bookings(patient_id, created_at desc);
alter table public.homecare_bookings enable row level security;

-- ORDERS / ORDER_ITEMS / PAYMENTS — minimal shape, wired up only for
-- /api/dashboard aggregation today. No checkout flow calls these yet; they
-- exist so the dashboard's counts are real zeros from a real table instead
-- of a crash.
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  total_amount      numeric(12,2) not null default 0,
  shipping_fee      numeric(12,2) not null default 0,
  shipping_address  text,
  tracking_number   text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.orders enable row level security;

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  medicine_id  uuid not null references public.medicines(id),
  quantity     integer not null default 1,
  price        numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.order_items enable row level security;

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid references public.orders(id),
  amount      numeric(12,2) not null default 0,
  status      text not null default 'pending' check (status in ('pending','success','failed','refunded')),
  method      text,
  created_at  timestamptz not null default now()
);
alter table public.payments enable row level security;

-- Permissive RLS for the whole telemedicine module (matches the pattern used
-- for the clinical tables above — tighten with auth.uid()/role checks later).
do $$
declare t text;
begin
  for t in select unnest(array[
    'doctor_profiles','medicines','consultations','consultation_messages',
    'homecare_services','homecare_staff','homecare_bookings',
    'orders','order_items','payments'
  ])
  loop
    execute format('create policy "%I_all_read"  on public.%I for select using (true);', t, t);
    execute format('create policy "%I_all_write" on public.%I for insert with check (true);', t, t);
    execute format('create policy "%I_all_upd"   on public.%I for update using (true);', t, t);
    execute format('create policy "%I_all_del"   on public.%I for delete using (true);', t, t);
  end loop;
end$$;

-- ============================================================================
-- 32. REALTIME PUBLICATION — actually enable it
-- ============================================================================
-- IMPORTANT: every table above (and the chat/clinical tables earlier in this
-- file) was labelled "[REALTIME]" in a comment, but a comment does not turn
-- Realtime on. A table only streams postgres_changes events once it's added
-- to the `supabase_realtime` publication. That step was missing, which is
-- why Form TTV (and other chat) messages could be persisted correctly but
-- never arrive live on the other side — the recipient only saw them after a
-- manual refresh. This block adds every relevant table, skipping any that
-- are already members (idempotent, safe to re-run).
do $$
declare t text;
begin
  for t in select unnest(array[
    'patients','vital_signs','screenings','medications','nutrition',
    'daily_complaints','social_assessments','caregivers','family_meetings',
    'family_coordination_notes','emergency_contacts','financial_support',
    'transport_records','acp','chat_rooms','messages','clinical_alerts',
    'audit_log','ai_reports','notifications','patient_documents',
    'palliative_resumes','referral_letters','services',
    'consultations','consultation_messages','homecare_bookings'
  ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end$$;

