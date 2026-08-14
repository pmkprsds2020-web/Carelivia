import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

/**
 * GET /api/auth/backfill-doctor-profiles
 *
 * One-time fix-up for accounts affected by the "Chat Dokter kosong / Chat
 * Pasien kosong" bug: any `profiles` row with role='Dokter' that has no
 * matching `doctor_profiles` row (because it signed up before the fix in
 * /api/auth/create-profile) is invisible to `doctorService.getAll()`, so it
 * never shows up in a patient's doctor list, and can therefore never have a
 * consultation created with it either.
 *
 * This route finds every such doctor and creates a `doctor_profiles` row
 * for them with safe defaults. It is idempotent — safe to call more than
 * once — and never touches doctors that already have a profile.
 *
 * Visit this URL once in the browser (while deployed) to apply the fix:
 *   https://<your-app>.vercel.app/api/auth/backfill-doctor-profiles
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

    const { data: doctorProfiles, error: dpErr } = await admin
      .from("profiles")
      .select("id, full_name, email, profession")
      .eq("role", "Dokter");

    if (dpErr) {
      return NextResponse.json({ ok: false, error: `Gagal membaca profiles: ${dpErr.message}` }, { status: 200 });
    }

    const allDoctorProfileIds = (doctorProfiles ?? []).map((d) => d.id);
    if (allDoctorProfileIds.length === 0) {
      return NextResponse.json({ ok: true, message: "Tidak ada akun dengan role Dokter.", fixed: [] });
    }

    const { data: existing, error: existingErr } = await admin
      .from("doctor_profiles")
      .select("id")
      .in("id", allDoctorProfileIds);

    if (existingErr) {
      return NextResponse.json({ ok: false, error: `Gagal membaca doctor_profiles: ${existingErr.message}` }, { status: 200 });
    }

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const missing = (doctorProfiles ?? []).filter((d) => !existingIds.has(d.id));

    if (missing.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Semua akun dokter sudah memiliki doctor_profiles. Tidak ada yang perlu diperbaiki.",
        fixed: [],
      });
    }

    const fixed: { id: string; name: string }[] = [];
    const failed: { id: string; name: string; error: string }[] = [];

    for (const d of missing) {
      const { error: insertErr } = await admin.from("doctor_profiles").insert({
        id: d.id,
        specialization: mapProfessionToSpecialization(d.profession),
        consultation_fee: 75000,
        rating: 0,
        review_count: 0,
        is_online: false,
        is_available: true,
      });
      if (insertErr) {
        failed.push({ id: d.id, name: d.full_name, error: insertErr.message });
      } else {
        fixed.push({ id: d.id, name: d.full_name });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${fixed.length} akun dokter diperbaiki. Silakan refresh halaman Chat Dokter / Chat Pasien.`,
      fixed,
      failed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

function mapProfessionToSpecialization(profession?: string | null): string {
  const p = (profession ?? "").toLowerCase();
  if (!p) return "umum";
  if (p.includes("anak")) return "anak";
  if (p.includes("dalam")) return "penyakit_dalam";
  if (p.includes("kebidanan") || p.includes("obgyn") || p.includes("kandungan")) return "kebidanan";
  if (p.includes("gigi")) return "gigi";
  return "umum";
}
