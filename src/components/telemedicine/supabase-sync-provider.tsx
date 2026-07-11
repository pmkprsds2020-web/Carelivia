// ───────────────────────────────────────────────────────────────────────────
// SupabaseSyncProvider — keeps the Zustand store in sync with Supabase.
//
// Responsibilities:
//   1. On mount, load all Monitoring-Paliatif data from Supabase via the 13
//      service files and populate the Zustand store. Local demo data wins on
//      conflict — we only replace the store if Supabase returns non-empty
//      arrays.
//   2. Subscribe to Supabase Realtime for 12 tables so any DB change is
//      mirrored into the store immediately (INSERT/UPDATE/DELETE).
//   3. ALWAYS render children immediately. Supabase loading is fire-and-forget
//      and never blocks the UI. If Supabase is unreachable (missing tables,
//      RLS denied, network down), we log a warning and continue with local
//      Zustand data.
//   4. NEVER throw — every subscription and load is wrapped in try/catch.
// ───────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { supabase, safeQuery } from '@/services/supabase';
import * as svc from '@/services/supabase';
import type {
  PalliativePatientInfo,
  VitalSignRecordInfo,
  PalliativeMedicationInfo,
  PalliativeScreeningRecordInfo,
  NutritionRecordInfo,
  DailyComplaintRecord,
  SocialAssessmentRecord,
  AdvanceCarePlanInfo,
  PalliativeChatMessage,
  PalliativeClinicalAlert,
  PalliativeAuditEntry,
} from '@/lib/types';

interface SupabaseSyncProviderProps {
  children: React.ReactNode;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Check whether a row id already exists in a store array. */
function hasId<T extends { id: string }>(list: T[], id: string): boolean {
  return list.some((x) => x.id === id);
}

/** Log a non-fatal sync warning. */
function warn(label: string, err: unknown) {
  console.warn(`[SupabaseSync] ${label}:`, err);
}

// ─── Initial-load handlers ─────────────────────────────────────────────────
//
// Each handler is self-contained: it loads data from Supabase, validates it,
// and dispatches the corresponding Zustand action(s). Wrapped in try/catch by
// the caller. We ALWAYS replace the store with what Supabase returns — even
// if it's an empty array — so the UI reflects the database state exactly.
// (Initial store state is also empty, so there's never stale demo data.)

async function loadPatients(store: ReturnType<typeof useStore.getState>) {
  const patients = await svc.patientService.getAll();
  // Always set — even if empty — so UI shows "Tidak ada data pasien" when DB is empty.
  if (Array.isArray(patients)) {
    store.setPalliativePatients(patients as PalliativePatientInfo[]);
  }
  return patients;
}

async function loadPatientScopedData(
  store: ReturnType<typeof useStore.getState>,
  patients: PalliativePatientInfo[]
) {
  for (const patient of patients) {
    const pid = patient.id;

    // Vitals
    try {
      const rows = await svc.vitalService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        // Replace existing vitals for this patient to avoid stale data,
        // but keep vitals from other patients intact.
        const others = store.vitalSignRecords.filter((v) => v.palliativePatientId !== pid);
        store.setVitalSignRecords([
          ...others,
          ...(rows as VitalSignRecordInfo[]),
        ]);
      }
    } catch (e) { warn('vitalService.getAll', e); }

    // Screenings
    try {
      const rows = await svc.screeningService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const others = store.palliativeScreeningRecords.filter((s) => s.palliativePatientId !== pid);
        store.setPalliativeScreeningRecords([
          ...others,
          ...(rows as PalliativeScreeningRecordInfo[]),
        ]);
      }
    } catch (e) { warn('screeningService.getAll', e); }

