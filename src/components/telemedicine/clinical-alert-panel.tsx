'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  ChevronDown,
  ArrowUp,
  Inbox,
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
  { label: string; color: string; bg: string; border: string; icon: typeof Flame; ring: string }
> = {
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-500',
    ring: 'hover:border-red-400 hover:shadow-red-100',
    icon: Flame,
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    ring: 'hover:border-orange-400 hover:shadow-orange-100',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    ring: 'hover:border-yellow-400 hover:shadow-yellow-100',
    icon: AlertCircle,
  },
  LOW: {
    label: 'Low',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-500',
    ring: 'hover:border-green-400 hover:shadow-green-100',
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

const PAGE_SIZE = 20;

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

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Baru saja';
    if (min < 60) return `${min} mnt lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} hari lalu`;
    return formatDate(iso);
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
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  // ── Infinite scroll & realtime indicator state ─────────────────────────
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastSeenCreatedAtRef = useRef<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

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

  // Visible slice (infinite scroll)
  const visibleAlerts = useMemo(
    () => filteredAlerts.slice(0, visibleCount),
    [filteredAlerts, visibleCount]
  );
  const hasMore = visibleCount < filteredAlerts.length;

  // Initialize the "last seen" timestamp on first load (so we don't count existing as new)
  useEffect(() => {
    if (lastSeenCreatedAtRef.current === null && allAlerts.length > 0) {
      const maxTs = allAlerts.reduce((mx, a) => {
        return new Date(a.createdAt).getTime() > new Date(mx).getTime() ? a.createdAt : mx;
      }, allAlerts[0].createdAt);
      lastSeenCreatedAtRef.current = maxTs;
    }
  }, [allAlerts]);

  // Detect new alerts arriving in realtime (createdAt newer than last seen)
  useEffect(() => {
    if (lastSeenCreatedAtRef.current === null) return;
    const lastSeen = new Date(lastSeenCreatedAtRef.current).getTime();
    const fresh = allAlerts.filter(
      (a) => new Date(a.createdAt).getTime() > lastSeen
    );
    setNewAlertCount(fresh.length);
  }, [allAlerts]);

  // Reset visible count when filters change (avoid showing stale page state)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterPatient, filterSeverity, filterStatus, filterCategory, searchQuery, showResolved]);

  // IntersectionObserver for infinite scroll auto-load
  useEffect(() => {
    const node = sentinelRef.current;
    const root = listScrollRef.current;
    if (!node || !hasMore) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { root, rootMargin: '80px', threshold: 0.01 }
    );
    ob.observe(node);
    return () => ob.disconnect();
  }, [hasMore, visibleAlerts.length]);

  // The currently selected alert (derived from the live list so it stays fresh)
  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) return null;
    return (
      allAlerts.find(
        (a) => a.id === selectedAlertId
      ) ?? null
    );
  }, [selectedAlertId, allAlerts]);

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
    const doctorName = currentUser?.name ?? 'Dokter';
    try {
      acknowledgePalliativeAlert(selectedAlert.id, doctorName);
      toast({ title: 'Alert Diakui', description: `Alert "${selectedAlert.title}" telah di-acknowledge.` });
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
  }, [selectedAlert, setSelectedPalliativePatientId, toast]);

  // Select an alert (replaces modal open). On mobile, scroll to detail panel.
  const handleSelectAlert = useCallback((alert: PalliativeClinicalAlert) => {
    setSelectedAlertId(alert.id);
    setNoteText('');
    // On small screens, scroll the detail into view
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  // Click "X Alert Baru" → jump to top & mark seen
  const handleViewNewAlerts = useCallback(() => {
    const el = listScrollRef.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    // Update last seen to the newest alert's createdAt
    if (allAlerts.length > 0) {
      const maxTs = allAlerts.reduce((mx, a) => {
        return new Date(a.createdAt).getTime() > new Date(mx).getTime() ? a.createdAt : mx;
      }, allAlerts[0].createdAt);
      lastSeenCreatedAtRef.current = maxTs;
    }
    setNewAlertCount(0);
  }, [allAlerts]);

  // When user scrolls back to top manually, clear the new-alert indicator
  const handleListScroll = useCallback(() => {
    const el = listScrollRef.current;
    if (!el) return;
    if (el.scrollTop < 24 && newAlertCount > 0) {
      if (allAlerts.length > 0) {
        const maxTs = allAlerts.reduce((mx, a) => {
          return new Date(a.createdAt).getTime() > new Date(mx).getTime() ? a.createdAt : mx;
        }, allAlerts[0].createdAt);
        lastSeenCreatedAtRef.current = maxTs;
      }
      setNewAlertCount(0);
    }
  }, [newAlertCount, allAlerts]);

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

      {/* ── Master–Detail Layout ─────────────────────────────────────────── */}
      {/* Left (40%): sticky filter + scrollable alert list                */}
      {/* Right (60%): detail of the selected alert                        */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── LEFT: Alert List Panel ── */}
        <Card className="lg:col-span-2 flex flex-col gap-0 overflow-hidden p-0">
          {/* Sticky filter header (never scrolls away) */}
          <div className="shrink-0 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-primary" />
                Daftar Alert
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {filteredAlerts.length} alert
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari alert..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            {/* Filter row */}
            <div className="grid grid-cols-2 gap-2">
              {!palliativePatientId && (
                <Select value={filterPatient} onValueChange={setFilterPatient}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pasien" />
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
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Severity</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="ACKNOWLEDGED">Diakui</SelectItem>
                  <SelectItem value="RESOLVED">Selesai</SelectItem>
                </SelectContent>
              </Select>
              {categories.length > 0 && (
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Kategori" />
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
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                {showResolved ? 'Sembunyikan Selesai' : 'Tampilkan Selesai'}
              </Button>
            </div>
          </div>

          {/* Scrollable alert list — responsive heights per spec:
              mobile 300px / tablet 400px / desktop 540px */}
          <div
            ref={listScrollRef}
            onScroll={handleListScroll}
            className="alert-list-scroll relative overflow-y-auto overflow-x-hidden p-2.5 h-[300px] sm:h-[400px] lg:h-[540px]"
          >
            {/* Realtime "new alerts" indicator */}
            {newAlertCount > 0 && (
              <button
                type="button"
                onClick={handleViewNewAlerts}
                className="sticky top-0 left-1/2 -translate-x-1/2 z-20 mb-2 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 animate-in fade-in slide-in-from-top-2"
              >
                <Zap className="w-3.5 h-3.5" />
                {newAlertCount} Alert Baru
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}

            {filteredAlerts.length === 0 ? (
              <EmptyAlertList showResolved={showResolved} />
            ) : (
              <div className="space-y-2.5">
                {visibleAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    patient={palliativePatients.find(
                      (p) => p.id === (alert.palliativePatientId ?? alert.patientId)
                    )}
                    selected={alert.id === selectedAlertId}
                    onSelect={handleSelectAlert}
                  />
                ))}

                {/* Infinite scroll sentinel + manual load more */}
                {hasMore ? (
                  <div ref={sentinelRef} className="flex justify-center py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    >
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Muat {Math.min(PAGE_SIZE, filteredAlerts.length - visibleCount)} lagi
                    </Button>
                  </div>
                ) : (
                  filteredAlerts.length > PAGE_SIZE && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      Semua {filteredAlerts.length} alert telah ditampilkan
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ── RIGHT: Alert Detail Panel ── */}
        <div ref={detailRef} className="lg:col-span-3 lg:self-stretch">
        <Card className="flex flex-col gap-0 overflow-hidden p-0 min-h-[300px] lg:h-full">
          <div className="alert-list-scroll flex-1 overflow-y-auto">
            {!selectedAlert ? (
              <EmptyDetail />
            ) : (
              <AlertDetail
                alert={selectedAlert}
                patient={palliativePatients.find(
                  (p) => p.id === (selectedAlert.palliativePatientId ?? selectedAlert.patientId)
                )}
                noteText={noteText}
                setNoteText={setNoteText}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onAddNote={handleAddNote}
                onOpenChat={handleOpenChat}
                onClose={() => setSelectedAlertId(null)}
              />
            )}
          </div>
        </Card>
        </div>
      </div>
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

// ── Alert Card (list item) ──────────────────────────────────────────────────

interface AlertCardProps {
  alert: PalliativeClinicalAlert;
  patient?: { patientName: string; rmNumber?: string };
  selected: boolean;
  onSelect: (alert: PalliativeClinicalAlert) => void;
}

function AlertCard({ alert, patient, selected, onSelect }: AlertCardProps) {
  const sev = SEVERITY_CONFIG[alert.severityLevel ?? 'LOW'];
  const status = STATUS_CONFIG[alert.status ?? 'ACTIVE'];
  const Icon = sev.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(alert)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(alert);
        }
      }}
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border bg-card p-3.5 cursor-pointer',
        'min-h-[120px] transition-all duration-200 ease-out',
        'hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]',
        sev.border,
        selected
          ? 'ring-2 ring-primary shadow-md border-primary'
          : sev.ring
      )}
    >
      {/* Top row: icon + title + status */}
      <div className="flex items-start gap-2.5">
        <div className={cn('shrink-0 p-2 rounded-full', sev.bg, sev.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn('font-semibold text-sm leading-snug', sev.color, 'line-clamp-1')}>
              {alert.title}
            </h4>
            <Badge variant="outline" className={cn('shrink-0 text-[10px] px-1.5 py-0', status.color)}>
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Description (clamped) */}
      <p className="text-xs text-muted-foreground line-clamp-2 pl-9">
        {alert.description}
      </p>

      {/* Meta row: patient + time */}
      <div className="flex items-center gap-3 mt-auto pl-9 text-[11px] text-muted-foreground flex-wrap">
        {patient && (
          <span className="flex items-center gap-1 min-w-0">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[120px]">{patient.patientName}</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" />
          {formatRelative(alert.createdAt)}
        </span>
      </div>

      {/* Badges row: source + category */}
      <div className="flex items-center gap-1.5 pl-9 flex-wrap">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {getSourceLabel(alert.sourceModule)}
        </Badge>
        {alert.kategori && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {alert.kategori}
          </Badge>
        )}
      </div>

      {/* Lihat Detail action (appears on hover) */}
      <div className="absolute bottom-2 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
          Lihat Detail
          <ChevronDown className="w-3 h-3 -rotate-90" />
        </span>
      </div>
    </div>
  );
}

// ── Alert Detail (right panel) ──────────────────────────────────────────────

interface AlertDetailProps {
  alert: PalliativeClinicalAlert;
  patient?: { patientName: string; rmNumber?: string };
  noteText: string;
  setNoteText: (v: string) => void;
  onAcknowledge: () => void;
  onResolve: () => void;
  onAddNote: () => void;
  onOpenChat: () => void;
  onClose: () => void;
}

function AlertDetail({
  alert,
  patient,
  noteText,
  setNoteText,
  onAcknowledge,
  onResolve,
  onAddNote,
  onOpenChat,
  onClose,
}: AlertDetailProps) {
  const sev = SEVERITY_CONFIG[alert.severityLevel ?? 'LOW'];
  const status = STATUS_CONFIG[alert.status ?? 'ACTIVE'];
  const Icon = sev.icon;

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn('shrink-0 p-2.5 rounded-full', sev.bg, sev.color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-snug">{alert.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detail alert dan tindakan yang dapat dilakukan
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 lg:hidden" onClick={onClose}>
          <ArrowUp className="w-4 h-4 mr-1" />
          Kembali
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className={cn(sev.color, sev.bg, 'border', sev.border)}>
          {sev.label}
        </Badge>
        <Badge variant="outline" className={status.color}>
          {status.label}
        </Badge>
        <Badge variant="outline">{getSourceLabel(alert.sourceModule)}</Badge>
        {alert.kategori && (
          <Badge variant="outline">{alert.kategori}</Badge>
        )}
      </div>

      {/* Patient */}
      {patient && (
        <div className="flex items-center gap-2 text-sm p-2.5 rounded-lg bg-muted/50">
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
        <p className="text-sm mt-1 leading-relaxed">{alert.description}</p>
      </div>

      {/* Recommendation */}
      {alert.recommendation && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Label className="text-xs font-semibold text-primary flex items-center gap-1">
            <Stethoscope className="w-3 h-3" />
            Rekomendasi Klinis
          </Label>
          <p className="text-sm mt-1 leading-relaxed">{alert.recommendation}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-muted/40">
          <span className="font-semibold text-muted-foreground">Dibuat:</span>
          <br />
          {formatDate(alert.createdAt)}
        </div>
        {alert.acknowledgedAt && (
          <div className="p-2.5 rounded-lg bg-muted/40">
            <span className="font-semibold text-muted-foreground">Acknowledged:</span>
            <br />
            {formatDate(alert.acknowledgedAt)}
            {alert.acknowledgedBy && ` oleh ${alert.acknowledgedBy}`}
          </div>
        )}
        {alert.resolvedAt && (
          <div className="p-2.5 rounded-lg bg-muted/40">
            <span className="font-semibold text-muted-foreground">Resolved:</span>
            <br />
            {formatDate(alert.resolvedAt)}
            {alert.resolvedBy && ` oleh ${alert.resolvedBy}`}
          </div>
        )}
      </div>

      {/* Existing Notes */}
      {alert.notes && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Catatan</Label>
          <div className="mt-1 p-2.5 rounded bg-muted text-xs whitespace-pre-wrap max-h-32 overflow-y-auto alert-list-scroll">
            {alert.notes}
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
        <Button variant="outline" size="sm" className="mt-1.5" onClick={onAddNote}>
          Tambah Catatan
        </Button>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {alert.status === 'ACTIVE' && (
          <Button variant="outline" size="sm" onClick={onAcknowledge}>
            <ShieldCheck className="w-4 h-4 mr-1" />
            Acknowledge
          </Button>
        )}
        {alert.status !== 'RESOLVED' && (
          <Button variant="default" size="sm" onClick={onResolve}>
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Resolve
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onOpenChat}>
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
  );
}

// ── Empty States ────────────────────────────────────────────────────────────

function EmptyAlertList({ showResolved }: { showResolved: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 h-full">
      <div className="relative mb-4">
        <div className="absolute inset-0 blur-2xl bg-green-200/40 rounded-full" />
        <div className="relative w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border-2 border-green-200">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>
      <h3 className="font-semibold text-sm">Belum ada Clinical Alert</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        {showResolved
          ? 'Tidak ada alert yang cocok dengan filter saat ini.'
          : 'Semua kondisi pasien dalam batas aman.'}
      </p>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] px-6 py-10">
      <div className="relative mb-4">
        <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full" />
        <div className="relative w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/20">
          <Inbox className="w-10 h-10 text-primary/60" />
        </div>
      </div>
      <h3 className="font-semibold text-base">Pilih Alert untuk Melihat Detail</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-[320px]">
        Klik salah satu alert di daftar sebelah kiri untuk melihat informasi pasien,
        rekomendasi klinis, dan tindakan yang dapat dilakukan.
      </p>
    </div>
  );
}
