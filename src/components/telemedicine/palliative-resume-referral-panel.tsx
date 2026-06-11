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
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

// ── Types ────────────────────────────────────────────────────────────────

type DocTab = 'resume' | 'referral' | 'history';

// ── Helper Functions ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
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

function formatDateTime(dateStr: string): string {
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
  }
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
        body: JSON.stringify({ palliativePatientId: patient.id }),
      });

      let resumeData;
      if (response.ok) {
        const data = await response.json();
        resumeData = data.resume;
      } else {
        // Fallback: generate locally
        resumeData = generateLocalResumeData(patient);
      }

      const resume: PalliativeResumeMedis = {
        id: genId('resume'),
        palliativePatientId: patient.id,
        patientName: patient.patientName,
        rmNumber: patient.rmNumber,
        documentNumber: genDocNumber('RM-PAL'),
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser?.name || 'Dokter',
        generatedByRole: 'doctor',
        doctorSip: doctorSip || undefined,
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

      // Audit entry
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
      // Fallback
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
  }, [patient, currentUser, doctorSip, latestResume, addPalliativeResume, addPalliativeDocumentAuditEntry, addPalliativeAuditEntry, toast]);

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

    const message = `${docLabel} - ${doc.patientName || 'Pasien'}\n\nNo. Dokumen: ${doc.documentNumber}\nTanggal: ${formatDate(doc.generatedAt)}\nDokter: ${doc.doctorName || '-'}\nStatus: ${doc.isSigned ? 'Ditandatangani secara elektronik' : 'Belum ditandatangani'}\n\nDokumen ini dihasilkan oleh MedikaLink`;
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
    const subject = encodeURIComponent(`[MedikaLink] ${docLabel} - ${doc.patientName || 'Pasien'} - ${doc.documentNumber}`);
    const body = encodeURIComponent(`Kepada Yth.,\n\nBerikut kami sampaikan ${docLabel} untuk pasien ${doc.patientName || '-'} (RM: ${doc.rmNumber || '-'}).\n\nDetail Dokumen:\n- No. Dokumen: ${doc.documentNumber}\n- Tanggal: ${formatDate(doc.generatedAt)}\n- Dokter: ${doc.doctorName || '-'}\n- SIP: ${doc.doctorSip || '-'}\n- Status Tanda Tangan: ${doc.isSigned ? 'Ditandatangani secara elektronik' : 'Belum ditandatangani'}\n- Versi: ${doc.version}\n\nDokumen ini dihasilkan oleh MedikaLink.\nHormat kami,\n${currentUser?.name || 'Dokter'}`);
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
    const fileName = `${docType === 'resume' ? 'Resume_Medis' : 'Surat_Rujukan'}_${doc.patientName || 'Pasien'}_${new Date().toISOString().split('T')[0]}.pdf`;

    try {
      // Try PDF API first
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
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (docType === 'resume') {
          updatePalliativeResume(docId, {
            downloadCount: (doc.downloadCount || 0) + 1,
            lastDownloadAt: new Date().toISOString(),
          });
        } else {
          updatePalliativeReferralLetter(docId, {
            downloadCount: (doc.downloadCount || 0) + 1,
            lastDownloadAt: new Date().toISOString(),
          });
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
      // Fallback to text file download
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
        updatePalliativeResume(docId, {
          downloadCount: (doc.downloadCount || 0) + 1,
          lastDownloadAt: new Date().toISOString(),
        });
      } else {
        updatePalliativeReferralLetter(docId, {
          downloadCount: (doc.downloadCount || 0) + 1,
          lastDownloadAt: new Date().toISOString(),
        });
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
        </div>
        <h1>${docType === 'resume' ? 'RESUME MEDIS PALIATIF' : 'SURAT RUJUKAN'}</h1>
        <div class="content">${doc.fullContent}</div>
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
      updatePalliativeResume(docId, {
        printCount: (doc.printCount || 0) + 1,
        lastPrintAt: new Date().toISOString(),
      });
    } else {
      updatePalliativeReferralLetter(docId, {
        printCount: (doc.printCount || 0) + 1,
        lastPrintAt: new Date().toISOString(),
      });
    }

    addPalliativeDocumentAuditEntry({
      id: genId('docaudit'), documentType: docType === 'resume' ? 'resume_medis' : 'surat_rujukan',
      documentId: docId, patientId: patient?.id || '',
      action: 'printed', performedBy: currentUser?.name || 'Dokter', performedByRole: 'doctor',
      details: `${docType === 'resume' ? 'Resume Medis' : 'Surat Rujukan'} dicetak`, createdAt: new Date().toISOString(),
    });
  }, [palliativeResumes, palliativeReferralLetters, patient, currentUser, updatePalliativeResume, updatePalliativeReferralLetter, addPalliativeDocumentAuditEntry]);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
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
            className="gap-1.5"
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
                Lihat Resume Medis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf('resume', latestResume.id)}
                disabled={downloading}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
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
            Generate Surat Rujukan AI
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
              Download Surat Rujukan PDF
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

        {/* Resume Medis Tab */}
        <TabsContent value="resume" className="mt-4">
          {selectedResume ? (
            <div className="space-y-4" ref={resumeContentRef}>
              {/* Resume Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf('resume', selectedResume.id)}
                  disabled={downloading}
                >
                  {downloading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint('resume', selectedResume.id)}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Cetak Resume
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSendDocType('resume');
                    setSendDocId(selectedResume.id);
                    setShowSendDialog(true);
                  }}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Kirim Dokumen
                </Button>
                {!selectedResume.isSigned && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSignDocType('resume');
                      setSignDocId(selectedResume.id);
                      setShowSignDialog(true);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Tanda Tangan
                  </Button>
                )}
              </div>

              {/* Resume Content */}
              <Card className="p-6">
                <div className="space-y-1 mb-4 text-center border-b pb-4">
                  <h2 className="text-lg font-bold">RESUME MEDIS PALIATIF</h2>
                  <p className="text-sm text-muted-foreground">
                    No. Dokumen: {selectedResume.documentNumber} | Versi: {selectedResume.version}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tanggal: {formatDate(selectedResume.generatedAt)} | Dokter: {selectedResume.doctorName || '-'}
                    {selectedResume.isSigned && ` (SIP: ${selectedResume.doctorSip || '-'})`}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {selectedResume.isSigned && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 border">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ditandatangani
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Unduh: {selectedResume.downloadCount}x | Cetak: {selectedResume.printCount}x
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="max-h-[calc(100vh-520px)]">
                  <div className="space-y-6">
                    {/* Ringkasan Kondisi */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Ringkasan Kondisi Pasien
                      </h3>
                      <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {selectedResume.ringkasanKondisi}
                      </div>
                    </div>

                    {/* Ringkasan Pemeriksaan */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                        Ringkasan Pemeriksaan Terkini
                      </h3>
                      <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {selectedResume.ringkasanPemeriksaan}
                      </div>
                    </div>

                    {/* Ringkasan Terapi */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-amber-600" />
                        Ringkasan Terapi
                      </h3>
                      <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {selectedResume.ringkasanTerapi}
                      </div>
                    </div>

                    {/* Ringkasan ACP */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        Ringkasan Advance Care Planning
                      </h3>
                      <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {selectedResume.ringkasanACP}
                      </div>
                    </div>

                    {/* Kesimpulan Klinis */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Kesimpulan Klinis AI
                      </h3>
                      <div className="text-sm whitespace-pre-wrap bg-red-50/50 p-3 rounded-lg border border-red-200 text-red-900">
                        {selectedResume.kesimpulanKlinis}
                      </div>
                    </div>

                    {/* Rekomendasi AI */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Rekomendasi AI
                      </h3>
                      <div className="space-y-1">
                        {selectedResume.rekomendasiAI?.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Signature Area */}
                <div className="mt-6 border-t pt-4 text-right">
                  {selectedResume.isSigned ? (
                    <div className="space-y-1">
                      <div className="flex items-end justify-end gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{selectedResume.doctorName || '-'}</p>
                          <p className="text-xs text-muted-foreground">SIP: {selectedResume.doctorSip || '-'}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <QrCode className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">Tanda Tangan Elektronik Terverifikasi</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ditandatangani: {selectedResume.signedAt ? formatDateTime(selectedResume.signedAt) : '-'}
                          </p>
                        </div>
                        {resumeQrDataUrl && (
                          <div className="flex flex-col items-center">
                            <img src={resumeQrDataUrl} alt="QR Verifikasi" className="w-[60px] h-[60px]" />
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
          ) : patientResumes.length > 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Klik pada resume di riwayat untuk melihat detail.</p>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-2">Belum Ada Resume Medis</p>
              <p className="text-sm mb-4">
                Klik &quot;Generate Resume AI&quot; untuk membuat resume medis otomatis dari seluruh data pasien.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto text-sm">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Ringkasan Kondisi</div>
                <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" />Pemeriksaan Terkini</div>
                <div className="flex items-center gap-2"><FileCheck className="w-4 h-4 text-primary" />Ringkasan Terapi</div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Advance Care Planning</div>
                <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-primary" />Kesimpulan Klinis</div>
                <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Rekomendasi AI</div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Surat Rujukan Tab */}
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

                <ScrollArea className="max-h-[calc(100vh-600px)]">
                  <div className="space-y-6">
                    {/* Alasan Rujukan */}
                    <div>
                      <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
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
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Permintaan Konsultasi
                      </h3>
                      <div className="text-sm whitespace-pre-wrap bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                        {selectedReferral.consultationRequest}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

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
                Klik &quot;Generate Surat Rujukan AI&quot; untuk membuat surat rujukan otomatis berdasarkan kondisi pasien.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="space-y-4">
            {/* Resume History */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Riwayat Resume Medis
              </h3>
              {patientResumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada resume medis yang dibuat.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patientResumes.map((resume) => (
                    <Card
                      key={resume.id}
                      className={cn(
                        'p-3 cursor-pointer hover:shadow-md transition-shadow',
                        selectedResume?.id === resume.id && 'ring-2 ring-primary'
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
                <Building2 className="w-4 h-4 text-primary" />
                Riwayat Surat Rujukan
              </h3>
              {patientReferrals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada surat rujukan yang dibuat.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patientReferrals.map((letter) => (
                    <Card
                      key={letter.id}
                      className={cn(
                        'p-3 cursor-pointer hover:shadow-md transition-shadow',
                        selectedReferral?.id === letter.id && 'ring-2 ring-primary'
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
                <History className="w-4 h-4 text-primary" />
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
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {docAudits.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-muted/50">
                        <div className="mt-0.5">
                          {entry.action === 'generated' && <Sparkles className="w-3.5 h-3.5 text-primary" />}
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
            <Button onClick={handleGenerateReferral} disabled={referralLoading}>
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
                <MessageCircle className="w-4 h-4 text-primary" />
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
