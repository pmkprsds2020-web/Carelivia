// /api/supporting-exams/delete-file
// Server-side file deletion for Pemeriksaan Penunjang (USG, EKG, Radiologi).
//
// WHY THIS EXISTS
// ───────────────
// Same reason as /api/supporting-exams/upload: the browser anon client is
// subject to Storage RLS and may not have DELETE permission on the
// `patient-files` bucket. This route uses the service-role key (bypasses
// RLS) to:
//
//   1. Delete the file from Storage (best-effort — even if this fails, we
//      still delete the metadata row so it's not a phantom record).
//   2. Delete the metadata row from `patient_documents`.
//
// FLOW
// ────
//   POST { id, storagePath? }
//   → delete file from Storage (best-effort)
//   → delete row from patient_documents
//   → return { ok, row, storageDeleted }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'patient-files';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  // ── 1. Ensure admin client is available ──────────────────────────────────
  let admin: Awaited<ReturnType<typeof getSupabaseAdmin>>;
  try {
    admin = await getSupabaseAdmin();
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          'Server misconfiguration: getSupabaseAdmin() threw. ' +
          (e?.message ?? String(e)),
      },
      { status: 500 }
    );
  }
  if (!admin) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not set. File deletion requires the ' +
          'service-role key to bypass Storage RLS.',
        code: 'MISSING_SERVICE_ROLE_KEY',
      },
      { status: 500 }
    );
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: 'id must be a valid UUID.', received: id },
      { status: 400 }
    );
  }

  const storagePath: string | undefined =
    typeof body.storagePath === 'string' && body.storagePath.trim()
      ? body.storagePath.trim()
      : undefined;

  // ── 3. Fetch the row if storagePath not provided (so we can clean up) ────
  let resolvedStoragePath = storagePath;
  if (!resolvedStoragePath) {
    try {
      const { data, error } = await admin
        .from('patient_documents')
        .select('storage_path')
        .eq('id', id)
        .single();
      if (!error && data?.storage_path) {
        resolvedStoragePath = data.storage_path;
      }
    } catch (e) {
      /* ignore — best-effort */
    }
  }

  // ── 4. Delete file from Storage (best-effort) ───────────────────────────
  let storageDeleted = false;
  if (resolvedStoragePath) {
    try {
      const { error: storageErr } = await admin
        .storage.from(BUCKET)
        .remove([resolvedStoragePath]);
      if (!storageErr) {
        storageDeleted = true;
      } else {
        console.warn(
          '[api/supporting-exams/delete-file] storage remove failed (non-fatal):',
          storageErr.message
        );
      }
    } catch (e: any) {
      console.warn(
        '[api/supporting-exams/delete-file] storage remove threw (non-fatal):',
        e?.message ?? e
      );
    }
  }

  // ── 5. Delete metadata row ───────────────────────────────────────────────
  let rowError: any = null;
  let row: any = null;
  try {
    const { data, error } = await admin
      .from('patient_documents')
      .delete()
      .eq('id', id)
      .select()
      .single();
    rowError = error;
    row = data;
  } catch (e: any) {
    rowError = e;
  }

  if (rowError) {
    console.error('[api/supporting-exams/delete-file] db delete FAILED:', rowError);
    return NextResponse.json(
      {
        error: 'Database delete failed: ' + (rowError.message ?? String(rowError)),
        code: 'DB_DELETE_FAILED',
        storageDeleted,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      row,
      storageDeleted,
    },
    { status: 200 }
  );
}