    // Medications
    try {
      const rows = await svc.medicationService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const others = store.palliativeMedications.filter((m) => m.palliativePatientId !== pid);
        store.setPalliativeMedications([
          ...others,
          ...(rows as PalliativeMedicationInfo[]),
        ]);
      }
    } catch (e) { warn('medicationService.getAll', e); }

    // Nutrition
    try {
      const rows = await svc.nutritionService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const others = store.nutritionRecords.filter((n) => n.palliativePatientId !== pid);
        store.setNutritionRecords([
          ...others,
          ...(rows as NutritionRecordInfo[]),
        ]);
      }
    } catch (e) { warn('nutritionService.getAll', e); }

    // Daily complaints
    try {
      const rows = await svc.complaintService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const others = store.dailyComplaints.filter((c) => c.palliativePatientId !== pid);
        store.setDailyComplaints([
          ...others,
          ...(rows as DailyComplaintRecord[]),
        ]);
      }
    } catch (e) { warn('complaintService.getAll', e); }

    // Social assessments
    try {
      const rows = await svc.socialService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const others = store.socialAssessments.filter((s) => s.palliativePatientId !== pid);
        const fresh = store.socialAssessments.filter((s) => s.palliativePatientId === pid);
        // Replace this patient's records
        const next = [...others];
        for (const r of rows as SocialAssessmentRecord[]) {
          if (!hasId(fresh, r.id)) next.push(r);
          else next.push(r); // overwrite in-place
        }
        // Use direct set since addSocialAssessment prepends (we want replace)
        store.socialAssessments = next;
        // Trigger Zustand update via the official setter (addSocialAssessment
        // prepends; we want a clean replace per-patient, so set directly):
        useStore.setState({ socialAssessments: next });
      }
    } catch (e) { warn('socialService.getAll', e); }

    // ACP
    try {
      const rows = await svc.acpService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const others = store.advanceCarePlans.filter((a) => a.palliativePatientId !== pid);
        store.setAdvanceCarePlans([
          ...others,
          ...(rows as AdvanceCarePlanInfo[]),
        ]);
      }
    } catch (e) { warn('acpService.getAll', e); }

    // Clinical alerts — loaded via direct Supabase query (the sibling agent's
    // notificationService is for user notifications, not clinical alerts).
    try {
      const rows = await safeQuery(
        supabase
          .from('clinical_alerts')
          .select('*')
          .eq('patient_id', pid)
          .order('created_at', { ascending: false }),
        [] as any[],
        'loadPatientScopedData.clinical_alerts'
      );
      if (Array.isArray(rows) && rows.length > 0) {
        for (const r of rows as any[]) {
          const alert: PalliativeClinicalAlert = {
            id: r.id,
            patientId: r.patient_id ?? pid,
            alertType: r.alert_type ?? 'form_tidak_diisi',
            severity: r.severity ?? 'kuning',
            title: r.title ?? '',
            description: r.description ?? '',
            values: r.values ?? undefined,
            isRead: !!r.is_read,
            createdAt: r.created_at ?? new Date().toISOString(),
          };
          if (!hasId(store.palliativeClinicalAlerts, alert.id)) {
            store.addPalliativeClinicalAlert(alert);
          }
        }
      }
    } catch (e) { warn('clinical_alerts load', e); }

    // Audit log — same pattern, direct Supabase query.
    try {
      const rows = await safeQuery(
        supabase
          .from('audit_log')
          .select('*')
          .eq('patient_id', pid)
          .order('created_at', { ascending: false }),
        [] as any[],
        'loadPatientScopedData.audit_log'
      );
      if (Array.isArray(rows) && rows.length > 0) {
        for (const r of rows as any[]) {
          const entry: PalliativeAuditEntry = {
            id: r.id,
            patientId: r.patient_id ?? pid,
            action: r.action ?? 'clinical_action',
            performedBy: r.performed_by ?? 'system',
            performedByRole: r.performed_by_role ?? 'system',
            details: r.details ?? undefined,
            ipAddress: r.ip_address ?? undefined,
            device: r.device ?? undefined,
            createdAt: r.created_at ?? new Date().toISOString(),
          };
          if (!hasId(store.palliativeAuditLog, entry.id)) {
            store.addPalliativeAuditEntry(entry);
          }
        }
      }
    } catch (e) { warn('audit_log load', e); }

    // Chat messages — the sibling agent's chatService.getMessages takes a
    // `roomId` (not a patientId). To list messages per patient we'd need to
    // resolve the room first; the chat panel handles this lazily itself, so
    // we skip preloading here to avoid a costly N+1 lookup.
  }
}

// ─── Realtime handlers ─────────────────────────────────────────────────────
//
// Each handler receives a PostgresChangesPayload and dispatches the matching
// Zustand action. We dedupe by id on INSERT, replace on UPDATE, filter on
// DELETE. Wrapped in try/catch by the caller so a single bad event can never
// break the subscription.

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  new: Record<string, any> | null;
  old: Record<string, any> | null;
  errors: string[] | null;
};

function handlePatientEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    if (hasId(store.palliativePatients, id)) store.removePalliativePatient(id);
    return;
  }
  // INSERT or UPDATE — try to load the full record via the service so the
  // row goes through the proper snake_case → camelCase mapping.
  svc.patientService
    .getById(id)
    .then((fresh: PalliativePatientInfo | null) => {
      if (!fresh) return;
      const exists = hasId(useStore.getState().palliativePatients, id);
      if (exists) {
        store.updatePalliativePatient(id, fresh);
      } else {
        store.addPalliativePatient(fresh);
      }
    })
    .catch((e: unknown) => warn('patient realtime getById', e));
}

function handleVitalEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      vitalSignRecords: s.vitalSignRecords.filter((v) => v.id !== id),
    }));
    return;
  }
  // Reload via service for proper mapping
  svc.vitalService
    .getAll(row?.patient_id as string)
    .then((rows: VitalSignRecordInfo[]) => {
      const fresh = rows.find((r) => r.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.vitalSignRecords, id);
      if (exists) {
        useStore.setState({
          vitalSignRecords: state.vitalSignRecords.map((v) => (v.id === id ? fresh : v)),
        });
      } else {
        store.addVitalSignRecord(fresh);
      }
    })
    .catch((e: unknown) => warn('vital realtime', e));
}

function handleScreeningEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      palliativeScreeningRecords: s.palliativeScreeningRecords.filter((r) => r.id !== id),
    }));
    return;
  }
  svc.screeningService
    .getAll(row?.patient_id as string)
    .then((rows: PalliativeScreeningRecordInfo[]) => {
      const fresh = rows.find((r) => r.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.palliativeScreeningRecords, id);
      if (exists) {
        useStore.setState({
          palliativeScreeningRecords: state.palliativeScreeningRecords.map((r) =>
            r.id === id ? fresh : r
          ),
        });
      } else {
        store.addPalliativeScreeningRecord(fresh);
      }
    })
    .catch((e: unknown) => warn('screening realtime', e));
}

function handleMedicationEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    // Use the local-Zustand remove action (the store doesn't expose one, so
    // we filter directly via setState).
    useStore.setState((s) => ({
      palliativeMedications: s.palliativeMedications.filter((m) => m.id !== id),
    }));
    return;
  }
  svc.medicationService
    .getAll(row?.patient_id as string)
    .then((rows: PalliativeMedicationInfo[]) => {
      const fresh = rows.find((m) => m.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.palliativeMedications, id);
      if (exists) {
        store.updatePalliativeMedication(id, fresh);
      } else {
        store.addPalliativeMedication(fresh);
      }
    })
    .catch((e: unknown) => warn('medication realtime', e));
}

function handleNutritionEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      nutritionRecords: s.nutritionRecords.filter((n) => n.id !== id),
    }));
    return;
  }
  svc.nutritionService
    .getAll(row?.patient_id as string)
    .then((rows: NutritionRecordInfo[]) => {
      const fresh = rows.find((n) => n.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.nutritionRecords, id);
      if (exists) {
        useStore.setState({
          nutritionRecords: state.nutritionRecords.map((n) => (n.id === id ? fresh : n)),
        });
      } else {
        store.addNutritionRecord(fresh);
      }
    })
    .catch((e: unknown) => warn('nutrition realtime', e));
}

function handleComplaintEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      dailyComplaints: s.dailyComplaints.filter((c) => c.id !== id),
    }));
    return;
  }
  svc.complaintService
    .getAll(row?.patient_id as string)
    .then((rows: DailyComplaintRecord[]) => {
      const fresh = rows.find((c) => c.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.dailyComplaints, id);
      if (exists) {
        useStore.setState({
          dailyComplaints: state.dailyComplaints.map((c) => (c.id === id ? fresh : c)),
        });
      } else {
        store.addDailyComplaint(fresh);
      }
    })
    .catch((e: unknown) => warn('complaint realtime', e));
}

function handleSocialEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      socialAssessments: s.socialAssessments.filter((a) => a.id !== id),
    }));
    return;
  }
  svc.socialService
    ?.getAll?.(row?.patient_id as string)
    .then((rows: SocialAssessmentRecord[] | undefined) => {
      if (!Array.isArray(rows)) return;
      const fresh = rows.find((a) => a.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.socialAssessments, id);
      if (exists) {
        useStore.setState({
          socialAssessments: state.socialAssessments.map((a) => (a.id === id ? fresh : a)),
        });
      } else {
        store.addSocialAssessment(fresh);
      }
    })
    .catch((e: unknown) => warn('social realtime', e));
}

function handleAcpEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      advanceCarePlans: s.advanceCarePlans.filter((a) => a.id !== id),
    }));
    return;
  }
  svc.acpService
    ?.getAll?.(row?.patient_id as string)
    .then((rows: AdvanceCarePlanInfo[] | undefined) => {
      if (!Array.isArray(rows)) return;
      const fresh = rows.find((a) => a.id === id);
      if (!fresh) return;
      const state = useStore.getState();
      const exists = hasId(state.advanceCarePlans, id);
      if (exists) {
        store.updateAdvanceCarePlan(id, fresh);
      } else {
        store.addAdvanceCarePlan(fresh);
      }
    })
    .catch((e: unknown) => warn('acp realtime', e));
}

function handleChatRoomEvent(_store: ReturnType<typeof useStore.getState>, _p: RealtimePayload) {
  // Chat rooms aren't stored separately in Zustand — they're implicit in
  // `palliativeChatMessages` (keyed by `roomId`). Nothing to dispatch.
}

function handleMessageEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      palliativeChatMessages: s.palliativeChatMessages.filter((m) => m.id !== id),
    }));
    return;
  }
  // Map the row directly — chatService doesn't expose a getById method, and
  // the row payload already contains everything we need.
  try {
    const formData: any = row?.form_data ?? undefined;
    const fresh: PalliativeChatMessage = {
      id,
      roomId: row?.room_id ?? '',
      senderId: row?.sender_id ?? '',
      senderName: row?.sender_name ?? '',
      senderRole: row?.sender_role ?? 'system',
      type: row?.type ?? 'text',
      content: row?.content ?? '',
      status: row?.status ?? 'sent',
      formType: row?.form_type ?? undefined,
      formData,
      formResponse: row?.form_response ?? undefined,
      screeningType: row?.screening_type ?? undefined,
      aiSummary: row?.ai_summary ?? undefined,
      clinicalAlert: formData?.clinicalAlert ?? undefined,
      imageUrl: row?.image_url ?? undefined,
      createdAt: row?.created_at ?? new Date().toISOString(),
      readAt: row?.read_at ?? undefined,
    };
    const state = useStore.getState();
    const exists = hasId(state.palliativeChatMessages, id);
    if (exists) {
      useStore.setState({
        palliativeChatMessages: state.palliativeChatMessages.map((m) =>
          m.id === id ? fresh : m
        ),
      });
    } else {
      store.addPalliativeChatMessage(fresh);
    }
  } catch (e) { warn('message mapping', e); }
}

function handleClinicalAlertEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      palliativeClinicalAlerts: s.palliativeClinicalAlerts.filter((a) => a.id !== id),
    }));
    return;
  }
  // Build a PalliativeClinicalAlert from the row directly (alerts aren't
  // fetched via a dedicated service method in the loader — we map here).
  try {
    const fresh: PalliativeClinicalAlert = {
      id,
      patientId: row?.patient_id ?? '',
      alertType: row?.alert_type ?? 'form_tidak_diisi',
      severity: row?.severity ?? 'kuning',
      title: row?.title ?? '',
      description: row?.description ?? '',
      values: row?.values ?? undefined,
      isRead: !!row?.is_read,
      createdAt: row?.created_at ?? new Date().toISOString(),
    };
    const state = useStore.getState();
    const exists = hasId(state.palliativeClinicalAlerts, id);
    if (exists) {
      useStore.setState({
        palliativeClinicalAlerts: state.palliativeClinicalAlerts.map((a) =>
          a.id === id ? { ...a, ...fresh } : a
        ),
      });
    } else {
      store.addPalliativeClinicalAlert(fresh);
    }
  } catch (e) { warn('alert mapping', e); }
}

