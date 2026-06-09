'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import type { ScreeningForm, ScreeningModuleId, RiskCategory, ScreeningAuditLog, Notification as AppNotification, ClinicalFile, TriageLevel } from '@/lib/types';
import {
  SCREENING_MODULES,
  MODULE_LABELS,
  MODULE_ICONS,
  calculateModuleScore,
  calculateProgress,
  getModuleById,
  getModulesForPatient,
  calculateTriage,
  generateClinicalSummary,
  TRIAGE_COLORS,
  TRIAGE_LABELS,
} from '@/lib/screening-templates';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardCheck,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Activity,
  ChevronRight,
  ChevronLeft,
  Save,
  FileText,
  Brain,
  Sparkles,
  Shield,
  Upload,
  X,
  Camera,
  FileImage,
  Film,
  File,
  Heart,
  Stethoscope,
  Thermometer,
  TrendingUp,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

const RISK_COLORS: Record<RiskCategory, { bg: string; text: string; border: string }> = {
  rendah: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  sedang: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  tinggi: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
  opened: { label: 'Dibuka', color: 'bg-purple-100 text-purple-700' },
  in_progress: { label: 'Sedang Diisi', color: 'bg-amber-100 text-amber-700' },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  reviewed: { label: 'Ditinjau', color: 'bg-teal-100 text-teal-700' },
};

const CLINICAL_FILE_TYPE_LABELS: Record<ClinicalFile['type'], { label: string; icon: React.ReactNode }> = {
  foto_luka: { label: 'Foto Luka', icon: <Camera className="w-4 h-4" /> },
  foto_obat: { label: 'Foto Obat', icon: <FileImage className="w-4 h-4" /> },
  foto_lab: { label: 'Foto Hasil Lab', icon: <FileText className="w-4 h-4" /> },
  foto_radiologi: { label: 'Foto Radiologi', icon: <FileImage className="w-4 h-4" /> },
  video_pernapasan: { label: 'Video Pernapasan', icon: <Film className="w-4 h-4" /> },
  video_mobilisasi: { label: 'Video Mobilisasi', icon: <Film className="w-4 h-4" /> },
  dokumen_medis: { label: 'Dokumen Medis', icon: <File className="w-4 h-4" /> },
};

// ── Main Component ─────────────────────────────────────────────────────────

