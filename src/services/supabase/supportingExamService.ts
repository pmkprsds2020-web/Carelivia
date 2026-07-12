// ───────────────────────────────────────────────────────────────────────────
// supportingExamService — CRUD for Pemeriksaan Penunjang
// (Laboratorium, USG, EKG, Radiologi)
// ───────────────────────────────────────────────────────────────────────────
//
// STORAGE STRATEGY
// ─────────────────────────
// DDL access is unavailable, so we reuse the existing `patient_documents`
// table for all four supporting examination types. The table already has a
// `jenis` CHECK constraint that allows 'lab', 'radiologi', 'gambar', 'pdf',
// 'lainnya' — perfect for our use case.
//
//   patient_documents(
//     id           uuid PK,
//     patient_id   uuid NOT NULL FK,
//     jenis        text NOT NULL CHECK in (lab, radiologi, gambar, pdf, lainnya),
//     nama_file    text NOT NULL,
//     storage_path text NOT NULL,
//     url          text,
//     keterangan   text,        -- we store a JSON string here for structured data
//     tanggal      date NOT NULL DEFAULT current_date,
//     uploaded_by  text,
//     created_at   timestamptz
//   )
//
// Mapping:
//   • Laboratorium  → jenis='lab',       keterangan=JSON{type, gdp, gds, hba1c, ...}
//   • USG           → jenis='gambar',    keterangan=JSON{type='usg', jenis_usg, hasil, catatan, doctor_id}
//                     + foto uploaded to Storage (foto_url stored in `url`)
//   • EKG           → jenis='gambar',    keterangan=JSON{type='ekg', interpretasi, catatan, doctor_id}
//                     + foto uploaded to Storage (foto_url stored in `url`)
//   • Radiologi     → jenis='radiologi', keterangan=JSON{type='radiology', jenis_radiologi, hasil, catatan, doctor_id}
//                     + foto uploaded to Storage (foto_url stored in `url`)
//
// Photos are uploaded to the `patient-files` Storage bucket (same as
// documentService) under path: {patientId}/{jenis}/{timestamp}-{filename}
//
// The DDL for future dedicated tables (laboratory_results, ultrasound_results,
// ecg_results, radiology_results, supporting_examinations) is documented in
// supabase/schema.sql for when DDL access becomes available.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined } from './_common';

// ── Types ───────────────────────────────────────────────────────────────────

export type ExamType = 'laboratorium' | 'usg' | 'ekg' | 'radiologi';

export interface LabResult {
  id: string;
  patientId: string;
  doctorId?: string;
  tanggal: string;
  gdp?: number; // Glukosa Darah Puasa (mg/dL)
  gds?: number; // Glukosa Darah Sewaktu (mg/dL)
  hba1c?: number; // HbA1c (%)
  ureum?: number; // mg/dL
  kreatinin?: number; // mg/dL
  kolesterolTotal?: number; // mg/dL
  hdl?: number; // mg/dL
  ldl?: number; // mg/dL
  trigliserida?: number; // mg/dL
  mikroalbumin?: number; // mg/dL
  catatan?: string;
  createdBy?: string;
  createdAt: string;
}

