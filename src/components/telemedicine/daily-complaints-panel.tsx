'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  COMPLAINT_CATEGORIES,
  SEVERITY_CONFIG,
  IMPACT_CONFIG,
  FOLLOW_UP_STATUS_CONFIG,
  ALERT_LEVEL_CONFIG,
  MOCK_COMPLAINT_ENTRIES,
  MOCK_COMPLAINT_TRENDS,
  MOCK_COMPLAINT_ALERTS,
  getSeverityFromScore,
  getAlertLevelFromScore,
  getComplaintCategoryLabel,
  getSeverityLabel,
  getImpactLabel,
  getFollowUpStatusLabel,
  getAlertLevelLabel,
} from '@/lib/daily-complaints-data';
import type {
  DailyComplaintCategory,
  DailyComplaintSeverity,
  DailyComplaintImpact,
  DailyComplaintInputSource,
  DailyComplaintDataSource,
  DailyComplaintFollowUpStatus,
  DailyAlertLevel,
  DailyComplaintEntry,
  DailyComplaintTrend,
  DailyComplaintAlert,
} from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';

import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Filter,
  Plus,
  Eye,
  Bell,
  TrendingUp,
  ClipboardList,
  User,
  Users,
  Heart,
  Brain,
  Moon,
  Wind,
  Frown,
  BatteryLow,
  ChevronRight,
  Info,
  Save,
  XCircle,
  MessageCircle,
  Stethoscope,
  Shield,
  Sparkles,
} from 'lucide-react';

// ─── Category Color Map ──────────────────────────────────────────────────────

const CATEGORY_COLOR_MAP: Record<string, string> = {
  red: '#DC2626',
  blue: '#2563EB',
  yellow: '#CA8A04',
  orange: '#EA580C',
  amber: '#D97706',
  gray: '#6B7280',
  indigo: '#4F46E5',
  brown: '#92400E',
  teal: '#0D9488',
  slate: '#475569',
  purple: '#7C3AED',
  darkblue: '#1E3A8A',
  violet: '#7C3AED',
  cyan: '#06B6D4',
};

function getCategoryColor(category: DailyComplaintCategory): string {
  const colorName = COMPLAINT_CATEGORIES[category]?.color ?? 'gray';
  return CATEGORY_COLOR_MAP[colorName] ?? '#6B7280';
}

// ─── Input Source Icons ──────────────────────────────────────────────────────

function getInputSourceIcon(source: DailyComplaintInputSource) {
  switch (source) {
    case 'pasien': return <User className="w-3.5 h-3.5" />;
    case 'keluarga': return <Users className="w-3.5 h-3.5" />;
    case 'dokter': return <Stethoscope className="w-3.5 h-3.5" />;
    case 'perawat': return <Heart className="w-3.5 h-3.5" />;
  }
}

function getInputSourceLabel(source: DailyComplaintInputSource): string {
  const map: Record<DailyComplaintInputSource, string> = {
    pasien: 'Pasien',
    keluarga: 'Keluarga',
    dokter: 'Dokter',
    perawat: 'Perawat',
  };
  return map[source] ?? source;
}

function getDataSourceLabel(source: DailyComplaintDataSource): string {
  const map: Record<DailyComplaintDataSource, string> = {
    chat: 'Chat',
    manual: 'Manual',
    ai_classification: 'AI',
  };
  return map[source] ?? source;
}

function getDataSourceIcon(source: DailyComplaintDataSource) {
  switch (source) {
    case 'chat': return <MessageCircle className="w-3 h-3" />;
    case 'manual': return <ClipboardList className="w-3 h-3" />;
    case 'ai_classification': return <Sparkles className="w-3 h-3" />;
  }
}

// ─── Alert Level Dot Color ───────────────────────────────────────────────────

function getAlertDotColor(level: DailyAlertLevel): string {
  switch (level) {
    case 'hijau': return '#16A34A';
    case 'kuning': return '#CA8A04';
    case 'merah': return '#DC2626';
  }
}

// ─── Severity Bar Component ──────────────────────────────────────────────────

