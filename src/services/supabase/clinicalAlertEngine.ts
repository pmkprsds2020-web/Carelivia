// ───────────────────────────────────────────────────────────────────────────
// clinicalAlertEngine — Early Warning System (EWS) Rule Engine
// ───────────────────────────────────────────────────────────────────────────
//
// Scans a patient's clinical data (TTV, Skrining, Obat, Nutrisi, Keluhan
// Harian, Sosial, Lab) and produces a list of alerts that should be created.
//
// The engine is PURE — it does NOT touch Supabase. It returns a list of
// `AlertCandidate` objects. The caller (store action or UI) passes them to
// `clinicalAlertService.create()`, which handles deduplication and persistence.
//
// Rules are based on the user's specification:
//   TTV:     SpO2<90, RR>30, SBP>180, DBP>110, SBP<90, HR>130, Temp>39
//   Skrining: ESAS-r Nyeri≥7, Sesak≥7, Distress≥6, PPS<40, SPICT positif
//   Obat:    tidak diminum 3 hari, hampir habis (<3 hari), efek samping berat
//   Nutrisi: tidak makan >24h, tidak minum >12h, penurunan BB >5%
//   Keluhan: sesak bertambah, nyeri bertambah, tidak BAB >5 hari, tidak BAK
//   Sosial:  caregiver burden tinggi, pasien hidup sendiri
//   Lab:     HbA1c≥9, GDP≥250, GDS≥300, LDL≥190, Kreatinin tinggi, Mikroalbumin positif
// ───────────────────────────────────────────────────────────────────────────
import type {
  VitalSignRecordInfo,
  PalliativeScreeningRecordInfo,
  PalliativeMedicationInfo,
  NutritionRecordInfo,
  DailyComplaintRecord,
  SocialAssessmentRecord,
  PalliativeClinicalAlert,
  ClinicalAlertSeverity,
  ClinicalAlertSource,
} from '@/lib/types';
import type { CreateAlertInput } from './clinicalAlertService';
import type { LabResult } from './supportingExamService';

export type AlertCandidate = CreateAlertInput;

