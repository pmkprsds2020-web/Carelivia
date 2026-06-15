'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';

type ModuleStatus = 'tepat_waktu' | 'akan_jatuh_tempo' | 'terlambat';
type Priority = 'hijau' | 'kuning' | 'merah';

interface ModuleStatusInfo {
  status: ModuleStatus;
  priority: Priority;
  message: string;
}

export interface ModuleMonitoringStatus {
  ttv: ModuleStatusInfo;
  keluhan: ModuleStatusInfo;
  obat: ModuleStatusInfo;
  nutrisi: ModuleStatusInfo;
  skrining: ModuleStatusInfo;
  highestPriority: Priority;
  highestPriorityMessage: string;
}

// ── Message definitions ──────────────────────────────────────────────────────

const TTV_MESSAGES: Record<ModuleStatus, string> = {
  tepat_waktu:
    '🩺 Pengingat: TTV Serial (Tekanan Darah, Nadi, Pernapasan, Suhu, SpO₂) perlu diisi minimal 1 kali setiap hari.',
  akan_jatuh_tempo:
    '🟡 TTV Serial terakhir diisi 20 jam yang lalu. Mohon lakukan pengukuran ulang hari ini.',
  terlambat:
    '🔴 TTV Serial belum diperbarui lebih dari 24 jam. Segera lakukan pemeriksaan untuk menjaga keamanan pasien.',
};

const KELUHAN_MESSAGES: Record<ModuleStatus, string> = {
  tepat_waktu:
    '📋 Pengingat: Keluhan harian pasien perlu diisi setiap hari untuk membantu tim medis memantau perkembangan kondisi pasien.',
  akan_jatuh_tempo:
    '🟡 Keluhan harian belum diisi hari ini. Mohon lengkapi laporan kondisi pasien.',
  terlambat:
    '🔴 Keluhan harian belum diperbarui selama lebih dari 24 jam.',
};

const OBAT_MESSAGES: Record<ModuleStatus, string> = {
  tepat_waktu:
    '💊 Pastikan penggunaan obat pasien dicatat setiap hari sesuai jadwal terapi yang diberikan dokter.',
  akan_jatuh_tempo:
    '🟡 Monitoring obat belum diperbarui hari ini. Mohon konfirmasi konsumsi obat pasien.',
  terlambat:
    '🔴 Tidak terdapat catatan penggunaan obat dalam 24 jam terakhir.',
};

const NUTRISI_MESSAGES: Record<ModuleStatus, string> = {
  tepat_waktu:
    '🍽️ Monitoring nutrisi perlu diisi setiap hari untuk memantau asupan makan dan minum pasien.',
  akan_jatuh_tempo:
    '🟡 Data asupan nutrisi hari ini belum dilengkapi.',
  terlambat:
    '🔴 Monitoring nutrisi belum diperbarui selama lebih dari 24 jam.',
};

const SKRINING_MESSAGES: Record<ModuleStatus, string> = {
  tepat_waktu:
    '📊 Skrining paliatif komprehensif dilakukan setiap 30 hari untuk mengevaluasi kondisi pasien secara menyeluruh.',
  akan_jatuh_tempo:
    '🟡 Jadwal skrining paliatif berikutnya akan jatuh tempo dalam 7 hari.',
  terlambat:
    '🔴 Skrining paliatif telah melewati jadwal yang ditentukan. Mohon segera dilakukan evaluasi ulang.',
};

// ── Helper ───────────────────────────────────────────────────────────────────

function hoursSince(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60);
}

function daysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24);
}

function classifyHours(hrs: number, greenHrs: number, yellowHrs: number): ModuleStatus {
  if (hrs <= greenHrs) return 'tepat_waktu';
  if (hrs <= yellowHrs) return 'akan_jatuh_tempo';
  return 'terlambat';
}

function classifyDays(dys: number, greenDys: number, yellowDys: number): ModuleStatus {
  if (dys <= greenDys) return 'tepat_waktu';
  if (dys <= yellowDys) return 'akan_jatuh_tempo';
  return 'terlambat';
}

function statusToPriority(s: ModuleStatus): Priority {
  if (s === 'terlambat') return 'merah';
  if (s === 'akan_jatuh_tempo') return 'kuning';
  return 'hijau';
}

function highestPriority(priorities: Priority[]): Priority {
  if (priorities.includes('merah')) return 'merah';
  if (priorities.includes('kuning')) return 'kuning';
  return 'hijau';
}

