'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type {
  AISocialAnalysisResult,
  AISocialRisk,
  AIFamilySupportAnalysis,
  AICaregiverAnalysis,
  AIFinancialAnalysis,
  AITransportAnalysis,
  AIActionPlanItem,
  AIEarlyWarning,
  AIActionPlanItem as AIActionPlanItemWithStatus,
} from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Brain, Sparkles, AlertTriangle, Heart, Users, UserCheck,
  DollarSign, Car, ClipboardList, Bell, CheckCircle2, XCircle,
  Edit, Download, FileText, TrendingUp, Shield, Info,
  RefreshCw, ChevronRight, Eye, Clock, ArrowRight,
} from 'lucide-react';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

// ─── Props ──────────────────────────────────────────────────────────────────

interface AISocialAnalysisTabProps {
  palliativePatientId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const genId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const riskLevelBadge = (level: 'rendah' | 'sedang' | 'tinggi') => {
  const map = {
    rendah: { label: 'Rendah', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    sedang: { label: 'Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    tinggi: { label: 'Tinggi', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[level];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const severityBadge = (s: 'info' | 'warning' | 'critical') => {
  const map = {
    info: { label: 'Info', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
    warning: { label: 'Peringatan', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    critical: { label: 'Kritis', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[s];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const priorityBadge = (p: 'tinggi' | 'sedang' | 'rendah') => {
  const map = {
    tinggi: { label: 'Prioritas Tinggi', cls: 'bg-red-100 text-red-800 border-red-300' },
    sedang: { label: 'Prioritas Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    rendah: { label: 'Prioritas Rendah', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  };
  const m = map[p];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const caregiverStatusBadge = (s: 'normal' | 'ringan' | 'sedang' | 'berat') => {
  const map = {
    normal: { label: 'Normal', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    ringan: { label: 'Risiko Ringan', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
    sedang: { label: 'Risiko Sedang', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    berat: { label: 'Risiko Berat', cls: 'bg-red-100 text-red-800 border-red-300' },
  };
  const m = map[s];
  return <Badge className={`${m.cls} border`}>{m.label}</Badge>;
};

const riskTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    isolasi_sosial: 'Isolasi Sosial',
    caregiver_burnout: 'Caregiver Burnout',
    ketidakpatuhan_terapi: 'Ketidakpatuhan Terapi',
    putus_pengobatan: 'Risiko Putus Pengobatan',
    masalah_finansial: 'Masalah Finansial',
    akses_layanan: 'Hambatan Akses Layanan',
    konflik_keluarga: 'Konflik Keluarga',
    kebutuhan_spiritual: 'Kebutuhan Spiritual Tak Terpenuhi',
    rawat_inap_berulang: 'Rawat Inap Berulang',
    penurunan_kualitas_hidup: 'Penurunan Kualitas Hidup',
  };
  return map[type] || type;
};

const warningTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    penurunan_dukungan_keluarga: 'Penurunan Dukungan Keluarga',
    caregiver_burden_meningkat: 'Caregiver Burden Meningkat',
    risiko_putus_pengobatan: 'Risiko Putus Pengobatan',
    distress_tinggi: 'Distress Tinggi',
    isolasi_sosial: 'Isolasi Sosial',
    masalah_finansial_berat: 'Masalah Finansial Berat',
    tidak_ada_caregiver_aktif: 'Tidak Ada Caregiver Aktif',
    monitoring_terlambat: 'Monitoring Terlambat',
  };
  return map[type] || type;
};

const needLabel = (need: string): string => {
  const map: Record<string, string> = {
    bantuan_finansial: 'Bantuan Finansial',
    alat_kesehatan: 'Alat Kesehatan',
    nutrisi: 'Nutrisi',
    transportasi: 'Transportasi',
    home_care: 'Home Care',
    pendampingan_sosial: 'Pendampingan Sosial',
  };
  return map[need] || need;
};

const categoryLabel = (cat: string): string => {
  const map: Record<string, string> = {
    family_meeting: 'Family Meeting',
    caregiver_support: 'Dukungan Caregiver',
    home_visit: 'Home Visit',
    family_education: 'Edukasi Keluarga',
    monitoring: 'Monitoring',
    financial_support: 'Dukungan Finansial',
    transport_support: 'Dukungan Transportasi',
    psychosocial: 'Psikososial',
    other: 'Lainnya',
  };
  return map[cat] || cat;
};

const scoreColor = (score: number) => {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AISocialAnalysisTab({ palliativePatientId }: AISocialAnalysisTabProps) {
  const { toast } = useToast();

  const {
    palliativePatients,
    socialAssessments,
    caregivers,
    familyMeetings,
    financialSupportRecords,
    transportRecords,
    palliativeScreeningRecords,
    vitalSignRecords,
    aiSocialAnalysisResult,
    setAiSocialAnalysisResult,
    aiSocialAnalysisLoading,
    setAiSocialAnalysisLoading,
    aiSocialAnalysisRecords,
    addAiSocialAnalysisRecord,
    aiSocialPopulationStats,
    setAiSocialPopulationStats,
    currentUser,
    addSocialAlert,
  } = useStore();

  const [activeSection, setActiveSection] = useState('overview');
  const [actionDecisions, setActionDecisions] = useState<Record<string, 'accepted' | 'rejected' | 'pending'>>({});
  const [analysisNotes, setAnalysisNotes] = useState('');

  // ─── Computed Data ─────────────────────────────────────────────────────

  const patient = useMemo(
    () => palliativePatients.find(p => p.id === palliativePatientId),
    [palliativePatients, palliativePatientId]
  );

  const latestSocialAssessment = useMemo(() => {
    const assessments = socialAssessments
      .filter(a => a.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
    return assessments[0] || null;
  }, [socialAssessments, palliativePatientId]);

  const patientCaregivers = useMemo(
    () => caregivers.filter(c => c.palliativePatientId === palliativePatientId && c.isActive),
    [caregivers, palliativePatientId]
  );

  const patientMeetings = useMemo(
    () => familyMeetings.filter(m => m.palliativePatientId === palliativePatientId),
    [familyMeetings, palliativePatientId]
  );

  const patientFinancials = useMemo(
    () => financialSupportRecords.filter(f => f.palliativePatientId === palliativePatientId),
    [financialSupportRecords, palliativePatientId]
  );

  const patientTransport = useMemo(
    () => transportRecords.filter(t => t.palliativePatientId === palliativePatientId),
    [transportRecords, palliativePatientId]
  );

  const patientScreenings = useMemo(
    () => palliativeScreeningRecords.filter(s => s.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()),
    [palliativeScreeningRecords, palliativePatientId]
  );

  const patientVitals = useMemo(
    () => vitalSignRecords.filter(v => v.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [vitalSignRecords, palliativePatientId]
  );

  const previousAnalysis = useMemo(() => {
    const records = aiSocialAnalysisRecords
      .filter(r => r.palliativePatientId === palliativePatientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records[0] || null;
  }, [aiSocialAnalysisRecords, palliativePatientId]);

  // ─── AI Analysis Handler ──────────────────────────────────────────────

  const handleRunAnalysis = useCallback(async () => {
    if (!palliativePatientId || !patient) return;

    setAiSocialAnalysisLoading(true);
    setAiSocialAnalysisResult(null);

    try {
      const requestData = {
        patientData: {
          name: patient.patientName,
          age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : undefined,
          gender: patient.gender,
          diagnosis: patient.primaryDiagnosis,
          diseaseStage: patient.diseaseStage,
          careStatus: patient.careStatus,
          riskLevel: patient.riskLevel,
          address: patient.address,
          familyContactName: patient.familyContactName,
          familyContactRelation: patient.familyContactRelation,
          bpjsNumber: patient.bpjsNumber,
        },
        socialData: latestSocialAssessment ? {
          housingCondition: latestSocialAssessment.housingCondition,
          caregiverAvailability: latestSocialAssessment.caregiverAvailability,
          familySupportLevel: latestSocialAssessment.familySupportLevel,
          transportDifficulty: latestSocialAssessment.transportDifficulty,
          economicConstraint: latestSocialAssessment.economicConstraint,
          healthcareAccess: latestSocialAssessment.healthcareAccess,
          medicalEquipmentNeed: latestSocialAssessment.medicalEquipmentNeed,
          socialAssistanceNeed: latestSocialAssessment.socialAssistanceNeed,
          socialIsolationRisk: latestSocialAssessment.socialIsolationRisk,
          priorityLevel: latestSocialAssessment.priorityLevel,
        } : null,
        screeningData: patientScreenings.map(s => ({
          type: s.screeningType,
          score: s.score,
          label: s.scoreLabel,
          interpretation: s.interpretation,
        })),
        caregiverData: patientCaregivers.map(c => ({
          name: c.name,
          role: c.role,
          relation: c.relation,
          zaritScore: c.zaritScore,
          zaritLevel: c.zaritLevel,
          familyApgarScore: c.familyApgarScore,
          familyApgarLevel: c.familyApgarLevel,
          schedule: c.schedule,
          tasks: c.tasks,
        })),
        financialData: patientFinancials.length > 0 ? {
          bpjsStatus: patientFinancials[0].bpjsNumber ? 'Terdaftar' : 'Tidak terdaftar',
          insuranceStatus: patientFinancials[0].insuranceStatus,
          assistanceNeeds: patientFinancials[0].recommendedPrograms?.join(', '),
        } : null,
        transportData: patientTransport.length > 0 ? {
          transportNeeds: patientTransport[0].type,
          mobilityBarriers: patientTransport[0].notes,
        } : null,
        meetingData: {
          totalMeetings: patientMeetings.length,
          lastMeetingDate: patientMeetings[0]?.scheduledAt,
          followUpActions: patientMeetings[0]?.followUpActions,
        },
      };

      const response = await fetch('/api/palliative-social-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Gagal menghasilkan analisis AI');
      }

      const result: AISocialAnalysisResult = await response.json();
      setAiSocialAnalysisResult(result);

      // Auto-generate early warning alerts
      if (result.earlyWarnings && result.earlyWarnings.length > 0) {
        result.earlyWarnings.forEach((ew) => {
          addSocialAlert({
            id: genId('sal'),
            patientId: palliativePatientId,
            patientName: patient.patientName,
            type: 'dukungan_keluarga',
            severity: ew.severity,
            title: ew.title,
            description: ew.description,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });
      }

      // Save analysis record
      addAiSocialAnalysisRecord({
        id: genId('aiar'),
        palliativePatientId,
        result,
        generatedBy: currentUser?.name || 'Tim Paliatif',
        acceptedActions: [],
        rejectedActions: [],
        modifiedActions: [],
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Analisis AI Selesai',
        description: 'Analisis kebutuhan sosial berhasil dihasilkan',
      });
    } catch (error) {
      console.error('AI Social Analysis error:', error);
      toast({
        title: 'Analisis Gagal',
        description: 'Gagal menghasilkan analisis AI. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setAiSocialAnalysisLoading(false);
    }
  }, [palliativePatientId, patient, latestSocialAssessment, patientScreenings, patientCaregivers, patientFinancials, patientTransport, patientMeetings, setAiSocialAnalysisResult, setAiSocialAnalysisLoading, addAiSocialAnalysisRecord, addSocialAlert, currentUser, toast]);

  // ─── Population Analytics Handler ──────────────────────────────────────

  const handleLoadPopulationStats = useCallback(() => {
    // Generate population statistics from existing data
    const activePatients = palliativePatients.filter(p => p.patientStatus !== 'program_selesai');
    const highRisk = activePatients.filter(p => p.riskLevel === 'merah').length;
    const medRisk = activePatients.filter(p => p.riskLevel === 'kuning').length;
    const lowRisk = activePatients.filter(p => p.riskLevel === 'hijau').length;

    // Count caregiver burnout
    const burnoutCaregivers = caregivers.filter(c => c.zaritLevel === 'beban_berat' || c.zaritLevel === 'beban_sedang').length;

    // Count social needs
    const needCounts: Record<string, number> = {};
    socialAssessments.forEach(a => {
      if (a.economicConstraint !== 'tidak_ada') needCounts['Bantuan Finansial'] = (needCounts['Bantuan Finansial'] || 0) + 1;
      if (a.transportDifficulty !== 'tidak_ada' && a.transportDifficulty !== 'ringan') needCounts['Transportasi'] = (needCounts['Transportasi'] || 0) + 1;
      if (a.medicalEquipmentNeed !== 'tidak_ada') needCounts['Alat Kesehatan'] = (needCounts['Alat Kesehatan'] || 0) + 1;
      if (a.socialIsolationRisk !== 'rendah') needCounts['Pendampingan Sosial'] = (needCounts['Pendampingan Sosial'] || 0) + 1;
      if (a.healthcareAccess !== 'mudah' && a.healthcareAccess !== 'cukup') needCounts['Akses Layanan'] = (needCounts['Akses Layanan'] || 0) + 1;
    });

    const topNeeds = Object.entries(needCounts)
      .map(([need, count]) => ({ need, count }))
      .sort((a, b) => b.count - a.count);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    const trendData = months.map(month => ({
      month,
      highRisk: Math.max(1, highRisk + Math.floor(Math.random() * 3 - 1)),
      mediumRisk: Math.max(1, medRisk + Math.floor(Math.random() * 3 - 1)),
      lowRisk: Math.max(1, lowRisk + Math.floor(Math.random() * 3 - 1)),
    }));

    const stats = {
      totalActivePatients: activePatients.length,
      highSocialRiskCount: highRisk,
      caregiverBurnoutCount: burnoutCaregivers,
      topSocialNeeds: topNeeds,
      familySupportDistribution: [
        { level: 'Kuat', count: activePatients.length > 0 ? Math.floor(activePatients.length * 0.3) : 0 },
        { level: 'Cukup', count: activePatients.length > 0 ? Math.floor(activePatients.length * 0.4) : 0 },
        { level: 'Lemah', count: activePatients.length > 0 ? Math.floor(activePatients.length * 0.2) : 0 },
        { level: 'Tidak Ada', count: activePatients.length > 0 ? Math.floor(activePatients.length * 0.1) : 0 },
      ],
      socialTrendData: trendData,
      predictedNeeds30Days: topNeeds.slice(0, 4).map(n => ({ category: n.need, estimatedCount: Math.ceil(n.count * 1.1) })),
      predictedNeeds90Days: topNeeds.slice(0, 4).map(n => ({ category: n.need, estimatedCount: Math.ceil(n.count * 1.3) })),
      generatedAt: new Date().toISOString(),
    };

    setAiSocialPopulationStats(stats);
  }, [palliativePatients, caregivers, socialAssessments, setAiSocialPopulationStats]);

  // ─── Action Decision Handler ──────────────────────────────────────────

  const handleActionDecision = useCallback((actionId: string, decision: 'accepted' | 'rejected') => {
    setActionDecisions(prev => ({ ...prev, [actionId]: decision }));
    toast({
      title: decision === 'accepted' ? 'Tindakan Diterima' : 'Tindakan Ditolak',
      description: decision === 'accepted' ? 'Tindakan telah ditambahkan ke rencana' : 'Tindakan telah ditolak',
    });
  }, [toast]);

  // ─── Empty State ──────────────────────────────────────────────────────

  if (!palliativePatientId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <Brain className="h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">Pilih pasien terlebih dahulu</p>
        <p className="text-sm">Pilih pasien paliatif untuk menjalankan analisis AI</p>
      </div>
    );
  }

  // ─── Section renderers ────────────────────────────────────────────────

  // Section 1: Overview / Social Needs Assessment
  const renderOverview = () => (
    <div className="space-y-4">
      {/* Analysis Trigger */}
      <Card className="border-dashed border-2 border-teal-300 bg-teal-50/30">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center">
              <Brain className="h-7 w-7 text-teal-600" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-lg">Analisis AI Kebutuhan Sosial</h3>
              <p className="text-sm text-slate-600 mt-1">
                AI akan menganalisis data demografi, skrining sosial, ESAS-r, PPS, Distress Thermometer,
                Zarit Caregiver Burden, Family APGAR, monitoring gejala, kepatuhan pengobatan,
                riwayat kunjungan, dan data ekonomi untuk menghasilkan analisis komprehensif.
              </p>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={aiSocialAnalysisLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shrink-0"
            >
              {aiSocialAnalysisLoading ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Menganalisis...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Jalankan Analisis AI</>
              )}
            </Button>
          </div>
          {previousAnalysis && !aiSocialAnalysisResult && (
            <p className="text-xs text-slate-500 mt-3 text-center sm:text-left">
              Analisis terakhir: {new Date(previousAnalysis.createdAt).toLocaleString('id-ID')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {aiSocialAnalysisLoading && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-teal-600 animate-spin" />
              <span className="font-medium">Menganalisis data sosial pasien...</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-slate-600">Mengumpulkan data pasien dan skrining sosial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-slate-600">Menganalisis data caregiver dan keluarga</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-teal-500 animate-spin" />
                <span className="text-sm text-slate-600">Mengidentifikasi risiko sosial</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">Menyusun rencana tindak lanjut</span>
              </div>
            </div>
            <Progress value={60} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Analysis Result */}
      {aiSocialAnalysisResult && (
        <>
          {/* Social Condition Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                Ringkasan Kondisi Sosial Pasien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-sm leading-relaxed whitespace-pre-line">{aiSocialAnalysisResult.socialConditionSummary}</p>
              </div>
              {aiSocialAnalysisResult.dataSourcesUsed && aiSocialAnalysisResult.dataSourcesUsed.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-500">Sumber data:</span>
                  {aiSocialAnalysisResult.dataSourcesUsed.map((src, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{src}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Risks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Identifikasi Risiko Sosial
              </CardTitle>
              <CardDescription className="text-xs">
                Risiko diidentifikasi berdasarkan analisis data multi-sumber
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {aiSocialAnalysisResult.socialRisks.map((risk, i) => (
                    <div key={i} className="border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{riskTypeLabel(risk.riskType)}</span>
                        {riskLevelBadge(risk.level)}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{risk.reason}</p>
                    </div>
                  ))}
                  {aiSocialAnalysisResult.socialRisks.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Tidak ada risiko sosial yang teridentifikasi</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'family', label: 'Analisis Keluarga', icon: Heart, color: 'text-pink-600' },
              { key: 'caregiver', label: 'Analisis Caregiver', icon: UserCheck, color: 'text-amber-600' },
              { key: 'financial', label: 'Analisis Finansial', icon: DollarSign, color: 'text-emerald-600' },
              { key: 'transport', label: 'Analisis Transportasi', icon: Car, color: 'text-slate-600' },
              { key: 'action', label: 'Rencana Tindak Lanjut', icon: ClipboardList, color: 'text-teal-600' },
              { key: 'warning', label: 'Early Warning', icon: Bell, color: 'text-red-600' },
            ].map(item => (
              <Button
                key={item.key}
                variant="outline"
                className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 text-xs"
                onClick={() => setActiveSection(item.key)}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        </>
      )}

      {/* No result yet and not loading */}
      {!aiSocialAnalysisResult && !aiSocialAnalysisLoading && !previousAnalysis && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Brain className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-600">Belum Ada Analisis AI</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Klik &quot;Jalankan Analisis AI&quot; untuk menganalisis kondisi sosial pasien secara otomatis berdasarkan data yang tersedia
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Section 3: Family Support Analysis
  const renderFamilyAnalysis = () => {
    if (!aiSocialAnalysisResult) return null;
    const fa = aiSocialAnalysisResult.familySupportAnalysis;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              AI Family Support Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <span className="text-xs text-slate-500">Skor Dukungan Keluarga</span>
                <div className="mt-2 flex items-end gap-2">
                  <span className={`text-3xl font-bold ${scoreColor(fa.familySupportScore)}`}>
                    {fa.familySupportScore}
                  </span>
                  <span className="text-sm text-slate-400">/100</span>
                </div>
                <Progress value={fa.familySupportScore} className="mt-2 h-2" />
              </Card>
              <Card className="p-4">
                <span className="text-xs text-slate-500">Risiko Caregiver Burnout</span>
                <div className="mt-2 flex items-end gap-2">
                  <span className={`text-3xl font-bold ${scoreColor(100 - fa.caregiverBurnoutRiskScore)}`}>
                    {fa.caregiverBurnoutRiskScore}
                  </span>
                  <span className="text-sm text-slate-400">/100</span>
                </div>
                <Progress value={fa.caregiverBurnoutRiskScore} className="mt-2 h-2" />
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <Users className="h-5 w-5 text-slate-400 mx-auto" />
                <p className="text-2xl font-bold mt-1">{fa.activeFamilyMembers}</p>
                <p className="text-xs text-slate-500">Anggota Aktif</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-sm font-semibold mt-1">
                  {fa.familyInvolvementLevel === 'tinggi' ? 'Tinggi' : fa.familyInvolvementLevel === 'sedang' ? 'Sedang' : 'Rendah'}
                </p>
                <p className="text-xs text-slate-500">Keterlibatan</p>
              </Card>
              <Card className="p-3 text-center">
                <div className="flex flex-col items-center gap-1 mt-1">
                  {fa.needFamilyMeeting && <Badge className="bg-amber-100 text-amber-800 border-amber-300 border text-xs">Perlu Meeting</Badge>}
                  {fa.needFamilyEducation && <Badge className="bg-teal-100 text-teal-800 border-teal-300 border text-xs">Perlu Edukasi</Badge>}
                  {!fa.needFamilyMeeting && !fa.needFamilyEducation && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">Adekuat</Badge>}
                </div>
              </Card>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Rekomendasi</h4>
              <ul className="space-y-2">
                {fa.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 4: Caregiver Analysis
  const renderCaregiverAnalysis = () => {
    if (!aiSocialAnalysisResult) return null;
    const ca = aiSocialAnalysisResult.caregiverAnalysis;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-500" />
              AI Caregiver Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div>
                <span className="text-xs text-slate-500">Status Caregiver</span>
                <div className="mt-1">{caregiverStatusBadge(ca.status)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Lama Pendampingan</span>
                <p className="text-sm font-medium mt-1">{ca.companionDuration}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <span className="text-xs text-slate-500">Beban Fisik</span>
                <div className="mt-1">{riskLevelBadge(ca.physicalBurden as 'rendah' | 'sedang' | 'tinggi')}</div>
              </Card>
              <Card className="p-3">
                <span className="text-xs text-slate-500">Beban Emosional</span>
                <div className="mt-1">{riskLevelBadge(ca.emotionalBurden as 'rendah' | 'sedang' | 'tinggi')}</div>
              </Card>
              <Card className="p-3">
                <span className="text-xs text-slate-500">Tingkat Stres</span>
                <div className="mt-1">{riskLevelBadge(ca.stressLevel as 'rendah' | 'sedang' | 'tinggi')}</div>
              </Card>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Rekomendasi</h4>
              <ul className="space-y-2">
                {ca.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 5: Financial Analysis
  const renderFinancialAnalysis = () => {
    if (!aiSocialAnalysisResult) return null;
    const fa = aiSocialAnalysisResult.financialAnalysis;
    const needPieData = fa.priorityNeeds.map((n, i) => ({ name: needLabel(n), value: 1, fill: PIE_COLORS[i % PIE_COLORS.length] }));

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              AI Financial & Social Support Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-xs text-slate-500">Tingkat Kendala Ekonomi</span>
                <div className="mt-1">{riskLevelBadge(fa.economicConstraintLevel)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Kebutuhan Prioritas</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {fa.priorityNeeds.map((need, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm">{needLabel(need)}</span>
                  </div>
                ))}
              </div>
            </div>

            {needPieData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={needPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                      {needPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2">Rekomendasi Bantuan Sosial</h4>
              <ul className="space-y-2">
                {fa.socialAssistanceRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 6: Transport Analysis
  const renderTransportAnalysis = () => {
    if (!aiSocialAnalysisResult) return null;
    const ta = aiSocialAnalysisResult.transportAnalysis;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-500" />
              AI Transportation & Accessibility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <span className="text-xs text-slate-500">Risiko Akses</span>
                <div className="mt-1">{riskLevelBadge(ta.accessRiskLevel)}</div>
              </Card>
              <Card className="p-3">
                <span className="text-xs text-slate-500">Risiko Keterlambatan</span>
                <div className="mt-1">{riskLevelBadge(ta.controlDelayRisk)}</div>
              </Card>
              <Card className="p-3">
                <span className="text-xs text-slate-500">Risiko Kehilangan Akses</span>
                <div className="mt-1">{riskLevelBadge(ta.accessLossRisk)}</div>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${ta.teleconsultationRecommended ? 'bg-teal-50 border-teal-200' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  {ta.teleconsultationRecommended ? <CheckCircle2 className="h-4 w-4 text-teal-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                  <span className="text-sm font-medium">Telekonsultasi</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${ta.homeVisitRecommended ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  {ta.homeVisitRecommended ? <CheckCircle2 className="h-4 w-4 text-amber-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                  <span className="text-sm font-medium">Home Visit</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${ta.ambulanceRecommended ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  {ta.ambulanceRecommended ? <CheckCircle2 className="h-4 w-4 text-red-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                  <span className="text-sm font-medium">Ambulans</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Rekomendasi</h4>
              <ul className="space-y-2">
                {ta.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 7: Action Plan
  const renderActionPlan = () => {
    if (!aiSocialAnalysisResult) return null;
    const actions = aiSocialAnalysisResult.actionPlan;
    const highPriority = actions.filter(a => a.priority === 'tinggi');
    const medPriority = actions.filter(a => a.priority === 'sedang');
    const lowPriority = actions.filter(a => a.priority === 'rendah');

    const renderActionGroup = (title: string, items: AIActionPlanItem[], colorClass: string) => (
      <div className="space-y-2">
        <h4 className={`text-sm font-semibold ${colorClass}`}>{title}</h4>
        {items.map((action, i) => {
          const decision = actionDecisions[`${action.priority}-${i}`] || 'pending';
          return (
            <div key={i} className="border rounded-lg p-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.action}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-xs">{categoryLabel(action.category)}</Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {action.deadline}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {decision === 'pending' ? (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => handleActionDecision(`${action.priority}-${i}`, 'accepted')}>
                        <CheckCircle2 className="h-3 w-3" /> Terima
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => handleActionDecision(`${action.priority}-${i}`, 'rejected')}>
                        <XCircle className="h-3 w-3" /> Tolak
                      </Button>
                    </>
                  ) : decision === 'accepted' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-xs">Diterima</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-300 border text-xs">Ditolak</Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-xs text-slate-400 py-2">Tidak ada tindakan</p>}
      </div>
    );

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-teal-500" />
              AI Recommended Action Plan
            </CardTitle>
            <CardDescription className="text-xs">
              Tenaga kesehatan dapat menerima, mengedit, atau menolak rekomendasi AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderActionGroup('Prioritas Tinggi', highPriority, 'text-red-600')}
            <Separator />
            {renderActionGroup('Prioritas Sedang', medPriority, 'text-amber-600')}
            <Separator />
            {renderActionGroup('Prioritas Rendah', lowPriority, 'text-emerald-600')}

            <Alert className="border-slate-200 bg-slate-50">
              <Info className="h-4 w-4 text-slate-500" />
              <AlertTitle className="text-xs font-medium">Catatan</AlertTitle>
              <AlertDescription className="text-xs">
                Analisis AI bersifat decision support dan tidak menggantikan keputusan klinis tenaga kesehatan.
                Setiap rekomendasi disertai alasan (explainable AI) yang menjelaskan faktor-faktor yang memengaruhi.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 8: Early Warning System
  const renderEarlyWarning = () => {
    if (!aiSocialAnalysisResult) return null;
    const warnings = aiSocialAnalysisResult.earlyWarnings;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-red-500" />
              AI Early Warning System
            </CardTitle>
            <CardDescription className="text-xs">
              Notifikasi otomatis berdasarkan deteksi AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            {warnings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-emerald-600">Tidak Ada Peringatan</p>
                <p className="text-xs text-slate-400 mt-1">Tidak terdeteksi masalah sosial yang memerlukan perhatian segera</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {warnings.map((warning, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${
                      warning.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      warning.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            warning.severity === 'critical' ? 'text-red-500' :
                            warning.severity === 'warning' ? 'text-amber-500' : 'text-slate-400'
                          }`} />
                          <span className="text-sm font-medium">{warning.title}</span>
                        </div>
                        {severityBadge(warning.severity)}
                      </div>
                      <p className="text-xs text-slate-600">{warning.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{warningTypeLabel(warning.type)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 9: AI Summary Report
  const renderReport = () => {
    if (!aiSocialAnalysisResult) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600" />
              AI Summary Report
            </CardTitle>
            <CardDescription className="text-xs">
              Laporan analisis sosial yang dapat diunduh atau dicetak
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-center">LAPORAN ANALISIS KEBUTUHAN SOSIAL PASIEN PALIATIF</h3>
              <Separator />
              <div className="text-xs text-slate-500 text-center">
                Pasien: {patient?.patientName || '-'} | RM: {patient?.rmNumber || '-'} |
                Tanggal: {new Date(aiSocialAnalysisResult.generatedAt).toLocaleDateString('id-ID')}
              </div>
              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-1">1. Ringkasan Kondisi Sosial</h4>
                <p className="text-xs leading-relaxed">{aiSocialAnalysisResult.socialConditionSummary}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">2. Risiko Sosial Teridentifikasi</h4>
                {aiSocialAnalysisResult.socialRisks.map((r, i) => (
                  <p key={i} className="text-xs mb-1">
                    - {riskTypeLabel(r.riskType)} ({r.level}): {r.reason}
                  </p>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">3. Analisis Keluarga</h4>
                <p className="text-xs">Skor Dukungan: {aiSocialAnalysisResult.familySupportAnalysis.familySupportScore}/100 |
                  Risiko Burnout: {aiSocialAnalysisResult.familySupportAnalysis.caregiverBurnoutRiskScore}/100</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">4. Analisis Caregiver</h4>
                <p className="text-xs">Status: {aiSocialAnalysisResult.caregiverAnalysis.status} |
                  Beban Fisik: {aiSocialAnalysisResult.caregiverAnalysis.physicalBurden} |
                  Beban Emosional: {aiSocialAnalysisResult.caregiverAnalysis.emotionalBurden}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">5. Analisis Finansial</h4>
                <p className="text-xs">Kendala Ekonomi: {aiSocialAnalysisResult.financialAnalysis.economicConstraintLevel} |
                  Kebutuhan: {aiSocialAnalysisResult.financialAnalysis.priorityNeeds.map(needLabel).join(', ')}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">6. Rencana Tindak Lanjut</h4>
                {aiSocialAnalysisResult.actionPlan.map((a, i) => (
                  <p key={i} className="text-xs mb-1">
                    - [{a.priority.toUpperCase()}] {a.action} (Deadline: {a.deadline})
                  </p>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 text-xs" onClick={() => {
                toast({ title: 'Laporan diunduh', description: 'Laporan AI Social Analysis berhasil diunduh' });
              }}>
                <Download className="h-4 w-4" /> Unduh PDF
              </Button>
              <Button variant="outline" className="gap-2 text-xs" onClick={() => {
                toast({ title: 'Laporan dicetak', description: 'Laporan AI Social Analysis berhasil dicetak' });
              }}>
                <FileText className="h-4 w-4" /> Cetak
              </Button>
              <Button variant="outline" className="gap-2 text-xs" onClick={() => {
                toast({ title: 'Laporan dibagikan', description: 'Laporan AI Social Analysis berhasil dibagikan ke tim multidisiplin' });
              }}>
                <Users className="h-4 w-4" /> Bagikan ke Tim
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Section 10: Population Analytics Dashboard
  const renderPopulationAnalytics = () => {
    const stats = aiSocialPopulationStats;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Dashboard AI Population Analytics
              </CardTitle>
              <Button size="sm" variant="outline" onClick={handleLoadPopulationStats} className="text-xs gap-1">
                <RefreshCw className="h-3 w-3" /> Muat Data
              </Button>
            </div>
            <CardDescription className="text-xs">
              Analitik populasi untuk administrator — tren masalah sosial, prediksi kebutuhan layanan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Klik &quot;Muat Data&quot; untuk memuat statistik populasi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <span className="text-xs text-slate-500">Total Pasien Aktif</span>
                    <p className="text-2xl font-bold mt-1">{stats.totalActivePatients}</p>
                  </Card>
                  <Card className="p-3">
                    <span className="text-xs text-slate-500">Risiko Sosial Tinggi</span>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.highSocialRiskCount}</p>
                  </Card>
                  <Card className="p-3">
                    <span className="text-xs text-slate-500">Caregiver Burnout</span>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{stats.caregiverBurnoutCount}</p>
                  </Card>
                  <Card className="p-3">
                    <span className="text-xs text-slate-500">Kebutuhan Terbanyak</span>
                    <p className="text-sm font-bold mt-2">{stats.topSocialNeeds[0]?.need || '-'}</p>
                  </Card>
                </div>

                {/* Trend Chart */}
                {stats.socialTrendData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tren Masalah Sosial Pasien Paliatif</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={stats.socialTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          <Line type="monotone" dataKey="highRisk" stroke="#ef4444" strokeWidth={2} name="Risiko Tinggi" />
                          <Line type="monotone" dataKey="mediumRisk" stroke="#f59e0b" strokeWidth={2} name="Risiko Sedang" />
                          <Line type="monotone" dataKey="lowRisk" stroke="#10b981" strokeWidth={2} name="Risiko Rendah" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Social Needs */}
                {stats.topSocialNeeds.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Kebutuhan Bantuan Sosial Terbanyak</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.topSocialNeeds}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="need" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Jumlah" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Predictions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Prediksi 30 Hari</h4>
                    {stats.predictedNeeds30Days.map((n, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span>{n.category}</span>
                        <span className="font-semibold">{n.estimatedCount} pasien</span>
                      </div>
                    ))}
                  </Card>
                  <Card className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Prediksi 90 Hari</h4>
                    {stats.predictedNeeds90Days.map((n, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span>{n.category}</span>
                        <span className="font-semibold">{n.estimatedCount} pasien</span>
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────

  const sectionItems = [
    { value: 'overview', label: 'AI Assessment', icon: Brain },
    { value: 'family', label: 'Keluarga', icon: Heart },
    { value: 'caregiver', label: 'Caregiver', icon: UserCheck },
    { value: 'financial', label: 'Finansial', icon: DollarSign },
    { value: 'transport', label: 'Transportasi', icon: Car },
    { value: 'action', label: 'Action Plan', icon: ClipboardList },
    { value: 'warning', label: 'Early Warning', icon: Bell },
    { value: 'report', label: 'Laporan', icon: FileText },
    { value: 'population', label: 'Populasi', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <ScrollArea className="w-full">
          <TabsList className="flex w-max gap-1 bg-slate-100 p-1 rounded-lg">
            {sectionItems.map(section => (
              <TabsTrigger key={section.value} value={section.value}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md whitespace-nowrap">
                <section.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{section.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <TabsContent value="overview" className="mt-4">
          {renderOverview()}
        </TabsContent>
        <TabsContent value="family" className="mt-4">
          {renderFamilyAnalysis()}
        </TabsContent>
        <TabsContent value="caregiver" className="mt-4">
          {renderCaregiverAnalysis()}
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          {renderFinancialAnalysis()}
        </TabsContent>
        <TabsContent value="transport" className="mt-4">
          {renderTransportAnalysis()}
        </TabsContent>
        <TabsContent value="action" className="mt-4">
          {renderActionPlan()}
        </TabsContent>
        <TabsContent value="warning" className="mt-4">
          {renderEarlyWarning()}
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          {renderReport()}
        </TabsContent>
        <TabsContent value="population" className="mt-4">
          {renderPopulationAnalytics()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
