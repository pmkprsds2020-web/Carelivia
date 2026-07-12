// ───────────────────────────────────────────────────────────────────────────
// referralLetterService — Supabase CRUD for `referral_letters`
// ───────────────────────────────────────────────────────────────────────────
//
// DB columns (see supabase/schema.sql §23):
//   id, patient_id, resume_id, target_department, reason, status, content,
//   created_by, created_at, updated_at
//
// The TS type `PalliativeReferralLetter` has many extra fields (documentNumber,
// generatedAt, generatedByRole, doctorSip, doctorName, nik, bpjsNumber,
// primaryDiagnosis, secondaryDiagnosis, referralReason, clinicalSummary,
// consultationRequest, fullContent↔content, referralStatus↔status,
// referredAt, referredTo, completedAt, version, previousVersionId, isSigned,
// signedAt, qrCode, sentToChatAt, sentToEmailAt, sentToWhatsAppAt,
// downloadCount, printCount, lastDownloadAt, lastPrintAt).
//
// The structured fields are tucked into the `content` TEXT column as a JSON
// envelope so we never lose them on a round-trip. `fullContent` (the
// AI-generated markdown) is stored as the human-readable prefix.
// ───────────────────────────────────────────────────────────────────────────
import { supabase, safeQuery, safeInsert, stripUndefined, isValidUuid, validUuidOrUndefined, safeJsonParse } from './_common';
import type { PalliativeReferralLetter } from '@/lib/types';

const ENVELOPE_MARKER = '\n\n__REFERRAL_ENVELOPE_JSON__:\n';

/**
 * Normalize the TS `ReferralStatus` to a DB-allowed value.
 * DB CHECK constraint: status in ('draft','sent','received','rejected')
 * TS type uses: 'belum_dirujuk' | 'menunggu' | 'sudah_dirujuk' | 'selesai'
 */
function normalizeStatusToDb(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'draft';
  const s = raw.toLowerCase().trim();
  if (s === 'draft' || s === 'belum_dirujuk' || s === 'belum_dikirim') return 'draft';
  if (s === 'sent' || s === 'menunggu' || s === 'dikirim') return 'sent';
  if (s === 'received' || s === 'sudah_dirujuk' || s === 'diterima') return 'received';
  if (s === 'rejected' || s === 'selesai' || s === 'ditolak') return 'rejected';
  // Unknown values default to 'draft' so we never violate the CHECK constraint.
  return 'draft';
}

/** Reverse mapping: DB status → TS ReferralStatus. */
function statusFromDb(raw: unknown): PalliativeReferralLetter['referralStatus'] {
  if (typeof raw !== 'string' || !raw) return 'belum_dirujuk';
  const s = raw.toLowerCase().trim();
  if (s === 'draft') return 'belum_dirujuk';
  if (s === 'sent') return 'menunggu';
  if (s === 'received') return 'sudah_dirujuk';
  if (s === 'rejected') return 'selesai';
  return 'belum_dirujuk';
}

