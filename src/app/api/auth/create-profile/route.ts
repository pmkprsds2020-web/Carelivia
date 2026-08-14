import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

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
    const { userId, email, full_name, role, phone, profession } = body ?? {};

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

    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, warning: "SUPABASE_SERVICE_ROLE_KEY not set. Profile not persisted; using auth metadata only." },
        { status: 200 }
      );
    }

    const { error } = await admin.from("profiles").upsert(
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
      // `profiles` table may not exist yet on the live DB. Degrade gracefully.
      console.warn("[auth/create-profile] upsert failed:", error.message);
      return NextResponse.json(
        { ok: false, warning: "Profile table unavailable. Auth metadata still stored.", detail: error.message },
        { status: 200 }
      );
    }

    // ── Doctors also need a `doctor_profiles` row (see comment above) ──────
    let doctorProfileWarning: string | null = null;
    if (role === "Dokter") {
      const { error: dpError } = await admin.from("doctor_profiles").upsert(
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

    return NextResponse.json({ ok: true, doctorProfileWarning });
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
