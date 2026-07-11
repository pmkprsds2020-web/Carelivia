// ───────────────────────────────────────────────────────────────────────────
// FirestoreProvider — DEPRECATED passthrough stub
// ───────────────────────────────────────────────────────────────────────────
// CareLivia now uses Supabase as its sole backend. The real-time sync and
// initial data load are handled by `SupabaseSyncProvider` (see
// @/components/telemedicine/supabase-sync-provider).
//
// This component is kept only so existing imports in `page.tsx` and other
// legacy files do not break. It renders children unchanged and performs NO
// Firebase operations, NO demo-data seeding, and NO console logging.
// ───────────────────────────────────────────────────────────────────────────

'use client';

import { ReactNode } from 'react';

interface FirestoreProviderProps {
  children: ReactNode;
}

export function FirestoreProvider({ children }: FirestoreProviderProps) {
  // No-op: just render children. All data sync is handled by SupabaseSyncProvider.
  return <>{children}</>;
}
