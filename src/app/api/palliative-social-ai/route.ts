import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/palliative-social-ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientData, socialData, screeningData, caregiverData, financialData, transportData, meetingData } = body;

    if (!patientData) {
      return NextResponse.json(
        { error: 'Data pasien wajib diisi' },
        { status: 400 }
      );
    }

    const {
      name, age, gender, diagnosis, diseaseStage, careStatus, riskLevel,
      address, familyContactName, familyContactRelation, bpjsNumber,
    } = patientData;

    // Build comprehensive prompt for AI analysis
    const prompt = `
DATA PASIEN:
- Nama: ${name || '-'}
- Usia: ${age || '-'} tahun
- Jenis Kelamin: ${gender || '-'}
- Diagnosa Primer: ${diagnosis || '-'}
- Stadium Penyakit: ${diseaseStage || '-'}
- Status Perawatan: ${careStatus || '-'}
- Tingkat Risiko: ${riskLevel || '-'}
- Alamat: ${address || '-'}
- Kontak Keluarga: ${familyContactName || '-'} (${familyContactRelation || '-'})
- No. BPJS: ${bpjsNumber || '-'}

DATA SKRINING SOSIAL:
${socialData ? `
- Kondisi Tempat Tinggal: ${socialData.housingCondition || '-'}
- Ketersediaan Caregiver: ${socialData.caregiverAvailability || '-'}
- Dukungan Keluarga: ${socialData.familySupportLevel || '-'}
- Kendala Transportasi: ${socialData.transportDifficulty || '-'}
- Kendala Ekonomi: ${socialData.economicConstraint || '-'}
- Akses Layanan Kesehatan: ${socialData.healthcareAccess || '-'}
- Kebutuhan Alat Kesehatan: ${socialData.medicalEquipmentNeed || '-'}
- Kebutuhan Bantuan Sosial: ${socialData.socialAssistanceNeed || '-'}
- Risiko Isolasi Sosial: ${socialData.socialIsolationRisk || '-'}
- Prioritas Skrining: ${socialData.priorityLevel || '-'}
` : '- Belum ada data skrining sosial'}

DATA SKRINING PALLIATIF:
${screeningData ? screeningData.map((s: { type: string; score: number; label: string; interpretation: string }) =>
  `- ${s.type}: Skor ${s.score} (${s.label}) - ${s.interpretation}`
).join('\n') : '- Belum ada data skrining paliatif'}

DATA CAREGIVER:
${caregiverData ? caregiverData.map((c: { name: string; role: string; relation: string; zaritScore: number; zaritLevel: string; familyApgarScore: number; familyApgarLevel: string; schedule: string; tasks: string[] }) =>
  `- ${c.name} (${c.role}, ${c.relation}) | Zarit: ${c.zaritScore || 'N/A'} (${c.zaritLevel || 'N/A'}) | APGAR: ${c.familyApgarScore || 'N/A'} (${c.familyApgarLevel || 'N/A'}) | Jadwal: ${c.schedule || '-'} | Tugas: ${(c.tasks || []).join(', ') || '-'}`
).join('\n') : '- Belum ada data caregiver'}

DATA FINANSIAL:
${financialData ? `
- Status BPJS: ${financialData.bpjsStatus || '-'}
- Asuransi: ${financialData.insuranceStatus || '-'}
- Kebutuhan Bantuan: ${financialData.assistanceNeeds || '-'}
` : '- Belum ada data finansial'}

DATA TRANSPORTASI:
${transportData ? `
- Kebutuhan Transportasi: ${transportData.transportNeeds || '-'}
- Kendala Mobilitas: ${transportData.mobilityBarriers || '-'}
` : '- Belum ada data transportasi'}

DATA FAMILY MEETING:
${meetingData ? `
- Jumlah Riwayat Meeting: ${meetingData.totalMeetings || 0}
- Meeting Terakhir: ${meetingData.lastMeetingDate || '-'}
- Tindak Lanjut: ${(meetingData.followUpActions || []).join('; ') || '-'}
` : '- Belum ada data family meeting'}

INSTRUKSI ANALISIS:
Berdasarkan seluruh data di atas, lakukan analisis kebutuhan sosial pasien paliatif secara komprehensif. Kamu adalah pekerja sosial medis dan psikolog klinis yang berpengalaman dalam perawatan paliatif.

Lakukan analisis berikut:
1. Ringkasan kondisi sosial pasien secara naratif
2. Identifikasi risiko sosial (isolasi sosial, caregiver burnout, ketidakpatuhan terapi, putus pengobatan, masalah finansial, akses layanan, konflik keluarga, kebutuhan spiritual, rawat inap berulang, penurunan kualitas hidup)
3. Analisis dukungan keluarga (skor 0-100, skor risiko caregiver burnout 0-100, tingkat keterlibatan, kebutuhan family meeting, kebutuhan edukasi)
4. Analisis caregiver (status normal/ringan/sedang/berat, beban fisik, beban emosional, tingkat stres)
5. Analisis finansial (kebutuhan prioritas, rekomendasi bantuan sosial)
6. Analisis transportasi & akses (risiko keterlambatan kontrol, rekomendasi telekonsultasi/home visit/ambulans)
7. Rencana tindak lanjut (prioritas tinggi/sedang/rendah dengan deadline)
8. Early warning (peringatan dini jika terdeteksi masalah)

PENTING:
- Setiap rekomendasi HARUS disertai alasan (explainable AI)
- Berikan skor numerik yang realistis berdasarkan data
- Rekomendasi harus praktis dan dapat ditindaklanjuti
- Gunakan bahasa Indonesia yang jelas

Kembalikan respons dalam format JSON yang valid dengan struktur berikut:
{
  "socialConditionSummary": "<string - ringkasan kondisi sosial pasien>",
  "socialRisks": [
    {
      "riskType": "<'isolasi_sosial'|'caregiver_burnout'|'ketidakpatuhan_terapi'|'putus_pengobatan'|'masalah_finansial'|'akses_layanan'|'konflik_keluarga'|'kebutuhan_spiritual'|'rawat_inap_berulang'|'penurunan_kualitas_hidup'>",
      "level": "<'rendah'|'sedang'|'tinggi'>",
      "reason": "<string - alasan mengapa risiko ini diidentifikasi>"
    }
  ],
  "familySupportAnalysis": {
    "familySupportScore": <number 0-100>,
    "caregiverBurnoutRiskScore": <number 0-100>,
    "activeFamilyMembers": <number>,
    "familyInvolvementLevel": "<'tinggi'|'sedang'|'rendah'>",
    "needFamilyMeeting": <boolean>,
    "needFamilyEducation": <boolean>,
    "recommendations": ["<string>"]
  },
  "caregiverAnalysis": {
    "status": "<'normal'|'ringan'|'sedang'|'berat'>",
    "physicalBurden": "<'rendah'|'sedang'|'tinggi'>",
    "emotionalBurden": "<'rendah'|'sedang'|'tinggi'>",
    "companionDuration": "<string>",
    "stressLevel": "<'rendah'|'sedang'|'tinggi'>",
    "recommendations": ["<string>"]
  },
  "financialAnalysis": {
    "priorityNeeds": ["<'bantuan_finansial'|'alat_kesehatan'|'nutrisi'|'transportasi'|'home_care'|'pendampingan_sosial'>"],
    "economicConstraintLevel": "<'rendah'|'sedang'|'tinggi'>",
    "socialAssistanceRecommendations": ["<string>"]
  },
  "transportAnalysis": {
    "accessRiskLevel": "<'rendah'|'sedang'|'tinggi'>",
    "controlDelayRisk": "<'rendah'|'sedang'|'tinggi'>",
    "accessLossRisk": "<'rendah'|'sedang'|'tinggi'>",
    "teleconsultationRecommended": <boolean>,
    "homeVisitRecommended": <boolean>,
    "ambulanceRecommended": <boolean>,
    "recommendations": ["<string>"]
  },
  "actionPlan": [
    {
      "action": "<string>",
      "priority": "<'tinggi'|'sedang'|'rendah'>",
      "deadline": "<string - contoh: '7 hari', '30 hari'>",
      "category": "<'family_meeting'|'caregiver_support'|'home_visit'|'family_education'|'monitoring'|'financial_support'|'transport_support'|'psychosocial'|'other'>"
    }
  ],
  "earlyWarnings": [
    {
      "id": "<string>",
      "type": "<'penurunan_dukungan_keluarga'|'caregiver_burden_meningkat'|'risiko_putus_pengobatan'|'distress_tinggi'|'isolasi_sosial'|'masalah_finansial_berat'|'tidak_ada_caregiver_aktif'|'monitoring_terlambat'>",
      "severity": "<'info'|'warning'|'critical'>",
      "title": "<string>",
      "description": "<string>",
      "detectedAt": "<ISO datetime>"
    }
  ],
  "dataSourcesUsed": ["<string - sumber data yang dianalisis>"]
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
            'Kamu memahami Zarit Caregiver Burden Scale, Family APGAR, ESAS-r, PPS, dan Distress Thermometer. ' +
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
    console.error('Social AI analysis error:', error);
    return NextResponse.json(
      { error: 'Gagal menghasilkan analisis kebutuhan sosial' },
      { status: 500 }
    );
  }
}