export interface EnginePatientData {
  patientId: string;
  doctorId?: string;
  vitals: VitalSignRecordInfo[];
  screenings: PalliativeScreeningRecordInfo[];
  medications: PalliativeMedicationInfo[];
  nutrition: NutritionRecordInfo[];
  dailyComplaints: DailyComplaintRecord[];
  socialAssessments: SocialAssessmentRecord[];
  labResults?: LabResult[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function daysAgo(iso: string): number {
  return hoursAgo(iso) / 24;
}

// ── TTV Rules ───────────────────────────────────────────────────────────────

function evaluateVitals(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (!data.vitals.length) return alerts;

  // Evaluate ONLY the latest vital. Evaluating multiple vitals would generate
  // multiple candidates for the same condition (e.g. 3 vitals with SpO2<90
  // → 3 "hipoksemia" candidates), which causes duplicate alerts. The dedup
  // logic ensures one ACTIVE alert per alertType per patient.
  const v = data.vitals[0];
  const spo2 = num(v.oxygenSat);
  const rr = num(v.respiratoryRate);
  const sbp = num(v.systolicBP);
  const dbp = num(v.diastolicBP);
  const hr = num(v.heartRate);
  const temp = num(v.temperature);

  // SpO2 < 90 → CRITICAL Hipoksemia
  if (spo2 !== null && spo2 < 90) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'hipoksemia',
      severityLevel: 'CRITICAL',
      title: 'Hipoksemia',
      description: `Saturasi oksigen ${spo2}% (normal ≥90%). Segera evaluasi pasien dan pertimbangkan terapi oksigen.`,
      sourceModule: 'vital_signs',
      sourceRecordId: v.id,
      kategori: 'Pernapasan',
      recommendation: 'Evaluasi segera: pemberian oksigen suplemental, auskultasi paru, pertimbangkan ABG.',
    });
  }

  // RR > 30 → CRITICAL Distres Pernapasan
  if (rr !== null && rr > 30) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'distres_pernapasan',
      severityLevel: 'CRITICAL',
      title: 'Distres Pernapasan',
      description: `Frekuensi napas ${rr}/menit (normal 12-20). Pasien mengalami distres pernapasan.`,
      sourceModule: 'vital_signs',
      sourceRecordId: v.id,
      kategori: 'Pernapasan',
      recommendation: 'Evaluasi penyebab sesak, pertimbangkan posisi semi-Fowler, oksigen, dan nebulizer jika indikasi.',
    });
  }

  // SBP > 180 or DBP > 110 → CRITICAL Krisis Hipertensi
  if ((sbp !== null && sbp > 180) || (dbp !== null && dbp > 110)) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'krisis_hipertensi',
      severityLevel: 'CRITICAL',
      title: 'Krisis Hipertensi',
      description: `Tekanan darah ${sbp}/${dbp} mmHg. Krisis hipertensi — risiko stroke, edema paru, atau encefalopati.`,
      sourceModule: 'vital_signs',
      sourceRecordId: v.id,
      kategori: 'Kardiovaskular',
      recommendation: 'Turunkan TD bertahap (jangan terlalu cepat), evaluasi organ target, pertimbangkan antihipertensi IV.',
    });
  }

  // SBP < 90 → HIGH Hipotensi
  if (sbp !== null && sbp < 90) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'hipotensi',
      severityLevel: 'HIGH',
      title: 'Hipotensi',
      description: `Tekanan darah sistolik ${sbp} mmHg (<90). Risiko perfusi organ tidak adekuat.`,
      sourceModule: 'vital_signs',
      sourceRecordId: v.id,
      kategori: 'Kardiovaskular',
      recommendation: 'Evaluasi penyebab (hipovolemia, sepsis, kardiogenik), berikan cairan, pertimbangkan vasopresor.',
    });
  }

  // HR > 130 → HIGH Takikardia Berat
  if (hr !== null && hr > 130) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'takikardia',
      severityLevel: 'HIGH',
      title: 'Takikardia Berat',
      description: `Nadi ${hr} bpm (>130). Evaluasi penyebab takikardia berat.`,
      sourceModule: 'vital_signs',
      sourceRecordId: v.id,
      kategori: 'Kardiovaskular',
      recommendation: 'Evaluasi irama (EKG), cari penyebab (nyeri, demam, hipovolemia, tirotoksikosis), pertimbangkan beta-blocker.',
    });
  }

  // Temp > 39 → HIGH Demam Tinggi
  if (temp !== null && temp > 39) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'demam_tinggi',
      severityLevel: 'HIGH',
      title: 'Demam Tinggi',
      description: `Suhu ${temp}°C (>39°C). Demam tinggi — risiko dehidrasi dan perburukan kondisi.`,
      sourceModule: 'vital_signs',
      sourceRecordId: v.id,
      kategori: 'Infeksi',
      recommendation: 'Antipiretik, kompres dingin, evaluasi sumber infeksi, kultur jika perlu, pertimbangkan antibiotik empiris.',
    });
  }

  return alerts;
}

// ── Skrining Rules ──────────────────────────────────────────────────────────

