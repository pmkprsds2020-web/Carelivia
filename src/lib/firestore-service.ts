// ───────────────────────────────────────────────────────────────────────────
// firestore-service — DEPRECATED no-op stub
// ───────────────────────────────────────────────────────────────────────────
// CareLivia now uses Supabase as its sole backend. All CRUD operations that
// used to flow through this file are now handled by the Supabase service
// layer (see @/services/supabase).
//
// This file is kept only so legacy imports do not break. Every method is a
// no-op that resolves to empty results without logging warnings.
// ───────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/firebase';

// Re-export db for legacy code that imports it from here.
export { db };

type Unsubscribe = () => void;
const noop: Unsubscribe = () => {};

// ─── Patients ───────────────────────────────────────────────────────────────
export const patientsService = {
  getAll: async <T = unknown>(): Promise<(T & { id: string })[]> => [],
  getById: async <T = unknown>(_id: string): Promise<(T & { id: string }) | null> => null,
  add: async (_data: Record<string, unknown>): Promise<string> => '',
  update: async (_id: string, _data: Record<string, unknown>): Promise<void> => {},
  delete: async (_id: string): Promise<void> => {},
  subscribe: (_cb: (data: any[]) => void): Unsubscribe => noop,
};

// ─── Generic subcollection helpers (legacy) ─────────────────────────────────
export async function getSubcollection<T = unknown>(
  _patientId: string,
  _sub: string
): Promise<(T & { id: string })[]> {
  return [];
}

export async function addSubcollection(
  _patientId: string,
  _sub: string,
  _data: Record<string, unknown>
): Promise<string> {
  return '';
}

export async function updateSubcollection(
  _patientId: string,
  _sub: string,
  _id: string,
  _data: Record<string, unknown>
): Promise<void> {}

export async function deleteSubcollection(
  _patientId: string,
  _sub: string,
  _id: string
): Promise<void> {}

export function onCollectionSnapshot<T = unknown>(
  _path: string,
  _constraints: unknown[],
  _onData: (data: (T & { id: string })[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  return noop;
}

export const patientSubcollections: Record<string, string> = {};
