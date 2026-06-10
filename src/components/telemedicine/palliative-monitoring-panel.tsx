'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type {
  PalliativePatientInfo,
  VitalSignRecordInfo,
  PalliativeMedicationInfo,
  AdvanceCarePlanInfo,
  PalliativeScreeningRecordInfo,
  PalliativeCareStatus,
  PalliativePatientStatus,
  PalliativeRiskLevel,
  PalliativeToolType,
  PalliativeEwsLevel,
  MedicationAdherenceInfo,
  PalliativeMonitoringStatus,
  PalliativeMonitoringFormType,
  PalliativeMonitoringNotification,
  PalliativeChatMessage,
  PalliativeAuditEntry,
  PalliativeProgramCompletionReason,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  HeartPulse,
  Activity,
  Pill,
  FileText,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  Thermometer,
  Droplets,
  Wind,
  Monitor,
  Brain,
  Shield,
  ClipboardCheck,
  Stethoscope,
  Home,
  Building2,
  AlertCircle,
  Info,
  Sparkles,
  RefreshCw,
  MessageCircle,
  Bell,
  History,
  CircleOff,
  CalendarCheck,
  FileCheck,
  Archive,
} from 'lucide-react';
import { PalliativeChatPanel } from './palliative-chat-panel';
import { MedicationMonitoringDashboard } from './medication-monitoring-dashboard';
import { PalliativeResumeReferralPanel } from './palliative-resume-referral-panel';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────────────────

type MonitorTab = 'dashboard' | 'patients' | 'ttv' | 'screening' | 'medication' | 'acp' | 'komunikasi' | 'ai' | 'chat' | 'audit' | 'dokumen';

// ── Helper Functions ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function getRiskBadge(level: PalliativeRiskLevel) {
  switch (level) {
    case 'merah':
      return { label: 'Risiko Tinggi', className: 'bg-red-100 text-red-800 border-red-300' };
    case 'kuning':
      return { label: 'Risiko Sedang', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'hijau':
      return { label: 'Risiko Rendah', className: 'bg-green-100 text-green-800 border-green-300' };
  }
}

function getCareStatusBadge(status: PalliativeCareStatus) {
  switch (status) {
    case 'rawat_jalan':
      return { label: 'Rawat Jalan', className: 'bg-blue-100 text-blue-800' };
    case 'home_care':
      return { label: 'Home Care', className: 'bg-teal-100 text-teal-800' };
    case 'hospice':
      return { label: 'Hospice', className: 'bg-purple-100 text-purple-800' };
    case 'rawat_inap':
      return { label: 'Rawat Inap', className: 'bg-orange-100 text-orange-800' };
  }
}

function getPatientStatusLabel(status: PalliativePatientStatus): string {
  switch (status) {
    case 'aktif': return 'Aktif';
    case 'meninggal': return 'Meninggal';
    case 'lost_follow_up': return 'Lost to Follow-up';
    case 'pindah_faskes': return 'Pindah Faskes';
  }
}

