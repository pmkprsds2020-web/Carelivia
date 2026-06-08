'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { ScreeningForm, ScreeningCategory, RiskCategory, ScreeningAuditLog, Notification as AppNotification } from '@/lib/types';
import {
  SCREENING_TEMPLATES,
  SCREENING_CATEGORY_LABELS,
  SCREENING_CATEGORY_ICONS,
  calculateScreeningScore,
  calculateProgress,
  getTemplateById,
} from '@/lib/screening-templates';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Filter,
  Search,
  Activity,
  ChevronRight,
  Save,
  FileText,
  Brain,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Download,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const RISK_COLORS: Record<RiskCategory, { bg: string; text: string; border: string }> = {
  rendah: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  sedang: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  tinggi: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const RISK_LABELS: Record<RiskCategory, string> = {
  rendah: 'Rendah',
  sedang: 'Sedang',
  tinggi: 'Tinggi',
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3 h-3" /> },
  opened: { label: 'Dibuka', color: 'bg-purple-100 text-purple-700', icon: <Eye className="w-3 h-3" /> },
  in_progress: { label: 'Sedang Diisi', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: <Save className="w-3 h-3" /> },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  reviewed: { label: 'Ditinjau', color: 'bg-teal-100 text-teal-700', icon: <Shield className="w-3 h-3" /> },
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
    doctors,
    consultations,
  } = useStore();

  const { toast } = useToast();

  const isDoctor = currentUser?.role === 'doctor';
  const isPatient = currentUser?.role === 'patient';

  // ── State ──────────────────────────────────────────────────────────────

  // Doctor dashboard state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Patient form filling state
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string | number | string[]>>({});

  // Doctor view screening result dialog
  const [viewingForm, setViewingForm] = useState<ScreeningForm | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorFollowUp, setDoctorFollowUp] = useState('');

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  // ── Computed Data ──────────────────────────────────────────────────────

  const myScreeningForms = useMemo(() => {
    if (!currentUser) return [];
    if (isDoctor) {
      return screeningForms.filter((f) => f.doctorId === currentUser.id);
    }
    return screeningForms.filter((f) => f.patientId === currentUser.id);
  }, [screeningForms, currentUser, isDoctor]);

  const filteredForms = useMemo(() => {
    let forms = myScreeningForms;
    if (filterCategory !== 'all') {
      forms = forms.filter((f) => {
        const tmpl = getTemplateById(f.templateId);
        return tmpl?.category === filterCategory;
      });
    }
    if (filterRisk !== 'all') {
      forms = forms.filter((f) => f.riskCategory === filterRisk);
    }
    if (filterStatus !== 'all') {
      forms = forms.filter((f) => f.status === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      forms = forms.filter((f) => {
        const tmpl = getTemplateById(f.templateId);
        return tmpl?.name.toLowerCase().includes(q) || f.id.includes(q);
      });
    }
    return forms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myScreeningForms, filterCategory, filterRisk, filterStatus, searchQuery]);

  const dashboardStats = useMemo(() => {
    const total = myScreeningForms.length;
    const completed = myScreeningForms.filter((f) => f.status === 'completed' || f.status === 'reviewed').length;
    const pending = myScreeningForms.filter((f) => f.status === 'sent' || f.status === 'opened' || f.status === 'in_progress').length;
    const riskRendah = myScreeningForms.filter((f) => f.riskCategory === 'rendah').length;
    const riskSedang = myScreeningForms.filter((f) => f.riskCategory === 'sedang').length;
    const riskTinggi = myScreeningForms.filter((f) => f.riskCategory === 'tinggi').length;
    return { total, completed, pending, riskRendah, riskSedang, riskTinggi };
  }, [myScreeningForms]);

  // ── Active Form for Patient ────────────────────────────────────────────

  const activeForm = useMemo(() => {
    if (!activeFormId) return null;
    return screeningForms.find((f) => f.id === activeFormId) || null;
  }, [activeFormId, screeningForms]);

  const activeTemplate = useMemo(() => {
    if (!activeForm) return null;
    return getTemplateById(activeForm.templateId);
  }, [activeForm]);

  const activeProgress = useMemo(() => {
    if (!activeTemplate) return 0;
    return calculateProgress(activeTemplate, currentAnswers);
  }, [activeTemplate, currentAnswers]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleOpenForm = (form: ScreeningForm) => {
    setActiveFormId(form.id);
    setCurrentAnswers(form.answers || {});
    if (form.status === 'sent') {
      updateScreeningForm(form.id, { status: 'opened' });
      addAuditLog({
        id: generateId(),
        screeningId: form.id,
        action: 'opened',
        performedBy: currentUser?.id || '',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleAnswerChange = (questionId: string, value: string | number | string[]) => {
    const newAnswers = { ...currentAnswers, [questionId]: value };
    setCurrentAnswers(newAnswers);

    // Auto-save as in_progress
    if (activeFormId) {
      updateScreeningForm(activeFormId, {
        answers: newAnswers,
        status: 'in_progress',
      });
    }
  };

  const handleSaveDraft = () => {
    if (!activeFormId) return;
    updateScreeningForm(activeFormId, {
      answers: currentAnswers,
      status: 'draft',
    });
    addAuditLog({
      id: generateId(),
      screeningId: activeFormId,
      action: 'draft_saved',
      performedBy: currentUser?.id || '',
      timestamp: new Date().toISOString(),
    });
    toast({ title: 'Draft Disimpan', description: 'Jawaban Anda telah disimpan sementara.' });
  };

  const handleSubmitForm = () => {
    if (!activeFormId || !activeTemplate) return;

    const result = calculateScreeningScore(activeTemplate, currentAnswers);

    updateScreeningForm(activeFormId, {
      answers: { ...currentAnswers },
      status: 'completed',
      score: result.score,
      riskCategory: result.riskCategory,
      recommendations: result.recommendations,
      completedAt: new Date().toISOString(),
    });

    addAuditLog({
      id: generateId(),
      screeningId: activeFormId,
      action: 'completed',
      performedBy: currentUser?.id || '',
      timestamp: new Date().toISOString(),
      details: `Skor: ${result.score}, Risiko: ${result.riskCategory}`,
    });

    // If high risk, create clinical alert for doctor
    if (result.riskCategory === 'tinggi' && activeForm) {
      const alert: AppNotification = {
        id: generateId(),
        userId: activeForm.doctorId,
        title: '🚨 Pasien Risiko Tinggi Terdeteksi',
        message: `Hasil skrining ${activeTemplate.name} menunjukkan risiko TINGGI (Skor: ${result.score}). Segera tinjau hasil skrining pasien.`,
        type: 'clinical_alert',
        isRead: false,
        referenceId: activeFormId,
        createdAt: new Date().toISOString(),
      };
      addClinicalAlert(alert);
    }

    toast({
      title: 'Skrining Selesai',
      description: `Skor: ${result.score} — ${result.label}`,
    });

    setActiveFormId(null);
    setCurrentAnswers({});
  };

  const handleReviewForm = () => {
    if (!viewingForm) return;
    updateScreeningForm(viewingForm.id, {
      status: 'reviewed',
      doctorNotes,
      followUp: doctorFollowUp,
      reviewedAt: new Date().toISOString(),
    });
    addAuditLog({
      id: generateId(),
      screeningId: viewingForm.id,
      action: 'reviewed',
      performedBy: currentUser?.id || '',
      timestamp: new Date().toISOString(),
      details: `Catatan: ${doctorNotes}, Tindak lanjut: ${doctorFollowUp}`,
    });
    toast({ title: 'Skrining Ditinjau', description: 'Catatan dan tindak lanjut telah disimpan.' });
    setViewingForm(null);
  };

  const handleAiAnalysis = async (form: ScreeningForm) => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const template = getTemplateById(form.templateId);
      if (!template) throw new Error('Template not found');

      const res = await fetch('/api/screening-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: template.name,
          standard: template.standard,
          answers: form.answers,
          questions: template.questions,
          score: form.score,
          riskCategory: form.riskCategory,
        }),
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || 'Tidak dapat menganalisis hasil skrining.');
    } catch {
      setAiAnalysis('Gagal menganalisis. Silakan coba lagi.');
    }
    setAiLoading(false);
  };

  const handleBackToList = () => {
    setActiveFormId(null);
    setCurrentAnswers({});
  };

  // ── Render: Patient Form Filling ───────────────────────────────────────

  const renderPatientForm = () => {
    if (!activeForm || !activeTemplate) return null;

    const progressPercent = activeProgress;
    let progressLabel = '';
    if (progressPercent <= 25) progressLabel = '25%';
    else if (progressPercent <= 50) progressLabel = '50%';
    else if (progressPercent <= 75) progressLabel = '75%';
    else progressLabel = '100%';

    // Group questions by section
    const sections: { title: string; questions: typeof activeTemplate.questions }[] = [];
    let currentSection = '';
    for (const q of activeTemplate.questions) {
      const sectionTitle = q.section || currentSection || 'Pertanyaan';
      if (q.section && q.section !== currentSection) {
        currentSection = q.section;
        sections.push({ title: sectionTitle, questions: [q] });
      } else if (sections.length > 0 && sections[sections.length - 1].title === sectionTitle) {
        sections[sections.length - 1].questions.push(q);
      } else {
        sections.push({ title: sectionTitle, questions: [q] });
      }
    }

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToList}>
            ←
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{activeTemplate.name}</h2>
            <p className="text-sm text-muted-foreground">{activeTemplate.description}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Progress Pengisian</span>
            <Badge variant="secondary">{progressLabel}</Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {activeTemplate.questions.filter((q) => currentAnswers[q.id] !== undefined && currentAnswers[q.id] !== '').length} dari {activeTemplate.questions.length} pertanyaan
          </p>
        </div>

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

        {/* Deadline */}
        {activeForm.deadline && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Clock className="w-4 h-4" />
            <span>Batas waktu: {formatDate(activeForm.deadline)}</span>
          </div>
        )}

        {/* Questions */}
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">
              {section.title}
            </h3>
            {section.questions.map((question, idx) => (
              <Card key={question.id} className="border-border">
                <CardContent className="p-4">
                  <Label className="text-sm font-medium text-foreground">
                    {idx + 1}. {question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {question.type === 'radio' && question.options && (
                    <RadioGroup
                      value={String(currentAnswers[question.id] ?? '')}
                      onValueChange={(val) => handleAnswerChange(question.id, val)}
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
                        const selected = (currentAnswers[question.id] as string[]) || [];
                        const isChecked = selected.includes(String(opt.value));
                        return (
                          <div key={String(opt.value)} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${question.id}-${opt.value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const current = (currentAnswers[question.id] as string[]) || [];
                                const newSelected = checked
                                  ? [...current, String(opt.value)]
                                  : current.filter((v: string) => v !== String(opt.value));
                                handleAnswerChange(question.id, newSelected);
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
                    <Input
                      type="number"
                      className="mt-3"
                      min={question.min}
                      max={question.max}
                      placeholder={question.placeholder || 'Masukkan angka'}
                      value={currentAnswers[question.id] ?? ''}
                      onChange={(e) => handleAnswerChange(question.id, Number(e.target.value) || 0)}
                    />
                  )}

                  {question.type === 'text' && (
                    <Textarea
                      className="mt-3"
                      placeholder={question.placeholder || 'Masukkan jawaban'}
                      value={String(currentAnswers[question.id] ?? '')}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                  )}

                  {question.type === 'scale' && (
                    <div className="mt-3 flex gap-2">
                      {Array.from({ length: (question.max || 10) - (question.min || 1) + 1 }, (_, i) => {
                        const val = (question.min || 1) + i;
                        return (
                          <Button
                            key={val}
                            size="sm"
                            variant={Number(currentAnswers[question.id]) === val ? 'default' : 'outline'}
                            className="w-10 h-10"
                            onClick={() => handleAnswerChange(question.id, val)}
                          >
                            {val}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Simpan Draft
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmitForm}
            disabled={activeProgress < 100}
          >
            <Send className="w-4 h-4 mr-2" />
            Kirim Hasil
          </Button>
        </div>
      </div>
    );
  };

  // ── Render: Screening Result Detail ────────────────────────────────────

  const renderScreeningResult = (form: ScreeningForm, showDoctorActions: boolean = false) => {
    const template = getTemplateById(form.templateId);
    if (!template) return null;

    const riskColor = form.riskCategory ? RISK_COLORS[form.riskCategory] : null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{template.name}</h3>
            <p className="text-sm text-muted-foreground">Standar: {template.standard}</p>
          </div>
          {form.riskCategory && riskColor && (
            <Badge className={cn('text-sm', riskColor.bg, riskColor.text, riskColor.border, 'border')}>
              {RISK_LABELS[form.riskCategory]}
            </Badge>
          )}
        </div>

        {/* Score & Risk */}
        {form.score !== undefined && (
          <Card className={cn('border', riskColor?.border || 'border-border')}>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Skor</p>
                  <p className="text-2xl font-bold text-foreground">{form.score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kategori Risiko</p>
                  <p className={cn('text-lg font-bold', riskColor?.text || 'text-foreground')}>
                    {form.riskCategory ? RISK_LABELS[form.riskCategory] : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {form.recommendations && form.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rekomendasi</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="space-y-1">
                {form.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Answers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detail Jawaban</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {template.questions.map((q) => {
                const answer = form.answers[q.id];
                if (answer === undefined) return null;
                let answerText = '';
                if (Array.isArray(answer)) {
                  answerText = answer
                    .map((v) => q.options?.find((o) => String(o.value) === String(v))?.label || String(v))
                    .join(', ');
                } else if (q.type === 'radio' && q.options) {
                  answerText = q.options.find((o) => String(o.value) === String(answer))?.label || String(answer);
                } else {
                  answerText = String(answer);
                }
                return (
                  <div key={q.id}>
                    <p className="text-xs text-muted-foreground">{q.text}</p>
                    <p className="text-sm font-medium text-foreground">{answerText || '-'}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Doctor Notes & Follow-up */}
        {form.doctorNotes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Catatan Dokter</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-foreground">{form.doctorNotes}</p>
            </CardContent>
          </Card>
        )}
        {form.followUp && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tindak Lanjut</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-foreground">{form.followUp}</p>
            </CardContent>
          </Card>
        )}

        {/* Doctor Actions */}
        {showDoctorActions && form.status === 'completed' && (
          <div className="space-y-3 pt-2">
            <Separator />
            <div>
              <Label className="text-sm font-medium">Catatan Dokter</Label>
              <Textarea
                className="mt-1"
                placeholder="Tambahkan catatan klinis..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Tindak Lanjut</Label>
              <Textarea
                className="mt-1"
                placeholder="Rencana tindak lanjut..."
                value={doctorFollowUp}
                onChange={(e) => setDoctorFollowUp(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReviewForm} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Simpan & Tandai Ditinjau
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAiAnalysis(form)}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* AI Analysis Result */}
        {aiAnalysis && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Clinical Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-sm text-foreground whitespace-pre-wrap">{aiAnalysis}</div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ── Render: Doctor Dashboard ──────────────────────────────────────────

  const renderDoctorDashboard = () => (
    <div className="space-y-6 p-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Skrining', value: dashboardStats.total, icon: <ClipboardCheck className="w-5 h-5" />, color: 'text-primary' },
          { label: 'Selesai', value: dashboardStats.completed, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600' },
          { label: 'Menunggu', value: dashboardStats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-amber-600' },
          { label: 'Risiko Rendah', value: dashboardStats.riskRendah, icon: <Shield className="w-5 h-5" />, color: 'text-emerald-600' },
          { label: 'Risiko Sedang', value: dashboardStats.riskSedang, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-600' },
          { label: 'Risiko Tinggi', value: dashboardStats.riskTinggi, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <div className={cn('flex justify-center mb-2', stat.color)}>{stat.icon}</div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Rate */}
      {dashboardStats.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Persentase Penyelesaian</span>
              <span className="text-sm font-bold text-primary">
                {Math.round((dashboardStats.completed / dashboardStats.total) * 100)}%
              </span>
            </div>
            <Progress value={(dashboardStats.completed / dashboardStats.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari skrining..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {Object.entries(SCREENING_CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Risiko" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Risiko</SelectItem>
            <SelectItem value="rendah">Rendah</SelectItem>
            <SelectItem value="sedang">Sedang</SelectItem>
            <SelectItem value="tinggi">Tinggi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
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
            <p className="text-sm text-muted-foreground mt-1">
              Kirim form skrining melalui chat konsultasi
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => {
            const template = getTemplateById(form.templateId);
            if (!template) return null;
            const statusInfo = STATUS_LABELS[form.status] || STATUS_LABELS.sent;
            const riskColor = form.riskCategory ? RISK_COLORS[form.riskCategory] : null;
            const patient = useStore.getState().consultations.find(
              (c) => c.id === form.consultationId
            )?.patient;

            return (
              <Card
                key={form.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
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
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{SCREENING_CATEGORY_ICONS[template.category]}</span>
                        <h4 className="font-semibold text-sm text-foreground truncate">{template.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {patient && (
                          <span className="text-xs text-muted-foreground">
                            👤 {patient.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          📅 {formatDate(form.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {form.riskCategory && riskColor && (
                        <Badge className={cn('text-xs', riskColor.bg, riskColor.text, riskColor.border, 'border')}>
                          {RISK_LABELS[form.riskCategory]}
                        </Badge>
                      )}
                      <Badge className={cn('text-xs', statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                  {form.score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Skor:</span>
                      <span className="text-sm font-bold text-foreground">{form.score}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Render: Patient View ───────────────────────────────────────────────

  const renderPatientView = () => {
    if (activeFormId && activeForm && activeTemplate) {
      return renderPatientForm();
    }

    const pendingForms = myScreeningForms.filter(
      (f) => f.status === 'sent' || f.status === 'opened' || f.status === 'in_progress' || f.status === 'draft'
    );
    const completedForms = myScreeningForms.filter(
      (f) => f.status === 'completed' || f.status === 'reviewed'
    );

    return (
      <div className="space-y-6 p-4">
        {/* Pending Forms */}
        {pendingForms.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Perlu Diisi
            </h2>
            <div className="space-y-3">
              {pendingForms.map((form) => {
                const template = getTemplateById(form.templateId);
                if (!template) return null;
                const progress = calculateProgress(template, form.answers || {});
                return (
                  <Card
                    key={form.id}
                    className="hover:shadow-md transition-shadow cursor-pointer border-amber-200"
                    onClick={() => handleOpenForm(form)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{SCREENING_CATEGORY_ICONS[template.category]}</span>
                            <h4 className="font-semibold text-sm text-foreground">{template.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                          {form.instructions && (
                            <p className="text-xs text-primary mt-1">📋 {form.instructions}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Forms */}
        {completedForms.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Riwayat Skrining
            </h2>
            <div className="space-y-3">
              {completedForms.map((form) => {
                const template = getTemplateById(form.templateId);
                if (!template) return null;
                const riskColor = form.riskCategory ? RISK_COLORS[form.riskCategory] : null;
                return (
                  <Card key={form.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{SCREENING_CATEGORY_ICONS[template.category]}</span>
                            <h4 className="font-semibold text-sm text-foreground">{template.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(form.completedAt || form.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {form.riskCategory && riskColor && (
                            <Badge className={cn('text-xs', riskColor.bg, riskColor.text, riskColor.border, 'border')}>
                              {RISK_LABELS[form.riskCategory]}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            Skor: {form.score}
                          </Badge>
                        </div>
                      </div>
                      {form.recommendations && form.recommendations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Rekomendasi:</p>
                          <ul className="text-xs text-foreground mt-1">
                            {form.recommendations.slice(0, 2).map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                {rec}
                              </li>
                            ))}
                            {form.recommendations.length > 2 && (
                              <li className="text-muted-foreground">
                                +{form.recommendations.length - 2} lainnya
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {myScreeningForms.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Belum ada formulir skrining</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dokter akan mengirimkan form skrining melalui chat konsultasi
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="h-full">
      {isDoctor ? renderDoctorDashboard() : renderPatientView()}

      {/* Doctor View Dialog */}
      <Dialog open={!!viewingForm} onOpenChange={(open) => { if (!open) setViewingForm(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Skrining</DialogTitle>
          </DialogHeader>
          {viewingForm && renderScreeningResult(viewingForm, isDoctor)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
