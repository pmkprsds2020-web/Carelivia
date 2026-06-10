import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/palliative-ai-analysis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { palliativePatientId } = body;

    if (!palliativePatientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const patient = await db.palliativePatient.findUnique({
      where: { id: palliativePatientId },
      include: {
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 10 },
        medications: { where: { isActive: true }, include: { adherences: { orderBy: { date: 'desc' }, take: 7 } } },
        acpDocuments: { where: { isActive: true }, include: { revisions: true } },
        screeningRecords: { orderBy: { performedAt: 'desc' }, take: 10 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const user = await db.user.findUnique({ where: { id: patient.patientId } });
    const clinicalContext = buildClinicalContext(patient, user);

    let aiAnalysis: string;
    try {
      const { generateText } = await import('z-ai-web-dev-sdk');
      const result = await generateText({
        prompt: clinicalContext,
        system: [
          'Anda adalah asisten klinis AI yang ahli dalam perawatan paliatif.',
          'Analisis data pasien berikut dan berikan:',
          '1. RINGKASAN KONDISI PASIEN',
          '2. ANALISIS TREN TTV SERIAL',
          '3. PERBANDINGAN HASIL SKRINING',
          '4. IDENTIFIKASI PERBURUKAN KONDISI',
          '5. FAKTOR RISIKO UTAMA',
          '6. REKOMENDASI TINDAK LANJUT (berdasarkan pedoman paliatif)',
          '7. SOAP NOTE OTOMATIS',
          '8. PERINGATAN DINI',
          '',
          'Format respons Anda dengan heading yang jelas untuk setiap bagian.',
          'Gunakan bahasa Indonesia. Berikan analisis yang spesifik berdasarkan data, bukan umum.',
        ].join('\n'),
      });
      aiAnalysis = result.text || result.content || '';
    } catch {
      aiAnalysis = generateLocalAnalysis(patient, user);
    }

    await db.auditLog.create({
      data: {
        action: 'AI_ANALYSIS_GENERATED',
        entity: 'PalliativePatient',
        entityId: palliativePatientId,
        details: 'AI analysis generated for palliative patient',
      },
    });

    return NextResponse.json({ analysis: aiAnalysis });
  } catch (error) {
    console.error('Palliative AI analysis error:', error);
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 });
  }
}

function fmtVal(val: unknown, suffix: string): string {
  if (val == null) return '-' + suffix;
  return String(val) + suffix;
}

