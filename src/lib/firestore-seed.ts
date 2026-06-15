// Firestore Seed Script — CareLivia Palliative Care Demo Data
// Uses Firebase client SDK; run in browser context only.
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date();
const iso = (offsetMs = 0) => new Date(now.getTime() + offsetMs).toISOString();

/** Check whether a top-level collection already has documents. */
async function collectionExists(path: string): Promise<boolean> {
  if (!db) return false;
  const snap = await getDocs(collection(db, path));
  return snap.size > 0;
}

/** Check whether a subcollection already has documents. */
async function subcollectionExists(parentCol: string, parentId: string, subCol: string): Promise<boolean> {
  if (!db) return false;
  const snap = await getDocs(collection(db, parentCol, parentId, subCol));
  return snap.size > 0;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const PATIENT_IDS = ['pp-1', 'pp-2', 'pp-3'] as const;

// ── Patients ──────────────────────────────────────────────────────────────────

const patientsData: Record<string, Record<string, unknown>> = {
  'pp-1': {
    patientId: 'patient-1',
    patientName: 'Ny. Siti Rahayu',
    rmNumber: 'RM-2025-001',
    bpjsNumber: '0001234567890',
    nik: '3201014505870001',
    dateOfBirth: '1945-05-08',
    gender: 'Perempuan',
    primaryDiagnosis: 'Kanker Payudara Metastasis Stage IV',
    secondaryDiagnosis: 'Diabetes Melitus Tipe 2, Hipertensi',
    diseaseStage: 'Stadium IV',
    attendingDoctorId: 'doc-sarah',
    attendingDoctorName: 'dr. Sarah Wijaya',
    familyContactName: 'Budi Rahayu',
    familyContactRelation: 'Anak',
    familyContactPhone: '081234567890',
    address: 'Jl. Melati No. 12, Bandung',
    careStatus: 'rawat_jalan',
    patientStatus: 'aktif',
    riskLevel: 'tinggi',
    notes: 'Pasien memerlukan perawatan paliatif intensif',
    createdAt: iso(),
    updatedAt: iso(),
  },
  'pp-2': {
    patientId: 'patient-2',
    patientName: 'Tn. Ahmad Fauzi',
    rmNumber: 'RM-2025-002',
    bpjsNumber: '0009876543210',
    nik: '3201015003790002',
    dateOfBirth: '1950-03-15',
    gender: 'Laki-laki',
    primaryDiagnosis: 'PPOK Berat',
    secondaryDiagnosis: 'Gagal Jantung Kongestif',
    diseaseStage: 'Stadium Berat',
    attendingDoctorId: 'doc-lisa',
    attendingDoctorName: 'dr. Lisa Permata',
    familyContactName: 'Dewi Fauzi',
    familyContactRelation: 'Istri',
    familyContactPhone: '082345678901',
    address: 'Jl. Kenanga No. 5, Jakarta',
    careStatus: 'home_care',
    patientStatus: 'aktif',
    riskLevel: 'sedang',
    notes: 'Kondisi stabil namun perlu monitoring rutin',
    createdAt: iso(-86400000),
    updatedAt: iso(-86400000),
  },
  'pp-3': {
    patientId: 'patient-3',
    patientName: 'Ny. Dewi Lestari',
    rmNumber: 'RM-2025-003',
    bpjsNumber: '0005556667778',
    nik: '3201015502680003',
    dateOfBirth: '1955-02-06',
    gender: 'Perempuan',
    primaryDiagnosis: 'Stroke Berat',
    secondaryDiagnosis: 'Hipertensi',
    diseaseStage: 'Kronis',
    attendingDoctorId: 'doc-sarah',
    attendingDoctorName: 'dr. Sarah Wijaya',
    familyContactName: 'Yohanes Lestari',
    familyContactRelation: 'Suami',
    familyContactPhone: '083456789012',
    address: 'Jl. Anggrek No. 8, Surabaya',
    careStatus: 'rawat_inap',
    patientStatus: 'aktif',
    riskLevel: 'tinggi',
    notes: 'Pasien bed rest total, perlu perawatan paliatif penuh',
    createdAt: iso(-172800000),
    updatedAt: iso(-172800000),
  },
};

// ── TTV Serial (2 per patient = 6 total) ──────────────────────────────────────

const ttvData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      tanggal: iso(-3600000),
      tekanan_darah: { systolic: 110, diastolic: 70 },
      nadi: 88,
      respirasi: 22,
      suhu: 36.8,
      spo2: 93,
      berat_badan: 52,
      createdAt: iso(-3600000),
    },
    {
      tanggal: iso(-86400000),
      tekanan_darah: { systolic: 105, diastolic: 65 },
      nadi: 92,
      respirasi: 24,
      suhu: 37.1,
      spo2: 91,
      berat_badan: 51.5,
      createdAt: iso(-86400000),
    },
  ],
  'pp-2': [
    {
      tanggal: iso(-7200000),
      tekanan_darah: { systolic: 135, diastolic: 85 },
      nadi: 78,
      respirasi: 18,
      suhu: 36.6,
      spo2: 96,
      berat_badan: 68,
      createdAt: iso(-7200000),
    },
    {
      tanggal: iso(-86400000),
      tekanan_darah: { systolic: 130, diastolic: 82 },
      nadi: 80,
      respirasi: 20,
      suhu: 36.7,
      spo2: 94,
      berat_badan: 67.5,
      createdAt: iso(-86400000),
    },
  ],
  'pp-3': [
    {
      tanggal: iso(-1800000),
      tekanan_darah: { systolic: 90, diastolic: 60 },
      nadi: 95,
      respirasi: 26,
      suhu: 37.5,
      spo2: 88,
      berat_badan: 45,
      createdAt: iso(-1800000),
    },
    {
      tanggal: iso(-86400000),
      tekanan_darah: { systolic: 95, diastolic: 62 },
      nadi: 92,
      respirasi: 24,
      suhu: 37.2,
      spo2: 90,
      berat_badan: 44.5,
      createdAt: iso(-86400000),
    },
  ],
};

// ── Keluhan Harian (14 total across patients) ─────────────────────────────────