function fromDb(row: any): PalliativeReferralLetter {
  const rawContent: string = row.content ?? '';
  let fullContent = rawContent;
  let env: Record<string, any> = {};
  const markerIdx = rawContent.indexOf(ENVELOPE_MARKER);
  if (markerIdx >= 0) {
    fullContent = rawContent.slice(0, markerIdx);
    env = safeJsonParse<any>(rawContent.slice(markerIdx + ENVELOPE_MARKER.length), {});
  }
  return {
    id: row.id,
    palliativePatientId: row.patient_id,
    patientName: env.patientName,
    rmNumber: env.rmNumber,
    documentNumber: env.documentNumber ?? '',
    generatedAt: env.generatedAt ?? row.created_at ?? new Date().toISOString(),
    generatedBy: row.created_by ?? env.generatedBy ?? '',
    generatedByRole: (env.generatedByRole as any) ?? 'doctor',
    doctorSip: env.doctorSip,
    doctorName: env.doctorName,
    nik: env.nik,
    bpjsNumber: env.bpjsNumber,
    primaryDiagnosis: env.primaryDiagnosis ?? '',
    secondaryDiagnosis: env.secondaryDiagnosis,
    referralReason: env.referralReason ?? row.reason ?? '',
    clinicalSummary: env.clinicalSummary ?? '',
    targetDepartment: (row.target_department as any) ?? env.targetDepartment,
    consultationRequest: env.consultationRequest ?? '',
    fullContent,
    referralStatus: statusFromDb(row.status) ?? (env.referralStatus as any) ?? 'belum_dirujuk',
    referredAt: env.referredAt,
    referredTo: env.referredTo ?? row.target_department,
    completedAt: env.completedAt,
    version: env.version ?? 1,
    previousVersionId: env.previousVersionId,
    isSigned: env.isSigned ?? false,
    signedAt: env.signedAt,
    qrCode: env.qrCode,
    sentToChatAt: env.sentToChatAt,
    sentToEmailAt: env.sentToEmailAt,
    sentToWhatsAppAt: env.sentToWhatsAppAt,
    downloadCount: env.downloadCount ?? 0,
    printCount: env.printCount ?? 0,
    lastDownloadAt: env.lastDownloadAt,
    lastPrintAt: env.lastPrintAt,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toDb(data: Partial<PalliativeReferralLetter>): Record<string, any> {
  const out: Record<string, any> = {};
  if (data.palliativePatientId !== undefined && isValidUuid(data.palliativePatientId)) {
    out.patient_id = data.palliativePatientId;
  }
  const resumeId = validUuidOrUndefined(data.previousVersionId);
  // NOTE: `previousVersionId` is not the same as `resume_id` semantically, but
  // since the DB has no `previous_version_id` column on referral_letters, we
  // store it inside the content envelope instead (see below).
  if (resumeId && data.previousVersionId === resumeId) {
    // Only set resume_id if explicitly provided via a separate field — we
    // don't have one here, so leave it.
  }
  if (data.targetDepartment !== undefined) out.target_department = data.targetDepartment;
  if (data.referralReason !== undefined) out.reason = data.referralReason;
  if (data.referralStatus !== undefined) out.status = normalizeStatusToDb(data.referralStatus);
  if (data.generatedBy !== undefined) out.created_by = data.generatedBy;

  // Build the content envelope: human-readable fullContent + JSON of all
  // extra structured fields so they survive the round-trip.
  if (data.fullContent !== undefined || data.documentNumber !== undefined ||
      data.generatedAt !== undefined || data.generatedByRole !== undefined ||
      data.doctorSip !== undefined || data.doctorName !== undefined ||
      data.nik !== undefined || data.bpjsNumber !== undefined ||
      data.primaryDiagnosis !== undefined || data.secondaryDiagnosis !== undefined ||
      data.clinicalSummary !== undefined || data.consultationRequest !== undefined ||
      data.referredAt !== undefined || data.referredTo !== undefined ||
      data.completedAt !== undefined || data.version !== undefined ||
      data.previousVersionId !== undefined || data.isSigned !== undefined ||
      data.signedAt !== undefined || data.qrCode !== undefined ||
      data.sentToChatAt !== undefined || data.sentToEmailAt !== undefined ||
      data.sentToWhatsAppAt !== undefined || data.downloadCount !== undefined ||
      data.printCount !== undefined || data.lastDownloadAt !== undefined ||
      data.lastPrintAt !== undefined || data.patientName !== undefined ||
      data.rmNumber !== undefined) {
    const env: Record<string, any> = {};
    if (data.patientName !== undefined) env.patientName = data.patientName;
    if (data.rmNumber !== undefined) env.rmNumber = data.rmNumber;
    if (data.documentNumber !== undefined) env.documentNumber = data.documentNumber;
    if (data.generatedAt !== undefined) env.generatedAt = data.generatedAt;
    if (data.generatedByRole !== undefined) env.generatedByRole = data.generatedByRole;
    if (data.doctorSip !== undefined) env.doctorSip = data.doctorSip;
    if (data.doctorName !== undefined) env.doctorName = data.doctorName;
    if (data.nik !== undefined) env.nik = data.nik;
    if (data.bpjsNumber !== undefined) env.bpjsNumber = data.bpjsNumber;
    if (data.primaryDiagnosis !== undefined) env.primaryDiagnosis = data.primaryDiagnosis;
    if (data.secondaryDiagnosis !== undefined) env.secondaryDiagnosis = data.secondaryDiagnosis;
    if (data.clinicalSummary !== undefined) env.clinicalSummary = data.clinicalSummary;
    if (data.consultationRequest !== undefined) env.consultationRequest = data.consultationRequest;
    if (data.referredAt !== undefined) env.referredAt = data.referredAt;
    if (data.referredTo !== undefined) env.referredTo = data.referredTo;
    if (data.completedAt !== undefined) env.completedAt = data.completedAt;
    if (data.version !== undefined) env.version = data.version;
    if (data.previousVersionId !== undefined) env.previousVersionId = data.previousVersionId;
    if (data.isSigned !== undefined) env.isSigned = data.isSigned;
    if (data.signedAt !== undefined) env.signedAt = data.signedAt;
    if (data.qrCode !== undefined) env.qrCode = data.qrCode;
    if (data.sentToChatAt !== undefined) env.sentToChatAt = data.sentToChatAt;
    if (data.sentToEmailAt !== undefined) env.sentToEmailAt = data.sentToEmailAt;
    if (data.sentToWhatsAppAt !== undefined) env.sentToWhatsAppAt = data.sentToWhatsAppAt;
    if (data.downloadCount !== undefined) env.downloadCount = data.downloadCount;
    if (data.printCount !== undefined) env.printCount = data.printCount;
    if (data.lastDownloadAt !== undefined) env.lastDownloadAt = data.lastDownloadAt;
    if (data.lastPrintAt !== undefined) env.lastPrintAt = data.lastPrintAt;
    const md = data.fullContent ?? '';
    out.content = `${md}${ENVELOPE_MARKER}${JSON.stringify(env)}`;
  }
  return stripUndefined(out);
}

export const referralLetterService = {
  async getAll(patientId: string): Promise<PalliativeReferralLetter[]> {
    const rows = await safeQuery(
      supabase
        .from('referral_letters')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      [] as any[],
      'referralLetterService.getAll'
    );
    return (rows as any[]).map(fromDb);
  },

  async create(data: Partial<PalliativeReferralLetter>): Promise<PalliativeReferralLetter | null> {
    if (!isValidUuid(data.palliativePatientId)) {
      console.error(
        '[referralLetterService.create] ABORTED — patient_id is not a valid UUID.',
        { received: data.palliativePatientId }
      );
      return null;
    }
    const payload = toDb(data);
    console.log('[referralLetterService.create] payload:', { patient_id: data.palliativePatientId, target_department: payload.target_department });
    const { data: row, error } = await safeInsert<any>(
      supabase.from('referral_letters').insert(payload).select().single(),
      'referralLetterService.create'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async update(id: string, data: Partial<PalliativeReferralLetter>): Promise<PalliativeReferralLetter | null> {
    const payload = toDb(data);
    const { data: row, error } = await safeInsert<any>(
      supabase.from('referral_letters').update(payload).eq('id', id).select().single(),
      'referralLetterService.update'
    );
    if (error) throw new Error(error);
    return row ? fromDb(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await safeQuery(
      supabase.from('referral_letters').delete().eq('id', id),
      null as any,
      'referralLetterService.remove'
    );
    return res !== null;
  },
};
