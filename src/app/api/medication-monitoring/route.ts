import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientName, primaryDiagnosis, medications, monitoringData, complianceRate, sideEffects, notConsumedReasons } = body;

    // Try to use AI SDK for analysis
    let aiAnalysis: string;
    try {
      const { z } = await import('z-ai-web-dev-sdk');
      const prompt = `Anda adalah asisten klinis AI yang mengkhususkan diri dalam perawatan paliatif dan monitoring obat. Analisis data monitoring obat pasien berikut dan berikan rekomendasi klinis.

DATA PASIEN:
- Nama: ${patientName || '-'}
- Diagnosa Utama: ${primaryDiagnosis || '-'}

DATA MONITORING OBAT:
- Tingkat Kepatuhan: ${complianceRate || 0}%
- Obat Diminum: ${monitoringData?.takenDoses || 0} dari ${monitoringData?.totalDoses || 0} dosis
- Dosis Terlewat: ${monitoringData?.missedDoses || 0}
- Obat Tidak Diminum: ${monitoringData?.notConsumedDoses || 0}

EFEK SAMPING YANG DILAPORKAN:
${sideEffects?.length > 0 ? sideEffects.map((se: { type: string; count: number }) => `- ${se.type}: ${se.count} kali`).join('\n') : '- Tidak ada efek samping yang dilaporkan'}

ALASAN TIDAK MINUM OBAT:
${notConsumedReasons?.length > 0 ? notConsumedReasons.map((ncr: { reason: string; count: number }) => `- ${ncr.reason}: ${ncr.count} kali`).join('\n') : '- Tidak ada alasan tidak minum obat'}

DETAIL OBAT:
${medications?.map((med: { name: string; status: string; sideEffects: string[] }) => `- ${med.name}: ${med.status}${med.sideEffects?.length > 0 ? ` (Efek samping: ${med.sideEffects.join(', ')})` : ''}`).join('\n') || '- Tidak ada data obat'}

Berikan analisis dalam format berikut:
1. RINGKASAN KEPATUHAN: Evaluasi tingkat kepatuhan pasien
2. IDENTIFIKASI MASALAH: Masalah yang teridentifikasi dari data monitoring
3. RISIKO KLINIS: Risiko yang perlu diwaspadai
4. REKOMENDASI TINDAK LANJUT: Langkah-langkah yang direkomendasikan
5. SOAP NOTE: Catatan SOAP berdasarkan data monitoring obat`;

      const result = await z.chat({
        model: 'default',
        messages: [{ role: 'user', content: prompt }],
      });
      aiAnalysis = result.choices?.[0]?.message?.content || '';
    } catch {
      // Fallback: generate local analysis
      aiAnalysis = generateLocalAnalysis(patientName, primaryDiagnosis, complianceRate, monitoringData, sideEffects, notConsumedReasons, medications);
    }

    return NextResponse.json({ success: true, analysis: aiAnalysis });
  } catch (error) {
    console.error('Medication monitoring analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menganalisis data monitoring obat' },
      { status: 500 }
    );
  }
}

