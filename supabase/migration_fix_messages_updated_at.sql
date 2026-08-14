-- ============================================================================
-- FIX: messages table is missing `updated_at`, but a trigger tries to set it
-- ============================================================================
-- Root cause: `trg_messages_touch` (a BEFORE UPDATE trigger shared across
-- many tables) calls `touch_updated_at()`, which does `new.updated_at = now()`.
-- The `messages` table was never given an `updated_at` column, so any UPDATE
-- to `messages` (e.g. marking a Form TTV as submitted) fails with:
--   record "new" has no field "updated_at"
-- This showed up as a 400 Bad Request on
--   PATCH .../messages?id=eq.<id>
-- Run this once in the Supabase SQL Editor to fix it.
-- ============================================================================

alter table public.messages
  add column if not exists updated_at timestamptz not null default now();
