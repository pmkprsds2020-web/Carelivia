'use client';

// ───────────────────────────────────────────────────────────────────────────
// SupportingExamPanel — Pemeriksaan Penunjang (Lab / USG / EKG / Radiologi)
//
// FITUR 2 of the Palliative Monitoring panel. Renders 6 inner sub-tabs:
//   1. Dashboard Ringkas  — latest exam per type
//   2. Laboratorium       — form + trend charts + history table
//   3. USG                — form (with photo upload) + card history
//   4. EKG                — form (with photo upload) + card history
//   5. Radiologi          — form (with photo upload) + card history
//   6. Timeline           — merged, filterable, searchable timeline
//
// All data flows through `supportingExamService` (Supabase-backed). Realtime
// updates are subscribed via Supabase channels on `patient_documents`.
// AI analysis calls POST /api/supporting-exams/ai.
// ───────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  supportingExamService,
  supabase,
  STORAGE_SETUP_SQL,
  type ExamType,
  type LabResult,
  type USGResult,
  type ECGResult,
  type RadiologyResult,
  type SupportingExamUnion,
  type LabInput,
  type USGInput,
  type ECGInput,
  type RadiologyInput,
  type UploadProgressCb,
} from '@/services/supabase';
import {
  JENIS_USG_OPTIONS,
  JENIS_RADIOLOGI_OPTIONS,
} from '@/services/supabase/supportingExamService';

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  FlaskConical,
  Waves,
  HeartPulse,
  Scan,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Printer,
  Sparkles,
  Loader2,
  Search,
  Filter,
  Calendar,
  FileText,
  Image as ImageIcon,
  ImageOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Stethoscope,
  Download,
  ExternalLink,
  ZoomIn,
  Upload,
  Database,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';

// ── Constants & helpers ─────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'lab' | 'usg' | 'ekg' | 'radiologi' | 'timeline';
type TimelineFilter = 'all' | ExamType;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const TYPE_META: Record<
  ExamType,
  { label: string; icon: typeof FlaskConical; color: string; bg: string; border: string; text: string; ring: string }
> = {
  laboratorium: {
    label: 'Laboratorium',
    icon: FlaskConical,
    color: 'emerald',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'ring-emerald-500/30',
  },
  usg: {
    label: 'USG',
    icon: Waves,
    color: 'sky',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    ring: 'ring-sky-500/30',
  },
  ekg: {
    label: 'EKG',
    icon: HeartPulse,
    color: 'rose',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    ring: 'ring-rose-500/30',
  },
  radiologi: {
    label: 'Radiologi',
    icon: Scan,
    color: 'violet',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    ring: 'ring-violet-500/30',
  },
};

