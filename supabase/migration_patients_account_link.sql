-- ============================================================================
-- CareLivia — Link palliative `patients` rows to the real patient account
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- WHY THIS MIGRATION EXISTS
-- ──────────────────────────
-- The `patients` table (palliative patient clinical records) had NO column
-- linking a row back to the actual logged-in patient account (`profiles`).
-- The app's `patientId` field was being read as the row's own auto-generated
-- `id` — never the real account id — so two things silently broke:
--
--   1. "Jadikan Pasien Monitoring Paliatif" never recognized a patient as
--      already added (the check compares against the real account id), so
--      the button never disappeared and repeat clicks created duplicate
--      palliative-patient rows for the same person.
--   2. The patient's own "Pelayanan Paliatif → Chat Paliatif" page resolves
--      itself via `palliativePatients.find(p => p.patientId === currentUser.id)`
--      — since that comparison could never succeed, the patient could never
--      find their own record, so their chat never joined the same room the
--      doctor's Monitoring Paliatif panel was sending to.
--
-- This migration adds the missing link column. Safe to re-run.
-- ============================================================================

alter table public.patients
  add column if not exists patient_account_id uuid references public.profiles(id);

create index if not exists patients_patient_account_id_idx
  on public.patients(patient_account_id);

-- NOTE: this does NOT retroactively fix rows created before this migration —
-- there is no reliable way to know which existing `patients` row belongs to
-- which login account. After deploying the code fix that goes with this
-- migration:
--   1. In "Monitoring Paliatif" → tab "Pasien", delete any duplicate entries
--      for the same person (the 🗑 icon in the Aksi column).
--   2. Have the doctor click "Jadikan Pasien Monitoring Paliatif" ONE more
--      time for that patient from Chat Pasien. The new row this creates WILL
--      be correctly linked, the button will correctly disappear afterward,
--      and chat between doctor and patient will start working.