// ── Default module (no patient selected) ─────────────────────────────────────

const defaultModule = (messages: Record<ModuleStatus, string>): ModuleStatusInfo => ({
  status: 'tepat_waktu',
  priority: 'hijau',
  message: messages.tepat_waktu,
});

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMonitoringStatus(patientId: string | null): ModuleMonitoringStatus {
  const {
    vitalSignRecords,
    dailyComplaints,
    palliativeMedications,
    nutritionRecords,
    palliativeScreeningRecords,
  } = useStore();

  return useMemo(() => {
    if (!patientId) {
      const defs = {
        ttv: defaultModule(TTV_MESSAGES),
        keluhan: defaultModule(KELUHAN_MESSAGES),
        obat: defaultModule(OBAT_MESSAGES),
        nutrisi: defaultModule(NUTRISI_MESSAGES),
        skrining: defaultModule(SKRINING_MESSAGES),
      };
      return {
        ...defs,
        highestPriority: 'hijau' as Priority,
        highestPriorityMessage: defs.ttv.message,
      };
    }

    // ── TTV Serial ──
    const patientVitals = vitalSignRecords
      .filter((v) => v.palliativePatientId === patientId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const latestVital = patientVitals[0];
    const ttvHours = hoursSince(latestVital?.recordedAt);
    const ttvStatus = classifyHours(ttvHours, 20, 24);
    const ttv: ModuleStatusInfo = {
      status: ttvStatus,
      priority: statusToPriority(ttvStatus),
      message: TTV_MESSAGES[ttvStatus],
    };

    // ── Keluhan Harian ──
    const patientComplaints = dailyComplaints
      .filter((c) => c.palliativePatientId === patientId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    const latestComplaint = patientComplaints[0];
    const keluhanHours = hoursSince(latestComplaint?.submittedAt);
    const keluhanStatus = classifyHours(keluhanHours, 20, 24);
    const keluhan: ModuleStatusInfo = {
      status: keluhanStatus,
      priority: statusToPriority(keluhanStatus),
      message: KELUHAN_MESSAGES[keluhanStatus],
    };

    // ── Obat ──
    const patientMeds = palliativeMedications.filter(
      (m) => m.palliativePatientId === patientId && m.isActive
    );
    // Collect all adherence records across medications for this patient
    const allAdherences = patientMeds.flatMap((m) => m.adherences ?? []);
    const latestAdherence = allAdherences.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const obatHours = hoursSince(latestAdherence?.createdAt);
    const obatStatus = classifyHours(obatHours, 20, 24);
    const obat: ModuleStatusInfo = {
      status: obatStatus,
      priority: statusToPriority(obatStatus),
      message: OBAT_MESSAGES[obatStatus],
    };

    // ── Nutrisi ──
    const patientNutrition = nutritionRecords
      .filter((r) => r.palliativePatientId === patientId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const latestNutrition = patientNutrition[0];
    const nutrisiHours = hoursSince(latestNutrition?.recordedAt);
    const nutrisiStatus = classifyHours(nutrisiHours, 20, 24);
    const nutrisi: ModuleStatusInfo = {
      status: nutrisiStatus,
      priority: statusToPriority(nutrisiStatus),
      message: NUTRISI_MESSAGES[nutrisiStatus],
    };

    // ── Skrining Paliatif ──
    const patientScreenings = palliativeScreeningRecords
      .filter((s) => s.palliativePatientId === patientId)
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
    const latestScreening = patientScreenings[0];
    const skriningDays = daysSince(latestScreening?.performedAt);
    const skriningStatus = classifyDays(skriningDays, 23, 30);
    const skrining: ModuleStatusInfo = {
      status: skriningStatus,
      priority: statusToPriority(skriningStatus),
      message: SKRINING_MESSAGES[skriningStatus],
    };

    // ── Highest Priority ──
    const allModules = { ttv, keluhan, obat, nutrisi, skrining };
    const priorities = Object.values(allModules).map((m) => m.priority);
    const hp = highestPriority(priorities);
    const hpModule = Object.values(allModules).find((m) => m.priority === hp);

    return {
      ...allModules,
      highestPriority: hp,
      highestPriorityMessage: hpModule?.message ?? ttv.message,
    };
  }, [patientId, vitalSignRecords, dailyComplaints, palliativeMedications, nutritionRecords, palliativeScreeningRecords]);
}
