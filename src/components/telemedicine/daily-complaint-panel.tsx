'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { isValidUuid } from '@/services/supabase';
import type {
  DailyCondition,
  DailyComplaintYesNo,
  DailyPainCondition,
  DailyDyspneaCondition,
  DailyYesNo,
  DailyMedicineProblem,
  DailyComplaintRecord,
  DailyComplaintFormInput,
  DailyComplaintSeverity,
  PalliativeClinicalAlert,
} from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  ClipboardList, Send, AlertTriangle, CheckCircle2, ChevronDown,
  Search, Calendar, ArrowUpDown, Eye, Heart, Frown, Smile,
  ThermometerSun, Wind, Utensils, Moon, Pill, AlertCircle, XCircle,
  Filter, RotateCcw
} from 'lucide-react';

// ─── Label Maps ──────────────────────────────────────────────────────────

const conditionLabels: Record<DailyCondition, string> = {
  baik: 'Baik',
  tidak_baik: 'Tidak Baik',
};

const complaintYesNoLabels: Record<DailyComplaintYesNo, string> = {
  tidak_ada: 'Tidak Ada',
  ada: 'Ada',
};

const painLabels: Record<DailyPainCondition, string> = {
  tidak_nyeri: 'Sudah tidak nyeri',
  berkurang: 'Nyeri sudah berkurang',
  sama: 'Nyeri masih dirasakan sama',
  bertambah: 'Nyeri bertambah berat',
};

const dyspneaLabels: Record<DailyDyspneaCondition, string> = {
  tidak_sesak: 'Sudah tidak sesak',
  berkurang: 'Sesak sudah berkurang',
  sama: 'Sesak masih dirasakan sama',
  bertambah: 'Sesak bertambah berat',
};

const yesNoLabels: Record<DailyYesNo, string> = {
  ya: 'Ya',
  tidak: 'Tidak',
};

const medicineProblemLabels: Record<DailyMedicineProblem, string> = {
  tidak: 'Tidak',
  ya: 'Ya',
};