function todayStr(): string {
  try {
    // Use local date (yyyy-mm-dd) to match the <input type="date"> value semantics
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('id-ID', {
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

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ── Abnormal value thresholds (for highlighting in red) ────────────────────

function isAbnormal(field: keyof LabResult, value?: number): boolean {
  if (value === undefined || value === null) return false;
  switch (field) {
    case 'gdp': return value >= 250;
    case 'gds': return value >= 300;
    case 'hba1c': return value >= 9;
    case 'kreatinin': return value > 2.0;
    case 'ldl': return value >= 190;
    case 'mikroalbumin': return value > 30;
    case 'trigliserida': return value >= 200;
    case 'kolesterolTotal': return value >= 240;
    case 'hdl': return value < 40;
    default: return false;
  }
}

// ── Props ───────────────────────────────────────────────────────────────────

interface SupportingExamPanelProps {
  palliativePatientId?: string;
  patientName?: string;
}

// ── Empty form state factories ──────────────────────────────────────────────

interface LabFormState {
  tanggal: string;
  gdp: string;
  gds: string;
  hba1c: string;
  ureum: string;
  kreatinin: string;
  kolesterolTotal: string;
  hdl: string;
  ldl: string;
  trigliserida: string;
  mikroalbumin: string;
  catatan: string;
}

function emptyLabForm(): LabFormState {
  return {
    tanggal: todayStr(),
    gdp: '',
    gds: '',
    hba1c: '',
    ureum: '',
    kreatinin: '',
    kolesterolTotal: '',
    hdl: '',
    ldl: '',
    trigliserida: '',
    mikroalbumin: '',
    catatan: '',
  };
}

interface PhotoFormState {
  tanggal: string;
  jenisUsg: string;
  jenisRadiologi: string;
  hasil: string;
  interpretasi: string;
  catatan: string;
}

function emptyPhotoForm(): PhotoFormState {
  return {
    tanggal: todayStr(),
    jenisUsg: '',
    jenisRadiologi: '',
    hasil: '',
    interpretasi: '',
    catatan: '',
  };
}

// ── Detail dialog payload ───────────────────────────────────────────────────

interface DetailDialogPayload {
  type: ExamType;
  data: LabResult | USGResult | ECGResult | RadiologyResult;
}

interface ConfirmDeletePayload {
  type: ExamType;
  id: string;
}

// ── Main component ──────────────────────────────────────────────────────────

export function SupportingExamPanel({ palliativePatientId, patientName }: SupportingExamPanelProps) {
  const { toast } = useToast();
  const { currentUser } = useStore();

  // ── Data state ──
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [usgResults, setUsgResults] = useState<USGResult[]>([]);
  const [ecgResults, setEcgResults] = useState<ECGResult[]>([]);
  const [radiologyResults, setRadiologyResults] = useState<RadiologyResult[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Form visibility / edit state ──
  const [showLabForm, setShowLabForm] = useState(false);
  const [editingLab, setEditingLab] = useState<LabResult | null>(null);
  const [labForm, setLabForm] = useState<LabFormState>(emptyLabForm());
  const [labSaving, setLabSaving] = useState(false);

  const [showUsgForm, setShowUsgForm] = useState(false);
  const [editingUsg, setEditingUsg] = useState<USGResult | null>(null);
  const [usgForm, setUsgForm] = useState<PhotoFormState>(emptyPhotoForm());
  const [usgFoto, setUsgFoto] = useState<File | null>(null);
  const [usgSaving, setUsgSaving] = useState(false);

  const [showEkgForm, setShowEkgForm] = useState(false);
  const [editingEkg, setEditingEkg] = useState<ECGResult | null>(null);
  const [ekgForm, setEkgForm] = useState<PhotoFormState>(emptyPhotoForm());
  const [ekgFoto, setEkgFoto] = useState<File | null>(null);
  const [ekgSaving, setEkgSaving] = useState(false);

  const [showRadForm, setShowRadForm] = useState(false);
  const [editingRad, setEditingRad] = useState<RadiologyResult | null>(null);
  const [radForm, setRadForm] = useState<PhotoFormState>(emptyPhotoForm());
  const [radFoto, setRadFoto] = useState<File | null>(null);
  const [radSaving, setRadSaving] = useState(false);

  // ── Detail & delete dialogs ──
  const [detailDialog, setDetailDialog] = useState<DetailDialogPayload | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeletePayload | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Upload progress (shared across USG/EKG/Radiologi) ──
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    phase: 'uploading' | 'inserting' | 'done' | 'error';
    pct: number;
    msg?: string;
  }>({ active: false, phase: 'uploading', pct: 0 });

  const onUploadProgress: UploadProgressCb = (phase, pct, msg) => {
    setUploadProgress({ active: phase !== 'done' && phase !== 'error', phase, pct, msg });
  };

  // ── Image preview state (for zoom modal in detail dialog) ──
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // ── Storage RLS setup dialog (shown when uploads are blocked by RLS) ──
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupDialogMsg, setSetupDialogMsg] = useState<string>('');
  const [setupInfo, setSetupInfo] = useState<{
    hasServiceRoleKey: boolean;
    supabaseUrl: string;
  } | null>(null);

  /**
   * Centralised error handler for upload failures. If the error is a Storage
   * RLS block (code === 'STORAGE_RLS_BLOCKED'), opens the setup dialog with
   * the SQL to run. Otherwise shows a destructive toast.
   */
  const handleUploadError = useCallback(
    (err: any) => {
      console.error('[SupportingExamPanel] upload error:', err);
      if (err?.code === 'STORAGE_RLS_BLOCKED') {
        setSetupDialogMsg(err?.message ?? 'Upload diblokir oleh Storage RLS.');
        setSetupDialogOpen(true);
        // Fetch setup info (hasServiceRoleKey etc.) from the diagnostic endpoint.
        fetch('/api/supporting-exams/setup')
          .then((r) => r.json())
          .then((data) => {
            setSetupInfo({
              hasServiceRoleKey: !!data.hasServiceRoleKey,
              supabaseUrl: data.supabaseUrl ?? '',
            });
          })
          .catch(() => {
            /* non-fatal — the dialog still shows the SQL */
          });
        return;
      }
      toast({
        title: 'Gagal',
        description: err?.message || 'Terjadi kesalahan saat menyimpan.',
        variant: 'destructive',
      });
    },
    [toast]
  );

  // ── AI analysis ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // ── Timeline filter & search ──
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [timelineSearch, setTimelineSearch] = useState('');

  // ── Reload all exam lists ─────────────────────────────────────────────────
  const reloadAll = useCallback(async () => {
    if (!palliativePatientId) {
      setLabResults([]);
      setUsgResults([]);
      setEcgResults([]);
      setRadiologyResults([]);
      return;
    }
    setLoading(true);
    try {
      const [lab, usg, ecg, rad] = await Promise.all([
        supportingExamService.listLab(palliativePatientId),
        supportingExamService.listUsg(palliativePatientId),
        supportingExamService.listEcg(palliativePatientId),
        supportingExamService.listRadiology(palliativePatientId),
      ]);
      setLabResults(lab);
      setUsgResults(usg);
      setEcgResults(ecg);
      setRadiologyResults(rad);
    } catch (err) {
      console.error('[SupportingExamPanel.reloadAll]', err);
    } finally {
      setLoading(false);
    }
  }, [palliativePatientId]);

  // ── Initial load + realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!palliativePatientId) {
      setLabResults([]);
      setUsgResults([]);
      setEcgResults([]);
      setRadiologyResults([]);
      return;
    }
    // Initial fetch
    reloadAll();

    // Realtime subscription on patient_documents for this patient
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`supporting-exams-${palliativePatientId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patient_documents',
            filter: `patient_id=eq.${palliativePatientId}`,
          },
          () => {
            // Debounce slightly to avoid multiple reloads when many changes
            reloadAll();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[SupportingExamPanel] realtime subscribe failed:', err);
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, [palliativePatientId, reloadAll]);

  // ── Derived: merged timeline ──────────────────────────────────────────────
  const timeline: SupportingExamUnion[] = useMemo(() => {
    const all: SupportingExamUnion[] = [
      ...labResults.map((data) => ({ type: 'laboratorium' as const, data })),
      ...usgResults.map((data) => ({ type: 'usg' as const, data })),
      ...ecgResults.map((data) => ({ type: 'ekg' as const, data })),
      ...radiologyResults.map((data) => ({ type: 'radiologi' as const, data })),
    ];
    all.sort((a, b) => {
      const ta = new Date((a.data as any).tanggal ?? (a.data as any).createdAt).getTime();
      const tb = new Date((b.data as any).tanggal ?? (b.data as any).createdAt).getTime();
      return tb - ta;
    });
    return all;
  }, [labResults, usgResults, ecgResults, radiologyResults]);

  const filteredTimeline = useMemo(() => {
    let list = timeline;
    if (timelineFilter !== 'all') {
      list = list.filter((t) => t.type === timelineFilter);
    }
    const q = timelineSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const d = t.data as any;
        const tanggal = (d.tanggal ?? '').toLowerCase();
        const createdBy = (d.createdBy ?? '').toLowerCase();
        const jenis =
          d.jenisUsg ?? d.jenisRadiologi ?? TYPE_META[t.type].label;
        const summary = buildTimelineSummary(t);
        return (
          tanggal.includes(q) ||
          createdBy.includes(q) ||
          String(jenis).toLowerCase().includes(q) ||
          summary.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [timeline, timelineFilter, timelineSearch]);

  // ── Latest exams (for dashboard) ──────────────────────────────────────────
  const latestLab = labResults[0];
  const latestUsg = usgResults[0];
  const latestEcg = ecgResults[0];
  const latestRad = radiologyResults[0];

  const latestDate = useMemo(() => {
    const dates: string[] = [];
    if (latestLab?.tanggal) dates.push(latestLab.tanggal);
    if (latestUsg?.tanggal) dates.push(latestUsg.tanggal);
    if (latestEcg?.tanggal) dates.push(latestEcg.tanggal);
    if (latestRad?.tanggal) dates.push(latestRad.tanggal);
    if (dates.length === 0) return null;
    dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return dates[0];
  }, [latestLab, latestUsg, latestEcg, latestRad]);

  // ── Trend chart data for lab ──────────────────────────────────────────────
  const labTrendData = useMemo(() => {
    // Build a sorted-by-date ascending array of lab results with a "tanggal"
    // label and the relevant numeric fields. We then render a chart per field.
    return [...labResults]
      .filter((l) => !!l.tanggal)
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
      .map((l) => ({
        tanggal: formatDate(l.tanggal),
        gdp: l.gdp ?? null,
        hba1c: l.hba1c ?? null,
        kreatinin: l.kreatinin ?? null,
        ldl: l.ldl ?? null,
        trigliserida: l.trigliserida ?? null,
      }));
  }, [labResults]);

  // ── Photo file change handler ─────────────────────────────────────────────
  // Validates: max 20 MB, allowed types: jpg, jpeg, png, webp, pdf.
  // Mirrors the server-side validation in /api/supporting-exams/upload.
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const ALLOWED_FILE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      setter(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File terlalu besar',
        description: 'Ukuran file maksimal 20 MB.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    // Check both MIME type and file extension (some browsers don't set MIME)
    const lowerName = file.name.toLowerCase();
    const extOk = ALLOWED_FILE_EXTS.some((ext) => lowerName.endsWith(ext));
    const typeOk = ALLOWED_FILE_TYPES.includes(file.type);
    if (!typeOk && !extOk) {
      toast({
        title: 'Format tidak didukung',
        description: 'Hanya file JPG, JPEG, PNG, WEBP, atau PDF yang diperbolehkan.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    setter(file);
  };

  // ── Save handlers ─────────────────────────────────────────────────────────

  const handleSaveLab = useCallback(async () => {
    if (!palliativePatientId) return;
    if (!labForm.tanggal) {
      toast({ title: 'Validasi', description: 'Tanggal wajib diisi.', variant: 'destructive' });
      return;
    }
    // Validate numerics >= 0
    const numericFields: (keyof LabFormState)[] = [
      'gdp', 'gds', 'hba1c', 'ureum', 'kreatinin', 'kolesterolTotal',
      'hdl', 'ldl', 'trigliserida', 'mikroalbumin',
    ];
    for (const f of numericFields) {
      const v = num(labForm[f]);
      if (labForm[f] !== '' && v !== undefined && v < 0) {
        toast({ title: 'Validasi', description: `Nilai ${f} tidak boleh negatif.`, variant: 'destructive' });
        return;
      }
    }
    const input: LabInput = {
      patientId: palliativePatientId,
      doctorId: undefined,
      tanggal: labForm.tanggal,
      gdp: num(labForm.gdp),
      gds: num(labForm.gds),
      hba1c: num(labForm.hba1c),
      ureum: num(labForm.ureum),
      kreatinin: num(labForm.kreatinin),
      kolesterolTotal: num(labForm.kolesterolTotal),
      hdl: num(labForm.hdl),
      ldl: num(labForm.ldl),
      trigliserida: num(labForm.trigliserida),
      mikroalbumin: num(labForm.mikroalbumin),
      catatan: labForm.catatan || undefined,
      createdBy: currentUser?.id,
    };
    setLabSaving(true);
    try {
      if (editingLab) {
        const updated = await supportingExamService.updateLab(editingLab.id, input);
        if (!updated) throw new Error('Gagal memperbarui hasil lab');
        toast({ title: 'Berhasil', description: 'Hasil lab berhasil diperbarui.' });
      } else {
        const created = await supportingExamService.createLab(input);
        if (!created) throw new Error('Gagal menyimpan hasil lab');
        toast({ title: 'Berhasil', description: 'Hasil lab berhasil disimpan.' });
      }
      setShowLabForm(false);
      setEditingLab(null);
      setLabForm(emptyLabForm());
      // Realtime will reload; also reload directly to be safe.
      reloadAll();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Gagal',
        description: err?.message || 'Terjadi kesalahan saat menyimpan.',
        variant: 'destructive',
      });
    } finally {
      setLabSaving(false);
    }
  }, [palliativePatientId, labForm, editingLab, currentUser, toast, reloadAll]);

  const handleSaveUsg = useCallback(async () => {
    if (!palliativePatientId) return;
    if (!usgForm.tanggal) {
      toast({ title: 'Validasi', description: 'Tanggal wajib diisi.', variant: 'destructive' });
      return;
    }
    // At least foto or hasil must be provided
    if (!usgFoto && !editingUsg?.fotoUrl && !usgForm.hasil?.trim()) {
      toast({
        title: 'Validasi',
        description: 'Isi minimal salah satu: foto atau hasil pemeriksaan.',
        variant: 'destructive',
      });
      return;
    }
    const input: USGInput = {
      patientId: palliativePatientId,
      tanggal: usgForm.tanggal,
      jenisUsg: usgForm.jenisUsg || undefined,
      hasil: usgForm.hasil || undefined,
      catatan: usgForm.catatan || undefined,
      createdBy: currentUser?.id,
      foto: usgFoto ?? undefined,
    };
    setUsgSaving(true);
    setUploadProgress({ active: true, phase: 'uploading', pct: 0, msg: 'Memulai upload...' });
    try {
      if (editingUsg) {
        const updated = await supportingExamService.updateUsg(editingUsg.id, input, onUploadProgress);
        if (!updated) throw new Error('Gagal memperbarui USG');
        toast({ title: 'Berhasil', description: 'Hasil USG berhasil diperbarui.' });
      } else {
        const created = await supportingExamService.createUsg(input, onUploadProgress);
        if (!created) throw new Error('Gagal menyimpan USG');
        toast({ title: 'Berhasil', description: 'Hasil USG berhasil disimpan.' });
      }
      setShowUsgForm(false);
      setEditingUsg(null);
      setUsgForm(emptyPhotoForm());
      setUsgFoto(null);
      reloadAll();
    } catch (err: any) {
      handleUploadError(err);
    } finally {
      setUsgSaving(false);
      setUploadProgress((p) => ({ ...p, active: false }));
    }
  }, [palliativePatientId, usgForm, usgFoto, editingUsg, currentUser, toast, reloadAll, onUploadProgress, handleUploadError]);

  const handleSaveEkg = useCallback(async () => {
    if (!palliativePatientId) return;
    if (!ekgForm.tanggal) {
      toast({ title: 'Validasi', description: 'Tanggal wajib diisi.', variant: 'destructive' });
      return;
    }
    if (!ekgFoto && !editingEkg?.fotoUrl && !ekgForm.interpretasi?.trim()) {
      toast({
        title: 'Validasi',
        description: 'Isi minimal salah satu: foto atau interpretasi EKG.',
        variant: 'destructive',
      });
      return;
    }
    const input: ECGInput = {
      patientId: palliativePatientId,
      tanggal: ekgForm.tanggal,
      interpretasi: ekgForm.interpretasi || undefined,
      catatan: ekgForm.catatan || undefined,
      createdBy: currentUser?.id,
      foto: ekgFoto ?? undefined,
    };
    setEkgSaving(true);
    setUploadProgress({ active: true, phase: 'uploading', pct: 0, msg: 'Memulai upload...' });
    try {
      if (editingEkg) {
        const updated = await supportingExamService.updateEcg(editingEkg.id, input, onUploadProgress);
        if (!updated) throw new Error('Gagal memperbarui EKG');
        toast({ title: 'Berhasil', description: 'Hasil EKG berhasil diperbarui.' });
      } else {
        const created = await supportingExamService.createEcg(input, onUploadProgress);
        if (!created) throw new Error('Gagal menyimpan EKG');
        toast({ title: 'Berhasil', description: 'Hasil EKG berhasil disimpan.' });
      }
      setShowEkgForm(false);
      setEditingEkg(null);
      setEkgForm(emptyPhotoForm());
      setEkgFoto(null);
      reloadAll();
    } catch (err: any) {
      handleUploadError(err);
    } finally {
      setEkgSaving(false);
      setUploadProgress((p) => ({ ...p, active: false }));
    }
  }, [palliativePatientId, ekgForm, ekgFoto, editingEkg, currentUser, toast, reloadAll, onUploadProgress, handleUploadError]);

  const handleSaveRad = useCallback(async () => {
    if (!palliativePatientId) return;
    if (!radForm.tanggal) {
      toast({ title: 'Validasi', description: 'Tanggal wajib diisi.', variant: 'destructive' });
      return;
    }
    if (!radFoto && !editingRad?.fotoUrl && !radForm.hasil?.trim()) {
      toast({
        title: 'Validasi',
        description: 'Isi minimal salah satu: foto atau hasil pemeriksaan.',
        variant: 'destructive',
      });
      return;
    }
    const input: RadiologyInput = {
      patientId: palliativePatientId,
      tanggal: radForm.tanggal,
      jenisRadiologi: radForm.jenisRadiologi || undefined,
      hasil: radForm.hasil || undefined,
      catatan: radForm.catatan || undefined,
      createdBy: currentUser?.id,
      foto: radFoto ?? undefined,
    };
    setRadSaving(true);
    setUploadProgress({ active: true, phase: 'uploading', pct: 0, msg: 'Memulai upload...' });
    try {
      if (editingRad) {
        const updated = await supportingExamService.updateRadiology(editingRad.id, input, onUploadProgress);
        if (!updated) throw new Error('Gagal memperbarui Radiologi');
        toast({ title: 'Berhasil', description: 'Hasil radiologi berhasil diperbarui.' });
      } else {
        const created = await supportingExamService.createRadiology(input, onUploadProgress);
        if (!created) throw new Error('Gagal menyimpan Radiologi');
        toast({ title: 'Berhasil', description: 'Hasil radiologi berhasil disimpan.' });
      }
      setShowRadForm(false);
      setEditingRad(null);
      setRadForm(emptyPhotoForm());
      setRadFoto(null);
      reloadAll();
    } catch (err: any) {
      handleUploadError(err);
    } finally {
      setRadSaving(false);
      setUploadProgress((p) => ({ ...p, active: false }));
    }
  }, [palliativePatientId, radForm, radFoto, editingRad, currentUser, toast, reloadAll, onUploadProgress, handleUploadError]);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      let ok = false;
      switch (confirmDelete.type) {
        case 'laboratorium': ok = await supportingExamService.deleteLab(confirmDelete.id); break;
        case 'usg': ok = await supportingExamService.deleteUsg(confirmDelete.id); break;
        case 'ekg': ok = await supportingExamService.deleteEcg(confirmDelete.id); break;
        case 'radiologi': ok = await supportingExamService.deleteRadiology(confirmDelete.id); break;
      }
      if (!ok) throw new Error('Gagal menghapus data');
      toast({ title: 'Berhasil', description: 'Data berhasil dihapus.' });
      reloadAll();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Gagal',
        description: err?.message || 'Terjadi kesalahan saat menghapus.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }, [confirmDelete, toast, reloadAll]);

  // ── Edit handlers (pre-fill form) ─────────────────────────────────────────
  const startEditLab = (lab: LabResult) => {
    setEditingLab(lab);
    setLabForm({
      tanggal: lab.tanggal ?? todayStr(),
      gdp: lab.gdp != null ? String(lab.gdp) : '',
      gds: lab.gds != null ? String(lab.gds) : '',
      hba1c: lab.hba1c != null ? String(lab.hba1c) : '',
      ureum: lab.ureum != null ? String(lab.ureum) : '',
      kreatinin: lab.kreatinin != null ? String(lab.kreatinin) : '',
      kolesterolTotal: lab.kolesterolTotal != null ? String(lab.kolesterolTotal) : '',
      hdl: lab.hdl != null ? String(lab.hdl) : '',
      ldl: lab.ldl != null ? String(lab.ldl) : '',
      trigliserida: lab.trigliserida != null ? String(lab.trigliserida) : '',
      mikroalbumin: lab.mikroalbumin != null ? String(lab.mikroalbumin) : '',
      catatan: lab.catatan ?? '',
    });
    setShowLabForm(true);
    setActiveSubTab('lab');
  };

  const startEditUsg = (usg: USGResult) => {
    setEditingUsg(usg);
    setUsgForm({
      tanggal: usg.tanggal ?? todayStr(),
      jenisUsg: usg.jenisUsg ?? '',
      jenisRadiologi: '',
      hasil: usg.hasil ?? '',
      interpretasi: '',
      catatan: usg.catatan ?? '',
    });
    setUsgFoto(null);
    setShowUsgForm(true);
    setActiveSubTab('usg');
  };

  const startEditEkg = (ecg: ECGResult) => {
    setEditingEkg(ecg);
    setEkgForm({
      tanggal: ecg.tanggal ?? todayStr(),
      jenisUsg: '',
      jenisRadiologi: '',
      hasil: '',
      interpretasi: ecg.interpretasi ?? '',
      catatan: ecg.catatan ?? '',
    });
    setEkgFoto(null);
    setShowEkgForm(true);
    setActiveSubTab('ekg');
  };

  const startEditRad = (rad: RadiologyResult) => {
    setEditingRad(rad);
    setRadForm({
      tanggal: rad.tanggal ?? todayStr(),
      jenisUsg: '',
      jenisRadiologi: rad.jenisRadiologi ?? '',
      hasil: rad.hasil ?? '',
      interpretasi: '',
      catatan: rad.catatan ?? '',
    });
    setRadFoto(null);
    setShowRadForm(true);
    setActiveSubTab('radiologi');
  };

  // ── AI analysis ───────────────────────────────────────────────────────────
  const handleRunAi = useCallback(async () => {
    if (!palliativePatientId) return;
    setAiLoading(true);
    setAiDialogOpen(true);
    setAiAnalysis(null);
    try {
      const resp = await fetch('/api/supporting-exams/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: palliativePatientId, patientName }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setAiAnalysis(data.analysis ?? 'Tidak ada hasil analisis.');
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Gagal',
        description: err?.message || 'Gagal menghasilkan analisis AI.',
        variant: 'destructive',
      });
      setAiDialogOpen(false);
    } finally {
      setAiLoading(false);
    }
  }, [palliativePatientId, patientName, toast]);

  // ── Cetak PDF (single record print window) ────────────────────────────────
  const handlePrintLab = (lab: LabResult) => {
    const rows: [string, string][] = [
      ['Tanggal', formatDate(lab.tanggal)],
      ['GDP (mg/dL)', lab.gdp != null ? String(lab.gdp) : '-'],
      ['GDS (mg/dL)', lab.gds != null ? String(lab.gds) : '-'],
      ['HbA1c (%)', lab.hba1c != null ? String(lab.hba1c) : '-'],
      ['Ureum (mg/dL)', lab.ureum != null ? String(lab.ureum) : '-'],
      ['Kreatinin (mg/dL)', lab.kreatinin != null ? String(lab.kreatinin) : '-'],
      ['Kolesterol Total (mg/dL)', lab.kolesterolTotal != null ? String(lab.kolesterolTotal) : '-'],
      ['HDL (mg/dL)', lab.hdl != null ? String(lab.hdl) : '-'],
      ['LDL (mg/dL)', lab.ldl != null ? String(lab.ldl) : '-'],
      ['Trigliserida (mg/dL)', lab.trigliserida != null ? String(lab.trigliserida) : '-'],
      ['Mikroalbumin (mg/dL)', lab.mikroalbumin != null ? String(lab.mikroalbumin) : '-'],
      ['Catatan', lab.catatan ?? '-'],
    ];
    openPrintWindow({
      title: `Hasil Laboratorium — ${patientName ?? 'Pasien'}`,
      rows,
    });
  };

  const handlePrintPhoto = (
    type: 'usg' | 'ekg' | 'radiologi',
    data: USGResult | ECGResult | RadiologyResult
  ) => {
    const labelMap = { usg: 'USG', ekg: 'EKG', radiologi: 'Radiologi' };
    const rows: [string, string][] = [
      ['Tanggal', formatDate(data.tanggal)],
    ];
    if (type === 'usg') {
      const u = data as USGResult;
      rows.push(['Jenis USG', u.jenisUsg ?? '-']);
      rows.push(['Hasil', u.hasil ?? '-']);
    } else if (type === 'ekg') {
      const e = data as ECGResult;
      rows.push(['Interpretasi', e.interpretasi ?? '-']);
    } else if (type === 'radiologi') {
      const r = data as RadiologyResult;
      rows.push(['Jenis Radiologi', r.jenisRadiologi ?? '-']);
      rows.push(['Hasil', r.hasil ?? '-']);
    }
    rows.push(['Catatan', data.catatan ?? '-']);
    const fotoUrl = (data as any).fotoUrl as string | undefined;
    openPrintWindow({
      title: `Hasil ${labelMap[type]} — ${patientName ?? 'Pasien'}`,
      rows,
      imageUrl: fotoUrl,
    });
  };

  // ── Render: empty patient prompt ──────────────────────────────────────────
  if (!palliativePatientId) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium">Pilih pasien terlebih dahulu</p>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih pasien paliatif di panelMonitoring Paliatif untuk melihat
            pemeriksaan penunjang.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render: main ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Sticky AI button + sub-tab switcher */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-1 px-1 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <FlaskConical className="w-3.5 h-3.5 mr-1" />
              Pemeriksaan Penunjang
            </Badge>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {patientName ?? 'Pasien'}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleRunAi}
            disabled={aiLoading}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {aiLoading ? 'AI menganalisis...' : 'Analisis AI'}
          </Button>
        </div>

        {/* Sub-tab bar */}
        <div className="mt-3 overflow-x-auto">
          <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SubTab)}>
            <TabsList className="h-auto flex w-max">
              <TabsTrigger value="dashboard" className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="lab" className="text-xs">
                <FlaskConical className="w-3.5 h-3.5 mr-1" /> Laboratorium
              </TabsTrigger>
              <TabsTrigger value="usg" className="text-xs">
                <Waves className="w-3.5 h-3.5 mr-1" /> USG
              </TabsTrigger>
              <TabsTrigger value="ekg" className="text-xs">
                <HeartPulse className="w-3.5 h-3.5 mr-1" /> EKG
              </TabsTrigger>
              <TabsTrigger value="radiologi" className="text-xs">
                <Scan className="w-3.5 h-3.5 mr-1" /> Radiologi
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">
                <Calendar className="w-3.5 h-3.5 mr-1" /> Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memuat data...
        </div>
      )}

      {/* Sub-tab content */}
      {!loading && (
        <>
          {activeSubTab === 'dashboard' && renderDashboard()}
          {activeSubTab === 'lab' && renderLab()}
          {activeSubTab === 'usg' && renderUsg()}
          {activeSubTab === 'ekg' && renderEkg()}
          {activeSubTab === 'radiologi' && renderRadiologi()}
          {activeSubTab === 'timeline' && renderTimeline()}
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(o) => !o && setDetailDialog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailDialog && (() => {
                const Meta = TYPE_META[detailDialog.type];
                const Icon = Meta.icon;
                return (
                  <>
                    <span className={cn('inline-flex w-8 h-8 items-center justify-center rounded-full', Meta.bg)}>
                      <Icon className={cn('w-4 h-4', Meta.text)} />
                    </span>
                    Detail {Meta.label}
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              Detail hasil pemeriksaan penunjang pasien {patientName ?? ''}.
            </DialogDescription>
          </DialogHeader>
          {detailDialog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="pr-2">
                {renderDetailBody(detailDialog)}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus data {confirmDelete ? TYPE_META[confirmDelete.type].label : ''} ini?
              Tindakan ini tidak dapat dibatalkan. File di Storage juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Zoom image dialog (full-screen viewer for exam photos) */}
      <ZoomImageDialog url={zoomImage} onClose={() => setZoomImage(null)} />

      {/* Storage RLS setup dialog (shown when uploads are blocked by RLS) */}
      <StorageSetupDialog
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        message={setupDialogMsg}
        sql={STORAGE_SETUP_SQL}
        hasServiceRoleKey={setupInfo?.hasServiceRoleKey ?? false}
        supabaseUrl={setupInfo?.supabaseUrl ?? ''}
      />

      {/* AI dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(o) => !o && !aiLoading && setAiDialogOpen(false)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Analisis AI — Pemeriksaan Penunjang
            </DialogTitle>
            <DialogDescription>
              {patientName ?? 'Pasien'} — Hasil interpretasi AI atas data laboratorium,
              USG, EKG, dan radiologi.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="pr-2">
              {aiLoading && !aiAnalysis && (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="w-6 h-6 mb-3 animate-spin text-amber-500" />
                  AI sedang menganalisis data pemeriksaan penunjang...
                  <span className="text-xs mt-1">Proses ini dapat memakan waktu 30-90 detik.</span>
                </div>
              )}
              {aiAnalysis && (
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed bg-muted/40 rounded-md p-4 border">
                  {aiAnalysis}
                </pre>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiDialogOpen(false)}
              disabled={aiLoading}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Sub-render: Dashboard Ringkas ─────────────────────────────────────────
  function renderDashboard() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Lab Terakhir */}
          <Card className={cn('border', TYPE_META.laboratorium.border)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn('inline-flex w-8 h-8 items-center justify-center rounded-full', TYPE_META.laboratorium.bg)}>
                    <FlaskConical className={cn('w-4 h-4', TYPE_META.laboratorium.text)} />
                  </span>
                  Lab Terakhir
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {latestLab ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HbA1c</span>
                    <span className={cn('font-semibold', isAbnormal('hba1c', latestLab.hba1c) && 'text-red-600')}>
                      {latestLab.hba1c != null ? `${latestLab.hba1c}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GDP</span>
                    <span className={cn('font-semibold', isAbnormal('gdp', latestLab.gdp) && 'text-red-600')}>
                      {latestLab.gdp != null ? `${latestLab.gdp} mg/dL` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(latestLab.tanggal)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-emerald-700 hover:text-emerald-800"
                    onClick={() => setActiveSubTab('lab')}
                  >
                    Lihat Riwayat <Eye className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <EmptyCard onAdd={() => setActiveSubTab('lab')} type="laboratorium" />
              )}
            </CardContent>
          </Card>

          {/* USG Terakhir */}
          <Card className={cn('border', TYPE_META.usg.border)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className={cn('inline-flex w-8 h-8 items-center justify-center rounded-full', TYPE_META.usg.bg)}>
                  <Waves className={cn('w-4 h-4', TYPE_META.usg.text)} />
                </span>
                USG Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {latestUsg ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Jenis</span>
                    <span className="font-semibold truncate ml-2 text-right">{latestUsg.jenisUsg ?? '-'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(latestUsg.tanggal)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-sky-700 hover:text-sky-800"
                    onClick={() => setActiveSubTab('usg')}
                  >
                    Lihat Riwayat <Eye className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <EmptyCard onAdd={() => setActiveSubTab('usg')} type="usg" />
              )}
            </CardContent>
          </Card>

          {/* EKG Terakhir */}
          <Card className={cn('border', TYPE_META.ekg.border)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className={cn('inline-flex w-8 h-8 items-center justify-center rounded-full', TYPE_META.ekg.bg)}>
                  <HeartPulse className={cn('w-4 h-4', TYPE_META.ekg.text)} />
                </span>
                EKG Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {latestEcg ? (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Interpretasi: </span>
                    <span className="font-medium line-clamp-2">
                      {latestEcg.interpretasi ?? '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(latestEcg.tanggal)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-rose-700 hover:text-rose-800"
                    onClick={() => setActiveSubTab('ekg')}
                  >
                    Lihat Riwayat <Eye className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <EmptyCard onAdd={() => setActiveSubTab('ekg')} type="ekg" />
              )}
            </CardContent>
          </Card>

          {/* Radiologi Terakhir */}
          <Card className={cn('border', TYPE_META.radiologi.border)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className={cn('inline-flex w-8 h-8 items-center justify-center rounded-full', TYPE_META.radiologi.bg)}>
                  <Scan className={cn('w-4 h-4', TYPE_META.radiologi.text)} />
                </span>
                Radiologi Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {latestRad ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Jenis</span>
                    <span className="font-semibold truncate ml-2 text-right">{latestRad.jenisRadiologi ?? '-'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(latestRad.tanggal)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-violet-700 hover:text-violet-800"
                    onClick={() => setActiveSubTab('radiologi')}
                  >
                    Lihat Riwayat <Eye className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </>
              ) : (
                <EmptyCard onAdd={() => setActiveSubTab('radiologi')} type="radiologi" />
              )}
            </CardContent>
          </Card>

          {/* Tanggal pemeriksaan terakhir */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-amber-100">
                  <Calendar className="w-4 h-4 text-amber-700" />
                </span>
                Pemeriksaan Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              <div className="text-2xl font-bold text-amber-800">
                {latestDate ? formatDate(latestDate) : '-'}
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {timeline.length} pemeriksaan
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-amber-700 hover:text-amber-800"
                onClick={() => setActiveSubTab('timeline')}
              >
                Lihat Timeline <Calendar className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* AI shortcut card */}
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-amber-100">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                </span>
                Analisis AI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Interpretasi otomatis seluruh hasil pemeriksaan penunjang oleh AI
                klinis (Ringkasan, Nilai Abnormal, Rekomendasi, Draft SOAP).
              </p>
              <Button
                size="sm"
                className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={handleRunAi}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Jalankan AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Sub-render: Laboratorium ──────────────────────────────────────────────
  function renderLab() {
    return (
      <div className="space-y-4">
        {/* Collapsible form */}
        <Card>
          <Collapsible
            open={showLabForm}
            onOpenChange={(o) => {
              setShowLabForm(o);
              if (!o) {
                setEditingLab(null);
                setLabForm(emptyLabForm());
              }
            }}
          >
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant={showLabForm ? 'ghost' : 'default'}
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                >
                  {showLabForm ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" /> Tutup Form
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Tambah Lab
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              {editingLab && (
                <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 w-fit">
                  Mode Edit — {formatDate(editingLab.tanggal)}
                </Badge>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="lab-tanggal">Tanggal Pemeriksaan <span className="text-red-500">*</span></Label>
                    <Input
                      id="lab-tanggal"
                      type="date"
                      value={labForm.tanggal}
                      onChange={(e) => setLabForm({ ...labForm, tanggal: e.target.value })}
                    />
                  </div>
                  <LabNumberInput label="GDP (mg/dL)" value={labForm.gdp} onChange={(v) => setLabForm({ ...labForm, gdp: v })} />
                  <LabNumberInput label="GDS (mg/dL)" value={labForm.gds} onChange={(v) => setLabForm({ ...labForm, gds: v })} />
                  <LabNumberInput label="HbA1c (%)" value={labForm.hba1c} onChange={(v) => setLabForm({ ...labForm, hba1c: v })} step="0.1" />
                  <LabNumberInput label="Ureum (mg/dL)" value={labForm.ureum} onChange={(v) => setLabForm({ ...labForm, ureum: v })} />
                  <LabNumberInput label="Kreatinin (mg/dL)" value={labForm.kreatinin} onChange={(v) => setLabForm({ ...labForm, kreatinin: v })} />
                  <LabNumberInput label="Kolesterol Total (mg/dL)" value={labForm.kolesterolTotal} onChange={(v) => setLabForm({ ...labForm, kolesterolTotal: v })} />
                  <LabNumberInput label="HDL (mg/dL)" value={labForm.hdl} onChange={(v) => setLabForm({ ...labForm, hdl: v })} />
                  <LabNumberInput label="LDL (mg/dL)" value={labForm.ldl} onChange={(v) => setLabForm({ ...labForm, ldl: v })} />
                  <LabNumberInput label="Trigliserida (mg/dL)" value={labForm.trigliserida} onChange={(v) => setLabForm({ ...labForm, trigliserida: v })} />
                  <LabNumberInput label="Mikroalbumin (mg/dL)" value={labForm.mikroalbumin} onChange={(v) => setLabForm({ ...labForm, mikroalbumin: v })} />
                </div>
                <div>
                  <Label htmlFor="lab-catatan">Catatan</Label>
                  <Textarea
                    id="lab-catatan"
                    rows={2}
                    placeholder="Catatan tambahan..."
                    value={labForm.catatan}
                    onChange={(e) => setLabForm({ ...labForm, catatan: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLabForm(emptyLabForm());
                      setEditingLab(null);
                    }}
                  >
                    Reset
                  </Button>
                  <Button onClick={handleSaveLab} disabled={labSaving}>
                    {labSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Simpan
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Trend charts */}
        {labTrendData.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                Tren Hasil Laboratorium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <TrendChart
                  title="GDP (mg/dL)"
                  data={labTrendData}
                  dataKey="gdp"
                  color="#10b981"
                  threshold={250}
                />
                <TrendChart
                  title="HbA1c (%)"
                  data={labTrendData}
                  dataKey="hba1c"
                  color="#0ea5e9"
                  threshold={9}
                />
                <TrendChart
                  title="Kreatinin (mg/dL)"
                  data={labTrendData}
                  dataKey="kreatinin"
                  color="#f97316"
                  threshold={2.0}
                />
                <TrendChart
                  title="LDL (mg/dL)"
                  data={labTrendData}
                  dataKey="ldl"
                  color="#8b5cf6"
                  threshold={190}
                />
                <TrendChart
                  title="Trigliserida (mg/dL)"
                  data={labTrendData}
                  dataKey="trigliserida"
                  color="#ef4444"
                  threshold={200}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* History table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Riwayat Laboratorium ({labResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {labResults.length === 0 ? (
              <EmptyState
                message="Belum ada data laboratorium. Klik '+ Tambah Lab' untuk menambahkan."
                onAdd={() => setShowLabForm(true)}
                addLabel="+ Tambah Lab"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                      <TableHead className="text-right">GDP</TableHead>
                      <TableHead className="text-right">GDS</TableHead>
                      <TableHead className="text-right">HbA1c</TableHead>
                      <TableHead className="text-right">Ur</TableHead>
                      <TableHead className="text-right">Cr</TableHead>
                      <TableHead className="text-right">Kol</TableHead>
                      <TableHead className="text-right">HDL</TableHead>
                      <TableHead className="text-right">LDL</TableHead>
                      <TableHead className="text-right">Trig</TableHead>
                      <TableHead className="text-right">Mikro</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labResults.map((lab) => (
                      <TableRow key={lab.id}>
                        <TableCell className="whitespace-nowrap font-medium text-xs">
                          {formatDate(lab.tanggal)}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('gdp', lab.gdp) && 'text-red-600 font-semibold')}>
                          {lab.gdp ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('gds', lab.gds) && 'text-red-600 font-semibold')}>
                          {lab.gds ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('hba1c', lab.hba1c) && 'text-red-600 font-semibold')}>
                          {lab.hba1c != null ? `${lab.hba1c}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs">{lab.ureum ?? '-'}</TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('kreatinin', lab.kreatinin) && 'text-red-600 font-semibold')}>
                          {lab.kreatinin ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('kolesterolTotal', lab.kolesterolTotal) && 'text-red-600 font-semibold')}>
                          {lab.kolesterolTotal ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('hdl', lab.hdl) && 'text-red-600 font-semibold')}>
                          {lab.hdl ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('ldl', lab.ldl) && 'text-red-600 font-semibold')}>
                          {lab.ldl ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('trigliserida', lab.trigliserida) && 'text-red-600 font-semibold')}>
                          {lab.trigliserida ?? '-'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', isAbnormal('mikroalbumin', lab.mikroalbumin) && 'text-red-600 font-semibold')}>
                          {lab.mikroalbumin ?? '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {lab.catatan ?? '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn title="Lihat" onClick={() => setDetailDialog({ type: 'laboratorium', data: lab })}>
                              <Eye className="w-3.5 h-3.5" />
                            </IconBtn>
                            <IconBtn title="Edit" onClick={() => startEditLab(lab)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </IconBtn>
                            <IconBtn title="Cetak PDF" onClick={() => handlePrintLab(lab)}>
                              <Printer className="w-3.5 h-3.5" />
                            </IconBtn>
                            <IconBtn title="Hapus" variant="danger" onClick={() => setConfirmDelete({ type: 'laboratorium', id: lab.id })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </IconBtn>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sub-render: USG ───────────────────────────────────────────────────────
  function renderUsg() {
    return (
      <div className="space-y-4">
        <Card>
          <Collapsible
            open={showUsgForm}
            onOpenChange={(o) => {
              setShowUsgForm(o);
              if (!o) {
                setEditingUsg(null);
                setUsgForm(emptyPhotoForm());
                setUsgFoto(null);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant={showUsgForm ? 'ghost' : 'default'}
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                >
                  {showUsgForm ? (
                    <><ChevronUp className="w-4 h-4 mr-2" /> Tutup Form</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Tambah USG</>
                  )}
                </Button>
              </CollapsibleTrigger>
              {editingUsg && (
                <Badge variant="outline" className="text-sky-700 border-sky-200 bg-sky-50 w-fit">
                  Mode Edit — {formatDate(editingUsg.tanggal)}
                </Badge>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="usg-tanggal">Tanggal Pemeriksaan <span className="text-red-500">*</span></Label>
                    <Input
                      id="usg-tanggal"
                      type="date"
                      value={usgForm.tanggal}
                      onChange={(e) => setUsgForm({ ...usgForm, tanggal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Jenis USG</Label>
                    <Select
                      value={usgForm.jenisUsg || '__none__'}
                      onValueChange={(v) => setUsgForm({ ...usgForm, jenisUsg: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis USG" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Tidak dipilih —</SelectItem>
                        {JENIS_USG_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="usg-foto">Upload Foto / Dokumen (max 20 MB, gambar/PDF)</Label>
                  <Input
                    id="usg-foto"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setUsgFoto)}
                  />
                  {usgFoto && (
                    <p className="text-xs text-muted-foreground mt-1">
                      File terpilih: {usgFoto.name} ({(usgFoto.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {editingUsg?.fotoUrl && !usgFoto && (
                    <p className="text-xs text-sky-700 mt-1">
                      Foto saat ini: <a href={editingUsg.fotoUrl} target="_blank" rel="noopener noreferrer" className="underline">lihat</a>
                      (upload file baru untuk mengganti)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="usg-hasil">Hasil Pemeriksaan</Label>
                  <Textarea
                    id="usg-hasil"
                    rows={3}
                    placeholder="Temuan pemeriksaan USG..."
                    value={usgForm.hasil}
                    onChange={(e) => setUsgForm({ ...usgForm, hasil: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="usg-catatan">Catatan</Label>
                  <Textarea
                    id="usg-catatan"
                    rows={2}
                    placeholder="Catatan tambahan..."
                    value={usgForm.catatan}
                    onChange={(e) => setUsgForm({ ...usgForm, catatan: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setUsgForm(emptyPhotoForm()); setUsgFoto(null); setEditingUsg(null); }}>
                    Reset
                  </Button>
                  <Button onClick={handleSaveUsg} disabled={usgSaving}>
                    {usgSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Simpan
                  </Button>
                </div>
                {uploadProgress.active && <UploadProgressBar progress={uploadProgress} />}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Waves className="w-4 h-4 text-sky-600" />
              Riwayat USG ({usgResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {usgResults.length === 0 ? (
              <EmptyState
                message="Belum ada data USG. Klik '+ Tambah USG' untuk menambahkan."
                onAdd={() => setShowUsgForm(true)}
                addLabel="+ Tambah USG"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {usgResults.map((u) => (
                  <PhotoCard
                    key={u.id}
                    type="usg"
                    tanggal={u.tanggal}
                    title={u.jenisUsg ?? 'USG'}
                    subtitle={u.hasil ?? ''}
                    catatan={u.catatan}
                    fotoUrl={u.fotoUrl}
                    onDetail={() => setDetailDialog({ type: 'usg', data: u })}
                    onEdit={() => startEditUsg(u)}
                    onDelete={() => setConfirmDelete({ type: 'usg', id: u.id })}
                    onPrint={() => handlePrintPhoto('usg', u)}
                    createdBy={u.createdBy}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sub-render: EKG ───────────────────────────────────────────────────────
  function renderEkg() {
    return (
      <div className="space-y-4">
        <Card>
          <Collapsible
            open={showEkgForm}
            onOpenChange={(o) => {
              setShowEkgForm(o);
              if (!o) {
                setEditingEkg(null);
                setEkgForm(emptyPhotoForm());
                setEkgFoto(null);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant={showEkgForm ? 'ghost' : 'default'}
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                >
                  {showEkgForm ? (
                    <><ChevronUp className="w-4 h-4 mr-2" /> Tutup Form</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Tambah EKG</>
                  )}
                </Button>
              </CollapsibleTrigger>
              {editingEkg && (
                <Badge variant="outline" className="text-rose-700 border-rose-200 bg-rose-50 w-fit">
                  Mode Edit — {formatDate(editingEkg.tanggal)}
                </Badge>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ekg-tanggal">Tanggal Pemeriksaan <span className="text-red-500">*</span></Label>
                    <Input
                      id="ekg-tanggal"
                      type="date"
                      value={ekgForm.tanggal}
                      onChange={(e) => setEkgForm({ ...ekgForm, tanggal: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ekg-foto">Upload Foto EKG (max 20 MB, gambar/PDF)</Label>
                  <Input
                    id="ekg-foto"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setEkgFoto)}
                  />
                  {ekgFoto && (
                    <p className="text-xs text-muted-foreground mt-1">
                      File terpilih: {ekgFoto.name} ({(ekgFoto.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {editingEkg?.fotoUrl && !ekgFoto && (
                    <p className="text-xs text-rose-700 mt-1">
                      Foto saat ini: <a href={editingEkg.fotoUrl} target="_blank" rel="noopener noreferrer" className="underline">lihat</a>
                      (upload file baru untuk mengganti)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="ekg-interpretasi">Interpretasi</Label>
                  <Textarea
                    id="ekg-interpretasi"
                    rows={3}
                    placeholder="Interpretasi hasil EKG..."
                    value={ekgForm.interpretasi}
                    onChange={(e) => setEkgForm({ ...ekgForm, interpretasi: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ekg-catatan">Catatan</Label>
                  <Textarea
                    id="ekg-catatan"
                    rows={2}
                    placeholder="Catatan tambahan..."
                    value={ekgForm.catatan}
                    onChange={(e) => setEkgForm({ ...ekgForm, catatan: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setEkgForm(emptyPhotoForm()); setEkgFoto(null); setEditingEkg(null); }}>
                    Reset
                  </Button>
                  <Button onClick={handleSaveEkg} disabled={ekgSaving}>
                    {ekgSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Simpan
                  </Button>
                </div>
                {uploadProgress.active && <UploadProgressBar progress={uploadProgress} />}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              Riwayat EKG ({ecgResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {ecgResults.length === 0 ? (
              <EmptyState
                message="Belum ada data EKG. Klik '+ Tambah EKG' untuk menambahkan."
                onAdd={() => setShowEkgForm(true)}
                addLabel="+ Tambah EKG"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ecgResults.map((e) => (
                  <PhotoCard
                    key={e.id}
                    type="ekg"
                    tanggal={e.tanggal}
                    title="EKG"
                    subtitle={e.interpretasi ?? ''}
                    catatan={e.catatan}
                    fotoUrl={e.fotoUrl}
                    onDetail={() => setDetailDialog({ type: 'ekg', data: e })}
                    onEdit={() => startEditEkg(e)}
                    onDelete={() => setConfirmDelete({ type: 'ekg', id: e.id })}
                    onPrint={() => handlePrintPhoto('ekg', e)}
                    createdBy={e.createdBy}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sub-render: Radiologi ─────────────────────────────────────────────────
  function renderRadiologi() {
    return (
      <div className="space-y-4">
        <Card>
          <Collapsible
            open={showRadForm}
            onOpenChange={(o) => {
              setShowRadForm(o);
              if (!o) {
                setEditingRad(null);
                setRadForm(emptyPhotoForm());
                setRadFoto(null);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <Button
                  variant={showRadForm ? 'ghost' : 'default'}
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                >
                  {showRadForm ? (
                    <><ChevronUp className="w-4 h-4 mr-2" /> Tutup Form</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Tambah Radiologi</>
                  )}
                </Button>
              </CollapsibleTrigger>
              {editingRad && (
                <Badge variant="outline" className="text-violet-700 border-violet-200 bg-violet-50 w-fit">
                  Mode Edit — {formatDate(editingRad.tanggal)}
                </Badge>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rad-tanggal">Tanggal Pemeriksaan <span className="text-red-500">*</span></Label>
                    <Input
                      id="rad-tanggal"
                      type="date"
                      value={radForm.tanggal}
                      onChange={(e) => setRadForm({ ...radForm, tanggal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Jenis Radiologi</Label>
                    <Select
                      value={radForm.jenisRadiologi || '__none__'}
                      onValueChange={(v) => setRadForm({ ...radForm, jenisRadiologi: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis radiologi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Tidak dipilih —</SelectItem>
                        {JENIS_RADIOLOGI_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rad-foto">Upload Foto / Dokumen (max 20 MB, gambar/PDF)</Label>
                  <Input
                    id="rad-foto"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setRadFoto)}
                  />
                  {radFoto && (
                    <p className="text-xs text-muted-foreground mt-1">
                      File terpilih: {radFoto.name} ({(radFoto.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {editingRad?.fotoUrl && !radFoto && (
                    <p className="text-xs text-violet-700 mt-1">
                      Foto saat ini: <a href={editingRad.fotoUrl} target="_blank" rel="noopener noreferrer" className="underline">lihat</a>
                      (upload file baru untuk mengganti)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="rad-hasil">Hasil Pemeriksaan</Label>
                  <Textarea
                    id="rad-hasil"
                    rows={3}
                    placeholder="Temuan pemeriksaan radiologi..."
                    value={radForm.hasil}
                    onChange={(e) => setRadForm({ ...radForm, hasil: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rad-catatan">Catatan</Label>
                  <Textarea
                    id="rad-catatan"
                    rows={2}
                    placeholder="Catatan tambahan..."
                    value={radForm.catatan}
                    onChange={(e) => setRadForm({ ...radForm, catatan: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setRadForm(emptyPhotoForm()); setRadFoto(null); setEditingRad(null); }}>
                    Reset
                  </Button>
                  <Button onClick={handleSaveRad} disabled={radSaving}>
                    {radSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Simpan
                  </Button>
                </div>
                {uploadProgress.active && <UploadProgressBar progress={uploadProgress} />}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scan className="w-4 h-4 text-violet-600" />
              Riwayat Radiologi ({radiologyResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {radiologyResults.length === 0 ? (
              <EmptyState
                message="Belum ada data radiologi. Klik '+ Tambah Radiologi' untuk menambahkan."
                onAdd={() => setShowRadForm(true)}
                addLabel="+ Tambah Radiologi"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {radiologyResults.map((r) => (
                  <PhotoCard
                    key={r.id}
                    type="radiologi"
                    tanggal={r.tanggal}
                    title={r.jenisRadiologi ?? 'Radiologi'}
                    subtitle={r.hasil ?? ''}
                    catatan={r.catatan}
                    fotoUrl={r.fotoUrl}
                    onDetail={() => setDetailDialog({ type: 'radiologi', data: r })}
                    onEdit={() => startEditRad(r)}
                    onDelete={() => setConfirmDelete({ type: 'radiologi', id: r.id })}
                    onPrint={() => handlePrintPhoto('radiologi', r)}
                    createdBy={r.createdBy}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sub-render: Timeline ──────────────────────────────────────────────────
  function renderTimeline() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            Timeline Pemeriksaan Penunjang
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Filter + search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={timelineFilter} onValueChange={(v) => setTimelineFilter(v as TimelineFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="laboratorium">Laboratorium</SelectItem>
                  <SelectItem value="usg">USG</SelectItem>
                  <SelectItem value="ekg">EKG</SelectItem>
                  <SelectItem value="radiologi">Radiologi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari tanggal, jenis, atau dokter..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {filteredTimeline.length} dari {timeline.length}
            </Badge>
          </div>

          {filteredTimeline.length === 0 ? (
            <EmptyState
              message={
                timeline.length === 0
                  ? 'Belum ada data pemeriksaan penunjang. Gunakan tab di atas untuk menambahkan.'
                  : 'Tidak ada hasil yang cocok dengan filter/pencarian.'
              }
            />
          ) : (
            <div className="relative pl-4">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-amber-200" />
              <div className="space-y-3">
                {filteredTimeline.map((item) => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  const d = item.data as any;
                  return (
                    <div key={`${item.type}-${d.id}`} className="relative pl-6">
                      <span
                        className={cn(
                          'absolute left-0 top-1 inline-flex w-4 h-4 items-center justify-center rounded-full ring-2 ring-background',
                          meta.bg
                        )}
                      >
                        <Icon className={cn('w-2.5 h-2.5', meta.text)} />
                      </span>
                      <div className={cn('rounded-lg border p-3', meta.border, meta.bg)}>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge className={cn('text-xs', meta.bg, meta.text, 'border', meta.border)}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(d.tanggal)}
                          </span>
                          {d.createdBy && (
                            <span className="text-xs text-muted-foreground">
                              · oleh {d.createdBy}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{buildTimelineSummary(item)}</p>
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailDialog({ type: item.type, data: d })}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Detail
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Sub-render: detail dialog body ────────────────────────────────────────
  function renderDetailBody(payload: DetailDialogPayload) {
    const { type, data } = payload;
    if (type === 'laboratorium') {
      const lab = data as LabResult;
      const rows: [string, string | number | undefined, boolean?][] = [
        ['Tanggal', formatDate(lab.tanggal)],
        ['GDP (mg/dL)', lab.gdp, isAbnormal('gdp', lab.gdp)],
        ['GDS (mg/dL)', lab.gds, isAbnormal('gds', lab.gds)],
        ['HbA1c (%)', lab.hba1c, isAbnormal('hba1c', lab.hba1c)],
        ['Ureum (mg/dL)', lab.ureum],
        ['Kreatinin (mg/dL)', lab.kreatinin, isAbnormal('kreatinin', lab.kreatinin)],
        ['Kolesterol Total (mg/dL)', lab.kolesterolTotal, isAbnormal('kolesterolTotal', lab.kolesterolTotal)],
        ['HDL (mg/dL)', lab.hdl, isAbnormal('hdl', lab.hdl)],
        ['LDL (mg/dL)', lab.ldl, isAbnormal('ldl', lab.ldl)],
        ['Trigliserida (mg/dL)', lab.trigliserida, isAbnormal('trigliserida', lab.trigliserida)],
        ['Mikroalbumin (mg/dL)', lab.mikroalbumin, isAbnormal('mikroalbumin', lab.mikroalbumin)],
        ['Catatan', lab.catatan ?? '-'],
        ['Dibuat oleh', lab.createdBy ?? '-'],
        ['Dibuat pada', formatDateTime(lab.createdAt)],
      ];
      return <DetailGrid rows={rows} />;
    }
    if (type === 'usg') {
      const u = data as USGResult;
      return (
        <div className="space-y-3">
          <DetailPhoto fotoUrl={u.fotoUrl} alt="Foto USG" onZoom={setZoomImage} />
          <DetailGrid
            rows={[
              ['Tanggal', formatDate(u.tanggal)],
              ['Jenis USG', u.jenisUsg ?? '-'],
              ['Hasil', u.hasil ?? '-'],
              ['Catatan', u.catatan ?? '-'],
              ['Dibuat oleh', u.createdBy ?? '-'],
              ['Dibuat pada', formatDateTime(u.createdAt)],
            ]}
          />
        </div>
      );
    }
    if (type === 'ekg') {
      const e = data as ECGResult;
      return (
        <div className="space-y-3">
          <DetailPhoto fotoUrl={e.fotoUrl} alt="Foto EKG" onZoom={setZoomImage} />
          <DetailGrid
            rows={[
              ['Tanggal', formatDate(e.tanggal)],
              ['Interpretasi', e.interpretasi ?? '-'],
              ['Catatan', e.catatan ?? '-'],
              ['Dibuat oleh', e.createdBy ?? '-'],
              ['Dibuat pada', formatDateTime(e.createdAt)],
            ]}
          />
        </div>
      );
    }
    // radiologi
    const r = data as RadiologyResult;
    return (
      <div className="space-y-3">
        <DetailPhoto fotoUrl={r.fotoUrl} alt="Foto Radiologi" onZoom={setZoomImage} />
        <DetailGrid
          rows={[
            ['Tanggal', formatDate(r.tanggal)],
            ['Jenis Radiologi', r.jenisRadiologi ?? '-'],
            ['Hasil', r.hasil ?? '-'],
            ['Catatan', r.catatan ?? '-'],
            ['Dibuat oleh', r.createdBy ?? '-'],
            ['Dibuat pada', formatDateTime(r.createdAt)],
          ]}
        />
      </div>
    );
  }
}

// ── Helper components (inside same file) ────────────────────────────────────

function LabNumberInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? 'any'}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  );
}

function TrendChart({
  title,
  data,
  dataKey,
  color,
  threshold,
}: {
  title: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  color: string;
  threshold?: number;
}) {
  // Filter out nulls so the line only plots actual points
  const points = data.filter((d) => d[dataKey] != null);
  if (points.length < 2) return null;
  return (
    <Card className="border">
      <CardHeader className="pb-1 px-3 pt-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={points} margin={{ top: 5, right: 8, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={36} />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: '4px 8px' }}
              labelStyle={{ fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
            {threshold !== undefined && (
              <ReferenceLine
                y={threshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'batas', position: 'right', fill: '#ef4444', fontSize: 9 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  variant = 'default',
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-7 w-7 p-0',
        variant === 'danger'
          ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function EmptyState({
  message,
  onAdd,
  addLabel,
}: {
  message: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      {onAdd && addLabel && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

function EmptyCard({ onAdd, type }: { onAdd: () => void; type: ExamType }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div className="py-4 text-center">
      <Icon className={cn('w-6 h-6 mx-auto mb-1', meta.text)} />
      <p className="text-xs text-muted-foreground mb-2">Belum ada data</p>
      <Button
        variant="outline"
        size="sm"
        className={cn('text-xs', meta.text)}
        onClick={onAdd}
      >
        <Plus className="w-3 h-3 mr-1" /> Tambah
      </Button>
    </div>
  );
}

function PhotoCard({
  type,
  tanggal,
  title,
  subtitle,
  catatan,
  fotoUrl,
  onDetail,
  onEdit,
  onDelete,
  onPrint,
  createdBy,
}: {
  type: ExamType;
  tanggal: string;
  title: string;
  subtitle: string;
  catatan?: string;
  fotoUrl?: string;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  createdBy?: string;
}) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  // Track image load error so we can show an error icon (not "Tidak ada foto")
  const [imgError, setImgError] = useState(false);
  const showImg = !!fotoUrl && !imgError;

  return (
    <Card className={cn('flex flex-col overflow-hidden', meta.border)}>
      <div className={cn('flex items-center gap-2 px-3 py-2 border-b', meta.bg, meta.border)}>
        <Icon className={cn('w-4 h-4', meta.text)} />
        <span className={cn('text-sm font-semibold', meta.text)}>{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(tanggal)}</span>
      </div>
      <CardContent className="p-3 flex-1 space-y-2">
        {showImg ? (
          <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={fotoUrl}
              alt={`Foto ${meta.label}`}
              className="w-full h-32 object-cover rounded border bg-muted"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </a>
        ) : fotoUrl && imgError ? (
          // URL exists but failed to load — show error icon, NOT "Tidak ada foto"
          <a
            href={fotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-32 flex flex-col items-center justify-center rounded border bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Gagal memuat gambar. Klik untuk membuka langsung."
          >
            <ImageOff className="w-6 h-6 mb-1" />
            <span className="text-xs">Gagal memuat — klik untuk buka</span>
          </a>
        ) : (
          <div className="w-full h-32 flex items-center justify-center rounded border bg-muted/40 text-xs text-muted-foreground">
            <ImageIcon className="w-5 h-5 mr-1" /> Tidak ada foto
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {subtitle}
          </p>
        )}
        {catatan && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            Catatan: {catatan}
          </p>
        )}
        {createdBy && (
          <p className="text-[10px] text-muted-foreground">oleh {createdBy}</p>
        )}
      </CardContent>
      <div className="px-3 pb-3 flex items-center gap-1 flex-wrap">
        <Button size="sm" variant="outline" onClick={onDetail}>
          <Eye className="w-3.5 h-3.5 mr-1" /> Detail
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cetak PDF" onClick={onPrint}>
          <Printer className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Hapus"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function DetailGrid({ rows }: { rows: [string, string | number | undefined, boolean?][] }) {
  return (
    <div className="rounded-md border divide-y">
      {rows.map(([label, value, abnormal], idx) => (
        <div key={`${label}-${idx}`} className="flex items-start px-3 py-2 gap-3">
          <span className="text-xs text-muted-foreground w-1/2 shrink-0">{label}</span>
          <span
            className={cn(
              'text-sm font-medium text-right flex-1 break-words whitespace-pre-wrap',
              abnormal && 'text-red-600'
            )}
          >
            {value === undefined || value === null || value === '' ? '-' : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Detail photo with zoom / open new tab / download ────────────────────────
//
// Renders the exam photo at a larger size than the card thumbnail, with three
// action buttons overlayed:
//   🔍 Zoom   — opens a full-screen modal with the image at native resolution
//   ↗  Open   — opens the raw URL in a new browser tab
//   ⬇  Download — triggers a browser download of the file
//
// If the URL is missing or the image fails to load, shows a clear error
// banner with a direct link (NOT "Tidak ada foto").
function DetailPhoto({
  fotoUrl,
  alt,
  onZoom,
}: {
  fotoUrl?: string;
  alt: string;
  onZoom: (url: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  if (!fotoUrl) {
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center rounded border bg-muted/40 text-muted-foreground">
        <ImageIcon className="w-8 h-8 mb-1" />
        <span className="text-xs">Tidak ada foto</span>
      </div>
    );
  }

  // URL exists but image failed to load — show error with direct link
  if (imgError) {
    return (
      <div className="w-full p-4 rounded border bg-red-50 text-red-700 flex flex-col items-center gap-2">
        <ImageOff className="w-8 h-8" />
        <p className="text-xs text-center">
          Gagal memuat gambar. URL mungkin tidak dapat diakses publik.
        </p>
        <a
          href={fotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs underline text-red-700 hover:text-red-900"
        >
          <ExternalLink className="w-3 h-3" /> Buka URL langsung
        </a>
      </div>
    );
  }

  return (
    <div className="relative group rounded border overflow-hidden bg-muted">
      <img
        src={fotoUrl}
        alt={alt}
        className="w-full max-h-80 object-contain bg-black/5"
        loading="lazy"
        onError={() => setImgError(true)}
      />
      {/* Action buttons overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow"
          title="Perbesar (Zoom)"
          onClick={() => onZoom(fotoUrl)}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <a
          href={fotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Buka di tab baru"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-white/90 hover:bg-white shadow text-slate-700"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow"
          title="Download"
          onClick={() => {
            // Trigger download via fetch + blob (avoids navigation)
            fetch(fotoUrl)
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = alt.replace(/\s+/g, '_') || 'download';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              })
              .catch(() => {
                // Fallback: open in new tab
                window.open(fotoUrl, '_blank', 'noopener');
              });
          }}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Zoom image dialog (full-screen image viewer) ────────────────────────────
function ZoomImageDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null;
  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black/95">
        <DialogHeader className="p-3 border-b border-white/10">
          <DialogTitle className="text-white text-sm flex items-center gap-2">
            <ZoomIn className="w-4 h-4" /> Pratinjau Gambar
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 bg-black min-h-[300px] max-h-[80vh] overflow-auto">
          <img
            src={url}
            alt="Zoom"
            className="max-w-full max-h-[70vh] object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <DialogFooter className="p-3 border-t border-white/10 gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
          </a>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              fetch(url)
                .then((r) => r.blob())
                .then((blob) => {
                  const u = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = u;
                  a.download = 'pemeriksaan';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(u);
                })
                .catch(() => window.open(url, '_blank', 'noopener'));
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Upload progress bar ─────────────────────────────────────────────────────
//
// Shown inside the form when an upload is in progress. Displays:
//   - A spinner + phase label ("Mengunggah..." / "Menyimpan..." / "Selesai")
//   - A progress bar (0-100%)
//   - The current message from the upload API
function UploadProgressBar({
  progress,
}: {
  progress: { active: boolean; phase: string; pct: number; msg?: string };
}) {
  if (!progress.active && progress.pct === 0) return null;
  const phaseLabel =
    progress.phase === 'uploading'
      ? 'Mengunggah...'
      : progress.phase === 'inserting'
      ? 'Menyimpan metadata...'
      : progress.phase === 'done'
      ? 'Selesai'
      : 'Gagal';
  const barColor =
    progress.phase === 'error'
      ? 'bg-red-500'
      : progress.phase === 'done'
      ? 'bg-emerald-500'
      : 'bg-amber-500';
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-amber-800">
        {progress.phase !== 'done' && progress.phase !== 'error' && (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        )}
        {progress.phase === 'done' && <span className="text-emerald-600">✓</span>}
        {progress.phase === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
        <span className="font-medium">{phaseLabel}</span>
        {progress.msg && <span className="text-amber-700 truncate">— {progress.msg}</span>}
      </div>
      <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', barColor)}
          style={{ width: `${Math.max(0, Math.min(100, progress.pct))}%` }}
        />
      </div>
    </div>
  );
}

// ── Storage RLS setup dialog ────────────────────────────────────────────────
//
// Shown when an upload fails with code='STORAGE_RLS_BLOCKED' — i.e. the
// browser anon client is blocked by Storage RLS AND the server API route
// can't help because SUPABASE_SERVICE_ROLE_KEY is not set.
//
// Gives the user two clear options:
//   1. Run the displayed SQL in Supabase Dashboard → SQL Editor (recommended,
//      enables client-side uploads — no service-role key needed).
//   2. Set SUPABASE_SERVICE_ROLE_KEY in .env (server-side bypass).
function StorageSetupDialog({
  open,
  onOpenChange,
  message,
  sql,
  hasServiceRoleKey,
  supabaseUrl,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  message: string;
  sql: string;
  hasServiceRoleKey: boolean;
  supabaseUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = sql;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  }, [sql]);

  const dashboardUrl = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, '')}/project/default/sql/new`
    : 'https://supabase.com/dashboard';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Database className="w-5 h-5" />
            Setup Upload Foto — Storage RLS
          </DialogTitle>
          <DialogDescription className="text-left">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto space-y-4 px-1 py-2">
          {/* Status badge */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={hasServiceRoleKey ? 'default' : 'secondary'} className="gap-1">
              <Database className="w-3 h-3" />
              SERVICE_ROLE_KEY: {hasServiceRoleKey ? 'Tersedia' : 'Belum diset'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              Bucket: patient-files
            </Badge>
          </div>

          {/* Option 1 — recommended */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <Check className="w-4 h-4" />
              Opsi 1 — Jalankan SQL ini (Direkomendasikan, paling aman)
            </div>
            <p className="text-xs text-emerald-700">
              Membuat bucket <code className="px-1 bg-white/60 rounded">patient-files</code> sebagai
              public + RLS policies untuk anon role. Setelah ini, upload langsung
              berhasil dari browser — tanpa service-role key.
            </p>
            <ol className="text-xs text-emerald-700 list-decimal list-inside space-y-0.5">
              <li>Buka Supabase Dashboard → <strong>SQL Editor</strong> → New query.</li>
              <li>Salin SQL di bawah, klik <strong>Run</strong>.</li>
              <li>Coba upload foto lagi — akan langsung berhasil.</li>
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin SQL'}
              </Button>
              <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka SQL Editor
                </Button>
              </a>
            </div>
            <pre className="mt-2 text-[10px] leading-relaxed bg-zinc-900 text-zinc-100 rounded-md p-3 overflow-x-auto max-h-56 overflow-y-auto">
              <code>{sql}</code>
            </pre>
          </div>

          {/* Option 2 — service role key */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Terminal className="w-4 h-4" />
              Opsi 2 — Set SUPABASE_SERVICE_ROLE_KEY di .env
            </div>
            <p className="text-xs text-amber-700">
              Server API route akan bypass RLS menggunakan service-role key.
              Hanya boleh digunakan di server — jangan diekspos ke browser.
            </p>
            <ol className="text-xs text-amber-700 list-decimal list-inside space-y-0.5">
              <li>Supabase Dashboard → Project Settings → API → <strong>service_role</strong> secret.</li>
              <li>Salin key, tempel di <code className="px-1 bg-white/60 rounded">.env</code>:</li>
            </ol>
            <pre className="text-[10px] bg-zinc-900 text-zinc-100 rounded-md p-2 overflow-x-auto">
              <code>SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...</code>
            </pre>
            <p className="text-xs text-amber-700">
              3. Restart dev server (<code className="px-1 bg-white/60 rounded">bun run dev</code>).
            </p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Print window helper ─────────────────────────────────────────────────────

function openPrintWindow(opts: {
  title: string;
  rows: [string, string][];
  imageUrl?: string;
}) {
  const { title, rows, imageUrl } = opts;
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) {
    alert('Pop-up diblokir. Mohon izinkan pop-up untuk mencetak.');
    return;
  }
  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600;width:40%;background:#f9fafb;">${escapeHtml(
          k
        )}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(v)}</td></tr>`
    )
    .join('');
  const imageHtml = imageUrl
    ? `<div style="margin-top:16px;"><img src="${escapeHtml(imageUrl)}" alt="Foto" style="max-width:100%;max-height:400px;border:1px solid #e5e7eb;border-radius:4px;" /></div>`
    : '';
  w.document.write(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; color:#111827; }
  h1 { font-size: 18px; margin: 0 0 4px 0; }
  .meta { font-size: 12px; color:#6b7280; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
  <table>${tableRows}</table>
  ${imageHtml}
  <div class="no-print" style="margin-top:24px;text-align:center;">
    <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:white;border:0;border-radius:4px;cursor:pointer;">Cetak / Simpan PDF</button>
  </div>
  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 400); };
  </script>
</body>
</html>`);
  w.document.close();
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Timeline summary builder ────────────────────────────────────────────────

function buildTimelineSummary(item: SupportingExamUnion): string {
  const d = item.data as any;
  if (item.type === 'laboratorium') {
    const parts: string[] = [];
    if (d.hba1c != null) parts.push(`HbA1c: ${d.hba1c}%`);
    if (d.gdp != null) parts.push(`GDP: ${d.gdp} mg/dL`);
    if (d.gds != null) parts.push(`GDS: ${d.gds} mg/dL`);
    if (d.kreatinin != null) parts.push(`Kreatinin: ${d.kreatinin} mg/dL`);
    if (d.ldl != null) parts.push(`LDL: ${d.ldl} mg/dL`);
    if (parts.length === 0) return 'Hasil laboratorium (tanpa nilai numerik)';
    return parts.join(' · ');
  }
  if (item.type === 'usg') {
    const parts: string[] = [];
    if (d.jenisUsg) parts.push(d.jenisUsg);
    if (d.hasil) parts.push(d.hasil.slice(0, 80));
    return parts.join(': ') || 'Hasil USG';
  }
  if (item.type === 'ekg') {
    return d.interpretasi ? d.interpretasi.slice(0, 120) : 'Hasil EKG';
  }
  // radiologi
  const parts: string[] = [];
  if (d.jenisRadiologi) parts.push(d.jenisRadiologi);
  if (d.hasil) parts.push(d.hasil.slice(0, 80));
  return parts.join(': ') || 'Hasil radiologi';
}
