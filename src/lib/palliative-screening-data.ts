/**
 * Shared palliative screening tool data and scoring functions.
 * Used by both PalliativeScreeningPanel and InlineScreeningForm (chat).
 */

import type { PalliativeToolType, PalliativeEwsLevel } from './types';

// ── Tool Metadata ──────────────────────────────────────────────────────────

export const TOOL_META: Record<PalliativeToolType, {
  name: string;
  description: string;
  items: string;
  scale: string;
  totalSteps: number;
}> = {
  esas: {
    name: 'ESAS-r',
    description: 'Edmonton Symptom Assessment System Revised — 9 gejala dengan skala VAS 0-10',
    items: '9 item',
    scale: '0-10 VAS per item, total 0-90',
    totalSteps: 1,
  },
  distress: {
    name: 'Distress Thermometer',
    description: 'NCCN Distress Thermometer — Skor tekanan + daftar masalah 5 kategori',
    items: '1 slider + 26 masalah',
    scale: '0-10 + Problem List',
    totalSteps: 6,
  },
  spict: {
    name: 'Skrining Kebutuhan Perawatan Paliatif (SPICT)',
    description: 'Alat bantu identifikasi pasien yang mungkin memerlukan penilaian paliatif',
    items: '15 pertanyaan + penyakit kronis + surprise question',
    scale: '0-15 poin (4 kategori risiko)',
    totalSteps: 3,
  },
  pps: {
    name: 'Skrining Kondisi Pasien (PPS)',
    description: 'Palliative Performance Scale — 5 dimensi kondisi pasien dengan pertanyaan tambahan',
    items: '5 dimensi + 5 pertanyaan tambahan',
    scale: 'PPS % (rata-rata 5 dimensi)',
    totalSteps: 2,
  },
  zarit: {
    name: 'Zarit Caregiver Burden',
    description: 'Zarit Caregiver Burden Interview — Beban pengasuh 22 pertanyaan',
    items: '22 pertanyaan',
    scale: '0-88 (4 kategori)',
    totalSteps: 4,
  },
  eortc: {
    name: 'EORTC QLQ-C15-PAL',
    description: 'Quality of Life Questionnaire — 15 item kualitas hidup paliatif',
    items: '15 item',
    scale: '3 skor % (PF, SB, QoL)',
    totalSteps: 3,
  },
};

// ── ESAS-r Data ────────────────────────────────────────────────────────────

export const ESAS_ITEMS = [
  { id: 'esas-nyeri', label: 'Nyeri' },
  { id: 'esas-sesak', label: 'Sesak Napas' },
  { id: 'esas-mual', label: 'Mual' },
  { id: 'esas-kelelahan', label: 'Kelelahan' },
  { id: 'esas-mengantuk', label: 'Mengantuk' },
  { id: 'esas-nafsu', label: 'Nafsu Makan' },
  { id: 'esas-cemas', label: 'Kecemasan' },
  { id: 'esas-depresi', label: 'Depresi' },
  { id: 'esas-sejahtera', label: 'Kesejahteraan' },
];

// ── Distress Thermometer Data ──────────────────────────────────────────────

export const DT_PROBLEMS: { category: string; step: number; items: string[] }[] = [
  { category: 'Praktis', step: 2, items: ['Masalah tempat tinggal', 'Masalah asuransi/biaya', 'Transportasi', 'Pekerjaan', 'Masalah kebersihan'] },
  { category: 'Keluarga', step: 3, items: ['Mengurus anak', 'Kemampuan mengurus keluarga', 'Hubungan dengan pasangan/keluarga'] },
  { category: 'Emosional', step: 4, items: ['Kecemasan', 'Depresi', 'Ketakutan', 'Kesedihan/gangguan berkabung', 'Kehilangan minat'] },
  { category: 'Spiritual', step: 5, items: ['Kehilangan keyakinan', 'Berkaitan dengan kematian', 'Berkaitan dengan makna hidup'] },
  { category: 'Fisik', step: 6, items: ['Nyeri', 'Mual', 'Sesak napas', 'Kelelahan', 'Gangguan tidur', 'Sembelit', 'Diare', 'Perubahan nafsu makan', 'Mulut kering', 'Gangguan pencernaan'] },
];

