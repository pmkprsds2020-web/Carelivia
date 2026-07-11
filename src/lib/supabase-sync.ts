// ───────────────────────────────────────────────────────────────────────────
// supabase-sync — bridges Zustand store actions with Supabase persistence
// ───────────────────────────────────────────────────────────────────────────
//
// This module mirrors the legacy `firestoreSync` API but routes every write
// to the appropriate Supabase service. It is imported by `@/lib/store` so
// every store action persists to Supabase in the background.
//
// Every method is fire-and-forget: errors are logged but never thrown, so
// the Zustand UI update always succeeds even if Supabase is temporarily
// unreachable. Realtime subscriptions in `SupabaseSyncProvider` will catch
// up the local state once the write lands in the database.
// ───────────────────────────────────────────────────────────────────────────

import {
  patientService,
  vitalService,
  medicationService,
  screeningService,
  nutritionService,
  complaintService,
  socialService,
  acpService,
  chatService,
} from '@/services/supabase';

function logErr(label: string, err: unknown) {
  console.error(`[SupabaseSync] ${label}:`, err);
}

export const supabaseSync = {
  // ── Patients ───────────────────────────────────────────────────────────
  async addPatient(data: Record<string, unknown>): Promise<string> {
    try {
      const created = await patientService.create(data as any);
      return created?.id ?? '';
    } catch (err) {
      logErr('addPatient', err);
      return '';
    }
  },

  async updatePatient(id: string, data: Record<string, unknown>): Promise<void> {
    try {
      await patientService.update(id, data as any);
    } catch (err) {
      logErr('updatePatient', err);
    }
  },

  async deletePatient(id: string): Promise<void> {
    try {
      await patientService.remove(id);
    } catch (err) {
      logErr('deletePatient', err);
    }
  },

  // ── Vital signs (TTV) ──────────────────────────────────────────────────
  async addTTV(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await vitalService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addTTV', err);
    }
  },

  // ── Medications (Obat) ─────────────────────────────────────────────────
  async addObat(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await medicationService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addObat', err);
    }
  },

  async updateObat(patientId: string, medId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await medicationService.update(medId, data as any);
    } catch (err) {
      logErr('updateObat', err);
    }
  },

  // ── Advance Care Planning (ACP) ────────────────────────────────────────
  async addACP(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await acpService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addACP', err);
    }
  },

  async updateACP(patientId: string, planId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await acpService.update(planId, data as any);
    } catch (err) {
      logErr('updateACP', err);
    }
  },

  // ── Screenings (Skrining) ──────────────────────────────────────────────
  async addSkrining(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await screeningService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addSkrining', err);
    }
  },

  // ── Nutrition (Nutrisi) ────────────────────────────────────────────────
  async addNutrisi(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await nutritionService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addNutrisi', err);
    }
  },

  // ── Chat messages ──────────────────────────────────────────────────────
  async addChatMessage(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      // Resolve or create a room for this patient + doctor, then send.
      const doctorId = (data.senderRole === 'doctor' ? data.senderId : undefined) as string | undefined;
      const roomId = data.roomId as string | undefined;
      if (!roomId) return;
      // Use sendMessage directly with the existing roomId — the chat panel
      // already ensures a room exists before dispatching the store action.
      await chatService.sendMessage(roomId, data as any);
    } catch (err) {
      logErr('addChatMessage', err);
    }
  },

  async updateChatMessage(patientId: string, msgId: string, data: Record<string, unknown>): Promise<void> {
    try {
      // chatService doesn't expose update; we mark read instead if applicable.
      if ('status' in data && data.status === 'read') {
        await chatService.markRead(msgId);
      }
    } catch (err) {
      logErr('updateChatMessage', err);
    }
  },

  // ── Clinical alerts ────────────────────────────────────────────────────
  async addClinicalAlert(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      // No dedicated alerts service — write directly via supabase client.
      const { supabase } = await import('@/services/supabase');
      await supabase.from('clinical_alerts').insert({
        patient_id: patientId,
        alert_type: (data.alertType as string) ?? 'form_tidak_diisi',
        severity: (data.severity as string) ?? 'kuning',
        title: (data.title as string) ?? '',
        description: (data.description as string) ?? '',
        values: (data.values as any) ?? null,
        is_read: false,
      });
    } catch (err) {
      logErr('addClinicalAlert', err);
    }
  },

  async markAlertRead(patientId: string, alertId: string): Promise<void> {
    try {
      const { supabase } = await import('@/services/supabase');
      await supabase.from('clinical_alerts').update({ is_read: true }).eq('id', alertId);
    } catch (err) {
      logErr('markAlertRead', err);
    }
  },

  // ── Audit log ──────────────────────────────────────────────────────────
  async addAuditEntry(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      const { supabase } = await import('@/services/supabase');
      await supabase.from('audit_log').insert({
        patient_id: patientId,
        action: (data.action as string) ?? 'clinical_action',
        performed_by: (data.performedBy as string) ?? 'system',
        performed_by_role: (data.performedByRole as string) ?? 'system',
        details: (data.details as any) ?? null,
        ip_address: (data.ipAddress as string) ?? null,
        device: (data.device as string) ?? null,
      });
    } catch (err) {
      logErr('addAuditEntry', err);
    }
  },

  // ── Daily complaints (Keluhan) ──────────────────────────────────────────
  async addKeluhan(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await complaintService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addKeluhan', err);
    }
  },

  // ── Resume medis ────────────────────────────────────────────────────────
  async addResume(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      const { supabase } = await import('@/services/supabase');
      await supabase.from('patient_documents').insert({
        patient_id: patientId,
        document_type: 'resume_medis',
        title: (data.title as string) ?? 'Resume Medis',
        content: (data as any),
        created_by: (data.createdBy as string) ?? null,
      });
    } catch (err) {
      logErr('addResume', err);
    }
  },

  async updateResume(patientId: string, resumeId: string, data: Record<string, unknown>): Promise<void> {
    try {
      const { supabase } = await import('@/services/supabase');
      await supabase.from('patient_documents').update({ content: data as any }).eq('id', resumeId);
    } catch (err) {
      logErr('updateResume', err);
    }
  },

  // ── Social assessments (Sosial) ─────────────────────────────────────────
  async addSosial(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await socialService.create({ ...(data as any), palliativePatientId: patientId });
    } catch (err) {
      logErr('addSosial', err);
    }
  },
};
