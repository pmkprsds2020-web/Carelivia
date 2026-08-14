'use client';

// ───────────────────────────────────────────────────────────────────────────
// AnamnesisSistemPanel — Anamnesis Sistem / Review of Systems (ROS)
//
// Doctor-facing structured system review for one patient encounter.
// Persisted to Supabase via `medicalSystemReviewService` (table
// `medical_system_review`). See supabase/migration_medical_system_review.sql.
//
// Duplicate-submission safety (spec §16):
//   - No useEffect ever calls saveEncounter() automatically.
//   - Save/Draft buttons are disabled for the whole duration of the request
//     via a `savingRef` guard AND the `saving` state (belt & suspenders —
//     the ref protects against a second click landing between renders).
//   - The server call itself is an UPSERT keyed on
//     (patient_id, encounter_id, symptom_code), so even a genuine double
//     network request cannot create duplicate rows.
// ───────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { medicalSystemReviewService, clinicalAlertService } from '@/services/supabase';
import type { RosItemRecord, RosStatus, RosEncounterSummary } from '@/lib/types';
import {
  ROS_SYSTEMS,
  ROS_STATUS_OPTIONS,
  ROS_SELF_HARM_CODE,
  buildDefaultRosItems,
  generateRosSummary,
  isRosSelfHarmPositive,
} from '@/lib/ros-data';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  History,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Sparkles,
  Bot,
} from 'lucide-react';

function generateEncounterId(): string {
  // crypto.randomUUID is available in every modern browser this app targets.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback (should not normally be hit) — still a valid-looking v4 string.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export interface AnamnesisSistemPanelProps {
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
}