// ── SPICT Data ─────────────────────────────────────────────────────────────

export const SPICT_QUESTIONS = [
  { id: 'spict-q1', text: 'Apakah kondisi kesehatan pasien semakin menurun dalam beberapa bulan terakhir?', help: 'Apakah tampak lebih sering sakit atau kondisi fisiknya terlihat tidak sebugar dulu?' },
  { id: 'spict-q2', text: 'Apakah pasien lebih sering dirawat di rumah sakit atau IGD dibanding sebelumnya?', help: 'Apakah dalam 6 bulan terakhir frekuensi masuk RS lebih sering dari biasanya?' },
  { id: 'spict-q3', text: 'Apakah pasien semakin sulit melakukan aktivitas sehari-hari?', help: 'Contoh: kesulitan mandi, berpakaian, makan, atau berjalan tanpa dibantu.' },
  { id: 'spict-q4', text: 'Apakah pasien lebih sering berada di tempat tidur atau duduk dibanding sebelumnya?', help: 'Apakah pasien lebih banyak menghabiskan waktu berbaring daripada beraktivitas?' },
  { id: 'spict-q5', text: 'Apakah berat badan pasien menurun tanpa disengaja?', help: 'Apakah pakaian terasa lebih longgar atau timbangan menunjukkan penurunan berat yang signifikan?' },
  { id: 'spict-q6', text: 'Apakah nafsu makan pasien berkurang?', help: 'Apakah porsi makan pasien jauh berkurang dari porsi biasanya?' },
  { id: 'spict-q7', text: 'Apakah pasien merasa lebih lemah atau cepat lelah?', help: 'Apakah pasien tampak kehabisan tenaga bahkan saat melakukan kegiatan ringan?' },
  { id: 'spict-q8', text: 'Apakah pasien sering mengalami nyeri yang mengganggu?', help: 'Nyeri yang dirasakan cukup kuat untuk membuat pasien sulit fokus atau sulit istirahat.' },
  { id: 'spict-q9', text: 'Apakah pasien sering sesak napas?', help: 'Apakah napas terasa berat, pendek-pendek, atau terengah-engah?' },
  { id: 'spict-q10', text: 'Apakah pasien sering mual atau muntah?', help: 'Perasaan ingin muntah yang mengganggu kenyamanan sehari-hari.' },
  { id: 'spict-q11', text: 'Apakah pasien sering sulit tidur karena keluhan penyakitnya?', help: 'Keluhan nyeri, sesak, atau cemas membuat pasien tidak bisa tidur nyenyak.' },
  { id: 'spict-q12', text: 'Apakah pasien sering merasa cemas, sedih, atau putus asa?', help: 'Dukungan emosional sangat diperlukan jika pasien sering merasa murung.' },
  { id: 'spict-q13', text: 'Apakah keluarga semakin sering membantu kebutuhan sehari-hari pasien?', help: 'Apakah Anda/keluarga harus lebih sering turun tangan untuk aktivitas pribadi pasien?' },
  { id: 'spict-q14', text: 'Apakah keluarga merasa beban merawat pasien semakin berat?', help: 'Apakah Anda merasa kelelahan baik fisik maupun mental dalam merawat pasien?' },
  { id: 'spict-q15', text: 'Apakah butuh bantuan untuk perencanaan pengobatan ke depan?', help: 'Apakah Anda bingung mengenai langkah medis selanjutnya?' },
];

export const SPICT_DISEASES = [
  'Kanker stadium lanjut',
  'Gagal jantung',
  'Penyakit paru kronis (PPOK)',
  'Stroke berat',
  'Demensia',
  'Penyakit saraf progresif',
  'Gagal ginjal kronis',
  'Penyakit hati kronis',
  'Kondisi kronis berat lainnya',
];

