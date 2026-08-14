'use client';

// ───────────────────────────────────────────────────────────────────────────
// TTVForm — shared "Form Monitoring TTV" fill-in component
// ───────────────────────────────────────────────────────────────────────────
// Extracted out of palliative-chat-panel.tsx (the doctor's Monitoring
// Paliatif chat) so patient-paliatif-panel.tsx (the patient's own chat) can
// render the exact same form when the patient taps a "Form TTV" message
// instead of only the doctor being able to fill it.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { TTVFormAnswers } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Save, Send, ArrowRight } from 'lucide-react';

/** Simple threshold-based clinical alert check for a TTV submission. */
export function checkTTVAlerts(ttv: TTVFormAnswers): { alert: boolean; severity: 'hijau' | 'kuning' | 'merah'; messages: string[] } {
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

export function TTVForm({ onSubmit, onSaveDraft }: {
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
