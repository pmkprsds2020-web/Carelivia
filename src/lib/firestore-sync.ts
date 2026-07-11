// ───────────────────────────────────────────────────────────────────────────
// firestore-sync — DEPRECATED no-op stub
// ───────────────────────────────────────────────────────────────────────────
// CareLivia now uses Supabase as its sole backend. All write operations that
// used to flow through `firestoreSync` are now handled directly by the
// Supabase service layer (see @/services/supabase) inside the Zustand store
// actions.
//
// This file is kept only so legacy imports do not break. Every method is a
// no-op that resolves immediately without logging any warnings.
// ───────────────────────────────────────────────────────────────────────────

export const firestoreSync = {
  addPatient: async (_data: Record<string, unknown>): Promise<string> => '',
  updatePatient: async (_id: string, _data: Record<string, unknown>): Promise<void> => {},
  deletePatient: async (_id: string): Promise<void> => {},
  addTTV: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  addObat: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  updateObat: async (_patientId: string, _medId: string, _data: Record<string, unknown>): Promise<void> => {},
  addACP: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  updateACP: async (_patientId: string, _planId: string, _data: Record<string, unknown>): Promise<void> => {},
  addSkrining: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  addNutrisi: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  addChatMessage: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  updateChatMessage: async (_patientId: string, _msgId: string, _data: Record<string, unknown>): Promise<void> => {},
  addClinicalAlert: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  markAlertRead: async (_patientId: string, _alertId: string): Promise<void> => {},
  addAuditEntry: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  addKeluhan: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  addResume: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
  updateResume: async (_patientId: string, _resumeId: string, _data: Record<string, unknown>): Promise<void> => {},
  addSosial: async (_patientId: string, _data: Record<string, unknown>): Promise<void> => {},
};
