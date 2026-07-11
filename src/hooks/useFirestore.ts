// ───────────────────────────────────────────────────────────────────────────
// useFirestore — DEPRECATED no-op hooks
// ───────────────────────────────────────────────────────────────────────────
// CareLivia now uses Supabase as its sole backend. The hooks in this file
// are kept only so legacy imports do not break. They return empty data and
// perform no Firebase operations.
//
// New code should use the Supabase service layer directly:
//   import { patientService, vitalService, ... } from '@/services/supabase';
// or the realtime channel in @/components/telemedicine/supabase-sync-provider.
// ───────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Unsubscribe = () => void;

const noop: Unsubscribe = () => {};

export function useFirestoreCollection<T extends Record<string, unknown>>(
  _collectionPath: string | null,
  _constraints: unknown[] = []
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  return { data, loading, error, refetch: () => {} };
}

export function useFirestoreDocument<T extends Record<string, unknown>>(
  _docPath: string | null
) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  return { data, loading, error, refetch: () => {} };
}

export const firestoreActions = {
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
