'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type {
  PalliativeChatMessage,
  PalliativeChatMsgType,
  PalliativeFormType,
  PalliativePatientInfo,
  TTVFormAnswers,
  KeluhanFormAnswers,
  PalliativeToolType,
  PalliativeClinicalAlert,
  PalliativeAuditEntry,
  PalliativeEwsLevel,
  VitalSignRecordInfo,
  PalliativeScreeningRecordInfo,
  MedicationMonitoringFormAnswers,
  MedicationFormSchedule,
  MedicationMonitoringFormInfo,
} from '@/lib/types';
import { calculateScreeningResult, type ScreeningScoreResult } from '@/lib/palliative-screening-data';
import { InlineScreeningForm } from '@/components/telemedicine/inline-screening-form';
import { MedicationMonitoringForm } from '@/components/telemedicine/medication-monitoring-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageCircle,
  Send,
  FileText,
  HeartPulse,
  ClipboardList,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  Pill,
  Stethoscope,
  Shield,
  Bell,
  Bot,
  User,
  UserCheck,
  X,
  Save,
  ArrowRight,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function getToolLabel(type: PalliativeToolType): string {
  const map: Record<PalliativeToolType, string> = {
    pps: 'PPS (Palliative Performance Scale)',
    esas: 'ESAS-r (Edmonton Symptom Assessment)',
    distress: 'Distress Thermometer',
    spict: 'SPICT Screening',
    zarit: 'Caregiver Burden Assessment',
    eortc: 'EORTC QLQ-C15-PAL',
  };
  return map[type];
}

function getToolCategory(type: PalliativeToolType): string {
  const map: Record<PalliativeToolType, string> = {
    pps: 'Performance Status',
    esas: 'Gejala',
    distress: 'Distres Emosional',
    spict: 'Kebutuhan Paliatif',
    zarit: 'Beban Perawatan Keluarga',
    eortc: 'Kualitas Hidup',
  };
  return map[type];
}

function getSeverityColor(severity: 'hijau' | 'kuning' | 'merah') {
  switch (severity) {
    case 'merah': return 'bg-red-100 text-red-800 border-red-300';
    case 'kuning': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'hijau': return 'bg-green-100 text-green-800 border-green-300';
  }
}

function getSeverityLabel(severity: 'hijau' | 'kuning' | 'merah') {
  switch (severity) {
    case 'merah': return 'Perlu Tindak Lanjut Segera';
    case 'kuning': return 'Perlu Pemantauan';
    case 'hijau': return 'Stabil';
  }
}

function checkTTVAlerts(ttv: TTVFormAnswers): { alert: boolean; severity: 'hijau' | 'kuning' | 'merah'; messages: string[] } {
  const messages: string[] = [];
  let maxSeverity: 'hijau' | 'kuning' | 'merah' = 'hijau';

  if (ttv.systolicBP !== undefined && ttv.systolicBP < 90) {
    messages.push(`TD rendah: ${ttv.systolicBP} mmHg`);
    maxSeverity = 'merah';
  }
  if (ttv.systolicBP !== undefined && ttv.systolicBP > 180) {
    messages.push(`TD tinggi: ${ttv.systolicBP} mmHg`);
    maxSeverity = 'merah';
  }
  if (ttv.heartRate !== undefined && ttv.heartRate > 120) {
    messages.push(`Nadi tinggi: ${ttv.heartRate} bpm`);
    maxSeverity = 'merah';
  }
  if (ttv.respiratoryRate !== undefined && ttv.respiratoryRate > 30) {
    messages.push(`RR tinggi: ${ttv.respiratoryRate}/menit`);
    maxSeverity = 'merah';
  } else if (ttv.respiratoryRate !== undefined && ttv.respiratoryRate > 24) {
    messages.push(`RR meningkat: ${ttv.respiratoryRate}/menit`);
    if (maxSeverity !== 'merah') maxSeverity = 'kuning';
  }
  if (ttv.oxygenSat !== undefined && ttv.oxygenSat < 90) {
    messages.push(`SpO2 rendah: ${ttv.oxygenSat}%`);
    maxSeverity = 'merah';
  }
  if (ttv.temperature !== undefined && ttv.temperature > 38) {
    messages.push(`Demam: ${ttv.temperature}°C`);
    if (maxSeverity !== 'merah') maxSeverity = 'kuning';
  }
  if (ttv.painScore !== undefined && ttv.painScore >= 7) {
    messages.push(`Nyeri berat: ${ttv.painScore}/10`);
    if (maxSeverity !== 'merah') maxSeverity = 'kuning';
  }

  return { alert: messages.length > 0, severity: maxSeverity, messages };
}

// ── TTV Form Component ─────────────────────────────────────────────────────