// ── PPS Data ───────────────────────────────────────────────────────────────

export const PPS_QUESTIONS = [
  {
    id: 'pps-bergerak',
    title: '1. Kemampuan Bergerak',
    options: [
      { text: 'Jalan normal', desc: 'Masih bisa beraktivitas/ke luar rumah seperti biasa.', score: 100 },
      { text: 'Jalan lambat', desc: 'Bisa keluar rumah, tapi kecepatan berkurang/mudah lelah.', score: 80 },
      { text: 'Jalan dalam rumah', desc: 'Tidak keluar rumah, mobilitas hanya di area dalam rumah.', score: 60 },
      { text: 'Duduk/berbaring', desc: 'Lebih banyak duduk/berbaring daripada berjalan.', score: 40 },
      { text: 'Hampir selalu tidur', desc: 'Sangat jarang bangun dari tempat tidur.', score: 20 },
      { text: 'Bedridden', desc: 'Tidak mampu bangun dari tempat tidur sama sekali.', score: 0 },
    ],
  },
  {
    id: 'pps-aktivitas',
    title: '2. Aktivitas Sehari-hari',
    options: [
      { text: 'Aktivitas penuh', desc: 'Masih mampu melakukan semua kegiatan normal.', score: 100 },
      { text: 'Aktivitas terbatas', desc: 'Masih beraktivitas, tapi butuh istirahat lebih sering.', score: 80 },
      { text: 'Tanpa kerja berat', desc: 'Tidak mampu mencuci, mengangkat barang, atau berkebun.', score: 60 },
      { text: 'Aktivitas ringan', desc: 'Hanya mampu melakukan kegiatan yang sangat ringan.', score: 40 },
      { text: 'Hampir tidak ada aktivitas', desc: 'Hampir tidak melakukan kegiatan apa pun.', score: 20 },
      { text: 'Tidak mampu mandiri', desc: 'Tidak bisa melakukan aktivitas sendiri sama sekali.', score: 0 },
    ],
  },
  {
    id: 'pps-kemandirian',
    title: '3. Kemandirian',
    options: [
      { text: 'Mandiri penuh', desc: 'Tidak membutuhkan bantuan orang lain.', score: 100 },
      { text: 'Sedikit bantuan', desc: 'Mandiri, hanya butuh bantu hal kecil (misal: kancing baju).', score: 80 },
      { text: 'Bantuan beberapa', desc: 'Butuh bantuan fisik, misal saat ke kamar mandi/mandi.', score: 60 },
      { text: 'Bantuan sebagian besar', desc: 'Sebagian besar kebutuhan rutin harus dibantu.', score: 40 },
      { text: 'Bantuan penuh', desc: 'Butuh bantuan penuh untuk semua aktivitas dasar.', score: 20 },
      { text: 'Total care', desc: 'Semua kebutuhan harus dibantu total oleh orang lain.', score: 0 },
    ],
  },
  {
    id: 'pps-makan',
    title: '4. Makan dan Minum',
    options: [
      { text: 'Normal', desc: 'Nafsu makan dan porsi sama seperti biasanya.', score: 100 },
      { text: 'Sedikit kurang', desc: 'Porsi sedikit berkurang, ada sedikit sisa makanan.', score: 80 },
      { text: 'Kurang cukup banyak', desc: 'Penurunan asupan yang jelas (misal: hanya habis setengah).', score: 60 },
      { text: 'Hanya sedikit', desc: 'Hanya sanggup makan beberapa suap/sangat sedikit.', score: 40 },
      { text: 'Sangat sedikit', desc: 'Hampir tidak ada asupan makanan yang masuk.', score: 20 },
      { text: 'Tidak mampu', desc: 'Sama sekali tidak mampu makan atau minum.', score: 0 },
    ],
  },
  {
    id: 'pps-kesadaran',
    title: '5. Kesadaran dan Komunikasi',
    options: [
      { text: 'Sadar penuh', desc: 'Komunikasi normal dan sadar sepenuhnya.', score: 100 },
      { text: 'Mengantuk ringan', desc: 'Sering mengantuk tapi masih bisa diajak bicara.', score: 80 },
      { text: 'Sulit konsentrasi', desc: 'Sering mengantuk dan sulit fokus saat bicara.', score: 60 },
      { text: 'Bingung sesekali', desc: 'Terkadang tampak bingung atau tidak nyambung.', score: 40 },
      { text: 'Sering bingung', desc: 'Sering sulit diajak komunikasi atau bingung.', score: 20 },
      { text: 'Tidak responsif', desc: 'Tidak sadar atau tidak memberikan respons.', score: 0 },
    ],
  },
];

