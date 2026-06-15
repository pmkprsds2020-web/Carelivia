// Firestore Provider — Non-blocking: loads Firestore data in the background
// The app renders immediately with Zustand demo data as fallback.
// Firestore data syncs in once available.
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import * as firestoreService from '@/lib/firestore-service';
import { seedFirestore } from '@/lib/firestore-seed';
import type {
  PalliativePatientInfo, VitalSignRecordInfo, PalliativeMedicationInfo,
  AdvanceCarePlanInfo, PalliativeScreeningRecordInfo, DailyComplaintRecord,
  NutritionRecordInfo, SocialAssessmentRecord, PalliativeChatMessage,
  PalliativeClinicalAlert, PalliativeAuditEntry, PalliativeResumeMedis,
} from '@/lib/types';

interface FirestoreProviderProps {
  children: React.ReactNode;
}

export function FirestoreProvider({ children }: FirestoreProviderProps) {
  const unsubscribers = useRef<(() => void)[]>([]);
  const isInitialized = useRef(false);
  const store = useStore();

  // Seed Firestore with demo data if empty (non-blocking)
  const initializeFirestore = useCallback(async () => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      console.log('[FirestoreProvider] Checking if Firestore needs seeding...');

      // Add a timeout so we don't hang forever
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('[FirestoreProvider] Firestore check timed out, using local data');
          resolve(null);
        }, 8000);
      });

      const patients = await Promise.race([
        firestoreService.patientsService.getAll(),
        timeoutPromise,
      ]);

      if (patients === null) {
        console.log('[FirestoreProvider] Timed out — app works with local demo data');
        return;
      }

      if (patients.length === 0) {
        console.log('[FirestoreProvider] Firestore is empty, seeding demo data...');
        await seedFirestore();
        console.log('[FirestoreProvider] Seeding complete!');
      } else {
        console.log(`[FirestoreProvider] Firestore already has ${patients.length} patients, skipping seed.`);
      }
    } catch (err) {
      console.warn('[FirestoreProvider] Firestore init skipped (offline or rules):', err);
      // Non-blocking: app continues with local Zustand data
    }
  }, []);

  // Load data from Firestore into Zustand store (non-blocking, best-effort)
  const loadFirestoreDataIntoStore = useCallback(async () => {
    try {
      console.log('[FirestoreProvider] Loading Firestore data into Zustand store (background)...');

      // Add a timeout for the entire data load
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('[FirestoreProvider] Data load timed out, using local data');
          resolve();
        }, 15000);
      });

      const loadPromise = async () => {
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

        // For each patient, load subcollections (best-effort, skip on error)
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
                createdAt: (r.createdAt as string) || new Date().toISOString(),
              }));
              for (const v of vitals) {
                const exists = store.vitalSignRecords.some(r => r.id === v.id);
                if (!exists) store.addVitalSignRecord(v);
              }
            }
          } catch { /* skip */ }

          // Keluhan Harian
          try {
            const keluhanRecords = await firestoreService.keluhanService.getAll(patientId);
            if (keluhanRecords.length > 0) {
              const complaints: DailyComplaintRecord[] = keluhanRecords.map(r => ({
                id: r.id,
                palliativePatientId: patientId,
                kondisiHariIni: (r.kondisiHariIni || 'stabil') as DailyComplaintRecord['kondisiHariIni'],
                alasanKondisi: (r.alasanKondisi || '') as string,
                keluhanBaru: (r.keluhanBaru || 'tidak') as DailyComplaintRecord['keluhanBaru'],
                deskripsiKeluhanBaru: (r.deskripsiKeluhanBaru || '') as string,
                kondisiNyeri: (r.kondisiNyeri || 'tidak_ada') as DailyComplaintRecord['kondisiNyeri'],
                kondisiSesak: (r.kondisiSesak || 'tidak_ada') as DailyComplaintRecord['kondisiSesak'],
                makanMinum: (r.makanMinum || 'ya') as DailyComplaintRecord['makanMinum'],
                alasanMakanMinum: (r.alasanMakanMinum || '') as string,
                tidur: (r.tidur || 'ya') as DailyComplaintRecord['tidur'],
                alasanTidur: (r.alasanTidur || '') as string,
                masalahObat: (r.masalahObat || 'tidak') as DailyComplaintRecord['masalahObat'],
                deskripsiMasalahObat: (r.deskripsiMasalahObat || '') as string,
                severityLevel: (r.severityLevel || 'ringan') as DailyComplaintRecord['severityLevel'],
                sumberPengisian: (r.sumberPengisian || 'manual') as DailyComplaintRecord['sumberPengisian'],
                submittedAt: (r.submittedAt || r.tanggal || r.createdAt || '') as string,
                createdAt: (r.createdAt as string) || new Date().toISOString(),
              }));
              store.setDailyComplaints(complaints);
            }
          } catch { /* skip */ }

          // Obat
          try {
            const obatRecords = await firestoreService.obatService.getAll(patientId);
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
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                  updatedAt: (r.updatedAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Skrining
          try {
            const skriningRecords = await firestoreService.skriningService.getAll(patientId);
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
                  details: (typeof r.details === 'string' ? r.details : JSON.stringify(r.details || {})) as string,
                  performedAt: (r.performedAt || r.screenedAt || r.tanggal || r.createdAt || '') as string,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // ACP
          try {
            const acpRecords = await firestoreService.acpService.getAll(patientId);
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
                  patientSigned: (r.patientSigned ?? r.isSignedByPatient ?? false) as boolean,
                  familySigned: (r.familySigned ?? r.isSignedByFamily ?? false) as boolean,
                  doctorSigned: (r.doctorSigned ?? r.isSignedByDoctor ?? false) as boolean,
                  isActive: (r.isActive ?? true) as boolean,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                  updatedAt: (r.updatedAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Nutrisi
          try {
            const nutrisiRecords = await firestoreService.nutrisiService.getAll(patientId);
            for (const r of nutrisiRecords) {
              const exists = store.nutritionRecords.some(n => n.id === r.id);
              if (!exists) {
                store.addNutritionRecord({
                  id: r.id,
                  palliativePatientId: patientId,
                  age: (r.age || 0) as number,
                  gender: ((r.gender === 'L' || r.gender === 'P') ? r.gender : 'P') as 'L' | 'P',
                  weight: (r.weight || r.berat_badan || 0) as number,
                  height: (r.height || r.tinggi_badan || 0) as number,
                  activityLevel: (r.activityLevel || 'bed_rest') as NutritionRecordInfo['activityLevel'],
                  metabolicStress: (r.metabolicStress || 'ringan') as NutritionRecordInfo['metabolicStress'],
                  specialCondition: (r.specialCondition || 'tidak_ada') as NutritionRecordInfo['specialCondition'],
                  calculation: (r.calculation || {
                    bmi: r.bmi || 0,
                    bbi: 0,
                    totalCalorieNeeds: r.totalCalorieNeeds || r.kebutuhan_kalori || 0,
                    proteinNeeds: 0,
                    fatNeeds: 0,
                    carbohydrateNeeds: 0,
                    fluidNeeds: 0,
                  }) as NutritionRecordInfo['calculation'],
                  recordedAt: (r.recordedAt || r.tanggal || r.createdAt || '') as string,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Sosial
          try {
            const sosialRecords = await firestoreService.sosialService.getAll(patientId);
            for (const r of sosialRecords) {
              const exists = store.socialAssessments.some(s => s.id === r.id);
              if (!exists) {
                store.addSocialAssessment({
                  id: r.id,
                  palliativePatientId: patientId,
                  housingCondition: (r.housingCondition || 'layak') as SocialAssessmentRecord['housingCondition'],
                  caregiverAvailability: (r.caregiverAvailability || r.caregiver || 'tersedia') as SocialAssessmentRecord['caregiverAvailability'],
                  familySupportLevel: (r.familySupportLevel || r.dukungan_keluarga || 'kuat') as SocialAssessmentRecord['familySupportLevel'],
                  transportDifficulty: (r.transportDifficulty || 'mudah') as SocialAssessmentRecord['transportDifficulty'],
                  economicConstraint: (r.economicConstraint || r.kondisi_ekonomi || 'tidak_ada') as SocialAssessmentRecord['economicConstraint'],
                  healthcareAccess: (r.healthcareAccess || 'mudah') as SocialAssessmentRecord['healthcareAccess'],
                  medicalEquipmentNeed: (r.medicalEquipmentNeed || 'tidak_ada') as SocialAssessmentRecord['medicalEquipmentNeed'],
                  socialAssistanceNeed: (r.socialAssistanceNeed || 'tidak_ada') as SocialAssessmentRecord['socialAssistanceNeed'],
                  socialIsolationRisk: (r.socialIsolationRisk || 'rendah') as SocialAssessmentRecord['socialIsolationRisk'],
                  overallStatus: (r.overallStatus || 'lengkap') as SocialAssessmentRecord['overallStatus'],
                  priorityLevel: (r.priorityLevel || 'rendah') as SocialAssessmentRecord['priorityLevel'],
                  recommendations: (Array.isArray(r.recommendations) ? r.recommendations : []) as string[],
                  assessedBy: (r.assessedBy || '') as string,
                  assessedByRole: (r.assessedByRole || 'palliative_team') as SocialAssessmentRecord['assessedByRole'],
                  assessedAt: (r.assessedAt || r.createdAt || '') as string,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                  updatedAt: (r.updatedAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Chat Messages
          try {
            const chatRecords = await firestoreService.chatService.getAll(patientId);
            for (const r of chatRecords) {
              const exists = store.palliativeChatMessages.some(m => m.id === r.id);
              if (!exists) {
                store.addPalliativeChatMessage({
                  id: r.id,
                  roomId: (r.roomId || patientId) as string,
                  type: (r.type || 'text') as PalliativeChatMessage['type'],
                  content: (r.content || '') as string,
                  senderId: (r.senderId || '') as string,
                  senderName: (r.senderName || '') as string,
                  senderRole: (r.senderRole || 'system') as PalliativeChatMessage['senderRole'],
                  status: (r.status || 'delivered') as PalliativeChatMessage['status'],
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Clinical Alerts
          try {
            const alertRecords = await firestoreService.clinicalAlertsService.getAll(patientId);
            for (const r of alertRecords) {
              const exists = store.palliativeClinicalAlerts.some(a => a.id === r.id);
              if (!exists) {
                store.addPalliativeClinicalAlert({
                  id: r.id,
                  patientId: patientId,
                  alertType: (r.alertType || 'form_tidak_diisi') as PalliativeClinicalAlert['alertType'],
                  severity: (r.severity || 'kuning') as PalliativeClinicalAlert['severity'],
                  title: (r.title || '') as string,
                  description: (r.description || '') as string,
                  isRead: (r.isRead ?? false) as boolean,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Resumes
          try {
            const resumeRecords = await firestoreService.resumeService.getAll(patientId);
            for (const r of resumeRecords) {
              const exists = store.palliativeResumes.some(res => res.id === r.id);
              if (!exists) {
                store.addPalliativeResume({
                  id: r.id,
                  palliativePatientId: patientId,
                  documentNumber: (r.documentNumber || '') as string,
                  generatedBy: (r.generatedBy || '') as string,
                  generatedByRole: (r.generatedByRole || 'doctor') as PalliativeResumeMedis['generatedByRole'],
                  generatedAt: (r.generatedAt || r.createdAt || '') as string,
                  fullContent: (r.fullContent || '') as string,
                  version: (r.version || 1) as number,
                  isSigned: (r.isSigned ?? false) as boolean,
                  downloadCount: (r.downloadCount || 0) as number,
                  printCount: (r.printCount || 0) as number,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                  updatedAt: (r.updatedAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }

          // Audit Entries
          try {
            const auditRecords = await firestoreService.auditService.getAll(patientId);
            for (const r of auditRecords) {
              const exists = store.palliativeAuditLog.some(a => a.id === r.id);
              if (!exists) {
                store.addPalliativeAuditEntry({
                  id: r.id,
                  action: (r.action || 'clinical_action') as PalliativeAuditEntry['action'],
                  performedBy: (r.performedBy || '') as string,
                  performedByRole: (r.performedByRole || 'system') as PalliativeAuditEntry['performedByRole'],
                  details: (r.details || '') as string,
                  patientId: patientId,
                  createdAt: (r.createdAt as string) || new Date().toISOString(),
                });
              }
            }
          } catch { /* skip */ }
        }

        console.log('[FirestoreProvider] Firestore data loaded into store successfully!');
      };

      await Promise.race([loadPromise(), timeoutPromise]);
    } catch (err) {
      console.warn('[FirestoreProvider] Firestore data load skipped:', err);
      // Non-blocking: app continues with local Zustand data
    }
  }, [store]);

  // Initialize on mount — completely non-blocking
  useEffect(() => {
    // Fire and forget: the app renders immediately with local data
    initializeFirestore().then(() => loadFirestoreDataIntoStore());

    // Cleanup real-time listeners on unmount
    return () => {
      unsubscribers.current.forEach(unsub => unsub());
      unsubscribers.current = [];
    };
  }, [initializeFirestore, loadFirestoreDataIntoStore]);

  // ALWAYS render children immediately — no blocking states!
  // Firestore data syncs in the background once available.
  return <>{children}</>;
}
