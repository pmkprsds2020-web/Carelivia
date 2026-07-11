// ───────────────────────────────────────────────────────────────────────────
//  Supabase Client Setup
//  CareLivia — Telepalliative Care Platform
// ───────────────────────────────────────────────────────────────────────────
//
//  HOW TO USE:
//  1) Replace SUPABASE_URL below with your project's REST endpoint.
//     Find it in: Supabase Dashboard → Project Settings → API → Project URL
//     (It should look like: https://<your-project>.supabase.co)
//
//  2) Replace SUPABASE_PUBLIC_KEY with your project's anon/publishable key.
//     Find it in: Supabase Dashboard → Project Settings → API → Project API keys
//     (Use the "anon public" key, NOT the service_role key)
//
//  3) Import the client anywhere in your app:
//     import { supabase } from "@/supabaseClient";
// ───────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// 👇 PASTE YOUR SUPABASE URL HERE 👇
const SUPABASE_URL = "https://vvfpidchtavcyudmasqd.supabase.co/rest/v1/";

// 👇 PASTE YOUR SUPABASE PUBLIC KEY HERE 👇
const SUPABASE_PUBLIC_KEY = "sb_publishable_I88KZJFVdvn_KOYeVLpP_g_xuIqfMy7";

// Exported Supabase client — use this across the app
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

export default supabase;