function evaluateScreenings(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (!data.screenings.length) return alerts;

  // Group screenings by type, take the latest of each.
  const byType: Record<string, PalliativeScreeningRecordInfo[]> = {};
  for (const s of data.screenings) {
    const t = (s.screeningType || '').toLowerCase();
    if (!byType[t]) byType[t] = [];
    byType[t].push(s);
  }

  for (const [type, records] of Object.entries(byType)) {
    const latest = records[0];
    if (!latest) continue;
    const score = num(latest.score);
    // `details` is a JSON string of the jawaban JSONB. Parse it to get individual scores.
    let jawaban: Record<string, any> = {};
    if (latest.details) {
      try {
        jawaban = typeof latest.details === 'string' ? JSON.parse(latest.details) : (latest.details as any);
      } catch { jawaban = {}; }
    }

    if (type.includes('esas')) {
      // ESAS-r: check individual symptom scores (0-10). ≥7 = severe.
      const nyeri = num(jawaban.nyeri ?? jawaban.pain);
      const sesak = num(jawaban.sesak ?? jawaban.dyspnea ?? jawaban.shortness_of_breath);
      if (nyeri !== null && nyeri >= 7) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'nyeri_berat',
          severityLevel: 'HIGH',
          title: 'Nyeri Berat (ESAS-r)',
          description: `Skrining ESAS-r: skor nyeri ${nyeri}/10 (≥7 = berat). Nyeri tidak terkontrol.`,
          sourceModule: 'screenings',
          sourceRecordId: latest.id,
          kategori: 'Nyeri',
          recommendation: 'Titrasi analgesik (eskalasi opioid sesuai tangga nyeri WHO), evaluasi multi-modal, pertimbangkan adjuvan.',
        });
      }
      if (sesak !== null && sesak >= 7) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'sesak_berat',
          severityLevel: 'HIGH',
          title: 'Sesak Berat (ESAS-r)',
          description: `Skrining ESAS-r: skor sesak ${sesak}/10 (≥7 = berat). Sesak napas berat.`,
          sourceModule: 'screenings',
          sourceRecordId: latest.id,
          kategori: 'Pernapasan',
          recommendation: 'Oksigen suplemental, posisi semi-Fowler, evaluasi penyebab (efusi, PPOK, gagal jantung), morfin untuk sesak paliatif.',
        });
      }
    }

    if (type.includes('distress')) {
      // Distress Thermometer: score ≥6 = severe distress
      if (score !== null && score >= 6) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'distres_psikologis',
          severityLevel: 'MEDIUM',
          title: 'Distres Psikologis',
          description: `Distress Thermometer: skor ${score}/10 (≥6 = distres tinggi). Pasien mengalami distres psikologis bermakna.`,
          sourceModule: 'screenings',
          sourceRecordId: latest.id,
          kategori: 'Psikologis',
          recommendation: 'Rujuk ke konselor/psikolog, pertimbangkan intervensi psikososial, evaluasi kebutuhan anxiolitik.',
        });
      }
    }

    if (type.includes('pps')) {
      // PPS < 40 → severe functional decline
      if (score !== null && score < 40) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'penurunan_fungsi',
          severityLevel: 'HIGH',
          title: 'Penurunan Fungsi Berat (PPS)',
          description: `Palliative Performance Scale: ${score}% (<40%). Penurunan fungsi berat — pasien mendekati fase akhir.`,
          sourceModule: 'screenings',
          sourceRecordId: latest.id,
          kategori: 'Fungsional',
          recommendation: 'Diskusikan tujuan perawatan, pertimbangkan hospice, evaluasi ACP, siapkan keluarga.',
        });
      }
    }

    if (type.includes('spict')) {
      // SPICT: any positive result = patient meets palliative care indicators
      if (score !== null && score > 0) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'spict_positif',
          severityLevel: 'MEDIUM',
          title: 'SPICT Positif',
          description: `SPICT: ${score} indikator terdeteksi. Pasien memenuhi indikator kebutuhan paliatif lanjutan.`,
          sourceModule: 'screenings',
          sourceRecordId: latest.id,
          kategori: 'Paliatif',
          recommendation: 'Konsultasi tim paliatif, evaluasi gejala komprehensif, diskusikan rencana perawatan.',
        });
      }
    }
  }

  return alerts;
}

// ── Obat Rules ──────────────────────────────────────────────────────────────

function evaluateMedications(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  for (const med of data.medications) {
    if (!med.isActive) continue;

    // Check adherence — if the patient has missed doses for 3+ consecutive records
    const adherences = Array.isArray(med.adherences) ? med.adherences : [];
    if (adherences.length >= 3) {
      // Check last 3 adherence records — if all missed, alert.
      const last3 = adherences.slice(0, 3);
      const allMissed = last3.every(
        (a: any) => a.takenOnTime === false || a.missedDose === true
      );
      if (allMissed) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'obat_tidak_diminum',
          severityLevel: 'MEDIUM',
          title: 'Kepatuhan Obat Rendah',
          description: `Obat "${med.medicineName}" tidak diminum selama 3 hari terakhir. Kepatuhan rendah — risiko perburukan gejala.`,
          sourceModule: 'medications',
          sourceRecordId: med.id,
          kategori: 'Kepatuhan',
          recommendation: 'Evaluasi hambatan kepatuhan (efek samping, biaya, lupa), edukasi pasien/keluarga, pertimbangkan reminder.',
        });
      }
    }

    // Check stock — if endDate is within 3 days, or notes mention low stock
    const endDate = med.endDate;
    if (endDate) {
      const daysLeft = daysAgo(endDate) * -1; // positive = future
      if (daysLeft >= 0 && daysLeft < 3) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'obat_hampir_habis',
          severityLevel: 'LOW',
          title: 'Obat Hampir Habis',
          description: `Obat "${med.medicineName}" diperkirakan habis dalam ${Math.ceil(daysLeft)} hari (tanggal selesai: ${endDate}). Perlu resep ulang.`,
          sourceModule: 'medications',
          sourceRecordId: med.id,
          kategori: 'Logistik',
          recommendation: 'Buat resep ulang, koordinasi dengan apotek, pastikan pasien tidak kehabisan obat.',
        });
      }
    }

    // Check for severe side effects reported in notes
    const efekSamping = med.notes;
    if (efekSamping && typeof efekSamping === 'string' && efekSamping.toLowerCase().match(/berat|parah|severe|anafilaks|urtikaria|syok|reaksi alergi/)) {
      alerts.push({
        patientId: data.patientId,
        doctorId: data.doctorId,
        alertType: 'efek_samping_berat',
        severityLevel: 'HIGH',
        title: 'Efek Samping Obat Berat',
        description: `Efek samping berat dilaporkan untuk obat "${med.medicineName}": ${efekSamping}.`,
        sourceModule: 'medications',
        sourceRecordId: med.id,
        kategori: 'Farmakologi',
        recommendation: 'Hentikan atau reduksi obat, evaluasi gejala, pertimbangkan obat alternatif, laporkan ke farmakovigilans.',
      });
    }
  }
  return alerts;
}

