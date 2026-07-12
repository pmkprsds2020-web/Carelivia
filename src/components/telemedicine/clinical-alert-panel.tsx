'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type {
  PalliativeClinicalAlert,
  ClinicalAlertSeverity,
  ClinicalAlertStatus,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Activity,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Bell,
  Search,
  RefreshCw,
  Sparkles,
  MessageCircle,
  FileText,
  Stethoscope,
  Home,
  Clock,
  User,
  AlertCircle,
  Flame,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  ClinicalAlertSeverity,
  { label: string; color: string; bg: string; border: string; icon: typeof Flame }
> = {
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: Flame,
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    icon: AlertCircle,
  },
  LOW: {
    label: 'Low',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-500',
    icon: Bell,
  },
};

const STATUS_CONFIG: Record<ClinicalAlertStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: 'bg-red-100 text-red-800' },
  ACKNOWLEDGED: { label: 'Diakui', color: 'bg-blue-100 text-blue-800' },
  RESOLVED: { label: 'Selesai', color: 'bg-gray-100 text-gray-800' },
};

const SEVERITY_ORDER: Record<ClinicalAlertSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#9ca3af'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getSourceLabel(source?: string): string {
  const map: Record<string, string> = {
    vital_signs: 'TTV',
    screenings: 'Skrining',
    medications: 'Obat',
    nutrition: 'Nutrisi',
    daily_complaints: 'Keluhan Harian',
    social_assessments: 'Sosial',
    ai: 'AI',
    manual: 'Manual',
  };
  return map[source ?? ''] ?? source ?? '-';
}

// ── Main Component ──────────────────────────────────────────────────────────

interface ClinicalAlertPanelProps {
  palliativePatientId?: string;
}