export interface USGResult {
  id: string;
  patientId: string;
  doctorId?: string;
  tanggal: string;
  jenisUsg?: string;
  hasil?: string;
  fotoUrl?: string;
  catatan?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ECGResult {
  id: string;
  patientId: string;
  doctorId?: string;
  tanggal: string;
  fotoUrl?: string;
  interpretasi?: string;
  catatan?: string;
  createdBy?: string;
  createdAt: string;
}

export interface RadiologyResult {
  id: string;
  patientId: string;
  doctorId?: string;
  tanggal: string;
  jenisRadiologi?: string;
  fotoUrl?: string;
  hasil?: string;
  catatan?: string;
  createdBy?: string;
  createdAt: string;
}

export interface SupportingExamUnion {
  type: ExamType;
  data: LabResult | USGResult | ECGResult | RadiologyResult;
}

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface LabInput {
  patientId: string;
  doctorId?: string;
  tanggal?: string;
  gdp?: number;
  gds?: number;
  hba1c?: number;
  ureum?: number;
  kreatinin?: number;
  kolesterolTotal?: number;
  hdl?: number;
  ldl?: number;
  trigliserida?: number;
  mikroalbumin?: number;
  catatan?: string;
  createdBy?: string;
}

export interface USGInput {
  patientId: string;
  doctorId?: string;
  tanggal?: string;
  jenisUsg?: string;
  hasil?: string;
  catatan?: string;
  createdBy?: string;
  foto?: File | Blob;
}

export interface ECGInput {
  patientId: string;
  doctorId?: string;
  tanggal?: string;
  interpretasi?: string;
  catatan?: string;
  createdBy?: string;
  foto?: File | Blob;
}

export interface RadiologyInput {
  patientId: string;
  doctorId?: string;
  tanggal?: string;
  jenisRadiologi?: string;
  hasil?: string;
  catatan?: string;
  createdBy?: string;
  foto?: File | Blob;
}

// ── Constants ───────────────────────────────────────────────────────────────

const BUCKET = 'patient-files';

export const JENIS_RADIOLOGI_OPTIONS = [
  'Foto Thorax',
  'CT Scan',
  'MRI',
  'Bone Survey',
  'USG',
  'Mammografi',
  'Lainnya',
] as const;

export const JENIS_USG_OPTIONS = [
  'USG Abdomen',
  'USG Pelvis',
  'USG Obstetri',
  'USG Thyroid',
  'USG Dada',
  'USG Vaskular',
  'USG Urologi',
  'Lainnya',
] as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildStoragePath(patientId: string, jenis: string, fileName: string): string {
  const sanitized = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${patientId}/${jenis}/${Date.now()}-${sanitized}`;
}

function safeParseKeterangan(raw: any): Record<string, any> {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw as Record<string, any>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, any>;
    } catch {
      return {};
    }
  }
  return {};
}

// ── Row → typed object mappers ──────────────────────────────────────────────

function fromDbLab(row: any): LabResult {
  const k = safeParseKeterangan(row.keterangan);
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: k.doctorId ?? validUuidOrUndefined(row.uploaded_by),
    tanggal: row.tanggal ?? todayStr(),
    gdp: k.gdp != null ? Number(k.gdp) : undefined,
    gds: k.gds != null ? Number(k.gds) : undefined,
    hba1c: k.hba1c != null ? Number(k.hba1c) : undefined,
    ureum: k.ureum != null ? Number(k.ureum) : undefined,
    kreatinin: k.kreatinin != null ? Number(k.kreatinin) : undefined,
    kolesterolTotal: k.kolesterolTotal != null ? Number(k.kolesterolTotal) : undefined,
    hdl: k.hdl != null ? Number(k.hdl) : undefined,
    ldl: k.ldl != null ? Number(k.ldl) : undefined,
    trigliserida: k.trigliserida != null ? Number(k.trigliserida) : undefined,
    mikroalbumin: k.mikroalbumin != null ? Number(k.mikroalbumin) : undefined,
    catatan: k.catatan ?? undefined,
    createdBy: k.createdBy ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function fromDbUsg(row: any): USGResult {
  const k = safeParseKeterangan(row.keterangan);
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: k.doctorId ?? validUuidOrUndefined(row.uploaded_by),
    tanggal: row.tanggal ?? todayStr(),
    jenisUsg: k.jenisUsg ?? undefined,
    hasil: k.hasil ?? undefined,
    fotoUrl: row.url ?? undefined,
    catatan: k.catatan ?? undefined,
    createdBy: k.createdBy ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function fromDbEcg(row: any): ECGResult {
  const k = safeParseKeterangan(row.keterangan);
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: k.doctorId ?? validUuidOrUndefined(row.uploaded_by),
    tanggal: row.tanggal ?? todayStr(),
    fotoUrl: row.url ?? undefined,
    interpretasi: k.interpretasi ?? undefined,
    catatan: k.catatan ?? undefined,
    createdBy: k.createdBy ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function fromDbRadiology(row: any): RadiologyResult {
  const k = safeParseKeterangan(row.keterangan);
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: k.doctorId ?? validUuidOrUndefined(row.uploaded_by),
    tanggal: row.tanggal ?? todayStr(),
    jenisRadiologi: k.jenisRadiologi ?? undefined,
    fotoUrl: row.url ?? undefined,
    hasil: k.hasil ?? undefined,
    catatan: k.catatan ?? undefined,
    createdBy: k.createdBy ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// ── Storage helpers (dual-path: client-side primary + server API fallback) ───
//
// DUAL-PATH UPLOAD STRATEGY
// ─────────────────────────
// Path A (PRIMARY): Client-side upload via the browser anon client
//   (`supabase.storage.from(BUCKET).upload()`). Works when the `patient-files`
//   Storage bucket has RLS policies allowing the anon role to
//   INSERT/SELECT/UPDATE/DELETE. This is the recommended "safer alternative"
//   that does NOT require SUPABASE_SERVICE_ROLE_KEY.
//
// Path B (FALLBACK): Server-side upload via POST /api/supporting-exams/upload.
//   Uses getSupabaseAdmin() (service-role key) to bypass RLS entirely. Only
//   works if SUPABASE_SERVICE_ROLE_KEY is set in .env.
//
// If BOTH paths fail (RLS blocks Path A AND service-role key missing for Path
// B), we throw an Error with `code='STORAGE_RLS_BLOCKED'` and attach
// `setupSql` — the SQL the user must run in Supabase Dashboard → SQL Editor
// to enable client-side uploads (Path A).
//
// Routes (Path B):
//   POST /api/supporting-exams/upload       — upload file + INSERT row
//   POST /api/supporting-exams/update       — optional new file + UPDATE row
//   POST /api/supporting-exams/delete-file  — delete file + DELETE row
//

export type UploadProgressCb = (phase: 'uploading' | 'inserting' | 'done' | 'error', pct: number, msg?: string) => void;

// ── RLS / bucket-missing detection ──────────────────────────────────────────

const RLS_ERROR_PATTERNS = [
  'row-level security',
  'violates row-level security',
  'new row violates row-level security policy',
  'permission denied for table',
  'permission denied for',
];

function isRlsError(err: any): boolean {
  const msg = String(err?.message || err?.error || err || '').toLowerCase();
  return RLS_ERROR_PATTERNS.some((p) => msg.includes(p));
}

function isBucketMissingError(err: any): boolean {
  const msg = String(err?.message || err?.error || err || '').toLowerCase();
  return (
    msg.includes('bucket not found') ||
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    err?.statusCode === 404
  );
}

/**
 * The SQL the user must run ONCE in Supabase Dashboard → SQL Editor to enable
 * client-side uploads to the `patient-files` bucket (Path A). After running
 * this, no service-role key is needed for uploads — the browser anon client
 * can read/write/delete objects directly (subject to these permissive policies).
 *
 * Exported so the UI can surface it in a setup dialog when an upload fails.
 */
export const STORAGE_SETUP_SQL = `-- ─────────────────────────────────────────────────────────────────────────
-- Enable client-side uploads to the "patient-files" Storage bucket.
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run.
--
-- This (1) creates the bucket as PUBLIC so getPublicUrl() works for reads,
-- and (2) adds RLS policies allowing the anon role (used by the browser
-- Supabase client) to read/write/update/delete objects in the bucket.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Create the bucket as PUBLIC (idempotent).
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', true)
on conflict (id) do update set public = true;

-- 2. Allow anyone (anon + authenticated) to READ objects.
drop policy if exists "patient_files_read" on storage.objects;
create policy "patient_files_read"
  on storage.objects for select
  using (bucket_id = 'patient-files');

-- 3. Allow anyone to INSERT (upload) objects.
drop policy if exists "patient_files_insert" on storage.objects;
create policy "patient_files_insert"
  on storage.objects for insert
  with check (bucket_id = 'patient-files');

-- 4. Allow anyone to UPDATE objects.
drop policy if exists "patient_files_update" on storage.objects;
create policy "patient_files_update"
  on storage.objects for update
  using (bucket_id = 'patient-files');

-- 5. Allow anyone to DELETE objects.
drop policy if exists "patient_files_delete" on storage.objects;
create policy "patient_files_delete"
  on storage.objects for delete
  using (bucket_id = 'patient-files');
`;

/**
 * Path A: Upload a file to Storage using the browser anon client.
 * Returns `{ storagePath, publicUrl }`. Throws on any error; the caller
 * decides whether to fall back to the server API route (Path B).
 *
 * URL RESOLUTION STRATEGY
 * ───────────────────────
 * After a successful upload we need an accessible URL to store in the DB and
 * show in <img> tags. We try, in order:
 *   1. `createSignedUrl(path, 10 years)` — works for PRIVATE buckets that
 *      have a SELECT policy for the anon role. The signed URL carries a token
 *      query param and is effectively permanent (10-year expiry).
 *   2. `getPublicUrl(path)` — works for PUBLIC buckets (no token needed).
 *
 * This dual approach means images display correctly whether the bucket is
 * public or private-with-SELECT-policy. The setup SQL (STORAGE_SETUP_SQL)
 * makes the bucket public AND adds the SELECT policy, so both paths work
 * after it's run; before it's run, signed URLs cover the private case.
 */
async function uploadPhotoClient(
  file: File | Blob,
  patientId: string,
  jenis: string,
  onProgress?: UploadProgressCb
): Promise<{ storagePath: string; publicUrl: string }> {
  const fileName = (file as File).name ?? `upload-${Date.now()}`;
  onProgress?.('uploading', 20, `Mengunggah ${fileName}...`);
  const storagePath = buildStoragePath(patientId, jenis, fileName);

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: (file as File).type || 'application/octet-stream',
    });
  if (upErr) throw upErr;

  onProgress?.('inserting', 70, 'Menyimpan metadata...');

  // ── Resolve an accessible URL ──
  // Try a long-lived signed URL first (works for private buckets with a
  // SELECT policy). 10 years = 315360000 seconds.
  let accessibleUrl = '';
  try {
    const { data: signed, error: signedErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 315360000);
    if (!signedErr && signed?.signedUrl) {
      accessibleUrl = signed.signedUrl;
    }
  } catch {
    /* fall through to getPublicUrl */
  }

  // Fall back to the public URL (works for public buckets).
  if (!accessibleUrl) {
    try {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      accessibleUrl = data?.publicUrl ?? '';
    } catch {
      /* leave empty — caller stores null */
    }
  }

  return { storagePath, publicUrl: accessibleUrl };
}

/**
 * Dual-path upload: try client-side first (Path A); on RLS / missing-bucket
 * error, fall back to the server-side API route (Path B, needs service-role
 * key).
 *
 * Returns:
 *   - `{ storagePath, publicUrl, rowAlreadyInserted: false }` if Path A
 *     succeeded → caller must still INSERT the metadata row.
 *   - `{ storagePath, publicUrl, rowAlreadyInserted: true, row }` if Path B
 *     succeeded → the API route already uploaded + inserted the row.
 *
 * Throws Error with `code='STORAGE_RLS_BLOCKED'` and `setupSql` if BOTH paths
 * fail (RLS blocks Path A AND service-role key missing for Path B).
 */
async function uploadPhotoDualPath(
  file: File | Blob,
  patientId: string,
  jenis: string,
  apiMetadata: Record<string, any>,
  onProgress?: UploadProgressCb
): Promise<{
  storagePath: string;
  publicUrl: string;
  rowAlreadyInserted: boolean;
  row?: any;
}> {
  // ── Path A: client-side upload ──
  try {
    const r = await uploadPhotoClient(file, patientId, jenis, onProgress);
    return { storagePath: r.storagePath, publicUrl: r.publicUrl, rowAlreadyInserted: false };
  } catch (clientErr: any) {
    // Only fall back to the server API for RLS / missing-bucket errors.
    // Other errors (network, validation, auth) should propagate directly.
    if (!isRlsError(clientErr) && !isBucketMissingError(clientErr)) {
      onProgress?.('error', 0, clientErr?.message ?? 'Upload gagal');
      throw clientErr;
    }
    console.warn(
      '[supportingExamService] client-side upload blocked (RLS/bucket). ' +
        'Falling back to server API route (requires SUPABASE_SERVICE_ROLE_KEY)...',
      clientErr?.message
    );
  }

  // ── Path B: server-side API route (service-role key) ──
  try {
    const row = await callUploadApi(file, apiMetadata, onProgress);
    return {
      storagePath: row?.storage_path ?? '',
      publicUrl: row?.url ?? '',
      rowAlreadyInserted: true,
      row,
    };
  } catch (apiErr: any) {
    if (apiErr?.code === 'MISSING_SERVICE_ROLE_KEY') {
      // Both paths failed — surface a clear, actionable error.
      const e = new Error(
        'Upload diblokir oleh kebijakan Storage RLS. Dua opsi perbaikan: ' +
          '(1) Jalankan SQL setup pada Supabase Dashboard → SQL Editor (paling aman), atau ' +
          '(2) Set SUPABASE_SERVICE_ROLE_KEY di file .env lalu restart server.'
      );
      (e as any).code = 'STORAGE_RLS_BLOCKED';
      (e as any).setupSql = STORAGE_SETUP_SQL;
      onProgress?.('error', 0, e.message);
      throw e;
    }
    onProgress?.('error', 0, apiErr?.message ?? 'Upload gagal');
    throw apiErr;
  }
}

/**
 * Call the /api/supporting-exams/upload route.
 * Uploads a file to Storage AND inserts a metadata row in one atomic call.
 * Returns the inserted DB row (raw snake_case) or throws on failure.
 */
async function callUploadApi(
  file: File | Blob,
  metadata: Record<string, any>,
  onProgress?: UploadProgressCb
): Promise<any> {
  const fileName = (file as File).name ?? `upload-${Date.now()}`;
  onProgress?.('uploading', 10, `Mengunggah ${fileName}...`);

  const fd = new FormData();
  // Coerce to File if it's a Blob (some callers pass Blob without name)
  if (!(file instanceof File) && file instanceof Blob) {
    fd.append('file', file, fileName);
  } else {
    fd.append('file', file as File);
  }
  fd.append('metadata', JSON.stringify(metadata));

  onProgress?.('uploading', 30);
  let res: Response;
  try {
    res = await fetch('/api/supporting-exams/upload', {
      method: 'POST',
      body: fd,
    });
  } catch (e: any) {
    onProgress?.('error', 0, e?.message ?? 'Network error');
    throw new Error('Upload gagal (network): ' + (e?.message ?? String(e)));
  }
  onProgress?.('uploading', 80);

  let body: any;
  try {
    body = await res.json();
  } catch {
    body = { error: 'Invalid JSON response from server' };
  }

  if (!res.ok || !body?.ok) {
    const msg = body?.error || `HTTP ${res.status}`;
    onProgress?.('error', 0, msg);
    // Surface a clear error so the UI can toast it
    const err = new Error(msg);
    (err as any).code = body?.code;
    (err as any).status = res.status;
    throw err;
  }

  onProgress?.('done', 100);
  return body.row;
}

/**
 * Call the /api/supporting-exams/update route.
 * Optionally uploads a new file (and deletes the old one), then UPDATEs the row.
 */
async function callUpdateApi(
  id: string,
  metadata: Record<string, any>,
  file?: File | Blob | null,
  oldStoragePath?: string,
  onProgress?: UploadProgressCb
): Promise<any> {
  const fd = new FormData();
  fd.append('id', id);
  fd.append('metadata', JSON.stringify(metadata));
  if (oldStoragePath) fd.append('oldStoragePath', oldStoragePath);
  if (file) {
    const fileName = (file as File).name ?? `upload-${Date.now()}`;
    onProgress?.('uploading', 20, `Mengunggah ${fileName}...`);
    if (!(file instanceof File) && file instanceof Blob) {
      fd.append('file', file, fileName);
    } else {
      fd.append('file', file as File);
    }
  } else {
    onProgress?.('inserting', 50, 'Menyimpan perubahan...');
  }

  let res: Response;
  try {
    res = await fetch('/api/supporting-exams/update', {
      method: 'POST',
      body: fd,
    });
  } catch (e: any) {
    onProgress?.('error', 0, e?.message ?? 'Network error');
    throw new Error('Update gagal (network): ' + (e?.message ?? String(e)));
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    body = { error: 'Invalid JSON response from server' };
  }

  if (!res.ok || !body?.ok) {
    const msg = body?.error || `HTTP ${res.status}`;
    onProgress?.('error', 0, msg);
    const err = new Error(msg);
    (err as any).code = body?.code;
    (err as any).status = res.status;
    throw err;
  }

  onProgress?.('done', 100);
  return body.row;
}

/**
 * Call the /api/supporting-exams/delete-file route.
 * Deletes the file from Storage AND the metadata row.
 */
async function callDeleteApi(id: string, storagePath?: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch('/api/supporting-exams/delete-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, storagePath }),
    });
  } catch (e: any) {
    console.error('[supportingExamService.callDeleteApi] network error:', e);
    return false;
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok || !body?.ok) {
    console.error('[supportingExamService.callDeleteApi] failed:', body?.error ?? res.status);
    return false;
  }
  return true;
}

// ── Shared photo-exam helpers (used by USG / EKG / Radiologi) ────────────────
//
// These encapsulate the dual-path upload + metadata-insert flow so each
// exam type's create/update/delete method stays a thin delegate.

interface PhotoExamCreateArgs {
  patientId: string;
  tanggal?: string;
  createdBy?: string;
  doctorId?: string;
  foto?: File | Blob;
  /** DB `jenis` value: 'gambar' for USG/EKG, 'radiologi' for Radiologi. */
  jenis: 'gambar' | 'radiologi';
  /** `keterangan.type` discriminator: 'usg' | 'ekg' | 'radiology'. */
  type: 'usg' | 'ekg' | 'radiology';
  /** Type-specific fields merged into `keterangan` (e.g. { jenisUsg, hasil, catatan }). */
  typeSpecificKeterangan: Record<string, any>;
  /** File-name prefix (e.g. 'usg', 'ekg', 'radiologi'). */
  namaFilePrefix: string;
  /** Row → typed object mapper. */
  fromDb: (row: any) => any;
  onProgress?: UploadProgressCb;
}

/**
 * Create a photo exam (USG / EKG / Radiologi) with dual-path upload.
 *
 * Flow:
 *   1. If `foto` provided:
 *      a. uploadPhotoDualPath → Path A (client) or Path B (server API).
 *      b. If Path A: INSERT metadata row; on INSERT failure, delete orphan file.
 *      c. If Path B: row already inserted by the API → just map & return.
 *   2. If no `foto`: INSERT metadata row with `url: null`.
 */
async function createPhotoExam(args: PhotoExamCreateArgs): Promise<any | null> {
  const {
    patientId,
    foto,
    jenis,
    type,
    typeSpecificKeterangan,
    fromDb,
    namaFilePrefix,
    onProgress,
    tanggal,
    createdBy,
    doctorId,
  } = args;

  if (!isValidUuid(patientId)) {
    console.error(
      `[supportingExamService.create${type}] ABORTED — patient_id is not a valid UUID.`,
      { received: patientId }
    );
    return null;
  }

  const tgl = tanggal ?? todayStr();
  const doctorIdUuid = validUuidOrUndefined(doctorId);

  if (foto) {
    const apiMetadata = {
      patientId,
      jenis,
      type,
      doctorId: doctorIdUuid,
      createdBy,
      tanggal: tgl,
      ...typeSpecificKeterangan,
    };

    let result: { storagePath: string; publicUrl: string; rowAlreadyInserted: boolean; row?: any };
    try {
      result = await uploadPhotoDualPath(foto, patientId, jenis, apiMetadata, onProgress);
    } catch (e: any) {
      console.error(`[supportingExamService.create${type}] upload failed:`, e);
      throw e;
    }

    // Path B already inserted the row.
    if (result.rowAlreadyInserted) {
      onProgress?.('done', 100);
      return result.row ? fromDb(result.row) : null;
    }

    // Path A — INSERT metadata now (upload already succeeded).
    const keterangan = JSON.stringify({
      type,
      doctorId: doctorIdUuid,
      createdBy,
      ...typeSpecificKeterangan,
    });
    const payload = {
      patient_id: patientId,
      jenis,
      nama_file: `${namaFilePrefix}-${tgl}`,
      storage_path: result.storagePath,
      url: result.publicUrl || null,
      keterangan,
      tanggal: tgl,
      uploaded_by: createdBy,
    };
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').insert(payload).select().single(),
      `supportingExamService.create${type}`
    );
    if (error) {
      // INSERT failed — clean up the orphaned file (best-effort, client-side).
      console.error(`[supportingExamService.create${type}] INSERT failed, cleaning orphan:`, error);
      try {
        await supabase.storage.from(BUCKET).remove([result.storagePath]);
      } catch (cleanupErr) {
        console.warn(`[supportingExamService.create${type}] orphan cleanup failed:`, cleanupErr);
      }
      throw new Error(error);
    }
    onProgress?.('done', 100);
    return row ? fromDb(row) : null;
  }

  // No photo — insert metadata only.
  const keterangan = JSON.stringify({
    type,
    doctorId: doctorIdUuid,
    createdBy,
    ...typeSpecificKeterangan,
  });
  const payload = {
    patient_id: patientId,
    jenis,
    nama_file: `${namaFilePrefix}-${tgl}`,
    storage_path: `${type}/${patientId}/${Date.now()}`,
    url: null,
    keterangan,
    tanggal: tgl,
    uploaded_by: createdBy,
  };
  const { data: row, error } = await safeInsert<any>(
    supabase.from('patient_documents').insert(payload).select().single(),
    `supportingExamService.create${type}`
  );
  if (error) throw new Error(error);
  return row ? fromDb(row) : null;
}

interface PhotoExamUpdateArgs {
  id: string;
  patientId?: string;
  tanggal?: string;
  createdBy?: string;
  doctorId?: string;
  foto?: File | Blob;
  jenis: 'gambar' | 'radiologi';
  type: 'usg' | 'ekg' | 'radiology';
  typeSpecificKeterangan: Record<string, any>;
  fromDb: (row: any) => any;
  onProgress?: UploadProgressCb;
}

/**
 * Update a photo exam with dual-path upload.
 *
 * Flow:
 *   1. If a new `foto` is provided:
 *      a. Fetch existing `storage_path` (for old-file cleanup).
 *      b. Path A (client upload): upload new file → UPDATE row → delete old file.
 *         On UPDATE failure, delete the new (orphan) file.
 *      c. Path B (server API): callUpdateApi does upload+update+old-delete atomically.
 *   2. If no new `foto`: UPDATE metadata only.
 */
async function updatePhotoExam(args: PhotoExamUpdateArgs): Promise<any | null> {
  const { id, patientId, tanggal, createdBy, doctorId, foto, jenis, type, typeSpecificKeterangan, fromDb, onProgress } = args;
  if (!isValidUuid(id)) return null;
  const doctorIdUuid = validUuidOrUndefined(doctorId);

  if (foto) {
    if (!patientId) {
      throw new Error('patientId diperlukan untuk upload foto baru.');
    }

    // Fetch existing storage_path for old-file cleanup.
    let oldStoragePath: string | undefined;
    try {
      const existing = await safeQuery(
        supabase.from('patient_documents').select('storage_path').eq('id', id).single(),
        null as any,
        `supportingExamService.update${type}.fetch`
      );
      oldStoragePath = (existing as any)?.storage_path;
    } catch {
      /* non-fatal — old file cleanup is best-effort */
    }

    // ── Path A: client-side upload ──
    let pathAOk = false;
    let newStoragePath = '';
    let newPublicUrl = '';
    try {
      const r = await uploadPhotoClient(foto, patientId, jenis, onProgress);
      newStoragePath = r.storagePath;
      newPublicUrl = r.publicUrl;
      pathAOk = true;
    } catch (clientErr: any) {
      if (!isRlsError(clientErr) && !isBucketMissingError(clientErr)) {
        onProgress?.('error', 0, clientErr?.message ?? 'Upload gagal');
        throw clientErr;
      }
      console.warn(
        `[supportingExamService.update${type}] client upload blocked (RLS/bucket), trying server API...`,
        clientErr?.message
      );
    }

    if (pathAOk) {
      const keterangan = JSON.stringify({ type, doctorId: doctorIdUuid, createdBy, ...typeSpecificKeterangan });
      const payload = stripUndefined({
        keterangan,
        storage_path: newStoragePath,
        url: newPublicUrl || null,
        tanggal,
        uploaded_by: createdBy,
      });
      const { data: row, error } = await safeInsert<any>(
        supabase.from('patient_documents').update(payload).eq('id', id).select().single(),
        `supportingExamService.update${type}`
      );
      if (error) {
        // UPDATE failed — clean up the new orphan file.
        console.error(`[supportingExamService.update${type}] UPDATE failed, cleaning orphan:`, error);
        try {
          await supabase.storage.from(BUCKET).remove([newStoragePath]);
        } catch (cleanupErr) {
          console.warn(`[supportingExamService.update${type}] orphan cleanup failed:`, cleanupErr);
        }
        throw new Error(error);
      }
      // UPDATE succeeded — delete the OLD file (best-effort).
      if (oldStoragePath) {
        try {
          await supabase.storage.from(BUCKET).remove([oldStoragePath]);
        } catch (oldCleanupErr) {
          console.warn(`[supportingExamService.update${type}] old-file cleanup failed:`, oldCleanupErr);
        }
      }
      onProgress?.('done', 100);
      return row ? fromDb(row) : null;
    }

    // ── Path B: server-side API route (service-role key) ──
    const apiMetadata = {
      patientId,
      jenis,
      type,
      doctorId: doctorIdUuid,
      createdBy,
      tanggal,
      ...typeSpecificKeterangan,
    };
    try {
      const row = await callUpdateApi(id, apiMetadata, foto, oldStoragePath, onProgress);
      return row ? fromDb(row) : null;
    } catch (apiErr: any) {
      if (apiErr?.code === 'MISSING_SERVICE_ROLE_KEY') {
        const e = new Error(
          'Upload diblokir oleh kebijakan Storage RLS. Dua opsi perbaikan: ' +
            '(1) Jalankan SQL setup pada Supabase Dashboard → SQL Editor (paling aman), atau ' +
            '(2) Set SUPABASE_SERVICE_ROLE_KEY di file .env lalu restart server.'
        );
        (e as any).code = 'STORAGE_RLS_BLOCKED';
        (e as any).setupSql = STORAGE_SETUP_SQL;
        onProgress?.('error', 0, e.message);
        throw e;
      }
      onProgress?.('error', 0, apiErr?.message ?? 'Upload gagal');
      throw apiErr;
    }
  }

  // No new photo — update metadata only.
  const keterangan = JSON.stringify({ type, doctorId: doctorIdUuid, createdBy, ...typeSpecificKeterangan });
  const payload = stripUndefined({
    keterangan,
    tanggal,
    uploaded_by: createdBy,
  });
  const { data: row, error } = await safeInsert<any>(
    supabase.from('patient_documents').update(payload).eq('id', id).select().single(),
    `supportingExamService.update${type}`
  );
  if (error) throw new Error(error);
  return row ? fromDb(row) : null;
}

/**
 * Delete a photo exam: client-side file delete + row delete, with server API
 * fallback for file cleanup when RLS blocks anon DELETE.
 */
async function deletePhotoExam(id: string, type: 'usg' | 'ekg' | 'radiology'): Promise<boolean> {
  if (!isValidUuid(id)) return false;

  // Fetch storage_path for file cleanup.
  let storagePath: string | undefined;
  try {
    const existing = await safeQuery(
      supabase.from('patient_documents').select('storage_path').eq('id', id).single(),
      null as any,
      `supportingExamService.delete${type}.fetch`
    );
    storagePath = (existing as any)?.storage_path;
  } catch {
    /* non-fatal */
  }

  // Path A: client-side file delete (best-effort).
  let fileDeletedViaClient = false;
  let rlsBlockedFile = false;
  if (storagePath) {
    try {
      const { error: delErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
      if (!delErr) {
        fileDeletedViaClient = true;
      } else if (isRlsError(delErr) || isBucketMissingError(delErr)) {
        rlsBlockedFile = true;
      } else {
        console.warn(`[supportingExamService.delete${type}] file delete failed:`, delErr.message);
      }
    } catch (e: any) {
      if (isRlsError(e) || isBucketMissingError(e)) {
        rlsBlockedFile = true;
      } else {
        console.warn(`[supportingExamService.delete${type}] file delete threw:`, e?.message);
      }
    }
  }

  // Delete the row (client-side). NOTE: we check `error` directly instead of
  // using safeQuery, because a successful DELETE without `.select()` returns
  // `data: null` (which safeQuery would treat as failure via its fallback).
  let rowDeleted = false;
  try {
    const { error: rowDelErr } = await supabase
      .from('patient_documents')
      .delete()
      .eq('id', id);
    if (!rowDelErr) {
      rowDeleted = true;
    } else {
      console.warn(`[supportingExamService.delete${type}] row delete failed:`, rowDelErr.message);
    }
  } catch (e: any) {
    console.warn(`[supportingExamService.delete${type}] row delete threw:`, e?.message);
  }

  if (rowDeleted) {
    // Row deleted. If file delete was RLS-blocked, try server cleanup of the
    // orphan file (the server route's row delete will be a no-op since the row
    // is already gone — only the file gets removed).
    if (rlsBlockedFile && storagePath) {
      callDeleteApi(id, storagePath).catch(() => {});
    }
    return true;
  }

  // Row delete failed — try the server API (file + row, atomic).
  if (storagePath) {
    const ok = await callDeleteApi(id, storagePath);
    if (ok) return true;
  }
  return false;
}

// ── Service ─────────────────────────────────────────────────────────────────

export const supportingExamService = {
  // ── LABORATORIUM ────────────────────────────────────────────────────────

  async listLab(patientId: string): Promise<LabResult[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('jenis', 'lab')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false }),
      [] as any[],
      'supportingExamService.listLab'
    );
    return (rows as any[]).map(fromDbLab);
  },

  async createLab(input: LabInput): Promise<LabResult | null> {
    if (!isValidUuid(input.patientId)) {
      console.error('[supportingExamService.createLab] ABORTED — patient_id is not a valid UUID.', { received: input.patientId });
      return null;
    }
    const keterangan = JSON.stringify({
      type: 'laboratorium',
      gdp: input.gdp,
      gds: input.gds,
      hba1c: input.hba1c,
      ureum: input.ureum,
      kreatinin: input.kreatinin,
      kolesterolTotal: input.kolesterolTotal,
      hdl: input.hdl,
      ldl: input.ldl,
      trigliserida: input.trigliserida,
      mikroalbumin: input.mikroalbumin,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = {
      patient_id: input.patientId,
      jenis: 'lab' as const,
      nama_file: `lab-${input.tanggal ?? todayStr()}`,
      storage_path: `lab/${input.patientId}/${Date.now()}`,
      keterangan,
      tanggal: input.tanggal ?? todayStr(),
      uploaded_by: input.createdBy,
    };
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').insert(payload).select().single(),
      'supportingExamService.createLab'
    );
    if (error) throw new Error(error);
    const created = row ? fromDbLab(row) : null;

    // ── Auto-trigger Clinical Alert generation for abnormal lab values ──
    // Per user spec: "Jika ditemukan HbA1c ≥ 9%, GDP ≥ 250, GDS ≥ 300,
    // LDL ≥ 190, Kreatinin meningkat, Mikroalbumin positif — maka otomatis
    // membuat Clinical Alert". We delegate to the Rule Engine which dedupes
    // and persists via clinicalAlertService. Fire-and-forget — never blocks
    // the lab save.
    if (created) {
      try {
        // Lazy-import to avoid circular dependency at module load time.
        const { evaluateAndPersist } = await import('./clinicalAlertEngine');
        evaluateAndPersist({
          patientId: input.patientId,
          doctorId: input.doctorId,
          vitals: [],
          screenings: [],
          medications: [],
          nutrition: [],
          dailyComplaints: [],
          socialAssessments: [],
          labResults: [created],
        }).catch((e) =>
          console.error('[supportingExamService.createLab] alert engine error:', e)
        );
      } catch (e) {
        console.error('[supportingExamService.createLab] failed to trigger alert engine:', e);
      }
    }

    return created;
  },

  async updateLab(id: string, input: Partial<LabInput>): Promise<LabResult | null> {
    if (!isValidUuid(id)) return null;
    const keterangan = JSON.stringify({
      type: 'laboratorium',
      gdp: input.gdp,
      gds: input.gds,
      hba1c: input.hba1c,
      ureum: input.ureum,
      kreatinin: input.kreatinin,
      kolesterolTotal: input.kolesterolTotal,
      hdl: input.hdl,
      ldl: input.ldl,
      trigliserida: input.trigliserida,
      mikroalbumin: input.mikroalbumin,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = stripUndefined({
      keterangan,
      tanggal: input.tanggal,
      uploaded_by: input.createdBy,
    });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').update(payload).eq('id', id).select().single(),
      'supportingExamService.updateLab'
    );
    if (error) throw new Error(error);
    return row ? fromDbLab(row) : null;
  },

  async deleteLab(id: string): Promise<boolean> {
    if (!isValidUuid(id)) return false;
    // Labs have no actual file — just delete the row. We check `error` directly
    // because a successful DELETE without `.select()` returns `data: null`.
    try {
      const { error } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', id)
        .eq('jenis', 'lab');
      if (!error) return true;
      console.warn('[supportingExamService.deleteLab] failed:', error.message);
    } catch (e: any) {
      console.warn('[supportingExamService.deleteLab] threw:', e?.message);
    }
    return false;
  },

  // ── USG ─────────────────────────────────────────────────────────────────

  async listUsg(patientId: string): Promise<USGResult[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('jenis', 'gambar')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false }),
      [] as any[],
      'supportingExamService.listUsg'
    );
    // Filter to only USG rows (jenis='gambar' is shared with EKG; we
    // distinguish by the `type` field inside keterangan JSON).
    return (rows as any[])
      .filter((r) => {
        const k = safeParseKeterangan(r.keterangan);
        return k.type === 'usg';
      })
      .map(fromDbUsg);
  },

  async createUsg(input: USGInput, onProgress?: UploadProgressCb): Promise<USGResult | null> {
    return createPhotoExam({
      patientId: input.patientId,
      tanggal: input.tanggal,
      createdBy: input.createdBy,
      doctorId: input.doctorId,
      foto: input.foto,
      jenis: 'gambar',
      type: 'usg',
      namaFilePrefix: 'usg',
      fromDb: fromDbUsg,
      typeSpecificKeterangan: {
        jenisUsg: input.jenisUsg,
        hasil: input.hasil,
        catatan: input.catatan,
      },
      onProgress,
    }) as Promise<USGResult | null>;
  },

  async updateUsg(id: string, input: Partial<USGInput>, onProgress?: UploadProgressCb): Promise<USGResult | null> {
    return updatePhotoExam({
      id,
      patientId: input.patientId,
      tanggal: input.tanggal,
      createdBy: input.createdBy,
      doctorId: input.doctorId,
      foto: input.foto,
      jenis: 'gambar',
      type: 'usg',
      fromDb: fromDbUsg,
      typeSpecificKeterangan: {
        jenisUsg: input.jenisUsg,
        hasil: input.hasil,
        catatan: input.catatan,
      },
      onProgress,
    }) as Promise<USGResult | null>;
  },

  async deleteUsg(id: string): Promise<boolean> {
    return deletePhotoExam(id, 'usg');
  },

  // ── EKG ─────────────────────────────────────────────────────────────────

  async listEcg(patientId: string): Promise<ECGResult[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('jenis', 'gambar')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false }),
      [] as any[],
      'supportingExamService.listEcg'
    );
    return (rows as any[])
      .filter((r) => {
        const k = safeParseKeterangan(r.keterangan);
        return k.type === 'ekg';
      })
      .map(fromDbEcg);
  },

  async createEcg(input: ECGInput, onProgress?: UploadProgressCb): Promise<ECGResult | null> {
    return createPhotoExam({
      patientId: input.patientId,
      tanggal: input.tanggal,
      createdBy: input.createdBy,
      doctorId: input.doctorId,
      foto: input.foto,
      jenis: 'gambar',
      type: 'ekg',
      namaFilePrefix: 'ekg',
      fromDb: fromDbEcg,
      typeSpecificKeterangan: {
        interpretasi: input.interpretasi,
        catatan: input.catatan,
      },
      onProgress,
    }) as Promise<ECGResult | null>;
  },

  async updateEcg(id: string, input: Partial<ECGInput>, onProgress?: UploadProgressCb): Promise<ECGResult | null> {
    return updatePhotoExam({
      id,
      patientId: input.patientId,
      tanggal: input.tanggal,
      createdBy: input.createdBy,
      doctorId: input.doctorId,
      foto: input.foto,
      jenis: 'gambar',
      type: 'ekg',
      fromDb: fromDbEcg,
      typeSpecificKeterangan: {
        interpretasi: input.interpretasi,
        catatan: input.catatan,
      },
      onProgress,
    }) as Promise<ECGResult | null>;
  },

  async deleteEcg(id: string): Promise<boolean> {
    return deletePhotoExam(id, 'ekg');
  },

  // ── RADIOLOGI ───────────────────────────────────────────────────────────

  async listRadiology(patientId: string): Promise<RadiologyResult[]> {
    if (!isValidUuid(patientId)) return [];
    const rows = await safeQuery(
      supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('jenis', 'radiologi')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false }),
      [] as any[],
      'supportingExamService.listRadiology'
    );
    return (rows as any[]).map(fromDbRadiology);
  },

  async createRadiology(input: RadiologyInput, onProgress?: UploadProgressCb): Promise<RadiologyResult | null> {
    return createPhotoExam({
      patientId: input.patientId,
      tanggal: input.tanggal,
      createdBy: input.createdBy,
      doctorId: input.doctorId,
      foto: input.foto,
      jenis: 'radiologi',
      type: 'radiology',
      namaFilePrefix: 'radiologi',
      fromDb: fromDbRadiology,
      typeSpecificKeterangan: {
        jenisRadiologi: input.jenisRadiologi,
        hasil: input.hasil,
        catatan: input.catatan,
      },
      onProgress,
    }) as Promise<RadiologyResult | null>;
  },

  async updateRadiology(id: string, input: Partial<RadiologyInput>, onProgress?: UploadProgressCb): Promise<RadiologyResult | null> {
    return updatePhotoExam({
      id,
      patientId: input.patientId,
      tanggal: input.tanggal,
      createdBy: input.createdBy,
      doctorId: input.doctorId,
      foto: input.foto,
      jenis: 'radiologi',
      type: 'radiology',
      fromDb: fromDbRadiology,
      typeSpecificKeterangan: {
        jenisRadiologi: input.jenisRadiologi,
        hasil: input.hasil,
        catatan: input.catatan,
      },
      onProgress,
    }) as Promise<RadiologyResult | null>;
  },

  async deleteRadiology(id: string): Promise<boolean> {
    return deletePhotoExam(id, 'radiology');
  },

  // ── TIMELINE: all exams for a patient, merged & sorted by date ──────────

  async listAll(patientId: string): Promise<SupportingExamUnion[]> {
    if (!isValidUuid(patientId)) return [];
    const [lab, usg, ecg, rad] = await Promise.all([
      this.listLab(patientId),
      this.listUsg(patientId),
      this.listEcg(patientId),
      this.listRadiology(patientId),
    ]);
    const all: SupportingExamUnion[] = [
      ...lab.map((data) => ({ type: 'laboratorium' as const, data })),
      ...usg.map((data) => ({ type: 'usg' as const, data })),
      ...ecg.map((data) => ({ type: 'ekg' as const, data })),
      ...rad.map((data) => ({ type: 'radiologi' as const, data })),
    ];
    all.sort((a, b) => {
      const ta = new Date((a.data as any).tanggal ?? (a.data as any).createdAt).getTime();
      const tb = new Date((b.data as any).tanggal ?? (b.data as any).createdAt).getTime();
      return tb - ta;
    });
    return all;
  },

  /**
   * Returns the latest exam of each type for dashboard ringkas.
   */
  async getLatestExams(patientId: string): Promise<{
    latestLab?: LabResult;
    latestUsg?: USGResult;
    latestEcg?: ECGResult;
    latestRadiology?: RadiologyResult;
  }> {
    if (!isValidUuid(patientId)) return {};
    const [lab, usg, ecg, rad] = await Promise.all([
      this.listLab(patientId),
      this.listUsg(patientId),
      this.listEcg(patientId),
      this.listRadiology(patientId),
    ]);
    return {
      latestLab: lab[0],
      latestUsg: usg[0],
      latestEcg: ecg[0],
      latestRadiology: rad[0],
    };
  },
};