// ── Nutrisi Rules ───────────────────────────────────────────────────────────

function evaluateNutrition(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (!data.nutrition.length) return alerts;
  const latest = data.nutrition[0];

  // Check for no eating > 24h — if the latest nutrition record shows 0 calorie intake
  // and it's from the last 48 hours.
  const kaloriTercapai = num(latest.actualIntakeKcal);
  const recordedHoursAgo = latest.recordedAt ? hoursAgo(latest.recordedAt) : null;
  if (kaloriTercapai !== null && kaloriTercapai === 0 && recordedHoursAgo !== null && recordedHoursAgo <= 48) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'risiko_malnutrisi',
      severityLevel: 'HIGH',
      title: 'Risiko Malnutrisi',
      description: `Asupan kalori 0 kcal (tidak makan >24 jam). Risiko malnutrisi tinggi.`,
      sourceModule: 'nutrition',
      sourceRecordId: latest.id,
      kategori: 'Nutrisi',
      recommendation: 'Evaluasi penyebab (mual, nyeri, depresi, disfagia), pertimbangkan nutrisi enteral/parenteral, konsul gizi.',
    });
  }

  // Check for >5% weight loss — compare latest vs earliest weight.
  if (data.nutrition.length >= 2) {
    const latestBb = num(latest.weight);
    const earliest = data.nutrition[data.nutrition.length - 1];
    const earliestBb = num(earliest.weight);
    if (latestBb !== null && earliestBb !== null && earliestBb > 0) {
      const drop = ((earliestBb - latestBb) / earliestBb) * 100;
      if (drop > 5) {
        alerts.push({
          patientId: data.patientId,
          doctorId: data.doctorId,
          alertType: 'penurunan_bb',
          severityLevel: 'MEDIUM',
          title: 'Penurunan Berat Badan',
          description: `Penurunan berat badan ${drop.toFixed(1)}% (dari ${earliestBb}kg ke ${latestBb}kg). Melebihi ambang 5%.`,
          sourceModule: 'nutrition',
          sourceRecordId: latest.id,
          kategori: 'Nutrisi',
          recommendation: 'Evaluasi status gizi (MNA/SNAQ), tingkatkan asupan kalori-protein, pertimbangkan suplementasi.',
        });
      }
    }
  }

  return alerts;
}

// ── Keluhan Harian Rules ────────────────────────────────────────────────────

