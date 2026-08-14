// ───────────────────────────────────────────────────────────────────────────
// ros-data.ts — Anamnesis Sistem / Review of Systems (ROS) catalog
// ───────────────────────────────────────────────────────────────────────────
// 12 body systems × their symptom items, plus a pure summary generator.
// This file has NO side effects and no Supabase/React dependency so it can
// be unit-tested and reused by the UI, the service layer, and the AI prompt
// builder without pulling in the rest of the app.
// ───────────────────────────────────────────────────────────────────────────

import type { RosItemRecord, RosStatus } from './types';

export interface RosSymptom {
  code: string;
  name: string;
}

export interface RosSystem {
  id: string;
  label: string;
  items: RosSymptom[];
}

// Status option labels shown to the doctor, in the order specified.
export const ROS_STATUS_OPTIONS: { value: RosStatus; label: string }[] = [
  { value: 'negative', label: 'Tidak ada' },
  { value: 'positive', label: 'Ada' },
  { value: 'not_asked', label: 'Tidak ditanyakan' },
  { value: 'unable_to_assess', label: 'Tidak dapat dinilai' },
];

export const ROS_DEFAULT_STATUS: RosStatus = 'negative';

// The one item that requires an immediate safety response when positive.
export const ROS_SELF_HARM_CODE = 'PSI_PIKIRAN_MENYAKITI_DIRI';

