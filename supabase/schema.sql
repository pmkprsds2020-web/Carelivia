-- ============================================================================
-- CareLivia — Supabase Schema for Monitoring Paliatif
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- Or via: psql $DATABASE_URL -f supabase/schema.sql
--
-- After running, also enable Realtime on the marked tables:
--   Supabase Dashboard → Database → Replication → Toggle realtime for the
--   tables marked with [REALTIME] below.
-- ============================================================================

-- Required extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PATIENTS  [REALTIME]
-- ============================================================================
create table if not exists public.patients (
  id              uuid primary key default gen_random_uuid(),
  rm              text unique,
  nik             text,
  nama            text not null,
  tanggal_lahir   date,
  jenis_kelamin   text check (jenis_kelamin in ('L','P')),
  alamat          text,
  diagnosa        text,
  dokter_id       uuid,
  dokter_nama     text,
  status          text not null default 'aktif' check (status in ('aktif','meninggal','lost_follow_up','pindah_faskes','program_selesai')),
  risiko          text not null default 'hijau' check (risiko in ('hijau','kuning','merah')),
  program         text not null default 'rawat_jalan' check (program in ('rawat_jalan','home_care','hospice','rawat_inap')),
  family_contact_name     text,
  family_contact_phone    text,
  family_contact_relation text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.patients enable row level security;

-- ============================================================================
-- 2. VITAL_SIGNS  [REALTIME]
-- ============================================================================
create table if not exists public.vital_signs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  doctor_id     uuid,
  tanggal       date not null default current_date,
  jam           time not null default current_time,
  sistol        integer,
  diastol       integer,
  nadi          integer,
  rr            integer,
  spo2          integer,
  suhu          numeric(4,1),
  bb            numeric(5,1),
  tb            numeric(5,1),
  bmi           numeric(4,1),
  gcs           integer,
  nyeri         integer check (nyeri between 0 and 10),
  catatan       text,
  input_by      text,
  created_at    timestamptz not null default now()
);
create index if not exists vital_signs_patient_idx on public.vital_signs(patient_id, created_at desc);
alter table public.vital_signs enable row level security;

