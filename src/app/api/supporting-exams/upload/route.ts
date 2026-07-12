// /api/supporting-exams/upload
// Server-side file upload for Pemeriksaan Penunjang (USG, EKG, Radiologi).
//
// WHY THIS EXISTS
// ───────────────
// The browser-side Supabase client uses the anon key and is subject to
// Row-Level Security (RLS) on the `storage.objects` table. By default, the
// `patient-files` bucket has RLS enabled but no INSERT policy for the anon
// role, so uploads fail with:
//
//   "new row violates row-level security policy"
//
// This route uses the service-role key (via getSupabaseAdmin()) which
// bypasses RLS entirely. The service-role key is NEVER exposed to the browser.
//
// FLOW
// ────
//   1. Receive multipart/form-data: file + metadata (JSON)
//   2. Validate file type (jpg/jpeg/png/webp/pdf) and size (≤ 20 MB)
//   3. Upload to `patient-files` Storage bucket via admin client
//   4. Get public URL (or signed URL if bucket is private)
//   5. INSERT metadata row into `patient_documents` via admin client
//   6. Return the full row as JSON
//
// If SUPABASE_SERVICE_ROLE_KEY is not set, returns 500 with a clear message.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Constants ───────────────────────────────────────────────────────────────

const BUCKET = 'patient-files';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function sanitizeFileName(name: string): string {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

function buildStoragePath(patientId: string, jenis: string, fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  return `${patientId}/${jenis}/${Date.now()}-${sanitized}`;
}

/**
 * Resolve an accessible URL for an uploaded object.
 *
 * Tries `createSignedUrl` first (10-year expiry — works for private buckets
 * via the service-role admin client which bypasses RLS), then falls back to
 * `getPublicUrl` (works for public buckets). Returns the first non-empty URL.
 */
async function resolveAccessibleUrl(adminClient: any, path: string): Promise<string> {
  // Try signed URL first (service-role bypasses RLS, so this always works).
  try {
    const { data: signed, error } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrl(path, 315360000); // 10 years
    if (!error && signed?.signedUrl) return signed.signedUrl;
  } catch {
    /* fall through */
  }
  // Fall back to public URL (works for public buckets).
  try {
    const { data } = adminClient.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? '';
  } catch {
    return '';
  }
}

// ── POST handler ────────────────────────────────────────────────────────────

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
          'SUPABASE_SERVICE_ROLE_KEY is not set. Uploads require the ' +
          'service-role key to bypass Storage RLS. Please set it in .env ' +
          'and restart the dev server. Alternatively, run the Storage RLS ' +
          'policies SQL from the worklog to allow anon uploads.',
        code: 'MISSING_SERVICE_ROLE_KEY',
      },
      { status: 500 }
    );
  }

  // ── 2. Parse multipart form data ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Invalid multipart form data: ' + (e?.message ?? String(e)) },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  const metadataRaw = formData.get('metadata');

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing "file" field in form data.' },
      { status: 400 }
    );
  }
  if (!metadataRaw || typeof metadataRaw !== 'string') {
    return NextResponse.json(
      { error: 'Missing "metadata" field in form data.' },
      { status: 400 }
    );
  }

  // ── 3. Validate file type & size ─────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is 20 MB. Received ${(file.size / 1024 / 1024).toFixed(2)} MB.` },
      { status: 413 }
    );
  }

  const fileType = file.type || '';
  const fileName = file.name || `upload-${Date.now()}`;
  const lowerName = fileName.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const typeOk = ALLOWED_TYPES.includes(fileType);
  if (!typeOk && !extOk) {
    return NextResponse.json(
      {
        error: `Unsupported file type "${fileType}". Allowed: jpg, jpeg, png, webp, pdf.`,
      },
      { status: 415 }
    );
  }

  // ── 4. Parse & validate metadata ─────────────────────────────────────────
  let meta: any;
  try {
    meta = JSON.parse(metadataRaw);
  } catch {
    return NextResponse.json(
      { error: 'metadata must be valid JSON.' },
      { status: 400 }
    );
  }

  const patientId = String(meta.patientId ?? '').trim();
  if (!isValidUuid(patientId)) {
    return NextResponse.json(
      { error: 'metadata.patientId must be a valid UUID.', received: patientId },
      { status: 400 }
    );
  }

  // jenis must be one of the allowed patient_documents values
  const allowedJenis = ['lab', 'radiologi', 'gambar', 'pdf', 'lainnya'];
  const jenis = String(meta.jenis ?? 'gambar').trim();
  if (!allowedJenis.includes(jenis)) {
    return NextResponse.json(
      { error: `metadata.jenis must be one of: ${allowedJenis.join(', ')}.` },
      { status: 400 }
    );
  }

  // ── 5. Upload to Storage (service role bypasses RLS) ─────────────────────
  const storagePath = buildStoragePath(patientId, jenis, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  let uploadError: any = null;
  try {
    const { error } = await admin
      .storage.from(BUCKET)
      .upload(storagePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileType || 'application/octet-stream',
      });
    uploadError = error;
  } catch (e: any) {
    uploadError = e;
  }

  if (uploadError) {
    console.error('[api/supporting-exams/upload] storage upload FAILED:', uploadError);
    return NextResponse.json(
      {
        error: 'Storage upload failed: ' + (uploadError.message ?? String(uploadError)),
        code: 'STORAGE_UPLOAD_FAILED',
      },
      { status: 500 }
    );
  }

  // ── 6. Resolve accessible URL (signed URL first, public URL fallback) ────
  const publicUrl = await resolveAccessibleUrl(admin, storagePath);

  // ── 7. Build keterangan JSON (structured metadata) ───────────────────────
  // The keterangan column carries type-specific fields so we can later
  // reconstruct USGResult / ECGResult / RadiologyResult objects.
  const keterangan = JSON.stringify({
    type: meta.type ?? 'gambar', // 'usg' | 'ekg' | 'radiology' | 'gambar'
    jenisUsg: meta.jenisUsg,
    jenisRadiologi: meta.jenisRadiologi,
    hasil: meta.hasil,
    interpretasi: meta.interpretasi,
    catatan: meta.catatan,
    doctorId: meta.doctorId,
    createdBy: meta.createdBy,
  });

  // ── 8. INSERT metadata row into patient_documents ────────────────────────
  const payload = {
    patient_id: patientId,
    jenis,
    nama_file: fileName,
    storage_path: storagePath,
    url: publicUrl || null,
    keterangan,
    tanggal: meta.tanggal ?? new Date().toISOString().slice(0, 10),
    uploaded_by: meta.createdBy ?? null,
  };

  let rowError: any = null;
  let row: any = null;
  try {
    const { data, error } = await admin
      .from('patient_documents')
      .insert(payload)
      .select()
      .single();
    rowError = error;
    row = data;
  } catch (e: any) {
    rowError = e;
  }

  if (rowError || !row) {
    // INSERT failed — clean up the orphaned file from Storage
    console.error(
      '[api/supporting-exams/upload] db insert FAILED, cleaning up orphan:',
      rowError
    );
    try {
      await admin.storage.from(BUCKET).remove([storagePath]);
    } catch (cleanupErr) {
      console.error('[api/supporting-exams/upload] orphan cleanup failed:', cleanupErr);
    }
    return NextResponse.json(
      {
        error: 'Database insert failed: ' + (rowError?.message ?? String(rowError)),
        code: 'DB_INSERT_FAILED',
      },
      { status: 500 }
    );
  }

  // ── 9. Return the full row ───────────────────────────────────────────────
  return NextResponse.json(
    {
      ok: true,
      row,
      url: publicUrl,
      storagePath,
    },
    { status: 200 }
  );
}
