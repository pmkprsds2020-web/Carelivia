import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type {
  DailyComplaintAIResult,
  DailyComplaintCategory,
  DailyComplaintSeverity,
  DailyComplaintImpact,
  DailyAlertLevel,
} from '@/lib/types';

// POST /api/daily-complaints-ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messageText,
      patientName,
      patientId,
      medicalRecordNumber,
      inputSource,
      saveCategory,
    } = body as {
      messageText: string;
      patientName: string;
      patientId: string;
      medicalRecordNumber: string;
      inputSource: 'pasien' | 'keluarga' | 'dokter' | 'perawat';
      saveCategory:
        | 'keluhan_harian'
        | 'perkembangan_kondisi'
        | 'efek_samping_terapi'
        | 'permasalahan_psikologis'
        | 'permasalahan_sosial'
        | 'keluhan_lainnya';
    };

    if (!messageText || !messageText.trim()) {
      return NextResponse.json(
        { error: 'Teks pesan wajib diisi' },
        { status: 400 }
      );
    }

    const inputSourceLabel: Record<string, string> = {
      pasien: 'Pasien',
      keluarga: 'Keluarga',
      dokter: 'Dokter',
      perawat: 'Perawat',
    };

    const saveCategoryLabel: Record<string, string> = {
      keluhan_harian: 'Keluhan Harian',
      perkembangan_kondisi: 'Perkembangan Kondisi',
      efek_samping_terapi: 'Efek Samping Terapi',
      permasalahan_psikologis: 'Permasalahan Psikologis',
      permasalahan_sosial: 'Permasalahan Sosial',
      keluhan_lainnya: 'Keluhan Lainnya',
    };

    const prompt = `
DATA PASIEN:
- Nama: ${patientName || '-'}
- ID Pasien: ${patientId || '-'}
- No. Rekam Medis: ${medicalRecordNumber || '-'}
- Sumber Input: ${inputSourceLabel[inputSource] || inputSource || '-'}
- Kategori Penyimpanan: ${saveCategoryLabel[saveCategory] || saveCategory || '-'}

PESAN PASIEN:
"${messageText}"

INSTRUKSI ANALISIS:
Kamu adalah perawat paliatif dan klinisi berpengalaman dalam menilai keluhan harian pasien paliatif. Analisis pesan pasien di atas dan lakukan klasifikasi keluhan secara komprehensif.

Lakukan analisis berikut:
1. Identifikasi kategori keluhan utama dari pesan pasien
2. Tentukan skor keparahan (0-10) berdasarkan deskripsi keluhan
3. Tentukan tingkat keparahan (ringan/sedang/berat)
4. Tentukan dampak keluhan terhadap aktivitas pasien
5. Ekstrak semua keluhan yang disebutkan dalam pesan
6. Berikan catatan tambahan dari analisis klinis
7. Tentukan level waspada (hijau/kuning/merah) berdasarkan urgensi
8. Berikan saran tindak lanjut yang sesuai

PANDUAN PENILAIAN:
- Skor 0-3 = ringan, 4-6 = sedang, 7-10 = berat
- Level waspada hijau: keluhan ringan, dapat dipantau rutin
- Level waspada kuning: keluhan sedang, perlu perhatian lebih
- Level waspada merah: keluhan berat/urgensi tinggi, perlu penanganan segera

PENTING:
- Analisis harus objektif berdasarkan isi pesan
- Saran tindak lanjut harus praktis dan dapat ditindaklanjuti
- Gunakan bahasa Indonesia yang jelas
- Jika pesan mengandung lebih dari satu keluhan, identifikasi keluhan utama sebagai kategori

Kembalikan respons dalam format JSON yang valid dengan struktur berikut:
{
  "category": "<nyeri|sesak_napas|mual|muntah|nafsu_makan_menurun|kelelahan|gangguan_tidur|konstipasi|diare|batuk|kecemasan|depresi|masalah_spiritual|masalah_sosial|keluhan_lainnya>",
  "severityScore": <number 0-10>,
  "severity": "<ringan|sedang|berat>",
  "impact": "<tidak_mengganggu|sedikit_mengganggu|mengganggu_aktivitas|sangat_mengganggu>",
  "extractedComplaints": ["<complaint1>", "<complaint2>"],
  "additionalNotes": "<string - catatan tambahan analisis klinis>",
  "alertLevel": "<hijau|kuning|merah>",
  "suggestedFollowUp": "<string - saran tindak lanjut>"
}`.trim();

    try {
      const zai = await ZAI.create();
      const result = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Kamu adalah perawat paliatif dan klinisis spesialis penilaian keluhan harian pasien paliatif dengan pengalaman lebih dari 15 tahun. ' +
              'Kamu memiliki keahlian dalam mengklasifikasikan keluhan pasien, menilai tingkat keparahan, dan merekomendasikan tindak lanjut yang tepat. ' +
              'Kamu harus memberikan analisis yang objektif, explainable, dan praktis. ' +
              'Selalu respons dalam format JSON yang valid sesuai struktur yang diminta.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const aiContent = result.choices[0].message.content;
      const aiResponse = JSON.parse(aiContent);

      // Validate and return the AI result
      const validatedResult: DailyComplaintAIResult = {
        category: validateCategory(aiResponse.category),
        severityScore: validateSeverityScore(aiResponse.severityScore),
        severity: validateSeverity(aiResponse.severity),
        impact: validateImpact(aiResponse.impact),
        extractedComplaints: Array.isArray(aiResponse.extractedComplaints)
          ? aiResponse.extractedComplaints.filter((c: unknown) => typeof c === 'string')
          : [],
        additionalNotes: typeof aiResponse.additionalNotes === 'string' ? aiResponse.additionalNotes : '',
        alertLevel: validateAlertLevel(aiResponse.alertLevel),
        suggestedFollowUp: typeof aiResponse.suggestedFollowUp === 'string' ? aiResponse.suggestedFollowUp : '',
      };

      return NextResponse.json({
        ...validatedResult,
        generatedAt: new Date().toISOString(),
        aiGenerated: true,
      });
    } catch (aiError) {
      console.error('Daily Complaints AI call failed, using fallback:', aiError);
      // Fallback to local keyword-based analysis
      const fallbackResult = localKeywordAnalysis(messageText);
      return NextResponse.json({
        ...fallbackResult,
        generatedAt: new Date().toISOString(),
        aiGenerated: false,
      });
    }
  } catch (error) {
    console.error('Daily Complaints AI error:', error);
    return NextResponse.json(
      { error: 'Gagal mengklasifikasikan keluhan harian' },
      { status: 500 }
    );
  }
}

