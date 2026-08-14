// ───────────────────────────────────────────────────────────────────────────
//  Supabase Client Setup — CareLivia Telepalliative Care Platform
// ───────────────────────────────────────────────────────────────────────────
//
//  HOW TO USE:
//  1) Set SUPABASE_URL in your .env file (the BASE project URL, NOT /rest/v1/):
//       SUPABASE_URL=https://your-project.supabase.co
//     Find it in: Supabase Dashboard → Project Settings → API → Project URL
//
//  2) Set SUPABASE_ANON_KEY in your .env file (the "anon public" key):
//       SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
//     Find it in: Supabase Dashboard → Project Settings → API → Project API keys
//
//  3) (Server routes only) Set SUPABASE_SERVICE_ROLE_KEY for admin operations:
//       SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...service_role...
//     NEVER expose this key to the browser.
//
//  4) Import the client anywhere in your app:
//       import { supabase } from "@/supabaseClient";
// ───────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// ── Read config from env with safe fallbacks ────────────────────────────────
// ⚠️  The URL must be the BASE project URL, e.g. "https://xxxx.supabase.co"
//     Do NOT include "/rest/v1/" — the supabase-js SDK appends that itself.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://vvfpidchtavcyudmasqd.supabase.co";

const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_I88KZJFVdvn_KOYeVLpP_g_xuIqfMy7";

// ── Browser-safe client (uses anon key, respects RLS) ───────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});

export const SUPABASE_URL_EXPORT = SUPABASE_URL;
export const SUPABASE_ANON_KEY_EXPORT = SUPABASE_PUBLIC_KEY;

// ── Server-only admin client (uses service-role key, bypasses RLS) ──────────
// ⚠️  Only import this from server-side code (API routes, server actions).
//     Never expose the service role key to the browser.
export async function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error(
      "[supabase] getSupabaseAdmin() must only be called from the server. " +
      "It uses the service-role key which bypasses RLS."
    );
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null; // Caller should fall back to the anon client
  }
  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
