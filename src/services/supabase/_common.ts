// ───────────────────────────────────────────────────────────────────────────
// Supabase service layer — common utilities
// ───────────────────────────────────────────────────────────────────────────
//
// Every Supabase call in this folder MUST go through `safeQuery` so the caller
// never has to handle a thrown error. If the table is missing, RLS denies
// access, or the network is down, we log a warning and return the fallback.
// This lets the app gracefully degrade to local Zustand data.
// ───────────────────────────────────────────────────────────────────────────

import { supabase } from '@/supabaseClient';

// ── UUID validation ─────────────────────────────────────────────────────────
//
// All foreign-key columns in the Supabase schema (patient_id, doctor_id, etc.)
// are `uuid` type. Sending a custom string like "pp-1783801594909-h4i6" or
// "doc-sarah" causes: `invalid input syntax for type uuid`.
//
// Use `isValidUuid()` to check before inserting, and `validUuidOrUndefined()`
// to optionally skip a non-UUID value (for nullable columns like doctor_id).
//
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true only for a real UUID v1-v5 string. */
export function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

/**
 * Returns the value if it's a valid UUID, otherwise `undefined`.
 * Use this for *nullable* UUID columns (e.g. `doctor_id`) so we silently
 * skip non-UUID values instead of triggering a syntax error.
 */
export function validUuidOrUndefined(id: unknown): string | undefined {
  return isValidUuid(id) ? (id as string) : undefined;
}

/**
 * Wrap any Supabase call so it never throws.
 *
 * Supabase query builders (`PostgrestFilterBuilder`, `PostgrestBuilder`,
 * `StorageBucket` operations) are `PromiseLike<{ data, error }>` — not
 * `Promise` — so we accept `PromiseLike` here. The builder is awaited, which
 * triggers its `.then()` and produces the `{ data, error }` payload.
 *
 * - If the promise resolves with `{ error }`, we log `[Supabase:label]` and
 *   return the fallback.
 * - If the promise rejects (network/JSON error), we log and return fallback.
 * - Otherwise we return `data ?? fallback`.
 */
export async function safeQuery<T>(
  promise: PromiseLike<{ data: T | null; error: any }>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.warn(`[Supabase:${label}]`, error.message);
      return fallback;
    }
    return (data ?? fallback) as T;
  } catch (e: any) {
    console.warn(`[Supabase:${label}] threw`, e?.message ?? e);
    return fallback;
  }
}

/**
 * Convert a single snake_case DB row into a camelCase TS object.
 * e.g. `{ patient_id: '...' }` → `{ patientId: '...' }`
 *
 * Note: this only handles casing. Field-name renames (e.g. `rm` ↔ `rmNumber`)
 * must be done by the caller before/after this call.
 */
export function snakeToCamelRow<T extends Record<string, any>>(row: any): T {
  if (!row) return row;
  const out: any = {};
  for (const k of Object.keys(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = row[k];
  }
  return out as T;
}

/**
 * Convert a single camelCase TS object into a snake_case DB row.
 * e.g. `{ patientId: '...' }` → `{ patient_id: '...' }`
 */
export function camelToSnakeRow(row: Record<string, any>): Record<string, any> {
  const out: any = {};
  for (const k of Object.keys(row)) {
    const snake = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    out[snake] = row[k];
  }
  return out;
}

/**
 * Drop keys whose value is `undefined` so we don't accidentally overwrite
 * DB columns with NULL on update.
 */
export function stripUndefined<T extends Record<string, any>>(row: T): Partial<T> {
  const out: any = {};
  for (const k of Object.keys(row)) {
    if (row[k] !== undefined) out[k] = row[k];
  }
  return out as Partial<T>;
}

/**
 * JSON-parse a value defensively. Returns the original input on failure.
 */
export function safeJsonParse<T>(raw: any, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Combine a date string (`YYYY-MM-DD`) and a time string (`HH:MM:SS`) into a
 * single ISO timestamp. Falls back to the current time if either is missing.
 */
export function combineDateAndTime(date?: string | null, time?: string | null): string {
  try {
    if (date && time) {
      const d = new Date(`${date}T${time}`);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch {
    /* fall through */
  }
  return new Date().toISOString();
}

/**
 * Split an ISO timestamp into `{ tanggal, jam }` for the DB.
 */
export function splitIsoToTanggalJam(iso?: string | null): { tanggal: string; jam: string } {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return {
      tanggal: now.toISOString().slice(0, 10),
      jam: now.toTimeString().slice(0, 8),
    };
  }
  return {
    tanggal: d.toISOString().slice(0, 10),
    jam: d.toTimeString().slice(0, 8),
  };
}

export { supabase };
