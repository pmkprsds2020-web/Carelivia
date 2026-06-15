// Custom React Hooks for Firestore real-time data
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  type Unsubscribe,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import * as firestoreService from '@/lib/firestore-service';

// ─── Hook: Real-time collection listener ──────────────────────────────

export function useFirestoreCollection<T extends Record<string, unknown>>(
  collectionPath: string | null,
  constraints: Parameters<typeof firestoreService.onCollectionSnapshot>[1] = []
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(collectionPath !== null);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  // Serialize constraints for dependency array
  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!collectionPath) {
      return;
    }

    // Clean up previous listener
    if (unsubRef.current) {
      unsubRef.current();
    }

    const unsub = firestoreService.onCollectionSnapshot<T>(
      collectionPath,
      constraints,
      (newData) => {
        setData(newData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    unsubRef.current = unsub;

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [collectionPath, constraintsKey]);

  return { data, loading, error };
}

// ─── Hook: Real-time single document listener ─────────────────────────

export function useFirestoreDoc<T extends Record<string, unknown>>(
  collectionPath: string | null,
  docId: string | null
) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(collectionPath !== null && docId !== null);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!collectionPath || !docId) {
      return;
    }

    if (unsubRef.current) {
      unsubRef.current();
    }

    const unsub = firestoreService.onDocSnapshot<T>(
      collectionPath,
      docId,
      (newData) => {
        setData(newData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    unsubRef.current = unsub;

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [collectionPath, docId]);

  return { data, loading, error };
}

// ─── Hook: Fetch collection once (no real-time) ───────────────────────

export function useFirestoreFetch<T extends Record<string, unknown>>(
  collectionPath: string | null,
  constraints: Parameters<typeof firestoreService.getCollection>[1] = []
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(collectionPath !== null);
  const [error, setError] = useState<Error | null>(null);

  const constraintsKey = JSON.stringify(constraints);

  const fetchData = useCallback(async () => {
    if (!collectionPath) {
      return;
    }

    try {
      setError(null);
      const result = await firestoreService.getCollection<T>(collectionPath, constraints);
      setData(result);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [collectionPath, constraints]);

  useEffect(() => {
    if (collectionPath) {
      firestoreService.getCollection<T>(collectionPath, constraints)
        .then(result => {
          setData(result);
          setLoading(false);
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });
    }
  }, [collectionPath, constraints]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Hook: Palliative Patients (real-time) ────────────────────────────

export function usePalliativePatients() {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    'patients',
    [orderBy('createdAt', 'desc')]
  );
  return { patients: data, loading, error };
}

// ─── Hook: Patient subcollection (real-time) ──────────────────────────

export function usePatientSubcollection<T extends Record<string, unknown>>(
  subcollectionPathFn: ((patientId: string) => string) | null,
  patientId: string | null
) {
  const collectionPath = subcollectionPathFn && patientId ? subcollectionPathFn(patientId) : null;
  return useFirestoreCollection<T>(collectionPath, [orderBy('createdAt', 'desc')]);
}

// ─── Hook: TTV Serial ─────────────────────────────────────────────────

export function useTTVSerial(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.ttv(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { ttvRecords: data, loading, error };
}

// ─── Hook: Keluhan Harian ─────────────────────────────────────────────

export function useKeluhanHarian(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.keluhan(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { keluhanRecords: data, loading, error };
}

// ─── Hook: Nutrisi ────────────────────────────────────────────────────

export function useNutrisi(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.nutrisi(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { nutrisiRecords: data, loading, error };
}

// ─── Hook: Skrining Paliatif ──────────────────────────────────────────

export function useSkriningPaliatif(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.skrining(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { skriningRecords: data, loading, error };
}

// ─── Hook: Sosial ─────────────────────────────────────────────────────

export function useSosial(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.sosial(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { sosialRecords: data, loading, error };
}

// ─── Hook: ACP ────────────────────────────────────────────────────────

export function useACP(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.acp(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { acpRecords: data, loading, error };
}

// ─── Hook: Obat ───────────────────────────────────────────────────────

export function useObat(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.obat(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { obatRecords: data, loading, error };
}

// ─── Hook: Chat Messages ──────────────────────────────────────────────

export function useChatMessages(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.chatMessages(patientId) : null,
    [orderBy('createdAt', 'asc')]
  );
  return { messages: data, loading, error };
}

// ─── Hook: Clinical Alerts ────────────────────────────────────────────

export function useClinicalAlerts(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.clinicalAlerts(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { alerts: data, loading, error };
}

// ─── Hook: Resumes ────────────────────────────────────────────────────

export function useResumes(patientId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    patientId ? firestoreService.patientSubcollections.resumes(patientId) : null,
    [orderBy('createdAt', 'desc')]
  );
  return { resumes: data, loading, error };
}

// ─── Hook: Notifications ──────────────────────────────────────────────

export function useNotifications(userId: string | null) {
  const { data, loading, error } = useFirestoreCollection<Record<string, unknown>>(
    'notifications',
    userId ? [where('userId', '==', userId), orderBy('createdAt', 'desc')] : []
  );
  return { notifications: data, loading, error };
}

// ─── Firestore write actions (callable from components) ────────────────

export const firestoreActions = {
  // Patients
  async addPatient(data: Record<string, unknown>) {
    return firestoreService.patientsService.create(data);
  },
  async updatePatient(id: string, data: Record<string, unknown>) {
    return firestoreService.patientsService.update(id, data);
  },
  async deletePatient(id: string) {
    return firestoreService.patientsService.delete(id);
  },

  // TTV
  async addTTV(patientId: string, data: Record<string, unknown>) {
    return firestoreService.ttvService.create(patientId, data);
  },

  // Keluhan
  async addKeluhan(patientId: string, data: Record<string, unknown>) {
    return firestoreService.keluhanService.create(patientId, data);
  },

  // Nutrisi
  async addNutrisi(patientId: string, data: Record<string, unknown>) {
    return firestoreService.nutrisiService.create(patientId, data);
  },

  // Skrining
  async addSkrining(patientId: string, data: Record<string, unknown>) {
    return firestoreService.skriningService.create(patientId, data);
  },

  // Sosial
  async addSosial(patientId: string, data: Record<string, unknown>) {
    return firestoreService.sosialService.create(patientId, data);
  },
  async updateSosial(patientId: string, docId: string, data: Record<string, unknown>) {
    return firestoreService.sosialService.update(patientId, docId, data);
  },

  // ACP
  async addACP(patientId: string, data: Record<string, unknown>) {
    return firestoreService.acpService.create(patientId, data);
  },
  async updateACP(patientId: string, docId: string, data: Record<string, unknown>) {
    return firestoreService.acpService.update(patientId, docId, data);
  },

  // Obat
  async addObat(patientId: string, data: Record<string, unknown>) {
    return firestoreService.obatService.create(patientId, data);
  },
  async updateObat(patientId: string, docId: string, data: Record<string, unknown>) {
    return firestoreService.obatService.update(patientId, docId, data);
  },
  async deleteObat(patientId: string, docId: string) {
    return firestoreService.obatService.delete(patientId, docId);
  },

  // Chat
  async addChatMessage(patientId: string, data: Record<string, unknown>) {
    return firestoreService.chatService.create(patientId, data);
  },
  async updateChatMessage(patientId: string, docId: string, data: Record<string, unknown>) {
    return firestoreService.chatService.update(patientId, docId, data);
  },

  // Clinical Alerts
  async addClinicalAlert(patientId: string, data: Record<string, unknown>) {
    return firestoreService.clinicalAlertsService.create(patientId, data);
  },
  async markAlertRead(patientId: string, alertId: string) {
    return firestoreService.clinicalAlertsService.markRead(patientId, alertId);
  },

  // Audit
  async addAuditEntry(patientId: string, data: Record<string, unknown>) {
    return firestoreService.auditService.create(patientId, data);
  },

  // Resumes
  async addResume(patientId: string, data: Record<string, unknown>) {
    return firestoreService.resumeService.create(patientId, data);
  },
  async updateResume(patientId: string, docId: string, data: Record<string, unknown>) {
    return firestoreService.resumeService.update(patientId, docId, data);
  },

  // Notifications
  async addNotification(data: Record<string, unknown>) {
    return firestoreService.notificationsService.create(data);
  },
  async markNotificationRead(notifId: string) {
    return firestoreService.notificationsService.markRead(notifId);
  },

  // Users
  async addUser(data: Record<string, unknown>, userId?: string) {
    return firestoreService.usersService.create(data, userId);
  },
  async updateUser(id: string, data: Record<string, unknown>) {
    return firestoreService.usersService.update(id, data);
  },
};