function getEwsBadge(level?: PalliativeEwsLevel) {
  if (!level) return { label: '-', className: 'bg-gray-100 text-gray-600' };
  switch (level) {
    case 'merah':
      return { label: 'Kritis', className: 'bg-red-100 text-red-800 border-red-300' };
    case 'kuning':
      return { label: 'Perhatian', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'hijau':
      return { label: 'Normal', className: 'bg-green-100 text-green-800 border-green-300' };
  }
}

function getToolTypeName(type: PalliativeToolType): string {
  switch (type) {
    case 'esas': return 'ESAS-r';
    case 'distress': return 'Distress Thermometer';
    case 'spict': return 'SPICT';
    case 'pps': return 'PPS';
    case 'zarit': return 'Zarit Burden';
    case 'eortc': return 'EORTC QLQ-C15-PAL';
  }
}

function getRecordedByLabel(by?: string): string {
  switch (by) {
    case 'doctor': return 'Dokter';
    case 'nurse': return 'Perawat';
    case 'patient': return 'Pasien';
    case 'family': return 'Keluarga';
    default: return '-';
  }
}

function getRouteLabel(route?: string): string {
  switch (route) {
    case 'oral': return 'Oral';
    case 'iv': return 'IV';
    case 'sc': return 'Subkutan';
    case 'im': return 'IM';
    case 'rektal': return 'Rektal';
    case 'topikal': return 'Topikal';
    case 'inhalasi': return 'Inhalasi';
    default: return route || '-';
  }
}

function calcBmi(weight?: number, height?: number): number | undefined {
  if (!weight || !height || height <= 0) return undefined;
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

// ── Main Component ───────────────────────────────────────────────────────

export function PalliativeMonitoringPanel() {
  // ── State ──
  const [activeTab, setActiveTab] = useState<MonitorTab>('dashboard');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddVital, setShowAddVital] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddACP, setShowAddACP] = useState(false);
  const [showAddAdherence, setShowAddAdherence] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PalliativePatientInfo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showProgramCompleteConfirm, setShowProgramCompleteConfirm] = useState<string | null>(null);
  const [programCompletionDate, setProgramCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [programCompletionReason, setProgramCompletionReason] = useState<PalliativeProgramCompletionReason>('sembuh_stabil');
  const [programCompletionOtherReason, setProgramCompletionOtherReason] = useState('');
  const [programCompletionNotes, setProgramCompletionNotes] = useState('');
  const [patientListFilter, setPatientListFilter] = useState<'aktif' | 'program_selesai'>('aktif');
  const [showPatientDetail, setShowPatientDetail] = useState<string | null>(null);
  const [vitalPeriod, setVitalPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [acpStep, setAcpStep] = useState(0);
  const [showACPDetail, setShowACPDetail] = useState<string | null>(null);

  // Form states for new patient
  const [newPatient, setNewPatient] = useState<Partial<PalliativePatientInfo>>({});
  // Form states for new vital sign
  const [newVital, setNewVital] = useState<Partial<VitalSignRecordInfo>>({});
  // Form states for new medication
  const [newMedication, setNewMedication] = useState<Partial<PalliativeMedicationInfo>>({});
  // Form states for ACP
  const [newACP, setNewACP] = useState<Partial<AdvanceCarePlanInfo>>({});
  // Form states for adherence
  const [newAdherence, setNewAdherence] = useState<Partial<MedicationAdherenceInfo>>({});

  // Komunikasi tab states
  const [komunikasiSearch, setKomunikasiSearch] = useState('');
  const [komunikasiFilter, setKomunikasiFilter] = useState<string>('all');
  const [showSendFormDialog, setShowSendFormDialog] = useState(false);
  const [sendFormPatientId, setSendFormPatientId] = useState<string | null>(null);
  const [selectedFormTypes, setSelectedFormTypes] = useState<PalliativeMonitoringFormType[]>([]);

  // ── Store ──
  const {
    palliativePatients,
    addPalliativePatient,
    updatePalliativePatient,
    removePalliativePatient,
    selectedPalliativePatientId,
    setSelectedPalliativePatientId,
    vitalSignRecords,
    addVitalSignRecord,
    palliativeMedications,
    addPalliativeMedication,
    updatePalliativeMedication,
    advanceCarePlans,
    addAdvanceCarePlan,
    updateAdvanceCarePlan,
    palliativeScreeningRecords,
    palliativeAiSummary,
    setPalliativeAiSummary,
    currentUser,
    doctors,
    palliativeChatMessages,
    palliativeClinicalAlerts,
    palliativeAuditLog,
    markPalliativeAlertRead,
    addPalliativeChatMessage,
    addPalliativeAuditEntry,
    updatePalliativeMonitoringStatus,
    palliativeMonitoringNotifications,
    addPalliativeMonitoringNotification,
    markPalliativeNotificationRead,
    setActivePanel,
    setScreeningNavigationFrom,
    setScreeningPreselectedPatientId,
    completePalliativeProgram,
    palliativeProgramCompletions,
    palliativeResumes,
    palliativeReferralLetters,
  } = useStore();

  const { toast } = useToast();

  // ── Selected patient data ──
  const selectedPatient = useMemo(
    () => palliativePatients.find((p) => p.id === selectedPalliativePatientId) || null,
    [palliativePatients, selectedPalliativePatientId]
  );

  const patientVitals = useMemo(
    () =>
      vitalSignRecords
        .filter((v) => v.palliativePatientId === selectedPalliativePatientId)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [vitalSignRecords, selectedPalliativePatientId]
  );

  const patientMedications = useMemo(
    () => palliativeMedications.filter((m) => m.palliativePatientId === selectedPalliativePatientId),
    [palliativeMedications, selectedPalliativePatientId]
  );

  const patientActiveMedications = useMemo(
    () => patientMedications.filter((m) => m.isActive),
    [patientMedications]
  );

  const patientACPs = useMemo(
    () => advanceCarePlans.filter((a) => a.palliativePatientId === selectedPalliativePatientId),
    [advanceCarePlans, selectedPalliativePatientId]
  );

  const patientScreenings = useMemo(
    () =>
      palliativeScreeningRecords
        .filter((s) => s.palliativePatientId === selectedPalliativePatientId)
        .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()),
    [palliativeScreeningRecords, selectedPalliativePatientId]
  );

  // ── Dashboard stats ──
  const dashboardStats = useMemo(() => {
    const total = palliativePatients.length;
    const active = palliativePatients.filter((p) => p.patientStatus !== 'program_selesai').length;
    const completed = palliativePatients.filter((p) => p.patientStatus === 'program_selesai').length;
    const merah = palliativePatients.filter((p) => p.patientStatus !== 'program_selesai' && p.riskLevel === 'merah').length;
    const kuning = palliativePatients.filter((p) => p.patientStatus !== 'program_selesai' && p.riskLevel === 'kuning').length;
    const hijau = palliativePatients.filter((p) => p.patientStatus !== 'program_selesai' && p.riskLevel === 'hijau').length;
    return { total, active, completed, merah, kuning, hijau };
  }, [palliativePatients]);

  // ── Filtered patients ──
  const filteredPatients = useMemo(() => {
    let result = palliativePatients;
    // Filter by program status
    if (patientListFilter === 'aktif') {
      result = result.filter((p) => p.patientStatus !== 'program_selesai');
    } else {
      result = result.filter((p) => p.patientStatus === 'program_selesai');
    }
    if (filterRisk !== 'all') {
      result = result.filter((p) => p.riskLevel === filterRisk);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.patientName && p.patientName.toLowerCase().includes(q)) ||
          (p.rmNumber && p.rmNumber.toLowerCase().includes(q)) ||
          (p.primaryDiagnosis && p.primaryDiagnosis.toLowerCase().includes(q))
      );
    }
    return result;
  }, [palliativePatients, filterRisk, searchQuery, patientListFilter]);

  // ── Alert detection for vitals ──
  const vitalAlerts = useMemo(() => {
    if (!selectedPatient) return [];
    const alerts: { label: string; value: string; severity: 'critical' | 'warning' }[] = [];
    const latest = patientVitals[0];
    if (!latest) return [];

    if (latest.oxygenSat !== undefined && latest.oxygenSat < 90) {
      alerts.push({ label: 'SpO2 Rendah', value: `${latest.oxygenSat}%`, severity: 'critical' });
    }
    if (latest.respiratoryRate !== undefined && latest.respiratoryRate > 24) {
      alerts.push({ label: 'Frekuensi Napas Tinggi', value: `${latest.respiratoryRate}/menit`, severity: 'critical' });
    }
    if (latest.temperature !== undefined && latest.temperature > 38) {
      alerts.push({ label: 'Demam', value: `${latest.temperature}°C`, severity: 'critical' });
    }
    if (latest.systolicBP !== undefined && latest.systolicBP < 90) {
      alerts.push({ label: 'Hipotensi', value: `${latest.systolicBP}/${latest.diastolicBP} mmHg`, severity: 'critical' });
    }
    if (latest.heartRate !== undefined && latest.heartRate > 110) {
      alerts.push({ label: 'Takikardia', value: `${latest.heartRate} bpm`, severity: 'warning' });
    }
    if (latest.heartRate !== undefined && latest.heartRate < 50) {
      alerts.push({ label: 'Bradikardia', value: `${latest.heartRate} bpm`, severity: 'warning' });
    }
    return alerts;
  }, [selectedPatient, patientVitals]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    const sorted = [...patientVitals].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    return sorted.map((v) => ({
      date: new Date(v.recordedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      systolic: v.systolicBP,
      diastolic: v.diastolicBP,
      heartRate: v.heartRate,
      respiratoryRate: v.respiratoryRate,
      temperature: v.temperature,
      oxygenSat: v.oxygenSat,
      weight: v.weight,
    }));
  }, [patientVitals]);

  // ── Medication adherence stats ──
  const medStats = useMemo(() => {
    const totalActive = patientActiveMedications.length;
    let totalAdherenceEntries = 0;
    let onTimeCount = 0;
    let sideEffectCount = 0;
    let endingSoonCount = 0;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const med of patientActiveMedications) {
      if (med.adherences) {
        for (const a of med.adherences) {
          totalAdherenceEntries++;
          if (a.takenOnTime) onTimeCount++;
          if (a.sideEffects) sideEffectCount++;
        }
      }
      if (med.endDate) {
        const endDate = new Date(med.endDate).getTime();
        if (endDate - now < sevenDays && endDate > now) {
          endingSoonCount++;
        }
      }
    }

    const adherenceRate =
      totalAdherenceEntries > 0 ? Math.round((onTimeCount / totalAdherenceEntries) * 100) : 0;

    return { totalActive, adherenceRate, sideEffectCount, endingSoonCount };
  }, [patientActiveMedications]);

  // ── ACP status ──
  const getAcpStatus = useCallback(
    (acp: AdvanceCarePlanInfo): { label: string; className: string } => {
      if (acp.patientSigned && acp.familySigned && acp.doctorSigned) {
        return { label: 'Lengkap', className: 'bg-green-100 text-green-800 border-green-300' };
      }
      if (!acp.patientSigned && !acp.familySigned && !acp.doctorSigned) {
        return { label: 'Belum ditandatangani', className: 'bg-amber-100 text-amber-800 border-amber-300' };
      }
      if (!acp.decisionMakerName) {
        return { label: 'Belum lengkap', className: 'bg-orange-100 text-orange-800 border-orange-300' };
      }
      return { label: 'Belum ditandatangani', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    },
    []
  );

  // ── Komunikasi: monitoring status badge helper ──
  const getMonitoringStatusBadge = useCallback((status?: PalliativeMonitoringStatus) => {
    switch (status) {
      case 'monitoring_aktif':
        return { label: 'Monitoring Aktif', className: 'bg-green-100 text-green-800 border-green-300' };
      case 'stabil':
        return { label: 'Stabil', className: 'bg-teal-100 text-teal-800 border-teal-300' };
      case 'membutuhkan_home_visit':
        return { label: 'Home Visit', className: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'membutuhkan_telekonsultasi':
        return { label: 'Telekonsultasi', className: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'membutuhkan_rujukan':
        return { label: 'Perlu Rujukan', className: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'terminal':
        return { label: 'Terminal', className: 'bg-red-100 text-red-800 border-red-300' };
      case 'meninggal_dunia':
        return { label: 'Meninggal Dunia', className: 'bg-gray-200 text-gray-800 border-gray-400' };
      case 'program_selesai':
        return { label: 'Program Selesai', className: 'bg-slate-100 text-slate-700 border-slate-300' };
      default:
        return { label: 'Belum ditentukan', className: 'bg-gray-100 text-gray-600 border-gray-300' };
    }
  }, []);

  const getMonitoringStatusLabel = useCallback((status: PalliativeMonitoringStatus): string => {
    switch (status) {
      case 'monitoring_aktif': return 'Monitoring Aktif';
      case 'stabil': return 'Stabil';
      case 'membutuhkan_home_visit': return 'Membutuhkan Home Visit';
      case 'membutuhkan_telekonsultasi': return 'Membutuhkan Telekonsultasi';
      case 'membutuhkan_rujukan': return 'Membutuhkan Rujukan';
      case 'terminal': return 'Terminal';
      case 'meninggal_dunia': return 'Meninggal Dunia';
      case 'program_selesai': return 'Program Selesai';
    }
  }, []);

  const getFormTypeLabel = useCallback((type: PalliativeMonitoringFormType): string => {
    switch (type) {
      case 'ttv': return 'Tanda-tanda Vital (TTV)';
      case 'pps': return 'PPS';
      case 'spict': return 'SPICT';
      case 'esas': return 'ESAS-r';
      case 'eortc': return 'EORTC QLQ-C15-PAL';
      case 'penilaian_nyeri': return 'Penilaian Nyeri';
      case 'penilaian_sesak': return 'Penilaian Sesak';
      case 'penilaian_nutrisi': return 'Penilaian Nutrisi';
      case 'acp': return 'Advance Care Planning (ACP)';
    }
  }, []);

  const getFormChatType = useCallback((type: PalliativeMonitoringFormType): string => {
    switch (type) {
      case 'ttv': return 'form_ttv';
      case 'pps':
      case 'spict':
      case 'esas':
      case 'eortc':
      case 'penilaian_nyeri':
      case 'penilaian_sesak':
      case 'penilaian_nutrisi':
        return 'form_screening';
      case 'acp':
        return 'instruction';
      default:
        return 'form_screening';
    }
  }, []);

  // ── Komunikasi: computed data ──
  const getLastPPS = useCallback((patientId: string): number | undefined => {
    const ppsScreenings = palliativeScreeningRecords
      .filter((s) => s.palliativePatientId === patientId && s.screeningType === 'pps')
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
    return ppsScreenings[0]?.score ?? undefined;
  }, [palliativeScreeningRecords]);

  const getUnreadCount = useCallback((patientId: string): number => {
    const roomId = `room-${patientId}`;
    return palliativeChatMessages.filter(
      (m) => m.roomId === roomId && m.senderRole !== 'doctor' && !m.readAt
    ).length;
  }, [palliativeChatMessages]);

  const getLastChatDate = useCallback((patientId: string): string | undefined => {
    const roomId = `room-${patientId}`;
    const msgs = palliativeChatMessages
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return msgs[0]?.createdAt;
  }, [palliativeChatMessages]);

  const filteredKomunikasiPatients = useMemo(() => {
    let result = palliativePatients.filter((p) => p.patientStatus !== 'program_selesai');
    if (komunikasiFilter !== 'all') {
      result = result.filter((p) => (p.monitoringStatus || 'monitoring_aktif') === komunikasiFilter);
    }
    if (komunikasiSearch.trim()) {
      const q = komunikasiSearch.toLowerCase();
      result = result.filter(
        (p) =>
          (p.patientName && p.patientName.toLowerCase().includes(q)) ||
          (p.rmNumber && p.rmNumber.toLowerCase().includes(q)) ||
          (p.primaryDiagnosis && p.primaryDiagnosis.toLowerCase().includes(q)) ||
          (p.monitoringStatus && getMonitoringStatusLabel(p.monitoringStatus).toLowerCase().includes(q))
      );
    }
    return result;
  }, [palliativePatients, komunikasiFilter, komunikasiSearch, getMonitoringStatusLabel]);

  const komunikasiStats = useMemo(() => {
    const active = palliativePatients.filter((p) => p.patientStatus !== 'program_selesai');
    const monitoringAktif = active.filter((p) => (!p.monitoringStatus || p.monitoringStatus === 'monitoring_aktif')).length;
    const stabil = active.filter((p) => p.monitoringStatus === 'stabil').length;
    const homeVisit = active.filter((p) => p.monitoringStatus === 'membutuhkan_home_visit').length;
    const telekonsultasi = active.filter((p) => p.monitoringStatus === 'membutuhkan_telekonsultasi').length;
    const terminal = active.filter((p) => p.monitoringStatus === 'terminal').length;
    const totalUnread = active.reduce((sum, p) => sum + getUnreadCount(p.id), 0);
    return { total: active.length, monitoringAktif, stabil, homeVisit, telekonsultasi, terminal, totalUnread };
  }, [palliativePatients, getUnreadCount]);

  // ── Komunikasi: handlers ──
  const handleSendForms = useCallback(() => {
    if (!sendFormPatientId || selectedFormTypes.length === 0) return;
    const patient = palliativePatients.find((p) => p.id === sendFormPatientId);
    if (!patient) return;

    const roomId = `room-${sendFormPatientId}`;
    const doctorName = currentUser?.name || 'Dokter';
    const doctorId = currentUser?.id || 'doctor';

    selectedFormTypes.forEach((formType) => {
      const chatMsg: PalliativeChatMessage = {
        id: genId('msg'),
        roomId,
        senderId: doctorId,
        senderName: doctorName,
        senderRole: 'doctor',
        type: getFormChatType(formType) as PalliativeChatMessage['type'],
        content: `Form ${getFormTypeLabel(formType)} telah dikirim kepada pasien. Silakan isi form berikut.`,
        status: 'sent',
        formType: formType === 'ttv' ? 'ttv' : formType === 'acp' ? 'keluhan' : 'screening',
        formData: {
          id: genId('form'),
          formType: formType === 'ttv' ? 'ttv' : formType === 'acp' ? 'keluhan' : 'screening',
          screeningType: ['pps', 'spict', 'esas', 'eortc', 'penilaian_nyeri', 'penilaian_sesak', 'penilaian_nutrisi'].includes(formType)
            ? (formType === 'pps' ? 'pps' : formType === 'spict' ? 'spict' : formType === 'esas' ? 'esas' : formType === 'eortc' ? 'eortc' : 'esas')
            : undefined,
          status: 'sent',
          progress: 0,
        },
        createdAt: new Date().toISOString(),
      };
      addPalliativeChatMessage(chatMsg);

      const auditEntry: PalliativeAuditEntry = {
        id: genId('audit'),
        patientId: sendFormPatientId,
        action: 'form_sent',
        performedBy: doctorName,
        performedByRole: 'doctor',
        details: `Form ${getFormTypeLabel(formType)} dikirim ke ${patient.patientName || 'Pasien'}`,
        createdAt: new Date().toISOString(),
      };
      addPalliativeAuditEntry(auditEntry);
    });

    const notification: PalliativeMonitoringNotification = {
      id: genId('notif'),
      patientId: sendFormPatientId,
      patientName: patient.patientName,
      type: 'status_change',
      title: 'Form Monitoring Dikirim',
      description: `${selectedFormTypes.length} form monitoring telah dikirim ke ${patient.patientName || 'Pasien'}`,
      severity: 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    addPalliativeMonitoringNotification(notification);

    toast({
      title: 'Form Terkirim',
      description: `${selectedFormTypes.length} form monitoring berhasil dikirim ke ${patient.patientName || 'Pasien'}.`,
    });

    setShowSendFormDialog(false);
    setSendFormPatientId(null);
    setSelectedFormTypes([]);
  }, [sendFormPatientId, selectedFormTypes, palliativePatients, currentUser, addPalliativeChatMessage, addPalliativeAuditEntry, addPalliativeMonitoringNotification, getFormChatType, getFormTypeLabel, toast]);

  const toggleFormType = useCallback((type: PalliativeMonitoringFormType) => {
    setSelectedFormTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleOpenSendForm = useCallback((patientId: string) => {
    setSendFormPatientId(patientId);
    setSelectedFormTypes([]);
    setShowSendFormDialog(true);
  }, []);

  const handleMonitoringStatusChange = useCallback((patientId: string, status: PalliativeMonitoringStatus) => {
    updatePalliativeMonitoringStatus(patientId, status);
    const patient = palliativePatients.find((p) => p.id === patientId);
    const auditEntry: PalliativeAuditEntry = {
      id: genId('audit'),
      patientId,
      action: 'clinical_action',
      performedBy: currentUser?.name || 'Dokter',
      performedByRole: 'doctor',
      details: `Status monitoring diubah ke "${getMonitoringStatusLabel(status)}" untuk ${patient?.patientName || 'Pasien'}`,
      createdAt: new Date().toISOString(),
    };
    addPalliativeAuditEntry(auditEntry);
    const notification: PalliativeMonitoringNotification = {
      id: genId('notif'),
      patientId,
      patientName: patient?.patientName,
      type: 'status_change',
      title: 'Status Monitoring Berubah',
      description: `Status monitoring ${patient?.patientName || 'Pasien'} diubah ke "${getMonitoringStatusLabel(status)}"`,
      severity: status === 'terminal' || status === 'meninggal_dunia' ? 'critical' : status === 'membutuhkan_home_visit' || status === 'membutuhkan_rujukan' ? 'warning' : 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    addPalliativeMonitoringNotification(notification);
    toast({
      title: 'Status Diperbarui',
      description: `Status monitoring ${patient?.patientName || 'Pasien'} diubah ke "${getMonitoringStatusLabel(status)}".`,
    });
  }, [updatePalliativeMonitoringStatus, palliativePatients, currentUser, addPalliativeAuditEntry, addPalliativeMonitoringNotification, getMonitoringStatusLabel, toast]);

  // ── Handlers ──

  const handleNavigateToScreening = useCallback(
    (patientId: string) => {
      setScreeningNavigationFrom('monitoring');
      setScreeningPreselectedPatientId(patientId);
      setActivePanel('palliative-screening');
    },
    [setScreeningNavigationFrom, setScreeningPreselectedPatientId, setActivePanel]
  );

  const handleSelectPatient = useCallback(
    (id: string) => {
      setSelectedPalliativePatientId(id);
    },
    [setSelectedPalliativePatientId]
  );

  const handleAddPatient = useCallback(() => {
    if (!newPatient.patientName) return;
    const bmiVal = calcBmi(newPatient.weight, newPatient.height);
    const patient: PalliativePatientInfo = {
      id: genId('pp'),
      patientId: genId('pat'),
      patientName: newPatient.patientName,
      rmNumber: newPatient.rmNumber,
      bpjsNumber: newPatient.bpjsNumber,
      nik: newPatient.nik,
      dateOfBirth: newPatient.dateOfBirth,
      gender: newPatient.gender,
      primaryDiagnosis: newPatient.primaryDiagnosis,
      secondaryDiagnosis: newPatient.secondaryDiagnosis,
      diseaseStage: newPatient.diseaseStage,
      attendingDoctorId: newPatient.attendingDoctorId,
      attendingDoctorName: newPatient.attendingDoctorName,
      familyContactName: newPatient.familyContactName,
      familyContactRelation: newPatient.familyContactRelation,
      familyContactPhone: newPatient.familyContactPhone,
      address: newPatient.address,
      careStatus: newPatient.careStatus || 'rawat_jalan',
      patientStatus: newPatient.patientStatus || 'aktif',
      riskLevel: newPatient.riskLevel || 'hijau',
      notes: newPatient.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addPalliativePatient(patient);
    setNewPatient({});
    setShowAddPatient(false);
  }, [newPatient, addPalliativePatient]);

  const handleUpdatePatient = useCallback(() => {
    if (!editingPatient) return;
    updatePalliativePatient(editingPatient.id, editingPatient);
    setEditingPatient(null);
  }, [editingPatient, updatePalliativePatient]);

  const handleDeletePatient = useCallback(
    (id: string) => {
      removePalliativePatient(id);
      if (selectedPalliativePatientId === id) {
        setSelectedPalliativePatientId(null);
      }
      setShowDeleteConfirm(null);
    },
    [removePalliativePatient, selectedPalliativePatientId, setSelectedPalliativePatientId]
  );

  const handleProgramComplete = useCallback(
    (id: string) => {
      const patient = palliativePatients.find((p) => p.id === id);
      if (!patient) return;

      const completionDate = programCompletionDate;
      const startDate = patient.createdAt;
      const endDate = completionDate;
      const durationMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));

      const doctorName = currentUser?.name || 'Dokter';

      // Complete the program in store
      completePalliativeProgram(id, {
        palliativePatientId: id,
        patientName: patient.patientName,
        rmNumber: patient.rmNumber,
        completionDate,
        reason: programCompletionReason,
        otherReason: programCompletionReason === 'lainnya' ? programCompletionOtherReason : undefined,
        closingNotes: programCompletionNotes || undefined,
        programStartDate: startDate,
        programEndDate: endDate,
        monitoringDurationDays: durationDays,
        performedBy: doctorName,
        performedByRole: 'doctor',
      });

      // Add audit entry
      const reasonLabel = programCompletionReason === 'sembuh_stabil' ? 'Sembuh/Stabil'
        : programCompletionReason === 'meninggal_dunia' ? 'Meninggal Dunia'
        : programCompletionReason === 'dirujuk' ? 'Dirujuk'
        : programCompletionReason === 'pindah_faskes' ? 'Pindah Fasilitas Kesehatan'
        : programCompletionReason === 'permintaan_pasien_keluarga' ? 'Permintaan Pasien/Keluarga'
        : programCompletionOtherReason || 'Lainnya';

      addPalliativeAuditEntry({
        id: genId('audit'),
        patientId: id,
        action: 'program_completed',
        performedBy: doctorName,
        performedByRole: 'doctor',
        details: `Program Monitoring Paliatif diselesaikan. Alasan: ${reasonLabel}. Durasi: ${durationDays} hari.${programCompletionNotes ? ` Catatan: ${programCompletionNotes}` : ''}`,
        createdAt: new Date().toISOString(),
      });

      // Add notification
      addPalliativeMonitoringNotification({
        id: genId('notif'),
        patientId: id,
        patientName: patient.patientName,
        type: 'status_change',
        title: 'Program Monitoring Selesai',
        description: `Program Monitoring Paliatif untuk ${patient.patientName || 'Pasien'} telah diselesaikan. Alasan: ${reasonLabel}`,
        severity: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Program Selesai',
        description: `Program Monitoring Paliatif untuk ${patient.patientName || 'Pasien'} telah berhasil diselesaikan. Seluruh data riwayat tetap tersimpan.`,
      });

      // Reset form state
      setShowProgramCompleteConfirm(null);
      setProgramCompletionDate(new Date().toISOString().split('T')[0]);
      setProgramCompletionReason('sembuh_stabil');
      setProgramCompletionOtherReason('');
      setProgramCompletionNotes('');

      // Deselect if selected
      if (selectedPalliativePatientId === id) {
        setSelectedPalliativePatientId(null);
        setShowPatientDetail(null);
      }
    },
    [palliativePatients, programCompletionDate, programCompletionReason, programCompletionOtherReason, programCompletionNotes, currentUser, completePalliativeProgram, addPalliativeAuditEntry, addPalliativeMonitoringNotification, selectedPalliativePatientId, setSelectedPalliativePatientId, toast]
  );

  const handleAddVital = useCallback(() => {
    if (!selectedPalliativePatientId) return;
    const bmiVal = calcBmi(newVital.weight, newVital.height);
    const record: VitalSignRecordInfo = {
      id: genId('vs'),
      palliativePatientId: selectedPalliativePatientId,
      recordedBy: newVital.recordedBy,
      systolicBP: newVital.systolicBP,
      diastolicBP: newVital.diastolicBP,
      heartRate: newVital.heartRate,
      respiratoryRate: newVital.respiratoryRate,
      temperature: newVital.temperature,
      oxygenSat: newVital.oxygenSat,
      weight: newVital.weight,
      height: newVital.height,
      bmi: bmiVal,
      notes: newVital.notes,
      recordedAt: newVital.recordedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    addVitalSignRecord(record);
    setNewVital({});
    setShowAddVital(false);
  }, [selectedPalliativePatientId, newVital, addVitalSignRecord]);

  const handleAddMedication = useCallback(() => {
    if (!selectedPalliativePatientId || !newMedication.medicineName) return;
    const med: PalliativeMedicationInfo = {
      id: genId('pm'),
      palliativePatientId: selectedPalliativePatientId,
      medicineName: newMedication.medicineName,
      dosage: newMedication.dosage || '',
      frequency: newMedication.frequency || '',
      route: newMedication.route,
      startDate: newMedication.startDate,
      endDate: newMedication.endDate,
      indication: newMedication.indication,
      isActive: true,
      notes: newMedication.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addPalliativeMedication(med);
    setNewMedication({});
    setShowAddMedication(false);
  }, [selectedPalliativePatientId, newMedication, addPalliativeMedication]);

  const handleAddACP = useCallback(() => {
    if (!selectedPalliativePatientId) return;
    const plan: AdvanceCarePlanInfo = {
      id: genId('acp'),
      palliativePatientId: selectedPalliativePatientId,
      decisionMakerName: newACP.decisionMakerName,
      decisionMakerRelation: newACP.decisionMakerRelation,
      decisionMakerPhone: newACP.decisionMakerPhone,
      preferredCareLocation: newACP.preferredCareLocation,
      careGoal: newACP.careGoal,
      resuscitationPref: newACP.resuscitationPref,
      ventilatorPref: newACP.ventilatorPref,
      icuPref: newACP.icuPref,
      artificialNutrition: newACP.artificialNutrition,
      dialysisPref: newACP.dialysisPref,
      organDonation: newACP.organDonation,
      patientHopes: newACP.patientHopes,
      patientWorries: newACP.patientWorries,
      lifeValues: newACP.lifeValues,
      endOfLifePrefs: newACP.endOfLifePrefs,
      patientSigned: newACP.patientSigned || false,
      familySigned: newACP.familySigned || false,
      doctorSigned: newACP.doctorSigned || false,
      signedAt:
        newACP.patientSigned && newACP.familySigned && newACP.doctorSigned
          ? new Date().toISOString()
          : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addAdvanceCarePlan(plan);
    setNewACP({});
    setAcpStep(0);
    setShowAddACP(false);
  }, [selectedPalliativePatientId, newACP, addAdvanceCarePlan]);

  const handleAddAdherence = useCallback(
    (medId: string) => {
      if (!selectedPalliativePatientId) return;
      const adherence: MedicationAdherenceInfo = {
        id: genId('adh'),
        medicationId: medId,
        palliativePatientId: selectedPalliativePatientId,
        date: newAdherence.date || new Date().toISOString().split('T')[0],
        takenOnTime: newAdherence.takenOnTime ?? true,
        missedDose: newAdherence.missedDose ?? false,
        sideEffects: newAdherence.sideEffects,
        complaints: newAdherence.complaints,
        createdAt: new Date().toISOString(),
      };
      const med = palliativeMedications.find((m) => m.id === medId);
      if (med) {
        const existing = med.adherences || [];
        updatePalliativeMedication(medId, { adherences: [...existing, adherence] });
      }
      setNewAdherence({});
      setShowAddAdherence(null);
    },
    [selectedPalliativePatientId, newAdherence, palliativeMedications, updatePalliativeMedication]
  );

  const generateLocalSummary = useCallback(() => {
    if (!selectedPatient) return '';
    const p = selectedPatient;
    const latestVital = patientVitals[0];
    const latestScreening = patientScreenings[0];

    let summary = `RINGKASAN KONDISI PASIEN\n`;
    summary += `Pasien ${p.patientName || '-'} (RM: ${p.rmNumber || '-'})\n`;
    summary += `Diagnosa Utama: ${p.primaryDiagnosis || '-'}\n`;
    summary += `Status Perawatan: ${getCareStatusBadge(p.careStatus).label}\n`;
    summary += `Tingkat Risiko: ${getRiskBadge(p.riskLevel).label}\n\n`;

    summary += `ANALISIS TTV TERAKHIR\n`;
    if (latestVital) {
      const dash = '-';
      summary += `TD: ${latestVital.systolicBP || dash}/${latestVital.diastolicBP || dash} mmHg\n`;
      summary += `Nadi: ${latestVital.heartRate || dash} bpm\n`;
      summary += `RR: ${latestVital.respiratoryRate || dash}/menit\n`;
      summary += `Suhu: ${latestVital.temperature || dash}°C\n`;
      summary += `SpO2: ${latestVital.oxygenSat || dash}%\n`;
      if (latestVital.oxygenSat && latestVital.oxygenSat < 90) {
        summary += `PERINGATAN: Saturasi O2 rendah!\n`;
      }
      if (latestVital.systolicBP && latestVital.systolicBP < 90) {
        summary += `PERINGATAN: Hipotensi terdeteksi!\n`;
      }
    } else {
      summary += `Belum ada data TTV\n`;
    }

    summary += `\nPERBANDINGAN SKRINING\n`;
    if (latestScreening) {
      summary += `Skrining terakhir: ${getToolTypeName(latestScreening.screeningType)} - Skor: ${latestScreening.score ?? '-'} (${latestScreening.scoreLabel || '-'})\n`;
      summary += `Interpretasi: ${latestScreening.interpretation || '-'}\n`;
    } else {
      summary += `Belum ada data skrining\n`;
    }

    summary += `\nIDENTIFIKASI PERBURUKAN\n`;
    const worseningSigns: string[] = [];
    if (patientVitals.length >= 2) {
      const curr = patientVitals[0];
      const prev = patientVitals[1];
      if (curr.weight && prev.weight && prev.weight - curr.weight > 1) {
        worseningSigns.push(`Penurunan berat badan: ${prev.weight} → ${curr.weight} kg`);
      }
      if (curr.oxygenSat && prev.oxygenSat && curr.oxygenSat < prev.oxygenSat - 2) {
        worseningSigns.push(`Penurunan SpO2: ${prev.oxygenSat}% → ${curr.oxygenSat}%`);
      }
    }
    if (p.riskLevel === 'merah') worseningSigns.push('Risiko tinggi (merah)');
    if (worseningSigns.length > 0) {
      summary += worseningSigns.map((s) => `- ${s}`).join('\n') + '\n';
    } else {
      summary += `Tidak ada tanda perburukan signifikan saat ini.\n`;
    }

    summary += `\nFAKTOR RISIKO UTAMA\n`;
    const riskFactors: string[] = [];
    if (p.primaryDiagnosis) riskFactors.push(`Diagnosa: ${p.primaryDiagnosis}`);
    if (p.diseaseStage) riskFactors.push(`Stadium: ${p.diseaseStage}`);
    if (latestVital?.oxygenSat && latestVital.oxygenSat < 92) riskFactors.push('Hipoksemia');
    if (latestVital?.weight && latestVital.height) {
      const bmi = calcBmi(latestVital.weight, latestVital.height);
      if (bmi && bmi < 18.5) riskFactors.push(`BMI rendah (${bmi})`);
    }
    if (riskFactors.length > 0) {
      summary += riskFactors.map((s) => `- ${s}`).join('\n') + '\n';
    } else {
      summary += `Tidak ada faktor risiko utama teridentifikasi.\n`;
    }

    summary += `\nREKOMENDASI TINDAK LANJUT\n`;
    summary += `- Evaluasi tanda vital secara berkala\n`;
    if (p.riskLevel === 'merah') summary += `- Konsultasi segera dengan dokter paliatif\n`;
    if (latestVital?.oxygenSat && latestVital.oxygenSat < 90) summary += `- Pemberian oksigen tambahan\n`;
    summary += `- Manajemen gejala sesuai skrining terbaru\n`;
    if (patientACPs.length === 0) summary += `- Pertimbangkan penyusunan Advance Care Planning\n`;

    summary += `\nSOAP NOTE OTOMATIS\n`;
    const nd = '-'; summary += `S: Pasien ${p.patientName || nd} dengan diagnosa ${p.primaryDiagnosis || nd}. `;
    if (latestVital?.notes) summary += latestVital.notes + '. ';
    const tdVal = latestVital?.systolicBP || nd; const dbpVal = latestVital?.diastolicBP || nd; const hrVal = latestVital?.heartRate || nd; const rrVal = latestVital?.respiratoryRate || nd; const tempVal = latestVital?.temperature || nd; const spo2Val = latestVital?.oxygenSat || nd; summary += '\nO: TD ' + tdVal + '/' + dbpVal + ', Nadi ' + hrVal + ', RR ' + rrVal + ', Suhu ' + tempVal + '°C, SpO2 ' + spo2Val + '%.';
    summary += `\nA: Kondisi ${p.riskLevel === 'merah' ? 'kritis, memerlukan perhatian segera' : p.riskLevel === 'kuning' ? 'perlu pemantauan ketat' : 'stabil, lanjutkan monitoring'}.`;
    summary += `\nP: Lanjutkan monitoring tanda vital, manajemen gejala, dan evaluasi berkala.`;

    summary += `\n\nPERINGATAN DINI\n`;
    if (vitalAlerts.length > 0) {
      summary += vitalAlerts
        .map((a) => `${a.severity === 'critical' ? '[KRITIS]' : '[PERHATIAN]'} ${a.label}: ${a.value}`)
        .join('\n');
    } else {
      summary += `Tidak ada peringatan dini saat ini.\n`;
    }

    return summary;
  }, [selectedPatient, patientVitals, patientScreenings, patientACPs, vitalAlerts]);

  const handleAiAnalysis = useCallback(async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/palliative-ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.patientName,
          primaryDiagnosis: selectedPatient.primaryDiagnosis,
          vitalSigns: patientVitals.slice(0, 10),
          medications: patientActiveMedications,
          screenings: patientScreenings,
          acp: patientACPs,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPalliativeAiSummary(data.summary || data.analysis || 'Tidak ada hasil analisis.');
      } else {
        const fallback = generateLocalSummary();
        setPalliativeAiSummary(fallback);
      }
    } catch {
      const fallback = generateLocalSummary();
      setPalliativeAiSummary(fallback);
    }
    setAiLoading(false);
  }, [selectedPatient, patientVitals, patientActiveMedications, patientScreenings, patientACPs, setPalliativeAiSummary, generateLocalSummary]);

  // ── Render: Patient Selector ──
  const renderPatientSelector = () => (
    <div className="mb-4">
      <Label className="text-sm font-medium mb-2 block">Pilih Pasien Paliatif</Label>
      <Select
        value={selectedPalliativePatientId || ''}
        onValueChange={(v) => setSelectedPalliativePatientId(v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pilih pasien..." />
        </SelectTrigger>
        <SelectContent>
          {palliativePatients.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    p.riskLevel === 'merah'
                      ? 'bg-red-500'
                      : p.riskLevel === 'kuning'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  )}
                />
                {p.patientName || '-'} ({p.rmNumber || '-'})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // ── Render: Dashboard ──
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Pasien</span>
          </div>
          <p className="text-2xl font-bold">{dashboardStats.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Aktif</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{dashboardStats.active}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-slate-600" />
            <span className="text-xs text-muted-foreground">Program Selesai</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">{dashboardStats.completed}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Risiko Merah</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{dashboardStats.merah}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Risiko Kuning</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{dashboardStats.kuning}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Alert Aktif</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{palliativeClinicalAlerts.filter(a => !a.isRead).length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Chat Aktif</span>
          </div>
          <p className="text-2xl font-bold text-primary">{new Set(palliativeChatMessages.map(m => m.roomId)).size}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-teal-600" />
            <span className="text-xs text-muted-foreground">Resume AI</span>
          </div>
          <p className="text-2xl font-bold text-teal-600">{palliativeResumes.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-muted-foreground">Surat Rujukan</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{palliativeReferralLetters.length}</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pasien, RM, diagnosa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRisk} onValueChange={setFilterRisk}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Risiko</SelectItem>
              <SelectItem value="merah">Risiko Merah</SelectItem>
              <SelectItem value="kuning">Risiko Kuning</SelectItem>
              <SelectItem value="hijau">Risiko Hijau</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Patient Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              patientListFilter === 'aktif'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setPatientListFilter('aktif')}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1.5" />
            Pasien Aktif ({dashboardStats.active})
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              patientListFilter === 'program_selesai'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setPatientListFilter('program_selesai')}
          >
            <Archive className="w-3.5 h-3.5 inline mr-1.5" />
            Program Selesai ({dashboardStats.completed})
          </button>
        </div>
      </div>

      {/* Patient Cards */}
      <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto custom-scrollbar">
        {filteredPatients.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Tidak ada pasien ditemukan.
          </Card>
        ) : (
          filteredPatients.map((patient) => {
            const riskBadge = getRiskBadge(patient.riskLevel);
            const careBadge = getCareStatusBadge(patient.careStatus);
            const isCompleted = patient.patientStatus === 'program_selesai';
            const completionData = palliativeProgramCompletions.find(c => c.palliativePatientId === patient.id);
            const pVitals = vitalSignRecords.filter(
              (v) => v.palliativePatientId === patient.id
            );
            const latestVital = pVitals.sort(
              (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
            )[0];
            const pScreenings = palliativeScreeningRecords.filter(
              (s) => s.palliativePatientId === patient.id
            );
            const latestScreening = pScreenings.sort(
              (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
            )[0];
            const pAcp = advanceCarePlans.find(
              (a) => a.palliativePatientId === patient.id && a.isActive
            );
            const acpStatus = pAcp ? getAcpStatus(pAcp) : null;

            // Risk indicators
            const riskIndicators: string[] = [];
            if (latestVital?.oxygenSat && latestVital.oxygenSat < 90)
              riskIndicators.push('SpO2 rendah');
            if (latestVital?.respiratoryRate && latestVital.respiratoryRate > 24)
              riskIndicators.push('Sesak berat');
            if (latestVital?.systolicBP && latestVital.systolicBP < 90)
              riskIndicators.push('Hipotensi');
            if (latestScreening?.ewsLevel === 'merah')
              riskIndicators.push('Skrining kritis');
            if (pVitals.length >= 2) {
              const sorted = [...pVitals].sort(
                (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
              );
              if (sorted[0].weight && sorted[1].weight && sorted[1].weight - sorted[0].weight > 1)
                riskIndicators.push('Penurunan BB');
            }

            return (
              <Card
                key={patient.id}
                className={cn(
                  'p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4',
                  isCompleted
                    ? 'border-l-slate-400 opacity-80'
                    : patient.riskLevel === 'merah'
                      ? 'border-l-red-500'
                      : patient.riskLevel === 'kuning'
                        ? 'border-l-amber-500'
                        : 'border-l-green-500'
                )}
                onClick={() => {
                  handleSelectPatient(patient.id);
                  setActiveTab('patients');
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn('font-semibold truncate', isCompleted ? 'text-muted-foreground line-through decoration-slate-400' : 'text-foreground')}>
                        {patient.patientName || '-'}
                      </h3>
                      {isCompleted ? (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-300 border">
                          <CircleOff className="w-3 h-3 mr-1" />
                          Program Selesai
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className={riskBadge.className}>
                            {riskBadge.label}
                          </Badge>
                          <Badge className={careBadge.className}>{careBadge.label}</Badge>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      RM: {patient.rmNumber || '-'} | {patient.primaryDiagnosis || '-'}
                      {patient.diseaseStage ? ` (${patient.diseaseStage})` : ''}
                    </p>
                    {isCompleted && completionData ? (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="w-3 h-3" />
                          Tgl Selesai: {formatDate(completionData.completionDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Durasi: {completionData.monitoringDurationDays} hari
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-3 h-3" />
                          Alasan: {completionData.reason === 'sembuh_stabil' ? 'Sembuh/Stabil'
                            : completionData.reason === 'meninggal_dunia' ? 'Meninggal Dunia'
                            : completionData.reason === 'dirujuk' ? 'Dirujuk'
                            : completionData.reason === 'pindah_faskes' ? 'Pindah Faskes'
                            : completionData.reason === 'permintaan_pasien_keluarga' ? 'Permintaan Pasien/Keluarga'
                            : completionData.otherReason || 'Lainnya'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          TTV terakhir:{' '}
                          {latestVital ? formatDateTime(latestVital.recordedAt) : 'Belum ada'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="w-3 h-3" />
                          Skrining:{' '}
                          {latestScreening
                            ? `${getToolTypeName(latestScreening.screeningType)} (${formatDate(latestScreening.performedAt)})`
                            : 'Belum ada'}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          ACP:{' '}
                          {acpStatus ? (
                            <Badge variant="outline" className={cn('text-[10px] px-1', acpStatus.className)}>
                              {acpStatus.label}
                            </Badge>
                          ) : (
                            'Belum ada'
                          )}
                        </span>
                      </div>
                    )}
                    {!isCompleted && riskIndicators.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        {riskIndicators.map((ind, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] bg-red-50 text-red-700 border-red-200"
                          >
                            {ind}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {isCompleted ? (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('patients'); }}>
                        <Eye className="w-3 h-3 mr-1" /> Profil
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('ttv'); }}>
                        <Thermometer className="w-3 h-3 mr-1" /> Riwayat TTV
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('screening'); }}>
                        <ClipboardCheck className="w-3 h-3 mr-1" /> Riwayat Skrining
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('patients'); }}>
                        <Eye className="w-3 h-3 mr-1" /> Profil
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('ttv'); }}>
                        <Thermometer className="w-3 h-3 mr-1" /> TTV
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('screening'); }}>
                        <ClipboardCheck className="w-3 h-3 mr-1" /> Skrining
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('medication'); }}>
                        <Pill className="w-3 h-3 mr-1" /> Obat
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('acp'); }}>
                        <Shield className="w-3 h-3 mr-1" /> ACP
                      </Button>
                      <Button variant="default" size="sm" className="h-7 text-[11px]" onClick={() => { handleSelectPatient(patient.id); setActiveTab('chat'); }}>
                        <MessageCircle className="w-3 h-3 mr-1" /> Chat
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => { handleSelectPatient(patient.id); setActiveTab('dokumen'); }}>
                        <FileText className="w-3 h-3 mr-1" /> Resume & Rujukan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700"
                        onClick={() => {
                          setShowProgramCompleteConfirm(patient.id);
                          setProgramCompletionDate(new Date().toISOString().split('T')[0]);
                          setProgramCompletionReason('sembuh_stabil');
                          setProgramCompletionOtherReason('');
                          setProgramCompletionNotes('');
                        }}
                      >
                        <CircleOff className="w-3 h-3 mr-1" />
                        Program Selesai
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  // ── Render: Patients Tab ──
  const renderPatients = () => {
    const detailPatient = showPatientDetail
      ? palliativePatients.find((p) => p.id === showPatientDetail) || selectedPatient
      : selectedPatient;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manajemen Pasien Paliatif</h2>
          <Button
            onClick={() => {
              setNewPatient({});
              setShowAddPatient(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pasien
          </Button>
        </div>

        {detailPatient ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPatientDetail(null);
                setSelectedPalliativePatientId(null);
              }}
            >
              Kembali ke Daftar
            </Button>

            {/* Patient Detail Card */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold">{detailPatient.patientName || '-'}</h3>
                    <Badge variant="outline" className={getRiskBadge(detailPatient.riskLevel).className}>
                      {getRiskBadge(detailPatient.riskLevel).label}
                    </Badge>
                    <Badge className={getCareStatusBadge(detailPatient.careStatus).className}>
                      {getCareStatusBadge(detailPatient.careStatus).label}
                    </Badge>
                    <Badge variant="secondary">{getPatientStatusLabel(detailPatient.patientStatus)}</Badge>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">No. Rekam Medis:</span>{' '}
                      {detailPatient.rmNumber || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">No. BPJS:</span>{' '}
                      {detailPatient.bpjsNumber || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">NIK:</span>{' '}
                      {detailPatient.nik || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tgl Lahir:</span>{' '}
                      {detailPatient.dateOfBirth ? formatDate(detailPatient.dateOfBirth) : '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Jenis Kelamin:</span>{' '}
                      {detailPatient.gender || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Diagnosa Utama:</span>{' '}
                      {detailPatient.primaryDiagnosis || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Diagnosa Penyerta:</span>{' '}
                      {detailPatient.secondaryDiagnosis || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stadium:</span>{' '}
                      {detailPatient.diseaseStage || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dokter PJ:</span>{' '}
                      {detailPatient.attendingDoctorName || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Keluarga:</span>{' '}
                      {detailPatient.familyContactName || '-'} (
                      {detailPatient.familyContactRelation || '-'}) -{' '}
                      {detailPatient.familyContactPhone || '-'}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Alamat:</span>{' '}
                      {detailPatient.address || '-'}
                    </div>
                    {detailPatient.notes && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Catatan:</span>{' '}
                        {detailPatient.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 gap-1"
                    onClick={() => { handleSelectPatient(detailPatient.id); setActiveTab('dokumen'); }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Resume AI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground gap-1"
                    onClick={() => { handleSelectPatient(detailPatient.id); setActiveTab('dokumen'); }}
                  >
                    <Building2 className="w-4 h-4" />
                    Surat Rujukan AI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground gap-1"
                    onClick={() => { handleSelectPatient(detailPatient.id); setActiveTab('dokumen'); }}
                  >
                    <FileText className="w-4 h-4" />
                    Lihat Dokumen
                  </Button>
                  <Separator className="hidden sm:block" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigateToScreening(detailPatient.id)}
                  >
                    <ClipboardCheck className="w-4 h-4 mr-1" />
                    Skrining
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPatient(detailPatient)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(detailPatient.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Hapus
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700"
                    onClick={() => {
                      setShowProgramCompleteConfirm(detailPatient.id);
                      setProgramCompletionDate(new Date().toISOString().split('T')[0]);
                      setProgramCompletionReason('sembuh_stabil');
                      setProgramCompletionOtherReason('');
                      setProgramCompletionNotes('');
                    }}
                  >
                    <CircleOff className="w-4 h-4 mr-1" />
                    Program Selesai
                  </Button>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Jumlah TTV</p>
                <p className="text-xl font-bold">
                  {vitalSignRecords.filter((v) => v.palliativePatientId === detailPatient.id).length}
                </p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Obat Aktif</p>
                <p className="text-xl font-bold">
                  {
                    palliativeMedications.filter(
                      (m) => m.palliativePatientId === detailPatient.id && m.isActive
                    ).length
                  }
                </p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Skrining</p>
                <p className="text-xl font-bold">
                  {
                    palliativeScreeningRecords.filter(
                      (s) => s.palliativePatientId === detailPatient.id
                    ).length
                  }
                </p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">ACP</p>
                <p className="text-xl font-bold">
                  {
                    advanceCarePlans.filter((a) => a.palliativePatientId === detailPatient.id).length
                  }
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs text-muted-foreground">Resume Medis</p>
                </div>
                <p className="text-xl font-bold text-primary">
                  {palliativeResumes.filter((r) => r.palliativePatientId === detailPatient.id).length}
                </p>
                {(() => {
                  const pr = palliativeResumes
                    .filter((r) => r.palliativePatientId === detailPatient.id)
                    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
                  return pr.length > 0 ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Terakhir: {new Date(pr[0].generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {pr[0].isSigned ? ' (Signed)' : ''}
                    </p>
                  ) : null;
                })()}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <p className="text-xs text-muted-foreground">Surat Rujukan</p>
                </div>
                <p className="text-xl font-bold text-teal-600">
                  {palliativeReferralLetters.filter((l) => l.palliativePatientId === detailPatient.id).length}
                </p>
                {(() => {
                  const lr = palliativeReferralLetters
                    .filter((l) => l.palliativePatientId === detailPatient.id)
                    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
                  if (lr.length === 0) return null;
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    belum_dirujuk: { label: 'Belum Dirujuk', cls: 'text-slate-500' },
                    menunggu: { label: 'Menunggu', cls: 'text-amber-600' },
                    sudah_dirujuk: { label: 'Sudah Dirujuk', cls: 'text-blue-600' },
                    selesai: { label: 'Selesai', cls: 'text-green-600' },
                  };
                  const st = statusMap[lr[0].referralStatus] || statusMap.belum_dirujuk;
                  return (
                    <p className={`text-[10px] mt-1 ${st.cls}`}>
                      {st.label} - {new Date(lr[0].generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  );
                })()}
              </Card>
            </div>
          </div>
        ) : (
          <>
            {/* Patient Table */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari pasien..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter Risiko" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="merah">Merah</SelectItem>
                    <SelectItem value="kuning">Kuning</SelectItem>
                    <SelectItem value="hijau">Hijau</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
                <button
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    patientListFilter === 'aktif'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setPatientListFilter('aktif')}
                >
                  <Activity className="w-3.5 h-3.5 inline mr-1.5" />
                  Aktif ({dashboardStats.active})
                </button>
                <button
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    patientListFilter === 'program_selesai'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setPatientListFilter('program_selesai')}
                >
                  <Archive className="w-3.5 h-3.5 inline mr-1.5" />
                  Program Selesai ({dashboardStats.completed})
                </button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell">RM</TableHead>
                    <TableHead className="hidden md:table-cell">Diagnosa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risiko</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Tidak ada pasien ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((p) => {
                      const riskBadge = getRiskBadge(p.riskLevel);
                      const careBadge = getCareStatusBadge(p.careStatus);
                      const isCompleted = p.patientStatus === 'program_selesai';
                      return (
                        <TableRow key={p.id} className={isCompleted ? 'opacity-70' : ''}>
                          <TableCell className={cn('font-medium', isCompleted && 'line-through decoration-slate-400')}>
                            {p.patientName || '-'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{p.rmNumber || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                            {p.primaryDiagnosis || '-'}
                          </TableCell>
                          <TableCell>
                            {isCompleted ? (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-300 border">Program Selesai</Badge>
                            ) : (
                              <Badge className={careBadge.className}>{careBadge.label}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={riskBadge.className}>
                              {riskBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isCompleted && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => handleNavigateToScreening(p.id)}
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                                  Skrining
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleSelectPatient(p.id);
                                  setShowPatientDetail(p.id);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {!isCompleted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPatient(p)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(p.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                              {!isCompleted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                                  onClick={() => {
                                    setShowProgramCompleteConfirm(p.id);
                                    setProgramCompletionDate(new Date().toISOString().split('T')[0]);
                                    setProgramCompletionReason('sembuh_stabil');
                                    setProgramCompletionOtherReason('');
                                    setProgramCompletionNotes('');
                                  }}
                                  title="Program Selesai"
                                >
                                  <CircleOff className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Render: TTV Serial ──
  const renderTTV = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Monitoring Tanda Vital Serial</h2>
        <Button onClick={() => setShowAddVital(true)} disabled={!selectedPatient}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah TTV
        </Button>
      </div>

      {!selectedPatient ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Pilih pasien terlebih dahulu untuk melihat data tanda vital.</p>
        </Card>
      ) : (
        <>
          {/* Alerts */}
          {vitalAlerts.length > 0 && (
            <div className="space-y-2">
              {vitalAlerts.map((alert, i) => (
                <Alert
                  key={i}
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>{alert.label}</AlertTitle>
                  <AlertDescription>
                    Nilai: {alert.value} —{' '}
                    {alert.severity === 'critical'
                      ? 'Memerlukan perhatian segera!'
                      : 'Perlu dipantau.'}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Vital Signs Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Riwayat Tanda Vital</CardTitle>
              <CardDescription>
                Pasien: {selectedPatient.patientName} ({selectedPatient.rmNumber || '-'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>TD</TableHead>
                      <TableHead>Nadi</TableHead>
                      <TableHead>RR</TableHead>
                      <TableHead>Suhu</TableHead>
                      <TableHead>SpO2</TableHead>
                      <TableHead>BB</TableHead>
                      <TableHead>BMI</TableHead>
                      <TableHead>Oleh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientVitals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                          Belum ada data TTV
                        </TableCell>
                      </TableRow>
                    ) : (
                      patientVitals.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs">
                            {formatDateTime(v.recordedAt)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                v.systolicBP && v.systolicBP < 90
                                  ? 'text-red-600 font-bold'
                                  : ''
                              )}
                            >
                              {v.systolicBP ?? '-'}/{v.diastolicBP ?? '-'}
                            </span>
                          </TableCell>
                          <TableCell>{v.heartRate ?? '-'}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                v.respiratoryRate && v.respiratoryRate > 24
                                  ? 'text-red-600 font-bold'
                                  : ''
                              )}
                            >
                              {v.respiratoryRate ?? '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                v.temperature && v.temperature > 38
                                  ? 'text-red-600 font-bold'
                                  : ''
                              )}
                            >
                              {v.temperature ?? '-'}°C
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                v.oxygenSat && v.oxygenSat < 90
                                  ? 'text-red-600 font-bold'
                                  : v.oxygenSat && v.oxygenSat < 92
                                    ? 'text-amber-600 font-semibold'
                                    : ''
                              )}
                            >
                              {v.oxygenSat ?? '-'}%
                            </span>
                          </TableCell>
                          <TableCell>{v.weight ?? '-'}</TableCell>
                          <TableCell>{v.bmi ?? '-'}</TableCell>
                          <TableCell className="text-xs">
                            {getRecordedByLabel(v.recordedBy)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm">Periode:</Label>
            {(['harian', 'mingguan', 'bulanan'] as const).map((p) => (
              <Button
                key={p}
                variant={vitalPeriod === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVitalPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>

          {/* Charts */}
          {chartData.length < 2 ? (
            <Card className="p-6 text-center text-muted-foreground">
              Minimal 2 data TTV diperlukan untuk menampilkan grafik.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Blood Pressure Chart */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-red-500" />
                  Tekanan Darah
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      stroke="#ef4444"
                      name="Sistolik"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#f97316"
                      name="Diastolik"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Heart Rate + Respiratory Rate Chart */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-500" />
                  Nadi & Frekuensi Napas
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#14b8a6"
                      name="Nadi (bpm)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="respiratoryRate"
                      stroke="#8b5cf6"
                      name="RR (/menit)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Temperature + O2 Saturation Chart */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-500" />
                  Suhu & Saturasi O2
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#f59e0b"
                      name="Suhu (°C)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="oxygenSat"
                      stroke="#3b82f6"
                      name="SpO2 (%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Weight Chart */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  Berat Badan
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#22c55e"
                      name="Berat (kg)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Render: Screening ──
  const renderScreening = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Riwayat Skrining Paliatif</h2>
        <Button
          onClick={() => {
            if (selectedPalliativePatientId) {
              handleNavigateToScreening(selectedPalliativePatientId);
            }
          }}
          disabled={!selectedPatient}
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Lakukan Skrining
        </Button>
      </div>

      {!selectedPatient ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Pilih pasien terlebih dahulu untuk melihat riwayat skrining.</p>
        </Card>
      ) : patientScreenings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada riwayat skrining untuk pasien ini.</p>
          <Button
            className="mt-4"
            onClick={() => {
              if (selectedPalliativePatientId) {
                handleNavigateToScreening(selectedPalliativePatientId);
              }
            }}
          >
            Mulai Skrining
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Skrining: {selectedPatient.patientName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe Skrining</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead>Interpretasi</TableHead>
                  <TableHead>EWS</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tren</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientScreenings.map((s, idx) => {
                  const ewsBadge = getEwsBadge(s.ewsLevel);
                  // Find previous screening of same type for trend
                  const prevSameType = patientScreenings.find(
                    (ps, pi) => pi > idx && ps.screeningType === s.screeningType
                  );
                  let trendIcon = null;
                  if (prevSameType && s.score !== undefined && prevSameType.score !== undefined) {
                    if (s.score > prevSameType.score) {
                      trendIcon = <TrendingUp className="w-4 h-4 text-red-500" />;
                    } else if (s.score < prevSameType.score) {
                      trendIcon = <TrendingDown className="w-4 h-4 text-green-500" />;
                    } else {
                      trendIcon = <span className="text-xs text-muted-foreground">Stabil</span>;
                    }
                  }

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {getToolTypeName(s.screeningType)}
                      </TableCell>
                      <TableCell>
                        {s.score ?? '-'}{' '}
                        <span className="text-xs text-muted-foreground">
                          {s.scoreLabel || ''}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm">
                        {s.interpretation || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ewsBadge.className}>
                          {ewsBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(s.performedAt)}</TableCell>
                      <TableCell>{trendIcon}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ── Render: Medication ──
  const renderMedication = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Monitoring Obat Paliatif</h2>
        <Button onClick={() => setShowAddMedication(true)} disabled={!selectedPatient}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Obat
        </Button>
      </div>

      {!selectedPatient ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Pilih pasien terlebih dahulu untuk melihat data obat.</p>
        </Card>
      ) : (
        <>
          {/* Medication Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Obat Aktif</p>
              <p className="text-2xl font-bold">{medStats.totalActive}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Kepatuhan</p>
              <p className="text-2xl font-bold text-green-600">{medStats.adherenceRate}%</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Efek Samping</p>
              <p className="text-2xl font-bold text-amber-600">{medStats.sideEffectCount}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Hampir Habis</p>
              <p className="text-2xl font-bold text-red-600">{medStats.endingSoonCount}</p>
            </Card>
          </div>

          {/* Adherence Rate Progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tingkat Kepatuhan Obat</span>
              <span className="text-sm font-bold">{medStats.adherenceRate}%</span>
            </div>
            <Progress value={medStats.adherenceRate} className="h-2" />
          </Card>

          {/* Medication Cards */}
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {patientActiveMedications.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                Belum ada obat aktif untuk pasien ini.
              </Card>
            ) : (
              patientActiveMedications.map((med) => {
                const isEndingSoon =
                  med.endDate &&
                  new Date(med.endDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
                  new Date(med.endDate).getTime() > Date.now();

                return (
                  <Card
                    key={med.id}
                    className={cn(
                      'p-4',
                      isEndingSoon && 'border-amber-300 bg-amber-50/50'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{med.medicineName}</h4>
                          {isEndingSoon && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Hampir Habis
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {med.dosage} | {med.frequency} | {getRouteLabel(med.route)}
                        </p>
                        {med.indication && (
                          <p className="text-sm text-muted-foreground">
                            Indikasi: {med.indication}
                          </p>
                        )}
                        {med.startDate && (
                          <p className="text-xs text-muted-foreground">
                            Mulai: {formatDate(med.startDate)}
                            {med.endDate && ` - Selesai: ${formatDate(med.endDate)}`}
                          </p>
                        )}
                        {med.notes && (
                          <p className="text-xs text-muted-foreground italic">{med.notes}</p>
                        )}

                        {/* Adherence Log */}
                        {med.adherences && med.adherences.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Riwayat Kepatuhan:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {med.adherences.slice(-7).map((a) => (
                                <Badge
                                  key={a.id}
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    a.takenOnTime
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  )}
                                >
                                  {a.takenOnTime ? (
                                    <CheckCircle2 className="w-3 h-3 mr-0.5" />
                                  ) : (
                                    <XCircle className="w-3 h-3 mr-0.5" />
                                  )}
                                  {a.date}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddAdherence(med.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Catat
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updatePalliativeMedication(med.id, { isActive: false })
                          }
                        >
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Inactive Medications */}
          {patientMedications.filter((m) => !m.isActive).length > 0 && (
            <details className="group">
              <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                Obat Tidak Aktif ({patientMedications.filter((m) => !m.isActive).length})
              </summary>
              <div className="mt-2 space-y-2">
                {patientMedications
                  .filter((m) => !m.isActive)
                  .map((med) => (
                    <Card key={med.id} className="p-3 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium line-through">{med.medicineName}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {med.dosage} | {med.frequency}
                          </span>
                        </div>
                        <Badge variant="secondary">Tidak Aktif</Badge>
                      </div>
                    </Card>
                  ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Medication Monitoring Dashboard */}
      {selectedPatient && (
        <MedicationMonitoringDashboard patientId={selectedPatient.id} />
      )}
    </div>
  );

  // ── Render: ACP ──
  const renderACP = () => {
    const acpDetail = showACPDetail
      ? patientACPs.find((a) => a.id === showACPDetail)
      : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Advance Care Planning</h2>
          <Button onClick={() => { setNewACP({}); setAcpStep(0); setShowAddACP(true); }} disabled={!selectedPatient}>
            <Plus className="w-4 h-4 mr-2" />
            Buat ACP Baru
          </Button>
        </div>

        {!selectedPatient ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Pilih pasien terlebih dahulu untuk melihat Advance Care Planning.</p>
          </Card>
        ) : patientACPs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada dokumen ACP untuk pasien ini.</p>
            <Button
              className="mt-4"
              onClick={() => { setNewACP({}); setAcpStep(0); setShowAddACP(true); }}
            >
              Buat ACP Pertama
            </Button>
          </Card>
        ) : acpDetail ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowACPDetail(null)}>
              Kembali ke Daftar ACP
            </Button>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Dokumen Advance Care Planning</h3>
                </div>
                <Badge variant="outline" className={getAcpStatus(acpDetail).className}>
                  {getAcpStatus(acpDetail).label}
                </Badge>
              </div>
              <Separator className="mb-4" />

              {/* Decision Maker */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Pengambil Keputusan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nama:</span>{' '}
                    {acpDetail.decisionMakerName || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hubungan:</span>{' '}
                    {acpDetail.decisionMakerRelation || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kontak:</span>{' '}
                    {acpDetail.decisionMakerPhone || '-'}
                  </div>
                </div>
              </div>

              {/* Care Preferences */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Preferensi Perawatan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Tempat Perawatan</span>
                    <span className="font-medium">
                      {acpDetail.preferredCareLocation === 'rumah'
                        ? 'Rumah'
                        : acpDetail.preferredCareLocation === 'rumah_sakit'
                          ? 'Rumah Sakit'
                          : acpDetail.preferredCareLocation === 'hospice'
                            ? 'Hospice'
                            : acpDetail.preferredCareLocation === 'fasilitas_khusus'
                              ? 'Fasilitas Khusus'
                              : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Tujuan Perawatan</span>
                    <span className="font-medium">
                      {acpDetail.careGoal === 'memperpanjang_hidup'
                        ? 'Memperpanjang Hidup'
                        : acpDetail.careGoal === 'mengurangi_gejala'
                          ? 'Mengurangi Gejala'
                          : acpDetail.careGoal === 'fokus_kenyamanan'
                            ? 'Fokus Kenyamanan'
                            : acpDetail.careGoal === 'akhir_hayat'
                              ? 'Akhir Hayat'
                              : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Resusitasi (CPR)</span>
                    <span className="font-medium">
                      {acpDetail.resuscitationPref === 'cpr' ? 'CPR' : 'DNR'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Ventilator Mekanik</span>
                    <span className="font-medium">
                      {acpDetail.ventilatorPref === 'bersedia' ? 'Bersedia' : 'Tidak Bersedia'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">ICU</span>
                    <span className="font-medium">
                      {acpDetail.icuPref === 'bersedia' ? 'Bersedia' : 'Tidak Bersedia'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Nutrisi Buatan</span>
                    <span className="font-medium">
                      {acpDetail.artificialNutrition === 'bersedia' ? 'Bersedia' : 'Tidak Bersedia'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Dialisis</span>
                    <span className="font-medium">
                      {acpDetail.dialysisPref === 'bersedia' ? 'Bersedia' : 'Tidak Bersedia'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Donor Organ</span>
                    <span className="font-medium">
                      {acpDetail.organDonation === 'ya' ? 'Ya' : 'Tidak'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hopes and Wishes */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4" />
                  Harapan dan Keinginan
                </h4>
                <div className="space-y-3 text-sm">
                  {acpDetail.patientHopes && (
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground mb-1">Harapan Pasien:</p>
                      <p>{acpDetail.patientHopes}</p>
                    </div>
                  )}
                  {acpDetail.patientWorries && (
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground mb-1">Kekhawatiran Pasien:</p>
                      <p>{acpDetail.patientWorries}</p>
                    </div>
                  )}
                  {acpDetail.lifeValues && (
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground mb-1">Nilai Hidup yang Penting:</p>
                      <p>{acpDetail.lifeValues}</p>
                    </div>
                  )}
                  {acpDetail.endOfLifePrefs && (
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground mb-1">Preferensi Menjelang Akhir Hayat:</p>
                      <p>{acpDetail.endOfLifePrefs}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Persetujuan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    className={cn(
                      'p-3 rounded border',
                      acpDetail.patientSigned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {acpDetail.patientSigned ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">Pasien</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {acpDetail.patientSigned ? 'Telah menyetujui' : 'Belum menyetujui'}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'p-3 rounded border',
                      acpDetail.familySigned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {acpDetail.familySigned ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">Keluarga</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {acpDetail.familySigned ? 'Telah menyetujui' : 'Belum menyetujui'}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'p-3 rounded border',
                      acpDetail.doctorSigned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {acpDetail.doctorSigned ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">Dokter</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {acpDetail.doctorSigned ? 'Telah menyetujui' : 'Belum menyetujui'}
                    </p>
                  </div>
                </div>
                {acpDetail.signedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Ditandatangani: {formatDateTime(acpDetail.signedAt)}
                  </p>
                )}
              </div>

              {/* Revision History */}
              {acpDetail.revisions && acpDetail.revisions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Riwayat Revisi
                  </h4>
                  <div className="space-y-2">
                    {acpDetail.revisions.map((rev) => (
                      <div key={rev.id} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {rev.revisedBy || 'Tidak diketahui'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(rev.createdAt)}
                          </span>
                        </div>
                        {rev.changes && <p className="mt-1">Perubahan: {rev.changes}</p>}
                        {rev.reason && (
                          <p className="text-xs text-muted-foreground">Alasan: {rev.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Dibuat: {formatDateTime(acpDetail.createdAt)} | Diperbarui:{' '}
                {formatDateTime(acpDetail.updatedAt)}
              </p>
            </Card>
          </>
        ) : (
          <div className="space-y-3">
            {patientACPs.map((acp) => {
              const status = getAcpStatus(acp);
              return (
                <Card
                  key={acp.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setShowACPDetail(acp.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-medium">ACP - {selectedPatient.patientName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Pengambil keputusan: {acp.decisionMakerName || '-'} (
                          {acp.decisionMakerRelation || '-'})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dibuat: {formatDate(acp.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Render: AI Assistant ──
  const renderAI = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Asisten Klinis
        </h2>
        <Button onClick={handleAiAnalysis} disabled={!selectedPatient || aiLoading}>
          {aiLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Analisis AI
            </>
          )}
        </Button>
      </div>

      {!selectedPatient ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Pilih pasien terlebih dahulu untuk menjalankan analisis AI.</p>
        </Card>
      ) : aiLoading ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <div>
              <p className="font-medium">Menganalisis data pasien...</p>
              <p className="text-sm text-muted-foreground">
                Mengumpulkan data TTV, skrining, obat, dan ACP untuk analisis komprehensif.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </Card>
      ) : palliativeAiSummary ? (
        <div className="space-y-4">
          {palliativeAiSummary.split('\n\n').map((section, i) => {
            const lines = section.split('\n');
            const title = lines[0];
            const content = lines.slice(1).join('\n');
            const isCritical =
              title.includes('PERINGATAN') || title.includes('PERBURUKAN');
            const isRecommendation =
              title.includes('REKOMENDASI') || title.includes('SOAP');

            return (
              <Card
                key={i}
                className={cn(
                  'p-4',
                  isCritical && 'border-red-200 bg-red-50/50',
                  isRecommendation && 'border-teal-200 bg-teal-50/50'
                )}
              >
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  {isCritical ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : isRecommendation ? (
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Info className="w-4 h-4 text-muted-foreground" />
                  )}
                  {title}
                </h4>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {content}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-2">AI Asisten Klinis Paliatif</p>
          <p className="text-sm mb-4">
            Klik tombol &quot;Generate Analisis AI&quot; untuk mendapatkan analisis komprehensif
            meliputi:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Ringkasan Kondisi
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Analisis Tren TTV
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Perbandingan Skrining
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Identifikasi Perburukan
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Faktor Risiko Utama
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Rekomendasi Tindak Lanjut
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              SOAP Note Otomatis
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Peringatan Dini
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  // ── Render: Komunikasi Pasien ──
  const renderKomunikasi = () => {
    const allFormTypes: PalliativeMonitoringFormType[] = [
      'ttv', 'pps', 'spict', 'esas', 'eortc', 'penilaian_nyeri', 'penilaian_sesak', 'penilaian_nutrisi', 'acp',
    ];

    const monitoringStatusOptions: PalliativeMonitoringStatus[] = [
      'monitoring_aktif', 'stabil', 'membutuhkan_home_visit', 'membutuhkan_telekonsultasi',
      'membutuhkan_rujukan', 'terminal', 'meninggal_dunia', 'program_selesai',
    ];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Komunikasi Pasien
          </h2>
          <div className="flex items-center gap-2">
            {palliativeMonitoringNotifications.filter((n) => !n.isRead).length > 0 && (
              <Badge variant="destructive" className="text-xs">
                <Bell className="w-3 h-3 mr-1" />
                {palliativeMonitoringNotifications.filter((n) => !n.isRead).length} Notifikasi
              </Badge>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Total Aktif</span>
            </div>
            <p className="text-xl font-bold">{komunikasiStats.total}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] text-muted-foreground">Monitoring</span>
            </div>
            <p className="text-xl font-bold text-green-600">{komunikasiStats.monitoringAktif}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-[10px] text-muted-foreground">Stabil</span>
            </div>
            <p className="text-xl font-bold text-teal-600">{komunikasiStats.stabil}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Home className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] text-muted-foreground">Home Visit</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{komunikasiStats.homeVisit}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] text-muted-foreground">Telekonsultasi</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{komunikasiStats.telekonsultasi}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-[10px] text-muted-foreground">Terminal</span>
            </div>
            <p className="text-xl font-bold text-red-600">{komunikasiStats.terminal}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Belum Dibaca</span>
            </div>
            <p className="text-xl font-bold text-primary">{komunikasiStats.totalUnread}</p>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama pasien, RM, diagnosa, status..."
              value={komunikasiSearch}
              onChange={(e) => setKomunikasiSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={komunikasiFilter} onValueChange={setKomunikasiFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="monitoring_aktif">Monitoring Aktif</SelectItem>
              <SelectItem value="stabil">Stabil</SelectItem>
              <SelectItem value="membutuhkan_home_visit">Home Visit</SelectItem>
              <SelectItem value="membutuhkan_telekonsultasi">Telekonsultasi</SelectItem>
              <SelectItem value="membutuhkan_rujukan">Perlu Rujukan</SelectItem>
              <SelectItem value="terminal">Terminal</SelectItem>
              <SelectItem value="meninggal_dunia">Meninggal Dunia</SelectItem>
              <SelectItem value="program_selesai">Program Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        {palliativeMonitoringNotifications.filter((n) => !n.isRead).length > 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-sm font-medium text-amber-800">Notifikasi Terbaru</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                  {palliativeMonitoringNotifications.filter((n) => !n.isRead).length} baru
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {palliativeMonitoringNotifications
                  .filter((n) => !n.isRead)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((notif) => (
                    <div
                      key={notif.id}
                      className="flex items-start gap-2 p-2 rounded-md hover:bg-amber-100/50 cursor-pointer"
                      onClick={() => markPalliativeNotificationRead(notif.id)}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] shrink-0',
                          notif.severity === 'critical'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : notif.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                        )}
                      >
                        {notif.severity === 'critical' ? 'Kritis' : notif.severity === 'warning' ? 'Perhatian' : 'Info'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-900 truncate">{notif.title}</p>
                        <p className="text-[10px] text-amber-700 truncate">{notif.description}</p>
                      </div>
                      <span className="text-[9px] text-amber-600 shrink-0">
                        {formatDateTime(notif.createdAt)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Communication List */}
        <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto custom-scrollbar">
          {filteredKomunikasiPatients.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p>Tidak ada pasien ditemukan.</p>
              <p className="text-xs mt-1">Coba ubah filter atau kata kunci pencarian.</p>
            </Card>
          ) : (
            filteredKomunikasiPatients.map((patient) => {
              const statusBadge = getMonitoringStatusBadge(patient.monitoringStatus);
              const riskBadge = getRiskBadge(patient.riskLevel);
              const lastPPS = getLastPPS(patient.id);
              const unread = getUnreadCount(patient.id);
              const lastChat = getLastChatDate(patient.id);

              return (
                <Card
                  key={patient.id}
                  className={cn(
                    'p-4 hover:shadow-md transition-shadow border-l-4',
                    patient.riskLevel === 'merah'
                      ? 'border-l-red-500'
                      : patient.riskLevel === 'kuning'
                        ? 'border-l-amber-500'
                        : 'border-l-green-500'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">
                          {patient.patientName || '-'}
                        </h3>
                        <Badge variant="outline" className={cn('text-[10px]', riskBadge.className)}>
                          {riskBadge.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[10px]', statusBadge.className)}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        RM: {patient.rmNumber || '-'} | {patient.primaryDiagnosis || '-'}
                        {patient.diseaseStage ? ` (${patient.diseaseStage})` : ''}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          PPS: {lastPPS ?? '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Chat terakhir: {lastChat ? formatDateTime(lastChat) : 'Belum ada'}
                        </span>
                        {unread > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                            {unread} belum dibaca
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-[11px]">
                            <RefreshCw className="w-3 h-3 mr-1" /> Ubah Status
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-xs">Status Monitoring</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {monitoringStatusOptions.map((status) => {
                            const badge = getMonitoringStatusBadge(status);
                            return (
                              <DropdownMenuItem
                                key={status}
                                className="text-xs"
                                onClick={() => handleMonitoringStatusChange(patient.id, status)}
                              >
                                <span className={cn('w-2 h-2 rounded-full mr-2', badge.className.split(' ')[0])} />
                                {badge.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        handleSelectPatient(patient.id);
                        setActiveTab('chat');
                      }}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" /> Chat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => handleOpenSendForm(patient.id)}
                    >
                      <FileText className="w-3 h-3 mr-1" /> Kirim Form
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        handleSelectPatient(patient.id);
                        setActiveTab('patients');
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Lihat Profil
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Send Form Dialog */}
        <Dialog open={showSendFormDialog} onOpenChange={(open) => {
          setShowSendFormDialog(open);
          if (!open) {
            setSendFormPatientId(null);
            setSelectedFormTypes([]);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Kirim Form Monitoring</DialogTitle>
              <DialogDescription>
                Pilih form monitoring yang akan dikirim ke{' '}
                <span className="font-medium">
                  {palliativePatients.find((p) => p.id === sendFormPatientId)?.patientName || 'Pasien'}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {allFormTypes.map((formType) => (
                  <label
                    key={formType}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedFormTypes.includes(formType)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <Checkbox
                      checked={selectedFormTypes.includes(formType)}
                      onCheckedChange={() => toggleFormType(formType)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getFormTypeLabel(formType)}</p>
                    </div>
                    {selectedFormTypes.includes(formType) && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </label>
                ))}
              </div>
              {selectedFormTypes.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    {selectedFormTypes.length} form akan dikirim:{' '}
                    {selectedFormTypes.map((t) => getFormTypeLabel(t)).join(', ')}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSendFormDialog(false);
                  setSendFormPatientId(null);
                  setSelectedFormTypes([]);
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleSendForms}
                disabled={selectedFormTypes.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                Kirim {selectedFormTypes.length > 0 ? `(${selectedFormTypes.length})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ── Render: Audit Trail Tab ──
  const renderAudit = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audit Trail dan Keamanan</h2>
      </div>

      {/* Clinical Alerts Summary */}
      <Card className="p-4">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            <CardTitle className="text-base">Notifikasi Klinis</CardTitle>
            <Badge variant="destructive" className="text-xs">{palliativeClinicalAlerts.filter(a => !a.isRead).length} belum dibaca</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {palliativeClinicalAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada notifikasi klinis</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {palliativeClinicalAlerts.map(alert => {
                const pPatient = palliativePatients.find(p => p.id === alert.patientId);
                return (
                  <div key={alert.id} className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer',
                    !alert.isRead ? 'bg-red-50 border-red-200' : 'bg-muted/30'
                  )} onClick={() => markPalliativeAlertRead(alert.id)}>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', alert.severity === 'merah' ? 'bg-red-100 text-red-800 border-red-300' : alert.severity === 'kuning' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-green-100 text-green-800 border-green-300')}>
                      {alert.severity === 'merah' ? 'Gawat' : alert.severity === 'kuning' ? 'Waspada' : 'Stabil'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{alert.title}</span>
                        <span className="text-xs text-muted-foreground">- {pPatient?.patientName || '-'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(alert.createdAt)}</p>
                    </div>
                    {!alert.isRead && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="p-4">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Log Aktivitas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {palliativeAuditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {[...palliativeAuditLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(entry => {
                const pPatient = palliativePatients.find(p => p.id === entry.patientId);
                const actionLabel: Record<string, string> = {
                  chat_sent: 'Pesan Terkirim',
                  form_sent: 'Form Dikirim',
                  form_opened: 'Form Dibuka',
                  form_filled: 'Form Diisi',
                  form_submitted: 'Form Terkirim',
                  result_read: 'Hasil Dibaca',
                  ai_generated: 'AI Ringkasan',
                  alert_triggered: 'Notifikasi Klinis',
                  clinical_action: 'Tindakan Klinis',
                  program_completed: 'Program Selesai',
                };
                const actionColor: Record<string, string> = {
                  chat_sent: 'bg-blue-100 text-blue-800',
                  form_sent: 'bg-teal-100 text-teal-800',
                  form_opened: 'bg-sky-100 text-sky-800',
                  form_filled: 'bg-amber-100 text-amber-800',
                  form_submitted: 'bg-green-100 text-green-800',
                  result_read: 'bg-gray-100 text-gray-800',
                  ai_generated: 'bg-purple-100 text-purple-800',
                  alert_triggered: 'bg-red-100 text-red-800',
                  clinical_action: 'bg-orange-100 text-orange-800',
                  program_completed: 'bg-slate-200 text-slate-800',
                };
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 text-sm">
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', actionColor[entry.action] || 'bg-gray-100 text-gray-800')}>
                      {actionLabel[entry.action] || entry.action}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">{entry.details || '-'}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{pPatient?.patientName || '-'}</span>
                        <span>Oleh: {entry.performedByRole === 'doctor' ? 'Dokter' : entry.performedByRole === 'patient' ? 'Pasien' : entry.performedByRole === 'family' ? 'Keluarga' : 'Sistem'}</span>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Activity Summary */}
      <Card className="p-4">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Ringkasan Aktivitas Chat</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold">{palliativeChatMessages.filter(m => m.type === 'text').length}</p>
              <p className="text-xs text-muted-foreground">Pesan Teks</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold">{palliativeChatMessages.filter(m => m.type.startsWith('form_')).length}</p>
              <p className="text-xs text-muted-foreground">Form Dikirim</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold">{palliativeChatMessages.filter(m => m.type === 'form_response').length}</p>
              <p className="text-xs text-muted-foreground">Form Dijawab</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-lg font-bold">{palliativeChatMessages.filter(m => m.type === 'ai_summary').length}</p>
              <p className="text-xs text-muted-foreground">AI Ringkasan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Main Render ──
  const needsPatientSelection = ['ttv', 'screening', 'medication', 'acp', 'ai', 'chat'].includes(
    activeTab
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Monitor className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Monitoring Pasien Paliatif</h1>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MonitorTab)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <Activity className="w-4 h-4 mr-1" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="patients" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 mr-1" />
            Pasien
          </TabsTrigger>
          <TabsTrigger value="ttv" className="text-xs sm:text-sm">
            <Thermometer className="w-4 h-4 mr-1" />
            TTV Serial
          </TabsTrigger>
          <TabsTrigger value="screening" className="text-xs sm:text-sm">
            <ClipboardCheck className="w-4 h-4 mr-1" />
            Skrining
          </TabsTrigger>
          <TabsTrigger value="medication" className="text-xs sm:text-sm">
            <Pill className="w-4 h-4 mr-1" />
            Obat
          </TabsTrigger>
          <TabsTrigger value="acp" className="text-xs sm:text-sm">
            <Shield className="w-4 h-4 mr-1" />
            ACP
          </TabsTrigger>
          <TabsTrigger value="komunikasi" className="text-xs gap-1">
            <MessageCircle className="w-3.5 h-3.5" /> Komunikasi
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs sm:text-sm">
            <Brain className="w-4 h-4 mr-1" />
            AI
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs sm:text-sm">
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">
            <History className="w-4 h-4 mr-1" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="dokumen" className="text-xs sm:text-sm">
            <FileText className="w-4 h-4 mr-1" />
            Dokumen
          </TabsTrigger>
        </TabsList>

        {/* Patient selector for tabs that need it */}
        {needsPatientSelection && renderPatientSelector()}

        <TabsContent value="dashboard">{renderDashboard()}</TabsContent>
        <TabsContent value="patients">{renderPatients()}</TabsContent>
        <TabsContent value="ttv">{renderTTV()}</TabsContent>
        <TabsContent value="screening">{renderScreening()}</TabsContent>
        <TabsContent value="medication">{renderMedication()}</TabsContent>
        <TabsContent value="acp">{renderACP()}</TabsContent>
        <TabsContent value="komunikasi" className="mt-4">
          {renderKomunikasi()}
        </TabsContent>
        <TabsContent value="ai">{renderAI()}</TabsContent>
        <TabsContent value="chat">
          <div className="h-[calc(100vh-280px)]">
            <PalliativeChatPanel patient={selectedPatient} />
          </div>
        </TabsContent>
        <TabsContent value="audit">{renderAudit()}</TabsContent>
        <TabsContent value="dokumen">
          <PalliativeResumeReferralPanel patient={selectedPatient} />
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Add Patient ── */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Pasien Paliatif</DialogTitle>
            <DialogDescription>
              Isi data pasien paliatif baru. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={newPatient.patientName || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, patientName: e.target.value })
                  }
                  placeholder="Nama lengkap pasien"
                />
              </div>
              <div>
                <Label>No. Rekam Medis</Label>
                <Input
                  value={newPatient.rmNumber || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, rmNumber: e.target.value })
                  }
                  placeholder="RM-2025-XXX"
                />
              </div>
              <div>
                <Label>No. BPJS</Label>
                <Input
                  value={newPatient.bpjsNumber || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, bpjsNumber: e.target.value })
                  }
                  placeholder="Nomor BPJS"
                />
              </div>
              <div>
                <Label>NIK</Label>
                <Input
                  value={newPatient.nik || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, nik: e.target.value })
                  }
                  placeholder="Nomor Induk Kependudukan"
                />
              </div>
              <div>
                <Label>Tanggal Lahir</Label>
                <Input
                  type="date"
                  value={newPatient.dateOfBirth || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, dateOfBirth: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Jenis Kelamin</Label>
                <Select
                  value={newPatient.gender || ''}
                  onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Diagnosa Utama *</Label>
                <Input
                  value={newPatient.primaryDiagnosis || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, primaryDiagnosis: e.target.value })
                  }
                  placeholder="Contoh: Kanker Payudara Stadium IV"
                />
              </div>
              <div>
                <Label>Diagnosa Penyerta</Label>
                <Input
                  value={newPatient.secondaryDiagnosis || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, secondaryDiagnosis: e.target.value })
                  }
                  placeholder="Contoh: DM Tipe 2, Hipertensi"
                />
              </div>
              <div>
                <Label>Stadium Penyakit</Label>
                <Input
                  value={newPatient.diseaseStage || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, diseaseStage: e.target.value })
                  }
                  placeholder="Contoh: Stadium IV"
                />
              </div>
              <div>
                <Label>Dokter Penanggung Jawab</Label>
                <Select
                  value={newPatient.attendingDoctorId || ''}
                  onValueChange={(v) => {
                    const doc = doctors.find((d) => d.id === v);
                    setNewPatient({
                      ...newPatient,
                      attendingDoctorId: v,
                      attendingDoctorName: doc?.name || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dokter" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors
                      .filter((d) => d.role === 'doctor')
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nama Keluarga</Label>
                <Input
                  value={newPatient.familyContactName || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, familyContactName: e.target.value })
                  }
                  placeholder="Nama kontak keluarga"
                />
              </div>
              <div>
                <Label>Hubungan</Label>
                <Input
                  value={newPatient.familyContactRelation || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, familyContactRelation: e.target.value })
                  }
                  placeholder="Contoh: Anak, Istri, Suami"
                />
              </div>
              <div>
                <Label>No. Telepon Keluarga</Label>
                <Input
                  value={newPatient.familyContactPhone || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, familyContactPhone: e.target.value })
                  }
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Alamat</Label>
                <Textarea
                  value={newPatient.address || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, address: e.target.value })
                  }
                  placeholder="Alamat lengkap pasien"
                  rows={2}
                />
              </div>
              <div>
                <Label>Status Perawatan</Label>
                <Select
                  value={newPatient.careStatus || ''}
                  onValueChange={(v) =>
                    setNewPatient({ ...newPatient, careStatus: v as PalliativeCareStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rawat_jalan">Rawat Jalan</SelectItem>
                    <SelectItem value="home_care">Home Care</SelectItem>
                    <SelectItem value="hospice">Hospice</SelectItem>
                    <SelectItem value="rawat_inap">Rawat Inap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Pasien</Label>
                <Select
                  value={newPatient.patientStatus || ''}
                  onValueChange={(v) =>
                    setNewPatient({ ...newPatient, patientStatus: v as PalliativePatientStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="meninggal">Meninggal</SelectItem>
                    <SelectItem value="lost_follow_up">Lost to Follow-up</SelectItem>
                    <SelectItem value="pindah_faskes">Pindah Faskes</SelectItem>
                    <SelectItem value="program_selesai">Program Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tingkat Risiko</Label>
                <Select
                  value={newPatient.riskLevel || ''}
                  onValueChange={(v) =>
                    setNewPatient({ ...newPatient, riskLevel: v as PalliativeRiskLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hijau">Hijau (Rendah)</SelectItem>
                    <SelectItem value="kuning">Kuning (Sedang)</SelectItem>
                    <SelectItem value="merah">Merah (Tinggi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Catatan</Label>
                <Textarea
                  value={newPatient.notes || ''}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPatient(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAddPatient}
              disabled={!newPatient.patientName}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Patient ── */}
      <Dialog
        open={!!editingPatient}
        onOpenChange={(open) => {
          if (!open) setEditingPatient(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pasien Paliatif</DialogTitle>
            <DialogDescription>Perbarui data pasien.</DialogDescription>
          </DialogHeader>
          {editingPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Nama Lengkap</Label>
                  <Input
                    value={editingPatient.patientName || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        patientName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>No. Rekam Medis</Label>
                  <Input
                    value={editingPatient.rmNumber || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        rmNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>No. BPJS</Label>
                  <Input
                    value={editingPatient.bpjsNumber || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        bpjsNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>NIK</Label>
                  <Input
                    value={editingPatient.nik || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        nik: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={editingPatient.dateOfBirth || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        dateOfBirth: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select
                    value={editingPatient.gender || ''}
                    onValueChange={(v) =>
                      setEditingPatient({ ...editingPatient, gender: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Diagnosa Utama</Label>
                  <Input
                    value={editingPatient.primaryDiagnosis || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        primaryDiagnosis: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Diagnosa Penyerta</Label>
                  <Input
                    value={editingPatient.secondaryDiagnosis || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        secondaryDiagnosis: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Stadium Penyakit</Label>
                  <Input
                    value={editingPatient.diseaseStage || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        diseaseStage: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Dokter Penanggung Jawab</Label>
                  <Select
                    value={editingPatient.attendingDoctorId || ''}
                    onValueChange={(v) => {
                      const doc = doctors.find((d) => d.id === v);
                      setEditingPatient({
                        ...editingPatient,
                        attendingDoctorId: v,
                        attendingDoctorName: doc?.name || '',
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors
                        .filter((d) => d.role === 'doctor')
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nama Keluarga</Label>
                  <Input
                    value={editingPatient.familyContactName || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        familyContactName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Hubungan</Label>
                  <Input
                    value={editingPatient.familyContactRelation || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        familyContactRelation: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>No. Telepon Keluarga</Label>
                  <Input
                    value={editingPatient.familyContactPhone || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        familyContactPhone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Alamat</Label>
                  <Textarea
                    value={editingPatient.address || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        address: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Status Perawatan</Label>
                  <Select
                    value={editingPatient.careStatus}
                    onValueChange={(v) =>
                      setEditingPatient({
                        ...editingPatient,
                        careStatus: v as PalliativeCareStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rawat_jalan">Rawat Jalan</SelectItem>
                      <SelectItem value="home_care">Home Care</SelectItem>
                      <SelectItem value="hospice">Hospice</SelectItem>
                      <SelectItem value="rawat_inap">Rawat Inap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status Pasien</Label>
                  <Select
                    value={editingPatient.patientStatus}
                    onValueChange={(v) =>
                      setEditingPatient({
                        ...editingPatient,
                        patientStatus: v as PalliativePatientStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="meninggal">Meninggal</SelectItem>
                      <SelectItem value="lost_follow_up">Lost to Follow-up</SelectItem>
                      <SelectItem value="pindah_faskes">Pindah Faskes</SelectItem>
                      <SelectItem value="program_selesai">Program Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tingkat Risiko</Label>
                  <Select
                    value={editingPatient.riskLevel}
                    onValueChange={(v) =>
                      setEditingPatient({
                        ...editingPatient,
                        riskLevel: v as PalliativeRiskLevel,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hijau">Hijau (Rendah)</SelectItem>
                      <SelectItem value="kuning">Kuning (Sedang)</SelectItem>
                      <SelectItem value="merah">Merah (Tinggi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Catatan</Label>
                  <Textarea
                    value={editingPatient.notes || ''}
                    onChange={(e) =>
                      setEditingPatient({
                        ...editingPatient,
                        notes: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPatient(null)}>
              Batal
            </Button>
            <Button onClick={handleUpdatePatient}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Delete Confirm ── */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus pasien ini? Tindakan ini tidak dapat
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeletePatient(showDeleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Program Selesai Confirm ── */}
      <Dialog
        open={!!showProgramCompleteConfirm}
        onOpenChange={(open) => {
          if (!open) setShowProgramCompleteConfirm(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleOff className="w-5 h-5 text-slate-600" />
              Akhiri Program Monitoring Paliatif
            </DialogTitle>
            <DialogDescription>
              {showProgramCompleteConfirm && (() => {
                const patient = palliativePatients.find((p) => p.id === showProgramCompleteConfirm);
                return patient
                  ? `Pasien: ${patient.patientName || '-'} (RM: ${patient.rmNumber || '-'})`
                  : '';
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Perhatian</AlertTitle>
              <AlertDescription className="text-amber-700">
                Tindakan ini akan mengakhiri program Monitoring Paliatif untuk pasien ini. Pasien tidak akan lagi menerima form monitoring, skrining, atau notifikasi aktif. Seluruh data riwayat tetap tersimpan.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label className="font-medium">Tanggal Selesai Program <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={programCompletionDate}
                  onChange={(e) => setProgramCompletionDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label className="font-medium">Alasan Program Selesai <span className="text-destructive">*</span></Label>
                <Select
                  value={programCompletionReason}
                  onValueChange={(v) => setProgramCompletionReason(v as PalliativeProgramCompletionReason)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih alasan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sembuh_stabil">Sembuh / Stabil</SelectItem>
                    <SelectItem value="meninggal_dunia">Meninggal Dunia</SelectItem>
                    <SelectItem value="dirujuk">Dirujuk</SelectItem>
                    <SelectItem value="pindah_faskes">Pindah Fasilitas Kesehatan</SelectItem>
                    <SelectItem value="permintaan_pasien_keluarga">Permintaan Pasien/Keluarga</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {programCompletionReason === 'lainnya' && (
                <div>
                  <Label className="font-medium">Keterangan Alasan Lainnya <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Jelaskan alasan lainnya..."
                    value={programCompletionOtherReason}
                    onChange={(e) => setProgramCompletionOtherReason(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label className="font-medium">Catatan Akhir Pelayanan (Opsional)</Label>
                <Textarea
                  placeholder="Catatan akhir pelayanan Monitoring Paliatif..."
                  value={programCompletionNotes}
                  onChange={(e) => setProgramCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {showProgramCompleteConfirm && (() => {
                const patient = palliativePatients.find((p) => p.id === showProgramCompleteConfirm);
                if (!patient) return null;
                const startDate = new Date(patient.createdAt);
                const endDate = new Date(programCompletionDate);
                const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                return (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                    <p className="font-medium text-foreground">Ringkasan Penutupan Program</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                      <span>Tanggal Mulai:</span>
                      <span className="text-foreground">{formatDate(patient.createdAt)}</span>
                      <span>Tanggal Selesai:</span>
                      <span className="text-foreground">{formatDate(programCompletionDate)}</span>
                      <span>Durasi Monitoring:</span>
                      <span className="text-foreground">{durationDays} hari</span>
                      <span>Diagnosa Utama:</span>
                      <span className="text-foreground">{patient.primaryDiagnosis || '-'}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowProgramCompleteConfirm(null)}>
              Batal
            </Button>
            <Button
              className="bg-slate-700 hover:bg-slate-800 text-white"
              onClick={() => showProgramCompleteConfirm && handleProgramComplete(showProgramCompleteConfirm)}
              disabled={programCompletionReason === 'lainnya' && !programCompletionOtherReason.trim()}
            >
              <CircleOff className="w-4 h-4 mr-1" />
              Akhiri Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Vital Sign ── */}
      <Dialog open={showAddVital} onOpenChange={setShowAddVital}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Tanda Vital</DialogTitle>
            <DialogDescription>
              Pasien: {selectedPatient?.patientName || '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tanggal & Jam</Label>
                <Input
                  type="datetime-local"
                  value={
                    newVital.recordedAt
                      ? new Date(newVital.recordedAt).toISOString().slice(0, 16)
                      : new Date().toISOString().slice(0, 16)
                  }
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      recordedAt: new Date(e.target.value).toISOString(),
                    })
                  }
                />
              </div>
              <div>
                <Label>Diisi oleh</Label>
                <Select
                  value={newVital.recordedBy || ''}
                  onValueChange={(v) => setNewVital({ ...newVital, recordedBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Dokter</SelectItem>
                    <SelectItem value="nurse">Perawat</SelectItem>
                    <SelectItem value="patient">Pasien</SelectItem>
                    <SelectItem value="family">Keluarga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tekanan Darah Sistolik (mmHg)</Label>
                <Input
                  type="number"
                  value={newVital.systolicBP ?? ''}
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      systolicBP: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="90-180"
                />
              </div>
              <div>
                <Label>Tekanan Darah Diastolik (mmHg)</Label>
                <Input
                  type="number"
                  value={newVital.diastolicBP ?? ''}
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      diastolicBP: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="60-100"
                />
              </div>
              <div>
                <Label>Nadi (bpm)</Label>
                <Input
                  type="number"
                  value={newVital.heartRate ?? ''}
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      heartRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="60-100"
                />
              </div>
              <div>
                <Label>Frekuensi Napas (/menit)</Label>
                <Input
                  type="number"
                  value={newVital.respiratoryRate ?? ''}
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      respiratoryRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="12-24"
                />
              </div>
              <div>
                <Label>Suhu (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newVital.temperature ?? ''}
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      temperature: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="36.0-38.5"
                />
              </div>
              <div>
                <Label>Saturasi O2 (%)</Label>
                <Input
                  type="number"
                  value={newVital.oxygenSat ?? ''}
                  onChange={(e) =>
                    setNewVital({
                      ...newVital,
                      oxygenSat: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="90-100"
                />
              </div>
              <div>
                <Label>Berat Badan (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newVital.weight ?? ''}
                  onChange={(e) => {
                    const w = e.target.value ? Number(e.target.value) : undefined;
                    setNewVital({
                      ...newVital,
                      weight: w,
                      bmi: calcBmi(w, newVital.height),
                    });
                  }}
                  placeholder="kg"
                />
              </div>
              <div>
                <Label>Tinggi Badan (cm)</Label>
                <Input
                  type="number"
                  value={newVital.height ?? ''}
                  onChange={(e) => {
                    const h = e.target.value ? Number(e.target.value) : undefined;
                    setNewVital({
                      ...newVital,
                      height: h,
                      bmi: calcBmi(newVital.weight, h),
                    });
                  }}
                  placeholder="cm"
                />
              </div>
              <div>
                <Label>BMI (otomatis)</Label>
                <Input value={newVital.bmi ?? calcBmi(newVital.weight, newVital.height) ?? '-'} disabled />
              </div>
              <div className="sm:col-span-2">
                <Label>Catatan</Label>
                <Textarea
                  value={newVital.notes || ''}
                  onChange={(e) => setNewVital({ ...newVital, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVital(false)}>
              Batal
            </Button>
            <Button onClick={handleAddVital}>Simpan TTV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Medication ── */}
      <Dialog open={showAddMedication} onOpenChange={setShowAddMedication}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Obat Paliatif</DialogTitle>
            <DialogDescription>
              Pasien: {selectedPatient?.patientName || '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Nama Obat *</Label>
                <Input
                  value={newMedication.medicineName || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, medicineName: e.target.value })
                  }
                  placeholder="Contoh: Morfine 10mg"
                />
              </div>
              <div>
                <Label>Dosis</Label>
                <Input
                  value={newMedication.dosage || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, dosage: e.target.value })
                  }
                  placeholder="Contoh: 10mg"
                />
              </div>
              <div>
                <Label>Frekuensi</Label>
                <Input
                  value={newMedication.frequency || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, frequency: e.target.value })
                  }
                  placeholder="Contoh: 3x1"
                />
              </div>
              <div>
                <Label>Rute Pemberian</Label>
                <Select
                  value={newMedication.route || ''}
                  onValueChange={(v) => setNewMedication({ ...newMedication, route: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="iv">IV</SelectItem>
                    <SelectItem value="sc">Subkutan</SelectItem>
                    <SelectItem value="im">IM</SelectItem>
                    <SelectItem value="rektal">Rektal</SelectItem>
                    <SelectItem value="topikal">Topikal</SelectItem>
                    <SelectItem value="inhalasi">Inhalasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={newMedication.startDate || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={newMedication.endDate || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, endDate: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Indikasi</Label>
                <Input
                  value={newMedication.indication || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, indication: e.target.value })
                  }
                  placeholder="Contoh: Nyeri kronis"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Catatan</Label>
                <Textarea
                  value={newMedication.notes || ''}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMedication(false)}>
              Batal
            </Button>
            <Button onClick={handleAddMedication} disabled={!newMedication.medicineName}>
              Simpan Obat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Adherence Record ── */}
      <Dialog
        open={!!showAddAdherence}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddAdherence(null);
            setNewAdherence({});
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Kepatuhan Obat</DialogTitle>
            <DialogDescription>
              Obat:{' '}
              {palliativeMedications.find((m) => m.id === showAddAdherence)?.medicineName || '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={newAdherence.date || new Date().toISOString().split('T')[0]}
                onChange={(e) =>
                  setNewAdherence({ ...newAdherence, date: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Label>Diminum Tepat Waktu:</Label>
              <Select
                value={newAdherence.takenOnTime === false ? 'tidak' : 'ya'}
                onValueChange={(v) =>
                  setNewAdherence({
                    ...newAdherence,
                    takenOnTime: v === 'ya',
                  })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ya">Ya</SelectItem>
                  <SelectItem value="tidak">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label>Dosis Terlewat:</Label>
              <Select
                value={newAdherence.missedDose ? 'ya' : 'tidak'}
                onValueChange={(v) =>
                  setNewAdherence({
                    ...newAdherence,
                    missedDose: v === 'ya',
                  })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ya">Ya</SelectItem>
                  <SelectItem value="tidak">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Efek Samping</Label>
              <Input
                value={newAdherence.sideEffects || ''}
                onChange={(e) =>
                  setNewAdherence({ ...newAdherence, sideEffects: e.target.value })
                }
                placeholder="Contoh: Mual, pusing"
              />
            </div>
            <div>
              <Label>Keluhan</Label>
              <Textarea
                value={newAdherence.complaints || ''}
                onChange={(e) =>
                  setNewAdherence({ ...newAdherence, complaints: e.target.value })
                }
                placeholder="Keluhan tambahan"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddAdherence(null);
                setNewAdherence({});
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => showAddAdherence && handleAddAdherence(showAddAdherence)}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add ACP (Multi-step) ── */}
      <Dialog open={showAddACP} onOpenChange={(open) => { if (!open) { setShowAddACP(false); setAcpStep(0); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance Care Planning</DialogTitle>
            <DialogDescription>
              Pasien: {selectedPatient?.patientName || '-'} — Langkah {acpStep + 1} dari 4
            </DialogDescription>
          </DialogHeader>
          <Progress value={((acpStep + 1) / 4) * 100} className="h-2 mb-4" />

          {/* Step 1: Decision Maker */}
          {acpStep === 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Identitas Pengambil Keputusan
              </h3>
              <div>
                <Label>Nama Pengambil Keputusan</Label>
                <Input
                  value={newACP.decisionMakerName || ''}
                  onChange={(e) =>
                    setNewACP({ ...newACP, decisionMakerName: e.target.value })
                  }
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <Label>Hubungan dengan Pasien</Label>
                <Input
                  value={newACP.decisionMakerRelation || ''}
                  onChange={(e) =>
                    setNewACP({ ...newACP, decisionMakerRelation: e.target.value })
                  }
                  placeholder="Contoh: Anak, Istri, Suami"
                />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input
                  value={newACP.decisionMakerPhone || ''}
                  onChange={(e) =>
                    setNewACP({ ...newACP, decisionMakerPhone: e.target.value })
                  }
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
          )}

          {/* Step 2: Care Preferences */}
          {acpStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Preferensi Perawatan
              </h3>
              <div>
                <Label>Tempat Perawatan</Label>
                <Select
                  value={newACP.preferredCareLocation || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, preferredCareLocation: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rumah">Rumah</SelectItem>
                    <SelectItem value="rumah_sakit">Rumah Sakit</SelectItem>
                    <SelectItem value="hospice">Hospice</SelectItem>
                    <SelectItem value="fasilitas_khusus">Fasilitas Khusus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tujuan Perawatan</Label>
                <Select
                  value={newACP.careGoal || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, careGoal: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="memperpanjang_hidup">Memperpanjang Hidup</SelectItem>
                    <SelectItem value="mengurangi_gejala">Mengurangi Gejala</SelectItem>
                    <SelectItem value="fokus_kenyamanan">Fokus Kenyamanan</SelectItem>
                    <SelectItem value="akhir_hayat">Akhir Hayat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferensi Resusitasi</Label>
                <RadioGroup
                  value={newACP.resuscitationPref || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, resuscitationPref: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cpr" id="r-cpr" />
                    <Label htmlFor="r-cpr">CPR (Resusitasi)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dnr" id="r-dnr" />
                    <Label htmlFor="r-dnr">DNR (Do Not Resuscitate)</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Ventilator Mekanik</Label>
                <RadioGroup
                  value={newACP.ventilatorPref || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, ventilatorPref: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bersedia" id="v-ya" />
                    <Label htmlFor="v-ya">Bersedia</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tidak_bersedia" id="v-tidak" />
                    <Label htmlFor="v-tidak">Tidak Bersedia</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>ICU</Label>
                <RadioGroup
                  value={newACP.icuPref || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, icuPref: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bersedia" id="icu-ya" />
                    <Label htmlFor="icu-ya">Bersedia</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tidak_bersedia" id="icu-tidak" />
                    <Label htmlFor="icu-tidak">Tidak Bersedia</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Nutrisi Buatan</Label>
                <RadioGroup
                  value={newACP.artificialNutrition || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, artificialNutrition: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bersedia" id="nut-ya" />
                    <Label htmlFor="nut-ya">Bersedia</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tidak_bersedia" id="nut-tidak" />
                    <Label htmlFor="nut-tidak">Tidak Bersedia</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Dialisis</Label>
                <RadioGroup
                  value={newACP.dialysisPref || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, dialysisPref: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bersedia" id="dial-ya" />
                    <Label htmlFor="dial-ya">Bersedia</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tidak_bersedia" id="dial-tidak" />
                    <Label htmlFor="dial-tidak">Tidak Bersedia</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Donor Organ</Label>
                <RadioGroup
                  value={newACP.organDonation || ''}
                  onValueChange={(v) => setNewACP({ ...newACP, organDonation: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ya" id="donor-ya" />
                    <Label htmlFor="donor-ya">Ya</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tidak" id="donor-tidak" />
                    <Label htmlFor="donor-tidak">Tidak</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 3: Hopes and Wishes */}
          {acpStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                Harapan dan Keinginan
              </h3>
              <div>
                <Label>Harapan Pasien</Label>
                <Textarea
                  value={newACP.patientHopes || ''}
                  onChange={(e) => setNewACP({ ...newACP, patientHopes: e.target.value })}
                  placeholder="Apa harapan pasien untuk perawatan dan kehidupannya?"
                  rows={3}
                />
              </div>
              <div>
                <Label>Kekhawatiran Pasien</Label>
                <Textarea
                  value={newACP.patientWorries || ''}
                  onChange={(e) => setNewACP({ ...newACP, patientWorries: e.target.value })}
                  placeholder="Apa kekhawatiran utama pasien?"
                  rows={3}
                />
              </div>
              <div>
                <Label>Nilai Hidup yang Penting</Label>
                <Textarea
                  value={newACP.lifeValues || ''}
                  onChange={(e) => setNewACP({ ...newACP, lifeValues: e.target.value })}
                  placeholder="Nilai-nilai apa yang paling penting bagi pasien?"
                  rows={3}
                />
              </div>
              <div>
                <Label>Preferensi Menjelang Akhir Hayat</Label>
                <Textarea
                  value={newACP.endOfLifePrefs || ''}
                  onChange={(e) => setNewACP({ ...newACP, endOfLifePrefs: e.target.value })}
                  placeholder="Bagaimana pasien ingin menjalani saat-saat akhir hayatnya?"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Consent */}
          {acpStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Persetujuan
              </h3>
              <p className="text-sm text-muted-foreground">
                Dengan mencentang kolom di bawah, pihak yang bersangkutan menyatakan telah
                memahami dan menyetujui isi dokumen Advance Care Planning ini.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acp-patient"
                    checked={newACP.patientSigned || false}
                    onCheckedChange={(checked) =>
                      setNewACP({ ...newACP, patientSigned: checked === true })
                    }
                  />
                  <Label htmlFor="acp-patient" className="font-medium">
                    Pasien menyetujui
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acp-family"
                    checked={newACP.familySigned || false}
                    onCheckedChange={(checked) =>
                      setNewACP({ ...newACP, familySigned: checked === true })
                    }
                  />
                  <Label htmlFor="acp-family" className="font-medium">
                    Keluarga menyetujui
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acp-doctor"
                    checked={newACP.doctorSigned || false}
                    onCheckedChange={(checked) =>
                      setNewACP({ ...newACP, doctorSigned: checked === true })
                    }
                  />
                  <Label htmlFor="acp-doctor" className="font-medium">
                    Dokter menyetujui
                  </Label>
                </div>
              </div>
              <Separator />
              <div>
                <Label>Tanggal Pembuatan</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {acpStep > 0 && (
              <Button variant="outline" onClick={() => setAcpStep(acpStep - 1)}>
                Sebelumnya
              </Button>
            )}
            {acpStep < 3 ? (
              <Button onClick={() => setAcpStep(acpStep + 1)}>Selanjutnya</Button>
            ) : (
              <Button onClick={handleAddACP}>Simpan ACP</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
