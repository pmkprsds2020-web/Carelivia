import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/palliative-resume
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { palliativePatientId } = body;

    if (!palliativePatientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Fetch patient data with all related records
    const patient = await db.palliativePatient.findUnique({
      where: { id: palliativePatientId },
      include: {
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 10 },
        medications: {
          where: { isActive: true },
          include: { adherences: { orderBy: { date: 'desc' }, take: 7 } },
        },
        acpDocuments: {
          where: { isActive: true },
          include: { revisions: true },
        },
        screeningRecords: { orderBy: { performedAt: 'desc' }, take: 10 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch the associated User for demographic info
    const user = await db.user.findUnique({ where: { id: patient.patientId } });

    // Build comprehensive clinical context
    const clinicalContext = buildClinicalContext(patient, user);

    // Attempt AI-generated resume
    let aiResume: string;
    let usedAI = false;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: [
              'Anda adalah asisten klinis AI yang ahli dalam perawatan paliatif dan pembuatan resume medis profesional.',
              'Tugas Anda adalah membuat resume medis paliatif yang komprehensif berdasarkan data pasien yang diberikan.',
              '',
              'Resume harus disusun dalam bahasa Indonesia dengan format berikut:',
              '',
              '## RINGKASAN KONDISI PASIEN',
              'Narasi komprehensif yang mencakup: diagnosa utama dan penyerta, kondisi saat ini, progresivitas penyakit, respons terapi, dan masalah utama yang dihadapi pasien.',
              '',
              '## RINGKASAN PEMERIKSAAN TERKINI',
              'Cakupan: TTV terbaru dengan interpretasi klinis, tren perubahan tanda vital, hasil skrining terkini, dan gejala dominan yang teridentifikasi.',
              '',
              '## RINGKASAN TERAPI',
              'Cakupan: obat aktif beserta dosis dan indikasi, intervensi non-farmakologis, edukasi yang telah diberikan, dan tingkat kepatuhan obat.',
              '',
              '## RINGKASAN ADVANCE CARE PLANNING',
              'Cakupan: preferensi perawatan, keputusan medis, keputusan keluarga, status DNR/CPR, preferensi ventilator dan ICU, harapan dan kekhawatiran pasien.',
              '',
              '## KESIMPULAN KLINIS',
              'Kesimpulan medis yang ditarik oleh AI berdasarkan seluruh data: prognosis, tingkat urgensi, dan arah perawatan.',
              '',
              '## REKOMENDASI',
              'Daftar rekomendasi yang bisa mencakup: lanjut monitoring paliatif, home care, rawat inap, konsultasi spesialis, hospice care, perawatan akhir hayat.',
              '',
              'PENTING:',
              '- Gunakan bahasa Indonesia yang profesional dan medis.',
              '- Berikan analisis spesifik berdasarkan data, bukan pernyataan umum.',
              '- Sertakan nilai numerik dari pemeriksaan dalam narasi.',
              '- Jika data tidak tersedia, nyatakan dengan jelas alih-alih berasumsi.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: `Berikut data pasien paliatif untuk dibuatkan resume medis:\n\n${clinicalContext}`,
          },
        ],
        thinking: { type: 'disabled' },
      });
      aiResume = completion.choices[0]?.message?.content || '';
      usedAI = !!aiResume;
    } catch (aiError) {
      console.error('AI resume generation failed, using local fallback:', aiError);
      aiResume = '';
      usedAI = false;
    }

    // Parse the AI response into structured sections, or use local fallback
    let resume: {
      ringkasanKondisi: string;
      ringkasanPemeriksaan: string;
      ringkasanTerapi: string;
      ringkasanACP: string;
      kesimpulanKlinis: string;
      rekomendasiAI: string;
      fullContent: string;
    };

    if (usedAI && aiResume) {
      resume = parseAIResume(aiResume);
    } else {
      resume = generateLocalResume(patient, user);
    }

    // Create audit log entry
    await db.auditLog.create({
      data: {
        action: 'PALLIATIVE_RESUME_GENERATED',
        entity: 'PalliativePatient',
        entityId: palliativePatientId,
        details: usedAI
          ? 'AI-powered palliative resume generated successfully'
          : 'Palliative resume generated using local fallback (AI unavailable)',
      },
    });

    return NextResponse.json({ resume });
  } catch (error) {
    console.error('Palliative resume generation error:', error);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}

// ── Helper: Format a value with optional suffix ────────────────────────────
function fmtVal(val: unknown, suffix: string): string {
  if (val == null) return '-' + suffix;
  return String(val) + suffix;
}