export function ScreeningPanel() {
  const {
    currentUser,
    screeningForms,
    addScreeningForm,
    updateScreeningForm,
    addAuditLog,
    addClinicalAlert,
    consultations,
  } = useStore();

  const { toast } = useToast();

  const isDoctor = currentUser?.role === 'doctor';
  const isPatient = currentUser?.role === 'patient';

  // ── Doctor State ──
  const [filterTriage, setFilterTriage] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingForm, setViewingForm] = useState<ScreeningForm | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorFollowUp, setDoctorFollowUp] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ── Patient State ──
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [moduleAnswers, setModuleAnswers] = useState<Record<ScreeningModuleId, Record<string, string | number | string[]>>>({});
  const [clinicalFiles, setClinicalFiles] = useState<ClinicalFile[]>([]);

  // ── Computed Data ──
  const myScreeningForms = useMemo(() => {
    if (!currentUser) return [];
    if (isDoctor) return screeningForms.filter(f => f.doctorId === currentUser.id);
    return screeningForms.filter(f => f.patientId === currentUser.id);
  }, [screeningForms, currentUser, isDoctor]);

  const filteredForms = useMemo(() => {
    let forms = myScreeningForms;
    if (filterTriage !== 'all') forms = forms.filter(f => f.triageResult?.level === filterTriage);
    if (filterRisk !== 'all') {
      forms = forms.filter(f => {
        const scores = Object.values(f.moduleScores || {});
        return scores.some(s => s.riskCategory === filterRisk);
      });
    }
    if (filterStatus !== 'all') forms = forms.filter(f => f.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      forms = forms.filter(f => f.id.includes(q));
    }
    return forms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myScreeningForms, filterTriage, filterRisk, filterStatus, searchQuery]);

  const dashboardStats = useMemo(() => {
    const total = myScreeningForms.length;
    const completed = myScreeningForms.filter(f => f.status === 'completed' || f.status === 'reviewed').length;
    const pending = myScreeningForms.filter(f => f.status === 'sent' || f.status === 'opened' || f.status === 'in_progress').length;
    const triageCount = { hijau: 0, kuning: 0, oranye: 0, merah: 0 } as Record<TriageLevel, number>;
    myScreeningForms.forEach(f => { if (f.triageResult) triageCount[f.triageResult.level]++; });
    return { total, completed, pending, triageCount };
  }, [myScreeningForms]);

  // ── Active form / modules for patient ──
  const activeForm = useMemo(() => {
    if (!activeFormId) return null;
    return screeningForms.find(f => f.id === activeFormId) || null;
  }, [activeFormId, screeningForms]);

  const applicableModules = useMemo(() => {
    // Skrining Komprehensif: show ALL 12 modules
    return getModulesForPatient();
  }, []);

  const activeModule = applicableModules[activeModuleIdx] || null;

  const overallProgress = useMemo(() => {
    return calculateProgress(applicableModules, moduleAnswers);
  }, [applicableModules, moduleAnswers]);

  // ── Handlers ──
  const handleOpenForm = (form: ScreeningForm) => {
    setActiveFormId(form.id);
    setActiveModuleIdx(0);
    setModuleAnswers(form.moduleAnswers || {} as Record<ScreeningModuleId, Record<string, string | number | string[]>>);
    setClinicalFiles(form.clinicalFiles || []);
    if (form.status === 'sent') {
      updateScreeningForm(form.id, { status: 'opened' });
      addAuditLog({ id: generateId(), screeningId: form.id, action: 'opened', performedBy: currentUser?.id || '', timestamp: new Date().toISOString() });
    }
  };

  const handleAnswerChange = (moduleId: ScreeningModuleId, questionId: string, value: string | number | string[]) => {
    setModuleAnswers(prev => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] || {}), [questionId]: value },
    }));
    // Auto-save as in_progress
    if (activeFormId) {
      const newAnswers = { ...moduleAnswers, [moduleId]: { ...(moduleAnswers[moduleId] || {}), [questionId]: value } };
      updateScreeningForm(activeFormId, { moduleAnswers: newAnswers as Record<ScreeningModuleId, Record<string, string | number | string[]>>, status: 'in_progress' });
    }
  };

  const handleFileUpload = (questionId: string, type: ClinicalFile['type']) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const newFile: ClinicalFile = {
          id: generateId(),
          type,
          name: file.name,
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
        };
        setClinicalFiles(prev => [...prev, newFile]);
        // Mark the question as answered
        if (activeModule) {
          handleAnswerChange(activeModule.id, questionId, 'uploaded');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveFile = (fileId: string) => {
    setClinicalFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSaveDraft = () => {
    if (!activeFormId) return;
    updateScreeningForm(activeFormId, { moduleAnswers, clinicalFiles, status: 'draft' });
    addAuditLog({ id: generateId(), screeningId: activeFormId, action: 'draft_saved', performedBy: currentUser?.id || '', timestamp: new Date().toISOString() });
    toast({ title: 'Draft Disimpan', description: 'Jawaban Anda telah disimpan sementara.' });
  };

  const handleSubmitForm = () => {
    if (!activeFormId) return;

    // Calculate scores for each module
    const moduleScores: Record<string, { score: number; riskCategory: RiskCategory; label: string; recommendations: string[] }> = {};
    for (const mod of applicableModules) {
      const answers = moduleAnswers[mod.id] || {};
      if (mod.scoringAlgorithm && Object.keys(answers).length > 0) {
        moduleScores[mod.id] = calculateModuleScore(mod, answers);
      }
    }

    // Calculate triage
    const triageResult = calculateTriage(moduleScores, moduleAnswers);

    // Generate clinical summary
    const clinicalSummary = generateClinicalSummary(moduleAnswers, moduleScores as Record<string, { score: number; riskCategory: RiskCategory; label: string; recommendations: string[] }>);

    updateScreeningForm(activeFormId, {
      moduleAnswers,
      moduleScores: moduleScores as Record<ScreeningModuleId, { score: number; riskCategory: RiskCategory; label: string; recommendations: string[] }>,
      clinicalFiles,
      triageResult,
      clinicalSummary,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    addAuditLog({
      id: generateId(), screeningId: activeFormId, action: 'completed',
      performedBy: currentUser?.id || '', timestamp: new Date().toISOString(),
      details: `Triase: ${triageResult.level}, Skor modul: ${Object.entries(moduleScores).map(([k, v]) => `${k}=${v.score}`).join(', ')}`,
    });

    // Clinical alerts for merah/oranye
    if ((triageResult.level === 'merah' || triageResult.level === 'oranye') && activeForm) {
      const alert: AppNotification = {
        id: generateId(), userId: activeForm.doctorId,
        title: `🚨 Pasien Triase ${triageResult.label}`,
        message: `Hasil skrining menunjukkan triase ${triageResult.label}: ${triageResult.description}. Segera tinjau hasil skrining pasien.`,
        type: 'clinical_alert', isRead: false, referenceId: activeFormId, createdAt: new Date().toISOString(),
      };
      addClinicalAlert(alert);
    }

    toast({ title: 'Skrining Selesai', description: `Triase: ${triageResult.label} — ${triageResult.description}` });
    setActiveFormId(null);
    setModuleAnswers({} as Record<ScreeningModuleId, Record<string, string | number | string[]>>);
    setClinicalFiles([]);
    setActiveModuleIdx(0);
  };

  const handleReviewForm = () => {
    if (!viewingForm) return;
    updateScreeningForm(viewingForm.id, { status: 'reviewed', doctorNotes, followUp: doctorFollowUp, reviewedAt: new Date().toISOString() });
    addAuditLog({ id: generateId(), screeningId: viewingForm.id, action: 'reviewed', performedBy: currentUser?.id || '', timestamp: new Date().toISOString(), details: `Catatan: ${doctorNotes}, Tindak lanjut: ${doctorFollowUp}` });
    toast({ title: 'Skrining Ditinjau', description: 'Catatan dan tindak lanjut telah disimpan.' });
    setViewingForm(null);
  };

  const handleAiAnalysis = async (form: ScreeningForm) => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const summaryParts: string[] = [];
      for (const [modId, scores] of Object.entries(form.moduleScores || {})) {
        const mod = getModuleById(modId as ScreeningModuleId);
        if (mod) summaryParts.push(`${mod.name}: Skor ${scores.score} (${scores.label})`);
      }
      const res = await fetch('/api/screening-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningType: 'Skrining Komprehensif Telemedicine',
          triage: form.triageResult,
          clinicalSummary: form.clinicalSummary,
          moduleScores: form.moduleScores,
          moduleAnswers: form.moduleAnswers,
        }),
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || 'Tidak dapat menganalisis hasil skrining.');
    } catch {
      setAiAnalysis('Gagal menganalisis. Silakan coba lagi.');
    }
    setAiLoading(false);
  };

  // ── Render: Patient Form Filling ───────────────────────────────────────

  const renderPatientForm = () => {
    if (!activeForm || !activeModule) return null;

    const answers = moduleAnswers[activeModule.id] || {};
    const modQuestions = activeModule.questions;
    const filledCount = modQuestions.filter(q => {
      const a = answers[q.id];
      return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
    }).length;

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setActiveFormId(null); setModuleAnswers({} as Record<ScreeningModuleId, Record<string, string | number | string[]>>); setActiveModuleIdx(0); }}>
            ←
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Skrining Komprehensif Telemedicine</h2>
            <p className="text-sm text-muted-foreground">Modul {activeModuleIdx + 1} dari {applicableModules.length}</p>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress Keseluruhan</span>
              <span className="text-sm font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </CardContent>
        </Card>

        {/* Module Navigation List */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Navigasi Modul (klik untuk membuka):</p>
            <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
              {applicableModules.map((mod, idx) => {
                const modAnswers = moduleAnswers[mod.id] || {};
                const modProgress = mod.questions.filter(q => {
                  const a = modAnswers[q.id];
                  return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
                }).length;
                const modTotal = mod.questions.length;
                const pct = modTotal > 0 ? Math.round((modProgress / modTotal) * 100) : 0;
                return (
                  <button
                    key={mod.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all border-2',
                      idx === activeModuleIdx
                        ? 'border-primary bg-primary/10'
                        : pct >= 100
                        ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                        : pct > 0
                        ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                        : 'border-transparent bg-muted/50 hover:bg-muted',
                    )}
                    onClick={() => setActiveModuleIdx(idx)}
                  >
                    <span className="text-lg shrink-0">{mod.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium truncate', idx === activeModuleIdx ? 'text-primary' : 'text-foreground')}>
                        {mod.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-transparent')} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{pct}%</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {pct >= 100 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : mod.isRequired ? (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">Wajib</Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Module Title */}
        <Card className={cn('border-2', activeModule.isRequired ? 'border-primary/30' : 'border-border')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeModule.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{activeModule.name}</h3>
                  {activeModule.isRequired ? (
                    <Badge className="text-[10px] bg-primary text-primary-foreground">Wajib</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Opsional</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{activeModule.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {filledCount}/{modQuestions.length} diisi
                  </Badge>
                  <span className="text-xs text-muted-foreground">~{activeModule.estimatedMinutes} menit</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {activeForm.instructions && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Instruksi Dokter</p>
                  <p className="text-sm text-foreground mt-1">{activeForm.instructions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {modQuestions.map((question, idx) => {
          // Check conditional logic
          if (question.conditionalLogic) {
            const parentAnswer = answers[question.conditionalLogic.showIfQuestionId];
            if (String(parentAnswer) !== String(question.conditionalLogic.showIfValue)) return null;
          }

          return (
            <Card key={question.id} className="border-border">
              <CardContent className="p-4">
                <Label className="text-sm font-medium text-foreground">
                  {idx + 1}. {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                  {question.unit && <span className="text-muted-foreground ml-1 text-xs">({question.unit})</span>}
                </Label>

                {question.type === 'radio' && question.options && (
                  <RadioGroup
                    value={String(answers[question.id] ?? '')}
                    onValueChange={(val) => handleAnswerChange(activeModule.id, question.id, val)}
                    className="mt-3 space-y-2"
                  >
                    {question.options.map((opt) => (
                      <div key={String(opt.value)} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(opt.value)} id={`${question.id}-${opt.value}`} />
                        <Label htmlFor={`${question.id}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.type === 'checkbox' && question.options && (
                  <div className="mt-3 space-y-2">
                    {question.options.map((opt) => {
                      const selected = (answers[question.id] as string[]) || [];
                      const isChecked = selected.includes(String(opt.value));
                      return (
                        <div key={String(opt.value)} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${question.id}-${opt.value}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = (answers[question.id] as string[]) || [];
                              const newSelected = checked
                                ? [...current, String(opt.value)]
                                : current.filter((v: string) => v !== String(opt.value));
                              handleAnswerChange(activeModule.id, question.id, newSelected);
                            }}
                          />
                          <Label htmlFor={`${question.id}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                            {opt.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.type === 'number' && (
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      min={question.min}
                      max={question.max}
                      placeholder={question.placeholder || `Masukkan angka${question.unit ? ` (${question.unit})` : ''}`}
                      value={answers[question.id] ?? ''}
                      onChange={(e) => handleAnswerChange(activeModule.id, question.id, Number(e.target.value) || 0)}
                      className="max-w-[200px]"
                    />
                    {question.unit && <span className="text-sm text-muted-foreground">{question.unit}</span>}
                  </div>
                )}

                {question.type === 'text' && (
                  <Textarea
                    className="mt-3"
                    placeholder={question.placeholder || 'Masukkan jawaban'}
                    value={String(answers[question.id] ?? '')}
                    onChange={(e) => handleAnswerChange(activeModule.id, question.id, e.target.value)}
                  />
                )}

                {question.type === 'scale' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Array.from({ length: (question.max || 10) - (question.min || 0) + 1 }, (_, i) => {
                      const val = (question.min || 0) + i;
                      return (
                        <Button
                          key={val}
                          size="sm"
                          variant={Number(answers[question.id]) === val ? 'default' : 'outline'}
                          className={cn(
                            'w-10 h-10 text-sm',
                            Number(answers[question.id]) === val && 'ring-2 ring-primary ring-offset-1',
                          )}
                          onClick={() => handleAnswerChange(activeModule.id, question.id, val)}
                        >
                          {val}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {question.type === 'file_upload' && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {clinicalFiles
                        .filter(f => {
                          const qIdToFileType: Record<string, ClinicalFile['type']> = {
                            'bk-fotoluka': 'foto_luka', 'bk-fotoobat': 'foto_obat',
                            'bk-fotolab': 'foto_lab', 'bk-fotoradio': 'foto_radiologi',
                            'bk-videopernapasan': 'video_pernapasan', 'bk-videomobilisasi': 'video_mobilisasi',
                            'bk-dokmedis': 'dokumen_medis',
                          };
                          return f.type === qIdToFileType[question.id];
                        })
                        .map(file => (
                          <div key={file.id} className="relative group">
                            {file.url.startsWith('data:image') ? (
                              <img src={file.url} alt={file.name} className="w-16 h-16 object-cover rounded-lg border" />
                            ) : (
                              <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center">
                                <File className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <button
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveFile(file.id)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const qIdToFileType: Record<string, ClinicalFile['type']> = {
                          'bk-fotoluka': 'foto_luka', 'bk-fotoobat': 'foto_obat',
                          'bk-fotolab': 'foto_lab', 'bk-fotoradio': 'foto_radiologi',
                          'bk-videopernapasan': 'video_pernapasan', 'bk-videomobilisasi': 'video_mobilisasi',
                          'bk-dokmedis': 'dokumen_medis',
                        };
                        handleFileUpload(question.id, qIdToFileType[question.id] || 'dokumen_medis');
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" /> Simpan Draft
          </Button>
          <div className="flex-1" />
          {activeModuleIdx > 0 && (
            <Button variant="outline" onClick={() => setActiveModuleIdx(prev => prev - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
            </Button>
          )}
          {activeModuleIdx < applicableModules.length - 1 ? (
            <Button onClick={() => setActiveModuleIdx(prev => prev + 1)}>
              Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmitForm} disabled={overallProgress < 50}>
              <Send className="w-4 h-4 mr-2" /> Kirim Hasil Skrining
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ── Render: Clinical Summary for Doctor ──────────────────────────────────

  const renderClinicalSummary = (form: ScreeningForm) => {
    const summary = form.clinicalSummary;
    const triage = form.triageResult;
    if (!summary && !triage) return null;

    return (
      <div className="space-y-4">
        {/* Triage Badge */}
        {triage && (
          <Card className={cn('border-2', TRIAGE_COLORS[triage.level].border)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black', TRIAGE_COLORS[triage.level].bg, TRIAGE_COLORS[triage.level].text)}>
                  {triage.level === 'hijau' ? '🟢' : triage.level === 'kuning' ? '🟡' : triage.level === 'oranye' ? '🟠' : '🔴'}
                </div>
                <div>
                  <p className={cn('text-lg font-bold', TRIAGE_COLORS[triage.level].text)}>{triage.label}</p>
                  <p className="text-sm text-foreground">{triage.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{triage.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <>
            {/* Chief Complaint */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Keluhan Utama</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm font-medium text-foreground">{summary.chiefComplaint}</p>
              </CardContent>
            </Card>

            {/* Red Flags */}
            {summary.redFlags.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-700"><AlertTriangle className="w-4 h-4" /> Tanda Bahaya</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex flex-wrap gap-2">
                    {summary.redFlags.map((flag, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">{flag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vital Signs */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="w-4 h-4" /> Tanda Vital</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {summary.vitalSigns.weight && <div><p className="text-xs text-muted-foreground">Berat Badan</p><p className="text-sm font-bold">{summary.vitalSigns.weight} kg</p></div>}
                  {summary.vitalSigns.height && <div><p className="text-xs text-muted-foreground">Tinggi Badan</p><p className="text-sm font-bold">{summary.vitalSigns.height} cm</p></div>}
                  {summary.vitalSigns.temperature && <div><p className="text-xs text-muted-foreground">Suhu</p><p className="text-sm font-bold">{summary.vitalSigns.temperature}°C</p></div>}
                  {summary.vitalSigns.bloodPressure && <div><p className="text-xs text-muted-foreground">Tekanan Darah</p><p className="text-sm font-bold">{summary.vitalSigns.bloodPressure} mmHg</p></div>}
                  {summary.vitalSigns.heartRate && <div><p className="text-xs text-muted-foreground">Denyut Nadi</p><p className="text-sm font-bold">{summary.vitalSigns.heartRate} bpm</p></div>}
                  {summary.vitalSigns.oxygenSat && <div><p className="text-xs text-muted-foreground">SpO2</p><p className="text-sm font-bold">{summary.vitalSigns.oxygenSat}%</p></div>}
                  {summary.vitalSigns.bloodSugar && <div><p className="text-xs text-muted-foreground">GDS</p><p className="text-sm font-bold">{summary.vitalSigns.bloodSugar} mg/dL</p></div>}
                </div>
              </CardContent>
            </Card>

            {/* Clinical Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.chronicDiseases.length > 0 && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Penyakit Kronis</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {summary.chronicDiseases.map((d, i) => <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              )}
              {summary.painScore !== null && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Skor Nyeri (NRS)</p>
                    <p className={cn('text-lg font-bold', summary.painScore >= 7 ? 'text-red-600' : summary.painScore >= 4 ? 'text-amber-600' : 'text-emerald-600')}>
                      {summary.painScore}/10
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Status Mental</p>
                  <p className={cn('text-sm font-medium', summary.mentalStatus === 'KRISIS MENTAL' ? 'text-red-600' : summary.mentalStatus !== 'Normal' ? 'text-amber-600' : 'text-emerald-600')}>
                    {summary.mentalStatus}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Status Fungsional</p>
                  <p className="text-sm font-medium">{summary.functionalStatus}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Kebutuhan Home Care</p>
                  <p className={cn('text-sm font-medium', summary.homeCareNeed === 'Diperlukan Segera' ? 'text-red-600' : summary.homeCareNeed === 'Direkomendasikan' ? 'text-amber-600' : 'text-emerald-600')}>
                    {summary.homeCareNeed}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Status Paliatif</p>
                  <p className="text-sm font-medium">{summary.palliativeStatus}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Render: Module Results Detail ───────────────────────────────────────

  const renderModuleResults = (form: ScreeningForm) => {
    const scores = form.moduleScores || {};
    const answers = form.moduleAnswers || {};

    return (
      <div className="space-y-3">
        {SCREENING_MODULES.map(mod => {
          const modAnswers = answers[mod.id];
          const modScore = scores[mod.id];
          if (!modAnswers || Object.keys(modAnswers).length === 0) return null;

          return (
            <Card key={mod.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mod.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold">{mod.name}</h4>
                      {modScore && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={cn('text-xs', RISK_COLORS[modScore.riskCategory].bg, RISK_COLORS[modScore.riskCategory].text, RISK_COLORS[modScore.riskCategory].border, 'border')}>
                            {modScore.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Skor: {modScore.score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {modScore?.recommendations && modScore.recommendations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <ul className="space-y-1">
                      {modScore.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-1">
                          <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />{rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Clinical Files */}
        {form.clinicalFiles && form.clinicalFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> Bukti Klinis ({form.clinicalFiles.length})</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-2">
                {form.clinicalFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    {CLINICAL_FILE_TYPE_LABELS[file.type]?.icon}
                    <div>
                      <p className="text-xs font-medium">{CLINICAL_FILE_TYPE_LABELS[file.type]?.label}</p>
                      <p className="text-[10px] text-muted-foreground">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ── Render: Doctor Dashboard ──────────────────────────────────────────

  const renderDoctorDashboard = () => (
    <div className="space-y-6 p-4">
      {/* Triage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Skrining', value: dashboardStats.total, icon: <ClipboardCheck className="w-5 h-5" />, color: 'text-primary' },
          { label: 'Selesai', value: dashboardStats.completed, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600' },
          { label: 'Menunggu', value: dashboardStats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600' },
          ...([
            { level: 'merah' as TriageLevel, label: 'Triase Merah' },
            { level: 'oranye' as TriageLevel, label: 'Triase Oranye' },
          ].map(t => ({
            label: t.label, value: dashboardStats.triageCount[t.level],
            icon: <AlertTriangle className="w-5 h-5" />, color: TRIAGE_COLORS[t.level].text,
          }))),
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <div className={cn('flex justify-center mb-2', stat.color)}>{stat.icon}</div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari skrining..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterTriage} onValueChange={setFilterTriage}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Triase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Triase</SelectItem>
            <SelectItem value="hijau">🟢 Hijau</SelectItem>
            <SelectItem value="kuning">🟡 Kuning</SelectItem>
            <SelectItem value="oranye">🟠 Oranye</SelectItem>
            <SelectItem value="merah">🔴 Merah</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Screening List */}
      {filteredForms.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada data skrining</p>
            <p className="text-sm text-muted-foreground mt-1">Kirim form skrining melalui chat konsultasi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredForms.map(form => {
            const statusInfo = STATUS_LABELS[form.status] || STATUS_LABELS.sent;
            const triage = form.triageResult;
            const patientName = consultations.find(c => c.id === form.consultationId)?.patient?.name || 'Pasien';
            return (
              <Card
                key={form.id}
                className={cn('hover:shadow-md transition-shadow cursor-pointer',
                  triage?.level === 'merah' ? 'border-red-200 border-l-4 border-l-red-500' :
                  triage?.level === 'oranye' ? 'border-orange-200 border-l-4 border-l-orange-500' : '')}
                onClick={() => {
                  setViewingForm(form);
                  setDoctorNotes(form.doctorNotes || '');
                  setDoctorFollowUp(form.followUp || '');
                  setAiAnalysis('');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">Skrining Komprehensif</h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">👤 {patientName}</span>
                        <span className="text-xs text-muted-foreground">📅 {formatDate(form.createdAt)}</span>
                        {form.completedAt && <span className="text-xs text-muted-foreground">✅ {formatDate(form.completedAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {triage && (
                        <Badge className={cn('text-xs', TRIAGE_COLORS[triage.level].bg, TRIAGE_COLORS[triage.level].text, TRIAGE_COLORS[triage.level].border, 'border')}>
                          {triage.label}
                        </Badge>
                      )}
                      <Badge className={cn('text-xs', statusInfo.color)}>{statusInfo.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Detail Dialog */}
      <Dialog open={!!viewingForm} onOpenChange={(open) => { if (!open) setViewingForm(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Hasil Skrining Komprehensif Telemedicine
            </DialogTitle>
          </DialogHeader>
          {viewingForm && (
            <Tabs defaultValue="ringkasan">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="ringkasan" className="text-xs">Ringkasan Klinis</TabsTrigger>
                <TabsTrigger value="modul" className="text-xs">Detail Modul</TabsTrigger>
                <TabsTrigger value="catatan" className="text-xs">Catatan Dokter</TabsTrigger>
              </TabsList>
              <TabsContent value="ringkasan" className="mt-4">
                {renderClinicalSummary(viewingForm)}
              </TabsContent>
              <TabsContent value="modul" className="mt-4">
                {renderModuleResults(viewingForm)}
              </TabsContent>
              <TabsContent value="catatan" className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Catatan Dokter</Label>
                  <Textarea className="mt-1" placeholder="Tambahkan catatan klinis..." value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Tindak Lanjut</Label>
                  <Textarea className="mt-1" placeholder="Rencana tindak lanjut..." value={doctorFollowUp} onChange={e => setDoctorFollowUp(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleReviewForm} className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" /> Simpan & Tandai Ditinjau
                  </Button>
                  <Button variant="outline" onClick={() => handleAiAnalysis(viewingForm)} disabled={aiLoading}>
                    {aiLoading ? <><Activity className="w-4 h-4 mr-2 animate-spin" /> Menganalisis...</> : <><Brain className="w-4 h-4 mr-2" /> AI Analysis</>}
                  </Button>
                </div>
                {aiAnalysis && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Clinical Assistant</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-sm text-foreground whitespace-pre-wrap">{aiAnalysis}</div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // ── Render: Patient View ───────────────────────────────────────────────

  const renderPatientView = () => {
    if (activeFormId && activeForm) return renderPatientForm();

    const pendingForms = myScreeningForms.filter(f => f.status === 'sent' || f.status === 'opened' || f.status === 'in_progress' || f.status === 'draft');
    const completedForms = myScreeningForms.filter(f => f.status === 'completed' || f.status === 'reviewed');

    return (
      <div className="space-y-6 p-4">
        {/* Pending Forms */}
        {pendingForms.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" /> Perlu Diisi
            </h2>
            <div className="space-y-3">
              {pendingForms.map(form => (
                <Card key={form.id} className="hover:shadow-md transition-shadow cursor-pointer border-amber-200" onClick={() => handleOpenForm(form)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Skrining Komprehensif Telemedicine</h4>
                        <p className="text-xs text-muted-foreground mt-1">Form skrining pra-konsultasi dari dokter</p>
                        {form.instructions && <p className="text-xs text-primary mt-1">📋 {form.instructions}</p>}
                        {form.deadline && <p className="text-xs text-amber-600 mt-1">⏰ Batas: {formatDate(form.deadline)}</p>}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                    {form.moduleAnswers && Object.keys(form.moduleAnswers).length > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{calculateProgress(applicableModules, form.moduleAnswers)}%</span>
                        </div>
                        <Progress value={calculateProgress(applicableModules, form.moduleAnswers)} className="h-1.5" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Forms */}
        {completedForms.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Riwayat Skrining
            </h2>
            <div className="space-y-3">
              {completedForms.map(form => {
                const triage = form.triageResult;
                return (
                  <Card key={form.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">Skrining Komprehensif</h4>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(form.completedAt || form.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {triage && (
                            <Badge className={cn('text-xs', TRIAGE_COLORS[triage.level].bg, TRIAGE_COLORS[triage.level].text, TRIAGE_COLORS[triage.level].border, 'border')}>
                              {triage.label}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {form.status === 'reviewed' ? 'Ditinjau' : 'Selesai'}
                          </Badge>
                        </div>
                      </div>
                      {form.clinicalSummary && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Keluhan: {form.clinicalSummary.chiefComplaint}
                        </div>
                      )}
                      {form.doctorNotes && (
                        <div className="mt-2 p-2 bg-primary/5 rounded text-xs">
                          <span className="font-medium text-primary">Catatan Dokter:</span> {form.doctorNotes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {pendingForms.length === 0 && completedForms.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Belum ada skrining</p>
              <p className="text-sm text-muted-foreground mt-1">Dokter akan mengirim form skrining melalui chat</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ── Main Render ──
  return isDoctor ? renderDoctorDashboard() : renderPatientView();
}
