import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/social-needs-screening-ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { screeningResult, answers, patientData } = body;

    if (!screeningResult) {
      return NextResponse.json(
        { error: 'Data hasil skrining wajib diisi' },
        { status: 400 }
      );
    }

    const {
      totalScore,
      maxScore,
      overallPercentage,
      overallRiskLevel,
      categoryScores,
    } = screeningResult;

    // Build a summary of answers for the prompt
    const answerSummary = Object.entries(answers || {})
      .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');

    const categorySummary = (categoryScores || [])
      .map(
        (cs: { categoryLabel: string; totalScore: number; maxScore: number; percentage: number; riskLevel: string }) =>
          `- ${cs.categoryLabel}: ${cs.totalScore}/${cs.maxScore} (${cs.percentage}% - ${cs.riskLevel})`
      )
      .join('\n');

    const prompt = `
DATA PASIEN:
- Nama: ${patientData?.name || '-'}
- Peran: ${patientData?.role || '-'}

HASIL SKRINING KEBUTUHAN SOSIAL:
- Skor Total: ${totalScore}/${maxScore}
- Persentase Keseluruhan: ${overallPercentage}%
- Tingkat Risiko Keseluruhan: ${overallRiskLevel}

SKOR PER KATEGORI:
${categorySummary || '- Tidak ada data kategori'}

JAWABAN SKRINING:
${answerSummary || '- Tidak ada jawaban'}

INSTRUKSI ANALISIS:
Berdasarkan data skrining kebutuhan sosial pasien paliatif di atas, lakukan analisis komprehensif. Kamu adalah pekerja sosial medis dan psikolog klinis yang berpengalaman dalam perawatan paliatif.

Lakukan analisis berikut:
1. Evaluasi skor dukungan keluarga
2. Evaluasi skor risiko sosial keseluruhan
3. Evaluasi risiko caregiver burnout
4. Evaluasi akses terhadap pelayanan kesehatan
5. Evaluasi risiko finansial
6. Evaluasi tingkat isolasi sosial
7. Berikan rekomendasi intervensi yang prioritas
8. Identifikasi peringatan dini

PENTING:
- Setiap rekomendasi HARUS disertai alasan yang jelas
- Berikan penilaian risiko yang realistis berdasarkan data
- Rekomendasi harus praktis dan dapat ditindaklanjuti
- Gunakan bahasa Indonesia yang jelas

Kembalikan respons dalam format JSON yang valid dengan struktur berikut:
{
  "familySupportScore": "<'rendah'|'sedang'|'tinggi'|'sangat_tinggi'>",
  "socialRiskScore": "<'rendah'|'sedang'|'tinggi'|'sangat_tinggi'>",
  "caregiverBurnoutScore": "<'rendah'|'sedang'|'tinggi'|'sangat_tinggi'>",
  "accessToCareScore": "<'rendah'|'sedang'|'tinggi'|'sangat_tinggi'>",
  "financialRiskScore": "<'rendah'|'sedang'|'tinggi'|'sangat_tinggi'>",
  "socialIsolationScore": "<'rendah'|'sedang'|'tinggi'|'sangat_tinggi'>",
  "recommendations": [
    {
      "priority": <number 1-10>,
      "action": "<string - tindakan yang direkomendasikan>",
      "reason": "<string - alasan rekomendasi>",
      "category": "<'edukasi_keluarga'|'family_meeting'|'home_visit'|'konseling_psikososial'|'dukungan_caregiver'|'bantuan_finansial'|'bantuan_transportasi'|'rujukan_pekerja_sosial'|'pendampingan_spiritual'|'monitoring_intensif'>"
    }
  ],
  "analysisSummary": "<string - ringkasan analisis naratif>",
  "earlyWarnings": [
    {
      "type": "<string>",
      "severity": "<'info'|'warning'|'critical'>",
      "title": "<string>",
      "description": "<string>"
    }
  ]
}`.trim();

    const zai = await ZAI.create();
    const result = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Kamu adalah pekerja sosial medis dan psikolog klinis spesialis perawatan paliatif dengan pengalaman lebih dari 15 tahun. ' +
            'Kamu memiliki keahlian dalam menilai kebutuhan sosial pasien paliatif, menganalisis beban caregiver, mengevaluasi dukungan keluarga, ' +
            'dan merencanakan intervensi sosial yang berbasis bukti. ' +
            'Kamu harus memberikan analisis yang objektif, explainable, dan praktis. ' +
            'Selalu respons dalam format JSON yang valid sesuai struktur yang diminta.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const aiContent = result.choices[0].message.content;
    const aiResponse = JSON.parse(aiContent);

    return NextResponse.json({
      ...aiResponse,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Social Needs Screening AI error:', error);
    return NextResponse.json(
      { error: 'Gagal menghasilkan analisis kebutuhan sosial' },
      { status: 500 }
    );
  }
}