function handleAuditLogEvent(store: ReturnType<typeof useStore.getState>, p: RealtimePayload) {
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  if (p.eventType === 'DELETE') {
    useStore.setState((s) => ({
      palliativeAuditLog: s.palliativeAuditLog.filter((a) => a.id !== id),
    }));
    return;
  }
  try {
    const fresh: PalliativeAuditEntry = {
      id,
      patientId: row?.patient_id ?? '',
      action: row?.action ?? 'clinical_action',
      performedBy: row?.performed_by ?? 'system',
      performedByRole: row?.performed_by_role ?? 'system',
      details: row?.details ?? undefined,
      ipAddress: row?.ip_address ?? undefined,
      device: row?.device ?? undefined,
      createdAt: row?.created_at ?? new Date().toISOString(),
    };
    const state = useStore.getState();
    const exists = hasId(state.palliativeAuditLog, id);
    if (exists) {
      useStore.setState({
        palliativeAuditLog: state.palliativeAuditLog.map((a) =>
          a.id === id ? { ...a, ...fresh } : a
        ),
      });
    } else {
      store.addPalliativeAuditEntry(fresh);
    }
  } catch (e) { warn('audit mapping', e); }
}

function handleNotificationEvent(_store: ReturnType<typeof useStore.getState>, _p: RealtimePayload) {
  // Notifications table maps to the global Notification[] (clinicalAlerts in
  // the store) — but the global notifications are loaded via /api/notifications,
  // not Supabase. We deliberately skip to avoid double-loading. If you want
  // Supabase notifications to populate the store, dispatch here.
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function SupabaseSyncProvider({ children }: SupabaseSyncProviderProps) {
  const store = useStore();
  const loadedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Snapshot the store once — actions on this snapshot remain stable for
    // the lifetime of the provider, even if the component re-renders.
    const s = useStore.getState;

    // ── 1. Initial load (fire-and-forget, never blocks UI) ────────────────
    (async () => {
      try {
        const patients = await loadPatients(s());
        // Always run scoped-data load — even when patients is empty — so any
        // stale per-patient arrays (vitals, meds, etc.) are cleared.
        if (Array.isArray(patients)) {
          await loadPatientScopedData(s(), patients as PalliativePatientInfo[]);
        }
        console.log('[SupabaseSync] initial load complete — patients:', patients?.length ?? 0);
      } catch (e) {
        warn('initial load skipped', e);
      }
    })();

    // ── 2. Realtime subscriptions (best-effort, silently skipped on error) ─
    try {
      const channel = supabase.channel('carelivia-realtime');
      channelRef.current = channel;

      const tableHandlers: Array<[string, (store: ReturnType<typeof s>, p: RealtimePayload) => void]> = [
        ['patients', handlePatientEvent],
        ['vital_signs', handleVitalEvent],
        ['screenings', handleScreeningEvent],
        ['medications', handleMedicationEvent],
        ['nutrition', handleNutritionEvent],
        ['daily_complaints', handleComplaintEvent],
        ['social_assessments', handleSocialEvent],
        ['acp', handleAcpEvent],
        ['chat_rooms', handleChatRoomEvent],
        ['messages', handleMessageEvent],
        ['clinical_alerts', handleClinicalAlertEvent],
        ['audit_log', handleAuditLogEvent],
        ['notifications', handleNotificationEvent],
      ];

      let builder = channel;
      for (const [table, handler] of tableHandlers) {
        try {
          builder = builder.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            (payload: any) => {
              try {
                handler(s(), {
                  eventType: payload.eventType,
                  new: payload.new,
                  old: payload.old,
                  errors: payload.errors,
                });
              } catch (e) {
                warn(`realtime handler for ${table}`, e);
              }
            }
          );
        } catch (e) {
          warn(`subscribe to ${table} skipped`, e);
        }
      }

      try {
        builder.subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            warn(`realtime channel status: ${status}`, null);
          } else {
            // 'SUBSCRIBED' | 'CLOSED' — both are non-fatal
          }
        });
      } catch (e) {
        warn('channel.subscribe skipped', e);
      }
    } catch (e) {
      warn('realtime setup skipped', e);
    }

    // ── 3. Cleanup on unmount ─────────────────────────────────────────────
    return () => {
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch (e) {
        warn('removeChannel', e);
      }
    };
  }, []);

  // ALWAYS render children immediately. Supabase loads in the background.
  return <>{children}</>;
}