export const ROS_SYSTEMS: RosSystem[] = [
  {
    id: 'konstitusional',
    label: 'Keadaan Umum & Konstitusional',
    items: [
      { code: 'KU_DEMAM', name: 'Demam' },
      { code: 'KU_MENGGIGIL', name: 'Menggigil' },
      { code: 'KU_LEMAS', name: 'Lemas/mudah lelah' },
      { code: 'KU_BB_TURUN', name: 'Penurunan berat badan' },
      { code: 'KU_BB_NAIK', name: 'Peningkatan berat badan' },
      { code: 'KU_KERINGAT_MALAM', name: 'Keringat malam' },
      { code: 'KU_NAFSU_MAKAN_TURUN', name: 'Penurunan nafsu makan' },
    ],
  },
  {
    id: 'tht',
    label: 'Kepala, Mata, Telinga, Hidung & Tenggorokan',
    items: [
      { code: 'THT_SAKIT_KEPALA', name: 'Sakit kepala' },
      { code: 'THT_PUSING_VERTIGO', name: 'Pusing/vertigo' },
      { code: 'THT_GANGGUAN_PENGLIHATAN', name: 'Gangguan penglihatan' },
      { code: 'THT_MATA_MERAH', name: 'Mata merah' },
      { code: 'THT_NYERI_MATA', name: 'Nyeri mata' },
      { code: 'THT_GANGGUAN_PENDENGARAN', name: 'Gangguan pendengaran' },
      { code: 'THT_TELINGA_BERDENGING', name: 'Telinga berdenging' },
      { code: 'THT_HIDUNG_TERSUMBAT', name: 'Hidung tersumbat' },
      { code: 'THT_PILEK', name: 'Pilek' },
      { code: 'THT_EPISTAKSIS', name: 'Epistaksis' },
      { code: 'THT_NYERI_TENGGOROKAN', name: 'Nyeri tenggorokan' },
      { code: 'THT_SULIT_MENELAN', name: 'Sulit menelan' },
    ],
  },
  {
    id: 'kardiovaskular',
    label: 'Kardiovaskular',
    items: [
      { code: 'CV_NYERI_DADA', name: 'Nyeri dada' },
      { code: 'CV_BERDEBAR', name: 'Berdebar' },
      { code: 'CV_SESAK_AKTIVITAS', name: 'Sesak saat aktivitas' },
      { code: 'CV_SESAK_BERBARING', name: 'Sesak saat berbaring' },
      { code: 'CV_TERBANGUN_SESAK', name: 'Terbangun malam karena sesak' },
      { code: 'CV_BENGKAK_TUNGKAI', name: 'Bengkak tungkai' },
      { code: 'CV_SINKOP', name: 'Pingsan/sinkop' },
      { code: 'CV_MUDAH_LELAH', name: 'Mudah lelah' },
    ],
  },
  {
    id: 'respirasi',
    label: 'Respirasi',
    items: [
      { code: 'RESP_BATUK', name: 'Batuk' },
      { code: 'RESP_DAHAK', name: 'Dahak' },
      { code: 'RESP_HEMOPTISIS', name: 'Batuk darah/hemoptisis' },
      { code: 'RESP_SESAK_NAPAS', name: 'Sesak napas' },
      { code: 'RESP_MENGI', name: 'Mengi' },
      { code: 'RESP_NYERI_DADA_NAPAS', name: 'Nyeri dada saat bernapas' },
    ],
  },
  {
    id: 'gastrointestinal',
    label: 'Gastrointestinal',
    items: [
      { code: 'GI_MUAL', name: 'Mual' },
      { code: 'GI_MUNTAH', name: 'Muntah' },
      { code: 'GI_NYERI_PERUT', name: 'Nyeri perut' },
      { code: 'GI_KEMBUNG', name: 'Kembung' },
      { code: 'GI_SULIT_MENELAN', name: 'Sulit menelan' },
      { code: 'GI_HEARTBURN', name: 'Heartburn' },
      { code: 'GI_DIARE', name: 'Diare' },
      { code: 'GI_KONSTIPASI', name: 'Konstipasi' },
      { code: 'GI_BAB_BERDARAH', name: 'BAB berdarah' },
      { code: 'GI_BAB_MELENA', name: 'BAB hitam/melena' },
      { code: 'GI_PERUBAHAN_POLA_BAB', name: 'Perubahan pola BAB' },
    ],
  },
  {
    id: 'genitourinaria',
    label: 'Genitourinaria',
    items: [
      { code: 'GU_DISURIA', name: 'Nyeri saat BAK/disuria' },
      { code: 'GU_FREKUENSI_MENINGKAT', name: 'Frekuensi BAK meningkat' },
      { code: 'GU_URGENSI', name: 'Urgensi' },
      { code: 'GU_NOKTURIA', name: 'BAK malam/nokturia' },
      { code: 'GU_HEMATURIA', name: 'Darah dalam urine/hematuria' },
      { code: 'GU_SULIT_MEMULAI', name: 'Sulit memulai BAK' },
      { code: 'GU_INKONTINENSIA', name: 'Tidak dapat menahan BAK' },
      { code: 'GU_URINE_BERKURANG', name: 'Penurunan jumlah urine' },
    ],
  },
  {
    id: 'muskuloskeletal',
    label: 'Muskuloskeletal',
    items: [
      { code: 'MS_NYERI_SENDI', name: 'Nyeri sendi' },
      { code: 'MS_NYERI_OTOT', name: 'Nyeri otot' },
      { code: 'MS_BENGKAK_SENDI', name: 'Bengkak sendi' },
      { code: 'MS_KAKU_SENDI', name: 'Kaku sendi' },
      { code: 'MS_KELEMAHAN_GERAK', name: 'Kelemahan anggota gerak' },
      { code: 'MS_GANGGUAN_BERJALAN', name: 'Gangguan berjalan' },
      { code: 'MS_RIWAYAT_JATUH', name: 'Riwayat jatuh' },
    ],
  },
  {
    id: 'neurologis',
    label: 'Neurologis',
    items: [
      { code: 'NEU_PENURUNAN_KESADARAN', name: 'Penurunan kesadaran' },
      { code: 'NEU_KEJANG', name: 'Kejang' },
      { code: 'NEU_SAKIT_KEPALA', name: 'Sakit kepala' },
      { code: 'NEU_PUSING', name: 'Pusing' },
      { code: 'NEU_KESEMUTAN', name: 'Kesemutan' },
      { code: 'NEU_MATI_RASA', name: 'Mati rasa' },
      { code: 'NEU_KELEMAHAN_SATU_SISI', name: 'Kelemahan satu sisi tubuh' },
      { code: 'NEU_GANGGUAN_BICARA', name: 'Gangguan bicara' },
      { code: 'NEU_GANGGUAN_KESEIMBANGAN', name: 'Gangguan keseimbangan' },
      { code: 'NEU_GANGGUAN_MEMORI', name: 'Gangguan memori' },
    ],
  },
  {
    id: 'kulit',
    label: 'Kulit',
    items: [
      { code: 'KUL_RUAM', name: 'Ruam' },
      { code: 'KUL_GATAL', name: 'Gatal' },
      { code: 'KUL_LUKA', name: 'Luka' },
      { code: 'KUL_PERUBAHAN_WARNA', name: 'Perubahan warna kulit' },
      { code: 'KUL_KERING', name: 'Kulit kering' },
      { code: 'KUL_LUKA_SULIT_SEMBUH', name: 'Luka sulit sembuh' },
      { code: 'KUL_BENGKAK', name: 'Bengkak' },
    ],
  },
  {
    id: 'endokrin',
    label: 'Endokrin & Metabolik',
    items: [
      { code: 'END_POLIDIPSIA', name: 'Mudah haus/polidipsia' },
      { code: 'END_POLIURIA', name: 'Sering BAK/poliuria' },
      { code: 'END_POLIFAGIA', name: 'Mudah lapar/polifagia' },
      { code: 'END_INTOLERANSI_PANAS', name: 'Intoleransi panas' },
      { code: 'END_INTOLERANSI_DINGIN', name: 'Intoleransi dingin' },
      { code: 'END_PERUBAHAN_BB', name: 'Perubahan berat badan' },
      { code: 'END_TREMOR', name: 'Tremor' },
      { code: 'END_KERINGAT_BERLEBIH', name: 'Keringat berlebih' },
    ],
  },
  {
    id: 'hematologi',
    label: 'Hematologi',
    items: [
      { code: 'HEM_MUDAH_MEMAR', name: 'Mudah memar' },
      { code: 'HEM_PERDARAHAN', name: 'Perdarahan' },
      { code: 'HEM_MIMISAN', name: 'Mimisan' },
      { code: 'HEM_GUSI_BERDARAH', name: 'Gusi mudah berdarah' },
      { code: 'HEM_PUCAT', name: 'Pucat' },
      { code: 'HEM_RIWAYAT_ANEMIA', name: 'Riwayat anemia' },
    ],
  },
  {
    id: 'psikiatri',
    label: 'Psikiatri',
    items: [
      { code: 'PSI_CEMAS', name: 'Cemas' },
      { code: 'PSI_SEDIH_DEPRESIF', name: 'Sedih/depresif' },
      { code: 'PSI_MUDAH_MARAH', name: 'Mudah marah' },
      { code: 'PSI_GANGGUAN_TIDUR', name: 'Gangguan tidur' },
      { code: 'PSI_PENURUNAN_MINAT', name: 'Penurunan minat' },
      { code: 'PSI_GANGGUAN_KONSENTRASI', name: 'Gangguan konsentrasi' },
      { code: ROS_SELF_HARM_CODE, name: 'Pikiran menyakiti diri' },
    ],
  },
];