export function AnamnesisSistemPanel({ patientId, patientName, doctorId, doctorName }: AnamnesisSistemPanelProps) {
  const { toast } = useToast();
  const currentUser = useStore((s) => s.currentUser);

  const [view, setView] = useState<'form' | 'history'>('form');
  const [encounterId, setEncounterId] = useState<string>(() => generateEncounterId());
  const [assessmentDate] = useState<string>(() => new Date().toISOString());
  const [items, setItems] = useState<Record<string, RosItemRecord>>(() =>
    buildDefaultRosItems(patientId, encounterId, assessmentDate, doctorId)
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState<RosEncounterSummary[]>([]);
  const [viewingEncounter, setViewingEncounter] = useState<RosEncounterSummary | null>(null);
  const [confirmNormalOpen, setConfirmNormalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveLabel, setSaveLabel] = useState<'idle' | 'saved'>('idle');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Reset the form whenever the doctor switches patients.
  useEffect(() => {
    const newEncounterId = generateEncounterId();
    const newDate = new Date().toISOString();
    setEncounterId(newEncounterId);
    setItems(buildDefaultRosItems(patientId, newEncounterId, newDate, doctorId));
    setView('form');
    setSaveLabel('idle');
    setAiAnalysis(null);
  }, [patientId, doctorId]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await medicalSystemReviewService.getHistory(patientId, () => doctorName);
      setHistory(rows);
    } finally {
      setLoadingHistory(false);
    }
  }, [patientId, doctorName]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const itemList = useMemo(() => Object.values(items), [items]);
  const summaryText = useMemo(() => generateRosSummary(itemList), [itemList]);
  const selfHarmPositive = useMemo(() => isRosSelfHarmPositive(itemList), [itemList]);
  const positiveCount = useMemo(() => itemList.filter((i) => i.status === 'positive').length, [itemList]);

  const handleStatusChange = (code: string, status: RosStatus) => {
    setSaveLabel('idle');
    setItems((prev) => ({
      ...prev,
      [code]: { ...prev[code], status, detail: status === 'positive' ? prev[code].detail : undefined },
    }));
  };

  const handleDetailChange = (code: string, detail: string) => {
    setItems((prev) => ({ ...prev, [code]: { ...prev[code], detail } }));
  };

  const handleMarkAllNormal = () => {
    setSaveLabel('idle');
    setItems((prev) => {
      const next: Record<string, RosItemRecord> = {};
      for (const key of Object.keys(prev)) {
        next[key] = { ...prev[key], status: 'negative', detail: undefined };
      }
      return next;
    });
    setConfirmNormalOpen(false);
    toast({ title: 'Seluruh sistem ditandai "Tidak ada keluhan"', description: 'Anda tetap dapat mengubah sistem tertentu bila diperlukan.' });
  };

  const startNewAssessment = () => {
    const newEncounterId = generateEncounterId();
    const newDate = new Date().toISOString();
    setEncounterId(newEncounterId);
    setItems(buildDefaultRosItems(patientId, newEncounterId, newDate, doctorId));
    setSaveLabel('idle');
    setAiAnalysis(null);
    setView('form');
  };

  const resumeEncounter = async (encounter: RosEncounterSummary) => {
    setEncounterId(encounter.encounterId);
    const map: Record<string, RosItemRecord> = {};
    for (const item of encounter.items) map[item.symptomCode] = item;
    setItems(map);
    setAiAnalysis(null);
    setView('form');
  };

  const triggerSelfHarmAlert = useCallback(async () => {
    if (!patientId) return;
    try {
      await clinicalAlertService.create({
        patientId,
        doctorId,
        alertType: 'risiko_bunuh_diri',
        severityLevel: 'CRITICAL',
        title: 'Anamnesis Sistem: pikiran menyakiti diri',
        description: `Pada Anamnesis Sistem (Psikiatri), pasien ${patientName} melaporkan adanya pikiran menyakiti diri. Diperlukan pengkajian keselamatan lanjutan segera sesuai protokol.`,
        sourceModule: 'medical_system_review',
        sourceRecordId: encounterId,
        kategori: 'Psikiatri',
        recommendation: 'Lakukan pengkajian risiko bunuh diri lanjutan (mis. C-SSRS) dan pastikan keselamatan pasien segera.',
      });
    } catch (e) {
      console.warn('[AnamnesisSistemPanel] gagal membuat clinical alert:', e);
    }
  }, [patientId, doctorId, patientName, encounterId]);

  const doSave = async (reviewStatus: 'draft' | 'completed') => {
    if (savingRef.current) return; // guard against double invocation
    savingRef.current = true;
    setSaving(true);
    try {
      const payload = itemList.map((i) => ({ ...i, patientId, doctorId, encounterId, assessmentDate }));
      const result = await medicalSystemReviewService.saveEncounter(payload, reviewStatus, doctorId ?? currentUser?.id);
      if (!result.ok) {
        toast({ title: 'Gagal menyimpan', description: result.error || 'Terjadi kesalahan saat menyimpan.', variant: 'destructive' });
        return;
      }
      if (selfHarmPositive) await triggerSelfHarmAlert();
      setSaveLabel('saved');
      toast({
        title: reviewStatus === 'draft' ? 'Draft tersimpan' : '✓ Anamnesis sistem berhasil disimpan',
        description: reviewStatus === 'draft' ? 'Anda dapat melanjutkan pengisian nanti.' : undefined,
      });
      await loadHistory();
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast({ title: 'Ringkasan disalin', description: 'Tempelkan ke bagian Subjective SOAP Anda.' });
    } catch {
      toast({ title: 'Tidak dapat menyalin', description: 'Salin manual dari kotak ringkasan.', variant: 'destructive' });
    }
  };

  const handleAiAssist = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/medical-system-review/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, patientName, encounterId, items: itemList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat bantuan AI');
      setAiAnalysis(data.analysis);
    } catch (e: any) {
      toast({ title: 'Bantuan AI gagal dimuat', description: e?.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const isSelfHarmItem = (code: string) => code === ROS_SELF_HARM_CODE;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Anamnesis Sistem (Review of Systems)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pasien: <span className="font-medium text-foreground">{patientName}</span> · {formatDate(assessmentDate)}
            {doctorName ? <> · {doctorName}</> : null}
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'form' | 'history')}>
          <TabsList>
            <TabsTrigger value="form" className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Formulir
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Riwayat
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'history' ? (
        <Card className="border-0">
          <CardContent className="p-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat riwayat...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Belum ada riwayat Anamnesis Sistem untuk pasien ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Tanggal</th>
                      <th className="py-2 pr-3 font-medium">Dokter</th>
                      <th className="py-2 pr-3 font-medium">Sistem dengan Keluhan</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((enc) => {
                      const systemsWithFindings = Array.from(
                        new Set(
                          enc.items
                            .filter((i) => i.status === 'positive')
                            .map((i) => ROS_SYSTEMS.find((s) => s.id === i.systemName)?.label ?? i.systemName)
                        )
                      );
                      return (
                        <tr key={enc.encounterId} className="border-b last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDate(enc.assessmentDate)}</td>
                          <td className="py-2 pr-3">{enc.doctorName || '—'}</td>
                          <td className="py-2 pr-3">
                            {systemsWithFindings.length > 0 ? systemsWithFindings.join(', ') : 'Tidak ada keluhan bermakna'}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="secondary" className={enc.reviewStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {enc.reviewStatus === 'completed' ? 'Selesai' : 'Draft'}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => setViewingEncounter(enc)}>Lihat Detail</Button>
                            {enc.reviewStatus === 'draft' && (
                              <Button size="sm" variant="ghost" className="ml-1" onClick={() => resumeEncounter(enc)}>Lanjutkan</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4">
              <Button size="sm" onClick={startNewAssessment}>Buat Anamnesis Sistem Baru</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {selfHarmPositive && (
            <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-semibold">Peringatan Keselamatan Pasien</p>
                <p>
                  Pasien melaporkan adanya pikiran menyakiti diri. Segera lakukan pengkajian risiko keselamatan
                  lanjutan sesuai protokol CareLivia sebelum mengakhiri konsultasi. Sebuah clinical alert akan
                  dibuat otomatis saat Anda menyimpan formulir ini.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              {positiveCount > 0 ? `${positiveCount} temuan positif tercatat.` : 'Belum ada temuan positif.'}
            </p>
            <AlertDialog open={confirmNormalOpen} onOpenChange={setConfirmNormalOpen}>
              <Button size="sm" variant="outline" onClick={() => setConfirmNormalOpen(true)}>
                Semua Sistem Dalam Batas Normal
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tandai seluruh sistem "Tidak ada keluhan"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Seluruh item pada 12 sistem akan diubah menjadi "Tidak ada". Anda tetap dapat mengubah sistem
                    tertentu menjadi "Ada" setelahnya bila diperlukan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkAllNormal}>Ya, Tandai Normal</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {ROS_SYSTEMS.map((system) => {
              const systemPositiveCount = system.items.filter((it) => items[it.code]?.status === 'positive').length;
              return (
                <AccordionItem key={system.id} value={system.id} className="border rounded-lg px-3 bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{system.label}</span>
                      {systemPositiveCount > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                          {systemPositiveCount} temuan
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid md:grid-cols-2 gap-3 pt-1">
                      {system.items.map((symptom) => {
                        const current = items[symptom.code];
                        const status = current?.status ?? 'negative';
                        const selfHarm = isSelfHarmItem(symptom.code);
                        return (
                          <div
                            key={symptom.code}
                            className={cn(
                              'rounded-md border p-2.5',
                              selfHarm && status === 'positive' ? 'border-red-300 bg-red-50/60 dark:bg-red-950/20' : 'border-border/60'
                            )}
                          >
                            <p className="text-xs font-medium text-foreground mb-1.5">{symptom.name}</p>
                            <RadioGroup
                              value={status}
                              onValueChange={(v) => handleStatusChange(symptom.code, v as RosStatus)}
                              className="flex flex-wrap gap-x-3 gap-y-1"
                            >
                              {ROS_STATUS_OPTIONS.map((opt) => (
                                <div key={opt.value} className="flex items-center gap-1.5">
                                  <RadioGroupItem id={`${symptom.code}-${opt.value}`} value={opt.value} className="h-3.5 w-3.5" />
                                  <Label htmlFor={`${symptom.code}-${opt.value}`} className="text-xs font-normal cursor-pointer">
                                    {opt.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                            {status === 'positive' && (
                              <Textarea
                                value={current?.detail ?? ''}
                                onChange={(e) => handleDetailChange(symptom.code, e.target.value)}
                                placeholder="Detail / keterangan (opsional)..."
                                className="mt-2 text-xs min-h-[60px]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <Card className="border-0 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Ringkasan Anamnesis Sistem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 leading-relaxed">{summaryText}</p>
              <div className="flex items-center gap-1 mt-2 -ml-2">
                <Button size="sm" variant="ghost" onClick={handleCopySummary}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Salin Ringkasan untuk SOAP
                </Button>
                <Button size="sm" variant="ghost" onClick={handleAiAssist} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Bot className="w-3.5 h-3.5 mr-1.5" />}
                  Bantuan AI Clinical Assistant
                </Button>
              </div>
            </CardContent>
          </Card>

          {aiAnalysis && (
            <Card className="border border-violet-200 bg-violet-50/60 dark:bg-violet-950/20 dark:border-violet-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Bot className="w-4 h-4" /> Bantuan AI — memerlukan verifikasi dokter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-violet-700/80 dark:text-violet-300/80 mb-2">
                  Hasil di bawah dibuat oleh AI berdasarkan data yang Anda isi. Tinjau dan verifikasi sebelum
                  digunakan dalam rekam medis — AI tidak menetapkan diagnosis pasti.
                </p>
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{aiAnalysis}</div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-2 pb-2">
            {saveLabel === 'saved' && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 mr-auto">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
              </span>
            )}
            <Button variant="outline" disabled={saving} onClick={() => doSave('draft')}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Simpan Draft
            </Button>
            <Button disabled={saving} onClick={() => doSave('completed')}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              {saving ? 'Menyimpan...' : 'Simpan Anamnesis Sistem'}
            </Button>
          </div>
        </>
      )}

      {/* Detail dialog for a past encounter */}
      <Dialog open={!!viewingEncounter} onOpenChange={(open) => !open && setViewingEncounter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Anamnesis Sistem</DialogTitle>
            <DialogDescription>
              {viewingEncounter ? formatDate(viewingEncounter.assessmentDate) : ''}
              {viewingEncounter?.doctorName ? ` · ${viewingEncounter.doctorName}` : ''}
            </DialogDescription>
          </DialogHeader>
          {viewingEncounter && (
            <div className="space-y-3">
              <p className="text-sm text-foreground/90 bg-primary/5 rounded-md p-3">
                {generateRosSummary(viewingEncounter.items)}
              </p>
              {ROS_SYSTEMS.map((system) => {
                const findings = viewingEncounter.items.filter((i) => i.systemName === system.id && i.status === 'positive');
                if (findings.length === 0) return null;
                return (
                  <div key={system.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{system.label}</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {findings.map((f) => (
                        <li key={f.symptomCode}>
                          {f.symptomName}
                          {f.detail ? <span className="text-muted-foreground"> — {f.detail}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// RosPatientSummaryView — read-only view for the PATIENT side.
//
// Per spec §20: patients may see a doctor-authored summary, but never the
// editing form, and can never edit/delete/change anything here.
// ───────────────────────────────────────────────────────────────────────────
export interface RosPatientSummaryViewProps {
  patientId: string;
}

export function RosPatientSummaryView({ patientId }: RosPatientSummaryViewProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<RosEncounterSummary[]>([]);
  const [viewingEncounter, setViewingEncounter] = useState<RosEncounterSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    medicalSystemReviewService.getHistory(patientId).then((rows) => {
      if (!cancelled) {
        setHistory(rows.filter((r) => r.reviewStatus === 'completed'));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat ringkasan pengkajian dokter...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-0">
        <CardContent className="p-8 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada Ringkasan Pengkajian Dokter untuk Anda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((enc) => (
        <Card key={enc.encounterId} className="border-0 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setViewingEncounter(enc)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Ringkasan Pengkajian Dokter</p>
                <p className="text-xs text-muted-foreground">{formatDate(enc.assessmentDate)}{enc.doctorName ? ` · ${enc.doctorName}` : ''}</p>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">Selesai</Badge>
            </div>
            <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{generateRosSummary(enc.items)}</p>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!viewingEncounter} onOpenChange={(open) => !open && setViewingEncounter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ringkasan Pengkajian Dokter</DialogTitle>
            <DialogDescription>
              {viewingEncounter ? formatDate(viewingEncounter.assessmentDate) : ''}
              {viewingEncounter?.doctorName ? ` · ${viewingEncounter.doctorName}` : ''}
            </DialogDescription>
          </DialogHeader>
          {viewingEncounter && (
            <div className="space-y-3">
              <p className="text-sm text-foreground/90 bg-primary/5 rounded-md p-3">
                {generateRosSummary(viewingEncounter.items)}
              </p>
              {ROS_SYSTEMS.map((system) => {
                const findings = viewingEncounter.items.filter((i) => i.systemName === system.id && i.status === 'positive');
                if (findings.length === 0) return null;
                return (
                  <div key={system.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{system.label}</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {findings.map((f) => (
                        <li key={f.symptomCode}>
                          {f.symptomName}
                          {f.detail ? <span className="text-muted-foreground"> — {f.detail}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
