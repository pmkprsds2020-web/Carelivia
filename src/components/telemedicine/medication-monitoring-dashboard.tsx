'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type {
  MedicationMonitoringFormAnswers,
  MedicationMonitoringFormItem,
  SideEffectType,
  NotConsumedReason,
  MedicationMonitoringAlert,
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Pill,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  FileText,
} from 'lucide-react';

// ── Label Maps ──────────────────────────────────────────────────────────────

const sideEffectLabels: Record<SideEffectType, string> = {
  mual: 'Mual',
  muntah: 'Muntah',
  pusing: 'Pusing',
  mengantuk_berlebihan: 'Mengantuk',
  sulit_tidur: 'Sulit Tidur',
  konstipasi: 'Konstipasi',
  diare: 'Diare',
  nyeri_bertambah: 'Nyeri Bertambah',
  sesak_napas: 'Sesak Napas',
  nafsu_makan_menurun: 'Nafsu Makan Menurun',
  reaksi_alergi: 'Reaksi Alergi',
  lainnya: 'Lainnya',
};

const notConsumedReasonLabels: Record<NotConsumedReason, string> = {
  efek_samping: 'Efek Samping',
  merasa_sudah_membaik: 'Merasa Membaik',
  tidak_ada_obat: 'Tidak Ada Obat',
  tidak_mampu_membeli: 'Tidak Mampu Membeli',
  tidak_ingin_minum: 'Tidak Ingin Minum',
  sulit_menelan: 'Sulit Menelan',
  mual_muntah: 'Mual/Muntah',
  instruksi_keluarga: 'Instruksi Keluarga',
  alasan_lainnya: 'Alasan Lainnya',
};

const consumptionStatusLabel: Record<string, string> = {
  sudah_diminum: 'Sudah Diminum',
  belum_diminum: 'Belum Diminum',
  tidak_diminum: 'Tidak Diminum',
};

// ── Props ───────────────────────────────────────────────────────────────────

