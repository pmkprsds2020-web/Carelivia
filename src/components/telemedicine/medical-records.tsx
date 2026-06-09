'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type {
  MedicalRecord,
  MedicalRecordStatus,
  Prescription,
  PrescriptionItem,
  Consultation,
  Payment,
  PaymentMethod,
  ScreeningForm,
  ScreeningModuleId,
  RiskCategory,
  TriageLevel,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
import { Input } from '@/components/ui/input';
import {
  FileText,
  FlaskConical,
  Pill,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Activity,
  Droplets,
  Heart,
  Ruler,
  AlertTriangle,
  Calendar,
  User,
  ClipboardList,
  Clock,
  CheckCircle2,
  Eye,
  Search,
  Filter,
  Stethoscope,
  Syringe,
  Timer,
  Plus,
  Edit3,
  ChevronRight,
  Hash,
  StickyNote,
  BadgeCheck,
  AlertCircle,
  ArrowRight,
  Receipt,
  CircleDot,
  Users,
  ListOrdered,
  CreditCard,
  ShoppingCart,
  CheckCheck,
  Download,
  QrCode,
  Building2,
  Smartphone,
  Wallet,
  Stamp,
  ClipboardCheck,
  Flame,
  Apple,
  ShieldAlert,
  Accessibility,
  Home,
  Paperclip,
  Brain,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MODULE_LABELS,
  MODULE_ICONS,
  SCREENING_MODULES,
  TRIAGE_COLORS,
  TRIAGE_LABELS,
} from '@/lib/screening-templates';

// ── Module Icon Map (Lucide icons replacing emojis) ──
const MODULE_ICON_MAP: Record<string, React.ReactNode> = {
  keluhan_utama: <Stethoscope className="w-4 h-4" />,
  tanda_bahaya: <AlertTriangle className="w-4 h-4" />,
  tanda_vital: <Activity className="w-4 h-4" />,
  penyakit_kronis: <Pill className="w-4 h-4" />,
  nyeri: <Flame className="w-4 h-4" />,
  kesehatan_mental: <Brain className="w-4 h-4" />,
  nutrisi: <Apple className="w-4 h-4" />,
  risiko_jatuh: <ShieldAlert className="w-4 h-4" />,
  status_fungsional: <Accessibility className="w-4 h-4" />,
  home_care: <Home className="w-4 h-4" />,
  paliatif: <Heart className="w-4 h-4" />,
  bukti_klinis: <Paperclip className="w-4 h-4" />,
};

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const PATIENT_NAME_MAP: Record<string, string> = {
  'pat-rina': 'Rina Wulandari',
  'pat-doni': 'Doni Pratama',
  'pat-maya': 'Maya Sari',
  'pat-siti': 'Siti Aminah',
  'pat-joko': 'Joko Widodo',
};

const SPECIALIZATION_MAP: Record<string, string> = {
  umum: 'Dokter Umum',
  anak: 'Dokter Anak',
  penyakit_dalam: 'Penyakit Dalam',
  kebidanan: 'Dokter Kebidanan',
  gigi: 'Dokter Gigi',
};

function extractPatientKey(name: string): string {
  if (!name) return '';
  const first = name.trim().split(' ')[0].toLowerCase();
  for (const [key, val] of Object.entries(PATIENT_NAME_MAP)) {
    if (val.toLowerCase().startsWith(first)) return key;
  }
  return '';
}

function generateRmNumber(mr: MedicalRecord, index: number): string {
  const dateStr = mr.recordDate || mr.createdAt;
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(index + 1).padStart(4, '0');
  return `RM-${y}${m}${day}-${seq}`;
}

function getStatusBadgeClasses(status?: MedicalRecordStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0';
    case 'selesai':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0';
    case 'ditinjau':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
  }
}

function getStatusDotClasses(status?: MedicalRecordStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-amber-500';
    case 'selesai':
      return 'bg-emerald-500';
    case 'ditinjau':
      return 'bg-sky-500';
    default:
      return 'bg-gray-400';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusLabel(status?: MedicalRecordStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'selesai':
      return 'Selesai';
    case 'ditinjau':
      return 'Ditinjau';
    default:
      return 'Unknown';
  }
}

function consultationTypeLabel(type?: string): string {
  switch (type) {
    case 'chat':
      return 'Konsultasi Chat';
    case 'video':
      return 'Konsultasi Video';
    case 'audio':
      return 'Konsultasi Audio';
    default:
      return 'Konsultasi';
  }
}

// ---------------------------------------------------------------------------
// Demo / Seed data for Doctor View (when store is empty)
// ---------------------------------------------------------------------------

const DOCTOR_DEMO_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'mr-demo-1',
    patientId: 'pat-rina',
    consultationId: 'cons-demo-1',
    rmNumber: 'RM-20260304-0001',
    diagnosis: 'Gastritis Akut',
    symptoms: 'Nyeri ulu hati, mual, muntah, nafsu makan menurun',
    treatment: 'Antasida 3x sehari, Omeprazole 20mg 1x sehari, diet ringan',
    notes: 'Pasien mengeluh nyeri ulu hati sejak 3 hari. Direkomendasikan endoskopi jika kambuh.',
    status: 'selesai',
    recordDate: '2026-03-04T09:00:00.000Z',
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:30:00.000Z',
  },
  {
    id: 'mr-demo-2',
    patientId: 'pat-doni',
    consultationId: 'cons-demo-2',
    rmNumber: 'RM-20260303-0002',
    diagnosis: 'Hipertensi Grade I',
    symptoms: 'Sakit kepala, pusing, berdebar-debar',
    treatment: 'Amlodipine 5mg 1x sehari, modifikasi gaya hidup, kurangi garam',
    notes: 'Tekanan darah 150/95 mmHg. Perlu monitoring 2 minggu.',
    status: 'ditinjau',
    recordDate: '2026-03-03T14:00:00.000Z',
    createdAt: '2026-03-03T14:00:00.000Z',
    updatedAt: '2026-03-03T14:45:00.000Z',
  },
  {
    id: 'mr-demo-3',
    patientId: 'pat-maya',
    consultationId: 'cons-demo-3',
    rmNumber: 'RM-20260302-0003',
    diagnosis: 'ISPA (Infeksi Saluran Pernapasan Atas)',
    symptoms: 'Demam, batuk pilek, sakit tenggorokan, hidung tersumbat',
    treatment: 'Paracetamol 500mg 3x sehari, Amoxicillin 500mg 3x sehari, istirahat cukup',
    notes: 'Demam sudah turun setelah 2 hari. Batuk masih ada, kontrol 1 minggu.',
    status: 'selesai',
    recordDate: '2026-03-02T10:30:00.000Z',
    createdAt: '2026-03-02T10:30:00.000Z',
    updatedAt: '2026-03-02T11:15:00.000Z',
  },
  {
    id: 'mr-demo-4',
    patientId: 'pat-siti',
    consultationId: 'cons-demo-4',
    rmNumber: 'RM-20260301-0004',
    diagnosis: 'Kehamilan Trimester 2 - Normal',
    symptoms: 'Kontrol kehamilan rutin, tidak ada keluhan khusus',
    treatment: 'Suplemen asam folat, vitamin B6, kontrol rutin tiap bulan',
    notes: 'USG menunjukkan perkembangan janin normal. Berat janin sesuai usia kehamilan.',
    status: 'selesai',
    recordDate: '2026-03-01T08:00:00.000Z',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:30:00.000Z',
  },
  {
    id: 'mr-demo-5',
    patientId: 'pat-joko',
    consultationId: 'cons-demo-5',
    rmNumber: 'RM-20260228-0005',
    diagnosis: 'Diabetes Mellitus Tipe 2',
    symptoms: 'Sering haus, sering buang air kecil, penurunan berat badan',
    treatment: 'Metformin 500mg 2x sehari, diet rendah gula, olahraga teratur',
    notes: 'Gula darah puasa 180 mg/dL. Perlu monitoring rutin dan evaluasi HbA1c.',
    status: 'draft',
    recordDate: '2026-02-28T11:00:00.000Z',
    createdAt: '2026-02-28T11:00:00.000Z',
    updatedAt: '2026-02-28T11:30:00.000Z',
  },
  {
    id: 'mr-demo-6',
    patientId: 'pat-rina',
    consultationId: 'cons-demo-6',
    diagnosis: 'Migrain',
    symptoms: 'Sakit kepala sebelah, mual, sensitif terhadap cahaya',
    treatment: 'Ibuprofen 400mg saat serangan, istirahat di ruangan gelap',
    notes: 'Serangan migrain 2-3x sebulan. Dipertimbangkan pencegahan jika frekuensi meningkat.',
    status: 'draft',
    recordDate: '2026-02-25T16:00:00.000Z',
    createdAt: '2026-02-25T16:00:00.000Z',
    updatedAt: '2026-02-25T16:20:00.000Z',
  },
  {
    id: 'mr-demo-7',
    patientId: 'pat-doni',
    consultationId: 'cons-demo-7',
    diagnosis: 'Dermatitis Kontak',
    symptoms: 'Ruam merah, gatal, kulit kering pada tangan',
    treatment: 'Krim hydrocortisone 1%, loratadine 10mg 1x sehari, hindari iritan',
    notes: 'Kemungkinan akibat paparan bahan kimia di tempat kerja.',
    status: 'ditinjau',
    recordDate: '2026-02-20T13:00:00.000Z',
    createdAt: '2026-02-20T13:00:00.000Z',
    updatedAt: '2026-02-20T13:40:00.000Z',
  },
];

