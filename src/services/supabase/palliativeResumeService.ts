// ───────────────────────────────────────────────────────────────────────────
// palliativeResumeService — Supabase CRUD for `palliative_resumes`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §22):
//   id, patient_id, document_number, generated_by, generated_by_role,
//   generated_at, full_content, version, previous_version_id, is_signed,
//   signed_at, qr_code, download_count, print_count, created_at, updated_at
//
// The TS type `PalliativeResumeMedis` has MANY extra structured fields
// (patientName, rmNumber, doctorSip, doctorName, dataPasien, ttvSerial,
// keluhanHarian, skriningPaliatif, esasScores, obat, nutrisi, sosial, acp,
// aiAnalysis, ringkasanKondisi, ringkasanPemeriksaan, ringkasanTerapi,
// ringkasanACP, kesimpulanKlinis, rekomendasiAI, sentToChatAt,
// sentToEmailAt, sentToWhatsAppAt, lastDownloadAt, lastPrintAt).
//
// All extra structured fields are tucked into `full_content` as a JSON
// envelope AFTER the human-readable markdown so the document is still
// readable as plain text but the structured data survives the round-trip.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined, safeJsonParse } from './_common';
import type { PalliativeResumeMedis } from '@/lib/types';

const ENVELOPE_MARKER = '\n\n__RESUME_ENVELOPE_JSON__:\n';

