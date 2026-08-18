'use client';

import { useState, useCallback, useMemo } from 'react';
import type { PalliativeToolType, PalliativeEwsLevel } from '@/lib/types';
import {
  TOOL_META,
  ESAS_ITEMS,
  DT_PROBLEMS,
  SPICT_QUESTIONS,
  SPICT_DISEASES,
  PPS_QUESTIONS,
  PPS_EXTRA_QUESTIONS,
  ZARIT_QUESTIONS,
  ZARIT_OPTIONS,
  EORTC_QUESTIONS,
  EORTC_OPTIONS_4,
  calcESAS,
  calcDistress,
  calcSPICT,
  calcPPS,
  calcZarit,
  calcEORTC,
  getEwsLevel,
  calculateScreeningResult,
  vasColor,
  vasBg,
  getEwsBadge,
  ScreeningScoreResult,
} from '@/lib/palliative-screening-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface InlineScreeningFormProps {
  screeningType: PalliativeToolType;
  onSubmit: (result: ScreeningScoreResult, answers: Record<string, number | string | string[]>) => void | Promise<void>;
  onSaveDraft: (answers: Record<string, number | string | string[]>) => void;
  initialAnswers?: Record<string, number | string | string[]>;
}

// ── Component ──────────────────────────────────────────────────────────────