function SeverityBar({ score }: { score: number }) {
  const severity = getSeverityFromScore(score);
  const config = SEVERITY_CONFIG[severity];
  const pct = (score / 10) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: config.color }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {score}/10
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Skor: {score}/10 ({config.label})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface DailyComplaintsPanelProps {
  embedded?: boolean;
}

export default function DailyComplaintsPanel({ embedded = false }: DailyComplaintsPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [complaintEntries, setComplaintEntries] = useState<DailyComplaintEntry[]>(MOCK_COMPLAINT_ENTRIES);
  const [alerts, setAlerts] = useState<DailyComplaintAlert[]>(MOCK_COMPLAINT_ALERTS);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Trend category toggle
  const [selectedTrendCategory, setSelectedTrendCategory] = useState<DailyComplaintCategory>('nyeri');

  // Timeline filters
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<DailyComplaintCategory | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<DailyComplaintSeverity | 'all'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<DailyComplaintFollowUpStatus | 'all'>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DailyComplaintEntry | null>(null);

  // Add complaint form
  const [newCategory, setNewCategory] = useState<DailyComplaintCategory>('nyeri');
  const [newSeverityScore, setNewSeverityScore] = useState(5);
  const [newDescription, setNewDescription] = useState('');
  const [newImpact, setNewImpact] = useState<DailyComplaintImpact>('sedikit_mengganggu');
  const [newInputSource, setNewInputSource] = useState<DailyComplaintInputSource>('pasien');
  const [newClinicalNote, setNewClinicalNote] = useState('');

  // Detail dialog editing
  const [editClinicalNote, setEditClinicalNote] = useState('');

  // ── Computed values ───────────────────────────────────────────────────────

  const today = '2025-03-05'; // Mock today's date
  const todayEntries = useMemo(
    () => complaintEntries.filter((e) => e.date === today),
    [complaintEntries, today]
  );

  const totalComplaintsToday = todayEntries.length;

  const mostFrequentCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    todayEntries.forEach((e) => {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    });
    let maxCat = '' as DailyComplaintCategory;
    let maxCount = 0;
    for (const [cat, cnt] of Object.entries(counts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxCat = cat as DailyComplaintCategory;
      }
    }
    return { category: maxCat, count: maxCount };
  }, [todayEntries]);

  const severeComplaintsCount = todayEntries.filter((e) => e.severityScore >= 7).length;
  const needsFollowUpCount = todayEntries.filter((e) => e.followUpStatus === 'belum_ditindaklanjuti').length;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    todayEntries.forEach((e) => {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, cnt]) => ({
        category: cat as DailyComplaintCategory,
        count: cnt,
      }))
      .sort((a, b) => b.count - a.count);
  }, [todayEntries]);

  // Trend data for chart
  const trendData = useMemo(() => {
    const last7 = MOCK_COMPLAINT_TRENDS.slice(-7);
    return last7.map((t) => ({
      date: new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      value: t[selectedTrendCategory] ?? 0,
    }));
  }, [selectedTrendCategory]);

  const maxTrendValue = Math.max(...trendData.map((d) => d.value), 1);

  // Filtered timeline entries
  const filteredEntries = useMemo(() => {
    let result = [...complaintEntries];

    // Date filter
    if (dateFilter === 'today') {
      result = result.filter((e) => e.date === today);
    } else if (dateFilter === '7days') {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 7);
      result = result.filter((e) => new Date(e.date) >= cutoff);
    } else if (dateFilter === '30days') {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter((e) => new Date(e.date) >= cutoff);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter((e) => e.severity === severityFilter);
    }

    // Follow-up filter
    if (followUpFilter !== 'all') {
      result = result.filter((e) => e.followUpStatus === followUpFilter);
    }

    // Sort newest first
    result.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateB - dateA;
    });

    return result;
  }, [complaintEntries, dateFilter, categoryFilter, severityFilter, followUpFilter, today]);

  // Alert counts
  const alertCounts = useMemo(() => {
    return {
      hijau: alerts.filter((a) => a.alertLevel === 'hijau').length,
      kuning: alerts.filter((a) => a.alertLevel === 'kuning').length,
      merah: alerts.filter((a) => a.alertLevel === 'merah').length,
    };
  }, [alerts]);

  // Sorted alerts (merah first, then kuning, then hijau)
  const sortedAlerts = useMemo(() => {
    const order: Record<DailyAlertLevel, number> = { merah: 0, kuning: 1, hijau: 2 };
    return [...alerts].sort((a, b) => order[a.alertLevel] - order[b.alertLevel]);
  }, [alerts]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddComplaint = () => {
    if (!newDescription.trim()) return;

    const severity = getSeverityFromScore(newSeverityScore);
    const alertLevel = getAlertLevelFromScore(newSeverityScore);

    const newEntry: DailyComplaintEntry = {
      id: `dc-${Date.now()}`,
      patientId: 'patient-001',
      patientName: 'Siti Rahayu',
      medicalRecordNumber: 'RM-2025-001',
      date: today,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      category: newCategory,
      severity,
      severityScore: newSeverityScore,
      description: newDescription,
      impact: newImpact,
      inputSource: newInputSource,
      dataSource: 'manual',
      followUpStatus: 'belum_ditindaklanjuti',
      clinicalNote: newClinicalNote || undefined,
      alertLevel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setComplaintEntries((prev) => [newEntry, ...prev]);

    // Reset form
    setNewCategory('nyeri');
    setNewSeverityScore(5);
    setNewDescription('');
    setNewImpact('sedikit_mengganggu');
    setNewInputSource('pasien');
    setNewClinicalNote('');
    setAddDialogOpen(false);
  };

  const handleOpenDetail = (entry: DailyComplaintEntry) => {
    setSelectedEntry(entry);
    setEditClinicalNote(entry.clinicalNote ?? '');
    setDetailDialogOpen(true);
  };

  const handleUpdateFollowUp = (entryId: string, newStatus: DailyComplaintFollowUpStatus) => {
    setComplaintEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, followUpStatus: newStatus, updatedAt: new Date().toISOString() } : e
      )
    );
    if (selectedEntry?.id === entryId) {
      setSelectedEntry((prev) => prev ? { ...prev, followUpStatus: newStatus } : prev);
    }
  };

  const handleValidate = (entryId: string) => {
    setComplaintEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, validatedBy: 'Dr. Andi Pratama', updatedAt: new Date().toISOString() }
          : e
      )
    );
    if (selectedEntry?.id === entryId) {
      setSelectedEntry((prev) =>
        prev ? { ...prev, validatedBy: 'Dr. Andi Pratama' } : prev
      );
    }
  };

  const handleSaveClinicalNote = () => {
    if (!selectedEntry) return;
    setComplaintEntries((prev) =>
      prev.map((e) =>
        e.id === selectedEntry.id
          ? { ...e, clinicalNote: editClinicalNote, updatedAt: new Date().toISOString() }
          : e
      )
    );
    setSelectedEntry((prev) =>
      prev ? { ...prev, clinicalNote: editClinicalNote } : prev
    );
  };

  const handleMarkAlertRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
    );
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isResolved: true } : a))
    );
  };

  // ── Sub-Tab 1: Dashboard ──────────────────────────────────────────────────

  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* Ringkasan Hari Ini */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2D8C7A]" />
          Ringkasan Hari Ini
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Keluhan */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#2D8C7A]/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[#2D8C7A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2D8C7A]">{totalComplaintsToday}</p>
                <p className="text-xs text-muted-foreground">Total Keluhan Masuk</p>
              </div>
            </CardContent>
          </Card>

          {/* Keluhan Terbanyak */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#D9B26F]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#D9B26F]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#D9B26F]">
                  {mostFrequentCategory.category
                    ? getComplaintCategoryLabel(mostFrequentCategory.category)
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Keluhan Terbanyak{mostFrequentCategory.count > 0 ? ` (${mostFrequentCategory.count})` : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Keluhan Berat */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{severeComplaintsCount}</p>
                <p className="text-xs text-muted-foreground">Keluhan Berat (≥7)</p>
              </div>
            </CardContent>
          </Card>

          {/* Perlu Tindak Lanjut */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{needsFollowUpCount}</p>
                <p className="text-xs text-muted-foreground">Perlu Tindak Lanjut</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grafik Tren Keluhan */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2D8C7A]" />
              Grafik Tren Keluhan (7 Hari)
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: 'nyeri' as DailyComplaintCategory, label: 'Nyeri' },
                { key: 'sesak_napas' as DailyComplaintCategory, label: 'Sesak Napas' },
                { key: 'mual' as DailyComplaintCategory, label: 'Mual' },
                { key: 'kelelahan' as DailyComplaintCategory, label: 'Kelelahan' },
                { key: 'gangguan_tidur' as DailyComplaintCategory, label: 'Gangguan Tidur' },
                { key: 'kecemasan' as DailyComplaintCategory, label: 'Kecemasan' },
              ]).map((cat) => (
                <Button
                  key={cat.key}
                  variant={selectedTrendCategory === cat.key ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs h-7 px-2.5',
                    selectedTrendCategory === cat.key
                      ? 'bg-[#2D8C7A] hover:bg-[#2D8C7A]/90 text-white'
                      : 'text-muted-foreground hover:text-[#2D8C7A]'
                  )}
                  onClick={() => setSelectedTrendCategory(cat.key)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {trendData.map((item, idx) => {
              const heightPct = (item.value / maxTrendValue) * 100;
              const catColor = getCategoryColor(selectedTrendCategory);
              const barColor = item.value <= 3 ? '#16A34A' : item.value <= 5 ? '#CA8A04' : item.value <= 7 ? '#EA580C' : '#DC2626';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium" style={{ color: barColor }}>
                    {item.value}
                  </span>
                  <div className="w-full h-32 flex items-end">
                    <div
                      className="w-full rounded-t-md transition-all duration-500 min-h-[4px]"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: barColor,
                        opacity: idx === trendData.length - 1 ? 1 : 0.7,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.date}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distribusi Kategori */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2D8C7A]" />
          Distribusi Kategori Hari Ini
        </h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Belum ada keluhan hari ini</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryBreakdown.map(({ category, count }) => {
              const catColor = getCategoryColor(category);
              return (
                <Card key={category} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {getComplaintCategoryLabel(category)}
                      </p>
                      <p className="text-lg font-bold" style={{ color: catColor }}>
                        {count}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Sub-Tab 2: Timeline Keluhan ───────────────────────────────────────────

  const renderTimelineTab = () => (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#2D8C7A]" />
          <span className="text-sm font-medium">Filter</span>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="gap-1.5 bg-[#2D8C7A] hover:bg-[#2D8C7A]/90 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Keluhan
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Date Range Filter */}
        <div className="space-y-1">
          <Label className="text-xs">Rentang Waktu</Label>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="7days">7 Hari</SelectItem>
              <SelectItem value="30days">30 Hari</SelectItem>
              <SelectItem value="all">Semua</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-1">
          <Label className="text-xs">Kategori</Label>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as DailyComplaintCategory | 'all')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {Object.entries(COMPLAINT_CATEGORIES).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity Filter */}
        <div className="space-y-1">
          <Label className="text-xs">Tingkat Keparahan</Label>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as DailyComplaintSeverity | 'all')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="ringan">Ringan</SelectItem>
              <SelectItem value="sedang">Sedang</SelectItem>
              <SelectItem value="berat">Berat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Follow-up Status Filter */}
        <div className="space-y-1">
          <Label className="text-xs">Status Tindak Lanjut</Label>
          <Select value={followUpFilter} onValueChange={(v) => setFollowUpFilter(v as DailyComplaintFollowUpStatus | 'all')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="belum_ditindaklanjuti">Belum Ditindaklanjuti</SelectItem>
              <SelectItem value="sedang_diproses">Sedang Diproses</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Menampilkan {filteredEntries.length} keluhan
      </p>

      {/* Timeline List */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada keluhan ditemukan</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const catColor = getCategoryColor(entry.category);
            const sevConfig = SEVERITY_CONFIG[entry.severity];
            const followUpConfig = FOLLOW_UP_STATUS_CONFIG[entry.followUpStatus];

            return (
              <Card
                key={entry.id}
                className="overflow-hidden cursor-pointer hover:border-[#2D8C7A]/50 transition-colors"
                onClick={() => handleOpenDetail(entry)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Alert level indicator dot */}
                    <div className="flex flex-col items-center gap-2 pt-0.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getAlertDotColor(entry.alertLevel) }}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                        {entry.time}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Top row: Category badge + severity */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className="text-[10px] font-medium shrink-0"
                          style={{
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                            borderColor: `${catColor}40`,
                            border: `1px solid ${catColor}40`,
                          }}
                        >
                          {getComplaintCategoryLabel(entry.category)}
                        </Badge>
                        <SeverityBar score={entry.severityScore} />
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {entry.description}
                      </p>

                      {/* Bottom row: meta info */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {/* Input Source */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                {getInputSourceIcon(entry.inputSource)}
                                {getInputSourceLabel(entry.inputSource)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sumber Input: {getInputSourceLabel(entry.inputSource)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <span className="text-gray-300">|</span>

                        {/* Data Source */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                {getDataSourceIcon(entry.dataSource)}
                                {getDataSourceLabel(entry.dataSource)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sumber Data: {getDataSourceLabel(entry.dataSource)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <span className="text-gray-300">|</span>

                        {/* Follow-up status */}
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5"
                          style={{
                            color: followUpConfig.color === 'red' ? '#DC2626' : followUpConfig.color === 'yellow' ? '#CA8A04' : '#16A34A',
                            borderColor: followUpConfig.color === 'red' ? '#FCA5A5' : followUpConfig.color === 'yellow' ? '#FDE68A' : '#86EFAC',
                          }}
                        >
                          {getFollowUpStatusLabel(entry.followUpStatus)}
                        </Badge>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Complaint Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2D8C7A]" />
              Tambah Keluhan Baru
            </DialogTitle>
            <DialogDescription>
              Catat keluhan pasien beserta tingkat keparahannya
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 py-2">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori Keluhan</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as DailyComplaintCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPLAINT_CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Skor Keparahan</Label>
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: SEVERITY_CONFIG[getSeverityFromScore(newSeverityScore)].bgColor,
                    color: SEVERITY_CONFIG[getSeverityFromScore(newSeverityScore)].color,
                    borderColor: SEVERITY_CONFIG[getSeverityFromScore(newSeverityScore)].borderColor,
                    border: `1px solid ${SEVERITY_CONFIG[getSeverityFromScore(newSeverityScore)].borderColor}`,
                  }}
                >
                  {newSeverityScore}/10 - {getSeverityLabel(getSeverityFromScore(newSeverityScore))}
                </Badge>
              </div>
              <Slider
                value={[newSeverityScore]}
                onValueChange={(v) => setNewSeverityScore(v[0])}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0 - Tidak ada</span>
                <span>10 - Terburuk</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi Keluhan</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Jelaskan keluhan yang dirasakan..."
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Impact */}
            <div className="space-y-1.5">
              <Label className="text-xs">Dampak pada Aktivitas</Label>
              <Select value={newImpact} onValueChange={(v) => setNewImpact(v as DailyComplaintImpact)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Source */}
            <div className="space-y-1.5">
              <Label className="text-xs">Sumber Input</Label>
              <Select value={newInputSource} onValueChange={(v) => setNewInputSource(v as DailyComplaintInputSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pasien">Pasien</SelectItem>
                  <SelectItem value="keluarga">Keluarga</SelectItem>
                  <SelectItem value="dokter">Dokter</SelectItem>
                  <SelectItem value="perawat">Perawat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clinical Note */}
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan Klinis (Opsional)</Label>
              <Textarea
                value={newClinicalNote}
                onChange={(e) => setNewClinicalNote(e.target.value)}
                placeholder="Tambahkan catatan klinis..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} size="sm">
              Batal
            </Button>
            <Button
              onClick={handleAddComplaint}
              disabled={!newDescription.trim()}
              className="gap-1.5 bg-[#2D8C7A] hover:bg-[#2D8C7A]/90 text-white"
              size="sm"
            >
              <Save className="w-4 h-4" />
              Simpan Keluhan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2D8C7A]" />
              Detail Keluhan
            </DialogTitle>
            <DialogDescription>
              {selectedEntry && `ID: ${selectedEntry.id}`}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 py-2">
              {/* Alert Level + Category */}
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getAlertDotColor(selectedEntry.alertLevel) }}
                />
                <Badge
                  className="text-[10px]"
                  style={{
                    backgroundColor: `${getCategoryColor(selectedEntry.category)}15`,
                    color: getCategoryColor(selectedEntry.category),
                    borderColor: `${getCategoryColor(selectedEntry.category)}40`,
                    border: `1px solid ${getCategoryColor(selectedEntry.category)}40`,
                  }}
                >
                  {getComplaintCategoryLabel(selectedEntry.category)}
                </Badge>
                <Badge
                  className="text-[10px]"
                  style={{
                    backgroundColor: SEVERITY_CONFIG[selectedEntry.severity].bgColor,
                    color: SEVERITY_CONFIG[selectedEntry.severity].color,
                    borderColor: SEVERITY_CONFIG[selectedEntry.severity].borderColor,
                    border: `1px solid ${SEVERITY_CONFIG[selectedEntry.severity].borderColor}`,
                  }}
                >
                  {getSeverityLabel(selectedEntry.severity)} ({selectedEntry.severityScore}/10)
                </Badge>
              </div>

              {/* Patient Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Pasien:</strong> {selectedEntry.patientName} ({selectedEntry.medicalRecordNumber})</p>
                <p><strong>Waktu:</strong> {selectedEntry.date} {selectedEntry.time}</p>
                <p><strong>Sumber Input:</strong> {getInputSourceLabel(selectedEntry.inputSource)}</p>
                <p><strong>Sumber Data:</strong> {getDataSourceLabel(selectedEntry.dataSource)}</p>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <Label className="text-xs font-semibold">Deskripsi Keluhan</Label>
                <p className="text-sm mt-1 leading-relaxed">{selectedEntry.description}</p>
              </div>

              {/* Impact */}
              <div>
                <Label className="text-xs font-semibold">Dampak</Label>
                <p className="text-sm mt-1">{getImpactLabel(selectedEntry.impact)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {IMPACT_CONFIG[selectedEntry.impact]?.description}
                </p>
              </div>

              <Separator />

              {/* Severity Visual */}
              <div>
                <Label className="text-xs font-semibold">Skor Keparahan</Label>
                <div className="mt-2 space-y-1">
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(selectedEntry.severityScore / 10) * 100}%`,
                        backgroundColor: SEVERITY_CONFIG[selectedEntry.severity].color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span className="font-medium" style={{ color: SEVERITY_CONFIG[selectedEntry.severity].color }}>
                      {selectedEntry.severityScore}/10
                    </span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Follow-up Status */}
              <div>
                <Label className="text-xs font-semibold">Status Tindak Lanjut</Label>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      color: FOLLOW_UP_STATUS_CONFIG[selectedEntry.followUpStatus].color === 'red' ? '#DC2626' : FOLLOW_UP_STATUS_CONFIG[selectedEntry.followUpStatus].color === 'yellow' ? '#CA8A04' : '#16A34A',
                      borderColor: FOLLOW_UP_STATUS_CONFIG[selectedEntry.followUpStatus].color === 'red' ? '#FCA5A5' : FOLLOW_UP_STATUS_CONFIG[selectedEntry.followUpStatus].color === 'yellow' ? '#FDE68A' : '#86EFAC',
                    }}
                  >
                    {getFollowUpStatusLabel(selectedEntry.followUpStatus)}
                  </Badge>
                  <div className="flex gap-1.5">
                    {selectedEntry.followUpStatus !== 'sedang_diproses' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleUpdateFollowUp(selectedEntry.id, 'sedang_diproses')}
                      >
                        Proses
                      </Button>
                    )}
                    {selectedEntry.followUpStatus !== 'selesai' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleUpdateFollowUp(selectedEntry.id, 'selesai')}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Selesai
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Validated By */}
              <div>
                <Label className="text-xs font-semibold">Validasi</Label>
                {selectedEntry.validatedBy ? (
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Divalidasi oleh {selectedEntry.validatedBy}</span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1.5 text-[#2D8C7A] border-[#2D8C7A]/30 hover:bg-[#2D8C7A]/5"
                      onClick={() => handleValidate(selectedEntry.id)}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Validasi
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Clinical Note (editable) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catatan Klinis</Label>
                <Textarea
                  value={editClinicalNote}
                  onChange={(e) => setEditClinicalNote(e.target.value)}
                  placeholder="Tambahkan catatan klinis..."
                  rows={3}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1.5"
                  onClick={handleSaveClinicalNote}
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Catatan
                </Button>
              </div>

              {/* Timestamps */}
              <div className="text-[10px] text-muted-foreground">
                <p>Dibuat: {new Date(selectedEntry.createdAt).toLocaleString('id-ID')}</p>
                <p>Diperbarui: {new Date(selectedEntry.updatedAt).toLocaleString('id-ID')}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} size="sm">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Sub-Tab 3: Peringatan & Alert ─────────────────────────────────────────

  const renderAlertsTab = () => (
    <div className="space-y-6">
      {/* Alert Summary Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#2D8C7A]" />
          Ringkasan Peringatan
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Hijau */}
          <Card className="overflow-hidden border-green-200 bg-green-50/50">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{alertCounts.hijau}</p>
                <p className="text-xs text-green-700">Ringan</p>
              </div>
            </CardContent>
          </Card>

          {/* Kuning */}
          <Card className="overflow-hidden border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{alertCounts.kuning}</p>
                <p className="text-xs text-yellow-700">Perlu Pemantauan</p>
              </div>
            </CardContent>
          </Card>

          {/* Merah */}
          <Card className="overflow-hidden border-red-200 bg-red-50/50">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{alertCounts.merah}</p>
                <p className="text-xs text-red-700">Tindak Lanjut Segera</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert List */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#2D8C7A]" />
          Daftar Peringatan
        </h3>
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada peringatan aktif</p>
            </div>
          ) : (
            sortedAlerts.map((alert) => {
              const alertConfig = ALERT_LEVEL_CONFIG[alert.alertLevel];
              const isUnread = !alert.isRead;
              const alertBgColor =
                alert.alertLevel === 'merah' ? 'bg-red-50 border-red-200' :
                alert.alertLevel === 'kuning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200';
              const alertTextColor =
                alert.alertLevel === 'merah' ? 'text-red-700' :
                alert.alertLevel === 'kuning' ? 'text-yellow-700' :
                'text-green-700';
              const alertBadgeBg =
                alert.alertLevel === 'merah' ? 'bg-red-100 text-red-700 border-red-300' :
                alert.alertLevel === 'kuning' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                'bg-green-100 text-green-700 border-green-300';

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    'overflow-hidden border transition-all',
                    alertBgColor,
                    isUnread && 'ring-1 ring-[#2D8C7A]/30',
                    alert.isResolved && 'opacity-60'
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top: Alert level badge + time */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[10px] border', alertBadgeBg)}>
                          {getAlertLevelLabel(alert.alertLevel)}
                        </Badge>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#2D8C7A] animate-pulse" />
                        )}
                        {alert.isResolved && (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                            Selesai
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(alert.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Title + Description */}
                    <div>
                      <h4 className={cn('text-sm font-semibold', alertTextColor)}>
                        {alert.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Trigger reason + patient */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {alert.triggerReason}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {alert.patientName}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isUnread && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => handleMarkAlertRead(alert.id)}
                        >
                          <Eye className="w-3 h-3" />
                          Tandai Dibaca
                        </Button>
                      )}
                      {!alert.isResolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Selesaikan
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 text-[#2D8C7A] border-[#2D8C7A]/30 hover:bg-[#2D8C7A]/5"
                        onClick={() => {
                          const entry = complaintEntries.find((e) => e.id === alert.complaintId);
                          if (entry) handleOpenDetail(entry);
                        }}
                      >
                        <ClipboardList className="w-3 h-3" />
                        Lihat Keluhan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className={cn('flex flex-col h-full', embedded ? '' : 'min-h-0')}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full grid grid-cols-3 shrink-0">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Timeline Keluhan</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs sm:text-sm relative">
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Peringatan</span>
            {alerts.filter((a) => !a.isRead && !a.isResolved).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                {alerts.filter((a) => !a.isRead && !a.isResolved).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {renderDashboardTab()}
        </TabsContent>

        <TabsContent value="timeline" className="mt-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {renderTimelineTab()}
        </TabsContent>

        <TabsContent value="alerts" className="mt-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {renderAlertsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