function evaluateDailyComplaints(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (!data.dailyComplaints.length) return alerts;
  const latest = data.dailyComplaints[0];

  // Sesak bertambah berat → CRITICAL
  if (latest.kondisiSesak === 'bertambah') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'sesak_napas',
      severityLevel: 'CRITICAL',
      title: 'Sesak Bertambah Berat',
      description: `Keluhan harian: sesak napas bertambah berat. ${latest.deskripsiKeluhanBaru || ''}`.trim(),
      sourceModule: 'daily_complaints',
      sourceRecordId: latest.id,
      kategori: 'Pernapasan',
      recommendation: 'Evaluasi segera: auskultasi, SpO2, pertimbangkan oksigen dan posisi semi-Fowler.',
    });
  }

  // Nyeri bertambah berat → HIGH
  if (latest.kondisiNyeri === 'bertambah') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'nyeri_meningkat',
      severityLevel: 'HIGH',
      title: 'Nyeri Bertambah Berat',
      description: `Keluhan harian: nyeri bertambah berat. ${latest.deskripsiKeluhanBaru || ''}`.trim(),
      sourceModule: 'daily_complaints',
      sourceRecordId: latest.id,
      kategori: 'Nyeri',
      recommendation: 'Titrasi analgesik, evaluasi sumber nyeri, pertimbangkan adjuvan.',
    });
  }

  // Kondisi tidak baik → HIGH
  if (latest.kondisiHariIni === 'tidak_baik') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'perburukan',
      severityLevel: 'HIGH',
      title: 'Kondisi Pasien Tidak Baik',
      description: `Keluhan harian: pasien melaporkan kondisi tidak baik. ${latest.alasanKondisi || ''}`.trim(),
      sourceModule: 'daily_complaints',
      sourceRecordId: latest.id,
      kategori: 'Umum',
      recommendation: 'Evaluasi komprehensif, TTV, pertimbangkan kunjungan home care.',
    });
  }

  // Tidak makan → MEDIUM (also covered by nutrition, but keluhan is patient-reported)
  if (latest.makanMinum === 'tidak') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'risiko_malnutrisi',
      severityLevel: 'MEDIUM',
      title: 'Pasien Tidak Makan',
      description: `Keluhan harian: pasien tidak makan. ${latest.alasanMakanMinum || ''}`.trim(),
      sourceModule: 'daily_complaints',
      sourceRecordId: latest.id,
      kategori: 'Nutrisi',
      recommendation: 'Evaluasi penyebab, pertimbangkan nutrisi cair, monitor asupan.',
    });
  }

  // Masalah obat → MEDIUM
  if (latest.masalahObat === 'ya') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'efek_samping_berat',
      severityLevel: 'MEDIUM',
      title: 'Masalah Obat Dilaporkan',
      description: `Keluhan harian: pasien melaporkan masalah obat. ${latest.deskripsiMasalahObat || ''}`.trim(),
      sourceModule: 'daily_complaints',
      sourceRecordId: latest.id,
      kategori: 'Farmakologi',
      recommendation: 'Evaluasi obat dan efek samping, pertimbangkan adjustment dosis.',
    });
  }

  return alerts;
}

// ── Sosial Rules ────────────────────────────────────────────────────────────

function evaluateSocial(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (!data.socialAssessments.length) return alerts;
  const latest = data.socialAssessments[0];

  // Caregiver burden tinggi — family support lemah/tidak_ada or priority tinggi
  if (latest.familySupportLevel === 'lemah' || latest.familySupportLevel === 'tidak_ada' || latest.priorityLevel === 'tinggi') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'risiko_burnout_caregiver',
      severityLevel: 'MEDIUM',
      title: 'Risiko Burnout Caregiver',
      description: `Assessment sosial: dukungan keluarga ${latest.familySupportLevel} / prioritas ${latest.priorityLevel}. Risiko burnout caregiver.`,
      sourceModule: 'social_assessments',
      sourceRecordId: latest.id,
      kategori: 'Sosial',
      recommendation: 'Edukasi caregiver, pertimbangkan bantuan perawat home care, rujuk ke kelompok dukungan.',
    });
  }

  // Pasien hidup sendiri / social isolation risk tinggi or no caregiver
  if (latest.socialIsolationRisk === 'tinggi' || latest.caregiverAvailability === 'tidak_tersedia') {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'risiko_dukungan_sosial',
      severityLevel: 'MEDIUM',
      title: 'Risiko Dukungan Sosial Rendah',
      description: `Assessment sosial: pasien berisiko isolasi sosial (risiko ${latest.socialIsolationRisk}) / caregiver ${latest.caregiverAvailability}.`,
      sourceModule: 'social_assessments',
      sourceRecordId: latest.id,
      kategori: 'Sosial',
      recommendation: 'Aktivasi dukungan komunitas, koordinasi dengan pekerja sosial, evaluasi kebutuhan home care.',
    });
  }

  return alerts;
}