const keluhanData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      tanggal: iso(-3600000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Sesak napas bertambah dan nafsu makan menurun',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Sesak saat berbaring, mual setelah minum obat',
      kondisiNyeri: 'sama',
      kondisiSesak: 'bertambah',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Mual dan tidak ada nafsu makan',
      tidur: 'tidak',
      alasanTidur: 'Sesak saat berbaring, sulit menemukan posisi nyaman',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'merah',
      sumberPengisian: 'monitoring',
      createdAt: iso(-3600000),
    },
    {
      tanggal: iso(-86400000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Nyeri punggung bawah, kelelahan',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Nyeri punggung bawah skala 5/10 saat bergerak',
      kondisiNyeri: 'bertambah',
      kondisiSesak: 'sama',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Mual ringan, porsi makan berkurang',
      tidur: 'tidak',
      alasanTidur: 'Terbangun 3-4 kali karena nyeri',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'kuning',
      sumberPengisian: 'chat',
      createdAt: iso(-86400000),
    },
    {
      tanggal: iso(-172800000),
      kondisiHariIni: 'baik',
      alasanKondisi: '',
      keluhanBaru: 'tidak_ada',
      deskripsiKeluhanBaru: '',
      kondisiNyeri: 'berkurang',
      kondisiSesak: 'berkurang',
      makanMinum: 'ya',
      alasanMakanMinum: '',
      tidur: 'ya',
      alasanTidur: '',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'hijau',
      sumberPengisian: 'monitoring',
      createdAt: iso(-172800000),
    },
    {
      tanggal: iso(-259200000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Nyeri hebat area perut, muntah 2 kali',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Nyeri perut skala 8/10, muntah setelah makan',
      kondisiNyeri: 'bertambah',
      kondisiSesak: 'sama',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Mual muntah, tidak bisa makan',
      tidur: 'tidak',
      alasanTidur: 'Nyeri mengganggu tidur',
      masalahObat: 'ya',
      deskripsiMasalahObat: 'Morfine tidak meredakan nyeri sepenuhnya',
      severityLevel: 'merah',
      sumberPengisian: 'chat',
      createdAt: iso(-259200000),
    },
    {
      tanggal: iso(-345600000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Cemas dan kelelahan berat',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Merasa sangat lelah dan cemas tentang penyakitnya',
      kondisiNyeri: 'sama',
      kondisiSesak: 'sama',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Tidak ada nafsu makan karena kecemasan',
      tidur: 'tidak',
      alasanTidur: 'Insomnia, mimpi buruk',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'kuning',
      sumberPengisian: 'monitoring',
      createdAt: iso(-345600000),
    },
  ],
  'pp-2': [
    {
      tanggal: iso(-7200000),
      kondisiHariIni: 'baik',
      alasanKondisi: '',
      keluhanBaru: 'tidak_ada',
      deskripsiKeluhanBaru: '',
      kondisiNyeri: 'tidak_nyeri',
      kondisiSesak: 'sama',
      makanMinum: 'ya',
      alasanMakanMinum: '',
      tidur: 'ya',
      alasanTidur: '',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'hijau',
      sumberPengisian: 'monitoring',
      createdAt: iso(-7200000),
    },
    {
      tanggal: iso(-86400000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Sesak napas sedikit bertambah',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Sesak saat beraktivitas, batuk berdahak',
      kondisiNyeri: 'tidak_nyeri',
      kondisiSesak: 'bertambah',
      makanMinum: 'ya',
      alasanMakanMinum: '',
      tidur: 'tidak',
      alasanTidur: 'Batuk mengganggu tidur',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'kuning',
      sumberPengisian: 'chat',
      createdAt: iso(-86400000),
    },
    {
      tanggal: iso(-172800000),
      kondisiHariIni: 'baik',
      alasanKondisi: '',
      keluhanBaru: 'tidak_ada',
      deskripsiKeluhanBaru: '',
      kondisiNyeri: 'tidak_nyeri',
      kondisiSesak: 'berkurang',
      makanMinum: 'ya',
      alasanMakanMinum: '',
      tidur: 'ya',
      alasanTidur: '',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'hijau',
      sumberPengisian: 'monitoring',
      createdAt: iso(-172800000),
    },
    {
      tanggal: iso(-259200000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Sesak berat saat berbaring',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Sesak napas berat, perlu 2 bantal untuk tidur',
      kondisiNyeri: 'tidak_nyeri',
      kondisiSesak: 'bertambah',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Sesak saat makan, porsi berkurang',
      tidur: 'tidak',
      alasanTidur: 'Orthopnea, perlu posisi semi-Fowler',
      masalahObat: 'ya',
      deskripsiMasalahObat: 'Salbutamol tidak cukup meredakan sesak',
      severityLevel: 'kuning',
      sumberPengisian: 'chat',
      createdAt: iso(-259200000),
    },
  ],
  'pp-3': [
    {
      tanggal: iso(-1800000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Kondisi sangat lemah, sesak berat',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Sesak berat, nyeri seluruh tubuh, tidak bisa makan',
      kondisiNyeri: 'bertambah',
      kondisiSesak: 'bertambah',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Sulit menelan, mual muntah terus menerus',
      tidur: 'tidak',
      alasanTidur: 'Nyeri dan sesak mengganggu, gelisah',
      masalahObat: 'ya',
      deskripsiMasalahObat: 'Morfine 20mg belum mengatasi nyeri sepenuhnya',
      severityLevel: 'merah',
      sumberPengisian: 'monitoring',
      createdAt: iso(-1800000),
    },
    {
      tanggal: iso(-86400000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Bed rest total, komunikasi menurun',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Kelelahan ekstrem, hanya bisa merespons dengan anggukan',
      kondisiNyeri: 'sama',
      kondisiSesak: 'sama',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Cachexia berat, mual muntah',
      tidur: 'ya',
      alasanTidur: '',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'merah',
      sumberPengisian: 'monitoring',
      createdAt: iso(-86400000),
    },
    {
      tanggal: iso(-172800000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Penurunan kesadaran, hipotensi',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Tekanan darah rendah, saturasi menurun, lemah sekali',
      kondisiNyeri: 'sama',
      kondisiSesak: 'bertambah',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Tidak bisa menelan, perlu NGT',
      tidur: 'ya',
      alasanTidur: '',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'merah',
      sumberPengisian: 'monitoring',
      createdAt: iso(-172800000),
    },
    {
      tanggal: iso(-345600000),
      kondisiHariIni: 'baik',
      alasanKondisi: '',
      keluhanBaru: 'tidak_ada',
      deskripsiKeluhanBaru: '',
      kondisiNyeri: 'berkurang',
      kondisiSesak: 'berkurang',
      makanMinum: 'ya',
      alasanMakanMinum: '',
      tidur: 'ya',
      alasanTidur: '',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'kuning',
      sumberPengisian: 'chat',
      createdAt: iso(-345600000),
    },
    {
      tanggal: iso(-432000000),
      kondisiHariIni: 'tidak_baik',
      alasanKondisi: 'Sesak napas episodik',
      keluhanBaru: 'ada',
      deskripsiKeluhanBaru: 'Sesak napas mendadak, batuk berdahak kuning',
      kondisiNyeri: 'sama',
      kondisiSesak: 'bertambah',
      makanMinum: 'tidak',
      alasanMakanMinum: 'Sesak saat makan',
      tidur: 'tidak',
      alasanTidur: 'Sesak malam hari, perlu posisi duduk',
      masalahObat: 'tidak',
      deskripsiMasalahObat: '',
      severityLevel: 'kuning',
      sumberPengisian: 'chat',
      createdAt: iso(-432000000),
    },
  ],
};

// ── Obat (7 total: 3 for pp-1, 2 for pp-2, 2 for pp-3) ──────────────────────

const obatData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      medicineName: 'Morfine 10mg',
      dosage: '10mg',
      frequency: '3x1',
      route: 'oral',
      startDate: '2025-01-15',
      endDate: '',
      isActive: true,
      notes: 'Untuk nyeri kronis kanker',
      palliativePatientId: 'pp-1',
      createdAt: iso(),
    },
    {
      medicineName: 'Ondansetron 4mg',
      dosage: '4mg',
      frequency: '2x1',
      route: 'oral',
      startDate: '2025-01-15',
      endDate: '',
      isActive: true,
      notes: 'Untuk mual dan muntah',
      palliativePatientId: 'pp-1',
      createdAt: iso(),
    },
    {
      medicineName: 'Metformin 500mg',
      dosage: '500mg',
      frequency: '2x1',
      route: 'oral',
      startDate: '2024-06-01',
      endDate: '',
      isActive: true,
      notes: 'Untuk Diabetes Melitus Tipe 2',
      palliativePatientId: 'pp-1',
      createdAt: iso(),
    },
  ],
  'pp-2': [
    {
      medicineName: 'Salbutamol',
      dosage: '2 puff',
      frequency: '4x1',
      route: 'inhalasi',
      startDate: '2025-02-01',
      endDate: '',
      isActive: true,
      notes: 'Inhaler untuk sesak napas PPOK',
      palliativePatientId: 'pp-2',
      createdAt: iso(),
    },
    {
      medicineName: 'Amlodipine 5mg',
      dosage: '5mg',
      frequency: '1x1',
      route: 'oral',
      startDate: '2024-03-15',
      endDate: '',
      isActive: true,
      notes: 'Untuk hipertensi',
      palliativePatientId: 'pp-2',
      createdAt: iso(),
    },
  ],
  'pp-3': [
    {
      medicineName: 'Omeprazole 20mg',
      dosage: '20mg',
      frequency: '1x1',
      route: 'oral',
      startDate: '2025-01-01',
      endDate: '',
      isActive: true,
      notes: 'Untuk pencegahan gastritis akibat obat NSAID',
      palliativePatientId: 'pp-3',
      createdAt: iso(),
    },
    {
      medicineName: 'Paracetamol 500mg',
      dosage: '500mg',
      frequency: '3x1',
      route: 'oral',
      startDate: '2025-01-10',
      endDate: '',
      isActive: true,
      notes: 'Sebagai ko-analgesik untuk nyeri',
      palliativePatientId: 'pp-3',
      createdAt: iso(),
    },
  ],
};

// ── Skrining Paliatif (4 total) ───────────────────────────────────────────────

const skriningData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      screeningType: 'esas',
      score: 45,
      scoreLabel: 'Gejala Berat',
      ewsLevel: 'merah',
      interpretation: 'Skor ESAS 45/90 menunjukkan beban gejala berat. Nyeri, kelelahan, dan sesak napas mendominasi.',
      details: {
        nyeri: 5, lelah: 7, sesak: 6, mual: 4, depresi: 5, cemas: 6, ngantuk: 4, nafsuMakan: 7, kesejahteraan: 4,
      },
      palliativePatientId: 'pp-1',
      createdAt: iso(-86400000),
    },
    {
      screeningType: 'pps',
      score: 40,
      scoreLabel: 'Ketergantungan',
      ewsLevel: 'merah',
      interpretation: 'PPS 40% - Pasien memerlukan bantuan substantial untuk aktivitas sehari-hari. Sebagian besar waktu di tempat tidur.',
      details: {
        ambulation: 'terbatas', activity: 'terbatas', selfCare: 'bantuan_sebagian', intake: 'berkurang', consciousness: 'penuh',
      },
      palliativePatientId: 'pp-1',
      createdAt: iso(-86400000),
    },
  ],
  'pp-2': [
    {
      screeningType: 'distress_thermometer',
      score: 5,
      scoreLabel: 'Distress Sedang',
      ewsLevel: 'kuning',
      interpretation: 'Skor 5/10 menunjukkan distress sedang. Masalah utama: sesak napas, kekhawatiran tentang perburukan penyakit.',
      details: {
        problems: ['sesak_napas', 'kekhawatiran', 'masalah_fisik'],
      },
      palliativePatientId: 'pp-2',
      createdAt: iso(-172800000),
    },
  ],
  'pp-3': [
    {
      screeningType: 'spict',
      score: 8,
      scoreLabel: 'Indikasi Paliatif Kuat',
      ewsLevel: 'merah',
      interpretation: 'SPICT menunjukkan indikasi paliatif kuat. Pasien memiliki beberapa kondisi penyakit progresif dengan penurunan fungsi.',
      details: {
        indicators: [
          'Penyakit progresif dengan penurunan fungsi',
          'Gejala berat persisten meskipun pengobatan optimal',
          'Ketergantungan total untuk perawatan harian',
          'Penurunan berat badan signifikan',
        ],
      },
      palliativePatientId: 'pp-3',
      createdAt: iso(-43200000),
    },
  ],
};

