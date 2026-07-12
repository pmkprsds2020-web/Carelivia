import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

/**
 * GET /api/auth/profile?userId=<uuid>
 * Fetches the profile row for a given auth user id. Used by the auth hook to
 * determine the user's role after session restore (more reliable than
 * user_metadata which can be stale).
 *
 * Falls back to auth.users user_metadata if the profiles table is missing.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { profile: null, warning: "SUPABASE_SERVICE_ROLE_KEY not set. Use user_metadata instead." },
        { status: 200 }
      );
    }

    const { data, error } = await admin
      .from("profiles")
      .select("id, email, full_name, role, phone, profession, status, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[auth/profile] query failed:", error.message);
      return NextResponse.json(
        { error: "Profile table unavailable", detail: error.message },
        { status: 200 }
      );
    }

    if (!data) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({ profile: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/profile] fatal:", msg);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