export function ClinicalAlertPanel({ palliativePatientId }: ClinicalAlertPanelProps) {
  const { toast } = useToast();
  const {
    palliativeClinicalAlerts,
    palliativePatients,
    currentUser,
    acknowledgePalliativeAlert,
    resolvePalliativeAlert,
    addPalliativeAlertNote,
    forceRunClinicalAlertEngine,
    setSelectedPalliativePatientId,
  } = useStore();

  // ── State ──────────────────────────────────────────────────────────────
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<PalliativeClinicalAlert | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────
  const allAlerts = useMemo(() => {
    // If a specific patient is selected, show only their alerts.
    // Otherwise show all alerts across all patients.
    if (palliativePatientId) {
      return palliativeClinicalAlerts.filter(
        (a) => a.palliativePatientId === palliativePatientId || a.patientId === palliativePatientId
      );
    }
    return palliativeClinicalAlerts;
  }, [palliativeClinicalAlerts, palliativePatientId]);

  const filteredAlerts = useMemo(() => {
    let result = [...allAlerts];

    // Filter by patient (cross-patient view only)
    if (!palliativePatientId && filterPatient !== 'all') {
      result = result.filter(
        (a) => a.palliativePatientId === filterPatient || a.patientId === filterPatient
      );
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      result = result.filter((a) => a.severityLevel === filterSeverity);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    } else if (!showResolved) {
      // By default, hide resolved alerts
      result = result.filter((a) => a.status !== 'RESOLVED');
    }

    // Filter by category
    if (filterCategory !== 'all') {
      result = result.filter((a) => a.kategori === filterCategory);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.kategori ?? '').toLowerCase().includes(q)
      );
    }

    // Sort: severity first (CRITICAL > HIGH > MEDIUM > LOW), then newest
    result.sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severityLevel ?? 'LOW'] ?? 99;
      const sb = SEVERITY_ORDER[b.severityLevel ?? 'LOW'] ?? 99;
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [allAlerts, filterPatient, filterSeverity, filterStatus, filterCategory, searchQuery, palliativePatientId, showResolved]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = allAlerts.filter((a) => a.status !== 'RESOLVED');
    return {
      critical: active.filter((a) => a.severityLevel === 'CRITICAL').length,
      high: active.filter((a) => a.severityLevel === 'HIGH').length,
      medium: active.filter((a) => a.severityLevel === 'MEDIUM').length,
      low: active.filter((a) => a.severityLevel === 'LOW').length,
      resolved: allAlerts.filter((a) => a.status === 'RESOLVED').length,
      total: allAlerts.length,
    };
  }, [allAlerts]);

  // Chart data: alerts by category
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    allAlerts.forEach((a) => {
      const cat = a.kategori ?? 'Lainnya';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allAlerts]);

  // Chart data: alerts by severity (pie)
  const severityChartData = useMemo(() => {
    return [
      { name: 'Critical', value: stats.critical },
      { name: 'High', value: stats.high },
      { name: 'Medium', value: stats.medium },
      { name: 'Low', value: stats.low },
      { name: 'Resolved', value: stats.resolved },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    allAlerts.forEach((a) => { if (a.kategori) set.add(a.kategori); });
    return Array.from(set).sort();
  }, [allAlerts]);

  // Active alert count for the badge
  const activeCount = stats.critical + stats.high + stats.medium + stats.low;

  // ── Actions ────────────────────────────────────────────────────────────
  const handleAcknowledge = useCallback(async () => {
    if (!selectedAlert) return;
    const doctorId = currentUser?.id ?? 'doctor';
    const doctorName = currentUser?.name ?? 'Dokter';
    try {
      acknowledgePalliativeAlert(selectedAlert.id, doctorName);
      toast({ title: 'Alert Diakui', description: `Alert "${selectedAlert.title}" telah di-acknowledge.` });
      setSelectedAlert(null);
      setNoteText('');
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal acknowledge alert.', variant: 'destructive' });
    }
  }, [selectedAlert, currentUser, acknowledgePalliativeAlert, toast]);

  const handleResolve = useCallback(async () => {
    if (!selectedAlert) return;
    const doctorName = currentUser?.name ?? 'Dokter';
    try {
      resolvePalliativeAlert(selectedAlert.id, doctorName, noteText || undefined);
      toast({ title: 'Alert Selesai', description: `Alert "${selectedAlert.title}" telah diselesaikan.` });
      setSelectedAlert(null);
      setNoteText('');
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal resolve alert.', variant: 'destructive' });
    }
  }, [selectedAlert, currentUser, resolvePalliativeAlert, noteText, toast]);

  const handleAddNote = useCallback(() => {
    if (!selectedAlert || !noteText.trim()) return;
    addPalliativeAlertNote(selectedAlert.id, noteText.trim());
    toast({ title: 'Catatan Ditambahkan', description: 'Catatan telah ditambahkan ke alert.' });
    setNoteText('');
  }, [selectedAlert, noteText, addPalliativeAlertNote, toast]);

  const handleScan = useCallback(async () => {
    const patientId = palliativePatientId ?? filterPatient;
    if (!patientId || patientId === 'all') {
      toast({ title: 'Pilih Pasien', description: 'Pilih pasien terlebih dahulu untuk menjalankan scan.', variant: 'destructive' });
      return;
    }
    setIsScanning(true);
    try {
      // Use the FORCE version (bypasses throttle) for the manual Scan button.
      const created = await forceRunClinicalAlertEngine(patientId);
      toast({
        title: created > 0 ? `${created} Alert Baru` : 'Scan Selesai',
        description: created > 0 ? `${created} alert baru terdeteksi dan tersimpan ke Supabase.` : 'Tidak ada alert baru terdeteksi. Alert lama yang kondisinya sudah normal akan otomatis di-resolve.',
      });
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal menjalankan scan alert.', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  }, [palliativePatientId, filterPatient, forceRunClinicalAlertEngine, toast]);

  const handleCleanupDuplicates = useCallback(async () => {
    setIsScanning(true);
    try {
      const { clinicalAlertService } = await import('@/services/supabase/clinicalAlertService');
      const deleted = await clinicalAlertService.cleanupDuplicates();
      toast({
        title: deleted > 0 ? `${deleted} Duplikat Dihapus` : 'Tidak Ada Duplikat',
        description: deleted > 0
          ? `${deleted} alert duplikat berhasil dihapus. Hanya alert terlama per kategori yang dipertahankan.`
          : 'Tidak ditemukan alert duplikat aktif. Database sudah bersih.',
      });
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal membersihkan duplikat.', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  }, [toast]);

  const handleAIAnalysis = useCallback(async () => {
    const patientId = palliativePatientId ?? filterPatient;
    if (!patientId || patientId === 'all') {
      toast({ title: 'Pilih Pasien', description: 'Pilih pasien untuk analisis AI.', variant: 'destructive' });
      return;
    }
    const patient = palliativePatients.find((p) => p.id === patientId);
    setIsGeneratingAI(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/clinical-alerts/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, patientName: patient?.patientName ?? 'Pasien' }),
      });
      if (!res.ok) throw new Error('AI analysis failed');
      const data = await res.json();
      setAiAnalysis(data.analysis);
      toast({ title: 'Analisis AI Selesai', description: `Analisis ${data.alertCount ?? ''} alert berhasil dibuat.` });
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal membuat analisis AI.', variant: 'destructive' });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [palliativePatientId, filterPatient, palliativePatients, toast]);

  const handleOpenChat = useCallback(() => {
    if (!selectedAlert) return;
    const pid = selectedAlert.palliativePatientId ?? selectedAlert.patientId;
    if (pid) {
      setSelectedPalliativePatientId(pid);
    }
    toast({ title: 'Chat Dibuka', description: 'Pasien telah dipilih. Buka tab Chat untuk berkonsultasi.' });
    setSelectedAlert(null);
  }, [selectedAlert, setSelectedPalliativePatientId, toast]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Clinical Alert — Early Warning System</h2>
          {activeCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {activeCount} Aktif
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleScan} disabled={isScanning}>
            <RefreshCw className={cn('w-4 h-4 mr-1', isScanning && 'animate-spin')} />
            Scan Alert
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupDuplicates}
            disabled={isScanning}
            title="Hapus alert duplikat — hanya simpan satu alert aktif per kategori per pasien"
          >
            <ShieldCheck className="w-4 h-4 mr-1" />
            Bersihkan Duplikat
          </Button>
          <Button variant="default" size="sm" onClick={handleAIAnalysis} disabled={isGeneratingAI}>
            <Sparkles className="w-4 h-4 mr-1" />
            Analisis AI
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Critical" value={stats.critical} icon={Flame} color="text-red-600" bg="bg-red-50" border="border-red-200" />
        <StatCard label="High" value={stats.high} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" border="border-orange-200" />
        <StatCard label="Medium" value={stats.medium} icon={AlertCircle} color="text-yellow-600" bg="bg-yellow-50" border="border-yellow-200" />
        <StatCard label="Low" value={stats.low} icon={Bell} color="text-green-600" bg="bg-green-50" border="border-green-200" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} color="text-gray-600" bg="bg-gray-50" border="border-gray-200" />
      </div>

      {/* Charts */}
      {allAlerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribusi Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {severityChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alert per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari alert..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {/* Patient filter (cross-patient view only) */}
            {!palliativePatientId && (
              <Select value={filterPatient} onValueChange={setFilterPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Pasien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pasien</SelectItem>
                  {palliativePatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.patientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Severity filter */}
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Diakui</SelectItem>
                <SelectItem value="RESOLVED">Selesai</SelectItem>
              </SelectContent>
            </Select>
            {/* Category filter */}
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showResolved ? 'Sembunyikan Resolved' : 'Tampilkan Resolved'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {filteredAlerts.length} dari {allAlerts.length} alert
            </span>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Panel */}
      {aiAnalysis && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Analisis AI Clinical Alert
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setAiAnalysis(null)}>Tutup</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <pre className="text-xs whitespace-pre-wrap font-sans">{aiAnalysis}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Alert List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daftar Alert</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Tidak ada alert aktif. Semua parameter klinis dalam batas normal.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {filteredAlerts.map((alert) => {
                  const sev = SEVERITY_CONFIG[alert.severityLevel ?? 'LOW'];
                  const status = STATUS_CONFIG[alert.status ?? 'ACTIVE'];
                  const Icon = sev.icon;
                  const patient = palliativePatients.find(
                    (p) => p.id === (alert.palliativePatientId ?? alert.patientId)
                  );
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
                        sev.bg,
                        sev.border
                      )}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className={cn('p-2 rounded-full', sev.bg, sev.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('font-semibold text-sm', sev.color)}>
                            {alert.title}
                          </span>
                          <Badge variant="outline" className={cn('text-xs', status.color)}>
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getSourceLabel(alert.sourceModule)}
                          </Badge>
                          {alert.kategori && (
                            <Badge variant="outline" className="text-xs">
                              {alert.kategori}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {patient && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {patient.patientName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(alert.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAlert && (() => {
            const sev = SEVERITY_CONFIG[selectedAlert.severityLevel ?? 'LOW'];
            const status = STATUS_CONFIG[selectedAlert.status ?? 'ACTIVE'];
            const Icon = sev.icon;
            const patient = palliativePatients.find(
              (p) => p.id === (selectedAlert.palliativePatientId ?? selectedAlert.patientId)
            );
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={cn('p-2 rounded-full', sev.bg, sev.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {selectedAlert.title}
                  </DialogTitle>
                  <DialogDescription>
                    Detail alert dan tindakan yang dapat dilakukan
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={sev.color + ' ' + sev.bg + ' border ' + sev.border}>
                      {sev.label}
                    </Badge>
                    <Badge variant="outline" className={status.color}>
                      {status.label}
                    </Badge>
                    <Badge variant="outline">{getSourceLabel(selectedAlert.sourceModule)}</Badge>
                    {selectedAlert.kategori && (
                      <Badge variant="outline">{selectedAlert.kategori}</Badge>
                    )}
                  </div>

                  {/* Patient */}
                  {patient && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{patient.patientName}</span>
                      {patient.rmNumber && (
                        <span className="text-muted-foreground">({patient.rmNumber})</span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Deskripsi</Label>
                    <p className="text-sm mt-1">{selectedAlert.description}</p>
                  </div>

                  {/* Recommendation */}
                  {selectedAlert.recommendation && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        Rekomendasi Klinis
                      </Label>
                      <p className="text-sm mt-1">{selectedAlert.recommendation}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground">Dibuat:</span>
                      <br />
                      {formatDate(selectedAlert.createdAt)}
                    </div>
                    {selectedAlert.acknowledgedAt && (
                      <div>
                        <span className="font-semibold text-muted-foreground">Acknowledged:</span>
                        <br />
                        {formatDate(selectedAlert.acknowledgedAt)}
                        {selectedAlert.acknowledgedBy && ` oleh ${selectedAlert.acknowledgedBy}`}
                      </div>
                    )}
                    {selectedAlert.resolvedAt && (
                      <div>
                        <span className="font-semibold text-muted-foreground">Resolved:</span>
                        <br />
                        {formatDate(selectedAlert.resolvedAt)}
                        {selectedAlert.resolvedBy && ` oleh ${selectedAlert.resolvedBy}`}
                      </div>
                    )}
                  </div>

                  {/* Existing Notes */}
                  {selectedAlert.notes && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Catatan</Label>
                      <div className="mt-1 p-2 rounded bg-muted text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {selectedAlert.notes}
                      </div>
                    </div>
                  )}

                  {/* Add Note */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Tambah Catatan</Label>
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Tulis catatan klinis..."
                      className="mt-1"
                      rows={2}
                    />
                    <Button variant="outline" size="sm" className="mt-1" onClick={handleAddNote}>
                      Tambah Catatan
                    </Button>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {selectedAlert.status === 'ACTIVE' && (
                      <Button variant="outline" size="sm" onClick={handleAcknowledge}>
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    {selectedAlert.status !== 'RESOLVED' && (
                      <Button variant="default" size="sm" onClick={handleResolve}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleOpenChat}>
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Kirim Chat
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <FileText className="w-4 h-4 mr-1" />
                      Surat Rujukan
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <Home className="w-4 h-4 mr-1" />
                      Home Visit
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <FileText className="w-4 h-4 mr-1" />
                      Cetak PDF
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stat Card sub-component ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  border,
}: {
  label: string;
  value: number;
  icon: typeof Flame;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <Card className={cn(bg, border)}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
          </div>
          <Icon className={cn('w-8 h-8', color)} />
        </div>
      </CardContent>
    </Card>
  );
}