export const PPS_EXTRA_QUESTIONS = [
  'Apakah kondisi pasien memburuk dibanding bulan lalu?',
  'Apakah pasien pernah jatuh dalam 1 bulan terakhir?',
  'Apakah pasien mengalami penurunan berat badan?',
  'Apakah pasien lebih banyak tidur dibanding biasanya?',
  'Apakah keluarga merasa pasien membutuhkan bantuan lebih banyak?',
];

// ── Zarit Data ─────────────────────────────────────────────────────────────

export const ZARIT_QUESTIONS = [
  'Apakah Anda merasa pengasuhan memakan terlalu banyak waktu Anda?',
  'Apakah Anda merasa lelah karena mengasuh?',
  'Apakah Anda merasa sulit mengurus rumah tangga selain mengasuh?',
  'Apakah Anda merasa terkungkung karena mengasuh?',
  'Apakah Anda merasa keluarga Anda tidak membantu mengasuh?',
  'Apakah Anda merasa keluarga Anda tidak menghargai usaha mengasuh Anda?',
  'Apakah Anda merasa pengasuhan memengaruhi hubungan Anda dengan keluarga lain?',
  'Apakah Anda merasa pengasuhan membuat Anda kehilangan kehidupan sosial?',
  'Apakah Anda merasa malu karena kondisi orang yang Anda asuh?',
  'Apakah Anda merasa marah ketika berada di sekitar orang yang Anda asuh?',
  'Apakah Anda merasa pengasuhan memengaruhi kesehatan Anda?',
  'Apakah Anda merasa tidak punya waktu untuk diri sendiri?',
  'Apakah Anda merasa stres karena mengurus dua orang sekaligus (orang yang diasuh dan keluarga)?',
  'Apakah Anda merasa khawatir tentang apa yang akan terjadi pada orang yang Anda asuh di masa depan?',
  'Apakah Anda merasa penghasilan Anda tidak cukup untuk biaya pengasuhan?',
  'Apakah Anda merasa tidak mampu mengasuh lebih lama lagi?',
  'Apakah Anda merasa tidak punya kehidupan pribadi karena mengasuh?',
  'Apakah Anda ingin meninggalkan pengasuhan pada orang lain?',
  'Apakah Anda merasa tidak tahu harus berbuat apa untuk orang yang Anda asuh?',
  'Apakah Anda merasa seharusnya berbuat lebih banyak untuk orang yang Anda asuh?',
  'Apakah Anda merasa seharusnya melakukan pengasuhan dengan lebih baik?',
  'Secara keseluruhan, seberapa besar beban yang Anda rasakan dalam mengasuh?',
];

export const ZARIT_OPTIONS = [
  { label: 'Tidak pernah', value: 0 },
  { label: 'Jarang', value: 1 },
  { label: 'Kadang-kadang', value: 2 },
  { label: 'Cukup sering', value: 3 },
  { label: 'Hampir selalu', value: 4 },
];

// ── EORTC QLQ-C15-PAL Data ────────────────────────────────────────────────

