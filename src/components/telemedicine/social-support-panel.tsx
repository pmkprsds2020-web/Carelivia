'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type {
  SocialAssessmentRecord,
  CaregiverInfo,
  FamilyMeetingRecord,
  FamilyMeetingParticipant,
  EduMaterialCategory,
  EmergencyContact,
  FinancialSupportRecord,
  TransportRecord,
  SocialMonitoringAlert,
  HousingCondition,
  CaregiverAvailability,
  FamilySupportLevel,
  TransportDifficulty,
  EconomicConstraint,
  HealthcareAccess,
  MedicalEquipmentNeed,
  SocialAssistanceNeed,
  SocialIsolationRisk,
  SocialScreeningPriority,
  CaregiverRole,
  CaregiverRelation,
  MeetingStatus,
  TransportNeedType,
  TransportStatus,
} from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
  Heart, Users, ClipboardCheck, Video, BookOpen, UserCheck,
  FolderSync, Phone, DollarSign, Car, AlertTriangle, Plus,
  Calendar, Clock, Star, PhoneCall, MessageSquare, Trash2,
  Edit, CheckCircle2, Circle, ArrowRight, TrendingUp,
  FileText, Activity, Shield, Home, Briefcase, Ambulance,
  ChevronRight, Eye, Download, XCircle, Info, Bell, Brain
} from 'lucide-react';

import AISocialAnalysisTab from './ai-social-analysis-tab';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

// ─── Props ──────────────────────────────────────────────────────────────────

