import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

/**
 * GET /api/auth/migrate
 * Checks whether the `profiles` and `auth_audit_log` tables exist on the live
 * Supabase DB. supabase-js cannot run DDL, so this route only reports status.
 *
 * To create the tables, run the SQL in `supabase/schema.sql` (sections 20 & 21)
 * in the Supabase Dashboard → SQL Editor.
 */
export async function GET() {
  try {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        ok: false,
        warning: "SUPABASE_SERVICE_ROLE_KEY not set. Cannot verify tables.",
        profiles: "unknown",
        auth_audit_log: "unknown",
      });
    }

    const [profilesRes, auditRes] = await Promise.all([
      admin.from("profiles").select("id").limit(1).maybeSingle(),
      admin.from("auth_audit_log").select("id").limit(1).maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      profiles: profilesRes.error ? "missing" : "exists",
      auth_audit_log: auditRes.error ? "missing" : "exists",
      profiles_error: profilesRes.error?.message ?? null,
      auth_audit_log_error: auditRes.error?.message ?? null,
      note: "If any table is 'missing', run supabase/schema.sql sections 20 & 21 in the Supabase SQL Editor. Auth still works via user_metadata even if tables are missing.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