function fromDb(row: any): PalliativeResumeMedis {
  const raw: string = row.full_content ?? '';
  let fullContent = raw;
  let env: Record<string, any> = {};
  const idx = raw.indexOf(ENVELOPE_MARKER);
  if (idx >= 0) {
    fullContent = raw.slice(0, idx);
    env = safeJsonParse<any>(raw.slice(idx + ENVELOPE_MARKER.length), {});
  }
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    patientName: env.patientName,
    rmNumber: env.rmNumber,
    documentNumber: row.document_number ?? env.documentNumber ?? '',
    generatedAt: row.generated_at ?? env.generatedAt ?? row.created_at ?? new Date().toISOString(),
    generatedBy: row.generated_by ?? env.generatedBy ?? '',
    generatedByRole: (row.generated_by_role as any) ?? env.generatedByRole ?? 'doctor',
    doctorSip: env.doctorSip,
    doctorName: env.doctorName,
    dataPasien: env.dataPasien,
    ttvSerial: env.ttvSerial,
    keluhanHarian: env.keluhanHarian,
    skriningPaliatif: env.skriningPaliatif,
    esasScores: env.esasScores,
    obat: env.obat,
    nutrisi: env.nutrisi,
    sosial: env.sosial,
    acp: env.acp,
    aiAnalysis: env.aiAnalysis,
    ringkasanKondisi: env.ringkasanKondisi,
    ringkasanPemeriksaan: env.ringkasanPemeriksaan,
    ringkasanTerapi: env.ringkasanTerapi,
    ringkasanACP: env.ringkasanACP,
    kesimpulanKlinis: env.kesimpulanKlinis,
    rekomendasiAI: env.rekomendasiAI,
    fullContent,
    version: row.version ?? env.version ?? 1,
    previousVersionId: env.previousVersionId ?? undefined,
    isSigned: row.is_signed ?? env.isSigned ?? false,
    signedAt: row.signed_at ?? env.signedAt ?? undefined,
    qrCode: row.qr_code ?? env.qrCode ?? undefined,
    sentToChatAt: env.sentToChatAt,
    sentToEmailAt: env.sentToEmailAt,
    sentToWhatsAppAt: env.sentToWhatsAppAt,
    downloadCount: row.download_count ?? env.downloadCount ?? 0,
    printCount: row.print_count ?? env.printCount ?? 0,
    lastDownloadAt: env.lastDownloadAt,
    lastPrintAt: env.lastPrintAt,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<PalliativeResumeMedis>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  if (data.documentNumber !== undefined) out.document_number = data.documentNumber;
  if (data.generatedBy !== undefined) out.generated_by = data.generatedBy;
  if (data.generatedByRole !== undefined) out.generated_by_role = data.generatedByRole;
  if (data.generatedAt !== undefined) out.generated_at = data.generatedAt;
  if (data.version !== undefined) out.version = data.version;
  const prevId = validUuidOrUndefined(data.previousVersionId);
  if (prevId) out.previous_version_id = prevId;
  if (data.isSigned !== undefined) out.is_signed = data.isSigned;
  if (data.isSigned && data.signedAt !== undefined) out.signed_at = data.signedAt;
  else if (data.isSigned) out.signed_at = new Date().toISOString();
  if (data.qrCode !== undefined) out.qr_code = data.qrCode;
  if (data.downloadCount !== undefined) out.download_count = data.downloadCount;
  if (data.printCount !== undefined) out.print_count = data.printCount;

  // Build the content envelope: human-readable markdown + JSON of all extra
  // structured fields so they survive the round-trip.
  const env: Record<string, any> = {};
  if (data.patientName !== undefined) env.patientName = data.patientName;
  if (data.rmNumber !== undefined) env.rmNumber = data.rmNumber;
  if (data.doctorSip !== undefined) env.doctorSip = data.doctorSip;
  if (data.doctorName !== undefined) env.doctorName = data.doctorName;
  if (data.dataPasien !== undefined) env.dataPasien = data.dataPasien;
  if (data.ttvSerial !== undefined) env.ttvSerial = data.ttvSerial;
  if (data.keluhanHarian !== undefined) env.keluhanHarian = data.keluhanHarian;
  if (data.skriningPaliatif !== undefined) env.skriningPaliatif = data.skriningPaliatif;
  if (data.esasScores !== undefined) env.esasScores = data.esasScores;
  if (data.obat !== undefined) env.obat = data.obat;
  if (data.nutrisi !== undefined) env.nutrisi = data.nutrisi;
  if (data.sosial !== undefined) env.sosial = data.sosial;
  if (data.acp !== undefined) env.acp = data.acp;
  if (data.aiAnalysis !== undefined) env.aiAnalysis = data.aiAnalysis;
  if (data.ringkasanKondisi !== undefined) env.ringkasanKondisi = data.ringkasanKondisi;
  if (data.ringkasanPemeriksaan !== undefined) env.ringkasanPemeriksaan = data.ringkasanPemeriksaan;
  if (data.ringkasanTerapi !== undefined) env.ringkasanTerapi = data.ringkasanTerapi;
  if (data.ringkasanACP !== undefined) env.ringkasanACP = data.ringkasanACP;
  if (data.kesimpulanKlinis !== undefined) env.kesimpulanKlinis = data.kesimpulanKlinis;
  if (data.rekomendasiAI !== undefined) env.rekomendasiAI = data.rekomendasiAI;
  if (data.previousVersionId !== undefined) env.previousVersionId = data.previousVersionId;
  if (data.signedAt !== undefined) env.signedAt = data.signedAt;
  if (data.sentToChatAt !== undefined) env.sentToChatAt = data.sentToChatAt;
  if (data.sentToEmailAt !== undefined) env.sentToEmailAt = data.sentToEmailAt;
  if (data.sentToWhatsAppAt !== undefined) env.sentToWhatsAppAt = data.sentToWhatsAppAt;
  if (data.lastDownloadAt !== undefined) env.lastDownloadAt = data.lastDownloadAt;
  if (data.lastPrintAt !== undefined) env.lastPrintAt = data.lastPrintAt;

  const md = data.fullContent ?? '';
  // Always write full_content so the envelope stays in sync — even if only
  // structured fields changed, we need to re-serialize the envelope.
  out.full_content = `${md}${ENVELOPE_MARKER}${JSON.stringify(env)}`;
  return stripUndefined(out);
}

export const palliativeResumeService = {
  async getAll(patientId: string): Promise<PalliativeResumeMedis[]> {
    const rows = await safeQuery(
      supabase
        .from('palliative_resumes')
        .select('*')
        .eq('patient_id', patientId)
        .order('generated_at', { ascending: false }),
      [] as any[],
      'palliativeResumeService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<PalliativeResumeMedis>): Promise<PalliativeResumeMedis | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[palliativeResumeService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[palliativeResumeService.create] payload:', { patient_id: data.palliativePatientId, document_number: payload.document_number });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('palliative_resumes').insert(payload).select().single(),
      'palliativeResumeService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<PalliativeResumeMedis>): Promise<PalliativeResumeMedis | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('palliative_resumes').update(payload).eq('id', id).select().single(),
      'palliativeResumeService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('palliative_resumes').delete().eq('id', id),
      null as any,
      'palliativeResumeService.remove'
    );
    return res !== null;
  },
};
