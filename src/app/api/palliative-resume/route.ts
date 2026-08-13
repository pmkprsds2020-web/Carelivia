import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdditionalData {
  nutritionRecords?: Record<string, unknown>[];
  socialAssessmentRecords?: Record<string, unknown>[];
  caregivers?: Record<string, unknown>[];
  familyMeetings?: Record<string, unknown>[];
  financialSupportRecords?: Record<string, unknown>[];
}

interface VitalSignRecord {
  id: string;
  recordedBy: string | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSat: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  notes: string | null;
  recordedAt: Date;
}

interface MedicationWithAdherences {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string | null;
  startDate: string | null;
  endDate: string | null;
  indication: string | null;
  isActive: boolean;
  notes: string | null;
  adherences: {
    id: string;
    date: string;
    takenOnTime: boolean;
    missedDose: boolean;
    sideEffects: string | null;
    complaints: string | null;
  }[];
}

interface ScreeningRecord {
  id: string;
  screeningType: string;
  score: number | null;
  scoreLabel: string | null;
  interpretation: string | null;
  ewsLevel: string | null;
  details: string | null;
  performedAt: Date;
}

interface DailyComplaintRecord {
  id: string;
  kondisiHariIni: string;
  alasanKondisi: string | null;
  keluhanBaru: string;
  deskripsiKeluhanBaru: string | null;
  kondisiNyeri: string;
  kondisiSesak: string;
  makanMinum: string;
  alasanMakanMinum: string | null;
  tidur: string;
  alasanTidur: string | null;
  masalahObat: string;
  deskripsiMasalahObat: string | null;
  severityLevel: string;
  sumberPengisian: string;
  submittedAt: Date;
}

interface ACPDocument {
  id: string;
  decisionMakerName: string | null;
  decisionMakerRelation: string | null;
  decisionMakerPhone: string | null;
  preferredCareLocation: string | null;
  careGoal: string | null;
  resuscitationPref: string | null;
  ventilatorPref: string | null;
  icuPref: string | null;
  artificialNutrition: string | null;
  dialysisPref: string | null;
  organDonation: string | null;
  patientHopes: string | null;
  patientWorries: string | null;
  lifeValues: string | null;
  endOfLifePrefs: string | null;
  patientSigned: boolean;
  familySigned: boolean;
  doctorSigned: boolean;
  signedAt: string | null;
  isActive: boolean;
  revisions: {
    id: string;
    revisedBy: string | null;
    changes: string | null;
    reason: string | null;
    createdAt: Date;
  }[];
}

interface AIAnalysis {
  ringkasanPerjalananKlinis: string;
  identifikasiKondisiKritis: string;
  analisisTrenPasien: string;
  ringkasanSkrining: {
    domainFisik: string;
    domainPsikologis: string;
    domainSosial: string;
    domainSpiritual: string;
    kebutuhanEdukasi: string;
    bebanCaregiver: string;
  };
  ringkasanNutrisi: string;
  ringkasanSosial: string;
  ringkasanACP: string;
  kesimpulanTelepaliatif: {
    diagnosisUtama: string;
    statusFungsionalAwal: string;
    statusFungsionalTerakhir: string;
    masalahPaliatifUtama: string;
    keluhanDominan: string;
    kondisiPalingKritis: string;
    responsTerhadapIntervensi: string;
    kondisiKlinisSaatIni: string;
    tujuanPerawatanSaatIni: string;
    rencanaTindakLanjut: string;
    lokasiPerawatanSaatIni: string;
    jadwalMonitoringBerikutnya: string;
  };
  rekomendasi: string[];
}

// ── Helper: Format a value with optional suffix ──────────────────────────────
function fmtVal(val: unknown, suffix: string): string {
  if (val == null) return '-' + suffix;
  return String(val) + suffix;
}

// ── Helper: Severity ranking ─────────────────────────────────────────────────
const SEVERITY_RANK: Record<string, number> = { hijau: 0, kuning: 1, merah: 2 };

// ── Helper: Compute vital sign criticality score ─────────────────────────────
function computeCriticalityScore(v: VitalSignRecord): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (v.oxygenSat != null && v.oxygenSat < 90) {
    score += 4;
    reasons.push(`SpO2 ${v.oxygenSat}% (<90%)`);
  }
  if (v.heartRate != null) {
    if (v.heartRate > 120) { score += 3; reasons.push(`Nadi ${v.heartRate} bpm (>120)`); }
    else if (v.heartRate < 50) { score += 3; reasons.push(`Nadi ${v.heartRate} bpm (<50)`); }
  }
  if (v.respiratoryRate != null) {
    if (v.respiratoryRate > 28) { score += 3; reasons.push(`RR ${v.respiratoryRate}/menit (>28)`); }
    else if (v.respiratoryRate < 8) { score += 3; reasons.push(`RR ${v.respiratoryRate}/menit (<8)`); }
  }
  if (v.systolicBP != null) {
    if (v.systolicBP > 180) { score += 3; reasons.push(`SBP ${v.systolicBP} mmHg (>180)`); }
    else if (v.systolicBP < 90) { score += 3; reasons.push(`SBP ${v.systolicBP} mmHg (<90)`); }
  }
  if (v.temperature != null) {
    if (v.temperature > 39) { score += 2; reasons.push(`Suhu ${v.temperature}°C (>39)`); }
    else if (v.temperature < 35) { score += 2; reasons.push(`Suhu ${v.temperature}°C (<35)`); }
  }

  return { score, reasons };
}

// ── Helper: Categorize medication ────────────────────────────────────────────
function categorizeMedication(med: MedicationWithAdherences): string {
  const name = med.medicineName.toLowerCase();
  const indication = (med.indication || '').toLowerCase();

  // Analgesik
  const analgesikKeywords = ['nyeri', 'pain', 'morphine', 'fentanyl', 'tramadol', 'ketorolac', 'paracetamol', 'ibuprofen', 'diclofenac', 'morfine', 'kodein', 'gabapentin', 'pregabalin'];
  if (analgesikKeywords.some(k => name.includes(k) || indication.includes(k))) return 'analgesik';

  // Antiemetik
  const antiemetikKeywords = ['mual', 'nausea', 'vomiting', 'muntah', 'ondansetron', 'metoclopramide', 'domperidone', 'granisetron'];
  if (antiemetikKeywords.some(k => name.includes(k) || indication.includes(k))) return 'antiemetik';

  // Laksatif
  const laksatifKeywords = ['konstipasi', 'constipation', 'sembelit', 'bisacodyl', 'lactulose', 'senna', 'peg', 'movicol'];
  if (laksatifKeywords.some(k => name.includes(k) || indication.includes(k))) return 'laksatif';

  // Antidepresan
  const antidepresanKeywords = ['depresi', 'depression', 'sertraline', 'fluoxetine', 'mirtazapine', 'citalopram', 'escitalopram', 'venlafaxine', 'amitriptyline'];
  if (antidepresanKeywords.some(k => name.includes(k) || indication.includes(k))) return 'antidepresan';

  // Ansiolitik
  const ansiolitikKeywords = ['cemas', 'anxiety', 'diazepam', 'lorazepam', 'alprazolam', 'clonazepam', 'midazolam'];
  if (ansiolitikKeywords.some(k => name.includes(k) || indication.includes(k))) return 'ansiolitik';

  return 'lainnya';
}

// ── Helper: Format TTV for display ───────────────────────────────────────────
function formatTTV(v: VitalSignRecord): Record<string, unknown> {
  return {
    tanggal: v.recordedAt,
    sistolik: v.systolicBP,
    diastolik: v.diastolicBP,
    nadi: v.heartRate,
    rr: v.respiratoryRate,
    suhu: v.temperature,
    spo2: v.oxygenSat,
    berat: v.weight,
    tinggi: v.height,
    bmi: v.bmi,
    catatan: v.notes,
  };
}

// ── Helper: Format TTV for narrative ─────────────────────────────────────────
function formatTTVNarrative(v: VitalSignRecord, label: string): string {
  const tgl = new Date(v.recordedAt).toLocaleString('id-ID');
  const parts = [
    `${label} (${tgl}):`,
    `  TD: ${fmtVal(v.systolicBP, '')}/${fmtVal(v.diastolicBP, ' mmHg')}`,
    `  Nadi: ${fmtVal(v.heartRate, ' bpm')}`,
    `  RR: ${fmtVal(v.respiratoryRate, '/menit')}`,
    `  Suhu: ${fmtVal(v.temperature, '°C')}`,
    `  SpO2: ${fmtVal(v.oxygenSat, '%')}`,
  ];
  if (v.weight != null) parts.push(`  BB: ${v.weight} kg`);
  if (v.bmi != null) parts.push(`  BMI: ${v.bmi}`);
  if (v.notes) parts.push(`  Catatan: ${v.notes}`);
  return parts.join('\n');
}

// ── Helper: Format complaint for narrative ───────────────────────────────────
function formatComplaintNarrative(c: DailyComplaintRecord, label: string): string {
  const tgl = new Date(c.submittedAt).toLocaleString('id-ID');
  const parts = [`${label} (${tgl}):`];
  parts.push(`  Kondisi: ${c.kondisiHariIni === 'baik' ? 'Baik' : 'Tidak Baik'}`);
  if (c.alasanKondisi) parts.push(`  Alasan: ${c.alasanKondisi}`);
  if (c.keluhanBaru === 'ada' && c.deskripsiKeluhanBaru) {
    parts.push(`  Keluhan Baru: ${c.deskripsiKeluhanBaru}`);
  }
  parts.push(`  Nyeri: ${c.kondisiNyeri}`);
  parts.push(`  Sesak: ${c.kondisiSesak}`);
  parts.push(`  Makan/Minum: ${c.makanMinum === 'ya' ? 'Ya' : 'Tidak'}`);
  if (c.makanMinum === 'tidak' && c.alasanMakanMinum) parts.push(`  Alasan: ${c.alasanMakanMinum}`);
  parts.push(`  Tidur: ${c.tidur === 'ya' ? 'Ya' : 'Tidak'}`);
  if (c.tidur === 'tidak' && c.alasanTidur) parts.push(`  Alasan: ${c.alasanTidur}`);
  if (c.masalahObat === 'ya' && c.deskripsiMasalahObat) {
    parts.push(`  Masalah Obat: ${c.deskripsiMasalahObat}`);
  }
  parts.push(`  Tingkat Keparahan: ${c.severityLevel}`);
  return parts.join('\n');
}