const DOCTOR_DEMO_CONSULTATIONS: Consultation[] = [
  {
    id: 'cons-demo-1',
    patientId: 'pat-rina',
    doctorId: 'doc-sarah',
    type: 'video',
    status: 'completed',
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:30:00.000Z',
    patient: {
      id: 'pat-rina',
      name: 'Rina Wulandari',
      email: 'rina@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'cons-demo-2',
    patientId: 'pat-doni',
    doctorId: 'doc-sarah',
    type: 'chat',
    status: 'completed',
    createdAt: '2026-03-03T14:00:00.000Z',
    updatedAt: '2026-03-03T14:45:00.000Z',
    patient: {
      id: 'pat-doni',
      name: 'Doni Pratama',
      email: 'doni@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'cons-demo-3',
    patientId: 'pat-maya',
    doctorId: 'doc-sarah',
    type: 'video',
    status: 'completed',
    createdAt: '2026-03-02T10:30:00.000Z',
    updatedAt: '2026-03-02T11:15:00.000Z',
    patient: {
      id: 'pat-maya',
      name: 'Maya Sari',
      email: 'maya@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'cons-demo-4',
    patientId: 'pat-siti',
    doctorId: 'doc-sarah',
    type: 'audio',
    status: 'completed',
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-01T08:30:00.000Z',
    patient: {
      id: 'pat-siti',
      name: 'Siti Aminah',
      email: 'siti@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'cons-demo-5',
    patientId: 'pat-joko',
    doctorId: 'doc-sarah',
    type: 'chat',
    status: 'completed',
    createdAt: '2026-02-28T11:00:00.000Z',
    updatedAt: '2026-02-28T11:30:00.000Z',
    patient: {
      id: 'pat-joko',
      name: 'Joko Widodo',
      email: 'joko@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'cons-demo-6',
    patientId: 'pat-rina',
    doctorId: 'doc-sarah',
    type: 'chat',
    status: 'completed',
    createdAt: '2026-02-25T16:00:00.000Z',
    updatedAt: '2026-02-25T16:20:00.000Z',
    patient: {
      id: 'pat-rina',
      name: 'Rina Wulandari',
      email: 'rina@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 'cons-demo-7',
    patientId: 'pat-doni',
    doctorId: 'doc-sarah',
    type: 'video',
    status: 'completed',
    createdAt: '2026-02-20T13:00:00.000Z',
    updatedAt: '2026-02-20T13:40:00.000Z',
    patient: {
      id: 'pat-doni',
      name: 'Doni Pratama',
      email: 'doni@email.com',
      role: 'patient',
      isVerified: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
];

const DOCTOR_DEMO_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-demo-1',
    consultationId: 'cons-demo-1',
    doctorId: 'doc-sarah',
    patientId: 'pat-rina',
    status: 'active',
    notes: 'Diminum setelah makan',
    createdAt: '2026-03-04T09:30:00.000Z',
    updatedAt: '2026-03-04T09:30:00.000Z',
    items: [
      {
        id: 'rxi-1-1',
        prescriptionId: 'rx-demo-1',
        medicineName: 'Antasida Sirup',
        dosage: '3x sehari setelah makan',
        quantity: 1,
        frequency: '3x sehari',
        duration: '7 hari',
        instructions: 'Diminum setelah makan',
        price: 22000,
      },
      {
        id: 'rxi-1-2',
        prescriptionId: 'rx-demo-1',
        medicineName: 'Omeprazole 20mg',
        dosage: '1x sehari sebelum sarapan',
        quantity: 14,
        frequency: '1x sehari',
        duration: '14 hari',
        instructions: 'Diminum sebelum sarapan',
        price: 35000,
      },
    ],
  },
  {
    id: 'rx-demo-2',
    consultationId: 'cons-demo-2',
    doctorId: 'doc-sarah',
    patientId: 'pat-doni',
    status: 'active',
    notes: 'Monitor tekanan darah secara rutin',
    createdAt: '2026-03-03T14:45:00.000Z',
    updatedAt: '2026-03-03T14:45:00.000Z',
    items: [
      {
        id: 'rxi-2-1',
        prescriptionId: 'rx-demo-2',
        medicineName: 'Amlodipine 5mg',
        dosage: '1x sehari',
        quantity: 30,
        frequency: '1x sehari',
        duration: '30 hari',
        price: 45000,
      },
    ],
  },
  {
    id: 'rx-demo-3',
    consultationId: 'cons-demo-3',
    doctorId: 'doc-sarah',
    patientId: 'pat-maya',
    status: 'completed',
    notes: 'Habiskan antibiotik',
    createdAt: '2026-03-02T11:15:00.000Z',
    updatedAt: '2026-03-02T11:15:00.000Z',
    items: [
      {
        id: 'rxi-3-1',
        prescriptionId: 'rx-demo-3',
        medicineName: 'Paracetamol 500mg',
        dosage: '3x sehari jika demam',
        quantity: 10,
        frequency: '3x sehari',
        duration: '3 hari',
        price: 15000,
      },
      {
        id: 'rxi-3-2',
        prescriptionId: 'rx-demo-3',
        medicineName: 'Amoxicillin 500mg',
        dosage: '3x sehari setelah makan',
        quantity: 30,
        frequency: '3x sehari',
        duration: '10 hari',
        instructions: 'Habiskan meski gejala membaik',
        price: 25000,
      },
    ],
  },
  {
    id: 'rx-demo-4',
    consultationId: 'cons-demo-4',
    doctorId: 'doc-sarah',
    patientId: 'pat-siti',
    status: 'completed',
    notes: 'Suplemen kehamilan',
    createdAt: '2026-03-01T08:30:00.000Z',
    updatedAt: '2026-03-01T08:30:00.000Z',
    items: [
      {
        id: 'rxi-4-1',
        prescriptionId: 'rx-demo-4',
        medicineName: 'Asam Folat 400mcg',
        dosage: '1x sehari',
        quantity: 30,
        frequency: '1x sehari',
        duration: '30 hari',
        price: 18000,
      },
      {
        id: 'rxi-4-2',
        prescriptionId: 'rx-demo-4',
        medicineName: 'Vitamin B6',
        dosage: '1x sehari',
        quantity: 30,
        frequency: '1x sehari',
        duration: '30 hari',
        price: 25000,
      },
    ],
  },
  {
    id: 'rx-demo-5',
    consultationId: 'cons-demo-5',
    doctorId: 'doc-sarah',
    patientId: 'pat-joko',
    status: 'active',
    notes: 'Diet rendah gula wajib',
    createdAt: '2026-02-28T11:30:00.000Z',
    updatedAt: '2026-02-28T11:30:00.000Z',
    items: [
      {
        id: 'rxi-5-1',
        prescriptionId: 'rx-demo-5',
        medicineName: 'Metformin 500mg',
        dosage: '2x sehari setelah makan',
        quantity: 60,
        frequency: '2x sehari',
        duration: '30 hari',
        instructions: 'Diminum setelah makan untuk mengurangi efek samping GI',
        price: 22000,
      },
    ],
  },
  {
    id: 'rx-demo-6',
    consultationId: 'cons-demo-6',
    doctorId: 'doc-sarah',
    patientId: 'pat-rina',
    status: 'active',
    notes: 'Untuk serangan migrain akut',
    createdAt: '2026-02-25T16:20:00.000Z',
    updatedAt: '2026-02-25T16:20:00.000Z',
    items: [
      {
        id: 'rxi-6-1',
        prescriptionId: 'rx-demo-6',
        medicineName: 'Ibuprofen 400mg',
        dosage: 'Saat serangan migrain',
        quantity: 20,
        frequency: 'Saat dibutuhkan',
        duration: 'Saat serangan',
        price: 18000,
      },
    ],
  },
  {
    id: 'rx-demo-7',
    consultationId: 'cons-demo-7',
    doctorId: 'doc-sarah',
    patientId: 'pat-doni',
    status: 'completed',
    notes: 'Hindari kontak dengan iritan',
    createdAt: '2026-02-20T13:40:00.000Z',
    updatedAt: '2026-02-20T13:40:00.000Z',
    items: [
      {
        id: 'rxi-7-1',
        prescriptionId: 'rx-demo-7',
        medicineName: 'Loratadine 10mg',
        dosage: '1x sehari',
        quantity: 10,
        frequency: '1x sehari',
        duration: '10 hari',
        price: 28000,
      },
      {
        id: 'rxi-7-2',
        prescriptionId: 'rx-demo-7',
        medicineName: 'Krim Hydrocortisone 1%',
        dosage: 'Oleskan tipis 2x sehari',
        quantity: 1,
        frequency: '2x sehari',
        duration: '7 hari',
        instructions: 'Jangan oleskan lebih dari 7 hari berturut-turut',
        price: 35000,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Merged data interface for doctor view
// ---------------------------------------------------------------------------

interface MergedMedicalRecord extends MedicalRecord {
  patientName: string;
  consultationType?: string;
  linkedPrescription?: Prescription;
}

function buildMergedRecords(
  storeRecords: MedicalRecord[],
  storeConsultations: Consultation[],
  storePrescriptions: Prescription[],
): MergedMedicalRecord[] {
  // Step 1: Merge store records with demo records using Map dedup
  const recordMap = new Map<string, MedicalRecord>();
  for (const mr of DOCTOR_DEMO_MEDICAL_RECORDS) {
    recordMap.set(mr.id, mr);
  }
  for (const mr of storeRecords) {
    recordMap.set(mr.id, mr);
  }

  // Step 2: Merge consultations using Map dedup
  const consultationMap = new Map<string, Consultation>();
  for (const c of DOCTOR_DEMO_CONSULTATIONS) {
    consultationMap.set(c.id, c);
  }
  for (const c of storeConsultations) {
    consultationMap.set(c.id, c);
  }

  // Step 3: Merge prescriptions using Map dedup
  const prescriptionMap = new Map<string, Prescription>();
  for (const p of DOCTOR_DEMO_PRESCRIPTIONS) {
    prescriptionMap.set(p.id, p);
  }
  for (const p of storePrescriptions) {
    prescriptionMap.set(p.id, p);
  }

  // Step 4: Build consultationId → consultation lookup
  const consById = new Map<string, Consultation>(consultationMap);

  // Step 5: Build consultationId → prescription lookup
  const rxByConsultation = new Map<string, Prescription>();
  for (const [, rx] of prescriptionMap) {
    if (rx.consultationId) {
      rxByConsultation.set(rx.consultationId, rx);
    }
  }

  // Step 6: Build patientId → patient name lookup from consultations
  const patientNameById = new Map<string, string>();
  for (const [, cons] of consById) {
    if (cons.patient?.name) {
      patientNameById.set(cons.patientId, cons.patient.name);
    }
  }
  // Also fill from PATIENT_NAME_MAP
  for (const [pid, pname] of Object.entries(PATIENT_NAME_MAP)) {
    if (!patientNameById.has(pid)) {
      patientNameById.set(pid, pname);
    }
  }

  // Step 7: Build merged records with triple-matching strategy
  const merged: MergedMedicalRecord[] = [];
  let rmIndex = 0;
  const sortedRecords = Array.from(recordMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  for (const mr of sortedRecords) {
    rmIndex++;

    // Resolve patient name via triple-matching:
    // 1. consultationId → consultation → patient.name
    // 2. patientId → patientNameById (from consultations or PATIENT_NAME_MAP)
    // 3. patient name key from PATIENT_NAME_MAP
    let patientName = '';

    // Strategy 1: consultationId → consultation → patient.name
    if (mr.consultationId) {
      const cons = consById.get(mr.consultationId);
      if (cons?.patient?.name) {
        patientName = cons.patient.name;
      }
    }

    // Strategy 2: patientId → patientNameById
    if (!patientName && mr.patientId) {
      const name = patientNameById.get(mr.patientId);
      if (name) {
        patientName = name;
      }
    }

    // Strategy 3: Try patient name key matching
    if (!patientName && mr.patientId) {
      const mappedName = PATIENT_NAME_MAP[mr.patientId];
      if (mappedName) {
        patientName = mappedName;
      }
    }

    // Resolve consultation type
    let consultationType: string | undefined;
    if (mr.consultationId) {
      const cons = consById.get(mr.consultationId);
      if (cons) {
        consultationType = cons.type;
      }
    }

    // Resolve linked prescription
    let linkedPrescription: Prescription | undefined;
    if (mr.consultationId) {
      linkedPrescription = rxByConsultation.get(mr.consultationId);
    }

    // Generate RM number if missing
    const rmNumber = mr.rmNumber || generateRmNumber(mr, rmIndex - 1);

    merged.push({
      ...mr,
      rmNumber,
      patientName: patientName || mr.patientId,
      consultationType,
      linkedPrescription,
    });
  }

  return merged;
}

// ---------------------------------------------------------------------------
// DoctorMedicalRecordsView
// ---------------------------------------------------------------------------

function DoctorMedicalRecordsView() {
  const {
    medicalRecords,
    consultations,
    prescriptions,
    updateMedicalRecord,
    updateConsultation,
    currentUser,
    screeningForms,
    updateScreeningForm,
    doctors,
  } = useStore();

  const [activeTab, setActiveTab] = useState('records-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedTimelinePatientId, setSelectedTimelinePatientId] = useState<string | null>(null);
  const [selectedTimelineRecordId, setSelectedTimelineRecordId] = useState<string | null>(null);
  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(null);
  const [screeningDoctorNotes, setScreeningDoctorNotes] = useState('');
  const [screeningFollowUp, setScreeningFollowUp] = useState('');

  // Build merged data
  const mergedRecords = useMemo(
    () => buildMergedRecords(medicalRecords, consultations, prescriptions),
    [medicalRecords, consultations, prescriptions],
  );

  // Build prescription list with patient names
  const prescriptionList = useMemo(() => {
    const rxMap = new Map<string, Prescription>();
    for (const rx of DOCTOR_DEMO_PRESCRIPTIONS) {
      rxMap.set(rx.id, rx);
    }
    for (const rx of prescriptions) {
      rxMap.set(rx.id, rx);
    }

    const patientNameById = new Map<string, string>();
    for (const [, cons] of consultations.entries()) {
      if (cons.patient?.name) {
        patientNameById.set(cons.patientId, cons.patient.name);
      }
    }
    for (const [pid, pname] of Object.entries(PATIENT_NAME_MAP)) {
      if (!patientNameById.has(pid)) {
        patientNameById.set(pid, pname);
      }
    }

    return Array.from(rxMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((rx) => ({
        ...rx,
        patientName: patientNameById.get(rx.patientId) || PATIENT_NAME_MAP[rx.patientId] || rx.patientId,
      }));
  }, [prescriptions, consultations]);

  // Stats
  const stats = useMemo(() => {
    const total = mergedRecords.length;
    const draft = mergedRecords.filter((r) => r.status === 'draft').length;
    const selesai = mergedRecords.filter((r) => r.status === 'selesai').length;
    const ditinjau = mergedRecords.filter((r) => r.status === 'ditinjau').length;
    return { total, draft, selesai, ditinjau };
  }, [mergedRecords]);

  // Filtered records for Daftar Rekam Medis
  const filteredRecords = useMemo(() => {
    let records = mergedRecords;
    if (statusFilter !== 'all') {
      records = records.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      records = records.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          (r.rmNumber && r.rmNumber.toLowerCase().includes(q)) ||
          (r.diagnosis && r.diagnosis.toLowerCase().includes(q)),
      );
    }
    return records;
  }, [mergedRecords, statusFilter, searchQuery]);

  // Timeline data: group by patient
  const timelinePatients = useMemo(() => {
    const patientMap = new Map<string, { patientId: string; patientName: string; records: MergedMedicalRecord[] }>();
    for (const mr of mergedRecords) {
      if (!patientMap.has(mr.patientId)) {
        patientMap.set(mr.patientId, {
          patientId: mr.patientId,
          patientName: mr.patientName,
          records: [],
        });
      }
      patientMap.get(mr.patientId)!.records.push(mr);
    }
    return Array.from(patientMap.values()).sort((a, b) => b.records.length - a.records.length);
  }, [mergedRecords]);

  const selectedTimelinePatient = useMemo(
    () => timelinePatients.find((p) => p.patientId === selectedTimelinePatientId),
    [timelinePatients, selectedTimelinePatientId],
  );

  // Selected record for detail dialog
  const selectedRecord = useMemo(
    () => mergedRecords.find((r) => r.id === (selectedRecordId || selectedTimelineRecordId)),
    [mergedRecords, selectedRecordId, selectedTimelineRecordId],
  );

  // Handle status change
  const handleStatusChange = (recordId: string, newStatus: MedicalRecordStatus) => {
    updateMedicalRecord(recordId, { status: newStatus });
  };

  // Doctor specialization display
  const doctorSpecialization = useMemo(() => {
    const spec = currentUser?.doctorProfile?.specialization;
    return spec ? SPECIALIZATION_MAP[spec] || spec : 'Dokter';
  }, [currentUser]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Rekam Medis</h2>
          <p className="text-sm text-muted-foreground">
            {doctorSpecialization} — {currentUser?.name || 'Dokter'}
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Terintegrasi SATUSEHAT
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Rekam Medis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.selesai}</p>
              <p className="text-xs text-muted-foreground">Selesai</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.ditinjau}</p>
              <p className="text-xs text-muted-foreground">Ditinjau</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="records-list" className="flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Daftar Rekam Medis</span>
            <span className="sm:hidden">Daftar RM</span>
          </TabsTrigger>
          <TabsTrigger value="patient-timeline" className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Timeline Pasien</span>
            <span className="sm:hidden">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-1.5">
            <Pill className="w-4 h-4" />
            <span className="hidden sm:inline">Resep Obat</span>
            <span className="sm:hidden">Resep</span>
          </TabsTrigger>
          <TabsTrigger value="screening" className="flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Skrining Komprehensif</span>
            <span className="sm:hidden">Skrining</span>
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* Tab 1: Daftar Rekam Medis                                         */}
        {/* ================================================================= */}
        <TabsContent value="records-list" className="space-y-4 mt-0">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, nomor RM, diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
                <SelectItem value="ditinjau">Ditinjau</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Records Cards */}
          {filteredRecords.length === 0 ? (
            <Card className="border-0">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada rekam medis yang ditemukan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 custom-scrollbar">
              {filteredRecords.map((record) => (
                <Card
                  key={record.id}
                  className="border-0 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedRecordId(record.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {record.patientName}
                            </p>
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px] shrink-0', getStatusBadgeClasses(record.status))}
                            >
                              {statusLabel(record.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Hash className="w-3 h-3 inline mr-0.5" />
                            {record.rmNumber}
                          </p>
                          {record.diagnosis && (
                            <p className="text-sm font-medium text-foreground mt-1 truncate">
                              {record.diagnosis}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 inline mr-0.5" />
                              {formatDate(record.recordDate)}
                            </p>
                            {record.consultationType && (
                              <p className="text-xs text-muted-foreground">
                                <Stethoscope className="w-3 h-3 inline mr-0.5" />
                                {consultationTypeLabel(record.consultationType)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 2: Timeline Pasien                                            */}
        {/* ================================================================= */}
        <TabsContent value="patient-timeline" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Patient List */}
            <div className="md:col-span-1 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Daftar Pasien
              </h3>
              <div className="max-h-[calc(100vh-360px)] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {timelinePatients.map((patient) => (
                  <Card
                    key={patient.patientId}
                    className={cn(
                      'border-0 cursor-pointer transition-all',
                      selectedTimelinePatientId === patient.patientId
                        ? 'ring-2 ring-primary shadow-md'
                        : 'hover:shadow-sm',
                    )}
                    onClick={() => {
                      setSelectedTimelinePatientId(patient.patientId);
                      setSelectedTimelineRecordId(null);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {patient.patientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {patient.records.length} rekam medis
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="md:col-span-2">
              {!selectedTimelinePatient ? (
                <Card className="border-0">
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Pilih pasien untuk melihat timeline konsultasi
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {selectedTimelinePatient.patientName}
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedTimelinePatient.records.length} kunjungan
                    </Badge>
                  </div>

                  <div className="relative space-y-0 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedTimelinePatient.records.map((record, idx) => (
                      <div key={record.id} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full shrink-0 mt-1.5',
                              getStatusDotClasses(record.status),
                            )}
                          />
                          {idx < selectedTimelinePatient.records.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border" />
                          )}
                        </div>

                        {/* Timeline card */}
                        <Card
                          className="border-0 mb-3 flex-1 hover:shadow-sm transition-shadow cursor-pointer"
                          onClick={() => setSelectedTimelineRecordId(record.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-foreground">
                                    {record.diagnosis || 'Tanpa diagnosis'}
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className={cn('text-[10px]', getStatusBadgeClasses(record.status))}
                                  >
                                    {statusLabel(record.status)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  <Calendar className="w-3 h-3 inline mr-0.5" />
                                  {formatDate(record.recordDate)} — {formatTime(record.recordDate)}
                                </p>
                                {record.consultationType && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    <Stethoscope className="w-3 h-3 inline mr-0.5" />
                                    {consultationTypeLabel(record.consultationType)}
                                  </p>
                                )}
                                {record.treatment && (
                                  <p className="text-xs text-foreground mt-1 line-clamp-2">
                                    {record.treatment}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 3: Resep Obat                                                 */}
        {/* ================================================================= */}
        <TabsContent value="prescriptions" className="space-y-4 mt-0">
          {prescriptionList.length === 0 ? (
            <Card className="border-0">
              <CardContent className="p-8 text-center">
                <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Belum ada resep obat yang diterbitkan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 custom-scrollbar">
              {prescriptionList.map((rx) => {
                const itemsTotal = (rx.items || []).reduce(
                  (sum, item) => sum + (item.price || 0) * item.quantity,
                  0,
                );
                return (
                  <Card key={rx.id} className="border-0">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                            <Pill className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              Resep untuk {rx.patientName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 inline mr-0.5" />
                              {formatDate(rx.createdAt)}
                            </p>
                            {rx.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <StickyNote className="w-3 h-3 inline mr-0.5" />
                                {rx.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] shrink-0',
                            rx.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                          )}
                        >
                          {rx.status === 'active' ? 'Aktif' : 'Selesai'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Separator className="mb-3" />
                      <div className="space-y-2">
                        {(rx.items || []).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{item.medicineName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.dosage} — {item.frequency} — {item.duration}
                              </p>
                              {item.instructions && (
                                <p className="text-xs text-muted-foreground italic">
                                  {item.instructions}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="font-medium text-foreground">
                                {item.quantity}x
                              </p>
                              {item.price ? (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.price)}/unit
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Total</span>
                        </div>
                        <p className="font-bold text-foreground text-sm">
                          {formatCurrency(itemsTotal)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ================================================================= */}
        {/* Tab 4: Skrining Komprehensif                                      */}
        {/* ================================================================= */}
        <TabsContent value="screening" className="space-y-4 mt-0">
          {(() => {
            const doctorScreenings = screeningForms
              .filter((f: ScreeningForm) => f.doctorId === currentUser?.id)
              .sort((a: ScreeningForm, b: ScreeningForm) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            if (doctorScreenings.length === 0) {
              return (
                <Card className="border-0">
                  <CardContent className="p-8 text-center">
                    <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada form skrining yang dikirim
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Form skrining akan muncul setelah Anda mengirimkannya ke pasien
                    </p>
                  </CardContent>
                </Card>
              );
            }

            const riskColors: Record<RiskCategory, { bg: string; text: string; border: string }> = {
              rendah: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
              sedang: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
              tinggi: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
            };

            const screeningStatusBadge = (status: string) => {
              switch (status) {
                case 'sent':
                  return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
                case 'opened':
                  return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
                case 'in_progress':
                  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0';
                case 'draft':
                  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
                case 'completed':
                  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0';
                case 'reviewed':
                  return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border-0';
                default:
                  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
              }
            };

            const screeningStatusLabel = (status: string) => {
              switch (status) {
                case 'sent': return 'Terkirim';
                case 'opened': return 'Dibuka';
                case 'in_progress': return 'Sedang Diisi';
                case 'draft': return 'Draft';
                case 'completed': return 'Selesai';
                case 'reviewed': return 'Ditinjau';
                default: return status;
              }
            };

            return (
              <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 custom-scrollbar">
                {doctorScreenings.map((form: ScreeningForm) => {
                  const triage = form.triageResult;
                  const triageColor = triage ? TRIAGE_COLORS[triage.level as TriageLevel] : null;
                  const patientName = PATIENT_NAME_MAP[form.patientId] || form.patientId;
                  const chiefComplaint = form.clinicalSummary?.chiefComplaint;

                  return (
                    <Card
                      key={form.id}
                      className="border-0 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedScreeningId(form.id);
                        setScreeningDoctorNotes(form.doctorNotes || '');
                        setScreeningFollowUp(form.followUp || '');
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                              triageColor ? triageColor.bg : 'bg-primary/10'
                            )}>
                              <ClipboardCheck className={cn('w-5 h-5', triageColor ? triageColor.text : 'text-primary')} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {patientName}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={cn('text-[10px] shrink-0', screeningStatusBadge(form.status))}
                                >
                                  {screeningStatusLabel(form.status)}
                                </Badge>
                                {triage && triageColor && (
                                  <Badge className={cn('text-[10px] font-bold shrink-0', triageColor.bg, triageColor.text, triageColor.border, 'border')}>
                                    {triage.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <Calendar className="w-3 h-3 inline mr-0.5" />
                                {formatDate(form.createdAt)}
                              </p>
                              {chiefComplaint && chiefComplaint !== 'Tidak disebutkan' && (
                                <p className="text-sm text-foreground mt-1 truncate">
                                  <Stethoscope className="w-3 h-3 inline mr-0.5 text-primary" />
                                  {chiefComplaint}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ================================================================= */}
      {/* Detail Dialog (Medical Record)                                    */}
      {/* ================================================================= */}
      <Dialog
        open={!!selectedRecord}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecordId(null);
            setSelectedTimelineRecordId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Detail Rekam Medis</span>
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px]', getStatusBadgeClasses(selectedRecord.status))}
                  >
                    {statusLabel(selectedRecord.status)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Patient Info */}
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {selectedRecord.patientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Hash className="w-3 h-3 inline mr-0.5" />
                      {selectedRecord.rmNumber}
                    </p>
                  </div>
                </div>

                {/* Date & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal</p>
                      <p className="text-sm font-medium">
                        {formatDate(selectedRecord.recordDate)} {formatTime(selectedRecord.recordDate)}
                      </p>
                    </div>
                  </div>
                  {selectedRecord.consultationType && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Jenis Konsultasi</p>
                        <p className="text-sm font-medium">
                          {consultationTypeLabel(selectedRecord.consultationType)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Diagnosis */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BadgeCheck className="w-4 h-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Diagnosis
                    </p>
                  </div>
                  <p className="text-sm text-foreground font-medium">
                    {selectedRecord.diagnosis || 'Belum ada diagnosis'}
                  </p>
                </div>

                {/* Symptoms */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Gejala
                    </p>
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedRecord.symptoms || 'Tidak dicatat'}
                  </p>
                </div>

                {/* Treatment */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Syringe className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pengobatan
                    </p>
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedRecord.treatment || 'Tidak dicatat'}
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <StickyNote className="w-4 h-4 text-sky-500" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Catatan
                    </p>
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedRecord.notes || 'Tidak ada catatan'}
                  </p>
                </div>

                {/* Linked Prescription */}
                {selectedRecord.linkedPrescription && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Pill className="w-4 h-4 text-violet-500" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Resep Terkait
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {(selectedRecord.linkedPrescription.items || []).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <p className="font-medium text-foreground">{item.medicineName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.dosage} — {item.frequency}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                        {selectedRecord.linkedPrescription.notes && (
                          <p className="text-xs text-muted-foreground italic pt-1 border-t border-border">
                            {selectedRecord.linkedPrescription.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Status Change */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Ubah Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedRecord.status === 'draft' ? 'default' : 'outline'}
                      className={cn(
                        selectedRecord.status === 'draft'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : '',
                      )}
                      onClick={() => handleStatusChange(selectedRecord.id, 'draft')}
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Draft
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedRecord.status === 'ditinjau' ? 'default' : 'outline'}
                      className={cn(
                        selectedRecord.status === 'ditinjau'
                          ? 'bg-sky-500 hover:bg-sky-600 text-white'
                          : '',
                      )}
                      onClick={() => handleStatusChange(selectedRecord.id, 'ditinjau')}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ditinjau
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedRecord.status === 'selesai' ? 'default' : 'outline'}
                      className={cn(
                        selectedRecord.status === 'selesai'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : '',
                      )}
                      onClick={() => handleStatusChange(selectedRecord.id, 'selesai')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Selesai
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRecordId(null);
                    setSelectedTimelineRecordId(null);
                  }}
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Screening Detail Dialog (Doctor View)                             */}
      {/* ================================================================= */}
      <Dialog
        open={!!selectedScreeningId}
        onOpenChange={(open) => {
          if (!open) setSelectedScreeningId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedScreeningId && (() => {
            const form = screeningForms.find((f: ScreeningForm) => f.id === selectedScreeningId);
            if (!form) return null;

            const triage = form.triageResult;
            const summary = form.clinicalSummary;
            const triageColor = triage ? TRIAGE_COLORS[triage.level as TriageLevel] : null;
            const patientName = PATIENT_NAME_MAP[form.patientId] || form.patientId;

            const riskColors: Record<RiskCategory, { bg: string; text: string; border: string }> = {
              rendah: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
              sedang: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
              tinggi: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
            };

            const scoredModules = (Object.keys(form.moduleScores) as ScreeningModuleId[])
              .map((modId) => ({
                id: modId,
                label: MODULE_LABELS[modId] || modId,
                icon: MODULE_ICON_MAP[modId] || <ClipboardCheck className="w-4 h-4" />,
                ...form.moduleScores[modId],
              }));

            const screeningStatusBadge = (status: string) => {
              switch (status) {
                case 'sent': return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
                case 'opened': return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
                case 'in_progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0';
                case 'draft': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
                case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0';
                case 'reviewed': return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border-0';
                default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
              }
            };

            const screeningStatusLabel = (status: string) => {
              switch (status) {
                case 'sent': return 'Terkirim';
                case 'opened': return 'Dibuka';
                case 'in_progress': return 'Sedang Diisi';
                case 'draft': return 'Draft';
                case 'completed': return 'Selesai';
                case 'reviewed': return 'Ditinjau';
                default: return status;
              }
            };

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <span>Detail Skrining Komprehensif</span>
                    <Badge variant="secondary" className={cn('text-[10px]', screeningStatusBadge(form.status))}>
                      {screeningStatusLabel(form.status)}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Patient Info */}
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        {formatDate(form.createdAt)} {form.completedAt && `— Selesai: ${formatDate(form.completedAt)}`}
                      </p>
                    </div>
                  </div>

                  {/* Triage Result */}
                  {triage && (
                    <div className={cn('rounded-xl p-4', triageColor?.bg || 'bg-gray-50')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', triageColor?.bg)}>
                          <AlertTriangle className={cn('w-4 h-4', triageColor?.text)} />
                        </div>
                        <div>
                          <p className={cn('font-bold text-sm', triageColor?.text)}>{triage.label}</p>
                          <p className={cn('text-xs', triageColor?.text, 'opacity-80')}>{triage.description}</p>
                        </div>
                      </div>
                      <p className={cn('text-xs mt-1', triageColor?.text, 'opacity-70')}>{triage.recommendation}</p>
                    </div>
                  )}

                  {/* Clinical Summary */}
                  {summary && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Ringkasan Klinis</p>
                        <div className="space-y-2">
                          {summary.chiefComplaint && (
                            <div className="flex items-start gap-2">
                              <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-foreground"><span className="font-medium">Keluhan Utama:</span> {summary.chiefComplaint}</p>
                            </div>
                          )}

                          {summary.vitalSigns && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-5">
                              {summary.vitalSigns.bloodPressure && <span className="text-xs text-muted-foreground">TD: {summary.vitalSigns.bloodPressure} mmHg</span>}
                              {summary.vitalSigns.heartRate && <span className="text-xs text-muted-foreground">Nadi: {summary.vitalSigns.heartRate} bpm</span>}
                              {summary.vitalSigns.temperature && <span className="text-xs text-muted-foreground">Suhu: {summary.vitalSigns.temperature}°C</span>}
                              {summary.vitalSigns.oxygenSat && <span className="text-xs text-muted-foreground">SpO2: {summary.vitalSigns.oxygenSat}%</span>}
                              {summary.vitalSigns.weight && <span className="text-xs text-muted-foreground">BB: {summary.vitalSigns.weight} kg</span>}
                              {summary.vitalSigns.bloodSugar && <span className="text-xs text-muted-foreground">GDS: {summary.vitalSigns.bloodSugar} mg/dL</span>}
                            </div>
                          )}

                          {summary.redFlags && summary.redFlags.length > 0 && (
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-red-600">Tanda Bahaya:</p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {summary.redFlags.map((flag, idx) => (
                                    <Badge key={idx} className="text-[10px] bg-red-50 text-red-700 border-red-200 border">{flag}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {summary.chronicDiseases && summary.chronicDiseases.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Pill className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {summary.chronicDiseases.map((d, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px]">{d}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {summary.painScore !== null && summary.painScore > 0 && (
                            <div className="flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="text-xs text-foreground">Skala Nyeri: <span className={cn('font-bold', summary.painScore >= 7 ? 'text-red-600' : summary.painScore >= 4 ? 'text-amber-600' : 'text-emerald-600')}>{summary.painScore}/10</span></span>
                            </div>
                          )}

                          {summary.mentalStatus && summary.mentalStatus !== 'Normal' && (
                            <div className="flex items-center gap-2">
                              <Heart className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span className={cn('text-xs font-medium', summary.mentalStatus === 'KRISIS MENTAL' ? 'text-red-600' : 'text-foreground')}>
                                Status Mental: {summary.mentalStatus}
                              </span>
                            </div>
                          )}

                          {summary.functionalStatus && summary.functionalStatus !== 'Mandiri' && (
                            <div className="flex items-center gap-2">
                              <Ruler className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-xs text-foreground">Status Fungsional: {summary.functionalStatus}</span>
                            </div>
                          )}

                          {summary.homeCareNeed && summary.homeCareNeed !== 'Tidak diperlukan' && (
                            <div className="flex items-center gap-2">
                              <ClipboardCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                              <span className="text-xs text-foreground">Kebutuhan Home Care: {summary.homeCareNeed}</span>
                            </div>
                          )}

                          {summary.palliativeStatus && summary.palliativeStatus !== 'Tidak diperlukan' && (
                            <div className="flex items-center gap-2">
                              <Heart className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span className="text-xs text-foreground">Status Paliatif: {summary.palliativeStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Module Scores */}
                  {scoredModules.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Hasil Modul Skrining</p>
                        <div className="space-y-1.5">
                          {scoredModules.map((mod) => {
                            const modColor = riskColors[mod.riskCategory as RiskCategory];
                            return (
                              <div key={mod.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                                <span className="text-sm shrink-0">{MODULE_ICON_MAP[mod.id] || <ClipboardCheck className="w-4 h-4" />}</span>
                                <span className="text-xs text-foreground flex-1 min-w-0 truncate">{mod.label}</span>
                                <span className="text-xs text-muted-foreground shrink-0">Skor: {mod.score}</span>
                                {modColor && (
                                  <Badge className={cn('text-[10px] shrink-0', modColor.bg, modColor.text, modColor.border, 'border')}>
                                    {mod.riskCategory === 'tinggi' ? 'Tinggi' : mod.riskCategory === 'sedang' ? 'Sedang' : 'Rendah'}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Recommendations */}
                        {scoredModules.some((m) => m.recommendations.length > 0 && m.riskCategory !== 'rendah') && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-foreground">Rekomendasi:</p>
                            <ul className="mt-1 space-y-0.5">
                              {scoredModules
                                .filter((m) => m.riskCategory !== 'rendah')
                                .flatMap((m) => m.recommendations.slice(0, 2).map((rec) => ({ rec, modLabel: m.label })))
                                .slice(0, 8)
                                .map((item, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                    <span><span className="font-medium text-foreground">{item.modLabel}:</span> {item.rec}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Clinical Files */}
                  {form.clinicalFiles && form.clinicalFiles.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Bukti Klinis</p>
                        <div className="flex flex-wrap gap-2">
                          {form.clinicalFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-foreground">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Doctor Notes & Follow-up (editable if completed) */}
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Catatan & Tindak Lanjut Dokter</p>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Catatan Dokter</label>
                      {form.status === 'completed' || form.status === 'reviewed' ? (
                        <textarea
                          className="w-full text-sm bg-muted/50 rounded-lg p-3 min-h-[60px] border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          value={screeningDoctorNotes}
                          onChange={(e) => setScreeningDoctorNotes(e.target.value)}
                          placeholder="Tulis catatan dokter..."
                        />
                      ) : (
                        <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                          {form.doctorNotes || 'Belum ada catatan'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tindak Lanjut</label>
                      {form.status === 'completed' || form.status === 'reviewed' ? (
                        <textarea
                          className="w-full text-sm bg-muted/50 rounded-lg p-3 min-h-[60px] border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          value={screeningFollowUp}
                          onChange={(e) => setScreeningFollowUp(e.target.value)}
                          placeholder="Tulis tindak lanjut..."
                        />
                      ) : (
                        <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                          {form.followUp || 'Belum ada tindak lanjut'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-4 flex gap-2">
                  {(form.status === 'completed') && (
                    <Button
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => {
                        updateScreeningForm(form.id, {
                          doctorNotes: screeningDoctorNotes,
                          followUp: screeningFollowUp,
                          status: 'reviewed',
                          reviewedAt: new Date().toISOString(),
                        });
                        setSelectedScreeningId(null);
                      }}
                    >
                      <BadgeCheck className="w-4 h-4 mr-1" />
                      Tinjau
                    </Button>
                  )}
                  {(form.status === 'reviewed') && (
                    <Button
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => {
                        updateScreeningForm(form.id, {
                          doctorNotes: screeningDoctorNotes,
                          followUp: screeningFollowUp,
                        });
                        setSelectedScreeningId(null);
                      }}
                    >
                      <CheckCheck className="w-4 h-4 mr-1" />
                      Simpan Perubahan
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedScreeningId(null)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patient View — Demo data
// ---------------------------------------------------------------------------

const demoConsultations = [
  {
    id: 'c1',
    date: '2025-01-10',
    doctorName: 'dr. Andi Pratama',
    specialization: 'Penyakit Dalam',
    diagnosis: 'Gastritis Akut',
    treatment: 'Obat maag (Antasida), diet ringan, hindari makanan pedas',
    status: 'completed',
    notes: 'Pasien mengeluh nyeri ulu hati sejak 3 hari. Direkomendasikan endoskopi jika kambuh.',
  },
  {
    id: 'c2',
    date: '2024-12-28',
    doctorName: 'dr. Siti Rahayu',
    specialization: 'Kebidanan',
    diagnosis: 'Kehamilan Trimester 2 - Normal',
    treatment: 'Suplemen asam folat, vitamin B6, kontrol rutin tiap bulan',
    status: 'completed',
    notes: 'USG menunjukkan perkembangan janin normal. Berat janin sesuai usia kehamilan.',
  },
  {
    id: 'c3',
    date: '2024-12-15',
    doctorName: 'dr. Budi Santoso',
    specialization: 'Anak',
    diagnosis: 'ISPA (Infeksi Saluran Pernapasan Atas)',
    treatment: 'Paracetamol sirup, istirahat cukup, minum air putih banyak',
    status: 'completed',
    notes: 'Demam sudah turun setelah 2 hari. Batuk masih ada, kontrol 1 minggu.',
  },
  {
    id: 'c4',
    date: '2024-11-20',
    doctorName: 'dr. Andi Pratama',
    specialization: 'Penyakit Dalam',
    diagnosis: 'Diabetes Mellitus Tipe 2',
    treatment: 'Metformin 500mg 2x sehari, diet rendah gula, olahraga teratur',
    status: 'active',
    notes: 'Gula darah puasa 180 mg/dL. Perlu monitoring rutin dan evaluasi HbA1c.',
  },
];

const demoLabResults = [
  {
    id: 'l1',
    date: '2025-01-10',
    testName: 'Darah Lengkap',
    result: 'Hb: 12.5 g/dL, Leukosit: 7.800/μL, Trombosit: 250.000/μL',
    referenceRange: 'Hb: 12-16 g/dL, Leukosit: 4.000-11.000/μL, Trombosit: 150.000-400.000/μL',
    status: 'normal',
  },
  {
    id: 'l2',
    date: '2025-01-10',
    testName: 'Gula Darah Puasa',
    result: '180 mg/dL',
    referenceRange: '70-100 mg/dL',
    status: 'high',
  },
  {
    id: 'l3',
    date: '2024-12-28',
    testName: 'USG Obstetri',
    result: 'Janin tunggal hidup, usia kehamilan 22 minggu, posisi kepala',
    referenceRange: 'Normal sesuai usia kehamilan',
    status: 'normal',
  },
  {
    id: 'l4',
    date: '2024-12-15',
    testName: 'Throat Swab',
    result: 'Streptococcus pyogenes: Negatif',
    referenceRange: 'Negatif',
    status: 'normal',
  },
  {
    id: 'l5',
    date: '2024-11-20',
    testName: 'HbA1c',
    result: '8.2%',
    referenceRange: '< 5.7% (normal), 5.7-6.4% (pre-diabetes), >= 6.5% (diabetes)',
    status: 'high',
  },
];

const demoPrescriptions = [
  {
    id: 'p1',
    date: '2025-01-10',
    doctor: 'dr. Andi Pratama',
    items: [
      { name: 'Antasida', dosage: '3x sehari setelah makan', quantity: 30, price: 22000 },
      { name: 'Omeprazole 20mg', dosage: '1x sehari sebelum sarapan', quantity: 14, price: 35000 },
    ],
    status: 'active',
  },
  {
    id: 'p2',
    date: '2024-12-28',
    doctor: 'dr. Siti Rahayu',
    items: [
      { name: 'Asam Folat 400mcg', dosage: '1x sehari', quantity: 30, price: 18000 },
      { name: 'Vitamin B6', dosage: '1x sehari', quantity: 30, price: 25000 },
    ],
    status: 'paid',
    invoiceNumber: 'INV-2024-028',
    paidAt: '2024-12-28T15:30:00Z',
    paymentMethod: 'qris' as PaymentMethod,
  },
  {
    id: 'p3',
    date: '2024-12-15',
    doctor: 'dr. Budi Santoso',
    items: [
      { name: 'Paracetamol Sirup 120mg/5ml', dosage: '3x sehari jika demam', quantity: 60, price: 15000 },
    ],
    status: 'paid',
    invoiceNumber: 'INV-2024-022',
    paidAt: '2024-12-16T09:15:00Z',
    paymentMethod: 'gopay' as PaymentMethod,
  },
  {
    id: 'p4',
    date: '2024-11-20',
    doctor: 'dr. Andi Pratama',
    items: [
      { name: 'Metformin 500mg', dosage: '2x sehari setelah makan', quantity: 60, price: 22000 },
    ],
    status: 'active',
  },
];

// ---------------------------------------------------------------------------
// Patient view: unified consultation/prescription record
// ---------------------------------------------------------------------------

interface PatientConsultationRecord {
  id: string;
  date: string;
  doctorName: string;
  specialization: string;
  diagnosis: string;
  treatment: string;
  status: string;
  notes: string;
  symptoms?: string;
  rmNumber?: string;
  consultationType?: string;
}

interface PatientPrescriptionRecord {
  id: string;
  date: string;
  doctor: string;
  items: { name: string; dosage: string; quantity: number; frequency?: string; duration?: string; instructions?: string; price?: number }[];
  status: string;
  notes?: string;
  // Reference to original store Prescription (for payment flow)
  storePrescriptionId?: string;
  // Payment proof info (for paid prescriptions)
  paymentId?: string;
  invoiceNumber?: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
}

// Build patient consultation records: merge demo + store medicalRecords + store consultations
function buildPatientConsultations(
  currentPatientId: string,
  storeMedicalRecords: MedicalRecord[],
  storeConsultations: Consultation[],
  storePrescriptions: Prescription[],
): PatientConsultationRecord[] {
  // Doctor name lookup
  const DOCTOR_NAME_MAP: Record<string, string> = {
    'doc-sarah': 'dr. Sarah Wijaya',
    'doc-ahmad': 'dr. Ahmad Rizki',
    'doc-lisa': 'dr. Lisa Permata',
    'doc-dewi': 'dr. Dewi Sartika',
    'doc-budi': 'drg. Budi Santoso',
  };

  const DOCTOR_SPEC_MAP: Record<string, string> = {
    'doc-sarah': 'Dokter Umum',
    'doc-ahmad': 'Dokter Anak',
    'doc-lisa': 'Penyakit Dalam',
    'doc-dewi': 'Dokter Kebidanan',
    'doc-budi': 'Dokter Gigi',
  };

  // Also try to extract doctor names from consultations
  const doctorNameById = new Map<string, string>(Object.entries(DOCTOR_NAME_MAP));
  const doctorSpecById = new Map<string, string>(Object.entries(DOCTOR_SPEC_MAP));
  for (const cons of storeConsultations) {
    if (cons.doctor?.name && !doctorNameById.has(cons.doctorId)) {
      doctorNameById.set(cons.doctorId, cons.doctor.name);
    }
  }

  // Build consultationId → consultation lookup
  const consById = new Map<string, Consultation>();
  for (const c of storeConsultations) {
    consById.set(c.id, c);
  }

  // Start with demo consultations
  const recordMap = new Map<string, PatientConsultationRecord>();
  for (const dc of demoConsultations) {
    recordMap.set(dc.id, dc);
  }

  // Add store medical records for this patient
  for (const mr of storeMedicalRecords) {
    // Filter to only this patient's records
    if (mr.patientId !== currentPatientId) continue;

    // Resolve doctor info
    let doctorName = '';
    let specialization = '';
    let consultationType: string | undefined;

    if (mr.consultationId) {
      const cons = consById.get(mr.consultationId);
      if (cons) {
        doctorName = doctorNameById.get(cons.doctorId) || cons.doctor?.name || '';
        specialization = doctorSpecById.get(cons.doctorId) || '';
        consultationType = cons.type;
      }
    }

    // Determine status
    const isActive = mr.status === 'draft' || mr.status === 'ditinjau';
    const statusStr = isActive ? 'active' : 'completed';

    recordMap.set(mr.id, {
      id: mr.id,
      date: mr.recordDate || mr.createdAt,
      doctorName: doctorName || 'Dokter',
      specialization: specialization || 'Dokter Umum',
      diagnosis: mr.diagnosis || 'Tanpa diagnosis',
      treatment: mr.treatment || '-',
      status: statusStr,
      notes: mr.notes || '',
      symptoms: mr.symptoms || '',
      rmNumber: mr.rmNumber || '',
      consultationType,
    });
  }

  // Sort by date descending (newest first)
  return Array.from(recordMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// Build patient prescription records: merge demo + store prescriptions
function buildPatientPrescriptions(
  currentPatientId: string,
  storePrescriptions: Prescription[],
  storeConsultations: Consultation[],
  storePayments: Payment[],
): PatientPrescriptionRecord[] {
  // Doctor name lookup
  const DOCTOR_NAME_MAP: Record<string, string> = {
    'doc-sarah': 'dr. Sarah Wijaya',
    'doc-ahmad': 'dr. Ahmad Rizki',
    'doc-lisa': 'dr. Lisa Permata',
    'doc-dewi': 'dr. Dewi Sartika',
    'doc-budi': 'drg. Budi Santoso',
  };

  const doctorNameById = new Map<string, string>(Object.entries(DOCTOR_NAME_MAP));
  for (const cons of storeConsultations) {
    if (cons.doctor?.name && !doctorNameById.has(cons.doctorId)) {
      doctorNameById.set(cons.doctorId, cons.doctor.name);
    }
  }

  // Build prescriptionId → payment lookup for paid prescriptions
  const paymentByRxId = new Map<string, Payment>();
  for (const pay of storePayments) {
    if (pay.referenceId && pay.type === 'prescription' && pay.status === 'success') {
      paymentByRxId.set(pay.referenceId, pay);
    }
  }

  const rxMap = new Map<string, PatientPrescriptionRecord>();

  // Add demo prescriptions
  for (const dp of demoPrescriptions) {
    rxMap.set(dp.id, dp);
  }

  // Add store prescriptions for this patient
  for (const rx of storePrescriptions) {
    if (rx.patientId !== currentPatientId) continue;

    const doctorName = doctorNameById.get(rx.doctorId) || 'Dokter';
    const items = (rx.items || []).map((item) => ({
      name: item.medicineName,
      dosage: item.dosage,
      quantity: item.quantity,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      price: item.price,
    }));

    // Check if this prescription has a linked payment
    const linkedPayment = paymentByRxId.get(rx.id);
    const isPaid = rx.status === 'paid' || !!linkedPayment;

    rxMap.set(rx.id, {
      id: rx.id,
      date: rx.createdAt,
      doctor: doctorName,
      items,
      status: isPaid ? 'paid' : rx.status === 'active' ? 'active' : 'completed',
      notes: rx.notes,
      storePrescriptionId: rx.id,
      paymentId: linkedPayment?.id,
      invoiceNumber: linkedPayment?.invoiceNumber,
      paidAt: linkedPayment?.paidAt,
      paymentMethod: linkedPayment?.method,
    });
  }

  // Sort by date descending (newest first)
  return Array.from(rxMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

// ---------------------------------------------------------------------------
// PatientMedicalRecordsView
// ---------------------------------------------------------------------------

function PatientMedicalRecordsView() {
  const { currentUser, medicalRecords, consultations, prescriptions, payments, setActivePanel, setPendingPrescriptionCheckout } = useStore();
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofPrescription, setProofPrescription] = useState<PatientPrescriptionRecord | null>(null);

  const patientInfo = useMemo(
    () => ({
      bloodType: currentUser?.patientProfile?.bloodType || 'O+',
      allergies: currentUser?.patientProfile?.allergies || 'Penisilin, Alergi debu',
      medicalHistory:
        currentUser?.patientProfile?.medicalHistory || 'Diabetes Mellitus Tipe 2, Gastritis kronis',
      height: currentUser?.patientProfile?.height || 165,
      weight: currentUser?.patientProfile?.weight || 62,
    }),
    [currentUser],
  );

  // Resolve current patient ID (could be currentUser.id or a pat-xxx key)
  const currentPatientId = useMemo(() => {
    if (!currentUser) return '';
    // If the id is already a pat- key, use it
    if (currentUser.id.startsWith('pat-')) return currentUser.id;
    // Try matching by name
    const key = extractPatientKey(currentUser.name || '');
    return key || currentUser.id;
  }, [currentUser]);

  // Build merged consultation records (demo + store), sorted newest first
  const patientConsultations = useMemo(
    () => buildPatientConsultations(currentPatientId, medicalRecords, consultations, prescriptions),
    [currentPatientId, medicalRecords, consultations, prescriptions],
  );

  // Build merged prescription records (demo + store), sorted newest first
  const patientPrescriptions = useMemo(
    () => buildPatientPrescriptions(currentPatientId, prescriptions, consultations, payments),
    [currentPatientId, prescriptions, consultations, payments],
  );

  // Stats
  const patientStats = useMemo(() => {
    const totalConsultations = patientConsultations.length;
    const activeConsultations = patientConsultations.filter((c) => c.status === 'active').length;
    const totalPrescriptions = patientPrescriptions.length;
    const activePrescriptions = patientPrescriptions.filter((p) => p.status === 'active').length;
    return { totalConsultations, activeConsultations, totalPrescriptions, activePrescriptions };
  }, [patientConsultations, patientPrescriptions]);

  // Handle "Bayar Sekarang" for a prescription
  const handlePayPrescription = useCallback((rx: PatientPrescriptionRecord) => {
    // Find the full store prescription by storePrescriptionId
    const storeRx = prescriptions.find((p) => p.id === rx.storePrescriptionId);

    if (storeRx) {
      setPendingPrescriptionCheckout(storeRx);
      setActivePanel('payments');
    } else {
      // For demo prescriptions without store data, create a synthetic one
      const syntheticRx: Prescription = {
        id: rx.id,
        consultationId: '',
        doctorId: '',
        patientId: currentPatientId,
        status: 'active',
        notes: rx.notes,
        createdAt: rx.date,
        updatedAt: rx.date,
        items: rx.items.map((item, i) => ({
          id: `${rx.id}-item-${i}`,
          prescriptionId: rx.id,
          medicineName: item.name,
          dosage: item.dosage,
          quantity: item.quantity,
          frequency: item.frequency || '',
          duration: item.duration || '',
          instructions: item.instructions,
          price: item.price,
        })),
      };

      setPendingPrescriptionCheckout(syntheticRx);
      setActivePanel('payments');
    }
  }, [prescriptions, currentPatientId, setActivePanel, setPendingPrescriptionCheckout]);

  // Handle viewing payment proof
  const handleViewProof = useCallback((rx: PatientPrescriptionRecord) => {
    setProofPrescription(rx);
    setProofDialogOpen(true);
  }, []);

  // Handle downloading payment proof
  const handleDownloadProof = useCallback((rx: PatientPrescriptionRecord) => {
    const items = rx.items.map((item) => ({
      name: item.name,
      dosage: item.dosage,
      quantity: item.quantity,
      price: item.price || 0,
    }));

    const params = new URLSearchParams({
      invoiceNumber: rx.invoiceNumber || `INV-${rx.id}`,
      amount: String(rx.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)),
      method: rx.paymentMethod || 'qris',
      paidAt: rx.paidAt || new Date().toISOString(),
      patientName: currentUser?.name || 'Pasien',
      doctorName: rx.doctor,
      prescriptionId: rx.id,
      items: JSON.stringify(items),
    });

    window.open(`/api/payment-proof?${params.toString()}`, '_blank');
  }, [currentUser]);

  // Payment method label helper
  const methodLabel = useCallback((method?: PaymentMethod) => {
    switch (method) {
      case 'qris': return 'QRIS';
      case 'bank_transfer': return 'Transfer Bank';
      case 'va': return 'Virtual Account';
      case 'gopay': return 'GoPay';
      case 'ovo': return 'OVO';
      case 'dana': return 'DANA';
      case 'shopeepay': return 'ShopeePay';
      default: return method || '-';
    }
  }, []);

  // Payment method icon helper
  const methodIcon = useCallback((method?: PaymentMethod) => {
    switch (method) {
      case 'qris': return <QrCode className="w-4 h-4" />;
      case 'bank_transfer': case 'va': return <Building2 className="w-4 h-4" />;
      case 'gopay': case 'ovo': case 'dana': case 'shopeepay': return <Smartphone className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Rekam Medis Elektronik</h2>
          <p className="text-sm text-muted-foreground">Riwayat kesehatan dan hasil pemeriksaan</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Terintegrasi SATUSEHAT
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Informasi Pasien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {currentUser?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <p className="font-semibold text-sm">{currentUser?.name || 'Pasien'}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.nik || '-'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Golongan Darah</p>
                    <p className="text-sm font-semibold">{patientInfo.bloodType}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alergi</p>
                    <p className="text-sm font-semibold">{patientInfo.allergies}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Riwayat Penyakit</p>
                    <p className="text-sm font-semibold">{patientInfo.medicalHistory}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <Ruler className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tinggi / Berat</p>
                    <p className="text-sm font-semibold">
                      {patientInfo.height} cm / {patientInfo.weight} kg
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-primary/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-primary">{patientStats.totalConsultations}</p>
                  <p className="text-[10px] text-muted-foreground">Konsultasi</p>
                </div>
                <div className="bg-emerald-500/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-emerald-600">{patientStats.activePrescriptions}</p>
                  <p className="text-[10px] text-muted-foreground">Resep Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="consultations" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="consultations" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Riwayat Konsultasi</span>
                <span className="sm:hidden">Konsultasi</span>
              </TabsTrigger>
              <TabsTrigger value="screening" className="flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Skrining Kesehatan</span>
                <span className="sm:hidden">Skrining</span>
              </TabsTrigger>
              <TabsTrigger value="lab" className="flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline">Hasil Lab</span>
                <span className="sm:hidden">Lab</span>
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex items-center gap-1.5">
                <Pill className="w-4 h-4" />
                <span className="hidden sm:inline">Resep Obat</span>
                <span className="sm:hidden">Resep</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Riwayat Konsultasi */}
            <TabsContent value="consultations" className="space-y-3 mt-0">
              {patientConsultations.length === 0 ? (
                <Card className="border-0">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada riwayat konsultasi
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {patientConsultations.map((record) => (
                    <Card key={record.id} className="border-0 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() =>
                            setExpandedRecord(expandedRecord === record.id ? null : record.id)
                          }
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-foreground">
                                  {record.diagnosis}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px]',
                                    record.status === 'active'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                                  )}
                                >
                                  {record.status === 'active' ? 'Aktif' : 'Selesai'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {record.doctorName} - {record.specialization}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <p className="text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {formatDate(record.date)}
                                </p>
                                {record.rmNumber && (
                                  <p className="text-xs text-muted-foreground">
                                    <Hash className="w-3 h-3 inline mr-0.5" />
                                    {record.rmNumber}
                                  </p>
                                )}
                                {record.consultationType && (
                                  <p className="text-xs text-muted-foreground">
                                    <Stethoscope className="w-3 h-3 inline mr-0.5" />
                                    {consultationTypeLabel(record.consultationType)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {expandedRecord === record.id ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                        </div>

                        {expandedRecord === record.id && (
                          <div className="mt-4 pt-3 border-t border-border space-y-3">
                            {record.symptoms && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  Gejala
                                </p>
                                <p className="text-sm text-foreground mt-1">{record.symptoms}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Pengobatan
                              </p>
                              <p className="text-sm text-foreground mt-1">{record.treatment}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Catatan Dokter
                              </p>
                              <p className="text-sm text-foreground mt-1">{record.notes}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Skrining Kesehatan */}
            <TabsContent value="screening" className="space-y-3 mt-0">
              <PatientScreeningTimeline />
            </TabsContent>

            {/* Tab 3: Hasil Lab */}
            <TabsContent value="lab" className="space-y-3 mt-0">
              {demoLabResults.map((lab) => (
                <Card key={lab.id} className="border-0 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            lab.status === 'normal'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50'
                              : 'bg-amber-100 dark:bg-amber-950/50',
                          )}
                        >
                          <FlaskConical
                            className={cn(
                              'w-5 h-5',
                              lab.status === 'normal' ? 'text-emerald-600' : 'text-amber-600',
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{lab.testName}</p>
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(lab.date)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] shrink-0',
                          lab.status === 'normal'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
                        )}
                      >
                        {lab.status === 'normal' ? 'Normal' : 'Tinggi'}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 pl-13">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Hasil</p>
                        <p className="text-sm text-foreground font-medium">{lab.result}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Nilai Rujukan</p>
                        <p className="text-xs text-muted-foreground">{lab.referenceRange}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab 3: Resep Obat */}
            <TabsContent value="prescriptions" className="space-y-3 mt-0">
              {patientPrescriptions.length === 0 ? (
                <Card className="border-0">
                  <CardContent className="p-8 text-center">
                    <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada resep obat
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {patientPrescriptions.map((rx) => (
                    <Card key={rx.id} className="border-0 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                              <Pill className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                Resep dari {rx.doctor}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(rx.date)}
                              </p>
                              {rx.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  <StickyNote className="w-3 h-3 inline mr-0.5" />
                                  {rx.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] shrink-0',
                              rx.status === 'paid'
                                ? 'bg-emerald-600 text-white border-0'
                                : rx.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                            )}
                          >
                            {rx.status === 'paid' ? 'Sudah Dibayar' : rx.status === 'active' ? 'Aktif' : 'Selesai'}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          {rx.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2.5"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.dosage}</p>
                                {(item.frequency || item.duration) && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.frequency && `${item.frequency}`}
                                    {item.frequency && item.duration && ' • '}
                                    {item.duration && `${item.duration}`}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                                {item.price != null && (
                                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                          {/* Total price */}
                          {rx.items.some((item) => item.price != null) && (
                            <div className="flex justify-between text-sm pt-2 border-t border-border">
                              <p className="font-medium text-foreground">Total</p>
                              <p className="font-semibold text-foreground">
                                {formatCurrency(rx.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0))}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-border">
                            {rx.status === 'paid' ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 py-1 text-emerald-600">
                                  <CheckCheck className="w-4 h-4" />
                                  <span className="text-sm font-medium">Sudah Dibayar</span>
                                  {rx.paymentMethod && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                                      {methodIcon(rx.paymentMethod)}
                                      {methodLabel(rx.paymentMethod)}
                                    </span>
                                  )}
                                </div>
                                {rx.invoiceNumber && (
                                  <p className="text-xs text-muted-foreground">
                                    <Hash className="w-3 h-3 inline mr-0.5" />
                                    {rx.invoiceNumber}
                                  </p>
                                )}
                                {rx.paidAt && (
                                  <p className="text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3 inline mr-0.5" />
                                    Dibayar {formatDate(rx.paidAt)}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => handleViewProof(rx)}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    Lihat Bukti
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => handleDownloadProof(rx)}
                                  >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    Unduh Bukti
                                  </Button>
                                </div>
                              </div>
                            ) : rx.status === 'active' ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => handlePayPrescription(rx)}
                                >
                                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                                  Bayar Sekarang
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Payment Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Bukti Pembayaran
            </DialogTitle>
          </DialogHeader>
          {proofPrescription && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Pembayaran Berhasil</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    {proofPrescription.paidAt ? formatDate(proofPrescription.paidAt) : 'Sudah dibayar'}
                  </p>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-primary/5 px-4 py-3">
                  <p className="font-semibold text-sm text-primary">Detail Pembayaran</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">No. Invoice</span>
                    <span className="font-mono font-semibold">{proofPrescription.invoiceNumber || `INV-${proofPrescription.id}`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">No. Resep</span>
                    <span className="font-mono">{proofPrescription.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dokter</span>
                    <span className="font-medium">{proofPrescription.doctor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Metode Bayar</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {methodIcon(proofPrescription.paymentMethod)}
                      {methodLabel(proofPrescription.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tanggal Bayar</span>
                    <span className="font-medium">
                      {proofPrescription.paidAt ? formatDate(proofPrescription.paidAt) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prescription Items */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
                  <p className="font-semibold text-sm text-violet-700 dark:text-violet-400">Detail Obat</p>
                </div>
                <div className="px-4 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-muted-foreground font-medium">Obat</th>
                        <th className="text-center py-1.5 text-muted-foreground font-medium">Qty</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium">Harga</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proofPrescription.items.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-muted-foreground">{item.dosage}</p>
                          </td>
                          <td className="py-1.5 text-center text-foreground">{item.quantity}</td>
                          <td className="py-1.5 text-right text-foreground">{formatCurrency(item.price || 0)}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">
                            {formatCurrency((item.price || 0) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <span className="font-semibold text-sm">Total Pembayaran</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(proofPrescription.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stamp */}
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-emerald-500 flex items-center justify-center opacity-60 -rotate-12">
                  <div className="text-center">
                    <Stamp className="w-4 h-4 text-emerald-600 mx-auto" />
                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Dibayar</span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleDownloadProof(proofPrescription)}
              >
                <Download className="w-4 h-4 mr-2" />
                Unduh Bukti Pembayaran
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatientScreeningTimeline — Screening history in medical records
// ---------------------------------------------------------------------------

function PatientScreeningTimeline() {
  const { screeningForms, currentUser, doctors, setActivePanel } = useStore();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Doctor name lookup
  const DOCTOR_NAME_MAP: Record<string, string> = {
    'doc-sarah': 'dr. Sarah Wijaya',
    'doc-ahmad': 'dr. Ahmad Rizki',
    'doc-lisa': 'dr. Lisa Permata',
    'doc-dewi': 'dr. Dewi Sartika',
    'doc-budi': 'drg. Budi Santoso',
  };

  const getDoctorName = useCallback((doctorId: string) => {
    const doctor = doctors.find((d: { id: string }) => d.id === doctorId);
    if (doctor?.name) return doctor.name;
    return DOCTOR_NAME_MAP[doctorId] || 'Dokter';
  }, [doctors]);

  const patientScreenings = useMemo(() => {
    if (!currentUser) return [];
    const patientId = currentUser.id.startsWith('pat-') ? currentUser.id : (extractPatientKey(currentUser.name || '') || currentUser.id);
    return screeningForms
      .filter((f: ScreeningForm) => f.patientId === patientId)
      .sort((a: ScreeningForm, b: ScreeningForm) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [screeningForms, currentUser]);

  const riskColors: Record<RiskCategory, { bg: string; text: string; border: string }> = {
    rendah: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    sedang: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    tinggi: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const screeningStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
      case 'opened': return 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-0';
      case 'in_progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-0';
      case 'draft': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0';
      case 'reviewed': return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border-0';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0';
    }
  };

  const screeningStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Terkirim';
      case 'opened': return 'Dibuka';
      case 'in_progress': return 'Sedang Diisi';
      case 'draft': return 'Draft';
      case 'completed': return 'Selesai';
      case 'reviewed': return 'Ditinjau';
      default: return status;
    }
  };

  if (patientScreenings.length === 0) {
    return (
      <Card className="border-0">
        <CardContent className="p-8 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada riwayat skrining kesehatan</p>
          <p className="text-xs text-muted-foreground mt-1">Hasil skrining akan muncul di sini setelah Anda mengisi form yang dikirim dokter</p>
        </CardContent>
      </Card>
    );
  }

  const selectedForm = selectedFormId ? screeningForms.find((f: ScreeningForm) => f.id === selectedFormId) : null;

  return (
    <>
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {patientScreenings.map((form: ScreeningForm) => {
          const dateStr = form.completedAt || form.createdAt;
          const triage = form.triageResult;
          const summary = form.clinicalSummary;
          const triageColor = triage ? TRIAGE_COLORS[triage.level as TriageLevel] : null;
          const doctorName = getDoctorName(form.doctorId);
          const isPending = form.status === 'sent' || form.status === 'opened' || form.status === 'in_progress';

          return (
            <Card key={form.id} className="border-0 hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      triageColor ? triageColor.bg : 'bg-teal-500/10'
                    )}>
                      <ClipboardCheck className={cn('w-5 h-5', triageColor ? triageColor.text : 'text-teal-600')} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">Skrining Komprehensif</p>
                        <Badge variant="secondary" className={cn('text-[10px] shrink-0', screeningStatusBadge(form.status))}>
                          {screeningStatusLabel(form.status)}
                        </Badge>
                        {triage && triageColor && (
                          <Badge className={cn('text-[10px] font-bold shrink-0', triageColor.bg, triageColor.text, triageColor.border, 'border')}>
                            {triage.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {doctorName} — {formatDate(form.createdAt)}
                      </p>
                      {summary?.chiefComplaint && summary.chiefComplaint !== 'Tidak disebutkan' && (
                        <p className="text-xs text-foreground mt-1 truncate">
                          <Stethoscope className="w-3 h-3 inline mr-0.5 text-primary" />
                          {summary.chiefComplaint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons for pending forms */}
                {isPending && (
                  <div className="mt-3 pt-2 border-t border-border flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setActivePanel('screening')}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                      Isi Skrining
                    </Button>
                  </div>
                )}

                {/* View detail button for completed/reviewed */}
                {(form.status === 'completed' || form.status === 'reviewed') && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => setSelectedFormId(form.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Lihat Detail
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Patient Screening Detail Dialog */}
      <Dialog open={!!selectedFormId} onOpenChange={(open) => { if (!open) setSelectedFormId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedForm && (() => {
            const triage = selectedForm.triageResult;
            const summary = selectedForm.clinicalSummary;
            const triageColor = triage ? TRIAGE_COLORS[triage.level as TriageLevel] : null;
            const doctorName = getDoctorName(selectedForm.doctorId);

            const scoredModules = (Object.keys(selectedForm.moduleScores) as ScreeningModuleId[])
              .map((modId) => ({
                id: modId,
                label: MODULE_LABELS[modId] || modId,
                icon: MODULE_ICON_MAP[modId] || <ClipboardCheck className="w-4 h-4" />,
                ...selectedForm.moduleScores[modId],
              }))
              .filter((m) => m.score > 0 || m.riskCategory !== 'rendah' || m.recommendations.length > 0);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <span>Detail Skrining Komprehensif</span>
                    <Badge variant="secondary" className={cn('text-[10px]', screeningStatusBadge(selectedForm.status))}>
                      {screeningStatusLabel(selectedForm.status)}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{doctorName}</p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        {formatDate(selectedForm.createdAt)} {selectedForm.completedAt && `— Selesai: ${formatDate(selectedForm.completedAt)}`}
                      </p>
                    </div>
                  </div>

                  {/* Triage Result */}
                  {triage && (
                    <div className={cn('rounded-xl p-4', triageColor?.bg || 'bg-gray-50')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', triageColor?.bg)}>
                          <AlertTriangle className={cn('w-4 h-4', triageColor?.text)} />
                        </div>
                        <div>
                          <p className={cn('font-bold text-sm', triageColor?.text)}>{triage.label}</p>
                          <p className={cn('text-xs', triageColor?.text, 'opacity-80')}>{triage.description}</p>
                        </div>
                      </div>
                      <p className={cn('text-xs mt-1', triageColor?.text, 'opacity-70')}>{triage.recommendation}</p>
                    </div>
                  )}

                  {/* Clinical Summary */}
                  {summary && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Ringkasan Klinis</p>
                        <div className="space-y-2">
                          {summary.chiefComplaint && summary.chiefComplaint !== 'Tidak disebutkan' && (
                            <div className="flex items-start gap-2">
                              <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-foreground"><span className="font-medium">Keluhan Utama:</span> {summary.chiefComplaint}</p>
                            </div>
                          )}

                          {summary.vitalSigns && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-5">
                              {summary.vitalSigns.bloodPressure && <span className="text-xs text-muted-foreground">TD: {summary.vitalSigns.bloodPressure} mmHg</span>}
                              {summary.vitalSigns.heartRate && <span className="text-xs text-muted-foreground">Nadi: {summary.vitalSigns.heartRate} bpm</span>}
                              {summary.vitalSigns.temperature && <span className="text-xs text-muted-foreground">Suhu: {summary.vitalSigns.temperature}°C</span>}
                              {summary.vitalSigns.oxygenSat && <span className="text-xs text-muted-foreground">SpO2: {summary.vitalSigns.oxygenSat}%</span>}
                              {summary.vitalSigns.weight && <span className="text-xs text-muted-foreground">BB: {summary.vitalSigns.weight} kg</span>}
                              {summary.vitalSigns.bloodSugar && <span className="text-xs text-muted-foreground">GDS: {summary.vitalSigns.bloodSugar} mg/dL</span>}
                            </div>
                          )}

                          {summary.redFlags && summary.redFlags.length > 0 && (
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-red-600">Tanda Bahaya:</p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {summary.redFlags.map((flag, idx) => (
                                    <Badge key={idx} className="text-[10px] bg-red-50 text-red-700 border-red-200 border">{flag}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {summary.chronicDiseases && summary.chronicDiseases.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Pill className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {summary.chronicDiseases.map((d, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px]">{d}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {summary.painScore !== null && summary.painScore > 0 && (
                            <div className="flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="text-xs text-foreground">Skala Nyeri: <span className={cn('font-bold', summary.painScore >= 7 ? 'text-red-600' : summary.painScore >= 4 ? 'text-amber-600' : 'text-emerald-600')}>{summary.painScore}/10</span></span>
                            </div>
                          )}

                          {summary.mentalStatus && summary.mentalStatus !== 'Normal' && (
                            <div className="flex items-center gap-2">
                              <Heart className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span className={cn('text-xs font-medium', summary.mentalStatus === 'KRISIS MENTAL' ? 'text-red-600' : 'text-foreground')}>
                                Status Mental: {summary.mentalStatus}
                              </span>
                            </div>
                          )}

                          {summary.functionalStatus && summary.functionalStatus !== 'Mandiri' && (
                            <div className="flex items-center gap-2">
                              <Ruler className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-xs text-foreground">Status Fungsional: {summary.functionalStatus}</span>
                            </div>
                          )}

                          {summary.homeCareNeed && summary.homeCareNeed !== 'Tidak diperlukan' && (
                            <div className="flex items-center gap-2">
                              <ClipboardCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                              <span className="text-xs text-foreground">Kebutuhan Home Care: {summary.homeCareNeed}</span>
                            </div>
                          )}

                          {summary.palliativeStatus && summary.palliativeStatus !== 'Tidak diperlukan' && (
                            <div className="flex items-center gap-2">
                              <Heart className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span className="text-xs text-foreground">Status Paliatif: {summary.palliativeStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Module Scores */}
                  {scoredModules.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Hasil Modul Skrining</p>
                        <div className="space-y-1.5">
                          {scoredModules.map((mod) => {
                            const modColor = riskColors[mod.riskCategory as RiskCategory];
                            return (
                              <div key={mod.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                                <span className="text-sm shrink-0">{MODULE_ICON_MAP[mod.id] || <ClipboardCheck className="w-4 h-4" />}</span>
                                <span className="text-xs text-foreground flex-1 min-w-0 truncate">{mod.label}</span>
                                <span className="text-xs text-muted-foreground shrink-0">Skor: {mod.score}</span>
                                {modColor && (
                                  <Badge className={cn('text-[10px] shrink-0', modColor.bg, modColor.text, modColor.border, 'border')}>
                                    {mod.riskCategory === 'tinggi' ? 'Tinggi' : mod.riskCategory === 'sedang' ? 'Sedang' : 'Rendah'}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {scoredModules.some((m) => m.recommendations.length > 0 && m.riskCategory !== 'rendah') && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-foreground">Rekomendasi Utama:</p>
                            <ul className="mt-1 space-y-0.5">
                              {scoredModules
                                .filter((m) => m.riskCategory !== 'rendah')
                                .flatMap((m) => m.recommendations.slice(0, 2).map((rec) => ({ rec, modLabel: m.label })))
                                .slice(0, 6)
                                .map((item, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                    <span><span className="font-medium text-foreground">{item.modLabel}:</span> {item.rec}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Clinical Files */}
                  {selectedForm.clinicalFiles && selectedForm.clinicalFiles.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Bukti Klinis</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedForm.clinicalFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-foreground">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Doctor Notes & Follow-up (read-only for patient) */}
                  {(selectedForm.doctorNotes || selectedForm.followUp) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {selectedForm.doctorNotes && (
                          <div className="bg-primary/5 rounded-lg p-3">
                            <p className="text-xs font-medium text-primary">Catatan Dokter:</p>
                            <p className="text-xs text-foreground mt-0.5">{selectedForm.doctorNotes}</p>
                          </div>
                        )}
                        {selectedForm.followUp && (
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                            <p className="text-xs font-medium text-foreground">Tindak Lanjut: {selectedForm.followUp}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setSelectedFormId(null)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// MedicalRecordsPanel — Role-based export
// ---------------------------------------------------------------------------

export function MedicalRecordsPanel() {
  const { currentUser } = useStore();
  if (currentUser?.role === 'doctor') return <DoctorMedicalRecordsView />;
  return <PatientMedicalRecordsView />;
}