const severityConfig: Record<DailyComplaintSeverity, { label: string; cls: string; icon: React.ReactNode }> = {
  hijau: { label: 'Stabil', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  kuning: { label: 'Perhatian', cls: 'bg-amber-100 text-amber-800 border-amber-300', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  merah: { label: 'Kritis', cls: 'bg-red-100 text-red-800 border-red-300', icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

// ─── Props ─────────────────────────────────────────────────────────────

interface DailyComplaintPanelProps {
  palliativePatientId: string | null;
}

// ─── Radio Option Component ─────────────────────────────────────────────

function RadioOption<T extends string>({
  options,
  labels,
  value,
  onChange,
  colorMap,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T | '';
  onChange: (val: T) => void;
  colorMap?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = value === opt;
        const colorCls = colorMap?.[opt];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-2 rounded-lg border text-sm transition-all whitespace-nowrap
              ${isSelected
                ? colorCls || 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'}
              `}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Conditional Textarea ─────────────────────────────────────────────

function ConditionalTextarea({
  show,
  label,
  value,
  onChange,
  placeholder,
}: {
  show: boolean;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  if (!show) return null;
  return (
    <div className="mt-2 ml-2 pl-3 border-l-2 border-amber-300 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <Label className="text-sm font-medium text-amber-800">{label} *</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-y"
      />
    </div>
  );
}

// ─── Form Section ─────────────────────────────────────────────────────

export interface DailyComplaintFormProps {
  palliativePatientId: string;
  source?: 'monitoring' | 'chat';
  onSubmitSuccess?: (complaint: DailyComplaintRecord) => void;
  compact?: boolean;
}

export function DailyComplaintForm({ palliativePatientId, source = 'monitoring', onSubmitSuccess, compact = false }: DailyComplaintFormProps) {
  const { toast } = useToast();
  const addDailyComplaint = useStore((s) => s.addDailyComplaint);
  const addPalliativeClinicalAlert = useStore((s) => s.addPalliativeClinicalAlert);
  const addPalliativeMonitoringNotification = useStore((s) => s.addPalliativeMonitoringNotification);
  const palliativePatients = useStore((s) => s.palliativePatients);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [kondisiHariIni, setKondisiHariIni] = useState<DailyCondition | ''>('');
  const [alasanKondisi, setAlasanKondisi] = useState('');
  const [keluhanBaru, setKeluhanBaru] = useState<DailyComplaintYesNo | ''>('');
  const [deskripsiKeluhanBaru, setDeskripsiKeluhanBaru] = useState('');
  const [kondisiNyeri, setKondisiNyeri] = useState<DailyPainCondition | ''>('');
  const [kondisiSesak, setKondisiSesak] = useState<DailyDyspneaCondition | ''>('');
  const [makanMinum, setMakanMinum] = useState<DailyYesNo | ''>('');
  const [alasanMakanMinum, setAlasanMakanMinum] = useState('');
  const [tidur, setTidur] = useState<DailyYesNo | ''>('');
  const [alasanTidur, setAlasanTidur] = useState('');
  const [masalahObat, setMasalahObat] = useState<DailyMedicineProblem | ''>('');
  const [deskripsiMasalahObat, setDeskripsiMasalahObat] = useState('');

  const patient = palliativePatients.find((p) => p.id === palliativePatientId);
  const patientName = patient?.patientName || 'Pasien';

  const resetForm = () => {
    setSubmitted(false);
    setKondisiHariIni('');
    setAlasanKondisi('');
    setKeluhanBaru('');
    setDeskripsiKeluhanBaru('');
    setKondisiNyeri('');
    setKondisiSesak('');
    setMakanMinum('');
    setAlasanMakanMinum('');
    setTidur('');
    setAlasanTidur('');
    setMasalahObat('');
    setDeskripsiMasalahObat('');
  };

  const canSubmit = useMemo(() => {
    if (!kondisiHariIni || !keluhanBaru || !kondisiNyeri || !kondisiSesak || !makanMinum || !tidur || !masalahObat) return false;
    if (kondisiHariIni === 'tidak_baik' && !alasanKondisi.trim()) return false;
    if (keluhanBaru === 'ada' && !deskripsiKeluhanBaru.trim()) return false;
    if (makanMinum === 'tidak' && !alasanMakanMinum.trim()) return false;
    if (tidur === 'tidak' && !alasanTidur.trim()) return false;
    if (masalahObat === 'ya' && !deskripsiMasalahObat.trim()) return false;
    return true;
  }, [kondisiHariIni, keluhanBaru, kondisiNyeri, kondisiSesak, makanMinum, tidur, masalahObat,
      alasanKondisi, deskripsiKeluhanBaru, alasanMakanMinum, alasanTidur, deskripsiMasalahObat]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    // ── UUID validation ──
    if (!isValidUuid(palliativePatientId)) {
      console.error('[daily-complaint] ABORTED — patient_id is not a valid UUID:', palliativePatientId);
      toast({
        title: 'Patient UUID tidak ditemukan',
        description: 'Pilih pasien yang valid sebelum mengisi keluhan harian.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);

    try {
      const formData: DailyComplaintFormInput = {
        palliativePatientId,
        kondisiHariIni: kondisiHariIni as DailyCondition,
        alasanKondisi: kondisiHariIni === 'tidak_baik' ? alasanKondisi : undefined,
        keluhanBaru: keluhanBaru as DailyComplaintYesNo,
        deskripsiKeluhanBaru: keluhanBaru === 'ada' ? deskripsiKeluhanBaru : undefined,
        kondisiNyeri: kondisiNyeri as DailyPainCondition,
        kondisiSesak: kondisiSesak as DailyDyspneaCondition,
        makanMinum: makanMinum as DailyYesNo,
        alasanMakanMinum: makanMinum === 'tidak' ? alasanMakanMinum : undefined,
        tidur: tidur as DailyYesNo,
        alasanTidur: tidur === 'tidak' ? alasanTidur : undefined,
        masalahObat: masalahObat as DailyMedicineProblem,
        deskripsiMasalahObat: masalahObat === 'ya' ? deskripsiMasalahObat : undefined,
        sumberPengisian: source,
      };

      const res = await fetch('/api/daily-complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Gagal menyimpan keluhan harian');

      const data = await res.json();
      const savedComplaint: DailyComplaintRecord = {
        ...data.complaint,
        submittedAt: data.complaint.submittedAt,
        createdAt: data.complaint.createdAt,
      };

      // Add to store
      addDailyComplaint(savedComplaint);

      // Generate clinical alerts in the store
      if (data.alerts && data.alerts.length > 0) {
        for (const alert of data.alerts) {
          addPalliativeClinicalAlert({
            id: `alert-dc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            patientId: palliativePatientId,
            alertType: alert.severity === 'merah' ? 'perburukan' : 'gejala_berat',
            severity: alert.severity === 'merah' ? 'merah' : 'kuning',
            title: alert.title,
            description: alert.message,
            isRead: false,
            createdAt: new Date().toISOString(),
          });

          addPalliativeMonitoringNotification({
            id: `notif-dc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            patientId: palliativePatientId,
            patientName,
            type: alert.severity === 'merah' ? 'pain_increase' : 'screening_completed',
            title: alert.title,
            description: alert.message,
            severity: alert.severity === 'merah' ? 'critical' : 'warning',
            isRead: false,
            referenceId: savedComplaint.id,
            createdAt: new Date().toISOString(),
          });
        }
      }

      setSubmitted(true);
      toast({
        title: 'Keluhan Harian Terkirim',
        description: 'Terima kasih telah mengisi keluhan harian. Tim paliatif akan memantau kondisi Anda.',
      });

      // Notify parent component (e.g., chat panel)
      if (onSubmitSuccess) {
        onSubmitSuccess(savedComplaint);
      }
    } catch (error) {
      toast({
        title: 'Gagal Mengirim',
        description: 'Terjadi kesalahan saat menyimpan keluhan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-900">Keluhan Harian Berhasil Dikirim</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Terima kasih telah mengisi keluhan harian. Tim paliatif akan memantau kondisi Anda.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={resetForm}
            className="mt-2"
          >
            Isi Keluhan Baru
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Form Keluhan Harian</CardTitle>
        </div>
        <CardDescription>
          Isilah form berikut untuk melaporkan kondisi Anda hari ini. Data Anda akan dipantau oleh tim paliatif.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Q1: Kondisi Hari Ini */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Smile className="h-4 w-4 text-teal-600" />
            1. Bagaimana kondisi Anda hari ini?
          </Label>
          <RadioOption
            options={['baik', 'tidak_baik'] as DailyCondition[]}
            labels={conditionLabels}
            value={kondisiHariIni}
            onChange={setKondisiHariIni}
            colorMap={{
              baik: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              tidak_baik: 'bg-red-600 text-white border-red-600 shadow-sm',
            }}
          />
          <ConditionalTextarea
            show={kondisiHariIni === 'tidak_baik'}
            label="Alasan kondisi tidak baik hari ini"
            value={alasanKondisi}
            onChange={setAlasanKondisi}
            placeholder="Jelaskan alasan kondisi Anda tidak baik..."
          />
        </div>

        <Separator />

        {/* Q2: Keluhan Baru */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-teal-600" />
            2. Apakah ada keluhan baru hari ini?
          </Label>
          <RadioOption
            options={['tidak_ada', 'ada'] as DailyComplaintYesNo[]}
            labels={complaintYesNoLabels}
            value={keluhanBaru}
            onChange={setKeluhanBaru}
            colorMap={{
              tidak_ada: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              ada: 'bg-amber-600 text-white border-amber-600 shadow-sm',
            }}
          />
          <ConditionalTextarea
            show={keluhanBaru === 'ada'}
            label="Jelaskan keluhan baru yang dirasakan"
            value={deskripsiKeluhanBaru}
            onChange={setDeskripsiKeluhanBaru}
            placeholder="Jelaskan keluhan baru yang Anda rasakan..."
          />
        </div>

        <Separator />

        {/* Q3: Nyeri */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <ThermometerSun className="h-4 w-4 text-teal-600" />
            3. Bagaimana kondisi nyeri yang Anda rasakan?
          </Label>
          <RadioOption
            options={['tidak_nyeri', 'berkurang', 'sama', 'bertambah'] as DailyPainCondition[]}
            labels={painLabels}
            value={kondisiNyeri}
            onChange={setKondisiNyeri}
            colorMap={{
              tidak_nyeri: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              berkurang: 'bg-teal-600 text-white border-teal-600 shadow-sm',
              sama: 'bg-amber-600 text-white border-amber-600 shadow-sm',
              bertambah: 'bg-red-600 text-white border-red-600 shadow-sm',
            }}
          />
        </div>

        <Separator />

        {/* Q4: Sesak Napas */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-teal-600" />
            4. Bagaimana kondisi sesak napas yang Anda rasakan?
          </Label>
          <RadioOption
            options={['tidak_sesak', 'berkurang', 'sama', 'bertambah'] as DailyDyspneaCondition[]}
            labels={dyspneaLabels}
            value={kondisiSesak}
            onChange={setKondisiSesak}
            colorMap={{
              tidak_sesak: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              berkurang: 'bg-teal-600 text-white border-teal-600 shadow-sm',
              sama: 'bg-amber-600 text-white border-amber-600 shadow-sm',
              bertambah: 'bg-red-600 text-white border-red-600 shadow-sm',
            }}
          />
        </div>

        <Separator />

        {/* Q5: Makan & Minum */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Utensils className="h-4 w-4 text-teal-600" />
            5. Apakah Anda dapat makan dan minum dengan baik?
          </Label>
          <RadioOption
            options={['ya', 'tidak'] as DailyYesNo[]}
            labels={yesNoLabels}
            value={makanMinum}
            onChange={setMakanMinum}
            colorMap={{
              ya: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              tidak: 'bg-red-600 text-white border-red-600 shadow-sm',
            }}
          />
          <ConditionalTextarea
            show={makanMinum === 'tidak'}
            label="Jelaskan kendala makan dan minum"
            value={alasanMakanMinum}
            onChange={setAlasanMakanMinum}
            placeholder="Jelaskan kendala yang Anda alami saat makan dan minum..."
          />
        </div>

        <Separator />

        {/* Q6: Tidur */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Moon className="h-4 w-4 text-teal-600" />
            6. Apakah Anda dapat tidur dengan baik?
          </Label>
          <RadioOption
            options={['ya', 'tidak'] as DailyYesNo[]}
            labels={yesNoLabels}
            value={tidur}
            onChange={setTidur}
            colorMap={{
              ya: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              tidak: 'bg-amber-600 text-white border-amber-600 shadow-sm',
            }}
          />
          <ConditionalTextarea
            show={tidur === 'tidak'}
            label="Jelaskan gangguan tidur yang dialami"
            value={alasanTidur}
            onChange={setAlasanTidur}
            placeholder="Jelaskan gangguan tidur yang Anda alami..."
          />
        </div>

        <Separator />

        {/* Q7: Masalah Obat */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-teal-600" />
            7. Apakah ada masalah dengan obat yang diberikan?
          </Label>
          <RadioOption
            options={['tidak', 'ya'] as DailyMedicineProblem[]}
            labels={medicineProblemLabels}
            value={masalahObat}
            onChange={setMasalahObat}
            colorMap={{
              tidak: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
              ya: 'bg-red-600 text-white border-red-600 shadow-sm',
            }}
          />
          <ConditionalTextarea
            show={masalahObat === 'ya'}
            label="Jelaskan masalah yang dialami terkait obat"
            value={deskripsiMasalahObat}
            onChange={setDeskripsiMasalahObat}
            placeholder="Jelaskan masalah yang Anda alami terkait obat..."
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-base"
          >
            {submitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Mengirim...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Kirim Keluhan Harian
              </>
            )}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Silakan isi semua pertanyaan yang wajib dijawab
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── History Table ─────────────────────────────────────────────────────

function DailyComplaintHistory({ palliativePatientId }: { palliativePatientId: string | null }) {
  const { toast } = useToast();
  const dailyComplaints = useStore((s) => s.dailyComplaints);
  const palliativePatients = useStore((s) => s.palliativePatients);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterSource, setFilterSource] = useState<'all' | 'monitoring' | 'chat'>('all');
  const [detailRecord, setDetailRecord] = useState<DailyComplaintRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch complaints
  React.useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (palliativePatientId) params.set('palliativePatientId', palliativePatientId);
        const res = await fetch(`/api/daily-complaints?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          useStore.getState().setDailyComplaints(data.complaints);
        }
      } catch {
        // Silent fail, use store data
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [palliativePatientId]);

  const filteredComplaints = useMemo(() => {
    let result = [...dailyComplaints];

    // Filter by patient if specific
    if (palliativePatientId) {
      result = result.filter((c) => c.palliativePatientId === palliativePatientId);
    }

    // Search by patient name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        (c.patientName || '').toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((c) => new Date(c.submittedAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((c) => new Date(c.submittedAt) <= to);
    }

    // Source filter
    if (filterSource !== 'all') {
      result = result.filter((c) => c.sumberPengisian === filterSource);
    }

    // Sort
    result.sort((a, b) => {
      const diff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });

    return result;
  }, [dailyComplaints, palliativePatientId, searchQuery, dateFrom, dateTo, sortOrder, filterSource]);

  const resetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
    setFilterSource('all');
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const shortLabel = (val: string, labels: Record<string, string>) => labels[val] || val;

  const conditionShort: Record<string, string> = { baik: 'Baik', tidak_baik: 'Tidak Baik' };
  const complaintShort: Record<string, string> = { tidak_ada: 'Tidak Ada', ada: 'Ada' };
  const painShort: Record<string, string> = { tidak_nyeri: 'Tidak Nyeri', berkurang: 'Berkurang', sama: 'Sama', bertambah: 'Bertambah' };
  const dyspneaShort: Record<string, string> = { tidak_sesak: 'Tidak Sesak', berkurang: 'Berkurang', sama: 'Sama', bertambah: 'Bertambah' };
  const yesNoShort: Record<string, string> = { ya: 'Ya', tidak: 'Tidak' };
  const medShort: Record<string, string> = { tidak: 'Tidak', ya: 'Ya' };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1">Cari Pasien</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama pasien..."
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1">Dari Tanggal</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1">Sampai Tanggal</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="min-w-[130px]">
              <Label className="text-xs text-muted-foreground mb-1">Urutkan</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="h-9 text-sm w-full"
              >
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                {sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}
              </Button>
            </div>
            <div className="min-w-[130px]">
              <Label className="text-xs text-muted-foreground mb-1">Sumber</Label>
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v as 'all' | 'monitoring' | 'chat')}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="monitoring">Monitoring Paliatif</SelectItem>
                  <SelectItem value="chat">Via Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-sm">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {filteredComplaints.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-emerald-700">
                {filteredComplaints.filter((c) => c.severityLevel === 'hijau').length}
              </div>
              <div className="text-xs text-emerald-600">Stabil</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-amber-700">
                {filteredComplaints.filter((c) => c.severityLevel === 'kuning').length}
              </div>
              <div className="text-xs text-amber-600">Perhatian</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-red-700">
                {filteredComplaints.filter((c) => c.severityLevel === 'merah').length}
              </div>
              <div className="text-xs text-red-600">Kritis</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Riwayat Keluhan Harian
          </CardTitle>
          <CardDescription>
            {filteredComplaints.length} entri ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada data keluhan harian</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Waktu</th>
                    {!palliativePatientId && (
                      <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Pasien</th>
                    )}
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Kondisi</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Keluhan Baru</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Nyeri</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Sesak</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Makan & Minum</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Tidur</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Obat</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground whitespace-nowrap">Sumber</th>
                    <th className="text-center p-2.5 font-medium text-muted-foreground whitespace-nowrap">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((c) => {
                    const sev = severityConfig[c.severityLevel];
                    return (
                      <tr key={c.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="p-2.5 whitespace-nowrap text-xs">{fmtDate(c.submittedAt)}</td>
                        {!palliativePatientId && (
                          <td className="p-2.5 whitespace-nowrap text-xs font-medium">{c.patientName || '-'}</td>
                        )}
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.kondisiHariIni === 'baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {shortLabel(c.kondisiHariIni, conditionShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.keluhanBaru === 'tidak_ada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {shortLabel(c.keluhanBaru, complaintShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            c.kondisiNyeri === 'tidak_nyeri' || c.kondisiNyeri === 'berkurang' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            c.kondisiNyeri === 'sama' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {shortLabel(c.kondisiNyeri, painShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            c.kondisiSesak === 'tidak_sesak' || c.kondisiSesak === 'berkurang' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            c.kondisiSesak === 'sama' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {shortLabel(c.kondisiSesak, dyspneaShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.makanMinum === 'ya' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {shortLabel(c.makanMinum, yesNoShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.tidur === 'ya' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {shortLabel(c.tidur, yesNoShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.masalahObat === 'tidak' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {shortLabel(c.masalahObat, medShort)}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge className={`text-[10px] px-1.5 py-0 border ${sev.cls}`}>
                            <span className="mr-0.5">{sev.icon}</span>
                            {sev.label}
                          </Badge>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.sumberPengisian === 'chat' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                            {c.sumberPengisian === 'chat' ? 'Chat' : 'Monitoring'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailRecord(c)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Detail Keluhan Harian
            </DialogTitle>
            <DialogDescription>
              {detailRecord && fmtDate(detailRecord.submittedAt)}
              {detailRecord?.patientName && ` — ${detailRecord.patientName}`}
            </DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="overflow-y-auto custom-scrollbar space-y-4 pr-1" style={{ maxHeight: 'calc(85vh - 8rem)' }}>
              {/* Severity Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge className={`border ${severityConfig[detailRecord.severityLevel].cls}`}>
                  {severityConfig[detailRecord.severityLevel].icon}
                  <span className="ml-1">{severityConfig[detailRecord.severityLevel].label}</span>
                </Badge>
              </div>

              <Separator />

              {/* Q1 */}
              <DetailSection
                icon={<Smile className="h-4 w-4" />}
                number={1}
                question="Kondisi hari ini"
                answer={conditionLabels[detailRecord.kondisiHariIni]}
                detail={detailRecord.kondisiHariIni === 'tidak_baik' ? detailRecord.alasanKondisi : undefined}
                detailLabel="Alasan"
                isAlert={detailRecord.kondisiHariIni === 'tidak_baik'}
              />

              {/* Q2 */}
              <DetailSection
                icon={<AlertCircle className="h-4 w-4" />}
                number={2}
                question="Keluhan baru"
                answer={complaintYesNoLabels[detailRecord.keluhanBaru]}
                detail={detailRecord.keluhanBaru === 'ada' ? detailRecord.deskripsiKeluhanBaru : undefined}
                detailLabel="Deskripsi Keluhan"
                isAlert={detailRecord.keluhanBaru === 'ada'}
              />

              {/* Q3 */}
              <DetailSection
                icon={<ThermometerSun className="h-4 w-4" />}
                number={3}
                question="Kondisi nyeri"
                answer={painLabels[detailRecord.kondisiNyeri]}
                isAlert={detailRecord.kondisiNyeri === 'bertambah'}
              />

              {/* Q4 */}
              <DetailSection
                icon={<Wind className="h-4 w-4" />}
                number={4}
                question="Kondisi sesak napas"
                answer={dyspneaLabels[detailRecord.kondisiSesak]}
                isAlert={detailRecord.kondisiSesak === 'bertambah'}
              />

              {/* Q5 */}
              <DetailSection
                icon={<Utensils className="h-4 w-4" />}
                number={5}
                question="Makan dan minum"
                answer={yesNoLabels[detailRecord.makanMinum]}
                detail={detailRecord.makanMinum === 'tidak' ? detailRecord.alasanMakanMinum : undefined}
                detailLabel="Kendala"
                isAlert={detailRecord.makanMinum === 'tidak'}
              />

              {/* Q6 */}
              <DetailSection
                icon={<Moon className="h-4 w-4" />}
                number={6}
                question="Tidur"
                answer={yesNoLabels[detailRecord.tidur]}
                detail={detailRecord.tidur === 'tidak' ? detailRecord.alasanTidur : undefined}
                detailLabel="Gangguan"
                isAlert={detailRecord.tidur === 'tidak'}
              />

              {/* Q7 */}
              <DetailSection
                icon={<Pill className="h-4 w-4" />}
                number={7}
                question="Masalah obat"
                answer={medicineProblemLabels[detailRecord.masalahObat]}
                detail={detailRecord.masalahObat === 'ya' ? detailRecord.deskripsiMasalahObat : undefined}
                detailLabel="Deskripsi Masalah"
                isAlert={detailRecord.masalahObat === 'ya'}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Detail Section ────────────────────────────────────────────────────

function DetailSection({
  icon,
  number,
  question,
  answer,
  detail,
  detailLabel,
  isAlert,
}: {
  icon: React.ReactNode;
  number: number;
  question: string;
  answer: string;
  detail?: string;
  detailLabel?: string;
  isAlert?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${isAlert ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={isAlert ? 'text-red-600' : 'text-teal-600'}>{icon}</span>
        <span className="text-sm font-semibold">{number}. {question}</span>
        {isAlert && <AlertTriangle className="h-3.5 w-3.5 text-red-500 ml-auto" />}
      </div>
      <div className="text-sm ml-6">
        <span className={`font-medium ${isAlert ? 'text-red-700' : 'text-slate-700'}`}>{answer}</span>
        {detail && (
          <div className="mt-1.5 p-2 rounded bg-white border text-xs text-slate-600">
            <span className="font-medium">{detailLabel}:</span> {detail}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────

export default function DailyComplaintPanel({ palliativePatientId }: DailyComplaintPanelProps) {
  const [activeView, setActiveView] = useState<'form' | 'history'>('form');

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === 'form' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('form')}
          className={activeView === 'form' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
        >
          <ClipboardList className="h-4 w-4 mr-1.5" />
          Isi Keluhan
        </Button>
        <Button
          variant={activeView === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('history')}
          className={activeView === 'history' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          Riwayat Keluhan
        </Button>
      </div>

      {/* Content */}
      {activeView === 'form' ? (
        palliativePatientId ? (
          <DailyComplaintForm palliativePatientId={palliativePatientId} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Pilih pasien terlebih dahulu untuk mengisi keluhan harian</p>
            </CardContent>
          </Card>
        )
      ) : (
        <DailyComplaintHistory palliativePatientId={palliativePatientId} />
      )}
    </div>
  );
}