export const EORTC_QUESTIONS: { id: string; text: string; section: 'physical' | 'symptom' | 'qol' }[] = [
  { id: 'eortc-q1', text: 'Apakah Anda kesulitan melakukan pekerjaan berat?', section: 'physical' },
  { id: 'eortc-q2', text: 'Apakah Anda kesulitan berjalan jarak jauh?', section: 'physical' },
  { id: 'eortc-q3', text: 'Apakah Anda kesulitan berjalan di luar rumah?', section: 'physical' },
  { id: 'eortc-q4', text: 'Apakah Anda perlu bantuan untuk beristirahat di tempat tidur atau kursi?', section: 'physical' },
  { id: 'eortc-q5', text: 'Apakah Anda perlu bantuan untuk makan, berpakaian, mencuci, atau menggunakan toilet?', section: 'physical' },
  { id: 'eortc-q6', text: 'Apakah Anda terbatas dalam melakukan pekerjaan atau hobi?', section: 'physical' },
  { id: 'eortc-q7', text: 'Apakah Anda terbatas dalam melakukan aktivitas sehari-hari?', section: 'physical' },
  { id: 'eortc-q8', text: 'Apakah Anda merasa sesak napas?', section: 'symptom' },
  { id: 'eortc-q9', text: 'Apakah Anda merasa nyeri?', section: 'symptom' },
  { id: 'eortc-q10', text: 'Apakah Anda sulit tidur?', section: 'symptom' },
  { id: 'eortc-q11', text: 'Apakah Anda merasa lemah?', section: 'symptom' },
  { id: 'eortc-q12', text: 'Apakah nafsu makan Anda berkurang?', section: 'symptom' },
  { id: 'eortc-q13', text: 'Apakah Anda merasa mual?', section: 'symptom' },
  { id: 'eortc-q14', text: 'Apakah Anda mengalami sembelit?', section: 'symptom' },
  { id: 'eortc-q15', text: 'Bagaimana Anda menilai kualitas hidup Anda secara keseluruhan selama seminggu terakhir?', section: 'qol' },
];

export const EORTC_OPTIONS_4 = [
  { label: 'Tidak sama sekali', value: 1 },
  { label: 'Sedikit', value: 2 },
  { label: 'Cukup banyak', value: 3 },
  { label: 'Sangat banyak', value: 4 },
];

// ── Scoring Functions ──────────────────────────────────────────────────────

export function calcESAS(answers: Record<string, number | string | string[]>): {
  total: number;
  maxSymptom: number;
  items: { label: string; value: number }[];
} {
  const items = ESAS_ITEMS.map(item => ({
    label: item.label,
    value: Number(answers[item.id]) || 0,
  }));
  const total = items.reduce((s, i) => s + i.value, 0);
  const maxSymptom = Math.max(...items.map(i => i.value));
  return { total, maxSymptom, items };
}

export function calcDistress(answers: Record<string, number | string | string[]>): {
  score: number;
  problems: Record<string, string[]>;
} {
  const score = Number(answers['dt-score']) || 0;
  const problems: Record<string, string[]> = {};
  for (const cat of DT_PROBLEMS) {
    const checked = (answers[`dt-${cat.category}`] as string[]) || [];
    if (checked.length > 0) problems[cat.category] = checked;
  }
  return { score, problems };
}

export function calcSPICT(answers: Record<string, number | string | string[]>): {
  yesCount: number;
  riskCategory: string;
  isHighRisk: boolean;
  yesItems: { id: string; text: string }[];
  checkedDiseases: string[];
  surpriseAnswer: string;
} {
  let yesCount = 0;
  const yesItems: { id: string; text: string }[] = [];
  for (const q of SPICT_QUESTIONS) {
    if (Number(answers[q.id]) === 1) {
      yesCount++;
      yesItems.push({ id: q.id, text: q.text });
    }
  }
  const checkedDiseases = (answers['spict-diseases'] as string[]) || [];
  const surpriseAnswer = (answers['spict-surprise'] as string) || '';
  const isHighRisk = yesCount >= 8 || surpriseAnswer === 'no';
  let riskCategory = 'Risiko Rendah';
  if (yesCount >= 8 || surpriseAnswer === 'no') riskCategory = 'Risiko Sangat Tinggi';
  else if (yesCount >= 6) riskCategory = 'Risiko Tinggi';
  else if (yesCount >= 3) riskCategory = 'Risiko Sedang';
  return { yesCount, riskCategory, isHighRisk, yesItems, checkedDiseases, surpriseAnswer };
}

