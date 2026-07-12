import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/supabaseClient";

/**
 * POST /api/auth/audit
 * Inserts a row into auth_audit_log with server-derived IP + device + browser.
 * Called by the client after a successful LOGIN, LOGOUT, or SIGNUP.
 *
 * Body: { userId?, email?, role?, action: 'LOGIN'|'LOGOUT'|'SIGNUP'|'LOGIN_FAILED', details? }
 */
function getClientIp(req: NextRequest): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function parseUserAgent(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "unknown", browser: "unknown" };
  let browser = "Unknown";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|chromium|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/opr\//i.test(ua)) browser = "Opera";

  let device = "Desktop";
  if (/android/i.test(ua)) device = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) device = "iOS";
  else if (/mobile/i.test(ua)) device = "Mobile";

  return { device, browser };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { userId, email, role, action, details } = body ?? {};

    const validActions = ["LOGIN", "LOGOUT", "SIGNUP", "LOGIN_FAILED"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, warning: "SUPABASE_SERVICE_ROLE_KEY not set. Audit log skipped." },
        { status: 200 }
      );
    }

    const { device, browser } = parseUserAgent(req.headers.get("user-agent"));
    const ip = getClientIp(req);

    const { error } = await admin.from("auth_audit_log").insert({
      user_id: userId ?? null,
      email: email ?? null,
      role: role ?? null,
      action,
      ip_address: ip,
      device,
      browser,
      details: details ?? null,
    });

    if (error) {
      // auth_audit_log table may not exist yet. Degrade gracefully.
      console.warn("[auth/audit] insert failed:", error.message);
      return NextResponse.json(
        { ok: false, warning: "Audit log table unavailable.", detail: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/audit] fatal:", msg);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