interface SocialSupportPanelProps {
  palliativePatientId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const genId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const priorityBadge = (p: SocialScreeningPriority) => {
  const map: Record<SocialScreeningPriority, { label: string; cls: string }> = {
    rendah: { label: 'Rendah', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    sedang: { label: 'Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    tinggi: { label: 'Tinggi', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[p];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const severityBadge = (s: 'info' | 'warning' | 'critical') => {
  const map = {
    info: { label: 'Info', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
    warning: { label: 'Peringatan', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    critical: { label: 'Kritis', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[s];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const meetingStatusBadge = (s: MeetingStatus) => {
  const map: Record<MeetingStatus, { label: string; cls: string }> = {
    dijadwalkan: { label: 'Dijadwalkan', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
    berlangsung: { label: 'Berlangsung', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    selesai: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    dibatalkan: { label: 'Dibatalkan', cls: 'bg-slate-100 text-slate-500 border-slate-300' },
  };
  const m = map[s];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const transportStatusBadge = (s: TransportStatus) => {
  const map: Record<TransportStatus, { label: string; cls: string }> = {
    belum_dipesan: { label: 'Belum Dipesan', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
    dipesan: { label: 'Dipesan', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
    dalam_perjalanan: { label: 'Dalam Perjalanan', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    selesai: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    dibatalkan: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[s];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const transportTypeBadge = (t: TransportNeedType) => {
  const map: Record<TransportNeedType, { label: string; cls: string }> = {
    ambulans: { label: 'Ambulans', cls: 'bg-red-100 text-red-800 border-red-300' },
    ambulans_darurat: { label: 'Ambulans Darurat', cls: 'bg-red-200 text-red-900 border-red-400' },
    kendaraan_pribadi: { label: 'Kendaraan Pribadi', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
    transportasi_medis: { label: 'Transportasi Medis', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
    lainnya: { label: 'Lainnya', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  };
  const m = map[t];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const zaritLevelBadge = (l?: 'beban_ringan' | 'beban_sedang' | 'beban_berat') => {
  if (!l) return <Badge variant="outline">Belum dinilai</Badge>;
  const map = {
    beban_ringan: { label: 'Beban Ringan', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    beban_sedang: { label: 'Beban Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    beban_berat: { label: 'Beban Berat', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[l];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const apgarLevelBadge = (l?: 'dysfunctional' | 'severe_dysfunction' | 'moderate_dysfunction' | 'good' | 'high_functional') => {
  if (!l) return <Badge variant="outline">Belum dinilai</Badge>;
  const map = {
    dysfunctional: { label: 'Dysfunctional', cls: 'bg-red-200 text-red-900 border-red-400' },
    severe_dysfunction: { label: 'Gangguan Berat', cls: 'bg-red-100 text-red-800 border-red-300' },
    moderate_dysfunction: { label: 'Gangguan Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    good: { label: 'Baik', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    high_functional: { label: 'Sangat Baik', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
  };
  const m = map[l];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const roleBadge = (role: 'utama' | 'pendamping') =>
  role === 'utama'
    ? <Badge className="bg-teal-100 text-teal-800 border-teal-300 border">Utama</Badge>
    : <Badge className="bg-slate-100 text-slate-600 border-slate-300 border">Pendamping</Badge>;

const emergencyRoleBadge = (role: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    dokter: { label: 'Dokter', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
    perawat: { label: 'Perawat', cls: 'bg-teal-100 text-teal-700 border-teal-300' },
    caregiver_utama: { label: 'Caregiver Utama', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    keluarga: { label: 'Keluarga', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    ambulans: { label: 'Ambulans', cls: 'bg-red-100 text-red-800 border-red-300' },
    rumah_sakit: { label: 'Rumah Sakit', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
    gawat_darurat: { label: 'Gawat Darurat', cls: 'bg-red-200 text-red-900 border-red-400' },
    lainnya: { label: 'Lainnya', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  };
  const m = map[role] || map.lainnya;
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const categoryLabel = (c: EduMaterialCategory): string => {
  const map: Record<EduMaterialCategory, string> = {
    perawatan_rumah: 'Perawatan Rumah',
    panduan_caregiver: 'Panduan Caregiver',
    video_edukasi: 'Video Edukasi',
    dukungan_psikososial: 'Dukungan Psikososial',
    gawat_darurat: 'Gawat Darurat',
    end_of_life: 'End-of-Life',
    faq: 'FAQ',
  };
  return map[c] || c;
};

const categoryBadge = (c: EduMaterialCategory) => {
  const cls: Record<EduMaterialCategory, string> = {
    perawatan_rumah: 'bg-teal-100 text-teal-800 border-teal-300',
    panduan_caregiver: 'bg-amber-100 text-amber-800 border-amber-300',
    video_edukasi: 'bg-purple-100 text-purple-800 border-purple-300',
    dukungan_psikososial: 'bg-pink-100 text-pink-800 border-pink-300',
    gawat_darurat: 'bg-red-100 text-red-800 border-red-300',
    end_of_life: 'bg-slate-100 text-slate-700 border-slate-300',
    faq: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
  return <Badge className={`${cls[c]} border`}>{categoryLabel(c)}</Badge>;
};

const typeIcon = (t: string) => {
  switch (t) {
    case 'video': return <Video className="h-4 w-4" />;
    case 'pdf': return <FileText className="h-4 w-4" />;
    case 'infografis': return <Eye className="h-4 w-4" />;
    default: return <BookOpen className="h-4 w-4" />;
  }
};

const noteTypeBadge = (t: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    perkembangan: { label: 'Perkembangan', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    tugas: { label: 'Tugas', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
    pengingat_obat: { label: 'Pengingat Obat', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    pengingat_kontrol: { label: 'Pengingat Kontrol', cls: 'bg-purple-100 text-purple-800 border-purple-300' },
    tanggung_jawab: { label: 'Tanggung Jawab', cls: 'bg-pink-100 text-pink-800 border-pink-300' },
    lainnya: { label: 'Lainnya', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  };
  const m = map[t] || map.lainnya;
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

// ─── Social Score Calculator ────────────────────────────────────────────────

const scoreMap: Record<string, number> = {
  layak: 0, kurang_layak: 1, tidak_layak: 2,
  tersedia: 0, terbatas: 1, tidak_tersedia: 2,
  kuat: 0, cukup: 1, lemah: 2, tidak_ada: 3,
  tidak_ada: 0, ringan: 1, sedang: 2, berat: 3,
  mudah: 0, cukup: 1, sulit: 2, sangat_sulit: 3,
  rendah: 0, sedang: 1, tinggi: 2,
};

const calculateSocialScore = (a: SocialAssessmentRecord): number => {
  const fields: string[] = [
    a.housingCondition, a.caregiverAvailability, a.familySupportLevel,
    a.transportDifficulty, a.economicConstraint, a.healthcareAccess,
    a.medicalEquipmentNeed, a.socialAssistanceNeed, a.socialIsolationRisk,
  ];
  return fields.reduce((sum, f) => sum + (scoreMap[f] ?? 0), 0);
};

const calculatePriority = (form: ScreeningFormState): SocialScreeningPriority => {
  const highVals = ['berat', 'tidak_tersedia', 'sangat_sulit', 'tidak_layak', 'tinggi', 'tidak_ada'];
  const medVals = ['sedang', 'terbatas', 'sulit', 'kurang_layak', 'lemah'];
  const vals = Object.values(form).map(v => v.value);
  if (vals.some(v => highVals.includes(v))) return 'tinggi';
  if (vals.some(v => medVals.includes(v))) return 'sedang';
  return 'rendah';
};

const generateRecommendations = (form: ScreeningFormState): string[] => {
  const recs: string[] = [];
  if (form.housing.value === 'tidak_layak' || form.housing.value === 'kurang_layak')
    recs.push('Evaluasi pemenuhan kebutuhan tempat tinggal yang layak, pertimbangkan rujukan ke dinas sosial');
  if (form.caregiver.value === 'tidak_tersedia' || form.caregiver.value === 'terbatas')
    recs.push('Identifikasi sumber caregiver alternatif, pertimbangkan home care profesional');
  if (form.familySupport.value === 'lemah' || form.familySupport.value === 'tidak_ada')
    recs.push('Konseling keluarga dan edukasi tentang dukungan paliatif, pertimbangkan dukungan komunitas');
  if (form.transport.value === 'berat' || form.transport.value === 'sedang')
    recs.push('Fasilitasi transportasi medis atau ambulans untuk kontrol rutin');
  if (form.economic.value === 'berat' || form.economic.value === 'sedang')
    recs.push('Evaluasi kelayakan bantuan BPJS, Jamkesda, PKH, dan program sosial lainnya');
  if (form.healthAccess.value === 'sulit' || form.healthAccess.value === 'sangat_sulit')
    recs.push('Tingkatkan akses telekonsultasi dan home visit, koordinasi dengan puskesmas terdekat');
  if (form.medicalEquip.value === 'berat' || form.medicalEquip.value === 'sedang')
    recs.push('Fasilitasi pengadaan alat kesehatan melalui program bantuan atau sewa');
  if (form.socialAssist.value === 'berat' || form.socialAssist.value === 'sedang')
    recs.push('Rujuk ke pekerja sosial untuk pendampingan akses bantuan sosial');
  if (form.socialIsolation.value === 'tinggi' || form.socialIsolation.value === 'sedang')
    recs.push('Intervensi psikososial, pertimbangkan kelompok dukungan dan kunjungan sukarelawan');
  if (recs.length === 0) recs.push('Pertahankan monitoring rutin dan dukungan sosial yang ada');
  return recs;
};

// ─── Screening Form State Type ──────────────────────────────────────────────

interface ScreeningField {
  value: string;
  notes: string;
}

interface ScreeningFormState {
  housing: ScreeningField;
  caregiver: ScreeningField;
  familySupport: ScreeningField;
  transport: ScreeningField;
  economic: ScreeningField;
  healthAccess: ScreeningField;
  medicalEquip: ScreeningField;
  socialAssist: ScreeningField;
  socialIsolation: ScreeningField;
}

const emptyScreeningForm = (): ScreeningFormState => ({
  housing: { value: '', notes: '' },
  caregiver: { value: '', notes: '' },
  familySupport: { value: '', notes: '' },
  transport: { value: '', notes: '' },
  economic: { value: '', notes: '' },
  healthAccess: { value: '', notes: '' },
  medicalEquip: { value: '', notes: '' },
  socialAssist: { value: '', notes: '' },
  socialIsolation: { value: '', notes: '' },
});

// ─── Zarit Questions ────────────────────────────────────────────────────────

const zaritQuestions = [
  'Apakah Anda merasa kelelahan karena merawat pasien?',
  'Apakah Anda merasa tidak punya waktu untuk diri sendiri?',
  'Apakah Anda merasa tertekan antara merawat pasien dan tanggung jawab lain?',
  'Apakah Anda merasa malu dengan kondisi pasien?',
  'Apakah Anda merasa terisolasi atau kesepian?',
  'Apakah Anda merasa kehilangan kendali atas hidup Anda?',
  'Apakah Anda tidak tahu lagi apa yang harus dilakukan untuk pasien?',
  'Apakah Anda merasa pasien mengharapkan Anda merawatnya seolah-olah Anda satu-satunya yang bisa?',
  'Apakah Anda merasa tidak punya privasi karena merawat pasien?',
  'Apakah Anda merasa hubungan sosial Anda terganggu?',
  'Apakah Anda merasa kesehatan Anda memburuk karena merawat pasien?',
  'Apakah Anda merasa kehilangan kendali atas hidup Anda sejak penyakit pasien?',
];

// ─── APGAR Questions ────────────────────────────────────────────────────────

const apgarQuestions = [
  'Apakah Anda merasa puas bahwa Anda bisa mendapatkan bantuan dari keluarga saat sesuatu terjadi?',
  'Apakah Anda merasa puas dengan cara keluarga mendiskusikan hal penting dan berbagi masalah?',
  'Apakah Anda merasa puas bahwa keluarga menerima dan mendukung keinginan Anda?',
  'Apakah Anda merasa puas dengan cara keluarga mengungkapkan kasih sayang dan merespons emosi Anda?',
  'Apakah Anda merasa puas dengan waktu keluarga bersama-sama?',
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SocialSupportPanel({ palliativePatientId }: SocialSupportPanelProps) {
  const { toast } = useToast();

  const {
    socialAssessments, addSocialAssessment, updateSocialAssessment,
    caregivers, addCaregiver, updateCaregiver, removeCaregiver,
    familyMeetings, addFamilyMeeting, updateFamilyMeeting,
    eduMaterials, logEduMaterialAccess,
    familyCoordinationNotes, addFamilyCoordinationNote, updateFamilyCoordinationNote,
    emergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact,
    financialSupportRecords, addFinancialSupportRecord, updateFinancialSupportRecord,
    transportRecords, addTransportRecord, updateTransportRecord,
    socialAlerts, addSocialAlert, markSocialAlertRead,
    palliativePatients,
    currentUser,
  } = useStore();

  const [activeTab, setActiveTab] = useState('dashboard');

  // ─── Filtered Data ──────────────────────────────────────────────────────

  const patient = useMemo(
    () => palliativePatients.find(p => p.id === palliativePatientId),
    [palliativePatients, palliativePatientId]
  );

  const patientAssessments = useMemo(
    () => socialAssessments.filter(a => a.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()),
    [socialAssessments, palliativePatientId]
  );

  const patientCaregivers = useMemo(
    () => caregivers.filter(c => c.palliativePatientId === palliativePatientId && c.isActive),
    [caregivers, palliativePatientId]
  );

  const patientMeetings = useMemo(
    () => familyMeetings.filter(m => m.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [familyMeetings, palliativePatientId]
  );

  const patientContacts = useMemo(
    () => emergencyContacts.filter(c => c.palliativePatientId === palliativePatientId),
    [emergencyContacts, palliativePatientId]
  );

  const patientFinancials = useMemo(
    () => financialSupportRecords.filter(f => f.palliativePatientId === palliativePatientId),
    [financialSupportRecords, palliativePatientId]
  );

  const patientTransport = useMemo(
    () => transportRecords.filter(t => t.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transportRecords, palliativePatientId]
  );

  const patientCoordNotes = useMemo(
    () => familyCoordinationNotes.filter(n => n.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [familyCoordinationNotes, palliativePatientId]
  );

  const patientAlerts = useMemo(
    () => socialAlerts.filter(a => a.patientId === palliativePatientId),
    [socialAlerts, palliativePatientId]
  );

  const unreadAlerts = useMemo(() => patientAlerts.filter(a => !a.isRead), [patientAlerts]);

  // ─── Trend Data ─────────────────────────────────────────────────────────

  const trendData = useMemo(() => {
    if (!palliativePatientId) return [];
    const sorted = [...patientAssessments].sort(
      (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
    );
    return sorted.map(a => ({
      date: new Date(a.assessedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      skor: calculateSocialScore(a),
    }));
  }, [patientAssessments, palliativePatientId]);

  // ─── Dashboard summary metrics ──────────────────────────────────────────

  const latestAssessment = patientAssessments[0];
  const familySupportStatus = useMemo(() => {
    if (!latestAssessment) return 'unknown';
    const fsl = latestAssessment.familySupportLevel;
    if (fsl === 'kuat') return 'green';
    if (fsl === 'cukup') return 'yellow';
    return 'red';
  }, [latestAssessment]);

  const primaryCaregiver = patientCaregivers.find(c => c.role === 'utama');
  const assistanceCount = useMemo(() => {
    if (!latestAssessment) return 0;
    const fields = [latestAssessment.transportDifficulty, latestAssessment.economicConstraint,
      latestAssessment.healthcareAccess, latestAssessment.medicalEquipmentNeed,
      latestAssessment.socialAssistanceNeed];
    return fields.filter(f => f !== 'tidak_ada' && f !== 'mudah').length;
  }, [latestAssessment]);

  // ─── Empty State ────────────────────────────────────────────────────────

  if (!palliativePatientId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <Users className="h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">Pilih pasien terlebih dahulu</p>
        <p className="text-sm">Pilih pasien paliatif untuk melihat dukungan sosial</p>
      </div>
    );
  }

  // ─── Tab Content Components ─────────────────────────────────────────────

  // ── 1. Dashboard ──────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Status Dukungan Keluarga */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Dukungan Keluarga</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              familySupportStatus === 'green' ? 'bg-emerald-500' :
              familySupportStatus === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-semibold">
              {latestAssessment ?
                (latestAssessment.familySupportLevel === 'kuat' ? 'Kuat' :
                 latestAssessment.familySupportLevel === 'cukup' ? 'Cukup' :
                 latestAssessment.familySupportLevel === 'lemah' ? 'Lemah' : 'Tidak Ada') :
                'Belum dinilai'}
            </span>
          </div>
        </Card>

        {/* Status Caregiver */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Status Caregiver</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {primaryCaregiver?.name || 'Belum ada'}
            </span>
            {primaryCaregiver?.zaritScore != null && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-300 border text-xs">
                Zarit: {primaryCaregiver.zaritScore}
              </Badge>
            )}
          </div>
        </Card>

        {/* Skrining Terbaru */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Skrining Terbaru</span>
          </div>
          <div className="flex items-center gap-2">
            {latestAssessment ? (
              <>
                <span className="text-sm font-semibold">{fmtDate(latestAssessment.assessedAt)}</span>
                {priorityBadge(latestAssessment.priorityLevel)}
              </>
            ) : (
              <span className="text-sm text-slate-400">Belum ada</span>
            )}
          </div>
        </Card>

        {/* Kebutuhan Bantuan Sosial */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Kebutuhan Bantuan</span>
          </div>
          <span className="text-2xl font-bold">{assistanceCount}</span>
          <span className="text-xs text-slate-500 ml-1">area</span>
        </Card>

        {/* Riwayat Family Meeting */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Family Meeting</span>
          </div>
          <span className="text-2xl font-bold">{patientMeetings.length}</span>
          <span className="text-xs text-slate-500 ml-1">riwayat</span>
        </Card>

        {/* Notifikasi Risiko */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500">Notifikasi Risiko</span>
          </div>
          <span className="text-2xl font-bold text-red-600">{unreadAlerts.length}</span>
          <span className="text-xs text-slate-500 ml-1">belum dibaca</span>
        </Card>
      </div>

      {/* Social Alerts */}
      {patientAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Notifikasi Risiko Sosial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {patientAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      alert.isRead ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'
                    }`}
                    onClick={() => {
                      if (!alert.isRead) {
                        markSocialAlertRead(alert.id);
                        toast({ title: 'Notifikasi ditandai telah dibaca' });
                      }
                    }}
                  >
                    <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'critical' ? 'text-red-500' :
                      alert.severity === 'warning' ? 'text-amber-500' : 'text-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{alert.title}</span>
                        {severityBadge(alert.severity)}
                      </div>
                      <p className="text-xs text-slate-600">{alert.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{fmtDateTime(alert.createdAt)}</p>
                    </div>
                    {!alert.isRead && <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Tren Kondisi Sosial
            </CardTitle>
            <CardDescription className="text-xs">Skor semakin rendah = kondisi semakin baik (maks 24)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 24]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`Skor: ${value}`, 'Kondisi Sosial']}
                />
                <Line type="monotone" dataKey="skor" stroke="#0d9488" strokeWidth={2}
                  dot={{ fill: '#0d9488', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Buttons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Akses Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'screening', label: 'Skrining Sosial', icon: ClipboardCheck, color: 'text-teal-600' },
              { key: 'family', label: 'Family Dashboard', icon: Heart, color: 'text-pink-600' },
              { key: 'meetings', label: 'Family Meeting', icon: Video, color: 'text-purple-600' },
              { key: 'caregiver', label: 'Caregiver', icon: UserCheck, color: 'text-amber-600' },
              { key: 'emergency', label: 'Kontak Darurat', icon: Phone, color: 'text-red-600' },
              { key: 'transport', label: 'Transportasi', icon: Car, color: 'text-slate-600' },
            ].map(item => (
              <Button
                key={item.key}
                variant="outline"
                className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 text-xs"
                onClick={() => setActiveTab(item.key)}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── 2. Skrining Kebutuhan Sosial ────────────────────────────────────────

  const ScreeningTab = () => {
    const [form, setForm] = useState<ScreeningFormState>(emptyScreeningForm());
    const [showResult, setShowResult] = useState(false);

    const priority = calculatePriority(form);
    const recs = generateRecommendations(form);
    const allFilled = Object.values(form).every(f => f.value !== '');

    const updateField = (key: keyof ScreeningFormState, value: string, notes?: string) => {
      setForm(prev => ({
        ...prev,
        [key]: { value, notes: notes ?? prev[key].notes },
      }));
    };

    const updateNotes = (key: keyof ScreeningFormState, notes: string) => {
      setForm(prev => ({
        ...prev,
        [key]: { ...prev[key], notes },
      }));
    };

    const handleSave = () => {
      if (!allFilled) {
        toast({ title: 'Lengkapi semua item skrining', description: 'Semua item harus diisi', variant: 'destructive' });
        return;
      }
      const now = new Date().toISOString();
      const record: SocialAssessmentRecord = {
        id: genId('sa'),
        palliativePatientId: palliativePatientId!,
        housingCondition: form.housing.value as HousingCondition,
        housingNotes: form.housing.notes || undefined,
        caregiverAvailability: form.caregiver.value as CaregiverAvailability,
        caregiverNotes: form.caregiver.notes || undefined,
        familySupportLevel: form.familySupport.value as FamilySupportLevel,
        familySupportNotes: form.familySupport.notes || undefined,
        transportDifficulty: form.transport.value as TransportDifficulty,
        transportNotes: form.transport.notes || undefined,
        economicConstraint: form.economic.value as EconomicConstraint,
        economicNotes: form.economic.notes || undefined,
        healthcareAccess: form.healthAccess.value as HealthcareAccess,
        healthcareAccessNotes: form.healthAccess.notes || undefined,
        medicalEquipmentNeed: form.medicalEquip.value as MedicalEquipmentNeed,
        medicalEquipmentNotes: form.medicalEquip.notes || undefined,
        socialAssistanceNeed: form.socialAssist.value as SocialAssistanceNeed,
        socialAssistanceNotes: form.socialAssist.notes || undefined,
        socialIsolationRisk: form.socialIsolation.value as SocialIsolationRisk,
        socialIsolationNotes: form.socialIsolation.notes || undefined,
        overallStatus: 'lengkap',
        priorityLevel: priority,
        recommendations: recs,
        assessedBy: currentUser?.name || 'Tim Paliatif',
        assessedByRole: 'palliative_team',
        assessedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      addSocialAssessment(record);

      // Auto-generate alerts for high priority
      if (priority === 'tinggi') {
        addSocialAlert({
          id: genId('sal'),
          patientId: palliativePatientId!,
          patientName: patient?.patientName,
          type: 'dukungan_keluarga',
          severity: 'critical',
          title: 'Skrining Sosial: Prioritas Tinggi',
          description: `Pasien memerlukan intervensi sosial segera. ${recs[0]}`,
          isRead: false,
          createdAt: now,
        });
      }

      toast({ title: 'Skrining sosial berhasil disimpan', description: `Prioritas: ${priority}` });
      setForm(emptyScreeningForm());
      setShowResult(false);
    };

    const screeningItems: { key: keyof ScreeningFormState; label: string; options: { value: string; label: string }[] }[] = [
      {
        key: 'housing', label: 'Kondisi Tempat Tinggal',
        options: [
          { value: 'layak', label: 'Layak' }, { value: 'kurang_layak', label: 'Kurang Layak' },
          { value: 'tidak_layak', label: 'Tidak Layak' },
        ],
      },
      {
        key: 'caregiver', label: 'Ketersediaan Caregiver',
        options: [
          { value: 'tersedia', label: 'Tersedia' }, { value: 'terbatas', label: 'Terbatas' },
          { value: 'tidak_tersedia', label: 'Tidak Tersedia' },
        ],
      },
      {
        key: 'familySupport', label: 'Dukungan Keluarga',
        options: [
          { value: 'kuat', label: 'Kuat' }, { value: 'cukup', label: 'Cukup' },
          { value: 'lemah', label: 'Lemah' }, { value: 'tidak_ada', label: 'Tidak Ada' },
        ],
      },
      {
        key: 'transport', label: 'Kendala Transportasi',
        options: [
          { value: 'tidak_ada', label: 'Tidak Ada' }, { value: 'ringan', label: 'Ringan' },
          { value: 'sedang', label: 'Sedang' }, { value: 'berat', label: 'Berat' },
        ],
      },
      {
        key: 'economic', label: 'Kendala Ekonomi',
        options: [
          { value: 'tidak_ada', label: 'Tidak Ada' }, { value: 'ringan', label: 'Ringan' },
          { value: 'sedang', label: 'Sedang' }, { value: 'berat', label: 'Berat' },
        ],
      },
      {
        key: 'healthAccess', label: 'Akses Layanan Kesehatan',
        options: [
          { value: 'mudah', label: 'Mudah' }, { value: 'cukup', label: 'Cukup' },
          { value: 'sulit', label: 'Sulit' }, { value: 'sangat_sulit', label: 'Sangat Sulit' },
        ],
      },
      {
        key: 'medicalEquip', label: 'Kebutuhan Alat Kesehatan',
        options: [
          { value: 'tidak_ada', label: 'Tidak Ada' }, { value: 'ringan', label: 'Ringan' },
          { value: 'sedang', label: 'Sedang' }, { value: 'berat', label: 'Berat' },
        ],
      },
      {
        key: 'socialAssist', label: 'Kebutuhan Bantuan Sosial',
        options: [
          { value: 'tidak_ada', label: 'Tidak Ada' }, { value: 'ringan', label: 'Ringan' },
          { value: 'sedang', label: 'Sedang' }, { value: 'berat', label: 'Berat' },
        ],
      },
      {
        key: 'socialIsolation', label: 'Risiko Isolasi Sosial',
        options: [
          { value: 'rendah', label: 'Rendah' }, { value: 'sedang', label: 'Sedang' },
          { value: 'tinggi', label: 'Tinggi' },
        ],
      },
    ];

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-teal-600" />
              Form Skrining Kebutuhan Sosial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {screeningItems.map(item => (
              <div key={item.key} className="space-y-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <Label className="text-sm font-medium">{item.label}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={form[item.key].value} onValueChange={v => updateField(item.key, v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      {item.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Catatan tambahan (opsional)..."
                  className="text-xs min-h-[48px]"
                  value={form[item.key].notes}
                  onChange={e => updateNotes(item.key, e.target.value)}
                />
              </div>
            ))}

            {/* Result Preview */}
            {allFilled && (
              <Alert className={priority === 'tinggi' ? 'border-red-300 bg-red-50' :
                priority === 'sedang' ? 'border-amber-300 bg-amber-50' :
                'border-emerald-300 bg-emerald-50'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  Hasil Skrining {priorityBadge(priority)}
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    {recs.map((r, i) => (
                      <li key={i} className="text-xs">{r}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!allFilled}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Simpan Skrining
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        {patientAssessments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Riwayat Skrining</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {patientAssessments.map((a, idx) => (
                    <div key={a.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            idx === 0 ? 'bg-teal-600' : 'bg-slate-400'
                          }`}>
                            {patientAssessments.length - idx}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{fmtDateTime(a.assessedAt)}</p>
                            <p className="text-xs text-slate-500">Oleh: {a.assessedBy}</p>
                          </div>
                        </div>
                        {priorityBadge(a.priorityLevel)}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-xs text-slate-600">
                        <span>Tempat Tinggal: {a.housingCondition.replace('_', ' ')}</span>
                        <span>Caregiver: {a.caregiverAvailability.replace('_', ' ')}</span>
                        <span>Keluarga: {a.familySupportLevel.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ── 3. Family Dashboard ────────────────────────────────────────────────

  const FamilyDashboardTab = () => (
    <div className="space-y-4">
      {/* Patient Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-600" />
            Ringkasan Pasien
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500 text-xs">Nama</span><p className="font-medium">{patient.patientName}</p></div>
              <div><span className="text-slate-500 text-xs">RM</span><p className="font-medium">{patient.rmNumber}</p></div>
              <div><span className="text-slate-500 text-xs">Diagnosis</span><p className="font-medium">{patient.primaryDiagnosis}</p></div>
              <div><span className="text-slate-500 text-xs">Dokter</span><p className="font-medium">{patient.attendingDoctorName}</p></div>
              <div><span className="text-slate-500 text-xs">Status</span><p>{patient.careStatus.replace('_', ' ')}</p></div>
              <div><span className="text-slate-500 text-xs">Kontak Keluarga</span><p>{patient.familyContactName} ({patient.familyContactRelation})</p></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Data pasien tidak tersedia</p>
          )}
        </CardContent>
      </Card>

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium">Jadwal Kontrol</span>
          </div>
          {patientMeetings.filter(m => m.status === 'dijadwalkan').slice(0, 2).map(m => (
            <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-xs">{fmtDateTime(m.scheduledAt)}</span>
              <span className="text-xs text-slate-500">- {m.title}</span>
            </div>
          ))}
          {patientMeetings.filter(m => m.status === 'dijadwalkan').length === 0 && (
            <p className="text-xs text-slate-400">Belum ada jadwal kontrol</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">Jadwal Pengobatan</span>
          </div>
          <div className="space-y-1.5">
            {useStore.getState().palliativeMedications
              .filter(m => m.palliativePatientId === palliativePatientId && m.isActive)
              .slice(0, 3)
              .map(med => (
                <div key={med.id} className="flex items-center gap-2 text-xs">
                  <Circle className="h-2 w-2 text-teal-500 fill-teal-500" />
                  <span>{med.medicineName} - {med.frequency}</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>

      {/* Screening Results Summary */}
      {latestAssessment && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-teal-600" />
              Hasil Skrining Sosial Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">Tanggal: {fmtDate(latestAssessment.assessedAt)}</span>
              {priorityBadge(latestAssessment.priorityLevel)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'Tempat Tinggal', value: latestAssessment.housingCondition },
                { label: 'Caregiver', value: latestAssessment.caregiverAvailability },
                { label: 'Dukungan Keluarga', value: latestAssessment.familySupportLevel },
                { label: 'Transportasi', value: latestAssessment.transportDifficulty },
                { label: 'Ekonomi', value: latestAssessment.economicConstraint },
                { label: 'Akses Kesehatan', value: latestAssessment.healthcareAccess },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded border border-slate-100 bg-slate-50/50">
                  <p className="text-slate-500 text-[10px]">{item.label}</p>
                  <p className="font-medium capitalize">{item.value.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Caregiver Task Checklist */}
      {patientCaregivers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Tugas Caregiver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {patientCaregivers.flatMap(cg =>
                  (cg.tasks || []).map((task, i) => (
                    <div key={`${cg.id}-${i}`} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-slate-300" />
                      <span>{task}</span>
                      <span className="text-xs text-slate-400 ml-auto">{cg.name}</span>
                    </div>
                  ))
                )}
                {patientCaregivers.every(cg => !cg.tasks || cg.tasks.length === 0) && (
                  <p className="text-xs text-slate-400">Belum ada tugas yang ditugaskan</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ── 4. Family Meeting Virtual ──────────────────────────────────────────

  const MeetingTab = () => {
    const [showDialog, setShowDialog] = useState(false);
    const [newMeeting, setNewMeeting] = useState({
      title: '', scheduledAt: '', duration: '60', agenda: '',
      participantName: '', participantRole: '',
    });
    const [participants, setParticipants] = useState<FamilyMeetingParticipant[]>([]);
    const [editMeetingId, setEditMeetingId] = useState<string | null>(null);

    const addParticipant = () => {
      if (!newMeeting.participantName || !newMeeting.participantRole) return;
      setParticipants(prev => [...prev, {
        name: newMeeting.participantName,
        role: newMeeting.participantRole,
        attended: false,
      }]);
      setNewMeeting(prev => ({ ...prev, participantName: '', participantRole: '' }));
    };

    const removeParticipant = (idx: number) => {
      setParticipants(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveMeeting = () => {
      if (!newMeeting.title || !newMeeting.scheduledAt) {
        toast({ title: 'Judul dan jadwal wajib diisi', variant: 'destructive' });
        return;
      }
      const now = new Date().toISOString();
      if (editMeetingId) {
        updateFamilyMeeting(editMeetingId, {
          title: newMeeting.title,
          scheduledAt: newMeeting.scheduledAt,
          duration: parseInt(newMeeting.duration) || 60,
          agenda: newMeeting.agenda || undefined,
          participants,
        });
        toast({ title: 'Meeting berhasil diperbarui' });
      } else {
        addFamilyMeeting({
          id: genId('fm'),
          palliativePatientId: palliativePatientId!,
          title: newMeeting.title,
          scheduledAt: newMeeting.scheduledAt,
          duration: parseInt(newMeeting.duration) || 60,
          status: 'dijadwalkan',
          participants,
          agenda: newMeeting.agenda || undefined,
          createdBy: currentUser?.name || 'Dokter',
          createdAt: now,
          updatedAt: now,
        });
        toast({ title: 'Meeting berhasil dijadwalkan' });
      }
      setShowDialog(false);
      resetMeetingForm();
    };

    const resetMeetingForm = () => {
      setNewMeeting({ title: '', scheduledAt: '', duration: '60', agenda: '', participantName: '', participantRole: '' });
      setParticipants([]);
      setEditMeetingId(null);
    };

    const openEditMeeting = (m: FamilyMeetingRecord) => {
      setEditMeetingId(m.id);
      setNewMeeting({
        title: m.title,
        scheduledAt: m.scheduledAt.slice(0, 16),
        duration: String(m.duration || 60),
        agenda: m.agenda || '',
        participantName: '', participantRole: '',
      });
      setParticipants(m.participants || []);
      setShowDialog(true);
    };

    const completeMeeting = (m: FamilyMeetingRecord) => {
      updateFamilyMeeting(m.id, {
        status: 'selesai',
        discussionNotes: 'Meeting telah selesai',
      });
      toast({ title: 'Meeting ditandai selesai' });
    };

    const cancelMeeting = (m: FamilyMeetingRecord) => {
      updateFamilyMeeting(m.id, { status: 'dibatalkan' });
      toast({ title: 'Meeting dibatalkan' });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-600" />
            Family Meeting Virtual
          </h3>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { resetMeetingForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Jadwalkan Meeting
          </Button>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {patientMeetings.map(m => (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{fmtDateTime(m.scheduledAt)}</span>
                      <span className="text-xs text-slate-400">({m.duration || 60} menit)</span>
                    </div>
                  </div>
                  {meetingStatusBadge(m.status)}
                </div>
                {m.agenda && <p className="text-xs text-slate-600 mb-2">Agenda: {m.agenda}</p>}
                {m.participants && m.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.participants.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {p.name} ({p.role})
                      </Badge>
                    ))}
                  </div>
                )}
                {m.status === 'selesai' && m.discussionNotes && (
                  <div className="bg-slate-50 rounded p-2 mt-2">
                    <p className="text-xs font-medium text-slate-600">Catatan Diskusi:</p>
                    <p className="text-xs text-slate-500">{m.discussionNotes}</p>
                    {m.followUpActions && m.followUpActions.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-slate-600">Tindak Lanjut:</p>
                        <ul className="list-disc pl-4">
                          {m.followUpActions.map((a, i) => <li key={i} className="text-xs text-slate-500">{a}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  {m.status === 'dijadwalkan' && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => openEditMeeting(m)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600"
                        onClick={() => completeMeeting(m)}><CheckCircle2 className="h-3 w-3 mr-1" /> Selesai</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-600"
                        onClick={() => cancelMeeting(m)}><XCircle className="h-3 w-3 mr-1" /> Batal</Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
            {patientMeetings.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada family meeting</p>
            )}
          </div>
        </ScrollArea>

        {/* Meeting Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editMeetingId ? 'Edit Meeting' : 'Jadwalkan Meeting Baru'}</DialogTitle>
              <DialogDescription>Isi detail family meeting virtual</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Judul Meeting *</Label>
                <Input value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))}
                  placeholder="Contoh: Rencana Perawatan Lanjutan" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tanggal & Waktu *</Label>
                  <Input type="datetime-local" value={newMeeting.scheduledAt}
                    onChange={e => setNewMeeting(p => ({ ...p, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Durasi (menit)</Label>
                  <Input type="number" value={newMeeting.duration}
                    onChange={e => setNewMeeting(p => ({ ...p, duration: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Agenda</Label>
                <Textarea value={newMeeting.agenda} onChange={e => setNewMeeting(p => ({ ...p, agenda: e.target.value }))}
                  placeholder="Topik pembahasan meeting..." />
              </div>
              <Separator />
              <div>
                <Label className="text-xs">Tambah Peserta</Label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Nama" className="flex-1" value={newMeeting.participantName}
                    onChange={e => setNewMeeting(p => ({ ...p, participantName: e.target.value }))} />
                  <Input placeholder="Peran" className="flex-1" value={newMeeting.participantRole}
                    onChange={e => setNewMeeting(p => ({ ...p, participantRole: e.target.value }))} />
                  <Button size="sm" variant="outline" onClick={addParticipant}><Plus className="h-4 w-4" /></Button>
                </div>
                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {participants.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                        {p.name} ({p.role})
                        <XCircle className="h-3 w-3 cursor-pointer text-slate-400 hover:text-red-500"
                          onClick={() => removeParticipant(i)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveMeeting}>
                {editMeetingId ? 'Perbarui' : 'Jadwalkan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ── 5. Family Support Tools ─────────────────────────────────────────────

  const EduToolsTab = () => {
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const filtered = useMemo(() => {
      const active = eduMaterials.filter(m => m.isActive);
      if (categoryFilter === 'all') return active;
      return active.filter(m => m.category === categoryFilter);
    }, [eduMaterials, categoryFilter]);

    const categories: EduMaterialCategory[] = [
      'perawatan_rumah', 'panduan_caregiver', 'video_edukasi',
      'dukungan_psikososial', 'gawat_darurat', 'end_of_life', 'faq',
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-teal-600" />
          Materi Edukasi & Dukungan
        </h3>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant={categoryFilter === 'all' ? 'default' : 'outline'}
            className={`text-xs h-7 ${categoryFilter === 'all' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
            onClick={() => setCategoryFilter('all')}>
            Semua
          </Button>
          {categories.map(c => (
            <Button key={c} size="sm" variant={categoryFilter === c ? 'default' : 'outline'}
              className={`text-xs h-7 ${categoryFilter === c ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
              onClick={() => setCategoryFilter(c)}>
              {categoryLabel(c)}
            </Button>
          ))}
        </div>

        {/* Material Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(mat => (
            <Card key={mat.id} className="p-4 cursor-pointer hover:border-teal-300 transition-colors"
              onClick={() => {
                logEduMaterialAccess(mat.id, currentUser?.name || 'Pengguna');
                toast({ title: `Materi "${mat.title}" dibuka` });
              }}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 text-teal-600">
                  {typeIcon(mat.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">{mat.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{mat.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {categoryBadge(mat.category)}
                    <span className="text-xs text-slate-400">{mat.accessCount}x diakses</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 col-span-2 text-center py-8">Tidak ada materi untuk kategori ini</p>
          )}
        </div>
      </div>
    );
  };

  // ── 6. Caregiver Management ────────────────────────────────────────────

  const CaregiverTab = () => {
    const [showDialog, setShowDialog] = useState(false);
    const [showZaritDialog, setShowZaritDialog] = useState(false);
    const [showApgarDialog, setShowApgarDialog] = useState(false);
    const [activeCaregiverId, setActiveCaregiverId] = useState<string | null>(null);
    const [editCaregiverId, setEditCaregiverId] = useState<string | null>(null);

    const [cgForm, setCgForm] = useState({
      name: '', role: 'utama' as CaregiverRole, relation: 'anak' as CaregiverRelation,
      relationOther: '', phone: '', email: '', address: '', schedule: '', tasksStr: '',
    });

    const [zaritAnswers, setZaritAnswers] = useState<number[]>(Array(12).fill(0));
    const [apgarAnswers, setApgarAnswers] = useState<number[]>(Array(5).fill(0));

    const resetCgForm = () => {
      setCgForm({
        name: '', role: 'utama', relation: 'anak', relationOther: '',
        phone: '', email: '', address: '', schedule: '', tasksStr: '',
      });
      setEditCaregiverId(null);
    };

    const handleSaveCaregiver = () => {
      if (!cgForm.name || !cgForm.phone) {
        toast({ title: 'Nama dan telepon wajib diisi', variant: 'destructive' });
        return;
      }
      const now = new Date().toISOString();
      const tasks = cgForm.tasksStr.split(',').map(t => t.trim()).filter(Boolean);
      if (editCaregiverId) {
        updateCaregiver(editCaregiverId, {
          name: cgForm.name, role: cgForm.role, relation: cgForm.relation,
          relationOther: cgForm.relation !== 'lainnya' ? undefined : cgForm.relationOther,
          phone: cgForm.phone, email: cgForm.email || undefined,
          address: cgForm.address || undefined, schedule: cgForm.schedule || undefined,
          tasks: tasks.length > 0 ? tasks : undefined,
        });
        toast({ title: 'Caregiver berhasil diperbarui' });
      } else {
        addCaregiver({
          id: genId('cg'),
          palliativePatientId: palliativePatientId!,
          name: cgForm.name, role: cgForm.role, relation: cgForm.relation,
          relationOther: cgForm.relation !== 'lainnya' ? undefined : cgForm.relationOther,
          phone: cgForm.phone, email: cgForm.email || undefined,
          address: cgForm.address || undefined, schedule: cgForm.schedule || undefined,
          tasks: tasks.length > 0 ? tasks : undefined,
          isActive: true,
          createdAt: now, updatedAt: now,
        });
        toast({ title: 'Caregiver berhasil ditambahkan' });
      }
      setShowDialog(false);
      resetCgForm();
    };

    const openEditCaregiver = (cg: CaregiverInfo) => {
      setEditCaregiverId(cg.id);
      setCgForm({
        name: cg.name, role: cg.role, relation: cg.relation,
        relationOther: cg.relationOther || '', phone: cg.phone, email: cg.email || '',
        address: cg.address || '', schedule: cg.schedule || '',
        tasksStr: (cg.tasks || []).join(', '),
      });
      setShowDialog(true);
    };

    const handleSaveZarit = () => {
      if (!activeCaregiverId) return;
      const score = zaritAnswers.reduce((a, b) => a + b, 0);
      const level: 'beban_ringan' | 'beban_sedang' | 'beban_berat' =
        score <= 20 ? 'beban_ringan' : score <= 32 ? 'beban_sedang' : 'beban_berat';
      updateCaregiver(activeCaregiverId, { zaritScore: score, zaritLevel: level });
      toast({ title: `Skor Zarit: ${score}/48 - ${level.replace('_', ' ')}` });
      setShowZaritDialog(false);
      setZaritAnswers(Array(12).fill(0));
    };

    const handleSaveApgar = () => {
      if (!activeCaregiverId) return;
      const score = apgarAnswers.reduce((a, b) => a + b, 0);
      const level: CaregiverInfo['familyApgarLevel'] =
        score <= 3 ? 'dysfunctional' : score <= 6 ? 'severe_dysfunction' :
        score <= 8 ? 'moderate_dysfunction' : score === 9 ? 'good' : 'high_functional';
      updateCaregiver(activeCaregiverId, { familyApgarScore: score, familyApgarLevel: level });
      toast({ title: `Skor APGAR Keluarga: ${score}/10` });
      setShowApgarDialog(false);
      setApgarAnswers(Array(5).fill(0));
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-600" />
            Manajemen Caregiver
          </h3>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { resetCgForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Caregiver
          </Button>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {patientCaregivers.map(cg => (
              <Card key={cg.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold">
                      {cg.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cg.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {roleBadge(cg.role)}
                        <span className="text-xs text-slate-500 capitalize">{cg.relation.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                  <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{cg.phone}</div>
                  {cg.email && <div className="flex items-center gap-1">{cg.email}</div>}
                  {cg.schedule && <div><Clock className="h-3 w-3 inline mr-1" />{cg.schedule}</div>}
                </div>
                {cg.tasks && cg.tasks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {cg.tasks.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {cg.zaritScore != null && (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-300 border text-xs">
                      Zarit: {cg.zaritScore}/48
                    </Badge>
                  )}
                  {zaritLevelBadge(cg.zaritLevel)}
                  {cg.familyApgarScore != null && (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-300 border text-xs">
                      APGAR: {cg.familyApgarScore}/10
                    </Badge>
                  )}
                  {apgarLevelBadge(cg.familyApgarLevel)}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => openEditCaregiver(cg)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => { setActiveCaregiverId(cg.id); setShowZaritDialog(true); }}>
                    Zarit
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => { setActiveCaregiverId(cg.id); setShowApgarDialog(true); }}>
                    APGAR
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 text-red-600"
                    onClick={() => { removeCaregiver(cg.id); toast({ title: 'Caregiver dihapus' }); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
            {patientCaregivers.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada caregiver terdaftar</p>
            )}
          </div>
        </ScrollArea>

        {/* Caregiver Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editCaregiverId ? 'Edit Caregiver' : 'Tambah Caregiver'}</DialogTitle>
              <DialogDescription>Isi data caregiver pasien</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nama *</Label>
                <Input value={cgForm.name} onChange={e => setCgForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Peran</Label>
                  <Select value={cgForm.role} onValueChange={v => setCgForm(p => ({ ...p, role: v as CaregiverRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utama">Utama</SelectItem>
                      <SelectItem value="pendamping">Pendamping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Hubungan</Label>
                  <Select value={cgForm.relation} onValueChange={v => setCgForm(p => ({ ...p, relation: v as CaregiverRelation }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suami">Suami</SelectItem>
                      <SelectItem value="istri">Istri</SelectItem>
                      <SelectItem value="anak">Anak</SelectItem>
                      <SelectItem value="orang_tua">Orang Tua</SelectItem>
                      <SelectItem value="saudara">Saudara</SelectItem>
                      <SelectItem value="teman">Teman</SelectItem>
                      <SelectItem value="pembantu">Pembantu</SelectItem>
                      <SelectItem value="perawat">Perawat</SelectItem>
                      <SelectItem value="lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {cgForm.relation === 'lainnya' && (
                <div>
                  <Label className="text-xs">Hubungan Lainnya</Label>
                  <Input value={cgForm.relationOther}
                    onChange={e => setCgForm(p => ({ ...p, relationOther: e.target.value }))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Telepon *</Label>
                  <Input value={cgForm.phone} onChange={e => setCgForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={cgForm.email} onChange={e => setCgForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Alamat</Label>
                <Input value={cgForm.address} onChange={e => setCgForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Jadwal</Label>
                <Input value={cgForm.schedule} onChange={e => setCgForm(p => ({ ...p, schedule: e.target.value }))}
                  placeholder="Contoh: Senin-Jumat, 08:00-16:00" />
              </div>
              <div>
                <Label className="text-xs">Tugas (pisahkan dengan koma)</Label>
                <Input value={cgForm.tasksStr} onChange={e => setCgForm(p => ({ ...p, tasksStr: e.target.value }))}
                  placeholder="Contoh: Memberi obat, Menyiapkan makanan" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveCaregiver}>
                {editCaregiverId ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Zarit Dialog */}
        <Dialog open={showZaritDialog} onOpenChange={setShowZaritDialog}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Zarit Caregiver Burden Scale</DialogTitle>
              <DialogDescription>12 pertanyaan, skor 0-4 per item (total 0-48)</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-2">
              <div className="space-y-4">
                {zaritQuestions.map((q, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs font-medium">{i + 1}. {q}</p>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map(v => (
                        <Button key={v} size="sm" variant={zaritAnswers[i] === v ? 'default' : 'outline'}
                          className={`text-xs h-7 flex-1 ${zaritAnswers[i] === v ? 'bg-teal-600 text-white' : ''}`}
                          onClick={() => {
                            const next = [...zaritAnswers];
                            next[i] = v;
                            setZaritAnswers(next);
                          }}>
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold">Total: {zaritAnswers.reduce((a, b) => a + b, 0)}/48</span>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveZarit}>
                Simpan Penilaian
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* APGAR Dialog */}
        <Dialog open={showApgarDialog} onOpenChange={setShowApgarDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Family APGAR Scale</DialogTitle>
              <DialogDescription>5 pertanyaan, skor 0-2 per item (total 0-10)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {apgarQuestions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-medium">{i + 1}. {q}</p>
                  <div className="flex gap-1">
                    {[
                      { v: 0, label: 'Tidak Pernah' },
                      { v: 1, label: 'Kadang-kadang' },
                      { v: 2, label: 'Hampir Selalu' },
                    ].map(opt => (
                      <Button key={opt.v} size="sm" variant={apgarAnswers[i] === opt.v ? 'default' : 'outline'}
                        className={`text-xs h-7 flex-1 ${apgarAnswers[i] === opt.v ? 'bg-teal-600 text-white' : ''}`}
                        onClick={() => {
                          const next = [...apgarAnswers];
                          next[i] = opt.v;
                          setApgarAnswers(next);
                        }}>
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold">Total: {apgarAnswers.reduce((a, b) => a + b, 0)}/10</span>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveApgar}>
                Simpan Penilaian
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ── 7. Koordinasi Keluarga ──────────────────────────────────────────────

  const CoordinationTab = () => {
    const [showForm, setShowForm] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');
    const [noteForm, setNoteForm] = useState({
      content: '', type: 'perkembangan' as FamilyCoordinationNote['type'], dueDate: '',
    });

    const filteredNotes = useMemo(() => {
      if (filterType === 'all') return patientCoordNotes;
      return patientCoordNotes.filter(n => n.type === filterType);
    }, [patientCoordNotes, filterType]);

    const handleSaveNote = () => {
      if (!noteForm.content) {
        toast({ title: 'Isi catatan terlebih dahulu', variant: 'destructive' });
        return;
      }
      const now = new Date().toISOString();
      addFamilyCoordinationNote({
        id: genId('fcn'),
        palliativePatientId: palliativePatientId!,
        authorName: currentUser?.name || 'Pengguna',
        authorRelation: 'Tim Paliatif',
        content: noteForm.content,
        type: noteForm.type,
        isCompleted: false,
        dueDate: noteForm.dueDate || undefined,
        createdAt: now,
        updatedAt: now,
      });
      toast({ title: 'Catatan berhasil ditambahkan' });
      setNoteForm({ content: '', type: 'perkembangan', dueDate: '' });
      setShowForm(false);
    };

    const toggleComplete = (id: string, isCompleted: boolean) => {
      updateFamilyCoordinationNote(id, { isCompleted: !isCompleted });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FolderSync className="h-4 w-4 text-teal-600" />
            Koordinasi Keluarga
          </h3>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Catatan
          </Button>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant={filterType === 'all' ? 'default' : 'outline'}
            className={`text-xs h-7 ${filterType === 'all' ? 'bg-teal-600 text-white' : ''}`}
            onClick={() => setFilterType('all')}>Semua</Button>
          {['perkembangan', 'tugas', 'pengingat_obat', 'pengingat_kontrol', 'tanggung_jawab', 'lainnya'].map(t => (
            <Button key={t} size="sm" variant={filterType === t ? 'default' : 'outline'}
              className={`text-xs h-7 ${filterType === t ? 'bg-teal-600 text-white' : ''}`}
              onClick={() => setFilterType(t)}>
              {t === 'pengingat_obat' ? 'Pengingat Obat' :
               t === 'pengingat_kontrol' ? 'Pengingat Kontrol' :
               t === 'tanggung_jawab' ? 'Tanggung Jawab' :
               t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>

        {/* Add Note Form */}
        {showForm && (
          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Catatan *</Label>
                <Textarea value={noteForm.content}
                  onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Tulis catatan koordinasi..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tipe</Label>
                  <Select value={noteForm.type}
                    onValueChange={v => setNoteForm(p => ({ ...p, type: v as FamilyCoordinationNote['type'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perkembangan">Perkembangan</SelectItem>
                      <SelectItem value="tugas">Tugas</SelectItem>
                      <SelectItem value="pengingat_obat">Pengingat Obat</SelectItem>
                      <SelectItem value="pengingat_kontrol">Pengingat Kontrol</SelectItem>
                      <SelectItem value="tanggung_jawab">Tanggung Jawab</SelectItem>
                      <SelectItem value="lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tenggat Waktu</Label>
                  <Input type="date" value={noteForm.dueDate}
                    onChange={e => setNoteForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleSaveNote}>Simpan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Notes List */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {filteredNotes.map(note => (
              <Card key={note.id} className={`p-3 ${note.isCompleted ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleComplete(note.id, note.isCompleted)} className="mt-0.5">
                    {note.isCompleted ?
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                      <Circle className="h-4 w-4 text-slate-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {noteTypeBadge(note.type)}
                      <span className="text-xs text-slate-400">{note.authorName} • {fmtDateTime(note.createdAt)}</span>
                    </div>
                    <p className={`text-sm ${note.isCompleted ? 'line-through text-slate-400' : ''}`}>
                      {note.content}
                    </p>
                    {note.dueDate && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Tenggat: {fmtDate(note.dueDate)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {filteredNotes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada catatan koordinasi</p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // ── 8. Kontak Darurat ──────────────────────────────────────────────────

  const EmergencyContactTab = () => {
    const [showDialog, setShowDialog] = useState(false);
    const [editContactId, setEditContactId] = useState<string | null>(null);
    const [contactForm, setContactForm] = useState({
      name: '', role: 'keluarga' as EmergencyContact['role'],
      phone: '', alternatePhone: '', isPrimary: false, notes: '',
    });

    const resetContactForm = () => {
      setContactForm({ name: '', role: 'keluarga', phone: '', alternatePhone: '', isPrimary: false, notes: '' });
      setEditContactId(null);
    };

    const handleSaveContact = () => {
      if (!contactForm.name || !contactForm.phone) {
        toast({ title: 'Nama dan telepon wajib diisi', variant: 'destructive' });
        return;
      }
      const now = new Date().toISOString();
      if (editContactId) {
        updateEmergencyContact(editContactId, {
          name: contactForm.name, role: contactForm.role,
          phone: contactForm.phone, alternatePhone: contactForm.alternatePhone || undefined,
          isPrimary: contactForm.isPrimary, notes: contactForm.notes || undefined,
        });
        toast({ title: 'Kontak berhasil diperbarui' });
      } else {
        addEmergencyContact({
          id: genId('ec'),
          palliativePatientId: palliativePatientId!,
          name: contactForm.name, role: contactForm.role,
          phone: contactForm.phone, alternatePhone: contactForm.alternatePhone || undefined,
          isPrimary: contactForm.isPrimary, notes: contactForm.notes || undefined,
          createdAt: now, updatedAt: now,
        });
        toast({ title: 'Kontak darurat berhasil ditambahkan' });
      }
      setShowDialog(false);
      resetContactForm();
    };

    const openEditContact = (c: EmergencyContact) => {
      setEditContactId(c.id);
      setContactForm({
        name: c.name, role: c.role, phone: c.phone,
        alternatePhone: c.alternatePhone || '', isPrimary: c.isPrimary, notes: c.notes || '',
      });
      setShowDialog(true);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-red-600" />
            Kontak Darurat
          </h3>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { resetContactForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Kontak
          </Button>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {patientContacts.map(c => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-sm font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      </div>
                      {emergencyRoleBadge(c.role)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                  <Phone className="h-3 w-3" /> {c.phone}
                  {c.alternatePhone && <span> / {c.alternatePhone}</span>}
                </div>
                {c.notes && <p className="text-xs text-slate-500 mb-2">{c.notes}</p>}
                <div className="flex gap-1">
                  <a href={`tel:${c.phone}`}>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-teal-600">
                      <PhoneCall className="h-3 w-3 mr-1" /> Hubungi
                    </Button>
                  </a>
                  <a href={`sms:${c.phone}`}>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      <MessageSquare className="h-3 w-3 mr-1" /> Pesan
                    </Button>
                  </a>
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => openEditContact(c)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 text-red-600"
                    onClick={() => { removeEmergencyContact(c.id); toast({ title: 'Kontak dihapus' }); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
            {patientContacts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada kontak darurat</p>
            )}
          </div>
        </ScrollArea>

        {/* Contact Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editContactId ? 'Edit Kontak Darurat' : 'Tambah Kontak Darurat'}</DialogTitle>
              <DialogDescription>Isi data kontak darurat</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nama *</Label>
                <Input value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Peran</Label>
                <Select value={contactForm.role}
                  onValueChange={v => setContactForm(p => ({ ...p, role: v as EmergencyContact['role'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dokter">Dokter</SelectItem>
                    <SelectItem value="perawat">Perawat</SelectItem>
                    <SelectItem value="caregiver_utama">Caregiver Utama</SelectItem>
                    <SelectItem value="keluarga">Keluarga</SelectItem>
                    <SelectItem value="ambulans">Ambulans</SelectItem>
                    <SelectItem value="rumah_sakit">Rumah Sakit</SelectItem>
                    <SelectItem value="gawat_darurat">Gawat Darurat</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Telepon *</Label>
                  <Input value={contactForm.phone}
                    onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Telepon Alternatif</Label>
                  <Input value={contactForm.alternatePhone}
                    onChange={e => setContactForm(p => ({ ...p, alternatePhone: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={contactForm.isPrimary}
                  onCheckedChange={c => setContactForm(p => ({ ...p, isPrimary: c === true }))} />
                <Label className="text-xs">Kontak Utama</Label>
              </div>
              <div>
                <Label className="text-xs">Catatan</Label>
                <Input value={contactForm.notes}
                  onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveContact}>
                {editContactId ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ── 9. Dukungan Finansial ───────────────────────────────────────────────

  const FinancialTab = () => {
    const [showDialog, setShowDialog] = useState(false);
    const [editRecordId, setEditRecordId] = useState<string | null>(null);
    const [finForm, setFinForm] = useState({
      insuranceStatus: 'bpjs' as FinancialSupportRecord['insuranceStatus'],
      insuranceDetails: '', bpjsNumber: '',
      socialAidStatus: 'belum_menerima' as FinancialSupportRecord['socialAidStatus'],
      socialAidDetails: '',
      treatmentCostNeed: 'tidak_ada' as FinancialSupportRecord['treatmentCostNeed'],
      medicalEquipmentCostNeed: 'tidak_ada' as FinancialSupportRecord['medicalEquipmentCostNeed'],
      transportCostNeed: 'tidak_ada' as FinancialSupportRecord['transportCostNeed'],
      recommendedProgramsStr: '', notes: '',
    });

    const resetFinForm = () => {
      setFinForm({
        insuranceStatus: 'bpjs', insuranceDetails: '', bpjsNumber: '',
        socialAidStatus: 'belum_menerima', socialAidDetails: '',
        treatmentCostNeed: 'tidak_ada', medicalEquipmentCostNeed: 'tidak_ada',
        transportCostNeed: 'tidak_ada', recommendedProgramsStr: '', notes: '',
      });
      setEditRecordId(null);
    };

    const handleSaveFinancial = () => {
      const now = new Date().toISOString();
      const programs = finForm.recommendedProgramsStr.split(',').map(p => p.trim()).filter(Boolean);
      if (editRecordId) {
        updateFinancialSupportRecord(editRecordId, {
          insuranceStatus: finForm.insuranceStatus,
          insuranceDetails: finForm.insuranceDetails || undefined,
          bpjsNumber: finForm.bpjsNumber || undefined,
          socialAidStatus: finForm.socialAidStatus,
          socialAidDetails: finForm.socialAidDetails || undefined,
          treatmentCostNeed: finForm.treatmentCostNeed,
          medicalEquipmentCostNeed: finForm.medicalEquipmentCostNeed,
          transportCostNeed: finForm.transportCostNeed,
          recommendedPrograms: programs,
          notes: finForm.notes || undefined,
        });
        toast({ title: 'Data finansial berhasil diperbarui' });
      } else {
        addFinancialSupportRecord({
          id: genId('fs'),
          palliativePatientId: palliativePatientId!,
          insuranceStatus: finForm.insuranceStatus,
          insuranceDetails: finForm.insuranceDetails || undefined,
          bpjsNumber: finForm.bpjsNumber || undefined,
          socialAidStatus: finForm.socialAidStatus,
          socialAidDetails: finForm.socialAidDetails || undefined,
          treatmentCostNeed: finForm.treatmentCostNeed,
          medicalEquipmentCostNeed: finForm.medicalEquipmentCostNeed,
          transportCostNeed: finForm.transportCostNeed,
          recommendedPrograms: programs,
          notes: finForm.notes || undefined,
          assessedBy: currentUser?.name || 'Tim Paliatif',
          assessedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        toast({ title: 'Data finansial berhasil ditambahkan' });
      }
      setShowDialog(false);
      resetFinForm();
    };

    const openEditFinancial = (f: FinancialSupportRecord) => {
      setEditRecordId(f.id);
      setFinForm({
        insuranceStatus: f.insuranceStatus, insuranceDetails: f.insuranceDetails || '',
        bpjsNumber: f.bpjsNumber || '', socialAidStatus: f.socialAidStatus,
        socialAidDetails: f.socialAidDetails || '', treatmentCostNeed: f.treatmentCostNeed,
        medicalEquipmentCostNeed: f.medicalEquipmentCostNeed,
        transportCostNeed: f.transportCostNeed,
        recommendedProgramsStr: (f.recommendedPrograms || []).join(', '),
        notes: f.notes || '',
      });
      setShowDialog(true);
    };

    const costLevelBadge = (level: string) => {
      const map: Record<string, { label: string; cls: string }> = {
        tidak_ada: { label: 'Tidak Ada', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
        ringan: { label: 'Ringan', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
        sedang: { label: 'Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
        berat: { label: 'Berat', cls: 'bg-red-100 text-red-800 border-red-300' },
      };
      const m = map[level] || map.tidak_ada;
      return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
    };

    const insuranceBadge = (s: string) => {
      const map: Record<string, { label: string; cls: string }> = {
        bpjs: { label: 'BPJS', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
        asuransi_swasta: { label: 'Asuransi Swasta', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
        tidak_memiliki: { label: 'Tidak Memiliki', cls: 'bg-red-100 text-red-800 border-red-300' },
        campuran: { label: 'Campuran', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
      };
      const m = map[s] || map.tidak_memiliki;
      return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Dukungan Finansial
          </h3>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { resetFinForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Data
          </Button>
        </div>

        {/* Financial Records */}
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {patientFinancials.map(f => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      Status Asuransi: {insuranceBadge(f.insuranceStatus)}
                    </p>
                    {f.insuranceDetails && <p className="text-xs text-slate-500 mt-1">{f.insuranceDetails}</p>}
                    {f.bpjsNumber && <p className="text-xs text-slate-500">No. BPJS: {f.bpjsNumber}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => openEditFinancial(f)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Bantuan Sosial</span>
                    <p className="font-medium capitalize">{f.socialAidStatus.replace(/_/g, ' ')}</p>
                    {f.socialAidDetails && <p className="text-slate-500">{f.socialAidDetails}</p>}
                  </div>
                  <div>
                    <span className="text-slate-500">Kebutuhan Biaya Pengobatan</span>
                    <div className="mt-0.5">{costLevelBadge(f.treatmentCostNeed)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Kebutuhan Alat Kesehatan</span>
                    <div className="mt-0.5">{costLevelBadge(f.medicalEquipmentCostNeed)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Kebutuhan Transportasi</span>
                    <div className="mt-0.5">{costLevelBadge(f.transportCostNeed)}</div>
                  </div>
                </div>

                {f.recommendedPrograms && f.recommendedPrograms.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-slate-500">Program yang Direkomendasikan:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {f.recommendedPrograms.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-2">Dinilai oleh: {f.assessedBy} • {fmtDate(f.assessedAt)}</p>
              </Card>
            ))}
            {patientFinancials.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada data finansial</p>
            )}
          </div>
        </ScrollArea>

        {/* Financial Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{editRecordId ? 'Edit Data Finansial' : 'Tambah Data Finansial'}</DialogTitle>
              <DialogDescription>Isi data dukungan finansial pasien</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[55vh] pr-2">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status Asuransi</Label>
                  <Select value={finForm.insuranceStatus}
                    onValueChange={v => setFinForm(p => ({ ...p, insuranceStatus: v as FinancialSupportRecord['insuranceStatus'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bpjs">BPJS</SelectItem>
                      <SelectItem value="asuransi_swasta">Asuransi Swasta</SelectItem>
                      <SelectItem value="tidak_memiliki">Tidak Memiliki</SelectItem>
                      <SelectItem value="campuran">Campuran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Detail Asuransi</Label>
                  <Input value={finForm.insuranceDetails}
                    onChange={e => setFinForm(p => ({ ...p, insuranceDetails: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Nomor BPJS</Label>
                  <Input value={finForm.bpjsNumber}
                    onChange={e => setFinForm(p => ({ ...p, bpjsNumber: e.target.value }))} />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Status Bantuan Sosial</Label>
                  <Select value={finForm.socialAidStatus}
                    onValueChange={v => setFinForm(p => ({ ...p, socialAidStatus: v as FinancialSupportRecord['socialAidStatus'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="menerima">Menerima</SelectItem>
                      <SelectItem value="pernah_menerima">Pernah Menerima</SelectItem>
                      <SelectItem value="belum_menerima">Belum Menerima</SelectItem>
                      <SelectItem value="tidak_berhak">Tidak Berhak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Detail Bantuan Sosial</Label>
                  <Input value={finForm.socialAidDetails}
                    onChange={e => setFinForm(p => ({ ...p, socialAidDetails: e.target.value }))} />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Kebutuhan Biaya Pengobatan</Label>
                  <Select value={finForm.treatmentCostNeed}
                    onValueChange={v => setFinForm(p => ({ ...p, treatmentCostNeed: v as FinancialSupportRecord['treatmentCostNeed'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tidak_ada">Tidak Ada</SelectItem>
                      <SelectItem value="ringan">Ringan</SelectItem>
                      <SelectItem value="sedang">Sedang</SelectItem>
                      <SelectItem value="berat">Berat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Kebutuhan Alat Kesehatan</Label>
                  <Select value={finForm.medicalEquipmentCostNeed}
                    onValueChange={v => setFinForm(p => ({ ...p, medicalEquipmentCostNeed: v as FinancialSupportRecord['medicalEquipmentCostNeed'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tidak_ada">Tidak Ada</SelectItem>
                      <SelectItem value="ringan">Ringan</SelectItem>
                      <SelectItem value="sedang">Sedang</SelectItem>
                      <SelectItem value="berat">Berat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Kebutuhan Transportasi</Label>
                  <Select value={finForm.transportCostNeed}
                    onValueChange={v => setFinForm(p => ({ ...p, transportCostNeed: v as FinancialSupportRecord['transportCostNeed'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tidak_ada">Tidak Ada</SelectItem>
                      <SelectItem value="ringan">Ringan</SelectItem>
                      <SelectItem value="sedang">Sedang</SelectItem>
                      <SelectItem value="berat">Berat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Program yang Direkomendasikan (pisahkan koma)</Label>
                  <Input value={finForm.recommendedProgramsStr}
                    onChange={e => setFinForm(p => ({ ...p, recommendedProgramsStr: e.target.value }))}
                    placeholder="PKH, BPNT, Jamkesda" />
                </div>
                <div>
                  <Label className="text-xs">Catatan</Label>
                  <Textarea value={finForm.notes}
                    onChange={e => setFinForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveFinancial}>
                {editRecordId ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ── 10. Dukungan Transportasi ──────────────────────────────────────────

  const TransportTab = () => {
    const [showDialog, setShowDialog] = useState(false);
    const [transForm, setTransForm] = useState({
      type: 'transportasi_medis' as TransportNeedType,
      scheduledAt: '', origin: '', destination: '', notes: '',
    });

    const resetTransForm = () => {
      setTransForm({ type: 'transportasi_medis', scheduledAt: '', origin: '', destination: '', notes: '' });
    };

    const handleSaveTransport = () => {
      if (!transForm.origin || !transForm.destination) {
        toast({ title: 'Asal dan tujuan wajib diisi', variant: 'destructive' });
        return;
      }
      const now = new Date().toISOString();
      addTransportRecord({
        id: genId('tr'),
        palliativePatientId: palliativePatientId!,
        type: transForm.type,
        status: 'belum_dipesan',
        scheduledAt: transForm.scheduledAt || undefined,
        origin: transForm.origin,
        destination: transForm.destination,
        notes: transForm.notes || undefined,
        requestedBy: currentUser?.name || 'Pengguna',
        createdAt: now,
        updatedAt: now,
      });
      toast({ title: 'Permintaan transportasi berhasil ditambahkan' });
      setShowDialog(false);
      resetTransForm();
    };

    const updateTransportStatus = (id: string, status: TransportStatus) => {
      updateTransportRecord(id, {
        status,
        ...(status === 'selesai' ? { completedAt: new Date().toISOString() } : {}),
      });
      toast({ title: `Status transportasi diperbarui: ${status.replace(/_/g, ' ')}` });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Car className="h-4 w-4 text-slate-600" />
            Dukungan Transportasi
          </h3>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => { resetTransForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Permintaan Transportasi
          </Button>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {patientTransport.map(t => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {transportTypeBadge(t.type)}
                    {transportStatusBadge(t.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="font-medium">{t.origin}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{t.destination}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  {t.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {fmtDateTime(t.scheduledAt)}
                    </span>
                  )}
                  {t.completedAt && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Selesai: {fmtDateTime(t.completedAt)}
                    </span>
                  )}
                </div>
                {t.notes && <p className="text-xs text-slate-500 mb-2">{t.notes}</p>}
                <p className="text-xs text-slate-400">Diminta oleh: {t.requestedBy}</p>

                <div className="flex gap-1 mt-2">
                  {t.status === 'belum_dipesan' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-teal-600"
                      onClick={() => updateTransportStatus(t.id, 'dipesan')}>
                      Pesan
                    </Button>
                  )}
                  {t.status === 'dipesan' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-amber-600"
                      onClick={() => updateTransportStatus(t.id, 'dalam_perjalanan')}>
                      Dalam Perjalanan
                    </Button>
                  )}
                  {t.status === 'dalam_perjalanan' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600"
                      onClick={() => updateTransportStatus(t.id, 'selesai')}>
                      Selesai
                    </Button>
                  )}
                  {(t.status === 'belum_dipesan' || t.status === 'dipesan') && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-600"
                      onClick={() => updateTransportStatus(t.id, 'dibatalkan')}>
                      Batalkan
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {patientTransport.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada catatan transportasi</p>
            )}
          </div>
        </ScrollArea>

        {/* Transport Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Permintaan Transportasi</DialogTitle>
              <DialogDescription>Isi detail permintaan transportasi</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Jenis Transportasi</Label>
                <Select value={transForm.type}
                  onValueChange={v => setTransForm(p => ({ ...p, type: v as TransportNeedType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambulans">Ambulans</SelectItem>
                    <SelectItem value="ambulans_darurat">Ambulans Darurat</SelectItem>
                    <SelectItem value="kendaraan_pribadi">Kendaraan Pribadi</SelectItem>
                    <SelectItem value="transportasi_medis">Transportasi Medis</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Jadwal</Label>
                <Input type="datetime-local" value={transForm.scheduledAt}
                  onChange={e => setTransForm(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Asal *</Label>
                <Input value={transForm.origin}
                  onChange={e => setTransForm(p => ({ ...p, origin: e.target.value }))}
                  placeholder="Contoh: Jl. Melati No. 12, Bandung" />
              </div>
              <div>
                <Label className="text-xs">Tujuan *</Label>
                <Input value={transForm.destination}
                  onChange={e => setTransForm(p => ({ ...p, destination: e.target.value }))}
                  placeholder="Contoh: RS Hasan Sadikin" />
              </div>
              <div>
                <Label className="text-xs">Catatan</Label>
                <Textarea value={transForm.notes}
                  onChange={e => setTransForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveTransport}>
                Ajukan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  const tabItems = [
    { value: 'dashboard', label: 'Dashboard', icon: Activity },
    { value: 'screening', label: 'Skrining Sosial', icon: ClipboardCheck },
    { value: 'family', label: 'Family Dashboard', icon: Heart },
    { value: 'meetings', label: 'Family Meeting', icon: Video },
    { value: 'edu-tools', label: 'Dukungan Keluarga', icon: BookOpen },
    { value: 'caregiver', label: 'Caregiver', icon: UserCheck },
    { value: 'coordination', label: 'Koordinasi', icon: FolderSync },
    { value: 'emergency', label: 'Kontak Darurat', icon: Phone },
    { value: 'financial', label: 'Finansial', icon: DollarSign },
    { value: 'transport', label: 'Transportasi', icon: Car },
    { value: 'ai-analysis', label: 'AI Analisis Sosial', icon: Brain },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="flex w-max gap-1 bg-slate-100 p-1 rounded-lg">
            {tabItems.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md whitespace-nowrap">
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <TabsContent value="dashboard" className="mt-4">
          {renderDashboard()}
        </TabsContent>
        <TabsContent value="screening" className="mt-4">
          <ScreeningTab />
        </TabsContent>
        <TabsContent value="family" className="mt-4">
          <FamilyDashboardTab />
        </TabsContent>
        <TabsContent value="meetings" className="mt-4">
          <MeetingTab />
        </TabsContent>
        <TabsContent value="edu-tools" className="mt-4">
          <EduToolsTab />
        </TabsContent>
        <TabsContent value="caregiver" className="mt-4">
          <CaregiverTab />
        </TabsContent>
        <TabsContent value="coordination" className="mt-4">
          <CoordinationTab />
        </TabsContent>
        <TabsContent value="emergency" className="mt-4">
          <EmergencyContactTab />
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <FinancialTab />
        </TabsContent>
        <TabsContent value="transport" className="mt-4">
          <TransportTab />
        </TabsContent>
        <TabsContent value="ai-analysis" className="mt-4">
          <AISocialAnalysisTab palliativePatientId={palliativePatientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
