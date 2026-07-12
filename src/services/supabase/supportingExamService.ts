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

// ── Storage upload helper ───────────────────────────────────────────────────

async function uploadPhoto(
  patientId: string,
  jenis: string,
  file: File | Blob
): Promise<{ url?: string; storagePath: string; fileName: string } | null> {
  const fileName = (file as File).name ?? `upload-${Date.now()}`;
  const storagePath = buildStoragePath(patientId, jenis, fileName);
  const uploadRes = await safeQuery(
    supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    }),
    null as any,
    'supportingExamService.uploadPhoto'
  );
  if (uploadRes === null) return null;
  let url: string | undefined;
  try {
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    if (pub?.publicUrl) url = pub.publicUrl;
  } catch {
    /* leave url undefined */
  }
  return { url, storagePath, fileName };
}

async function removeStorage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  await safeQuery(
    supabase.storage.from(BUCKET).remove([storagePath]),
    null as any,
    'supportingExamService.removeStorage'
  );
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
    // First fetch the row to get the storage_path (labs have no actual file,
    // but we still want to clean up the row).
    const res = await safeQuery(
      supabase.from('patient_documents').delete().eq('id', id).eq('jenis', 'lab'),
      null as any,
      'supportingExamService.deleteLab'
    );
    return res !== null;
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

  async createUsg(input: USGInput): Promise<USGResult | null> {
    if (!isValidUuid(input.patientId)) {
      console.error('[supportingExamService.createUsg] ABORTED — patient_id is not a valid UUID.');
      return null;
    }
    let url: string | undefined;
    let storagePath = `usg/${input.patientId}/${Date.now()}`;
    let fileName = `usg-${input.tanggal ?? todayStr()}`;
    if (input.foto) {
      const uploaded = await uploadPhoto(input.patientId, 'gambar', input.foto);
      if (uploaded) {
        url = uploaded.url;
        storagePath = uploaded.storagePath;
        fileName = uploaded.fileName;
      }
    }
    const keterangan = JSON.stringify({
      type: 'usg',
      jenisUsg: input.jenisUsg,
      hasil: input.hasil,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = {
      patient_id: input.patientId,
      jenis: 'gambar' as const,
      nama_file: fileName,
      storage_path: storagePath,
      url,
      keterangan,
      tanggal: input.tanggal ?? todayStr(),
      uploaded_by: input.createdBy,
    };
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').insert(payload).select().single(),
      'supportingExamService.createUsg'
    );
    if (error) throw new Error(error);
    return row ? fromDbUsg(row) : null;
  },

  async updateUsg(id: string, input: Partial<USGInput>): Promise<USGResult | null> {
    if (!isValidUuid(id)) return null;
    let url: string | undefined;
    let storagePath: string | undefined;
    let fileName: string | undefined;
    if (input.foto) {
      // Need patient_id for storage path; fetch the existing row.
      const existing = await safeQuery(
        supabase.from('patient_documents').select('patient_id').eq('id', id).single(),
        null as any,
        'supportingExamService.updateUsg.fetch'
      );
      const pid = (existing as any)?.patient_id;
      if (pid) {
        const uploaded = await uploadPhoto(pid, 'gambar', input.foto);
        if (uploaded) {
          url = uploaded.url;
          storagePath = uploaded.storagePath;
          fileName = uploaded.fileName;
        }
      }
    }
    const keterangan = JSON.stringify({
      type: 'usg',
      jenisUsg: input.jenisUsg,
      hasil: input.hasil,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = stripUndefined({
      keterangan,
      url,
      storage_path: storagePath,
      nama_file: fileName,
      tanggal: input.tanggal,
      uploaded_by: input.createdBy,
    });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').update(payload).eq('id', id).select().single(),
      'supportingExamService.updateUsg'
    );
    if (error) throw new Error(error);
    return row ? fromDbUsg(row) : null;
  },

  async deleteUsg(id: string): Promise<boolean> {
    if (!isValidUuid(id)) return false;
    // Fetch the storage_path first so we can delete the file too.
    const existing = await safeQuery(
      supabase.from('patient_documents').select('storage_path').eq('id', id).single(),
      null as any,
      'supportingExamService.deleteUsg.fetch'
    );
    if (existing?.storage_path) {
      await removeStorage(existing.storage_path);
    }
    const res = await safeQuery(
      supabase.from('patient_documents').delete().eq('id', id),
      null as any,
      'supportingExamService.deleteUsg'
    );
    return res !== null;
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

  async createEcg(input: ECGInput): Promise<ECGResult | null> {
    if (!isValidUuid(input.patientId)) {
      console.error('[supportingExamService.createEcg] ABORTED — patient_id is not a valid UUID.');
      return null;
    }
    let url: string | undefined;
    let storagePath = `ekg/${input.patientId}/${Date.now()}`;
    let fileName = `ekg-${input.tanggal ?? todayStr()}`;
    if (input.foto) {
      const uploaded = await uploadPhoto(input.patientId, 'gambar', input.foto);
      if (uploaded) {
        url = uploaded.url;
        storagePath = uploaded.storagePath;
        fileName = uploaded.fileName;
      }
    }
    const keterangan = JSON.stringify({
      type: 'ekg',
      interpretasi: input.interpretasi,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = {
      patient_id: input.patientId,
      jenis: 'gambar' as const,
      nama_file: fileName,
      storage_path: storagePath,
      url,
      keterangan,
      tanggal: input.tanggal ?? todayStr(),
      uploaded_by: input.createdBy,
    };
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').insert(payload).select().single(),
      'supportingExamService.createEcg'
    );
    if (error) throw new Error(error);
    return row ? fromDbEcg(row) : null;
  },

  async updateEcg(id: string, input: Partial<ECGInput>): Promise<ECGResult | null> {
    if (!isValidUuid(id)) return null;
    let url: string | undefined;
    let storagePath: string | undefined;
    let fileName: string | undefined;
    if (input.foto) {
      const existing = await safeQuery(
        supabase.from('patient_documents').select('patient_id').eq('id', id).single(),
        null as any,
        'supportingExamService.updateEcg.fetch'
      );
      const pid = (existing as any)?.patient_id;
      if (pid) {
        const uploaded = await uploadPhoto(pid, 'gambar', input.foto);
        if (uploaded) {
          url = uploaded.url;
          storagePath = uploaded.storagePath;
          fileName = uploaded.fileName;
        }
      }
    }
    const keterangan = JSON.stringify({
      type: 'ekg',
      interpretasi: input.interpretasi,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = stripUndefined({
      keterangan,
      url,
      storage_path: storagePath,
      nama_file: fileName,
      tanggal: input.tanggal,
      uploaded_by: input.createdBy,
    });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').update(payload).eq('id', id).select().single(),
      'supportingExamService.updateEcg'
    );
    if (error) throw new Error(error);
    return row ? fromDbEcg(row) : null;
  },

  async deleteEcg(id: string): Promise<boolean> {
    if (!isValidUuid(id)) return false;
    const existing = await safeQuery(
      supabase.from('patient_documents').select('storage_path').eq('id', id).single(),
      null as any,
      'supportingExamService.deleteEcg.fetch'
    );
    if (existing?.storage_path) {
      await removeStorage(existing.storage_path);
    }
    const res = await safeQuery(
      supabase.from('patient_documents').delete().eq('id', id),
      null as any,
      'supportingExamService.deleteEcg'
    );
    return res !== null;
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

  async createRadiology(input: RadiologyInput): Promise<RadiologyResult | null> {
    if (!isValidUuid(input.patientId)) {
      console.error('[supportingExamService.createRadiology] ABORTED — patient_id is not a valid UUID.');
      return null;
    }
    let url: string | undefined;
    let storagePath = `radiologi/${input.patientId}/${Date.now()}`;
    let fileName = `radiologi-${input.tanggal ?? todayStr()}`;
    if (input.foto) {
      const uploaded = await uploadPhoto(input.patientId, 'radiologi', input.foto);
      if (uploaded) {
        url = uploaded.url;
        storagePath = uploaded.storagePath;
        fileName = uploaded.fileName;
      }
    }
    const keterangan = JSON.stringify({
      type: 'radiology',
      jenisRadiologi: input.jenisRadiologi,
      hasil: input.hasil,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = {
      patient_id: input.patientId,
      jenis: 'radiologi' as const,
      nama_file: fileName,
      storage_path: storagePath,
      url,
      keterangan,
      tanggal: input.tanggal ?? todayStr(),
      uploaded_by: input.createdBy,
    };
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').insert(payload).select().single(),
      'supportingExamService.createRadiology'
    );
    if (error) throw new Error(error);
    return row ? fromDbRadiology(row) : null;
  },

  async updateRadiology(id: string, input: Partial<RadiologyInput>): Promise<RadiologyResult | null> {
    if (!isValidUuid(id)) return null;
    let url: string | undefined;
    let storagePath: string | undefined;
    let fileName: string | undefined;
    if (input.foto) {
      const existing = await safeQuery(
        supabase.from('patient_documents').select('patient_id').eq('id', id).single(),
        null as any,
        'supportingExamService.updateRadiology.fetch'
      );
      const pid = (existing as any)?.patient_id;
      if (pid) {
        const uploaded = await uploadPhoto(pid, 'radiologi', input.foto);
        if (uploaded) {
          url = uploaded.url;
          storagePath = uploaded.storagePath;
          fileName = uploaded.fileName;
        }
      }
    }
    const keterangan = JSON.stringify({
      type: 'radiology',
      jenisRadiologi: input.jenisRadiologi,
      hasil: input.hasil,
      catatan: input.catatan,
      doctorId: validUuidOrUndefined(input.doctorId),
      createdBy: input.createdBy,
    });
    const payload = stripUndefined({
      keterangan,
      url,
      storage_path: storagePath,
      nama_file: fileName,
      tanggal: input.tanggal,
      uploaded_by: input.createdBy,
    });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('patient_documents').update(payload).eq('id', id).select().single(),
      'supportingExamService.updateRadiology'
    );
    if (error) throw new Error(error);
    return row ? fromDbRadiology(row) : null;
  },

  async deleteRadiology(id: string): Promise<boolean> {
    if (!isValidUuid(id)) return false;
    const existing = await safeQuery(
      supabase.from('patient_documents').select('storage_path').eq('id', id).single(),
      null as any,
      'supportingExamService.deleteRadiology.fetch'
    );
    if (existing?.storage_path) {
      await removeStorage(existing.storage_path);
    }
    const res = await safeQuery(
      supabase.from('patient_documents').delete().eq('id', id),
      null as any,
      'supportingExamService.deleteRadiology'
    );
    return res !== null;
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
