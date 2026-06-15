// Firestore Sync Layer — Bridges Zustand store actions with Firestore persistence
// Every write operation goes to BOTH Zustand (for immediate UI) AND Firestore (for persistence)

import { firestoreActions } from '@/hooks/useFirestore';
import { patientSubcollections } from '@/lib/firestore-service';

// ─── Helper: Convert type to plain object for Firestore ──────────────

function toPlainObject<T>(obj: T): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip functions and undefined values
    if (typeof value === 'function' || value === undefined) continue;
    // Convert Date to ISO string
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Firestore-synced actions ─────────────────────────────────────────

export const firestoreSync = {
  // ── Patients ──────────────────────────────────────────────────────

  async addPatient(patientData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addPatient(patientData);
      console.log('[FirestoreSync] Patient added:', id);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding patient:', error);
      throw error;
    }
  },

  async updatePatient(patientId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firestoreActions.updatePatient(patientId, data);
      console.log('[FirestoreSync] Patient updated:', patientId);
    } catch (error) {
      console.error('[FirestoreSync] Error updating patient:', error);
      throw error;
    }
  },

  async deletePatient(patientId: string): Promise<void> {
    try {
      await firestoreActions.deletePatient(patientId);
      console.log('[FirestoreSync] Patient deleted:', patientId);
    } catch (error) {
      console.error('[FirestoreSync] Error deleting patient:', error);
      throw error;
    }
  },

  // ── TTV Serial ────────────────────────────────────────────────────

  async addTTV(patientId: string, ttvData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addTTV(patientId, { ...ttvData, palliativePatientId: patientId });
      console.log('[FirestoreSync] TTV added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding TTV:', error);
      throw error;
    }
  },

  // ── Keluhan Harian ────────────────────────────────────────────────

  async addKeluhan(patientId: string, keluhanData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addKeluhan(patientId, { ...keluhanData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Keluhan added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding keluhan:', error);
      throw error;
    }
  },

  // ── Nutrisi ───────────────────────────────────────────────────────

  async addNutrisi(patientId: string, nutrisiData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addNutrisi(patientId, { ...nutrisiData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Nutrisi added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding nutrisi:', error);
      throw error;
    }
  },

  // ── Skrining Paliatif ─────────────────────────────────────────────

  async addSkrining(patientId: string, skriningData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addSkrining(patientId, { ...skriningData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Skrining added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding skrining:', error);
      throw error;
    }
  },

  // ── Sosial ────────────────────────────────────────────────────────

  async addSosial(patientId: string, sosialData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addSosial(patientId, { ...sosialData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Sosial added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding sosial:', error);
      throw error;
    }
  },

  async updateSosial(patientId: string, docId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firestoreActions.updateSosial(patientId, docId, data);
      console.log('[FirestoreSync] Sosial updated:', docId);
    } catch (error) {
      console.error('[FirestoreSync] Error updating sosial:', error);
      throw error;
    }
  },

  // ── ACP ───────────────────────────────────────────────────────────

  async addACP(patientId: string, acpData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addACP(patientId, { ...acpData, palliativePatientId: patientId });
      console.log('[FirestoreSync] ACP added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding ACP:', error);
      throw error;
    }
  },

  async updateACP(patientId: string, docId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firestoreActions.updateACP(patientId, docId, data);
      console.log('[FirestoreSync] ACP updated:', docId);
    } catch (error) {
      console.error('[FirestoreSync] Error updating ACP:', error);
      throw error;
    }
  },

  // ── Obat ──────────────────────────────────────────────────────────

  async addObat(patientId: string, obatData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addObat(patientId, { ...obatData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Obat added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding obat:', error);
      throw error;
    }
  },

  async updateObat(patientId: string, docId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firestoreActions.updateObat(patientId, docId, data);
      console.log('[FirestoreSync] Obat updated:', docId);
    } catch (error) {
      console.error('[FirestoreSync] Error updating obat:', error);
      throw error;
    }
  },

  async deleteObat(patientId: string, docId: string): Promise<void> {
    try {
      await firestoreActions.deleteObat(patientId, docId);
      console.log('[FirestoreSync] Obat deleted:', docId);
    } catch (error) {
      console.error('[FirestoreSync] Error deleting obat:', error);
      throw error;
    }
  },

  // ── Chat Messages ─────────────────────────────────────────────────

  async addChatMessage(patientId: string, msgData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addChatMessage(patientId, msgData);
      console.log('[FirestoreSync] Chat message added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding chat message:', error);
      throw error;
    }
  },

  async updateChatMessage(patientId: string, docId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firestoreActions.updateChatMessage(patientId, docId, data);
      console.log('[FirestoreSync] Chat message updated:', docId);
    } catch (error) {
      console.error('[FirestoreSync] Error updating chat message:', error);
      throw error;
    }
  },

  // ── Clinical Alerts ───────────────────────────────────────────────

  async addClinicalAlert(patientId: string, alertData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addClinicalAlert(patientId, { ...alertData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Clinical alert added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding clinical alert:', error);
      throw error;
    }
  },

  async markAlertRead(patientId: string, alertId: string): Promise<void> {
    try {
      await firestoreActions.markAlertRead(patientId, alertId);
      console.log('[FirestoreSync] Alert marked as read:', alertId);
    } catch (error) {
      console.error('[FirestoreSync] Error marking alert as read:', error);
      throw error;
    }
  },

  // ── Audit Entries ─────────────────────────────────────────────────

  async addAuditEntry(patientId: string, auditData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addAuditEntry(patientId, { ...auditData, patientId });
      console.log('[FirestoreSync] Audit entry added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding audit entry:', error);
      throw error;
    }
  },

  // ── Resumes ───────────────────────────────────────────────────────

  async addResume(patientId: string, resumeData: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addResume(patientId, { ...resumeData, palliativePatientId: patientId });
      console.log('[FirestoreSync] Resume added for patient:', patientId);
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding resume:', error);
      throw error;
    }
  },

  async updateResume(patientId: string, docId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await firestoreActions.updateResume(patientId, docId, data);
      console.log('[FirestoreSync] Resume updated:', docId);
    } catch (error) {
      console.error('[FirestoreSync] Error updating resume:', error);
      throw error;
    }
  },

  // ── Notifications ─────────────────────────────────────────────────

  async addNotification(data: Record<string, unknown>): Promise<string> {
    try {
      const id = await firestoreActions.addNotification(data);
      console.log('[FirestoreSync] Notification added');
      return id;
    } catch (error) {
      console.error('[FirestoreSync] Error adding notification:', error);
      throw error;
    }
  },

  async markNotificationRead(notifId: string): Promise<void> {
    try {
      await firestoreActions.markNotificationRead(notifId);
      console.log('[FirestoreSync] Notification marked as read:', notifId);
    } catch (error) {
      console.error('[FirestoreSync] Error marking notification as read:', error);
      throw error;
    }
  },
};

// ─── Firestore data → Zustand store sync helpers ────────────────────────

// These functions convert Firestore documents back to the Zustand store format

export function firestoreToPatientInfo(doc: Record<string, unknown> & { id: string }): Record<string, unknown> {
  return {
    id: doc.id,
    ...doc,
  };
}

export function firestoreToVitalSignRecord(doc: Record<string, unknown> & { id: string }): Record<string, unknown> {
  return {
    id: doc.id,
    ...doc,
    // Convert Firestore timestamps to strings if needed
    recordedAt: doc.recordedAt || doc.tanggal || doc.createdAt,
  };
}

export function firestoreToKeluhanRecord(doc: Record<string, unknown> & { id: string }): Record<string, unknown> {
  return {
    id: doc.id,
    ...doc,
    submittedAt: doc.submittedAt || doc.tanggal || doc.createdAt,
  };
}

// Re-export the subcollection paths for convenience
export { patientSubcollections };
