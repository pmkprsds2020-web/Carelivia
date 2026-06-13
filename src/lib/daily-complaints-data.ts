import type {
  DailyComplaintCategory,
  DailyComplaintSeverity,
  DailyComplaintImpact,
  DailyComplaintFollowUpStatus,
  DailyAlertLevel,
  DailyComplaintEntry,
  DailyComplaintTrend,
  DailyComplaintAlert,
  DailyComplaintAIResult,
} from '@/lib/types';

// ─── Category Configuration ────────────────────────────────────────────────────

export const COMPLAINT_CATEGORIES: Record<
  DailyComplaintCategory,
  { label: string; icon: string; color: string }
> = {
  nyeri: { label: 'Nyeri', icon: 'Activity', color: 'red' },
  sesak_napas: { label: 'Sesak Napas', icon: 'Wind', color: 'blue' },
  mual: { label: 'Mual', icon: 'Frown', color: 'yellow' },
  muntah: { label: 'Muntah', icon: 'AlertTriangle', color: 'orange' },
  nafsu_makan_menurun: { label: 'Nafsu Makan Menurun', icon: 'Utensils', color: 'amber' },
  kelelahan: { label: 'Kelelahan', icon: 'BatteryLow', color: 'gray' },
  gangguan_tidur: { label: 'Gangguan Tidur', icon: 'Moon', color: 'indigo' },
  konstipasi: { label: 'Konstipasi', icon: 'CircleDot', color: 'brown' },
  diare: { label: 'Diare', icon: 'Droplets', color: 'teal' },
  batuk: { label: 'Batuk', icon: 'Cloud', color: 'slate' },
  kecemasan: { label: 'Kecemasan', icon: 'Brain', color: 'purple' },
  depresi: { label: 'Depresi', icon: 'HeartCrack', color: 'darkblue' },
  masalah_spiritual: { label: 'Masalah Spiritual', icon: 'Sparkles', color: 'violet' },
  masalah_sosial: { label: 'Masalah Sosial', icon: 'Users', color: 'cyan' },
  keluhan_lainnya: { label: 'Keluhan Lainnya', icon: 'HelpCircle', color: 'gray' },
};

