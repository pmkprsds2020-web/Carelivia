import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

/**
 * GET /api/auth/backfill-homecare-staff
 *
 * One-time fix-up mirroring /api/auth/backfill-doctor-profiles: any
 * `profiles` row with role='Perawat' or role='Caregiver' (both map to the
 * app's `homecare_staff` user role — see roleToUserRole in supabaseAuth.ts)
 * that has no matching `homecare_staff` row (because it signed up before
 * the fix in /api/auth/create-profile) was completely invisible to
 * homecareService's auto-assign query. That query reads `homecare_staff`,
 * not `profiles`, so a validated Home Care booking could never be assigned
 * to them — every booking sat at "Petugas: Belum ditugaskan" forever no
 * matter how many field staff had signed up.
 *
 * This route finds every such account and creates a `homecare_staff` row
 * for them with safe defaults (available, no active assignment). It is
 * idempotent — safe to call more than once — and never touches accounts
 * that already have a row.
 *
 * Visit this URL once in the browser (while deployed) to apply the fix:
 *   https://<your-app>.vercel.app/api/auth/backfill-homecare-staff
 */
export async function GET() {
  try {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY belum diisi di environment variables." },
        { status: 200 }
      );
    }

    const { data: staffProfiles, error: spErr } = await admin
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["Perawat", "Caregiver"]);

    if (spErr) {
      return NextResponse.json({ ok: false, error: `Gagal membaca profiles: ${spErr.message}` }, { status: 200 });
    }

    const allStaffIds = (staffProfiles ?? []).map((p) => p.id);
    if (allStaffIds.length === 0) {
      return NextResponse.json({ ok: true, message: "Tidak ada akun dengan role Perawat/Caregiver.", fixed: [] });
    }

    const { data: existing, error: existingErr } = await admin
      .from("homecare_staff")
      .select("id")
      .in("id", allStaffIds);

    if (existingErr) {
      return NextResponse.json({ ok: false, error: `Gagal membaca homecare_staff: ${existingErr.message}` }, { status: 200 });
    }

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const missing = (staffProfiles ?? []).filter((p) => !existingIds.has(p.id));

    if (missing.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Semua akun Perawat/Caregiver sudah memiliki homecare_staff. Tidak ada yang perlu diperbaiki.",
        fixed: [],
      });
    }

    const fixed: { id: string; name: string }[] = [];
    const failed: { id: string; name: string; error: string }[] = [];

    for (const p of missing) {
      const { error: insertErr } = await admin.from("homecare_staff").insert({
        id: p.id,
        certification: p.role,
        is_available: true,
        current_status: "available",
      });
      if (insertErr) {
        failed.push({ id: p.id, name: p.full_name, error: insertErr.message });
      } else {
        fixed.push({ id: p.id, name: p.full_name });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${fixed.length} akun petugas diperbaiki. Silakan refresh halaman Kelola Petugas.`,
      fixed,
      failed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
