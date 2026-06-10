'use client';

import { useState, useMemo } from 'react';
import type {
  PalliativeMedicationInfo,
  MedicationMonitoringFormItem,
  MedicationMonitoringFormAnswers,
  MedicationConsumptionStatus,
  SideEffectType,
  NotTakenReason,
  NotConsumedReason,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Label Maps ──────────────────────────────────────────────────────────────

const consumptionStatusLabel: Record<MedicationConsumptionStatus, string> = {
  sudah_diminum: 'Sudah Diminum',
  belum_diminum: 'Belum Diminum',
  tidak_diminum: 'Tidak Diminum',
};

const sideEffectLabels: Record<SideEffectType, string> = {
  mual: 'Mual',
  muntah: 'Muntah',
  pusing: 'Pusing',
  mengantuk_berlebihan: 'Mengantuk Berlebihan',
  sulit_tidur: 'Sulit Tidur',
  konstipasi: 'Konstipasi',
  diare: 'Diare',
  nyeri_bertambah: 'Nyeri Bertambah',
  sesak_napas: 'Sesak Napas',
  nafsu_makan_menurun: 'Nafsu Makan Menurun',
  reaksi_alergi: 'Reaksi Alergi',
  lainnya: 'Lainnya',
};

const notTakenReasonLabels: Record<NotTakenReason, string> = {
  lupa: 'Lupa',
  belum_waktunya: 'Belum Waktunya',
  sedang_tidur: 'Sedang Tidur',
  obat_tidak_tersedia: 'Obat Tidak Tersedia',
  alasan_lain: 'Alasan Lain',
};

const notConsumedReasonLabels: Record<NotConsumedReason, string> = {
  efek_samping: 'Efek Samping',
  merasa_sudah_membaik: 'Merasa Sudah Membaik',
  tidak_ada_obat: 'Tidak Ada Obat',
  tidak_mampu_membeli: 'Tidak Mampu Membeli',
  tidak_ingin_minum: 'Tidak Ingin Minum',
  sulit_menelan: 'Sulit Menelan',
  mual_muntah: 'Mual/Muntah',
  instruksi_keluarga: 'Instruksi Keluarga',
  alasan_lainnya: 'Alasan Lainnya',
};

const allSideEffects: SideEffectType[] = [
  'mual', 'muntah', 'pusing', 'mengantuk_berlebihan',
  'sulit_tidur', 'konstipasi', 'diare', 'nyeri_bertambah',
  'sesak_napas', 'nafsu_makan_menurun', 'reaksi_alergi', 'lainnya',
];

const allNotTakenReasons: NotTakenReason[] = [
  'lupa', 'belum_waktunya', 'sedang_tidur', 'obat_tidak_tersedia', 'alasan_lain',
];

const allNotConsumedReasons: NotConsumedReason[] = [
  'efek_samping', 'merasa_sudah_membaik', 'tidak_ada_obat',
  'tidak_mampu_membeli', 'tidak_ingin_minum', 'sulit_menelan',
  'mual_muntah', 'instruksi_keluarga', 'alasan_lainnya',
];

// ── Props ───────────────────────────────────────────────────────────────────

interface MedicationMonitoringFormProps {
  medications: PalliativeMedicationInfo[];
  onSubmit: (answers: MedicationMonitoringFormAnswers) => void;
  onSaveDraft: (answers: MedicationMonitoringFormAnswers) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function MedicationMonitoringForm({
  medications,
  onSubmit,
  onSaveDraft,
}: MedicationMonitoringFormProps) {
  // Build initial form items from medication data
  const initialItems = useMemo<MedicationMonitoringFormItem[]>(() =>
    medications.map(med => ({
      medicationId: med.id,
      medicineName: med.medicineName,
      dosage: med.dosage,
      frequency: med.frequency,
      route: med.route,
      indication: med.indication,
      consumptionStatus: null,
      sideEffects: [],
    })),
    [medications]
  );

  const [items, setItems] = useState<MedicationMonitoringFormItem[]>(initialItems);
  const [overallNotes, setOverallNotes] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  // Progress calculation
  const filledCount = items.filter(item => item.consumptionStatus !== null).length;
  const progress = medications.length > 0 ? Math.round((filledCount / medications.length) * 100) : 0;

  // Update a single medication item
  const updateItem = (idx: number, patch: Partial<MedicationMonitoringFormItem>) => {
    setItems(prev => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  // Build the final answers object
  const buildAnswers = (): MedicationMonitoringFormAnswers => ({
    medications: items,
    overallNotes: overallNotes || undefined,
  });

  // Validate: all medications must have a consumption status
  const isValid = items.every(item => item.consumptionStatus !== null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-sm">Form Monitoring Obat Paliatif</h3>
        </div>
        <Badge variant="outline">
          {filledCount}/{medications.length} obat terisi
        </Badge>
      </div>
      <Progress value={progress} className="h-2" />

      {/* Medication Cards */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <Card key={item.medicationId} className="overflow-hidden">
            {/* Card Header - always visible */}
            <div
              className="p-3 cursor-pointer hover:bg-muted/30 transition-colors flex items-start justify-between gap-2"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="font-medium text-sm truncate">{item.medicineName}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.dosage}</Badge>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.frequency}</Badge>
                  {item.route && (
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{item.route}</Badge>
                  )}
                </div>
                {item.indication && (
                  <p className="text-xs text-muted-foreground mt-1">Indikasi: {item.indication}</p>
                )}
                {item.consumptionStatus && (
                  <div className="mt-1">
                    <Badge
                      className={cn(
                        'text-[10px]',
                        item.consumptionStatus === 'sudah_diminum' && 'bg-green-50 text-green-700 border-green-200',
                        item.consumptionStatus === 'belum_diminum' && 'bg-amber-50 text-amber-700 border-amber-200',
                        item.consumptionStatus === 'tidak_diminum' && 'bg-red-50 text-red-700 border-red-200',
                      )}
                      variant="outline"
                    >
                      {consumptionStatusLabel[item.consumptionStatus]}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="shrink-0 mt-0.5">
                {expandedIdx === idx ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Card Body - expanded content */}
            {expandedIdx === idx && (
              <CardContent className="pt-0 px-3 pb-3 space-y-3 border-t">
                {/* Read-only medication info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-2">
                  <span className="text-muted-foreground">Nama Obat:</span>
                  <span className="font-medium">{item.medicineName}</span>
                  <span className="text-muted-foreground">Dosis:</span>
                  <span>{item.dosage}</span>
                  <span className="text-muted-foreground">Frekuensi:</span>
                  <span>{item.frequency}</span>
                  {item.route && (
                    <>
                      <span className="text-muted-foreground">Rute:</span>
                      <span className="capitalize">{item.route}</span>
                    </>
                  )}
                  {item.indication && (
                    <>
                      <span className="text-muted-foreground">Indikasi:</span>
                      <span>{item.indication}</span>
                    </>
                  )}
                </div>

                <Separator />

                {/* Consumption Status */}
                <div>
                  <Label className="text-sm font-medium">Status Konsumsi Obat</Label>
                  <RadioGroup
                    value={item.consumptionStatus ?? ''}
                    onValueChange={v => {
                      const status = v as MedicationConsumptionStatus;
                      const patch: Partial<MedicationMonitoringFormItem> = {
                        consumptionStatus: status,
                      };
                      // Reset conditional fields when status changes
                      if (status === 'sudah_diminum') {
                        patch.consumptionDate = undefined;
                        patch.consumptionTime = undefined;
                        patch.hasComplaints = undefined;
                        patch.sideEffects = [];
                        patch.otherComplaint = undefined;
                        patch.complaintSeverity = undefined;
                        patch.complaintNotes = undefined;
                        patch.notTakenReason = undefined;
                        patch.notTakenOtherReason = undefined;
                        patch.notConsumedReason = undefined;
                        patch.notConsumedOtherReason = undefined;
                        patch.notConsumedExplanation = undefined;
                      } else if (status === 'belum_diminum') {
                        patch.notTakenReason = undefined;
                        patch.notTakenOtherReason = undefined;
                        patch.consumptionDate = undefined;
                        patch.consumptionTime = undefined;
                        patch.hasComplaints = undefined;
                        patch.sideEffects = [];
                        patch.otherComplaint = undefined;
                        patch.complaintSeverity = undefined;
                        patch.complaintNotes = undefined;
                        patch.notConsumedReason = undefined;
                        patch.notConsumedOtherReason = undefined;
                        patch.notConsumedExplanation = undefined;
                      } else if (status === 'tidak_diminum') {
                        patch.notConsumedReason = undefined;
                        patch.notConsumedOtherReason = undefined;
                        patch.notConsumedExplanation = undefined;
                        patch.consumptionDate = undefined;
                        patch.consumptionTime = undefined;
                        patch.hasComplaints = undefined;
                        patch.sideEffects = [];
                        patch.otherComplaint = undefined;
                        patch.complaintSeverity = undefined;
                        patch.complaintNotes = undefined;
                        patch.notTakenReason = undefined;
                        patch.notTakenOtherReason = undefined;
                      }
                      updateItem(idx, patch);
                    }}
                    className="flex gap-4 mt-2"
                  >
                    {(['sudah_diminum', 'belum_diminum', 'tidak_diminum'] as MedicationConsumptionStatus[]).map(s => (
                      <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <RadioGroupItem value={s} />
                        {consumptionStatusLabel[s]}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {/* ── Sudah Diminum Section ── */}
                {item.consumptionStatus === 'sudah_diminum' && (
                  <div className="space-y-3 pl-2 border-l-2 border-green-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tanggal Minum</Label>
                        <Input
                          type="date"
                          value={item.consumptionDate ?? ''}
                          onChange={e => updateItem(idx, { consumptionDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Waktu Minum</Label>
                        <Input
                          type="time"
                          value={item.consumptionTime ?? ''}
                          onChange={e => updateItem(idx, { consumptionTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium">Apakah ada keluhan setelah minum obat?</Label>
                      <RadioGroup
                        value={item.hasComplaints === true ? 'ya' : item.hasComplaints === false ? 'tidak' : ''}
                        onValueChange={v => updateItem(idx, {
                          hasComplaints: v === 'ya',
                          sideEffects: v === 'ya' ? item.sideEffects : [],
                          otherComplaint: v === 'ya' ? item.otherComplaint : undefined,
                          complaintSeverity: v === 'ya' ? item.complaintSeverity : undefined,
                          complaintNotes: v === 'ya' ? item.complaintNotes : undefined,
                        })}
                        className="flex gap-4 mt-1"
                      >
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <RadioGroupItem value="ya" /> Ya
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <RadioGroupItem value="tidak" /> Tidak
                        </label>
                      </RadioGroup>
                    </div>

                    {item.hasComplaints && (
                      <div className="space-y-3 pl-2 border-l-2 border-amber-200">
                        <div>
                          <Label className="text-xs font-medium">Efek Samping yang Dirasakan</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {allSideEffects.map(se => (
                              <label key={se} className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={item.sideEffects?.includes(se) ?? false}
                                  onCheckedChange={checked => {
                                    const current = item.sideEffects ?? [];
                                    const updated = checked
                                      ? [...current, se]
                                      : current.filter(s => s !== se);
                                    updateItem(idx, { sideEffects: updated });
                                  }}
                                />
                                {sideEffectLabels[se]}
                              </label>
                            ))}
                          </div>
                        </div>

                        {item.sideEffects?.includes('lainnya') && (
                          <div>
                            <Label className="text-xs">Keluhan Lainnya</Label>
                            <Input
                              value={item.otherComplaint ?? ''}
                              onChange={e => updateItem(idx, { otherComplaint: e.target.value })}
                              placeholder="Jelaskan keluhan lain..."
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-xs font-medium">
                            Tingkat Keparahan Keluhan (0-10)
                          </Label>
                          <div className="flex items-center gap-3 mt-1">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={item.complaintSeverity ?? ''}
                              onChange={e => updateItem(idx, {
                                complaintSeverity: e.target.value ? Number(e.target.value) : undefined,
                              })}
                              className="w-20"
                            />
                            <span className="text-xs text-muted-foreground">0 = ringan, 10 = sangat berat</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Catatan Keluhan</Label>
                          <Textarea
                            value={item.complaintNotes ?? ''}
                            onChange={e => updateItem(idx, { complaintNotes: e.target.value })}
                            placeholder="Jelaskan keluhan yang dirasakan..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Belum Diminum Section ── */}
                {item.consumptionStatus === 'belum_diminum' && (
                  <div className="space-y-3 pl-2 border-l-2 border-amber-200">
                    <div>
                      <Label className="text-xs font-medium">Alasan Belum Diminum</Label>
                      <RadioGroup
                        value={item.notTakenReason ?? ''}
                        onValueChange={v => updateItem(idx, {
                          notTakenReason: v as NotTakenReason,
                          notTakenOtherReason: v !== 'alasan_lain' ? undefined : item.notTakenOtherReason,
                        })}
                        className="space-y-1 mt-1"
                      >
                        {allNotTakenReasons.map(r => (
                          <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                            <RadioGroupItem value={r} />
                            {notTakenReasonLabels[r]}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    {item.notTakenReason === 'alasan_lain' && (
                      <div>
                        <Label className="text-xs">Jelaskan Alasan Lain</Label>
                        <Input
                          value={item.notTakenOtherReason ?? ''}
                          onChange={e => updateItem(idx, { notTakenOtherReason: e.target.value })}
                          placeholder="Tuliskan alasan lain..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tidak Diminum Section ── */}
                {item.consumptionStatus === 'tidak_diminum' && (
                  <div className="space-y-3 pl-2 border-l-2 border-red-200">
                    <div>
                      <Label className="text-xs font-medium">Alasan Tidak Diminum</Label>
                      <RadioGroup
                        value={item.notConsumedReason ?? ''}
                        onValueChange={v => updateItem(idx, {
                          notConsumedReason: v as NotConsumedReason,
                          notConsumedOtherReason: v !== 'alasan_lainnya' ? undefined : item.notConsumedOtherReason,
                        })}
                        className="space-y-1 mt-1"
                      >
                        {allNotConsumedReasons.map(r => (
                          <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                            <RadioGroupItem value={r} />
                            {notConsumedReasonLabels[r]}
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    {item.notConsumedReason === 'alasan_lainnya' && (
                      <div>
                        <Label className="text-xs">Jelaskan Alasan Lainnya</Label>
                        <Input
                          value={item.notConsumedOtherReason ?? ''}
                          onChange={e => updateItem(idx, { notConsumedOtherReason: e.target.value })}
                          placeholder="Tuliskan alasan lainnya..."
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-medium">Penjelasan Tambahan (Wajib)</Label>
                      <Textarea
                        value={item.notConsumedExplanation ?? ''}
                        onChange={e => updateItem(idx, { notConsumedExplanation: e.target.value })}
                        placeholder="Jelaskan mengapa obat tidak diminum..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Overall Notes */}
      <Separator />
      <div>
        <Label className="text-sm font-medium">Catatan Umum</Label>
        <Textarea
          value={overallNotes}
          onChange={e => setOverallNotes(e.target.value)}
          placeholder="Catatan tambahan mengenai monitoring obat hari ini..."
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onSaveDraft(buildAnswers())}>
          <Save className="w-3 h-3 mr-1" /> Simpan Draft
        </Button>
        <Button size="sm" disabled={!isValid} onClick={() => onSubmit(buildAnswers())}>
          <Send className="w-3 h-3 mr-1" /> Kirim
        </Button>
      </div>

      {!isValid && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Harap isi status konsumsi untuk semua obat sebelum mengirim
        </p>
      )}
    </div>
  );
}
