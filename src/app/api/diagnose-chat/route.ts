import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";
import { supabase } from "@/supabaseClient";

/**
 * GET /api/diagnose-chat
 *
 * Read-only diagnostic for the "Chat Dokter kosong / Chat Pasien kosong" bug.
 * Visit this URL directly on the PRODUCTION domain (careliviaku.vercel.app,
 * not a preview *-xxxxx.vercel.app URL) and share the JSON output — it
 * pinpoints exactly which of the following is the actual cause on your
 * live deployment:
 *   1. SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars
 *      → backfill/create-profile silently no-op, doctors stay invisible.
 *   2. `doctor_profiles` table doesn't exist yet on the live DB
 *      → supabase/schema.sql was never run against this Supabase project.
 *   3. Doctor accounts exist in `profiles` but have no `doctor_profiles` row
 *      → run /api/auth/backfill-doctor-profiles.
 *   4. Everything is fine at the DB level (doctors exist and are joined
 *      correctly) → the bug is elsewhere (e.g. still on an old deployment,
 *      or a caching issue) — the specific value returned by `sampleViaAnon`
 *      shows what the browser itself would actually receive.
 */
export async function GET() {
  const result: Record<string, any> = {};

  const admin = await getSupabaseAdmin().catch((e) => {
    result.adminClientError = e instanceof Error ? e.message : String(e);
    return null;
  });
  result.serviceRoleKeyConfigured = !!admin;

  // ── 1. Does `doctor_profiles` exist at all? ────────────────────────────
  const client = admin ?? supabase;
  const { error: tableCheckErr, count: doctorProfileCount } = await client
    .from("doctor_profiles")
    .select("*", { head: true, count: "exact" });
  result.doctorProfilesTable = tableCheckErr ? `MISSING or unreachable: ${tableCheckErr.message}` : "exists";
  result.doctorProfilesRowCount = doctorProfileCount ?? 0;

  // ── 2. Does `profiles` exist, and how many role='Dokter' rows? ─────────
  const { data: doctorAccounts, error: profilesErr } = await client
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("role", "Dokter");
  result.profilesTable = profilesErr ? `MISSING or unreachable: ${profilesErr.message}` : "exists";
  result.doctorAccountCount = doctorAccounts?.length ?? 0;
  result.doctorAccounts = (doctorAccounts ?? []).map((d) => ({ id: d.id, name: d.full_name, email: d.email }));

  // ── 3. Which doctor accounts are MISSING a doctor_profiles row? ────────
  if (doctorAccounts && doctorAccounts.length > 0) {
    const { data: existingDp } = await client
      .from("doctor_profiles")
      .select("id")
      .in("id", doctorAccounts.map((d) => d.id));
    const existingIds = new Set((existingDp ?? []).map((r) => r.id));
    result.doctorAccountsMissingDoctorProfile = doctorAccounts
      .filter((d) => !existingIds.has(d.id))
      .map((d) => ({ id: d.id, name: d.full_name, email: d.email }));
  } else {
    result.doctorAccountsMissingDoctorProfile = [];
  }

  // ── 4. Consultations table sanity check ─────────────────────────────────
  const { count: consultationCount, error: consultErr } = await client
    .from("consultations")
    .select("*", { head: true, count: "exact" });
  result.consultationsTable = consultErr ? `MISSING or unreachable: ${consultErr.message}` : "exists";
  result.consultationCount = consultationCount ?? 0;

  // ── 5. Exactly what the browser (anon key, no admin) would see today ───
  const { data: anonSample, error: anonErr } = await supabase
    .from("doctor_profiles")
    .select("id, specialization, profiles(full_name)")
    .limit(5);
  result.sampleViaAnonKey = anonErr ? `error: ${anonErr.message}` : anonSample;

  // ── Verdict ──────────────────────────────────────────────────────────────
  const verdicts: string[] = [];
  if (!result.serviceRoleKeyConfigured) {
    verdicts.push(
      "SUPABASE_SERVICE_ROLE_KEY is NOT set in this deployment's environment variables. " +
      "This means create-profile and backfill-doctor-profiles have been silently no-op-ing. " +
      "Fix: Vercel → Project Settings → Environment Variables → add SUPABASE_SERVICE_ROLE_KEY " +
      "(from Supabase Dashboard → Project Settings → API → service_role secret) → Redeploy."
    );
  }
  if (typeof result.doctorProfilesTable === 'string' && result.doctorProfilesTable.startsWith('MISSING')) {
    verdicts.push(
      "The `doctor_profiles` table itself doesn't exist on this Supabase project. " +
      "Run the full supabase/schema.sql in Supabase Dashboard → SQL Editor."
    );
  }
  if (result.doctorAccountCount > 0 && result.doctorAccountsMissingDoctorProfile?.length > 0) {
    verdicts.push(
      `${result.doctorAccountsMissingDoctorProfile.length} doctor account(s) exist but have no doctor_profiles row. ` +
      "Visit /api/auth/backfill-doctor-profiles once (only works if serviceRoleKeyConfigured is true above)."
    );
  }
  if (result.doctorAccountCount === 0) {
    verdicts.push(
      "There are ZERO accounts with role='Dokter' in `profiles` on this database. " +
      "Either no one has signed up as a doctor on THIS Supabase project yet, or you're looking at a " +
      "different Supabase project than the one this doctor account was created on."
    );
  }
  if (verdicts.length === 0) {
    verdicts.push(
      "Database looks correct — doctors exist and are linked properly. If the app still shows an empty " +
      "list, you're likely viewing an old/cached deployment or a preview URL. Confirm the browser tab is " +
      "on the exact production domain and hard-refresh (Ctrl/Cmd+Shift+R)."
    );
  }
  result.verdict = verdicts;

  return NextResponse.json(result, { status: 200 });
}
