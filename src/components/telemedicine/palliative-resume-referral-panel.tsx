'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type {
  PalliativePatientInfo,
  PalliativeResumeMedis,
  PalliativeReferralLetter,
  PalliativeDocumentAuditEntry,
  PalliativeAuditEntry,
  PalliativeChatMessage,
  PalliativeResumeDataPasien,
  PalliativeResumeTTVRecord,
  PalliativeResumeKeluhan,
  PalliativeResumeAIAnalysis,
  ReferralTargetDepartment,
  ReferralStatus,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Sparkles,
  Download,
  Printer,
  Send,
  Eye,
  RefreshCw,
  Stethoscope,
  Building2,
  CheckCircle2,
  Clock,
  History,
  FileCheck,
  QrCode,
  Mail,
  MessageCircle,
  Shield,
  Archive,
  ChevronDown,
  AlertCircle,
  Activity,
  Heart,
  Pill,
  Apple,
  Users,
  ScrollText,
  Brain,
  TrendingUp,
  Save,
  AlertTriangle,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

// ── Types ────────────────────────────────────────────────────────────────

type DocTab = 'resume' | 'referral' | 'history';

interface KeluhanEntry {
  kondisiHariIni?: string;
  kondisiNyeri?: string;
  kondisiSesak?: string;
  makanMinum?: string;
  tidur?: string;
  masalahObat?: string;
  severityLevel?: string;
  submittedAt?: string;
  alasanKondisi?: string | null;
  deskripsiKeluhanBaru?: string | null;
  alasanMakanMinum?: string | null;
  alasanTidur?: string | null;
  deskripsiMasalahObat?: string | null;
}

interface EsasScoreEntry {
  score?: number;
  performedAt?: string;
  nyeri?: number;
  kelelahan?: number;
  mengantuk?: number;
  mual?: number;
  nafsuMakan?: number;
  sesak?: number;
  kecemasan?: number;
  depresi?: number;
  kesejahteraan?: number;
}

interface MedicationEntry {
  medicineName?: string;
  dosage?: string;
  frequency?: string;
  route?: string | null;
  indication?: string | null;
  isActive?: boolean;
  adherences?: unknown[];
}

// ── Helper Functions ─────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function genDocNumber(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}/${y}/${m}/${seq}`;
}

function getDeptLabel(dept: ReferralTargetDepartment): string {
  const map: Record<ReferralTargetDepartment, string> = {
    penyakit_dalam: 'Penyakit Dalam',
    onkologi: 'Onkologi',
    neurologi: 'Neurologi',
    jantung: 'Jantung / Kardiologi',
    pulmonologi: 'Pulmonologi',
    geriatri: 'Geriatri',
    kedokteran_paliatif: 'Kedokteran Paliatif',
    rehabilitasi_medik: 'Rehabilitasi Medik',
    rumah_sakit_rujukan_lanjutan: 'RS Rujukan Lanjutan',
  };
  return map[dept] || dept;
}