function generateLocalAnalysis(
  patientName: string,
  primaryDiagnosis: string,
  complianceRate: number,
  monitoringData: { totalDoses: number; takenDoses: number; missedDoses: number; notConsumedDoses: number },
  sideEffects: { type: string; count: number }[],
  notConsumedReasons: { reason: string; count: number }[],
  medications: { name: string; status: string; sideEffects: string[] }[]
): string {
  const totalDoses = monitoringData?.totalDoses || 0;
  const takenDoses = monitoringData?.takenDoses || 0;
  const missedDoses = monitoringData?.missedDoses || 0;
  const notConsumedDoses = monitoringData?.notConsumedDoses || 0;
  const rate = complianceRate || (totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0);

  // Compliance assessment
  let complianceLevel: string;
  if (rate >= 90) complianceLevel = 'Baik';
  else if (rate >= 70) complianceLevel = 'Cukup';
  else if (rate >= 50) complianceLevel = 'Kurang';
  else complianceLevel = 'Buruk';

  // Risk assessment
  const risks: string[] = [];
  if (rate < 70) risks.push('Ketidakpatuhan obat yang signifikan dapat memperburuk kondisi penyakit');
  if (notConsumedDoses >= 2) risks.push('Terdapat obat yang tidak diminum secara berulang, perlu evaluasi penyebab');
  if (sideEffects?.some(se => ['nyeri_bertambah', 'sesak_napas', 'reaksi_alergi'].includes(se.type))) {
    risks.push('Terdapat efek samping serius yang memerlukan evaluasi segera');
  }
  if (missedDoses >= 3) risks.push('Frekuensi dosis terlewat tinggi, perlu intervensi');

  // Recommendations
  const recommendations: string[] = [];
  if (rate < 80) recommendations.push('Evaluasi hambatan kepatuhan dan pertimbangkan penyederhanaan regimen obat');
  if (sideEffects?.length > 0) recommendations.push('Tinjau manajemen efek samping dan pertimbangkan penyesuaian dosis');
  if (notConsumedReasons?.some(ncr => ncr.reason === 'efek_samping')) {
    recommendations.push('Evaluasi obat yang menyebabkan efek samping dan pertimbangkan alternatif');
  }
  if (notConsumedReasons?.some(ncr => ncr.reason === 'sulit_menelan')) {
    recommendations.push('Pertimbangkan formulasi alternatif (sirup, sublingual, atau patch)');
  }
  if (notConsumedReasons?.some(ncr => ncr.reason === 'tidak_ada_obat' || ncr.reason === 'tidak_mampu_membeli')) {
    recommendations.push('Evaluasi ketersediaan obat dan bantuan akses obat');
  }
  if (rate >= 90) recommendations.push('Pertahankan kepatuhan yang baik dan lakukan monitoring rutin');

  const topSideEffects = sideEffects?.slice(0, 5).map(se => se.type).join(', ') || 'Tidak ada';
  const topReasons = notConsumedReasons?.slice(0, 3).map(ncr => ncr.reason).join(', ') || 'Tidak ada';

  return `1. RINGKASAN KEPATUHAN
Tingkat kepatuhan pasien ${patientName || '-'} terhadap regimen obat paliatif adalah ${rate}% (${complianceLevel}). Dari total ${totalDoses} dosis, ${takenDoses} dosis diminum tepat waktu, ${missedDoses} dosis terlewat, dan ${notConsumedDoses} dosis tidak diminum.

2. IDENTIFIKASI MASALAH
${rate < 80 ? `- Kepatuhan di bawah target (80%), perlu intervensi\n` : ''}${missedDoses > 0 ? `- ${missedDoses} dosis terlewat yang perlu ditindaklanjuti\n` : ''}${notConsumedDoses > 0 ? `- ${notConsumedDoses} dosis sengaja tidak diminum\n` : ''}${sideEffects?.length > 0 ? `- Efek samping dilaporkan: ${topSideEffects}\n` : ''}- Alasan utama tidak minum obat: ${topReasons}

3. RISIKO KLINIS
${risks.length > 0 ? risks.map(r => `- ${r}`).join('\n') : '- Tidak ada risiko klinis signifikan yang teridentifikasi saat ini'}

4. REKOMENDASI TINDAK LANJUT
${recommendations.map(r => `- ${r}`).join('\n')}
- Lakukan monitoring kepatuhan obat secara berkala
- Komunikasikan hasil monitoring dengan pasien dan keluarga
- Dokumentasikan perubahan regimen obat jika ada

5. SOAP NOTE
S: Pasien ${patientName || '-'} dengan diagnosa ${primaryDiagnosis || '-'}. Tingkat kepatuhan obat ${rate}%. ${sideEffects?.length > 0 ? `Melaporkan efek samping: ${topSideEffects}.` : 'Tidak melaporkan efek samping.'} ${notConsumedDoses > 0 ? `Terdapat ${notConsumedDoses} dosis yang tidak diminum dengan alasan: ${topReasons}.` : ''}
O: Kepatuhan ${rate}% (${complianceLevel}). Dosis diminum ${takenDoses}/${totalDoses}. Dosis terlewat ${missedDoses}. Dosis tidak diminum ${notConsumedDoses}. ${sideEffects?.length > 0 ? `Efek samping tercatat ${sideEffects.length} jenis.` : ''}
A: ${rate >= 80 ? 'Kepatuhan obat dalam batas acceptable, lanjutkan monitoring.' : 'Kepatuhan obat di bawah target, perlu intervensi untuk meningkatkan kepatuhan.'} ${risks.length > 0 ? risks[0] + '.' : ''}
P: ${recommendations[0] || 'Lanjutkan monitoring obat rutin'}. Evaluasi ulang dalam 1 minggu. ${rate < 70 ? 'Pertimbangkan telekonsultasi untuk diskusi kepatuhan.' : ''}`;
}
