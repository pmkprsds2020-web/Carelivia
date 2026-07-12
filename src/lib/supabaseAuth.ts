// ───────────────────────────────────────────────────────────────────────────
//  Supabase Auth Helpers — CareLivia
//  Client-side wrappers around supabase.auth that also:
//   • create a `profiles` row after signUp (via /api/auth/create-profile)
//   • write an auth_audit_log entry on LOGIN / LOGOUT / SIGNUP (via /api/auth/audit)
//   • translate Supabase error codes into friendly Indonesian messages
// ───────────────────────────────────────────────────────────────────────────

import { supabase } from "@/supabaseClient";

export type CareLiviaRole = "Admin" | "Dokter" | "Perawat" | "Caregiver" | "Pasien";

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  role: CareLiviaRole;
  phone?: string;
  profession?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;       // friendly Indonesian message
  needsEmailConfirm?: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: CareLiviaRole;
    phone?: string;
    profession?: string;
  } | null;
}

// ── Map Supabase error messages to friendly Indonesian ─────────────────────
// `status` is the HTTP status code Supabase returns on Auth errors (e.g. 429).
// `code` is the Supabase error code (e.g. "over_email_send_rate_limit").
function translateError(
  message: string,
  status?: number,
  code?: string
): { text: string; needsConfirm?: boolean } {
  const m = (message || "").toLowerCase();
  const c = (code || "").toLowerCase();

  // ── Rate-limit / 429 (MUST be checked first — Supabase returns 429 with
  //    codes like "over_email_send_rate_limit" and "over_request_rate_limit",
  //    neither of which contains the literal substring "rate limit".) ──
  if (status === 429) {
    return { text: "Terlalu banyak percobaan. Silakan tunggu beberapa menit sebelum mencoba lagi." };
  }
  if (
    c.includes("rate_limit") ||
    c.includes("over_email_send_rate_limit") ||
    c.includes("over_request_rate_limit") ||
    m.includes("rate limit") ||
    m.includes("rate_limit") ||
    m.includes("too many requests") ||
    m.includes("over_email_send_rate_limit") ||
    m.includes("over_request_rate_limit") ||
    m.includes("for security purposes") ||
    /after \d+ seconds/i.test(message || "")
  ) {
    return { text: "Terlalu banyak percobaan. Silakan tunggu beberapa menit sebelum mencoba lagi." };
  }

  if (m.includes("invalid login credentials")) {
    return { text: "Email atau password salah." };
  }
  if (m.includes("email not confirmed")) {
    return { text: "Silakan verifikasi email terlebih dahulu.", needsConfirm: true };
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return { text: "Email sudah terdaftar. Silakan masuk." };
  }
  if (m.includes("password should be at least")) {
    return { text: "Password minimal 8 karakter." };
  }
  if (m.includes("unable to validate email address") || m.includes("invalid email")) {
    return { text: "Format email tidak valid." };
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return { text: "Gagal terhubung ke server. Periksa koneksi internet." };
  }
  return { text: message || "Terjadi kesalahan. Silakan coba lagi." };
}

// ── Audit log helper (fire-and-forget) ─────────────────────────────────────
function logAudit(
  action: "LOGIN" | "LOGOUT" | "SIGNUP" | "LOGIN_FAILED",
  payload: { userId?: string; email?: string; role?: string; details?: string } = {}
) {
  fetch("/api/auth/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  }).catch(() => {
    /* swallow — audit is best-effort */
  });
}

// ── Profile creation helper (best-effort) ──────────────────────────────────
async function createProfileRow(input: {
  userId: string;
  email: string;
  fullName: string;
  role: CareLiviaRole;
  phone?: string;
  profession?: string;
}): Promise<void> {
  try {
    await fetch("/api/auth/create-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: input.userId,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        phone: input.phone,
        profession: input.profession,
      }),
    });
  } catch {
    /* swallow — profile is best-effort */
  }
}

// ── SIGN UP ────────────────────────────────────────────────────────────────
let __signupCallCount = 0;
export async function signUpWithEmail(input: SignUpInput): Promise<AuthResult> {
  __signupCallCount += 1;
  const callId = __signupCallCount;
  const t0 = Date.now();
  console.info("[auth] signUpWithEmail CALLED", {
    callId,
    email: input.email,
    role: input.role,
    ts: new Date().toISOString(),
  });
  try {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          role: input.role,
          phone: input.phone ?? "",
          profession: input.profession ?? "",
        },
      },
    });
    console.info("[auth] signUpWithEmail RESULT", {
      callId,
      ok: !error,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      errorStatus: error?.status,
      errorCode: error?.code,
      errorMessage: error?.message,
      ms: Date.now() - t0,
    });

    if (error) {
      const t = translateError(error.message, error.status, error.code);
      return { ok: false, error: t.text, needsEmailConfirm: t.needsConfirm };
    }

    const user = data.user;
    if (!user) {
      return { ok: false, error: "Registrasi gagal. Silakan coba lagi." };
    }

    // Best-effort: create profile row server-side (bypasses RLS via admin key).
    await createProfileRow({
      userId: user.id,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      phone: input.phone,
      profession: input.profession,
    });

    logAudit("SIGNUP", {
      userId: user.id,
      email: input.email,
      role: input.role,
      details: `Sign up sebagai ${input.role}`,
    });

    return {
      ok: true,
      needsEmailConfirm: !data.session, // no session → email confirmation required
      user: {
        id: user.id,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        phone: input.phone,
        profession: input.profession,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth] signUpWithEmail THREW", { callId, msg });
    return { ok: false, error: translateError(msg).text };
  }
}

