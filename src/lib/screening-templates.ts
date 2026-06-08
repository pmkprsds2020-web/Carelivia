import type { ScreeningTemplate, ScreeningCategory, ScreeningForm, RiskCategory } from './types';

// ── Category Labels ─────────────────────────────────────────────────────────

export const SCREENING_CATEGORY_LABELS: Record<ScreeningCategory, string> = {
  bayi: 'Bayi (0–11 bulan)',
  balita: 'Balita (1–5 tahun)',
  anak_sekolah: 'Anak Sekolah (6–12 tahun)',
  remaja: 'Remaja (13–18 tahun)',
  dewasa: 'Dewasa (19–59 tahun)',
  lansia: 'Lansia (≥60 tahun)',
  ibu_hamil: 'Ibu Hamil',
  nifas: 'Nifas',
  penyakit_kronis: 'Penyakit Kronis',
  kesehatan_jiwa: 'Kesehatan Jiwa',
  haji_umroh: 'Haji dan Umroh',
  gaya_hidup: 'Skrining Gaya Hidup',
  ptm: 'Skrining Risiko PTM',
};

export const SCREENING_CATEGORY_ICONS: Record<ScreeningCategory, string> = {
  bayi: '👶',
  balita: '🧒',
  anak_sekolah: '📚',
  remaja: '🧑',
  dewasa: '👤',
  lansia: '🧓',
  ibu_hamil: '🤰',
  nifas: '🤱',
  penyakit_kronis: '🏥',
  kesehatan_jiwa: '🧠',
  haji_umroh: '🕋',
  gaya_hidup: '🏃',
  ptm: '⚕️',
};

// ── Templates ───────────────────────────────────────────────────────────────

