// Firestore Provider — Initializes Firestore and seeds demo data if needed
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import * as firestoreService from '@/lib/firestore-service';
import { seedFirestore } from '@/lib/firestore-seed';
import { firestoreSync } from '@/lib/firestore-sync';
import type {
  PalliativePatientInfo, VitalSignRecordInfo, PalliativeMedicationInfo,
  AdvanceCarePlanInfo, PalliativeScreeningRecordInfo, DailyComplaintRecord,
  NutritionRecordInfo, SocialAssessmentRecord, PalliativeChatMessage,
  PalliativeClinicalAlert, PalliativeAuditEntry, PalliativeResumeMedis,
  CaregiverInfo, EmergencyContact, FamilyMeetingRecord,
  FinancialSupportRecord, TransportRecord, SocialMonitoringAlert,
  FamilyCoordinationNote, EduMaterial,
  WearableDevice, WearableVitalData, RVSMAlert, RVSMPalliativeScoreEstimate,
} from '@/lib/types';

interface FirestoreProviderProps {
  children: React.ReactNode;
}

export function FirestoreProvider({ children }: FirestoreProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribers = useRef<(() => void)[]>([]);
  const isInitialized = useRef(false);

  const store = useStore();

  // Seed Firestore with demo data if empty
  const initializeFirestore = useCallback(async () => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      setIsSeeding(true);
      console.log('[FirestoreProvider] Checking if Firestore needs seeding...');

      // Check if patients collection has data
      const patients = await firestoreService.patientsService.getAll();

      if (patients.length === 0) {
        console.log('[FirestoreProvider] Firestore is empty, seeding demo data...');
        await seedFirestore();
        console.log('[FirestoreProvider] Seeding complete!');
      } else {
        console.log(`[FirestoreProvider] Firestore already has ${patients.length} patients, skipping seed.`);
      }
    } catch (err) {
      console.error('[FirestoreProvider] Error during seeding:', err);
      setError(String(err));
    } finally {
      setIsSeeding(false);
    }
  }, []);

  // Load data from Firestore into Zustand store
  const loadFirestoreDataIntoStore = useCallback(async () => {
    try {
      console.log('[FirestoreProvider] Loading Firestore data into Zustand store...');

      // Load patients
      const patients = await firestoreService.patientsService.getAll();
      if (patients.length > 0) {
        const patientInfos: PalliativePatientInfo[] = patients.map(p => ({
          id: p.id,
          patientId: (p.patientId as string) || p.id,
          patientName: (p.patientName || p.nama || '') as string,
          rmNumber: (p.rmNumber || p.no_rm || '') as string,
          bpjsNumber: (p.bpjsNumber || '') as string,
          primaryDiagnosis: (p.primaryDiagnosis || p.diagnosis || '') as string,
          secondaryDiagnosis: (p.secondaryDiagnosis || '') as string,
          diseaseStage: (p.diseaseStage || '') as string,
          careStatus: (p.careStatus || 'rawat_jalan') as PalliativePatientInfo['careStatus'],
          patientStatus: (p.patientStatus || 'aktif') as PalliativePatientInfo['patientStatus'],
          riskLevel: (p.riskLevel || 'sedang') as PalliativePatientInfo['riskLevel'],
          monitoringStatus: (p.monitoringStatus || 'aktif') as PalliativePatientInfo['monitoringStatus'],
          familyContactName: (p.familyContactName || '') as string,
          familyContactPhone: (p.familyContactPhone || '') as string,
          familyContactRelation: (p.familyContactRelation || '') as string,
          dokterPenanggungJawab: (p.dokterPenanggungJawab || p.dokter_penanggung_jawab || '') as string,
          createdAt: (p.createdAt as string) || new Date().toISOString(),
          updatedAt: (p.updatedAt as string) || new Date().toISOString(),
        }));
        store.setPalliativePatients(patientInfos);
      }

      // For each patient, load subcollections
      for (const patient of patients) {
        const patientId = patient.id;

        // TTV Serial
        try {
          const ttvRecords = await firestoreService.ttvService.getAll(patientId);
          if (ttvRecords.length > 0) {
            const vitals: VitalSignRecordInfo[] = ttvRecords.map(r => ({
              id: r.id,
              palliativePatientId: patientId,
              systolicBP: (r.systolicBP || r.tekanan_darah_sistolik || 0) as number,
              diastolicBP: (r.diastolicBP || r.tekanan_darah_diastolik || 0) as number,
              heartRate: (r.heartRate || r.nadi || 0) as number,
              respiratoryRate: (r.respiratoryRate || r.respirasi || 0) as number,
              temperature: (r.temperature || r.suhu || 0) as number,
              oxygenSat: (r.oxygenSat || r.spo2 || 0) as number,
              weight: (r.weight || r.berat_badan || 0) as number,
              height: (r.height || r.tinggi_badan || 0) as number,
              bmi: (r.bmi || 0) as number,
              recordedBy: (r.recordedBy || '') as string,
              recordedAt: (r.recordedAt || r.tanggal || r.createdAt || '') as string,
            }));
            // Merge into store (don't replace existing)
            for (const v of vitals) {
              const exists = store.vitalSignRecords.some(r => r.id === v.id);
              if (!exists) store.addVitalSignRecord(v);
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading TTV for ${patientId}:`, err);
        }

        // Keluhan Harian
        try {
          const keluhanRecords = await firestoreService.keluhanService.getAll(patientId);
          if (keluhanRecords.length > 0) {
            const complaints: DailyComplaintRecord[] = keluhanRecords.map(r => ({
              id: r.id,
              palliativePatientId: patientId,
              kondisiHariIni: (r.kondisiHariIni || '') as string,
              alasanKondisi: (r.alasanKondisi || '') as string,
              keluhanBaru: (r.keluhanBaru || '') as string,
              deskripsiKeluhanBaru: (r.deskripsiKeluhanBaru || '') as string,
              kondisiNyeri: (r.kondisiNyeri || '') as string,
              kondisiSesak: (r.kondisiSesak || '') as string,
              makanMinum: (r.makanMinum || '') as string,
              alasanMakanMinum: (r.alasanMakanMinum || '') as string,
              tidur: (r.tidur || '') as string,
              alasanTidur: (r.alasanTidur || '') as string,
              masalahObat: (r.masalahObat || '') as string,
              deskripsiMasalahObat: (r.deskripsiMasalahObat || '') as string,
              severityLevel: (r.severityLevel || 'ringan') as DailyComplaintRecord['severityLevel'],
              sumberPengisian: (r.sumberPengisian || 'manual') as DailyComplaintRecord['sumberPengisian'],
              submittedAt: (r.submittedAt || r.tanggal || r.createdAt || '') as string,
              createdAt: (r.createdAt as string) || new Date().toISOString(),
            }));
            store.setDailyComplaints(complaints);
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading keluhan for ${patientId}:`, err);
        }

        // Obat
        try {
          const obatRecords = await firestoreService.obatService.getAll(patientId);
          if (obatRecords.length > 0) {
            for (const r of obatRecords) {
              const exists = store.palliativeMedications.some(m => m.id === r.id);
              if (!exists) {
                store.addPalliativeMedication({
                  id: r.id,
                  palliativePatientId: patientId,
                  medicineName: (r.medicineName || '') as string,
                  dosage: (r.dosage || '') as string,
                  frequency: (r.frequency || '') as string,
                  route: (r.route || 'oral') as PalliativeMedicationInfo['route'],
                  startDate: (r.startDate || '') as string,
                  endDate: (r.endDate || '') as string,
                  isActive: (r.isActive ?? true) as boolean,
                  notes: (r.notes || '') as string,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading obat for ${patientId}:`, err);
        }

        // Skrining
        try {
          const skriningRecords = await firestoreService.skriningService.getAll(patientId);
          if (skriningRecords.length > 0) {
            for (const r of skriningRecords) {
              const exists = store.palliativeScreeningRecords.some(s => s.id === r.id);
              if (!exists) {
                store.addPalliativeScreeningRecord({
                  id: r.id,
                  palliativePatientId: patientId,
                  screeningType: (r.screeningType || 'esas') as PalliativeScreeningRecordInfo['screeningType'],
                  score: (r.score || 0) as number,
                  scoreLabel: (r.scoreLabel || '') as string,
                  ewsLevel: (r.ewsLevel || 'rendah') as PalliativeScreeningRecordInfo['ewsLevel'],
                  interpretation: (r.interpretation || '') as string,
                  details: (r.details || {}) as Record<string, unknown>,
                  screenedAt: (r.screenedAt || r.tanggal || r.createdAt || '') as string,
                  screenedBy: (r.screenedBy || '') as string,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading skrining for ${patientId}:`, err);
        }

        // ACP
        try {
          const acpRecords = await firestoreService.acpService.getAll(patientId);
          if (acpRecords.length > 0) {
            for (const r of acpRecords) {
              const exists = store.advanceCarePlans.some(a => a.id === r.id);
              if (!exists) {
                store.addAdvanceCarePlan({
                  id: r.id,
                  palliativePatientId: patientId,
                  decisionMakerName: (r.decisionMakerName || '') as string,
                  decisionMakerRelation: (r.decisionMakerRelation || '') as string,
                  preferredCareLocation: (r.preferredCareLocation || r.tempat_perawatan || '') as string,
                  careGoal: (r.careGoal || r.tujuan_perawatan || '') as string,
                  resuscitationPref: (r.resuscitationPref || r.dnr || 'tidak') as AdvanceCarePlanInfo['resuscitationPref'],
                  ventilatorPref: (r.ventilatorPref || 'tidak') as AdvanceCarePlanInfo['ventilatorPref'],
                  icuPref: (r.icuPref || 'tidak') as AdvanceCarePlanInfo['icuPref'],
                  patientHopes: (r.patientHopes || '') as string,
                  patientWorries: (r.patientWorries || '') as string,
                  isSignedByPatient: (r.isSignedByPatient ?? false) as boolean,
                  isSignedByFamily: (r.isSignedByFamily ?? false) as boolean,
                  isSignedByDoctor: (r.isSignedByDoctor ?? false) as boolean,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                  updatedAt: (r.updatedAt as string) || new Date().toISOString(),
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading ACP for ${patientId}:`, err);
        }

        // Nutrisi
        try {
          const nutrisiRecords = await firestoreService.nutrisiService.getAll(patientId);
          if (nutrisiRecords.length > 0) {
            for (const r of nutrisiRecords) {
              const exists = store.nutritionRecords.some(n => n.id === r.id);
              if (!exists) {
                store.addNutritionRecord({
                  id: r.id,
                  palliativePatientId: patientId,
                  age: (r.age || 0) as number,
                  gender: (r.gender || 'Perempuan') as string,
                  weight: (r.weight || r.berat_badan || 0) as number,
                  height: (r.height || r.tinggi_badan || 0) as number,
                  bmi: (r.bmi || 0) as number,
                  activityLevel: (r.activityLevel || 'bed_rest') as NutritionRecordInfo['activityLevel'],
                  metabolicStress: (r.metabolicStress || 'ringan') as NutritionRecordInfo['metabolicStress'],
                  specialCondition: (r.specialCondition || 'tidak_ada') as NutritionRecordInfo['specialCondition'],
                  totalCalorieNeeds: (r.totalCalorieNeeds || r.kebutuhan_kalori || 0) as number,
                  statusGizi: (r.statusGizi || r.status_gizi || 'normal') as string,
                  recordedAt: (r.recordedAt || r.tanggal || r.createdAt || '') as string,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading nutrisi for ${patientId}:`, err);
        }

        // Sosial
        try {
          const sosialRecords = await firestoreService.sosialService.getAll(patientId);
          if (sosialRecords.length > 0) {
            for (const r of sosialRecords) {
              const exists = store.socialAssessments.some(s => s.id === r.id);
              if (!exists) {
                store.addSocialAssessment({
                  id: r.id,
                  palliativePatientId: patientId,
                  housingCondition: (r.housingCondition || '') as string,
                  caregiverAvailability: (r.caregiverAvailability || r.caregiver || '') as string,
                  familySupportLevel: (r.familySupportLevel || r.dukungan_keluarga || '') as string,
                  transportDifficulty: (r.transportDifficulty || '') as string,
                  economicConstraint: (r.economicConstraint || r.kondisi_ekonomi || '') as string,
                  kebutuhanSosial: (r.kebutuhanSosial || r.kebutuhan_sosial || '') as string,
                  assessedAt: (r.assessedAt || r.createdAt || '') as string,
                  assessedBy: (r.assessedBy || '') as string,
                } as SocialAssessmentRecord);
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading sosial for ${patientId}:`, err);
        }

        // Chat Messages
        try {
          const chatRecords = await firestoreService.chatService.getAll(patientId);
          if (chatRecords.length > 0) {
            for (const r of chatRecords) {
              const exists = store.palliativeChatMessages.some(m => m.id === r.id);
              if (!exists) {
                store.addPalliativeChatMessage({
                  id: r.id,
                  palliativePatientId: patientId,
                  type: (r.type || 'text') as PalliativeChatMessage['type'],
                  content: (r.content || '') as string,
                  senderId: (r.senderId || '') as string,
                  senderName: (r.senderName || '') as string,
                  formData: r.formData as Record<string, unknown> | undefined,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading chat for ${patientId}:`, err);
        }

        // Clinical Alerts
        try {
          const alertRecords = await firestoreService.clinicalAlertsService.getAll(patientId);
          if (alertRecords.length > 0) {
            for (const r of alertRecords) {
              const exists = store.palliativeClinicalAlerts.some(a => a.id === r.id);
              if (!exists) {
                store.addPalliativeClinicalAlert({
                  id: r.id,
                  palliativePatientId: patientId,
                  alertType: (r.alertType || 'warning') as PalliativeClinicalAlert['alertType'],
                  severity: (r.severity || 'sedang') as PalliativeClinicalAlert['severity'],
                  title: (r.title || '') as string,
                  description: (r.description || '') as string,
                  isRead: (r.isRead ?? false) as boolean,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading alerts for ${patientId}:`, err);
        }

        // Resumes
        try {
          const resumeRecords = await firestoreService.resumeService.getAll(patientId);
          if (resumeRecords.length > 0) {
            for (const r of resumeRecords) {
              const exists = store.palliativeResumes.some(res => res.id === r.id);
              if (!exists) {
                store.addPalliativeResume({
                  id: r.id,
                  palliativePatientId: patientId,
                  documentNumber: (r.documentNumber || '') as string,
                  generatedBy: (r.generatedBy || '') as string,
                  generatedAt: (r.generatedAt || r.createdAt || '') as string,
                  resumeData: (r.resumeData || {}) as PalliativeResumeMedis['resumeData'],
                  fullContent: (r.fullContent || '') as string,
                  version: (r.version || 1) as number,
                  isSigned: (r.isSigned ?? false) as boolean,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading resumes for ${patientId}:`, err);
        }

        // Audit Entries
        try {
          const auditRecords = await firestoreService.auditService.getAll(patientId);
          if (auditRecords.length > 0) {
            for (const r of auditRecords) {
              const exists = store.palliativeAuditLog.some(a => a.id === r.id);
              if (!exists) {
                store.addPalliativeAuditEntry({
                  id: r.id,
                  action: (r.action || '') as string,
                  performedBy: (r.performedBy || '') as string,
                  performedAt: (r.performedAt || r.createdAt || '') as string,
                  details: (r.details || '') as string,
                  patientId: patientId,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[FirestoreProvider] Error loading audit for ${patientId}:`, err);
        }
      }

      console.log('[FirestoreProvider] Firestore data loaded into store successfully!');
    } catch (err) {
      console.error('[FirestoreProvider] Error loading Firestore data:', err);
      setError(String(err));
    }
  }, [store]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirestore();
        await loadFirestoreDataIntoStore();
        setIsReady(true);
      } catch (err) {
        console.error('[FirestoreProvider] Initialization failed:', err);
        setError(String(err));
        // Still mark as ready so the app loads with Zustand demo data as fallback
        setIsReady(true);
      }
    };

    init();

    // Cleanup real-time listeners on unmount
    return () => {
      unsubscribers.current.forEach(unsub => unsub());
      unsubscribers.current = [];
    };
  }, [initializeFirestore, loadFirestoreDataIntoStore]);

  // Show loading state while initializing
  if (isSeeding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent border-[#2D8C7A] rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Menginisialisasi Database</h2>
          <p className="text-sm text-muted-foreground">Menyiapkan Firestore dan memuat data...</p>
        </div>
      </div>
    );
  }

  if (error && !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Koneksi Database Gagal</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2D8C7A] text-white rounded-lg text-sm font-medium hover:bg-[#1F6B5C] transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
