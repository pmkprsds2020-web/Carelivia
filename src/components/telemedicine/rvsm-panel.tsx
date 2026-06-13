'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type {
  WearableDevice,
  WearableDeviceType,
  WearableIntegrationMethod,
  WearableDeviceStatus,
  WearableVitalData,
  RVSMAlert,
  RVSMAlertSeverity,
  RVSMDailyReport,
  RVSMFamilyAccess,
  RVSMAuditEntry,
  RVSMPalliativeScoreEstimate,
  RVSMTimeRange,
  PalliativePatientInfo,
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
import { Progress } from '@/components/ui/progress';
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
  Watch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Eye,
  Thermometer,
  Droplets,
  Wind,
  Monitor,
  Brain,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Bell,
  BellOff,
  History,
  FileText,
  Download,
  Save,
  Users,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  Minus,
  Moon,
  Sun,
  Footprints,
  BedDouble,
  Armchair,
  ArrowUp,
  ArrowDown,
  Info,
  Zap,
  Bluetooth,
  Smartphone,
  Hand,
  Siren,
  MessageSquare,
  ClipboardCheck,
  Database,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Tab Type ────────────────────────────────────────────────────────────

type RVSMTab =
  | 'dashboard'
  | 'devices'
  | 'realtime'
  | 'trends'
  | 'palliative-scores'
  | 'early-warning'
  | 'notifications'
  | 'ai-assistant'
  | 'family'
  | 'audit'
  | 'medical-records';

// ── Helper Functions ────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

function getDeviceTypeLabel(type: WearableDeviceType): string {
  switch (type) {
    case 'apple_watch': return 'Apple Watch';
    case 'samsung_galaxy_watch': return 'Samsung Galaxy Watch';
    case 'garmin_watch': return 'Garmin Watch';
    case 'huawei_watch': return 'Huawei Watch';
    case 'xiaomi_smart_band': return 'Xiaomi Smart Band';
    case 'fitbit': return 'Fitbit';
    case 'wear_os': return 'Wear OS';
    case 'bluetooth_health': return 'Bluetooth Health Device';
  }
}

function getIntegrationMethodLabel(method: WearableIntegrationMethod): string {
  switch (method) {
    case 'apple_healthkit': return 'Apple HealthKit';
    case 'google_health_connect': return 'Google Health Connect';
    case 'samsung_health': return 'Samsung Health';
    case 'fitbit_api': return 'Fitbit API';
    case 'bluetooth_health_device': return 'Bluetooth Health Device';
    case 'rest_api': return 'REST API';
  }
}

function getDeviceStatusLabel(status: WearableDeviceStatus): { label: string; className: string } {
  switch (status) {
    case 'connected':
      return { label: 'Terhubung', className: 'bg-green-100 text-green-800 border-green-300' };
    case 'sync_pending':
      return { label: 'Sinkronisasi Tertunda', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'offline':
      return { label: 'Offline', className: 'bg-gray-200 text-gray-700 border-gray-300' };
    case 'low_battery':
      return { label: 'Baterai Rendah', className: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 'inactive':
      return { label: 'Tidak Aktif', className: 'bg-red-100 text-red-800 border-red-300' };
  }
}

function getSeverityColor(severity: RVSMAlertSeverity): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'normal':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    case 'attention':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
  }
}

function getVitalSignStatus(
  value: number | undefined,
  normalRange: [number, number],
  attentionRange: [number, number]
): 'normal' | 'attention' | 'critical' {
  if (value === undefined) return 'normal';
  if (value >= normalRange[0] && value <= normalRange[1]) return 'normal';
  if (value >= attentionRange[0] && value <= attentionRange[1]) return 'attention';
  return 'critical';
}

function getCategoryIcon(category: RVSMAlert['category']) {
  switch (category) {
    case 'cardiovascular': return HeartPulse;
    case 'oxygenation': return Droplets;
    case 'respiratory': return Wind;
    case 'activity': return Activity;
    case 'sleep': return Moon;
    case 'mobility': return Footprints;
    case 'temperature': return Thermometer;
    case 'pain': return AlertTriangle;
  }
}