// ── Nutrisi (3 total) ─────────────────────────────────────────────────────────

const nutrisiData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      tanggal: iso(-86400000),
      berat_badan: 48,
      tinggi_badan: 155,
      bmi: 19.98,
      kebutuhan_kalori: 1361.25,
      status_gizi: 'normal',
      activityLevel: 'bed_rest',
      metabolicStress: 'sedang',
      specialCondition: 'tidak_ada',
      age: 81,
      gender: 'P',
      palliativePatientId: 'pp-1',
      createdAt: iso(-86400000),
    },
  ],
  'pp-2': [
    {
      tanggal: iso(-172800000),
      berat_badan: 55,
      tinggi_badan: 165,
      bmi: 20.2,
      kebutuhan_kalori: 1842.75,
      status_gizi: 'normal',
      activityLevel: 'ringan',
      metabolicStress: 'ringan',
      specialCondition: 'tidak_ada',
      age: 72,
      gender: 'L',
      palliativePatientId: 'pp-2',
      createdAt: iso(-172800000),
    },
  ],
  'pp-3': [
    {
      tanggal: iso(-259200000),
      berat_badan: 40,
      tinggi_badan: 150,
      bmi: 17.78,
      kebutuhan_kalori: 1687.5,
      status_gizi: 'underweight',
      activityLevel: 'bed_rest',
      metabolicStress: 'berat',
      specialCondition: 'tidak_ada',
      age: 68,
      gender: 'P',
      palliativePatientId: 'pp-3',
      createdAt: iso(-259200000),
    },
  ],
};