// ── Lab Results Rules ───────────────────────────────────────────────────────
//
// Triggered when a new lab result is saved. Creates alerts for abnormal values:
//   HbA1c ≥ 9%      → CRITICAL (kadar gula darah tidak terkontrol berat)
//   GDP  ≥ 250      → CRITICAL (hiperglikemia berat)
//   GDS  ≥ 300      → CRITICAL (hiperglikemia berat)
//   LDL  ≥ 190      → HIGH     (hiperkolesterolemia berat)
//   Kreatinin > 2.0 → HIGH     (gangguan fungsi ginjal)
//   Mikroalbumin >30→ MEDIUM   (mikroalbuminuria positif)
// ───────────────────────────────────────────────────────────────────────────

function evaluateLabResults(data: EnginePatientData): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (!data.labResults || !data.labResults.length) return alerts;
  const latest = data.labResults[0];

  const hba1c = num(latest.hba1c);
  const gdp = num(latest.gdp);
  const gds = num(latest.gds);
  const ldl = num(latest.ldl);
  const kreatinin = num(latest.kreatinin);
  const mikroalbumin = num(latest.mikroalbumin);

  if (hba1c !== null && hba1c >= 9) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'hba1c_tinggi',
      severityLevel: 'CRITICAL',
      title: 'HbA1c Tinggi (≥9%)',
      description: `Hasil lab: HbA1c ${hba1c}% (≥9%). Kadar gula darah tidak terkontrol berat — risiko komplikasi makrovaskular dan mikrovaskular.`,
      sourceModule: 'laboratory_results',
      sourceRecordId: latest.id,
      kategori: 'Metabolik',
      recommendation: 'Eskalasi terapi anti-diabetes (pertimbangkan insulin), evaluasi pola makan, edukasi pasien, monitoring gula darah lebih sering.',
    });
  }

  if (gdp !== null && gdp >= 250) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'gdp_tinggi',
      severityLevel: 'CRITICAL',
      title: 'Glukosa Darah Puasa Tinggi (≥250)',
      description: `Hasil lab: GDP ${gdp} mg/dL (≥250). Hiperglikemia berat — risiko ketoasidosis atau sindrom hiperosmolar.`,
      sourceModule: 'laboratory_results',
      sourceRecordId: latest.id,
      kategori: 'Metabolik',
      recommendation: 'Evaluasi segera status hidrasi dan keton, pertimbangkan insulin, koreksi penyebab (infeksi, kepatuhan obat).',
    });
  }

  if (gds !== null && gds >= 300) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'gds_tinggi',
      severityLevel: 'CRITICAL',
      title: 'Glukosa Darah Sewaktu Tinggi (≥300)',
      description: `Hasil lab: GDS ${gds} mg/dL (≥300). Hiperglikemia berat — risiko komplikasi akut.`,
      sourceModule: 'laboratory_results',
      sourceRecordId: latest.id,
      kategori: 'Metabolik',
      recommendation: 'Evaluasi segera, pertimbangkan insulin, monitoring keton, koreksi penyebab.',
    });
  }

  if (ldl !== null && ldl >= 190) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'ldl_tinggi',
      severityLevel: 'HIGH',
      title: 'LDL Kolesterol Tinggi (≥190)',
      description: `Hasil lab: LDL ${ldl} mg/dL (≥190). Hiperkolesterolemia berat — risiko aterosklerosis dan kejadian kardiovaskular.`,
      sourceModule: 'laboratory_results',
      sourceRecordId: latest.id,
      kategori: 'Kardiovaskular',
      recommendation: 'Mulai/eskalasi statin, evaluasi risiko kardiovaskular, edukasi diet, pertimbangkan rujukan ke ardiologi.',
    });
  }

  if (kreatinin !== null && kreatinin > 2.0) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'kreatinin_tinggi',
      severityLevel: 'HIGH',
      title: 'Kreatinin Tinggi (>2.0)',
      description: `Hasil lab: Kreatinin ${kreatinin} mg/dL (>2.0). Penurunan fungsi ginjal — risiko gagal ginjal akut/kronik.`,
      sourceModule: 'laboratory_results',
      sourceRecordId: latest.id,
      kategori: 'Renal',
      recommendation: 'Evaluasi penyebab (prarenal, renal, pascarenal), review obat nefrotoksik, monitoring asupan cairan, rujuk ke nefrologi.',
    });
  }

  if (mikroalbumin !== null && mikroalbumin > 30) {
    alerts.push({
      patientId: data.patientId,
      doctorId: data.doctorId,
      alertType: 'mikroalbumin_positif',
      severityLevel: 'MEDIUM',
      title: 'Mikroalbuminuria Positif (>30)',
      description: `Hasil lab: Mikroalbumin ${mikroalbumin} mg/dL (>30). Tanda awal nefropati diabetik/hipertensi.`,
      sourceModule: 'laboratory_results',
      sourceRecordId: latest.id,
      kategori: 'Renal',
      recommendation: 'Optimasi kontrol gula darah dan tekanan darah, pertimbangkan ACE-inhibitor/ARB, monitoring fungsi ginjal berkala.',
    });
  }

  return alerts;
}

