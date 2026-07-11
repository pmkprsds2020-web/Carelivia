// ───────────────────────────────────────────────────────────────────────────
// firestore-seed — DEPRECATED no-op stub
// ───────────────────────────────────────────────────────────────────────────
// CareLivia now uses Supabase as its sole backend. There is no demo data to
// seed — all data must come from the Supabase `patients` table.
//
// This file is kept only so legacy imports do not break. It performs no
// operations and logs no warnings.
// ───────────────────────────────────────────────────────────────────────────

export async function seedFirestore(): Promise<void> {
  // No-op — Supabase is the source of truth.
  return;
}
