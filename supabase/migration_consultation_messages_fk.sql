-- ============================================================================
-- MIGRATION: fix "Could not find a relationship between 'consultation_messages'
-- and 'profiles'" — chat messages fail to send with a 500 error.
-- ============================================================================
-- Root cause: `consultation_messages.sender_id` was declared as a plain
-- `uuid not null` column with NO foreign key to `profiles(id)`. The app's
-- queries embed the sender's profile via PostgREST relational select
-- (`.select('*, profiles(id, full_name, email, phone, status)')`), which
-- PostgREST can only resolve through an actual FK constraint — without one,
-- every send/read of a chat message fails with a 500 error and the message
-- the user typed disappears (it was never persisted).
--
-- This migration adds that missing FK. Safe to run multiple times.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'consultation_messages_sender_id_fkey'
      and table_name = 'consultation_messages'
  ) then
    alter table public.consultation_messages
      add constraint consultation_messages_sender_id_fkey
      foreign key (sender_id) references public.profiles(id) on delete cascade;
  end if;
end$$;

-- PostgREST caches the schema and needs to know about the new relationship.
-- Supabase normally picks this up within a few seconds automatically; this
-- NOTIFY forces an immediate reload so the fix takes effect right away.
notify pgrst, 'reload schema';
