import type {
  SocialNeedsCategory,
  SocialNeedsQuestion,
  SocialNeedsQuestionOption,
  SocialNeedsRiskLevel,
  SocialNeedsCategoryScore,
  SocialNeedsScreeningResult,
} from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const CATEGORY_META: Record<SocialNeedsCategory, { label: string; icon: string; color: string; description: string }> = {
  dukungan_keluarga: { label: 'Dukungan Keluarga', icon: 'Heart', color: '#2D8C7A', description: 'Menilai kecukupan dukungan keluarga terhadap pasien' },
  caregiver: { label: 'Caregiver & Pendampingan', icon: 'Users', color: '#6DB8A8', description: 'Menilai kondisi dan beban caregiver utama' },
  tempat_tinggal: { label: 'Kondisi Tempat Tinggal', icon: 'Home', color: '#4A9B8C', description: 'Menilai kelayakan dan aksesibilitas tempat tinggal' },
  akses_layanan: { label: 'Akses Pelayanan Kesehatan', icon: 'Building2', color: '#3D7A6E', description: 'Menilai kemudahan akses ke fasilitas kesehatan' },
  ekonomi: { label: 'Kondisi Ekonomi & Finansial', icon: 'Wallet', color: '#D9B26F', description: 'Menilai beban ekonomi dan kebutuhan bantuan finansial' },
  transportasi: { label: 'Transportasi', icon: 'Car', color: '#C49A52', description: 'Menilai ketersediaan dan hambatan transportasi' },
  interaksi_sosial: { label: 'Interaksi Sosial', icon: 'MessageCircle', color: '#7BC4B4', description: 'Menilai tingkat interaksi sosial dan risiko isolasi' },
  kebutuhan_informasi: { label: 'Kebutuhan Informasi', icon: 'BookOpen', color: '#5A9E8F', description: 'Menilai pemahaman dan kebutuhan informasi pasien' },
  pertanyaan_terbuka: { label: 'Pertanyaan Terbuka', icon: 'FileText', color: '#8BBFAD', description: 'Catatan tambahan dari pasien dan keluarga' },
};