function getRiskLevelLabel(risk: 'low' | 'moderate' | 'high'): { label: string; className: string } {
  switch (risk) {
    case 'low':
      return { label: 'Rendah', className: 'bg-green-100 text-green-800 border-green-300' };
    case 'moderate':
      return { label: 'Sedang', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'high':
      return { label: 'Tinggi', className: 'bg-red-100 text-red-800 border-red-300' };
  }
}

function getSeverityLabel(severity: RVSMAlertSeverity): string {
  switch (severity) {
    case 'normal': return 'Normal';
    case 'attention': return 'Perhatian';
    case 'critical': return 'Kritis';
  }
}

function getCategoryLabel(category: RVSMAlert['category']): string {
  switch (category) {
    case 'cardiovascular': return 'Kardiovaskular';
    case 'oxygenation': return 'Oksigenasi';
    case 'respiratory': return 'Pernapasan';
    case 'activity': return 'Aktivitas';
    case 'sleep': return 'Tidur';
    case 'mobility': return 'Mobilitas';
    case 'temperature': return 'Suhu';
    case 'pain': return 'Nyeri';
  }
}

function getActionLabel(action: RVSMAuditEntry['action']): string {
  switch (action) {
    case 'device_connected': return 'Perangkat Terhubung';
    case 'device_disconnected': return 'Perangkat Terputus';
    case 'data_received': return 'Data Diterima';
    case 'data_analyzed': return 'Data Dianalisis';
    case 'alert_generated': return 'Alert Dihasilkan';
    case 'alert_acknowledged': return 'Alert Diakui';
    case 'alert_viewed': return 'Alert Dilihat';
    case 'followup_action': return 'Tindak Lanjut';
    case 'report_generated': return 'Laporan Dihasilkan';
    case 'family_access_granted': return 'Akses Keluarga Diberikan';
    case 'family_access_revoked': return 'Akses Keluarga Dicabut';
  }
}

function getActionColor(action: RVSMAuditEntry['action']): string {
  switch (action) {
    case 'device_connected': return 'text-green-700 bg-green-50';
    case 'device_disconnected': return 'text-red-700 bg-red-50';
    case 'data_received': return 'text-blue-700 bg-blue-50';
    case 'data_analyzed': return 'text-purple-700 bg-purple-50';
    case 'alert_generated': return 'text-red-700 bg-red-50';
    case 'alert_acknowledged': return 'text-yellow-700 bg-yellow-50';
    case 'alert_viewed': return 'text-blue-700 bg-blue-50';
    case 'followup_action': return 'text-teal-700 bg-teal-50';
    case 'report_generated': return 'text-green-700 bg-green-50';
    case 'family_access_granted': return 'text-green-700 bg-green-50';
    case 'family_access_revoked': return 'text-red-700 bg-red-50';
  }
}

function getRoleLabel(role: RVSMAuditEntry['performedByRole']): string {
  switch (role) {
    case 'doctor': return 'Dokter';
    case 'patient': return 'Pasien';
    case 'family': return 'Keluarga';
    case 'system': return 'Sistem';
  }
}

function getBatteryIcon(level?: number) {
  if (level === undefined) return Battery;
  if (level <= 15) return BatteryLow;
  if (level <= 50) return BatteryMedium;
  return BatteryFull;
}

function getBatteryColor(level?: number): string {
  if (level === undefined) return 'text-gray-400';
  if (level <= 15) return 'text-red-500';
  if (level <= 30) return 'text-orange-500';
  if (level <= 60) return 'text-yellow-500';
  return 'text-green-500';
}

// ── Main Component ──────────────────────────────────────────────────────

export function RvsmPanel() {
  // ── State ──
  const [activeTab, setActiveTab] = useState<RVSMTab>('dashboard');
  const [trendTimeRange, setTrendTimeRange] = useState<RVSMTimeRange>('24h');
  const [trendPatientId, setTrendPatientId] = useState<string>('');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('all');
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>('all');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Dashboard Quick-Action Dialogs
  const [dashboardDialogType, setDashboardDialogType] = useState<'realtime' | 'tren' | 'skor-paliatif' | null>(null);
  const [dashboardDialogPatientId, setDashboardDialogPatientId] = useState<string | null>(null);
  const [dashboardTrendRange, setDashboardTrendRange] = useState<RVSMTimeRange>('24h');

  // New device form
  const [newDevice, setNewDevice] = useState<{
    deviceName: string;
    deviceType: WearableDeviceType;
    integrationMethod: WearableIntegrationMethod;
    serialNumber: string;
    patientId: string;
  }>({
    deviceName: '',
    deviceType: 'apple_watch',
    integrationMethod: 'apple_healthkit',
    serialNumber: '',
    patientId: '',
  });

  // New family access form
  const [newFamily, setNewFamily] = useState<{
    familyMemberName: string;
    relationship: string;
    patientId: string;
    canViewActivity: boolean;
    canViewDeviceStatus: boolean;
    canViewHealthGraphs: boolean;
    canReceiveAlerts: boolean;
    canViewSchedule: boolean;
  }>({
    familyMemberName: '',
    relationship: '',
    patientId: '',
    canViewActivity: true,
    canViewDeviceStatus: true,
    canViewHealthGraphs: true,
    canReceiveAlerts: true,
    canViewSchedule: true,
  });

  // ── Store ──
  const {
    rvsmDevices,
    addRvsmDevice,
    updateRvsmDevice,
    removeRvsmDevice,
    rvsmVitalData,
    addRvsmVitalData,
    rvsmAlerts,
    addRvsmAlert,
    markRvsmAlertRead,
    acknowledgeRvsmAlert,
    rvsmDailyReports,
    addRvsmDailyReport,
    rvsmFamilyAccess,
    addRvsmFamilyAccess,
    removeRvsmFamilyAccess,
    rvsmAuditLog,
    addRvsmAuditEntry,
    rvsmPalliativeEstimates,
    addRvsmPalliativeEstimate,
    rvsmAiSummary,
    setRvsmAiSummary,
    palliativePatients,
    selectedPalliativePatientId,
    setSelectedPalliativePatientId,
    palliativeScreeningRecords,
    currentUser,
    addPalliativeChatMessage,
    addPalliativeMonitoringNotification,
  } = useStore();

  const { toast } = useToast();

  // ── Computed data ──

  const selectedPatient = useMemo(
    () => palliativePatients.find(p => p.id === selectedPalliativePatientId) || null,
    [palliativePatients, selectedPalliativePatientId]
  );

  const selectedPatientVitalData = useMemo(
    () => rvsmVitalData
      .filter(d => d.patientId === selectedPalliativePatientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [rvsmVitalData, selectedPalliativePatientId]
  );

  const latestVitalData = useMemo(
    () => selectedPatientVitalData[0] || null,
    [selectedPatientVitalData]
  );

  const selectedPatientDevice = useMemo(
    () => rvsmDevices.find(d => d.patientId === selectedPalliativePatientId) || null,
    [rvsmDevices, selectedPalliativePatientId]
  );

  const selectedPatientAlerts = useMemo(
    () => rvsmAlerts.filter(a => a.patientId === selectedPalliativePatientId),
    [rvsmAlerts, selectedPalliativePatientId]
  );

  const selectedPatientEstimate = useMemo(
    () => rvsmPalliativeEstimates.find(e => e.patientId === selectedPalliativePatientId) || null,
    [rvsmPalliativeEstimates, selectedPalliativePatientId]
  );

  const selectedPatientReports = useMemo(
    () => rvsmDailyReports.filter(r => r.patientId === selectedPalliativePatientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rvsmDailyReports, selectedPalliativePatientId]
  );

  const selectedPatientFamilyAccess = useMemo(
    () => rvsmFamilyAccess.filter(f => f.patientId === selectedPalliativePatientId),
    [rvsmFamilyAccess, selectedPalliativePatientId]
  );

  const selectedPatientAuditLog = useMemo(
    () => rvsmAuditLog.filter(a => a.patientId === selectedPalliativePatientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rvsmAuditLog, selectedPalliativePatientId]
  );

  // ── Dashboard stats ──
  const dashboardStats = useMemo(() => {
    const totalPatients = palliativePatients.filter(p => p.patientStatus === 'aktif').length;
    const activeDevices = rvsmDevices.filter(d => d.status === 'connected').length;
    const criticalAlerts = rvsmAlerts.filter(a => a.severity === 'critical' && !a.isAcknowledged).length;
    const attentionAlerts = rvsmAlerts.filter(a => a.severity === 'attention' && !a.isAcknowledged).length;
    return { totalPatients, activeDevices, criticalAlerts, attentionAlerts };
  }, [palliativePatients, rvsmDevices, rvsmAlerts]);

  // ── Patient latest vitals for dashboard grid ──
  const patientLatestVitals = useMemo(() => {
    return palliativePatients
      .filter(p => p.patientStatus === 'aktif')
      .map(p => {
        const vitals = rvsmVitalData
          .filter(d => d.patientId === p.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const device = rvsmDevices.find(d => d.patientId === p.id);
        return { patient: p, latestVital: vitals[0] || null, device: device || null };
      });
  }, [palliativePatients, rvsmVitalData, rvsmDevices]);

  // ── Trend chart data ──
  const trendChartData = useMemo(() => {
    const patientId = trendPatientId || selectedPalliativePatientId || '';
    let data = rvsmVitalData
      .filter(d => d.patientId === patientId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter by time range
    const now = Date.now();
    const rangeMs: Record<RVSMTimeRange, number> = {
      '24h': 24 * 3600000,
      '7d': 7 * 24 * 3600000,
      '30d': 30 * 24 * 3600000,
      '90d': 90 * 24 * 3600000,
    };
    const cutoff = now - rangeMs[trendTimeRange];
    data = data.filter(d => new Date(d.timestamp).getTime() >= cutoff);

    return data.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      fullTime: formatDateTime(d.timestamp),
      heartRate: d.heartRate,
      oxygenSat: d.oxygenSat,
      respiratoryRate: d.respiratoryRate,
      steps: d.steps,
      sleepDuration: d.sleepDuration ? Math.round(d.sleepDuration / 60 * 10) / 10 : undefined,
    }));
  }, [rvsmVitalData, trendPatientId, selectedPalliativePatientId, trendTimeRange]);

  // ── Filtered alerts ──
  const filteredAlerts = useMemo(() => {
    let result = rvsmAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (alertSeverityFilter !== 'all') {
      result = result.filter(a => a.severity === alertSeverityFilter);
    }
    if (alertCategoryFilter !== 'all') {
      result = result.filter(a => a.category === alertCategoryFilter);
    }
    return result;
  }, [rvsmAlerts, alertSeverityFilter, alertCategoryFilter]);

  // ── Filtered audit log ──
  const filteredAuditLog = useMemo(() => {
    let result = [...rvsmAuditLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (auditActionFilter !== 'all') {
      result = result.filter(a => a.action === auditActionFilter);
    }
    return result;
  }, [rvsmAuditLog, auditActionFilter]);

  // ── Handlers ──

  const handleSelectPatient = useCallback((id: string) => {
    setSelectedPalliativePatientId(id);
  }, [setSelectedPalliativePatientId]);

  const handleAddDevice = useCallback(() => {
    if (!newDevice.deviceName || !newDevice.patientId) {
      toast({ title: 'Data Tidak Lengkap', description: 'Nama perangkat dan pasien wajib diisi.' });
      return;
    }
    const device: WearableDevice = {
      id: genId('wd'),
      patientId: newDevice.patientId,
      deviceType: newDevice.deviceType,
      deviceName: newDevice.deviceName,
      integrationMethod: newDevice.integrationMethod,
      status: 'connected',
      batteryLevel: 100,
      isConnected: true,
      serialNumber: newDevice.serialNumber || undefined,
      lastSyncAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    };
    addRvsmDevice(device);
    addRvsmAuditEntry({
      id: genId('ra'),
      patientId: newDevice.patientId,
      action: 'device_connected',
      performedBy: currentUser?.name || 'Dokter',
      performedByRole: 'doctor',
      details: `Perangkat ${newDevice.deviceName} terhubung`,
      deviceId: device.id,
      createdAt: new Date().toISOString(),
    });
    setNewDevice({ deviceName: '', deviceType: 'apple_watch', integrationMethod: 'apple_healthkit', serialNumber: '', patientId: '' });
    setShowAddDevice(false);
    toast({ title: 'Perangkat Ditambahkan', description: `${newDevice.deviceName} berhasil terhubung.` });
  }, [newDevice, addRvsmDevice, addRvsmAuditEntry, currentUser, toast]);

  const handleRemoveDevice = useCallback((deviceId: string) => {
    const device = rvsmDevices.find(d => d.id === deviceId);
    if (device) {
      removeRvsmDevice(deviceId);
      updateRvsmDevice(deviceId, { status: 'inactive', isConnected: false, deactivatedAt: new Date().toISOString() });
      addRvsmAuditEntry({
        id: genId('ra'),
        patientId: device.patientId,
        action: 'device_disconnected',
        performedBy: currentUser?.name || 'Dokter',
        performedByRole: 'doctor',
        details: `Perangkat ${device.deviceName} diputuskan`,
        deviceId,
        createdAt: new Date().toISOString(),
      });
      toast({ title: 'Perangkat Dihapus', description: `${device.deviceName} telah dihapus dari sistem.` });
    }
  }, [rvsmDevices, removeRvsmDevice, updateRvsmDevice, addRvsmAuditEntry, currentUser, toast]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    const userName = currentUser?.name || 'Dokter';
    acknowledgeRvsmAlert(alertId, userName);
    addRvsmAuditEntry({
      id: genId('ra'),
      patientId: rvsmAlerts.find(a => a.id === alertId)?.patientId || '',
      action: 'alert_acknowledged',
      performedBy: userName,
      performedByRole: 'doctor',
      details: `Alert ${alertId} diakui oleh ${userName}`,
      createdAt: new Date().toISOString(),
    });
    toast({ title: 'Alert Diakui', description: 'Alert telah ditandai sebagai diakui.' });
  }, [acknowledgeRvsmAlert, addRvsmAuditEntry, rvsmAlerts, currentUser, toast]);

  const handleAddFamilyAccess = useCallback(() => {
    if (!newFamily.familyMemberName || !newFamily.relationship || !newFamily.patientId) {
      toast({ title: 'Data Tidak Lengkap', description: 'Nama, hubungan, dan pasien wajib diisi.' });
      return;
    }
    const access: RVSMFamilyAccess = {
      id: genId('rfa'),
      patientId: newFamily.patientId,
      familyMemberId: genId('fam'),
      familyMemberName: newFamily.familyMemberName,
      relationship: newFamily.relationship,
      canViewActivity: newFamily.canViewActivity,
      canViewDeviceStatus: newFamily.canViewDeviceStatus,
      canViewHealthGraphs: newFamily.canViewHealthGraphs,
      canReceiveAlerts: newFamily.canReceiveAlerts,
      canViewSchedule: newFamily.canViewSchedule,
      grantedAt: new Date().toISOString(),
    };
    addRvsmFamilyAccess(access);
    addRvsmAuditEntry({
      id: genId('ra'),
      patientId: newFamily.patientId,
      action: 'family_access_granted',
      performedBy: currentUser?.name || 'Dokter',
      performedByRole: 'doctor',
      details: `Akses diberikan kepada ${newFamily.familyMemberName} (${newFamily.relationship})`,
      createdAt: new Date().toISOString(),
    });
    setNewFamily({
      familyMemberName: '', relationship: '', patientId: '',
      canViewActivity: true, canViewDeviceStatus: true, canViewHealthGraphs: true,
      canReceiveAlerts: true, canViewSchedule: true,
    });
    setShowAddFamily(false);
    toast({ title: 'Akses Diberikan', description: `Akses keluarga untuk ${access.familyMemberName} berhasil ditambahkan.` });
  }, [newFamily, addRvsmFamilyAccess, addRvsmAuditEntry, currentUser, toast]);

  const handleRemoveFamilyAccess = useCallback((accessId: string) => {
    const access = rvsmFamilyAccess.find(a => a.id === accessId);
    if (access) {
      removeRvsmFamilyAccess(accessId);
      addRvsmAuditEntry({
        id: genId('ra'),
        patientId: access.patientId,
        action: 'family_access_revoked',
        performedBy: currentUser?.name || 'Dokter',
        performedByRole: 'doctor',
        details: `Akses dicabut dari ${access.familyMemberName} (${access.relationship})`,
        createdAt: new Date().toISOString(),
      });
      toast({ title: 'Akses Dicabut', description: `Akses ${access.familyMemberName} telah dicabut.` });
    }
  }, [rvsmFamilyAccess, removeRvsmFamilyAccess, addRvsmAuditEntry, currentUser, toast]);

  const generateLocalSummary = useCallback(() => {
    if (!selectedPatient || !latestVitalData) return 'Data tidak tersedia untuk analisis.';
    const p = selectedPatient;
    const v = latestVitalData;
    let summary = `RINGKASAN MONITORING VITAL SIGNS\n`;
    summary += `Pasien: ${p.patientName || '-'} (RM: ${p.rmNumber || '-'})\n`;
    summary += `Diagnosa: ${p.primaryDiagnosis || '-'}\n\n`;
    summary += `DATA VITAL TERKINI\n`;
    summary += `Denyut Jantung: ${v.heartRate || '-'} bpm\n`;
    summary += `SpO2: ${v.oxygenSat || '-'}%\n`;
    summary += `Frekuensi Napas: ${v.respiratoryRate || '-'}/menit\n`;
    summary += `Tekanan Darah: ${v.systolicBP || '-'}/${v.diastolicBP || '-'} mmHg\n`;
    summary += `Suhu: ${v.estimatedCoreTemp || v.skinTemperature || '-'}°C\n\n`;
    summary += `ANALISIS\n`;
    if (v.oxygenSat && v.oxygenSat < 90) summary += `PERINGATAN: Hipoksemia terdeteksi (SpO2 ${v.oxygenSat}%)\n`;
    if (v.heartRate && v.heartRate > 100) summary += `PERINGATAN: Takikardia (HR ${v.heartRate} bpm)\n`;
    if (v.respiratoryRate && v.respiratoryRate > 24) summary += `PERINGATAN: Takipnea (RR ${v.respiratoryRate}/menit)\n`;
    summary += `\nREKOMENDASI\n`;
    summary += `- Lanjutkan monitoring tanda vital\n`;
    if (v.oxygenSat && v.oxygenSat < 90) summary += `- Evaluasi pemberian oksigen tambahan\n`;
    summary += `- Manajemen gejala sesuai kondisi\n`;
    return summary;
  }, [selectedPatient, latestVitalData]);

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
          vitalData: selectedPatientVitalData.slice(0, 24),
          rvsmMode: true,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setRvsmAiSummary(data.summary || data.analysis || 'Tidak ada hasil analisis.');
      } else {
        setRvsmAiSummary(generateLocalSummary());
      }
    } catch {
      setRvsmAiSummary(generateLocalSummary());
    }
    setAiLoading(false);
  }, [selectedPatient, selectedPatientVitalData, setRvsmAiSummary, generateLocalSummary]);

  const handleSendNotificationToChat = useCallback((alert: RVSMAlert) => {
    if (!alert.patientId) return;
    const patient = palliativePatients.find(p => p.id === alert.patientId);
    const roomId = `room-${alert.patientId}`;
    addPalliativeChatMessage({
      id: genId('msg'),
      roomId,
      senderId: currentUser?.id || 'system',
      senderName: 'Sistem RVSM',
      senderRole: 'system',
      type: 'clinical_alert',
      content: `[ALERT RVSM] ${alert.title}: ${alert.description}`,
      clinicalAlert: {
        id: alert.id,
        patientId: alert.patientId,
        alertType: 'ttv_abnormal',
        severity: alert.severity === 'critical' ? 'merah' : 'kuning',
        title: alert.title,
        description: alert.description,
        values: alert.values,
        isRead: false,
        createdAt: alert.createdAt,
      },
      status: 'sent',
      createdAt: new Date().toISOString(),
    });
    addPalliativeMonitoringNotification({
      id: genId('notif'),
      patientId: alert.patientId,
      patientName: patient?.patientName,
      type: 'ttv_abnormal',
      title: 'Alert RVSM Dikirim',
      description: `Alert "${alert.title}" dikirim ke ruang obrolan`,
      severity: alert.severity === 'critical' ? 'critical' : 'warning',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    toast({ title: 'Notifikasi Terkirim', description: 'Alert telah dikirim ke ruang obrolan pasien.' });
  }, [palliativePatients, currentUser, addPalliativeChatMessage, addPalliativeMonitoringNotification, toast]);

  const handleMarkAlertRead = useCallback((alertId: string) => {
    markRvsmAlertRead(alertId);
  }, [markRvsmAlertRead]);

  const handleExportPDF = useCallback(() => {
    toast({ title: 'Ekspor PDF', description: 'Data sedang disiapkan untuk diekspor sebagai PDF...' });
    setLastSavedAt(new Date().toISOString());
  }, [toast]);

  const handleExportExcel = useCallback(() => {
    toast({ title: 'Ekspor Excel', description: 'Data sedang disiapkan untuk diekspor sebagai Excel...' });
    setLastSavedAt(new Date().toISOString());
  }, [toast]);

  const handleAutoSave = useCallback(() => {
    setLastSavedAt(new Date().toISOString());
    toast({ title: 'Data Tersimpan', description: 'Data monitoring otomatis tersimpan.' });
  }, [toast]);

  // ── Vital sign status helpers ──
  const getHRStatus = (hr?: number) => getVitalSignStatus(hr, [60, 100], [50, 110]);
  const getSpO2Status = (spo2?: number) => {
    if (spo2 === undefined) return 'normal' as const;
    if (spo2 >= 95) return 'normal' as const;
    if (spo2 >= 90) return 'attention' as const;
    return 'critical' as const;
  };
  const getRRStatus = (rr?: number) => getVitalSignStatus(rr, [12, 20], [10, 24]);
  const getTemperatureStatus = (temp?: number) => getVitalSignStatus(temp, [36.0, 37.5], [35.0, 38.0]);
  const getBPStatus = (sys?: number, dia?: number) => {
    if (sys === undefined || dia === undefined) return 'normal' as const;
    if (sys >= 90 && sys <= 140 && dia >= 60 && dia <= 90) return 'normal' as const;
    if (sys >= 80 && sys <= 160 && dia >= 50 && dia <= 100) return 'attention' as const;
    return 'critical' as const;
  };

  const statusDotClass = (status: 'normal' | 'attention' | 'critical') => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'attention': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
    }
  };

  const statusBgClass = (status: 'normal' | 'attention' | 'critical') => {
    switch (status) {
      case 'normal': return 'bg-green-50 border-green-200';
      case 'attention': return 'bg-yellow-50 border-yellow-200';
      case 'critical': return 'bg-red-50 border-red-200';
    }
  };

  const statusTextClass = (status: 'normal' | 'attention' | 'critical') => {
    switch (status) {
      case 'normal': return 'text-green-700';
      case 'attention': return 'text-yellow-700';
      case 'critical': return 'text-red-700';
    }
  };

  // ── Patient Selector Component ──
  const renderPatientSelector = (value?: string, onChange?: (v: string) => void) => (
    <div className="w-full sm:w-64">
      <Select
        value={value || selectedPalliativePatientId || ''}
        onValueChange={onChange || handleSelectPatient}
      >
        <SelectTrigger>
          <SelectValue placeholder="Pilih pasien..." />
        </SelectTrigger>
        <SelectContent>
          {palliativePatients.filter(p => p.patientStatus === 'aktif').map(p => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', p.riskLevel === 'merah' ? 'bg-red-500' : p.riskLevel === 'kuning' ? 'bg-yellow-500' : 'bg-green-500')} />
                {p.patientName || p.rmNumber || p.id}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // ── Risk sort order for auto-sorting ──
  const riskSortOrder: Record<string, number> = { merah: 0, kuning: 1, hijau: 2 };

  // ── Sorted patient latest vitals (highest risk first) ──
  const sortedPatientLatestVitals = useMemo(() => {
    return [...patientLatestVitals].sort((a, b) => {
      const riskA = riskSortOrder[a.patient.riskLevel] ?? 3;
      const riskB = riskSortOrder[b.patient.riskLevel] ?? 3;
      if (riskA !== riskB) return riskA - riskB;
      // Secondary sort: patients with critical vitals come first
      const criticalA = [getHRStatus(a.latestVital?.heartRate), getSpO2Status(a.latestVital?.oxygenSat), getRRStatus(a.latestVital?.respiratoryRate)].includes('critical') ? 0 : 1;
      const criticalB = [getHRStatus(b.latestVital?.heartRate), getSpO2Status(b.latestVital?.oxygenSat), getRRStatus(b.latestVital?.respiratoryRate)].includes('critical') ? 0 : 1;
      return criticalA - criticalB;
    });
  }, [patientLatestVitals]);

  // ── Get monitoring status summary for a patient ──
  const getMonitoringStatus = useCallback((patientId: string): { label: string; className: string } => {
    const alerts = rvsmAlerts.filter(a => a.patientId === patientId && !a.isAcknowledged);
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const attentionCount = alerts.filter(a => a.severity === 'attention').length;
    if (criticalCount > 0) return { label: 'Kritis', className: 'bg-red-100 text-red-800 border-red-300' };
    if (attentionCount > 0) return { label: 'Perlu Perhatian', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    return { label: 'Normal', className: 'bg-green-100 text-green-800 border-green-300' };
  }, [rvsmAlerts]);

  // ── Get last PPS score for a patient ──
  const getLastPPSScore = useCallback((patientId: string): number | null => {
    const records = palliativeScreeningRecords.filter(r => r.palliativePatientId === patientId && r.screeningType === 'pps');
    if (records.length === 0) return null;
    return records.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())[0].score ?? null;
  }, [palliativeScreeningRecords]);

  // ── Get last ESAS score for a patient ──
  const getLastESASScore = useCallback((patientId: string): number | null => {
    const records = palliativeScreeningRecords.filter(r => r.palliativePatientId === patientId && r.screeningType === 'esas');
    if (records.length === 0) return null;
    return records.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())[0].score ?? null;
  }, [palliativeScreeningRecords]);

  // ── Open dashboard dialog ──
  const openDashboardDialog = useCallback((type: 'realtime' | 'tren' | 'skor-paliatif', patientId: string) => {
    setDashboardDialogType(type);
    setDashboardDialogPatientId(patientId);
  }, []);

  // ── Tab: Dashboard ──
  const renderDashboard = () => {
    // Count risk levels
    const riskCounts = {
      merah: palliativePatients.filter(p => p.patientStatus === 'aktif' && p.riskLevel === 'merah').length,
      kuning: palliativePatients.filter(p => p.patientStatus === 'aktif' && p.riskLevel === 'kuning').length,
      hijau: palliativePatients.filter(p => p.patientStatus === 'aktif' && p.riskLevel === 'hijau').length,
    };

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="min-w-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-700 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Pasien Dimonitor</p>
                  <p className="text-2xl font-bold">{dashboardStats.totalPatients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-green-100 text-green-700 shrink-0">
                  <Watch className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Perangkat Aktif</p>
                  <p className="text-2xl font-bold">{dashboardStats.activeDevices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0">
                  <Siren className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Alert Kritis</p>
                  <p className="text-2xl font-bold text-red-600">{dashboardStats.criticalAlerts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Alert Perhatian</p>
                  <p className="text-2xl font-bold text-yellow-600">{dashboardStats.attentionAlerts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Summary Bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium">Risiko Tinggi: {riskCounts.merah}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm font-medium">Risiko Sedang: {riskCounts.kuning}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Risiko Rendah: {riskCounts.hijau}</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Diurutkan berdasarkan risiko tertinggi
          </div>
        </div>

        {/* Patient Cards Grid with Action Buttons */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Dashboard Pasien</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
            {sortedPatientLatestVitals.map(({ patient, latestVital, device }) => {
              const hrStatus = getHRStatus(latestVital?.heartRate);
              const spo2Status = getSpO2Status(latestVital?.oxygenSat);
              const rrStatus = getRRStatus(latestVital?.respiratoryRate);
              const bpStatus = getBPStatus(latestVital?.systolicBP, latestVital?.diastolicBP);
              const tempStatus = getTemperatureStatus(latestVital?.estimatedCoreTemp || latestVital?.skinTemperature);
              const deviceConnected = device?.isConnected && device?.status === 'connected';
              const monitoringStatus = getMonitoringStatus(patient.id);
              const lastPPS = getLastPPSScore(patient.id);
              const riskBadge = patient.riskLevel === 'merah' ? { label: 'Tinggi', className: 'bg-red-100 text-red-800 border-red-300' } :
                    patient.riskLevel === 'kuning' ? { label: 'Sedang', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' } :
                    { label: 'Rendah', className: 'bg-green-100 text-green-800 border-green-300' };

              return (
                <Card
                  key={patient.id}
                  className={cn(
                    'transition-all hover:shadow-md border-2',
                    patient.riskLevel === 'merah' ? 'border-red-300 bg-red-50/30' :
                    patient.riskLevel === 'kuning' ? 'border-yellow-300 bg-yellow-50/30' :
                    'border-green-200 bg-green-50/20'
                  )}
                >
                  {/* Patient Header */}
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                          patient.riskLevel === 'merah' ? 'bg-red-200 text-red-800' :
                          patient.riskLevel === 'kuning' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        )}>
                          {(patient.patientName || 'P').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">{patient.patientName || patient.rmNumber}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{patient.primaryDiagnosis}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={cn('text-xs px-1.5 py-0', riskBadge.className)}>
                          {riskBadge.label}
                        </Badge>
                        <div className="flex items-center gap-0.5">
                          <span className={cn('w-2 h-2 rounded-full', deviceConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
                          <span className="text-xs text-muted-foreground">{deviceConnected ? 'Online' : 'Offline'}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Vital Signs Summary */}
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      <div className={cn('rounded-md p-1.5 border', statusBgClass(hrStatus))}>
                        <p className="text-[10px] text-muted-foreground">HR</p>
                        <p className={cn('text-sm font-bold', statusTextClass(hrStatus))}>{latestVital?.heartRate || '-'}</p>
                      </div>
                      <div className={cn('rounded-md p-1.5 border', statusBgClass(spo2Status))}>
                        <p className="text-[10px] text-muted-foreground">SpO2</p>
                        <p className={cn('text-sm font-bold', statusTextClass(spo2Status))}>{latestVital?.oxygenSat || '-'}</p>
                      </div>
                      <div className={cn('rounded-md p-1.5 border', statusBgClass(rrStatus))}>
                        <p className="text-[10px] text-muted-foreground">RR</p>
                        <p className={cn('text-sm font-bold', statusTextClass(rrStatus))}>{latestVital?.respiratoryRate || '-'}</p>
                      </div>
                      <div className={cn('rounded-md p-1.5 border', statusBgClass(bpStatus))}>
                        <p className="text-[10px] text-muted-foreground">TD</p>
                        <p className={cn('text-xs font-bold', statusTextClass(bpStatus))}>{latestVital?.systolicBP || '-'}/{latestVital?.diastolicBP || '-'}</p>
                      </div>
                      <div className={cn('rounded-md p-1.5 border', statusBgClass(tempStatus))}>
                        <p className="text-[10px] text-muted-foreground">Suhu</p>
                        <p className={cn('text-sm font-bold', statusTextClass(tempStatus))}>{latestVital?.estimatedCoreTemp || latestVital?.skinTemperature || '-'}</p>
                      </div>
                    </div>

                    {/* Status Summary Row */}
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', monitoringStatus.className)}>
                        {monitoringStatus.label}
                      </Badge>
                      {lastPPS !== null && (
                        <span className="text-muted-foreground">PPS: {lastPPS}%</span>
                      )}
                      {latestVital?.weight && (
                        <span className="text-muted-foreground">BB: {latestVital.weight} kg</span>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-8 text-xs gap-1',
                          deviceConnected ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        )}
                        onClick={(e) => { e.stopPropagation(); openDashboardDialog('realtime', patient.id); }}
                      >
                        <Activity className="w-3.5 h-3.5" /> Real-Time
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
                        onClick={(e) => { e.stopPropagation(); openDashboardDialog('tren', patient.id); }}
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Tren
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={(e) => { e.stopPropagation(); openDashboardDialog('skor-paliatif', patient.id); }}
                      >
                        <Brain className="w-3.5 h-3.5" /> Skor Paliatif
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Tab: Devices ──
  const renderDevices = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Perangkat Wearable</h3>
        <Button size="sm" onClick={() => setShowAddDevice(true)}>
          <Plus className="w-4 h-4 mr-1" /> Tambah Perangkat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
        {rvsmDevices.map(device => {
          const patient = palliativePatients.find(p => p.id === device.patientId);
          const statusInfo = getDeviceStatusLabel(device.status);
          const BatteryIcon = getBatteryIcon(device.batteryLevel);
          return (
            <Card key={device.id} className="border min-w-0">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Watch className="w-5 h-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-sm font-medium truncate">{device.deviceName}</CardTitle>
                  </div>
                  <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tipe</p>
                    <p className="font-medium truncate">{getDeviceTypeLabel(device.deviceType)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Pasien</p>
                    <p className="font-medium truncate">{patient?.patientName || '-'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Integrasi</p>
                    <p className="font-medium truncate">{getIntegrationMethodLabel(device.integrationMethod)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Serial</p>
                    <p className="font-medium text-xs truncate">{device.serialNumber || '-'}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BatteryIcon className={cn('w-5 h-5', getBatteryColor(device.batteryLevel))} />
                    <div className="flex-1 min-w-0">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            (device.batteryLevel || 0) <= 15 ? 'bg-red-500' :
                            (device.batteryLevel || 0) <= 30 ? 'bg-orange-500' :
                            (device.batteryLevel || 0) <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${device.batteryLevel || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{device.batteryLevel ?? '-'}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {device.isConnected ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sinkron: {device.lastSyncAt ? formatDateTime(device.lastSyncAt) : 'Belum'}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:text-red-700" onClick={() => handleRemoveDevice(device.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Device Dialog */}
      <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Tambah Perangkat Wearable</DialogTitle>
            <DialogDescription>Daftarkan perangkat wearable baru untuk monitoring pasien.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            <div>
              <Label>Nama Perangkat</Label>
              <Input
                value={newDevice.deviceName}
                onChange={e => setNewDevice(prev => ({ ...prev, deviceName: e.target.value }))}
                placeholder="cth: Apple Watch Series 9"
              />
            </div>
            <div>
              <Label>Tipe Perangkat</Label>
              <Select value={newDevice.deviceType} onValueChange={v => setNewDevice(prev => ({ ...prev, deviceType: v as WearableDeviceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['apple_watch', 'samsung_galaxy_watch', 'garmin_watch', 'huawei_watch', 'xiaomi_smart_band', 'fitbit', 'wear_os', 'bluetooth_health'] as WearableDeviceType[]).map(t => (
                    <SelectItem key={t} value={t}>{getDeviceTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metode Integrasi</Label>
              <Select value={newDevice.integrationMethod} onValueChange={v => setNewDevice(prev => ({ ...prev, integrationMethod: v as WearableIntegrationMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['apple_healthkit', 'google_health_connect', 'samsung_health', 'fitbit_api', 'bluetooth_health_device', 'rest_api'] as WearableIntegrationMethod[]).map(m => (
                    <SelectItem key={m} value={m}>{getIntegrationMethodLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pasien</Label>
              <Select value={newDevice.patientId} onValueChange={v => setNewDevice(prev => ({ ...prev, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih pasien..." /></SelectTrigger>
                <SelectContent>
                  {palliativePatients.filter(p => p.patientStatus === 'aktif').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.patientName || p.rmNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nomor Serial</Label>
              <Input
                value={newDevice.serialNumber}
                onChange={e => setNewDevice(prev => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="cth: AW9-2024-00123"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowAddDevice(false)}>Batal</Button>
            <Button onClick={handleAddDevice}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Tab: Real-time Monitoring ──
  const renderRealtime = () => {
    if (!selectedPatient) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Monitor className="w-12 h-12 mb-3" />
          <p>Pilih pasien untuk melihat monitoring real-time</p>
          <div className="mt-4">{renderPatientSelector()}</div>
        </div>
      );
    }

    const v = latestVitalData;
    const hrStatus = getHRStatus(v?.heartRate);
    const spo2Status = getSpO2Status(v?.oxygenSat);
    const rrStatus = getRRStatus(v?.respiratoryRate);
    const bpStatus = getBPStatus(v?.systolicBP, v?.diastolicBP);
    const tempStatus = getTemperatureStatus(v?.estimatedCoreTemp || v?.skinTemperature);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Monitoring Real-time</h3>
            <p className="text-sm text-muted-foreground">{selectedPatient.patientName} — {selectedPatient.primaryDiagnosis}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedPatientDevice && (
              <Badge variant="outline" className={cn('text-xs', getDeviceStatusLabel(selectedPatientDevice.status).className)}>
                {getDeviceStatusLabel(selectedPatientDevice.status).label}
              </Badge>
            )}
          </div>
        </div>

        {/* Live Vital Signs */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-red-500" /> Tanda Vital Langsung
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className={cn('border', statusBgClass(hrStatus))}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Denyut Jantung</p>
                <p className={cn('text-2xl font-bold', statusTextClass(hrStatus))}>{v?.heartRate || '-'}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
                {v?.heartRhythm && <p className="text-xs mt-1">{v.heartRhythm === 'normal_sinus' ? 'Sinus Normal' : v.heartRhythm === 'sinus_tachycardia' ? 'Takikardia' : v.heartRhythm === 'sinus_bradycardia' ? 'Bradikardia' : v.heartRhythm === 'atrial_fibrillation' ? 'FA' : 'Lainnya'}</p>}
                {v?.arrhythmiaDetected && <Badge variant="destructive" className="text-xs mt-1">Aritmia</Badge>}
              </CardContent>
            </Card>
            <Card className={cn('border', statusBgClass(spo2Status))}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">SpO2</p>
                <p className={cn('text-2xl font-bold', statusTextClass(spo2Status))}>{v?.oxygenSat || '-'}</p>
                <p className="text-xs text-muted-foreground">%</p>
              </CardContent>
            </Card>
            <Card className={cn('border', statusBgClass(rrStatus))}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Frekuensi Napas</p>
                <p className={cn('text-2xl font-bold', statusTextClass(rrStatus))}>{v?.respiratoryRate || '-'}</p>
                <p className="text-xs text-muted-foreground">/menit</p>
                {v?.respiratoryPattern && <p className="text-xs mt-1">{v.respiratoryPattern === 'normal' ? 'Normal' : v.respiratoryPattern === 'tachypneic' ? 'Takipnea' : v.respiratoryPattern === 'bradypneic' ? 'Bradipnea' : 'Tidak Teratur'}</p>}
                {v?.apneaEpisode && <Badge variant="destructive" className="text-xs mt-1">Apnea</Badge>}
              </CardContent>
            </Card>
            <Card className={cn('border', statusBgClass(bpStatus))}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tekanan Darah</p>
                <p className={cn('text-xl font-bold', statusTextClass(bpStatus))}>{v?.systolicBP || '-'}/{v?.diastolicBP || '-'}</p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </CardContent>
            </Card>
            <Card className={cn('border', statusBgClass(tempStatus))}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Suhu</p>
                <p className={cn('text-2xl font-bold', statusTextClass(tempStatus))}>{v?.estimatedCoreTemp || v?.skinTemperature || '-'}</p>
                <p className="text-xs text-muted-foreground">°C</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-500" /> Metrik Aktivitas
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border">
              <CardContent className="p-3 text-center">
                <Footprints className="w-4 h-4 mx-auto mb-1 text-teal-600" />
                <p className="text-xs text-muted-foreground">Langkah</p>
                <p className="text-xl font-bold">{v?.steps?.toLocaleString() || '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Jarak</p>
                <p className="text-xl font-bold">{v?.distance ? `${(v.distance / 1000).toFixed(1)} km` : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Durasi Jalan</p>
                <p className="text-xl font-bold">{v?.walkDuration ? `${v.walkDuration} menit` : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Level Aktivitas</p>
                <p className="text-xl font-bold">{v?.dailyActivityLevel === 'sedentary' ? 'Sangat Ringan' : v?.dailyActivityLevel === 'light' ? 'Ringan' : v?.dailyActivityLevel === 'moderate' ? 'Sedang' : v?.dailyActivityLevel === 'active' ? 'Aktif' : '-'}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobility Metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Hand className="w-4 h-4 text-orange-500" /> Metrik Mobilitas
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border">
              <CardContent className="p-3 text-center">
                <Armchair className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                <p className="text-xs text-muted-foreground">Durasi Duduk</p>
                <p className="text-xl font-bold">{v?.sittingDuration ? `${v.sittingDuration} menit` : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Durasi Berdiri</p>
                <p className="text-xl font-bold">{v?.standingDuration ? `${v.standingDuration} menit` : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <BedDouble className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                <p className="text-xs text-muted-foreground">Durasi Berbaring</p>
                <p className="text-xl font-bold">{v?.lyingDuration ? `${v.lyingDuration} menit` : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Perubahan Postur</p>
                <p className="text-xl font-bold">{v?.postureChangeCount ?? '-'}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sleep Metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4 text-purple-500" /> Metrik Tidur
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Durasi Tidur</p>
                <p className="text-xl font-bold">{v?.sleepDuration ? `${Math.round(v.sleepDuration / 60 * 10) / 10} jam` : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Kualitas</p>
                <p className="text-xl font-bold">{v?.sleepQuality === 'poor' ? 'Buruk' : v?.sleepQuality === 'fair' ? 'Cukup' : v?.sleepQuality === 'good' ? 'Baik' : v?.sleepQuality === 'excellent' ? 'Sangat Baik' : '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Gangguan</p>
                <p className="text-xl font-bold">{v?.sleepDisturbances ?? '-'}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Pola</p>
                <p className="text-xl font-bold">{v?.sleepPattern === 'normal' ? 'Normal' : v?.sleepPattern === 'insomnia' ? 'Insomnia' : v?.sleepPattern === 'hypersomnia' ? 'Hipersomnia' : v?.sleepPattern === 'fragmented' ? 'Fragmented' : '-'}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Symptom Metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Metrik Gejala
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Skor Nyeri</p>
                <p className={cn('text-xl font-bold', (v?.painScore || 0) >= 7 ? 'text-red-600' : (v?.painScore || 0) >= 4 ? 'text-yellow-600' : 'text-green-600')}>{v?.painScore ?? '-'}</p>
                <p className="text-xs text-muted-foreground">/10</p>
                {v?.painScore !== undefined && <Progress value={v.painScore * 10} className="mt-1 h-1.5" />}
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tingkat Stres</p>
                <p className={cn('text-xl font-bold', (v?.stressLevel || 0) >= 70 ? 'text-red-600' : (v?.stressLevel || 0) >= 40 ? 'text-yellow-600' : 'text-green-600')}>{v?.stressLevel ?? '-'}</p>
                <p className="text-xs text-muted-foreground">/100</p>
                {v?.stressLevel !== undefined && <Progress value={v.stressLevel} className="mt-1 h-1.5" />}
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tingkat Kelelahan</p>
                <p className={cn('text-xl font-bold', (v?.fatigueLevel || 0) >= 70 ? 'text-red-600' : (v?.fatigueLevel || 0) >= 40 ? 'text-yellow-600' : 'text-green-600')}>{v?.fatigueLevel ?? '-'}</p>
                <p className="text-xs text-muted-foreground">/100</p>
                {v?.fatigueLevel !== undefined && <Progress value={v.fatigueLevel} className="mt-1 h-1.5" />}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // ── Tab: Trends ──
  const renderTrends = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold">Tren Data Vital</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {renderPatientSelector(trendPatientId || selectedPalliativePatientId || '', (v) => { setTrendPatientId(v); setSelectedPalliativePatientId(v); })}
          <Select value={trendTimeRange} onValueChange={v => setTrendTimeRange(v as RVSMTimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Jam</SelectItem>
              <SelectItem value="7d">7 Hari</SelectItem>
              <SelectItem value="30d">30 Hari</SelectItem>
              <SelectItem value="90d">90 Hari</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {trendChartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Activity className="w-12 h-12 mb-3" />
          <p>Tidak ada data tren. Pilih pasien terlebih dahulu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
          {/* Heart Rate Chart */}
          <Card className="border min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-500" /> Denyut Jantung (bpm)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[40, 140]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} name="HR" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* SpO2 Chart */}
          <Card className="border min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" /> SpO2 (%)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="oxygenSat" stroke="#0ea5e9" strokeWidth={2} dot={false} name="SpO2" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Respiratory Rate Chart */}
          <Card className="border min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wind className="w-4 h-4 text-teal-500" /> Frekuensi Napas (/menit)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[8, 35]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="respiratoryRate" stroke="#14b8a6" strokeWidth={2} dot={false} name="RR" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Steps Chart */}
          <Card className="border min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Footprints className="w-4 h-4 text-orange-500" /> Langkah
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="steps" stroke="#f97316" strokeWidth={2} dot={false} name="Langkah" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sleep Duration Bar Chart */}
          <Card className="border xl:col-span-2 min-w-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-500" /> Durasi Tidur (jam)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendChartData.filter(d => d.sleepDuration !== undefined)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="sleepDuration" fill="#a855f7" name="Tidur (jam)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  // ── Tab: Palliative Score Integration ──
  const renderPalliativeScores = () => {
    if (!selectedPatient) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Brain className="w-12 h-12 mb-3" />
          <p>Pilih pasien untuk melihat estimasi skor paliatif</p>
          <div className="mt-4">{renderPatientSelector()}</div>
        </div>
      );
    }

    const estimate = selectedPatientEstimate;
    const actualPPS = selectedPatient.screeningRecords?.find(s => s.screeningType === 'pps');
    const actualESAS = selectedPatient.screeningRecords?.find(s => s.screeningType === 'esas');

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Integrasi Skor Paliatif</h3>
          <p className="text-sm text-muted-foreground">{selectedPatient.patientName} — Estimasi berdasarkan data wearable</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PPS Estimate */}
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Estimasi PPS</CardTitle>
              <CardDescription>Palliative Performance Scale</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {estimate?.ppsEstimate ? (
                <>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{estimate.ppsEstimate.currentEstimate}%</p>
                    {estimate.ppsEstimate.change !== undefined && (
                      <div className={cn('flex items-center justify-center gap-1 text-sm', estimate.ppsEstimate.change < 0 ? 'text-red-600' : 'text-green-600')}>
                        {estimate.ppsEstimate.change < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        {estimate.ppsEstimate.change > 0 ? '+' : ''}{estimate.ppsEstimate.change}% dari sebelumnya ({estimate.ppsEstimate.previousEstimate}%)
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kepercayaan</p>
                    <div className="flex items-center gap-2">
                      <Progress value={estimate.ppsEstimate.confidence * 100} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{Math.round(estimate.ppsEstimate.confidence * 100)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Faktor Kontribusi</p>
                    <ul className="text-xs space-y-1">
                      {estimate.ppsEstimate.factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada estimasi PPS</p>
              )}
              {/* Comparison with actual */}
              {actualPPS && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Skrining Aktual PPS</p>
                  <p className="text-sm font-medium">{actualPPS.score}% — {actualPPS.scoreLabel}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ESAS Estimate */}
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Estimasi ESAS-r</CardTitle>
              <CardDescription>Edmonton Symptom Assessment System</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {estimate?.esasEstimate ? (
                <>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{estimate.esasEstimate.estimatedTotalScore}</p>
                    <p className="text-sm text-muted-foreground">/90</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Kelelahan</span>
                        <span className="font-medium">{estimate.esasEstimate.fatigueLevel}/10</span>
                      </div>
                      <Progress value={estimate.esasEstimate.fatigueLevel * 10} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Gangguan Tidur</span>
                        <span className="font-medium">{estimate.esasEstimate.sleepDisturbance}/10</span>
                      </div>
                      <Progress value={estimate.esasEstimate.sleepDisturbance * 10} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Penurunan Aktivitas</span>
                        <span className="font-medium">{estimate.esasEstimate.activityDecline}/10</span>
                      </div>
                      <Progress value={estimate.esasEstimate.activityDecline * 10} className="h-2" />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada estimasi ESAS</p>
              )}
              {actualESAS && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Skrining Aktual ESAS</p>
                  <p className="text-sm font-medium">{actualESAS.score}/90 — {actualESAS.scoreLabel}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SPICT Estimate */}
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Estimasi SPICT</CardTitle>
              <CardDescription>Supportive & Palliative Care Indicators Tool</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {estimate?.spictEstimate ? (
                <>
                  <div className="text-center">
                    <Badge className={cn('text-lg px-4 py-1', getRiskLevelLabel(estimate.spictEstimate.deteriorationRisk).className)}>
                      Risiko {getRiskLevelLabel(estimate.spictEstimate.deteriorationRisk).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Indikator Perburukan</p>
                    <ul className="text-xs space-y-1">
                      {estimate.spictEstimate.indicators.map((ind, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada estimasi SPICT</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ── Tab: Early Warning System ──
  const renderEarlyWarning = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sistem Peringatan Dini</h3>
      </div>

      {/* Threshold Reference */}
      <Card className="border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" /> Ambang Batas Referensi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-2 rounded border bg-green-50">
              <p className="font-medium text-green-800">Denyut Jantung</p>
              <p>Normal: 60-100 bpm</p>
              <p>Perhatian: 50-110 bpm</p>
              <p>Kritis: &lt;50 atau &gt;110</p>
            </div>
            <div className="p-2 rounded border bg-green-50">
              <p className="font-medium text-green-800">SpO2</p>
              <p>Normal: ≥95%</p>
              <p>Perhatian: 90-94%</p>
              <p>Kritis: &lt;90%</p>
            </div>
            <div className="p-2 rounded border bg-green-50">
              <p className="font-medium text-green-800">Frekuensi Napas</p>
              <p>Normal: 12-20/menit</p>
              <p>Perhatian: 10-24/menit</p>
              <p>Kritis: &lt;10 atau &gt;24</p>
            </div>
            <div className="p-2 rounded border bg-green-50">
              <p className="font-medium text-green-800">Tekanan Darah</p>
              <p>Normal: 90-140/60-90</p>
              <p>Perhatian: 80-160/50-100</p>
              <p>Kritis: &lt;80 atau &gt;160</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm">Severity:</Label>
          <Select value={alertSeverityFilter} onValueChange={setAlertSeverityFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="critical">Kritis</SelectItem>
              <SelectItem value="attention">Perhatian</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Kategori:</Label>
          <Select value={alertCategoryFilter} onValueChange={setAlertCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="cardiovascular">Kardiovaskular</SelectItem>
              <SelectItem value="oxygenation">Oksigenasi</SelectItem>
              <SelectItem value="respiratory">Pernapasan</SelectItem>
              <SelectItem value="activity">Aktivitas</SelectItem>
              <SelectItem value="sleep">Tidur</SelectItem>
              <SelectItem value="mobility">Mobilitas</SelectItem>
              <SelectItem value="temperature">Suhu</SelectItem>
              <SelectItem value="pain">Nyeri</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerts List */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>Tidak ada alert aktif</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const severityInfo = getSeverityColor(alert.severity);
              const CategoryIcon = getCategoryIcon(alert.category);
              const isExpanded = expandedAlertId === alert.id;
              return (
                <Card key={alert.id} className={cn('border', severityInfo.border)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn('p-2 rounded-lg shrink-0', severityInfo.bg)}>
                          <CategoryIcon className={cn('w-5 h-5', severityInfo.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{alert.title}</p>
                            <Badge variant="outline" className={cn('text-xs', severityInfo.bg, severityInfo.text, severityInfo.border)}>
                              {getSeverityLabel(alert.severity)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(alert.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{alert.patientName || alert.patientId}</span>
                            <span>{formatDateTime(alert.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        {!alert.isAcknowledged && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAcknowledgeAlert(alert.id)}>
                            Akui
                          </Button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {alert.values && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Nilai:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(alert.values).map(([key, val]) => (
                                <Badge key={key} variant="outline" className="text-xs">{key}: {val}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {alert.threshold && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Ambang Batas: {alert.threshold.parameter} {alert.threshold.operator} {alert.threshold.value}</p>
                          </div>
                        )}
                        {alert.actualValue !== undefined && (
                          <p className="text-xs">Nilai Aktual: <span className="font-medium">{alert.actualValue}</span></p>
                        )}
                        {alert.isAcknowledged && (
                          <p className="text-xs text-green-600">Diakui oleh: {alert.acknowledgedBy} pada {alert.acknowledgedAt ? formatDateTime(alert.acknowledgedAt) : '-'}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ── Tab: Notifications ──
  const renderNotifications = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Notifikasi Monitoring</h3>

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {rvsmAlerts
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(alert => {
              const severityInfo = getSeverityColor(alert.severity);
              const CategoryIcon = getCategoryIcon(alert.category);
              return (
                <Card key={alert.id} className={cn('border', alert.isRead ? 'opacity-70' : '', severityInfo.border)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn('p-2 rounded-lg shrink-0', severityInfo.bg)}>
                          <CategoryIcon className={cn('w-4 h-4', severityInfo.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{alert.title}</p>
                            {!alert.isRead && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.patientName} — {formatDateTime(alert.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!alert.isRead && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkAlertRead(alert.id)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> Baca
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSendNotificationToChat(alert)}>
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> Chat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          {rvsmAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="w-8 h-8 mx-auto mb-2" />
              <p>Tidak ada notifikasi</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ── Tab: AI Assistant ──
  const renderAiAssistant = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asisten AI</h3>
          <p className="text-sm text-muted-foreground">Analisis AI berdasarkan data monitoring vital</p>
        </div>
        <Button onClick={handleAiAnalysis} disabled={aiLoading || !selectedPatient}>
          {aiLoading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Generate Analisis
        </Button>
      </div>

      {!selectedPatient && (
        <div className="mb-4">{renderPatientSelector()}</div>
      )}

      {/* AI Summary */}
      <Card className="border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" /> Ringkasan AI
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {rvsmAiSummary ? (
            <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/50 p-3 rounded-lg">{rvsmAiSummary}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">Klik "Generate Analisis" untuk menghasilkan ringkasan AI.</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Reports */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Laporan Harian AI</h4>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {selectedPatientReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada laporan harian</p>
            ) : (
              selectedPatientReports.map(report => (
                <Card key={report.id} className="border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Laporan {formatDate(report.reportDate)}</CardTitle>
                      <Badge variant="outline" className="text-xs">{report.patientName}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">HR Rata-rata</p>
                        <p className="font-medium">{report.avgHeartRate || '-'} bpm</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SpO2 Rata-rata</p>
                        <p className="font-medium">{report.avgSpO2 || '-'}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">RR Rata-rata</p>
                        <p className="font-medium">{report.avgRespiratoryRate || '-'}/menit</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Langkah</p>
                        <p className="font-medium">{report.stepsCount?.toLocaleString() || '-'}</p>
                      </div>
                    </div>
                    {report.aiSummary && (
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <p className="font-medium mb-1">Ringkasan AI:</p>
                        <p className="text-muted-foreground">{report.aiSummary}</p>
                      </div>
                    )}
                    {report.riskPrediction && (
                      <div>
                        <p className="text-xs font-medium mb-1">Prediksi Risiko:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Rawat Inap', value: report.riskPrediction.hospitalizationRisk },
                            { label: 'Perburukan Gejala', value: report.riskPrediction.symptomWorseningRisk },
                            { label: 'Penurunan PPS', value: report.riskPrediction.ppsDeclineRisk },
                            { label: 'Home Visit', value: report.riskPrediction.homeVisitNeedRisk },
                          ].map(item => (
                            <Badge key={item.label} variant="outline" className={cn('text-xs', getRiskLevelLabel(item.value).className)}>
                              {item.label}: {getRiskLevelLabel(item.value).label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  // ── Tab: Family Dashboard ──
  const renderFamily = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Akses Keluarga</h3>
        <Button size="sm" onClick={() => setShowAddFamily(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> Tambah Akses
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rvsmFamilyAccess.map(access => {
          const patient = palliativePatients.find(p => p.id === access.patientId);
          return (
            <Card key={access.id} className="border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{access.familyMemberName}</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:text-red-700" onClick={() => handleRemoveFamilyAccess(access.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {access.relationship} dari {patient?.patientName || access.patientId}
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={access.canViewActivity ? 'default' : 'outline'} className="text-xs">Lihat Aktivitas</Badge>
                  <Badge variant={access.canViewDeviceStatus ? 'default' : 'outline'} className="text-xs">Status Perangkat</Badge>
                  <Badge variant={access.canViewHealthGraphs ? 'default' : 'outline'} className="text-xs">Grafik Kesehatan</Badge>
                  <Badge variant={access.canReceiveAlerts ? 'default' : 'outline'} className="text-xs">Terima Alert</Badge>
                  <Badge variant={access.canViewSchedule ? 'default' : 'outline'} className="text-xs">Lihat Jadwal</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Diberikan: {formatDate(access.grantedAt)}</p>
              </CardContent>
            </Card>
          );
        })}
        {rvsmFamilyAccess.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p>Belum ada akses keluarga yang diberikan</p>
          </div>
        )}
      </div>

      {/* Add Family Access Dialog */}
      <Dialog open={showAddFamily} onOpenChange={setShowAddFamily}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Tambah Akses Keluarga</DialogTitle>
            <DialogDescription>Berikan akses monitoring kepada anggota keluarga.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            <div>
              <Label>Nama Anggota Keluarga</Label>
              <Input value={newFamily.familyMemberName} onChange={e => setNewFamily(prev => ({ ...prev, familyMemberName: e.target.value }))} placeholder="cth: Budi Rahayu" />
            </div>
            <div>
              <Label>Hubungan</Label>
              <Select value={newFamily.relationship} onValueChange={v => setNewFamily(prev => ({ ...prev, relationship: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih hubungan..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Suami">Suami</SelectItem>
                  <SelectItem value="Istri">Istri</SelectItem>
                  <SelectItem value="Anak">Anak</SelectItem>
                  <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                  <SelectItem value="Saudara">Saudara</SelectItem>
                  <SelectItem value="Pengasuh">Pengasuh</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pasien</Label>
              <Select value={newFamily.patientId} onValueChange={v => setNewFamily(prev => ({ ...prev, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih pasien..." /></SelectTrigger>
                <SelectContent>
                  {palliativePatients.filter(p => p.patientStatus === 'aktif').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.patientName || p.rmNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-medium">Perizinan</Label>
              <div className="space-y-2 mt-2">
                {[
                  { key: 'canViewActivity' as const, label: 'Lihat Aktivitas' },
                  { key: 'canViewDeviceStatus' as const, label: 'Status Perangkat' },
                  { key: 'canViewHealthGraphs' as const, label: 'Grafik Kesehatan' },
                  { key: 'canReceiveAlerts' as const, label: 'Terima Alert' },
                  { key: 'canViewSchedule' as const, label: 'Lihat Jadwal' },
                ].map(perm => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFamily[perm.key]}
                      onChange={e => setNewFamily(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowAddFamily(false)}>Batal</Button>
            <Button onClick={handleAddFamilyAccess}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Tab: Audit Trail ──
  const renderAudit = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Jejak Audit</h3>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter aksi..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              <SelectItem value="device_connected">Perangkat Terhubung</SelectItem>
              <SelectItem value="device_disconnected">Perangkat Terputus</SelectItem>
              <SelectItem value="data_received">Data Diterima</SelectItem>
              <SelectItem value="data_analyzed">Data Dianalisis</SelectItem>
              <SelectItem value="alert_generated">Alert Dihasilkan</SelectItem>
              <SelectItem value="alert_acknowledged">Alert Diakui</SelectItem>
              <SelectItem value="alert_viewed">Alert Dilihat</SelectItem>
              <SelectItem value="followup_action">Tindak Lanjut</SelectItem>
              <SelectItem value="report_generated">Laporan Dihasilkan</SelectItem>
              <SelectItem value="family_access_granted">Akses Diberikan</SelectItem>
              <SelectItem value="family_access_revoked">Akses Dicabut</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <div className="overflow-x-auto table-scroll-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Waktu</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuditLog.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell className="text-xs font-medium">{entry.performedBy}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{getRoleLabel(entry.performedByRole)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', getActionColor(entry.action))}>
                        {getActionLabel(entry.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{entry.details || '-'}</TableCell>
                  </TableRow>
                ))}
                {filteredAuditLog.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Tidak ada log audit
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // ── Tab: Medical Record Integration ──
  const renderMedicalRecords = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Integrasi Rekam Medis</h3>

      {/* Export Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-1" /> Ekspor PDF
        </Button>
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="w-4 h-4 mr-1" /> Ekspor Excel
        </Button>
        <Button variant="outline" onClick={handleAutoSave}>
          <Save className="w-4 h-4 mr-1" /> Simpan Manual
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <div className={cn('w-2 h-2 rounded-full', autoSaveEnabled ? 'bg-green-500' : 'bg-gray-400')} />
          <span className="text-xs text-muted-foreground">
            {autoSaveEnabled ? 'Auto-save Aktif' : 'Auto-save Nonaktif'}
          </span>
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground">
              Terakhir disimpan: {formatDateTime(lastSavedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Data Summary */}
      {selectedPatient ? (
        <div className="space-y-4">
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Ringkasan Data untuk Rekam Medis</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Pasien</p>
                  <p className="font-medium">{selectedPatient.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">No. RM</p>
                  <p className="font-medium">{selectedPatient.rmNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diagnosa</p>
                  <p className="font-medium">{selectedPatient.primaryDiagnosis}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Data Tanda Vital Terkini</p>
                {latestVitalData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 rounded border bg-muted/30">
                      <p className="text-muted-foreground">HR</p>
                      <p className="font-medium">{latestVitalData.heartRate || '-'} bpm</p>
                    </div>
                    <div className="p-2 rounded border bg-muted/30">
                      <p className="text-muted-foreground">SpO2</p>
                      <p className="font-medium">{latestVitalData.oxygenSat || '-'}%</p>
                    </div>
                    <div className="p-2 rounded border bg-muted/30">
                      <p className="text-muted-foreground">RR</p>
                      <p className="font-medium">{latestVitalData.respiratoryRate || '-'}/menit</p>
                    </div>
                    <div className="p-2 rounded border bg-muted/30">
                      <p className="text-muted-foreground">TD</p>
                      <p className="font-medium">{latestVitalData.systolicBP || '-'}/{latestVitalData.diastolicBP || '-'} mmHg</p>
                    </div>
                    <div className="p-2 rounded border bg-muted/30">
                      <p className="text-muted-foreground">Suhu</p>
                      <p className="font-medium">{latestVitalData.estimatedCoreTemp || latestVitalData.skinTemperature || '-'}°C</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada data vital</p>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Total Perangkat</p>
                  <p className="font-medium">{rvsmDevices.filter(d => d.patientId === selectedPatient.id).length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Data Vital</p>
                  <p className="font-medium">{selectedPatientVitalData.length} titik data</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Alert Aktif</p>
                  <p className="font-medium">{selectedPatientAlerts.filter(a => !a.isAcknowledged).length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Laporan Harian</p>
                  <p className="font-medium">{selectedPatientReports.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts for medical records */}
          {selectedPatientAlerts.length > 0 && (
            <Card className="border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">Alert Tercatat</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {selectedPatientAlerts.map(alert => (
                      <div key={alert.id} className="flex items-center gap-2 text-xs p-2 rounded border">
                        <Badge className={cn('text-xs', getSeverityColor(alert.severity).bg, getSeverityColor(alert.severity).text)}>
                          {getSeverityLabel(alert.severity)}
                        </Badge>
                        <span className="font-medium">{alert.title}</span>
                        <span className="text-muted-foreground ml-auto">{formatDateTime(alert.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Database className="w-12 h-12 mb-3" />
          <p>Pilih pasien untuk melihat ringkasan data rekam medis</p>
          <div className="mt-4">{renderPatientSelector()}</div>
        </div>
      )}
    </div>
  );

  // ── Main Render ──
  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as RVSMTab)} className="flex-1 flex flex-col">
        <div className="border-b px-4 pt-2 overflow-x-auto">
          <TabsList className="h-auto flex-wrap gap-1 bg-transparent">
            <TabsTrigger value="dashboard" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Monitor className="w-3.5 h-3.5 mr-1" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="devices" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Watch className="w-3.5 h-3.5 mr-1" /> Perangkat
            </TabsTrigger>
            <TabsTrigger value="realtime" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HeartPulse className="w-3.5 h-3.5 mr-1" /> Real-time
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Tren
            </TabsTrigger>
            <TabsTrigger value="palliative-scores" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Brain className="w-3.5 h-3.5 mr-1" /> Skor Paliatif
            </TabsTrigger>
            <TabsTrigger value="early-warning" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Peringatan Dini
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="w-3.5 h-3.5 mr-1" /> Notifikasi
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> AI
            </TabsTrigger>
            <TabsTrigger value="family" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-3.5 h-3.5 mr-1" /> Keluarga
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-3.5 h-3.5 mr-1" /> Audit
            </TabsTrigger>
            <TabsTrigger value="medical-records" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-3.5 h-3.5 mr-1" /> Rekam Medis
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="dashboard" className="mt-0 overflow-y-auto custom-scrollbar">{renderDashboard()}</TabsContent>
          <TabsContent value="devices" className="mt-0 overflow-y-auto custom-scrollbar">{renderDevices()}</TabsContent>
          <TabsContent value="realtime" className="mt-0 overflow-y-auto custom-scrollbar">{renderRealtime()}</TabsContent>
          <TabsContent value="trends" className="mt-0 overflow-y-auto custom-scrollbar">{renderTrends()}</TabsContent>
          <TabsContent value="palliative-scores" className="mt-0 overflow-y-auto custom-scrollbar">{renderPalliativeScores()}</TabsContent>
          <TabsContent value="early-warning" className="mt-0 overflow-y-auto custom-scrollbar">{renderEarlyWarning()}</TabsContent>
          <TabsContent value="notifications" className="mt-0 overflow-y-auto custom-scrollbar">{renderNotifications()}</TabsContent>
          <TabsContent value="ai-assistant" className="mt-0 overflow-y-auto custom-scrollbar">{renderAiAssistant()}</TabsContent>
          <TabsContent value="family" className="mt-0 overflow-y-auto custom-scrollbar">{renderFamily()}</TabsContent>
          <TabsContent value="audit" className="mt-0 overflow-y-auto custom-scrollbar">{renderAudit()}</TabsContent>
          <TabsContent value="medical-records" className="mt-0 overflow-y-auto custom-scrollbar">{renderMedicalRecords()}</TabsContent>
        </div>
      </Tabs>

      {/* ── Dashboard Quick-Action Dialogs ── */}

      {/* Real-Time Dialog */}
      <Dialog open={dashboardDialogType === 'realtime'} onOpenChange={(open) => { if (!open) setDashboardDialogType(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {(() => {
            const patient = palliativePatients.find(p => p.id === dashboardDialogPatientId);
            const device = rvsmDevices.find(d => d.patientId === dashboardDialogPatientId);
            const vitals = rvsmVitalData
              .filter(d => d.patientId === dashboardDialogPatientId)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const v = vitals[0] || null;
            const deviceConnected = device?.isConnected && device?.status === 'connected';

            if (!patient) return <DialogHeader><DialogTitle>Pasien tidak ditemukan</DialogTitle></DialogHeader>;

            const hrStatus = getHRStatus(v?.heartRate);
            const spo2Status = getSpO2Status(v?.oxygenSat);
            const rrStatus = getRRStatus(v?.respiratoryRate);
            const bpStatus = getBPStatus(v?.systolicBP, v?.diastolicBP);
            const tempStatus = getTemperatureStatus(v?.estimatedCoreTemp || v?.skinTemperature);

            return (
              <>
                <DialogHeader className="shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Real-Time Monitoring — {patient.patientName}
                  </DialogTitle>
                  <DialogDescription>
                    Data tanda vital real-time dari perangkat monitoring
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-3 h-3 rounded-full', deviceConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
                      <div>
                        <p className="text-sm font-medium">Status Koneksi: {deviceConnected ? 'Online' : 'Offline'}</p>
                        <p className="text-xs text-muted-foreground">
                          {device ? `${device.deviceName} (${getDeviceTypeLabel(device.deviceType)})` : 'Tidak ada perangkat terhubung'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Terakhir Sinkronisasi</p>
                      <p className="text-sm font-medium">{device?.lastSyncAt ? formatDateTime(device.lastSyncAt) : '-'}</p>
                    </div>
                  </div>

                  {/* Vital Signs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Card className={cn('border-2', statusBgClass(hrStatus))}>
                      <CardContent className="p-3 text-center">
                        <HeartPulse className={cn('w-5 h-5 mx-auto mb-1', statusTextClass(hrStatus))} />
                        <p className="text-xs text-muted-foreground">Tekanan Darah</p>
                        <p className={cn('text-2xl font-bold', statusTextClass(bpStatus))}>{v?.systolicBP || '-'}/{v?.diastolicBP || '-'}</p>
                        <p className="text-xs text-muted-foreground">mmHg</p>
                        <Badge variant="outline" className={cn('text-[10px] mt-1', statusBgClass(bpStatus))}>
                          {bpStatus === 'normal' ? 'Normal' : bpStatus === 'attention' ? 'Perhatian' : 'Kritis'}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-2', statusBgClass(hrStatus))}>
                      <CardContent className="p-3 text-center">
                        <HeartPulse className={cn('w-5 h-5 mx-auto mb-1', statusTextClass(hrStatus))} />
                        <p className="text-xs text-muted-foreground">Nadi (HR)</p>
                        <p className={cn('text-2xl font-bold', statusTextClass(hrStatus))}>{v?.heartRate || '-'}</p>
                        <p className="text-xs text-muted-foreground">bpm</p>
                        <Badge variant="outline" className={cn('text-[10px] mt-1', statusBgClass(hrStatus))}>
                          {hrStatus === 'normal' ? 'Normal' : hrStatus === 'attention' ? 'Perhatian' : 'Kritis'}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-2', statusBgClass(spo2Status))}>
                      <CardContent className="p-3 text-center">
                        <Droplets className={cn('w-5 h-5 mx-auto mb-1', statusTextClass(spo2Status))} />
                        <p className="text-xs text-muted-foreground">SpO2</p>
                        <p className={cn('text-2xl font-bold', statusTextClass(spo2Status))}>{v?.oxygenSat || '-'}</p>
                        <p className="text-xs text-muted-foreground">%</p>
                        <Badge variant="outline" className={cn('text-[10px] mt-1', statusBgClass(spo2Status))}>
                          {spo2Status === 'normal' ? 'Normal' : spo2Status === 'attention' ? 'Perhatian' : 'Kritis'}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-2', statusBgClass(rrStatus))}>
                      <CardContent className="p-3 text-center">
                        <Wind className={cn('w-5 h-5 mx-auto mb-1', statusTextClass(rrStatus))} />
                        <p className="text-xs text-muted-foreground">Frekuensi Napas</p>
                        <p className={cn('text-2xl font-bold', statusTextClass(rrStatus))}>{v?.respiratoryRate || '-'}</p>
                        <p className="text-xs text-muted-foreground">/menit</p>
                        <Badge variant="outline" className={cn('text-[10px] mt-1', statusBgClass(rrStatus))}>
                          {rrStatus === 'normal' ? 'Normal' : rrStatus === 'attention' ? 'Perhatian' : 'Kritis'}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-2', statusBgClass(tempStatus))}>
                      <CardContent className="p-3 text-center">
                        <Thermometer className={cn('w-5 h-5 mx-auto mb-1', statusTextClass(tempStatus))} />
                        <p className="text-xs text-muted-foreground">Suhu Tubuh</p>
                        <p className={cn('text-2xl font-bold', statusTextClass(tempStatus))}>{v?.estimatedCoreTemp || v?.skinTemperature || '-'}</p>
                        <p className="text-xs text-muted-foreground">°C</p>
                        <Badge variant="outline" className={cn('text-[10px] mt-1', statusBgClass(tempStatus))}>
                          {tempStatus === 'normal' ? 'Normal' : tempStatus === 'attention' ? 'Perhatian' : 'Kritis'}
                        </Badge>
                      </CardContent>
                    </Card>
                    <Card className="border-2">
                      <CardContent className="p-3 text-center">
                        <Activity className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Berat Badan</p>
                        <p className="text-2xl font-bold">{v?.weight || '-'}</p>
                        <p className="text-xs text-muted-foreground">kg</p>
                        {v?.weight && <Badge variant="outline" className="text-[10px] mt-1 bg-green-50">Tersedia</Badge>}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Auto-refresh indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Data diperbarui otomatis tanpa perlu refresh halaman
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Tren (Trend) Dialog */}
      <Dialog open={dashboardDialogType === 'tren'} onOpenChange={(open) => { if (!open) setDashboardDialogType(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          {(() => {
            const patient = palliativePatients.find(p => p.id === dashboardDialogPatientId);
            if (!patient) return <DialogHeader><DialogTitle>Pasien tidak ditemukan</DialogTitle></DialogHeader>;

            // Get trend data for this patient
            const trendData = rvsmVitalData
              .filter(d => d.patientId === dashboardDialogPatientId)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const now = Date.now();
            const rangeMs: Record<RVSMTimeRange, number> = {
              '24h': 24 * 3600000, '7d': 7 * 24 * 3600000, '30d': 30 * 24 * 3600000, '90d': 90 * 24 * 3600000,
            };
            const cutoff = now - rangeMs[dashboardTrendRange];
            const filteredData = trendData.filter(d => new Date(d.timestamp).getTime() >= cutoff);

            const chartData = filteredData.map(d => ({
              time: new Date(d.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              fullTime: formatDateTime(d.timestamp),
              heartRate: d.heartRate,
              oxygenSat: d.oxygenSat,
              respiratoryRate: d.respiratoryRate,
              systolicBP: d.systolicBP,
              diastolicBP: d.diastolicBP,
              temperature: d.estimatedCoreTemp || d.skinTemperature,
              weight: d.weight,
            }));

            // Calculate trend summary
            const getTrendDirection = (values: (number | undefined)[]): 'Stabil' | 'Meningkat' | 'Menurun' | 'Fluktuatif' => {
              const nums = values.filter((v): v is number => v !== undefined);
              if (nums.length < 2) return 'Stabil';
              const firstHalf = nums.slice(0, Math.floor(nums.length / 2));
              const secondHalf = nums.slice(Math.floor(nums.length / 2));
              const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
              const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
              const diff = avgSecond - avgFirst;
              const pctChange = avgFirst !== 0 ? Math.abs(diff / avgFirst) * 100 : 0;
              if (pctChange < 5) return 'Stabil';
              if (diff > 0) return 'Meningkat';
              return 'Menurun';
            };

            const hrTrend = getTrendDirection(chartData.map(d => d.heartRate));
            const spo2Trend = getTrendDirection(chartData.map(d => d.oxygenSat));
            const rrTrend = getTrendDirection(chartData.map(d => d.respiratoryRate));
            const tempTrend = getTrendDirection(chartData.map(d => d.temperature));
            const bpTrend = getTrendDirection(chartData.map(d => d.systolicBP));
            const weightTrend = getTrendDirection(chartData.map(d => d.weight));

            const trendIcon = (trend: string) => {
              if (trend === 'Meningkat') return <TrendingUp className="w-3.5 h-3.5 text-red-500" />;
              if (trend === 'Menurun') return <TrendingDown className="w-3.5 h-3.5 text-blue-500" />;
              if (trend === 'Fluktuatif') return <Activity className="w-3.5 h-3.5 text-yellow-500" />;
              return <Minus className="w-3.5 h-3.5 text-green-500" />;
            };

            const trendColor = (trend: string) => {
              if (trend === 'Stabil') return 'text-green-700 bg-green-50';
              if (trend === 'Meningkat') return 'text-red-700 bg-red-50';
              if (trend === 'Menurun') return 'text-blue-700 bg-blue-50';
              return 'text-yellow-700 bg-yellow-50';
            };

            return (
              <>
                <DialogHeader className="shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    Tren Tanda Vital — {patient.patientName}
                  </DialogTitle>
                  <DialogDescription>
                    Grafik dan analisis tren tanda vital pasien
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {/* Time Range Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['24h', '7d', '30d', '90d'] as RVSMTimeRange[]).map(range => (
                      <Button
                        key={range}
                        size="sm"
                        variant={dashboardTrendRange === range ? 'default' : 'outline'}
                        className="h-7 text-xs"
                        onClick={() => setDashboardTrendRange(range)}
                      >
                        {range === '24h' ? '24 Jam' : range === '7d' ? '7 Hari' : range === '30d' ? '30 Hari' : '90 Hari'}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 ml-auto"
                      onClick={() => toast({ title: 'Ekspor PDF', description: 'Laporan tren sedang disiapkan...' })}
                    >
                      <Download className="w-3 h-3" /> Ekspor PDF
                    </Button>
                  </div>

                  {/* Trend Summary */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { label: 'Nadi', trend: hrTrend },
                      { label: 'SpO2', trend: spo2Trend },
                      { label: 'RR', trend: rrTrend },
                      { label: 'Suhu', trend: tempTrend },
                      { label: 'TD', trend: bpTrend },
                      { label: 'BB', trend: weightTrend },
                    ].map(({ label, trend }) => (
                      <div key={label} className={cn('rounded-md p-2 border text-center', trendColor(trend))}>
                        <p className="text-[10px] font-medium">{label}</p>
                        <div className="flex items-center justify-center gap-1">
                          {trendIcon(trend)}
                          <p className="text-xs font-bold">{trend}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  {chartData.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                      <Activity className="w-10 h-10 mb-2" />
                      <p className="text-sm">Tidak ada data untuk rentang waktu ini</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Blood Pressure Chart */}
                      <Card className="border">
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium flex items-center gap-1">
                            <HeartPulse className="w-3.5 h-3.5 text-red-500" /> Tekanan Darah (mmHg)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="w-full overflow-hidden">
                          <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                              <YAxis domain={[60, 180]} tick={{ fontSize: 9 }} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Line type="monotone" dataKey="systolicBP" stroke="#ef4444" strokeWidth={2} dot={false} name="Sistolik" />
                              <Line type="monotone" dataKey="diastolicBP" stroke="#f97316" strokeWidth={2} dot={false} name="Diastolik" />
                              {/* Normal range indicator */}
                            </LineChart>
                          </ResponsiveContainer>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Normal (90-140/60-90)</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Perhatian</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Kritis</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* HR & SpO2 Charts */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border">
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium flex items-center gap-1">
                              <HeartPulse className="w-3.5 h-3.5 text-red-500" /> Nadi (bpm)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="w-full overflow-hidden">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis domain={[40, 140]} tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} name="HR" />
                              </LineChart>
                            </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border">
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium flex items-center gap-1">
                              <Droplets className="w-3.5 h-3.5 text-sky-500" /> SpO2 (%)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="w-full overflow-hidden">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis domain={[80, 100]} tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="oxygenSat" stroke="#0ea5e9" strokeWidth={2} dot={false} name="SpO2" />
                              </LineChart>
                            </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* RR & Temperature Charts */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border">
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium flex items-center gap-1">
                              <Wind className="w-3.5 h-3.5 text-teal-500" /> Frekuensi Napas (/menit)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="w-full overflow-hidden">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis domain={[8, 35]} tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="respiratoryRate" stroke="#14b8a6" strokeWidth={2} dot={false} name="RR" />
                              </LineChart>
                            </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border">
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium flex items-center gap-1">
                              <Thermometer className="w-3.5 h-3.5 text-orange-500" /> Suhu Tubuh (°C)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="w-full overflow-hidden">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis domain={[35, 40]} tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={false} name="Suhu" />
                              </LineChart>
                            </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Weight Chart */}
                      {chartData.some(d => d.weight !== undefined) && (
                        <Card className="border">
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-medium flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-purple-500" /> Berat Badan (kg)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="w-full overflow-hidden">
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart data={chartData.filter(d => d.weight !== undefined)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 9 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={2} dot={false} name="BB" />
                              </LineChart>
                            </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Color Legend */}
                  <div className="flex items-center gap-4 text-xs pt-2 border-t">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Hijau = Normal</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> Kuning = Perlu Perhatian</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Merah = Di Luar Batas Aman</span>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Skor Paliatif Dialog */}
      <Dialog open={dashboardDialogType === 'skor-paliatif'} onOpenChange={(open) => { if (!open) setDashboardDialogType(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          {(() => {
            const patient = palliativePatients.find(p => p.id === dashboardDialogPatientId);
            if (!patient) return <DialogHeader><DialogTitle>Pasien tidak ditemukan</DialogTitle></DialogHeader>;

            // Get screening records for this patient
            const screeningRecords = palliativeScreeningRecords
              .filter(r => r.palliativePatientId === dashboardDialogPatientId)
              .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

            const ppsRecords = screeningRecords.filter(r => r.screeningType === 'pps');
            const esasRecords = screeningRecords.filter(r => r.screeningType === 'esas');
            const spictRecords = screeningRecords.filter(r => r.screeningType === 'spict');
            const distressRecords = screeningRecords.filter(r => r.screeningType === 'distress');

            // Get RVSM estimate
            const estimate = rvsmPalliativeEstimates.find(e => e.patientId === dashboardDialogPatientId);

            // Determine interpretation
            const latestPPS = ppsRecords[0];
            const latestESAS = esasRecords[0];
            const latestDistress = distressRecords[0];

            const getOverallInterpretation = (): { text: string; className: string; icon: React.ReactNode } => {
              const ppsScore = latestPPS?.score;
              const esasScore = latestESAS?.score;
              const distressScore = latestDistress?.score;

              if (ppsScore !== undefined && ppsScore <= 30) return {
                text: 'Memerlukan intervensi segera',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: <Siren className="w-4 h-4 text-red-600" />,
              };
              if (distressScore !== undefined && distressScore >= 8) return {
                text: 'Memerlukan intervensi segera',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: <Siren className="w-4 h-4 text-red-600" />,
              };
              if ((esasScore !== undefined && esasScore >= 40) || (ppsScore !== undefined && ppsScore <= 50)) return {
                text: 'Risiko penurunan fungsi',
                className: 'bg-orange-100 text-orange-800 border-orange-300',
                icon: <TrendingDown className="w-4 h-4 text-orange-600" />,
              };
              if ((esasScore !== undefined && esasScore >= 20) || (distressScore !== undefined && distressScore >= 4)) return {
                text: 'Membutuhkan evaluasi lanjutan',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
              };
              return {
                text: 'Kondisi stabil',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
              };
            };

            const interpretation = getOverallInterpretation();
            const isSignificantDecline = interpretation.text === 'Memerlukan intervensi segera';

            // Score trend chart data
            const scoreTrendData = [...screeningRecords]
              .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime())
              .map(r => ({
                time: formatDate(r.performedAt),
                type: r.screeningType,
                score: r.score,
              }));

            return (
              <>
                <DialogHeader className="shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Skor Paliatif — {patient.patientName}
                  </DialogTitle>
                  <DialogDescription>
                    Hasil penilaian kondisi pasien paliatif secara terintegrasi
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {/* Overall Interpretation */}
                  <div className={cn('flex items-center gap-3 p-4 rounded-lg border', interpretation.className)}>
                    {interpretation.icon}
                    <div>
                      <p className="font-semibold">{interpretation.text}</p>
                      <p className="text-xs">Interpretasi otomatis berdasarkan skor terkini</p>
                    </div>
                    {isSignificantDecline && (
                      <Badge variant="destructive" className="ml-auto text-xs">Prioritas Pemantauan</Badge>
                    )}
                  </div>

                  {/* Score Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* PPS */}
                    <Card className="border">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium">PPS</CardTitle>
                        <CardDescription className="text-[10px]">Palliative Performance Scale</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-center">
                        {latestPPS ? (
                          <>
                            <p className={cn('text-3xl font-bold', (latestPPS.score || 0) <= 40 ? 'text-red-600' : (latestPPS.score || 0) <= 60 ? 'text-yellow-600' : 'text-green-600')}>
                              {latestPPS.score}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">{latestPPS.scoreLabel || ''}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(latestPPS.performedAt)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">Belum ada data</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* ESAS-r */}
                    <Card className="border">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium">ESAS-r</CardTitle>
                        <CardDescription className="text-[10px]">Edmonton Symptom Assessment</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-center">
                        {latestESAS ? (
                          <>
                            <p className={cn('text-3xl font-bold', (latestESAS.score || 0) >= 40 ? 'text-red-600' : (latestESAS.score || 0) >= 20 ? 'text-yellow-600' : 'text-green-600')}>
                              {latestESAS.score}/90
                            </p>
                            <p className="text-[10px] text-muted-foreground">{latestESAS.scoreLabel || ''}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(latestESAS.performedAt)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">Belum ada data</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* SPICT */}
                    <Card className="border">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium">SPICT</CardTitle>
                        <CardDescription className="text-[10px]">SPICT Screening</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-center">
                        {spictRecords[0] ? (
                          <>
                            <p className={cn('text-3xl font-bold', spictRecords[0].scoreLabel?.includes('Positif') ? 'text-red-600' : 'text-green-600')}>
                              {spictRecords[0].score ?? '-'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{spictRecords[0].scoreLabel || ''}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(spictRecords[0].performedAt)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">Belum ada data</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Distress Thermometer */}
                    <Card className="border">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium">Distress</CardTitle>
                        <CardDescription className="text-[10px]">Distress Thermometer</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-center">
                        {latestDistress ? (
                          <>
                            <p className={cn('text-3xl font-bold', (latestDistress.score || 0) >= 8 ? 'text-red-600' : (latestDistress.score || 0) >= 4 ? 'text-yellow-600' : 'text-green-600')}>
                              {latestDistress.score}/10
                            </p>
                            <p className="text-[10px] text-muted-foreground">{latestDistress.scoreLabel || ''}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(latestDistress.performedAt)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">Belum ada data</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Karnofsky (optional placeholder) */}
                    <Card className="border border-dashed">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Karnofsky</CardTitle>
                        <CardDescription className="text-[10px]">Performance Status (opsional)</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-center">
                        <p className="text-sm text-muted-foreground py-2">Belum dinilai</p>
                      </CardContent>
                    </Card>

                    {/* ECOG (optional placeholder) */}
                    <Card className="border border-dashed">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground">ECOG</CardTitle>
                        <CardDescription className="text-[10px]">Performance Status (opsional)</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-center">
                        <p className="text-sm text-muted-foreground py-2">Belum dinilai</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Score Trend Chart */}
                  {scoreTrendData.length >= 2 && (
                    <Card className="border">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Tren Perubahan Skor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={scoreTrendData.filter(d => d.type === 'pps' || d.type === 'esas')}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} name="Skor" />
                          </LineChart>
                        </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Screening History */}
                  {screeningRecords.length > 0 && (
                    <Card className="border">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium">Riwayat Skrining</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <ScrollArea className="max-h-[200px]">
                          <div className="space-y-1.5">
                            {screeningRecords.slice(0, 10).map(record => (
                              <div key={record.id} className="flex items-center gap-2 text-xs p-1.5 rounded border bg-muted/20">
                                <Badge variant="outline" className={cn('text-[10px] px-1 py-0', record.ewsLevel === 'merah' ? 'bg-red-100 text-red-800' : record.ewsLevel === 'kuning' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}>
                                  {record.screeningType.toUpperCase()}
                                </Badge>
                                <span className="font-medium">Skor: {record.score ?? '-'}</span>
                                <span className="text-muted-foreground truncate">{record.scoreLabel || record.interpretation || ''}</span>
                                <span className="text-muted-foreground ml-auto shrink-0">{formatDate(record.performedAt)}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Significant Decline Notification */}
                  {isSignificantDecline && (
                    <Alert variant="destructive">
                      <Siren className="w-4 h-4" />
                      <AlertTitle>Penurunan Signifikan Terdeteksi</AlertTitle>
                      <AlertDescription>
                        Skor pasien menunjukkan penurunan signifikan. Sistem telah memberikan notifikasi kepada dokter dan menandai pasien sebagai prioritas pemantauan.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
