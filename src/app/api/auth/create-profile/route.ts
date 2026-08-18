import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, SUPABASE_URL_EXPORT as SUPABASE_URL, SUPABASE_ANON_KEY_EXPORT as SUPABASE_PUBLIC_KEY } from "@/supabaseClient";

/**
 * POST /api/auth/create-profile
 * Called by the client immediately after supabase.auth.signUp() succeeds.
 * Uses the service-role admin client to upsert the profile row (bypasses RLS),
 * so the profile is created even if the user has not yet confirmed their email.
 *
 * Body: { userId, email, full_name, role, phone, profession }
 *
 * BUG FIX (Chat Dokter / Chat Pasien kosong): this route used to ONLY write
 * to `profiles`. The doctor list shown to patients (and therefore every
 * consultation a doctor sees in "Chat Pasien") is read from `doctor_profiles`
 * — see `doctorService.getAll()`. A doctor who signed up would get a
 * `profiles` row but never a `doctor_profiles` row, so:
 *   - Patient's "Chat Dokter" → doctors list empty → "Tidak ada dokter ditemukan"
 *   - Doctor's "Chat Pasien" → no consultation could ever be created with
 *     them in the first place → "Belum ada konsultasi"
 * Fixed by also upserting `doctor_profiles` whenever role === "Dokter",
 * mirroring exactly what `seedService.ts` already does for demo doctors.
 * Existing accounts created before this fix are backfilled by
 * POST /api/auth/backfill-doctor-profiles.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { userId, email, full_name, role, phone, profession, accessToken } = body ?? {};

    if (!userId || !email || !full_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: userId, email, full_name, role" },
        { status: 400 }
      );
    }

    const allowedRoles = ["Admin", "Dokter", "Perawat", "Caregiver", "Pasien"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${allowedRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Pick the best available client for this request ────────────────────
    // 1) service-role admin client — bypasses RLS entirely (preferred).
    // 2) a request-scoped client authenticated as the calling user (via the
    //    access_token their own browser session already has). This makes
    //    profile creation work correctly even when SUPABASE_SERVICE_ROLE_KEY
    //    was never configured in Vercel — the `profiles_insert_own` RLS
    //    policy (`to authenticated with check (id = auth.uid())`) allows a
    //    user to insert their OWN row, which is exactly what's happening here.
    const admin = await getSupabaseAdmin();
    let client: SupabaseClient | null = admin;
    let usedAuthedFallback = false;
    if (!client && accessToken) {
      client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      usedAuthedFallback = true;
    }

    if (!client) {
      return NextResponse.json(
        {
          ok: false,
          warning:
            "SUPABASE_SERVICE_ROLE_KEY not set and no access token provided. Profile not persisted; using auth metadata only.",
        },
        { status: 200 }
      );
    }

    const { error } = await client.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name,
        role,
        phone: phone ?? null,
        profession: profession ?? null,
        status: "Active",
      },
      { onConflict: "id" }
    );

    if (error) {
      // `profiles` table may not exist yet on the live DB, or (in the
      // authed-fallback path) RLS rejected the write for some other reason.
      console.warn("[auth/create-profile] upsert failed:", error.message, { usedAuthedFallback });
      return NextResponse.json(
        { ok: false, warning: "Profile write failed.", detail: error.message, usedAuthedFallback },
        { status: 200 }
      );
    }

    // ── Doctors also need a `doctor_profiles` row (see comment above) ──────
    let doctorProfileWarning: string | null = null;
    if (role === "Dokter") {
      const { error: dpError } = await client.from("doctor_profiles").upsert(
        {
          id: userId,
          specialization: mapProfessionToSpecialization(profession),
          consultation_fee: 75000,
          rating: 0,
          review_count: 0,
          is_online: false,
          is_available: true,
        },
        { onConflict: "id" }
      );
      if (dpError) {
        console.warn("[auth/create-profile] doctor_profiles upsert failed:", dpError.message);
        doctorProfileWarning = dpError.message;
      }
    }

    // ── Home Care field staff also need a `homecare_staff` row ─────────────
    // Without this, a "Perawat"/"Caregiver" signup only ever got a `profiles`
    // row: they could log in and see the staff panel, but were completely
    // invisible to homecareService's auto-assign query (which reads
    // `homecare_staff`, not `profiles`) — so validated Home Care bookings
    // could never be assigned to them, and admin's "Kelola Petugas" always
    // showed "Petugas: Belum ditugaskan" no matter how many staff signed up.
    let homecareStaffWarning: string | null = null;
    if (role === "Perawat" || role === "Caregiver") {
      const { error: hsError } = await client.from("homecare_staff").upsert(
        {
          id: userId,
          certification: role === "Perawat" ? "Perawat" : "Caregiver",
          is_available: true,
          current_status: "available",
        },
        { onConflict: "id" }
      );
      if (hsError) {
        console.warn("[auth/create-profile] homecare_staff upsert failed:", hsError.message);
        homecareStaffWarning = hsError.message;
      }
    }

    return NextResponse.json({ ok: true, doctorProfileWarning, homecareStaffWarning, usedAuthedFallback });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/create-profile] fatal:", msg);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}

// Free-text "profession" input (e.g. "Dokter Umum", "Spesialis Anak") →
// the closest specialization key the app's filter tabs / patient search
// understand. Falls back to 'umum' so the doctor is never simply hidden.
function mapProfessionToSpecialization(profession?: string): string {
  const p = (profession ?? "").toLowerCase();
  if (!p) return "umum";
  if (p.includes("anak")) return "anak";
  if (p.includes("dalam")) return "penyakit_dalam";
  if (p.includes("kebidanan") || p.includes("obgyn") || p.includes("kandungan")) return "kebidanan";
  if (p.includes("gigi")) return "gigi";
  return "umum";
}