// --- Validation helpers ---

const VALID_CATEGORIES: DailyComplaintCategory[] = [
  'nyeri', 'sesak_napas', 'mual', 'muntah', 'nafsu_makan_menurun',
  'kelelahan', 'gangguan_tidur', 'konstipasi', 'diare', 'batuk',
  'kecemasan', 'depresi', 'masalah_spiritual', 'masalah_sosial', 'keluhan_lainnya',
];

const VALID_SEVERITIES: DailyComplaintSeverity[] = ['ringan', 'sedang', 'berat'];
const VALID_IMPACTS: DailyComplaintImpact[] = ['tidak_mengganggu', 'sedikit_mengganggu', 'mengganggu_aktivitas', 'sangat_mengganggu'];
const VALID_ALERT_LEVELS: DailyAlertLevel[] = ['hijau', 'kuning', 'merah'];

function validateCategory(value: unknown): DailyComplaintCategory {
  if (typeof value === 'string' && VALID_CATEGORIES.includes(value as DailyComplaintCategory)) {
    return value as DailyComplaintCategory;
  }
  return 'keluhan_lainnya';
}

function validateSeverityScore(value: unknown): number {
  if (typeof value === 'number' && value >= 0 && value <= 10) {
    return Math.round(value);
  }
  return 5;
}

function validateSeverity(value: unknown): DailyComplaintSeverity {
  if (typeof value === 'string' && VALID_SEVERITIES.includes(value as DailyComplaintSeverity)) {
    return value as DailyComplaintSeverity;
  }
  return 'sedang';
}

function validateImpact(value: unknown): DailyComplaintImpact {
  if (typeof value === 'string' && VALID_IMPACTS.includes(value as DailyComplaintImpact)) {
    return value as DailyComplaintImpact;
  }
  return 'sedikit_mengganggu';
}

function validateAlertLevel(value: unknown): DailyAlertLevel {
  if (typeof value === 'string' && VALID_ALERT_LEVELS.includes(value as DailyAlertLevel)) {
    return value as DailyAlertLevel;
  }
  return 'kuning';
}

// --- Fallback: local keyword-based analysis ---

