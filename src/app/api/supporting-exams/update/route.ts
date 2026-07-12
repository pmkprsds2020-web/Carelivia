// /api/supporting-exams/update
// Server-side update for Pemeriksaan Penunjang (USG, EKG, Radiologi).
//
// WHY THIS EXISTS
// ───────────────
// Same RLS issue as /upload and /delete-file: the browser anon client may
// not have INSERT/UPDATE/DELETE permission on the `patient-files` Storage
// bucket. When a doctor EDITs an exam and uploads a new photo, we need to:
//
//   1. Upload the new file to Storage (admin client bypasses RLS)
//   2. Delete the OLD file from Storage (admin client)
//   3. UPDATE the metadata row in patient_documents (admin client)
//
// All three steps happen server-side so RLS never blocks us.
//
// FLOW
// ────
//   POST multipart/form-data { id, metadata, file?, oldStoragePath? }
//   → if file: upload new file → get new url + storagePath
//   → if file + oldStoragePath: delete old file from Storage (best-effort)
//   → UPDATE patient_documents row
//   → return { ok, row }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

async function resolveAccessibleUrl(adminClient: any, path: string): Promise<string> {
  // Try signed URL first (10-year expiry; service-role bypasses RLS).
  try {
    const { data: signed, error } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrl(path, 315360000);
    if (!error && signed?.signedUrl) return signed.signedUrl;
  } catch {
    /* fall through */
  }
  try {
    const { data } = adminClient.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? '';
  } catch {
    return '';
  }
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
          'SUPABASE_SERVICE_ROLE_KEY is not set. Updates with file upload ' +
          'require the service-role key to bypass Storage RLS.',
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

  const id = String(formData.get('id') ?? '').trim();
  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: 'id must be a valid UUID.', received: id },
      { status: 400 }
    );
  }

  const metadataRaw = formData.get('metadata');
  if (!metadataRaw || typeof metadataRaw !== 'string') {
    return NextResponse.json(
      { error: 'Missing "metadata" field in form data.' },
      { status: 400 }
    );
  }

  let meta: any;
  try {
    meta = JSON.parse(metadataRaw);
  } catch {
    return NextResponse.json(
      { error: 'metadata must be valid JSON.' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  const oldStoragePath = String(formData.get('oldStoragePath') ?? '').trim() || undefined;

  // ── 3. If new file provided, validate & upload ───────────────────────────
  let newUrl: string | undefined;
  let newStoragePath: string | undefined;
  let newFileName: string | undefined;

  if (file && file instanceof File) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 20 MB. Received ${(file.size / 1024 / 1024).toFixed(2)} MB.` },
        { status: 413 }
      );
    }
    // Validate type
    const fileType = file.type || '';
    const fileName = file.name || `upload-${Date.now()}`;
    const lowerName = fileName.toLowerCase();
    const extOk = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const typeOk = ALLOWED_TYPES.includes(fileType);
    if (!typeOk && !extOk) {
      return NextResponse.json(
        { error: `Unsupported file type "${fileType}". Allowed: jpg, jpeg, png, webp, pdf.` },
        { status: 415 }
      );
    }

    // Need patient_id for storage path — fetch from existing row
    let patientId: string | undefined;
    try {
      const { data: existing, error: fetchErr } = await admin
        .from('patient_documents')
        .select('patient_id, jenis, storage_path')
        .eq('id', id)
        .single();
      if (fetchErr || !existing) {
        return NextResponse.json(
          { error: 'Cannot update — row not found: ' + (fetchErr?.message ?? 'not found') },
          { status: 404 }
        );
      }
      patientId = existing.patient_id;
      // If oldStoragePath wasn't provided, use the one from the DB
      if (!oldStoragePath && existing.storage_path) {
        // we'll delete the old file below
      }
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Failed to fetch existing row: ' + (e?.message ?? String(e)) },
        { status: 500 }
      );
    }

    // Upload new file
    const jenis = String(meta.jenis ?? 'gambar');
    const storagePath = buildStoragePath(patientId!, jenis, fileName);
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
      console.error('[api/supporting-exams/update] storage upload FAILED:', uploadError);
      return NextResponse.json(
        {
          error: 'Storage upload failed: ' + (uploadError.message ?? String(uploadError)),
          code: 'STORAGE_UPLOAD_FAILED',
        },
        { status: 500 }
      );
    }

    newUrl = await resolveAccessibleUrl(admin, storagePath);
    newStoragePath = storagePath;
    newFileName = fileName;

    // Delete old file (best-effort)
    if (oldStoragePath) {
      try {
        await admin.storage.from(BUCKET).remove([oldStoragePath]);
      } catch (e: any) {
        console.warn(
          '[api/supporting-exams/update] old file cleanup failed (non-fatal):',
          e?.message ?? e
        );
      }
    }
  }

  // ── 4. Build UPDATE payload ──────────────────────────────────────────────
  const keterangan = JSON.stringify({
    type: meta.type ?? 'gambar',
    jenisUsg: meta.jenisUsg,
    jenisRadiologi: meta.jenisRadiologi,
    hasil: meta.hasil,
    interpretasi: meta.interpretasi,
    catatan: meta.catatan,
    doctorId: meta.doctorId,
    createdBy: meta.createdBy,
  });

  const updatePayload: Record<string, any> = {
    keterangan,
  };
  if (meta.tanggal) updatePayload.tanggal = meta.tanggal;
  if (meta.createdBy !== undefined) updatePayload.uploaded_by = meta.createdBy;
  if (newUrl !== undefined) updatePayload.url = newUrl;
  if (newStoragePath !== undefined) updatePayload.storage_path = newStoragePath;
  if (newFileName !== undefined) updatePayload.nama_file = newFileName;

  // ── 5. UPDATE row ────────────────────────────────────────────────────────
  let rowError: any = null;
  let row: any = null;
  try {
    const { data, error } = await admin
      .from('patient_documents')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    rowError = error;
    row = data;
  } catch (e: any) {
    rowError = e;
  }

  if (rowError || !row) {
    // UPDATE failed — if we uploaded a new file, clean it up
    if (newStoragePath) {
      try {
        await admin.storage.from(BUCKET).remove([newStoragePath]);
      } catch (cleanupErr) {
        console.error('[api/supporting-exams/update] orphan cleanup failed:', cleanupErr);
      }
    }
    console.error('[api/supporting-exams/update] db update FAILED:', rowError);
    return NextResponse.json(
      {
        error: 'Database update failed: ' + (rowError?.message ?? String(rowError)),
        code: 'DB_UPDATE_FAILED',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      row,
      url: newUrl,
      storagePath: newStoragePath,
    },
    { status: 200 }
  );
}