// ── Sosial (2 total) ──────────────────────────────────────────────────────────

const sosialData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      dukungan_keluarga: 'cukup',
      kondisi_ekonomi: 'sedang',
      caregiver: 'Budi Rahayu (Anak)',
      kebutuhan_sosial: 'Bantuan transportasi dan alat kesehatan rumahan',
      housingCondition: 'kurang_layak',
      caregiverAvailability: 'terbatas',
      familySupportLevel: 'cukup',
      transportDifficulty: 'sedang',
      economicConstraint: 'sedang',
      palliativePatientId: 'pp-1',
      createdAt: iso(-172800000),
    },
  ],
  'pp-3': [
    {
      dukungan_keluarga: 'kuat',
      kondisi_ekonomi: 'berat',
      caregiver: 'Yohanes Lestari (Suami)',
      kebutuhan_sosial: 'Bantuan biaya pengobatan dan alat kesehatan, caregiver tambahan',
      housingCondition: 'layak',
      caregiverAvailability: 'tersedia',
      familySupportLevel: 'kuat',
      transportDifficulty: 'ringan',
      economicConstraint: 'berat',
      palliativePatientId: 'pp-3',
      createdAt: iso(-86400000),
    },
  ],
};

// ── ACP (2 total) ─────────────────────────────────────────────────────────────

const acpData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      tujuan_perawatan: 'fokus_kenyamanan',
      keputusan_pasien: 'Perawatan di rumah dengan fokus kenyamanan',
      dnr: true,
      tempat_perawatan: 'rumah',
      decisionMakerName: 'Budi Rahayu',
      decisionMakerRelation: 'Anak',
      careGoal: 'fokus_kenyamanan',
      resuscitationPref: 'dnr',
      ventilatorPref: 'tidak_bersedia',
      icuPref: 'tidak_bersedia',
      patientHopes: 'Ingin menghabiskan waktu bersama keluarga di rumah',
      patientWorries: 'Khawatir menjadi beban keluarga dan rasa sakit yang tidak terkontrol',
      palliativePatientId: 'pp-1',
      createdAt: iso(-259200000),
    },
  ],
  'pp-3': [
    {
      tujuan_perawatan: 'mengurangi_gejala',
      keputusan_pasien: 'Dirawat di hospice dengan fokus pengurangan gejala',
      dnr: true,
      tempat_perawatan: 'hospice',
      decisionMakerName: 'Yohanes Lestari',
      decisionMakerRelation: 'Suami',
      careGoal: 'mengurangi_gejala',
      resuscitationPref: 'dnr',
      ventilatorPref: 'tidak_bersedia',
      icuPref: 'tidak_bersedia',
      patientHopes: 'Tidak ingin menderita lama',
      patientWorries: 'Takut kesakitan saat menjelang wafat',
      palliativePatientId: 'pp-3',
      createdAt: iso(-432000000),
    },
  ],
};

// ── Chat Messages (10 for pp-1) ───────────────────────────────────────────────