export function calcPPS(answers: Record<string, number | string | string[]>): {
  pps: number;
  categoryAnswers: Record<string, number>;
  extraYesCount: number;
  dimensionDetails: { id: string; title: string; score: number; label: string }[];
} {
  let total = 0;
  const dimensionDetails: { id: string; title: string; score: number; label: string }[] = [];
  const categoryAnswers: Record<string, number> = {};
  for (const q of PPS_QUESTIONS) {
    const score = Number(answers[q.id]) || 0;
    total += score;
    categoryAnswers[q.id] = score;
    const selectedOption = q.options.find(o => o.score === score);
    dimensionDetails.push({ id: q.id, title: q.title, score, label: selectedOption?.text || '-' });
  }
  const pps = Math.round(total / 5);
  let extraYesCount = 0;
  for (let i = 0; i < PPS_EXTRA_QUESTIONS.length; i++) {
    if (Number(answers[`pps-extra-${i}`]) === 1) extraYesCount++;
  }
  return { pps, categoryAnswers, extraYesCount, dimensionDetails };
}

export function calcZarit(answers: Record<string, number | string | string[]>): {
  total: number;
  category: string;
  needReferral: boolean;
} {
  let total = 0;
  for (let i = 0; i < 22; i++) {
    total += Number(answers[`zarit-${i}`]) || 0;
  }
  let category = 'Ringan';
  let needReferral = false;
  if (total >= 61) { category = 'Berat Sekali'; needReferral = true; }
  else if (total >= 41) { category = 'Berat'; needReferral = true; }
  else if (total >= 21) { category = 'Sedang'; }
  return { total, category, needReferral };
}

export function calcEORTC(answers: Record<string, number | string | string[]>): {
  physicalFunction: number;
  symptomBurden: number;
  globalQol: number;
} {
  let pfSum = 0;
  for (let i = 0; i < 7; i++) {
    const raw = Number(answers[`eortc-q${i + 1}`]) || 1;
    pfSum += (raw - 1) / 3 * 100;
  }
  const physicalFunction = Math.round(100 - pfSum / 7);

  let sbSum = 0;
  for (let i = 7; i < 14; i++) {
    const raw = Number(answers[`eortc-q${i + 1}`]) || 1;
    sbSum += (raw - 1) / 3 * 100;
  }
  const symptomBurden = Math.round(sbSum / 7);

  const q15Raw = Number(answers['eortc-q15']) || 1;
  const globalQol = Math.round((q15Raw - 1) / 6 * 100);

  return { physicalFunction, symptomBurden, globalQol };
}

// ── EWS Level Determination ────────────────────────────────────────────────

export function getEwsLevel(tool: PalliativeToolType, answers: Record<string, number | string | string[]>): PalliativeEwsLevel {
  switch (tool) {
    case 'esas': {
      const { maxSymptom } = calcESAS(answers);
      if (maxSymptom >= 7) return 'merah';
      if (maxSymptom >= 4) return 'kuning';
      return 'hijau';
    }
    case 'distress': {
      const { score } = calcDistress(answers);
      if (score >= 7) return 'merah';
      if (score >= 4) return 'kuning';
      return 'hijau';
    }
    case 'spict': {
      const { yesCount, surpriseAnswer } = calcSPICT(answers);
      if (yesCount >= 8 || surpriseAnswer === 'no') return 'merah';
      if (yesCount >= 6) return 'merah';
      if (yesCount >= 3) return 'kuning';
      return 'hijau';
    }
    case 'pps': {
      const { pps, extraYesCount } = calcPPS(answers);
      if (pps <= 30 || extraYesCount >= 3) return 'merah';
      if (pps <= 60 || extraYesCount >= 2) return 'kuning';
      return 'hijau';
    }
    case 'zarit': {
      const { total } = calcZarit(answers);
      if (total >= 61) return 'merah';
      if (total >= 21) return 'kuning';
      return 'hijau';
    }
    case 'eortc': {
      const { globalQol } = calcEORTC(answers);
      if (globalQol < 40) return 'merah';
      if (globalQol < 60) return 'kuning';
      return 'hijau';
    }
  }
}