// ── Helper: Build comprehensive clinical context string for LLM ──────────────
function buildClinicalContext(params: {
  patient: {
    id: string;
    rmNumber: string | null;
    bpjsNumber: string | null;
    nik: string | null;
    primaryDiagnosis: string | null;
    secondaryDiagnosis: string | null;
    diseaseStage: string | null;
    attendingDoctorId: string | null;
    familyContactName: string | null;
    familyContactRelation: string | null;
    familyContactPhone: string | null;
    address: string | null;
    careStatus: string;
    patientStatus: string;
    riskLevel: string;
    notes: string | null;
  };
  user: {
    name: string;
    dateOfBirth: string | null;
    gender: string | null;
    nik: string | null;
    bpjsNumber: string | null;
    address: string | null;
  } | null;
  doctorName: string | null;
  doctorSpecialization: string | null;
  doctorLicense: string | null;
  vitalSigns: VitalSignRecord[];
  medications: MedicationWithAdherences[];
  screeningRecords: ScreeningRecord[];
  dailyComplaints: DailyComplaintRecord[];
  acpDocuments: ACPDocument[];
  additionalData: AdditionalData;
  ttvSerial: {
    ttvAwal: VitalSignRecord | null;
    ttvKritis: VitalSignRecord | null;
    ttvKritisReasons: string[];
    ttvTerakhir: VitalSignRecord | null;
  };
  keluhanHarian: {
    keluhanAwal: DailyComplaintRecord | null;
    keluhanTerberat: DailyComplaintRecord | null;
    keluhanTerakhir: DailyComplaintRecord | null;
    symptomFrequencies: Record<string, number>;
  };
  esasAnalysis: {
    skorAwal: Record<string, unknown> | null;
    skorTertinggi: Record<string, unknown> | null;
    skorTerakhir: Record<string, unknown> | null;
  };
  medicationCategories: Record<string, MedicationWithAdherences[]>;
}): string {
  const {
    patient, user, doctorName, doctorSpecialization, doctorLicense,
    vitalSigns, medications, screeningRecords, dailyComplaints, acpDocuments,
    additionalData, ttvSerial, keluhanHarian, esasAnalysis, medicationCategories,
  } = params;

  const lines: string[] = [];
  const name = user?.name || 'Pasien';

  // ── Demographics ──
  lines.push('=== DATA DEMOGRAFI PASIEN ===');
  lines.push(`Nama: ${name}`);
  lines.push(`Tanggal Lahir: ${user?.dateOfBirth || '-'}`);
  lines.push(`Jenis Kelamin: ${user?.gender || '-'}`);
  lines.push(`NIK: ${patient.nik || user?.nik || '-'}`);
  lines.push(`No. Rekam Medis: ${patient.rmNumber || '-'}`);
  lines.push(`No. BPJS: ${patient.bpjsNumber || user?.bpjsNumber || '-'}`);
  lines.push(`Alamat: ${patient.address || user?.address || '-'}`);
  lines.push(`Dokter Penanggung Jawab (DPJP): ${doctorName || '-'}${doctorSpecialization ? ` (${doctorSpecialization})` : ''}${doctorLicense ? ` - SIP: ${doctorLicense}` : ''}`);
  lines.push('');

  // ── Clinical Info ──
  lines.push('=== INFORMASI KLINIS ===');
  lines.push(`Diagnosa Utama: ${patient.primaryDiagnosis || '-'}`);
  lines.push(`Diagnosa Penyerta: ${patient.secondaryDiagnosis || '-'}`);
  lines.push(`Stadium Penyakit: ${patient.diseaseStage || '-'}`);
  lines.push(`Status Perawatan: ${patient.careStatus}`);
  lines.push(`Status Pasien: ${patient.patientStatus}`);
  lines.push(`Tingkat Risiko: ${patient.riskLevel}`);
  lines.push(`Kontak Keluarga: ${patient.familyContactName || '-'} (${patient.familyContactRelation || '-'}) - ${patient.familyContactPhone || '-'}`);
  if (patient.notes) lines.push(`Catatan: ${patient.notes}`);
  lines.push('');

  // ── TTV Serial Analysis ──
  lines.push('=== ANALISIS TTV SERIAL ===');
  if (ttvSerial.ttvAwal) {
    lines.push(formatTTVNarrative(ttvSerial.ttvAwal, 'TTV AWAL'));
  } else {
    lines.push('TTV AWAL: Tidak Ada Data');
  }
  lines.push('');
  if (ttvSerial.ttvKritis) {
    lines.push(formatTTVNarrative(ttvSerial.ttvKritis, 'TTV KRITIS'));
    if (ttvSerial.ttvKritisReasons.length > 0) {
      lines.push(`  Alasan Kritis: ${ttvSerial.ttvKritisReasons.join(', ')}`);
    }
  } else {
    lines.push('TTV KRITIS: Tidak Ada Data Kritis Teridentifikasi');
  }
  lines.push('');
  if (ttvSerial.ttvTerakhir) {
    lines.push(formatTTVNarrative(ttvSerial.ttvTerakhir, 'TTV TERAKHIR'));
  } else {
    lines.push('TTV TERAKHIR: Tidak Ada Data');
  }

  // TTV trend if we have both awal and terakhir
  if (ttvSerial.ttvAwal && ttvSerial.ttvTerakhir && vitalSigns.length >= 2) {
    lines.push('');
    lines.push('Tren TTV (Awal → Terakhir):');
    const awal = ttvSerial.ttvAwal;
    const akhir = ttvSerial.ttvTerakhir;
    if (awal.systolicBP != null && akhir.systolicBP != null) {
      const diff = akhir.systolicBP - awal.systolicBP;
      lines.push(`  Sistolik: ${awal.systolicBP} → ${akhir.systolicBP} mmHg (${diff > 0 ? '+' : ''}${diff})`);
    }
    if (awal.heartRate != null && akhir.heartRate != null) {
      const diff = akhir.heartRate - awal.heartRate;
      lines.push(`  Nadi: ${awal.heartRate} → ${akhir.heartRate} bpm (${diff > 0 ? '+' : ''}${diff})`);
    }
    if (awal.oxygenSat != null && akhir.oxygenSat != null) {
      const diff = akhir.oxygenSat - awal.oxygenSat;
      lines.push(`  SpO2: ${awal.oxygenSat} → ${akhir.oxygenSat}% (${diff > 0 ? '+' : ''}${diff})`);
    }
    if (awal.respiratoryRate != null && akhir.respiratoryRate != null) {
      const diff = akhir.respiratoryRate - awal.respiratoryRate;
      lines.push(`  RR: ${awal.respiratoryRate} → ${akhir.respiratoryRate}/menit (${diff > 0 ? '+' : ''}${diff})`);
    }
  }
  lines.push('');

  // ── All TTV Records ──
  if (vitalSigns.length > 0) {
    lines.push('=== SEMUA CATATAN TTV ===');
    vitalSigns.forEach((v, i) => {
      const tgl = new Date(v.recordedAt).toLocaleString('id-ID');
      const crit = computeCriticalityScore(v);
      const critLabel = crit.score > 0 ? ` [KRITIS: ${crit.reasons.join(', ')}]` : '';
      lines.push(
        `${i + 1}. Tgl: ${tgl}` +
        ` | TD: ${fmtVal(v.systolicBP, '')}/${fmtVal(v.diastolicBP, ' mmHg')}` +
        ` | Nadi: ${fmtVal(v.heartRate, ' bpm')}` +
        ` | RR: ${fmtVal(v.respiratoryRate, '/menit')}` +
        ` | Suhu: ${fmtVal(v.temperature, '°C')}` +
        ` | SpO2: ${fmtVal(v.oxygenSat, '%')}` +
        ` | BB: ${fmtVal(v.weight, ' kg')}` +
        ` | BMI: ${fmtVal(v.bmi, '')}` +
        `${v.notes ? ' | Catatan: ' + v.notes : ''}` +
        critLabel,
      );
    });
    lines.push('');
  }

  // ── Daily Complaints Analysis ──
  lines.push('=== ANALISIS KELUHAN HARIAN ===');
  if (keluhanHarian.keluhanAwal) {
    lines.push(formatComplaintNarrative(keluhanHarian.keluhanAwal, 'KELUHAN AWAL'));
  } else {
    lines.push('KELUHAN AWAL: Tidak Ada Data');
  }
  lines.push('');
  if (keluhanHarian.keluhanTerberat) {
    lines.push(formatComplaintNarrative(keluhanHarian.keluhanTerberat, 'KELUHAN TERBERAT'));
  } else {
    lines.push('KELUHAN TERBERAT: Tidak Ada Data');
  }
  lines.push('');
  if (keluhanHarian.keluhanTerakhir) {
    lines.push(formatComplaintNarrative(keluhanHarian.keluhanTerakhir, 'KELUHAN TERAKHIR'));
  } else {
    lines.push('KELUHAN TERAKHIR: Tidak Ada Data');
  }
  lines.push('');

  // Symptom frequencies
  const freqEntries = Object.entries(keluhanHarian.symptomFrequencies);
  if (freqEntries.length > 0) {
    lines.push('Frekuensi Gejala:');
    freqEntries
      .sort((a, b) => b[1] - a[1])
      .forEach(([symptom, count]) => {
        lines.push(`  - ${symptom}: ${count} kali`);
      });
    lines.push('');
  }

  // All daily complaints
  if (dailyComplaints.length > 0) {
    lines.push('=== SEMUA CATATAN KELUHAN HARIAN ===');
    dailyComplaints.forEach((c, i) => {
      const tgl = new Date(c.submittedAt).toLocaleString('id-ID');
      lines.push(
        `${i + 1}. Tgl: ${tgl}` +
        ` | Kondisi: ${c.kondisiHariIni}` +
        ` | Nyeri: ${c.kondisiNyeri}` +
        ` | Sesak: ${c.kondisiSesak}` +
        ` | Makan: ${c.makanMinum}` +
        ` | Tidur: ${c.tidur}` +
        ` | Severity: ${c.severityLevel}` +
        `${c.keluhanBaru === 'ada' && c.deskripsiKeluhanBaru ? ' | Keluhan: ' + c.deskripsiKeluhanBaru : ''}` +
        `${c.masalahObat === 'ya' && c.deskripsiMasalahObat ? ' | Masalah Obat: ' + c.deskripsiMasalahObat : ''}`,
      );
    });
    lines.push('');
  }

  // ── Categorized Medications ──
  lines.push('=== OBAT (TERKATEGORI) ===');
  const catLabels: Record<string, string> = {
    analgesik: 'ANALGESIK',
    antiemetik: 'ANTIEMETIK',
    laksatif: 'LAKSATIF',
    antidepresan: 'ANTIDEPRESAN',
    ansiolitik: 'ANSIOLITIK',
    lainnya: 'OBAT LAINNYA',
  };
  for (const [cat, meds] of Object.entries(medicationCategories)) {
    if (meds.length === 0) continue;
    lines.push(`${catLabels[cat] || cat.toUpperCase()} (${meds.length} obat):`);
    meds.forEach((m) => {
      const adherences = m.adherences || [];
      const missedDoses = adherences.filter(a => a.missedDose).length;
      const adherenceRate = adherences.length > 0
        ? `${((adherences.length - missedDoses) / adherences.length * 100).toFixed(0)}%`
        : 'Belum ada data';
      lines.push(
        `  - ${m.medicineName} ${m.dosage} ${m.frequency} (${m.route || 'oral'})` +
        ` | Indikasi: ${m.indication || '-'}` +
        ` | Kepatuhan: ${adherenceRate}` +
        ` | ${m.isActive ? 'Aktif' : 'Tidak Aktif'}` +
        ` | Mulai: ${m.startDate || '-'} - Selesai: ${m.endDate || '-'}` +
        `${m.notes ? ' | Catatan: ' + m.notes : ''}`,
      );
      // Side effects from adherences
      const sideEffectsList = adherences.filter(a => a.sideEffects).map(a => a.sideEffects);
      if (sideEffectsList.length > 0) {
        lines.push(`    Efek Samping: ${Array.from(new Set(sideEffectsList)).join('; ')}`);
      }
      const complaintsList = adherences.filter(a => a.complaints).map(a => a.complaints);
      if (complaintsList.length > 0) {
        lines.push(`    Keluhan: ${Array.from(new Set(complaintsList)).join('; ')}`);
      }
    });
    lines.push('');
  }

  // ── Screening Records ──
  if (screeningRecords.length > 0) {
    lines.push('=== HASIL SKRINING PALIATIF ===');
    const byType: Record<string, ScreeningRecord[]> = {};
    screeningRecords.forEach(s => {
      const type = s.screeningType;
      if (!byType[type]) byType[type] = [];
      byType[type].push(s);
    });

    for (const [type, records] of Object.entries(byType)) {
      lines.push(`${type.toUpperCase()} (${records.length} skrining):`);
      records.forEach((s, i) => {
        const tgl = new Date(s.performedAt).toLocaleDateString('id-ID');
        lines.push(
          `  ${i + 1}. Skor: ${s.score != null ? s.score : '-'} (${s.scoreLabel || '-'})` +
          ` | EWS: ${s.ewsLevel || '-'}` +
          ` | Tgl: ${tgl}` +
          ` | Interpretasi: ${s.interpretation || '-'}` +
          `${s.details ? ' | Detail: ' + s.details : ''}`,
        );
      });
      lines.push('');
    }
  }

  // ── ESAS Analysis ──
  lines.push('=== ANALISIS ESAS ===');
  if (esasAnalysis.skorAwal) {
    lines.push(`Skor Awal: ${JSON.stringify(esasAnalysis.skorAwal)}`);
  } else {
    lines.push('Skor Awal: Tidak Ada Data');
  }
  if (esasAnalysis.skorTertinggi) {
    lines.push(`Skor Tertinggi: ${JSON.stringify(esasAnalysis.skorTertinggi)}`);
  } else {
    lines.push('Skor Tertinggi: Tidak Ada Data');
  }
  if (esasAnalysis.skorTerakhir) {
    lines.push(`Skor Terakhir: ${JSON.stringify(esasAnalysis.skorTerakhir)}`);
  } else {
    lines.push('Skor Terakhir: Tidak Ada Data');
  }
  lines.push('');

  // ── Advance Care Planning ──
  if (acpDocuments.length > 0) {
    lines.push('=== ADVANCE CARE PLANNING ===');
    acpDocuments.forEach((acp, idx) => {
      lines.push(`Dokumen ACP #${idx + 1}${acp.isActive ? '' : ' (Tidak Aktif)'}:`);
      lines.push(`  Pengambil Keputusan: ${acp.decisionMakerName || '-'} (${acp.decisionMakerRelation || '-'}) - ${acp.decisionMakerPhone || '-'}`);
      lines.push(`  Tempat Perawatan Pilihan: ${acp.preferredCareLocation || '-'}`);
      lines.push(`  Tujuan Perawatan: ${acp.careGoal || '-'}`);
      lines.push(`  Preferensi Resusitasi (CPR/DNR): ${acp.resuscitationPref || '-'}`);
      lines.push(`  Preferensi Ventilator: ${acp.ventilatorPref || '-'}`);
      lines.push(`  Preferensi ICU: ${acp.icuPref || '-'}`);
      lines.push(`  Nutrisi Buatan: ${acp.artificialNutrition || '-'}`);
      lines.push(`  Dialisis: ${acp.dialysisPref || '-'}`);
      lines.push(`  Donasi Organ: ${acp.organDonation || '-'}`);
      lines.push(`  Tanda Tangan: Pasien=${acp.patientSigned ? 'Ya' : 'Belum'} | Keluarga=${acp.familySigned ? 'Ya' : 'Belum'} | Dokter=${acp.doctorSigned ? 'Ya' : 'Belum'}`);
      if (acp.signedAt) lines.push(`  Tanggal Penandatanganan: ${acp.signedAt}`);
      lines.push(`  Harapan Pasien: ${acp.patientHopes || '-'}`);
      lines.push(`  Kekhawatiran Pasien: ${acp.patientWorries || '-'}`);
      lines.push(`  Nilai Hidup Penting: ${acp.lifeValues || '-'}`);
      lines.push(`  Preferensi Akhir Hayat: ${acp.endOfLifePrefs || '-'}`);

      if (acp.revisions.length > 0) {
        lines.push('  Revisi:');
        acp.revisions.forEach((rev) => {
          const revDate = new Date(rev.createdAt).toLocaleDateString('id-ID');
          lines.push(`    - Tgl: ${revDate} | Oleh: ${rev.revisedBy || '-'} | Alasan: ${rev.reason || '-'} | Perubahan: ${rev.changes || '-'}`);
        });
      }
      lines.push('');
    });
  } else {
    lines.push('=== ADVANCE CARE PLANNING ===');
    lines.push('Belum ada dokumen ACP yang tersedia.');
    lines.push('');
  }

  // ── Nutrition (from additionalData) ──
  if (additionalData.nutritionRecords && additionalData.nutritionRecords.length > 0) {
    lines.push('=== CATATAN NUTRISI ===');
    additionalData.nutritionRecords.forEach((n, i) => {
      lines.push(`${i + 1}. ${JSON.stringify(n)}`);
    });
    lines.push('');
  }

  // ── Social Assessment ──
  if (additionalData.socialAssessmentRecords && additionalData.socialAssessmentRecords.length > 0) {
    lines.push('=== PENILAIAN SOSIAL ===');
    additionalData.socialAssessmentRecords.forEach((s, i) => {
      lines.push(`${i + 1}. ${JSON.stringify(s)}`);
    });
    lines.push('');
  }

  // ── Caregivers ──
  if (additionalData.caregivers && additionalData.caregivers.length > 0) {
    lines.push('=== CAREGIVER ===');
    additionalData.caregivers.forEach((c, i) => {
      lines.push(`${i + 1}. ${JSON.stringify(c)}`);
    });
    lines.push('');
  }

  // ── Family Meetings ──
  if (additionalData.familyMeetings && additionalData.familyMeetings.length > 0) {
    lines.push('=== PERTEMUAN KELUARGA ===');
    additionalData.familyMeetings.forEach((f, i) => {
      lines.push(`${i + 1}. ${JSON.stringify(f)}`);
    });
    lines.push('');
  }

  // ── Financial Support ──
  if (additionalData.financialSupportRecords && additionalData.financialSupportRecords.length > 0) {
    lines.push('=== DUKUNGAN KEUANGAN ===');
    additionalData.financialSupportRecords.forEach((f, i) => {
      lines.push(`${i + 1}. ${JSON.stringify(f)}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ── Helper: Parse JSON from LLM response ─────────────────────────────────────
function parseLLMJson(response: string): AIAnalysis | null {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(response);
    if (parsed && typeof parsed === 'object') return parsed as AIAnalysis;
  } catch {
    // Not direct JSON, continue
  }

  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed as AIAnalysis;
    } catch {
      // Failed to parse code block JSON
    }
  }

  // Try to find JSON object in the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') return parsed as AIAnalysis;
    } catch {
      // Failed to parse extracted JSON
    }
  }

  return null;
}

// ── Helper: Generate fallback AI analysis ─────────────────────────────────────
function generateFallbackAnalysis(params: {
  patient: {
    primaryDiagnosis: string | null;
    secondaryDiagnosis: string | null;
    diseaseStage: string | null;
    careStatus: string;
    patientStatus: string;
    riskLevel: string;
  };
  user: { name: string } | null;
  vitalSigns: VitalSignRecord[];
  ttvSerial: {
    ttvAwal: VitalSignRecord | null;
    ttvKritis: VitalSignRecord | null;
    ttvKritisReasons: string[];
    ttvTerakhir: VitalSignRecord | null;
  };
  dailyComplaints: DailyComplaintRecord[];
  keluhanHarian: {
    keluhanAwal: DailyComplaintRecord | null;
    keluhanTerberat: DailyComplaintRecord | null;
    keluhanTerakhir: DailyComplaintRecord | null;
    symptomFrequencies: Record<string, number>;
  };
  screeningRecords: ScreeningRecord[];
  medicationCategories: Record<string, MedicationWithAdherences[]>;
  acpDocuments: ACPDocument[];
  additionalData: AdditionalData;
}): AIAnalysis {
  const { patient, user, ttvSerial, keluhanHarian, screeningRecords, medicationCategories, acpDocuments, additionalData } = params;
  const name = user?.name || 'Pasien';

  const careStatusLabels: Record<string, string> = {
    rawat_jalan: 'Rawat Jalan', home_care: 'Home Care', hospice: 'Hospice', rawat_inap: 'Rawat Inap',
  };
  const riskLabels: Record<string, string> = {
    hijau: 'stabil (hijau)', kuning: 'moderat (kuning)', merah: 'kritis (merah)',
  };

  // ── Ringkasan Perjalanan Klinis ──
  const perjalananParts: string[] = [];
  perjalananParts.push(
    `Pasien ${name} dengan diagnosa utama ${patient.primaryDiagnosis || 'belum terdiagnosa'}` +
    `${patient.secondaryDiagnosis ? `, diagnosa penyerta ${patient.secondaryDiagnosis}` : ''}` +
    `${patient.diseaseStage ? ` pada stadium ${patient.diseaseStage}` : ''}.`,
  );
  perjalananParts.push(
    `Status perawatan: ${careStatusLabels[patient.careStatus] || patient.careStatus}, ` +
    `tingkat risiko: ${riskLabels[patient.riskLevel] || patient.riskLevel}, ` +
    `status pasien: ${patient.patientStatus}.`,
  );

  if (ttvSerial.ttvAwal && ttvSerial.ttvTerakhir) {
    perjalananParts.push(
      `Berdasarkan serial TTV, pasien mengalami perubahan dari ` +
      `TD ${fmtVal(ttvSerial.ttvAwal.systolicBP, '')}/${fmtVal(ttvSerial.ttvAwal.diastolicBP, '')} mmHg, ` +
      `Nadi ${fmtVal(ttvSerial.ttvAwal.heartRate, '')} bpm, ` +
      `SpO2 ${fmtVal(ttvSerial.ttvAwal.oxygenSat, '')}% ` +
      `menjadi ` +
      `TD ${fmtVal(ttvSerial.ttvTerakhir.systolicBP, '')}/${fmtVal(ttvSerial.ttvTerakhir.diastolicBP, '')} mmHg, ` +
      `Nadi ${fmtVal(ttvSerial.ttvTerakhir.heartRate, '')} bpm, ` +
      `SpO2 ${fmtVal(ttvSerial.ttvTerakhir.oxygenSat, '')}%.`,
    );
  }

  if (ttvSerial.ttvKritis) {
    perjalananParts.push(
      `Kondisi kritis teridentifikasi pada ${new Date(ttvSerial.ttvKritis.recordedAt).toLocaleDateString('id-ID')}` +
      ` dengan ${ttvSerial.ttvKritisReasons.join(', ')}.`,
    );
  }

  const ringkasanPerjalananKlinis = perjalananParts.join(' ');

  // ── Identifikasi Kondisi Kritis ──
  let identifikasiKondisiKritis = 'Tidak Ada Data';
  if (ttvSerial.ttvKritis) {
    const parts: string[] = [];
    parts.push(
      `Kondisi kritis teridentifikasi pada ${new Date(ttvSerial.ttvKritis.recordedAt).toLocaleString('id-ID')}.`,
    );
    parts.push(`Parameter abnormal: ${ttvSerial.ttvKritisReasons.join(', ')}.`);
    parts.push(
      `TTV saat kritis: TD ${fmtVal(ttvSerial.ttvKritis.systolicBP, '')}/${fmtVal(ttvSerial.ttvKritis.diastolicBP, '')} mmHg, ` +
      `Nadi ${fmtVal(ttvSerial.ttvKritis.heartRate, '')} bpm, ` +
      `RR ${fmtVal(ttvSerial.ttvKritis.respiratoryRate, '/menit')}, ` +
      `Suhu ${fmtVal(ttvSerial.ttvKritis.temperature, '°C')}, ` +
      `SpO2 ${fmtVal(ttvSerial.ttvKritis.oxygenSat, '%')}.`,
    );
    if (ttvSerial.ttvKritis.notes) parts.push(`Catatan: ${ttvSerial.ttvKritis.notes}`);
    identifikasiKondisiKritis = parts.join(' ');
  }

  // ── Analisis Tren Pasien ──
  let analisisTrenPasien = 'Stabil';
  if (ttvSerial.ttvAwal && ttvSerial.ttvTerakhir) {
    const awal = ttvSerial.ttvAwal;
    const akhir = ttvSerial.ttvTerakhir;
    const awalCritical = computeCriticalityScore(awal).score;
    const akhirCritical = computeCriticalityScore(akhir).score;

    if (akhirCritical > awalCritical + 2) {
      analisisTrenPasien = 'Memburuk';
    } else if (akhirCritical < awalCritical - 2) {
      analisisTrenPasien = 'Membaik';
    } else if (akhirCritical > 0 && awalCritical > 0) {
      analisisTrenPasien = 'Fluktuatif';
    } else if (akhirCritical >= 3) {
      analisisTrenPasien = patient.riskLevel === 'merah' ? 'Terminal' : 'Memburuk';
    } else {
      analisisTrenPasien = 'Stabil';
    }
  } else if (patient.riskLevel === 'merah') {
    analisisTrenPasien = 'Memburuk';
  }

  // Add explanation
  const trendExplanations: Record<string, string> = {
    'Membaik': 'Terdapat perbaikan parameter vital dibandingkan sebelumnya.',
    'Stabil': 'Parameter vital relatif stabil tanpa perubahan signifikan.',
    'Fluktuatif': 'Parameter vital menunjukkan fluktuasi, memerlukan monitoring ketat.',
    'Memburuk': 'Terdapat perburukan parameter vital yang memerlukan evaluasi dan penyesuaian terapi.',
    'Terminal': 'Pasien dalam kondisi terminal, fokus pada perawatan kenyamanan.',
    'End of Life': 'Pasien dalam fase akhir hayat, perawatan difokuskan pada kenyamanan dan dukungan.',
  };
  analisisTrenPasien += `. ${trendExplanations[analisisTrenPasien] || ''}`;

  // ── Ringkasan Skrining ──
  const domainFisik = screeningRecords.length > 0
    ? `Skrining menunjukkan ${screeningRecords.length} pemeriksaan. ` +
      screeningRecords.filter(s => ['esas', 'pps'].includes(s.screeningType))
        .map(s => `${s.screeningType.toUpperCase()}: skor ${s.score ?? '-'} (${s.scoreLabel ?? '-'})`)
        .join('; ') || 'Tidak Ada Data domain fisik'
    : 'Tidak Ada Data';

  const psicScreenings = screeningRecords.filter(s => s.screeningType === 'distress');
  const domainPsikologis = psicScreenings.length > 0
    ? `Skrining distress: ${psicScreenings.map(s => `skor ${s.score ?? '-'} (${s.interpretation ?? '-'})`).join('; ')}. ` +
      (medicationCategories.antidepresan?.length > 0 || medicationCategories.ansiolitik?.length > 0
        ? `Pasien mendapat terapi psikotropika: ${[...(medicationCategories.antidepresan || []), ...(medicationCategories.ansiolitik || [])].map(m => m.medicineName).join(', ')}.`
        : 'Tidak ada terapi psikotropika yang tercatat.')
    : 'Tidak Ada Data';

  const domainSosial = (additionalData.socialAssessmentRecords ?? []).length > 0
    ? `Terdapat ${(additionalData.socialAssessmentRecords ?? []).length} catatan penilaian sosial.`
    : 'Tidak Ada Data penilaian sosial.';

  const domainSpiritual = acpDocuments.length > 0
    ? `Aspek spiritual teridentifikasi melalui ACP: ${[acpDocuments[0].patientHopes, acpDocuments[0].lifeValues, acpDocuments[0].endOfLifePrefs].filter(Boolean).join('; ') || 'Tidak ada aspek spiritual yang tercatat'}.`
    : 'Tidak Ada Data';

  const kebutuhanEdukasi = [
    ...(acpDocuments.length === 0 ? ['Diskusi Advance Care Planning'] : []),
    ...(medicationCategories.analgesik?.length > 0 ? ['Edukasi manajemen nyeri dan penggunaan analgesik'] : []),
    'Edukasi tanda bahaya yang harus segera dilaporkan',
    'Edukasi manajemen gejala paliatif',
  ].join('; ');

  const bebanCaregiver = (additionalData.caregivers ?? []).length > 0
    ? `Terdapat ${(additionalData.caregivers ?? []).length} caregiver yang tercatat.`
    : screeningRecords.filter(s => s.screeningType === 'zarit').length > 0
      ? `Skrining Zarit: ${screeningRecords.filter(s => s.screeningType === 'zarit').map(s => `skor ${s.score ?? '-'} (${s.interpretation ?? '-'})`).join('; ')}.`
      : 'Tidak Ada Data';

  // ── Ringkasan Nutrisi ──
  const ringkasanNutrisi = (additionalData.nutritionRecords ?? []).length > 0
    ? `Terdapat ${(additionalData.nutritionRecords ?? []).length} catatan nutrisi. ${params.dailyComplaints.length > 0 ? `Keluhan terkait makan/minum: ${params.dailyComplaints.filter(c => c.makanMinum === 'tidak').length} dari ${params.dailyComplaints.length} laporan menunjukkan masalah asupan.` : ''}`
    : params.dailyComplaints.length > 0
      ? `Berdasarkan keluhan harian: ${params.dailyComplaints.filter(c => c.makanMinum === 'tidak').length} dari ${params.dailyComplaints.length} laporan menunjukkan masalah asupan makan/minum.`
      : 'Tidak Ada Data nutrisi';

  // ── Ringkasan Sosial ──
  const ringkasanSosial = [
    (additionalData.socialAssessmentRecords ?? []).length > 0 ? `Terdapat ${(additionalData.socialAssessmentRecords ?? []).length} penilaian sosial.` : '',
    (additionalData.familyMeetings ?? []).length > 0 ? `Terdapat ${(additionalData.familyMeetings ?? []).length} pertemuan keluarga.` : '',
    (additionalData.financialSupportRecords ?? []).length > 0 ? `Terdapat ${(additionalData.financialSupportRecords ?? []).length} catatan dukungan keuangan.` : '',
    params.patient.primaryDiagnosis ? '' : '',
  ].filter(Boolean).join(' ') || 'Tidak Ada Data sosial';

  // ── Ringkasan ACP ──
  let ringkasanACP = 'Belum ada dokumen Advance Care Planning yang tersedia. Disarankan untuk segera melakukan diskusi ACP dengan pasien dan keluarga.';
  if (acpDocuments.length > 0) {
    const acp = acpDocuments[0];
    const parts: string[] = [];
    parts.push(`Dokumen ACP tersedia${acp.isActive ? ' dan aktif' : ' (tidak aktif)'}.`);
    parts.push(`Tujuan perawatan: ${acp.careGoal || '-'}.`);
    parts.push(`Preferensi tempat perawatan: ${acp.preferredCareLocation || '-'}.`);
    parts.push(`Resusitasi: ${acp.resuscitationPref === 'dnr' ? 'DNR (Do Not Resuscitate)' : acp.resuscitationPref === 'cpr' ? 'CPR' : '-'}.`);
    parts.push(`Ventilator: ${acp.ventilatorPref || '-'}. ICU: ${acp.icuPref || '-'}.`);
    parts.push(`Nutrisi buatan: ${acp.artificialNutrition || '-'}. Dialisis: ${acp.dialysisPref || '-'}.`);
    parts.push(`Pengambil keputusan: ${acp.decisionMakerName || '-'} (${acp.decisionMakerRelation || '-'}).`);
    parts.push(`Tanda tangan: Pasien=${acp.patientSigned ? 'Ya' : 'Belum'}, Keluarga=${acp.familySigned ? 'Ya' : 'Belum'}, Dokter=${acp.doctorSigned ? 'Ya' : 'Belum'}.`);
    if (acp.patientHopes) parts.push(`Harapan pasien: ${acp.patientHopes}.`);
    if (acp.patientWorries) parts.push(`Kekhawatiran pasien: ${acp.patientWorries}.`);
    if (acp.revisions.length > 0) parts.push(`Dokumen telah mengalami ${acp.revisions.length} kali revisi.`);
    ringkasanACP = parts.join(' ');
  }

  // ── Kesimpulan Telepaliatif ──
  const ppsRecords = screeningRecords.filter(s => s.screeningType === 'pps');
  const latestPPS = ppsRecords.length > 0 ? ppsRecords[0] : null;
  const earliestPPS = ppsRecords.length > 0 ? ppsRecords[ppsRecords.length - 1] : null;

  // Compile dominant complaints
  const topSymptoms = Object.entries(keluhanHarian.symptomFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  const allMeds = Object.values(medicationCategories).flat();
  const adherenceRates = allMeds.map(m => {
    const total = m.adherences.length;
    if (total === 0) return null;
    const missed = m.adherences.filter(a => a.missedDose).length;
    return (total - missed) / total * 100;
  }).filter((r): r is number => r !== null);

  const avgAdherence = adherenceRates.length > 0
    ? adherenceRates.reduce((a, b) => a + b, 0) / adherenceRates.length
    : 0;

  const kesimpulanTelepaliatif = {
    diagnosisUtama: patient.primaryDiagnosis || 'Tidak Ada Data',
    statusFungsionalAwal: earliestPPS ? `PPS ${earliestPPS.score ?? '-'} (${earliestPPS.scoreLabel ?? '-'})` : 'Tidak Ada Data',
    statusFungsionalTerakhir: latestPPS ? `PPS ${latestPPS.score ?? '-'} (${latestPPS.scoreLabel ?? '-'})` : 'Tidak Ada Data',
    masalahPaliatifUtama: topSymptoms.length > 0 ? topSymptoms.join(', ') : patient.primaryDiagnosis || 'Tidak Ada Data',
    keluhanDominan: topSymptoms.length > 0 ? topSymptoms.join(', ') : 'Tidak Ada Data',
    kondisiPalingKritis: ttvSerial.ttvKritis
      ? `Pada ${new Date(ttvSerial.ttvKritis.recordedAt).toLocaleDateString('id-ID')}: ${ttvSerial.ttvKritisReasons.join(', ')}`
      : 'Tidak Ada Data',
    responsTerhadapIntervensi: avgAdherence > 0
      ? `Kepatuhan obat rata-rata ${avgAdherence.toFixed(0)}%. ${avgAdherence >= 80 ? 'Respons cukup baik.' : 'Kepatuhan perlu ditingkatkan.'}`
      : 'Tidak Ada Data kepatuhan',
    kondisiKlinisSaatIni: `Risiko ${riskLabels[patient.riskLevel] || patient.riskLevel}, perawatan ${careStatusLabels[patient.careStatus] || patient.careStatus}`,
    tujuanPerawatanSaatIni: acpDocuments.length > 0
      ? (acpDocuments[0].careGoal || 'Tidak ditentukan')
      : 'Tidak Ada Data ACP',
    rencanaTindakLanjut: patient.riskLevel === 'merah'
      ? 'Evaluasi dan stabilisasi segera, pertimbangkan peningkatan level perawatan'
      : patient.riskLevel === 'kuning'
        ? 'Monitoring ketat, penyesuaian terapi, evaluasi berkala'
        : 'Lanjutkan perawatan paliatif dengan monitoring rutin',
    lokasiPerawatanSaatIni: careStatusLabels[patient.careStatus] || patient.careStatus,
    jadwalMonitoringBerikutnya: patient.riskLevel === 'merah'
      ? 'Dalam 4-6 jam'
      : patient.riskLevel === 'kuning'
        ? 'Dalam 8-12 jam'
        : 'Dalam 24 jam',
  };

  // ── Rekomendasi ──
  const rekomendasi: string[] = [];
  rekomendasi.push(
    `Lanjut monitoring paliatif dengan frekuensi sesuai tingkat risiko (${patient.riskLevel === 'merah' ? 'setiap 4-6 jam' : patient.riskLevel === 'kuning' ? 'setiap 8-12 jam' : 'setiap 24 jam'})`,
  );
  if (patient.riskLevel === 'merah') {
    rekomendasi.push('Pertimbangkan rawat inap untuk monitoring dan stabilisasi kondisi');
  }
  if (patient.careStatus === 'rawat_jalan' && patient.riskLevel !== 'hijau') {
    rekomendasi.push('Home care untuk memfasilitasi perawatan di lingkungan yang nyaman bagi pasien');
  }
  if (medicationCategories.analgesik?.length > 0) {
    rekomendasi.push('Evaluasi dan optimasi regimen analgesik secara berkala');
  }
  if (acpDocuments.length === 0) {
    rekomendasi.push('Segera lakukan diskusi Advance Care Planning dengan pasien dan keluarga');
  } else {
    const acp = acpDocuments[0];
    if (!acp.patientSigned || !acp.familySigned || !acp.doctorSigned) {
      rekomendasi.push('Lengkapi penandatanganan dokumen Advance Care Planning');
    }
  }
  if (patient.riskLevel === 'merah' && patient.careStatus !== 'hospice') {
    rekomendasi.push('Pertimbangkan hospice care untuk perawatan suportif dan kenyamanan');
  }
  if (acpDocuments.length > 0 && acpDocuments[0].careGoal === 'akhir_hayat') {
    rekomendasi.push('Perawatan akhir hayat: Fokus pada kenyamanan, pengendalian gejala, dan dukungan psikososial');
  }
  if (screeningRecords.some(s => s.ewsLevel === 'merah')) {
    rekomendasi.push('Evaluasi segera hasil skrining dengan EWS merah');
  }
  rekomendasi.push(
    `Evaluasi ulang skrining paliatif dalam ${patient.riskLevel === 'merah' ? '3 hari' : patient.riskLevel === 'kuning' ? '7 hari' : '14 hari'}`,
  );

  return {
    ringkasanPerjalananKlinis,
    identifikasiKondisiKritis,
    analisisTrenPasien,
    ringkasanSkrining: {
      domainFisik,
      domainPsikologis,
      domainSosial,
      domainSpiritual,
      kebutuhanEdukasi,
      bebanCaregiver,
    },
    ringkasanNutrisi,
    ringkasanSosial,
    ringkasanACP,
    kesimpulanTelepaliatif,
    rekomendasi,
  };
}

// ── Helper: Generate document number ─────────────────────────────────────────
async function generateDocumentNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Count existing resumes this month to generate sequence
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const startOfNextMonth = new Date(year, now.getMonth() + 1, 1);

  const count = await db.palliativeResume.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `RPM/${year}/${month}/${sequence}`;
}

// ── Helper: Build the LLM system prompt ──────────────────────────────────────
function buildSystemPrompt(): string {
  return [
    'Anda adalah asisten klinis AI yang ahli dalam perawatan paliatif dan pembuatan resume medis profesional.',
    'Tugas Anda adalah menganalisis data pasien paliatif secara komprehensif dan menghasilkan resume medis dalam format JSON.',
    '',
    'INSTRUKSI:',
    '- Gunakan bahasa Indonesia yang profesional dan medis.',
    '- Berikan analisis spesifik berdasarkan data yang tersedia, bukan pernyataan umum.',
    '- Sertakan nilai numerik dari pemeriksaan dalam narasi.',
    '- Jika data tidak tersedia, nyatakan "Tidak Ada Data" dengan jelas alih-alih berasumsi.',
    '- Jangan membuat kesimpulan di luar data yang tersedia.',
    '- Output HARUS berupa JSON valid tanpa markdown formatting.',
    '',
    'FORMAT OUTPUT JSON YANG HARUS DIKANDUNG:',
    '{',
    '  "ringkasanPerjalananKlinis": "string - narasi komprehensif perjalanan klinis pasien dari awal hingga saat ini, mencakup diagnosa, progresivitas, perubahan TTV, dan respons terapi",',
    '  "identifikasiKondisiKritis": "string - kapan kondisi kritis terjadi, penyebab, gejala utama, TTV saat kritis, intervensi yang dilakukan, respons pasien",',
    '  "analisisTrenPasien": "string - salah satu: Membaik/Stabil/Fluktuatif/Memburuk/Terminal/End of Life, disertai penjelasan berdasarkan data serial",',
    '  "ringkasanSkrining": {',
    '    "domainFisik": "string - narasi domain fisik berdasarkan ESAS, PPS, keluhan nyeri/sesak",',
    '    "domainPsikologis": "string - narasi domain psikologis berdasarkan skrining distress, kecemasan, depresi",',
    '    "domainSosial": "string - narasi domain sosial berdasarkan penilaian sosial, dukungan keluarga",',
    '    "domainSpiritual": "string - narasi domain spiritual berdasarkan ACP, harapan, kekhawatiran, nilai hidup",',
    '    "kebutuhanEdukasi": "string - kebutuhan edukasi yang teridentifikasi",',
    '    "bebanCaregiver": "string - narasi beban caregiver berdasarkan skrining Zarit dan data caregiver"',
    '  },',
    '  "ringkasanNutrisi": "string - narasi status nutrisi berdasarkan catatan nutrisi dan keluhan makan/minum",',
    '  "ringkasanSosial": "string - narasi kondisi sosial pasien dan keluarga",',
    '  "ringkasanACP": "string - narasi lengkap Advance Care Planning termasuk preferensi, keputusan, harapan, kekhawatiran",',
    '  "kesimpulanTelepaliatif": {',
    '    "diagnosisUtama": "string",',
    '    "statusFungsionalAwal": "string",',
    '    "statusFungsionalTerakhir": "string",',
    '    "masalahPaliatifUtama": "string",',
    '    "keluhanDominan": "string",',
    '    "kondisiPalingKritis": "string",',
    '    "responsTerhadapIntervensi": "string",',
    '    "kondisiKlinisSaatIni": "string",',
    '    "tujuanPerawatanSaatIni": "string",',
    '    "rencanaTindakLanjut": "string",',
    '    "lokasiPerawatanSaatIni": "string",',
    '    "jadwalMonitoringBerikutnya": "string"',
    '  },',
    '  "rekomendasi": ["string - daftar rekomendasi tindak lanjut"]',
    '}',
    '',
    'PENTING: Output hanya JSON yang valid. Jangan gunakan markdown code block. Jangan tambahkan teks di luar JSON.',
  ].join('\n');
}

// ── Helper: Build full markdown content ───────────────────────────────────────
function buildFullMarkdown(params: {
  dataPasien: {
    nama: string | null;
    tanggalLahir: string | null;
    umur?: string | null;
    jenisKelamin: string | null;
    nik: string | null;
    noRM: string | null;
    noBPJS: string | null;
    alamat: string | null;
    noTelepon?: string | null;
    diagnosaUtama: string | null;
    diagnosaPenyerta: string | null;
    stadiumPenyakit: string | null;
    dpjp: string | null;
    dpjpSpesialisasi: string | null;
    dpjpSIP: string | null;
    statusPerawatan: string;
    statusPasien: string;
    tingkatRisiko: string;
    tanggalRegistrasi?: string | null;
    kontakKeluarga: { nama: string | null; hubungan: string | null; telepon: string | null };
  };
  ttvSerial: {
    ttvAwal: VitalSignRecord | null;
    ttvKritis: VitalSignRecord | null;
    ttvKritisReasons: string[];
    ttvTerakhir: VitalSignRecord | null;
  };
  vitalSigns: VitalSignRecord[];
  keluhanHarian: {
    keluhanAwal: DailyComplaintRecord | null;
    keluhanTerberat: DailyComplaintRecord | null;
    keluhanTerakhir: DailyComplaintRecord | null;
    symptomFrequencies: Record<string, number>;
  };
  screeningsByType: Record<string, ScreeningRecord[]>;
  esasAnalysis: {
    skorAwal: Record<string, unknown> | null;
    skorTertinggi: Record<string, unknown> | null;
    skorTerakhir: Record<string, unknown> | null;
  };
  obatResponse: {
    analgesik: MedicationWithAdherences[];
    simtomatik: {
      antiemetik: MedicationWithAdherences[];
      laksatif: MedicationWithAdherences[];
      antidepresan: MedicationWithAdherences[];
      ansiolitik: MedicationWithAdherences[];
    };
    obatLainnya: MedicationWithAdherences[];
    kepatuhan: string;
    perubahanRegimen: string;
    responsTerapi: string;
  };
  nutrisiResponse: {
    catatan: Record<string, unknown>[];
    ringkasan: string;
  };
  sosialResponse: {
    penilaianSosial: Record<string, unknown>[];
    caregiver: Record<string, unknown>[];
    pertemuanKeluarga: Record<string, unknown>[];
    dukunganKeuangan: Record<string, unknown>[];
    ringkasan: string;
  };
  acpResponse: {
    dokumen: ACPDocument[];
    ringkasan: string;
  };
  aiAnalysis: AIAnalysis;
}): string {
  const {
    dataPasien, ttvSerial, vitalSigns, keluhanHarian,
    screeningsByType, esasAnalysis, obatResponse,
    nutrisiResponse, sosialResponse, acpResponse, aiAnalysis,
  } = params;

  const md: string[] = [];

  // ─── TITLE ──────────────────────────────────────────────────────────────
  md.push('# RESUME MEDIS TELEPALIATIF');
  md.push('');

  // ─── DATA PASIEN ────────────────────────────────────────────────────────
  md.push('## DATA PASIEN');
  md.push('| Field | Nilai |');
  md.push('|-------|-------|');
  md.push(`| Nama | ${dataPasien.nama || '-'} |`);
  md.push(`| Tanggal Lahir | ${dataPasien.tanggalLahir || '-'} |`);
  md.push(`| Umur | ${dataPasien.umur || '-'} |`);
  md.push(`| Jenis Kelamin | ${dataPasien.jenisKelamin || '-'} |`);
  md.push(`| NIK | ${dataPasien.nik || '-'} |`);
  md.push(`| No. RM | ${dataPasien.noRM || '-'} |`);
  md.push(`| No. BPJS | ${dataPasien.noBPJS || '-'} |`);
  md.push(`| Alamat | ${dataPasien.alamat || '-'} |`);
  md.push(`| No. Telepon | ${dataPasien.noTelepon || '-'} |`);
  md.push(`| Diagnosa Utama | ${dataPasien.diagnosaUtama || '-'} |`);
  md.push(`| Diagnosa Penyerta | ${dataPasien.diagnosaPenyerta || '-'} |`);
  md.push(`| Stadium Penyakit | ${dataPasien.stadiumPenyakit || '-'} |`);
  md.push(`| DPJP | ${dataPasien.dpjp || '-'} |`);
  md.push(`| Spesialisasi DPJP | ${dataPasien.dpjpSpesialisasi || '-'} |`);
  md.push(`| SIP DPJP | ${dataPasien.dpjpSIP || '-'} |`);
  md.push(`| Status Perawatan | ${dataPasien.statusPerawatan || '-'} |`);
  md.push(`| Status Pasien | ${dataPasien.statusPasien || '-'} |`);
  md.push(`| Tingkat Risiko | ${dataPasien.tingkatRisiko || '-'} |`);
  md.push(`| Tanggal Registrasi | ${dataPasien.tanggalRegistrasi || '-'} |`);
  md.push(`| Kontak Keluarga - Nama | ${dataPasien.kontakKeluarga?.nama || '-'} |`);
  md.push(`| Kontak Keluarga - Hubungan | ${dataPasien.kontakKeluarga?.hubungan || '-'} |`);
  md.push(`| Kontak Keluarga - Telepon | ${dataPasien.kontakKeluarga?.telepon || '-'} |`);
  md.push('');

  // ─── TTV SERIAL ─────────────────────────────────────────────────────────
  md.push('## TTV SERIAL');

  // TTV Awal
  md.push('### TTV Awal');
  if (ttvSerial.ttvAwal) {
    md.push(formatTTVNarrative(ttvSerial.ttvAwal, 'Awal'));
  } else {
    md.push('Tidak ada data TTV awal.');
  }
  md.push('');

  // TTV Kritis
  md.push('### TTV Kritis');
  if (ttvSerial.ttvKritis) {
    md.push(formatTTVNarrative(ttvSerial.ttvKritis, 'Kritis'));
    if (ttvSerial.ttvKritisReasons.length > 0) {
      md.push(`  **Alasan Kritis:** ${ttvSerial.ttvKritisReasons.join(', ')}`);
    }
  } else {
    md.push('Tidak ada kondisi kritis teridentifikasi.');
  }
  md.push('');

  // TTV Terakhir
  md.push('### TTV Terakhir');
  if (ttvSerial.ttvTerakhir) {
    md.push(formatTTVNarrative(ttvSerial.ttvTerakhir, 'Terakhir'));
  } else {
    md.push('Tidak ada data TTV terakhir.');
  }
  md.push('');

  // Riwayat TTV — Full table of ALL records
  md.push('### Riwayat TTV');
  if (vitalSigns.length > 0) {
    md.push('| No | Tanggal | TD (mmHg) | Nadi (bpm) | RR (/menit) | Suhu (°C) | SpO2 (%) | BB (kg) | BMI | Catatan |');
    md.push('|----|---------|-----------|------------|-------------|-----------|----------|---------|-----|---------|');
    vitalSigns.forEach((v, i) => {
      const tgl = new Date(v.recordedAt).toLocaleString('id-ID');
      const td = `${fmtVal(v.systolicBP, '')}/${fmtVal(v.diastolicBP, '')}`;
      md.push(`| ${i + 1} | ${tgl} | ${td} | ${fmtVal(v.heartRate, '')} | ${fmtVal(v.respiratoryRate, '')} | ${fmtVal(v.temperature, '')} | ${fmtVal(v.oxygenSat, '')} | ${fmtVal(v.weight, '')} | ${fmtVal(v.bmi, '')} | ${v.notes || '-'} |`);
    });
  } else {
    md.push('Tidak ada data riwayat TTV.');
  }
  md.push('');

  // ─── KELUHAN HARIAN ─────────────────────────────────────────────────────
  md.push('## KELUHAN HARIAN');

  // Keluhan Awal
  md.push('### Keluhan Awal');
  if (keluhanHarian.keluhanAwal) {
    md.push(formatComplaintNarrative(keluhanHarian.keluhanAwal, 'Awal'));
  } else {
    md.push('Tidak ada data keluhan awal.');
  }
  md.push('');

  // Keluhan Terberat
  md.push('### Keluhan Terberat');
  if (keluhanHarian.keluhanTerberat) {
    md.push(formatComplaintNarrative(keluhanHarian.keluhanTerberat, 'Terberat'));
  } else {
    md.push('Tidak ada data keluhan terberat.');
  }
  md.push('');

  // Keluhan Terakhir
  md.push('### Keluhan Terakhir');
  if (keluhanHarian.keluhanTerakhir) {
    md.push(formatComplaintNarrative(keluhanHarian.keluhanTerakhir, 'Terakhir'));
  } else {
    md.push('Tidak ada data keluhan terakhir.');
  }
  md.push('');

  // Analisis Frekuensi Gejala
  md.push('### Analisis Frekuensi Gejala');
  const freqEntries = Object.entries(keluhanHarian.symptomFrequencies).sort((a, b) => b[1] - a[1]);
  if (freqEntries.length > 0) {
    md.push('| Gejala | Frekuensi |');
    md.push('|--------|-----------|');
    for (const [symptom, count] of freqEntries) {
      md.push(`| ${symptom} | ${count}x |`);
    }
  } else {
    md.push('Tidak ada data frekuensi gejala.');
  }
  md.push('');

  // ─── SKRINING PALIATIF ──────────────────────────────────────────────────
  md.push('## SKRINING PALIATIF');
  const screeningTypes = Object.entries(screeningsByType);
  if (screeningTypes.length > 0) {
    for (const [type, records] of screeningTypes) {
      if (type === 'esas') continue; // ESAS has its own dedicated section below
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      md.push(`### ${typeLabel}`);
      if (records.length > 0) {
        md.push('| No | Tanggal | Skor | Label | Interpretasi | EWS Level | Detail |');
        md.push('|----|---------|------|-------|--------------|-----------|---------|');
        records.forEach((s, i) => {
          const tgl = new Date(s.performedAt).toLocaleString('id-ID');
          md.push(`| ${i + 1} | ${tgl} | ${s.score ?? '-'} | ${s.scoreLabel || '-'} | ${s.interpretation || '-'} | ${s.ewsLevel || '-'} | ${s.details || '-'} |`);
        });
      } else {
        md.push('Tidak ada data skrining.');
      }
      md.push('');
    }
  } else {
    md.push('Tidak ada data skrining paliatif.');
    md.push('');
  }

  // ─── ESAS ───────────────────────────────────────────────────────────────
  md.push('## ESAS');
  const ESAS_SYMPTOMS: { keys: string[]; label: string }[] = [
    { keys: ['nyeri', 'pain', 'painScore'], label: 'Nyeri' },
    { keys: ['lelah', 'fatigue', 'tiredness', 'fatigueScore'], label: 'Lelah' },
    { keys: ['mual', 'nausea', 'nauseaScore'], label: 'Mual' },
    { keys: ['depresi', 'depression', 'depressionScore'], label: 'Depresi' },
    { keys: ['cemas', 'anxiety', 'anxietyScore'], label: 'Cemas' },
    { keys: ['mengantuk', 'drowsiness', 'drowsinessScore'], label: 'Mengantuk' },
    { keys: ['nafsuMakan', 'appetite', 'appetiteScore', 'nafsu_makan'], label: 'Nafsu Makan' },
    { keys: ['pernafasan', 'dyspnea', 'breathing', 'dyspneaScore', 'sesak'], label: 'Pernafasan' },
    { keys: ['tidur', 'sleep', 'insomnia', 'sleepScore'], label: 'Tidur' },
  ];

  const esasAwal = esasAnalysis.skorAwal;
  const esasTertinggi = esasAnalysis.skorTertinggi;
  const esasTerakhir = esasAnalysis.skorTerakhir;

  if (esasAwal || esasTertinggi || esasTerakhir) {
    md.push('| Gejala | Awal | Tertinggi | Terakhir |');
    md.push('|--------|------|-----------|----------|');

    for (const symptom of ESAS_SYMPTOMS) {
      const getVal = (obj: Record<string, unknown> | null): string => {
        if (!obj) return '-';
        for (const key of symptom.keys) {
          if (obj[key] != null) return String(obj[key]);
        }
        return '-';
      };
      md.push(`| ${symptom.label} | ${getVal(esasAwal)} | ${getVal(esasTertinggi)} | ${getVal(esasTerakhir)} |`);
    }

    // Total score row
    const getTotal = (obj: Record<string, unknown> | null): string => {
      if (!obj) return '-';
      if (obj.score != null) return String(obj.score);
      return '-';
    };
    md.push(`| **Total** | **${getTotal(esasAwal)}** | **${getTotal(esasTertinggi)}** | **${getTotal(esasTerakhir)}** |`);
  } else {
    md.push('Tidak ada data ESAS.');
  }
  md.push('');

  // ─── TERAPI OBAT ────────────────────────────────────────────────────────
  md.push('## TERAPI OBAT');

  // Helper for medication table
  const writeMedTable = (title: string, meds: MedicationWithAdherences[]) => {
    if (meds.length > 0) {
      md.push(`#### ${title}`);
      md.push('| No | Nama Obat | Dosis | Frekuensi | Rute | Indikasi | Status |');
      md.push('|----|-----------|-------|-----------|------|----------|--------|');
      meds.forEach((m, i) => {
        const status = m.isActive ? 'Aktif' : 'Tidak Aktif';
        md.push(`| ${i + 1} | ${m.medicineName} | ${m.dosage} | ${m.frequency} | ${m.route || '-'} | ${m.indication || '-'} | ${status} |`);
      });
      md.push('');
    }
  };

  // Analgesik
  md.push('### Analgesik');
  if (obatResponse.analgesik.length > 0) {
    md.push('| No | Nama Obat | Dosis | Frekuensi | Rute | Indikasi | Status |');
    md.push('|----|-----------|-------|-----------|------|----------|--------|');
    obatResponse.analgesik.forEach((m, i) => {
      const status = m.isActive ? 'Aktif' : 'Tidak Aktif';
      md.push(`| ${i + 1} | ${m.medicineName} | ${m.dosage} | ${m.frequency} | ${m.route || '-'} | ${m.indication || '-'} | ${status} |`);
    });
  } else {
    md.push('Tidak ada obat analgesik.');
  }
  md.push('');

  // Simtomatik
  md.push('### Simtomatik');
  writeMedTable('Antiemetik', obatResponse.simtomatik.antiemetik);
  writeMedTable('Laksatif', obatResponse.simtomatik.laksatif);
  writeMedTable('Antidepresan', obatResponse.simtomatik.antidepresan);
  writeMedTable('Ansiolitik', obatResponse.simtomatik.ansiolitik);
  if (
    obatResponse.simtomatik.antiemetik.length === 0 &&
    obatResponse.simtomatik.laksatif.length === 0 &&
    obatResponse.simtomatik.antidepresan.length === 0 &&
    obatResponse.simtomatik.ansiolitik.length === 0
  ) {
    md.push('Tidak ada obat simtomatik.');
    md.push('');
  }

  // Obat Lainnya
  md.push('### Obat Lainnya');
  if (obatResponse.obatLainnya.length > 0) {
    md.push('| No | Nama Obat | Dosis | Frekuensi | Rute | Indikasi | Status |');
    md.push('|----|-----------|-------|-----------|------|----------|--------|');
    obatResponse.obatLainnya.forEach((m, i) => {
      const status = m.isActive ? 'Aktif' : 'Tidak Aktif';
      md.push(`| ${i + 1} | ${m.medicineName} | ${m.dosage} | ${m.frequency} | ${m.route || '-'} | ${m.indication || '-'} | ${status} |`);
    });
  } else {
    md.push('Tidak ada obat lainnya.');
  }
  md.push('');

  // Kepatuhan & Evaluasi
  md.push('### Kepatuhan & Evaluasi');
  md.push(`- **Tingkat Kepatuhan:** ${obatResponse.kepatuhan}`);
  md.push(`- **Perubahan Regimen:** ${obatResponse.perubahanRegimen}`);
  md.push(`- **Respons Terapi:** ${obatResponse.responsTerapi}`);
  md.push('');

  // ─── NUTRISI ────────────────────────────────────────────────────────────
  md.push('## NUTRISI');
  if (nutrisiResponse.catatan.length > 0) {
    md.push(`**Jumlah Catatan Nutrisi:** ${nutrisiResponse.catatan.length}`);
    md.push('');
    nutrisiResponse.catatan.forEach((rec, i) => {
      md.push(`**Catatan ${i + 1}:**`);
      for (const [key, val] of Object.entries(rec)) {
        md.push(`- ${key}: ${val != null ? String(val) : '-'}`);
      }
      md.push('');
    });
  } else {
    md.push('Tidak ada catatan nutrisi tercatat.');
    md.push('');
  }
  md.push('**Ringkasan AI:**');
  md.push(aiAnalysis.ringkasanNutrisi);
  md.push('');

  // ─── SOSIAL ─────────────────────────────────────────────────────────────
  md.push('## SOSIAL');
  const renderRecordList = (title: string, records: Record<string, unknown>[]) => {
    if (records.length > 0) {
      md.push(`### ${title}`);
      md.push(`Jumlah: ${records.length}`);
      md.push('');
      records.forEach((rec, i) => {
        md.push(`**${title} ${i + 1}:**`);
        for (const [key, val] of Object.entries(rec)) {
          md.push(`- ${key}: ${val != null ? String(val) : '-'}`);
        }
        md.push('');
      });
    }
  };
  renderRecordList('Penilaian Sosial', sosialResponse.penilaianSosial);
  renderRecordList('Caregiver', sosialResponse.caregiver);
  renderRecordList('Pertemuan Keluarga', sosialResponse.pertemuanKeluarga);
  renderRecordList('Dukungan Keuangan', sosialResponse.dukunganKeuangan);
  if (
    sosialResponse.penilaianSosial.length === 0 &&
    sosialResponse.caregiver.length === 0 &&
    sosialResponse.pertemuanKeluarga.length === 0 &&
    sosialResponse.dukunganKeuangan.length === 0
  ) {
    md.push('Tidak ada data sosial tercatat.');
    md.push('');
  }
  md.push('**Ringkasan AI:**');
  md.push(aiAnalysis.ringkasanSosial);
  md.push('');

  // ─── ADVANCE CARE PLANNING ──────────────────────────────────────────────
  md.push('## ADVANCE CARE PLANNING');
  if (acpResponse.dokumen.length > 0) {
    acpResponse.dokumen.forEach((doc, idx) => {
      md.push(`### Dokumen ACP ${idx + 1}`);
      md.push('| Field | Nilai |');
      md.push('|-------|-------|');
      md.push(`| Pengambil Keputusan | ${doc.decisionMakerName || '-'} |`);
      md.push(`| Hubungan | ${doc.decisionMakerRelation || '-'} |`);
      md.push(`| Telepon | ${doc.decisionMakerPhone || '-'} |`);
      md.push(`| Lokasi Perawatan Pilihan | ${doc.preferredCareLocation || '-'} |`);
      md.push(`| Tujuan Perawatan | ${doc.careGoal || '-'} |`);
      md.push(`| Preferensi Resusitasi | ${doc.resuscitationPref || '-'} |`);
      md.push(`| Preferensi Ventilator | ${doc.ventilatorPref || '-'} |`);
      md.push(`| Preferensi ICU | ${doc.icuPref || '-'} |`);
      md.push(`| Nutrisi Buatan | ${doc.artificialNutrition || '-'} |`);
      md.push(`| Preferensi Dialisis | ${doc.dialysisPref || '-'} |`);
      md.push(`| Donasi Organ | ${doc.organDonation || '-'} |`);
      md.push(`| Harapan Pasien | ${doc.patientHopes || '-'} |`);
      md.push(`| Kekhawatiran Pasien | ${doc.patientWorries || '-'} |`);
      md.push(`| Nilai Kehidupan | ${doc.lifeValues || '-'} |`);
      md.push(`| Preferensi Akhir Hayat | ${doc.endOfLifePrefs || '-'} |`);
      md.push(`| Ditandatangani Pasien | ${doc.patientSigned ? 'Ya' : 'Belum'} |`);
      md.push(`| Ditandatangani Keluarga | ${doc.familySigned ? 'Ya' : 'Belum'} |`);
      md.push(`| Ditandatangani Dokter | ${doc.doctorSigned ? 'Ya' : 'Belum'} |`);
      md.push(`| Tanggal Tanda Tangan | ${doc.signedAt || '-'} |`);
      md.push(`| Status | ${doc.isActive ? 'Aktif' : 'Tidak Aktif'} |`);
      if (doc.revisions.length > 0) {
        md.push(`| Jumlah Revisi | ${doc.revisions.length} |`);
      }
      md.push('');
    });
  } else {
    md.push('Tidak ada dokumen ACP.');
    md.push('');
  }
  md.push('**Ringkasan AI:**');
  md.push(aiAnalysis.ringkasanACP);
  md.push('');

  // ─── ANALISIS ───────────────────────────────────────────────────────────
  md.push('## ANALISIS');

  md.push('### Ringkasan Perjalanan Klinis');
  md.push(aiAnalysis.ringkasanPerjalananKlinis);
  md.push('');

  md.push('### Identifikasi Kondisi Kritis');
  md.push(aiAnalysis.identifikasiKondisiKritis);
  md.push('');

  md.push('### Analisis Tren Pasien');
  md.push(aiAnalysis.analisisTrenPasien);
  md.push('');

  md.push('### Ringkasan Skrining');
  md.push('| Domain | Ringkasan |');
  md.push('|--------|-----------|');
  md.push(`| Domain Fisik | ${aiAnalysis.ringkasanSkrining.domainFisik} |`);
  md.push(`| Domain Psikologis | ${aiAnalysis.ringkasanSkrining.domainPsikologis} |`);
  md.push(`| Domain Sosial | ${aiAnalysis.ringkasanSkrining.domainSosial} |`);
  md.push(`| Domain Spiritual | ${aiAnalysis.ringkasanSkrining.domainSpiritual} |`);
  md.push(`| Kebutuhan Edukasi | ${aiAnalysis.ringkasanSkrining.kebutuhanEdukasi} |`);
  md.push(`| Beban Caregiver | ${aiAnalysis.ringkasanSkrining.bebanCaregiver} |`);
  md.push('');

  md.push('### Ringkasan Nutrisi');
  md.push(aiAnalysis.ringkasanNutrisi);
  md.push('');

  md.push('### Ringkasan Sosial');
  md.push(aiAnalysis.ringkasanSosial);
  md.push('');

  md.push('### Ringkasan ACP');
  md.push(aiAnalysis.ringkasanACP);
  md.push('');

  // Kesimpulan Telepaliatif table
  md.push('### Kesimpulan Telepaliatif');
  md.push('| Field | Nilai |');
  md.push('|-------|-------|');
  md.push(`| Diagnosis Utama | ${aiAnalysis.kesimpulanTelepaliatif.diagnosisUtama} |`);
  md.push(`| Status Fungsional Awal | ${aiAnalysis.kesimpulanTelepaliatif.statusFungsionalAwal} |`);
  md.push(`| Status Fungsional Terakhir | ${aiAnalysis.kesimpulanTelepaliatif.statusFungsionalTerakhir} |`);
  md.push(`| Masalah Paliatif Utama | ${aiAnalysis.kesimpulanTelepaliatif.masalahPaliatifUtama} |`);
  md.push(`| Keluhan Dominan | ${aiAnalysis.kesimpulanTelepaliatif.keluhanDominan} |`);
  md.push(`| Kondisi Paling Kritis | ${aiAnalysis.kesimpulanTelepaliatif.kondisiPalingKritis} |`);
  md.push(`| Respons Terhadap Intervensi | ${aiAnalysis.kesimpulanTelepaliatif.responsTerhadapIntervensi} |`);
  md.push(`| Kondisi Klinis Saat Ini | ${aiAnalysis.kesimpulanTelepaliatif.kondisiKlinisSaatIni} |`);
  md.push(`| Tujuan Perawatan Saat Ini | ${aiAnalysis.kesimpulanTelepaliatif.tujuanPerawatanSaatIni} |`);
  md.push(`| Rencana Tindak Lanjut | ${aiAnalysis.kesimpulanTelepaliatif.rencanaTindakLanjut} |`);
  md.push(`| Lokasi Perawatan Saat Ini | ${aiAnalysis.kesimpulanTelepaliatif.lokasiPerawatanSaatIni} |`);
  md.push(`| Jadwal Monitoring Berikutnya | ${aiAnalysis.kesimpulanTelepaliatif.jadwalMonitoringBerikutnya} |`);
  md.push('');

  // Rekomendasi
  md.push('### Rekomendasi');
  if (aiAnalysis.rekomendasi.length > 0) {
    aiAnalysis.rekomendasi.forEach((r, i) => {
      md.push(`${i + 1}. ${r}`);
    });
  } else {
    md.push('Tidak ada rekomendasi.');
  }
  md.push('');

  return md.join('\n');
}

// ── POST /api/palliative-resume ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { palliativePatientId, additionalData: rawAdditionalData } = body;

    if (!palliativePatientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const additionalData: AdditionalData = rawAdditionalData || {};

    // ── 1. Fetch ALL patient data from DB ────────────────────────────────────
    const patient = await db.palliativePatient.findUnique({
      where: { id: palliativePatientId },
      include: {
        vitalSigns: { orderBy: { recordedAt: 'asc' } }, // ALL, ordered ASC for serial analysis
        medications: {
          include: { adherences: { orderBy: { date: 'desc' } } }, // ALL medications (active + inactive)
        },
        adherences: { orderBy: { date: 'desc' } },
        acpDocuments: {
          include: { revisions: true }, // ALL ACP documents (including inactive)
        },
        screeningRecords: { orderBy: { performedAt: 'asc' } }, // ALL, ordered ASC for trend analysis
        dailyComplaints: { orderBy: { submittedAt: 'asc' } }, // ALL, ordered ASC
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // ── Fetch latest resume for versioning (separate query to avoid include issues) ──
    const previousResume = await db.palliativeResume.findFirst({
      where: { palliativePatientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });

    // ── 2. Fetch User for demographics ───────────────────────────────────────
    const user = await db.user.findUnique({ where: { id: patient.patientId } });

    // ── 3. Fetch DoctorProfile for DPJP ──────────────────────────────────────
    let doctorName: string | null = null;
    let doctorSpecialization: string | null = null;
    let doctorLicense: string | null = null;

    if (patient.attendingDoctorId) {
      const doctorUser = await db.user.findUnique({
        where: { id: patient.attendingDoctorId },
        include: { doctorProfile: true },
      });
      if (doctorUser) {
        doctorName = doctorUser.name;
        doctorSpecialization = doctorUser.doctorProfile?.specialization || null;
        doctorLicense = doctorUser.doctorProfile?.licenseNumber || null;
      }
    }

    // ── 4. TTV Serial Analysis ───────────────────────────────────────────────
    const vitalSigns = patient.vitalSigns as unknown as VitalSignRecord[];
    let ttvAwal: VitalSignRecord | null = null;
    let ttvKritis: VitalSignRecord | null = null;
    let ttvKritisReasons: string[] = [];
    let ttvTerakhir: VitalSignRecord | null = null;

    if (vitalSigns.length > 0) {
      // TTV Awal: first (earliest) record
      ttvAwal = vitalSigns[0];

      // TTV Terakhir: most recent record
      ttvTerakhir = vitalSigns[vitalSigns.length - 1];

      // TTV Kritis: find the worst vital sign record using composite scoring
      let worstScore = 0;
      let worstRecord: VitalSignRecord | null = null;
      let worstReasons: string[] = [];

      for (const v of vitalSigns) {
        const { score, reasons } = computeCriticalityScore(v);
        if (score > worstScore) {
          worstScore = score;
          worstRecord = v;
          worstReasons = reasons;
        }
      }

      if (worstRecord && worstScore > 0) {
        ttvKritis = worstRecord;
        ttvKritisReasons = worstReasons;
      }
    }

    const ttvSerial = { ttvAwal, ttvKritis, ttvKritisReasons, ttvTerakhir };

    // ── 5. Daily Complaints Analysis ─────────────────────────────────────────
    const dailyComplaints = patient.dailyComplaints as unknown as DailyComplaintRecord[];
    let keluhanAwal: DailyComplaintRecord | null = null;
    let keluhanTerberat: DailyComplaintRecord | null = null;
    let keluhanTerakhir: DailyComplaintRecord | null = null;
    const symptomFrequencies: Record<string, number> = {};

    if (dailyComplaints.length > 0) {
      // Keluhan Awal: first complaint
      keluhanAwal = dailyComplaints[0];

      // Keluhan Terakhir: most recent complaint
      keluhanTerakhir = dailyComplaints[dailyComplaints.length - 1];

      // Keluhan Terberat: highest severity, or most symptoms
      let bestSeverity = -1;
      let bestSymptomCount = 0;

      for (const c of dailyComplaints) {
        const severityRank = SEVERITY_RANK[c.severityLevel] ?? 0;

        // Count symptoms
        let symptomCount = 0;
        if (c.kondisiHariIni === 'tidak_baik') symptomCount++;
        if (c.keluhanBaru === 'ada') symptomCount++;
        if (c.kondisiNyeri === 'bertambah') symptomCount++;
        if (c.kondisiSesak === 'bertambah') symptomCount++;
        if (c.makanMinum === 'tidak') symptomCount++;
        if (c.tidur === 'tidak') symptomCount++;
        if (c.masalahObat === 'ya') symptomCount++;

        // Compile symptom frequencies
        if (c.kondisiNyeri !== 'tidak_nyeri') {
          symptomFrequencies['Nyeri'] = (symptomFrequencies['Nyeri'] || 0) + 1;
        }
        if (c.kondisiSesak !== 'tidak_sesak') {
          symptomFrequencies['Sesak'] = (symptomFrequencies['Sesak'] || 0) + 1;
        }
        if (c.makanMinum === 'tidak') {
          symptomFrequencies['Gangguan Asupan'] = (symptomFrequencies['Gangguan Asupan'] || 0) + 1;
        }
        if (c.tidur === 'tidak') {
          symptomFrequencies['Gangguan Tidur'] = (symptomFrequencies['Gangguan Tidur'] || 0) + 1;
        }
        if (c.keluhanBaru === 'ada' && c.deskripsiKeluhanBaru) {
          // Try to extract individual complaints
          const symptoms = c.deskripsiKeluhanBaru.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          for (const s of symptoms) {
            symptomFrequencies[s] = (symptomFrequencies[s] || 0) + 1;
          }
        }
        if (c.masalahObat === 'ya') {
          symptomFrequencies['Masalah Obat'] = (symptomFrequencies['Masalah Obat'] || 0) + 1;
        }

        // Determine worst complaint
        if (severityRank > bestSeverity || (severityRank === bestSeverity && symptomCount > bestSymptomCount)) {
          bestSeverity = severityRank;
          bestSymptomCount = symptomCount;
          keluhanTerberat = c;
        }
      }
    }

    const keluhanHarian = { keluhanAwal, keluhanTerberat, keluhanTerakhir, symptomFrequencies };

    // ── 6. Categorize Screenings ─────────────────────────────────────────────
    const screeningRecords = patient.screeningRecords as unknown as ScreeningRecord[];

    // ESAS analysis
    const esasRecords = screeningRecords
      .filter(s => s.screeningType === 'esas')
      .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());

    let esasSkorAwal: Record<string, unknown> | null = null;
    let esasSkorTertinggi: Record<string, unknown> | null = null;
    let esasSkorTerakhir: Record<string, unknown> | null = null;

    if (esasRecords.length > 0) {
      // Skor Awal
      const first = esasRecords[0];
      try {
        esasSkorAwal = first.details ? { ...JSON.parse(first.details), score: first.score, performedAt: first.performedAt } : { score: first.score, performedAt: first.performedAt, scoreLabel: first.scoreLabel };
      } catch {
        esasSkorAwal = { score: first.score, performedAt: first.performedAt, scoreLabel: first.scoreLabel };
      }

      // Skor Terakhir
      const last = esasRecords[esasRecords.length - 1];
      try {
        esasSkorTerakhir = last.details ? { ...JSON.parse(last.details), score: last.score, performedAt: last.performedAt } : { score: last.score, performedAt: last.performedAt, scoreLabel: last.scoreLabel };
      } catch {
        esasSkorTerakhir = { score: last.score, performedAt: last.performedAt, scoreLabel: last.scoreLabel };
      }

      // Skor Tertinggi (highest total score)
      let maxScore = -1;
      let maxRecord: ScreeningRecord | null = null;
      for (const r of esasRecords) {
        if (r.score != null && r.score > maxScore) {
          maxScore = r.score;
          maxRecord = r;
        }
      }
      if (maxRecord) {
        try {
          esasSkorTertinggi = maxRecord.details ? { ...JSON.parse(maxRecord.details), score: maxRecord.score, performedAt: maxRecord.performedAt } : { score: maxRecord.score, performedAt: maxRecord.performedAt, scoreLabel: maxRecord.scoreLabel };
        } catch {
          esasSkorTertinggi = { score: maxRecord.score, performedAt: maxRecord.performedAt, scoreLabel: maxRecord.scoreLabel };
        }
      }
    }

    const esasAnalysis = { skorAwal: esasSkorAwal, skorTertinggi: esasSkorTertinggi, skorTerakhir: esasSkorTerakhir };

    // Group screenings by type
    const screeningsByType: Record<string, ScreeningRecord[]> = {};
    for (const s of screeningRecords) {
      if (!screeningsByType[s.screeningType]) screeningsByType[s.screeningType] = [];
      screeningsByType[s.screeningType].push(s);
    }

    // ── 7. Categorize Medications ────────────────────────────────────────────
    const medications = patient.medications as unknown as MedicationWithAdherences[];
    const medicationCategories: Record<string, MedicationWithAdherences[]> = {
      analgesik: [],
      antiemetik: [],
      laksatif: [],
      antidepresan: [],
      ansiolitik: [],
      lainnya: [],
    };

    for (const med of medications) {
      const cat = categorizeMedication(med);
      medicationCategories[cat].push(med);
    }

    // ── 8. Compile ACP data ──────────────────────────────────────────────────
    const acpDocuments = patient.acpDocuments as unknown as ACPDocument[];

    // ── 9. Build clinical context for LLM ────────────────────────────────────
    const clinicalContext = buildClinicalContext({
      patient: {
        id: patient.id,
        rmNumber: patient.rmNumber,
        bpjsNumber: patient.bpjsNumber,
        nik: patient.nik,
        primaryDiagnosis: patient.primaryDiagnosis,
        secondaryDiagnosis: patient.secondaryDiagnosis,
        diseaseStage: patient.diseaseStage,
        attendingDoctorId: patient.attendingDoctorId,
        familyContactName: patient.familyContactName,
        familyContactRelation: patient.familyContactRelation,
        familyContactPhone: patient.familyContactPhone,
        address: patient.address,
        careStatus: patient.careStatus,
        patientStatus: patient.patientStatus,
        riskLevel: patient.riskLevel,
        notes: patient.notes,
      },
      user: user ? { name: user.name, dateOfBirth: user.dateOfBirth, gender: user.gender, nik: user.nik, bpjsNumber: user.bpjsNumber, address: user.address } : null,
      doctorName,
      doctorSpecialization,
      doctorLicense,
      vitalSigns,
      medications,
      screeningRecords,
      dailyComplaints,
      acpDocuments,
      additionalData,
      ttvSerial,
      keluhanHarian,
      esasAnalysis,
      medicationCategories,
    });

    // ── 10. Attempt AI-generated analysis via LLM ────────────────────────────
    let aiAnalysis: AIAnalysis;
    let usedAI = false;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: buildSystemPrompt() },
          { role: 'user', content: `Berikut data pasien paliatif untuk dianalisis dan dibuatkan resume medis:\n\n${clinicalContext}` },
        ],
        thinking: { type: 'disabled' },
      });

      const llmResponse = completion.choices[0]?.message?.content || '';

      if (llmResponse) {
        const parsed = parseLLMJson(llmResponse);
        if (parsed) {
          aiAnalysis = parsed;
          usedAI = true;
        } else {
          // LLM returned non-parseable response, use fallback
          console.warn('LLM response could not be parsed as JSON, using fallback analysis');
          aiAnalysis = generateFallbackAnalysis({
            patient: {
              primaryDiagnosis: patient.primaryDiagnosis,
              secondaryDiagnosis: patient.secondaryDiagnosis,
              diseaseStage: patient.diseaseStage,
              careStatus: patient.careStatus,
              patientStatus: patient.patientStatus,
              riskLevel: patient.riskLevel,
            },
            user: user ? { name: user.name } : null,
            vitalSigns,
            ttvSerial,
            dailyComplaints,
            keluhanHarian,
            screeningRecords,
            medicationCategories,
            acpDocuments,
            additionalData,
          });
        }
      } else {
        aiAnalysis = generateFallbackAnalysis({
          patient: {
            primaryDiagnosis: patient.primaryDiagnosis,
            secondaryDiagnosis: patient.secondaryDiagnosis,
            diseaseStage: patient.diseaseStage,
            careStatus: patient.careStatus,
            patientStatus: patient.patientStatus,
            riskLevel: patient.riskLevel,
          },
          user: user ? { name: user.name } : null,
          vitalSigns,
          ttvSerial,
          dailyComplaints,
          keluhanHarian,
          screeningRecords,
          medicationCategories,
          acpDocuments,
          additionalData,
        });
      }
    } catch (aiError) {
      console.error('AI resume generation failed, using local fallback:', aiError);
      aiAnalysis = generateFallbackAnalysis({
        patient: {
          primaryDiagnosis: patient.primaryDiagnosis,
          secondaryDiagnosis: patient.secondaryDiagnosis,
          diseaseStage: patient.diseaseStage,
          careStatus: patient.careStatus,
          patientStatus: patient.patientStatus,
          riskLevel: patient.riskLevel,
        },
        user: user ? { name: user.name } : null,
        vitalSigns,
        ttvSerial,
        dailyComplaints,
        keluhanHarian,
        screeningRecords,
        medicationCategories,
        acpDocuments,
        additionalData,
      });
    }

    // ── 11. Build structured response ────────────────────────────────────────

    // Data Pasien
    // Calculate age from dateOfBirth
    const umur = user?.dateOfBirth
      ? (() => {
          const dob = new Date(user.dateOfBirth);
          const now = new Date();
          let age = now.getFullYear() - dob.getFullYear();
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
          return `${age} tahun`;
        })()
      : null;

    const dataPasien = {
      nama: user?.name || null,
      tanggalLahir: user?.dateOfBirth || null,
      umur,
      jenisKelamin: user?.gender || null,
      nik: patient.nik || user?.nik || null,
      noRM: patient.rmNumber || null,
      noBPJS: patient.bpjsNumber || user?.bpjsNumber || null,
      alamat: patient.address || user?.address || null,
      noTelepon: user?.phone || null,
      diagnosaUtama: patient.primaryDiagnosis,
      diagnosaPenyerta: patient.secondaryDiagnosis,
      stadiumPenyakit: patient.diseaseStage,
      dpjp: doctorName,
      dpjpSpesialisasi: doctorSpecialization,
      dpjpSIP: doctorLicense,
      statusPerawatan: patient.careStatus,
      statusPasien: patient.patientStatus,
      tingkatRisiko: patient.riskLevel,
      tanggalRegistrasi: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
      kontakKeluarga: {
        nama: patient.familyContactName,
        hubungan: patient.familyContactRelation,
        telepon: patient.familyContactPhone,
      },
    };

    // TTV Serial
    const ttvSerialResponse = {
      ttvAwal: ttvSerial.ttvAwal ? formatTTV(ttvSerial.ttvAwal) : null,
      ttvKritis: ttvSerial.ttvKritis ? { ...formatTTV(ttvSerial.ttvKritis), alasanKritis: ttvSerial.ttvKritisReasons } : null,
      ttvTerakhir: ttvSerial.ttvTerakhir ? formatTTV(ttvSerial.ttvTerakhir) : null,
    };

    // Keluhan Harian
    const keluhanHarianResponse = {
      keluhanAwal: keluhanHarian.keluhanAwal,
      keluhanTerberat: keluhanHarian.keluhanTerberat,
      keluhanTerakhir: keluhanHarian.keluhanTerakhir,
      analisis: Object.entries(keluhanHarian.symptomFrequencies)
        .sort((a, b) => b[1] - a[1])
        .map(([symptom, count]) => `${symptom}: ${count}x`)
        .join('; ') || 'Tidak Ada Data',
    };

    // Skrining Paliatif
    const skriningPaliatif: Record<string, unknown> = {};
    for (const [type, records] of Object.entries(screeningsByType)) {
      skriningPaliatif[type] = records;
    }

    // Obat
    const allMedsForResponse = Object.values(medicationCategories).flat();
    const totalAdherences = allMedsForResponse.reduce((sum, m) => sum + m.adherences.length, 0);
    const totalMissed = allMedsForResponse.reduce(
      (sum, m) => sum + m.adherences.filter(a => a.missedDose).length, 0,
    );
    const overallAdherence = totalAdherences > 0
      ? `${((totalAdherences - totalMissed) / totalAdherences * 100).toFixed(0)}%`
      : 'Belum ada data';

    // Check for regimen changes
    const inactiveMeds = medications.filter(m => !m.isActive);
    const perubahanRegimen = inactiveMeds.length > 0
      ? `Terdapat ${inactiveMeds.length} obat yang sudah tidak aktif: ${inactiveMeds.map(m => m.medicineName).join(', ')}`
      : 'Tidak ada perubahan regimen yang tercatat';

    const obatResponse = {
      analgesik: medicationCategories.analgesik,
      simtomatik: {
        antiemetik: medicationCategories.antiemetik,
        laksatif: medicationCategories.laksatif,
        antidepresan: medicationCategories.antidepresan,
        ansiolitik: medicationCategories.ansiolitik,
      },
      obatLainnya: medicationCategories.lainnya,
      kepatuhan: overallAdherence,
      perubahanRegimen,
      responsTerapi: aiAnalysis.kesimpulanTelepaliatif.responsTerhadapIntervensi,
    };

    // Nutrisi
    const nutrisiResponse = {
      catatan: additionalData.nutritionRecords || [],
      ringkasan: aiAnalysis.ringkasanNutrisi,
    };

    // Sosial
    const sosialResponse = {
      penilaianSosial: additionalData.socialAssessmentRecords || [],
      caregiver: additionalData.caregivers || [],
      pertemuanKeluarga: additionalData.familyMeetings || [],
      dukunganKeuangan: additionalData.financialSupportRecords || [],
      ringkasan: aiAnalysis.ringkasanSosial,
    };

    // ACP
    const acpResponse = {
      dokumen: acpDocuments,
      ringkasan: aiAnalysis.ringkasanACP,
    };

    // ── 12. Build full markdown content ──────────────────────────────────────
    const fullContent = buildFullMarkdown({
      dataPasien,
      ttvSerial,
      vitalSigns,
      keluhanHarian,
      screeningsByType,
      esasAnalysis,
      obatResponse,
      nutrisiResponse,
      sosialResponse,
      acpResponse,
      aiAnalysis,
    });

    // ── 13. Save to PalliativeResume table ────────────────────────────────────
    const documentNumber = await generateDocumentNumber();
    // previousResume already fetched before as separate query

    const resumeDataToSave = JSON.stringify({
      dataPasien,
      ttvSerial: ttvSerialResponse,
      keluhanHarian: keluhanHarianResponse,
      skriningPaliatif,
      esasScores: esasAnalysis,
      obat: obatResponse,
      nutrisi: nutrisiResponse,
      sosial: sosialResponse,
      acp: acpResponse,
      aiAnalysis,
    });

    const savedResume = await db.palliativeResume.create({
      data: {
        palliativePatientId: patient.id,
        documentNumber,
        generatedBy: patient.attendingDoctorId || 'system',
        generatedByRole: 'doctor',
        doctorSip: doctorLicense,
        doctorName: doctorName,
        version: previousResume ? previousResume.version + 1 : 1,
        previousVersionId: previousResume?.id || null,
        isSigned: false,
        resumeData: resumeDataToSave,
        fullContent,
      },
    });

    // ── 14. Create audit log entry ───────────────────────────────────────────
    await db.auditLog.create({
      data: {
        userId: patient.attendingDoctorId || undefined,
        action: 'PALLIATIVE_RESUME_GENERATED',
        entity: 'PalliativeResume',
        entityId: savedResume.id,
        details: usedAI
          ? `AI-powered palliative resume generated (Doc: ${documentNumber}, V${savedResume.version})`
          : `Palliative resume generated using local fallback - AI unavailable (Doc: ${documentNumber}, V${savedResume.version})`,
      },
    });

    // ── 15. Return response ──────────────────────────────────────────────────
    const resume = {
      id: savedResume.id,
      documentNumber,
      version: savedResume.version,
      dataPasien,
      ttvSerial: ttvSerialResponse,
      keluhanHarian: keluhanHarianResponse,
      skriningPaliatif,
      esasScores: esasAnalysis,
      obat: obatResponse,
      nutrisi: nutrisiResponse,
      sosial: sosialResponse,
      acp: acpResponse,
      aiAnalysis,
      fullContent,
    };

    return NextResponse.json({ resume, usedAI });
  } catch (error) {
    console.error('Palliative resume generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
