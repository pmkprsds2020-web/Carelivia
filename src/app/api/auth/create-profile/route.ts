import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

/**
 * POST /api/auth/create-profile
 * Called by the client immediately after supabase.auth.signUp() succeeds.
 * Uses the service-role admin client to upsert the profile row (bypasses RLS),
 * so the profile is created even if the user has not yet confirmed their email.
 *
 * Body: { userId, email, full_name, role, phone, profession }
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

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/create-profile] fatal:", msg);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
