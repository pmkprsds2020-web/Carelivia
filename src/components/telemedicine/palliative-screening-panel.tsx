'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { PalliativeScreeningForm, PalliativeToolType, ScreeningStatus, PalliativePatientInfo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart3,
  Thermometer,
  Heart,
  Activity,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  ClipboardCheck,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────

type ToolType = PalliativeToolType;

interface ScreeningResult {
  id: string;
  tool: ToolType;
  toolName: string;
  patientId: string;
  patientName: string;
  score: number;
  scoreLabel: string;
  interpretation: string;
  ewsLevel: 'merah' | 'kuning' | 'hijau';
  details: Record<string, unknown>;
  savedAt: string;
}

// ── Tool Definitions ─────────────────────────────────────────────────────

const TOOL_DEFS: Record<ToolType, {
  name: string;
  icon: React.ReactNode;
  description: string;
  items: string;
  scale: string;
  totalSteps: number; // excluding result step
}> = {
  esas: {
    name: 'ESAS-r',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Edmonton Symptom Assessment System Revised — 9 gejala dengan skala VAS 0-10',
    items: '9 item',
    scale: '0-10 VAS per item, total 0-90',
    totalSteps: 1,
  },
  distress: {
    name: 'Distress Thermometer',
    icon: <Thermometer className="w-6 h-6" />,
    description: 'NCCN Distress Thermometer — Skor tekanan + daftar masalah 5 kategori',
    items: '1 slider + 26 masalah',
    scale: '0-10 + Problem List',
    totalSteps: 6,
  },
  spict: {
    name: 'Skrining Kebutuhan Perawatan Paliatif (SPICT)',
    icon: <ClipboardList className="w-6 h-6" />,
    description: 'Alat bantu identifikasi pasien yang mungkin memerlukan penilaian paliatif',
    items: '15 pertanyaan + penyakit kronis + surprise question',
    scale: '0-15 poin (4 kategori risiko)',
    totalSteps: 3,
  },
  pps: {
    name: 'Skrining Kondisi Pasien (PPS)',
    icon: <Activity className="w-6 h-6" />,
    description: 'Palliative Performance Scale — 5 dimensi kondisi pasien dengan pertanyaan tambahan',
    items: '5 dimensi + 5 pertanyaan tambahan',
    scale: 'PPS % (rata-rata 5 dimensi)',
    totalSteps: 2,
  },
  zarit: {
    name: 'Zarit Caregiver Burden',
    icon: <Users className="w-6 h-6" />,
    description: 'Zarit Caregiver Burden Interview — Beban pengasuh 22 pertanyaan',
    items: '22 pertanyaan',
    scale: '0-88 (4 kategori)',
    totalSteps: 4,
  },
  eortc: {
    name: 'EORTC QLQ-C15-PAL',
    icon: <Heart className="w-6 h-6" />,
    description: 'Quality of Life Questionnaire — 15 item kualitas hidup paliatif',
    items: '15 item',
    scale: '3 skor % (PF, SB, QoL)',
    totalSteps: 3,
  },
};

// ── ESAS-r Data ──────────────────────────────────────────────────────────

