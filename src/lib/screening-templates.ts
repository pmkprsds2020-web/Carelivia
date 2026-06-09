import type { ScreeningModule, ScreeningModuleId, ScreeningForm, TriageResult, ClinicalSummary, TriageLevel } from './types';

// ── Module Labels & Icons ────────────────────────────────────────────────────

export const MODULE_LABELS: Record<ScreeningModuleId, string> = {
  keluhan_utama: 'Keluhan Utama',
  tanda_bahaya: 'Tanda Bahaya (Red Flag)',
  tanda_vital: 'Tanda Vital Mandiri',
  penyakit_kronis: 'Penyakit Kronis',
  nyeri: 'Skrining Nyeri (NRS)',
  kesehatan_mental: 'Kesehatan Mental',
  nutrisi: 'Skrining Nutrisi',
  risiko_jatuh: 'Risiko Jatuh',
  status_fungsional: 'Status Fungsional (ADL)',
  home_care: 'Kebutuhan Home Care',
  paliatif: 'Skrining Paliatif',
  bukti_klinis: 'Upload Bukti Klinis',
};

export const MODULE_ICONS: Record<ScreeningModuleId, string> = {
  keluhan_utama: 'stethoscope',
  tanda_bahaya: 'alert-triangle',
  tanda_vital: 'activity',
  penyakit_kronis: 'pill',
  nyeri: 'flame',
  kesehatan_mental: 'brain',
  nutrisi: 'apple',
  risiko_jatuh: 'shield-alert',
  status_fungsional: 'accessibility',
  home_care: 'home',
  paliatif: 'heart',
  bukti_klinis: 'paperclip',
};

// ── 12 Screening Modules ─────────────────────────────────────────────────────