const chatMessagesData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      type: 'text',
      content: 'Selamat pagi Bu Siti, bagaimana kondisi Anda hari ini?',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      formData: null,
      createdAt: iso(-7200000),
    },
    {
      type: 'text',
      content: 'Selamat pagi Dok, agak sesak hari ini dan nafsu makan berkurang.',
      senderId: 'patient-1',
      senderName: 'Ny. Siti Rahayu',
      formData: null,
      createdAt: iso(-6800000),
    },
    {
      type: 'form_ttv',
      content: 'Silakan isi formulir TTV untuk memantau kondisi Anda hari ini.',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      formData: {
        formType: 'ttv',
        status: 'sent',
        progress: 0,
      },
      createdAt: iso(-6000000),
    },
    {
      type: 'form_keluhan',
      content: 'Mohon isi form keluhan harian untuk evaluasi gejala Anda.',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      formData: {
        formType: 'keluhan',
        status: 'sent',
        progress: 0,
      },
      createdAt: iso(-5800000),
    },
    {
      type: 'text',
      content: 'Sudah saya isi Dok, sesak terasa saat berbaring dan nyeri skala 5.',
      senderId: 'patient-1',
      senderName: 'Ny. Siti Rahayu',
      formData: null,
      createdAt: iso(-5000000),
    },
    {
      type: 'clinical_alert',
      content: 'Peringatan: SpO2 rendah (91%) dan frekuensi napas meningkat (24/menit).',
      senderId: 'system',
      senderName: 'Sistem',
      formData: {
        alertType: 'ttv_abnormal',
        severity: 'kuning',
        values: { oxygenSat: 91, respiratoryRate: 24 },
      },
      createdAt: iso(-4900000),
    },
    {
      type: 'ai_summary',
      content: 'Ringkasan AI: Pasien menunjukkan penurunan SpO2 dan peningkatan frekuensi napas. Nyeri terkontrol dengan skor 5/10. Gejala utama: sesak, mual, lemas.',
      senderId: 'system',
      senderName: 'AI Clinical Assistant',
      formData: {
        summaryType: 'soap',
        subjectives: 'Sesak napas saat berbaring, nafsu makan menurun, lemas',
        assessment: 'Penurunan saturasi oksigen, gejala sesak dan mual perlu pemantauan',
        plan: 'Evaluasi oksigen tambahan, optimasi manajemen sesak, monitoring ulang 6 jam',
      },
      createdAt: iso(-4800000),
    },
    {
      type: 'education',
      content: '📖 Edukasi: Posisi semi-Fowler dapat membantu meredakan sesak napas saat berbaring. Gunakan 2-3 bantal untuk menopang punggung.',
      senderId: 'system',
      senderName: 'AI Clinical Assistant',
      formData: {
        educationType: 'positioning',
        category: 'sesak_napas',
      },
      createdAt: iso(-4700000),
    },
    {
      type: 'text',
      content: 'Baik Bu Siti, saya akan evaluasi kebutuhan oksigen tambahan. Untuk sementara coba posisi semi-Fowler ya. Apakah ada keluhan lain?',
      senderId: 'doc-sarah',
      senderName: 'dr. Sarah Wijaya',
      formData: null,
      createdAt: iso(-3600000),
    },
    {
      type: 'text',
      content: 'Baik Dok, terima kasih. Cemas juga kadang muncul, terutama malam hari.',
      senderId: 'patient-1',
      senderName: 'Ny. Siti Rahayu',
      formData: null,
      createdAt: iso(-3000000),
    },
  ],
};

// ── Clinical Alerts (3 total) ─────────────────────────────────────────────────

const clinicalAlertsData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      alertType: 'ttv_abnormal',
      severity: 'kuning',
      title: 'TTV Abnormal — SpO2 Rendah',
      description: 'SpO2 rendah (91%) dan frekuensi napas meningkat (24/menit). Perlu pemantauan lebih ketat.',
      isRead: false,
      palliativePatientId: 'pp-1',
      createdAt: iso(-4900000),
    },
  ],
  'pp-3': [
    {
      alertType: 'ttv_kritis',
      severity: 'merah',
      title: 'TTV Kritis — Hipoksemia & Hipotensi',
      description: 'SpO2 sangat rendah (88%), hipotensi (90/60 mmHg), dan takipnea (26/menit). Diperlukan tindakan segera.',
      isRead: false,
      palliativePatientId: 'pp-3',
      createdAt: iso(-1800000),
    },
    {
      alertType: 'perburukan_kondisi',
      severity: 'merah',
      title: 'Perburukan Kondisi Signifikan',
      description: 'Penurunan kesadaran, cachexia berat, dan penurunan berat badan signifikan dalam 1 minggu terakhir.',
      isRead: true,
      palliativePatientId: 'pp-3',
      createdAt: iso(-86400000),
    },
  ],
};

// ── Audit Entries (6 total) ───────────────────────────────────────────────────

const auditEntriesData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      action: 'form_sent',
      performedBy: 'doc-sarah',
      details: 'Dokter mengirim Form TTV kepada pasien Ny. Siti Rahayu',
      patientId: 'pp-1',
      createdAt: iso(-6000000),
    },
    {
      action: 'form_submitted',
      performedBy: 'patient-1',
      details: 'Pasien mengirimkan hasil Form TTV',
      patientId: 'pp-1',
      createdAt: iso(-5000000),
    },
    {
      action: 'alert_triggered',
      performedBy: 'system',
      details: 'Alert: SpO2 rendah (91%) dan RR tinggi (24/menit)',
      patientId: 'pp-1',
      createdAt: iso(-4900000),
    },
    {
      action: 'ai_generated',
      performedBy: 'system',
      details: 'AI menghasilkan ringkasan klinis otomatis',
      patientId: 'pp-1',
      createdAt: iso(-4800000),
    },
  ],
  'pp-3': [
    {
      action: 'alert_triggered',
      performedBy: 'system',
      details: 'Alert Kritis: SpO2 sangat rendah (88%), hipotensi (90/60)',
      patientId: 'pp-3',
      createdAt: iso(-1800000),
    },
    {
      action: 'skrining_completed',
      performedBy: 'doc-sarah',
      details: 'Skrining SPICT selesai dilakukan untuk pasien Ny. Dewi Lestari',
      patientId: 'pp-3',
      createdAt: iso(-43200000),
    },
  ],
};

// ── Resumes (5 total) ─────────────────────────────────────────────────────────