function getReferralStatusLabel(status: ReferralStatus): { label: string; className: string } {
  switch (status) {
    case 'belum_dirujuk':
      return { label: 'Belum Dirujuk', className: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'menunggu':
      return { label: 'Menunggu', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'sudah_dirujuk':
      return { label: 'Sudah Dirujuk', className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'selesai':
      return { label: 'Selesai', className: 'bg-green-100 text-green-800 border-green-300' };
    default:
      return { label: status || 'Tidak Diketahui', className: 'bg-gray-100 text-gray-700 border-gray-300' };
  }
}

function getTrendBadge(trend: string) {
  const t = trend?.toLowerCase() || '';
  if (t.includes('membaik')) return { label: 'Membaik', className: 'bg-green-100 text-green-800 border-green-300' };
  if (t.includes('stabil')) return { label: 'Stabil', className: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (t.includes('fluktuatif')) return { label: 'Fluktuatif', className: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (t.includes('memburuk')) return { label: 'Memburuk', className: 'bg-orange-100 text-orange-800 border-orange-300' };
  if (t.includes('terminal')) return { label: 'Terminal', className: 'bg-red-100 text-red-800 border-red-300' };
  if (t.includes('end of life') || t.includes('end_of_life')) return { label: 'End of Life', className: 'bg-red-200 text-red-900 border-red-400' };
  return { label: trend || 'N/A', className: 'bg-slate-100 text-slate-700 border-slate-300' };
}

function getSeverityBadge(level: string | undefined) {
  if (!level) return null;
  const l = level.toLowerCase();
  if (l.includes('ringan')) return <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px]">Ringan</Badge>;
  if (l.includes('sedang')) return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">Sedang</Badge>;
  if (l.includes('berat') || l.includes('kritis')) return <Badge className="bg-red-100 text-red-800 border border-red-300 text-[10px]">Berat</Badge>;
  return <Badge variant="outline" className="text-[10px]">{level}</Badge>;
}

function nullish(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  return String(v);
}

function getEsasColor(val: number | undefined | null): string {
  if (val == null) return 'bg-slate-100 text-slate-500';
  if (val <= 3) return 'bg-green-50 text-green-800';
  if (val <= 6) return 'bg-amber-50 text-amber-800';
  return 'bg-red-50 text-red-800';
}

// ── Generic record renderer for unknown[] data ──
function renderGenericRecords(records: unknown[], title: string): React.ReactNode {
  if (!records || !Array.isArray(records) || records.length === 0) return null;
  return (
    <div className="space-y-3 mb-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title} ({records.length})</h4>
      {records.map((rec, idx) => {
        if (typeof rec !== 'object' || rec === null) return null;
        const entries = Object.entries(rec as Record<string, unknown>)
          .filter(([k, v]) => v != null && v !== '' && !['id', 'patientId', 'createdAt', 'updatedAt'].includes(k));
        if (entries.length === 0) return null;
        return (
          <div key={idx} className="rounded-lg border p-2.5 bg-muted/20 text-sm">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-start gap-2 py-0.5">
                <span className="text-xs text-muted-foreground w-36 shrink-0">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                <span className="text-xs">{String(val)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── ACP Document renderer with specific labels ──
function renderAcpDocument(doc: Record<string, unknown>, idx: number): React.ReactNode {
  const prefLabels: Record<string, string> = {
    careGoal: 'Tujuan Perawatan',
    preferredCareLocation: 'Preferensi Tempat Perawatan',
    resuscitationPref: 'Resusitasi',
    ventilatorPref: 'Ventilator',
    icuPref: 'ICU',
    artificialNutrition: 'Nutrisi Buatan',
    dialysisPref: 'Dialisis',
    organDonation: 'Donasi Organ',
    decisionMakerName: 'Pengambil Keputusan',
    decisionMakerRelation: 'Hubungan',
    patientHopes: 'Harapan Pasien',
    patientWorries: 'Kekhawatiran Pasien',
    lifeValues: 'Nilai Hidup Penting',
    endOfLifePrefs: 'Preferensi Akhir Hayat',
    status: 'Status',
    signedAt: 'Tanggal Tanda Tangan',
    createdAt: 'Tanggal Dibuat',
    documentType: 'Jenis Dokumen',
    notes: 'Catatan',
  };

  const entries = Object.entries(doc)
    .filter(([k, v]) => v != null && v !== '' && !['id', 'patientId', 'updatedAt'].includes(k));

  if (entries.length === 0) return null;

  return (
    <div key={idx} className="rounded-lg border p-3 bg-muted/10 text-sm">
      {entries.map(([key, val]) => {
        const label = prefLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        const displayVal = key === 'signedAt' || key === 'createdAt'
          ? formatDate(String(val))
          : String(val);
        return (
          <div key={key} className="flex items-start gap-2 py-1 border-b border-muted/50 last:border-b-0">
            <span className="text-xs text-muted-foreground w-40 shrink-0 font-medium">{label}</span>
            <span className="text-xs flex-1 whitespace-pre-wrap">{displayVal}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Print HTML builder for structured resume ──
function buildResumePrintHtml(doc: PalliativeResumeMedis): string {
  const dp = doc.dataPasien as PalliativeResumeDataPasien | undefined;
  const ttv = doc.ttvSerial as { ttvAwal: PalliativeResumeTTVRecord | null; ttvKritis: PalliativeResumeTTVRecord | null; ttvTerakhir: PalliativeResumeTTVRecord | null } | undefined;
  const keluhan = doc.keluhanHarian as PalliativeResumeKeluhan | undefined;
  const esas = doc.esasScores as { skorAwal: Record<string, unknown> | null; skorTertinggi: Record<string, unknown> | null; skorTerakhir: Record<string, unknown> | null } | undefined;
  const obat = doc.obat as Record<string, unknown> | undefined;
  const nutrisi = doc.nutrisi as { catatan?: unknown[]; ringkasan?: string } | undefined;
  const sosial = doc.sosial as { penilaianSosial?: unknown[]; caregiver?: unknown[]; pertemuanKeluarga?: unknown[]; dukunganKeuangan?: unknown[]; ringkasan?: string } | undefined;
  const acp = doc.acp as { dokumen?: unknown[]; ringkasan?: string } | undefined;
  const ai = doc.aiAnalysis as PalliativeResumeAIAnalysis | undefined;

  const escHtml = (s: string | null | undefined) => (s ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const sectionHeader = (title: string) => `<h2 style="background:#f0fdf8;color:#1a5c4a;padding:6px 10px;margin:18px 0 8px;font-size:12pt;border-left:4px solid #2D8C7A;">${title}</h2>`;
  const kvRow = (label: string, value: string | null | undefined) => `<tr><td style="padding:3px 8px;font-size:9pt;color:#666;width:180px;vertical-align:top;">${escHtml(label)}</td><td style="padding:3px 8px;font-size:9pt;">${escHtml(value)}</td></tr>`;
  const kvTable = (rows: string[]) => `<table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>`;

  let html = '';

  // DATA PASIEN
  html += sectionHeader('DATA PASIEN');
  html += kvTable([
    kvRow('Nama', dp?.nama || doc.patientName),
    kvRow('No. RM', dp?.noRM || doc.rmNumber),
    kvRow('NIK', dp?.nik),
    kvRow('Tanggal Lahir', dp?.tanggalLahir),
    kvRow('Jenis Kelamin', dp?.jenisKelamin),
    kvRow('Alamat', dp?.alamat),
    kvRow('Diagnosa Utama', dp?.diagnosaUtama),
    kvRow('Diagnosa Penyerta', dp?.diagnosaPenyerta),
    kvRow('Stadium', dp?.stadiumPenyakit),
    kvRow('Status Perawatan', dp?.statusPerawatan),
    kvRow('Tingkat Risiko', dp?.tingkatRisiko),
    kvRow('Kontak Keluarga', `${dp?.kontakKeluarga?.nama || '-'} (${dp?.kontakKeluarga?.hubungan || '-'}) - ${dp?.kontakKeluarga?.telepon || '-'}`),
  ]);

  // TTV SERIAL
  if (ttv?.ttvAwal || ttv?.ttvKritis || ttv?.ttvTerakhir) {
    html += sectionHeader('TTV SERIAL');
    const renderTtvBlock = (title: string, d: PalliativeResumeTTVRecord | null | undefined) => {
      if (!d) return '';
      return `<h3 style="font-size:10pt;margin:8px 0 4px;color:#2D8C7A;">${title} (${formatDate(d.tanggal)})</h3>` +
        kvTable([
          kvRow('Tekanan Darah', d.sistolik != null && d.diastolik != null ? `${d.sistolik}/${d.diastolik} mmHg` : '-'),
          kvRow('Nadi', d.nadi != null ? `${d.nadi} x/mnt` : '-'),
          kvRow('RR', d.rr != null ? `${d.rr} x/mnt` : '-'),
          kvRow('Suhu', d.suhu != null ? `${d.suhu}°C` : '-'),
          kvRow('SpO2', d.spo2 != null ? `${d.spo2}%` : '-'),
          kvRow('Berat Badan', d.berat != null ? `${d.berat} kg` : '-'),
          kvRow('BMI', d.bmi != null ? String(d.bmi) : '-'),
        ]);
    };
    html += renderTtvBlock('TTV Awal', ttv.ttvAwal);
    html += renderTtvBlock('TTV Kritis', ttv.ttvKritis);
    html += renderTtvBlock('TTV Terakhir', ttv.ttvTerakhir);
  }

  // KELUHAN HARIAN
  if (keluhan?.keluhanAwal || keluhan?.keluhanTerberat || keluhan?.keluhanTerakhir) {
    html += sectionHeader('KELUHAN HARIAN');
    const renderKeluhanBlock = (title: string, k: Record<string, unknown> | null | undefined) => {
      if (!k) return '';
      return `<h3 style="font-size:10pt;margin:8px 0 4px;color:#D9B26F;">${title}</h3>` +
        kvTable([
          kvRow('Kondisi', String(k.kondisiHariIni ?? '-')),
          kvRow('Nyeri', String(k.kondisiNyeri ?? '-')),
          kvRow('Sesak', String(k.kondisiSesak ?? '-')),
          kvRow('Makan/Minum', String(k.makanMinum ?? '-')),
          kvRow('Tidur', String(k.tidur ?? '-')),
          kvRow('Masalah Obat', String(k.masalahObat ?? '-')),
          kvRow('Severity', String(k.severityLevel ?? '-')),
        ]);
    };
    html += renderKeluhanBlock('Keluhan Awal', keluhan.keluhanAwal as Record<string, unknown> | null);
    html += renderKeluhanBlock('Keluhan Terberat', keluhan.keluhanTerberat as Record<string, unknown> | null);
    html += renderKeluhanBlock('Keluhan Terakhir', keluhan.keluhanTerakhir as Record<string, unknown> | null);
    if (keluhan.analisis) {
      html += `<p style="font-size:9pt;color:#666;margin:4px 0;"><i>Analisis: ${escHtml(keluhan.analisis)}</i></p>`;
    }
  }

  // ESAS
  if (esas?.skorAwal || esas?.skorTertinggi || esas?.skorTerakhir) {
    html += sectionHeader('ESAS (Edmonton Symptom Assessment System)');
    const symptoms = ['nyeri', 'kelelahan', 'mengantuk', 'mual', 'nafsuMakan', 'sesak', 'kecemasan', 'depresi', 'kesejahteraan'];
    const symptomLabels: Record<string, string> = { nyeri: 'Nyeri', kelelahan: 'Kelelahan', mengantuk: 'Mengantuk', mual: 'Mual', nafsuMakan: 'Nafsu Makan', sesak: 'Sesak', kecemasan: 'Kecemasan', depresi: 'Depresi', kesejahteraan: 'Kesejahteraan' };
    html += '<table style="width:100%;border-collapse:collapse;font-size:9pt;"><tr style="background:#f5f5f5;"><th style="padding:4px;border:1px solid #ddd;">Parameter</th><th style="padding:4px;border:1px solid #ddd;">Awal</th><th style="padding:4px;border:1px solid #ddd;">Tertinggi</th><th style="padding:4px;border:1px solid #ddd;">Terakhir</th></tr>';
    for (const s of symptoms) {
      const awal = (esas.skorAwal as Record<string, unknown>)?.[s];
      const tinggi = (esas.skorTertinggi as Record<string, unknown>)?.[s];
      const akhir = (esas.skorTerakhir as Record<string, unknown>)?.[s];
      html += `<tr><td style="padding:3px 6px;border:1px solid #ddd;">${symptomLabels[s] || s}</td><td style="padding:3px 6px;border:1px solid #ddd;text-align:center;">${awal != null ? String(awal) : '-'}</td><td style="padding:3px 6px;border:1px solid #ddd;text-align:center;">${tinggi != null ? String(tinggi) : '-'}</td><td style="padding:3px 6px;border:1px solid #ddd;text-align:center;">${akhir != null ? String(akhir) : '-'}</td></tr>`;
    }
    html += '</table>';
  }

  // TERAPI OBAT
  if (obat) {
    html += sectionHeader('TERAPI OBAT');
    const renderMedBlock = (title: string, meds: unknown[]) => {
      if (!Array.isArray(meds) || meds.length === 0) return '';
      let t = `<h3 style="font-size:10pt;margin:6px 0 4px;">${escHtml(title)}</h3>`;
      t += '<table style="width:100%;border-collapse:collapse;font-size:9pt;"><tr style="background:#f5f5f5;"><th style="padding:3px 6px;border:1px solid #ddd;">Obat</th><th style="padding:3px 6px;border:1px solid #ddd;">Dosis</th><th style="padding:3px 6px;border:1px solid #ddd;">Frekuensi</th><th style="padding:3px 6px;border:1px solid #ddd;">Indikasi</th></tr>';
      for (const m of meds) {
        const r = m as Record<string, unknown>;
        t += `<tr><td style="padding:2px 6px;border:1px solid #ddd;">${escHtml(String(r.medicineName ?? '-'))}</td><td style="padding:2px 6px;border:1px solid #ddd;">${escHtml(String(r.dosage ?? '-'))}</td><td style="padding:2px 6px;border:1px solid #ddd;">${escHtml(String(r.frequency ?? '-'))}</td><td style="padding:2px 6px;border:1px solid #ddd;">${escHtml(String(r.indication ?? '-'))}</td></tr>`;
      }
      t += '</table>';
      return t;
    };
    html += renderMedBlock('Analgesik', obat.analgesik as unknown[] ?? []);
    const simtomatik = obat.simtomatik as Record<string, unknown[]> | undefined;
    if (simtomatik) {
      for (const [cat, meds] of Object.entries(simtomatik)) {
        html += renderMedBlock(cat.charAt(0).toUpperCase() + cat.slice(1), meds);
      }
    }
    html += renderMedBlock('Obat Lainnya', obat.obatLainnya as unknown[] ?? []);
  }

  // NUTRISI
  if (nutrisi?.catatan || nutrisi?.ringkasan) {
    html += sectionHeader('NUTRISI');
    if (nutrisi.catatan && Array.isArray(nutrisi.catatan)) {
      for (const rec of nutrisi.catatan) {
        if (typeof rec !== 'object' || rec === null) continue;
        const entries = Object.entries(rec as Record<string, unknown>).filter(([k, v]) => v != null && v !== '' && !['id', 'patientId', 'updatedAt'].includes(k));
        if (entries.length > 0) {
          html += kvTable(entries.map(([k, v]) => kvRow(k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), String(v))));
        }
      }
    }
    if (nutrisi.ringkasan) {
      html += `<p style="font-size:9pt;color:#22c55e;margin:6px 0;padding:6px;background:#f0fdf4;border:1px solid #dcfce7;"><b>Ringkasan AI:</b> ${escHtml(nutrisi.ringkasan)}</p>`;
    }
  }

  // SOSIAL
  if (sosial?.penilaianSosial || sosial?.caregiver || sosial?.pertemuanKeluarga || sosial?.dukunganKeuangan || sosial?.ringkasan) {
    html += sectionHeader('SOSIAL');
    const renderRecords = (title: string, recs: unknown[]) => {
      if (!Array.isArray(recs) || recs.length === 0) return '';
      let r = `<h3 style="font-size:10pt;margin:6px 0 4px;color:#3b82f6;">${escHtml(title)} (${recs.length})</h3>`;
      for (const rec of recs) {
        if (typeof rec !== 'object' || rec === null) continue;
        const entries = Object.entries(rec as Record<string, unknown>).filter(([k, v]) => v != null && v !== '' && !['id', 'patientId', 'updatedAt'].includes(k));
        if (entries.length > 0) {
          r += kvTable(entries.map(([k, v]) => kvRow(k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), String(v))));
          r += '<hr style="border:none;border-top:1px solid #eee;margin:4px 0;"/>';
        }
      }
      return r;
    };
    html += renderRecords('Penilaian Sosial', sosial.penilaianSosial ?? []);
    html += renderRecords('Caregiver', sosial.caregiver ?? []);
    html += renderRecords('Pertemuan Keluarga', sosial.pertemuanKeluarga ?? []);
    html += renderRecords('Dukungan Keuangan', sosial.dukunganKeuangan ?? []);
    if (sosial.ringkasan) {
      html += `<p style="font-size:9pt;color:#3b82f6;margin:6px 0;padding:6px;background:#eff6ff;border:1px solid #dbeafe;"><b>Ringkasan AI:</b> ${escHtml(sosial.ringkasan)}</p>`;
    }
  }

  // ACP
  if (acp?.dokumen || acp?.ringkasan) {
    html += sectionHeader('ADVANCE CARE PLANNING (ACP)');
    const prefLabels: Record<string, string> = {
      careGoal: 'Tujuan Perawatan', preferredCareLocation: 'Preferensi Tempat Perawatan',
      resuscitationPref: 'Resusitasi', ventilatorPref: 'Ventilator', icuPref: 'ICU',
      artificialNutrition: 'Nutrisi Buatan', dialysisPref: 'Dialisis', organDonation: 'Donasi Organ',
      decisionMakerName: 'Pengambil Keputusan', decisionMakerRelation: 'Hubungan',
      patientHopes: 'Harapan Pasien', patientWorries: 'Kekhawatiran Pasien',
      lifeValues: 'Nilai Hidup Penting', endOfLifePrefs: 'Preferensi Akhir Hayat',
      status: 'Status', signedAt: 'Tanggal Tanda Tangan', createdAt: 'Tanggal Dibuat',
      documentType: 'Jenis Dokumen', notes: 'Catatan',
    };
    if (acp.dokumen && Array.isArray(acp.dokumen)) {
      for (let i = 0; i < acp.dokumen.length; i++) {
        const d = acp.dokumen[i] as Record<string, unknown>;
        if (typeof d !== 'object' || d === null) continue;
        html += `<h3 style="font-size:10pt;margin:6px 0 4px;color:#D9B26F;">Dokumen ACP #${i + 1}</h3>`;
        const entries = Object.entries(d).filter(([k, v]) => v != null && v !== '' && !['id', 'patientId', 'updatedAt'].includes(k));
        html += kvTable(entries.map(([k, v]) => kvRow(prefLabels[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), String(v))));
      }
    }
    if (acp.ringkasan) {
      html += `<p style="font-size:9pt;color:#D9B26F;margin:6px 0;padding:6px;background:#fefce8;border:1px solid #fef08a;"><b>Ringkasan AI:</b> ${escHtml(acp.ringkasan)}</p>`;
    }
  }

  // AI ANALISIS
  if (ai) {
    html += sectionHeader('AI ANALISIS');
    if (ai.ringkasanPerjalananKlinis) html += `<p style="font-size:9pt;margin:4px 0;"><b>Ringkasan Perjalanan Klinis:</b> ${escHtml(ai.ringkasanPerjalananKlinis)}</p>`;
    if (ai.identifikasiKondisiKritis) html += `<p style="font-size:9pt;margin:4px 0;"><b>Identifikasi Kondisi Kritis:</b> ${escHtml(ai.identifikasiKondisiKritis)}</p>`;
    if (ai.analisisTrenPasien) html += `<p style="font-size:9pt;margin:4px 0;"><b>Analisis Tren Pasien:</b> ${escHtml(ai.analisisTrenPasien)}</p>`;
    if (ai.rekomendasi && ai.rekomendasi.length > 0) {
      html += '<h3 style="font-size:10pt;margin:8px 0 4px;">Rekomendasi</h3><ol style="font-size:9pt;margin:2px 0 2px 18px;">';
      for (const r of ai.rekomendasi) { html += `<li>${escHtml(r)}</li>`; }
      html += '</ol>';
    }
  }

  return html;
}

// ── Section Wrapper ──────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  accentColor = '#2D8C7A',
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white overflow-hidden',
        className
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 border-b">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

interface Props {
  patient: PalliativePatientInfo | null;
  onBack?: () => void;
}

export function PalliativeResumeReferralPanel({ patient }: Props) {
  const [docTab, setDocTab] = useState<DocTab>('resume');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<PalliativeResumeMedis | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<PalliativeReferralLetter | null>(null);
  const [showReferralDeptDialog, setShowReferralDeptDialog] = useState(false);
  const [targetDept, setTargetDept] = useState<ReferralTargetDepartment>('kedokteran_paliatif');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendDocType, setSendDocType] = useState<'resume' | 'referral'>('resume');
  const [sendDocId, setSendDocId] = useState('');
  const [doctorSip, setDoctorSip] = useState('');
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signDocType, setSignDocType] = useState<'resume' | 'referral'>('resume');
  const [signDocId, setSignDocId] = useState('');
  const [resumeQrDataUrl, setResumeQrDataUrl] = useState<string | null>(null);
  const [referralQrDataUrl, setReferralQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);

  // Editable AI narrative fields
  const [editRingkasanPerjalananKlinis, setEditRingkasanPerjalananKlinis] = useState('');
  const [editIdentifikasiKondisiKritis, setEditIdentifikasiKondisiKritis] = useState('');
  const [editAnalisisTrenPasien, setEditAnalisisTrenPasien] = useState('');

  const resumeContentRef = useRef<HTMLDivElement>(null);
  const referralContentRef = useRef<HTMLDivElement>(null);

  const {
    palliativeResumes,
    addPalliativeResume,
    updatePalliativeResume,
    palliativeReferralLetters,
    addPalliativeReferralLetter,
    updatePalliativeReferralLetter,
    addPalliativeDocumentAuditEntry,
    addPalliativeAuditEntry,
    addPalliativeChatMessage,
    currentUser,
    nutritionRecords,
    socialAssessments,
    caregivers,
    familyMeetings,
    financialSupportRecords,
  } = useStore();

  const { toast } = useToast();

  // ── Patient-specific data ──
  const patientResumes = useMemo(
    () =>
      palliativeResumes
        .filter((r) => r.palliativePatientId === patient?.id)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()),
    [palliativeResumes, patient]
  );

  const patientReferrals = useMemo(
    () =>
      palliativeReferralLetters
        .filter((l) => l.palliativePatientId === patient?.id)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()),
    [palliativeReferralLetters, patient]
  );

  const latestResume = patientResumes[0] || null;
  const latestReferral = patientReferrals[0] || null;

  // Sync editable fields when selected resume changes
  useEffect(() => {
    if (selectedResume?.aiAnalysis) {
      setEditRingkasanPerjalananKlinis(selectedResume.aiAnalysis.ringkasanPerjalananKlinis || '');
      setEditIdentifikasiKondisiKritis(selectedResume.aiAnalysis.identifikasiKondisiKritis || '');
      setEditAnalisisTrenPasien(selectedResume.aiAnalysis.analisisTrenPasien || '');
    }
  }, [selectedResume?.id, selectedResume?.aiAnalysis]);

  // ── QR Code Generation ──
  useEffect(() => {
    if (selectedResume?.isSigned) {
      const qrData = JSON.stringify({
        docId: selectedResume.id,
        docNumber: selectedResume.documentNumber,
        timestamp: selectedResume.signedAt || selectedResume.generatedAt,
        doctor: selectedResume.doctorName || '-',
        sip: selectedResume.doctorSip || '-',
        signed: true,
        type: 'resume_medis',
      });
      QRCode.toDataURL(qrData, { width: 120, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' } })
        .then((url) => setResumeQrDataUrl(url))
        .catch(() => setResumeQrDataUrl(null));
    } else {
      setResumeQrDataUrl(null);
    }
  }, [selectedResume?.isSigned, selectedResume?.id, selectedResume?.documentNumber, selectedResume?.signedAt, selectedResume?.generatedAt, selectedResume?.doctorName, selectedResume?.doctorSip]);

  useEffect(() => {
    if (selectedReferral?.isSigned) {
      const qrData = JSON.stringify({
        docId: selectedReferral.id,
        docNumber: selectedReferral.documentNumber,
        timestamp: selectedReferral.signedAt || selectedReferral.generatedAt,
        doctor: selectedReferral.doctorName || '-',
        sip: selectedReferral.doctorSip || '-',
        signed: true,
        type: 'surat_rujukan',
      });
      QRCode.toDataURL(qrData, { width: 120, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' } })
        .then((url) => setReferralQrDataUrl(url))
        .catch(() => setReferralQrDataUrl(null));
    } else {
      setReferralQrDataUrl(null);
    }
  }, [selectedReferral?.isSigned, selectedReferral?.id, selectedReferral?.documentNumber, selectedReferral?.signedAt, selectedReferral?.generatedAt, selectedReferral?.doctorName, selectedReferral?.doctorSip]);

  // ── Handlers ──
  const handleGenerateResume = useCallback(async () => {
    if (!patient) return;
    setResumeLoading(true);
    try {
      const response = await fetch('/api/palliative-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palliativePatientId: patient.id,
          additionalData: {
            nutritionRecords: nutritionRecords.filter(r => r.palliativePatientId === patient.id),
            socialAssessmentRecords: socialAssessments.filter(r => r.palliativePatientId === patient.id),
            caregivers: caregivers.filter(c => c.palliativePatientId === patient.id),
            familyMeetings: familyMeetings.filter(m => m.palliativePatientId === patient.id),
            financialSupportRecords: financialSupportRecords.filter(r => r.palliativePatientId === patient.id),
          },
        }),
      });

      let resumeData;
      if (response.ok) {
        const data = await response.json();
        resumeData = data.resume;
      } else {
        resumeData = generateLocalResumeData(patient);
      }

      const resume: PalliativeResumeMedis = {
        id: genId('resume'),
        palliativePatientId: patient.id,
        patientName: patient.patientName,
        rmNumber: patient.rmNumber,
        documentNumber: resumeData?.documentNumber || genDocNumber('RM-PAL'),
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser?.name || 'Dokter',
        generatedByRole: 'doctor',
        doctorSip: doctorSip || undefined,
        doctorName: currentUser?.name || 'Dokter',
        dataPasien: resumeData?.dataPasien,
        ttvSerial: resumeData?.ttvSerial,
        keluhanHarian: resumeData?.keluhanHarian,
        skriningPaliatif: resumeData?.skriningPaliatif,
        esasScores: resumeData?.esasScores,
        obat: resumeData?.obat,
        nutrisi: resumeData?.nutrisi,
        sosial: resumeData?.sosial,
        acp: resumeData?.acp,
        aiAnalysis: resumeData?.aiAnalysis,
        ringkasanKondisi: resumeData?.ringkasanKondisi || resumeData?.aiAnalysis?.ringkasanPerjalananKlinis,
        ringkasanPemeriksaan: resumeData?.ringkasanPemeriksaan,
        ringkasanTerapi: resumeData?.ringkasanTerapi,
        ringkasanACP: resumeData?.ringkasanACP || resumeData?.aiAnalysis?.ringkasanACP,
        kesimpulanKlinis: resumeData?.kesimpulanKlinis,
        rekomendasiAI: resumeData?.rekomendasiAI || resumeData?.aiAnalysis?.rekomendasi || [],
        fullContent: resumeData?.fullContent || '',
        version: latestResume ? latestResume.version + 1 : (resumeData?.version || 1),
        previousVersionId: latestResume?.id,
        isSigned: false,
        downloadCount: 0,
        printCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addPalliativeResume(resume);

      const auditEntry: PalliativeDocumentAuditEntry = {
        id: genId('docaudit'),
        documentType: 'resume_medis',
        documentId: resume.id,
        patientId: patient.id,
        action: 'generated',
        performedBy: currentUser?.name || 'Dokter',
        performedByRole: 'doctor',
        details: `Resume Medis AI dihasilkan untuk ${patient.patientName || 'Pasien'} (v${resume.version})`,
        createdAt: new Date().toISOString(),
      };
      addPalliativeDocumentAuditEntry(auditEntry);

      const pallAudit: PalliativeAuditEntry = {
        id: genId('audit'),
        patientId: patient.id,
        action: 'resume_generated',
        performedBy: currentUser?.name || 'Dokter',
        performedByRole: 'doctor',
        details: `Resume Medis AI dihasilkan (Dok: ${resume.documentNumber}, v${resume.version})`,
        createdAt: new Date().toISOString(),
      };
      addPalliativeAuditEntry(pallAudit);

      setSelectedResume(resume);
      setDocTab('resume');

      toast({
        title: 'Resume Medis Berhasil Dibuat',
        description: `Resume Medis AI untuk ${patient.patientName || 'Pasien'} telah dihasilkan (v${resume.version}).`,
      });
    } catch {
      const resumeData = generateLocalResumeData(patient);
      const resume: PalliativeResumeMedis = {
        id: genId('resume'),
        palliativePatientId: patient.id,
        patientName: patient.patientName,
        rmNumber: patient.rmNumber,
        documentNumber: genDocNumber('RM-PAL'),
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser?.name || 'Dokter',
        generatedByRole: 'doctor',
        doctorName: currentUser?.name || 'Dokter',
        ringkasanKondisi: resumeData.ringkasanKondisi,
        ringkasanPemeriksaan: resumeData.ringkasanPemeriksaan,
        ringkasanTerapi: resumeData.ringkasanTerapi,
        ringkasanACP: resumeData.ringkasanACP,
        kesimpulanKlinis: resumeData.kesimpulanKlinis,
        rekomendasiAI: resumeData.rekomendasiAI || [],
        fullContent: resumeData.fullContent,
        version: latestResume ? latestResume.version + 1 : 1,
        previousVersionId: latestResume?.id,
        isSigned: false,
        downloadCount: 0,
        printCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addPalliativeResume(resume);
      setSelectedResume(resume);
      toast({ title: 'Resume Medis Dibuat (Offline)', description: 'Resume dibuat menggunakan data lokal.' });
    }
    setResumeLoading(false);
  }, [patient, currentUser, doctorSip, latestResume, addPalliativeResume, addPalliativeDocumentAuditEntry, addPalliativeAuditEntry, toast, nutritionRecords, socialAssessments, caregivers, familyMeetings, financialSupportRecords]);

  const handleGenerateReferral = useCallback(async () => {
    if (!patient) return;
    setReferralLoading(true);
    try {
      const response = await fetch('/api/palliative-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palliativePatientId: patient.id, targetDepartment: targetDept }),
      });

      let referralData;
      if (response.ok) {
        const data = await response.json();
        referralData = data.referral;
      } else {
        referralData = generateLocalReferralData(patient, targetDept);
      }

      const letter: PalliativeReferralLetter = {
        id: genId('referral'),
        palliativePatientId: patient.id,
        patientName: patient.patientName,
        rmNumber: patient.rmNumber,
        documentNumber: genDocNumber('SR-PAL'),
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser?.name || 'Dokter',
        generatedByRole: 'doctor',
        doctorSip: doctorSip || undefined,
        doctorName: currentUser?.name || 'Dokter',
        nik: patient.nik,
        bpjsNumber: patient.bpjsNumber,
        primaryDiagnosis: patient.primaryDiagnosis || '-',
        secondaryDiagnosis: patient.secondaryDiagnosis,
        referralReason: referralData.referralReason,
        clinicalSummary: referralData.clinicalSummary,
        targetDepartment: targetDept,
        consultationRequest: referralData.consultationRequest,
        fullContent: referralData.fullContent,
        referralStatus: 'belum_dirujuk',
        version: latestReferral ? latestReferral.version + 1 : 1,
        previousVersionId: latestReferral?.id,
        isSigned: false,
        downloadCount: 0,
        printCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addPalliativeReferralLetter(letter);

      const auditEntry: PalliativeDocumentAuditEntry = {
        id: genId('docaudit'),
        documentType: 'surat_rujukan',
        documentId: letter.id,
        patientId: patient.id,
        action: 'generated',
        performedBy: currentUser?.name || 'Dokter',
        performedByRole: 'doctor',
        details: `Surat Rujukan AI dihasilkan untuk ${patient.patientName || 'Pasien'} ke ${getDeptLabel(targetDept)}`,
        createdAt: new Date().toISOString(),
      };
      addPalliativeDocumentAuditEntry(auditEntry);

      const pallAudit: PalliativeAuditEntry = {
        id: genId('audit'),
        patientId: patient.id,
        action: 'referral_generated',
        performedBy: currentUser?.name || 'Dokter',
        performedByRole: 'doctor',
        details: `Surat Rujukan AI dihasilkan (Dok: ${letter.documentNumber}, ke ${getDeptLabel(targetDept)})`,
        createdAt: new Date().toISOString(),
      };
      addPalliativeAuditEntry(pallAudit);

      setSelectedReferral(letter);
      setDocTab('referral');
      setShowReferralDeptDialog(false);

      toast({
        title: 'Surat Rujukan Berhasil Dibuat',
        description: `Surat Rujukan AI ke ${getDeptLabel(targetDept)} untuk ${patient.patientName || 'Pasien'} telah dihasilkan.`,
      });
    } catch {
      const referralData = generateLocalReferralData(patient, targetDept);
      const letter: PalliativeReferralLetter = {
        id: genId('referral'),
        palliativePatientId: patient.id,
        patientName: patient.patientName,
        rmNumber: patient.rmNumber,
        documentNumber: genDocNumber('SR-PAL'),
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser?.name || 'Dokter',
        generatedByRole: 'doctor',
        doctorName: currentUser?.name || 'Dokter',
        nik: patient.nik,
        bpjsNumber: patient.bpjsNumber,
        primaryDiagnosis: patient.primaryDiagnosis || '-',
        secondaryDiagnosis: patient.secondaryDiagnosis,
        referralReason: referralData.referralReason,
        clinicalSummary: referralData.clinicalSummary,
        targetDepartment: targetDept,
        consultationRequest: referralData.consultationRequest,
        fullContent: referralData.fullContent,
        referralStatus: 'belum_dirujuk',
        version: latestReferral ? latestReferral.version + 1 : 1,
        previousVersionId: latestReferral?.id,
        isSigned: false,
        downloadCount: 0,
        printCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addPalliativeReferralLetter(letter);
      setSelectedReferral(letter);
      setShowReferralDeptDialog(false);
      toast({ title: 'Surat Rujukan Dibuat (Offline)', description: 'Surat rujukan dibuat menggunakan data lokal.' });
    }
    setReferralLoading(false);
  }, [patient, currentUser, doctorSip, targetDept, latestReferral, addPalliativeReferralLetter, addPalliativeDocumentAuditEntry, addPalliativeAuditEntry, toast]);

  const handleSignDocument = useCallback((docType: 'resume' | 'referral', docId: string) => {
    const sip = doctorSip || 'SIP-' + (currentUser?.id || '000');
    if (docType === 'resume') {
      updatePalliativeResume(docId, { isSigned: true, signedAt: new Date().toISOString(), doctorSip: sip });
      addPalliativeDocumentAuditEntry({
        id: genId('docaudit'), documentType: 'resume_medis', documentId: docId, patientId: patient?.id || '',
        action: 'signed', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
        details: 'Resume Medis ditandatangani secara elektronik', createdAt: new Date().toISOString(),
      });
    } else {
      updatePalliativeReferralLetter(docId, { isSigned: true, signedAt: new Date().toISOString(), doctorSip: sip });
      addPalliativeDocumentAuditEntry({
        id: genId('docaudit'), documentType: 'surat_rujukan', documentId: docId, patientId: patient?.id || '',
        action: 'signed', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
        details: 'Surat Rujukan ditandatangani secara elektronik', createdAt: new Date().toISOString(),
      });
    }
    setShowSignDialog(false);
    toast({ title: 'Dokumen Ditandatangani', description: 'Tanda tangan elektronik berhasil diterapkan.' });
  }, [currentUser, doctorSip, patient, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry, toast]);

  const handleSendToChat = useCallback((docType: 'resume' | 'referral', docId: string) => {
    if (!patient) return;
    const roomId = `room-${patient.id}`;
    const doc = docType === 'resume'
      ? palliativeResumes.find((r) => r.id === docId)
      : palliativeReferralLetters.find((l) => l.id === docId);
    if (!doc) return;

    const docLabel = docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan';
    const chatMsg: PalliativeChatMessage = {
      id: genId('msg'),
      roomId,
      senderId: currentUser?.id || 'doctor',
      senderName: currentUser?.name || 'Dokter',
      senderRole: 'doctor',
      type: 'text',
      content: `${docLabel} telah diterbitkan untuk pasien.\n\nNo. Dokumen: ${doc.documentNumber}\nTanggal: ${formatDate(doc.generatedAt)}\nDokter: ${doc.doctorName || '-'}${doc.isSigned ? '\nStatus: Ditandatangani secara elektronik' : '\nStatus: Belum ditandatangani'}`,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    addPalliativeChatMessage(chatMsg);

    if (docType === 'resume') {
      updatePalliativeResume(docId, { sentToChatAt: new Date().toISOString() });
    } else {
      updatePalliativeReferralLetter(docId, { sentToChatAt: new Date().toISOString() });
    }

    addPalliativeDocumentAuditEntry({
      id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
      documentId: docId, patientId: patient.id,
      action: 'sent_to_chat', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
      details: `${docLabel} dikirim ke chat pasien`, createdAt: new Date().toISOString(),
    });

    setShowSendDialog(false);
    toast({ title: 'Dokumen Terkirim', description: `${docLabel} berhasil dikirim ke chat pasien.` });
  }, [patient, currentUser, palliativeResumes, palliativeReferralLetters, addPalliativeChatMessage, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry, toast]);

  const handleSendToWhatsApp = useCallback((docType: 'resume' | 'referral', docId: string) => {
    if (!patient) return;
    const doc = docType === 'resume'
      ? palliativeResumes.find((r) => r.id === docId)
      : palliativeReferralLetters.find((l) => l.id === docId);
    if (!doc) return;

    const docLabel = docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan';
    const phone = patient.familyContactPhone?.replace(/\D/g, '') || '';
    if (!phone) {
      toast({ title: 'Nomor WhatsApp Tidak Tersedia', description: 'Nomor telepon keluarga pasien belum diisi.', variant: 'destructive' });
      return;
    }

    const message = `${docLabel} - ${doc.patientName || 'Pasien'}\n\nNo. Dokumen: ${doc.documentNumber}\nTanggal: ${formatDate(doc.generatedAt)}\nDokter: ${doc.doctorName || '-'}\nStatus: ${doc.isSigned ? 'Ditandatangani secara elektronik' : 'Belum ditandatangani'}\n\nDokumen ini dihasilkan oleh CareLivia`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    if (docType === 'resume') {
      updatePalliativeResume(docId, { sentToWhatsAppAt: new Date().toISOString() });
    } else {
      updatePalliativeReferralLetter(docId, { sentToWhatsAppAt: new Date().toISOString() });
    }

    addPalliativeDocumentAuditEntry({
      id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
      documentId: docId, patientId: patient.id,
      action: 'sent_to_whatsapp', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
      details: `${docLabel} dikirim ke WhatsApp keluarga pasien`, createdAt: new Date().toISOString(),
    });

    setShowSendDialog(false);
    toast({ title: 'WhatsApp Terbuka', description: `${docLabel} akan dikirim melalui WhatsApp.` });
  }, [patient, currentUser, palliativeResumes, palliativeReferralLetters, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry, toast]);

  const handleSendToEmail = useCallback((docType: 'resume' | 'referral', docId: string) => {
    if (!patient) return;
    const doc = docType === 'resume'
      ? palliativeResumes.find((r) => r.id === docId)
      : palliativeReferralLetters.find((l) => l.id === docId);
    if (!doc) return;

    const docLabel = docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan';
    const subject = encodeURIComponent(`[CareLivia] ${docLabel} - ${doc.patientName || 'Pasien'} - ${doc.documentNumber}`);
    const body = encodeURIComponent(`Kepada Yth.,\n\nBerikut kami sampaikan ${docLabel} untuk pasien ${doc.patientName || '-'} (RM: ${doc.rmNumber || '-'}).\n\nDetail Dokumen:\n- No. Dokumen: ${doc.documentNumber}\n- Tanggal: ${formatDate(doc.generatedAt)}\n- Dokter: ${doc.doctorName || '-'}\n- SIP: ${doc.doctorSip || '-'}\n- Status Tanda Tangan: ${doc.isSigned ? 'Ditandatangani secara elektronik' : 'Belum ditandatangani'}\n- Versi: ${doc.version}\n\nDokumen ini dihasilkan oleh CareLivia.\nHormat kami,\n${currentUser?.name || 'Dokter'}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');

    if (docType === 'resume') {
      updatePalliativeResume(docId, { sentToEmailAt: new Date().toISOString() });
    } else {
      updatePalliativeReferralLetter(docId, { sentToEmailAt: new Date().toISOString() });
    }

    addPalliativeDocumentAuditEntry({
      id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
      documentId: docId, patientId: patient.id,
      action: 'sent_to_email', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
      details: `${docLabel} dikirim via email`, createdAt: new Date().toISOString(),
    });

    setShowSendDialog(false);
    toast({ title: 'Email Terbuka', description: `Klien email akan terbuka dengan ${docLabel}.` });
  }, [patient, currentUser, palliativeResumes, palliativeReferralLetters, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry, toast]);

  const handleDownloadPdf = useCallback(async (docType: 'resume' | 'referral', docId: string) => {
    const doc = docType === 'resume'
      ? palliativeResumes.find((r) => r.id === docId)
      : palliativeReferralLetters.find((l) => l.id === docId);
    if (!doc || !patient) return;

    setDownloading(true);
    const docLabel = docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan';

    try {
      const referralDoc = docType === 'referral' ? doc as PalliativeReferralLetter : undefined;
      const response = await fetch('/api/palliative-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          documentId: doc.id,
          patientData: {
            patientName: doc.patientName || patient.patientName || '-',
            rmNumber: doc.rmNumber || patient.rmNumber || '-',
            nik: patient.nik,
            bpjsNumber: patient.bpjsNumber,
            primaryDiagnosis: patient.primaryDiagnosis || '-',
            secondaryDiagnosis: patient.secondaryDiagnosis,
            diseaseStage: patient.diseaseStage,
            careStatus: patient.careStatus,
            riskLevel: patient.riskLevel,
          },
          documentData: {
            documentNumber: doc.documentNumber,
            generatedAt: doc.generatedAt,
            doctorName: doc.doctorName || '-',
            doctorSip: doc.doctorSip || '',
            isSigned: doc.isSigned,
            signedAt: doc.signedAt,
            fullContent: doc.fullContent,
            targetDepartment: referralDoc?.targetDepartment,
            referralStatus: referralDoc?.referralStatus,
            version: doc.version,
          },
          ...(docType === 'resume' && (doc as PalliativeResumeMedis).dataPasien ? {
            resumeData: {
              dataPasien: (doc as PalliativeResumeMedis).dataPasien,
              ttvSerial: (doc as PalliativeResumeMedis).ttvSerial || { ttvAwal: null, ttvKritis: null, ttvTerakhir: null },
              keluhanHarian: (doc as PalliativeResumeMedis).keluhanHarian || { keluhanAwal: null, keluhanTerberat: null, keluhanTerakhir: null, analisis: '' },
              skriningPaliatif: (doc as PalliativeResumeMedis).skriningPaliatif || {},
              esasScores: (doc as PalliativeResumeMedis).esasScores || { skorAwal: null, skorTertinggi: null, skorTerakhir: null },
              obat: (doc as PalliativeResumeMedis).obat || {},
              nutrisi: (doc as PalliativeResumeMedis).nutrisi || {},
              sosial: (doc as PalliativeResumeMedis).sosial || {},
              acp: (doc as PalliativeResumeMedis).acp || {},
              aiAnalysis: (doc as PalliativeResumeMedis).aiAnalysis,
            },
          } : {}),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docType === 'resume' ? 'Resume_Medis' : 'Surat_Rujukan'}_${doc.patientName || 'Pasien'}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (docType === 'resume') {
          updatePalliativeResume(docId, { downloadCount: (doc.downloadCount || 0) + 1, lastDownloadAt: new Date().toISOString() });
        } else {
          updatePalliativeReferralLetter(docId, { downloadCount: (doc.downloadCount || 0) + 1, lastDownloadAt: new Date().toISOString() });
        }

        addPalliativeDocumentAuditEntry({
          id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
          documentId: docId, patientId: patient.id,
          action: 'downloaded', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
          details: `${docLabel} diunduh (PDF)`, createdAt: new Date().toISOString(),
        });

        toast({ title: 'PDF Berhasil Diunduh', description: `${docLabel} telah diunduh dalam format PDF.` });
      } else {
        throw new Error('PDF API failed');
      }
    } catch {
      const content = doc.fullContent;
      const header = docType === 'resume'
        ? `RESUME MEDIS PALIATIF\nNo. Dokumen: ${doc.documentNumber}\nPasien: ${doc.patientName || '-'}\nRM: ${doc.rmNumber || '-'}\nTanggal: ${formatDate(doc.generatedAt)}\nDokter: ${doc.doctorName || '-'}${doc.isSigned ? `\nSIP: ${doc.doctorSip || '-'}` : ''}\n${'='.repeat(60)}\n\n`
        : `SURAT RUJUKAN RUMAH SAKIT\nNo. Dokumen: ${doc.documentNumber}\nPasien: ${doc.patientName || '-'}\nRM: ${doc.rmNumber || '-'}\nTujuan: ${getDeptLabel((doc as PalliativeReferralLetter).targetDepartment)}\nTanggal: ${formatDate(doc.generatedAt)}\nDokter: ${doc.doctorName || '-'}${doc.isSigned ? `\nSIP: ${doc.doctorSip || '-'}` : ''}\n${'='.repeat(60)}\n\n`;
      const footer = `\n\n${'='.repeat(60)}\nDokter: ${doc.doctorName || '-'}\n${doc.doctorSip ? `SIP: ${doc.doctorSip}` : ''}\n${doc.isSigned ? 'Tanda Tangan Elektronik: ✓ Verified' : 'Belum ditandatangani'}\nTanggal: ${formatDate(doc.generatedAt)}`;

      const blob = new Blob([header + content + footer], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType === 'resume' ? 'Resume_Medis' : 'Surat_Rujukan'}_${doc.patientName || 'Pasien'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (docType === 'resume') {
        updatePalliativeResume(docId, { downloadCount: (doc.downloadCount || 0) + 1, lastDownloadAt: new Date().toISOString() });
      } else {
        updatePalliativeReferralLetter(docId, { downloadCount: (doc.downloadCount || 0) + 1, lastDownloadAt: new Date().toISOString() });
      }

      addPalliativeDocumentAuditEntry({
        id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
        documentId: docId, patientId: patient.id,
        action: 'downloaded', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
        details: `${docLabel} diunduh (TXT fallback)`, createdAt: new Date().toISOString(),
      });

      toast({ title: 'Dokumen Diunduh (TXT)', description: 'PDF API tidak tersedia, diunduh sebagai file teks.' });
    }
    setDownloading(false);
  }, [palliativeResumes, palliativeReferralLetters, patient, currentUser, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry, toast]);

  const handlePrint = useCallback((docType: 'resume' | 'referral', docId: string) => {
    const doc = docType === 'resume'
      ? palliativeResumes.find((r) => r.id === docId)
      : palliativeReferralLetters.find((l) => l.id === docId);
    if (!doc) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build structured content for resume, raw fullContent for referral
    const resumeContent = docType === 'resume' && (doc as PalliativeResumeMedis).dataPasien
      ? buildResumePrintHtml(doc as PalliativeResumeMedis)
      : `<div class="content">${doc.fullContent}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan'}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
          h1 { text-align: center; font-size: 18pt; margin-bottom: 5px; }
          h2 { font-size: 14pt; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 20px; }
          h3 { font-size: 12pt; margin-top: 15px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header p { margin: 2px 0; font-size: 10pt; }
          .doc-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10pt; }
          .content { white-space: pre-wrap; font-size: 11pt; }
          .footer { margin-top: 40px; border-top: 1px solid #333; padding-top: 15px; }
          .signature { margin-top: 30px; text-align: right; }
          .signature-line { display: inline-block; width: 200px; text-align: center; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FASILITAS KESEHATAN PRIMER</h1>
          <p>Jl. Kesehatan No. 1, Kota, Provinsi</p>
          <p>Telp: (021) 123-4567 | Email: faskes@kesehatan.go.id</p>
        </div>
        <div class="doc-info">
          <span>No. Dokumen: ${doc.documentNumber}</span>
          <span>Tanggal: ${formatDate(doc.generatedAt)}</span>
          ${docType === 'resume' ? '<span>Versi: ' + (doc as PalliativeResumeMedis).version + '</span>' : ''}
        </div>
        <h1>${docType === 'resume' ? 'RESUME MEDIS TELEPALIATIF' : 'SURAT RUJUKAN'}</h1>
        ${resumeContent}
        <div class="footer">
          <div class="signature">
            <p>Dokter Penanggung Jawab,</p>
            <br/><br/><br/>
            <p class="signature-line"><strong>${doc.doctorName || '-'}</strong></p>
            <p class="signature-line">${doc.doctorSip ? `SIP: ${doc.doctorSip}` : ''}</p>
            ${doc.isSigned ? '<p style="color: green; font-size: 9pt;">✓ Tanda Tangan Elektronik Terverifikasi</p>' : '<p style="color: #999; font-size: 9pt;">Belum ditandatangani</p>'}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    if (docType === 'resume') {
      updatePalliativeResume(docId, { printCount: (doc.printCount || 0) + 1, lastPrintAt: new Date().toISOString() });
    } else {
      updatePalliativeReferralLetter(docId, { printCount: (doc.printCount || 0) + 1, lastPrintAt: new Date().toISOString() });
    }

    addPalliativeDocumentAuditEntry({
      id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
      documentId: docId, patientId: patient?.id || '',
      action: 'printed', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
      details: `${docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan'} dicetak`, createdAt: new Date().toISOString(),
    });
  }, [palliativeResumes, palliativeReferralLetters, patient, currentUser, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry]);

  // Save as Final handler
  const handleSaveAsFinal = useCallback(() => {
    if (!selectedResume) return;
    setSavingFinal(true);

    const updatedAiAnalysis: PalliativeResumeAIAnalysis = {
      ...(selectedResume.aiAnalysis || {
        ringkasanPerjalananKlinis: '',
        identifikasiKondisiKritis: '',
        analisisTrenPasien: '',
        ringkasanSkrining: { domainFisik: '', domainPsikologis: '', domainSosial: '', domainSpiritual: '', kebutuhanEdukasi: '', bebanCaregiver: '' },
        ringkasanNutrisi: '',
        ringkasanSosial: '',
        ringkasanACP: '',
        kesimpulanTelepaliatif: { diagnosisUtama: '', statusFungsionalAwal: '', statusFungsionalTerakhir: '', masalahPaliatifUtama: '', keluhanDominan: '', kondisiPalingKritis: '', responsTerhadapIntervensi: '', kondisiKlinisSaatIni: '', tujuanPerawatanSaatIni: '', rencanaTindakLanjut: '', lokasiPerawatanSaatIni: '', jadwalMonitoringBerikutnya: '' },
        rekomendasi: [],
      }),
      ringkasanPerjalananKlinis: editRingkasanPerjalananKlinis,
      identifikasiKondisiKritis: editIdentifikasiKondisiKritis,
      analisisTrenPasien: editAnalisisTrenPasien,
    };

    updatePalliativeResume(selectedResume.id, {
      aiAnalysis: updatedAiAnalysis,
      updatedAt: new Date().toISOString(),
    });

    addPalliativeDocumentAuditEntry({
      id: genId('docaudit'),
      documentType: 'resume_medis',
      documentId: selectedResume.id,
      patientId: patient?.id || '',
      action: 'generated',
      performedBy: currentUser?.name || 'Dokter',
      performedByRole: 'doctor',
      details: `Resume Medis disimpan sebagai final (v${selectedResume.version})`,
      createdAt: new Date().toISOString(),
    });

    setSavingFinal(false);
    toast({ title: 'Resume Disimpan', description: 'Resume Medis telah disimpan sebagai final di Riwayat Resume.' });
  }, [selectedResume, editRingkasanPerjalananKlinis, editIdentifikasiKondisiKritis, editAnalisisTrenPasien, updatePalliativeResume, addPalliativeDocumentAuditEntry, patient, currentUser, toast]);

  // ── Local fallback generators ──
  function generateLocalResumeData(p: PalliativePatientInfo) {
    const nd = '-';
    const fullContent = `RINGKASAN KONDISI PASIEN
Pasien ${p.patientName || nd} (RM: ${p.rmNumber || nd})
Diagnosa Utama: ${p.primaryDiagnosis || nd}
Diagnosa Penyerta: ${p.secondaryDiagnosis || nd}
Stadium: ${p.diseaseStage || nd}
Status Perawatan: ${p.careStatus}
Tingkat Risiko: ${p.riskLevel}
Pasien merupakan pasien paliatif yang sedang menjalani monitoring berkala. Kondisi saat ini ${p.riskLevel === 'merah' ? 'kritis dan memerlukan perhatian intensif' : p.riskLevel === 'kuning' ? 'perlu pemantauan ketat' : 'stabil namun tetap memerlukan monitoring'}.

RINGKASAN PEMERIKSAAN TERKINI
Data pemeriksaan terkini menunjukkan kondisi ${p.riskLevel === 'merah' ? 'kritis' : p.riskLevel === 'kuning' ? 'perlu perhatian' : 'stabil'}.
Perlu monitoring tanda vital secara berkala dan evaluasi gejala dominan.

RINGKASAN TERAPI
Terapi paliatif sedang berjalan sesuai rencana perawatan.
Manajemen gejala dilakukan sesuai pedoman perawatan paliatif.

RINGKASAN ADVANCE CARE PLANNING
${p.notes || 'Data ACP belum tersedia.'}

KESIMPULAN KLINIS
Pasien ${p.patientName || nd} dengan diagnosa ${p.primaryDiagnosis || nd} stadium ${p.diseaseStage || nd} sedang dalam program monitoring paliatif dengan tingkat risiko ${p.riskLevel}.

REKOMENDASI
- Lanjutkan monitoring paliatif secara berkala
- Evaluasi manajemen gejala
- Pertimbangkan konsultasi spesialis sesuai kebutuhan
- Diskusikan Advance Care Planning jika belum dilakukan`;

    return {
      ringkasanKondisi: `Pasien ${p.patientName || nd} dengan diagnosa ${p.primaryDiagnosis || nd}. Kondisi saat ini ${p.riskLevel === 'merah' ? 'kritis' : p.riskLevel === 'kuning' ? 'perlu perhatian' : 'stabil'}.`,
      ringkasanPemeriksaan: `Data pemeriksaan menunjukkan tingkat risiko ${p.riskLevel}. Perlu monitoring berkala.`,
      ringkasanTerapi: 'Terapi paliatif berjalan sesuai rencana perawatan.',
      ringkasanACP: p.notes || 'Data ACP belum tersedia.',
      kesimpulanKlinis: `Pasien ${p.patientName || nd} dengan diagnosa ${p.primaryDiagnosis || nd} dalam program monitoring paliatif.`,
      rekomendasiAI: ['Lanjutkan monitoring paliatif', 'Evaluasi manajemen gejala', 'Konsultasi spesialis sesuai kebutuhan'],
      fullContent,
    };
  }

  function generateLocalReferralData(p: PalliativePatientInfo, dept: ReferralTargetDepartment) {
    const nd = '-';
    const fullContent = `ALASAN RUJUKAN
Pasien ${p.patientName || nd} dengan diagnosa ${p.primaryDiagnosis || nd} (${p.diseaseStage || nd}) memerlukan evaluasi dan tindakan lanjutan oleh bagian ${getDeptLabel(dept)}. Kondisi pasien saat ini berada dalam tingkat risiko ${p.riskLevel} dengan status perawatan ${p.careStatus}.

RINGKASAN KONDISI KLINIS
- Diagnosa Utama: ${p.primaryDiagnosis || nd}
- Diagnosa Penyerta: ${p.secondaryDiagnosis || nd}
- Stadium: ${p.diseaseStage || nd}
- Status Perawatan: ${p.careStatus}
- Tingkat Risiko: ${p.riskLevel}
- Terapi paliatif sedang berjalan

PERMINTAAN KONSULTASI
Mohon evaluasi dan penanganan lebih lanjut terkait kondisi pasien oleh bagian ${getDeptLabel(dept)}. Diperlukan penilaian menyeluruh dan rekomendasi tindakan medis.`;

    return {
      referralReason: `Pasien dengan diagnosa ${p.primaryDiagnosis || nd} memerlukan evaluasi lanjutan oleh ${getDeptLabel(dept)}.`,
      clinicalSummary: `Diagnosa: ${p.primaryDiagnosis || nd}, Stadium: ${p.diseaseStage || nd}, Risiko: ${p.riskLevel}`,
      consultationRequest: `Mohon evaluasi dan penanganan lebih lanjut oleh ${getDeptLabel(dept)}.`,
      fullContent,
    };
  }

  // ── Data extraction helpers ──
  const resumeDataPasien = selectedResume?.dataPasien as PalliativeResumeDataPasien | undefined;
  const resumeTtv = selectedResume?.ttvSerial;
  const resumeKeluhan = selectedResume?.keluhanHarian as PalliativeResumeKeluhan | undefined;
  const resumeSkrining = selectedResume?.skriningPaliatif as Record<string, unknown[]> | undefined;
  const resumeEsas = selectedResume?.esasScores as { skorAwal: EsasScoreEntry | null; skorTertinggi: EsasScoreEntry | null; skorTerakhir: EsasScoreEntry | null } | undefined;
  const resumeObat = selectedResume?.obat as Record<string, unknown> | undefined;
  const resumeNutrisi = selectedResume?.nutrisi as { catatan?: unknown[]; ringkasan?: string } | undefined;
  const resumeSosial = selectedResume?.sosial as { penilaianSosial?: unknown[]; caregiver?: unknown[]; pertemuanKeluarga?: unknown[]; dukunganKeuangan?: unknown[]; ringkasan?: string } | undefined;
  const resumeAcp = selectedResume?.acp as { dokumen?: unknown[]; ringkasan?: string } | undefined;
  const resumeAiAnalysis = selectedResume?.aiAnalysis as PalliativeResumeAIAnalysis | undefined;

  // ── Render ──
  if (!patient) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium mb-2">Resume Medis & Surat Rujukan AI</p>
        <p className="text-sm">Pilih pasien terlebih dahulu untuk mengelola dokumen medis.</p>
      </Card>
    );
  }

  // ── Resume Tab Content ──
  const renderResumeContent = () => {
    if (!selectedResume) {
      if (patientResumes.length > 0) {
        return (
          <Card className="p-6 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Klik pada resume di riwayat untuk melihat detail.</p>
          </Card>
        );
      }
      return (
        <Card className="p-8 text-center text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-2">Belum Ada Resume Medis</p>
          <p className="text-sm mb-4">
            Klik &quot;Generate Resume AI&quot; untuk membuat resume medis otomatis dari seluruh data pasien.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto text-sm">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Data Pasien</div>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />TTV Serial</div>
            <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary" />Keluhan Harian</div>
            <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-primary" />Skrining Paliatif</div>
            <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" />ESAS Score</div>
            <div className="flex items-center gap-2"><Pill className="w-4 h-4 text-primary" />Terapi Obat</div>
            <div className="flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Nutrisi</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Sosial</div>
            <div className="flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" />ACP</div>
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />AI Analisis</div>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-4" ref={resumeContentRef}>
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b pb-3 -mx-1 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPdf('resume', selectedResume.id)}
              disabled={downloading}
              className="gap-1.5"
            >
              {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint('resume', selectedResume.id)}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSendDocType('resume'); setSendDocId(selectedResume.id); setShowSendDialog(true); }}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAsFinal}
              disabled={savingFinal}
              className="gap-1.5 bg-[#2D8C7A] hover:bg-[#247A6A]"
            >
              {savingFinal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save as Final
            </Button>
            {!selectedResume.isSigned && (
              <Button
                size="sm"
                onClick={() => { setSignDocType('resume'); setSignDocId(selectedResume.id); setShowSignDialog(true); }}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tanda Tangan
              </Button>
            )}
            {selectedResume.isSigned && (
              <Badge className="bg-green-100 text-green-800 border border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ditandatangani
              </Badge>
            )}
          </div>
        </div>

        {/* Resume Document */}
        <Card className="overflow-hidden">
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-[#2D8C7A] to-[#6DB8A8] text-white p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-sm font-bold">C</div>
                  <span className="text-sm font-medium opacity-80">CareLivia</span>
                </div>
                <h2 className="text-xl font-bold tracking-wide">RESUME MEDIS TELEPALIATIF</h2>
                <div className="flex items-center gap-3 mt-1 text-sm opacity-90">
                  <span>No. {selectedResume.documentNumber}</span>
                  <span>|</span>
                  <span>v{selectedResume.version}</span>
                  <span>|</span>
                  <span>{formatDate(selectedResume.generatedAt)}</span>
                </div>
              </div>
              <div className="text-right text-sm opacity-90">
                <p className="font-medium">{selectedResume.doctorName || '-'}</p>
                <p>DPJP{selectedResume.doctorSip ? ` • SIP: ${selectedResume.doctorSip}` : ''}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {resumeDataPasien?.tingkatRisiko && (
                    <Badge className={cn(
                      'text-[10px] border',
                      resumeDataPasien.tingkatRisiko === 'merah' ? 'bg-red-200/80 text-red-900 border-red-400' :
                      resumeDataPasien.tingkatRisiko === 'kuning' ? 'bg-amber-200/80 text-amber-900 border-amber-400' :
                      'bg-green-200/80 text-green-900 border-green-400'
                    )}>
                      Risiko: {resumeDataPasien.tingkatRisiko}
                    </Badge>
                  )}
                  {resumeDataPasien?.statusPerawatan && (
                    <Badge className="bg-white/20 text-white border border-white/30 text-[10px]">
                      {resumeDataPasien.statusPerawatan}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Scrollable Content ── */}
          <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-5 space-y-5">

            {/* ═══ Section 1: DATA PASIEN ═══ */}
            <SectionCard
              title="DATA PASIEN"
              icon={<FileText className="w-4 h-4 text-[#2D8C7A]" />}
              accentColor="#2D8C7A"
            >
              <Table>
                <TableBody>
                  {[
                    ['Nama', resumeDataPasien?.nama || selectedResume.patientName],
                    ['No. RM', resumeDataPasien?.noRM || selectedResume.rmNumber],
                    ['NIK', resumeDataPasien?.nik],
                    ['Tanggal Lahir', resumeDataPasien?.tanggalLahir ? formatDate(resumeDataPasien.tanggalLahir) : null],
                    ['Umur', resumeDataPasien?.umur],
                    ['Jenis Kelamin', resumeDataPasien?.jenisKelamin],
                    ['No. BPJS', resumeDataPasien?.noBPJS],
                    ['Alamat', resumeDataPasien?.alamat],
                    ['No. Telepon', resumeDataPasien?.noTelepon],
                    ['Diagnosa Utama', resumeDataPasien?.diagnosaUtama || patient.primaryDiagnosis],
                    ['Diagnosa Penyerta', resumeDataPasien?.diagnosaPenyerta || patient.secondaryDiagnosis],
                    ['DPJP', resumeDataPasien?.dpjp ? `${resumeDataPasien.dpjp}${resumeDataPasien.dpjpSpesialisasi ? ` (${resumeDataPasien.dpjpSpesialisasi})` : ''}` : null],
                    ['Tanggal Registrasi', resumeDataPasien?.tanggalRegistrasi ? formatDate(resumeDataPasien.tanggalRegistrasi) : null],
                  ].map(([label, value], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-xs text-muted-foreground w-40 whitespace-nowrap">{label}</TableCell>
                      <TableCell className="text-sm">{nullish(value)}</TableCell>
                    </TableRow>
                  ))}
                  {resumeDataPasien?.kontakKeluarga && (
                    <TableRow>
                      <TableCell className="font-medium text-xs text-muted-foreground">Kontak Keluarga</TableCell>
                      <TableCell className="text-sm">
                        {nullish(resumeDataPasien.kontakKeluarga.nama)}
                        {resumeDataPasien.kontakKeluarga.hubungan && ` (${resumeDataPasien.kontakKeluarga.hubungan})`}
                        {resumeDataPasien.kontakKeluarga.telepon && ` • ${resumeDataPasien.kontakKeluarga.telepon}`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </SectionCard>

            {/* ═══ Section 2: TTV SERIAL ═══ */}
            <SectionCard
              title="TTV SERIAL"
              icon={<Activity className="w-4 h-4 text-[#2D8C7A]" />}
              accentColor="#2D8C7A"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* TTV Awal */}
                {renderTtvCard('TTV Awal', resumeTtv?.ttvAwal as PalliativeResumeTTVRecord | null, '#22c55e', 'awal')}
                {/* TTV Kritis */}
                {renderTtvCard('TTV Kritis', resumeTtv?.ttvKritis as PalliativeResumeTTVRecord | null, '#ef4444', 'kritis')}
                {/* TTV Terakhir */}
                {renderTtvCard('TTV Terakhir', resumeTtv?.ttvTerakhir as PalliativeResumeTTVRecord | null, '#3b82f6', 'terakhir')}
              </div>
              {!resumeTtv?.ttvAwal && !resumeTtv?.ttvKritis && !resumeTtv?.ttvTerakhir && (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data TTV</p>
              )}
            </SectionCard>

            {/* ═══ Section 3: KELUHAN HARIAN ═══ */}
            <SectionCard
              title="KELUHAN HARIAN"
              icon={<Heart className="w-4 h-4 text-[#D9B26F]" />}
              accentColor="#D9B26F"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {renderKeluhanCard('Keluhan Awal', resumeKeluhan?.keluhanAwal as KeluhanEntry | null, '#6b7280')}
                {renderKeluhanCard('Keluhan Terberat', resumeKeluhan?.keluhanTerberat as KeluhanEntry | null, '#ef4444')}
                {renderKeluhanCard('Keluhan Terakhir', resumeKeluhan?.keluhanTerakhir as KeluhanEntry | null, '#14b8a6')}
              </div>
              {resumeKeluhan?.analisis && (
                <div className="mt-4 p-3 bg-[#2D8C7A]/5 rounded-lg border border-[#2D8C7A]/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#2D8C7A]" />
                    <span className="text-xs font-semibold text-[#2D8C7A]">Analisis Frekuensi Gejala</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{resumeKeluhan.analisis}</p>
                </div>
              )}
              {!resumeKeluhan?.keluhanAwal && !resumeKeluhan?.keluhanTerberat && !resumeKeluhan?.keluhanTerakhir && !resumeKeluhan?.analisis && (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data Keluhan</p>
              )}
            </SectionCard>

            {/* ═══ Section 4: SKRINING PALIATIF ═══ */}
            <SectionCard
              title="SKRINING PALIATIF"
              icon={<Brain className="w-4 h-4 text-[#8B5CF6]" />}
              accentColor="#8B5CF6"
            >
              {resumeAiAnalysis?.ringkasanSkrining ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Domain Fisik', content: resumeAiAnalysis.ringkasanSkrining.domainFisik, icon: <Activity className="w-4 h-4" />, color: '#22c55e' },
                    { title: 'Domain Psikologis', content: resumeAiAnalysis.ringkasanSkrining.domainPsikologis, icon: <Brain className="w-4 h-4" />, color: '#8B5CF6' },
                    { title: 'Domain Sosial', content: resumeAiAnalysis.ringkasanSkrining.domainSosial, icon: <Users className="w-4 h-4" />, color: '#3b82f6' },
                    { title: 'Domain Spiritual', content: resumeAiAnalysis.ringkasanSkrining.domainSpiritual, icon: <Heart className="w-4 h-4" />, color: '#D9B26F' },
                    { title: 'Kebutuhan Edukasi', content: resumeAiAnalysis.ringkasanSkrining.kebutuhanEdukasi, icon: <FileCheck className="w-4 h-4" />, color: '#f59e0b' },
                    { title: 'Beban Caregiver', content: resumeAiAnalysis.ringkasanSkrining.bebanCaregiver, icon: <AlertTriangle className="w-4 h-4" />, color: '#ef4444' },
                  ].map((domain) => (
                    <div key={domain.title} className="rounded-lg border p-3" style={{ borderLeftWidth: '3px', borderLeftColor: domain.color }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span style={{ color: domain.color }}>{domain.icon}</span>
                        <span className="text-xs font-semibold">{domain.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{domain.content || 'Tidak Ada Data'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {resumeSkrining && Object.keys(resumeSkrining).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(resumeSkrining).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <span className="font-medium capitalize">{key}</span>
                          <Badge variant="outline" className="text-[10px]">{Array.isArray(value) ? `${value.length} record(s)` : 'N/A'}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data Skrining</p>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ═══ Section 5: ESAS ═══ */}
            <SectionCard
              title="ESAS (Edmonton Symptom Assessment System)"
              icon={<Gauge className="w-4 h-4 text-[#2D8C7A]" />}
              accentColor="#2D8C7A"
            >
              {resumeEsas?.skorAwal || resumeEsas?.skorTertinggi || resumeEsas?.skorTerakhir ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Parameter</TableHead>
                        <TableHead className="text-xs text-center">Skor Awal</TableHead>
                        <TableHead className="text-xs text-center">Skor Tertinggi</TableHead>
                        <TableHead className="text-xs text-center">Skor Terakhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: 'Nyeri', awal: resumeEsas.skorAwal?.nyeri, tinggi: resumeEsas.skorTertinggi?.nyeri, akhir: resumeEsas.skorTerakhir?.nyeri },
                        { label: 'Kelelahan', awal: resumeEsas.skorAwal?.kelelahan, tinggi: resumeEsas.skorTertinggi?.kelelahan, akhir: resumeEsas.skorTerakhir?.kelelahan },
                        { label: 'Mengantuk', awal: resumeEsas.skorAwal?.mengantuk, tinggi: resumeEsas.skorTertinggi?.mengantuk, akhir: resumeEsas.skorTerakhir?.mengantuk },
                        { label: 'Mual', awal: resumeEsas.skorAwal?.mual, tinggi: resumeEsas.skorTertinggi?.mual, akhir: resumeEsas.skorTerakhir?.mual },
                        { label: 'Nafsu Makan', awal: resumeEsas.skorAwal?.nafsuMakan, tinggi: resumeEsas.skorTertinggi?.nafsuMakan, akhir: resumeEsas.skorTerakhir?.nafsuMakan },
                        { label: 'Sesak', awal: resumeEsas.skorAwal?.sesak, tinggi: resumeEsas.skorTertinggi?.sesak, akhir: resumeEsas.skorTerakhir?.sesak },
                        { label: 'Kecemasan', awal: resumeEsas.skorAwal?.kecemasan, tinggi: resumeEsas.skorTertinggi?.kecemasan, akhir: resumeEsas.skorTerakhir?.kecemasan },
                        { label: 'Depresi', awal: resumeEsas.skorAwal?.depresi, tinggi: resumeEsas.skorTertinggi?.depresi, akhir: resumeEsas.skorTerakhir?.depresi },
                        { label: 'Kesejahteraan Umum', awal: resumeEsas.skorAwal?.kesejahteraan, tinggi: resumeEsas.skorTertinggi?.kesejahteraan, akhir: resumeEsas.skorTerakhir?.kesejahteraan },
                      ].map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="text-sm font-medium">{row.label}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', getEsasColor(row.awal))}>
                              {row.awal != null ? row.awal : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', getEsasColor(row.tinggi))}>
                              {row.tinggi != null ? row.tinggi : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', getEsasColor(row.akhir))}>
                              {row.akhir != null ? row.akhir : '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Score Row */}
                      <TableRow className="border-t-2">
                        <TableCell className="text-sm font-bold">Total Skor</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm">{resumeEsas.skorAwal?.score != null ? resumeEsas.skorAwal.score : '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm">{resumeEsas.skorTertinggi?.score != null ? resumeEsas.skorTertinggi.score : '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm">{resumeEsas.skorTerakhir?.score != null ? resumeEsas.skorTerakhir.score : '-'}</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> 0–3 Ringan</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> 4–6 Sedang</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> 7–10 Berat</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data ESAS</p>
              )}
            </SectionCard>

            {/* ═══ Section 6: TERAPI OBAT ═══ */}
            <SectionCard
              title="TERAPI OBAT"
              icon={<Pill className="w-4 h-4 text-[#D9B26F]" />}
              accentColor="#D9B26F"
            >
              {resumeObat ? (
                <div className="space-y-4">
                  {/* Analgesik */}
                  {renderMedicationTable('Analgesik', resumeObat.analgesik as MedicationEntry[] | undefined, '#ef4444')}

                  {/* Obat Simtomatik */}
                  {(resumeObat.simtomatik as Record<string, MedicationEntry[]>) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Obat Simtomatik</h4>
                      {Object.entries(resumeObat.simtomatik as Record<string, MedicationEntry[]>).map(([category, meds]) => (
                        <div key={category}>
                          {renderMedicationTable(category.charAt(0).toUpperCase() + category.slice(1), meds, '#3b82f6')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Obat Lainnya */}
                  {renderMedicationTable('Obat Lainnya', resumeObat.obatLainnya as MedicationEntry[] | undefined, '#6b7280')}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Kepatuhan</div>
                      <p className="text-sm">{nullish(resumeObat.kepatuhan)}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Perubahan Regimen</div>
                      <p className="text-sm">{nullish(resumeObat.perubahanRegimen)}</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Respons Terapi</div>
                      <p className="text-sm">{nullish(resumeObat.responsTerapi)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data Terapi Obat</p>
              )}
            </SectionCard>

            {/* ═══ Section 7: NUTRISI ═══ */}
            <SectionCard
              title="NUTRISI"
              icon={<Apple className="w-4 h-4 text-[#22c55e]" />}
              accentColor="#22c55e"
            >
              {resumeNutrisi?.catatan || resumeNutrisi?.ringkasan || resumeAiAnalysis?.ringkasanNutrisi ? (
                <div className="space-y-3">
                  {/* Actual nutrition records */}
                  {resumeNutrisi?.catatan && Array.isArray(resumeNutrisi.catatan) && resumeNutrisi.catatan.length > 0 && (
                    renderGenericRecords(resumeNutrisi.catatan, 'Catatan Nutrisi')
                  )}
                  {/* AI Summary */}
                  {(resumeAiAnalysis?.ringkasanNutrisi || resumeNutrisi?.ringkasan) && (
                    <div className="p-3 bg-[#22c55e]/5 rounded-lg border border-[#22c55e]/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
                        <span className="text-xs font-semibold text-[#22c55e]">Ringkasan Nutrisi AI</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {resumeAiAnalysis?.ringkasanNutrisi || resumeNutrisi?.ringkasan}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data Nutrisi</p>
              )}
            </SectionCard>

            {/* ═══ Section 8: SOSIAL ═══ */}
            <SectionCard
              title="SOSIAL"
              icon={<Users className="w-4 h-4 text-[#3b82f6]" />}
              accentColor="#3b82f6"
            >
              {resumeSosial?.penilaianSosial || resumeSosial?.caregiver || resumeSosial?.pertemuanKeluarga || resumeSosial?.dukunganKeuangan || resumeSosial?.ringkasan || resumeAiAnalysis?.ringkasanSosial ? (
                <div className="space-y-3">
                  {/* Penilaian Sosial */}
                  {resumeSosial?.penilaianSosial && Array.isArray(resumeSosial.penilaianSosial) && resumeSosial.penilaianSosial.length > 0 && (
                    renderGenericRecords(resumeSosial.penilaianSosial, 'Penilaian Sosial')
                  )}
                  {/* Caregiver */}
                  {resumeSosial?.caregiver && Array.isArray(resumeSosial.caregiver) && resumeSosial.caregiver.length > 0 && (
                    renderGenericRecords(resumeSosial.caregiver, 'Caregiver')
                  )}
                  {/* Pertemuan Keluarga */}
                  {resumeSosial?.pertemuanKeluarga && Array.isArray(resumeSosial.pertemuanKeluarga) && resumeSosial.pertemuanKeluarga.length > 0 && (
                    renderGenericRecords(resumeSosial.pertemuanKeluarga, 'Pertemuan Keluarga')
                  )}
                  {/* Dukungan Keuangan */}
                  {resumeSosial?.dukunganKeuangan && Array.isArray(resumeSosial.dukunganKeuangan) && resumeSosial.dukunganKeuangan.length > 0 && (
                    renderGenericRecords(resumeSosial.dukunganKeuangan, 'Dukungan Keuangan')
                  )}
                  {/* AI Summary */}
                  {(resumeAiAnalysis?.ringkasanSosial || resumeSosial?.ringkasan) && (
                    <div className="p-3 bg-[#3b82f6]/5 rounded-lg border border-[#3b82f6]/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
                        <span className="text-xs font-semibold text-[#3b82f6]">Ringkasan Sosial AI</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {resumeAiAnalysis?.ringkasanSosial || resumeSosial?.ringkasan}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data Sosial</p>
              )}
            </SectionCard>

            {/* ═══ Section 9: ACP ═══ */}
            <SectionCard
              title="ADVANCE CARE PLANNING (ACP)"
              icon={<ScrollText className="w-4 h-4 text-[#D9B26F]" />}
              accentColor="#D9B26F"
            >
              {resumeAcp?.dokumen || resumeAcp?.ringkasan || resumeAiAnalysis?.ringkasanACP ? (
                <div className="space-y-3">
                  {/* ACP Documents */}
                  {resumeAcp?.dokumen && Array.isArray(resumeAcp.dokumen) && resumeAcp.dokumen.length > 0 && (
                    <div className="space-y-3 mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dokumen ACP ({resumeAcp.dokumen.length})</h4>
                      {resumeAcp.dokumen.map((doc, idx) => {
                        if (typeof doc !== 'object' || doc === null) return null;
                        return renderAcpDocument(doc as Record<string, unknown>, idx);
                      })}
                    </div>
                  )}
                  {/* AI Summary */}
                  {(resumeAiAnalysis?.ringkasanACP || resumeAcp?.ringkasan) && (
                    <div className="p-3 bg-[#D9B26F]/5 rounded-lg border border-[#D9B26F]/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#D9B26F]" />
                        <span className="text-xs font-semibold text-[#D9B26F]">Ringkasan ACP AI</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {resumeAiAnalysis?.ringkasanACP || resumeAcp?.ringkasan}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data ACP</p>
              )}
            </SectionCard>

            {/* ═══ Section 10: AI ANALISIS ═══ */}
            <SectionCard
              title="AI ANALISIS"
              icon={<Sparkles className="w-4 h-4 text-[#2D8C7A]" />}
              accentColor="#2D8C7A"
            >
              {resumeAiAnalysis ? (
                <div className="space-y-4">
                  {/* Ringkasan Perjalanan Klinis */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#2D8C7A]" />
                      <Label className="text-xs font-semibold">Ringkasan Perjalanan Klinis</Label>
                    </div>
                    <Textarea
                      value={editRingkasanPerjalananKlinis}
                      onChange={(e) => setEditRingkasanPerjalananKlinis(e.target.value)}
                      className="min-h-[100px] text-sm resize-y"
                      placeholder="Ringkasan perjalanan klinis pasien..."
                    />
                  </div>

                  {/* Identifikasi Kondisi Kritis */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <Label className="text-xs font-semibold">Identifikasi Kondisi Kritis</Label>
                    </div>
                    <Textarea
                      value={editIdentifikasiKondisiKritis}
                      onChange={(e) => setEditIdentifikasiKondisiKritis(e.target.value)}
                      className="min-h-[100px] text-sm resize-y"
                      placeholder="Identifikasi kondisi kritis pasien..."
                    />
                  </div>

                  {/* Analisis Tren Pasien */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      <Label className="text-xs font-semibold">Analisis Tren Pasien</Label>
                      {(() => {
                        const badge = getTrendBadge(editAnalisisTrenPasien);
                        return editAnalisisTrenPasien ? (
                          <Badge variant="outline" className={cn('text-[10px] ml-1', badge.className)}>
                            {badge.label}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <Textarea
                      value={editAnalisisTrenPasien}
                      onChange={(e) => setEditAnalisisTrenPasien(e.target.value)}
                      className="min-h-[100px] text-sm resize-y"
                      placeholder="Analisis tren pasien..."
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak Ada Data AI Analisis</p>
              )}
            </SectionCard>

            {/* ═══ Section 11: KESIMPULAN TELEPALIATIF ═══ */}
            {resumeAiAnalysis?.kesimpulanTelepaliatif && (
              <SectionCard
                title="KESIMPULAN TELEPALIATIF"
                icon={<FileCheck className="w-4 h-4 text-[#2D8C7A]" />}
                accentColor="#2D8C7A"
              >
                <Table>
                  <TableBody>
                    {Object.entries(resumeAiAnalysis.kesimpulanTelepaliatif).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium text-xs text-muted-foreground w-48 whitespace-nowrap">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </TableCell>
                        <TableCell className="text-sm">{nullish(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            )}

            {/* ═══ Section 12: REKOMENDASI ═══ */}
            {resumeAiAnalysis?.rekomendasi && resumeAiAnalysis.rekomendasi.length > 0 && (
              <SectionCard
                title="REKOMENDASI"
                icon={<Sparkles className="w-4 h-4 text-[#2D8C7A]" />}
                accentColor="#2D8C7A"
              >
                <div className="space-y-2">
                  {resumeAiAnalysis.rekomendasi.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="bg-[#2D8C7A] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Signature Area ── */}
            <div className="border-t pt-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="text-sm">
                  <Badge variant="outline" className="text-[10px]">
                    Unduh: {selectedResume.downloadCount}x | Cetak: {selectedResume.printCount}x
                  </Badge>
                </div>
                {selectedResume.isSigned ? (
                  <div className="flex items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{selectedResume.doctorName || '-'}</p>
                      <p className="text-xs text-muted-foreground">SIP: {selectedResume.doctorSip || '-'}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <QrCode className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">Tanda Tangan Elektronik Terverifikasi</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ditandatangani: {formatDateTime(selectedResume.signedAt)}
                      </p>
                    </div>
                    {resumeQrDataUrl && (
                      <div className="flex flex-col items-center">
                        <img src={resumeQrDataUrl} alt="QR Verifikasi" className="w-[60px] h-[60px]" />
                        <span className="text-[9px] text-muted-foreground mt-0.5">Scan untuk verifikasi</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">Belum ditandatangani</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Version History (below the resume) */}
        {patientResumes.length > 1 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Versi Sebelumnya</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {patientResumes.slice(1).map((r) => (
                <Button
                  key={r.id}
                  variant="outline"
                  size="sm"
                  className={cn('text-xs', selectedResume?.id === r.id && 'ring-2 ring-primary')}
                  onClick={() => setSelectedResume(r)}
                >
                  v{r.version} • {formatDateTime(r.generatedAt)}
                  {r.isSigned ? <CheckCircle2 className="w-3 h-3 ml-1 text-green-500" /> : null}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ── TTV Card renderer ──
  function renderTtvCard(title: string, data: PalliativeResumeTTVRecord | null | undefined, color: string, type: string) {
    if (!data) return null;
    return (
      <div className="rounded-lg border p-3" style={{ borderLeftWidth: '3px', borderLeftColor: color }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color }}>{title}</span>
          <span className="text-[10px] text-muted-foreground">{formatDate(data.tanggal)}</span>
        </div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">TD</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.sistolik != null && data.diastolik != null ? `${data.sistolik}/${data.diastolik}` : '-'} mmHg</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">Nadi</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.nadi != null ? `${data.nadi} x/mnt` : '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">RR</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.rr != null ? `${data.rr} x/mnt` : '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">Suhu</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.suhu != null ? `${data.suhu}°C` : '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">SpO2</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.spo2 != null ? `${data.spo2}%` : '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">BB</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.berat != null ? `${data.berat} kg` : '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-1 text-xs text-muted-foreground">BMI</TableCell>
              <TableCell className="py-1 text-sm text-right">{data.bmi != null ? `${data.bmi}` : '-'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {type === 'kritis' && data.alasanKritis && data.alasanKritis.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.alasanKritis.map((reason, i) => (
              <Badge key={i} className="bg-red-100 text-red-800 border border-red-300 text-[10px]">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                {reason}
              </Badge>
            ))}
          </div>
        )}
        {data.catatan && (
          <p className="mt-2 text-[10px] text-muted-foreground italic">Catatan: {data.catatan}</p>
        )}
      </div>
    );
  }

  // ── Keluhan Card renderer ──
  function renderKeluhanCard(title: string, data: KeluhanEntry | null | undefined, color: string) {
    if (!data) return null;
    return (
      <div className="rounded-lg border p-3" style={{ borderLeftWidth: '3px', borderLeftColor: color }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color }}>{title}</span>
          <div className="flex items-center gap-1.5">
            {data.severityLevel && getSeverityBadge(data.severityLevel)}
            {data.submittedAt && <span className="text-[10px] text-muted-foreground">{formatDate(data.submittedAt)}</span>}
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          {[
            { label: 'Kondisi', value: data.kondisiHariIni, reason: data.alasanKondisi },
            { label: 'Nyeri', value: data.kondisiNyeri },
            { label: 'Sesak', value: data.kondisiSesak },
            { label: 'Makan/Minum', value: data.makanMinum, reason: data.alasanMakanMinum },
            { label: 'Tidur', value: data.tidur, reason: data.alasanTidur },
            { label: 'Masalah Obat', value: data.masalahObat, reason: data.deskripsiMasalahObat },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{item.label}</span>
              <span className="text-sm">{nullish(item.value)}</span>
            </div>
          ))}
          {data.deskripsiKeluhanBaru && (
            <div className="mt-2 p-2 bg-amber-50/50 rounded border border-amber-200/50 text-xs text-amber-800">
              {data.deskripsiKeluhanBaru}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Medication Table renderer ──
  function renderMedicationTable(title: string, meds: MedicationEntry[] | undefined, color: string) {
    if (!meds || !Array.isArray(meds) || meds.length === 0) return null;
    return (
      <div className="mb-3">
        <h5 className="text-xs font-semibold mb-2" style={{ color }}>{title}</h5>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Obat</TableHead>
                <TableHead className="text-[10px]">Dosis</TableHead>
                <TableHead className="text-[10px]">Frekuensi</TableHead>
                <TableHead className="text-[10px]">Rute</TableHead>
                <TableHead className="text-[10px]">Indikasi</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meds.map((med, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{med.medicineName || '-'}</TableCell>
                  <TableCell className="text-xs">{med.dosage || '-'}</TableCell>
                  <TableCell className="text-xs">{med.frequency || '-'}</TableCell>
                  <TableCell className="text-xs">{med.route || '-'}</TableCell>
                  <TableCell className="text-xs">{med.indication || '-'}</TableCell>
                  <TableCell className="text-xs">
                    {med.isActive ? (
                      <Badge className="bg-green-100 text-green-800 border border-green-300 text-[9px]">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">Non-aktif</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2D8C7A]" />
            Resume Medis & Surat Rujukan AI
          </h2>
          <p className="text-sm text-muted-foreground">
            Pasien: {patient.patientName || '-'} ({patient.rmNumber || '-'})
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleGenerateResume}
            disabled={resumeLoading}
            className="gap-1.5 bg-[#2D8C7A] hover:bg-[#247A6A]"
          >
            {resumeLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Resume AI
          </Button>
          {latestResume && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedResume(latestResume); setDocTab('resume'); setTimeout(() => resumeContentRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                className="gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Lihat Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf('resume', latestResume.id)}
                disabled={downloading}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setShowReferralDeptDialog(true)}
            disabled={referralLoading}
            className="gap-1.5"
          >
            {referralLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
            Generate Surat Rujukan
          </Button>
          {latestReferral && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPdf('referral', latestReferral.id)}
              disabled={downloading}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Rujukan PDF
            </Button>
          )}
        </div>
      </div>

      {/* Document Status Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Resume Terakhir</span>
          </div>
          {latestResume ? (
            <div>
              <p className="text-xs font-medium">{latestResume.documentNumber}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(latestResume.generatedAt)}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada</p>
          )}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Rujukan Terakhir</span>
          </div>
          {latestReferral ? (
            <div>
              <p className="text-xs font-medium">{latestReferral.documentNumber}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(latestReferral.generatedAt)}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada</p>
          )}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Status Tanda Tangan</span>
          </div>
          <p className="text-xs font-medium">
            {latestResume?.isSigned ? 'Ditandatangani' : 'Belum ditandatangani'}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Status Rujukan</span>
          </div>
          {latestReferral ? (
            <Badge variant="outline" className={cn('text-[10px]', getReferralStatusLabel(latestReferral.referralStatus).className)}>
              {getReferralStatusLabel(latestReferral.referralStatus).label}
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada rujukan</p>
          )}
        </Card>
      </div>

      {/* Doctor SIP Input */}
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">SIP Dokter:</Label>
        <Input
          value={doctorSip}
          onChange={(e) => setDoctorSip(e.target.value)}
          placeholder="Masukkan nomor SIP untuk tanda tangan..."
          className="max-w-xs h-8 text-sm"
        />
      </div>

      {/* Tab Navigation */}
      <Tabs value={docTab} onValueChange={(v) => setDocTab(v as DocTab)}>
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="resume" className="text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5 mr-1" />
            Resume Medis ({patientResumes.length})
          </TabsTrigger>
          <TabsTrigger value="referral" className="text-xs sm:text-sm">
            <Building2 className="w-3.5 h-3.5 mr-1" />
            Surat Rujukan ({patientReferrals.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <History className="w-3.5 h-3.5 mr-1" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        {/* ═══ Resume Medis Tab ═══ */}
        <TabsContent value="resume" className="mt-4">
          {renderResumeContent()}
        </TabsContent>

        {/* ═══ Surat Rujukan Tab ═══ */}
        <TabsContent value="referral" className="mt-4">
          {selectedReferral ? (
            <div className="space-y-4" ref={referralContentRef}>
              {/* Referral Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf('referral', selectedReferral.id)}
                  disabled={downloading}
                >
                  {downloading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint('referral', selectedReferral.id)}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Cetak Surat Rujukan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSendDocType('referral');
                    setSendDocId(selectedReferral.id);
                    setShowSendDialog(true);
                  }}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Kirim Dokumen
                </Button>
                {!selectedReferral.isSigned && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSignDocType('referral');
                      setSignDocId(selectedReferral.id);
                      setShowSignDialog(true);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Tanda Tangan
                  </Button>
                )}
                <Select
                  value={selectedReferral.referralStatus}
                  onValueChange={(v) => {
                    updatePalliativeReferralLetter(selectedReferral.id, { referralStatus: v as ReferralStatus });
                  }}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_dirujuk">Belum Dirujuk</SelectItem>
                    <SelectItem value="menunggu">Menunggu</SelectItem>
                    <SelectItem value="sudah_dirujuk">Sudah Dirujuk</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Referral Content */}
              <Card className="p-6">
                <div className="space-y-1 mb-4 text-center border-b pb-4">
                  <h2 className="text-lg font-bold">SURAT RUJUKAN RUMAH SAKIT</h2>
                  <p className="text-sm text-muted-foreground">
                    No. Dokumen: {selectedReferral.documentNumber} | Versi: {selectedReferral.version}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tujuan: {getDeptLabel(selectedReferral.targetDepartment)} | Tanggal: {formatDate(selectedReferral.generatedAt)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline" className={getReferralStatusLabel(selectedReferral.referralStatus).className}>
                      {getReferralStatusLabel(selectedReferral.referralStatus).label}
                    </Badge>
                    {selectedReferral.isSigned && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 border">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ditandatangani
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Patient Identity */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Identitas Pasien</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>Nama: <span className="font-medium">{selectedReferral.patientName || '-'}</span></div>
                    <div>No. RM: <span className="font-medium">{selectedReferral.rmNumber || '-'}</span></div>
                    <div>NIK: <span className="font-medium">{selectedReferral.nik || '-'}</span></div>
                    <div>No. BPJS: <span className="font-medium">{selectedReferral.bpjsNumber || '-'}</span></div>
                    <div>Diagnosa Utama: <span className="font-medium">{selectedReferral.primaryDiagnosis}</span></div>
                    <div>Diagnosa Penyerta: <span className="font-medium">{selectedReferral.secondaryDiagnosis || '-'}</span></div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Alasan Rujukan */}
                  <div>
                    <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#2D8C7A]" />
                      Alasan Rujukan
                    </h3>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedReferral.referralReason}
                    </div>
                  </div>

                  {/* Ringkasan Kondisi Klinis */}
                  <div>
                    <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      Ringkasan Kondisi Klinis
                    </h3>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedReferral.clinicalSummary}
                    </div>
                  </div>

                  {/* Permintaan Konsultasi */}
                  <div>
                    <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D9B26F]" />
                      Permintaan Konsultasi
                    </h3>
                    <div className="text-sm whitespace-pre-wrap bg-[#D9B26F]/5 p-3 rounded-lg border border-[#D9B26F]/20">
                      {selectedReferral.consultationRequest}
                    </div>
                  </div>
                </div>

                {/* Signature Area */}
                <div className="mt-6 border-t pt-4 text-right">
                  {selectedReferral.isSigned ? (
                    <div className="space-y-1">
                      <div className="flex items-end justify-end gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{selectedReferral.doctorName || '-'}</p>
                          <p className="text-xs text-muted-foreground">SIP: {selectedReferral.doctorSip || '-'}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <QrCode className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">Tanda Tangan Elektronik Terverifikasi</span>
                          </div>
                        </div>
                        {referralQrDataUrl && (
                          <div className="flex flex-col items-center">
                            <img src={referralQrDataUrl} alt="QR Verifikasi" className="w-[60px] h-[60px]" />
                            <span className="text-[9px] text-muted-foreground mt-0.5">Scan untuk verifikasi</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">Belum ditandatangani</p>
                  )}
                </div>
              </Card>
            </div>
          ) : patientReferrals.length > 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Klik pada surat rujukan di riwayat untuk melihat detail.</p>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-2">Belum Ada Surat Rujukan</p>
              <p className="text-sm mb-4">
                Klik &quot;Generate Surat Rujukan&quot; untuk membuat surat rujukan otomatis berdasarkan kondisi pasien.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* ═══ History Tab ═══ */}
        <TabsContent value="history" className="mt-4">
          <div className="space-y-4">
            {/* Resume History */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2D8C7A]" />
                Riwayat Resume Medis
              </h3>
              {patientResumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada resume medis yang dibuat.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {patientResumes.map((resume) => (
                    <Card
                      key={resume.id}
                      className={cn(
                        'p-3 cursor-pointer hover:shadow-md transition-shadow',
                        selectedResume?.id === resume.id && 'ring-2 ring-[#2D8C7A]'
                      )}
                      onClick={() => {
                        setSelectedResume(resume);
                        setDocTab('resume');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{resume.documentNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(resume.generatedAt)} | v{resume.version} | oleh {resume.generatedBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {resume.isSigned ? (
                            <Badge className="bg-green-100 text-green-800 text-[10px]">Signed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Draft</Badge>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Referral History */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2D8C7A]" />
                Riwayat Surat Rujukan
              </h3>
              {patientReferrals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada surat rujukan yang dibuat.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {patientReferrals.map((letter) => (
                    <Card
                      key={letter.id}
                      className={cn(
                        'p-3 cursor-pointer hover:shadow-md transition-shadow',
                        selectedReferral?.id === letter.id && 'ring-2 ring-[#2D8C7A]'
                      )}
                      onClick={() => {
                        setSelectedReferral(letter);
                        setDocTab('referral');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{letter.documentNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(letter.generatedAt)} | ke {getDeptLabel(letter.targetDepartment)} | v{letter.version}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn('text-[10px]', getReferralStatusLabel(letter.referralStatus).className)}>
                            {getReferralStatusLabel(letter.referralStatus).label}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Document Audit Trail */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-[#2D8C7A]" />
                Audit Trail Dokumen
              </h3>
              {(() => {
                const docAudits = useStore.getState().palliativeDocumentAuditLog
                  .filter((a) => a.patientId === patient.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                if (docAudits.length === 0) {
                  return <p className="text-sm text-muted-foreground">Belum ada aktivitas dokumen.</p>;
                }
                return (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {docAudits.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-muted/50">
                        <div className="mt-0.5">
                          {entry.action === 'generated' && <Sparkles className="w-3.5 h-3.5 text-[#2D8C7A]" />}
                          {entry.action === 'viewed' && <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                          {entry.action === 'signed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                          {entry.action === 'downloaded' && <Download className="w-3.5 h-3.5 text-blue-600" />}
                          {entry.action === 'printed' && <Printer className="w-3.5 h-3.5 text-muted-foreground" />}
                          {entry.action === 'sent_to_chat' && <MessageCircle className="w-3.5 h-3.5 text-teal-600" />}
                          {entry.action === 'sent_to_email' && <Mail className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{entry.details}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDateTime(entry.createdAt)} | oleh {entry.performedBy}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {entry.documentType === 'resume_medis' ? 'Resume' : 'Rujukan'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Referral Department Selection ── */}
      <Dialog open={showReferralDeptDialog} onOpenChange={setShowReferralDeptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Surat Rujukan AI</DialogTitle>
            <DialogDescription>
              Pilih departemen tujuan rujukan untuk {patient.patientName || 'Pasien'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Departemen Tujuan</Label>
              <Select value={targetDept} onValueChange={(v) => setTargetDept(v as ReferralTargetDepartment)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="penyakit_dalam">Penyakit Dalam</SelectItem>
                  <SelectItem value="onkologi">Onkologi</SelectItem>
                  <SelectItem value="neurologi">Neurologi</SelectItem>
                  <SelectItem value="jantung">Jantung / Kardiologi</SelectItem>
                  <SelectItem value="pulmonologi">Pulmonologi</SelectItem>
                  <SelectItem value="geriatri">Geriatri</SelectItem>
                  <SelectItem value="kedokteran_paliatif">Kedokteran Paliatif</SelectItem>
                  <SelectItem value="rehabilitasi_medik">Rehabilitasi Medik</SelectItem>
                  <SelectItem value="rumah_sakit_rujukan_lanjutan">RS Rujukan Lanjutan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReferralDeptDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleGenerateReferral} disabled={referralLoading} className="bg-[#2D8C7A] hover:bg-[#247A6A]">
              {referralLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Surat Rujukan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Send Document ── */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kirim Dokumen</DialogTitle>
            <DialogDescription>
              Pilih metode pengiriman {sendDocType === 'resume' ? 'Resume Medis' : 'Surat Rujukan'}.
            </DialogDescription>
          </DialogHeader>

          {/* Document Info */}
          {(() => {
            const doc = sendDocType === 'resume'
              ? palliativeResumes.find((r) => r.id === sendDocId)
              : palliativeReferralLetters.find((l) => l.id === sendDocId);
            if (!doc) return null;
            return (
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <div className="font-medium">{sendDocType === 'resume' ? 'Resume Medis' : 'Surat Rujukan'}</div>
                <div className="text-muted-foreground">No. {doc.documentNumber} | {formatDate(doc.generatedAt)}</div>
                <div className="text-muted-foreground">Dokter: {doc.doctorName || '-'} | {doc.isSigned ? '✓ Ditandatangani' : 'Belum ditandatangani'}</div>
              </div>
            );
          })()}

          <div className="space-y-2">
            {/* Chat Option */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleSendToChat(sendDocType, sendDocId)}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#2D8C7A]" />
                <div className="text-left">
                  <div className="font-medium">Kirim ke Chat</div>
                  <div className="text-xs text-muted-foreground">Kirim notifikasi dokumen ke chat pasien {patient?.patientName || ''}</div>
                </div>
              </div>
              {(() => {
                const doc = sendDocType === 'resume'
                  ? palliativeResumes.find((r) => r.id === sendDocId)
                  : palliativeReferralLetters.find((l) => l.id === sendDocId);
                return doc?.sentToChatAt ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" /> : null;
              })()}
            </Button>

            {/* WhatsApp Option */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleSendToWhatsApp(sendDocType, sendDocId)}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Kirim ke WhatsApp</div>
                  <div className="text-xs text-muted-foreground">
                    {patient?.familyContactPhone ? `Ke: ${patient.familyContactPhone} (${patient.familyContactRelation || 'Keluarga'})` : 'Nomor telepon keluarga belum tersedia'}
                  </div>
                </div>
              </div>
              {(() => {
                const doc = sendDocType === 'resume'
                  ? palliativeResumes.find((r) => r.id === sendDocId)
                  : palliativeReferralLetters.find((l) => l.id === sendDocId);
                return doc?.sentToWhatsAppAt ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" /> : null;
              })()}
            </Button>

            {/* Email Option */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleSendToEmail(sendDocType, sendDocId)}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Kirim via Email</div>
                  <div className="text-xs text-muted-foreground">Buka klien email dengan subjek dan isi dokumen</div>
                </div>
              </div>
              {(() => {
                const doc = sendDocType === 'resume'
                  ? palliativeResumes.find((r) => r.id === sendDocId)
                  : palliativeReferralLetters.find((l) => l.id === sendDocId);
                return doc?.sentToEmailAt ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" /> : null;
              })()}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSendDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Sign Document ── */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tanda Tangan Elektronik</DialogTitle>
            <DialogDescription>
              Konfirmasi tanda tangan elektronik untuk {signDocType === 'resume' ? 'Resume Medis' : 'Surat Rujukan'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Dengan menandatangani dokumen ini secara elektronik, Anda menyatakan bahwa informasi dalam dokumen ini benar dan dapat dipertanggungjawabkan.
            </div>
            <div>
              <Label>Nomor SIP</Label>
              <Input
                value={doctorSip}
                onChange={(e) => setDoctorSip(e.target.value)}
                placeholder="Masukkan nomor SIP..."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Dokter: {currentUser?.name || '-'}</p>
              <p>Waktu: {formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => handleSignDocument(signDocType, signDocId)}
              disabled={!doctorSip}
              className="bg-[#2D8C7A] hover:bg-[#247A6A]"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Tanda Tangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