export const SCREENING_MODULES: ScreeningModule[] = [
  // ── 1. Skrining Keluhan Utama ────────────────────────────────────────────
  {
    id: 'keluhan_utama',
    name: 'Skrining Keluhan Utama',
    icon: 'stethoscope',
    description: 'Mengumpulkan data keluhan utama pasien secara terstruktur',
    estimatedMinutes: 3,
    isRequired: true,
    targetAudience: 'all',
    questions: [
      { id: 'ku-keluhan', text: 'Apa keluhan utama Anda saat ini?', type: 'text', required: true, placeholder: 'Jelaskan keluhan utama Anda...' },
      { id: 'ku-lama', text: 'Sejak kapan keluhan ini dirasakan?', type: 'radio', required: true, section: 'Durasi Keluhan', options: [
        { label: '< 1 hari', value: 0, score: 0 }, { label: '1–3 hari', value: 1, score: 1 },
        { label: '4–7 hari', value: 2, score: 2 }, { label: '1–4 minggu', value: 3, score: 3 },
        { label: '> 1 bulan', value: 4, score: 4 },
      ]},
      { id: 'ku-keparahan', text: 'Tingkat keparahan keluhan (0 = tidak ada, 10 = sangat berat)', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'ku-memperberat', text: 'Faktor yang memperberat keluhan?', type: 'text', required: false, placeholder: 'Contoh: saat beraktivitas, setelah makan...' },
      { id: 'ku-mengurangi', text: 'Faktor yang mengurangi keluhan?', type: 'text', required: false, placeholder: 'Contoh: istirahat, minum obat...' },
      { id: 'ku-riwayat', text: 'Apakah pernah mengalami keluhan serupa sebelumnya?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, pernah', value: 1, score: 1 },
        { label: 'Ya, sering kambuh', value: 2, score: 2 },
      ]},
    ],
  },

  // ── 2. Skrining Tanda Bahaya (Red Flag) ──────────────────────────────────
  {
    id: 'tanda_bahaya',
    name: 'Skrining Tanda Bahaya (Red Flag)',
    icon: 'alert-triangle',
    description: 'Deteksi dini tanda bahaya yang memerlukan penanganan segera',
    estimatedMinutes: 2,
    isRequired: true,
    targetAudience: 'all',
    questions: [
      { id: 'tb-sesak', text: 'Sesak napas berat', type: 'radio', required: true, section: 'Tanda Bahaya', options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 5 },
      ]},
      { id: 'tb-nyeridada', text: 'Nyeri dada', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 5 },
      ]},
      { id: 'tb-kesadaran', text: 'Penurunan kesadaran', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 5 },
      ]},
      { id: 'tb-kejang', text: 'Kejang', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 5 },
      ]},
      { id: 'tb-perdarahan', text: 'Perdarahan aktif', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 5 },
      ]},
      { id: 'tb-kelemahan', text: 'Kelemahan mendadak pada anggota gerak', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 5 },
      ]},
      { id: 'tb-demam', text: 'Demam tinggi (>39°C)', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 4 },
      ]},
      { id: 'tb-dehidrasi', text: 'Dehidrasi berat', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 4 },
      ]},
      { id: 'tb-tidakmakan', text: 'Tidak mampu makan atau minum', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 4 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 0, category: 'rendah', label: 'Tidak Ada Tanda Bahaya', recommendations: ['Pasien dapat dilanjutkan telekonsultasi', 'Lanjutkan skrining modul lainnya'] },
        { min: 1, max: 4, category: 'sedang', label: 'Perlu Evaluasi Dokter Dalam 24 Jam', recommendations: ['Evaluasi dokter dalam 24 jam', 'Pantau kondisi pasien secara berkala', 'Instruksikan pasien untuk segera ke IGD jika memburuk'] },
        { min: 5, max: 99, category: 'tinggi', label: 'MEMERLUKAN EVALUASI LANGSUNG / RUJUKAN SEGERA', recommendations: ['Pasien memerlukan evaluasi langsung atau rujukan segera', 'Dianjurkan pemeriksaan di fasilitas kesehatan', 'Jika tanda bahaya mengancam jiwa, segera rujuk ke IGD'] },
      ],
    },
  },

  // ── 3. Skrining Tanda Vital Mandiri ──────────────────────────────────────
  {
    id: 'tanda_vital',
    name: 'Skrining Tanda Vital Mandiri',
    icon: 'activity',
    description: 'Pengukuran tanda vital yang dapat dilakukan pasien secara mandiri di rumah',
    estimatedMinutes: 5,
    isRequired: true,
    targetAudience: 'all',
    questions: [
      { id: 'tv-berat', text: 'Berat badan (kg)', type: 'number', required: true, section: 'Pengukuran Fisik', placeholder: 'Contoh: 70', unit: 'kg', min: 20, max: 300 },
      { id: 'tv-tinggi', text: 'Tinggi badan (cm)', type: 'number', required: true, placeholder: 'Contoh: 170', unit: 'cm', min: 50, max: 250 },
      { id: 'tv-suhu', text: 'Suhu tubuh (°C)', type: 'number', required: true, section: 'Tanda Vital', placeholder: 'Contoh: 36.5', unit: '°C', min: 34, max: 42 },
      { id: 'tv-sistolik', text: 'Tekanan darah sistolik (mmHg)', type: 'number', required: false, placeholder: 'Contoh: 120', unit: 'mmHg', min: 60, max: 250 },
      { id: 'tv-diastolik', text: 'Tekanan darah diastolik (mmHg)', type: 'number', required: false, placeholder: 'Contoh: 80', unit: 'mmHg', min: 30, max: 150 },
      { id: 'tv-nadi', text: 'Denyut nadi (bpm)', type: 'number', required: false, placeholder: 'Contoh: 80', unit: 'bpm', min: 30, max: 220 },
      { id: 'tv-spo2', text: 'Saturasi oksigen (%)', type: 'number', required: false, placeholder: 'Contoh: 98', unit: '%', min: 50, max: 100 },
      { id: 'tv-gds', text: 'Kadar gula darah sewaktu (mg/dL) — opsional', type: 'number', required: false, placeholder: 'Contoh: 120', unit: 'mg/dL', min: 20, max: 600 },
    ],
  },

  // ── 4. Skrining Penyakit Kronis ──────────────────────────────────────────
  {
    id: 'penyakit_kronis',
    name: 'Skrining Penyakit Kronis',
    icon: 'pill',
    description: 'Riwayat dan monitoring penyakit kronis pasien',
    estimatedMinutes: 4,
    isRequired: false,
    targetAudience: 'kronis',
    questions: [
      { id: 'pk-riwayat', text: 'Riwayat penyakit kronis (pilih yang sesuai)', type: 'checkbox', required: true, section: 'Riwayat Penyakit', options: [
        { label: 'Hipertensi', value: 'ht', score: 2 }, { label: 'Diabetes Mellitus', value: 'dm', score: 2 },
        { label: 'Penyakit Jantung', value: 'jantung', score: 3 }, { label: 'Stroke', value: 'stroke', score: 3 },
        { label: 'PPOK', value: 'ppok', score: 2 }, { label: 'Asma', value: 'asma', score: 1 },
        { label: 'Gagal Ginjal', value: 'gginjal', score: 3 }, { label: 'Kanker', value: 'kanker', score: 3 },
        { label: 'Tidak ada', value: 'tidak_ada', score: 0 },
      ]},
      { id: 'pk-lainnya', text: 'Penyakit lainnya (sebutkan)', type: 'text', required: false, placeholder: 'Tuliskan penyakit lainnya...' },
      { id: 'pk-kepatuhan', text: 'Kepatuhan minum obat', type: 'radio', required: true, section: 'Monitoring', options: [
        { label: 'Rutin sesuai anjuran', value: 0, score: 0 }, { label: 'Kadang lupa', value: 1, score: 1 },
        { label: 'Sering lupa/tidak minum', value: 2, score: 2 }, { label: 'Berhenti minum obat', value: 3, score: 3 },
      ]},
      { id: 'pk-keluhan', text: 'Keluhan terkait penyakit kronis saat ini', type: 'text', required: false, placeholder: 'Jelaskan keluhan saat ini...' },
      { id: 'pk-kontrol', text: 'Kontrol terakhir ke dokter', type: 'radio', required: true, options: [
        { label: '< 1 bulan', value: 0, score: 0 }, { label: '1–3 bulan', value: 1, score: 1 },
        { label: '3–6 bulan', value: 2, score: 2 }, { label: '> 6 bulan / tidak ingat', value: 3, score: 3 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 1, category: 'rendah', label: 'Tidak Ada / Terkontrol', recommendations: ['Lanjutkan pengobatan dan monitoring', 'Kontrol rutin sesuai jadwal'] },
        { min: 2, max: 5, category: 'sedang', label: 'Perlu Monitoring', recommendations: ['Evaluasi kepatuhan obat', 'Jadwalkan kontrol', 'Monitor gejala'] },
        { min: 6, max: 99, category: 'tinggi', label: 'Perlu Evaluasi Intensif', recommendations: ['Konsultasi dokter segera', 'Evaluasi ulang pengobatan', 'Pemeriksaan penunjang'] },
      ],
    },
  },

  // ── 5. Skrining Nyeri (NRS) ──────────────────────────────────────────────
  {
    id: 'nyeri',
    name: 'Skrining Nyeri (NRS)',
    icon: 'flame',
    description: 'Penilaian nyeri menggunakan Numeric Rating Scale',
    estimatedMinutes: 2,
    isRequired: false,
    targetAudience: 'all',
    questions: [
      { id: 'ny-skala', text: 'Skala nyeri (0 = tidak nyeri, 10 = nyeri terburuk)', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'ny-lokasi', text: 'Lokasi nyeri', type: 'text', required: true, placeholder: 'Contoh: punggung bawah, lutut kiri...' },
      { id: 'ny-karakter', text: 'Karakter nyeri', type: 'radio', required: true, options: [
        { label: 'Tajam/terbakar', value: 'tajam', score: 2 }, { label: 'Tumpul/pegal', value: 'tumpul', score: 1 },
        { label: 'Berdenyut', value: 'denyut', score: 2 }, { label: 'Tertusuk', value: 'tusuk', score: 2 },
        { label: 'Kejang/kram', value: 'kejang', score: 1 },
      ]},
      { id: 'ny-durasi', text: 'Durasi nyeri', type: 'radio', required: true, section: 'Durasi & Frekuensi', options: [
        { label: 'Hilang timbul (< 1 jam)', value: 0, score: 0 }, { label: 'Beberapa jam', value: 1, score: 1 },
        { label: 'Terus menerus', value: 2, score: 2 }, { label: 'Kronis (> 3 bulan)', value: 3, score: 3 },
      ]},
      { id: 'ny-frekuensi', text: 'Frekuensi nyeri', type: 'radio', required: true, options: [
        { label: 'Jarang (< 1x/minggu)', value: 0, score: 0 }, { label: 'Sering (beberapa x/minggu)', value: 1, score: 1 },
        { label: 'Harian', value: 2, score: 2 }, { label: 'Terus-menerus', value: 3, score: 3 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 3, category: 'rendah', label: 'Nyeri Ringan', recommendations: ['Obat OTC jika perlu', 'Istirahat', 'Kompres hangat/dingin'] },
        { min: 4, max: 7, category: 'sedang', label: 'Nyeri Sedang', recommendations: ['Konsultasi dokter', 'Analgesik sesuai resep', 'Modifikasi aktivitas'] },
        { min: 8, max: 99, category: 'tinggi', label: 'Nyeri Berat', recommendations: ['Evaluasi segera', 'Manajemen nyeri intensif', 'Pertimbangkan rujukan'] },
      ],
    },
  },

  // ── 6. Skrining Kesehatan Mental ─────────────────────────────────────────
  {
    id: 'kesehatan_mental',
    name: 'Skrining Kesehatan Mental',
    icon: 'brain',
    description: 'Skrining menggunakan instrumen PHQ-2 dan GAD-2, dengan rekomendasi PHQ-9/GAD-7 lanjutan',
    estimatedMinutes: 3,
    isRequired: false,
    targetAudience: 'all',
    questions: [
      { id: 'km-phq2a', text: 'Minat atau kesenangan dalam melakukan sesuatu berkurang?', type: 'radio', required: true, section: 'PHQ-2 (Depresi)', options: [
        { label: 'Tidak sama sekali (0)', value: 0, score: 0 }, { label: 'Beberapa hari (1)', value: 1, score: 1 },
        { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 }, { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
      ]},
      { id: 'km-phq2b', text: 'Merasa murung, depresi, atau putus asa?', type: 'radio', required: true, options: [
        { label: 'Tidak sama sekali (0)', value: 0, score: 0 }, { label: 'Beberapa hari (1)', value: 1, score: 1 },
        { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 }, { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
      ]},
      { id: 'km-gad2a', text: 'Merasa gugup, cemas, atau tegang?', type: 'radio', required: true, section: 'GAD-2 (Kecemasan)', options: [
        { label: 'Tidak sama sekali (0)', value: 0, score: 0 }, { label: 'Beberapa hari (1)', value: 1, score: 1 },
        { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 }, { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
      ]},
      { id: 'km-gad2b', text: 'Tidak dapat berhenti mengkhawatirkan sesuatu?', type: 'radio', required: true, options: [
        { label: 'Tidak sama sekali (0)', value: 0, score: 0 }, { label: 'Beberapa hari (1)', value: 1, score: 1 },
        { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 }, { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
      ]},
      { id: 'km-pikiran', text: 'Apakah Anda memiliki pikiran untuk menyakiti diri sendiri?', type: 'radio', required: true, section: 'Evaluasi Lanjutan', options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 10 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 2, category: 'rendah', label: 'Kesehatan Mental Baik', recommendations: ['Tidak memerlukan penanganan khusus', 'Pertahankan pola hidup sehat', 'Aktivitas relaksasi'] },
        { min: 3, max: 5, category: 'sedang', label: 'Perlu Evaluasi Lanjutan', recommendations: ['Disarankan skrining lengkap PHQ-9 dan GAD-7', 'Teknik relaksasi dan manajemen stres', 'Evaluasi ulang dalam 2 minggu'] },
        { min: 6, max: 99, category: 'tinggi', label: 'Perlu Intervensi Mental', recommendations: ['Skrining lengkap PHQ-9 dan GAD-7 segera', 'Konsultasi psikolog/psikiater', 'Dukungan krisis jika pikiran menyakiti diri', 'Monitoring ketat'] },
      ],
    },
    customOutput: (answers) => {
      const phq2 = (Number(answers['km-phq2a']) || 0) + (Number(answers['km-phq2b']) || 0);
      const gad2 = (Number(answers['km-gad2a']) || 0) + (Number(answers['km-gad2b']) || 0);
      const suicidal = Number(answers['km-pikiran']) === 1;
      let details = `PHQ-2 Score: ${phq2}/6`;
      if (phq2 >= 3) details += ' → Disarankan PHQ-9 lanjutan';
      details += ` | GAD-2 Score: ${gad2}/6`;
      if (gad2 >= 3) details += ' → Disarankan GAD-7 lanjutan';
      if (suicidal) details += ' | RISIKO BUNUH DIRI TERDETEKSI';
      return { label: 'Kesehatan Mental', value: phq2 >= 3 || gad2 >= 3 ? 'Perlu Evaluasi Lanjutan' : 'Dalam Batas Normal', details };
    },
  },

  // ── 7. Skrining Nutrisi ──────────────────────────────────────────────────
  {
    id: 'nutrisi',
    name: 'Skrining Nutrisi',
    icon: 'apple',
    description: 'Evaluasi status nutrisi dan risiko malnutrisi pasien',
    estimatedMinutes: 2,
    isRequired: false,
    targetAudience: 'all',
    questions: [
      { id: 'nu-penurunan', text: 'Penurunan berat badan dalam 6 bulan terakhir?', type: 'radio', required: true, options: [
        { label: 'Tidak ada penurunan', value: 0, score: 0 }, { label: 'Turun 1–3 kg', value: 1, score: 1 },
        { label: 'Turun 3–6 kg', value: 2, score: 2 }, { label: 'Turun > 6 kg', value: 3, score: 3 },
      ]},
      { id: 'nu-nafsumakan', text: 'Penurunan nafsu makan?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Sedikit berkurang', value: 1, score: 1 },
        { label: 'Berkuang cukup banyak', value: 2, score: 2 }, { label: 'Sangat berkurang/tidak ada', value: 3, score: 3 },
      ]},
      { id: 'nu-sulitmakan', text: 'Kesulitan makan (mengunyah, menelan)?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, sedikit', value: 1, score: 1 },
        { label: 'Ya, cukup sulit', value: 2, score: 2 },
      ]},
      { id: 'nu-mual', text: 'Mual atau muntah?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Kadang-kadang', value: 1, score: 1 },
        { label: 'Sering', value: 2, score: 2 },
      ]},
      { id: 'nu-menelan', text: 'Kesulitan menelan?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 2, category: 'rendah', label: 'Status Nutrisi Baik', recommendations: ['Pertahankan pola makan seimbang', 'Asupan cairan cukup'] },
        { min: 3, max: 5, category: 'sedang', label: 'Risiko Malnutrisi', recommendations: ['Evaluasi pola makan', 'Konsultasi gizi', 'Suplementasi jika perlu'] },
        { min: 6, max: 99, category: 'tinggi', label: 'Malnutrisi', recommendations: ['Intervensi gizi segera', 'Konsultasi ahli gizi', 'Evaluasi penyebab malnutrisi', 'Pertimbangkan suplemen nutrisi'] },
      ],
    },
  },

  // ── 8. Skrining Risiko Jatuh ─────────────────────────────────────────────
  {
    id: 'risiko_jatuh',
    name: 'Skrining Risiko Jatuh',
    icon: 'shield-alert',
    description: 'Penilaian risiko jatuh terutama untuk lansia',
    estimatedMinutes: 2,
    isRequired: false,
    targetAudience: 'lansia',
    questions: [
      { id: 'rj-jatuh', text: 'Pernah jatuh dalam 1 tahun terakhir?', type: 'radio', required: true, options: [
        { label: 'Tidak pernah', value: 0, score: 0 }, { label: 'Ya, 1 kali', value: 1, score: 2 },
        { label: 'Ya, 2 kali atau lebih', value: 2, score: 4 },
      ]},
      { id: 'rj-keseimbangan', text: 'Gangguan keseimbangan?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Kadang-kadang', value: 1, score: 2 },
        { label: 'Sering', value: 2, score: 3 },
      ]},
      { id: 'rj-alatbantu', text: 'Menggunakan alat bantu jalan?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 },
      ]},
      { id: 'rj-penglihatan', text: 'Gangguan penglihatan?', type: 'radio', required: true, options: [
        { label: 'Tidak / Terkoreksi dengan kacamata', value: 0, score: 0 }, { label: 'Ya, gangguan penglihatan', value: 1, score: 2 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 1, category: 'rendah', label: 'Risiko Jatuh Rendah', recommendations: ['Lanjutkan aktivitas fisik teratur', 'Pertahankan keseimbangan'] },
        { min: 2, max: 5, category: 'sedang', label: 'Risiko Jatuh Sedang', recommendations: ['Latihan keseimbangan', 'Evaluasi penglihatan', 'Modifikasi lingkungan rumah', 'Pertimbangkan alat bantu'] },
        { min: 6, max: 99, category: 'tinggi', label: 'Risiko Jatuh Tinggi', recommendations: ['Program pencegahan jatuh intensif', 'Evaluasi lingkungan rumah', 'Alat bantu jalan', 'Monitoring ketat', 'Pertimbangkan home care'] },
      ],
    },
  },

  // ── 9. Skrining Status Fungsional (ADL) ──────────────────────────────────
  {
    id: 'status_fungsional',
    name: 'Skrining Status Fungsional (ADL)',
    icon: 'accessibility',
    description: 'Penilaian kemampuan melakukan Activities of Daily Living',
    estimatedMinutes: 3,
    isRequired: false,
    targetAudience: 'lansia',
    questions: [
      { id: 'sf-makan', text: 'Kemampuan makan', type: 'radio', required: true, section: 'Activities of Daily Living', options: [
        { label: 'Mandiri', value: 0, score: 0 }, { label: 'Sebagian bergantung (perlu bantuan sebagian)', value: 1, score: 1 },
        { label: 'Bergantung total', value: 2, score: 2 },
      ]},
      { id: 'sf-berpindah', text: 'Kemampuan berpindah tempat (dari tempat tidur ke kursi)', type: 'radio', required: true, options: [
        { label: 'Mandiri', value: 0, score: 0 }, { label: 'Sebagian bergantung', value: 1, score: 1 },
        { label: 'Bergantung total', value: 2, score: 2 },
      ]},
      { id: 'sf-mandi', text: 'Kemampuan mandi', type: 'radio', required: true, options: [
        { label: 'Mandiri', value: 0, score: 0 }, { label: 'Sebagian bergantung', value: 1, score: 1 },
        { label: 'Bergantung total', value: 2, score: 2 },
      ]},
      { id: 'sf-berpakaian', text: 'Kemampuan berpakaian', type: 'radio', required: true, options: [
        { label: 'Mandiri', value: 0, score: 0 }, { label: 'Sebagian bergantung', value: 1, score: 1 },
        { label: 'Bergantung total', value: 2, score: 2 },
      ]},
      { id: 'sf-toileting', text: 'Kemampuan toileting', type: 'radio', required: true, options: [
        { label: 'Mandiri', value: 0, score: 0 }, { label: 'Sebagian bergantung', value: 1, score: 1 },
        { label: 'Bergantung total', value: 2, score: 2 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 0, category: 'rendah', label: 'Mandiri Penuh', recommendations: ['Pertahankan kemandirian', 'Aktivitas fisik teratur'] },
        { min: 1, max: 5, category: 'sedang', label: 'Sebagian Bergantung', recommendations: ['Bantuan sebagian untuk ADL', 'Program rehabilitasi', 'Pertimbangkan home care'] },
        { min: 6, max: 99, category: 'tinggi', label: 'Bergantung Total', recommendations: ['Perlu pengasuh penuh waktu', 'Home care atau rawat inap', 'Program rehabilitasi intensif'] },
      ],
    },
  },

  // ── 10. Skrining Home Care ───────────────────────────────────────────────
  {
    id: 'home_care',
    name: 'Skrining Kebutuhan Home Care',
    icon: 'home',
    description: 'Menilai kebutuhan pasien untuk kunjungan kesehatan di rumah',
    estimatedMinutes: 2,
    isRequired: false,
    targetAudience: 'all',
    questions: [
      { id: 'hc-sulitdatang', text: 'Sulit datang ke fasilitas kesehatan?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, sedikit kesulitan', value: 1, score: 1 },
        { label: 'Ya, sangat sulit/tidak bisa', value: 2, score: 3 },
      ]},
      { id: 'hc-tirahbaring', text: 'Tirah baring?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 3 },
      ]},
      { id: 'hc-pascastroke', text: 'Pasca stroke?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 },
      ]},
      { id: 'hc-lansiafrail', text: 'Lansia frail (rentan)?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 },
      ]},
      { id: 'hc-perawatanluka', text: 'Perlu perawatan luka di rumah?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 3 },
      ]},
      { id: 'hc-alatmedis', text: 'Menggunakan alat medis di rumah (oksigen, kateter, dll)?', type: 'radio', required: true, options: [
        { label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 1, category: 'rendah', label: 'Tidak Memerlukan Home Care', recommendations: ['Konsultasi di fasilitas kesehatan cukup', 'Telekonsultasi dapat dilanjutkan'] },
        { min: 2, max: 4, category: 'sedang', label: 'Direkomendasikan Home Care', recommendations: ['Pertimbangkan kunjungan home care', 'Evaluasi berkala di rumah', 'Koordinasi dengan perawat home care'] },
        { min: 5, max: 99, category: 'tinggi', label: 'Memerlukan Home Care Segera', recommendations: ['Jadwalkan kunjungan home care segera', 'Perawat home care intensif', 'Evaluasi kebutuhan rawat inap'] },
      ],
    },
  },

  // ── 11. Skrining Paliatif ────────────────────────────────────────────────
  {
    id: 'paliatif',
    name: 'Skrining Paliatif (ESAS & PPS)',
    icon: 'heart',
    description: 'Edmonton Symptom Assessment System dan Palliative Performance Scale',
    estimatedMinutes: 5,
    isRequired: false,
    targetAudience: 'paliatif',
    questions: [
      { id: 'pal-nyeri', text: 'Nyeri', type: 'scale', required: true, min: 0, max: 10, section: 'ESAS (Edmonton Symptom Assessment)' },
      { id: 'pal-sesak', text: 'Sesak napas', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-mual', text: 'Mual', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-kelelahan', text: 'Kelelahan', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-nafsumakan', text: 'Nafsu makan berkurang', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-kecemasan', text: 'Kecemasan', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-depresi', text: 'Depresi', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-kesejahteraan', text: 'Kesejahteraan umum', type: 'scale', required: true, min: 0, max: 10 },
      { id: 'pal-pps', text: 'Palliative Performance Scale (PPS)', type: 'radio', required: true, section: 'PPS (Palliative Performance Scale)', options: [
        { label: '100% — Ambulatory, fully active', value: 100, score: 0 },
        { label: '90% — Ambulatory, some effort', value: 90, score: 1 },
        { label: '80% — Ambulatory, some disease', value: 80, score: 2 },
        { label: '70% — Ambulatory, reduced capability', value: 70, score: 3 },
        { label: '60% — Requires occasional assistance', value: 60, score: 4 },
        { label: '50% — Requires considerable assistance', value: 50, score: 5 },
        { label: '40% — Mainly in bed/sitting', value: 40, score: 6 },
        { label: '30% — Bedbound, can talk', value: 30, score: 7 },
        { label: '20% — Bedbound, limited talking', value: 20, score: 8 },
        { label: '10% — Bedbound, minimal activity', value: 10, score: 9 },
      ]},
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 15, category: 'rendah', label: 'Tidak Memerlukan Perawatan Paliatif', recommendations: ['Perawatan standar', 'Monitoring gejala', 'Supportif'] },
        { min: 16, max: 35, category: 'sedang', label: 'Pertimbangkan Perawatan Paliatif', recommendations: ['Evaluasi kebutuhan paliatif', 'Manajemen gejala', 'Dukungan psikososial', 'Diskusi tujuan perawatan'] },
        { min: 36, max: 99, category: 'tinggi', label: 'Memerlukan Evaluasi Paliatif', recommendations: ['Rujuk tim paliatif', 'Manajemen gejala intensif', 'Perencanaan perawatan lanjutan', 'Dukungan keluarga', 'Pertimbangkan hospice'] },
      ],
    },
  },

  // ── 12. Upload Bukti Klinis ──────────────────────────────────────────────
  {
    id: 'bukti_klinis',
    name: 'Upload Bukti Klinis',
    icon: 'paperclip',
    description: 'Pasien dapat mengunggah foto luka, obat, hasil lab, hasil radiologi, video, dan dokumen medis',
    estimatedMinutes: 3,
    isRequired: false,
    targetAudience: 'all',
    questions: [
      { id: 'bk-fotoluka', text: 'Foto luka (jika ada)', type: 'file_upload', required: false, section: 'Foto & Video' },
      { id: 'bk-fotoobat', text: 'Foto obat yang sedang dikonsumsi', type: 'file_upload', required: false },
      { id: 'bk-fotolab', text: 'Foto hasil laboratorium', type: 'file_upload', required: false, section: 'Hasil Pemeriksaan' },
      { id: 'bk-fotoradio', text: 'Foto hasil radiologi', type: 'file_upload', required: false },
      { id: 'bk-videopernapasan', text: 'Video pernapasan (jika ada keluhan napas)', type: 'file_upload', required: false, section: 'Video' },
      { id: 'bk-videomobilisasi', text: 'Video mobilisasi (jika ada gangguan gerak)', type: 'file_upload', required: false },
      { id: 'bk-dokmedis', text: 'Dokumen medis pendukung lainnya', type: 'file_upload', required: false, section: 'Dokumen' },
    ],
  },
];