// ── Throttle ─────────────────────────────────────────────────────────────────
//
// Prevent the engine from running more than once per THROTTLE_MS per patient.
// Multiple clinical events (e.g. saving TTV + medication in quick succession,
// or a realtime event arriving right after a user save) would otherwise each
// trigger a full scan, hammering Supabase with redundant queries.
//
const THROTTLE_MS = 30_000; // 30 seconds per patient
const lastScanAt = new Map<string, number>();

/**
 * Check whether a scan is allowed for this patient right now.
 * Returns `true` if allowed, `false` if throttled.
 */
export function canScan(patientId: string): boolean {
  const now = Date.now();
  const last = lastScanAt.get(patientId) ?? 0;
  return now - last >= THROTTLE_MS;
}

/** Force-clear the throttle for a patient (used by the manual "Scan" button). */
export function resetThrottle(patientId: string): void {
  lastScanAt.delete(patientId);
}

// ── Main engine entry point ─────────────────────────────────────────────────

// Run all rules against the patient's clinical data and return a list of
// alert candidates. The caller is responsible for persisting them via
// clinicalAlertService.create() (which deduplicates).
export function evaluatePatient(data: EnginePatientData): AlertCandidate[] {
  const all: AlertCandidate[] = [];
  all.push(...evaluateVitals(data));
  all.push(...evaluateScreenings(data));
  all.push(...evaluateMedications(data));
  all.push(...evaluateNutrition(data));
  all.push(...evaluateDailyComplaints(data));
  all.push(...evaluateSocial(data));
  all.push(...evaluateLabResults(data));
  return all;
}

/**
 * Convenience: run the engine and persist all generated alerts.
 *
 * THROTTLED: only runs once per 30s per patient (unless the caller clears the
 * throttle via `resetThrottle`). Returns 0 if throttled.
 *
 * DEDUP: fetches the patient's ACTIVE alerts ONCE (batch) and checks each
 * candidate against that list in-memory. The service-level `create()` also
 * does a targeted dedup as a second line of defense.
 *
 * AUTO-RESOLVE: for each module that had data, if an ACTIVE alert of a given
 * alertType exists but NO candidate was generated for that type, the old
 * alert is resolved (condition returned to normal).
 *
 * Returns the number of NEW alerts actually created (after dedup).
 */