// ─── Severity Configuration ────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<
  DailyComplaintSeverity,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  ringan: { label: 'Ringan', color: '#16A34A', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  sedang: { label: 'Sedang', color: '#CA8A04', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  berat: { label: 'Berat', color: '#DC2626', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

// ─── Impact Configuration ──────────────────────────────────────────────────────

export const IMPACT_CONFIG: Record<
  DailyComplaintImpact,
  { label: string; description: string }
> = {
  tidak_mengganggu: { label: 'Tidak Mengganggu', description: 'Tidak mengganggu aktivitas sehari-hari' },
  sedikit_mengganggu: { label: 'Sedikit Mengganggu', description: 'Sedikit mengganggu namun masih bisa beraktivitas' },
  mengganggu_aktivitas: { label: 'Mengganggu Aktivitas Harian', description: 'Mengganggu aktivitas harian secara signifikan' },
  sangat_mengganggu: { label: 'Sangat Mengganggu', description: 'Sangat mengganggu, tidak bisa melakukan aktivitas' },
};

// ─── Follow-Up Status Configuration ────────────────────────────────────────────

export const FOLLOW_UP_STATUS_CONFIG: Record<
  DailyComplaintFollowUpStatus,
  { label: string; color: string }
> = {
  belum_ditindaklanjuti: { label: 'Belum Ditindaklanjuti', color: 'red' },
  sedang_diproses: { label: 'Sedang Diproses', color: 'yellow' },
  selesai: { label: 'Selesai', color: 'green' },
};

// ─── Alert Level Configuration ─────────────────────────────────────────────────

export const ALERT_LEVEL_CONFIG: Record<
  DailyAlertLevel,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  hijau: { label: 'Ringan', color: 'green', bgColor: 'bg-green-50', icon: 'CheckCircle' },
  kuning: { label: 'Perlu Pemantauan', color: 'yellow', bgColor: 'bg-yellow-50', icon: 'AlertTriangle' },
  merah: { label: 'Perlu Tindak Lanjut Segera', color: 'red', bgColor: 'bg-red-50', icon: 'AlertOctagon' },
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

export function getSeverityFromScore(score: number): DailyComplaintSeverity {
  if (score === 0) return 'ringan';
  if (score >= 1 && score <= 3) return 'ringan';
  if (score >= 4 && score <= 6) return 'sedang';
  return 'berat'; // 7-10
}

export function getAlertLevelFromScore(score: number): DailyAlertLevel {
  if (score <= 3) return 'hijau';
  if (score <= 6) return 'kuning';
  return 'merah'; // 7-10
}

export function getComplaintCategoryLabel(category: DailyComplaintCategory): string {
  return COMPLAINT_CATEGORIES[category]?.label ?? category;
}

export function getSeverityLabel(severity: DailyComplaintSeverity): string {
  return SEVERITY_CONFIG[severity]?.label ?? severity;
}

export function getImpactLabel(impact: DailyComplaintImpact): string {
  return IMPACT_CONFIG[impact]?.label ?? impact;
}

export function getFollowUpStatusLabel(status: DailyComplaintFollowUpStatus): string {
  return FOLLOW_UP_STATUS_CONFIG[status]?.label ?? status;
}

export function getAlertLevelLabel(level: DailyAlertLevel): string {
  return ALERT_LEVEL_CONFIG[level]?.label ?? level;
}

// ─── Local AI Analysis (Keyword-Based Fallback) ────────────────────────────────

const KEYWORD_CATEGORY_MAP: Record<DailyComplaintCategory, string[]> = {
  nyeri: ['nyeri', 'sakit', 'rasa sakit', 'pegal', 'sakit kepala', 'nyut nyutan', 'perih', 'tusuk', 'tekanan', 'sakit tulang', 'nyeri sendi', 'sakit pinggang', 'sakit perut', 'sakit dada'],
  sesak_napas: ['sesak', 'napas', 'nafas', 'sesak napas', 'sesak nafas', 'napas pendek', 'tidak bisa bernapas', 'sesak dada', 'terengah', 'napas berat'],
  mual: ['mual', 'perut mual', 'enak', 'perut terasa enak', 'mual mual', 'perut kembung', 'mual perut'],
  muntah: ['muntah', 'muntah muntah', 'keluar makanan', 'perut mual muntah'],
  nafsu_makan_menurun: ['nafsu makan', 'tidak mau makan', 'malas makan', 'tidak nafsu makan', 'makan sedikit', 'nafsu makan turun', 'tidak selera makan'],
  kelelahan: ['lelah', 'capek', 'capai', 'lemah', 'tidak bertenaga', 'lesu', 'lelah sekali', 'badan lemas', 'tidak ada tenaga', 'kelelahan'],
  gangguan_tidur: ['tidur', 'insomnia', 'tidak bisa tidur', 'susah tidur', 'terbangun', 'bangun malam', 'tidur tidak nyenyak', 'mimpi buruk', 'gangguan tidur'],
  konstipasi: ['konstipasi', 'sembelit', 'susah bab', 'bab keras', 'tidak bab', 'bab tidak lancar', 'susah buang air'],
  diare: ['diare', 'mencret', 'bab encer', 'buang air terus', 'bab berair'],
  batuk: ['batuk', 'batuk batuk', 'batuk kering', 'batuk berdahak', 'batuk terus'],
  kecemasan: ['cemas', 'khawatir', 'takut', 'gelisah', 'ragu', 'kecemasan', 'panik', 'cemas sekali'],
  depresi: ['depresi', 'sedih', 'putus asa', 'tidak semangat', 'murung', 'down', 'depresi berat', 'merasa tidak berguna', 'putus asa', 'tidak ada harapan'],
  masalah_spiritual: ['doa', 'spiritual', 'agama', 'ibadah', 'tuhan', 'makna hidup', 'kepasrahan', 'spiritual', 'tidak bisa ibadah'],
  masalah_sosial: ['keluarga', 'sendiri', 'kesepian', 'dukungan', 'tidak ada yang menemani', 'masalah sosial', 'kesepian', 'isolasi', 'tidak ada dukungan'],
  keluhan_lainnya: ['keluhan', 'keluhan lain', 'masalah', 'ada yang aneh'],
};

export function generateLocalAIAnalysis(messageText: string): DailyComplaintAIResult {
  const lowerText = messageText.toLowerCase();

  // Find matching category based on keywords
  let bestCategory: DailyComplaintCategory = 'keluhan_lainnya';
  let maxMatches = 0;
  const matchedKeywords: string[] = [];

  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestCategory = category as DailyComplaintCategory;
    }
  }

  // Estimate severity score based on intensity keywords
  let severityScore = 3; // default mild
  const highIntensityWords = ['sangat', 'sekali', 'banget', 'parah', 'berat', 'tidak bisa', 'tidak mau', 'tidak ada', 'tidak tahan', 'tak tertahankan'];
  const mediumIntensityWords = ['cukup', 'agak', 'lumayan', 'sering', 'mungkin', 'agak parah'];

  const hasHighIntensity = highIntensityWords.some(w => lowerText.includes(w));
  const hasMediumIntensity = mediumIntensityWords.some(w => lowerText.includes(w));

  if (hasHighIntensity) {
    severityScore = 8;
  } else if (hasMediumIntensity) {
    severityScore = 5;
  }

  // Determine impact
  let impact: DailyComplaintImpact = 'sedikit_mengganggu';
  if (severityScore >= 7) {
    impact = 'sangat_mengganggu';
  } else if (severityScore >= 5) {
    impact = 'mengganggu_aktivitas';
  } else if (severityScore <= 2) {
    impact = 'tidak_mengganggu';
  }

  // Extract complaint phrases
  const extractedComplaints: string[] = [];
  if (matchedKeywords.length > 0) {
    // Deduplicate and take unique keywords
    const uniqueKeywords = [...new Set(matchedKeywords)];
    extractedComplaints.push(...uniqueKeywords.slice(0, 5));
  }

  // If no keywords matched, extract the sentence itself
  if (extractedComplaints.length === 0) {
    const sentences = messageText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    extractedComplaints.push(...sentences.slice(0, 3).map(s => s.trim()));
  }

  const severity = getSeverityFromScore(severityScore);
  const alertLevel = getAlertLevelFromScore(severityScore);

  // Generate suggested follow-up
  let suggestedFollowUp = 'Pemantauan rutin';
  if (alertLevel === 'merah') {
    suggestedFollowUp = 'Tindak lanjut segera oleh tim medis';
  } else if (alertLevel === 'kuning') {
    suggestedFollowUp = 'Evaluasi lebih lanjut dalam 24 jam';
  }

  // Generate additional notes
  const additionalNotes = maxMatches > 0
    ? `Terdeteksi keluhan ${COMPLAINT_CATEGORIES[bestCategory].label.toLowerCase()} berdasarkan analisis kata kunci.`
    : 'Tidak terdeteksi kata kunci spesifik, memerlukan validasi manual.';

  return {
    category: bestCategory,
    severityScore,
    severity,
    impact,
    extractedComplaints,
    additionalNotes,
    alertLevel,
    suggestedFollowUp,
  };
}

// ─── Mock Complaint Entries ────────────────────────────────────────────────────

export const MOCK_COMPLAINT_ENTRIES: DailyComplaintEntry[] = [
  {
    id: 'dc-001',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-01',
    time: '08:15',
    category: 'nyeri',
    severity: 'sedang',
    severityScore: 5,
    description: 'Nyeri di bagian punggung bawah, terasa saat bergerak dan berbaring. Skala nyeri 5/10.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'pasien',
    dataSource: 'chat',
    followUpStatus: 'selesai',
    clinicalNote: 'Diberikan analgesik sesuai jadwal. Pasien diminta mengompres hangat.',
    validatedBy: 'Dr. Andi Pratama',
    chatMessageId: 'msg-101',
    alertLevel: 'kuning',
    createdAt: '2025-03-01T08:15:00Z',
    updatedAt: '2025-03-01T10:30:00Z',
  },
  {
    id: 'dc-002',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-01',
    time: '14:30',
    category: 'mual',
    severity: 'ringan',
    severityScore: 2,
    description: 'Mual ringan setelah minum obat kemoterapi. Tidak disertai muntah.',
    impact: 'sedikit_mengganggu',
    inputSource: 'pasien',
    dataSource: 'manual',
    followUpStatus: 'selesai',
    clinicalNote: 'Antiemetik diberikan 30 menit sebelum kemoterapi berikutnya.',
    validatedBy: 'Dr. Andi Pratama',
    alertLevel: 'hijau',
    createdAt: '2025-03-01T14:30:00Z',
    updatedAt: '2025-03-01T15:00:00Z',
  },
  {
    id: 'dc-003',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-02',
    time: '09:00',
    category: 'kelelahan',
    severity: 'sedang',
    severityScore: 6,
    description: 'Merasa sangat lelah dan tidak bertenaga sepanjang hari. Tidak bisa beraktivitas seperti biasa.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'keluarga',
    dataSource: 'chat',
    followUpStatus: 'sedang_diproses',
    clinicalNote: 'Dievaluasi kemungkinan anemia. Diminta lab darah lengkap.',
    validatedBy: 'Dr. Andi Pratama',
    chatMessageId: 'msg-205',
    alertLevel: 'kuning',
    createdAt: '2025-03-02T09:00:00Z',
    updatedAt: '2025-03-02T11:00:00Z',
  },
  {
    id: 'dc-004',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-02',
    time: '20:45',
    category: 'gangguan_tidur',
    severity: 'sedang',
    severityScore: 5,
    description: 'Susah tidur sejak 3 hari terakhir. Terbangun 3-4 kali semalam. Mimpi buruk tentang penyakitnya.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'pasien',
    dataSource: 'ai_classification',
    followUpStatus: 'belum_ditindaklanjuti',
    alertLevel: 'kuning',
    createdAt: '2025-03-02T20:45:00Z',
    updatedAt: '2025-03-02T20:45:00Z',
  },
  {
    id: 'dc-005',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-03',
    time: '07:30',
    category: 'nyeri',
    severity: 'berat',
    severityScore: 8,
    description: 'Nyeri hebat di area perut. Skala nyeri 8/10. Nyeri tidak berkurang dengan obat yang diberikan.',
    impact: 'sangat_mengganggu',
    inputSource: 'pasien',
    dataSource: 'chat',
    followUpStatus: 'sedang_diproses',
    clinicalNote: 'Eskalasi analgesik. Konsul tim nyeri.',
    validatedBy: 'Dr. Andi Pratama',
    chatMessageId: 'msg-310',
    alertLevel: 'merah',
    createdAt: '2025-03-03T07:30:00Z',
    updatedAt: '2025-03-03T08:15:00Z',
  },
  {
    id: 'dc-006',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-03',
    time: '13:00',
    category: 'nafsu_makan_menurun',
    severity: 'sedang',
    severityScore: 5,
    description: 'Hanya makan 1/4 porsi sejak kemarin. Tidak ada nafsu makan sama sekali.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'keluarga',
    dataSource: 'manual',
    followUpStatus: 'belum_ditindaklanjuti',
    alertLevel: 'kuning',
    createdAt: '2025-03-03T13:00:00Z',
    updatedAt: '2025-03-03T13:00:00Z',
  },
  {
    id: 'dc-007',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-04',
    time: '06:00',
    category: 'sesak_napas',
    severity: 'berat',
    severityScore: 7,
    description: 'Sesak napas saat berbaring. Perlu bantal tambahan untuk bisa bernapas. Napas terasa berat.',
    impact: 'sangat_mengganggu',
    inputSource: 'dokter',
    dataSource: 'manual',
    followUpStatus: 'sedang_diproses',
    clinicalNote: 'Posisi semi-Fowler. Oksimetri dipantau. O2 saturasi 93%.',
    validatedBy: 'Dr. Andi Pratama',
    alertLevel: 'merah',
    createdAt: '2025-03-04T06:00:00Z',
    updatedAt: '2025-03-04T07:30:00Z',
  },
  {
    id: 'dc-008',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-04',
    time: '16:20',
    category: 'kecemasan',
    severity: 'sedang',
    severityScore: 6,
    description: 'Cemas dan khawatir berlebihan tentang kondisi penyakitnya. Tidak bisa tenang, sering menangis.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'keluarga',
    dataSource: 'chat',
    followUpStatus: 'belum_ditindaklanjuti',
    chatMessageId: 'msg-412',
    alertLevel: 'kuning',
    createdAt: '2025-03-04T16:20:00Z',
    updatedAt: '2025-03-04T16:20:00Z',
  },
  {
    id: 'dc-009',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-04',
    time: '22:10',
    category: 'muntah',
    severity: 'sedang',
    severityScore: 4,
    description: 'Muntah 2 kali setelah makan malam. Mual sejak sore.',
    impact: 'sedikit_mengganggu',
    inputSource: 'pasien',
    dataSource: 'ai_classification',
    followUpStatus: 'sedang_diproses',
    clinicalNote: 'Antiemetik IV diberikan. Intravena line dipasang untuk hidrasi.',
    validatedBy: 'Dr. Andi Pratama',
    alertLevel: 'kuning',
    createdAt: '2025-03-04T22:10:00Z',
    updatedAt: '2025-03-04T23:00:00Z',
  },
  {
    id: 'dc-010',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-05',
    time: '08:45',
    category: 'nyeri',
    severity: 'sedang',
    severityScore: 6,
    description: 'Nyeri punggung bawah menurun sedikit menjadi skala 6/10. Masih terasa saat bergerak.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'pasien',
    dataSource: 'chat',
    followUpStatus: 'sedang_diproses',
    chatMessageId: 'msg-503',
    alertLevel: 'kuning',
    createdAt: '2025-03-05T08:45:00Z',
    updatedAt: '2025-03-05T10:00:00Z',
  },
  {
    id: 'dc-011',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-05',
    time: '11:30',
    category: 'konstipasi',
    severity: 'ringan',
    severityScore: 3,
    description: 'Sudah 3 hari tidak buang air besar. Perut terasa penuh.',
    impact: 'sedikit_mengganggu',
    inputSource: 'pasien',
    dataSource: 'manual',
    followUpStatus: 'belum_ditindaklanjuti',
    alertLevel: 'hijau',
    createdAt: '2025-03-05T11:30:00Z',
    updatedAt: '2025-03-05T11:30:00Z',
  },
  {
    id: 'dc-012',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-05',
    time: '19:00',
    category: 'depresi',
    severity: 'sedang',
    severityScore: 5,
    description: 'Merasa sedih dan putus asa. Tidak melihat harapan untuk sembuh. Menangis tanpa sebab jelas.',
    impact: 'mengganggu_aktivitas',
    inputSource: 'keluarga',
    dataSource: 'ai_classification',
    followUpStatus: 'belum_ditindaklanjuti',
    alertLevel: 'kuning',
    createdAt: '2025-03-05T19:00:00Z',
    updatedAt: '2025-03-05T19:00:00Z',
  },
  {
    id: 'dc-013',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-05',
    time: '21:15',
    category: 'masalah_spiritual',
    severity: 'ringan',
    severityScore: 3,
    description: 'Merasa kesulitan menjalankan ibadah karena kondisi tubuh. Ingin berbicara dengan pendamping rohani.',
    impact: 'sedikit_mengganggu',
    inputSource: 'pasien',
    dataSource: 'chat',
    followUpStatus: 'sedang_diproses',
    chatMessageId: 'msg-520',
    alertLevel: 'hijau',
    createdAt: '2025-03-05T21:15:00Z',
    updatedAt: '2025-03-05T22:00:00Z',
  },
  {
    id: 'dc-014',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-05',
    time: '14:00',
    category: 'batuk',
    severity: 'ringan',
    severityScore: 2,
    description: 'Batuk kering ringan, terutama malam hari. Tidak berdahak.',
    impact: 'tidak_mengganggu',
    inputSource: 'dokter',
    dataSource: 'manual',
    followUpStatus: 'selesai',
    clinicalNote: 'Antitusif diberikan. Batuk kemungkinan efek samping obat ACE inhibitor.',
    validatedBy: 'Dr. Andi Pratama',
    alertLevel: 'hijau',
    createdAt: '2025-03-05T14:00:00Z',
    updatedAt: '2025-03-05T16:00:00Z',
  },
  {
    id: 'dc-015',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-05',
    time: '10:00',
    category: 'masalah_sosial',
    severity: 'sedang',
    severityScore: 4,
    description: 'Merasa kesepian karena keluarga jarang berkunjung. Ingin teman berbicara.',
    impact: 'sedikit_mengganggu',
    inputSource: 'keluarga',
    dataSource: 'manual',
    followUpStatus: 'sedang_diproses',
    alertLevel: 'hijau',
    createdAt: '2025-03-05T10:00:00Z',
    updatedAt: '2025-03-05T12:00:00Z',
  },
  {
    id: 'dc-016',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    medicalRecordNumber: 'RM-2025-001',
    date: '2025-03-03',
    time: '10:30',
    category: 'diare',
    severity: 'ringan',
    severityScore: 3,
    description: 'Buang air encer 3 kali hari ini. Kemungkinan efek samping obat.',
    impact: 'sedikit_mengganggu',
    inputSource: 'pasien',
    dataSource: 'ai_classification',
    followUpStatus: 'selesai',
    clinicalNote: 'Obat antidiare diberikan. Pantau dehidrasi.',
    validatedBy: 'Dr. Andi Pratama',
    alertLevel: 'hijau',
    createdAt: '2025-03-03T10:30:00Z',
    updatedAt: '2025-03-03T14:00:00Z',
  },
];

// ─── Mock Complaint Trends (14 days) ──────────────────────────────────────────

export const MOCK_COMPLAINT_TRENDS: DailyComplaintTrend[] = [
  { date: '2025-02-20', nyeri: 4, sesak_napas: 2, mual: 3, kelelahan: 5, gangguan_tidur: 3, kecemasan: 2 },
  { date: '2025-02-21', nyeri: 5, sesak_napas: 2, mual: 4, kelelahan: 6, gangguan_tidur: 4, kecemasan: 3 },
  { date: '2025-02-22', nyeri: 5, sesak_napas: 3, mual: 3, kelelahan: 5, gangguan_tidur: 5, kecemasan: 3 },
  { date: '2025-02-23', nyeri: 6, sesak_napas: 3, mual: 4, kelelahan: 7, gangguan_tidur: 4, kecemasan: 4 },
  { date: '2025-02-24', nyeri: 6, sesak_napas: 4, mual: 5, kelelahan: 6, gangguan_tidur: 5, kecemasan: 4 },
  { date: '2025-02-25', nyeri: 7, sesak_napas: 4, mual: 3, kelelahan: 7, gangguan_tidur: 6, kecemasan: 5 },
  { date: '2025-02-26', nyeri: 6, sesak_napas: 5, mual: 4, kelelahan: 8, gangguan_tidur: 6, kecemasan: 5 },
  { date: '2025-02-27', nyeri: 5, sesak_napas: 5, mual: 3, kelelahan: 7, gangguan_tidur: 5, kecemasan: 4 },
  { date: '2025-02-28', nyeri: 6, sesak_napas: 6, mual: 4, kelelahan: 6, gangguan_tidur: 5, kecemasan: 5 },
  { date: '2025-03-01', nyeri: 5, sesak_napas: 5, mual: 2, kelelahan: 6, gangguan_tidur: 4, kecemasan: 4 },
  { date: '2025-03-02', nyeri: 7, sesak_napas: 5, mual: 3, kelelahan: 6, gangguan_tidur: 5, kecemasan: 5 },
  { date: '2025-03-03', nyeri: 8, sesak_napas: 6, mual: 4, kelelahan: 7, gangguan_tidur: 6, kecemasan: 6 },
  { date: '2025-03-04', nyeri: 6, sesak_napas: 7, mual: 5, kelelahan: 7, gangguan_tidur: 5, kecemasan: 6 },
  { date: '2025-03-05', nyeri: 6, sesak_napas: 6, mual: 3, kelelahan: 6, gangguan_tidur: 5, kecemasan: 5 },
];

// ─── Mock Complaint Alerts ─────────────────────────────────────────────────────

export const MOCK_COMPLAINT_ALERTS: DailyComplaintAlert[] = [
  {
    id: 'alert-001',
    complaintId: 'dc-005',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    alertLevel: 'merah',
    title: 'Nyeri Berat - Skor 8/10',
    description: 'Pasien melaporkan nyeri hebat di area perut dengan skor 8/10 yang tidak berkurang dengan analgesik saat ini.',
    triggerReason: 'Skor keluhan ≥ 7',
    createdAt: '2025-03-03T07:30:00Z',
    isRead: true,
    isResolved: false,
  },
  {
    id: 'alert-002',
    complaintId: 'dc-005',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    alertLevel: 'merah',
    title: 'Nyeri Meningkat Berturut-turut',
    description: 'Skor nyeri meningkat dari 5 ke 8 selama 3 hari berturut-turut (1-3 Maret 2025).',
    triggerReason: 'Nyeri meningkat 3 hari berturut-turut',
    createdAt: '2025-03-03T08:00:00Z',
    isRead: true,
    isResolved: false,
  },
  {
    id: 'alert-003',
    complaintId: 'dc-007',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    alertLevel: 'merah',
    title: 'Sesak Napas Meningkat',
    description: 'Pasien mengalami sesak napas saat berbaring dengan saturasi O2 93%. Memerlukan posisi semi-Fowler.',
    triggerReason: 'Sesak napas meningkat',
    createdAt: '2025-03-04T06:00:00Z',
    isRead: true,
    isResolved: false,
  },
  {
    id: 'alert-004',
    complaintId: 'dc-009',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    alertLevel: 'kuning',
    title: 'Keluhan Baru: Muntah Pasca Terapi',
    description: 'Muntah muncul setelah sesi kemoterapi. Sebelumnya hanya mual ringan tanpa muntah.',
    triggerReason: 'Keluhan baru muncul setelah terapi',
    createdAt: '2025-03-04T22:10:00Z',
    isRead: false,
    isResolved: false,
  },
  {
    id: 'alert-005',
    complaintId: 'dc-007',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    alertLevel: 'merah',
    title: 'Kondisi Gawat Darurat - Sesak Napas Berat',
    description: 'Sesak napas berat dengan saturasi O2 di bawah 95%. Kondisi memerlukan evaluasi gawat darurat segera.',
    triggerReason: 'Kondisi gawat darurat',
    createdAt: '2025-03-04T06:30:00Z',
    isRead: true,
    isResolved: false,
  },
  {
    id: 'alert-006',
    complaintId: 'dc-012',
    patientId: 'patient-001',
    patientName: 'Siti Rahayu',
    alertLevel: 'kuning',
    title: 'Indikasi Depresi - Perlu Evaluasi Psikologis',
    description: 'Pasien menunjukkan tanda-tanda depresi: merasa putus asa, menangis tanpa sebab, dan tidak melihat harapan.',
    triggerReason: 'Skor keluhan ≥ 4 pada kategori psikologis',
    createdAt: '2025-03-05T19:00:00Z',
    isRead: false,
    isResolved: false,
  },
];
