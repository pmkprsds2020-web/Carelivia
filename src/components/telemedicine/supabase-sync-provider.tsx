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
        // Read CURRENT state (not the stale snapshot) so we don't overwrite
        // other patients' data that was loaded in a previous iteration.
        const cur = useStore.getState().vitalSignRecords;
        const others = cur.filter((v) => v.palliativePatientId !== pid);
        useStore.setState({
          vitalSignRecords: [...others, ...(rows as VitalSignRecordInfo[])],
        });
      }
    } catch (e) { warn('vitalService.getAll', e); }

    // Screenings
    try {
      const rows = await svc.screeningService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const cur = useStore.getState().palliativeScreeningRecords;
        const others = cur.filter((s) => s.palliativePatientId !== pid);
        useStore.setState({
          palliativeScreeningRecords: [...others, ...(rows as PalliativeScreeningRecordInfo[])],
        });
      }
    } catch (e) { warn('screeningService.getAll', e); }

    // Medications
    try {
      const rows = await svc.medicationService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const cur = useStore.getState().palliativeMedications;
        const others = cur.filter((m) => m.palliativePatientId !== pid);
        useStore.setState({
          palliativeMedications: [...others, ...(rows as PalliativeMedicationInfo[])],
        });
      }
    } catch (e) { warn('medicationService.getAll', e); }

    // Nutrition
    try {
      const rows = await svc.nutritionService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const cur = useStore.getState().nutritionRecords;
        const others = cur.filter((n) => n.palliativePatientId !== pid);
        useStore.setState({
          nutritionRecords: [...others, ...(rows as NutritionRecordInfo[])],
        });
      }
    } catch (e) { warn('nutritionService.getAll', e); }

    // Daily complaints
    try {
      const rows = await svc.complaintService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const cur = useStore.getState().dailyComplaints;
        const others = cur.filter((c) => c.palliativePatientId !== pid);
        useStore.setState({
          dailyComplaints: [...others, ...(rows as DailyComplaintRecord[])],
        });
      }
    } catch (e) { warn('complaintService.getAll', e); }

    // Social assessments
    try {
      const rows = await svc.socialService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const cur = useStore.getState().socialAssessments;
        const others = cur.filter((s) => s.palliativePatientId !== pid);
        useStore.setState({
          socialAssessments: [...others, ...(rows as SocialAssessmentRecord[])],
        });
      }
    } catch (e) { warn('socialService.getAll', e); }

    // ACP
    try {
      const rows = await svc.acpService.getAll(pid);
      if (Array.isArray(rows) && rows.length > 0) {
        const cur = useStore.getState().advanceCarePlans;
        const others = cur.filter((a) => a.palliativePatientId !== pid);
        useStore.setState({
          advanceCarePlans: [...others, ...(rows as AdvanceCarePlanInfo[])],
        });
      }
    } catch (e) { warn('acpService.getAll', e); }

    // Caregivers
    try {
      const rows = await svc.caregiverService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().caregivers;
        const others = cur.filter((c) => c.palliativePatientId !== pid);
        useStore.setState({
          caregivers: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('caregiverService.getAll', e); }

    // Family meetings
    try {
      const rows = await svc.familyMeetingService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().familyMeetings;
        const others = cur.filter((m) => m.palliativePatientId !== pid);
        useStore.setState({
          familyMeetings: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('familyMeetingService.getAll', e); }

    // Family coordination notes
    try {
      const rows = await svc.familyCoordinationNoteService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().familyCoordinationNotes;
        const others = cur.filter((n) => n.palliativePatientId !== pid);
        useStore.setState({
          familyCoordinationNotes: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('familyCoordinationNoteService.getAll', e); }

    // Emergency contacts
    try {
      const rows = await svc.emergencyContactService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().emergencyContacts;
        const others = cur.filter((c) => c.palliativePatientId !== pid);
        useStore.setState({
          emergencyContacts: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('emergencyContactService.getAll', e); }

    // Financial support
    try {
      const rows = await svc.financialSupportService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().financialSupportRecords;
        const others = cur.filter((r) => r.palliativePatientId !== pid);
        useStore.setState({
          financialSupportRecords: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('financialSupportService.getAll', e); }

    // Transport records
    try {
      const rows = await svc.transportRecordService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().transportRecords;
        const others = cur.filter((r) => r.palliativePatientId !== pid);
        useStore.setState({
          transportRecords: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('transportRecordService.getAll', e); }

    // Family support materials
    try {
      const rows = await svc.familySupportMaterialService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().familySupportMaterials;
        const others = cur.filter((m) => m.palliativePatientId !== pid);
        useStore.setState({
          familySupportMaterials: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('familySupportMaterialService.getAll', e); }

    // Palliative resumes
    try {
      const rows = await svc.palliativeResumeService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().palliativeResumes;
        const others = cur.filter((r) => r.palliativePatientId !== pid);
        useStore.setState({
          palliativeResumes: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('palliativeResumeService.getAll', e); }

    // Referral letters
    try {
      const rows = await svc.referralLetterService.getAll(pid);
      if (Array.isArray(rows)) {
        const cur = useStore.getState().palliativeReferralLetters;
        const others = cur.filter((l) => l.palliativePatientId !== pid);
        useStore.setState({
          palliativeReferralLetters: [...others, ...(rows as any[])],
        });
      }
    } catch (e) { warn('referralLetterService.getAll', e); }

    // Patient documents (Pemeriksaan Penunjang)
    try {
      const rows = await svc.documentService.list(pid);
      if (Array.isArray(rows)) {
        const cur = (useStore.getState() as any).patientDocuments ?? [];
        const others = cur.filter((d: any) => d.patientId !== pid);
        useStore.setState({
          patientDocuments: [...others, ...(rows as any[])],
        } as any);
      }
    } catch (e) { warn('documentService.list', e); }

    // Clinical alerts — loaded via direct Supabase query (the sibling agent's
    // notificationService is for user notifications, not clinical alerts).
    // CRITICAL: use useStore.setState directly (NOT store.addPalliativeClinicalAlert)
    // because addPalliativeClinicalAlert calls firestoreSync.addClinicalAlert
    // which would RE-INSERT every loaded row back into Supabase, creating
    // duplicates on every page load.
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
        const mapped: PalliativeClinicalAlert[] = [];
        const existingIds = new Set(useStore.getState().palliativeClinicalAlerts.map((a) => a.id));
        for (const r of rows as any[]) {
          const v = (r.values ?? {}) as Record<string, any>;
          const alert: PalliativeClinicalAlert = {
            id: r.id,
            patientId: r.patient_id ?? pid,
            palliativePatientId: r.patient_id ?? undefined,
            alertType: r.alert_type ?? 'clinical_alert',
            severity: r.severity ?? 'kuning',
            title: r.title ?? '',
            description: r.description ?? '',
            values: v,
            isRead: !!r.is_read,
            createdAt: r.created_at ?? new Date().toISOString(),
            // Rich EWS fields from JSONB
            severityLevel: v.severityLevel ?? (r.severity === 'merah' ? 'CRITICAL' : r.severity === 'kuning' ? 'MEDIUM' : 'LOW'),
            status: v.status ?? (r.is_read ? 'ACKNOWLEDGED' : 'ACTIVE'),
            sourceModule: v.sourceModule ?? 'manual',
            sourceRecordId: v.sourceRecordId ?? undefined,
            kategori: v.kategori ?? undefined,
            recommendation: v.recommendation ?? undefined,
            acknowledgedBy: v.acknowledgedBy ?? undefined,
            acknowledgedAt: v.acknowledgedAt ?? undefined,
            resolvedBy: v.resolvedBy ?? undefined,
            resolvedAt: v.resolvedAt ?? undefined,
            doctorId: v.doctorId ?? undefined,
            notes: v.notes ?? undefined,
          };
          if (!existingIds.has(alert.id)) {
            mapped.push(alert);
          }
        }
        if (mapped.length > 0) {
          useStore.setState((s) => ({
            palliativeClinicalAlerts: [...mapped, ...s.palliativeClinicalAlerts],
          }));
        }
      }
    } catch (e) { warn('clinical_alerts load', e); }

    // Audit log — same pattern, direct Supabase query.
    // CRITICAL: use useStore.setState directly (NOT store.addPalliativeAuditEntry)
    // because addPalliativeAuditEntry calls firestoreSync.addAuditEntry which
    // would RE-INSERT every loaded row back into Supabase.
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
        const mapped: PalliativeAuditEntry[] = [];
        const existingIds = new Set(useStore.getState().palliativeAuditLog.map((a) => a.id));
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
          if (!existingIds.has(entry.id)) {
            mapped.push(entry);
          }
        }
        if (mapped.length > 0) {
          useStore.setState((s) => ({
            palliativeAuditLog: [...mapped, ...s.palliativeAuditLog],
          }));
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
        // Local-only — this row already reflects what's in the database.
        // Routing it through the persisting updatePalliativePatient() here
        // would immediately PATCH it right back to Supabase, which fires
        // ANOTHER realtime UPDATE event, which lands back in this handler
        // again — an infinite update↔realtime loop that floods the network
        // until the browser refuses new connections (ERR_INSUFFICIENT_
        // RESOURCES) and the whole app appears to hang.
        useStore.getState().updatePalliativePatientLocal(id, fresh);
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
        // Use setState directly (NOT store.addVitalSignRecord) so we don't
        // trigger firestoreSync.addTTV (duplicate INSERT) or
        // runClinicalAlertEngine (scan loop). Realtime rows are already in
        // Supabase — we only need to mirror them into the local store.
        useStore.setState((s) => ({
          vitalSignRecords: [...s.vitalSignRecords, fresh],
        }));
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
        // Use setState directly (NOT store.addPalliativeScreeningRecord) so
        // we don't trigger a duplicate Supabase insert or scan loop.
        useStore.setState((s) => ({
          palliativeScreeningRecords: [...s.palliativeScreeningRecords, fresh],
        }));
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
        // Use setState directly (NOT store.updatePalliativeMedication) to
        // avoid a duplicate Supabase update.
        useStore.setState({
          palliativeMedications: state.palliativeMedications.map((m) =>
            m.id === id ? { ...m, ...fresh, updatedAt: new Date().toISOString() } : m
          ),
        });
      } else {
        // Use setState directly (NOT store.addPalliativeMedication) so we
        // don't trigger a duplicate Supabase insert or scan loop.
        useStore.setState((s) => ({
          palliativeMedications: [...s.palliativeMedications, fresh],
        }));
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
        // Use setState directly (NOT store.addNutritionRecord) so we don't
        // trigger a duplicate Supabase insert or scan loop.
        useStore.setState((s) => ({
          nutritionRecords: [...s.nutritionRecords, fresh],
        }));
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
        // Use setState directly (NOT store.addDailyComplaint) for consistency
        // — even though addDailyComplaint doesn't call firestoreSync, using
        // setState keeps the realtime path uniform and side-effect-free.
        useStore.setState((s) => ({
          dailyComplaints: [fresh, ...s.dailyComplaints],
        }));
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
        // Use setState directly (NOT store.addSocialAssessment) to avoid a
        // duplicate Supabase insert (addSocialAssessment calls firestoreSync).
        useStore.setState((s) => ({
          socialAssessments: [...s.socialAssessments, fresh],
        }));
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
        // Local-only via setState — NOT store.updateAdvanceCarePlan, which
        // would PATCH this row straight back to Supabase and re-trigger
        // this very event (see handlePatientEvent's comment for the full
        // infinite-loop explanation).
        useStore.setState({
          advanceCarePlans: state.advanceCarePlans.map((a) => (a.id === id ? fresh : a)),
        });
      } else {
        // Local-only — NOT store.addAdvanceCarePlan, for the same reason.
        useStore.setState((s) => ({
          advanceCarePlans: [...s.advanceCarePlans, fresh],
        }));
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
      palliativePatientId: row?.patient_id ?? undefined,
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
      // Use setState directly (not store.addPalliativeChatMessage) so we don't
      // trigger a duplicate Supabase insert for realtime-delivered rows.
      useStore.setState((s) => ({
        palliativeChatMessages: [...s.palliativeChatMessages, fresh],
      }));
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
  // Build a PalliativeClinicalAlert from the row directly, including rich EWS
  // fields stored in the `values` JSONB column.
  try {
    const v = (row?.values ?? {}) as Record<string, any>;
    const fresh: PalliativeClinicalAlert = {
      id,
      patientId: row?.patient_id ?? '',
      palliativePatientId: row?.patient_id ?? undefined,
      alertType: row?.alert_type ?? 'clinical_alert',
      severity: row?.severity ?? 'kuning',
      title: row?.title ?? '',
      description: row?.description ?? '',
      values: v,
      isRead: !!row?.is_read,
      createdAt: row?.created_at ?? new Date().toISOString(),
      severityLevel: v.severityLevel ?? (row?.severity === 'merah' ? 'CRITICAL' : row?.severity === 'kuning' ? 'MEDIUM' : 'LOW'),
      status: v.status ?? (row?.is_read ? 'ACKNOWLEDGED' : 'ACTIVE'),
      sourceModule: v.sourceModule ?? 'manual',
      sourceRecordId: v.sourceRecordId ?? undefined,
      kategori: v.kategori ?? undefined,
      recommendation: v.recommendation ?? undefined,
      acknowledgedBy: v.acknowledgedBy ?? undefined,
      acknowledgedAt: v.acknowledgedAt ?? undefined,
      resolvedBy: v.resolvedBy ?? undefined,
      resolvedAt: v.resolvedAt ?? undefined,
      doctorId: v.doctorId ?? undefined,
      notes: v.notes ?? undefined,
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
      // Use setState directly (not store.addPalliativeClinicalAlert) to avoid
      // triggering a duplicate Supabase insert for realtime-delivered rows.
      useStore.setState((s) => ({
        palliativeClinicalAlerts: [fresh, ...s.palliativeClinicalAlerts],
      }));
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
      // Use setState directly (not store.addPalliativeAuditEntry) to avoid
      // triggering a duplicate Supabase insert for realtime-delivered rows
      // (this previously re-persisted every incoming audit row right back
      // to Supabase, since addPalliativeAuditEntry itself calls addAuditEntry).
      useStore.setState((s) => ({
        palliativeAuditLog: [...s.palliativeAuditLog, fresh],
      }));
    }
  } catch (e) { warn('audit mapping', e); }
}

function handleNotificationEvent(_store: ReturnType<typeof useStore.getState>, _p: RealtimePayload) {
  // Notifications table maps to the global Notification[] (clinicalAlerts in
  // the store) — but the global notifications are loaded via /api/notifications,
  // not Supabase. We deliberately skip to avoid double-loading. If you want
  // Supabase notifications to populate the store, dispatch here.
}

// ─── Generic realtime handlers for the new modules ─────────────────────────
//
// These tables (caregivers, family_meetings, family_coordination_notes,
// emergency_contacts, financial_support, transport_records, palliative_resumes,
// referral_letters, patient_documents) all follow the same pattern:
//   - DELETE → filter the matching array by id
//   - INSERT/UPDATE → reload via the service's getAll(patientId) and
//     upsert the fresh row into the store array.
//
// We use a factory so each table gets its own typed handler without duplicating
// the boilerplate.

function makeGenericHandler<T extends { id: string; palliativePatientId?: string }>(opts: {
  label: string;
  getState: () => T[];
  setState: (updater: (cur: T[]) => T[]) => void;
  reload: (patientId: string) => Promise<T[]>;
}): (store: ReturnType<typeof useStore.getState>, p: RealtimePayload) => void {
  return (_store, p) => {
    const row = p.new;
    const id = (row?.id ?? p.old?.id) as string | undefined;
    if (!id) return;
    const patientId = (row?.patient_id ?? row?.palliativePatientId ?? p.old?.patient_id) as string | undefined;
    if (p.eventType === 'DELETE') {
      opts.setState((cur) => cur.filter((x) => x.id !== id));
      return;
    }
    if (!patientId) return;
    opts
      .reload(patientId)
      .then((rows) => {
        const fresh = rows.find((r) => r.id === id);
        if (!fresh) return;
        opts.setState((cur) => {
          const exists = cur.some((x) => x.id === id);
          return exists ? cur.map((x) => (x.id === id ? fresh : x)) : [...cur, fresh];
        });
      })
      .catch((e: unknown) => warn(`realtime ${opts.label}`, e));
  };
}

const handleCaregiverEvent = makeGenericHandler({
  label: 'caregivers',
  getState: () => useStore.getState().caregivers as any[],
  setState: (updater) => useStore.setState((s) => ({ caregivers: updater(s.caregivers as any[]) as any })),
  reload: (pid) => svc.caregiverService.getAll(pid) as Promise<any[]>,
});

const handleFamilyMeetingEvent = makeGenericHandler({
  label: 'family_meetings',
  getState: () => useStore.getState().familyMeetings as any[],
  setState: (updater) => useStore.setState((s) => ({ familyMeetings: updater(s.familyMeetings as any[]) as any })),
  reload: (pid) => svc.familyMeetingService.getAll(pid) as Promise<any[]>,
});

const handleFamilyCoordinationNoteEvent = makeGenericHandler({
  label: 'family_coordination_notes',
  getState: () => useStore.getState().familyCoordinationNotes as any[],
  setState: (updater) => useStore.setState((s) => ({ familyCoordinationNotes: updater(s.familyCoordinationNotes as any[]) as any })),
  reload: (pid) => svc.familyCoordinationNoteService.getAll(pid) as Promise<any[]>,
});

const handleEmergencyContactEvent = makeGenericHandler({
  label: 'emergency_contacts',
  getState: () => useStore.getState().emergencyContacts as any[],
  setState: (updater) => useStore.setState((s) => ({ emergencyContacts: updater(s.emergencyContacts as any[]) as any })),
  reload: (pid) => svc.emergencyContactService.getAll(pid) as Promise<any[]>,
});

const handleFinancialSupportEvent = makeGenericHandler({
  label: 'financial_support',
  getState: () => useStore.getState().financialSupportRecords as any[],
  setState: (updater) => useStore.setState((s) => ({ financialSupportRecords: updater(s.financialSupportRecords as any[]) as any })),
  reload: (pid) => svc.financialSupportService.getAll(pid) as Promise<any[]>,
});

const handleTransportRecordEvent = makeGenericHandler({
  label: 'transport_records',
  getState: () => useStore.getState().transportRecords as any[],
  setState: (updater) => useStore.setState((s) => ({ transportRecords: updater(s.transportRecords as any[]) as any })),
  reload: (pid) => svc.transportRecordService.getAll(pid) as Promise<any[]>,
});

const handleFamilySupportMaterialEvent = makeGenericHandler({
  label: 'family_support_materials',
  getState: () => useStore.getState().familySupportMaterials as any[],
  setState: (updater) => useStore.setState((s) => ({ familySupportMaterials: updater(s.familySupportMaterials as any[]) as any })),
  reload: (pid) => svc.familySupportMaterialService.getAll(pid) as Promise<any[]>,
});

const handlePalliativeResumeEvent = makeGenericHandler({
  label: 'palliative_resumes',
  getState: () => useStore.getState().palliativeResumes as any[],
  setState: (updater) => useStore.setState((s) => ({ palliativeResumes: updater(s.palliativeResumes as any[]) as any })),
  reload: (pid) => svc.palliativeResumeService.getAll(pid) as Promise<any[]>,
});

const handleReferralLetterEvent = makeGenericHandler({
  label: 'referral_letters',
  getState: () => useStore.getState().palliativeReferralLetters as any[],
  setState: (updater) => useStore.setState((s) => ({ palliativeReferralLetters: updater(s.palliativeReferralLetters as any[]) as any })),
  reload: (pid) => svc.referralLetterService.getAll(pid) as Promise<any[]>,
});

const handlePatientDocumentEvent = (_store: ReturnType<typeof useStore.getState>, p: RealtimePayload) => {
  // patient_documents uses `patientId` (not `palliativePatientId`) on the TS
  // side, so we handle it inline rather than via the generic factory.
  const row = p.new;
  const id = (row?.id ?? p.old?.id) as string | undefined;
  if (!id) return;
  const patientId = (row?.patient_id ?? p.old?.patient_id) as string | undefined;
  if (p.eventType === 'DELETE') {
    const cur = (useStore.getState() as any).patientDocuments ?? [];
    useStore.setState({ patientDocuments: cur.filter((d: any) => d.id !== id) } as any);
    return;
  }
  if (!patientId) return;
  svc.documentService
    .list(patientId)
    .then((rows) => {
      const fresh = rows.find((r) => r.id === id);
      if (!fresh) return;
      const cur = (useStore.getState() as any).patientDocuments ?? [];
      const exists = cur.some((d: any) => d.id === id);
      useStore.setState({
        patientDocuments: exists ? cur.map((d: any) => (d.id === id ? fresh : d)) : [...cur, fresh],
      } as any);
    })
    .catch((e: unknown) => warn('realtime patient_documents', e));
};

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

      // ── 1b. One-time duplicate-alert cleanup ───────────────────────────
      // The old engine had a bug that created thousands of duplicate alerts.
      // Even though the engine is now fixed, we need to clean up the existing
      // duplicates in the database. This runs once on startup (best-effort).
      (async () => {
        try {
          const { clinicalAlertService } = await import('@/services/supabase/clinicalAlertService');
          const deleted = await clinicalAlertService.cleanupDuplicates();
          if (deleted > 0) {
            console.log(`[SupabaseSync] auto-cleanup: removed ${deleted} duplicate clinical alerts.`);
            // Reload alerts into the store after cleanup so the UI reflects
            // the cleaned state.
            const freshAlerts = await clinicalAlertService.getAll(1000);
            useStore.setState({ palliativeClinicalAlerts: freshAlerts });
          }
        } catch (e) {
          warn('auto-cleanup duplicates', e);
        }
      })();
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
        // ── New modules — full realtime sync ──────────────────────────────
        ['caregivers', handleCaregiverEvent],
        ['family_meetings', handleFamilyMeetingEvent],
        ['family_coordination_notes', handleFamilyCoordinationNoteEvent],
        ['emergency_contacts', handleEmergencyContactEvent],
        ['financial_support', handleFinancialSupportEvent],
        ['transport_records', handleTransportRecordEvent],
        ['family_support_materials', handleFamilySupportMaterialEvent],
        ['palliative_resumes', handlePalliativeResumeEvent],
        ['referral_letters', handleReferralLetterEvent],
        ['patient_documents', handlePatientDocumentEvent],
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