// ── Helper: Build comprehensive clinical context string ────────────────────
function buildClinicalContext(
  patient: Record<string, unknown>,
  user: Record<string, unknown> | null,
): string {
  const name = (user?.name as string) || 'Pasien';
  const dob = (user?.dateOfBirth as string) || '-';
  const gender = (user?.gender as string) || '-';
  const nik = (patient.nik as string) || '-';
  const rmNumber = (patient.rmNumber as string) || '-';
  const bpjs = (patient.bpjsNumber as string) || (user?.bpjsNumber as string) || '-';
  const address = (patient.address as string) || (user?.address as string) || '-';

  const vitals = (patient.vitalSigns || []) as Record<string, unknown>[];
  const medications = (patient.medications || []) as Record<string, unknown>[];
  const screenings = (patient.screeningRecords || []) as Record<string, unknown>[];
  const acpDocs = (patient.acpDocuments || []) as Record<string, unknown>[];

  const lines: string[] = [];

  // ── Demographics ──
  lines.push('=== DATA DEMOGRAFI PASIEN ===');
  lines.push('Nama: ' + name);
  lines.push('Tanggal Lahir: ' + dob);
  lines.push('Jenis Kelamin: ' + gender);
  lines.push('NIK: ' + nik);
  lines.push('No. Rekam Medis: ' + rmNumber);
  lines.push('No. BPJS: ' + bpjs);
  lines.push('Alamat: ' + address);
  lines.push('');

  // ── Clinical Info ──
  lines.push('=== INFORMASI KLINIS ===');
  lines.push('Diagnosa Utama: ' + (patient.primaryDiagnosis || '-'));
  lines.push('Diagnosa Penyerta: ' + (patient.secondaryDiagnosis || '-'));
  lines.push('Stadium Penyakit: ' + (patient.diseaseStage || '-'));
  lines.push('Status Perawatan: ' + patient.careStatus);
  lines.push('Status Pasien: ' + patient.patientStatus);
  lines.push('Tingkat Risiko: ' + patient.riskLevel);
  lines.push('Kontak Keluarga: ' + (patient.familyContactName || '-') + ' (' + (patient.familyContactRelation || '-') + ') - ' + (patient.familyContactPhone || '-'));
  lines.push('Catatan: ' + (patient.notes || '-'));
  lines.push('');

  // ── Vital Signs ──
  if (vitals.length > 0) {
    lines.push('=== TANDA TANDA VITAL (TTV) SERIAL ===');
    vitals.forEach((v, i) => {
      const tgl = new Date(v.recordedAt as string).toLocaleString('id-ID');
      const td = fmtVal(v.systolicBP, '') + '/' + fmtVal(v.diastolicBP, ' mmHg');
      const nadi = fmtVal(v.heartRate, ' bpm');
      const rr = fmtVal(v.respiratoryRate, '/menit');
      const suhu = fmtVal(v.temperature, '\u00B0C');
      const spo2 = fmtVal(v.oxygenSat, '%');
      const bb = fmtVal(v.weight, ' kg');
      const tb = fmtVal(v.height, ' cm');
      const bmiVal = fmtVal(v.bmi, '');
      const cat = v.notes ? ' | Catatan: ' + String(v.notes) : '';
      lines.push(
        (i + 1) + '. Tgl: ' + tgl +
        ' | TD: ' + td +
        ' | Nadi: ' + nadi +
        ' | RR: ' + rr +
        ' | Suhu: ' + suhu +
        ' | SpO2: ' + spo2 +
        ' | BB: ' + bb +
        ' | TB: ' + tb +
        ' | BMI: ' + bmiVal +
        cat,
      );
    });
    lines.push('');
  }

  // ── Medications ──
  if (medications.length > 0) {
    lines.push('=== OBAT AKTIF ===');
    medications.forEach((m) => {
      const adherences = (m.adherences || []) as Record<string, unknown>[];
      const missedDoses = adherences.filter((a) => a.missedDose).length;
      const adherenceRate =
        adherences.length > 0
          ? ((adherences.length - missedDoses) / adherences.length * 100).toFixed(0) + '%'
          : 'Belum ada data';
      const routeStr = m.route ? String(m.route) : 'oral';
      const indicationStr = m.indication ? String(m.indication) : '-';
      const startStr = m.startDate ? String(m.startDate) : '-';
      const endStr = m.endDate ? String(m.endDate) : '-';
      const notesStr = m.notes ? ' | Catatan: ' + String(m.notes) : '';
      lines.push(
        '- ' + m.medicineName + ' ' + m.dosage + ' ' + m.frequency +
        ' (' + routeStr + ')' +
        ' | Indikasi: ' + indicationStr +
        ' | Kepatuhan: ' + adherenceRate +
        ' | Mulai: ' + startStr +
        ' | Selesai: ' + endStr +
        notesStr,
      );
    });
    lines.push('');
  }

  // ── Screening Records ──
  if (screenings.length > 0) {
    lines.push('=== HASIL SKRINING PALIATIF ===');
    screenings.forEach((s) => {
      const tgl = new Date(s.performedAt as string).toLocaleDateString('id-ID');
      const scoreStr = s.score != null ? String(s.score) : '-';
      const labelStr = s.scoreLabel ? String(s.scoreLabel) : '-';
      const ewsStr = s.ewsLevel ? String(s.ewsLevel) : '-';
      const interpStr = s.interpretation ? String(s.interpretation) : '-';
      const detailStr = s.details ? ' | Detail: ' + String(s.details) : '';
      lines.push(
        '- ' + s.screeningType +
        ': Skor ' + scoreStr + ' (' + labelStr + ')' +
        ' | EWS: ' + ewsStr +
        ' | Tgl: ' + tgl +
        ' | Interpretasi: ' + interpStr +
        detailStr,
      );
    });
    lines.push('');
  }

  // ── Advance Care Planning ──
  if (acpDocs.length > 0) {
    lines.push('=== ADVANCE CARE PLANNING ===');
    acpDocs.forEach((acp, idx) => {
      lines.push('Dokumen ACP #' + (idx + 1) + ':');
      lines.push('  Pengambil Keputusan: ' + (acp.decisionMakerName || '-') + ' (' + (acp.decisionMakerRelation || '-') + ') - ' + (acp.decisionMakerPhone || '-'));
      lines.push('  Tempat Perawatan Pilihan: ' + (acp.preferredCareLocation || '-'));
      lines.push('  Tujuan Perawatan: ' + (acp.careGoal || '-'));
      lines.push('  Preferensi Resusitasi (CPR/DNR): ' + (acp.resuscitationPref || '-'));
      lines.push('  Preferensi Ventilator: ' + (acp.ventilatorPref || '-'));
      lines.push('  Preferensi ICU: ' + (acp.icuPref || '-'));
      lines.push('  Nutrisi Buatan: ' + (acp.artificialNutrition || '-'));
      lines.push('  Dialisis: ' + (acp.dialysisPref || '-'));
      lines.push('  Donasi Organ: ' + (acp.organDonation || '-'));
      lines.push('  Tanda Tangan: Pasien=' + (acp.patientSigned ? 'Ya' : 'Belum') + ' | Keluarga=' + (acp.familySigned ? 'Ya' : 'Belum') + ' | Dokter=' + (acp.doctorSigned ? 'Ya' : 'Belum'));
      lines.push('  Harapan Pasien: ' + (acp.patientHopes || '-'));
      lines.push('  Kekhawatiran Pasien: ' + (acp.patientWorries || '-'));
      lines.push('  Nilai Hidup Penting: ' + (acp.lifeValues || '-'));
      lines.push('  Preferensi Akhir Hayat: ' + (acp.endOfLifePrefs || '-'));

      const revisions = (acp.revisions || []) as Record<string, unknown>[];
      if (revisions.length > 0) {
        lines.push('  Revisi:');
        revisions.forEach((rev) => {
          const revDate = new Date(rev.createdAt as string).toLocaleDateString('id-ID');
          lines.push('    - Tgl: ' + revDate + ' | Oleh: ' + (rev.revisedBy || '-') + ' | Alasan: ' + (rev.reason || '-'));
        });
      }
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ── Helper: Parse AI-generated resume into structured sections ─────────────
function parseAIResume(aiContent: string): {
  ringkasanKondisi: string;
  ringkasanPemeriksaan: string;
  ringkasanTerapi: string;
  ringkasanACP: string;
  kesimpulanKlinis: string;
  rekomendasiAI: string;
  fullContent: string;
} {
  const sectionHeaders: Record<string, string> = {
    ringkasanKondisi: 'RINGKASAN KONDISI PASIEN',
    ringkasanPemeriksaan: 'RINGKASAN PEMERIKSAAN TERKINI',
    ringkasanTerapi: 'RINGKASAN TERAPI',
    ringkasanACP: 'RINGKASAN ADVANCE CARE PLANNING',
    kesimpulanKlinis: 'KESIMPULAN KLINIS',
    rekomendasiAI: 'REKOMENDASI',
  };

  const sectionKeys = Object.keys(sectionHeaders);
  const result: Record<string, string> = {};

  // Initialize all sections with empty strings
  for (const key of sectionKeys) {
    result[key] = '';
  }

  // Try to split by ## headers (markdown style) first
  const markdownPattern = /^##\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  const sections: { header: string; startIndex: number }[] = [];

  while ((match = markdownPattern.exec(aiContent)) !== null) {
    sections.push({
      header: match[1].trim().toUpperCase(),
      startIndex: match.index + match[0].length,
    });
  }

  // If markdown headers found, parse them
  if (sections.length > 0) {
    for (let i = 0; i < sections.length; i++) {
      const currentHeader = sections[i].header;
      const contentStart = sections[i].startIndex;
      const contentEnd = i + 1 < sections.length ? sections[i + 1].startIndex - sections[i + 1].header.length - 3 : aiContent.length;
      const content = aiContent.substring(contentStart, contentEnd).trim();

      // Match header to section key
      for (const key of sectionKeys) {
        if (currentHeader.includes(sectionHeaders[key])) {
          result[key] = content;
          break;
        }
      }
    }
  } else {
    // Fallback: try to split by === headers
    const equalPattern = /^===\s+(.+)\s+===$/gm;
    const eqSections: { header: string; startIndex: number }[] = [];

    while ((match = equalPattern.exec(aiContent)) !== null) {
      eqSections.push({
        header: match[1].trim().toUpperCase(),
        startIndex: match.index + match[0].length,
      });
    }

    if (eqSections.length > 0) {
      for (let i = 0; i < eqSections.length; i++) {
        const currentHeader = eqSections[i].header;
        const contentStart = eqSections[i].startIndex;
        const contentEnd = i + 1 < eqSections.length ? eqSections[i + 1].startIndex - eqSections[i + 1].header.length - 8 : aiContent.length;
        const content = aiContent.substring(contentStart, contentEnd).trim();

        for (const key of sectionKeys) {
          if (currentHeader.includes(sectionHeaders[key])) {
            result[key] = content;
            break;
          }
        }
      }
    } else {
      // Last resort: put everything in fullContent, try basic keyword matching
      for (const key of sectionKeys) {
        const keyword = sectionHeaders[key];
        const regex = new RegExp(keyword + '[\\s\\S]*?(?=(?:' + Object.values(sectionHeaders).join('|') + '|$))', 'i');
        const sectionMatch = aiContent.match(regex);
        if (sectionMatch) {
          result[key] = sectionMatch[0].replace(new RegExp(keyword, 'i'), '').trim();
        }
      }
    }
  }

  return {
    ringkasanKondisi: result.ringkasanKondisi || '',
    ringkasanPemeriksaan: result.ringkasanPemeriksaan || '',
    ringkasanTerapi: result.ringkasanTerapi || '',
    ringkasanACP: result.ringkasanACP || '',
    kesimpulanKlinis: result.kesimpulanKlinis || '',
    rekomendasiAI: result.rekomendasiAI || '',
    fullContent: aiContent,
  };
}

// ── Helper: Generate local fallback resume without AI ──────────────────────
function generateLocalResume(
  patient: Record<string, unknown>,
  user: Record<string, unknown> | null,
): {
  ringkasanKondisi: string;
  ringkasanPemeriksaan: string;
  ringkasanTerapi: string;
  ringkasanACP: string;
  kesimpulanKlinis: string;
  rekomendasiAI: string;
  fullContent: string;
} {
  const name = (user?.name as string) || 'Pasien';
  const vitals = (patient.vitalSigns || []) as Record<string, unknown>[];
  const medications = (patient.medications || []) as Record<string, unknown>[];
  const screenings = (patient.screeningRecords || []) as Record<string, unknown>[];
  const acpDocs = (patient.acpDocuments || []) as Record<string, unknown>[];

  // ── RINGKASAN KONDISI PASIEN ──
  const riskLabel =
    patient.riskLevel === 'merah' ? 'kritis (merah)' :
    patient.riskLevel === 'kuning' ? 'moderat (kuning)' :
    'stabil (hijau)';
  const careStatusLabel: Record<string, string> = {
    rawat_jalan: 'Rawat Jalan',
    home_care: 'Home Care',
    hospice: 'Hospice',
    rawat_inap: 'Rawat Inap',
  };
  const secondaryDiag = patient.secondaryDiagnosis ? ', dengan diagnosa penyerta ' + patient.secondaryDiagnosis : '';
  const stageInfo = patient.diseaseStage ? ' pada stadium ' + patient.diseaseStage : '';
  const therapyResponse =
    patient.riskLevel === 'merah' ? 'Respons terapi belum optimal, terdapat tanda perburukan klinis.' :
    patient.riskLevel === 'kuning' ? 'Respons terapi parsial, diperlukan evaluasi dan penyesuaian terapi.' :
    'Respons terapi cukup baik, kondisi relatif stabil.';

  const kondisiLines: string[] = [];
  kondisiLines.push('Pasien ' + name + ' dengan diagnosa utama ' + (patient.primaryDiagnosis || 'belum terdiagnosa') + secondaryDiag + stageInfo + '.');
  kondisiLines.push('Status perawatan saat ini: ' + (careStatusLabel[String(patient.careStatus)] || String(patient.careStatus)) + ', dengan tingkat risiko ' + riskLabel + '.');
  kondisiLines.push('Status pasien: ' + (patient.patientStatus || '-'));
  kondisiLines.push(therapyResponse);

  // Identify main problems
  const mainProblems: string[] = [];
  if (vitals.length > 0) {
    const latestVital = vitals[0];
    if (latestVital.systolicBP && Number(latestVital.systolicBP) < 90) mainProblems.push('Hipotensi');
    if (latestVital.oxygenSat && Number(latestVital.oxygenSat) < 90) mainProblems.push('Hipoksemia');
    if (latestVital.heartRate && Number(latestVital.heartRate) > 100) mainProblems.push('Takikardia');
    if (latestVital.respiratoryRate && Number(latestVital.respiratoryRate) > 24) mainProblems.push('Takipnea');
    if (latestVital.temperature && Number(latestVital.temperature) > 38) mainProblems.push('Demam');
  }
  if (patient.riskLevel === 'merah') mainProblems.push('Risiko kritis');
  screenings.forEach((s) => {
    if (s.ewsLevel === 'merah' && !mainProblems.includes('Skrining risiko tinggi')) {
      mainProblems.push('Skrining risiko tinggi');
    }
  });
  if (mainProblems.length > 0) {
    kondisiLines.push('Masalah utama: ' + mainProblems.join(', ') + '.');
  } else {
    kondisiLines.push('Tidak ada masalah akut yang teridentifikasi saat ini.');
  }

  const ringkasanKondisi = kondisiLines.join('\n');

  // ── RINGKASAN PEMERIKSAAN TERKINI ──
  const pemeriksaanLines: string[] = [];

  if (vitals.length > 0) {
    const v = vitals[0];
    const tgl = new Date(v.recordedAt as string).toLocaleString('id-ID');
    pemeriksaanLines.push('TTV Terakhir (' + tgl + '):');
    pemeriksaanLines.push('  TD: ' + fmtVal(v.systolicBP, '') + '/' + fmtVal(v.diastolicBP, ' mmHg'));
    pemeriksaanLines.push('  Nadi: ' + fmtVal(v.heartRate, ' bpm'));
    pemeriksaanLines.push('  RR: ' + fmtVal(v.respiratoryRate, '/menit'));
    pemeriksaanLines.push('  Suhu: ' + fmtVal(v.temperature, '\u00B0C'));
    pemeriksaanLines.push('  SpO2: ' + fmtVal(v.oxygenSat, '%'));
    pemeriksaanLines.push('  BB: ' + fmtVal(v.weight, ' kg') + ' | BMI: ' + fmtVal(v.bmi, ''));

    // Clinical trends
    if (vitals.length >= 2) {
      pemeriksaanLines.push('');
      pemeriksaanLines.push('Tren Perubahan TTV:');
      const prev = vitals[1];
      if (v.systolicBP && prev.systolicBP) {
        const diff = Number(v.systolicBP) - Number(prev.systolicBP);
        if (diff < -10) {
          pemeriksaanLines.push('  - Tekanan darah sistolik menurun signifikan (' + Math.abs(diff) + ' mmHg)');
        } else if (diff > 10) {
          pemeriksaanLines.push('  - Tekanan darah sistolik meningkat (' + diff + ' mmHg)');
        } else {
          pemeriksaanLines.push('  - Tekanan darah relatif stabil');
        }
      }
      if (v.heartRate && prev.heartRate) {
        const diff = Number(v.heartRate) - Number(prev.heartRate);
        if (Math.abs(diff) > 15) {
          pemeriksaanLines.push('  - Nadi berubah signifikan (' + (diff > 0 ? '+' : '') + diff + ' bpm)');
        }
      }
      if (v.oxygenSat && prev.oxygenSat) {
        const diff = Number(v.oxygenSat) - Number(prev.oxygenSat);
        if (diff < -3) {
          pemeriksaanLines.push('  - Saturasi oksigen menurun (' + diff + '%)');
        }
      }
    }
  } else {
    pemeriksaanLines.push('Belum ada data TTV yang tercatat.');
  }

  // Screening results
  if (screenings.length > 0) {
    pemeriksaanLines.push('');
    pemeriksaanLines.push('Hasil Skrining Terkini:');
    const screeningByType: Record<string, Record<string, unknown>[]> = {};
    screenings.forEach((s) => {
      const type = s.screeningType as string;
      if (!screeningByType[type]) screeningByType[type] = [];
      screeningByType[type].push(s);
    });

    Object.entries(screeningByType).forEach(([type, records]) => {
      const latest = records[0];
      const scoreStr = latest.score != null ? String(latest.score) : '-';
      const labelStr = latest.scoreLabel ? String(latest.scoreLabel) : '-';
      pemeriksaanLines.push('  - ' + type.toUpperCase() + ': Skor ' + scoreStr + ' (' + labelStr + ')');

      if (records.length >= 2) {
        const prevRecord = records[1];
        if (latest.score != null && prevRecord.score != null) {
          const diff = Number(latest.score) - Number(prevRecord.score);
          if (diff > 0) {
            pemeriksaanLines.push('    Tren: Memburuk (skor naik ' + diff + ' poin)');
          } else if (diff < 0) {
            pemeriksaanLines.push('    Tren: Membaik (skor turun ' + Math.abs(diff) + ' poin)');
          } else {
            pemeriksaanLines.push('    Tren: Stabil');
          }
        }
      }
    });
  }

  // Dominant symptoms from screenings
  const dominantSymptoms: string[] = [];
  screenings.forEach((s) => {
    if (s.interpretation) {
      const interp = String(s.interpretation);
      if (interp.toLowerCase().includes('nyeri')) dominantSymptoms.push('Nyeri');
      if (interp.toLowerCase().includes('sesak') || interp.toLowerCase().includes('dyspnea')) dominantSymptoms.push('Sesak napas');
      if (interp.toLowerCase().includes('cemas') || interp.toLowerCase().includes('ansietas')) dominantSymptoms.push('Kecemasan');
      if (interp.toLowerCase().includes('depresi')) dominantSymptoms.push('Depresi');
      if (interp.toLowerCase().includes('insomnia')) dominantSymptoms.push('Insomnia');
      if (interp.toLowerCase().includes('mual')) dominantSymptoms.push('Mual');
    }
  });
  if (dominantSymptoms.length > 0) {
    const unique = [...new Set(dominantSymptoms)];
    pemeriksaanLines.push('');
    pemeriksaanLines.push('Gejala Dominan: ' + unique.join(', '));
  }

  const ringkasanPemeriksaan = pemeriksaanLines.join('\n');

  // ── RINGKASAN TERAPI ──
  const terapiLines: string[] = [];

  if (medications.length > 0) {
    terapiLines.push('Obat Aktif (' + medications.length + ' obat):');
    medications.forEach((m) => {
      const adherences = (m.adherences || []) as Record<string, unknown>[];
      const missedDoses = adherences.filter((a) => a.missedDose).length;
      const adherenceRate =
        adherences.length > 0
          ? ((adherences.length - missedDoses) / adherences.length * 100).toFixed(0) + '%'
          : 'N/A';
      const routeStr = m.route ? String(m.route) : 'oral';
      terapiLines.push(
        '  - ' + m.medicineName + ' ' + m.dosage + ' ' + m.frequency + ' (' + routeStr + ')' +
        ' | Indikasi: ' + (m.indication || '-') +
        ' | Kepatuhan: ' + adherenceRate,
      );
    });
  } else {
    terapiLines.push('Tidak ada obat aktif yang tercatat.');
  }

  // Non-pharmacological interventions
  terapiLines.push('');
  terapiLines.push('Intervensi Non-Farmakologis:');
  const nonPharmaInterventions: string[] = [];
  if (patient.careStatus === 'home_care') nonPharmaInterventions.push('Perawatan di rumah (home care)');
  if (patient.careStatus === 'hospice') nonPharmaInterventions.push('Perawatan hospice');
  if (patient.careStatus === 'rawat_inap') nonPharmaInterventions.push('Perawatan rawat inap');
  if (acpDocs.length > 0) nonPharmaInterventions.push('Advance Care Planning telah dilakukan');
  if (nonPharmaInterventions.length > 0) {
    nonPharmaInterventions.forEach((intv) => terapiLines.push('  - ' + intv));
  } else {
    terapiLines.push('  - Belum ada intervensi non-farmakologis yang terdokumentasi.');
  }

  // Education given
  terapiLines.push('');
  terapiLines.push('Edukasi yang Diberikan:');
  const educationItems: string[] = [];
  if (acpDocs.length > 0) educationItems.push('Edukasi Advance Care Planning');
  if (medications.some((m) => m.medicineName?.toString().toLowerCase().includes('morfine'))) {
    educationItems.push('Edukasi penggunaan opioid dan efek samping');
  }
  educationItems.push('Edukasi tanda bahaya yang harus segera dilaporkan');
  educationItems.push('Edukasi manajemen gejala paliatif');
  educationItems.forEach((item) => terapiLines.push('  - ' + item));

  const ringkasanTerapi = terapiLines.join('\n');

  // ── RINGKASAN ADVANCE CARE PLANNING ──
  const acpLines: string[] = [];

  if (acpDocs.length > 0) {
    const acp = acpDocs[0];
    acpLines.push('Preferensi Perawatan:');
    acpLines.push('  - Tempat perawatan: ' + (acp.preferredCareLocation || '-'));
    acpLines.push('  - Tujuan perawatan: ' + (acp.careGoal || '-'));

    acpLines.push('');
    acpLines.push('Keputusan Medis:');
    acpLines.push('  - Resusitasi (CPR/DNR): ' + (acp.resuscitationPref || '-'));
    acpLines.push('  - Ventilator: ' + (acp.ventilatorPref || '-'));
    acpLines.push('  - ICU: ' + (acp.icuPref || '-'));
    acpLines.push('  - Nutrisi buatan: ' + (acp.artificialNutrition || '-'));
    acpLines.push('  - Dialisis: ' + (acp.dialysisPref || '-'));
    acpLines.push('  - Donasi organ: ' + (acp.organDonation || '-'));

    acpLines.push('');
    acpLines.push('Keputusan Keluarga:');
    acpLines.push('  - Pengambil keputusan: ' + (acp.decisionMakerName || '-') + ' (' + (acp.decisionMakerRelation || '-') + ')');
    acpLines.push('  - Tanda tangan keluarga: ' + (acp.familySigned ? 'Sudah' : 'Belum'));

    acpLines.push('');
    acpLines.push('Status DNR: ' + (acp.resuscitationPref === 'dnr' ? 'DNR (Do Not Resuscitate) - Tidak dilakukan resusitasi' : acp.resuscitationPref === 'cpr' ? 'CPR (Cardiopulmonary Resuscitation) - Bersedia dilakukan resusitasi' : 'Belum ditentukan'));

    acpLines.push('');
    acpLines.push('Harapan Pasien: ' + (acp.patientHopes || '-'));
    acpLines.push('Kekhawatiran Pasien: ' + (acp.patientWorries || '-'));
    acpLines.push('Nilai Hidup: ' + (acp.lifeValues || '-'));

    const revisions = (acp.revisions || []) as Record<string, unknown>[];
    if (revisions.length > 0) {
      acpLines.push('');
      acpLines.push('Riwayat Revisi: ' + revisions.length + ' kali revisi.');
    }
  } else {
    acpLines.push('Belum ada dokumen Advance Care Planning yang tersedia.');
    acpLines.push('Disarankan untuk segera melakukan diskusi ACP dengan pasien dan keluarga.');
  }

  const ringkasanACP = acpLines.join('\n');

  // ── KESIMPULAN KLINIS ──
  const kesimpulanLines: string[] = [];

  const prognosisMap: Record<string, string> = {
    merah: 'Prognosis mengkhawatirkan. Pasien berada dalam kondisi kritis yang memerlukan intervensi dan monitoring intensif.',
    kuning: 'Prognosis perlu dipantau ketat. Terdapat faktor risiko yang memerlukan perhatian dan evaluasi berkala.',
    hijau: 'Prognosis relatif baik dalam konteks perawatan paliatif. Kondisi stabil namun tetap memerlukan monitoring rutin.',
  };
  kesimpulanLines.push(prognosisMap[String(patient.riskLevel)] || prognosisMap.hijau);

  kesimpulanLines.push('');
  kesimpulanLines.push('Pasien ' + name + ' dengan diagnosa ' + (patient.primaryDiagnosis || '-') + ' saat ini berada dalam perawatan ' + (careStatusLabel[String(patient.careStatus)] || String(patient.careStatus)) + '.');

  // Urgency assessment
  const urgentConditions: string[] = [];
  if (vitals.length > 0) {
    const lv = vitals[0];
    if (lv.systolicBP && Number(lv.systolicBP) < 90) urgentConditions.push('hipotensi');
    if (lv.oxygenSat && Number(lv.oxygenSat) < 90) urgentConditions.push('hipoksemia berat');
    if (lv.heartRate && Number(lv.heartRate) > 120) urgentConditions.push('takikardia berat');
    if (lv.respiratoryRate && Number(lv.respiratoryRate) > 28) urgentConditions.push('distres napas berat');
  }
  if (urgentConditions.length > 0) {
    kesimpulanLines.push('Kondisi mendesak: ' + urgentConditions.join(', ') + '. Diperlukan intervensi segera.');
  }

  // Direction of care
  kesimpulanLines.push('');
  if (patient.riskLevel === 'merah') {
    kesimpulanLines.push('Arah perawatan: Fokus pada stabilisasi kondisi dan intervensi akut. Perlu evaluasi untuk kemungkinan rawat inap atau peningkatan level perawatan.');
  } else if (patient.riskLevel === 'kuning') {
    kesimpulanLines.push('Arah perawatan: Monitoring ketat dengan penyesuaian terapi. Pertimbangkan peningkatan frekuensi kunjungan dan evaluasi berkala.');
  } else {
    kesimpulanLines.push('Arah perawatan: Lanjutkan perawatan paliatif dengan monitoring rutin. Fokus pada kualitas hidup dan manajemen gejala.');
  }

  const kesimpulanKlinis = kesimpulanLines.join('\n');

  // ── REKOMENDASI ──
  const rekomendasiLines: string[] = [];
  const rekomendasiItems: string[] = [];

  rekomendasiItems.push('Lanjut monitoring paliatif dengan frekuensi sesuai tingkat risiko (' +
    (patient.riskLevel === 'merah' ? 'setiap 4-6 jam' : patient.riskLevel === 'kuning' ? 'setiap 8-12 jam' : 'setiap 24 jam') + ')');

  if (patient.riskLevel === 'merah') {
    rekomendasiItems.push('Pertimbangkan rawat inap untuk monitoring dan stabilisasi kondisi');
  }

  if (patient.careStatus === 'rawat_jalan' && patient.riskLevel !== 'hijau') {
    rekomendasiItems.push('Home care untuk memfasilitasi perawatan di lingkungan yang nyaman bagi pasien');
  }

  if (patient.careStatus === 'home_care') {
    rekomendasiItems.push('Lanjutkan home care dengan peningkatan frekuensi kunjungan');
  }

  if (medications.some((m) => m.medicineName?.toString().toLowerCase().includes('morfine'))) {
    rekomendasiItems.push('Konsultasi spesialis manajemen nyeri untuk evaluasi dan optimasi terapi opioid');
  }

  if (patient.primaryDiagnosis?.toString().toLowerCase().includes('kanker') || patient.primaryDiagnosis?.toString().toLowerCase().includes('neoplasma')) {
    rekomendasiItems.push('Konsultasi spesialis onkologi untuk evaluasi lanjutan');
  }

  if (acpDocs.length === 0) {
    rekomendasiItems.push('Segera lakukan diskusi Advance Care Planning dengan pasien dan keluarga');
  } else {
    const acp = acpDocs[0];
    if (!acp.patientSigned || !acp.familySigned || !acp.doctorSigned) {
      rekomendasiItems.push('Lengkapi penandatanganan dokumen Advance Care Planning');
    }
  }

  if (patient.riskLevel === 'merah' && patient.careStatus !== 'hospice') {
    rekomendasiItems.push('Pertimbangkan hospice care untuk perawatan suportif dan kenyamanan');
  }

  if (acpDocs.length > 0 && acpDocs[0].careGoal === 'akhir_hayat') {
    rekomendasiItems.push('Perawatan akhir hayat: Fokus pada kenyamanan, pengendalian gejala, dan dukungan psikososial');
  }

  if (screenings.some((s) => s.ewsLevel === 'merah')) {
    rekomendasiItems.push('Evaluasi segera hasil skrining dengan EWS merah');
  }

  rekomendasiItems.push('Evaluasi ulang skrining paliatif dalam ' +
    (patient.riskLevel === 'merah' ? '3 hari' : patient.riskLevel === 'kuning' ? '7 hari' : '14 hari'));

  rekomendasiItems.forEach((item, i) => {
    rekomendasiLines.push((i + 1) + '. ' + item);
  });

  const rekomendasiAI = rekomendasiLines.join('\n');

  // ── Full Content ──
  const fullContent = [
    '=== RINGKASAN KONDISI PASIEN ===',
    ringkasanKondisi,
    '',
    '=== RINGKASAN PEMERIKSAAN TERKINI ===',
    ringkasanPemeriksaan,
    '',
    '=== RINGKASAN TERAPI ===',
    ringkasanTerapi,
    '',
    '=== RINGKASAN ADVANCE CARE PLANNING ===',
    ringkasanACP,
    '',
    '=== KESIMPULAN KLINIS ===',
    kesimpulanKlinis,
    '',
    '=== REKOMENDASI ===',
    rekomendasiAI,
  ].join('\n');

  return {
    ringkasanKondisi,
    ringkasanPemeriksaan,
    ringkasanTerapi,
    ringkasanACP,
    kesimpulanKlinis,
    rekomendasiAI,
    fullContent,
  };
}