function TTVForm({ onSubmit, onSaveDraft }: {
  onSubmit: (answers: TTVFormAnswers) => void;
  onSaveDraft: (answers: TTVFormAnswers) => void;
}) {
  const [answers, setAnswers] = useState<TTVFormAnswers>({
    symptoms: {
      nyeri: false, sesak: false, batuk: false, mual: false, muntah: false,
      sulit_menelan: false, sulit_tidur: false, lemas: false, nafsu_makan_menurun: false,
      konstipasi: false, diare: false, lainnya: '',
    },
  });
  const [step, setStep] = useState(0);

  const progress = step === 0 ? 50 : 100;

  const symptomsList = [
    { key: 'nyeri' as const, label: 'Nyeri' },
    { key: 'sesak' as const, label: 'Sesak Napas' },
    { key: 'batuk' as const, label: 'Batuk' },
    { key: 'mual' as const, label: 'Mual' },
    { key: 'muntah' as const, label: 'Muntah' },
    { key: 'sulit_menelan' as const, label: 'Sulit Menelan' },
    { key: 'sulit_tidur' as const, label: 'Sulit Tidur' },
    { key: 'lemas' as const, label: 'Lemas' },
    { key: 'nafsu_makan_menurun' as const, label: 'Nafsu Makan Menurun' },
    { key: 'konstipasi' as const, label: 'Konstipasi' },
    { key: 'diare' as const, label: 'Diare' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Form Monitoring TTV</h3>
        <Badge variant="outline">Langkah {step + 1}/2</Badge>
      </div>
      <Progress value={progress} className="h-2" />

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Tanda Vital</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tekanan Darah Sistolik (mmHg)</Label>
              <Input type="number" placeholder="110" value={answers.systolicBP ?? ''} onChange={e => setAnswers({ ...answers, systolicBP: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Tekanan Darah Diastolik (mmHg)</Label>
              <Input type="number" placeholder="70" value={answers.diastolicBP ?? ''} onChange={e => setAnswers({ ...answers, diastolicBP: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Nadi (x/menit)</Label>
              <Input type="number" placeholder="80" value={answers.heartRate ?? ''} onChange={e => setAnswers({ ...answers, heartRate: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Frekuensi Napas (x/menit)</Label>
              <Input type="number" placeholder="20" value={answers.respiratoryRate ?? ''} onChange={e => setAnswers({ ...answers, respiratoryRate: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Suhu Tubuh (°C)</Label>
              <Input type="number" step="0.1" placeholder="36.5" value={answers.temperature ?? ''} onChange={e => setAnswers({ ...answers, temperature: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Saturasi Oksigen SpO2 (%)</Label>
              <Input type="number" placeholder="98" value={answers.oxygenSat ?? ''} onChange={e => setAnswers({ ...answers, oxygenSat: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Berat Badan (kg)</Label>
              <Input type="number" step="0.1" placeholder="60" value={answers.weight ?? ''} onChange={e => setAnswers({ ...answers, weight: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Gula Darah (opsional, mg/dL)</Label>
              <Input type="number" placeholder="100" value={answers.bloodSugar ?? ''} onChange={e => setAnswers({ ...answers, bloodSugar: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Skor Nyeri (0-10)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="number" min={0} max={10} value={answers.painScore ?? ''} onChange={e => setAnswers({ ...answers, painScore: e.target.value ? Number(e.target.value) : undefined })} className="w-20" />
              <span className="text-xs text-muted-foreground">0 = tidak nyeri, 10 = nyeri terburuk</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onSaveDraft(answers)}>
              <Save className="w-3 h-3 mr-1" /> Simpan Draft
            </Button>
            <Button size="sm" onClick={() => setStep(1)}>
              Lanjut <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Gejala Saat Ini</p>
          <div className="grid grid-cols-2 gap-2">
            {symptomsList.map(s => (
              <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={answers.symptoms[s.key]} onCheckedChange={v => setAnswers({ ...answers, symptoms: { ...answers.symptoms, [s.key]: !!v } })} />
                {s.label}
              </label>
            ))}
          </div>
          <div>
            <Label className="text-xs">Keluhan Lainnya</Label>
            <Input value={answers.symptoms.lainnya} onChange={e => setAnswers({ ...answers, symptoms: { ...answers.symptoms, lainnya: e.target.value } })} placeholder="Tuliskan keluhan lain..." />
          </div>
          <div>
            <Label className="text-xs">Catatan Tambahan</Label>
            <Textarea value={answers.notes ?? ''} onChange={e => setAnswers({ ...answers, notes: e.target.value })} placeholder="Catatan untuk dokter..." rows={2} />
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(0)}>
              Kembali
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onSaveDraft(answers)}>
                <Save className="w-3 h-3 mr-1" /> Simpan Draft
              </Button>
              <Button size="sm" onClick={() => onSubmit(answers)}>
                <Send className="w-3 h-3 mr-1" /> Kirim
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Keluhan Form Component ─────────────────────────────────────────────────

function KeluhanForm({ onSubmit, onSaveDraft }: {
  onSubmit: (answers: KeluhanFormAnswers) => void;
  onSaveDraft: (answers: KeluhanFormAnswers) => void;
}) {
  const [answers, setAnswers] = useState<KeluhanFormAnswers>({
    kondisiHariIni: 'cukup',
    keluhanBaru: 'tidak_ada',
    nyeriBertambah: 'tidak_ada',
    sesakBertambah: 'tidak_ada',
    makanMinum: 'tidak_ada',
    tidur: 'tidak_ada',
    masalahObat: 'tidak_ada',
  });

  const severityOptions = [
    { value: 'tidak_ada', label: 'Tidak Ada' },
    { value: 'ringan', label: 'Ringan' },
    { value: 'sedang', label: 'Sedang' },
    { value: 'berat', label: 'Berat' },
  ];

  const kondisiOptions = [
    { value: 'baik', label: 'Baik' },
    { value: 'cukup', label: 'Cukup' },
    { value: 'kurang', label: 'Kurang' },
    { value: 'buruk', label: 'Buruk' },
  ];

  const questions = [
    { key: 'keluhanBaru' as const, label: 'Apakah ada keluhan baru?' },
    { key: 'nyeriBertambah' as const, label: 'Apakah nyeri bertambah?' },
    { key: 'sesakBertambah' as const, label: 'Apakah sesak napas bertambah?' },
    { key: 'makanMinum' as const, label: 'Apakah dapat makan dan minum dengan baik?' },
    { key: 'tidur' as const, label: 'Apakah dapat tidur dengan baik?' },
    { key: 'masalahObat' as const, label: 'Apakah ada masalah dengan obat yang diberikan?' },
  ];

  const filledCount = questions.filter(q => answers[q.key] !== 'tidak_ada').length + 1;
  const progress = Math.round((filledCount / (questions.length + 1)) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Form Keluhan Harian</h3>
        <Badge variant="outline">{progress}% terisi</Badge>
      </div>
      <Progress value={progress} className="h-2" />

      <div>
        <Label className="text-sm font-medium">Bagaimana kondisi Anda hari ini?</Label>
        <RadioGroup value={answers.kondisiHariIni} onValueChange={v => setAnswers({ ...answers, kondisiHariIni: v as KeluhanFormAnswers['kondisiHariIni'] })} className="flex gap-4 mt-2">
          {kondisiOptions.map(opt => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {questions.map(q => (
        <div key={q.key}>
          <Label className="text-sm font-medium">{q.label}</Label>
          <RadioGroup value={answers[q.key]} onValueChange={v => setAnswers({ ...answers, [q.key]: v })} className="flex gap-4 mt-1">
            {severityOptions.map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
        </div>
      ))}

      <div>
        <Label className="text-sm font-medium">Catatan Tambahan</Label>
        <Textarea value={answers.catatanTambahan ?? ''} onChange={e => setAnswers({ ...answers, catatanTambahan: e.target.value })} placeholder="Tuliskan catatan untuk dokter..." rows={2} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onSaveDraft(answers)}>
          <Save className="w-3 h-3 mr-1" /> Simpan Draft
        </Button>
        <Button size="sm" onClick={() => onSubmit(answers)}>
          <Send className="w-3 h-3 mr-1" /> Kirim
        </Button>
      </div>
    </div>
  );
}

// ── Main Chat Panel ────────────────────────────────────────────────────────

interface PalliativeChatPanelProps {
  patient: PalliativePatientInfo | null;
}

export function PalliativeChatPanel({ patient }: PalliativeChatPanelProps) {
  const [messageInput, setMessageInput] = useState('');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formType, setFormType] = useState<PalliativeFormType | null>(null);
  const [showScreeningPicker, setShowScreeningPicker] = useState(false);
  const [selectedScreeningTool, setSelectedScreeningTool] = useState<PalliativeToolType | null>(null);
  const [activeFormMsgId, setActiveFormMsgId] = useState<string | null>(null);
  const [activeScreeningType, setActiveScreeningType] = useState<PalliativeToolType | null>(null);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [showMedMonitoringDialog, setShowMedMonitoringDialog] = useState(false);
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [medSchedule, setMedSchedule] = useState<MedicationFormSchedule>('harian');
  const [medDeadline, setMedDeadline] = useState('');
  const [showMedFormFill, setShowMedFormFill] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentUser,
    palliativeChatMessages,
    addPalliativeChatMessage,
    updatePalliativeChatMessage,
    palliativeClinicalAlerts,
    addPalliativeClinicalAlert,
    markPalliativeAlertRead,
    addPalliativeAuditEntry,
    addVitalSignRecord,
    addPalliativeScreeningRecord,
    palliativeMedications,
    addMedicationMonitoringForm,
    addMedicationMonitoringAlert,
    addMedicationMonitoringAuditEntry,
  } = useStore();

  // Get room messages for current patient
  const roomId = patient ? `${patient.id}_${patient.attendingDoctorId || currentUser?.id}` : '';
  const roomMessages = useMemo(() =>
    palliativeChatMessages
      .filter(m => m.roomId === roomId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [palliativeChatMessages, roomId]
  );

  // Get patient alerts
  const patientAlerts = useMemo(() =>
    palliativeClinicalAlerts.filter(a => a.patientId === patient?.id),
    [palliativeClinicalAlerts, patient]
  );

  const unreadAlertCount = patientAlerts.filter(a => !a.isRead).length;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  // Send text message
  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !patient || !currentUser) return;
    const msg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'doctor',
      type: 'text',
      content: messageInput.trim(),
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(msg);
    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'chat_sent',
      performedBy: currentUser.id,
      performedByRole: 'doctor',
      details: `Dokter mengirim pesan: "${messageInput.trim().substring(0, 50)}..."`,
      createdAt: new Date().toISOString(),
    });
    setMessageInput('');
  }, [messageInput, patient, currentUser, roomId, addPalliativeChatMessage, addPalliativeAuditEntry]);

  // Send form (TTV/Keluhan)
  const handleSendForm = useCallback((type: PalliativeFormType, screeningType?: PalliativeToolType) => {
    if (!patient || !currentUser) return;
    const formId = genId('form');
    const msgType: PalliativeChatMsgType = type === 'ttv' ? 'form_ttv' : type === 'keluhan' ? 'form_keluhan' : type === 'monitoring_obat' ? 'form_monitoring_obat' : 'form_screening';
    const contentMap: Record<PalliativeFormType, string> = {
      ttv: 'Silakan isi formulir TTV untuk memantau kondisi Anda hari ini.',
      keluhan: 'Mohon isi form keluhan harian untuk evaluasi gejala Anda.',
      screening: `Mohon isi skrining ${screeningType ? getToolLabel(screeningType) : ''} untuk evaluasi kebutuhan Anda.`,
      monitoring_obat: 'Silakan isi form monitoring obat paliatif.',
    };
    const msg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'doctor',
      type: msgType,
      content: contentMap[type],
      status: 'sent',
      formType: type,
      formData: {
        id: formId,
        formType: type,
        screeningType,
        status: 'sent',
        progress: 0,
      },
      screeningType,
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(msg);
    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'form_sent',
      performedBy: currentUser.id,
      performedByRole: 'doctor',
      details: `Dokter mengirim Form ${type === 'ttv' ? 'TTV' : type === 'keluhan' ? 'Keluhan Harian' : `Skrining ${screeningType || ''}`} kepada pasien`,
      createdAt: new Date().toISOString(),
    });
    setShowFormDialog(false);
    setFormType(null);
    setSelectedScreeningTool(null);
    setShowScreeningPicker(false);
  }, [patient, currentUser, roomId, addPalliativeChatMessage, addPalliativeAuditEntry]);

  // Generate AI SOAP note (must be before handleTTVSubmit since it's called there)
  const generateAISummary = useCallback(async (ttvAnswers?: TTVFormAnswers) => {
    if (!patient) return;
    const latestVital = ttvAnswers;
    const soapNote = `S: Pasien ${patient.patientName || '-'} dengan diagnosa ${patient.primaryDiagnosis || '-'}. ${latestVital?.notes || 'Tidak ada keluhan tambahan.'}\nO: TD ${latestVital?.systolicBP || '-'}/${latestVital?.diastolicBP || '-'} mmHg, Nadi ${latestVital?.heartRate || '-'} x/menit, RR ${latestVital?.respiratoryRate || '-'}/menit, Suhu ${latestVital?.temperature || '-'}°C, SpO2 ${latestVital?.oxygenSat || '-'}%.${latestVital?.weight ? ` BB ${latestVital.weight} kg.` : ''}${latestVital?.painScore ? ` Nyeri ${latestVital.painScore}/10.` : ''}\nA: Kondisi ${patient.riskLevel === 'merah' ? 'kritis, memerlukan perhatian segera' : patient.riskLevel === 'kuning' ? 'perlu pemantauan ketat' : 'stabil, lanjutkan monitoring'}. ${latestVital?.oxygenSat && latestVital.oxygenSat < 90 ? 'Hipoksemia terdeteksi. ' : ''}${latestVital?.respiratoryRate && latestVital.respiratoryRate > 24 ? 'Takipnea. ' : ''}\nP: Lanjutkan monitoring tanda vital, manajemen gejala, dan evaluasi berkala.${latestVital?.oxygenSat && latestVital.oxygenSat < 90 ? ' Evaluasi oksigen tambahan.' : ''} Monitoring ulang ${patient.riskLevel === 'merah' ? '6' : patient.riskLevel === 'kuning' ? '12' : '24'} jam.`;

    const aiMsg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: 'system',
      senderName: 'AI Clinical Assistant',
      senderRole: 'system',
      type: 'ai_summary',
      content: `Ringkasan AI otomatis telah dibuat berdasarkan data terbaru pasien.`,
      aiSummary: soapNote,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(aiMsg);
    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'ai_generated',
      performedBy: 'system',
      performedByRole: 'system',
      details: 'AI menghasilkan ringkasan klinis otomatis',
      createdAt: new Date().toISOString(),
    });
  }, [patient, roomId, addPalliativeChatMessage, addPalliativeAuditEntry]);

  // Handle TTV form submission from patient
  const handleTTVSubmit = useCallback((answers: TTVFormAnswers) => {
    if (!patient || !currentUser) return;
    const responseMsg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: patient.patientId || patient.id,
      senderName: patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form TTV telah diisi.',
      formType: 'ttv',
      formResponse: {
        formId: activeFormMsgId || genId('form'),
        formType: 'ttv',
        ttvAnswers: answers,
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(responseMsg);

    // Save to vital signs
    const vitalRecord: VitalSignRecordInfo = {
      id: genId('vs'),
      palliativePatientId: patient.id,
      recordedBy: 'patient',
      systolicBP: answers.systolicBP,
      diastolicBP: answers.diastolicBP,
      heartRate: answers.heartRate,
      respiratoryRate: answers.respiratoryRate,
      temperature: answers.temperature,
      oxygenSat: answers.oxygenSat,
      weight: answers.weight,
      notes: answers.notes,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    addVitalSignRecord(vitalRecord);

    // Check for clinical alerts
    const alertCheck = checkTTVAlerts(answers);
    if (alertCheck.alert) {
      const alert: PalliativeClinicalAlert = {
        id: genId('alert'),
        patientId: patient.id,
        alertType: 'ttv_abnormal',
        severity: alertCheck.severity,
        title: alertCheck.severity === 'merah' ? 'TTV Kritis' : 'TTV Abnormal',
        description: alertCheck.messages.join('. '),
        values: { systolicBP: answers.systolicBP, diastolicBP: answers.diastolicBP, heartRate: answers.heartRate, respiratoryRate: answers.respiratoryRate, temperature: answers.temperature, oxygenSat: answers.oxygenSat },
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addPalliativeClinicalAlert(alert);

      const alertMsg: PalliativeChatMessage = {
        id: genId('pcm'),
        roomId,
        senderId: 'system',
        senderName: 'Sistem',
        senderRole: 'system',
        type: 'clinical_alert',
        content: `Peringatan: ${alertCheck.messages.join('. ')}`,
        clinicalAlert: alert,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      };
      addPalliativeChatMessage(alertMsg);
      addPalliativeAuditEntry({
        id: genId('audit'),
        patientId: patient.id,
        action: 'alert_triggered',
        performedBy: 'system',
        performedByRole: 'system',
        details: `Alert: ${alertCheck.messages.join(', ')}`,
        createdAt: new Date().toISOString(),
      });
    }

    // Generate AI summary
    generateAISummary(answers);

    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: patient.patientId || patient.id,
      performedByRole: 'patient',
      details: 'Pasien mengirimkan hasil Form TTV',
      createdAt: new Date().toISOString(),
    });

    setActiveFormMsgId(null);
  }, [patient, currentUser, roomId, activeFormMsgId, addPalliativeChatMessage, addVitalSignRecord, addPalliativeClinicalAlert, addPalliativeAuditEntry, generateAISummary]);

  // Handle Keluhan form submission
  const handleKeluhanSubmit = useCallback((answers: KeluhanFormAnswers) => {
    if (!patient || !currentUser) return;
    const responseMsg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: patient.patientId || patient.id,
      senderName: patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form Keluhan Harian telah diisi.',
      formType: 'keluhan',
      formResponse: {
        formId: activeFormMsgId || genId('form'),
        formType: 'keluhan',
        keluhanAnswers: answers,
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(responseMsg);
    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: patient.patientId || patient.id,
      performedByRole: 'patient',
      details: 'Pasien mengirimkan hasil Form Keluhan Harian',
      createdAt: new Date().toISOString(),
    });
    setActiveFormMsgId(null);
  }, [patient, currentUser, roomId, activeFormMsgId, addPalliativeChatMessage, addPalliativeAuditEntry]);

  // Handle Screening form submission from patient
  const handleScreeningSubmit = useCallback((result: ScreeningScoreResult, answers: Record<string, number | string | string[]>) => {
    if (!patient || !currentUser || !activeScreeningType) return;
    const responseMsg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: patient.patientId || patient.id,
      senderName: patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: `Skrining ${getToolLabel(activeScreeningType)} telah diisi.`,
      formType: 'screening',
      formResponse: {
        formId: activeFormMsgId || genId('form'),
        formType: 'screening',
        screeningType: activeScreeningType,
        screeningAnswers: answers,
        screeningResult: {
          score: result.score,
          scoreLabel: result.scoreLabel,
          interpretation: result.interpretation,
          ewsLevel: result.ewsLevel,
        },
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(responseMsg);

    // Save to screening records
    const screeningRecord: PalliativeScreeningRecordInfo = {
      id: genId('sr'),
      palliativePatientId: patient.id,
      screeningType: activeScreeningType,
      score: result.score,
      scoreLabel: result.scoreLabel,
      interpretation: result.interpretation,
      ewsLevel: result.ewsLevel,
      details: JSON.stringify(result.details),
      performedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    addPalliativeScreeningRecord(screeningRecord);

    // Check for clinical alerts based on screening result
    if (result.ewsLevel === 'merah') {
      const alert: PalliativeClinicalAlert = {
        id: genId('alert'),
        patientId: patient.id,
        alertType: 'perburukan',
        severity: 'merah',
        title: `Skrining ${getToolLabel(activeScreeningType)} Kritis`,
        description: `Hasil skrining ${getToolLabel(activeScreeningType)} menunjukkan kondisi kritis: ${result.scoreLabel}. ${result.interpretation}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addPalliativeClinicalAlert(alert);

      const alertMsg: PalliativeChatMessage = {
        id: genId('pcm'),
        roomId,
        senderId: 'system',
        senderName: 'Sistem',
        senderRole: 'system',
        type: 'clinical_alert',
        content: `Peringatan: Skrining ${getToolLabel(activeScreeningType)} menunjukkan kondisi kritis (${result.scoreLabel})`,
        clinicalAlert: alert,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      };
      addPalliativeChatMessage(alertMsg);
    }

    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: patient.patientId || patient.id,
      performedByRole: 'patient',
      details: `Pasien mengirimkan hasil Skrining ${getToolLabel(activeScreeningType)}: ${result.scoreLabel}`,
      createdAt: new Date().toISOString(),
    });

    setActiveFormMsgId(null);
    setActiveScreeningType(null);
  }, [patient, currentUser, roomId, activeFormMsgId, activeScreeningType, addPalliativeChatMessage, addPalliativeScreeningRecord, addPalliativeClinicalAlert, addPalliativeAuditEntry]);

  // Open form from chat message click
  const handleOpenForm = useCallback((msg: PalliativeChatMessage) => {
    if (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') {
      setActiveFormMsgId(msg.formData.id);
      setFormType(msg.formType || null);
      if (msg.formType === 'screening' && msg.screeningType) {
        setActiveScreeningType(msg.screeningType);
      }
      if (msg.formType === 'monitoring_obat') {
        setShowMedFormFill(true);
      }
    }
  }, []);

  // Send medication monitoring form
  const handleSendMedMonitoringForm = useCallback(() => {
    if (!patient || !currentUser || selectedMedIds.length === 0) return;
    const formId = genId('medform');
    const selectedMeds = palliativeMedications.filter(m => selectedMedIds.includes(m.id));
    const medNames = selectedMeds.map(m => m.medicineName).join(', ');
    const msg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'doctor',
      type: 'form_monitoring_obat',
      content: `Silakan isi form monitoring obat paliatif untuk: ${medNames}`,
      status: 'sent',
      formType: 'monitoring_obat',
      formData: {
        id: formId,
        formType: 'monitoring_obat',
        status: 'sent',
        progress: 0,
      },
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(msg);

    // Save to medication monitoring forms store
    const medForm: MedicationMonitoringFormInfo = {
      id: formId,
      palliativePatientId: patient.id,
      doctorId: currentUser.id,
      patientId: patient.patientId || patient.id,
      selectedMedicationIds: selectedMedIds,
      schedule: medSchedule,
      deadline: medDeadline || undefined,
      status: 'sent',
      responses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addMedicationMonitoringForm(medForm);

    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'form_sent',
      performedBy: currentUser.id,
      performedByRole: 'doctor',
      details: `Dokter mengirim Form Monitoring Obat Paliatif (${selectedMeds.length} obat)`,
      createdAt: new Date().toISOString(),
    });
    addMedicationMonitoringAuditEntry({
      id: genId('mmaudit'),
      patientId: patient.id,
      action: 'form_sent',
      performedBy: currentUser.id,
      performedByRole: 'doctor',
      details: `Form Monitoring Obat dikirim: ${medNames}`,
      createdAt: new Date().toISOString(),
    });

    setShowMedMonitoringDialog(false);
    setSelectedMedIds([]);
    setMedSchedule('harian');
    setMedDeadline('');
    setShowFormDialog(false);
  }, [patient, currentUser, selectedMedIds, medSchedule, medDeadline, palliativeMedications, roomId, addPalliativeChatMessage, addMedicationMonitoringForm, addPalliativeAuditEntry, addMedicationMonitoringAuditEntry]);

  // Handle medication monitoring form submission from patient
  const handleMedMonitoringSubmit = useCallback((answers: MedicationMonitoringFormAnswers) => {
    if (!patient || !currentUser) return;
    const responseMsg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: patient.patientId || patient.id,
      senderName: patient.patientName || 'Pasien',
      senderRole: 'patient',
      type: 'form_response',
      content: 'Form Monitoring Obat Paliatif telah diisi.',
      formType: 'monitoring_obat',
      formResponse: {
        formId: activeFormMsgId || genId('form'),
        formType: 'monitoring_obat',
        medicationMonitoringAnswers: answers,
        submittedAt: new Date().toISOString(),
      },
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(responseMsg);

    // Check for alerts
    const notConsumedMeds = answers.medications.filter(m => m.consumptionStatus === 'tidak_diminum');
    const severeSideEffects = answers.medications.filter(m =>
      m.hasComplaints && ((m.complaintSeverity !== undefined && m.complaintSeverity >= 7) ||
        m.sideEffects?.includes('reaksi_alergi') ||
        m.sideEffects?.includes('sesak_napas'))
    );

    // Alert for not consumed medications
    for (const med of notConsumedMeds) {
      addMedicationMonitoringAlert({
        id: genId('mmalert'),
        patientId: patient.id,
        alertType: 'obat_tidak_diminum',
        severity: 'warning',
        title: `Obat Tidak Diminum: ${med.medicineName}`,
        description: `Pasien tidak meminum ${med.medicineName}. Alasan: ${med.notConsumedReason || 'tidak disebutkan'}. ${med.notConsumedExplanation || ''}`,
        medicationName: med.medicineName,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Alert for severe side effects
    for (const med of severeSideEffects) {
      addMedicationMonitoringAlert({
        id: genId('mmalert'),
        patientId: patient.id,
        alertType: 'efek_samping_berat',
        severity: 'critical',
        title: `Efek Samping Berat: ${med.medicineName}`,
        description: `Pasien melaporkan efek samping berat setelah minum ${med.medicineName}. Keparahan: ${med.complaintSeverity}/10. Efek samping: ${(med.sideEffects || []).join(', ')}`,
        medicationName: med.medicineName,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Also add palliative clinical alert
      const alert: PalliativeClinicalAlert = {
        id: genId('alert'),
        patientId: patient.id,
        alertType: 'obat_tidak_diminum',
        severity: 'merah',
        title: `Efek Samping Obat Berat: ${med.medicineName}`,
        description: `Keparahan ${med.complaintSeverity}/10. Efek: ${(med.sideEffects || []).join(', ')}. ${med.complaintNotes || ''}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      addPalliativeClinicalAlert(alert);

      const alertMsg: PalliativeChatMessage = {
        id: genId('pcm'),
        roomId,
        senderId: 'system',
        senderName: 'Sistem',
        senderRole: 'system',
        type: 'clinical_alert',
        content: `Peringatan: Efek samping berat dilaporkan untuk ${med.medicineName} (keparahan ${med.complaintSeverity}/10)`,
        clinicalAlert: alert,
        status: 'delivered',
        createdAt: new Date().toISOString(),
      };
      addPalliativeChatMessage(alertMsg);
    }

    // Generate AI summary for medication monitoring
    const takenCount = answers.medications.filter(m => m.consumptionStatus === 'sudah_diminum').length;
    const missedCount = answers.medications.filter(m => m.consumptionStatus === 'belum_diminum').length;
    const notConsumedCount = notConsumedMeds.length;
    const totalMeds = answers.medications.length;
    const compliancePercent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 0;
    const allSideEffects = answers.medications.filter(m => m.hasComplaints).flatMap(m => m.sideEffects || []);
    const sideEffectSummary = allSideEffects.length > 0 ? `Efek samping dilaporkan: ${[...new Set(allSideEffects)].join(', ')}.` : 'Tidak ada efek samping dilaporkan.';

    const aiSummaryNote = `Monitoring Obat Paliatif - ${patient.patientName || '-'}
Obat dimonitor: ${totalMeds}
Sudah diminum: ${takenCount} (${compliancePercent}% kepatuhan)
Belum diminum: ${missedCount}
Tidak diminum: ${notConsumedCount}
${sideEffectSummary}
${notConsumedMeds.length > 0 ? `Obat tidak diminum: ${notConsumedMeds.map(m => m.medicineName).join(', ')}.` : ''}
${severeSideEffects.length > 0 ? `PERINGATAN: Efek samping berat pada ${severeSideEffects.map(m => m.medicineName).join(', ')}.` : ''}
${answers.overallNotes ? `Catatan pasien: ${answers.overallNotes}` : ''}
Rekomendasi: ${compliancePercent >= 80 ? 'Kepatuhan baik, lanjutkan monitoring.' : compliancePercent >= 50 ? 'Kepatuhan perlu ditingkatkan, evaluasi hambatan.' : 'Kepatuhan rendah, perlu intervensi segera.'}`;

    const aiMsg: PalliativeChatMessage = {
      id: genId('pcm'),
      roomId,
      senderId: 'system',
      senderName: 'AI Clinical Assistant',
      senderRole: 'system',
      type: 'ai_summary',
      content: 'Ringkasan AI otomatis telah dibuat berdasarkan data monitoring obat.',
      aiSummary: aiSummaryNote,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(aiMsg);

    addMedicationMonitoringAuditEntry({
      id: genId('mmaudit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: patient.patientId || patient.id,
      performedByRole: 'patient',
      details: `Form Monitoring Obat disubmit: ${takenCount} diminum, ${missedCount} belum, ${notConsumedCount} tidak`,
      createdAt: new Date().toISOString(),
    });

    addPalliativeAuditEntry({
      id: genId('audit'),
      patientId: patient.id,
      action: 'form_submitted',
      performedBy: patient.patientId || patient.id,
      performedByRole: 'patient',
      details: 'Pasien mengirimkan hasil Form Monitoring Obat Paliatif',
      createdAt: new Date().toISOString(),
    });

    setShowMedFormFill(false);
    setActiveFormMsgId(null);
  }, [patient, currentUser, roomId, activeFormMsgId, addPalliativeChatMessage, addMedicationMonitoringAlert, addPalliativeClinicalAlert, addMedicationMonitoringAuditEntry, addPalliativeAuditEntry]);

  // Render message bubble
  const renderMessage = (msg: PalliativeChatMessage) => {
    const isDoctor = msg.senderRole === 'doctor';
    const isSystem = msg.senderRole === 'system';
    const isPatient = msg.senderRole === 'patient';

    return (
      <div key={msg.id} className={cn('flex gap-2 mb-3', isDoctor ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start')}>
        {!isDoctor && !isSystem && (
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-teal-700" />
          </div>
        )}
        {isSystem && (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            {msg.type === 'ai_summary' ? <Sparkles className="w-4 h-4 text-purple-700" /> : <Bot className="w-4 h-4 text-purple-700" />}
          </div>
        )}

        <div className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          isDoctor ? 'bg-primary text-primary-foreground' :
          isSystem ? (msg.type === 'clinical_alert' ? 'bg-red-50 border border-red-200 text-red-900' : msg.type === 'ai_summary' ? 'bg-purple-50 border border-purple-200 text-purple-900' : 'bg-gray-100 text-gray-700') :
          'bg-muted'
        )}>
          {!isDoctor && (
            <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>
          )}

          {/* Text message */}
          {(msg.type === 'text' || msg.type === 'education' || msg.type === 'instruction' || msg.type === 'reminder') && (
            <p>{msg.content}</p>
          )}

          {/* Form TTV */}
          {msg.type === 'form_ttv' && (
            <div
              className={cn(
                'space-y-2',
                (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && 'cursor-pointer hover:opacity-90'
              )}
              onClick={() => {
                if (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') {
                  handleOpenForm(msg);
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4" />
                <span className="font-semibold">Form Monitoring TTV</span>
              </div>
              <p className="text-xs opacity-80">{msg.content}</p>
              {(msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && (
                <Button variant="outline" size="sm" className="text-xs h-7 w-full mt-1">
                  <FileText className="w-3 h-3 mr-1" /> Klik untuk mengisi form TTV
                </Button>
              )}
              {msg.formData?.status === 'submitted' && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah diisi
                </Badge>
              )}
            </div>
          )}

          {/* Form Keluhan */}
          {msg.type === 'form_keluhan' && (
            <div
              className={cn(
                'space-y-2',
                (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && 'cursor-pointer hover:opacity-90'
              )}
              onClick={() => {
                if (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') {
                  handleOpenForm(msg);
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                <span className="font-semibold">Form Keluhan Harian</span>
              </div>
              <p className="text-xs opacity-80">{msg.content}</p>
              {(msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && (
                <Button variant="outline" size="sm" className="text-xs h-7 w-full mt-1">
                  <FileText className="w-3 h-3 mr-1" /> Klik untuk mengisi form keluhan
                </Button>
              )}
              {msg.formData?.status === 'submitted' && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah diisi
                </Badge>
              )}
            </div>
          )}

          {/* Form Screening */}
          {msg.type === 'form_screening' && (
            <div
              className={cn(
                'space-y-2',
                (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && 'cursor-pointer hover:opacity-90'
              )}
              onClick={() => {
                if (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') {
                  handleOpenForm(msg);
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                <span className="font-semibold">Skrining Paliatif</span>
              </div>
              <p className="text-xs opacity-80">{msg.content}</p>
              {msg.screeningType && (
                <Badge variant="outline" className="text-xs">{getToolLabel(msg.screeningType)}</Badge>
              )}
              {(msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && (
                <Button variant="outline" size="sm" className="text-xs h-7 w-full mt-1">
                  <FileText className="w-3 h-3 mr-1" /> Klik untuk mengisi skrining
                </Button>
              )}
              {msg.formData?.status === 'submitted' && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah diisi
                </Badge>
              )}
            </div>
          )}

          {/* Form Monitoring Obat */}
          {msg.type === 'form_monitoring_obat' && (
            <div
              className={cn(
                'space-y-2',
                (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && 'cursor-pointer hover:opacity-90'
              )}
              onClick={() => {
                if (msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') {
                  handleOpenForm(msg);
                }
              }}
            >
              <div className="flex items-center gap-1.5">
                <Pill className="w-4 h-4" />
                <span className="font-semibold">Form Monitoring Obat Paliatif</span>
              </div>
              <p className="text-xs opacity-80">{msg.content}</p>
              {(msg.formData?.status === 'sent' || msg.formData?.status === 'opened' || msg.formData?.status === 'in_progress') && (
                <Button variant="outline" size="sm" className="text-xs h-7 w-full mt-1">
                  <FileText className="w-3 h-3 mr-1" /> Klik untuk mengisi form monitoring obat
                </Button>
              )}
              {msg.formData?.status === 'submitted' && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah diisi
                </Badge>
              )}
            </div>
          )}

          {/* Form Response */}
          {msg.type === 'form_response' && msg.formResponse && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-semibold">
                  {msg.formResponse.formType === 'ttv' ? 'Hasil Form TTV' : msg.formResponse.formType === 'keluhan' ? 'Hasil Form Keluhan' : msg.formResponse.formType === 'monitoring_obat' ? 'Hasil Monitoring Obat' : 'Hasil Skrining'}
                </span>
              </div>

              {msg.formResponse.ttvAnswers && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {msg.formResponse.ttvAnswers.systolicBP && <span>TD: {msg.formResponse.ttvAnswers.systolicBP}/{msg.formResponse.ttvAnswers.diastolicBP} mmHg</span>}
                  {msg.formResponse.ttvAnswers.heartRate && <span>Nadi: {msg.formResponse.ttvAnswers.heartRate} bpm</span>}
                  {msg.formResponse.ttvAnswers.respiratoryRate && <span>RR: {msg.formResponse.ttvAnswers.respiratoryRate}/menit</span>}
                  {msg.formResponse.ttvAnswers.temperature && <span>Suhu: {msg.formResponse.ttvAnswers.temperature}°C</span>}
                  {msg.formResponse.ttvAnswers.oxygenSat && <span>SpO2: {msg.formResponse.ttvAnswers.oxygenSat}%</span>}
                  {msg.formResponse.ttvAnswers.weight && <span>BB: {msg.formResponse.ttvAnswers.weight} kg</span>}
                  {msg.formResponse.ttvAnswers.painScore !== undefined && <span>Nyeri: {msg.formResponse.ttvAnswers.painScore}/10</span>}
                  {msg.formResponse.ttvAnswers.bloodSugar && <span>GD: {msg.formResponse.ttvAnswers.bloodSugar} mg/dL</span>}
                </div>
              )}

              {msg.formResponse.ttvAnswers?.symptoms && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(msg.formResponse.ttvAnswers.symptoms).map(([key, val]) => 
                    val && key !== 'lainnya' ? (
                      <Badge key={key} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        {key.replace(/_/g, ' ')}
                      </Badge>
                    ) : null
                  )}
                  {msg.formResponse.ttvAnswers.symptoms.lainnya && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      {msg.formResponse.ttvAnswers.symptoms.lainnya}
                    </Badge>
                  )}
                </div>
              )}

              {msg.formResponse.keluhanAnswers && (
                <div className="space-y-1 text-xs">
                  <div>Kondisi: <Badge variant="outline">{msg.formResponse.keluhanAnswers.kondisiHariIni}</Badge></div>
                  {Object.entries(msg.formResponse.keluhanAnswers).filter(([k]) => k !== 'kondisiHariIni' && k !== 'catatanTambahan').map(([key, val]) => (
                    val !== 'tidak_ada' ? <div key={key}>{key.replace(/([A-Z])/g, ' $1')}: <Badge variant="outline" className={val === 'berat' ? 'bg-red-50 text-red-700' : val === 'sedang' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}>{String(val)}</Badge></div> : null
                  ))}
                  {msg.formResponse.keluhanAnswers.catatanTambahan && <div className="italic">"{msg.formResponse.keluhanAnswers.catatanTambahan}"</div>}
                </div>
              )}

              {msg.formResponse.screeningResult && (
                <div className="space-y-1 text-xs">
                  <div>Skor: <Badge variant="outline" className={getSeverityColor(msg.formResponse.screeningResult.ewsLevel)}>{msg.formResponse.screeningResult.score} - {msg.formResponse.screeningResult.scoreLabel}</Badge></div>
                  <div className="italic">{msg.formResponse.screeningResult.interpretation}</div>
                </div>
              )}

              {msg.formResponse.medicationMonitoringAnswers && (
                <div className="space-y-1 text-xs">
                  {msg.formResponse.medicationMonitoringAnswers.medications.map(med => (
                    <div key={med.medicationId} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          med.consumptionStatus === 'sudah_diminum' && 'bg-green-500',
                          med.consumptionStatus === 'belum_diminum' && 'bg-amber-500',
                          med.consumptionStatus === 'tidak_diminum' && 'bg-red-500',
                        )}
                      />
                      <span className="truncate">{med.medicineName}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] shrink-0',
                          med.consumptionStatus === 'sudah_diminum' && 'bg-green-50 text-green-700 border-green-200',
                          med.consumptionStatus === 'belum_diminum' && 'bg-amber-50 text-amber-700 border-amber-200',
                          med.consumptionStatus === 'tidak_diminum' && 'bg-red-50 text-red-700 border-red-200',
                        )}
                      >
                        {med.consumptionStatus === 'sudah_diminum' ? 'Diminum' : med.consumptionStatus === 'belum_diminum' ? 'Belum' : 'Tidak'}
                      </Badge>
                      {med.hasComplaints && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                    </div>
                  ))}
                  {msg.formResponse.medicationMonitoringAnswers.overallNotes && (
                    <div className="italic mt-1">&quot;{msg.formResponse.medicationMonitoringAnswers.overallNotes}&quot;</div>
                  )}
                </div>
              )}

              <p className="text-[10px] opacity-60">Diisi pada: {formatDate(msg.formResponse.submittedAt)} {formatTime(msg.formResponse.submittedAt)}</p>
            </div>
          )}

          {/* AI Summary */}
          {msg.type === 'ai_summary' && msg.aiSummary && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">Ringkasan AI</span>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{msg.aiSummary}</pre>
            </div>
          )}

          {/* Clinical Alert */}
          {msg.type === 'clinical_alert' && msg.clinicalAlert && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">{msg.clinicalAlert.title}</span>
              </div>
              <p className="text-xs">{msg.clinicalAlert.description}</p>
              <Badge variant="outline" className={cn('text-xs', getSeverityColor(msg.clinicalAlert.severity))}>
                {getSeverityLabel(msg.clinicalAlert.severity)}
              </Badge>
            </div>
          )}

          {/* Message status */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] opacity-50">{formatTime(msg.createdAt)}</span>
            {isDoctor && (
              <span className="text-[10px] opacity-50">
                {msg.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : msg.status === 'delivered' ? <Eye className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3 text-blue-400" />}
              </span>
            )}
          </div>
        </div>

        {isDoctor && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
    );
  };

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Pilih pasien untuk memulai percakapan</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
            <User className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <p className="font-semibold text-sm">{patient.patientName}</p>
            <p className="text-xs text-muted-foreground">{patient.primaryDiagnosis} | RM: {patient.rmNumber}</p>
          </div>
          <Badge variant="outline" className={cn('text-[10px]', getSeverityColor(patient.riskLevel))}>
            {getSeverityLabel(patient.riskLevel)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="relative" onClick={() => setShowAlertsPanel(!showAlertsPanel)}>
                  <Bell className="w-4 h-4" />
                  {unreadAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadAlertCount}</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifikasi Klinis</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlertsPanel && (
        <div className="p-3 border-b bg-red-50/50 space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-800">Notifikasi Klinis</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowAlertsPanel(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          {patientAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tidak ada notifikasi</p>
          ) : (
            patientAlerts.map(alert => (
              <Card key={alert.id} className={cn('p-2 cursor-pointer', !alert.isRead && 'ring-1 ring-red-300')} onClick={() => markPalliativeAlertRead(alert.id)}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-[10px]', getSeverityColor(alert.severity))}>
                    {alert.severity === 'merah' ? 'Gawat' : alert.severity === 'kuning' ? 'Waspada' : 'Stabil'}
                  </Badge>
                  <span className="text-xs font-medium">{alert.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{alert.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(alert.createdAt)} {formatTime(alert.createdAt)}</p>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-1">
          {roomMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Mulai percakapan dengan {patient.patientName}</p>
            </div>
          ) : (
            roomMessages.map(msg => renderMessage(msg))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Patient Fill Form (shows TTV/Keluhan/Screening form for patient view) */}
      {activeFormMsgId && (
        <Dialog open={!!activeFormMsgId} onOpenChange={(open) => {
          if (!open) {
            setActiveFormMsgId(null);
            setActiveScreeningType(null);
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>Isi Formulir</DialogTitle>
              <DialogDescription>Silakan isi formulir yang dikirim oleh dokter</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {formType === 'ttv' && (
              <TTVForm
                onSubmit={(answers) => handleTTVSubmit(answers)}
                onSaveDraft={() => {}}
              />
            )}
            {formType === 'keluhan' && (
              <KeluhanForm
                onSubmit={(answers) => handleKeluhanSubmit(answers)}
                onSaveDraft={() => {}}
              />
            )}
            {formType === 'screening' && activeScreeningType && (
              <InlineScreeningForm
                screeningType={activeScreeningType}
                onSubmit={handleScreeningSubmit}
                onSaveDraft={() => {}}
              />
            )}
            {formType === 'monitoring_obat' && showMedFormFill && (
              <MedicationMonitoringForm
                medications={palliativeMedications.filter(m => m.palliativePatientId === patient?.id && m.isActive)}
                onSubmit={handleMedMonitoringSubmit}
                onSaveDraft={() => {}}
              />
            )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Send Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Kirim Formulir ke Pasien</DialogTitle>
            <DialogDescription>Pilih jenis formulir yang akan dikirim kepada {patient.patientName}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFormType('ttv'); handleSendForm('ttv'); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Form Monitoring TTV</p>
                  <p className="text-xs text-muted-foreground">Tekanan darah, nadi, napas, suhu, SpO2, berat badan, gejala</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setFormType('keluhan'); handleSendForm('keluhan'); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Form Keluhan Harian</p>
                  <p className="text-xs text-muted-foreground">Kondisi hari ini, keluhan, nyeri, sesak, makan, tidur, obat</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setShowScreeningPicker(true); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Skrining Paliatif</p>
                  <p className="text-xs text-muted-foreground">PPS, ESAS-r, Distress Thermometer, SPICT, dll.</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setShowFormDialog(false); setShowMedMonitoringDialog(true); setSelectedMedIds(palliativeMedications.filter(m => m.palliativePatientId === patient?.id && m.isActive).map(m => m.id)); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Monitoring Obat Paliatif</p>
                  <p className="text-xs text-muted-foreground">Kepatuhan minum obat, efek samping, alasan tidak minum</p>
                </div>
              </div>
            </Card>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screening Picker Dialog */}
      <Dialog open={showScreeningPicker} onOpenChange={setShowScreeningPicker}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Pilih Jenis Skrining</DialogTitle>
            <DialogDescription>Pilih skrining paliatif yang akan dikirim kepada pasien</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {(['pps', 'eortc', 'esas', 'spict', 'distress', 'zarit'] as PalliativeToolType[]).map(tool => (
              <Card key={tool} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSendForm('screening', tool)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{getToolLabel(tool)}</p>
                    <p className="text-xs text-muted-foreground">{getToolCategory(tool)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowScreeningPicker(false)}>Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medication Monitoring Selection Dialog */}
      <Dialog open={showMedMonitoringDialog} onOpenChange={setShowMedMonitoringDialog}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Kirim Form Monitoring Obat Paliatif</DialogTitle>
            <DialogDescription>Pilih obat dan jadwal monitoring untuk {patient?.patientName}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Pilih Obat</Label>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => {
                  const allIds = palliativeMedications.filter(m => m.palliativePatientId === patient?.id && m.isActive).map(m => m.id);
                  setSelectedMedIds(selectedMedIds.length === allIds.length ? [] : allIds);
                }}>
                  {selectedMedIds.length === palliativeMedications.filter(m => m.palliativePatientId === patient?.id && m.isActive).length ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {palliativeMedications.filter(m => m.palliativePatientId === patient?.id && m.isActive).map(med => (
                  <label key={med.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={selectedMedIds.includes(med.id)}
                      onCheckedChange={checked => {
                        setSelectedMedIds(prev =>
                          checked ? [...prev, med.id] : prev.filter(id => id !== med.id)
                        );
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{med.medicineName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{med.dosage} - {med.frequency}</span>
                    </div>
                  </label>
                ))}
                {palliativeMedications.filter(m => m.palliativePatientId === patient?.id && m.isActive).length === 0 && (
                  <p className="text-xs text-muted-foreground">Tidak ada obat aktif untuk pasien ini</p>
                )}
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-medium">Jadwal Monitoring</Label>
              <Select value={medSchedule} onValueChange={v => setMedSchedule(v as MedicationFormSchedule)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sekali">Sekali</SelectItem>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="sesuai_jadwal_obat">Sesuai Jadwal Obat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Deadline (opsional)</Label>
              <Input
                type="datetime-local"
                value={medDeadline}
                onChange={e => setMedDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button
              onClick={handleSendMedMonitoringForm}
              disabled={selectedMedIds.length === 0}
            >
              <Send className="w-4 h-4 mr-1" /> Kirim Form Monitoring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input Area */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-center gap-2 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowFormDialog(true)}>
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Kirim Form</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kirim Form TTV / Keluhan / Skrining / Monitoring Obat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => { setMessageInput('Silakan kontrol sesuai jadwal. Semoga kondisi tetap stabil.'); }}>
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Pengingat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kirim Pengingat Kontrol</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => { setMessageInput('Berikut informasi edukasi kesehatan untuk Anda:'); }}>
                  <Stethoscope className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Edukasi</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kirim Edukasi Kesehatan</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Simulate patient fill button for demo */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto text-teal-600" onClick={() => {
                  const lastForm = [...roomMessages].reverse().find(m => m.formData?.status === 'sent');
                  if (lastForm?.formType) {
                    setActiveFormMsgId(lastForm.formData!.id);
                    setFormType(lastForm.formType);
                    if (lastForm.formType === 'screening' && lastForm.screeningType) {
                      setActiveScreeningType(lastForm.screeningType);
                    }
                    if (lastForm.formType === 'monitoring_obat') {
                      setShowMedFormFill(true);
                    }
                  }
                }}>
                  <UserCheck className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Simulasi Pasien</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Simulasi pasien mengisi form (demo)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ketik pesan..."
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            className="flex-1"
          />
          <Button size="sm" onClick={handleSendMessage} disabled={!messageInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