interface MedicationMonitoringDashboardProps {
  patientId: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function MedicationMonitoringDashboard({ patientId }: MedicationMonitoringDashboardProps) {
  const {
    medicationMonitoringForms,
    medicationMonitoringAlerts,
    medicationMonitoringAuditLog,
    medicationComplianceSummaries,
    palliativeMedications,
    palliativeChatMessages,
  } = useStore();

  // Collect all medication monitoring answers from chat messages
  const monitoringResponses = useMemo(() => {
    const responses: Array<{
      answers: MedicationMonitoringFormAnswers;
      submittedAt: string;
      formId: string;
    }> = [];
    for (const msg of palliativeChatMessages) {
      if (
        msg.formType === 'monitoring_obat' &&
        msg.type === 'form_response' &&
        msg.formResponse?.medicationMonitoringAnswers
      ) {
        responses.push({
          answers: msg.formResponse.medicationMonitoringAnswers,
          submittedAt: msg.formResponse.submittedAt,
          formId: msg.formResponse.formId,
        });
      }
    }
    return responses;
  }, [palliativeChatMessages]);

  // Flatten all medication items across all responses
  const allMedItems = useMemo(() => {
    const items: Array<MedicationMonitoringFormItem & { submittedAt: string }> = [];
    for (const resp of monitoringResponses) {
      for (const med of resp.answers.medications) {
        items.push({ ...med, submittedAt: resp.submittedAt });
      }
    }
    return items;
  }, [monitoringResponses]);

  // Active medications for this patient
  const patientMeds = useMemo(
    () => palliativeMedications.filter(m => m.palliativePatientId === patientId && m.isActive),
    [palliativeMedications, patientId]
  );

  // Compliance calculations
  const totalDoses = allMedItems.length;
  const takenDoses = allMedItems.filter(i => i.consumptionStatus === 'sudah_diminum').length;
  const missedDoses = allMedItems.filter(i => i.consumptionStatus === 'belum_diminum').length;
  const notConsumedDoses = allMedItems.filter(i => i.consumptionStatus === 'tidak_diminum').length;
  const complianceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  // Side effects frequency
  const sideEffectFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const item of allMedItems) {
      if (item.sideEffects) {
        for (const se of item.sideEffects) {
          freq[se] = (freq[se] || 0) + 1;
        }
      }
    }
    return Object.entries(freq)
      .map(([type, count]) => ({ type: type as SideEffectType, count }))
      .sort((a, b) => b.count - a.count);
  }, [allMedItems]);

  // Not consumed reasons frequency
  const notConsumedReasonFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const item of allMedItems) {
      if (item.notConsumedReason) {
        freq[item.notConsumedReason] = (freq[item.notConsumedReason] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .map(([reason, count]) => ({ reason: reason as NotConsumedReason, count }))
      .sort((a, b) => b.count - a.count);
  }, [allMedItems]);

  // Per-medication compliance timeline
  const medTimeline = useMemo(() => {
    const map = new Map<string, { name: string; entries: Array<{ date: string; status: string | null }> }>();
    for (const med of patientMeds) {
      map.set(med.id, { name: med.medicineName, entries: [] });
    }
    for (const item of allMedItems) {
      const entry = map.get(item.medicationId);
      if (entry) {
        entry.entries.push({
          date: item.submittedAt,
          status: item.consumptionStatus,
        });
      } else {
        map.set(item.medicationId, {
          name: item.medicineName,
          entries: [{ date: item.submittedAt, status: item.consumptionStatus }],
        });
      }
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [patientMeds, allMedItems]);

  // Patient-specific alerts
  const patientAlerts = useMemo(
    () => medicationMonitoringAlerts.filter(a => a.patientId === patientId),
    [medicationMonitoringAlerts, patientId]
  );

  // Audit log for this patient
  const patientAuditLog = useMemo(
    () => medicationMonitoringAuditLog.filter(a => a.patientId === patientId),
    [medicationMonitoringAuditLog, patientId]
  );

  // Weekly compliance data for chart (last 4 weeks)
  const weeklyCompliance = useMemo(() => {
    const now = new Date();
    const weeks: Array<{ label: string; rate: number; total: number; taken: number }> = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const weekItems = allMedItems.filter(item => {
        const d = new Date(item.submittedAt);
        return d >= weekStart && d < weekEnd;
      });
      const total = weekItems.length;
      const taken = weekItems.filter(i => i.consumptionStatus === 'sudah_diminum').length;
      const rate = total > 0 ? Math.round((taken / total) * 100) : 0;
      weeks.push({
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        rate,
        total,
        taken,
      });
    }
    return weeks;
  }, [allMedItems]);

  // Severe side effects (severity >= 7 or reaksi_alergi)
  const severeSideEffects = useMemo(
    () => allMedItems.filter(i =>
      i.hasComplaints &&
      ((i.complaintSeverity !== undefined && i.complaintSeverity >= 7) ||
        i.sideEffects?.includes('reaksi_alergi') ||
        i.sideEffects?.includes('sesak_napas'))
    ),
    [allMedItems]
  );

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Pill className="w-5 h-5 text-teal-600" />
        <h3 className="font-semibold text-sm">Dashboard Monitoring Obat Paliatif</h3>
      </div>

      {/* ── Compliance Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Dosis</div>
          <div className="text-xl font-bold">{totalDoses}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-600" /> Diminum
          </div>
          <div className="text-xl font-bold text-green-600">{takenDoses}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Belum Diminum
          </div>
          <div className="text-xl font-bold text-amber-600">{missedDoses}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" /> Tidak Diminum
          </div>
          <div className="text-xl font-bold text-red-600">{notConsumedDoses}</div>
        </Card>
        <Card className="p-3 col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Kepatuhan
          </div>
          <div className={cn('text-xl font-bold', complianceRate >= 80 ? 'text-green-600' : complianceRate >= 50 ? 'text-amber-600' : 'text-red-600')}>
            {complianceRate}%
          </div>
        </Card>
      </div>

      {/* ── Compliance Timeline ── */}
      {medTimeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Timeline Kepatuhan per Obat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {medTimeline.map(med => (
                <div key={med.id} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-32 truncate" title={med.name}>
                    {med.name}
                  </span>
                  <div className="flex gap-1 flex-1 flex-wrap">
                    {med.entries.length > 0 ? (
                      med.entries.map((entry, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-6 h-6 rounded text-[9px] flex items-center justify-center font-medium',
                            entry.status === 'sudah_diminum' && 'bg-green-100 text-green-800',
                            entry.status === 'belum_diminum' && 'bg-amber-100 text-amber-800',
                            entry.status === 'tidak_diminum' && 'bg-red-100 text-red-800',
                            !entry.status && 'bg-gray-100 text-gray-500',
                          )}
                          title={`${consumptionStatusLabel[entry.status ?? ''] ?? 'Belum diisi'} - ${new Date(entry.date).toLocaleDateString('id-ID')}`}
                        >
                          {entry.status === 'sudah_diminum' ? 'S' : entry.status === 'belum_diminum' ? 'B' : entry.status === 'tidak_diminum' ? 'X' : '-'}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum ada data</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Sudah Diminum</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Belum Diminum</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Tidak Diminum</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Compliance Chart (CSS bars) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Grafik Kepatuhan Mingguan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-32">
            {weeklyCompliance.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium">{week.rate}%</span>
                <div className="w-full bg-gray-100 rounded relative" style={{ height: '80px' }}>
                  <div
                    className={cn(
                      'absolute bottom-0 left-0 right-0 rounded transition-all',
                      week.rate >= 80 ? 'bg-green-400' : week.rate >= 50 ? 'bg-amber-400' : 'bg-red-400',
                    )}
                    style={{ height: `${Math.max(week.rate, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{week.label}</span>
              </div>
            ))}
          </div>
          {weeklyCompliance.every(w => w.total === 0) && (
            <p className="text-xs text-muted-foreground text-center mt-2">Belum ada data kepatuhan mingguan</p>
          )}
        </CardContent>
      </Card>

      {/* ── Side Effects Chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Frekuensi Efek Samping
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sideEffectFreq.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sideEffectFreq.map(({ type, count }) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs w-32 truncate">{sideEffectLabels[type] || type}</span>
                  <div className="flex-1 bg-gray-100 rounded h-5 relative">
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-amber-400 rounded"
                      style={{ width: `${Math.min((count / (sideEffectFreq[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tidak ada laporan efek samping</p>
          )}
        </CardContent>
      </Card>

      {/* ── Not Consumed Reasons ── */}
      {notConsumedReasonFreq.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Alasan Tidak Minum Obat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notConsumedReasonFreq.map(({ reason, count }) => (
                <div key={reason} className="flex items-center gap-2">
                  <span className="text-xs w-36 truncate">{notConsumedReasonLabels[reason] || reason}</span>
                  <div className="flex-1 bg-gray-100 rounded h-5 relative">
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-red-400 rounded"
                      style={{ width: `${Math.min((count / (notConsumedReasonFreq[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Alerts Panel ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Peringatan Monitoring Obat
            {patientAlerts.filter(a => !a.isRead).length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {patientAlerts.filter(a => !a.isRead).length} baru
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patientAlerts.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {patientAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-2 rounded border text-xs',
                    alert.severity === 'critical' && 'bg-red-50 border-red-200',
                    alert.severity === 'warning' && 'bg-amber-50 border-amber-200',
                    alert.severity === 'info' && 'bg-blue-50 border-blue-200',
                    !alert.isRead && 'ring-1 ring-offset-1',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px]',
                        alert.severity === 'critical' && 'bg-red-100 text-red-700 border-red-300',
                        alert.severity === 'warning' && 'bg-amber-100 text-amber-700 border-amber-300',
                        alert.severity === 'info' && 'bg-blue-100 text-blue-700 border-blue-300',
                      )}
                    >
                      {alert.severity === 'critical' ? 'Kritis' : alert.severity === 'warning' ? 'Peringatan' : 'Info'}
                    </Badge>
                    <span className="font-medium">{alert.title}</span>
                    {alert.medicationName && (
                      <Badge variant="outline" className="text-[9px]">{alert.medicationName}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">{alert.description}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {new Date(alert.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tidak ada peringatan</p>
          )}

          {/* Severe side effects as inline alerts */}
          {severeSideEffects.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700 mb-1">Efek Samping Berat Dilaporkan:</p>
              {severeSideEffects.map((item, i) => (
                <div key={i} className="p-1.5 bg-red-50 border border-red-200 rounded text-xs mb-1">
                  <span className="font-medium">{item.medicineName}</span>
                  {item.complaintSeverity !== undefined && (
                    <span className="text-red-600 ml-1">Keparahan: {item.complaintSeverity}/10</span>
                  )}
                  {item.sideEffects && item.sideEffects.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {item.sideEffects.map(se => (
                        <Badge key={se} variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200">
                          {sideEffectLabels[se] || se}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── History Log ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> Riwayat Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monitoringResponses.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {monitoringResponses.map((resp, i) => (
                <div key={i} className="p-2 border rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Laporan Monitoring - {new Date(resp.submittedAt).toLocaleString('id-ID')}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {resp.answers.medications.length} obat
                    </Badge>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <span className="text-green-700">
                      {resp.answers.medications.filter(m => m.consumptionStatus === 'sudah_diminum').length} diminum
                    </span>
                    <span className="text-amber-700">
                      {resp.answers.medications.filter(m => m.consumptionStatus === 'belum_diminum').length} belum
                    </span>
                    <span className="text-red-700">
                      {resp.answers.medications.filter(m => m.consumptionStatus === 'tidak_diminum').length} tidak
                    </span>
                  </div>
                  {resp.answers.overallNotes && (
                    <p className="text-muted-foreground mt-1 italic">&quot;{resp.answers.overallNotes}&quot;</p>
                  )}
                  {/* Per-medication detail */}
                  <div className="mt-1 space-y-0.5">
                    {resp.answers.medications.map(med => (
                      <div key={med.medicationId} className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            med.consumptionStatus === 'sudah_diminum' && 'bg-green-500',
                            med.consumptionStatus === 'belum_diminum' && 'bg-amber-500',
                            med.consumptionStatus === 'tidak_diminum' && 'bg-red-500',
                          )}
                        />
                        <span className="truncate flex-1">{med.medicineName}</span>
                        {med.hasComplaints && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada riwayat monitoring obat</p>
          )}

          {/* Audit entries */}
          {patientAuditLog.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Log Audit</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {patientAuditLog.slice().reverse().map(entry => (
                  <div key={entry.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="shrink-0">{new Date(entry.createdAt).toLocaleString('id-ID')}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">{entry.action.replace(/_/g, ' ')}</Badge>
                    {entry.details && <span className="truncate">{entry.details}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