// ── Helper Functions ─────────────────────────────────────────────────────────

export function getModuleById(id: ScreeningModuleId): ScreeningModule | undefined {
  return SCREENING_MODULES.find(m => m.id === id);
}

export function getRequiredModules(): ScreeningModule[] {
  return SCREENING_MODULES.filter(m => m.isRequired);
}

export function getModulesForPatient(age?: number, hasChronic?: boolean): ScreeningModule[] {
  // Skrining Komprehensif Telemedicine: ALL modules are available
  // targetAudience is used for recommendation badges only, not for exclusion
  return [...SCREENING_MODULES];
}

export function getRequiredModulesForPatient(age?: number, hasChronic?: boolean): ScreeningModule[] {
  // Returns only the modules that are applicable based on patient profile
  // Used for progress calculation and mandatory field validation
  let modules = SCREENING_MODULES.filter(m => m.targetAudience === 'all');
  if (age !== undefined && age >= 60) {
    modules = [...modules, ...SCREENING_MODULES.filter(m => m.targetAudience === 'lansia')];
  }
  if (hasChronic) {
    modules = [...modules, ...SCREENING_MODULES.filter(m => m.targetAudience === 'kronis')];
  }
  // Always include paliatif modules as optional for comprehensive screening
  modules = [...modules, ...SCREENING_MODULES.filter(m => m.targetAudience === 'paliatif')];
  // Remove duplicates
  const seen = new Set<ScreeningModuleId>();
  return modules.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export function calculateModuleScore(
  module: ScreeningModule,
  answers: Record<string, string | number | string[]>
): { score: number; riskCategory: 'rendah' | 'sedang' | 'tinggi'; label: string; recommendations: string[] } {
  if (!module.scoringAlgorithm) {
    return { score: 0, riskCategory: 'rendah', label: 'Tidak ada scoring', recommendations: [] };
  }

  let score = 0;
  for (const q of module.questions) {
    const answer = answers[q.id];
    if (answer === undefined || answer === '') continue;

    if (q.type === 'checkbox' && Array.isArray(answer)) {
      for (const val of answer) {
        const opt = q.options?.find(o => String(o.value) === String(val));
        if (opt) score += opt.score;
      }
    } else if (q.type === 'radio' && q.options) {
      const opt = q.options.find(o => String(o.value) === String(answer));
      if (opt) score += opt.score;
    } else if (q.type === 'scale') {
      score += Number(answer) || 0;
    }
  }

  const range = module.scoringAlgorithm.ranges.find(r => score >= r.min && score <= r.max);
  return {
    score,
    riskCategory: range?.category || 'rendah',
    label: range?.label || 'Tidak terklasifikasi',
    recommendations: range?.recommendations || [],
  };
}

export function calculateProgress(
  modules: ScreeningModule[],
  moduleAnswers: Record<string, Record<string, string | number | string[]>>
): number {
  let totalRequired = 0;
  let filledRequired = 0;

  for (const mod of modules) {
    const requiredQuestions = mod.questions.filter(q => q.required);
    totalRequired += requiredQuestions.length;
    const answers = moduleAnswers[mod.id] || {};
    for (const q of requiredQuestions) {
      const answer = answers[q.id];
      if (answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
        filledRequired++;
      }
    }
  }

  return totalRequired === 0 ? 0 : Math.round((filledRequired / totalRequired) * 100);
}

// ── Triage Calculation ───────────────────────────────────────────────────────

export function calculateTriage(
  moduleScores: Record<string, { score: number; riskCategory: 'rendah' | 'sedang' | 'tinggi'; label: string; recommendations: string[] }>,
  moduleAnswers: Record<string, Record<string, string | number | string[]>>
): TriageResult {
  const now = new Date().toISOString();

  // Check for red flags first
  const redFlagAnswers = moduleAnswers['tanda_bahaya'] || {};
  const redFlagScore = moduleScores['tanda_bahaya']?.score || 0;

  // Any yes to critical red flags = MERAH
  const criticalFlags = ['tb-sesak', 'tb-nyeridada', 'tb-kesadaran', 'tb-kejang', 'tb-perdarahan', 'tb-kelemahan'];
  const hasCriticalFlag = criticalFlags.some(id => Number(redFlagAnswers[id]) === 1);

  if (hasCriticalFlag || redFlagScore >= 5) {
    return {
      level: 'merah',
      label: 'MERAH',
      description: 'Disarankan pemeriksaan langsung atau rujukan ke IGD',
      recommendation: 'Pasien menunjukkan tanda bahaya yang mengancam jiwa. Segera rujuk ke fasilitas kesehatan atau IGD.',
      calculatedAt: now,
    };
  }

  // Check for high-risk mental health (suicidal ideation)
  const mentalAnswers = moduleAnswers['kesehatan_mental'] || {};
  if (Number(mentalAnswers['km-pikiran']) === 1) {
    return {
      level: 'merah',
      label: 'MERAH',
      description: 'Risiko bunuh diri terdeteksi — rujuk segera',
      recommendation: 'Pasien melaporkan pikiran menyakiti diri sendiri. Segera lakukan intervensi krisis dan rujuk ke psikiater/IGD.',
      calculatedAt: now,
    };
  }

  // Check for orange criteria (home care needed, moderate red flags)
  const homeCareScore = moduleScores['home_care']?.riskCategory;
  const palliativeScore = moduleScores['paliatif']?.riskCategory;
  const functionalScore = moduleScores['status_fungsional']?.riskCategory;

  if (redFlagScore >= 1 || homeCareScore === 'tinggi' || palliativeScore === 'tinggi' || functionalScore === 'tinggi') {
    return {
      level: 'oranye',
      label: 'ORANYE',
      description: 'Direkomendasikan kunjungan home care',
      recommendation: 'Pasien memerlukan evaluasi lebih lanjut. Pertimbangkan kunjungan home care atau evaluasi di fasilitas kesehatan.',
      calculatedAt: now,
    };
  }

  // Check for yellow criteria (multiple moderate risks)
  const moderateRisks = Object.values(moduleScores).filter(s => s.riskCategory === 'sedang').length;
  const highRisks = Object.values(moduleScores).filter(s => s.riskCategory === 'tinggi').length;

  if (moderateRisks >= 2 || highRisks >= 1) {
    return {
      level: 'kuning',
      label: 'KUNING',
      description: 'Perlu evaluasi dokter dalam 24 jam',
      recommendation: 'Pasien memerlukan evaluasi dokter dalam 24 jam. Telekonsultasi dapat dilanjutkan dengan pengawasan ketat.',
      calculatedAt: now,
    };
  }

  if (moderateRisks >= 1) {
    return {
      level: 'kuning',
      label: 'KUNING',
      description: 'Perlu evaluasi dokter dalam 24 jam',
      recommendation: 'Pasien memiliki beberapa faktor risiko sedang. Evaluasi dokter diperlukan dalam 24 jam.',
      calculatedAt: now,
    };
  }

  // Green — safe for teleconsultation
  return {
    level: 'hijau',
    label: 'HIJAU',
    description: 'Aman untuk telekonsultasi',
    recommendation: 'Pasien aman untuk dilanjutkan melalui telekonsultasi. Tidak terdeteksi tanda bahaya atau risiko tinggi.',
    calculatedAt: now,
  };
}

// ── Clinical Summary Generation ──────────────────────────────────────────────

export function generateClinicalSummary(
  moduleAnswers: Record<string, Record<string, string | number | string[]>>,
  moduleScores: Record<string, { score: number; riskCategory: 'rendah' | 'sedang' | 'tinggi'; label: string; recommendations: string[] }>
): ClinicalSummary {
  const ku = moduleAnswers['keluhan_utama'] || {};
  const tv = moduleAnswers['tanda_vital'] || {};
  const pk = moduleAnswers['penyakit_kronis'] || {};
  const ny = moduleAnswers['nyeri'] || {};
  const km = moduleAnswers['kesehatan_mental'] || {};
  const sf = moduleAnswers['status_fungsional'] || {};
  const hc = moduleAnswers['home_care'] || {};
  const pal = moduleAnswers['paliatif'] || {};
  const tb = moduleAnswers['tanda_bahaya'] || {};

  // Chief complaint
  const chiefComplaint = String(ku['ku-keluhan'] || 'Tidak disebutkan');

  // Vital signs
  const vitalSigns: ClinicalSummary['vitalSigns'] = {
    weight: tv['tv-berat'] ? Number(tv['tv-berat']) : undefined,
    height: tv['tv-tinggi'] ? Number(tv['tv-tinggi']) : undefined,
    temperature: tv['tv-suhu'] ? Number(tv['tv-suhu']) : undefined,
    bloodPressure: tv['tv-sistolik'] && tv['tv-diastolik']
      ? `${tv['tv-sistolik']}/${tv['tv-diastolik']}` : undefined,
    heartRate: tv['tv-nadi'] ? Number(tv['tv-nadi']) : undefined,
    oxygenSat: tv['tv-spo2'] ? Number(tv['tv-spo2']) : undefined,
    bloodSugar: tv['tv-gds'] ? Number(tv['tv-gds']) : undefined,
  };

  // Chronic diseases
  const chronicList = (pk['pk-riwayat'] as string[]) || [];
  const chronicDiseases = chronicList.filter(v => v !== 'tidak_ada').map(v => {
    const map: Record<string, string> = { ht: 'Hipertensi', dm: 'Diabetes Mellitus', jantung: 'Penyakit Jantung', stroke: 'Stroke', ppok: 'PPOK', asma: 'Asma', gginjal: 'Gagal Ginjal', kanker: 'Kanker' };
    return map[v] || v;
  });

  // Risk factors
  const riskFactors: string[] = [];
  if (moduleScores['penyakit_kronis']?.riskCategory !== 'rendah' && chronicDiseases.length > 0) riskFactors.push('Penyakit Kronis');
  if (moduleScores['nutrisi']?.riskCategory !== 'rendah') riskFactors.push('Risiko Malnutrisi');
  if (moduleScores['risiko_jatuh']?.riskCategory !== 'rendah') riskFactors.push('Risiko Jatuh');
  if (moduleScores['kesehatan_mental']?.riskCategory !== 'rendah') riskFactors.push('Gangguan Mental');

  // Red flags
  const redFlags: string[] = [];
  const flagMap: Record<string, string> = { 'tb-sesak': 'Sesak Napas Berat', 'tb-nyeridada': 'Nyeri Dada', 'tb-kesadaran': 'Penurunan Kesadaran', 'tb-kejang': 'Kejang', 'tb-perdarahan': 'Perdarahan Aktif', 'tb-kelemahan': 'Kelemahan Mendadak', 'tb-demam': 'Demam Tinggi', 'tb-dehidrasi': 'Dehidrasi Berat', 'tb-tidakmakan': 'Tidak Mampu Makan/Minum' };
  for (const [key, label] of Object.entries(flagMap)) {
    if (Number(tb[key]) === 1) redFlags.push(label);
  }

  // Pain score
  const painScore = ny['ny-skala'] !== undefined ? Number(ny['ny-skala']) : null;

  // Mental status
  const mentalPhq2 = (Number(km['km-phq2a']) || 0) + (Number(km['km-phq2b']) || 0);
  const mentalGad2 = (Number(km['km-gad2a']) || 0) + (Number(km['km-gad2b']) || 0);
  let mentalStatus = 'Normal';
  if (mentalPhq2 >= 3 || mentalGad2 >= 3) mentalStatus = 'Perlu Evaluasi Lanjutan';
  if (Number(km['km-pikiran']) === 1) mentalStatus = 'KRISIS MENTAL';

  // Functional status
  const adlScore = moduleScores['status_fungsional']?.score || 0;
  let functionalStatus = 'Mandiri';
  if (adlScore >= 1 && adlScore <= 5) functionalStatus = 'Sebagian Bergantung';
  if (adlScore >= 6) functionalStatus = 'Bergantung Total';

  // Home care need
  const homeCareRisk = moduleScores['home_care']?.riskCategory || 'rendah';
  let homeCareNeed = 'Tidak diperlukan';
  if (homeCareRisk === 'sedang') homeCareNeed = 'Direkomendasikan';
  if (homeCareRisk === 'tinggi') homeCareNeed = 'Diperlukan Segera';

  // Palliative status
  const palliativeRisk = moduleScores['paliatif']?.riskCategory || 'rendah';
  let palliativeStatus = 'Tidak diperlukan';
  if (palliativeRisk === 'sedang') palliativeStatus = 'Pertimbangkan';
  if (palliativeRisk === 'tinggi') palliativeStatus = 'Diperlukan Evaluasi';

  return {
    chiefComplaint,
    riskFactors,
    chronicDiseases,
    painScore,
    mentalStatus,
    functionalStatus,
    homeCareNeed,
    palliativeStatus,
    redFlags,
    vitalSigns,
  };
}

// ── Triage Colors for UI ─────────────────────────────────────────────────────

export const TRIAGE_COLORS: Record<TriageLevel, { bg: string; text: string; border: string; ring: string }> = {
  hijau: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-500' },
  kuning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', ring: 'ring-yellow-500' },
  oranye: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', ring: 'ring-orange-500' },
  merah: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-500' },
};

export const TRIAGE_LABELS: Record<TriageLevel, { label: string; description: string }> = {
  hijau: { label: 'HIJAU — Aman Telekonsultasi', description: 'Aman untuk telekonsultasi' },
  kuning: { label: 'KUNING — Evaluasi 24 Jam', description: 'Perlu evaluasi dokter dalam 24 jam' },
  oranye: { label: 'ORANYE — Home Care', description: 'Direkomendasikan kunjungan home care' },
  merah: { label: 'MERAH — Rujukan IGD', description: 'Disarankan pemeriksaan langsung atau rujukan ke IGD' },
};