function localKeywordAnalysis(messageText: string): DailyComplaintAIResult {
  const text = messageText.toLowerCase();

  const keywordMap: { keywords: string[]; category: DailyComplaintCategory }[] = [
    { keywords: ['nyeri', 'sakit', 'pegal'], category: 'nyeri' },
    { keywords: ['sesak', 'napas', 'nafas'], category: 'sesak_napas' },
    { keywords: ['mual', 'muak'], category: 'mual' },
    { keywords: ['muntah'], category: 'muntah' },
    { keywords: ['nafsu makan', 'tidak mau makan', 'tidak bisa makan'], category: 'nafsu_makan_menurun' },
    { keywords: ['lelah', 'lemas', 'tidak bertenaga'], category: 'kelelahan' },
    { keywords: ['tidur', 'insomnia', 'sulit tidur'], category: 'gangguan_tidur' },
    { keywords: ['konstipasi', 'sembelit', 'susah bab', 'tidak bab'], category: 'konstipasi' },
    { keywords: ['diare', 'mencret', 'berak air'], category: 'diare' },
    { keywords: ['batuk'], category: 'batuk' },
    { keywords: ['cemas', 'khawatir', 'takut'], category: 'kecemasan' },
    { keywords: ['sedih', 'depresi', 'putus asa'], category: 'depresi' },
    { keywords: ['spiritual', 'agama', 'doa', 'tuhan'], category: 'masalah_spiritual' },
    { keywords: ['sendiri', 'kesepian', 'tidak ada yang menemani', 'terisolasi'], category: 'masalah_sosial' },
  ];

  const extractedComplaints: string[] = [];
  let matchedCategory: DailyComplaintCategory = 'keluhan_lainnya';

  for (const { keywords, category } of keywordMap) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        if (matchedCategory === 'keluhan_lainnya') {
          matchedCategory = category;
        }
        extractedComplaints.push(keyword);
        break; // Only add one keyword match per category
      }
    }
  }

  // If no complaints extracted, add the full message as a generic complaint
  if (extractedComplaints.length === 0) {
    extractedComplaints.push(messageText.trim().substring(0, 100));
  }

  // Default severity: sedang (5), default impact: sedikit_mengganggu
  const severityScore = 5;
  const severity: DailyComplaintSeverity = 'sedang';
  const impact: DailyComplaintImpact = 'sedikit_mengganggu';

  // Determine alert level based on some urgency keywords
  const urgentKeywords = ['tidak bisa napas', 'sangat sakit', 'tidak bisa bergerak', 'darurat', 'sekarang'];
  const moderateKeywords = ['cukup sakit', 'agak', 'mulai', 'makin'];

  let alertLevel: DailyAlertLevel = 'hijau';
  for (const kw of urgentKeywords) {
    if (text.includes(kw)) {
      alertLevel = 'merah';
      break;
    }
  }
  if (alertLevel === 'hijau') {
    for (const kw of moderateKeywords) {
      if (text.includes(kw)) {
        alertLevel = 'kuning';
        break;
      }
    }
  }

  const categoryLabelMap: Record<DailyComplaintCategory, string> = {
    nyeri: 'Nyeri',
    sesak_napas: 'Sesak Napas',
    mual: 'Mual',
    muntah: 'Muntah',
    nafsu_makan_menurun: 'Nafsu Makan Menurun',
    kelelahan: 'Kelelahan',
    gangguan_tidur: 'Gangguan Tidur',
    konstipasi: 'Konstipasi',
    diare: 'Diare',
    batuk: 'Batuk',
    kecemasan: 'Kecemasan',
    depresi: 'Depresi',
    masalah_spiritual: 'Masalah Spiritual',
    masalah_sosial: 'Masalah Sosial',
    keluhan_lainnya: 'Keluhan Lainnya',
  };

  const additionalNotes = `Klasifikasi otomatis berbasis kata kunci (AI tidak tersedia). Kategori terdeteksi: ${categoryLabelMap[matchedCategory]}. Disarankan untuk dilakukan penilaian ulang oleh tenaga medis.`;

  const suggestedFollowUp =
    alertLevel === 'merah'
      ? 'Segera lakukan penilaian klinis dan hubungi dokter yang bertanggung jawab.'
      : alertLevel === 'kuning'
        ? 'Lakukan pemantauan lebih ketat dan pertimbangkan konsultasi dengan perawat atau dokter.'
        : 'Pantau keluhan secara rutin dan dokumentasikan perubahan kondisi pasien.';

  return {
    category: matchedCategory,
    severityScore,
    severity,
    impact,
    extractedComplaints,
    additionalNotes,
    alertLevel,
    suggestedFollowUp,
  };
}
