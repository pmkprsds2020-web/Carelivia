// ───────────────────────────────────────────────────────────────────────────
// documentService — Supabase CRUD for `patient_documents` + Storage buckets
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, stripUndefined } from './_common';

/**
 * A patient document (Pemeriksaan Penunjang) — stored metadata in
 * `patient_documents` and the actual file in the `patient-files` Storage bucket.
 */
export interface PatientDocument {
  id: string;
  patientId: string;
  jenis: 'lab' | 'radiologi' | 'gambar' | 'pdf' | 'lainnya';
  fileName: string;
  storagePath: string;
  url?: string;
  keterangan?: string;
  tanggal: string;
  uploadedBy?: string;
  createdAt: string;
}

function fromDb(row: any): PatientDocument {
  return {
    id: row.id,
    patientId: row.patient_id,
    jenis: row.jenis ?? 'lainnya',
    fileName: row.nama_file ?? '',
    storagePath: row.storage_path ?? '',
    url: row.url ?? undefined,
    keterangan: row.keterangan ?? undefined,
    tanggal: row.tanggal ?? new Date().toISOString().slice(0, 10),
    uploadedBy: row.uploaded_by ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<PatientDocument>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.patientId !== undefined) out.patient_id = data.patientId;
  if (data.jenis !== undefined) out.jenis = data.jenis;
  if (data.fileName !== undefined) out.nama_file = data.fileName;
  if (data.storagePath !== undefined) out.storage_path = data.storagePath;
  if (data.url !== undefined) out.url = data.url;
  if (data.keterangan !== undefined) out.keterangan = data.keterangan;
  if (data.tanggal !== undefined) out.tanggal = data.tanggal;
  if (data.uploadedBy !== undefined) out.uploaded_by = data.uploadedBy;
  return stripUndefined(out);
}

const BUCKET = 'patient-files';

/**
 * Build a unique storage path for a file. Format:
 *   {patientId}/{jenis}/{timestamp}-{sanitized-filename}
 */
function buildStoragePath(patientId: string, jenis: string, fileName: string): string {
  const sanitized = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = Date.now();
  return `${patientId}/${jenis}/${ts}-${sanitized}`;
}

export const documentService = {
  async list(patientId: string): Promise<PatientDocument[]> {
    const rows = await safeQuery(
      supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('tanggal', { ascending: false }),
      [] as any[],
      'documentService.list'
    );
    return (rows as any[]).map(fromDb);
  },

  /**
   * Upload a file to Storage + insert a metadata row.
   * Returns the new PatientDocument, or null on failure.
   */
  async upload(
    patientId: string,
    file: File | Blob,
    jenis: PatientDocument['jenis'],
    uploadedBy?: string,
    keterangan?: string
  ): Promise<PatientDocument | null> {
    const fileName = (file as File).name ?? `upload-${Date.now()}`;
    const storagePath = buildStoragePath(patientId, jenis, fileName);

    // Upload to Storage
    const uploadRes = await safeQuery(
      supabase.storage.from(BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      }),
      null as any,
      'documentService.upload(storage)'
    );
    if (uploadRes === null) return null; // upload failed — abort

    // Get a public URL (works for public buckets; for private buckets,
    // createSignedUrl would be needed — but for now we try public URL first).
    let url: string | undefined;
    try {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      if (pub?.publicUrl) url = pub.publicUrl;
    } catch {
      /* leave url undefined */
    }

    const payload = toDb({
      patientId,
      jenis,
      fileName,
      storagePath,
      url,
      uploadedBy,
      keterangan,
      tanggal: new Date().toISOString().slice(0, 10),
    });

    const row = await safeQuery(
      supabase.from('patient_documents').insert(payload).select().single(),
      null as any,
      'documentService.upload(db)'
    );
    return row ? fromDb(row) : null;
  },

  /**
   * Remove a document: delete from Storage (best-effort) + delete the row.
   */
  async remove(id: string, storagePath: string): Promise<boolean> {
    // Delete the file from Storage first (best-effort)
    await safeQuery(
      supabase.storage.from(BUCKET).remove([storagePath]),
      null as any,
      'documentService.remove(storage)'
    );

    const res = await safeQuery(
      supabase.from('patient_documents').delete().eq('id', id),
      null as any,
      'documentService.remove(db)'
    );
    return res !== null;
  },
};