export function InlineScreeningForm({
  screeningType,
  onSubmit,
  onSaveDraft,
  initialAnswers,
}: InlineScreeningFormProps) {
  const toolDef = TOOL_META[screeningType];
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | string | string[]>>(initialAnswers || {});
  // Mirrors the doctor-side "Mengirim…" pattern used when sending a
  // screening form — the button disables and shows a sending state instead
  // of allowing another tap while the result is still being persisted/sent
  // through chat (multiple awaited steps in the parent's onSubmit handler).
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = toolDef.totalSteps;

  const progressPercent = useMemo(() => {
    if (showResult) return 100;
    if (totalSteps === 0) return 0;
    return Math.round((currentStep / (totalSteps + 1)) * 100);
  }, [currentStep, totalSteps, showResult]);

  // Answer helpers
  const setAnswer = useCallback((key: string, value: number | string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleCheck = useCallback((key: string, item: string) => {
    setAnswers(prev => {
      const current = (prev[key] as string[]) || [];
      const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
      return { ...prev, [key]: next };
    });
  }, []);

  const isChecked = useCallback((key: string, item: string): boolean => {
    return ((answers[key] as string[]) || []).includes(item);
  }, [answers]);

  // Navigation
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  }, [currentStep, totalSteps]);

  const handlePrev = useCallback(() => {
    if (showResult) {
      setShowResult(false);
    } else if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, showResult]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = calculateScreeningResult(screeningType, answers);
      await onSubmit(result, { ...answers });
      // No setIsSubmitting(false) on the success path — the parent removes
      // this form from view once submission completes, so leaving the
      // button disabled avoids a flash back to "enabled" right before
      // unmount. If onSubmit throws, the finally below re-enables it so the
      // patient can retry.
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  }, [screeningType, answers, onSubmit, isSubmitting]);

  // ── VAS Slider ──
  const renderVasSlider = (id: string, label: string) => {
    const value = Number(answers[id]) || 0;
    return (
      <div key={id} className="space-y-2 py-2 border-b border-border last:border-b-0">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-foreground">{label}</Label>
          <span className={cn('text-lg font-bold tabular-nums', vasColor(value))}>{value}</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => setAnswer(id, Number(e.target.value))}
          className="sk-vas-slider w-full"
          style={{ background: 'linear-gradient(to right, #10b981 0%, #f59e0b 40%, #ef4444 70%, #dc2626 100%)' }}
        />
        <div className="flex justify-between">
          <span className="text-[9px] text-emerald-600">0</span>
          <span className="text-[9px] text-amber-600">5</span>
          <span className="text-[9px] text-red-600">10</span>
        </div>
      </div>
    );
  };

  // ── ESAS Step ──
  const renderESAS = () => (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground mb-2">
        Berikan skor 0 (tidak ada gejala) sampai 10 (gejala terburuk) untuk setiap item:
      </p>
      {ESAS_ITEMS.map(item => renderVasSlider(item.id, item.label))}
      <div className="mt-3 p-2 rounded-lg bg-muted/50">
        <p className="text-xs font-medium text-foreground">
          Skor Total: <span className={cn('text-sm font-bold', vasColor(calcESAS(answers).total > 27 ? 7 : calcESAS(answers).total > 18 ? 4 : 0))}>
            {calcESAS(answers).total}/90
          </span>
        </p>
      </div>
    </div>
  );

  // ── Distress Steps ──
  const renderDistress = () => {
    if (currentStep === 0) {
      const value = Number(answers['dt-score']) || 0;
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
            Pilih angka yang paling menggambarkan tingkat tekanan/stres Anda selama 1 minggu terakhir:
          </p>
          <div className="text-center">
            <span className={cn('text-5xl font-black', vasColor(value))}>{value}</span>
            <p className="text-xs text-muted-foreground mt-1">dari 10</p>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setAnswer('dt-score', Number(e.target.value))}
            className="sk-vas-slider w-full"
            style={{ background: 'linear-gradient(to right, #10b981 0%, #f59e0b 40%, #ef4444 70%, #dc2626 100%)' }}
          />
          <div className="flex justify-between">
            <span className="text-[9px] text-emerald-600">Tidak ada tekanan</span>
            <span className="text-[9px] text-red-600">Tekanan sangat berat</span>
          </div>
        </div>
      );
    }

    const catIdx = currentStep - 1;
    const cat = DT_PROBLEMS[catIdx];
    if (!cat) return null;

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-2">
          Centang masalah yang Anda alami dalam kategori <strong>{cat.category}</strong>:
        </p>
        {cat.items.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2 py-1">
            <Checkbox
              id={`dt-${cat.category}-${idx}`}
              checked={isChecked(`dt-${cat.category}`, item)}
              onCheckedChange={() => toggleCheck(`dt-${cat.category}`, item)}
            />
            <Label htmlFor={`dt-${cat.category}-${idx}`} className="text-xs font-normal cursor-pointer">
              {item}
            </Label>
          </div>
        ))}
      </div>
    );
  };

  // ── SPICT Steps ──
  const renderSPICT = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground italic mb-2">
            Alat bantu ini digunakan untuk mengidentifikasi pasien yang mungkin memerlukan penilaian paliatif. Ini bukan diagnosis medis.
          </p>
          {SPICT_QUESTIONS.map((q, idx) => {
            const currentVal = answers[q.id] as number | undefined;
            return (
              <div key={q.id} className="border-b border-border pb-3 last:border-b-0">
                <p className="text-xs font-semibold text-foreground mb-1">
                  {idx + 1}. {q.text}
                </p>
                <p className="text-[10px] text-muted-foreground italic mb-2 underline decoration-primary/20 decoration-1">
                  {q.help}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAnswer(q.id, 1); }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      currentVal === 1
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-card text-foreground border-border hover:border-red-300',
                    )}
                  >
                    Ya
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAnswer(q.id, 0); }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      currentVal === 0
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-card text-foreground border-border hover:border-emerald-300',
                    )}
                  >
                    Tidak
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-3">
          <div className="p-3 bg-primary/5 rounded-lg">
            <h3 className="text-xs font-semibold text-foreground mb-2">C. Penyakit Kronis atau Berat</h3>
            <p className="text-[10px] text-muted-foreground mb-2">Pilih salah satu atau lebih jika ada:</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SPICT_DISEASES.map((disease) => (
                <div key={disease} className="flex items-center space-x-2">
                  <Checkbox
                    id={`spict-disease-${disease}`}
                    checked={isChecked('spict-diseases', disease)}
                    onCheckedChange={() => toggleCheck('spict-diseases', disease)}
                  />
                  <Label htmlFor={`spict-disease-${disease}`} className="text-xs font-normal cursor-pointer">
                    {disease}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      const surpriseVal = (answers['spict-surprise'] as string) || '';
      return (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-xs font-semibold text-foreground mb-2">Pertanyaan Kejutan (Surprise Question)</h3>
            <p className="text-xs text-foreground mb-3">
              &quot;Apakah Anda akan terkejut jika pasien meninggal dalam 12 bulan ke depan?&quot;
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAnswer('spict-surprise', 'yes'); }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border-2',
                  surpriseVal === 'yes'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-border bg-card text-foreground hover:border-emerald-300',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                    surpriseVal === 'yes' ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/40',
                  )}>
                    {surpriseVal === 'yes' && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <span>Ya, saya akan terkejut</span>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAnswer('spict-surprise', 'no'); }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border-2',
                  surpriseVal === 'no'
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-border bg-card text-foreground hover:border-red-300',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                    surpriseVal === 'no' ? 'border-red-500 bg-red-500' : 'border-muted-foreground/40',
                  )}>
                    {surpriseVal === 'no' && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <span>Tidak, saya tidak akan terkejut</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── PPS Steps ──
  const renderPPS = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground italic mb-2">
            Pilih jawaban yang paling sesuai dengan kondisi pasien dalam 1 minggu terakhir.
          </p>
          {PPS_QUESTIONS.map(q => {
            const selectedValue = Number(answers[q.id]) ?? -1;
            return (
              <div key={q.id} className="mb-3">
                <p className="text-xs font-medium text-foreground mb-2">{q.title}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {q.options.map(opt => {
                    const isSelected = selectedValue === opt.score;
                    return (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAnswer(q.id, opt.score); }}
                        className={cn(
                          'w-full text-left border-2 rounded-lg p-2 cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40 hover:bg-primary/5',
                        )}
                      >
                        <div className="flex items-center">
                          <div className={cn(
                            'w-3.5 h-3.5 rounded-full border-2 mr-2 flex items-center justify-center shrink-0 transition-all',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                          )}>
                            {isSelected && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                          </div>
                          <span className="text-xs font-semibold text-foreground">{opt.text}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {PPS_QUESTIONS.every(q => answers[q.id] !== undefined) && (
            <div className="p-2 rounded-lg bg-primary/10 text-center">
              <p className="text-sm font-bold text-primary">PPS {calcPPS(answers).pps}%</p>
              <p className="text-[10px] text-muted-foreground">Rata-rata dari 5 dimensi</p>
            </div>
          )}
        </div>
      );
    }

    // Step 2: Extra questions
    return (
      <div className="space-y-3">
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-foreground mb-3">Pertanyaan Tambahan</p>
        </div>
        {PPS_EXTRA_QUESTIONS.map((q, idx) => {
          const currentVal = Number(answers[`pps-extra-${idx}`]) ?? 0;
          return (
            <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs font-medium text-foreground mb-2">{q}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAnswer(`pps-extra-${idx}`, 1); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    currentVal === 1
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-card text-foreground border-border hover:border-red-300',
                  )}
                >
                  Ya
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAnswer(`pps-extra-${idx}`, 0); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    currentVal === 0
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-card text-foreground border-border hover:border-emerald-300',
                  )}
                >
                  Tidak
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Zarit Steps ──
  const renderZarit = () => {
    const page = currentStep;
    const startIdx = page * 6;
    const endIdx = Math.min(startIdx + 6, 22);
    const pageQuestions = ZARIT_QUESTIONS.slice(startIdx, endIdx);

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground mb-2">
          Seberapa sering Anda merasa hal berikut ini? (Pertanyaan {startIdx + 1}-{endIdx} dari 22)
        </p>
        {pageQuestions.map((question, qIdx) => {
          const globalIdx = startIdx + qIdx;
          const currentVal = Number(answers[`zarit-${globalIdx}`]);
          return (
            <div key={globalIdx} className="space-y-1.5 py-2 border-b border-border last:border-b-0">
              <p className="text-xs font-medium text-foreground">
                {globalIdx + 1}. {question}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ZARIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); setAnswer(`zarit-${globalIdx}`, opt.value); }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[10px] font-medium transition-all border',
                      currentVal === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── EORTC Steps ──
  const renderEORTC = () => {
    if (currentStep === 2) {
      const value = Number(answers['eortc-q15']) || 1;
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
            Pertanyaan terakhir tentang kualitas hidup Anda secara keseluruhan:
          </p>
          <div className="p-3 rounded-lg border border-border">
            <p className="text-xs font-medium text-foreground mb-3">
              {EORTC_QUESTIONS[14].text}
            </p>
            <div className="space-y-1.5">
              {['Sangat buruk', 'Sangat jelek', 'Jelek', 'Cukup', 'Baik', 'Sangat baik', 'Sempurna'].map((label, idx) => {
                const val = idx + 1;
                return (
                  <button
                    key={val}
                    onClick={(e) => { e.stopPropagation(); setAnswer('eortc-q15', val); }}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left flex items-center gap-2',
                      value === val
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      value === val ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}>
                      {val}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const section = currentStep === 0 ? 'physical' : 'symptom';
    const sectionLabel = section === 'physical' ? 'Fungsi Fisik & Aktivitas' : 'Gejala';
    const sectionQuestions = EORTC_QUESTIONS.filter(q => q.section === section);

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground mb-2">
          Bagian: <strong>{sectionLabel}</strong> — Pilih jawaban yang paling sesuai selama 1 minggu terakhir:
        </p>
        {sectionQuestions.map((question, qIdx) => {
          const currentVal = Number(answers[question.id]);
          return (
            <div key={question.id} className="space-y-1.5 py-2 border-b border-border last:border-b-0">
              <p className="text-xs font-medium text-foreground">
                {qIdx + 1}. {question.text}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EORTC_OPTIONS_4.map(opt => (
                  <button
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); setAnswer(question.id, opt.value); }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[10px] font-medium transition-all border',
                      currentVal === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Result Renderer ──
  const renderResult = () => {
    const result = calculateScreeningResult(screeningType, answers);
    const ews = getEwsBadge(result.ewsLevel);

    return (
      <div className="space-y-3">
        <div className="text-center">
          <p className={cn('text-3xl font-black', result.ewsLevel === 'merah' ? 'text-red-600' : result.ewsLevel === 'kuning' ? 'text-amber-600' : 'text-emerald-600')}>
            {result.scoreLabel}
          </p>
        </div>
        <div className={cn('rounded-lg border-2 px-3 py-2 text-center', ews.bg)}>
          <span className={cn('text-xs font-bold', ews.color)}>{ews.label}</span>
        </div>

        {/* Tool-specific result details */}
        {screeningType === 'esas' && (() => {
          const { items, total } = calcESAS(answers);
          return (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((item, idx) => (
                <div key={idx} className="text-center p-1.5 rounded border border-border bg-card">
                  <div className="h-10 flex items-end justify-center mb-0.5">
                    <div className={cn('w-4 rounded-t-md transition-all', vasBg(item.value))} style={{ height: `${Math.max(item.value * 10, 4)}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">{item.label}</p>
                  <p className={cn('text-xs font-bold', vasColor(item.value))}>{item.value}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {screeningType === 'distress' && (() => {
          const { score, problems } = calcDistress(answers);
          return (
            <div className="space-y-2">
              <p className="text-xs font-medium">Skor Distress: <span className={cn('font-bold', vasColor(score))}>{score}/10</span></p>
              {Object.entries(problems).map(([cat, items]) => (
                <div key={cat} className="text-xs">
                  <span className="font-medium">{cat}:</span> {items.join(', ')}
                </div>
              ))}
            </div>
          );
        })()}

        {screeningType === 'spict' && (() => {
          const { yesCount, riskCategory, checkedDiseases, surpriseAnswer } = calcSPICT(answers);
          return (
            <div className="space-y-2 text-xs">
              <p>Indikator terdeteksi: <span className="font-bold">{yesCount} poin</span></p>
              <p>Kategori: <Badge variant="outline" className="text-[10px]">{riskCategory}</Badge></p>
              {checkedDiseases.length > 0 && <p>Penyakit: {checkedDiseases.join(', ')}</p>}
              {surpriseAnswer && <p>Surprise Question: <Badge variant="outline" className={cn('text-[10px]', surpriseAnswer === 'no' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>{surpriseAnswer === 'no' ? 'Tidak terkejut' : 'Terkejut'}</Badge></p>}
            </div>
          );
        })()}

        {screeningType === 'pps' && (() => {
          const { pps, dimensionDetails, extraYesCount } = calcPPS(answers);
          return (
            <div className="space-y-2 text-xs">
              <p className="text-lg font-bold text-center text-primary">PPS {pps}%</p>
              {dimensionDetails.map(d => (
                <div key={d.id} className="flex justify-between items-center py-1 border-b border-border">
                  <span>{d.title}</span>
                  <span className="font-medium">{d.label} ({d.score}%)</span>
                </div>
              ))}
              {extraYesCount > 0 && <p className="text-red-600 font-medium">{extraYesCount} indikator perburukan terdeteksi</p>}
            </div>
          );
        })()}

        {screeningType === 'zarit' && (() => {
          const { total, category, needReferral } = calcZarit(answers);
          return (
            <div className="space-y-2 text-xs text-center">
              <p className="text-lg font-bold">{total}/88</p>
              <p>Kategori: <Badge variant="outline" className="text-[10px]">{category}</Badge></p>
              {needReferral && <p className="text-red-600 font-medium">Perlu rujukan psikolog/psikiater</p>}
            </div>
          );
        })()}

        {screeningType === 'eortc' && (() => {
          const { physicalFunction, symptomBurden, globalQol } = calcEORTC(answers);
          return (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Fungsi Fisik</span><span className="font-bold">{physicalFunction}%</span></div>
              <div className="flex justify-between"><span>Beban Gejala</span><span className="font-bold">{symptomBurden}%</span></div>
              <div className="flex justify-between"><span>Kualitas Hidup Global</span><span className="font-bold">{globalQol}%</span></div>
            </div>
          );
        })()}

        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-[10px] text-muted-foreground italic">{result.interpretation}</p>
        </div>
      </div>
    );
  };

  // ── Step Render ──
  const renderStep = () => {
    if (showResult) return renderResult();

    switch (screeningType) {
      case 'esas': return renderESAS();
      case 'distress': return renderDistress();
      case 'spict': return renderSPICT();
      case 'pps': return renderPPS();
      case 'zarit': return renderZarit();
      case 'eortc': return renderEORTC();
    }
  };

  // ── Step Label ──
  const stepLabel = useMemo(() => {
    if (showResult) return 'Hasil';
    switch (screeningType) {
      case 'esas': return 'ESAS-r';
      case 'distress': {
        if (currentStep === 0) return 'Skor Distress';
        const cat = DT_PROBLEMS[currentStep - 1];
        return cat ? `Masalah: ${cat.category}` : '';
      }
      case 'spict': {
        if (currentStep === 0) return 'Pertanyaan Indikator';
        if (currentStep === 1) return 'Penyakit Kronis';
        return 'Surprise Question';
      }
      case 'pps': {
        if (currentStep === 0) return '5 Dimensi Kondisi';
        return 'Pertanyaan Tambahan';
      }
      case 'zarit': {
        const start = currentStep * 6 + 1;
        const end = Math.min((currentStep + 1) * 6, 22);
        return `Pertanyaan ${start}-${end}`;
      }
      case 'eortc': {
        if (currentStep === 0) return 'Fungsi Fisik & Aktivitas';
        if (currentStep === 1) return 'Gejala';
        return 'Kualitas Hidup Global';
      }
    }
  }, [screeningType, currentStep, showResult]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{toolDef.name}</h3>
        <Badge variant="outline" className="text-[10px]">
          {showResult ? 'Hasil' : `Langkah ${currentStep + 1}/${totalSteps}`}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progressPercent} className="h-1.5" />

      {/* Step label */}
      {!showResult && (
        <p className="text-xs font-medium text-primary">{stepLabel}</p>
      )}

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={(currentStep === 0 && !showResult) || isSubmitting}
          >
            <ChevronLeft className="w-3 h-3 mr-1" /> Kembali
          </Button>
          {!showResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSaveDraft(answers)}
              disabled={isSubmitting}
            >
              <Save className="w-3 h-3 mr-1" /> Draft
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {!showResult ? (
            <Button size="sm" onClick={handleNext} disabled={isSubmitting}>
              {currentStep < totalSteps - 1 ? (
                <>Lanjut <ChevronRight className="w-3 h-3 ml-1" /></>
              ) : (
                <>Lihat Hasil <CheckCircle2 className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              <Send className="w-3 h-3 mr-1" />
              {isSubmitting ? 'Mengirim…' : 'Kirim Hasil'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