const ESAS_ITEMS = [
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

// ── Distress Thermometer Data ────────────────────────────────────────────

const DT_PROBLEMS: { category: string; step: number; items: string[] }[] = [
  { category: 'Praktis', step: 2, items: ['Masalah tempat tinggal', 'Masalah asuransi/biaya', 'Transportasi', 'Pekerjaan', 'Masalah kebersihan'] },
  { category: 'Keluarga', step: 3, items: ['Mengurus anak', 'Kemampuan mengurus keluarga', 'Hubungan dengan pasangan/keluarga'] },
  { category: 'Emosional', step: 4, items: ['Kecemasan', 'Depresi', 'Ketakutan', 'Kesedihan/gangguan berkabung', 'Kehilangan minat'] },
  { category: 'Spiritual', step: 5, items: ['Kehilangan keyakinan', 'Berkaitan dengan kematian', 'Berkaitan dengan makna hidup'] },
  { category: 'Fisik', step: 6, items: ['Nyeri', 'Mual', 'Sesak napas', 'Kelelahan', 'Gangguan tidur', 'Sembelit', 'Diare', 'Perubahan nafsu makan', 'Mulut kering', 'Gangguan pencernaan'] },
];

// ── SPICT Data ───────────────────────────────────────────────────────────

const SPICT_QUESTIONS = [
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

const SPICT_DISEASES = [
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

// ── PPS Data ─────────────────────────────────────────────────────────────

const PPS_QUESTIONS = [
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

const PPS_EXTRA_QUESTIONS = [
  'Apakah kondisi pasien memburuk dibanding bulan lalu?',
  'Apakah pasien pernah jatuh dalam 1 bulan terakhir?',
  'Apakah pasien mengalami penurunan berat badan?',
  'Apakah pasien lebih banyak tidur dibanding biasanya?',
  'Apakah keluarga merasa pasien membutuhkan bantuan lebih banyak?',
];

// ── Zarit Data ───────────────────────────────────────────────────────────

const ZARIT_QUESTIONS = [
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

const ZARIT_OPTIONS = [
  { label: 'Tidak pernah', value: 0 },
  { label: 'Jarang', value: 1 },
  { label: 'Kadang-kadang', value: 2 },
  { label: 'Cukup sering', value: 3 },
  { label: 'Hampir selalu', value: 4 },
];

// ── EORTC QLQ-C15-PAL Data ──────────────────────────────────────────────

const EORTC_QUESTIONS: { id: string; text: string; section: 'physical' | 'symptom' | 'qol' }[] = [
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

const EORTC_OPTIONS_4 = [
  { label: 'Tidak sama sekali', value: 1 },
  { label: 'Sedikit', value: 2 },
  { label: 'Cukup banyak', value: 3 },
  { label: 'Sangat banyak', value: 4 },
];

// ── Helper Functions ─────────────────────────────────────────────────────

function generateId(): string {
  return `sk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function vasColor(value: number): string {
  if (value <= 3) return 'text-emerald-600';
  if (value <= 6) return 'text-amber-600';
  return 'text-red-600';
}

function vasBg(value: number): string {
  if (value <= 3) return 'bg-emerald-500';
  if (value <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function getEwsBadge(level: 'merah' | 'kuning' | 'hijau'): { label: string; color: string; bg: string } {
  switch (level) {
    case 'merah': return { label: 'Kritis', color: 'text-red-700', bg: 'bg-red-100 border-red-300' };
    case 'kuning': return { label: 'Perhatian', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' };
    case 'hijau': return { label: 'Normal', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };
  }
}

// ── Main Component ───────────────────────────────────────────────────────

export function PalliativeScreeningPanel() {
  const {
    currentUser, consultations, doctors,
    palliativeScreeningForms, addPalliativeScreeningForm, updatePalliativeScreeningForm,
    activePalliativeFormId, setActivePalliativeFormId,
    palliativePatients,
    palliativeScreeningRecords, addPalliativeScreeningRecord,
    screeningNavigationFrom, setScreeningNavigationFrom,
    screeningPreselectedPatientId, setScreeningPreselectedPatientId,
    setActivePanel,
    addPalliativeAuditEntry,
  } = useStore();
  const { toast } = useToast();

  const isDoctor = currentUser?.role === 'doctor';
  const isPatient = currentUser?.role === 'patient';

  // ── State ──
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | string | string[]>>({});
  const [detailResult, setDetailResult] = useState<ScreeningResult | null>(null);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  // ── Navigation from Monitoring Paliatif ──
  const isNavigatedFromMonitoring = screeningNavigationFrom === 'monitoring';

  // Compute effective patient ID from navigation state
  const navigatedPatientId = useMemo((): string => {
    if (!isNavigatedFromMonitoring || !screeningPreselectedPatientId) return '';
    const palliativePatient = palliativePatients.find(p => p.id === screeningPreselectedPatientId);
    if (!palliativePatient) return screeningPreselectedPatientId;
    // Try to find matching consultation patient
    const consultationPatient = consultations.find(c =>
      c.patient && (c.patient.name === palliativePatient.patientName || c.patientId === palliativePatient.patientId)
    );
    if (consultationPatient?.patient) {
      return consultationPatient.patient.id;
    }
    // Use palliative patient's own ID or fallback
    return palliativePatient.id;
  }, [isNavigatedFromMonitoring, screeningPreselectedPatientId, palliativePatients, consultations]);

  // Get the palliative patient info for auto-fill when navigated from monitoring
  const navigatedPalliativePatient = useMemo((): PalliativePatientInfo | null => {
    if (!isNavigatedFromMonitoring || !screeningPreselectedPatientId) return null;
    return palliativePatients.find(p => p.id === screeningPreselectedPatientId) || null;
  }, [isNavigatedFromMonitoring, screeningPreselectedPatientId, palliativePatients]);

  // ── Effective patient ID (auto-select for patients, or from navigation) ──
  const effectivePatientId = useMemo(() => {
    if (isPatient && currentUser) return currentUser.id;
    // If navigated from monitoring, use the computed patient ID
    if (isNavigatedFromMonitoring && navigatedPatientId) {
      return selectedPatientId || navigatedPatientId;
    }
    return selectedPatientId;
  }, [isPatient, currentUser, isNavigatedFromMonitoring, navigatedPatientId, selectedPatientId]);

  // ── Effective active form ID (auto-open from store) ──
  const effectiveActiveFormId = useMemo(() => {
    if (activePalliativeFormId && isPatient) return activePalliativeFormId;
    return activeFormId;
  }, [activePalliativeFormId, isPatient, activeFormId]);

  // ── Patients List ──
  const patients = useMemo(() => {
    if (isDoctor) {
      // Doctor sees patients from consultations
      const patientIds = new Set(consultations.map(c => c.patientId));
      const patientUsers = consultations
        .filter(c => c.patient)
        .map(c => c.patient!)
        .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
      return patientUsers;
    }
    if (isPatient && currentUser) {
      return [currentUser];
    }
    return [];
  }, [consultations, isDoctor, isPatient, currentUser]);

  const selectedPatient = useMemo(() => {
    if (!effectivePatientId) return null;
    // First check consultation patients
    const consultationPatient = patients.find(p => p.id === effectivePatientId);
    if (consultationPatient) return consultationPatient;
    // When navigated from monitoring, check palliative patients too
    if (isNavigatedFromMonitoring) {
      const palliativePatient = palliativePatients.find(p => p.id === effectivePatientId);
      if (palliativePatient) {
        // Create a pseudo-user object from palliative patient info
        return {
          id: palliativePatient.id,
          name: palliativePatient.patientName || 'Pasien Paliatif',
          email: '',
          role: 'patient' as const,
          phone: palliativePatient.familyContactPhone || '',
          avatarUrl: '',
        };
      }
    }
    return null;
  }, [effectivePatientId, patients, isNavigatedFromMonitoring, palliativePatients]);

  // ── Mark form as opened when it becomes active ──
  useEffect(() => {
    if (activePalliativeFormId && isPatient) {
      const form = palliativeScreeningForms.find(f => f.id === activePalliativeFormId);
      if (form && form.status === 'sent') {
        updatePalliativeScreeningForm(activePalliativeFormId, { status: 'opened' });
      }
    }
  }, [activePalliativeFormId, isPatient, palliativeScreeningForms, updatePalliativeScreeningForm]);

  // ── Active form for patient filling ──
  const activeForm = useMemo(() => {
    if (!effectiveActiveFormId) return null;
    return palliativeScreeningForms.find(f => f.id === effectiveActiveFormId) || null;
  }, [effectiveActiveFormId, palliativeScreeningForms]);

  // ── Patient's forms from store ──
  const patientForms = useMemo(() => {
    if (!currentUser) return [];
    if (isPatient) {
      return palliativeScreeningForms.filter(f => f.patientId === currentUser.id);
    }
    if (isDoctor) {
      return palliativeScreeningForms;
    }
    return [];
  }, [currentUser, isPatient, isDoctor, palliativeScreeningForms]);

  // ── Build screening history from store ──
  const screeningHistory = useMemo(() => {
    const results: ScreeningResult[] = [];
    for (const form of palliativeScreeningForms) {
      const patient = consultations
        .filter(c => c.patientId === form.patientId && c.patient)
        .map(c => c.patient!)[0];
      const patientName = patient?.name || (currentUser?.id === form.patientId ? currentUser.name : 'Pasien');
      for (const [toolKey, toolResult] of Object.entries(form.toolResults) as [string, { score: number; scoreLabel: string; interpretation: string; ewsLevel: 'merah' | 'kuning' | 'hijau'; details: Record<string, unknown> }][]) {
        const tool = toolKey as ToolType;
        if (!TOOL_DEFS[tool]) continue;
        results.push({
          id: `${form.id}-${tool}`,
          tool,
          toolName: TOOL_DEFS[tool].name,
          patientId: form.patientId,
          patientName,
          score: toolResult.score,
          scoreLabel: toolResult.scoreLabel,
          interpretation: toolResult.interpretation,
          ewsLevel: toolResult.ewsLevel,
          details: toolResult.details,
          savedAt: form.updatedAt,
        });
      }
    }
    return results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [palliativeScreeningForms, consultations, currentUser]);

  // ── Tool Step Info ──
  const toolSteps = useMemo(() => {
    if (!activeTool) return 0;
    return TOOL_DEFS[activeTool].totalSteps;
  }, [activeTool]);

  // ── Computed progress ──
  const progressPercent = useMemo(() => {
    if (showResult) return 100;
    if (toolSteps === 0) return 0;
    return Math.round((currentStep / (toolSteps + 1)) * 100); // +1 for result step
  }, [currentStep, toolSteps, showResult]);

  // ── Handlers ──
  const handleStartTool = useCallback((tool: ToolType) => {
    if (!effectivePatientId && isDoctor) {
      toast({ title: 'Pilih Pasien', description: 'Silakan pilih pasien terlebih dahulu sebelum memulai skrining.' });
      return;
    }
    setActiveTool(tool);
    setCurrentStep(0);
    setShowResult(false);
    // Pre-fill answers from store form if patient is resuming
    if (effectiveActiveFormId && isPatient) {
      const form = palliativeScreeningForms.find(f => f.id === effectiveActiveFormId);
      if (form && Object.keys(form.toolAnswers).length > 0) {
        setAnswers({ ...form.toolAnswers });
      } else {
        setAnswers({});
      }
    } else {
      setAnswers({});
    }
    setModalOpen(true);
  }, [effectivePatientId, isDoctor, isPatient, effectiveActiveFormId, palliativeScreeningForms, toast]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setActiveTool(null);
    setCurrentStep(0);
    setShowResult(false);
    // Don't reset answers so user can resume if needed
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < toolSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  }, [currentStep, toolSteps]);

  const handlePrev = useCallback(() => {
    if (showResult) {
      setShowResult(false);
    } else if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, showResult]);

  const setAnswer = useCallback((key: string, value: number | string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleCheck = useCallback((key: string, item: string) => {
    setAnswers(prev => {
      const current = (prev[key] as string[]) || [];
      const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
      return { ...prev, [key]: next };
    });
  }, []);

  const isChecked = useCallback((key: string, item: string): boolean => {
    return ((answers[key] as string[]) || []).includes(item);
  }, [answers]);

  // ── Scoring Functions ──

  const calcESAS = useCallback((): { total: number; maxSymptom: number; items: { label: string; value: number }[] } => {
    const items = ESAS_ITEMS.map(item => ({
      label: item.label,
      value: Number(answers[item.id]) || 0,
    }));
    const total = items.reduce((s, i) => s + i.value, 0);
    const maxSymptom = Math.max(...items.map(i => i.value));
    return { total, maxSymptom, items };
  }, [answers]);

  const calcDistress = useCallback((): { score: number; problems: Record<string, string[]> } => {
    const score = Number(answers['dt-score']) || 0;
    const problems: Record<string, string[]> = {};
    for (const cat of DT_PROBLEMS) {
      const checked = (answers[`dt-${cat.category}`] as string[]) || [];
      if (checked.length > 0) problems[cat.category] = checked;
    }
    return { score, problems };
  }, [answers]);

  const calcSPICT = useCallback((): { yesCount: number; riskCategory: string; isHighRisk: boolean; yesItems: { id: string; text: string }[]; checkedDiseases: string[]; surpriseAnswer: string } => {
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
  }, [answers]);

  const calcPPS = useCallback((): { pps: number; categoryAnswers: Record<string, number>; extraYesCount: number; dimensionDetails: { id: string; title: string; score: number; label: string }[] } => {
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
  }, [answers]);

  const calcZarit = useCallback((): { total: number; category: string; needReferral: boolean } => {
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
  }, [answers]);

  const calcEORTC = useCallback((): { physicalFunction: number; symptomBurden: number; globalQol: number } => {
    // Physical Function: Q1-Q7 (invert: higher raw = worse, so we invert for PF score)
    // EORTC scoring: RS = (raw - 1)/3 * 100 for 4-point items
    // PF: average of Q1-Q7 RS, then PF = 100 - RS (higher = better)
    let pfSum = 0;
    for (let i = 0; i < 7; i++) {
      const raw = Number(answers[`eortc-q${i + 1}`]) || 1;
      pfSum += (raw - 1) / 3 * 100;
    }
    const physicalFunction = Math.round(100 - pfSum / 7);

    // Symptom Burden: Q8-Q14 (higher = worse)
    let sbSum = 0;
    for (let i = 7; i < 14; i++) {
      const raw = Number(answers[`eortc-q${i + 1}`]) || 1;
      sbSum += (raw - 1) / 3 * 100;
    }
    const symptomBurden = Math.round(sbSum / 7);

    // Global QoL: Q15 (1-7 scale)
    const q15Raw = Number(answers['eortc-q15']) || 1;
    const globalQol = Math.round((q15Raw - 1) / 6 * 100);

    return { physicalFunction, symptomBurden, globalQol };
  }, [answers]);

  // ── EWS Level Determination ──

  const getEwsLevel = useCallback((tool: ToolType): 'merah' | 'kuning' | 'hijau' => {
    switch (tool) {
      case 'esas': {
        const { maxSymptom } = calcESAS();
        if (maxSymptom >= 7) return 'merah';
        if (maxSymptom >= 4) return 'kuning';
        return 'hijau';
      }
      case 'distress': {
        const { score } = calcDistress();
        if (score >= 7) return 'merah';
        if (score >= 4) return 'kuning';
        return 'hijau';
      }
      case 'spict': {
        const { yesCount, surpriseAnswer } = calcSPICT();
        if (yesCount >= 8 || surpriseAnswer === 'no') return 'merah';
        if (yesCount >= 6) return 'merah';
        if (yesCount >= 3) return 'kuning';
        return 'hijau';
      }
      case 'pps': {
        const { pps, extraYesCount } = calcPPS();
        if (pps <= 30 || extraYesCount >= 3) return 'merah';
        if (pps <= 60 || extraYesCount >= 2) return 'kuning';
        return 'hijau';
      }
      case 'zarit': {
        const { total } = calcZarit();
        if (total >= 61) return 'merah';
        if (total >= 21) return 'kuning';
        return 'hijau';
      }
      case 'eortc': {
        const { globalQol } = calcEORTC();
        if (globalQol < 40) return 'merah';
        if (globalQol < 60) return 'kuning';
        return 'hijau';
      }
    }
  }, [calcESAS, calcDistress, calcSPICT, calcPPS, calcZarit, calcEORTC]);

  // ── Save Result ──

  const handleSaveResult = useCallback(() => {
    if (!activeTool || !effectivePatientId) return;

    let score = 0;
    let scoreLabel = '';
    let interpretation = '';
    let details: Record<string, unknown> = {};

    switch (activeTool) {
      case 'esas': {
        const r = calcESAS();
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
        const r = calcDistress();
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
        const r = calcSPICT();
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
        const r = calcPPS();
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
        const r = calcZarit();
        score = r.total;
        scoreLabel = `${r.total}/88`;
        interpretation = `Skor beban pengasuh ${r.total}/88 (${r.category}). `;
        if (r.needReferral) interpretation += 'Rekomendasi: rujuk ke psikolog/psikiater untuk dukungan pengasuh.';
        else interpretation += 'Dukungan edukasi dan dukungan kelompok pengasuh diperlukan.';
        details = { category: r.category, needReferral: r.needReferral };
        break;
      }
      case 'eortc': {
        const r = calcEORTC();
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

    const ewsLevel = getEwsLevel(activeTool);

    // Update store form
    if (effectiveActiveFormId) {
      // Patient or doctor filling an existing form
      const form = palliativeScreeningForms.find(f => f.id === effectiveActiveFormId);
      if (form) {
        const updatedToolResults = { ...form.toolResults, [activeTool]: { score, scoreLabel, interpretation, ewsLevel, details } };
        const updatedToolAnswers = { ...form.toolAnswers, ...answers };
        // Check if all selected tools have results
        const allToolsCompleted = form.selectedTools.every(t => updatedToolResults[t] !== undefined);
        const newStatus: ScreeningStatus = allToolsCompleted ? 'completed' : 'in_progress';
        const updateData: Partial<PalliativeScreeningForm> = {
          toolResults: updatedToolResults,
          toolAnswers: updatedToolAnswers,
          status: newStatus,
        };
        if (allToolsCompleted) {
          updateData.completedAt = new Date().toISOString();
        }
        updatePalliativeScreeningForm(effectiveActiveFormId, updateData);
      }
    } else if (isDoctor && effectivePatientId) {
      // Doctor screening directly - create a form entry in the store
      const newForm: PalliativeScreeningForm = {
        id: generateId(),
        consultationId: consultations.find(c => c.patientId === effectivePatientId)?.id || '',
        doctorId: currentUser?.id || '',
        patientId: effectivePatientId,
        status: 'completed',
        selectedTools: [activeTool],
        toolAnswers: { ...answers },
        toolResults: { [activeTool]: { score, scoreLabel, interpretation, ewsLevel, details } } as Record<ToolType, { score: number; scoreLabel: string; interpretation: string; ewsLevel: 'merah' | 'kuning' | 'hijau'; details: Record<string, unknown> }>,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addPalliativeScreeningForm(newForm);
    }

    toast({ title: 'Hasil Disimpan', description: `Hasil ${TOOL_DEFS[activeTool].name} berhasil disimpan ke RME.` });

    // Also save to PalliativeScreeningRecords for integration with Monitoring Paliatif
    if (navigatedPalliativePatient) {
      const record = {
        id: `psr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        palliativePatientId: navigatedPalliativePatient.id,
        screeningType: activeTool,
        score,
        scoreLabel,
        interpretation,
        ewsLevel,
        details: JSON.stringify(details),
        performedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      addPalliativeScreeningRecord(record);

      // Add audit entry
      if (addPalliativeAuditEntry) {
        addPalliativeAuditEntry({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          patientId: navigatedPalliativePatient.id,
          action: 'clinical_action',
          performedBy: currentUser?.name || 'Dokter',
          performedByRole: 'doctor',
          details: `Skrining ${TOOL_DEFS[activeTool].name} selesai. Skor: ${scoreLabel}. ${interpretation}`,
          createdAt: new Date().toISOString(),
        });
      }

      toast({ title: 'Tersimpan di Monitoring Paliatif', description: `Hasil skrining juga tersimpan di Riwayat Skrining pasien pada Modul Monitoring Paliatif.` });
    }

    handleCloseModal();
  }, [activeTool, effectivePatientId, selectedPatient, effectiveActiveFormId, palliativeScreeningForms, isDoctor, currentUser, consultations, answers, calcESAS, calcDistress, calcSPICT, calcPPS, calcZarit, calcEORTC, getEwsLevel, handleCloseModal, toast, updatePalliativeScreeningForm, addPalliativeScreeningForm, navigatedPalliativePatient, addPalliativeScreeningRecord, addPalliativeAuditEntry]);

  // ── VAS Slider Component ──
  const renderVasSlider = (id: string, label: string) => {
    const value = Number(answers[id]) || 0;
    return (
      <div key={id} className="space-y-2 py-3 border-b border-border last:border-b-0">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          <span className={cn('text-2xl font-bold tabular-nums', vasColor(value))}>
            {value}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setAnswer(id, Number(e.target.value))}
            className="sk-vas-slider w-full"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #f59e0b 40%, #ef4444 70%, #dc2626 100%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-emerald-600">0</span>
            <span className="text-[10px] text-amber-600">5</span>
            <span className="text-[10px] text-red-600">10</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Step Renderers ──

  const renderStep = (): React.ReactNode => {
    if (!activeTool) return null;

    if (showResult) return renderResult();

    switch (activeTool) {
      case 'esas': return renderESAS();
      case 'distress': return renderDistress();
      case 'spict': return renderSPICT();
      case 'pps': return renderPPS();
      case 'zarit': return renderZarit();
      case 'eortc': return renderEORTC();
    }
  };

  // ── ESAS Step ──
  const renderESAS = () => (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-4">
        Berikan skor 0 (tidak ada gejala) sampai 10 (gejala terburuk) untuk setiap item berikut:
      </p>
      {ESAS_ITEMS.map(item => renderVasSlider(item.id, item.label))}
      <div className="mt-4 p-3 rounded-lg bg-muted/50">
        <p className="text-sm font-medium text-foreground">
          Skor Total: <span className={cn('text-lg font-bold', vasColor(calcESAS().total > 27 ? 7 : calcESAS().total > 18 ? 4 : 0))}>
            {calcESAS().total}/90
          </span>
        </p>
      </div>
    </div>
  );

  // ── Distress Thermometer Steps ──
  const renderDistress = () => {
    if (currentStep === 0) {
      const value = Number(answers['dt-score']) || 0;
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">
            Pilih angka yang paling menggambarkan tingkat tekanan/stres Anda selama 1 minggu terakhir:
          </p>
          <div className="text-center">
            <span className={cn('text-6xl font-black', vasColor(value))}>{value}</span>
            <p className="text-sm text-muted-foreground mt-2">dari 10</p>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setAnswer('dt-score', Number(e.target.value))}
            className="sk-vas-slider w-full"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #f59e0b 40%, #ef4444 70%, #dc2626 100%)`,
            }}
          />
          <div className="flex justify-between">
            <span className="text-xs text-emerald-600">Tidak ada tekanan</span>
            <span className="text-xs text-red-600">Tekanan sangat berat</span>
          </div>
        </div>
      );
    }

    // Problem list steps
    const catIdx = currentStep - 1;
    const cat = DT_PROBLEMS[catIdx];
    if (!cat) return null;

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          Centang masalah yang Anda alami dalam kategori <strong>{cat.category}</strong>:
        </p>
        {cat.items.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-3 py-1.5">
            <Checkbox
              id={`dt-${cat.category}-${idx}`}
              checked={isChecked(`dt-${cat.category}`, item)}
              onCheckedChange={() => toggleCheck(`dt-${cat.category}`, item)}
            />
            <Label htmlFor={`dt-${cat.category}-${idx}`} className="text-sm font-normal cursor-pointer">
              {item}
            </Label>
          </div>
        ))}
      </div>
    );
  };

  // ── SPICT Steps ──
  const renderSPICT = () => {
    if (currentStep === 0) {
      // Step 1: 15 Yes/No questions
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground italic mb-2">
            Alat bantu ini digunakan untuk mengidentifikasi pasien yang mungkin memerlukan penilaian paliatif. Ini bukan diagnosis medis.
          </p>
          {SPICT_QUESTIONS.map((q, idx) => {
            const currentVal = answers[q.id] as number | undefined;
            const questionNum = idx + 1;
            return (
              <div key={q.id} className="border-b border-border pb-4 last:border-b-0">
                <p className="text-sm font-semibold text-foreground mb-1">
                  {questionNum}. {q.text}
                </p>
                <p className="text-xs text-muted-foreground italic mb-3 underline decoration-primary/20 decoration-1">
                  {q.help}
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAnswer(q.id, 1); }}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      currentVal === 1
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-card text-foreground border-border hover:border-red-300',
                    )}
                  >
                    Ya
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAnswer(q.id, 0); }}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                      currentVal === 0
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-card text-foreground border-border hover:border-emerald-300',
                    )}
                  >
                    Tidak
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (currentStep === 1) {
      // Step 2: Chronic diseases checkboxes
      return (
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">C. Penyakit Kronis atau Berat</h3>
            <p className="text-xs text-muted-foreground mb-3">Pilih salah satu atau lebih jika ada:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SPICT_DISEASES.map((disease) => (
                <div key={disease} className="flex items-center space-x-2">
                  <Checkbox
                    id={`spict-disease-${disease}`}
                    checked={isChecked('spict-diseases', disease)}
                    onCheckedChange={() => toggleCheck('spict-diseases', disease)}
                  />
                  <Label htmlFor={`spict-disease-${disease}`} className="text-sm font-normal cursor-pointer">
                    {disease}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      // Step 3: Surprise Question
      const surpriseVal = (answers['spict-surprise'] as string) || '';
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-foreground mb-2">Pertanyaan Kejutan (Surprise Question)</h3>
            <p className="text-sm text-foreground mb-4">
              &quot;Apakah Anda akan terkejut jika pasien meninggal dalam 12 bulan ke depan?&quot;
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAnswer('spict-surprise', 'yes'); }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all border-2',
                  surpriseVal === 'yes'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-border bg-card text-foreground hover:border-emerald-300',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    surpriseVal === 'yes' ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/40',
                  )}>
                    {surpriseVal === 'yes' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span>Ya, saya akan terkejut</span>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAnswer('spict-surprise', 'no'); }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all border-2',
                  surpriseVal === 'no'
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-border bg-card text-foreground hover:border-red-300',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    surpriseVal === 'no' ? 'border-red-500 bg-red-500' : 'border-muted-foreground/40',
                  )}>
                    {surpriseVal === 'no' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span>Tidak, saya tidak akan terkejut</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── PPS Steps ──
  const renderPPS = () => {
    if (currentStep === 0) {
      // Step 1: 5 main dimension questions with radio cards
      return (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground italic mb-2">
            Pilih jawaban yang paling sesuai dengan kondisi pasien dalam 1 minggu terakhir.
          </p>
          {PPS_QUESTIONS.map(q => {
            const selectedValue = Number(answers[q.id]) ?? -1;
            return (
              <div key={q.id} className="mb-4">
                <p className="font-medium text-foreground mb-3">{q.title}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map(opt => {
                    const isSelected = selectedValue === opt.score;
                    return (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAnswer(q.id, opt.score); }}
                        className={cn(
                          'w-full text-left border-2 rounded-lg p-3 cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 hover:bg-primary/5',
                        )}
                      >
                        <div className="flex items-center">
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center shrink-0 transition-all',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                          )}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                          <span className="font-semibold text-foreground">{opt.text}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-7">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {PPS_QUESTIONS.every(q => answers[q.id] !== undefined) && (
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-lg font-bold text-primary">PPS {calcPPS().pps}%</p>
              <p className="text-xs text-muted-foreground">Rata-rata dari 5 dimensi</p>
            </div>
          )}
        </div>
      );
    }

    // Step 2: Additional yes/no questions
    return (
      <div className="space-y-4">
        <div className="border-t pt-4">
          <p className="text-base font-semibold text-foreground mb-4">Pertanyaan Tambahan</p>
        </div>
        {PPS_EXTRA_QUESTIONS.map((q, idx) => {
          const currentVal = Number(answers[`pps-extra-${idx}`]) ?? 0;
          return (
            <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium text-foreground mb-3">{q}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAnswer(`pps-extra-${idx}`, 1); }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                    currentVal === 1
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-card text-foreground border-border hover:border-red-300',
                  )}
                >
                  Ya
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAnswer(`pps-extra-${idx}`, 0); }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                    currentVal === 0
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-card text-foreground border-border hover:border-emerald-300',
                  )}
                >
                  Tidak
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Zarit Steps ──
  const renderZarit = () => {
    const page = currentStep;
    const startIdx = page * 6;
    const endIdx = Math.min(startIdx + 6, 22);
    const pageQuestions = ZARIT_QUESTIONS.slice(startIdx, endIdx);

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Seberapa sering Anda merasa hal berikut ini? (Pertanyaan {startIdx + 1}-{endIdx} dari 22)
        </p>
        {pageQuestions.map((question, qIdx) => {
          const globalIdx = startIdx + qIdx;
          const currentVal = Number(answers[`zarit-${globalIdx}`]);
          return (
            <div key={globalIdx} className="space-y-2 py-2 border-b border-border last:border-b-0">
              <p className="text-sm font-medium text-foreground">
                {globalIdx + 1}. {question}
              </p>
              <div className="flex flex-wrap gap-2">
                {ZARIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); setAnswer(`zarit-${globalIdx}`, opt.value); }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      currentVal === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── EORTC Steps ──
  const renderEORTC = () => {
    if (currentStep === 2) {
      // Q15 — Global QoL (scale 1-7)
      const value = Number(answers['eortc-q15']) || 1;
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">
            Pertanyaan terakhir tentang kualitas hidup Anda secara keseluruhan:
          </p>
          <div className="p-4 rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground mb-4">
              {EORTC_QUESTIONS[14].text}
            </p>
            <div className="space-y-2">
              {['Sangat buruk', 'Sangat jelek', 'Jelek', 'Cukup', 'Baik', 'Sangat baik', 'Sempurna'].map((label, idx) => {
                const val = idx + 1;
                return (
                  <button
                    key={val}
                    onClick={(e) => { e.stopPropagation(); setAnswer('eortc-q15', val); }}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all border text-left flex items-center gap-3',
                      value === val
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      value === val ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}>
                      {val}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const section = currentStep === 0 ? 'physical' : 'symptom';
    const sectionLabel = section === 'physical' ? 'Fungsi Fisik & Aktivitas' : 'Gejala';
    const sectionQuestions = EORTC_QUESTIONS.filter(q => q.section === section);

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Bagian: <strong>{sectionLabel}</strong> — Pilih jawaban yang paling sesuai selama 1 minggu terakhir:
        </p>
        {sectionQuestions.map((question, qIdx) => {
          const currentVal = Number(answers[question.id]);
          return (
            <div key={question.id} className="space-y-2 py-2 border-b border-border last:border-b-0">
              <p className="text-sm font-medium text-foreground">
                {qIdx + 1}. {question.text}
              </p>
              <div className="flex flex-wrap gap-2">
                {EORTC_OPTIONS_4.map(opt => (
                  <button
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); setAnswer(question.id, opt.value); }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      currentVal === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Result Renderer ──

  const renderResult = (): React.ReactNode => {
    if (!activeTool) return null;

    const ewsLevel = getEwsLevel(activeTool);
    const ews = getEwsBadge(ewsLevel);

    const renderESASResult = () => {
      const { total, items } = calcESAS();
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-primary">{total}</p>
            <p className="text-sm text-muted-foreground">dari 90</p>
          </div>
          <div className={cn('rounded-lg border-2 px-4 py-2 text-center', ews.bg)}>
            <span className={cn('text-sm font-bold', ews.color)}>{ews.label}</span>
          </div>
          {/* Bar chart grid */}
          <div className="grid grid-cols-3 gap-3">
            {items.map((item, idx) => (
              <div key={idx} className="text-center p-2 rounded-lg border border-border bg-card">
                <div className="h-20 flex items-end justify-center mb-1">
                  <div
                    className={cn('w-6 rounded-t-md transition-all', vasBg(item.value))}
                    style={{ height: `${Math.max(item.value * 10, 4)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                <p className={cn('text-sm font-bold', vasColor(item.value))}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-foreground">{calcESAS().maxSymptom >= 7 ?
              'Gejala berat terdeteksi. Manajemen gejala intensif diperlukan segera.' :
              calcESAS().maxSymptom >= 4 ?
              'Beberapa gejala sedang. Evaluasi dan intervensi gejala diperlukan.' :
              'Gejala terkontrol. Lanjutkan monitoring dan dukungan supportif.'
            }</p>
          </div>
        </div>
      );
    };

    const renderDistressResult = () => {
      const { score, problems } = calcDistress();
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-primary">{score}</p>
            <p className="text-sm text-muted-foreground">dari 10</p>
          </div>
          <div className={cn('rounded-lg border-2 px-4 py-2 text-center', ews.bg)}>
            <span className={cn('text-sm font-bold', ews.color)}>{ews.label}</span>
          </div>
          {Object.keys(problems).length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Masalah yang Teridentifikasi:</p>
              {Object.entries(problems).map(([cat, items]) => (
                <div key={cat} className="p-3 rounded-lg border border-border">
                  <p className="text-xs font-semibold text-primary mb-1">{cat}</p>
                  <ul className="space-y-0.5">
                    {items.map((item, idx) => (
                      <li key={idx} className="text-xs text-foreground flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-primary shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">Tidak ada masalah spesifik yang dicentang.</p>
          )}
        </div>
      );
    };

    const renderSPICTResult = () => {
      const { yesCount, riskCategory, yesItems, checkedDiseases, surpriseAnswer } = calcSPICT();

      let statusLabel = '';
      let statusColor = '';
      let statusBg = '';
      let advice = '';
      if (yesCount >= 8 || surpriseAnswer === 'no') {
        statusLabel = 'Risiko Sangat Tinggi';
        statusColor = 'text-red-700';
        statusBg = 'bg-red-50 border-red-200';
        advice = 'Sangat disarankan evaluasi paliatif komprehensif, home care, dan diskusi Advance Care Planning (ACP).';
      } else if (yesCount >= 6) {
        statusLabel = 'Risiko Tinggi';
        statusColor = 'text-orange-700';
        statusBg = 'bg-orange-50 border-orange-200';
        advice = 'Pasien berpotensi membutuhkan layanan paliatif. Disarankan penilaian oleh dokter atau tim paliatif.';
      } else if (yesCount >= 3) {
        statusLabel = 'Risiko Sedang';
        statusColor = 'text-amber-700';
        statusBg = 'bg-amber-50 border-amber-200';
        advice = 'Pertimbangkan konsultasi paliatif. Lakukan evaluasi gejala lebih lanjut.';
      } else {
        statusLabel = 'Risiko Rendah';
        statusColor = 'text-emerald-700';
        statusBg = 'bg-emerald-50 border-emerald-200';
        advice = 'Belum menunjukkan kebutuhan paliatif yang jelas. Lanjutkan kontrol rutin.';
      }

      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-primary">{yesCount}</p>
            <p className="text-sm text-muted-foreground">poin dari 15 indikator</p>
          </div>
          <div className={cn('rounded-lg border-2 px-4 py-2 text-center', ews.bg)}>
            <span className={cn('text-sm font-bold', ews.color)}>{ews.label}</span>
          </div>
          <div className={cn('rounded-xl border-2 p-4', statusBg)}>
            <p className={cn('text-lg font-bold mb-2', statusColor)}>{statusLabel} ({yesCount} poin)</p>
            <p className={cn('text-sm', statusColor)}>{advice}</p>
          </div>
          {yesItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Indikator Terdeteksi</p>
              {yesItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          )}
          {checkedDiseases.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs font-semibold text-primary mb-2">Penyakit Kronis Teridentifikasi:</p>
              <div className="flex flex-wrap gap-1.5">
                {checkedDiseases.map((d) => (
                  <span key={d} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {surpriseAnswer && (
            <div className={cn(
              'p-3 rounded-lg border-2',
              surpriseAnswer === 'no' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
            )}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Surprise Question</p>
              <p className={cn('text-sm font-medium', surpriseAnswer === 'no' ? 'text-red-700' : 'text-emerald-700')}>
                {surpriseAnswer === 'no'
                  ? 'Tidak akan terkejut — Disarankan segera diskusi Advance Care Planning.'
                  : 'Akan terkejut — Tidak ada indikasi mendesak saat ini.'}
              </p>
            </div>
          )}
        </div>
      );
    };

    const renderPPSResult = () => {
      const { pps, extraYesCount, dimensionDetails } = calcPPS();

      let statusLabel = '';
      let statusColor = '';
      let statusBg = '';
      let advice = '';
      if (pps >= 80) {
        statusLabel = 'Kondisi Baik (PPS 80-100%)';
        statusColor = 'text-emerald-700';
        statusBg = 'bg-emerald-50 border-emerald-200';
        advice = 'Masih cukup mandiri. Kontrol rutin telemedicine.';
      } else if (pps >= 60) {
        statusLabel = 'Kondisi Mulai Menurun (PPS 60-70%)';
        statusColor = 'text-amber-700';
        statusBg = 'bg-amber-50 border-amber-200';
        advice = 'Memerlukan pemantauan lebih sering. Pertimbangkan kunjungan home care.';
      } else if (pps >= 40) {
        statusLabel = 'Ketergantungan Sedang-Berat (PPS 40-50%)';
        statusColor = 'text-orange-700';
        statusBg = 'bg-orange-50 border-orange-200';
        advice = 'Home care rutin. Evaluasi kebutuhan paliatif.';
      } else {
        statusLabel = 'Kondisi Sangat Berat (PPS 10-30%)';
        statusColor = 'text-red-700';
        statusBg = 'bg-red-50 border-red-200';
        advice = 'Perawatan intensif di rumah. Pertimbangkan Advance Care Planning.';
      }

      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-primary">{pps}%</p>
            <p className="text-sm text-muted-foreground">Palliative Performance Scale</p>
          </div>
          <div className={cn('rounded-lg border-2 px-4 py-2 text-center', ews.bg)}>
            <span className={cn('text-sm font-bold', ews.color)}>{ews.label}</span>
          </div>
          <div className={cn('rounded-xl border-2 p-4', statusBg)}>
            <p className={cn('text-lg font-bold mb-2', statusColor)}>{statusLabel}</p>
            <p className={cn('text-sm', statusColor)}>{advice}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detail Per Dimensi</p>
            {dimensionDetails.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                </div>
                <span className={cn(
                  'text-sm font-bold',
                  d.score >= 80 ? 'text-emerald-600' : d.score >= 60 ? 'text-amber-600' : d.score >= 40 ? 'text-orange-600' : 'text-red-600',
                )}>
                  {d.score}%
                </span>
              </div>
            ))}
          </div>
          {extraYesCount >= 3 && (
            <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Alert Risiko Perburukan</p>
                <p className="text-xs text-red-600">Ditemukan {extraYesCount} indikator perburukan. Disarankan segera konsultasi dokter paliatif atau jadwal kunjungan home care.</p>
              </div>
            </div>
          )}
        </div>
      );
    };

    const renderZaritResult = () => {
      const { total, category, needReferral } = calcZarit();
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-primary">{total}</p>
            <p className="text-sm text-muted-foreground">dari 88</p>
          </div>
          <div className={cn('rounded-lg border-2 px-4 py-2 text-center', ews.bg)}>
            <span className={cn('text-sm font-bold', ews.color)}>{ews.label}</span>
          </div>
          <div className="p-3 rounded-lg border border-border text-center">
            <p className="text-xs text-muted-foreground">Kategori Beban Pengasuh</p>
            <p className={cn('text-lg font-bold', total >= 61 ? 'text-red-600' : total >= 41 ? 'text-orange-600' : total >= 21 ? 'text-amber-600' : 'text-emerald-600')}>
              {category}
            </p>
          </div>
          {needReferral && (
            <div className="p-3 rounded-lg border-2 border-red-200 bg-red-50 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Rekomendasi Rujukan</p>
                <p className="text-xs text-red-600">Skor beban pengasuh tinggi. Disarankan rujuk ke psikolog/psikiater untuk dukungan pengasuh dan intervensi.</p>
              </div>
            </div>
          )}
        </div>
      );
    };

    const renderEORTCResult = () => {
      const { physicalFunction, symptomBurden, globalQol } = calcEORTC();
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-primary">{globalQol}%</p>
            <p className="text-sm text-muted-foreground">Kualitas Hidup Global</p>
          </div>
          <div className={cn('rounded-lg border-2 px-4 py-2 text-center', ews.bg)}>
            <span className={cn('text-sm font-bold', ews.color)}>{ews.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Fungsi Fisik', value: physicalFunction, color: physicalFunction >= 60 ? 'text-emerald-600' : physicalFunction >= 40 ? 'text-amber-600' : 'text-red-600', bgColor: physicalFunction >= 60 ? 'bg-emerald-500' : physicalFunction >= 40 ? 'bg-amber-500' : 'bg-red-500' },
              { label: 'Beban Gejala', value: symptomBurden, color: symptomBurden <= 33 ? 'text-emerald-600' : symptomBurden <= 66 ? 'text-amber-600' : 'text-red-600', bgColor: symptomBurden <= 33 ? 'bg-emerald-500' : symptomBurden <= 66 ? 'bg-amber-500' : 'bg-red-500' },
              { label: 'QoL Global', value: globalQol, color: globalQol >= 60 ? 'text-emerald-600' : globalQol >= 40 ? 'text-amber-600' : 'text-red-600', bgColor: globalQol >= 60 ? 'bg-emerald-500' : globalQol >= 40 ? 'bg-amber-500' : 'bg-red-500' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border text-center">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <div className="h-16 flex items-end justify-center my-1">
                  <div
                    className={cn('w-8 rounded-t-md', item.bgColor)}
                    style={{ height: `${Math.max(item.value, 4)}%` }}
                  />
                </div>
                <p className={cn('text-lg font-bold', item.color)}>{item.value}%</p>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-foreground">
              {globalQol < 40 ? 'Kualitas hidup sangat rendah. Intervensi paliatif intensif dan manajemen gejala menyeluruh diperlukan.' :
               globalQol < 60 ? 'Kualitas hidup menurun. Evaluasi gejala dan intervensi yang ditargetkan diperlukan.' :
               'Kualitas hidup cukup baik. Lanjutkan manajemen gejala dan dukungan supportif.'}
            </p>
          </div>
        </div>
      );
    };

    switch (activeTool) {
      case 'esas': return renderESASResult();
      case 'distress': return renderDistressResult();
      case 'spict': return renderSPICTResult();
      case 'pps': return renderPPSResult();
      case 'zarit': return renderZaritResult();
      case 'eortc': return renderEORTCResult();
      default: return null;
    }
  };

  // ── Step Title ──
  const getStepTitle = (): string => {
    if (!activeTool) return '';
    if (showResult) return 'Hasil Skrining';

    switch (activeTool) {
      case 'esas': return 'Assessment Gejala (ESAS-r)';
      case 'distress': {
        if (currentStep === 0) return 'Skor Distress';
        const cat = DT_PROBLEMS[currentStep - 1];
        return cat ? `Masalah: ${cat.category}` : '';
      }
      case 'spict': {
        if (currentStep === 0) return 'Pertanyaan Indikator (1-15)';
        if (currentStep === 1) return 'Penyakit Kronis atau Berat';
        return 'Pertanyaan Kejutan (Surprise Question)';
      }
      case 'pps': return 'Palliative Performance Scale';
      case 'zarit': return `Pertanyaan ${currentStep * 6 + 1}-${Math.min((currentStep + 1) * 6, 22)}`;
      case 'eortc': {
        if (currentStep === 0) return 'Fungsi Fisik & Aktivitas';
        if (currentStep === 1) return 'Gejala';
        return 'Kualitas Hidup Global';
      }
      default: return '';
    }
  };

  // ── Render: Main Panel ──

  // ── Status badge helper ──
  const getStatusBadge = (status: ScreeningStatus) => {
    switch (status) {
      case 'sent': return { label: 'Terkirim', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' };
      case 'opened': return { label: 'Dibuka', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-300' };
      case 'in_progress': return { label: 'Sedang Diisi', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' };
      case 'completed': return { label: 'Selesai', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };
      case 'reviewed': return { label: 'Ditinjau', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-300' };
      default: return { label: status, color: 'text-muted-foreground', bg: 'bg-muted border-border' };
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          PATIENT VIEW
         ══════════════════════════════════════════════════════════════════ */}
      {isPatient && (
        <>
          {/* ── Patient: Active Form Filling ── */}
          {activeForm && activeForm.status !== 'completed' && activeForm.status !== 'reviewed' ? (
            <div className="space-y-4">
              {/* Form Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">Form Skrining Paliatif</h2>
                    <Badge variant="outline" className={cn('text-[10px] font-bold border', getStatusBadge(activeForm.status).bg, getStatusBadge(activeForm.status).color)}>
                      {getStatusBadge(activeForm.status).label}
                    </Badge>
                  </div>
                  {activeForm.instructions && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Instruksi: {activeForm.instructions}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveFormId(null);
                    setActivePalliativeFormId(null);
                  }}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                </Button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Progres: {activeForm.selectedTools.filter(t => activeForm.toolResults[t]).length}/{activeForm.selectedTools.length} alat selesai
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {Math.round((activeForm.selectedTools.filter(t => activeForm.toolResults[t]).length / activeForm.selectedTools.length) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(activeForm.selectedTools.filter(t => activeForm.toolResults[t]).length / activeForm.selectedTools.length) * 100}
                  className="h-2"
                />
              </div>

              <Separator />

              {/* Tool List for this Form */}
              <div className="space-y-3">
                {activeForm.selectedTools.map((toolKey) => {
                  const tool = TOOL_DEFS[toolKey];
                  const result = activeForm.toolResults[toolKey];
                  const isCompleted = !!result;

                  return (
                    <Card
                      key={toolKey}
                      className={cn(
                        'transition-all duration-200',
                        isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-border hover:border-primary/30 cursor-pointer hover:-translate-y-[2px] hover:shadow-md',
                      )}
                      onClick={() => { if (!isCompleted) handleStartTool(toolKey); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                            isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary',
                          )}>
                            {isCompleted ? <CheckCircle className="w-6 h-6" /> : tool.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground">{tool.name}</p>
                              {isCompleted && (
                                <Badge variant="outline" className={cn('text-[10px] font-bold border', getEwsBadge(result.ewsLevel).bg, getEwsBadge(result.ewsLevel).color)}>
                                  {getEwsBadge(result.ewsLevel).label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isCompleted ? `Skor: ${result.scoreLabel}` : tool.description}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {isCompleted ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailResult({
                                    id: `${activeForm.id}-${toolKey}`,
                                    tool: toolKey,
                                    toolName: tool.name,
                                    patientId: activeForm.patientId,
                                    patientName: currentUser?.name || 'Pasien',
                                    score: result.score,
                                    scoreLabel: result.scoreLabel,
                                    interpretation: result.interpretation,
                                    ewsLevel: result.ewsLevel,
                                    details: result.details,
                                    savedAt: activeForm.updatedAt,
                                  });
                                }}
                              >
                                Detail
                              </Button>
                            ) : (
                              <Button size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); handleStartTool(toolKey); }}>
                                Mulai <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Patient: Forms List ── */
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Skrining Paliatif</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Form skrining paliatif yang dikirim oleh dokter
                </p>
              </div>

              <Separator />

              {/* Pending Forms */}
              {(() => {
                const pendingForms = patientForms.filter(f => f.status !== 'completed' && f.status !== 'reviewed');
                if (pendingForms.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">Menunggu Pengisian</h3>
                    {pendingForms.map(form => {
                      const completedCount = form.selectedTools.filter(t => form.toolResults[t]).length;
                      return (
                        <Card
                          key={form.id}
                          className="border-amber-200 bg-amber-50/30 cursor-pointer transition-all hover:-translate-y-[2px] hover:shadow-md"
                          onClick={() => {
                            setActiveFormId(form.id);
                            setActivePalliativeFormId(form.id);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-foreground">Form Skrining Paliatif</p>
                                  <Badge variant="outline" className={cn('text-[10px] font-bold border', getStatusBadge(form.status).bg, getStatusBadge(form.status).color)}>
                                    {getStatusBadge(form.status).label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {form.selectedTools.length} alat skrining • {completedCount}/{form.selectedTools.length} selesai
                                </p>
                                {form.instructions && (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                                    {form.instructions}
                                  </p>
                                )}
                              </div>
                              <Button size="sm" className="text-xs">
                                {completedCount > 0 ? 'Lanjutkan' : 'Isi Skrining'}
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Completed Forms */}
              {(() => {
                const completedForms = patientForms.filter(f => f.status === 'completed' || f.status === 'reviewed');
                if (completedForms.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">Selesai</h3>
                    {completedForms.map(form => {
                      const toolResultEntries = Object.entries(form.toolResults) as [ToolType, { score: number; scoreLabel: string; interpretation: string; ewsLevel: 'merah' | 'kuning' | 'hijau'; details: Record<string, unknown> }][];
                      // Find worst EWS level
                      const worstEws = toolResultEntries.reduce<'merah' | 'kuning' | 'hijau' | null>((worst, [, r]) => {
                        if (r.ewsLevel === 'merah') return 'merah';
                        if (worst !== 'merah' && r.ewsLevel === 'kuning') return 'kuning';
                        if (worst === null && r.ewsLevel === 'hijau') return 'hijau';
                        return worst;
                      }, null);
                      return (
                        <Card key={form.id} className="border-emerald-200 bg-emerald-50/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-foreground">Form Skrining Paliatif</p>
                                  <Badge variant="outline" className={cn('text-[10px] font-bold border', getStatusBadge(form.status).bg, getStatusBadge(form.status).color)}>
                                    {getStatusBadge(form.status).label}
                                  </Badge>
                                  {worstEws && (
                                    <Badge variant="outline" className={cn('text-[10px] font-bold border', getEwsBadge(worstEws).bg, getEwsBadge(worstEws).color)}>
                                      {getEwsBadge(worstEws).label}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {toolResultEntries.map(([toolKey, toolResult]) => (
                                    <Badge key={toolKey} variant="secondary" className="text-[10px]">
                                      {TOOL_DEFS[toolKey]?.name}: {toolResult.scoreLabel}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(form.completedAt || form.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Empty State */}
              {patientForms.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada form skrining paliatif. Dokter akan mengirim form melalui chat.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DOCTOR VIEW
         ══════════════════════════════════════════════════════════════════ */}
      {isDoctor && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">Modul Skrining Paliatif</h2>
                {isNavigatedFromMonitoring && (
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                    <ClipboardCheck className="w-3 h-3 mr-1" />
                    Dari Monitoring Paliatif
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                6 alat skrining klinis paliatif dengan modal interaktif step-by-step
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isNavigatedFromMonitoring && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setScreeningNavigationFrom(null);
                    setScreeningPreselectedPatientId(null);
                    setActivePanel('palliative-monitoring');
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Kembali ke Monitoring Paliatif
                </Button>
              )}
              {/* Patient Selector */}
              <div className="w-full sm:w-72">
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pilih Pasien</Label>
                <Select value={effectivePatientId || ''} onValueChange={setSelectedPatientId}>
                  <SelectTrigger>
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder={isNavigatedFromMonitoring && navigatedPalliativePatient ? navigatedPalliativePatient.patientName || 'Pilih pasien...' : 'Pilih pasien...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                    {/* Add palliative patients to the list when navigated from monitoring */}
                    {isNavigatedFromMonitoring && navigatedPalliativePatient && !patients.find(p => p.id === effectivePatientId) && (
                      <SelectItem value={effectivePatientId}>
                        {navigatedPalliativePatient.patientName || 'Pasien Paliatif'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Patient Identity Card (auto-filled from Monitoring Paliatif) */}
          {isNavigatedFromMonitoring && navigatedPalliativePatient && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Identitas Pasien</h3>
                  <Badge variant="secondary" className="text-[10px]">Auto-isi dari Monitoring Paliatif</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Nama</span>
                    <p className="font-medium text-foreground">{navigatedPalliativePatient.patientName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">No. Rekam Medis</span>
                    <p className="font-medium text-foreground">{navigatedPalliativePatient.rmNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Tanggal Lahir</span>
                    <p className="font-medium text-foreground">
                      {navigatedPalliativePatient.dateOfBirth
                        ? new Date(navigatedPalliativePatient.dateOfBirth).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Jenis Kelamin</span>
                    <p className="font-medium text-foreground">{navigatedPalliativePatient.gender || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Diagnosa Utama</span>
                    <p className="font-medium text-foreground">{navigatedPalliativePatient.primaryDiagnosis || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Stadium</span>
                    <p className="font-medium text-foreground">{navigatedPalliativePatient.diseaseStage || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Status Perawatan</span>
                    <p className="font-medium text-foreground">
                      {navigatedPalliativePatient.careStatus === 'rawat_jalan' ? 'Rawat Jalan' :
                       navigatedPalliativePatient.careStatus === 'home_care' ? 'Home Care' :
                       navigatedPalliativePatient.careStatus === 'hospice' ? 'Hospice' :
                       navigatedPalliativePatient.careStatus === 'rawat_inap' ? 'Rawat Inap' : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Tingkat Risiko</span>
                    <p className="font-medium">
                      <Badge variant="outline" className={
                        navigatedPalliativePatient.riskLevel === 'merah' ? 'bg-red-100 text-red-800 border-red-300' :
                        navigatedPalliativePatient.riskLevel === 'kuning' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-green-100 text-green-800 border-green-300'
                      }>
                        {navigatedPalliativePatient.riskLevel === 'merah' ? 'Risiko Tinggi' :
                         navigatedPalliativePatient.riskLevel === 'kuning' ? 'Risiko Sedang' : 'Risiko Rendah'}
                      </Badge>
                    </p>
                  </div>
                </div>
                {navigatedPalliativePatient.attendingDoctorName && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Dokter PJ: {navigatedPalliativePatient.attendingDoctorName}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Screening History for navigated patient */}
          {isNavigatedFromMonitoring && navigatedPalliativePatient && (() => {
            const patientRecords = palliativeScreeningRecords
              .filter(r => r.palliativePatientId === navigatedPalliativePatient.id)
              .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
            if (patientRecords.length === 0) return null;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Riwayat Skrining Pasien</CardTitle>
                  <CardDescription className="text-xs">
                    {patientRecords.length} skrining tercatat di Monitoring Paliatif
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientRecords.map(record => {
                      const ewsBadge = getEwsBadge(record.ewsLevel || 'hijau');
                      return (
                        <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-[10px] font-bold border', ewsBadge.bg, ewsBadge.color)}>
                              {ewsBadge.label}
                            </Badge>
                            <span className="font-medium">{TOOL_DEFS[record.screeningType as ToolType]?.name || record.screeningType}</span>
                            <span className="text-muted-foreground">{record.scoreLabel || '-'}</span>
                          </div>
                          <span className="text-muted-foreground">{formatDate(record.performedAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Tool Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(TOOL_DEFS) as [ToolType, typeof TOOL_DEFS[ToolType]][]).map(([toolKey, tool]) => (
              <Card
                key={toolKey}
                className="group cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg border-border hover:border-primary/30"
                onClick={() => handleStartTool(toolKey)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-bold">{tool.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{tool.items}</Badge>
                    <Badge variant="outline" className="text-[10px]">{tool.scale}</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => { e.stopPropagation(); handleStartTool(toolKey); }}
                  >
                    Mulai Skrining
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SHARED MODALS
         ══════════════════════════════════════════════════════════════════ */}

      {/* ── Universal Modal ── */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {activeTool && TOOL_DEFS[activeTool].icon}
              <span>{activeTool ? TOOL_DEFS[activeTool].name : ''}</span>
              {isNavigatedFromMonitoring && navigatedPalliativePatient ? (
                <span className="text-sm font-normal text-muted-foreground">
                  — {navigatedPalliativePatient.patientName || 'Pasien'}
                  {navigatedPalliativePatient.rmNumber && ` (${navigatedPalliativePatient.rmNumber})`}
                </span>
              ) : selectedPatient ? (
                <span className="text-sm font-normal text-muted-foreground">
                  — {selectedPatient.name}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{getStepTitle()}</span>
              <span className="text-xs font-medium text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
            {renderStep()}
          </div>

          {/* Footer Navigation */}
          <DialogFooter className="shrink-0 flex items-center justify-between border-t border-border pt-3 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {showResult ? 'Hasil' : `Langkah ${currentStep + 1} dari ${toolSteps}`}
            </div>
            <div className="flex items-center gap-2">
              {currentStep > 0 && !showResult && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
                </Button>
              )}
              {showResult ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowResult(false); setCurrentStep(toolSteps - 1); }}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                  </Button>
                  {isNavigatedFromMonitoring ? (
                    <Button size="sm" onClick={() => {
                      handleSaveResult();
                      setTimeout(() => {
                        setScreeningNavigationFrom(null);
                        setScreeningPreselectedPatientId(null);
                        setActivePanel('palliative-monitoring');
                      }, 300);
                    }}>
                      <Save className="w-4 h-4 mr-1" /> Simpan & Kembali ke Monitoring
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleSaveResult}>
                      <Save className="w-4 h-4 mr-1" /> Simpan Hasil
                    </Button>
                  )}
                </div>
              ) : (
                <Button size="sm" onClick={handleNext}>
                  {currentStep >= toolSteps - 1 ? (
                    <>
                      Lihat Hasil <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Back to Monitoring Paliatif (bottom) ── */}
      {isDoctor && isNavigatedFromMonitoring && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Hasil skrining akan otomatis tersimpan di Riwayat Skrining pasien pada Modul Monitoring Paliatif.
            </p>
            <Button
              variant="default"
              onClick={() => {
                setScreeningNavigationFrom(null);
                setScreeningPreselectedPatientId(null);
                setActivePanel('palliative-monitoring');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Monitoring Paliatif
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Result Modal ── */}
      <Dialog open={!!detailResult} onOpenChange={(open) => { if (!open) setDetailResult(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Detail Hasil Skrining</DialogTitle>
          </DialogHeader>
          {detailResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{detailResult.toolName}</span>
                <Badge variant="outline" className={cn('text-[10px] font-bold border', getEwsBadge(detailResult.ewsLevel).bg, getEwsBadge(detailResult.ewsLevel).color)}>
                  {getEwsBadge(detailResult.ewsLevel).label}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-black text-primary">{detailResult.scoreLabel}</p>
                <p className="text-xs text-muted-foreground">{detailResult.patientName} — {formatDate(detailResult.savedAt)}</p>
              </div>
              <p className="text-sm text-foreground">{detailResult.interpretation}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