const resumesData: Record<string, Record<string, unknown>[]> = {
  'pp-1': [
    {
      documentNumber: 'RES-2025-001',
      generatedBy: 'dr. Sarah Wijaya',
      resumeData: {
        primaryDiagnosis: 'Kanker Payudara Metastasis Stage IV',
        secondaryDiagnosis: 'Diabetes Melitus Tipe 2, Hipertensi',
        careStatus: 'rawat_jalan',
        riskLevel: 'tinggi',
        summary: 'Pasien dengan kanker payudara metastasis stadium IV, saat ini rawat jalan. Gejala dominan: nyeri kronis, sesak napas, dan penurunan nafsu makan. Morfine 10mg 3x1 sudah diberikan namun nyeri masih skala 5/10.',
        recommendations: [
          'Evaluasi kebutuhan oksigen tambahan',
          'Optimasi manajemen nyeri',
          'Monitoring TTV lebih ketat setiap 6 jam',
          'Konsul nutrisi untuk penanganan cachexia',
        ],
      },
      fullContent: 'RESUME MEDIS PALIATIF\n\nNo. Dokumen: RES-2025-001\nPasien: Ny. Siti Rahayu\nRM: RM-2025-001\nDiagnosis Utama: Kanker Payudara Metastasis Stage IV\nDiagnosis Sekunder: DM Tipe 2, Hipertensi\n\nStatus Perawatan: Rawat Jalan\nTingkat Risiko: Tinggi\n\nRingkasan Klinis:\nPasien wanita 81 tahun dengan kanker payudara metastasis stadium IV. Saat ini mengalami sesak napas (SpO2 91%), nyeri kronis (skala 5/10), dan penurunan nafsu makan. Terapi Morfine 10mg 3x1 oral, Ondansetron 4mg 2x1 oral, Metformin 500mg 2x1 oral.\n\nRekomendasi:\n1. Evaluasi kebutuhan oksigen tambahan\n2. Optimasi manajemen nyeri\n3. Monitoring TTV lebih ketat setiap 6 jam\n4. Konsul nutrisi untuk penanganan cachexia',
      version: 1,
      isSigned: true,
      palliativePatientId: 'pp-1',
      createdAt: iso(-86400000),
    },
    {
      documentNumber: 'RES-2025-002',
      generatedBy: 'dr. Sarah Wijaya',
      resumeData: {
        primaryDiagnosis: 'Kanker Payudara Metastasis Stage IV',
        secondaryDiagnosis: 'Diabetes Melitus Tipe 2, Hipertensi',
        careStatus: 'rawat_jalan',
        riskLevel: 'tinggi',
        summary: 'Evaluasi ulang: terdapat perburukan gejala sesak dan penurunan SpO2. Nyeri terkontrol parsial.',
        recommendations: [
          'Pertimbangkan eskalasi terapi sesak',
          'Kontrol ulang 3 hari',
        ],
      },
      fullContent: 'RESUME MEDIS PALIATIF — EVALUASI ULANG\n\nNo. Dokumen: RES-2025-002\nPasien: Ny. Siti Rahayu\nRM: RM-2025-001\n\nRingkasan:\nTerdapat perburukan gejala sesak dan penurunan SpO2 menjadi 91%. Nyeri terkontrol parsial dengan skala 5/10.',
      version: 2,
      isSigned: false,
      palliativePatientId: 'pp-1',
      createdAt: iso(-3600000),
    },
  ],
  'pp-2': [
    {
      documentNumber: 'RES-2025-003',
      generatedBy: 'dr. Lisa Permata',
      resumeData: {
        primaryDiagnosis: 'PPOK Berat',
        secondaryDiagnosis: 'Gagal Jantung Kongestif',
        careStatus: 'home_care',
        riskLevel: 'sedang',
        summary: 'Pasien PPOK berat dengan sesak episodik. Terapi inhaler Salbutamol dan Amlodipine sudah optimal.',
        recommendations: [
          'Pulmonary rehab lanjutan',
          'Monitoring sesak harian',
          'Vaksinasi influenza dan pneumokokus',
        ],
      },
      fullContent: 'RESUME MEDIS PALIATIF\n\nNo. Dokumen: RES-2025-003\nPasien: Tn. Ahmad Fauzi\nRM: RM-2025-002\nDiagnosis Utama: PPOK Berat\nDiagnosis Sekunder: Gagal Jantung Kongestif\n\nRingkasan:\nPasien laki-laki 72 tahun dengan PPOK berat. Kondisi umum stabil dengan sesak episodic. Terapi Salbutamol inhaler dan Amlodipine sudah optimal.',
      version: 1,
      isSigned: true,
      palliativePatientId: 'pp-2',
      createdAt: iso(-432000000),
    },
  ],
  'pp-3': [
    {
      documentNumber: 'RES-2025-004',
      generatedBy: 'dr. Sarah Wijaya',
      resumeData: {
        primaryDiagnosis: 'Stroke Berat',
        secondaryDiagnosis: 'Hipertensi',
        careStatus: 'rawat_inap',
        riskLevel: 'tinggi',
        summary: 'Pasien stroke berat dengan ketergantungan total. Cachexia berat, hipoksemia persisten.',
        recommendations: [
          'Perawatan paliatif penuh',
          'Evaluasi kebutuhan NGT',
          'Dukungan caregiver intensif',
        ],
      },
      fullContent: 'RESUME MEDIS PALIATIF\n\nNo. Dokumen: RES-2025-004\nPasien: Ny. Dewi Lestari\nRM: RM-2025-003\nDiagnosis Utama: Stroke Berat\nDiagnosis Sekunder: Hipertensi\n\nRingkasan:\nPasien wanita 68 tahun dengan stroke berat, bed rest total. Cachexia berat, hipoksemia persisten (SpO2 88%), hipotensi.',
      version: 1,
      isSigned: true,
      palliativePatientId: 'pp-3',
      createdAt: iso(-172800000),
    },
    {
      documentNumber: 'RES-2025-005',
      generatedBy: 'dr. Sarah Wijaya',
      resumeData: {
        primaryDiagnosis: 'Stroke Berat',
        secondaryDiagnosis: 'Hipertensi',
        careStatus: 'rawat_inap',
        riskLevel: 'tinggi',
        summary: 'Perburukan signifikan: penurunan kesadaran, hipotensi, hipoksemia. Prognosis sangat buruk.',
        recommendations: [
          'Diskusi keluarga tentang perawatan end-of-life',
          'Evaluasi ACP',
          'Komfortif care',
        ],
      },
      fullContent: 'RESUME MEDIS PALIATIF — PERBURUKAN\n\nNo. Dokumen: RES-2025-005\nPasien: Ny. Dewi Lestari\n\nRingkasan:\nPerburukan signifikan dalam 24 jam terakhir. Penurunan kesadaran, hipotensi (90/60), hipoksemia (SpO2 88%). Prognosis sangat buruk.',
      version: 2,
      isSigned: false,
      palliativePatientId: 'pp-3',
      createdAt: iso(-1800000),
    },
  ],
};

// ── Users (13 total) ──────────────────────────────────────────────────────────