export const SCREENING_TEMPLATES: ScreeningTemplate[] = [
  // ── FINDRISC Diabetes Risk Score ──────────────────────────────────────────
  {
    id: 'tmpl-findrisc',
    name: 'Skrining Risiko Diabetes (FINDRISC)',
    category: 'ptm',
    standard: 'FINDRISC',
    description: 'Kuesioner FINDRISC untuk menilai risiko terkena diabetes tipe 2 dalam 10 tahun ke depan.',
    estimatedMinutes: 5,
    questions: [
      {
        id: 'findrisc-age',
        text: 'Berapa usia Anda?',
        type: 'radio',
        options: [
          { label: '< 45 tahun', value: 0, score: 0 },
          { label: '45–54 tahun', value: 1, score: 2 },
          { label: '55–64 tahun', value: 2, score: 3 },
          { label: '> 64 tahun', value: 3, score: 4 },
        ],
        required: true,
        section: 'Data Dasar',
      },
      {
        id: 'findrisc-bmi',
        text: 'Berapa Indeks Massa Tubuh (BMI) Anda?',
        type: 'radio',
        options: [
          { label: '< 25 kg/m² (Normal)', value: 0, score: 0 },
          { label: '25–30 kg/m² (Kelebihan berat badan)', value: 1, score: 1 },
          { label: '> 30 kg/m² (Obesitas)', value: 2, score: 3 },
        ],
        required: true,
        section: 'Data Dasar',
      },
      {
        id: 'findrisc-waist',
        text: 'Berapa lingkar pinggang Anda?',
        type: 'radio',
        options: [
          { label: 'Pria < 94 cm / Wanita < 80 cm', value: 0, score: 0 },
          { label: 'Pria 94–102 cm / Wanita 80–88 cm', value: 1, score: 3 },
          { label: 'Pria > 102 cm / Wanita > 88 cm', value: 2, score: 4 },
        ],
        required: true,
        section: 'Data Dasar',
      },
      {
        id: 'findrisc-activity',
        text: 'Apakah Anda melakukan aktivitas fisik minimal 30 menit/hari?',
        type: 'radio',
        options: [
          { label: 'Ya', value: 0, score: 0 },
          { label: 'Tidak', value: 1, score: 2 },
        ],
        required: true,
        section: 'Gaya Hidup',
      },
      {
        id: 'findrisc-diet',
        text: 'Apakah Anda mengonsumsi buah dan sayur setiap hari?',
        type: 'radio',
        options: [
          { label: 'Ya, setiap hari', value: 0, score: 0 },
          { label: 'Tidak setiap hari', value: 1, score: 1 },
        ],
        required: true,
        section: 'Gaya Hidup',
      },
      {
        id: 'findrisc-bp',
        text: 'Apakah Anda pernah diketahui memiliki tekanan darah tinggi?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Ya', value: 1, score: 2 },
        ],
        required: true,
        section: 'Riwayat Kesehatan',
      },
      {
        id: 'findrisc-glucose',
        text: 'Apakah Anda pernah ditemukan kadar glukosa darah tinggi?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Ya', value: 1, score: 5 },
        ],
        required: true,
        section: 'Riwayat Kesehatan',
      },
      {
        id: 'findrisc-family',
        text: 'Apakah ada anggota keluarga Anda yang menderita diabetes?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Ya (keluarga dekat: orang tua, saudara)', value: 1, score: 5 },
          { label: 'Ya (keluarga jauh: kakek/nenek, paman/bibi)', value: 2, score: 3 },
        ],
        required: true,
        section: 'Riwayat Keluarga',
      },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 7, category: 'rendah', label: 'Risiko Rendah', recommendations: ['Pertahankan gaya hidup sehat', 'Pemeriksaan gula darah rutin setiap 3 tahun', 'Jaga berat badan ideal'] },
        { min: 8, max: 14, category: 'sedang', label: 'Risiko Sedang', recommendations: ['Lakukan pemeriksaan gula darah', 'Tingkatkan aktivitas fisik', 'Perbaiki pola makan', 'Konsultasi dengan dokter'] },
        { min: 15, max: 99, category: 'tinggi', label: 'Risiko Tinggi', recommendations: ['Pemeriksaan Gula Darah Puasa segera', 'Pemeriksaan HbA1c', 'Konsultasi dokter segera', 'Modifikasi gaya hidup intensif', 'Program pengelolaan berat badan'] },
      ],
    },
  },

  // ── PHQ-9 Depression Screening ───────────────────────────────────────────
  {
    id: 'tmpl-phq9',
    name: 'Skrining Depresi (PHQ-9)',
    category: 'kesehatan_jiwa',
    standard: 'PHQ-9',
    description: 'Patient Health Questionnaire-9 untuk skrining dan menilai tingkat depresi.',
    estimatedMinutes: 5,
    questions: [
      {
        id: 'phq9-1',
        text: 'Minat atau kesenangan dalam melakukan sesuatu',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
        section: 'Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh:',
      },
      {
        id: 'phq9-2',
        text: 'Merasa murung, depresi, atau putus asa',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
        section: 'Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh:',
      },
      {
        id: 'phq9-3',
        text: 'Sulit tidur atau terlalu banyak tidur',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'phq9-4',
        text: 'Merasa lelah atau kurang energi',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'phq9-5',
        text: 'Nafsu makan berkurang atau berlebihan',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'phq9-6',
        text: 'Merasa gagal atau mengecewakan diri sendiri atau keluarga',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'phq9-7',
        text: 'Sulit berkonsentrasi pada sesuatu',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'phq9-8',
        text: 'Bergerak sangat lambat atau terlalu gelisah',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'phq9-9',
        text: 'Pikiran untuk menyakiti diri sendiri',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 4, category: 'rendah', label: 'Minimal/Tidak Depresi', recommendations: ['Tidak memerlukan penanganan khusus', 'Pertahankan kesehatan mental', 'Lakukan aktivitas yang menyenangkan'] },
        { min: 5, max: 9, category: 'rendah', label: 'Depresi Ringan', recommendations: ['Pengamatan dan evaluasi ulang', 'Psikoedukasi', 'Terapi aktivitas', 'Evaluasi ulang dalam 1 bulan'] },
        { min: 10, max: 14, category: 'sedang', label: 'Depresi Sedang', recommendations: ['Konsultasi dengan psikolog/psikiater', 'Pertimbangkan terapi kognitif perilaku', 'Evaluasi ulang dalam 2 minggu'] },
        { min: 15, max: 19, category: 'tinggi', label: 'Depresi Moderat Berat', recommendations: ['Rujuk ke psikiater', 'Pertimbangkan farmakoterapi', 'Terapi kognitif perilaku', 'Monitoring ketat'] },
        { min: 20, max: 99, category: 'tinggi', label: 'Depresi Berat', recommendations: ['Rujuk segera ke psikiater', 'Farmakoterapi diperlukan', 'Monitoring intensif', 'Evaluasi risiko bunuh diri'] },
      ],
    },
  },

  // ── GAD-7 Anxiety Screening ──────────────────────────────────────────────
  {
    id: 'tmpl-gad7',
    name: 'Skrining Kecemasan (GAD-7)',
    category: 'kesehatan_jiwa',
    standard: 'GAD-7',
    description: 'Generalized Anxiety Disorder 7-item untuk skrining gangguan kecemasan umum.',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'gad7-1',
        text: 'Merasa gugup, cemas, atau tegang',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
        section: 'Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh:',
      },
      {
        id: 'gad7-2',
        text: 'Tidak dapat berhenti mengkhawatirkan sesuatu',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'gad7-3',
        text: 'Mengkhawatirkan banyak hal',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'gad7-4',
        text: 'Sulit untuk rileks',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'gad7-5',
        text: 'Sangat gelisah sehingga sulit diam',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'gad7-6',
        text: 'Mudah tersinggung atau jengkel',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
      {
        id: 'gad7-7',
        text: 'Merasa takut seolah-olah sesuatu yang mengerikan akan terjadi',
        type: 'radio',
        options: [
          { label: 'Tidak sama sekali (0)', value: 0, score: 0 },
          { label: 'Beberapa hari (1)', value: 1, score: 1 },
          { label: 'Lebih dari setengah hari (2)', value: 2, score: 2 },
          { label: 'Hampir setiap hari (3)', value: 3, score: 3 },
        ],
        required: true,
      },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 4, category: 'rendah', label: 'Kecemasan Minimal', recommendations: ['Tidak memerlukan penanganan khusus', 'Teknik relaksasi sederhana'] },
        { min: 5, max: 9, category: 'rendah', label: 'Kecemasan Ringan', recommendations: ['Teknik relaksasi', 'Latihan pernapasan', 'Evaluasi ulang dalam 1 bulan'] },
        { min: 10, max: 14, category: 'sedang', label: 'Kecemasan Sedang', recommendations: ['Konsultasi psikolog', 'Terapi kognitif perilaku', 'Evaluasi ulang dalam 2 minggu'] },
        { min: 15, max: 99, category: 'tinggi', label: 'Kecemasan Berat', recommendations: ['Rujuk ke psikiater', 'Pertimbangkan farmakoterapi', 'Monitoring ketat', 'Terapi kognitif perilaku'] },
      ],
    },
  },

  // ── Skrining Risiko Hipertensi ────────────────────────────────────────────
  {
    id: 'tmpl-hipertensi',
    name: 'Skrining Risiko Hipertensi',
    category: 'ptm',
    standard: 'Skrining PTM Kemenkes RI',
    description: 'Skrining risiko hipertensi berdasarkan pedoman PTM Kementerian Kesehatan RI.',
    estimatedMinutes: 5,
    questions: [
      {
        id: 'ht-age',
        text: 'Berapa usia Anda?',
        type: 'radio',
        options: [
          { label: '< 40 tahun', value: 0, score: 0 },
          { label: '40–59 tahun', value: 1, score: 1 },
          { label: '≥ 60 tahun', value: 2, score: 2 },
        ],
        required: true,
        section: 'Data Dasar',
      },
      {
        id: 'ht-bp-systolic',
        text: 'Tekanan darah sistolik terakhir (mmHg)?',
        type: 'radio',
        options: [
          { label: '< 120 mmHg', value: 0, score: 0 },
          { label: '120–139 mmHg', value: 1, score: 2 },
          { label: '≥ 140 mmHg', value: 2, score: 4 },
          { label: 'Tidak tahu', value: 3, score: 1 },
        ],
        required: true,
        section: 'Pemeriksaan Fisik',
      },
      {
        id: 'ht-bmi',
        text: 'Berapa BMI Anda?',
        type: 'radio',
        options: [
          { label: '< 23 kg/m² (Normal)', value: 0, score: 0 },
          { label: '23–27.5 kg/m² (Overweight)', value: 1, score: 2 },
          { label: '> 27.5 kg/m² (Obesitas)', value: 2, score: 3 },
        ],
        required: true,
        section: 'Pemeriksaan Fisik',
      },
      {
        id: 'ht-salt',
        text: 'Apakah Anda sering mengonsumsi makanan tinggi garam?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Kadang-kadang', value: 1, score: 1 },
          { label: 'Sering', value: 2, score: 2 },
        ],
        required: true,
        section: 'Gaya Hidup',
      },
      {
        id: 'ht-alcohol',
        text: 'Apakah Anda mengonsumsi alkohol?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Kadang-kadang', value: 1, score: 1 },
          { label: 'Sering', value: 2, score: 2 },
        ],
        required: true,
        section: 'Gaya Hidup',
      },
      {
        id: 'ht-exercise',
        text: 'Apakah Anda berolahraga secara teratur (min 150 menit/minggu)?',
        type: 'radio',
        options: [
          { label: 'Ya', value: 0, score: 0 },
          { label: 'Tidak', value: 1, score: 2 },
        ],
        required: true,
        section: 'Gaya Hidup',
      },
      {
        id: 'ht-family',
        text: 'Apakah ada riwayat hipertensi di keluarga?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Ya', value: 1, score: 2 },
        ],
        required: true,
        section: 'Riwayat Keluarga',
      },
      {
        id: 'ht-stress',
        text: 'Apakah Anda sering mengalami stres?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Kadang-kadang', value: 1, score: 1 },
          { label: 'Sering', value: 2, score: 2 },
        ],
        required: true,
        section: 'Psikologis',
      },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 5, category: 'rendah', label: 'Risiko Rendah', recommendations: ['Pertahankan gaya hidup sehat', 'Pemeriksaan tekanan darah rutin', 'Kurangi asupan garam'] },
        { min: 6, max: 11, category: 'sedang', label: 'Risiko Sedang', recommendations: ['Monitoring tekanan darah berkala', 'Modifikasi gaya hidup', 'Kurangi garam dan lemak', 'Olahraga teratur', 'Konsultasi dokter'] },
        { min: 12, max: 99, category: 'tinggi', label: 'Risiko Tinggi', recommendations: ['Pemeriksaan tekanan darah segera', 'Konsultasi dokter', 'Modifikasi gaya hidup intensif', 'Pertimbangkan pengobatan', 'Monitoring rutin'] },
      ],
    },
  },

  // ── Skrining Stunting (Balita) ────────────────────────────────────────────
  {
    id: 'tmpl-stunting',
    name: 'Skrining Stunting (Balita)',
    category: 'balita',
    standard: 'Skrining Stunting Kemenkes',
    description: 'Skrining risiko stunting pada anak usia 1–5 tahun berdasarkan pedoman Kemenkes.',
    estimatedMinutes: 8,
    questions: [
      {
        id: 'stunt-age',
        text: 'Berapa usia anak?',
        type: 'radio',
        options: [
          { label: '12–23 bulan', value: 0, score: 1 },
          { label: '24–35 bulan', value: 1, score: 1 },
          { label: '36–47 bulan', value: 2, score: 0 },
          { label: '48–59 bulan', value: 3, score: 0 },
        ],
        required: true,
        section: 'Data Anak',
      },
      {
        id: 'stunt-bb',
        text: 'Apakah berat badan anak sesuai usia (menurut KMS)?',
        type: 'radio',
        options: [
          { label: 'Ya, naik sesuai garis', value: 0, score: 0 },
          { label: 'Naik tetapi tidak sesuai garis', value: 1, score: 1 },
          { label: 'Tidak naik / turun', value: 2, score: 3 },
        ],
        required: true,
        section: 'Data Anak',
      },
      {
        id: 'stunt-tb',
        text: 'Apakah tinggi/panjang badan anak sesuai usia?',
        type: 'radio',
        options: [
          { label: 'Ya, normal', value: 0, score: 0 },
          { label: 'Pendek (di bawah -2 SD)', value: 1, score: 3 },
          { label: 'Sangat pendek (di bawah -3 SD)', value: 2, score: 5 },
        ],
        required: true,
        section: 'Data Anak',
      },
      {
        id: 'stunt-asi',
        text: 'Apakah anak mendapat ASI eksklusif 0–6 bulan?',
        type: 'radio',
        options: [
          { label: 'Ya', value: 0, score: 0 },
          { label: 'Tidak', value: 1, score: 2 },
        ],
        required: true,
        section: 'Riwayat Nutrisi',
      },
      {
        id: 'stunt-mpasi',
        text: 'Apakah MPASI diberikan tepat waktu (usia 6 bulan)?',
        type: 'radio',
        options: [
          { label: 'Ya, tepat waktu dan adekuat', value: 0, score: 0 },
          { label: 'Terlalu dini (< 6 bulan)', value: 1, score: 2 },
          { label: 'Terlambat (> 6 bulan)', value: 2, score: 2 },
          { label: 'Tidak adekuat', value: 3, score: 3 },
        ],
        required: true,
        section: 'Riwayat Nutrisi',
      },
      {
        id: 'stunt-immunization',
        text: 'Apakah imunisasi anak lengkap sesuai jadwal?',
        type: 'radio',
        options: [
          { label: 'Ya, lengkap', value: 0, score: 0 },
          { label: 'Tidak lengkap', value: 1, score: 2 },
        ],
        required: true,
        section: 'Riwayat Kesehatan',
      },
      {
        id: 'stunt-infection',
        text: 'Apakah anak sering mengalami diare atau ISPA?',
        type: 'radio',
        options: [
          { label: 'Tidak', value: 0, score: 0 },
          { label: 'Kadang (1–3 kali/6 bulan)', value: 1, score: 1 },
          { label: 'Sering (> 3 kali/6 bulan)', value: 2, score: 3 },
        ],
        required: true,
        section: 'Riwayat Kesehatan',
      },
      {
        id: 'stunt-sanitation',
        text: 'Bagaimana akses keluarga terhadap air bersih dan sanitasi?',
        type: 'radio',
        options: [
          { label: 'Baik (air bersih & jamban layak)', value: 0, score: 0 },
          { label: 'Cukup', value: 1, score: 1 },
          { label: 'Buruk', value: 2, score: 3 },
        ],
        required: true,
        section: 'Lingkungan',
      },
      {
        id: 'stunt-education',
        text: 'Berapa tingkat pendidikan ibu?',
        type: 'radio',
        options: [
          { label: 'Akademi/Universitas', value: 0, score: 0 },
          { label: 'SMA/sederajat', value: 1, score: 1 },
          { label: 'SMP/sederajat', value: 2, score: 2 },
          { label: 'SD atau tidak sekolah', value: 3, score: 3 },
        ],
        required: true,
        section: 'Sosial Ekonomi',
      },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 5, category: 'rendah', label: 'Risiko Rendah Stunting', recommendations: ['Pertahankan pola asuh yang baik', 'Monitoring tumbuh kembang rutin', 'Berikan nutrisi seimbang'] },
        { min: 6, max: 12, category: 'sedang', label: 'Risiko Sedang Stunting', recommendations: ['Konsultasi gizi', 'Perbaiki pola makan anak', 'Pastikan ASI/MPASI adekuat', 'Peningkatan sanitasi', 'Monitoring tumbuh kembang bulanan'] },
        { min: 13, max: 99, category: 'tinggi', label: 'Risiko Tinggi Stunting', recommendations: ['Rujuk ke gizi klinik', 'Intervensi gizi intensif', 'Pemeriksaan kesehatan menyeluruh', 'Pendampingan pola asuh', 'Perbaikan sanitasi dan akses air bersih'] },
      ],
    },
  },

  // ── Skrining Lansia (GDS-15) ─────────────────────────────────────────────
  {
    id: 'tmpl-gds15',
    name: 'Skrining Depresi Lansia (GDS-15)',
    category: 'lansia',
    standard: 'GDS (Geriatric Depression Scale)',
    description: 'Geriatric Depression Scale 15-item untuk skrining depresi pada lansia.',
    estimatedMinutes: 7,
    questions: [
      { id: 'gds1', text: 'Apakah Anda pada dasarnya puas dengan hidup Anda?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 1 }], required: true },
      { id: 'gds2', text: 'Apakah Anda telah mengurangi banyak kegiatan dan minat Anda?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds3', text: 'Apakah Anda merasa hidup Anda kosong?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds4', text: 'Apakah Anda sering merasa bosan?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds5', text: 'Apakah Anda merasa semangat sepanjang hari?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 1 }], required: true },
      { id: 'gds6', text: 'Apakah Anda khawatir ada yang buruk akan terjadi pada Anda?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds7', text: 'Apakah Anda merasa senang sebagian besar waktu?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 1 }], required: true },
      { id: 'gds8', text: 'Apakah Anda sering merasa tidak berdaya?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds9', text: 'Apakah Anda lebih suka tinggal di rumah daripada keluar?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds10', text: 'Apakah Anda merasa lebih banyak masalah ingatan daripada kebanyakan orang?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds11', text: 'Apakah Anda pikiran lebih baik hidup sekarang daripada waktu muda?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 1 }], required: true },
      { id: 'gds12', text: 'Apakah Anda merasa sangat tidak berguna sekarang?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds13', text: 'Apakah Anda merasa sangat bersemangat?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 1 }], required: true },
      { id: 'gds14', text: 'Apakah Anda merasa situasi Anda tanpa harapan?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
      { id: 'gds15', text: 'Apakah Anda berpikir kebanyakan orang lebih baik daripada Anda?', type: 'radio', options: [{ label: 'Ya', value: 1, score: 1 }, { label: 'Tidak', value: 0, score: 0 }], required: true },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 4, category: 'rendah', label: 'Depresi Normal', recommendations: ['Pertahankan aktivitas sosial', 'Olahraga ringan teratur', 'Hobi dan kegiatan menyenangkan'] },
        { min: 5, max: 9, category: 'sedang', label: 'Depresi Ringan-Sedang', recommendations: ['Konsultasi dengan dokter', 'Tingkatkan aktivitas sosial', 'Terapi aktivitas', 'Evaluasi ulang dalam 1 bulan'] },
        { min: 10, max: 99, category: 'tinggi', label: 'Depresi Berat', recommendations: ['Rujuk ke psikiater/gériatri', 'Evaluasi lengkap', 'Pertimbangkan farmakoterapi', 'Monitoring ketat', 'Dukungan keluarga'] },
      ],
    },
  },

  // ── Skrining Ibu Hamil (ANC Terpadu) ──────────────────────────────────────
  {
    id: 'tmpl-anc',
    name: 'Skrining Kehamilan (ANC Terpadu)',
    category: 'ibu_hamil',
    standard: 'ANC Terpadu',
    description: 'Skrining kehamilan berdasarkan standar ANC Terpadu untuk mendeteksi risiko kehamilan.',
    estimatedMinutes: 10,
    questions: [
      { id: 'anc-age', text: 'Berapa usia ibu saat ini?', type: 'radio', options: [{ label: '20–35 tahun', value: 0, score: 0 }, { label: '< 20 tahun', value: 1, score: 2 }, { label: '> 35 tahun', value: 2, score: 2 }], required: true, section: 'Data Ibu' },
      { id: 'anc-gestational', text: 'Berapa usia kehamilan saat ini?', type: 'radio', options: [{ label: 'Trimester 1 (0–12 minggu)', value: 0, score: 0 }, { label: 'Trimester 2 (13–27 minggu)', value: 1, score: 0 }, { label: 'Trimester 3 (28–40 minggu)', value: 2, score: 1 }], required: true, section: 'Data Kehamilan' },
      { id: 'anc-gravida', text: 'Berapa kali ibu hamil (termasuk kehamilan ini)?', type: 'radio', options: [{ label: '1 (primigravida)', value: 0, score: 1 }, { label: '2–3', value: 1, score: 0 }, { label: '≥ 4 (multigravida)', value: 2, score: 2 }], required: true, section: 'Data Kehamilan' },
      { id: 'anc-abortion', text: 'Apakah pernah mengalami keguguran?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, 1 kali', value: 1, score: 1 }, { label: 'Ya, ≥ 2 kali', value: 2, score: 3 }], required: true, section: 'Riwayat Obstetri' },
      { id: 'anc-cesarean', text: 'Apakah pernah melahirkan dengan seksio sesarea?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, 1 kali', value: 1, score: 2 }, { label: 'Ya, ≥ 2 kali', value: 2, score: 3 }], required: true, section: 'Riwayat Obstetri' },
      { id: 'anc-bleeding', text: 'Apakah mengalami perdarahan pada kehamilan ini?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 4 }], required: true, section: 'Keluhan Saat Ini' },
      { id: 'anc-headache', text: 'Apakah mengalami sakit kepala berat atau penglihatan kabur?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 3 }], required: true, section: 'Keluhan Saat Ini' },
      { id: 'anc-swelling', text: 'Apakah mengalami pembengkakan pada wajah atau tangan?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 3 }], required: true, section: 'Keluhan Saat Ini' },
      { id: 'anc-chronic', text: 'Apakah ibu memiliki penyakit kronis (DM, hipertensi, HIV, dll)?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 3 }], required: true, section: 'Riwayat Penyakit' },
      { id: 'anc-iron', text: 'Apakah ibu mengonsumsi tablet tambah darah (TTD)?', type: 'radio', options: [{ label: 'Ya, rutin', value: 0, score: 0 }, { label: 'Kadang-kadang', value: 1, score: 1 }, { label: 'Tidak', value: 2, score: 2 }], required: true, section: 'Nutrisi & Suplemen' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 4, category: 'rendah', label: 'Risiko Rendah', recommendations: ['ANC rutin sesuai jadwal', 'Konsumsi TTD dan vitamin prenatal', 'Gizi seimbang', 'Olahraga ringan'] },
        { min: 5, max: 10, category: 'sedang', label: 'Risiko Sedang', recommendations: ['Frekuensi ANC lebih sering', 'Pemeriksaan laboratorium lengkap', 'Monitoring tekanan darah', 'Konsultasi gizi', 'USG sesuai jadwal'] },
        { min: 11, max: 99, category: 'tinggi', label: 'Risiko Tinggi', recommendations: ['Rujuk ke rumah sakit', 'ANC setiap 2 minggu', 'Monitoring ketat', 'Persiapan persalinan di fasilitas kesehatan', 'Pemeriksaan lengkap segera'] },
      ],
    },
  },

  // ── Skrining Gaya Hidup ───────────────────────────────────────────────────
  {
    id: 'tmpl-lifestyle',
    name: 'Skrining Gaya Hidup',
    category: 'gaya_hidup',
    standard: 'WHO STEPS',
    description: 'Skrining gaya hidup berdasarkan pendekatan WHO STEPS untuk menilai faktor risiko PTM.',
    estimatedMinutes: 8,
    questions: [
      { id: 'ls-smoke', text: 'Status merokok Anda?', type: 'radio', options: [{ label: 'Tidak pernah merokok', value: 0, score: 0 }, { label: 'Mantan perokok', value: 1, score: 1 }, { label: 'Perokok aktif', value: 2, score: 3 }], required: true, section: 'Kebiasaan' },
      { id: 'ls-alcohol', text: 'Konsumsi alkohol?', type: 'radio', options: [{ label: 'Tidak pernah', value: 0, score: 0 }, { label: 'Kadang-kadang', value: 1, score: 1 }, { label: 'Sering', value: 2, score: 2 }], required: true, section: 'Kebiasaan' },
      { id: 'ls-exercise', text: 'Aktivitas fisik per minggu?', type: 'radio', options: [{ label: '≥ 150 menit (Aktif)', value: 0, score: 0 }, { label: '60–149 menit (Kurang aktif)', value: 1, score: 1 }, { label: '< 60 menit (Tidak aktif)', value: 2, score: 3 }], required: true, section: 'Aktivitas Fisik' },
      { id: 'ls-diet-fruit', text: 'Berapa porsi buah dan sayur per hari?', type: 'radio', options: [{ label: '≥ 5 porsi/hari', value: 0, score: 0 }, { label: '3–4 porsi/hari', value: 1, score: 1 }, { label: '< 3 porsi/hari', value: 2, score: 2 }], required: true, section: 'Pola Makan' },
      { id: 'ls-sugar', text: 'Konsumsi minuman manis/bergula?', type: 'radio', options: [{ label: 'Jarang/tidak pernah', value: 0, score: 0 }, { label: '1–3 kali/minggu', value: 1, score: 1 }, { label: 'Hampir setiap hari', value: 2, score: 2 }], required: true, section: 'Pola Makan' },
      { id: 'ls-fastfood', text: 'Konsumsi makanan cepat saji?', type: 'radio', options: [{ label: 'Jarang/tidak pernah', value: 0, score: 0 }, { label: '1–2 kali/minggu', value: 1, score: 1 }, { label: '≥ 3 kali/minggu', value: 2, score: 2 }], required: true, section: 'Pola Makan' },
      { id: 'ls-sleep', text: 'Berapa jam tidur per malam?', type: 'radio', options: [{ label: '7–9 jam', value: 0, score: 0 }, { label: '6 jam', value: 1, score: 1 }, { label: '< 6 jam atau > 9 jam', value: 2, score: 2 }], required: true, section: 'Pola Tidur' },
      { id: 'ls-stress', text: 'Tingkat stres yang dirasakan?', type: 'radio', options: [{ label: 'Rendah', value: 0, score: 0 }, { label: 'Sedang', value: 1, score: 1 }, { label: 'Tinggi', value: 2, score: 2 }], required: true, section: 'Kesehatan Mental' },
      { id: 'ls-weight', text: 'Apakah berat badan Anda naik signifikan dalam 1 tahun terakhir?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, 2–5 kg', value: 1, score: 1 }, { label: 'Ya, > 5 kg', value: 2, score: 2 }], required: true, section: 'Berat Badan' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 5, category: 'rendah', label: 'Gaya Hidup Sehat', recommendations: ['Pertahankan gaya hidup sehat', 'Lanjutkan aktivitas fisik teratur', 'Jaga pola makan seimbang'] },
        { min: 6, max: 12, category: 'sedang', label: 'Perlu Perbaikan Gaya Hidup', recommendations: ['Tingkatkan aktivitas fisik', 'Perbaiki pola makan', 'Kurangi konsumsi gula dan lemak', 'Kelola stres dengan baik', 'Perbaiki pola tidur'] },
        { min: 13, max: 99, category: 'tinggi', label: 'Gaya Hidup Berisiko Tinggi', recommendations: ['Konsultasi dokter untuk evaluasi kesehatan', 'Program modifikasi gaya hidup intensif', 'Berhenti merokok', 'Konsultasi gizi', 'Program pengelolaan stres'] },
      ],
    },
  },

  // ── Skrining Penyakit Kronis ──────────────────────────────────────────────
  {
    id: 'tmpl-kronis',
    name: 'Skrining Penyakit Kronis (DM, HT, PPOK, Jantung)',
    category: 'penyakit_kronis',
    standard: 'Skrining PTM Kemenkes RI',
    description: 'Skrining komprehensif untuk penyakit tidak menular kronis: Diabetes, Hipertensi, PPOK, dan Penyakit Jantung.',
    estimatedMinutes: 12,
    questions: [
      { id: 'kronis-dm-family', text: 'Apakah ada riwayat diabetes di keluarga?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Diabetes' },
      { id: 'kronis-dm-thirst', text: 'Apakah Anda sering merasa haus dan sering buang air kecil?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Diabetes' },
      { id: 'kronis-dm-wound', text: 'Apakah luka Anda lambat sembuh?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Diabetes' },
      { id: 'kronis-ht-headache', text: 'Apakah Anda sering sakit kepala atau pusing?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Hipertensi' },
      { id: 'kronis-ht-neck', text: 'Apakah Anda merasa kaku atau nyeri di tengkuk?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 1 }], required: true, section: 'Riwayat Hipertensi' },
      { id: 'kronis-copd-smoke', text: 'Apakah Anda merokok atau terpapar asap rokok?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, perokok pasif', value: 1, score: 1 }, { label: 'Ya, perokok aktif', value: 2, score: 3 }], required: true, section: 'Riwayat PPOK' },
      { id: 'kronis-copd-cough', text: 'Apakah Anda batuk berdahak > 3 bulan/tahun?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 3 }], required: true, section: 'Riwayat PPOK' },
      { id: 'kronis-copd-sob', text: 'Apakah Anda sesak napas saat aktivitas?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, ringan', value: 1, score: 2 }, { label: 'Ya, berat', value: 2, score: 3 }], required: true, section: 'Riwayat PPOK' },
      { id: 'kronis-chest', text: 'Apakah Anda pernah merasa nyeri dada?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, kadang-kadang', value: 1, score: 2 }, { label: 'Ya, sering', value: 2, score: 4 }], required: true, section: 'Riwayat Jantung' },
      { id: 'kronis-palpitation', text: 'Apakah Anda merasakan jantung berdebar-debar?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Jantung' },
      { id: 'kronis-swelling-feet', text: 'Apakah Anda mengalami bengkak pada kaki?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Jantung' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 5, category: 'rendah', label: 'Risiko Rendah Penyakit Kronis', recommendations: ['Pemeriksaan kesehatan rutin tahunan', 'Pertahankan gaya hidup sehat', 'Monitoring tekanan darah dan gula darah'] },
        { min: 6, max: 14, category: 'sedang', label: 'Risiko Sedang Penyakit Kronis', recommendations: ['Pemeriksaan laboratorium lengkap', 'Konsultasi dokter', 'Modifikasi gaya hidup', 'Monitoring berkala'] },
        { min: 15, max: 99, category: 'tinggi', label: 'Risiko Tinggi Penyakit Kronis', recommendations: ['Rujuk ke dokter spesialis', 'Pemeriksaan lengkap segera', 'ECG dan spirometri', 'Farmakoterapi jika diperlukan', 'Monitoring ketat'] },
      ],
    },
  },

  // ── Skrining Haji dan Umroh ──────────────────────────────────────────────
  {
    id: 'tmpl-haji',
    name: 'Skrining Kesehatan Haji & Umroh',
    category: 'haji_umroh',
    standard: 'Kuesioner Istithaah Kesehatan Haji',
    description: 'Skrining kesehatan untuk jemaah haji dan umroh berdasarkan kuesioner Istithaah Kesehatan.',
    estimatedMinutes: 10,
    questions: [
      { id: 'haji-chronic', text: 'Apakah Anda memiliki penyakit kronis?', type: 'checkbox', options: [{ label: 'Diabetes', value: 'dm', score: 2 }, { label: 'Hipertensi', value: 'ht', score: 2 }, { label: 'Penyakit Jantung', value: 'jantung', score: 3 }, { label: 'Asma/PPOK', value: 'asma', score: 2 }, { label: 'Ginjal', value: 'ginjal', score: 3 }, { label: 'Tidak ada', value: 'tidak_ada', score: 0 }], required: true, section: 'Riwayat Penyakit' },
      { id: 'haji-medication', text: 'Apakah Anda minum obat rutin?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, 1–2 jenis', value: 1, score: 1 }, { label: 'Ya, > 2 jenis', value: 2, score: 2 }], required: true, section: 'Pengobatan' },
      { id: 'haji-surgery', text: 'Apakah pernah menjalani operasi?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, > 1 tahun lalu', value: 1, score: 1 }, { label: 'Ya, < 1 tahun lalu', value: 2, score: 2 }], required: true, section: 'Riwayat Pengobatan' },
      { id: 'haji-allergy', text: 'Apakah Anda memiliki alergi obat?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 1 }], required: true, section: 'Alergi' },
      { id: 'haji-walking', text: 'Apakah Anda mampu berjalan jarak jauh (± 5 km)?', type: 'radio', options: [{ label: 'Ya, tanpa kesulitan', value: 0, score: 0 }, { label: 'Ya, dengan sedikit kesulitan', value: 1, score: 1 }, { label: 'Tidak mampu', value: 2, score: 3 }], required: true, section: 'Kemampuan Fisik' },
      { id: 'haji-vaccine', text: 'Apakah vaksinasi sudah lengkap (Meningitis, COVID-19)?', type: 'radio', options: [{ label: 'Ya, lengkap', value: 0, score: 0 }, { label: 'Belum lengkap', value: 1, score: 2 }], required: true, section: 'Vaksinasi' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 3, category: 'rendah', label: 'Istithaah Sehat', recommendations: ['Lanjutkan persiapan haji/umroh', 'Vaksinasi lengkap', 'Persiapkan fisik', 'Bawa obat pribadi'] },
        { min: 4, max: 8, category: 'sedang', label: 'Perlu Pengawasan', recommendations: ['Konsultasi dokter sebelum berangkat', 'Siapkan obat cadangan', 'Monitoring kesehatan selama perjalanan', 'Daftar ke klinik haji'] },
        { min: 9, max: 99, category: 'tinggi', label: 'Risiko Tinggi', recommendations: ['Evaluasi menyeluruh sebelum keberangkatan', 'Pendampingan medis diperlukan', 'Siapkan surat keterangan dokter', 'Pertimbangkan penundaan jika perlu'] },
      ],
    },
  },

  // ── Edinburgh Postnatal Depression Scale ──────────────────────────────────
  {
    id: 'tmpl-epds',
    name: 'Skrining Depresi Postpartum (EPDS)',
    category: 'nifas',
    standard: 'Edinburgh Postnatal Depression Scale',
    description: 'Edinburgh Postnatal Depression Scale untuk skrining depresi pada ibu nifas.',
    estimatedMinutes: 6,
    questions: [
      { id: 'epds1', text: 'Saya bisa tertawa dan melihat sisi yang menyenangkan dari sesuatu', type: 'radio', options: [{ label: 'Sama seperti biasanya (0)', value: 0, score: 0 }, { label: 'Tidak begitu banyak sekarang (1)', value: 1, score: 1 }, { label: 'Jauh lebih sedikit sekarang (2)', value: 2, score: 2 }, { label: 'Sama sekali tidak (3)', value: 3, score: 3 }], required: true },
      { id: 'epds2', text: 'Saya menantikan sesuatu dengan senang hati', type: 'radio', options: [{ label: 'Sama seperti biasanya (0)', value: 0, score: 0 }, { label: 'Lebih sedikit dari biasanya (1)', value: 1, score: 1 }, { label: 'Jauh lebih sedikit dari biasanya (2)', value: 2, score: 2 }, { label: 'Hampir tidak pernah (3)', value: 3, score: 3 }], required: true },
      { id: 'epds3', text: 'Saya menyalahkan diri saya tanpa alasan ketika ada yang salah', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Tidak sering (1)', value: 1, score: 1 }, { label: 'Kadang-kadang (2)', value: 2, score: 2 }, { label: 'Ya, sering kali (3)', value: 3, score: 3 }], required: true },
      { id: 'epds4', text: 'Saya merasa cemas atau khawatir tanpa alasan yang jelas', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
      { id: 'epds5', text: 'Saya merasa takut atau panik tanpa alasan yang jelas', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
      { id: 'epds6', text: 'Segala sesuatu di luar kemampuan saya', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
      { id: 'epds7', text: 'Saya merasa sangat sedih sehingga sulit tidur', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
      { id: 'epds8', text: 'Saya merasa sedih dan tidak bahagia', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
      { id: 'epds9', text: 'Saya merasa sangat tidak bahagia sehingga menangis', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
      { id: 'epds10', text: 'Pikiran menyakiti diri sendiri pernah muncul', type: 'radio', options: [{ label: 'Tidak pernah (0)', value: 0, score: 0 }, { label: 'Kadang-kadang (1)', value: 1, score: 1 }, { label: 'Sering (2)', value: 2, score: 2 }, { label: 'Sangat sering (3)', value: 3, score: 3 }], required: true },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 8, category: 'rendah', label: 'Tidak Depresi', recommendations: ['Dukungan emosional dari keluarga', 'Istirahat cukup', 'Aktivitas ringan'] },
        { min: 9, max: 12, category: 'sedang', label: 'Kemungkinan Depresi', recommendations: ['Konsultasi dengan tenaga kesehatan', 'Dukungan psikososial', 'Evaluasi ulang dalam 2 minggu'] },
        { min: 13, max: 99, category: 'tinggi', label: 'Depresi Postpartum', recommendations: ['Rujuk ke psikiater', 'Evaluasi risiko bunuh diri', 'Dukungan intensif', 'Pertimbangkan farmakoterapi'] },
      ],
    },
  },

  // ── Skrining Bayi (0-11 bulan) ────────────────────────────────────────────
  {
    id: 'tmpl-bayi',
    name: 'Skrining Tumbuh Kembang Bayi (0–11 bulan)',
    category: 'bayi',
    standard: 'KPSP',
    description: 'Skrining tumbuh kembang bayi berdasarkan Kuesioner Pra Skrining Perkembangan (KPSP).',
    estimatedMinutes: 8,
    questions: [
      { id: 'bayi-age', text: 'Berapa usia bayi?', type: 'radio', options: [{ label: '0–3 bulan', value: 0, score: 0 }, { label: '4–6 bulan', value: 1, score: 0 }, { label: '7–9 bulan', value: 2, score: 0 }, { label: '10–11 bulan', value: 3, score: 0 }], required: true, section: 'Data Bayi' },
      { id: 'bayi-smile', text: 'Apakah bayi sudah bisa tersenyum saat diajak bermain?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Belum', value: 1, score: 2 }], required: true, section: 'Perkembangan Sosial' },
      { id: 'bayi-follow', text: 'Apakah bayi bisa mengikuti gerakan benda dengan matanya?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Belum', value: 1, score: 2 }], required: true, section: 'Perkembangan Sosial' },
      { id: 'bayi-head', text: 'Apakah bayi sudah bisa mengangkat kepala saat tengkurap?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Belum', value: 1, score: 2 }], required: true, section: 'Motorik Kasar' },
      { id: 'bayi-grasp', text: 'Apakah bayi sudah bisa menggenggam benda?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Belum', value: 1, score: 2 }], required: true, section: 'Motorik Halus' },
      { id: 'bayi-babble', text: 'Apakah bayi sudah bisa mengoceh (babbling)?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Belum', value: 1, score: 2 }], required: true, section: 'Bahasa' },
      { id: 'bayi-bb', text: 'Apakah berat badan bayi naik sesuai KMS?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak naik', value: 1, score: 3 }], required: true, section: 'Pertumbuhan' },
      { id: 'bayi-asi', text: 'Apakah bayi mendapat ASI eksklusif?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 1 }], required: true, section: 'Nutrisi' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 3, category: 'rendah', label: 'Perkembangan Sesuai Usia', recommendations: ['Lanjutkan stimulasi tumbuh kembang', 'ASI eksklusif hingga 6 bulan', 'Imunisasi sesuai jadwal'] },
        { min: 4, max: 8, category: 'sedang', label: 'Perlu Stimulasi Lebih', recommendations: ['Tingkatkan stimulasi', 'Konsultasi dengan dokter anak', 'Latihan motorik dan bahasa', 'Evaluasi ulang 1 bulan'] },
        { min: 9, max: 99, category: 'tinggi', label: 'Perkembangan Terlambat', recommendations: ['Rujuk ke dokter anak spesialis tumbuh kembang', 'Intervensi dini', 'Terapi okupasi/fisioterapi', 'Evaluasi menyeluruh'] },
      ],
    },
  },

  // ── Skrining Anak Sekolah (SDQ) ──────────────────────────────────────────
  {
    id: 'tmpl-sdq',
    name: 'Skrining Kesehatan Anak (SDQ)',
    category: 'anak_sekolah',
    standard: 'SDQ Anak',
    description: 'Strengths and Difficulties Questionnaire untuk skrining kesehatan mental anak usia sekolah.',
    estimatedMinutes: 8,
    questions: [
      { id: 'sdq1', text: 'Saya sering mengalami sakit kepala, sakit perut, atau merasa tidak enak badan', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Gejala Somatic' },
      { id: 'sdq2', text: 'Saya sering merasa khawatir', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Gejala Emosional' },
      { id: 'sdq3', text: 'Saya sering merasa sedih atau depresi', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Gejala Emosional' },
      { id: 'sdq4', text: 'Saya gelisah, tidak bisa diam lama', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Hiperaktivitas' },
      { id: 'sdq5', text: 'Saya terus-menerus bergerak', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Hiperaktivitas' },
      { id: 'sdq6', text: 'Saya mudah teralihkan, sulit berkonsentrasi', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Hiperaktivitas' },
      { id: 'sdq7', text: 'Saya sering bertengkar dengan anak lain', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Masalah Perilaku' },
      { id: 'sdq8', text: 'Saya sering berbohong atau curang', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Masalah Perilaku' },
      { id: 'sdq9', text: 'Saya lebih suka sendiri daripada bersama orang lain', type: 'radio', options: [{ label: 'Tidak benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Pasti benar (2)', value: 2, score: 2 }], required: true, section: 'Masalah Teman Sebaya' },
      { id: 'sdq10', text: 'Saya umumnya disukai oleh anak lain', type: 'radio', options: [{ label: 'Pasti benar (0)', value: 0, score: 0 }, { label: 'Agak benar (1)', value: 1, score: 1 }, { label: 'Tidak benar (2)', value: 2, score: 2 }], required: true, section: 'Masalah Teman Sebaya' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 8, category: 'rendah', label: 'Normal', recommendations: ['Anak dalam kondisi normal', 'Dukungan orang tua yang baik', 'Lanjutkan pengasuhan positif'] },
        { min: 9, max: 14, category: 'sedang', label: 'Agak Sulit', recommendations: ['Perhatikan lebih lanjut', 'Diskusi dengan guru', 'Peningkatan komunikasi orang tua-anak', 'Evaluasi ulang'] },
        { min: 15, max: 99, category: 'tinggi', label: 'Sangat Sulit', recommendations: ['Konsultasi psikolog anak', 'Evaluasi lebih lanjut', 'Pertimbangkan intervensi', 'Dukungan keluarga dan sekolah'] },
      ],
    },
  },

  // ── Skrining Remaja ──────────────────────────────────────────────────────
  {
    id: 'tmpl-remaja',
    name: 'Skrining Kesehatan Remaja',
    category: 'remaja',
    standard: 'Skrining PTM Kemenkes RI',
    description: 'Skrining kesehatan untuk remaja usia 13–18 tahun mencakup kesehatan fisik dan mental.',
    estimatedMinutes: 8,
    questions: [
      { id: 'remaja-bmi', text: 'Bagaimana status BMI Anda?', type: 'radio', options: [{ label: 'Normal (18.5–22.9)', value: 0, score: 0 }, { label: 'Underweight (< 18.5)', value: 1, score: 1 }, { label: 'Overweight (23–27.4)', value: 2, score: 1 }, { label: 'Obesitas (≥ 27.5)', value: 3, score: 2 }], required: true, section: 'Fisik' },
      { id: 'remaja-exercise', text: 'Apakah Anda berolahraga minimal 60 menit/hari?', type: 'radio', options: [{ label: 'Ya', value: 0, score: 0 }, { label: 'Tidak', value: 1, score: 2 }], required: true, section: 'Fisik' },
      { id: 'remaja-sleep', text: 'Berapa jam tidur per malam?', type: 'radio', options: [{ label: '8–10 jam', value: 0, score: 0 }, { label: '6–7 jam', value: 1, score: 1 }, { label: '< 6 jam', value: 2, score: 2 }], required: true, section: 'Fisik' },
      { id: 'remaja-smoke', text: 'Apakah Anda merokok atau menggunakan vape?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Pernah mencoba', value: 1, score: 1 }, { label: 'Ya, rutin', value: 2, score: 3 }], required: true, section: 'Gaya Hidup' },
      { id: 'remaja-stress', text: 'Seberapa sering Anda merasa tertekan/stres?', type: 'radio', options: [{ label: 'Jarang', value: 0, score: 0 }, { label: 'Kadang-kadang', value: 1, score: 1 }, { label: 'Sering', value: 2, score: 2 }], required: true, section: 'Mental' },
      { id: 'remaja-sad', text: 'Apakah Anda sering merasa sedih tanpa alasan jelas?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Kadang-kadang', value: 1, score: 1 }, { label: 'Sering', value: 2, score: 3 }], required: true, section: 'Mental' },
      { id: 'remaja-bullying', text: 'Apakah Anda pernah mengalami perundungan/bullying?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Pernah', value: 1, score: 2 }, { label: 'Sering', value: 2, score: 3 }], required: true, section: 'Sosial' },
      { id: 'remaja-screen', text: 'Berapa jam penggunaan gadget per hari (di luar sekolah)?', type: 'radio', options: [{ label: '< 2 jam', value: 0, score: 0 }, { label: '2–4 jam', value: 1, score: 1 }, { label: '> 4 jam', value: 2, score: 2 }], required: true, section: 'Gaya Hidup' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 4, category: 'rendah', label: 'Sehat', recommendations: ['Pertahankan gaya hidup sehat', 'Olahraga teratur', 'Tidur cukup', 'Batasi penggunaan gadget'] },
        { min: 5, max: 10, category: 'sedang', label: 'Perlu Perhatian', recommendations: ['Tingkatkan aktivitas fisik', 'Perbaiki pola tidur', 'Kelola stres dengan baik', 'Kurangi waktu layar', 'Bicara dengan orang tua/konselor'] },
        { min: 11, max: 99, category: 'tinggi', label: 'Berisiko', recommendations: ['Konsultasi dengan dokter/psikolog', 'Evaluasi kesehatan mental', 'Dukungan keluarga', 'Intervensi gaya hidup', 'Monitoring berkala'] },
      ],
    },
  },

  // ── Skrining Risiko PTM Umum ─────────────────────────────────────────────
  {
    id: 'tmpl-ptm',
    name: 'Skrining Risiko Penyakit Tidak Menular (PTM)',
    category: 'ptm',
    standard: 'Skrining PTM Kementerian Kesehatan RI',
    description: 'Skrining risiko PTM berdasarkan pedoman Kementerian Kesehatan RI untuk pendekatan upaya kesehatan masyarakat.',
    estimatedMinutes: 10,
    questions: [
      { id: 'ptm-age', text: 'Berapa usia Anda?', type: 'radio', options: [{ label: '< 40 tahun', value: 0, score: 0 }, { label: '40–54 tahun', value: 1, score: 1 }, { label: '≥ 55 tahun', value: 2, score: 2 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-smoke', text: 'Status merokok?', type: 'radio', options: [{ label: 'Tidak pernah', value: 0, score: 0 }, { label: 'Mantan perokok', value: 1, score: 1 }, { label: 'Perokok aktif', value: 2, score: 3 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-alcohol', text: 'Konsumsi alkohol?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-physical', text: 'Aktivitas fisik?', type: 'radio', options: [{ label: 'Aktif (≥ 150 menit/minggu)', value: 0, score: 0 }, { label: 'Kurang aktif', value: 1, score: 2 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-diet', text: 'Pola makan?', type: 'radio', options: [{ label: 'Sehat (banyak sayur/buah, rendah garam/gula)', value: 0, score: 0 }, { label: 'Cukup', value: 1, score: 1 }, { label: 'Tidak sehat', value: 2, score: 2 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-bmi', text: 'Status BMI?', type: 'radio', options: [{ label: 'Normal', value: 0, score: 0 }, { label: 'Overweight', value: 1, score: 1 }, { label: 'Obesitas', value: 2, score: 2 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-waist', text: 'Lingkar pinggang berlebih?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Faktor Risiko' },
      { id: 'ptm-bp', text: 'Tekanan darah tinggi?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Kondisi Saat Ini' },
      { id: 'ptm-glucose', text: 'Kadar gula darah tinggi?', type: 'radio', options: [{ label: 'Tidak tahu/Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Kondisi Saat Ini' },
      { id: 'ptm-cholesterol', text: 'Kolesterol tinggi?', type: 'radio', options: [{ label: 'Tidak tahu/Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Kondisi Saat Ini' },
      { id: 'ptm-family', text: 'Riwayat keluarga dengan PTM?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 2 }], required: true, section: 'Riwayat Keluarga' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 5, category: 'rendah', label: 'Risiko Rendah PTM', recommendations: ['Pertahankan gaya hidup sehat', 'Cek kesehatan rutin tahunan', 'Jaga berat badan ideal'] },
        { min: 6, max: 12, category: 'sedang', label: 'Risiko Sedang PTM', recommendations: ['Pemeriksaan kesehatan berkala', 'Modifikasi gaya hidup', 'Konsultasi gizi', 'Monitoring tekanan darah dan gula darah'] },
        { min: 13, max: 99, category: 'tinggi', label: 'Risiko Tinggi PTM', recommendations: ['Pemeriksaan menyeluruh segera', 'Konsultasi dokter', 'Program modifikasi gaya hidup intensif', 'Pemeriksaan laboratorium lengkap', 'Monitoring rutin'] },
      ],
    },
  },

  // ── Skrining Dewasa ──────────────────────────────────────────────────────
  {
    id: 'tmpl-dewasa',
    name: 'Skrining Kesehatan Dewasa',
    category: 'dewasa',
    standard: 'WHO STEPS',
    description: 'Skrining kesehatan umum untuk dewasa usia 19–59 tahun.',
    estimatedMinutes: 8,
    questions: [
      { id: 'dewasa-checkup', text: 'Kapan terakhir kali Anda melakukan pemeriksaan kesehatan?', type: 'radio', options: [{ label: '< 1 tahun', value: 0, score: 0 }, { label: '1–3 tahun', value: 1, score: 1 }, { label: '> 3 tahun atau tidak pernah', value: 2, score: 2 }], required: true, section: 'Riwayat Kesehatan' },
      { id: 'dewasa-chronic', text: 'Apakah Anda memiliki penyakit kronis?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya, terkontrol', value: 1, score: 1 }, { label: 'Ya, tidak terkontrol', value: 2, score: 3 }], required: true, section: 'Riwayat Kesehatan' },
      { id: 'dewasa-medication', text: 'Apakah Anda mengonsumsi obat rutin?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Ya', value: 1, score: 1 }], required: true, section: 'Riwayat Kesehatan' },
      { id: 'dewasa-exercise', text: 'Aktivitas fisik?', type: 'radio', options: [{ label: '≥ 150 menit/minggu', value: 0, score: 0 }, { label: '< 150 menit/minggu', value: 1, score: 2 }], required: true, section: 'Gaya Hidup' },
      { id: 'dewasa-smoke', text: 'Status merokok?', type: 'radio', options: [{ label: 'Tidak', value: 0, score: 0 }, { label: 'Mantan perokok', value: 1, score: 1 }, { label: 'Perokok aktif', value: 2, score: 2 }], required: true, section: 'Gaya Hidup' },
      { id: 'dewasa-bmi', text: 'Status BMI?', type: 'radio', options: [{ label: 'Normal', value: 0, score: 0 }, { label: 'Overweight', value: 1, score: 1 }, { label: 'Obesitas', value: 2, score: 2 }], required: true, section: 'Fisik' },
      { id: 'dewasa-stress', text: 'Tingkat stres?', type: 'radio', options: [{ label: 'Rendah', value: 0, score: 0 }, { label: 'Sedang', value: 1, score: 1 }, { label: 'Tinggi', value: 2, score: 2 }], required: true, section: 'Mental' },
      { id: 'dewasa-sleep', text: 'Kualitas tidur?', type: 'radio', options: [{ label: 'Baik (7–9 jam)', value: 0, score: 0 }, { label: 'Cukup', value: 1, score: 1 }, { label: 'Buruk', value: 2, score: 2 }], required: true, section: 'Gaya Hidup' },
    ],
    scoringAlgorithm: {
      type: 'sum',
      ranges: [
        { min: 0, max: 4, category: 'rendah', label: 'Sehat', recommendations: ['Pertahankan gaya hidup sehat', 'Pemeriksaan rutin tahunan', 'Jaga berat badan ideal'] },
        { min: 5, max: 10, category: 'sedang', label: 'Perlu Perhatian', recommendations: ['Perbaiki gaya hidup', 'Konsultasi dokter', 'Tingkatkan aktivitas fisik', 'Kelola stres'] },
        { min: 11, max: 99, category: 'tinggi', label: 'Berisiko', recommendations: ['Pemeriksaan kesehatan menyeluruh', 'Konsultasi dokter segera', 'Program modifikasi gaya hidup', 'Monitoring berkala'] },
      ],
    },
  },
];

// ── Scoring Engine ──────────────────────────────────────────────────────────

export function calculateScreeningScore(
  template: ScreeningTemplate,
  answers: Record<string, string | number | string[]>
): { score: number; riskCategory: RiskCategory; label: string; recommendations: string[] } {
  let totalScore = 0;

  for (const question of template.questions) {
    const answer = answers[question.id];
    if (answer === undefined || answer === null || answer === '') continue;

    if (question.type === 'checkbox' && Array.isArray(answer)) {
      // For checkbox, sum scores of selected options
      for (const selectedValue of answer as string[]) {
        const option = question.options?.find((o) => String(o.value) === String(selectedValue));
        if (option) totalScore += option.score;
      }
    } else if (question.type === 'radio' && question.options) {
      const option = question.options.find((o) => String(o.value) === String(answer));
      if (option) totalScore += option.score;
    } else if (question.type === 'number') {
      // For number type, direct value as score if no options
      if (!question.options) {
        totalScore += Number(answer) || 0;
      }
    }
  }

  // Find matching risk range
  const range = template.scoringAlgorithm.ranges.find(
    (r) => totalScore >= r.min && totalScore <= r.max
  );

  return {
    score: totalScore,
    riskCategory: range?.category || 'rendah',
    label: range?.label || 'Tidak Dapat Dinilai',
    recommendations: range?.recommendations || [],
  };
}

// ── Progress Calculator ─────────────────────────────────────────────────────

export function calculateProgress(
  template: ScreeningTemplate,
  answers: Record<string, string | number | string[]>
): number {
  const totalQuestions = template.questions.length;
  if (totalQuestions === 0) return 0;

  const answeredQuestions = template.questions.filter((q) => {
    const answer = answers[q.id];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  }).length;

  return Math.round((answeredQuestions / totalQuestions) * 100);
}

// ── Get Templates by Category ───────────────────────────────────────────────

export function getTemplatesByCategory(category: ScreeningCategory): ScreeningTemplate[] {
  return SCREENING_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): ScreeningTemplate | undefined {
  return SCREENING_TEMPLATES.find((t) => t.id === id);
}
