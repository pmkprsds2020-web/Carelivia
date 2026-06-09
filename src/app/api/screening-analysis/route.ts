import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { screeningType, triage, clinicalSummary, moduleScores, moduleAnswers } = body;

    if (!triage || !clinicalSummary || !moduleScores) {
      return NextResponse.json(
        { error: 'Missing required fields: triage, clinicalSummary, moduleScores' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Build module scores summary for AI analysis
    const moduleScoresSummary = Object.entries(moduleScores as Record<string, { score: number; riskCategory: string; label: string; recommendations: string[] }>)
      .map(([moduleId, data]) => {
        const moduleLabel = data.label || moduleId;
        const riskLabel = data.riskCategory === 'tinggi' ? 'Tinggi' : data.riskCategory === 'sedang' ? 'Sedang' : 'Rendah';
        const recs = data.recommendations?.length > 0 ? data.recommendations.join('; ') : '-';
        return `• ${moduleLabel}: Skor ${data.score} — Risiko ${riskLabel} — Rekomendasi: ${recs}`;
      })
      .join('\n');

    // Build clinical summary for AI
    const vitalSignsParts: string[] = [];
    if (clinicalSummary.vitalSigns) {
      const vs = clinicalSummary.vitalSigns;
      if (vs.bloodPressure) vitalSignsParts.push(`TD: ${vs.bloodPressure} mmHg`);
      if (vs.heartRate) vitalSignsParts.push(`Nadi: ${vs.heartRate} bpm`);
      if (vs.temperature) vitalSignsParts.push(`Suhu: ${vs.temperature}°C`);
      if (vs.oxygenSat) vitalSignsParts.push(`SpO2: ${vs.oxygenSat}%`);
      if (vs.weight) vitalSignsParts.push(`BB: ${vs.weight} kg`);
      if (vs.height) vitalSignsParts.push(`TB: ${vs.height} cm`);
      if (vs.bloodSugar) vitalSignsParts.push(`GDS: ${vs.bloodSugar} mg/dL`);
    }

    const triageLabel = triage.level === 'merah' ? 'MERAH (Rujukan IGD)' :
      triage.level === 'oranye' ? 'ORANYE (Home Care)' :
      triage.level === 'kuning' ? 'KUNING (Evaluasi 24 Jam)' : 'HIJAU (Aman Telekonsultasi)';

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `Anda adalah AI Clinical Assistant untuk sistem telemedicine MedikaLink di Indonesia. Anda menganalisis hasil Skrining Komprehensif Telemedicine pasien yang mencakup 12 modul skrining, triage otomatis, dan ringkasan klinis. Anda memberikan analisis mendalam, faktor risiko utama, dan rekomendasi tindak lanjut berdasarkan pedoman klinis Indonesia. Gunakan bahasa Indonesia yang profesional namun mudah dipahami. Format jawaban dalam Markdown.`,
        },
        {
          role: 'user',
          content: `Analisis hasil Skrining Komprehensif Telemedicine berikut:

**Jenis Skrining**: ${screeningType || 'Skrining Komprehensif Telemedicine'}

**Hasil Triage**: ${triageLabel}
- Deskripsi: ${triage.description || '-'}
- Rekomendasi Triage: ${triage.recommendation || '-'}

**Ringkasan Klinis**:
- Keluhan Utama: ${clinicalSummary.chiefComplaint || 'Tidak disebutkan'}
- Skala Nyeri: ${clinicalSummary.painScore !== null && clinicalSummary.painScore !== undefined ? clinicalSummary.painScore + '/10' : 'Tidak dinilai'}
- Status Mental: ${clinicalSummary.mentalStatus || 'Normal'}
- Status Fungsional: ${clinicalSummary.functionalStatus || 'Mandiri'}
- Kebutuhan Home Care: ${clinicalSummary.homeCareNeed || 'Tidak diperlukan'}
- Status Paliatif: ${clinicalSummary.palliativeStatus || 'Tidak diperlukan'}
- Faktor Risiko: ${clinicalSummary.riskFactors?.length > 0 ? clinicalSummary.riskFactors.join(', ') : 'Tidak ada'}
- Penyakit Kronis: ${clinicalSummary.chronicDiseases?.length > 0 ? clinicalSummary.chronicDiseases.join(', ') : 'Tidak ada'}
- Tanda Bahaya (Red Flags): ${clinicalSummary.redFlags?.length > 0 ? clinicalSummary.redFlags.join(', ') : 'Tidak ada'}
- Tanda Vital: ${vitalSignsParts.length > 0 ? vitalSignsParts.join(', ') : 'Tidak tersedia'}

**Hasil Modul Skrining**:
${moduleScoresSummary || 'Tidak ada data modul'}

Berikan analisis dalam format berikut:

## Ringkasan Klinis
Ringkasan komprehensif kondisi pasien berdasarkan seluruh hasil skrining. Sertakan keluhan utama, temuan signifikan, dan kondisi kritis jika ada.

## Faktor Risiko & Tanda Bahaya
Identifikasi faktor risiko utama dan tanda bahaya dari seluruh modul skrining. Prioritaskan yang memerlukan tindakan segera.

## Analisis Per Modul
Untuk setiap modul yang menunjukkan risiko sedang atau tinggi, berikan analisis singkat dan rekomendasi spesifik.

## Rekomendasi Tindak Lanjut
Rekomendasi tindak lanjut berdasarkan pedoman klinis Indonesia:
- Tindakan segera yang diperlukan (jika ada)
- Pemeriksaan penunjang yang perlu dilakukan
- Konsultasi spesialis yang direkomendasikan
- Modifikasi gaya hidup dan edukasi pasien
- Follow-up timeline

## SOAP Note
Buat SOAP Note dari hasil skrining komprehensif:
- **Subjective**: Keluhan utama, riwayat penyakit, gejala yang dilaporkan pasien
- **Objective**: Tanda vital, skor skrining per modul, kategori risiko, tanda bahaya
- **Assessment**: Analisis kondisi keseluruhan, diagnosis kerja, tingkat urgensi
- **Plan**: Rencana tindak lanjut terperinci termasuk obat, rujukan, dan jadwal kontrol`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const analysis = completion.choices[0]?.message?.content || 'Tidak dapat menganalisis hasil skrining.';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Screening analysis error:', error);
    return NextResponse.json(
      { analysis: 'Gagal menganalisis hasil skrining. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