// ── SIGN IN ────────────────────────────────────────────────────────────────
let __signinCallCount = 0;
export async function signInWithEmail(input: SignInInput): Promise<AuthResult> {
  __signinCallCount += 1;
  const callId = __signinCallCount;
  const t0 = Date.now();
  console.info("[auth] signInWithEmail CALLED", {
    callId,
    email: input.email,
    ts: new Date().toISOString(),
  });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    console.info("[auth] signInWithEmail RESULT", {
      callId,
      ok: !error,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      errorStatus: error?.status,
      errorCode: error?.code,
      errorMessage: error?.message,
      ms: Date.now() - t0,
    });

    if (error) {
      const t = translateError(error.message, error.status, error.code);
      if (!t.needsConfirm) {
        logAudit("LOGIN_FAILED", { email: input.email, details: error.message });
      }
      return { ok: false, error: t.text, needsEmailConfirm: t.needsConfirm };
    }

    const user = data.user;
    if (!user) {
      return { ok: false, error: "Login gagal. Silakan coba lagi." };
    }

    // Extract role + name from user_metadata (set at signUp) as the primary source.
    const meta = user.user_metadata ?? {};
    const role = (meta.role as CareLiviaRole) || "Pasien";
    const fullName = (meta.full_name as string) || user.email?.split("@")[0] || "Pengguna";

    logAudit("LOGIN", {
      userId: user.id,
      email: user.email ?? input.email,
      role,
      details: `Login sebagai ${role}`,
    });

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? input.email,
        fullName,
        role,
        phone: meta.phone ?? undefined,
        profession: meta.profession ?? undefined,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth] signInWithEmail THREW", { callId, msg });
    return { ok: false, error: translateError(msg).text };
  }
}

// ── SIGN OUT ───────────────────────────────────────────────────────────────
export async function signOutFromSupabase(): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    const meta = user?.user_metadata ?? {};
    if (user) {
      logAudit("LOGOUT", {
        userId: user.id,
        email: user.email ?? undefined,
        role: meta.role ?? undefined,
        details: "Logout",
      });
    }
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut();
}

// ── Get current session + user (for restore on page load) ──────────────────
export async function getCurrentAuthUser(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { ok: false };
    }
    const user = data.user;
    const meta = user.user_metadata ?? {};
    const role = (meta.role as CareLiviaRole) || "Pasien";
    const fullName = (meta.full_name as string) || user.email?.split("@")[0] || "Pengguna";
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? "",
        fullName,
        role,
        phone: meta.phone ?? undefined,
        profession: meta.profession ?? undefined,
      },
    };
  } catch {
    return { ok: false };
  }
}

// ── Subscribe to auth state changes ────────────────────────────────────────
export function onAuthChange(
  callback: (event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED", user: AuthResult["user"]) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    if (!user) {
      if (event === "SIGNED_OUT") callback("SIGNED_OUT", null);
      return;
    }
    const meta = user.user_metadata ?? {};
    const role = (meta.role as CareLiviaRole) || "Pasien";
    const fullName = (meta.full_name as string) || user.email?.split("@")[0] || "Pengguna";
    const mapped: NonNullable<AuthResult["user"]> = {
      id: user.id,
      email: user.email ?? "",
      fullName,
      role,
      phone: meta.phone ?? undefined,
      profession: meta.profession ?? undefined,
    };
    if (event === "SIGNED_IN") callback("SIGNED_IN", mapped);
    else if (event === "TOKEN_REFRESHED") callback("TOKEN_REFRESHED", mapped);
    else if (event === "USER_UPDATED") callback("USER_UPDATED", mapped);
  });
  return () => data.subscription.unsubscribe();
}

// ── Role → ActivePanel mapping (single-route app: no URL redirect) ─────────
export function roleToActivePanel(role: CareLiviaRole): "admin" | "doctor-panel" | "homecare-staff-panel" | "home" {
  switch (role) {
    case "Admin":
      return "admin";
    case "Dokter":
      return "doctor-panel";
    case "Perawat":
    case "Caregiver":
      return "homecare-staff-panel";
    case "Pasien":
    default:
      return "home";
  }
}

// ── CareLivia role → app UserRole ──────────────────────────────────────────
export function roleToUserRole(role: CareLiviaRole): "patient" | "doctor" | "pharmacist" | "homecare_staff" | "admin" {
  switch (role) {
    case "Admin":
      return "admin";
    case "Dokter":
      return "doctor";
    case "Perawat":
    case "Caregiver":
      return "homecare_staff";
    case "Pasien":
    default:
      return "patient";
  }
}