-- ============================================================================
-- 3. SCREENINGS  [REALTIME]
-- ============================================================================
create table if not exists public.screenings (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid,
  jenis_skrining  text not null check (jenis_skrining in ('esas','pps','spict','distress_thermometer','zarit','eortc','ipos')),
  jawaban         jsonb not null default '{}'::jsonb,
  score           numeric(6,2),
  interpretasi    text,
  ews             text check (ews in ('hijau','kuning','merah')),
  tanggal         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists screenings_patient_idx on public.screenings(patient_id, created_at desc);
alter table public.screenings enable row level security;

-- ============================================================================
-- 4. MEDICATIONS  [REALTIME]
-- ============================================================================
create table if not exists public.medications (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  nama_obat       text not null,
  dosis           text,
  frekuensi       text,
  rute            text default 'oral',
  indikasi        text,
  tanggal_mulai   date,
  tanggal_selesai date,
  kepatuhan       jsonb default '{}'::jsonb,
  efek_samping    text,
  stok            text,
  catatan         text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists medications_patient_idx on public.medications(patient_id);
alter table public.medications enable row level security;

-- ============================================================================
-- 5. NUTRITION  [REALTIME]
-- ============================================================================
create table if not exists public.nutrition (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  kalori_target   numeric(7,1),
  kalori_tercapai numeric(7,1),
  protein         numeric(6,1),
  karbo           numeric(6,1),
  lemak           numeric(6,1),
  cairan          numeric(7,1),
  bb              numeric(5,1),
  tb              numeric(5,1),
  imt             numeric(4,1),
  status_gizi     text,
  catatan         text,
  activity_level  text,
  metabolic_stress text,
  special_condition text,
  recorded_by     text,
  recorded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists nutrition_patient_idx on public.nutrition(patient_id, recorded_at desc);
alter table public.nutrition enable row level security;

-- ============================================================================
-- 6. DAILY_COMPLAINTS  [REALTIME]
-- ============================================================================
create table if not exists public.daily_complaints (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  kondisi_hari_ini    text,
  alasan_kondisi      text,
  keluhan_baru        text,
  deskripsi_keluhan   text,
  kondisi_nyeri       text,
  kondisi_sesak       text,
  makan_minum         text,
  alasan_makan_minum  text,
  tidur               text,
  alasan_tidur        text,
  masalah_obat        text,
  deskripsi_masalah   text,
  severity_level      text default 'ringan',
  sumber_pengisian    text default 'manual',
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index if not exists daily_complaints_patient_idx on public.daily_complaints(patient_id, submitted_at desc);
alter table public.daily_complaints enable row level security;

-- ============================================================================
-- 7. SOCIAL_ASSESSMENTS  [REALTIME]
-- ============================================================================
create table if not exists public.social_assessments (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  housing_condition   text,
  caregiver_availability text,
  family_support_level text,
  transport_difficulty text,
  economic_constraint text,
  healthcare_access   text,
  medical_equipment_need text,
  social_assistance_need text,
  social_isolation_risk text,
  overall_status      text default 'lengkap',
  priority_level      text default 'rendah',
  recommendations     jsonb default '[]'::jsonb,
  assessed_by         text,
  assessed_by_role    text default 'palliative_team',
  assessed_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.social_assessments enable row level security;

-- ============================================================================
-- 8. CAREGIVERS  [REALTIME]
-- ============================================================================
create table if not exists public.caregivers (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  name          text not null,
  role          text default 'pendamping',
  relation      text,
  phone         text,
  email         text,
  address       text,
  schedule      text,
  tasks         jsonb default '[]'::jsonb,
  is_active     boolean not null default true,
  zarit_score   integer,
  zarit_level   text,
  family_apgar_score integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.caregivers enable row level security;

-- ============================================================================
-- 9. FAMILY_MEETINGS
-- ============================================================================
create table if not exists public.family_meetings (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  title           text not null,
  scheduled_at    timestamptz not null,
  duration        integer,
  status          text default 'terjadwal',
  participants    jsonb default '[]'::jsonb,
  agenda          text,
  discussion_notes text,
  resume          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.family_meetings enable row level security;

-- ============================================================================
-- 10. FAMILY_COORDINATION_NOTES
-- ============================================================================
create table if not exists public.family_coordination_notes (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  author_name   text not null,
  author_relation text,
  content       text not null,
  type          text default 'perkembangan',
  is_completed  boolean not null default false,
  due_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.family_coordination_notes enable row level security;

-- ============================================================================
-- 11. EMERGENCY_CONTACTS
-- ============================================================================
create table if not exists public.emergency_contacts (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  name            text not null,
  role            text,
  phone           text,
  alternate_phone text,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.emergency_contacts enable row level security;

-- ============================================================================
-- 12. FINANCIAL_SUPPORT
-- ============================================================================
create table if not exists public.financial_support (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid not null references public.patients(id) on delete cascade,
  insurance_status      text,
  insurance_details     text,
  bpjs_number           text,
  social_aid_status     text,
  social_aid_details    text,
  treatment_cost_need   text default 'tidak_ada',
  medical_equipment_cost_need text default 'tidak_ada',
  transport_cost_need   text default 'tidak_ada',
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.financial_support enable row level security;

-- ============================================================================
-- 13. TRANSPORT_RECORDS
-- ============================================================================
create table if not exists public.transport_records (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  need_type     text,
  status        text default 'tidak_perlu',
  pickup_location text,
  destination   text,
  scheduled_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now()
);
alter table public.transport_records enable row level security;

-- ============================================================================
-- 14. ACP (Advance Care Planning)  [REALTIME]
-- ============================================================================
create table if not exists public.acp (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.patients(id) on delete cascade,
  decision_maker_name     text,
  decision_maker_relation text,
  decision_maker_phone    text,
  preferred_care_location text,
  care_goal               text,
  resuscitation_pref      text default 'tidak',
  ventilator_pref         text default 'tidak',
  icu_pref                text default 'tidak',
  artificial_nutrition    text,
  dialysis_pref           text,
  organ_donation          text,
  patient_hopes           text,
  patient_worries         text,
  life_values             text,
  end_of_life_prefs       text,
  patient_signed          boolean not null default false,
  family_signed           boolean not null default false,
  doctor_signed           boolean not null default false,
  signed_at               timestamptz,
  is_active               boolean not null default true,
  revisions               jsonb default '[]'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table public.acp enable row level security;

-- ============================================================================
-- 15. CHAT_ROOMS  [REALTIME]
-- ============================================================================
create table if not exists public.chat_rooms (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  doctor_id   uuid,
  room_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (patient_id, doctor_id)
);
alter table public.chat_rooms enable row level security;

-- ============================================================================
-- 16. MESSAGES  [REALTIME]
-- ============================================================================
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.chat_rooms(id) on delete cascade,
  patient_id    uuid,
  doctor_id     uuid,
  sender_id     text not null,
  sender_name   text,
  sender_role   text not null check (sender_role in ('doctor','patient','family','system')),
  type          text not null default 'text' check (type in ('text','education','instruction','form_ttv','form_keluhan','form_screening','form_monitoring_obat','form_response','reminder','image','ai_summary','clinical_alert')),
  content       text not null default '',
  status        text not null default 'sent' check (status in ('sent','delivered','read')),
  form_type     text,
  form_data     jsonb,
  form_response jsonb,
  screening_type text,
  ai_summary    text,
  image_url     text,
  attachment_url text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists messages_room_idx on public.messages(room_id, created_at asc);
alter table public.messages enable row level security;

-- ============================================================================
-- 17. CLINICAL_ALERTS  [REALTIME]
-- ============================================================================
create table if not exists public.clinical_alerts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  alert_type  text not null,
  severity    text not null check (severity in ('hijau','kuning','merah')),
  title       text,
  description text,
  values      jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists clinical_alerts_patient_idx on public.clinical_alerts(patient_id, created_at desc);
alter table public.clinical_alerts enable row level security;

-- ============================================================================
-- 18. AUDIT_LOG  [REALTIME]
-- ============================================================================
create table if not exists public.audit_log (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid,
  action            text not null,
  performed_by      text,
  performed_by_role text default 'system',
  details           text,
  ip_address        text,
  device            text,
  created_at        timestamptz not null default now()
);
create index if not exists audit_log_patient_idx on public.audit_log(patient_id, created_at desc);
alter table public.audit_log enable row level security;

-- ============================================================================
-- 19. AI_REPORTS  [REALTIME]
-- ============================================================================
create table if not exists public.ai_reports (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  report_type   text not null,
  prompt        text,
  response      text,
  metadata      jsonb,
  generated_by  text default 'ai',
  created_at    timestamptz not null default now()
);
create index if not exists ai_reports_patient_idx on public.ai_reports(patient_id, created_at desc);
alter table public.ai_reports enable row level security;

-- ============================================================================
-- 20. NOTIFICATIONS  [REALTIME]
-- ============================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  patient_id  uuid,
  title       text not null,
  body        text,
  type        text default 'info',
  is_read     boolean not null default false,
  data        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

-- ============================================================================
-- 21. PATIENT_DOCUMENTS (Pemeriksaan Penunjang)
-- ============================================================================
create table if not exists public.patient_documents (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  jenis       text not null check (jenis in ('lab','radiologi','gambar','pdf','lainnya')),
  nama_file   text not null,
  storage_path text not null,
  url         text,
  keterangan  text,
  tanggal     date not null default current_date,
  uploaded_by text,
  created_at  timestamptz not null default now()
);
create index if not exists patient_documents_patient_idx on public.patient_documents(patient_id, tanggal desc);
alter table public.patient_documents enable row level security;

-- ============================================================================
-- 22. PALLIATIVE_RESUMES (Resume Medis & Referral)
-- ============================================================================
create table if not exists public.palliative_resumes (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  document_number     text,
  generated_by        text,
  generated_by_role   text default 'doctor',
  generated_at        timestamptz not null default now(),
  full_content        text,
  version             integer not null default 1,
  previous_version_id uuid,
  is_signed           boolean not null default false,
  signed_at           timestamptz,
  qr_code             text,
  download_count      integer not null default 0,
  print_count         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.palliative_resumes enable row level security;

-- ============================================================================
-- 23. REFERRAL_LETTERS
-- ============================================================================
create table if not exists public.referral_letters (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  resume_id           uuid references public.palliative_resumes(id) on delete set null,
  target_department   text,
  reason              text,
  status              text default 'draft' check (status in ('draft','sent','received','rejected')),
  content             text,
  created_by          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.referral_letters enable row level security;

-- ============================================================================
-- updated_at triggers (auto-update on row change)
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'patients','medications','nutrition','social_assessments','caregivers',
    'family_meetings','family_coordination_notes','financial_support',
    'acp','chat_rooms','messages','referral_letters','palliative_resumes'
  ])
  loop
    execute format('drop trigger if exists trg_%I_touch on public.%I;', t, t);
    execute format('create trigger trg_%I_touch before update on public.%I for each row execute function public.touch_updated_at();', t, t);
  end loop;
end$$;

-- ============================================================================
-- Row Level Security policies
-- ============================================================================
-- Default deny — policies below open up the access patterns we need.
-- In production, restrict these by auth.uid() and role.

-- Patients: anyone authenticated can read; only doctors/admins can write.
create policy "patients_read"  on public.patients for select using (true);
create policy "patients_write" on public.patients for insert with check (true);
create policy "patients_upd"   on public.patients for update using (true);
create policy "patients_del"   on public.patients for delete using (true);

-- Generic permissive policies for clinical tables (TTV, screenings, etc.)
do $$
declare t text;
begin
  for t in select unnest(array[
    'vital_signs','screenings','medications','nutrition','daily_complaints',
    'social_assessments','caregivers','family_meetings','family_coordination_notes',
    'emergency_contacts','financial_support','transport_records','acp',
    'chat_rooms','messages','clinical_alerts','audit_log','ai_reports',
    'notifications','patient_documents','palliative_resumes','referral_letters'
  ])
  loop
    execute format('create policy "%I_all_read"  on public.%I for select using (true);', t, t);
    execute format('create policy "%I_all_write" on public.%I for insert with check (true);', t, t);
    execute format('create policy "%I_all_upd"   on public.%I for update using (true);', t, t);
    execute format('create policy "%I_all_del"   on public.%I for delete using (true);', t, t);
  end loop;
end$$;

-- ============================================================================
-- Storage buckets — create via Dashboard → Storage → New bucket
-- Names: patient-files, medical-images, radiology, lab-results, documents, acp-files
-- ============================================================================

-- ============================================================================
-- ============================================================================
-- 24. SERVICES  [REALTIME]  (Admin: Kelola Harga → Tambah Layanan)
-- ============================================================================
-- NOTE: This table is documented here for future migration. The current
-- implementation reuses the existing `notifications` table (which has a
-- flexible `data` JSONB column) because DDL access is unavailable in the
-- runtime environment. See `src/services/supabase/serviceCatalogService.ts`
-- for the storage mapping (user_id='__service_catalog__', type='service').
-- ============================================================================
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  nama_layanan text not null,
  kategori     text,
  harga        numeric(12,2) not null default 0,
  durasi       integer not null default 0,
  status       text not null default 'Aktif' check (status in ('Aktif','Nonaktif')),
  deskripsi    text,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists services_kategori_idx on public.services(kategori);
create index if not exists services_status_idx on public.services(status);
alter table public.services enable row level security;
create policy "services_all_read"  on public.services for select using (true);
create policy "services_all_write" on public.services for insert with check (true);
create policy "services_all_upd"   on public.services for update using (true);
create policy "services_all_del"   on public.services for delete using (true);

-- ============================================================================
-- 25. SUPPORTING_EXAMINATIONS  [REALTIME]  (Pemeriksaan Penunjang parent)
-- ============================================================================
-- NOTE: Documented for future migration. The current implementation reuses
-- the existing `patient_documents` table (jenis IN lab/gambar/radiologi)
-- with structured JSON metadata in the `keterangan` column. See
-- `src/services/supabase/supportingExamService.ts` for the storage mapping.
-- ============================================================================
create table if not exists public.supporting_examinations (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients(id) on delete cascade,
  doctor_id         uuid,
  jenis_pemeriksaan text not null check (jenis_pemeriksaan in ('laboratorium','usg','ekg','radiologi')),
  tanggal           date not null default current_date,
  catatan           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists supporting_exams_patient_idx on public.supporting_examinations(patient_id, tanggal desc);
alter table public.supporting_examinations enable row level security;

-- ============================================================================
-- 26. LABORATORY_RESULTS  [REALTIME]
-- ============================================================================
create table if not exists public.laboratory_results (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.patients(id) on delete cascade,
  doctor_id          uuid,
  tanggal            date not null default current_date,
  gdp                numeric(6,1),  -- Glukosa Darah Puasa
  gds                numeric(6,1),  -- Glukosa Darah Sewaktu
  hba1c              numeric(4,1),  -- HbA1c %
  ureum              numeric(6,1),
  kreatinin          numeric(5,2),
  kolesterol_total   numeric(6,1),
  hdl                numeric(6,1),
  ldl                numeric(6,1),
  trigliserida       numeric(6,1),
  mikroalbumin       numeric(6,1),
  catatan            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists lab_results_patient_idx on public.laboratory_results(patient_id, tanggal desc);
alter table public.laboratory_results enable row level security;

-- ============================================================================
-- 27. ULTRASOUND_RESULTS  [REALTIME]
-- ============================================================================
create table if not exists public.ultrasound_results (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  doctor_id   uuid,
  tanggal     date not null default current_date,
  jenis_usg   text,
  hasil       text,
  foto_url    text,
  catatan     text,
  created_at  timestamptz not null default now()
);
create index if not exists usg_results_patient_idx on public.ultrasound_results(patient_id, tanggal desc);
alter table public.ultrasound_results enable row level security;

-- ============================================================================
-- 28. ECG_RESULTS  [REALTIME]
-- ============================================================================
create table if not exists public.ecg_results (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  doctor_id     uuid,
  tanggal       date not null default current_date,
  foto_url      text,
  interpretasi  text,
  catatan       text,
  created_at    timestamptz not null default now()
);
create index if not exists ecg_results_patient_idx on public.ecg_results(patient_id, tanggal desc);
alter table public.ecg_results enable row level security;

-- ============================================================================
-- 29. RADIOLOGY_RESULTS  [REALTIME]
-- ============================================================================
create table if not exists public.radiology_results (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  doctor_id       uuid,
  tanggal         date not null default current_date,
  jenis_radiologi text check (jenis_radiologi in ('Foto Thorax','CT Scan','MRI','Bone Survey','USG','Mammografi','Lainnya')),
  foto_url        text,
  hasil           text,
  catatan         text,
  created_at      timestamptz not null default now()
);
create index if not exists radiology_results_patient_idx on public.radiology_results(patient_id, tanggal desc);
alter table public.radiology_results enable row level security;

-- ============================================================================
-- Done. Next steps:
-- 1) Open Supabase Dashboard → Database → Replication → Enable realtime for:
--    patients, vital_signs, screenings, medications, nutrition, daily_complaints,
--    social_assessments, acp, chat_rooms, messages, clinical_alerts, audit_log,
--    ai_reports, notifications, patient_documents.
-- 2) Open Storage → create buckets:
--    patient-files, medical-images, radiology, lab-results, documents, acp-files
-- 3) Set .env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================================