function buildClinicalContext(patient: Record<string, unknown>, user: Record<string, unknown> | null): string {
  const name = (user?.name as string) || 'Pasien';
  const dob = (user?.dateOfBirth as string) || '-';
  const gender = (user?.gender as string) || '-';
  const vitals = (patient.vitalSigns || []) as Record<string, unknown>[];
  const medications = (patient.medications || []) as Record<string, unknown>[];
  const screenings = (patient.screeningRecords || []) as Record<string, unknown>[];
  const acpDocs = (patient.acpDocuments || []) as Record<string, unknown>[];

  const lines: string[] = [];
  lines.push('DATA PASIEN PALIATIF');
  lines.push('Nama: ' + name);
  lines.push('Tanggal Lahir: ' + dob);
  lines.push('Jenis Kelamin: ' + gender);
  lines.push('Diagnosa Utama: ' + (patient.primaryDiagnosis || '-'));
  lines.push('Diagnosa Penyerta: ' + (patient.secondaryDiagnosis || '-'));
  lines.push('Stadium: ' + (patient.diseaseStage || '-'));
  lines.push('Status Perawatan: ' + patient.careStatus);
  lines.push('Status Pasien: ' + patient.patientStatus);
  lines.push('Tingkat Risiko: ' + patient.riskLevel);
  lines.push('');

  if (vitals.length > 0) {
    lines.push('TTV SERIAL (data terbaru):');
    vitals.forEach((v, i) => {
      const tgl = new Date(v.recordedAt as string).toLocaleString('id-ID');
      const td = fmtVal(v.systolicBP, '') + '/' + fmtVal(v.diastolicBP, ' mmHg');
      const nadi = fmtVal(v.heartRate, ' bpm');
      const rr = fmtVal(v.respiratoryRate, '/menit');
      const suhu = fmtVal(v.temperature, ' C');
      const spo2 = fmtVal(v.oxygenSat, '%');
      const bb = fmtVal(v.weight, ' kg');
      const bmiVal = fmtVal(v.bmi, '');
      const cat = v.notes ? ' | Catatan: ' + String(v.notes) : '';
      lines.push((i + 1) + '. Tgl: ' + tgl + ' | TD: ' + td + ' | Nadi: ' + nadi + ' | RR: ' + rr + ' | Suhu: ' + suhu + ' | SpO2: ' + spo2 + ' | BB: ' + bb + ' | BMI: ' + bmiVal + cat);
    });
    lines.push('');
  }

  if (medications.length > 0) {
    lines.push('OBAT AKTIF:');
    medications.forEach((m) => {
      const adherences = (m.adherences || []) as Record<string, unknown>[];
      const missedDoses = adherences.filter(a => a.missedDose).length;
      const adherenceRate = adherences.length > 0
        ? ((adherences.length - missedDoses) / adherences.length * 100).toFixed(0) + '%'
        : 'Belum ada data';
      const routeStr = m.route ? String(m.route) : 'oral';
      const indicationStr = m.indication ? String(m.indication) : '-';
      lines.push('- ' + m.medicineName + ' ' + m.dosage + ' ' + m.frequency + ' (' + routeStr + ') | Indikasi: ' + indicationStr + ' | Kepatuhan: ' + adherenceRate);
    });
    lines.push('');
  }

  if (screenings.length > 0) {
    lines.push('HASIL SKRINING PALIATIF:');
    screenings.forEach((s) => {
      const tgl = new Date(s.performedAt as string).toLocaleDateString('id-ID');
      const scoreStr = s.score != null ? String(s.score) : '-';
      const labelStr = s.scoreLabel ? String(s.scoreLabel) : '-';
      const ewsStr = s.ewsLevel ? String(s.ewsLevel) : '-';
      const interpStr = s.interpretation ? String(s.interpretation) : '';
      lines.push('- ' + s.screeningType + ': Skor ' + scoreStr + ' (' + labelStr + ') | EWS: ' + ewsStr + ' | Tgl: ' + tgl + ' | ' + interpStr);
    });
    lines.push('');
  }

  if (acpDocs.length > 0) {
    const acp = acpDocs[0];
    lines.push('ADVANCE CARE PLAN:');
    lines.push('Tempat Perawatan: ' + (acp.preferredCareLocation || '-') + ' | Tujuan: ' + (acp.careGoal || '-') + ' | CPR/DNR: ' + (acp.resuscitationPref || '-') + ' | Ventilator: ' + (acp.ventilatorPref || '-') + ' | ICU: ' + (acp.icuPref || '-'));
    lines.push('Tanda Tangan: Pasien=' + (acp.patientSigned ? 'Ya' : 'Belum') + ' | Keluarga=' + (acp.familySigned ? 'Ya' : 'Belum') + ' | Dokter=' + (acp.doctorSigned ? 'Ya' : 'Belum'));
    lines.push('Harapan: ' + (acp.patientHopes || '-'));
    lines.push('Kekhawatiran: ' + (acp.patientWorries || '-'));
  }

  return lines.join('\n');
}