// ── Score & Interpretation ─────────────────────────────────────────────────

export interface ScreeningScoreResult {
  score: number;
  scoreLabel: string;
  interpretation: string;
  ewsLevel: PalliativeEwsLevel;
  details: Record<string, unknown>;
}

export function calculateScreeningResult(tool: PalliativeToolType, answers: Record<string, number | string | string[]>): ScreeningScoreResult {
  let score = 0;
  let scoreLabel = '';
  let interpretation = '';
  let details: Record<string, unknown> = {};

  switch (tool) {
    case 'esas': {
      const r = calcESAS(answers);
      score = r.total;
      scoreLabel = `${r.total}/90`;
      const maxItem = r.items.reduce((a, b) => a.value > b.value ? a : b);
      interpretation = `Skor total ${r.total}/90. Gejala terberat: ${maxItem.label} (${maxItem.value}/10). `;
      if (r.maxSymptom >= 7) interpretation += 'Gejala berat terdeteksi, memerlukan manajemen intensif.';
      else if (r.maxSymptom >= 4) interpretation += 'Gejala sedang, perlu evaluasi dan intervensi.';
      else interpretation += 'Gejala terkontrol, lanjutkan monitoring.';
      details = { items: r.items, maxSymptom: r.maxSymptom };
      break;
    }
    case 'distress': {
      const r = calcDistress(answers);
      score = r.score;
      scoreLabel = `${r.score}/10`;
      interpretation = `Skor distress ${r.score}/10. `;
      if (r.score >= 7) interpretation += 'Distress berat, memerlukan intervensi psikologis segera.';
      else if (r.score >= 4) interpretation += 'Distress sedang, pertimbangkan dukungan psikososial.';
      else interpretation += 'Distress ringan, dukungan supportif.';
      if (Object.keys(r.problems).length > 0) {
        interpretation += ` Masalah teridentifikasi: ${Object.entries(r.problems).map(([k, v]) => `${k} (${v.length})`).join(', ')}.`;
      }
      details = { problems: r.problems };
      break;
    }
    case 'spict': {
      const r = calcSPICT(answers);
      score = r.yesCount;
      scoreLabel = `${r.yesCount} poin — ${r.riskCategory}`;
      interpretation = `SPICT: ${r.yesCount} indikator terdeteksi (${r.riskCategory}). `;
      if (r.yesCount >= 8 || r.surpriseAnswer === 'no') interpretation += 'Sangat disarankan evaluasi paliatif komprehensif, home care, dan diskusi Advance Care Planning (ACP).';
      else if (r.yesCount >= 6) interpretation += 'Pasien berpotensi membutuhkan layanan paliatif. Disarankan penilaian oleh dokter atau tim paliatif.';
      else if (r.yesCount >= 3) interpretation += 'Pertimbangkan konsultasi paliatif. Lakukan evaluasi gejala lebih lanjut.';
      else interpretation += 'Belum menunjukkan kebutuhan paliatif yang jelas. Lanjutkan kontrol rutin.';
      if (r.surpriseAnswer === 'no') interpretation += ' Surprise Question negatif — disarankan segera diskusi Advance Care Planning.';
      details = { yesCount: r.yesCount, riskCategory: r.riskCategory, yesItems: r.yesItems, checkedDiseases: r.checkedDiseases, surpriseAnswer: r.surpriseAnswer };
      break;
    }
    case 'pps': {
      const r = calcPPS(answers);
      score = r.pps;
      scoreLabel = `PPS ${r.pps}%`;
      interpretation = `PPS ${r.pps}%. `;
      if (r.pps >= 80) interpretation += 'Kondisi baik. Masih cukup mandiri. Kontrol rutin telemedicine.';
      else if (r.pps >= 60) interpretation += 'Kondisi mulai menurun. Memerlukan pemantauan lebih sering. Pertimbangkan kunjungan home care.';
      else if (r.pps >= 40) interpretation += 'Ketergantungan sedang-berat. Home care rutin. Evaluasi kebutuhan paliatif.';
      else interpretation += 'Kondisi sangat berat. Perawatan intensif di rumah. Pertimbangkan Advance Care Planning.';
      if (r.extraYesCount >= 3) interpretation += ` Alert: ${r.extraYesCount} indikator perburukan terdeteksi. Disarankan segera konsultasi dokter paliatif.`;
      details = { pps: r.pps, dimensionDetails: r.dimensionDetails, extraYesCount: r.extraYesCount, categoryAnswers: r.categoryAnswers };
      break;
    }
    case 'zarit': {
      const r = calcZarit(answers);
      score = r.total;
      scoreLabel = `${r.total}/88`;
      interpretation = `Skor beban pengasuh ${r.total}/88 (${r.category}). `;
      if (r.needReferral) interpretation += 'Rekomendasi: rujuk ke psikolog/psikiater untuk dukungan pengasuh.';
      else interpretation += 'Dukungan edukasi dan dukungan kelompok pengasuh diperlukan.';
      details = { category: r.category, needReferral: r.needReferral };
      break;
    }
    case 'eortc': {
      const r = calcEORTC(answers);
      score = r.globalQol;
      scoreLabel = `QoL ${r.globalQol}%`;
      interpretation = `Fungsi Fisik: ${r.physicalFunction}%, Beban Gejala: ${r.symptomBurden}%, Kualitas Hidup Global: ${r.globalQol}%. `;
      if (r.globalQol < 40) interpretation += 'Kualitas hidup sangat rendah, intervensi paliatif intensif diperlukan.';
      else if (r.globalQol < 60) interpretation += 'Kualitas hidup menurun, evaluasi dan intervensi gejala diperlukan.';
      else interpretation += 'Kualitas hidup cukup baik, lanjutkan manajemen gejala.';
      details = { physicalFunction: r.physicalFunction, symptomBurden: r.symptomBurden, globalQol: r.globalQol };
      break;
    }
  }

  const ewsLevel = getEwsLevel(tool, answers);
  return { score, scoreLabel, interpretation, ewsLevel, details };
}

// ── Utility ────────────────────────────────────────────────────────────────

export function vasColor(value: number): string {
  if (value <= 3) return 'text-emerald-600';
  if (value <= 6) return 'text-amber-600';
  return 'text-red-600';
}

export function vasBg(value: number): string {
  if (value <= 3) return 'bg-emerald-500';
  if (value <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

export function getEwsBadge(level: PalliativeEwsLevel): { label: string; color: string; bg: string } {
  switch (level) {
    case 'merah': return { label: 'Kritis', color: 'text-red-700', bg: 'bg-red-100 border-red-300' };
    case 'kuning': return { label: 'Perhatian', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' };
    case 'hijau': return { label: 'Normal', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };
  }
}

export function getToolLabel(type: PalliativeToolType): string {
  return TOOL_META[type].name;
}

export function getToolCategory(type: PalliativeToolType): string {
  const map: Record<PalliativeToolType, string> = {
    pps: 'Performance Status',
    esas: 'Gejala',
    distress: 'Distres Emosional',
    spict: 'Kebutuhan Paliatif',
    zarit: 'Beban Perawatan Keluarga',
    eortc: 'Kualitas Hidup',
  };
  return map[type];
}