export async function evaluateAndPersist(data: EnginePatientData): Promise<number> {
  // ── Throttle check ──────────────────────────────────────────────────
  if (!canScan(data.patientId)) {
    const last = lastScanAt.get(data.patientId) ?? 0;
    const elapsed = ((Date.now() - last) / 1000).toFixed(1);
    console.log(
      `[clinicalAlertEngine] THROTTLED — patient ${data.patientId} scanned ${elapsed}s ago (< ${THROTTLE_MS / 1000}s). Skipping.`
    );
    return 0;
  }
  lastScanAt.set(data.patientId, Date.now());

  const candidates = evaluatePatient(data);
  console.log(
    `[clinicalAlertEngine] scan START — patient ${data.patientId}, ${candidates.length} candidate(s) from rules.`
  );

  // Lazy-import to avoid circular dependency at module load time.
  const { clinicalAlertService } = await import('./clinicalAlertService');

  // ── Batch-fetch active alerts for this patient (ONE query) ──────────
  // Used for both dedup (skip candidates that already have an active alert)
  // and auto-resolve (close alerts whose condition has normalized).
  let activeAlerts: any[] = [];
  try {
    activeAlerts = await clinicalAlertService.getActive(data.patientId);
  } catch (e) {
    console.warn('[clinicalAlertEngine] could not fetch active alerts for dedup — aborting scan to prevent duplicates.', e);
    return 0;
  }
  // If the query returned null/undefined (shouldn't happen, but be safe),
  // abort — we can't safely dedup.
  if (!Array.isArray(activeAlerts)) {
    console.warn('[clinicalAlertEngine] getActive returned non-array — aborting scan.');
    return 0;
  }

  // Build a set of alertTypes that already have an ACTIVE alert.
  const activeTypeSet = new Set(
    activeAlerts.map((a) => a.alertType).filter(Boolean)
  );

  // ── Persist candidates (dedup against batch-fetched active alerts) ──
  let created = 0;
  let skipped = 0;
  const candidateTypes = new Set<string>();

  for (const c of candidates) {
    candidateTypes.add(c.alertType);
    // In-memory dedup: if an active alert of this type already exists, skip.
    // (The service-level create() also checks, but this avoids the network
    // round-trip entirely for the common case.)
    if (activeTypeSet.has(c.alertType)) {
      skipped++;
      continue;
    }
    try {
      const alert = await clinicalAlertService.create(c);
      if (alert) {
        created++;
        // Add to the active set so subsequent candidates of the same type
        // in this same scan are also skipped.
        activeTypeSet.add(c.alertType);
      }
    } catch (err) {
      console.error('[clinicalAlertEngine.evaluateAndPersist] error creating alert:', err);
    }
  }

  // ── Auto-resolve: close alerts whose condition has normalized ───────
  // For each module that had data, if an ACTIVE alert of a given alertType
  // exists but NO candidate was generated, the condition is now normal.
  // Resolve the old alert so the active count stays accurate.
  let resolved = 0;
  const modulesWithData = new Set<string>();
  if (data.vitals?.length) modulesWithData.add('vital_signs');
  if (data.screenings?.length) modulesWithData.add('screenings');
  if (data.medications?.length) modulesWithData.add('medications');
  if (data.nutrition?.length) modulesWithData.add('nutrition');
  if (data.dailyComplaints?.length) modulesWithData.add('daily_complaints');
  if (data.socialAssessments?.length) modulesWithData.add('social_assessments');
  if (data.labResults?.length) modulesWithData.add('laboratory_results');

  // Map each alertType to its source module so we only auto-resolve for
  // modules that were actually evaluated (had data) in this scan.
  const alertTypeToModule: Record<string, string> = {
    hipoksemia: 'vital_signs',
    distres_pernapasan: 'vital_signs',
    krisis_hipertensi: 'vital_signs',
    hipotensi: 'vital_signs',
    takikardia: 'vital_signs',
    demam_tinggi: 'vital_signs',
    nyeri_berat: 'screenings',
    sesak_berat: 'screenings',
    distres_psikologis: 'screenings',
    penurunan_fungsi: 'screenings',
    spict_positif: 'screenings',
    obat_tidak_diminum: 'medications',
    obat_hampir_habis: 'medications',
    efek_samping_berat: 'medications', // also from daily_complaints
    risiko_malnutrisi: 'nutrition', // also from daily_complaints
    penurunan_bb: 'nutrition',
    sesak_napas: 'daily_complaints',
    nyeri_meningkat: 'daily_complaints',
    perburukan: 'daily_complaints',
    risiko_burnout_caregiver: 'social_assessments',
    risiko_dukungan_sosial: 'social_assessments',
    hba1c_tinggi: 'laboratory_results',
    gdp_tinggi: 'laboratory_results',
    gds_tinggi: 'laboratory_results',
    ldl_tinggi: 'laboratory_results',
    kreatinin_tinggi: 'laboratory_results',
    mikroalbumin_positif: 'laboratory_results',
  };

  for (const active of activeAlerts) {
    const at = active.alertType;
    if (!at) continue;
    // Skip if a candidate was generated for this type (condition still abnormal)
    if (candidateTypes.has(at)) continue;
    const mod = alertTypeToModule[at];
    // Only auto-resolve if the module had data in this scan (so we know the
    // condition was actually re-evaluated and found normal).
    if (!mod || !modulesWithData.has(mod)) continue;
    try {
      const n = await clinicalAlertService.resolveByType(
        data.patientId,
        at,
        'system',
        `Condition normalized — latest ${mod} record no longer triggers this alert.`
      );
      resolved += n;
    } catch (e) {
      console.warn(`[clinicalAlertEngine] auto-resolve failed for ${at}:`, e);
    }
  }

  console.log(
    `[clinicalAlertEngine] scan DONE — patient ${data.patientId}: ${created} created, ${skipped} skipped (dedup), ${resolved} auto-resolved.`
  );
  return created;
}