// ═══════════════════════════════════════════════════════════════════════════
// ALL 31 SCREENING QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SOCIAL_NEEDS_QUESTIONS: SocialNeedsQuestion[] = [
  // ─── A. DUKUNGAN KELUARGA (Q1-Q5) ────────────────────────────────────
  {
    id: 'q1',
    category: 'dukungan_keluarga',
    categoryLabel: 'Dukungan Keluarga',
    questionNumber: 1,
    questionText: 'Siapa yang saat ini menjadi pendamping utama pasien?',
    type: 'single_choice',
    options: [
      { label: 'Pasangan', value: 'pasangan', score: 0 },
      { label: 'Anak', value: 'anak', score: 1 },
      { label: 'Orang Tua', value: 'orang_tua', score: 1 },
      { label: 'Saudara', value: 'saudara', score: 2 },
      { label: 'Tetangga', value: 'tetangga', score: 3 },
      { label: 'Caregiver Profesional', value: 'caregiver_profesional', score: 2 },
      { label: 'Tidak Ada Pendamping Tetap', value: 'tidak_ada', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q2',
    category: 'dukungan_keluarga',
    categoryLabel: 'Dukungan Keluarga',
    questionNumber: 2,
    questionText: 'Apakah pasien tinggal bersama keluarga?',
    type: 'single_choice',
    options: [
      { label: 'Ya', value: 'ya', score: 0 },
      { label: 'Tidak', value: 'tidak', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q3',
    category: 'dukungan_keluarga',
    categoryLabel: 'Dukungan Keluarga',
    questionNumber: 3,
    questionText: 'Seberapa sering anggota keluarga membantu kebutuhan sehari-hari pasien?',
    type: 'single_choice',
    options: [
      { label: 'Selalu', value: 'selalu', score: 0 },
      { label: 'Sering', value: 'sering', score: 1 },
      { label: 'Kadang-kadang', value: 'kadang', score: 2 },
      { label: 'Jarang', value: 'jarang', score: 3 },
      { label: 'Tidak Pernah', value: 'tidak_pernah', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q4',
    category: 'dukungan_keluarga',
    categoryLabel: 'Dukungan Keluarga',
    questionNumber: 4,
    questionText: 'Apakah pasien merasa mendapatkan dukungan emosional yang cukup dari keluarga?',
    type: 'single_choice',
    options: [
      { label: 'Sangat Cukup', value: 'sangat_cukup', score: 0 },
      { label: 'Cukup', value: 'cukup', score: 1 },
      { label: 'Kurang', value: 'kurang', score: 2 },
      { label: 'Tidak Ada', value: 'tidak_ada', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q5',
    category: 'dukungan_keluarga',
    categoryLabel: 'Dukungan Keluarga',
    questionNumber: 5,
    questionText: 'Apakah terdapat konflik keluarga yang memengaruhi perawatan pasien?',
    type: 'single_choice',
    options: [
      { label: 'Tidak Ada', value: 'tidak_ada', score: 0 },
      { label: 'Ringan', value: 'ringan', score: 1 },
      { label: 'Sedang', value: 'sedang', score: 2 },
      { label: 'Berat', value: 'berat', score: 3 },
    ],
    required: true,
  },

  // ─── B. CAREGIVER & PENDAMPINGAN (Q6-Q9) ────────────────────────────
  {
    id: 'q6',
    category: 'caregiver',
    categoryLabel: 'Caregiver & Pendampingan',
    questionNumber: 6,
    questionText: 'Apakah pasien memiliki caregiver utama?',
    type: 'single_choice',
    options: [
      { label: 'Ya', value: 'ya', score: 0 },
      { label: 'Tidak', value: 'tidak', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q7',
    category: 'caregiver',
    categoryLabel: 'Caregiver & Pendampingan',
    questionNumber: 7,
    questionText: 'Berapa lama caregiver mendampingi pasien setiap hari?',
    type: 'single_choice',
    options: [
      { label: 'Kurang dari 4 jam', value: 'kurang_4', score: 0 },
      { label: '4–8 jam', value: '4_8', score: 1 },
      { label: '8–12 jam', value: '8_12', score: 2 },
      { label: 'Lebih dari 12 jam', value: 'lebih_12', score: 3 },
      { label: '24 jam penuh', value: '24_jam', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q8',
    category: 'caregiver',
    categoryLabel: 'Caregiver & Pendampingan',
    questionNumber: 8,
    questionText: 'Apakah caregiver merasa kewalahan dalam merawat pasien?',
    type: 'single_choice',
    options: [
      { label: 'Tidak', value: 'tidak', score: 0 },
      { label: 'Sedikit', value: 'sedikit', score: 1 },
      { label: 'Cukup Berat', value: 'cukup_berat', score: 2 },
      { label: 'Sangat Berat', value: 'sangat_berat', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q9',
    category: 'caregiver',
    categoryLabel: 'Caregiver & Pendampingan',
    questionNumber: 9,
    questionText: 'Apakah terdapat caregiver cadangan apabila caregiver utama berhalangan?',
    type: 'single_choice',
    options: [
      { label: 'Ya', value: 'ya', score: 0 },
      { label: 'Tidak', value: 'tidak', score: 3 },
    ],
    required: true,
  },

  // ─── C. KONDISI TEMPAT TINGGAL (Q10-Q12) ────────────────────────────
  {
    id: 'q10',
    category: 'tempat_tinggal',
    categoryLabel: 'Kondisi Tempat Tinggal',
    questionNumber: 10,
    questionText: 'Kondisi tempat tinggal pasien saat ini',
    type: 'single_choice',
    hasTooltip: true,
    options: [
      {
        label: 'Sangat Layak',
        value: 'sangat_layak',
        score: 0,
        tooltip: 'Rumah permanen, bersih, aman, memiliki ventilasi dan pencahayaan yang baik, tersedia air bersih, listrik, sanitasi memadai, serta mendukung kebutuhan perawatan pasien di rumah.',
      },
      {
        label: 'Layak',
        value: 'layak',
        score: 1,
        tooltip: 'Rumah aman dan nyaman untuk ditempati, kebutuhan dasar tersedia, namun masih terdapat keterbatasan kecil yang tidak secara signifikan mengganggu perawatan pasien.',
      },
      {
        label: 'Kurang Layak',
        value: 'kurang_layak',
        score: 2,
        tooltip: 'Terdapat kondisi lingkungan atau bangunan yang dapat menghambat kenyamanan dan perawatan pasien, seperti ruang sempit, ventilasi kurang baik, sanitasi kurang memadai, atau akses rumah yang sulit.',
      },
      {
        label: 'Tidak Layak',
        value: 'tidak_layak',
        score: 3,
        tooltip: 'Kondisi rumah tidak memenuhi kebutuhan dasar kesehatan dan keselamatan sehingga berpotensi membahayakan pasien atau menghambat proses perawatan secara signifikan.',
      },
    ],
    required: true,
  },
  {
    id: 'q11',
    category: 'tempat_tinggal',
    categoryLabel: 'Kondisi Tempat Tinggal',
    questionNumber: 11,
    questionText: 'Apakah rumah pasien mudah diakses oleh tenaga kesehatan?',
    type: 'single_choice',
    options: [
      { label: 'Mudah', value: 'mudah', score: 0 },
      { label: 'Sulit', value: 'sulit', score: 2 },
      { label: 'Sangat Sulit', value: 'sangat_sulit', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q12',
    category: 'tempat_tinggal',
    categoryLabel: 'Kondisi Tempat Tinggal',
    questionNumber: 12,
    questionText: 'Fasilitas pendukung yang tersedia di rumah pasien',
    type: 'multiple_choice',
    options: [
      { label: 'Tempat Tidur Khusus', value: 'tempat_tidur', score: 0 },
      { label: 'Kursi Roda', value: 'kursi_roda', score: 0 },
      { label: 'Toilet Ramah Disabilitas', value: 'toilet_disabilitas', score: 0 },
      { label: 'Pegangan Tangan', value: 'pegangan_tangan', score: 0 },
      { label: 'Oksigen', value: 'oksigen', score: 0 },
      { label: 'Alat Suction', value: 'suction', score: 0 },
      { label: 'Kasur Antidekubitus', value: 'kasur_anti', score: 0 },
      { label: 'Tidak Ada Fasilitas Khusus', value: 'tidak_ada', score: 3 },
    ],
    required: true,
  },

  // ─── D. AKSES PELAYANAN KESEHATAN (Q13-Q15) ────────────────────────
  {
    id: 'q13',
    category: 'akses_layanan',
    categoryLabel: 'Akses Pelayanan Kesehatan',
    questionNumber: 13,
    questionText: 'Jarak rumah ke fasilitas kesehatan terdekat',
    type: 'single_choice',
    options: [
      { label: '< 5 km', value: 'kurang_5', score: 0 },
      { label: '5–10 km', value: '5_10', score: 1 },
      { label: '10–20 km', value: '10_20', score: 2 },
      { label: '> 20 km', value: 'lebih_20', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q14',
    category: 'akses_layanan',
    categoryLabel: 'Akses Pelayanan Kesehatan',
    questionNumber: 14,
    questionText: 'Apakah pasien mengalami kesulitan mencapai fasilitas kesehatan?',
    type: 'single_choice',
    options: [
      { label: 'Tidak', value: 'tidak', score: 0 },
      { label: 'Kadang-kadang', value: 'kadang', score: 1 },
      { label: 'Sering', value: 'sering', score: 2 },
      { label: 'Selalu', value: 'selalu', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q15',
    category: 'akses_layanan',
    categoryLabel: 'Akses Pelayanan Kesehatan',
    questionNumber: 15,
    questionText: 'Penyebab utama kesulitan akses',
    type: 'multiple_choice',
    options: [
      { label: 'Transportasi', value: 'transportasi', score: 2 },
      { label: 'Biaya', value: 'biaya', score: 2 },
      { label: 'Kondisi Fisik Pasien', value: 'kondisi_fisik', score: 2 },
      { label: 'Tidak Ada Pendamping', value: 'tidak_ada_pendamping', score: 2 },
      { label: 'Lokasi Jauh', value: 'lokasi_jauh', score: 2 },
      { label: 'Faktor Geografis', value: 'geografis', score: 2 },
      { label: 'Faktor Lainnya', value: 'lainnya', score: 1 },
    ],
    required: false,
  },

  // ─── E. KONDISI EKONOMI & FINANSIAL (Q16-Q20) ──────────────────────
  {
    id: 'q16',
    category: 'ekonomi',
    categoryLabel: 'Kondisi Ekonomi & Finansial',
    questionNumber: 16,
    questionText: 'Sumber pembiayaan utama pengobatan',
    type: 'single_choice',
    options: [
      { label: 'BPJS', value: 'bpjs', score: 0 },
      { label: 'Asuransi Swasta', value: 'asuransi_swasta', score: 0 },
      { label: 'Biaya Pribadi', value: 'biaya_pribadi', score: 2 },
      { label: 'Bantuan Keluarga', value: 'bantuan_keluarga', score: 2 },
      { label: 'Bantuan Sosial', value: 'bantuan_sosial', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q17',
    category: 'ekonomi',
    categoryLabel: 'Kondisi Ekonomi & Finansial',
    questionNumber: 17,
    questionText: 'Apakah biaya pengobatan menjadi beban bagi keluarga?',
    type: 'single_choice',
    options: [
      { label: 'Tidak', value: 'tidak', score: 0 },
      { label: 'Sedikit', value: 'sedikit', score: 1 },
      { label: 'Cukup Berat', value: 'cukup_berat', score: 2 },
      { label: 'Sangat Berat', value: 'sangat_berat', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q18',
    category: 'ekonomi',
    categoryLabel: 'Kondisi Ekonomi & Finansial',
    questionNumber: 18,
    questionText: 'Apakah pasien pernah menunda pengobatan karena masalah biaya?',
    type: 'single_choice',
    options: [
      { label: 'Ya', value: 'ya', score: 3 },
      { label: 'Tidak', value: 'tidak', score: 0 },
    ],
    required: true,
  },
  {
    id: 'q19',
    category: 'ekonomi',
    categoryLabel: 'Kondisi Ekonomi & Finansial',
    questionNumber: 19,
    questionText: 'Apakah pasien memerlukan bantuan biaya tambahan?',
    type: 'single_choice',
    options: [
      { label: 'Ya', value: 'ya', score: 3 },
      { label: 'Tidak', value: 'tidak', score: 0 },
    ],
    required: true,
  },
  {
    id: 'q20',
    category: 'ekonomi',
    categoryLabel: 'Kondisi Ekonomi & Finansial',
    questionNumber: 20,
    questionText: 'Bantuan yang paling dibutuhkan',
    type: 'multiple_choice',
    options: [
      { label: 'Obat', value: 'obat', score: 1 },
      { label: 'Nutrisi', value: 'nutrisi', score: 1 },
      { label: 'Alat Kesehatan', value: 'alat_kesehatan', score: 1 },
      { label: 'Transportasi', value: 'transportasi', score: 1 },
      { label: 'Home Care', value: 'home_care', score: 1 },
      { label: 'Bantuan Finansial', value: 'finansial', score: 2 },
      { label: 'Pendampingan Sosial', value: 'pendampingan_sosial', score: 1 },
    ],
    required: false,
  },

  // ─── F. TRANSPORTASI (Q21-Q23) ─────────────────────────────────────
  {
    id: 'q21',
    category: 'transportasi',
    categoryLabel: 'Transportasi',
    questionNumber: 21,
    questionText: 'Transportasi yang biasa digunakan pasien',
    type: 'single_choice',
    options: [
      { label: 'Kendaraan Pribadi', value: 'pribadi', score: 0 },
      { label: 'Kendaraan Keluarga', value: 'keluarga', score: 0 },
      { label: 'Ambulans', value: 'ambulans', score: 2 },
      { label: 'Transportasi Umum', value: 'umum', score: 1 },
      { label: 'Ojek Online', value: 'ojek_online', score: 1 },
      { label: 'Tidak Memiliki Akses Transportasi', value: 'tidak_ada', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q22',
    category: 'transportasi',
    categoryLabel: 'Transportasi',
    questionNumber: 22,
    questionText: 'Apakah transportasi menjadi hambatan untuk berobat?',
    type: 'single_choice',
    options: [
      { label: 'Tidak', value: 'tidak', score: 0 },
      { label: 'Kadang-kadang', value: 'kadang', score: 1 },
      { label: 'Sering', value: 'sering', score: 2 },
      { label: 'Selalu', value: 'selalu', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q23',
    category: 'transportasi',
    categoryLabel: 'Transportasi',
    questionNumber: 23,
    questionText: 'Apakah pasien memerlukan transportasi medis khusus?',
    type: 'single_choice',
    options: [
      { label: 'Ya', value: 'ya', score: 3 },
      { label: 'Tidak', value: 'tidak', score: 0 },
    ],
    required: true,
  },

  // ─── G. INTERAKSI SOSIAL (Q24-Q26) ─────────────────────────────────
  {
    id: 'q24',
    category: 'interaksi_sosial',
    categoryLabel: 'Interaksi Sosial',
    questionNumber: 24,
    questionText: 'Seberapa sering pasien berinteraksi dengan keluarga atau teman?',
    type: 'single_choice',
    options: [
      { label: 'Setiap Hari', value: 'setiap_hari', score: 0 },
      { label: 'Beberapa Kali Seminggu', value: 'seminggu', score: 1 },
      { label: 'Beberapa Kali Sebulan', value: 'sebulan', score: 2 },
      { label: 'Hampir Tidak Pernah', value: 'hampir_tidak', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q25',
    category: 'interaksi_sosial',
    categoryLabel: 'Interaksi Sosial',
    questionNumber: 25,
    questionText: 'Apakah pasien merasa kesepian?',
    type: 'single_choice',
    options: [
      { label: 'Tidak Pernah', value: 'tidak_pernah', score: 0 },
      { label: 'Kadang-kadang', value: 'kadang', score: 1 },
      { label: 'Sering', value: 'sering', score: 2 },
      { label: 'Hampir Selalu', value: 'hampir_selalu', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q26',
    category: 'interaksi_sosial',
    categoryLabel: 'Interaksi Sosial',
    questionNumber: 26,
    questionText: 'Apakah pasien masih aktif dalam kegiatan sosial atau keagamaan?',
    type: 'single_choice',
    options: [
      { label: 'Aktif', value: 'aktif', score: 0 },
      { label: 'Kadang-kadang', value: 'kadang', score: 1 },
      { label: 'Jarang', value: 'jarang', score: 2 },
      { label: 'Tidak Aktif', value: 'tidak_aktif', score: 3 },
    ],
    required: true,
  },

  // ─── H. KEBUTUHAN INFORMASI (Q27-Q28) ─────────────────────────────
  {
    id: 'q27',
    category: 'kebutuhan_informasi',
    categoryLabel: 'Kebutuhan Informasi',
    questionNumber: 27,
    questionText: 'Apakah pasien dan keluarga memahami kondisi penyakit saat ini?',
    type: 'single_choice',
    options: [
      { label: 'Sangat Paham', value: 'sangat_paham', score: 0 },
      { label: 'Cukup Paham', value: 'cukup_paham', score: 1 },
      { label: 'Kurang Paham', value: 'kurang_paham', score: 2 },
      { label: 'Tidak Paham', value: 'tidak_paham', score: 3 },
    ],
    required: true,
  },
  {
    id: 'q28',
    category: 'kebutuhan_informasi',
    categoryLabel: 'Kebutuhan Informasi',
    questionNumber: 28,
    questionText: 'Informasi yang paling dibutuhkan saat ini',
    type: 'multiple_choice',
    options: [
      { label: 'Penyakit', value: 'penyakit', score: 1 },
      { label: 'Pengobatan', value: 'pengobatan', score: 1 },
      { label: 'Perawatan di Rumah', value: 'perawatan_rumah', score: 1 },
      { label: 'Nutrisi', value: 'nutrisi', score: 1 },
      { label: 'Dukungan Sosial', value: 'dukungan_sosial', score: 1 },
      { label: 'Persiapan Akhir Hayat', value: 'akhir_hayat', score: 2 },
      { label: 'Advance Care Planning', value: 'acp', score: 2 },
    ],
    required: false,
  },

  // ─── I. PERTANYAAN TERBUKA (Q29-Q31) ──────────────────────────────
  {
    id: 'q29',
    category: 'pertanyaan_terbuka',
    categoryLabel: 'Pertanyaan Terbuka',
    questionNumber: 29,
    questionText: 'Apa kesulitan terbesar yang dihadapi pasien atau keluarga saat ini?',
    type: 'text_area',
    required: false,
  },
  {
    id: 'q30',
    category: 'pertanyaan_terbuka',
    categoryLabel: 'Pertanyaan Terbuka',
    questionNumber: 30,
    questionText: 'Bantuan apa yang paling diharapkan dari tenaga kesehatan?',
    type: 'text_area',
    required: false,
  },
  {
    id: 'q31',
    category: 'pertanyaan_terbuka',
    categoryLabel: 'Pertanyaan Terbuka',
    questionNumber: 31,
    questionText: 'Apakah ada kebutuhan khusus yang belum terpenuhi?',
    type: 'text_area',
    required: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the max possible score for a single-choice question
 */
function getMaxScoreForQuestion(q: SocialNeedsQuestion): number {
  if (q.type === 'text_area') return 0;
  if (!q.options || q.options.length === 0) return 0;
  return Math.max(...q.options.map((o) => o.score));
}

/**
 * Calculate the score for a single-choice answer
 */
function getSingleChoiceScore(questionId: string, value: string): number {
  const question = SOCIAL_NEEDS_QUESTIONS.find((q) => q.id === questionId);
  if (!question || !question.options) return 0;
  const option = question.options.find((o) => o.value === value);
  return option?.score ?? 0;
}

/**
 * Calculate the score for a multiple-choice answer
 * Uses the highest individual score from selected options
 * (selecting more risky options = higher overall risk)
 */
function getMultipleChoiceScore(questionId: string, values: string[]): number {
  const question = SOCIAL_NEEDS_QUESTIONS.find((q) => q.id === questionId);
  if (!question || !question.options) return 0;

  let totalScore = 0;
  for (const val of values) {
    const option = question.options.find((o) => o.value === val);
    totalScore += option?.score ?? 0;
  }

  // Cap at the max possible for this question type
  const maxScore = getMaxScoreForQuestion(question);
  // For multiple choice, the max is the sum of all positive scores
  const sumMax = question.options.reduce((sum, o) => sum + o.score, 0);
  return Math.min(totalScore, sumMax);
}

/**
 * Get max possible score for a multiple choice question (sum of all positive scores)
 */
function getMaxScoreForMultipleChoice(q: SocialNeedsQuestion): number {
  if (!q.options) return 0;
  // For "tidak_ada" type options with high score, use that as max
  const hasNegativeIndicator = q.options.some(o => o.score >= 3);
  if (hasNegativeIndicator) {
    // If there's a "no facility" option worth 3, max is 3
    return Math.max(...q.options.map(o => o.score));
  }
  // Otherwise, max is sum of top 3 selections (realistic scenario)
  const sortedScores = q.options.map(o => o.score).sort((a, b) => b - a);
  return sortedScores.slice(0, Math.min(3, sortedScores.length)).reduce((sum, s) => sum + s, 0);
}

/**
 * Determine risk level from percentage
 */
export function getRiskLevel(percentage: number): SocialNeedsRiskLevel {
  if (percentage <= 25) return 'rendah';
  if (percentage <= 50) return 'sedang';
  if (percentage <= 75) return 'tinggi';
  return 'sangat_tinggi';
}

/**
 * Get risk level color and label
 */
export function getRiskLevelDisplay(level: SocialNeedsRiskLevel): { label: string; color: string; bgColor: string; borderColor: string } {
  switch (level) {
    case 'rendah':
      return { label: 'Rendah', color: '#16A34A', bgColor: '#F0FDF4', borderColor: '#BBF7D0' };
    case 'sedang':
      return { label: 'Sedang', color: '#CA8A04', bgColor: '#FEFCE8', borderColor: '#FDE68A' };
    case 'tinggi':
      return { label: 'Tinggi', color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FED7AA' };
    case 'sangat_tinggi':
      return { label: 'Sangat Tinggi', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' };
  }
}

/**
 * Calculate full screening result from all answers
 */
export function calculateScreeningResult(
  answers: Record<string, string | string[]>
): SocialNeedsScreeningResult {
  const categories = Object.keys(CATEGORY_META) as SocialNeedsCategory[];
  const categoryScores: SocialNeedsCategoryScore[] = [];
  let totalScore = 0;
  let totalMaxScore = 0;

  for (const category of categories) {
    const categoryQuestions = SOCIAL_NEEDS_QUESTIONS.filter(
      (q) => q.category === category
    );

    let catScore = 0;
    let catMaxScore = 0;

    for (const q of categoryQuestions) {
      if (q.type === 'text_area') continue; // text areas don't contribute to score

      const answer = answers[q.id];
      if (!answer) continue;

      // Calculate max score for this question
      if (q.type === 'multiple_choice') {
        catMaxScore += getMaxScoreForMultipleChoice(q);
      } else {
        catMaxScore += getMaxScoreForQuestion(q);
      }

      // Calculate actual score
      if (q.type === 'single_choice' && typeof answer === 'string') {
        catScore += getSingleChoiceScore(q.id, answer);
      } else if (q.type === 'multiple_choice' && Array.isArray(answer)) {
        catScore += getMultipleChoiceScore(q.id, answer);
      }
    }

    // Skip categories with no scorable questions (like pertanyaan_terbuka)
    if (catMaxScore === 0) continue;

    const percentage = catMaxScore > 0 ? Math.round((catScore / catMaxScore) * 100) : 0;
    categoryScores.push({
      category,
      categoryLabel: CATEGORY_META[category].label,
      totalScore: catScore,
      maxScore: catMaxScore,
      percentage,
      riskLevel: getRiskLevel(percentage),
    });

    totalScore += catScore;
    totalMaxScore += catMaxScore;
  }

  const overallPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  return {
    totalScore,
    maxScore: totalMaxScore,
    overallPercentage,
    overallRiskLevel: getRiskLevel(overallPercentage),
    categoryScores,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Get questions grouped by category
 */
export function getQuestionsByCategory(): Record<SocialNeedsCategory, SocialNeedsQuestion[]> {
  const grouped = {} as Record<SocialNeedsCategory, SocialNeedsQuestion[]>;
  for (const cat of Object.keys(CATEGORY_META) as SocialNeedsCategory[]) {
    grouped[cat] = SOCIAL_NEEDS_QUESTIONS.filter((q) => q.category === cat);
  }
  return grouped;
}

/**
 * Get category-level risk label for AI score display
 */
export function getAIStatusLabel(level: SocialNeedsRiskLevel): string {
  switch (level) {
    case 'rendah': return 'Baik';
    case 'sedang': return 'Cukup';
    case 'tinggi': return 'Kurang';
    case 'sangat_tinggi': return 'Risiko Tinggi';
  }
}

/**
 * Get recommendation category label in Indonesian
 */
export function getRecommendationCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    edukasi_keluarga: 'Edukasi Keluarga',
    family_meeting: 'Family Meeting',
    home_visit: 'Home Visit',
    konseling_psikososial: 'Konseling Psikososial',
    dukungan_caregiver: 'Dukungan Caregiver',
    bantuan_finansial: 'Bantuan Finansial',
    bantuan_transportasi: 'Bantuan Transportasi',
    rujukan_pekerja_sosial: 'Rujukan Pekerja Sosial Medis',
    pendampingan_spiritual: 'Pendampingan Spiritual',
    monitoring_intensif: 'Monitoring Intensif',
  };
  return labels[category] || category;
}

/**
 * Mock AI analysis result for fallback when API fails
 */
export function generateLocalAIAnalysis(
  screeningResult: SocialNeedsScreeningResult,
  answers: Record<string, string | string[]>
): import('@/lib/types').SocialNeedsAIResult {
  const cs = screeningResult.categoryScores;
  const findCat = (cat: SocialNeedsCategory) => cs.find(c => c.category === cat);

  const familyScore = findCat('dukungan_keluarga');
  const caregiverScore = findCat('caregiver');
  const housingScore = findCat('tempat_tinggal');
  const accessScore = findCat('akses_layanan');
  const econScore = findCat('ekonomi');
  const transportScore = findCat('transportasi');
  const socialScore = findCat('interaksi_sosial');

  const recommendations: import('@/lib/types').SocialNeedsAIRecommendation[] = [];
  const earlyWarnings: import('@/lib/types').SocialNeedsEarlyWarning[] = [];

  // Family support
  if (familyScore && familyScore.percentage > 50) {
    recommendations.push({
      priority: 1,
      action: 'Edukasi keluarga tentang perawatan paliatif dan dukungan emosional',
      reason: `Skor dukungan keluarga ${familyScore.percentage}% (${familyScore.riskLevel}) menunjukkan kebutuhan peningkatan dukungan keluarga`,
      category: 'edukasi_keluarga',
    });
  }
  if (familyScore && familyScore.percentage > 75) {
    recommendations.push({
      priority: 2,
      action: 'Jadwalkan Family Meeting untuk membahas rencana perawatan',
      reason: 'Risiko konflik keluarga dan kurangnya dukungan memerlukan intervensi melalui family meeting',
      category: 'family_meeting',
    });
  }

  // Caregiver
  if (caregiverScore && caregiverScore.percentage > 50) {
    recommendations.push({
      priority: 1,
      action: 'Program dukungan dan edukasi caregiver',
      reason: `Skor caregiver ${caregiverScore.percentage}% menunjukkan risiko burnout yang perlu ditangani`,
      category: 'dukungan_caregiver',
    });
    earlyWarnings.push({
      type: 'caregiver_burnout',
      severity: caregiverScore.percentage > 75 ? 'critical' : 'warning',
      title: 'Risiko Caregiver Burnout',
      description: `Caregiver menunjukkan tingkat beban ${caregiverScore.riskLevel}. Diperlukan dukungan segera.`,
    });
  }

  // Access
  if (accessScore && accessScore.percentage > 50) {
    recommendations.push({
      priority: 2,
      action: 'Jadwalkan Home Visit untuk evaluasi akses layanan',
      reason: `Skor akses layanan ${accessScore.percentage}% menunjukkan hambatan akses yang signifikan`,
      category: 'home_visit',
    });
  }

  // Financial
  if (econScore && econScore.percentage > 50) {
    recommendations.push({
      priority: 1,
      action: 'Rujuk ke pekerja sosial medis untuk evaluasi bantuan finansial',
      reason: `Skor finansial ${econScore.percentage}% menunjukkan beban ekonomi yang memerlukan intervensi`,
      category: 'bantuan_finansial',
    });
    earlyWarnings.push({
      type: 'financial_burden',
      severity: econScore.percentage > 75 ? 'critical' : 'warning',
      title: 'Risiko Beban Finansial Berat',
      description: `Beban ekonomi ${econScore.riskLevel} berpotensi mengganggu keberlanjutan perawatan.`,
    });
  }

  // Transport
  if (transportScore && transportScore.percentage > 50) {
    recommendations.push({
      priority: 2,
      action: 'Fasilitasi bantuan transportasi medis',
      reason: `Skor transportasi ${transportScore.percentage}% menunjukkan hambatan mobilitas yang signifikan`,
      category: 'bantuan_transportasi',
    });
  }

  // Social isolation
  if (socialScore && socialScore.percentage > 50) {
    recommendations.push({
      priority: 1,
      action: 'Konseling psikososial dan pendampingan spiritual',
      reason: `Skor interaksi sosial ${socialScore.percentage}% menunjukkan risiko isolasi sosial`,
      category: 'konseling_psikososial',
    });
    earlyWarnings.push({
      type: 'social_isolation',
      severity: socialScore.percentage > 75 ? 'critical' : 'warning',
      title: 'Risiko Isolasi Sosial',
      description: `Tingkat interaksi sosial rendah (${socialScore.riskLevel}) berpotensi menurunkan kualitas hidup.`,
    });
  }

  // Always add monitoring if any risk
  if (screeningResult.overallPercentage > 50) {
    recommendations.push({
      priority: 1,
      action: 'Tingkatkan frekuensi monitoring dan evaluasi berkala',
      reason: `Skor risiko keseluruhan ${screeningResult.overallPercentage}% memerlukan monitoring intensif`,
      category: 'monitoring_intensif',
    });
  }

  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);

  return {
    familySupportScore: familyScore?.riskLevel ?? 'rendah',
    socialRiskScore: screeningResult.overallRiskLevel,
    caregiverBurnoutScore: caregiverScore?.riskLevel ?? 'rendah',
    accessToCareScore: accessScore?.riskLevel ?? 'rendah',
    financialRiskScore: econScore?.riskLevel ?? 'rendah',
    socialIsolationScore: socialScore?.riskLevel ?? 'rendah',
    recommendations,
    analysisSummary: `Berdasarkan skrining kebutuhan sosial, pasien memiliki tingkat risiko sosial ${screeningResult.overallRiskLevel} dengan skor ${screeningResult.overallPercentage}%. ${recommendations.length > 0 ? `Terdapat ${recommendations.length} rekomendasi intervensi yang perlu ditindaklanjuti.` : 'Tidak ditemukan kebutuhan intervensi mendesak.'}`,
    earlyWarnings,
    generatedAt: new Date().toISOString(),
  };
}