// Flat lookup maps, built once at module load.
export const ROS_SYSTEM_BY_ID: Record<string, RosSystem> = Object.fromEntries(
  ROS_SYSTEMS.map((s) => [s.id, s])
);

export const ROS_SYMPTOM_INDEX: Record<string, { system: RosSystem; symptom: RosSymptom }> = {};
for (const system of ROS_SYSTEMS) {
  for (const symptom of system.items) {
    ROS_SYMPTOM_INDEX[symptom.code] = { system, symptom };
  }
}

export function isRosSelfHarmPositive(items: Pick<RosItemRecord, 'symptomCode' | 'status'>[]): boolean {
  return items.some((i) => i.symptomCode === ROS_SELF_HARM_CODE && i.status === 'positive');
}

/**
 * Build the default (all "Tidak ada") item map for a brand-new encounter.
 */
export function buildDefaultRosItems(
  patientId: string,
  encounterId: string,
  assessmentDate: string,
  doctorId?: string
): Record<string, RosItemRecord> {
  const out: Record<string, RosItemRecord> = {};
  for (const system of ROS_SYSTEMS) {
    for (const symptom of system.items) {
      out[symptom.code] = {
        patientId,
        doctorId,
        encounterId,
        assessmentDate,
        systemName: system.id,
        symptomCode: symptom.code,
        symptomName: symptom.name,
        status: ROS_DEFAULT_STATUS,
      };
    }
  }
  return out;
}

/**
 * Generate the auto-summary (section 7 of the spec): only describes systems
 * that have at least one positive finding, using ONLY the data that was
 * actually entered — never invents symptoms.
 */
export function generateRosSummary(items: RosItemRecord[]): string {
  const positiveBySystem = new Map<string, RosItemRecord[]>();
  for (const item of items) {
    if (item.status !== 'positive') continue;
    const list = positiveBySystem.get(item.systemName) ?? [];
    list.push(item);
    positiveBySystem.set(item.systemName, list);
  }

  if (positiveBySystem.size === 0) {
    return 'Seluruh sistem yang dikaji tidak menunjukkan keluhan bermakna (dalam batas normal).';
  }

  const sentences: string[] = [];
  const systemsWithFindings: string[] = [];

  for (const system of ROS_SYSTEMS) {
    const findings = positiveBySystem.get(system.id);
    if (!findings || findings.length === 0) continue;
    systemsWithFindings.push(system.label);
    const parts = findings.map((f) => {
      const detail = f.detail?.trim();
      return detail ? `${f.symptomName.toLowerCase()} (${detail})` : f.symptomName.toLowerCase();
    });
    sentences.push(`Sistem ${system.label.toLowerCase()} ditemukan keluhan berupa ${parts.join(', ')}.`);
  }

  const assessedSystems = new Set(items.map((i) => i.systemName));
  const otherSystems = ROS_SYSTEMS
    .filter((s) => assessedSystems.has(s.id) && !positiveBySystem.has(s.id))
    .map((s) => s.label.toLowerCase());

  if (otherSystems.length > 0) {
    sentences.push(`Sistem ${otherSystems.join(', ')} tidak ditemukan keluhan bermakna.`);
  }

  return sentences.join(' ');
}