const usersData: Record<string, Record<string, unknown>> = {
  'doc-sarah': {
    name: 'dr. Sarah Wijaya',
    email: 'sarah@carelivia.id',
    role: 'doctor',
    phone: '081111111111',
    createdAt: iso(),
  },
  'doc-ahmad': {
    name: 'dr. Ahmad Rizki',
    email: 'ahmad@carelivia.id',
    role: 'doctor',
    phone: '082222222222',
    createdAt: iso(),
  },
  'doc-lisa': {
    name: 'dr. Lisa Permata',
    email: 'lisa@carelivia.id',
    role: 'doctor',
    phone: '083333333333',
    createdAt: iso(),
  },
  'doc-dewi': {
    name: 'dr. Dewi Sartika',
    email: 'dewi@carelivia.id',
    role: 'doctor',
    phone: '084444444444',
    createdAt: iso(),
  },
  'doc-budi': {
    name: 'drg. Budi Santoso',
    email: 'budi@carelivia.id',
    role: 'doctor',
    phone: '085555555555',
    createdAt: iso(),
  },
  'patient-1': {
    name: 'Ny. Siti Rahayu',
    email: 'siti@carelivia.id',
    role: 'patient',
    phone: '081234567890',
    createdAt: iso(),
  },
  'patient-2': {
    name: 'Tn. Ahmad Fauzi',
    email: 'ahmad.fauzi@carelivia.id',
    role: 'patient',
    phone: '082345678901',
    createdAt: iso(-86400000),
  },
  'patient-3': {
    name: 'Ny. Dewi Lestari',
    email: 'dewi.lestari@carelivia.id',
    role: 'patient',
    phone: '083456789012',
    createdAt: iso(-172800000),
  },
  'patient-4': {
    name: 'Tn. Rudi Hartono',
    email: 'rudi@carelivia.id',
    role: 'patient',
    phone: '084567890123',
    createdAt: iso(),
  },
  'patient-5': {
    name: 'Ny. Ani Wijaya',
    email: 'ani@carelivia.id',
    role: 'patient',
    phone: '085678901234',
    createdAt: iso(),
  },
  'admin-1': {
    name: 'Admin CareLivia',
    email: 'admin@carelivia.id',
    role: 'admin',
    phone: '089999999999',
    createdAt: iso(),
  },
  'pharmacist-1': {
    name: 'Apt. Rina Puspita',
    email: 'rina@carelivia.id',
    role: 'pharmacist',
    phone: '087777777777',
    createdAt: iso(),
  },
  'homecare-1': {
    name: 'Ns. Dian Permata, S.Kep',
    email: 'dian@carelivia.id',
    role: 'homecare_staff',
    phone: '088888888888',
    createdAt: iso(),
  },
};

// ── Notifications (10 total) ──────────────────────────────────────────────────