function generateLocalAnalysis(patient: Record<string, unknown>, user: Record<string, unknown> | null): string {
  const name = (user?.name as string) || 'Pasien';
  const vitals = (patient.vitalSigns || []) as Record<string, unknown>[];
  const medications = (patient.medications || []) as Record<string, unknown>[];
  const screenings = (patient.screeningRecords || []) as Record<string, unknown>[];
  const acpDocs = (patient.acpDocuments || []) as Record<string, unknown>[];

  let vitalAnalysis = '';
  const alerts: string[] = [];

  if (vitals.length >= 2) {
    const latest = vitals[0];
    const previous = vitals[1];

    if (latest.systolicBP && previous.systolicBP) {
      const diff = Number(latest.systolicBP) - Number(previous.systolicBP);
      if (diff < -10) {
        alerts.push('Penurunan tekanan darah sistolik sebesar ' + Math.abs(diff) + ' mmHg');
        vitalAnalysis += '- Tekanan darah sistolik menurun dari ' + previous.systolicBP + ' menjadi ' + latest.systolicBP + ' mmHg (perlu perhatian)\n';
      } else if (diff > 10) {
        vitalAnalysis += '- Tekanan darah sistolik meningkat dari ' + previous.systolicBP + ' menjadi ' + latest.systolicBP + ' mmHg\n';
      } else {
        vitalAnalysis += '- Tekanan darah stabil (' + latest.systolicBP + '/' + latest.diastolicBP + ' mmHg)\n';
      }
    }

    if (latest.oxygenSat && Number(latest.oxygenSat) < 90) {
      alerts.push('Saturasi oksigen kritis: ' + latest.oxygenSat + '%');
    }
    if (latest.respiratoryRate && Number(latest.respiratoryRate) > 24) {
      alerts.push('Frekuensi napas meningkat: ' + latest.respiratoryRate + '/menit');
    }
    if (latest.temperature && Number(latest.temperature) > 38) {
      alerts.push('Demam: ' + latest.temperature + ' C');
    }
    if (latest.systolicBP && Number(latest.systolicBP) < 90) {
      alerts.push('Hipotensi: TD ' + latest.systolicBP + '/' + latest.diastolicBP + ' mmHg');
    }
  }

  let screeningAnalysis = '';
  const screeningByType: Record<string, Record<string, unknown>[]> = {};
  screenings.forEach((s) => {
    const type = s.screeningType as string;
    if (!screeningByType[type]) screeningByType[type] = [];
    screeningByType[type].push(s);
  });

  Object.entries(screeningByType).forEach(([type, records]) => {
    if (records.length >= 2) {
      const latestScore = records[0].score as number;
      const prevScore = records[1].score as number;
      const diff = latestScore - prevScore;
      if (diff > 0) {
        screeningAnalysis += '- ' + type.toUpperCase() + ': Skor meningkat dari ' + prevScore + ' menjadi ' + latestScore + ' (perburukan)\n';
      } else if (diff < 0) {
        screeningAnalysis += '- ' + type.toUpperCase() + ': Skor menurun dari ' + prevScore + ' menjadi ' + latestScore + ' (perbaikan)\n';
      } else {
        screeningAnalysis += '- ' + type.toUpperCase() + ': Skor stabil (' + latestScore + ')\n';
      }
    } else if (records.length === 1) {
      const score = records[0].score || '-';
      const label = records[0].scoreLabel || '-';
      screeningAnalysis += '- ' + type.toUpperCase() + ': Skor ' + score + ' (' + label + ') - data pertama\n';
    }
  });

  const riskFactors: string[] = [];
  if (patient.riskLevel === 'merah') riskFactors.push('Pasien berada di zona risiko merah');
  if (patient.careStatus === 'hospice') riskFactors.push('Pasien dalam perawatan hospice');
  const stage = patient.diseaseStage?.toString() || '';
  if (stage.includes('IV') || stage.includes('Berat')) {
    riskFactors.push('Stadium penyakit lanjut');
  }
  medications.forEach((m) => {
    if (m.medicineName?.toString().toLowerCase().includes('morfine')) {
      riskFactors.push('Penggunaan opioid (morfine) - risiko efek samping');
    }
  });

  const secondaryDiag = patient.secondaryDiagnosis ? ', penyerta ' + patient.secondaryDiagnosis : '';
  const subjective = 'Pasien ' + name + ' dengan diagnosa ' + (patient.primaryDiagnosis || '-') + secondaryDiag + '. Status perawatan: ' + patient.careStatus + '.';
  const objectiveParts: string[] = [];
  if (vitals.length > 0) {
    const v = vitals[0];
    objectiveParts.push('TD ' + fmtVal(v.systolicBP, '') + '/' + fmtVal(v.diastolicBP, ' mmHg') + ', Nadi ' + fmtVal(v.heartRate, ' bpm') + ', RR ' + fmtVal(v.respiratoryRate, '/menit') + ', Suhu ' + fmtVal(v.temperature, ' C') + ', SpO2 ' + fmtVal(v.oxygenSat, '%'));
  }
  if (screenings.length > 0) {
    const s = screenings[0];
    objectiveParts.push('Skrining ' + s.screeningType + ': ' + (s.scoreLabel || '-'));
  }
  const objective = objectiveParts.join('. ');
  const assessment = 'Kondisi pasien ' + (patient.riskLevel === 'merah' ? 'kritis memerlukan intervensi segera' : patient.riskLevel === 'kuning' ? 'perlu monitoring ketat' : 'stabil namun tetap perlu pemantauan') + '.';
  const planParts = ['Lanjutkan monitoring TTV secara berkala'];
  if (alerts.length > 0) planParts.push('Evaluasi segera tanda-tanda vital abnormal');
  if (medications.length > 0) planParts.push('Pantau kepatuhan dan efek samping obat');
  if (acpDocs.length === 0) planParts.push('Diskusikan Advance Care Planning dengan pasien dan keluarga');
  if (patient.riskLevel === 'merah') planParts.push('Pertimbangkan kunjungan home care segera');
  const plan = planParts.join('. ');

  const lines: string[] = [];
  lines.push('=== RINGKASAN KONDISI PASIEN ===');
  lines.push(name + ' - ' + (patient.primaryDiagnosis || 'Belum ada diagnosa'));
  lines.push('Status perawatan: ' + patient.careStatus + ', Tingkat risiko: ' + patient.riskLevel);
  lines.push('Jumlah obat aktif: ' + medications.length + ', Jumlah skrining terakhir: ' + screenings.length);
  lines.push('ACP: ' + (acpDocs.length > 0 ? 'Tersedia' : 'Belum ada'));
  lines.push('');
  lines.push('=== ANALISIS TREN TTV SERIAL ===');
  lines.push(vitalAnalysis || 'Data TTV belum cukup untuk analisis tren');
  lines.push('');
  lines.push('=== PERBANDINGAN HASIL SKRINING ===');
  lines.push(screeningAnalysis || 'Belum ada data skrining untuk dibandingkan');
  lines.push('');

  if (alerts.length > 0) {
    lines.push('=== IDENTIFIKASI PERBURUKAN KONDISI ===');
    alerts.forEach(a => lines.push('- ' + a));
    lines.push('');
  }

  lines.push('=== FAKTOR RISIKO UTAMA ===');
  if (riskFactors.length > 0) {
    riskFactors.forEach(f => lines.push('- ' + f));
  } else {
    lines.push('- Tidak ada faktor risiko utama yang teridentifikasi');
  }
  lines.push('');

  lines.push('=== REKOMENDASI TINDAK LANJUT ===');
  const monitoringFreq = patient.riskLevel === 'merah' ? '4-6 jam' : patient.riskLevel === 'kuning' ? '8-12 jam' : '24 jam';
  const screeningFreq = patient.riskLevel === 'merah' ? '3 hari' : '7 hari';
  lines.push('1. Monitoring TTV setiap ' + monitoringFreq);
  lines.push('2. Skrining paliatif berikutnya dalam ' + screeningFreq);
  if (medications.some(m => m.medicineName?.toString().toLowerCase().includes('morfine'))) {
    lines.push('3. Evaluasi manajemen nyeri dan dosis opioid');
  }
  if (acpDocs.length === 0) {
    lines.push('4. Segera diskusikan Advance Care Planning dengan pasien dan keluarga');
  }
  lines.push('5. Koordinasi dengan tim perawatan paliatif untuk rencana perawatan holistik');
  lines.push('');

  lines.push('=== SOAP NOTE OTOMATIS ===');
  lines.push('Subjective: ' + subjective);
  lines.push('');
  lines.push('Objective: ' + objective);
  lines.push('');
  lines.push('Assessment: ' + assessment);
  lines.push('');
  lines.push('Plan: ' + plan);
  lines.push('');

  if (alerts.length > 0 || patient.riskLevel === 'merah') {
    lines.push('=== PERINGATAN DINI ===');
    if (patient.riskLevel === 'merah') {
      lines.push('PASIEN DALAM KONDISI KRITIS - Diperlukan evaluasi dan intervensi segera.');
      lines.push('Pertimbangkan kunjungan home care darurat atau rawat inap.');
    }
    alerts.forEach(a => lines.push('- ' + a));
  }

  return lines.join('\n');
}