const notificationsData: Record<string, unknown>[] = [
  {
    userId: 'doc-sarah',
    title: 'Alert Kritis — Ny. Dewi Lestari',
    message: 'SpO2 sangat rendah (88%), hipotensi (90/60), dan takipnea (26/menit). Diperlukan tindakan segera.',
    type: 'clinical_alert',
    isRead: false,
    createdAt: iso(-1800000),
  },
  {
    userId: 'doc-sarah',
    title: 'TTV Abnormal — Ny. Siti Rahayu',
    message: 'SpO2 rendah (91%) dan frekuensi napas meningkat (24/menit). Perlu pemantauan lebih ketat.',
    type: 'clinical_alert',
    isRead: false,
    createdAt: iso(-4900000),
  },
  {
    userId: 'doc-sarah',
    title: 'Keluhan Baru — Ny. Siti Rahayu',
    message: 'Pasien melaporkan sesak saat berbaring dan penurunan nafsu makan.',
    type: 'screening',
    isRead: true,
    createdAt: iso(-86400000),
  },
  {
    userId: 'doc-lisa',
    title: 'Monitoring Selesai — Tn. Ahmad Fauzi',
    message: 'Form TTV dan keluhan harian telah diisi oleh pasien.',
    type: 'reminder',
    isRead: true,
    createdAt: iso(-7200000),
  },
  {
    userId: 'patient-1',
    title: 'Selamat Datang di CareLivia!',
    message: 'Selamat datang di program perawatan paliatif CareLivia. Dokter Anda akan menghubungi Anda segera.',
    type: 'chat',
    isRead: true,
    createdAt: iso(-259200000),
  },
  {
    userId: 'patient-1',
    title: 'Form TTV Baru',
    message: 'dr. Sarah Wijaya mengirimkan formulir TTV untuk Anda isi.',
    type: 'reminder',
    isRead: false,
    createdAt: iso(-6000000),
  },
  {
    userId: 'patient-2',
    title: 'Selamat Datang di CareLivia!',
    message: 'Selamat datang di program perawatan paliatif CareLivia.',
    type: 'chat',
    isRead: true,
    createdAt: iso(-172800000),
  },
  {
    userId: 'pharmacist-1',
    title: 'Resep Baru — Morfine 10mg',
    message: 'Resep baru dari dr. Sarah Wijaya untuk pasien Ny. Siti Rahayu.',
    type: 'pharmacy',
    isRead: false,
    createdAt: iso(-43200000),
  },
  {
    userId: 'homecare-1',
    title: 'Jadwal Home Care — Ny. Siti Rahayu',
    message: 'Anda memiliki jadwal kunjungan home care besok pukul 09:00.',
    type: 'homecare',
    isRead: false,
    createdAt: iso(-3600000),
  },
  {
    userId: 'admin-1',
    title: 'Pasien Baru Ditambahkan',
    message: 'Ny. Dewi Lestari telah ditambahkan ke program monitoring paliatif.',
    type: 'reminder',
    isRead: true,
    createdAt: iso(-172800000),
  },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────

export async function seedFirestore(): Promise<void> {
  if (!db) {
    console.warn('[Seed] Firebase not configured — skipping seeding');
    return;
  }
  console.log('[Seed] 🌱 Starting Firestore seeding...');

  try {
    // ── 1. Seed Patients ────────────────────────────────────────────────────
    const patientsColExists = await collectionExists('patients');
    if (patientsColExists) {
      console.log('[Seed] ⏭️ Patients collection already has data — skipping.');
    } else {
      console.log('[Seed] 📝 Seeding patients...');
      for (const [patientId, data] of Object.entries(patientsData)) {
        await setDoc(doc(db, 'patients', patientId), data, { merge: true });
        console.log(`[Seed]   ✓ Patient ${patientId} (${(data as { patientName: string }).patientName})`);
      }
    }

    // ── 2. Seed Patient Subcollections ──────────────────────────────────────
    for (const patientId of PATIENT_IDS) {
      // TTV Serial
      if (await subcollectionExists('patients', patientId, 'ttv_serial')) {
        console.log(`[Seed] ⏭️ ttv_serial for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding ttv_serial for ${patientId}...`);
        for (const record of ttvData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'ttv_serial'), record);
        }
        console.log(`[Seed]   ✓ ${ttvData[patientId]?.length ?? 0} TTV records`);
      }

      // Keluhan Harian
      if (await subcollectionExists('patients', patientId, 'keluhan_harian')) {
        console.log(`[Seed] ⏭️ keluhan_harian for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding keluhan_harian for ${patientId}...`);
        for (const record of keluhanData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'keluhan_harian'), record);
        }
        console.log(`[Seed]   ✓ ${keluhanData[patientId]?.length ?? 0} keluhan records`);
      }

      // Obat
      if (await subcollectionExists('patients', patientId, 'obat')) {
        console.log(`[Seed] ⏭️ obat for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding obat for ${patientId}...`);
        for (const record of obatData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'obat'), record);
        }
        console.log(`[Seed]   ✓ ${obatData[patientId]?.length ?? 0} medications`);
      }

      // Skrining Paliatif
      if (await subcollectionExists('patients', patientId, 'skrining_paliatif')) {
        console.log(`[Seed] ⏭️ skrining_paliatif for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding skrining_paliatif for ${patientId}...`);
        for (const record of skriningData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'skrining_paliatif'), record);
        }
        console.log(`[Seed]   ✓ ${skriningData[patientId]?.length ?? 0} screening records`);
      }

      // Nutrisi
      if (await subcollectionExists('patients', patientId, 'nutrisi')) {
        console.log(`[Seed] ⏭️ nutrisi for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding nutrisi for ${patientId}...`);
        for (const record of nutrisiData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'nutrisi'), record);
        }
        console.log(`[Seed]   ✓ ${nutrisiData[patientId]?.length ?? 0} nutrition records`);
      }

      // Sosial
      if (await subcollectionExists('patients', patientId, 'sosial')) {
        console.log(`[Seed] ⏭️ sosial for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding sosial for ${patientId}...`);
        for (const record of sosialData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'sosial'), record);
        }
        console.log(`[Seed]   ✓ ${sosialData[patientId]?.length ?? 0} social records`);
      }

      // ACP
      if (await subcollectionExists('patients', patientId, 'acp')) {
        console.log(`[Seed] ⏭️ acp for ${patientId} already exists — skipping.`);
      } else {
        console.log(`[Seed] 📝 Seeding acp for ${patientId}...`);
        for (const record of acpData[patientId] ?? []) {
          await addDoc(collection(db, 'patients', patientId, 'acp'), record);
        }
        console.log(`[Seed]   ✓ ${acpData[patientId]?.length ?? 0} ACP records`);
      }

      // Chat Messages
      if (await subcollectionExists('patients', patientId, 'chat_messages')) {
        console.log(`[Seed] ⏭️ chat_messages for ${patientId} already exists — skipping.`);
      } else {
        const msgs = chatMessagesData[patientId] ?? [];
        if (msgs.length > 0) {
          console.log(`[Seed] 📝 Seeding chat_messages for ${patientId}...`);
          for (const record of msgs) {
            await addDoc(collection(db, 'patients', patientId, 'chat_messages'), record);
          }
          console.log(`[Seed]   ✓ ${msgs.length} chat messages`);
        }
      }

      // Clinical Alerts
      if (await subcollectionExists('patients', patientId, 'clinical_alerts')) {
        console.log(`[Seed] ⏭️ clinical_alerts for ${patientId} already exists — skipping.`);
      } else {
        const alerts = clinicalAlertsData[patientId] ?? [];
        if (alerts.length > 0) {
          console.log(`[Seed] 📝 Seeding clinical_alerts for ${patientId}...`);
          for (const record of alerts) {
            await addDoc(collection(db, 'patients', patientId, 'clinical_alerts'), record);
          }
          console.log(`[Seed]   ✓ ${alerts.length} clinical alerts`);
        }
      }

      // Audit Entries
      if (await subcollectionExists('patients', patientId, 'audit_entries')) {
        console.log(`[Seed] ⏭️ audit_entries for ${patientId} already exists — skipping.`);
      } else {
        const entries = auditEntriesData[patientId] ?? [];
        if (entries.length > 0) {
          console.log(`[Seed] 📝 Seeding audit_entries for ${patientId}...`);
          for (const record of entries) {
            await addDoc(collection(db, 'patients', patientId, 'audit_entries'), record);
          }
          console.log(`[Seed]   ✓ ${entries.length} audit entries`);
        }
      }

      // Resumes
      if (await subcollectionExists('patients', patientId, 'resumes')) {
        console.log(`[Seed] ⏭️ resumes for ${patientId} already exists — skipping.`);
      } else {
        const resumes = resumesData[patientId] ?? [];
        if (resumes.length > 0) {
          console.log(`[Seed] 📝 Seeding resumes for ${patientId}...`);
          for (const record of resumes) {
            await addDoc(collection(db, 'patients', patientId, 'resumes'), record);
          }
          console.log(`[Seed]   ✓ ${resumes.length} resumes`);
        }
      }
    }

    // ── 3. Seed Users ──────────────────────────────────────────────────────
    const usersColExists = await collectionExists('users');
    if (usersColExists) {
      console.log('[Seed] ⏭️ Users collection already has data — skipping.');
    } else {
      console.log('[Seed] 📝 Seeding users...');
      for (const [userId, data] of Object.entries(usersData)) {
        await setDoc(doc(db, 'users', userId), data, { merge: true });
      }
      console.log(`[Seed]   ✓ ${Object.keys(usersData).length} users`);
    }

    // ── 4. Seed Notifications ──────────────────────────────────────────────
    const notifsColExists = await collectionExists('notifications');
    if (notifsColExists) {
      console.log('[Seed] ⏭️ Notifications collection already has data — skipping.');
    } else {
      console.log('[Seed] 📝 Seeding notifications...');
      for (const record of notificationsData) {
        await addDoc(collection(db, 'notifications'), record);
      }
      console.log(`[Seed]   ✓ ${notificationsData.length} notifications`);
    }

    console.log('[Seed] ✅ Firestore seeding complete!');
  } catch (error) {
    console.error('[Seed] ❌ Seeding failed:', error);
    throw error;
  }
}
