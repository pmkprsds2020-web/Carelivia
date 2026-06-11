import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const VALID_DEPARTMENTS = [
  'penyakit_dalam',
  'onkologi',
  'neurologi',
  'jantung',
  'pulmonologi',
  'geriatri',
  'kedokteran_paliatif',
  'rehabilitasi_medik',
  'rumah_sakit_rujukan_lanjutan',
] as const;

const DEPARTMENT_LABELS: Record<string, string> = {
  penyakit_dalam: 'Departemen Ilmu Penyakit Dalam',
  onkologi: 'Departemen Onkologi',
  neurologi: 'Departemen Neurologi',
  jantung: 'Departemen Kardiologi',
  pulmonologi: 'Departemen Pulmonologi',
  geriatri: 'Departemen Geriatri',
  kedokteran_paliatif: 'Departemen Kedokteran Paliatif',
  rehabilitasi_medik: 'Departemen Rehabilitasi Medik',
  rumah_sakit_rujukan_lanjutan: 'Rumah Sakit Rujukan Lanjutan',
};

// POST /api/palliative-referral
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { palliativePatientId, targetDepartment } = body;

    if (!palliativePatientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    if (!targetDepartment) {
      return NextResponse.json({ error: 'Target department required' }, { status: 400 });
    }

    if (!VALID_DEPARTMENTS.includes(targetDepartment)) {
      return NextResponse.json(
        { error: 'Invalid target department. Valid options: ' + VALID_DEPARTMENTS.join(', ') },
        { status: 400 }
      );
    }

    // Fetch patient with all related clinical data
    const patient = await db.palliativePatient.findUnique({
      where: { id: palliativePatientId },
      include: {
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 10 },
        medications: {
          where: { isActive: true },
          include: { adherences: { orderBy: { date: 'desc' }, take: 7 } },
        },
        acpDocuments: { where: { isActive: true }, include: { revisions: true } },
        screeningRecords: { orderBy: { performedAt: 'desc' }, take: 10 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch the associated user for demographic info
    const user = await db.user.findUnique({ where: { id: patient.patientId } });

    // Build comprehensive clinical context
    const clinicalContext = buildReferralContext(patient, user, targetDepartment);

    // Attempt AI-generated referral letter
    let referralReason = '';
    let clinicalSummary = '';
    let consultationRequest = '';
    let fullContent = '';

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: [
              'Anda adalah dokter senior yang ahli dalam perawatan paliatif dan bertugas membuat surat rujukan resmi antar rumah sakit/bagian.',
              'Buatkan surat rujukan resmi dalam bahasa Indonesia berdasarkan data klinis pasien yang diberikan.',
              '',
              'Surat rujukan harus memuat 3 bagian utama berikut:',
              '',
              '1. ALASAN RUJUKAN',
              '- Gunakan bahasa medis formal dan profesional.',
              '- Dasarkan pada: diagnosa, skor PPS, indikator SPICT, hasil ESAS-r, penurunan fungsi, gejala yang tidak terkontrol.',
              '- Jelaskan mengapa pasien perlu dirujuk ke bagian tujuan secara spesifik.',
              '',
              '2. RINGKASAN KONDISI KLINIS',
              '- Riwayat penyakit dan diagnosa utama serta penyerta.',
              '- Kondisi terkini dan gejala utama yang dialami.',
              '- Hasil monitoring paliatif terkini (TTV, tren perubahan).',
              '- Hasil skrining (PPS, SPICT, ESAS-r, distress, dll) beserta interpretasinya.',
              '- Obat-obatan yang sedang dikonsumsi dan kepatuhannya.',
              '- Advance Care Planning jika tersedia.',
              '',
              '3. PERMINTAAN KONSULTASI',
              '- Evaluasi dan tindakan yang diharapkan dari rumah sakit/bagian tujuan.',
              '- Spesifik sesuai dengan kebutuhan klinis pasien dan kompetensi bagian tujuan.',
              '- Sertakan rencana tindak lanjut yang dianjurkan.',
              '',
              'Format respons Anda dengan heading yang jelas untuk setiap bagian.',
              'Gunakan bahasa Indonesia formal dan istilah medis yang tepat.',
              'Pastikan surat rujukan ini layak untuk diserahkan secara resmi.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: clinicalContext,
          },
        ],
        thinking: { type: 'disabled' },
      });

      fullContent = completion.choices[0]?.message?.content || '';

      // Parse the AI response into structured sections
      const parsed = parseReferralSections(fullContent);
      referralReason = parsed.referralReason;
      clinicalSummary = parsed.clinicalSummary;
      consultationRequest = parsed.consultationRequest;
    } catch (aiError) {
      console.error('AI referral generation failed, using local fallback:', aiError);
      const localReferral = generateLocalReferral(patient, user, targetDepartment);
      referralReason = localReferral.referralReason;
      clinicalSummary = localReferral.clinicalSummary;
      consultationRequest = localReferral.consultationRequest;
      fullContent = localReferral.fullContent;
    }

    // Create audit log entry
    await db.auditLog.create({
      data: {
        action: 'PALLIATIVE_REFERRAL_GENERATED',
        entity: 'PalliativePatient',
        entityId: palliativePatientId,
        details: `Referral letter generated for department: ${targetDepartment}`,
      },
    });

    return NextResponse.json({
      referral: {
        referralReason,
        clinicalSummary,
        consultationRequest,
        fullContent,
      },
    });
  } catch (error) {
    console.error('Palliative referral error:', error);
    return NextResponse.json({ error: 'Failed to generate referral letter' }, { status: 500 });
  }
}

// ── Helper: Format a value with suffix ──────────────────────────────────────
function fmtVal(val: unknown, suffix: string): string {
  if (val == null) return '-' + suffix;
  return String(val) + suffix;
}

// ── Helper: Build comprehensive referral context ────────────────────────────
function buildReferralContext(
  patient: Record<string, unknown>,
  user: Record<string, unknown> | null,
  targetDepartment: string
): string {
  const name = (user?.name as string) || 'Pasien';
  const dob = (user?.dateOfBirth as string) || '-';
  const gender = (user?.gender as string) || '-';
  const address = (user?.address as string) || (patient.address as string) || '-';
  const nik = (patient.nik as string) || (user?.nik as string) || '-';
  const bpjs = (patient.bpjsNumber as string) || (user?.bpjsNumber as string) || '-';
  const rmNumber = (patient.rmNumber as string) || '-';

  const vitals = (patient.vitalSigns || []) as Record<string, unknown>[];
  const medications = (patient.medications || []) as Record<string, unknown>[];
  const screenings = (patient.screeningRecords || []) as Record<string, unknown>[];
  const acpDocs = (patient.acpDocuments || []) as Record<string, unknown>[];

  const deptLabel = DEPARTMENT_LABELS[targetDepartment] || targetDepartment;

  const lines: string[] = [];

  lines.push('=== SURAT RUJUKAN PASIEN PALIATIF ===');
  lines.push('Bagian Tujuan: ' + deptLabel);
  lines.push('');

  lines.push('--- DATA DEMOGRAFI ---');
  lines.push('Nama: ' + name);
  lines.push('Tanggal Lahir: ' + dob);
  lines.push('Jenis Kelamin: ' + gender);
  lines.push('NIK: ' + nik);
  lines.push('No. BPJS: ' + bpjs);
  lines.push('No. Rekam Medis: ' + rmNumber);
  lines.push('Alamat: ' + address);
  lines.push('');

  lines.push('--- DATA KLINIS ---');
  lines.push('Diagnosa Utama: ' + (patient.primaryDiagnosis || '-'));
  lines.push('Diagnosa Penyerta: ' + (patient.secondaryDiagnosis || '-'));
  lines.push('Stadium Penyakit: ' + (patient.diseaseStage || '-'));
  lines.push('Status Perawatan: ' + patient.careStatus);
  lines.push('Status Pasien: ' + patient.patientStatus);
  lines.push('Tingkat Risiko: ' + patient.riskLevel);

  const familyContact = patient.familyContactName
    ? patient.familyContactName + ' (' + (patient.familyContactRelation || '-') + ') - ' + (patient.familyContactPhone || '-')
    : '-';
  lines.push('Kontak Keluarga: ' + familyContact);

  if (patient.notes) {
    lines.push('Catatan: ' + patient.notes);
  }
  lines.push('');

  // Vital signs
  if (vitals.length > 0) {
    lines.push('--- TTV SERIAL (data terbaru) ---');
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
      lines.push(
        (i + 1) + '. Tgl: ' + tgl +
        ' | TD: ' + td +
        ' | Nadi: ' + nadi +
        ' | RR: ' + rr +
        ' | Suhu: ' + suhu +
        ' | SpO2: ' + spo2 +
        ' | BB: ' + bb +
        ' | BMI: ' + bmiVal + cat
      );
    });
    lines.push('');
  }

  // Medications
  if (medications.length > 0) {
    lines.push('--- OBAT AKTIF ---');
    medications.forEach((m) => {
      const adherences = (m.adherences || []) as Record<string, unknown>[];
      const missedDoses = adherences.filter((a) => a.missedDose).length;
      const adherenceRate =
        adherences.length > 0
          ? (((adherences.length - missedDoses) / adherences.length) * 100).toFixed(0) + '%'
          : 'Belum ada data';
      const routeStr = m.route ? String(m.route) : 'oral';
      const indicationStr = m.indication ? String(m.indication) : '-';
      const startStr = m.startDate ? ' | Mulai: ' + String(m.startDate) : '';
      const endStr = m.endDate ? ' | Sampai: ' + String(m.endDate) : '';
      lines.push(
        '- ' + m.medicineName + ' ' + m.dosage + ' ' + m.frequency +
        ' (' + routeStr + ')' +
        ' | Indikasi: ' + indicationStr +
        ' | Kepatuhan: ' + adherenceRate +
        startStr + endStr
      );
    });
    lines.push('');
  }

  // Screening records
  if (screenings.length > 0) {
    lines.push('--- HASIL SKRINING PALIATIF ---');
    screenings.forEach((s) => {
      const tgl = new Date(s.performedAt as string).toLocaleDateString('id-ID');
      const scoreStr = s.score != null ? String(s.score) : '-';
      const labelStr = s.scoreLabel ? String(s.scoreLabel) : '-';
      const ewsStr = s.ewsLevel ? String(s.ewsLevel) : '-';
      const interpStr = s.interpretation ? String(s.interpretation) : '';
      lines.push(
        '- ' + s.screeningType + ': Skor ' + scoreStr +
        ' (' + labelStr + ')' +
        ' | EWS: ' + ewsStr +
        ' | Tgl: ' + tgl +
        ' | ' + interpStr
      );
    });
    lines.push('');
  }

  // ACP documents
  if (acpDocs.length > 0) {
    const acp = acpDocs[0];
    lines.push('--- ADVANCE CARE PLAN ---');
    lines.push('Tempat Perawatan Pilihan: ' + (acp.preferredCareLocation || '-'));
    lines.push('Tujuan Perawatan: ' + (acp.careGoal || '-'));
    lines.push('CPR/DNR: ' + (acp.resuscitationPref || '-'));
    lines.push('Ventilator: ' + (acp.ventilatorPref || '-'));
    lines.push('ICU: ' + (acp.icuPref || '-'));
    lines.push('Nutrisi Buatan: ' + (acp.artificialNutrition || '-'));
    lines.push('Dialisis: ' + (acp.dialysisPref || '-'));
    lines.push('Donasi Organ: ' + (acp.organDonation || '-'));
    lines.push('Tanda Tangan: Pasien=' + (acp.patientSigned ? 'Ya' : 'Belum') +
      ' | Keluarga=' + (acp.familySigned ? 'Ya' : 'Belum') +
      ' | Dokter=' + (acp.doctorSigned ? 'Ya' : 'Belum'));
    if (acp.patientHopes) lines.push('Harapan Pasien: ' + String(acp.patientHopes));
    if (acp.patientWorries) lines.push('Kekhawatiran Pasien: ' + String(acp.patientWorries));
    if (acp.lifeValues) lines.push('Nilai Hidup: ' + String(acp.lifeValues));
    lines.push('');
  }

  return lines.join('\n');
}

// ── Helper: Parse AI response into structured sections ──────────────────────
function parseReferralSections(fullContent: string): {
  referralReason: string;
  clinicalSummary: string;
  consultationRequest: string;
} {
  let referralReason = '';
  let clinicalSummary = '';
  let consultationRequest = '';

  // Try to extract sections using common heading patterns
  const reasonMatch = fullContent.match(
    /(?:ALASAN\s+RUJUKAN|1\.\s*ALASAN\s+RUJUKAN)[:\s]*\n([\s\S]*?)(?=(?:2\.\s*)?RINGKASAN\s+KONDISI\s+KLINIS|$)/i
  );
  const summaryMatch = fullContent.match(
    /(?:RINGKASAN\s+KONDISI\s+KLINIS|2\.\s*RINGKASAN\s+KONDISI\s+KLINIS)[:\s]*\n([\s\S]*?)(?=(?:3\.\s*)?PERMINTAAN\s+KONSULTASI|$)/i
  );
  const consultMatch = fullContent.match(
    /(?:PERMINTAAN\s+KONSULTASI|3\.\s*PERMINTAAN\s+KONSULTASI)[:\s]*\n([\s\S]*?)$/i
  );

  if (reasonMatch) referralReason = reasonMatch[1].trim();
  if (summaryMatch) clinicalSummary = summaryMatch[1].trim();
  if (consultMatch) consultationRequest = consultMatch[1].trim();

  // Fallback: if parsing failed, assign full content to the most relevant section
  if (!referralReason && !clinicalSummary && !consultationRequest) {
    referralReason = fullContent.trim();
  } else if (!referralReason && clinicalSummary) {
    // If only partial parsing, redistribute
    referralReason = clinicalSummary.substring(0, Math.floor(clinicalSummary.length * 0.3)).trim();
  }

  return { referralReason, clinicalSummary, consultationRequest };
}

// ── Helper: Generate local referral letter without AI ───────────────────────
function generateLocalReferral(
  patient: Record<string, unknown>,
  user: Record<string, unknown> | null,
  targetDepartment: string
): {
  referralReason: string;
  clinicalSummary: string;
  consultationRequest: string;
  fullContent: string;
} {
  const name = (user?.name as string) || 'Pasien';
  const dob = (user?.dateOfBirth as string) || '-';
  const gender = (user?.gender as string) || '-';
  const rmNumber = (patient.rmNumber as string) || '-';

  const vitals = (patient.vitalSigns || []) as Record<string, unknown>[];
  const medications = (patient.medications || []) as Record<string, unknown>[];
  const screenings = (patient.screeningRecords || []) as Record<string, unknown>[];
  const acpDocs = (patient.acpDocuments || []) as Record<string, unknown>[];

  const deptLabel = DEPARTMENT_LABELS[targetDepartment] || targetDepartment;

  // ── Build ALASAN RUJUKAN ──
  const reasonParts: string[] = [];
  reasonParts.push(
    'Pasien ' + name + ' dengan diagnosa ' + (patient.primaryDiagnosis || 'belum terdiagnosa') +
    (patient.secondaryDiagnosis ? ', penyerta ' + patient.secondaryDiagnosis : '') +
    ', stadium ' + (patient.diseaseStage || 'belum ditentukan') + '.'
  );

  if (patient.riskLevel === 'merah') {
    reasonParts.push('Pasien berada dalam zona risiko tinggi (merah) yang memerlukan evaluasi dan intervensi spesialistik segera.');
  } else if (patient.riskLevel === 'kuning') {
    reasonParts.push('Pasien berada dalam zona risiko sedang (kuning) yang memerlukan evaluasi spesialistik lanjutan.');
  }

  // Check PPS score
  const ppsRecords = screenings.filter((s) =>
    String(s.screeningType).toLowerCase().includes('pps')
  );
  if (ppsRecords.length > 0) {
    const latestPPS = ppsRecords[0];
    reasonParts.push(
      'Berdasarkan skrining PPS terakhir (skor ' + (latestPPS.score || '-') +
      ': ' + (latestPPS.scoreLabel || '-') + '), pasien menunjukkan penurunan fungsi performance status.'
    );
  }

  // Check SPICT
  const spictRecords = screenings.filter((s) =>
    String(s.screeningType).toLowerCase().includes('spict')
  );
  if (spictRecords.length > 0) {
    const latestSPICT = spictRecords[0];
    reasonParts.push(
      'Indikator SPICT positif (skor ' + (latestSPICT.score || '-') +
      ': ' + (latestSPICT.scoreLabel || '-') + '), menunjukkan pasien berisiko memburuk dalam 12 bulan ke depan.'
    );
  }

  // Check ESAS-r
  const esasRecords = screenings.filter((s) =>
    String(s.screeningType).toLowerCase().includes('esas')
  );
  if (esasRecords.length > 0) {
    const latestESAS = esasRecords[0];
    reasonParts.push(
      'Hasil ESAS-r menunjukkan skor ' + (latestESAS.score || '-') +
      ' (' + (latestESAS.scoreLabel || '-') + ') dengan gejala yang memerlukan manajemen lebih intensif.'
    );
  }

  // Check vital sign deterioration
  if (vitals.length >= 2) {
    const latest = vitals[0];
    const previous = vitals[1];
    if (latest.systolicBP && previous.systolicBP) {
      const diff = Number(latest.systolicBP) - Number(previous.systolicBP);
      if (diff < -10) {
        reasonParts.push('Terdapat penurunan tekanan darah sistolik sebesar ' + Math.abs(diff) + ' mmHg yang menunjukkan ketidakstabilan hemodinamik.');
      }
    }
    if (latest.oxygenSat && Number(latest.oxygenSat) < 90) {
      reasonParts.push('Saturasi oksigen kritis (' + latest.oxygenSat + '%) memerlukan evaluasi dan penanganan lanjutan.');
    }
  }

  reasonParts.push(
    'Atas dasar pertimbangan tersebut, pasien dirujuk ke ' + deptLabel + ' untuk evaluasi dan tindak lanjut lebih lanjut.'
  );

  const referralReason = reasonParts.join('\n');

  // ── Build RINGKASAN KONDISI KLINIS ──
  const summaryParts: string[] = [];

  summaryParts.push('IDENTITAS PASIEN');
  summaryParts.push('Nama: ' + name);
  summaryParts.push('Tanggal Lahir: ' + dob);
  summaryParts.push('Jenis Kelamin: ' + gender);
  summaryParts.push('No. Rekam Medis: ' + rmNumber);
  summaryParts.push('');

  summaryParts.push('RIWAYAT PENYAKIT');
  summaryParts.push('Diagnosa Utama: ' + (patient.primaryDiagnosis || '-'));
  summaryParts.push('Diagnosa Penyerta: ' + (patient.secondaryDiagnosis || '-'));
  summaryParts.push('Stadium: ' + (patient.diseaseStage || '-'));
  summaryParts.push('Status Perawatan: ' + patient.careStatus);
  summaryParts.push('Tingkat Risiko: ' + patient.riskLevel);
  summaryParts.push('');

  summaryParts.push('KONDISI TERKINI');
  if (vitals.length > 0) {
    const v = vitals[0];
    const tgl = new Date(v.recordedAt as string).toLocaleString('id-ID');
    summaryParts.push('TTV terakhir (' + tgl + '):');
    summaryParts.push('  TD: ' + fmtVal(v.systolicBP, '') + '/' + fmtVal(v.diastolicBP, ' mmHg'));
    summaryParts.push('  Nadi: ' + fmtVal(v.heartRate, ' bpm'));
    summaryParts.push('  RR: ' + fmtVal(v.respiratoryRate, '/menit'));
    summaryParts.push('  Suhu: ' + fmtVal(v.temperature, ' C'));
    summaryParts.push('  SpO2: ' + fmtVal(v.oxygenSat, '%'));
    summaryParts.push('  BB: ' + fmtVal(v.weight, ' kg'));
  } else {
    summaryParts.push('Data TTV belum tersedia.');
  }
  summaryParts.push('');

  // TTV trend
  if (vitals.length >= 2) {
    summaryParts.push('TREN TTV:');
    const latest = vitals[0];
    const previous = vitals[1];
    if (latest.systolicBP && previous.systolicBP) {
      const diff = Number(latest.systolicBP) - Number(previous.systolicBP);
      if (diff < -10) {
        summaryParts.push('  - Tekanan darah sistolik menurun dari ' + previous.systolicBP + ' menjadi ' + latest.systolicBP + ' mmHg');
      } else if (diff > 10) {
        summaryParts.push('  - Tekanan darah sistolik meningkat dari ' + previous.systolicBP + ' menjadi ' + latest.systolicBP + ' mmHg');
      } else {
        summaryParts.push('  - Tekanan darah relatif stabil');
      }
    }
    if (latest.oxygenSat && Number(latest.oxygenSat) < 90) {
      summaryParts.push('  - Saturasi oksigen kritis: ' + latest.oxygenSat + '%');
    }
    if (latest.heartRate && Number(latest.heartRate) > 100) {
      summaryParts.push('  - Takikardi: ' + latest.heartRate + ' bpm');
    }
    summaryParts.push('');
  }

  // Screening results
  if (screenings.length > 0) {
    summaryParts.push('HASIL SKRINING PALIATIF:');
    screenings.forEach((s) => {
      const tgl = new Date(s.performedAt as string).toLocaleDateString('id-ID');
      summaryParts.push(
        '  - ' + s.screeningType + ': Skor ' + (s.score ?? '-') +
        ' (' + (s.scoreLabel || '-') + ')' +
        ' | EWS: ' + (s.ewsLevel || '-') +
        ' | Tgl: ' + tgl +
        (s.interpretation ? ' | ' + String(s.interpretation) : '')
      );
    });
    summaryParts.push('');
  }

  // Active medications
  if (medications.length > 0) {
    summaryParts.push('OBAT AKTIF:');
    medications.forEach((m) => {
      const adherences = (m.adherences || []) as Record<string, unknown>[];
      const missedDoses = adherences.filter((a) => a.missedDose).length;
      const adherenceRate =
        adherences.length > 0
          ? (((adherences.length - missedDoses) / adherences.length) * 100).toFixed(0) + '%'
          : 'Belum ada data';
      summaryParts.push(
        '  - ' + m.medicineName + ' ' + m.dosage + ' ' + m.frequency +
        ' (' + (m.route || 'oral') + ')' +
        ' | Indikasi: ' + (m.indication || '-') +
        ' | Kepatuhan: ' + adherenceRate
      );
    });
    summaryParts.push('');
  }

  // ACP
  if (acpDocs.length > 0) {
    const acp = acpDocs[0];
    summaryParts.push('ADVANCE CARE PLAN:');
    summaryParts.push('  Tempat Perawatan: ' + (acp.preferredCareLocation || '-'));
    summaryParts.push('  Tujuan: ' + (acp.careGoal || '-'));
    summaryParts.push('  CPR/DNR: ' + (acp.resuscitationPref || '-'));
    summaryParts.push('  Ventilator: ' + (acp.ventilatorPref || '-'));
    summaryParts.push('  ICU: ' + (acp.icuPref || '-'));
    summaryParts.push('  Status Tanda Tangan: Pasien=' + (acp.patientSigned ? 'Ya' : 'Belum') +
      ', Keluarga=' + (acp.familySigned ? 'Ya' : 'Belum') +
      ', Dokter=' + (acp.doctorSigned ? 'Ya' : 'Belum'));
  } else {
    summaryParts.push('Advance Care Planning belum tersedia.');
  }

  const clinicalSummary = summaryParts.join('\n');

  // ── Build PERMINTAAN KONSULTASI ──
  const consultParts: string[] = [];
  consultParts.push('Kami mengajukan permintaan konsultasi ke ' + deptLabel + ' untuk pasien tersebut di atas, dengan permintaan sebagai berikut:');

  const consultItems: string[] = [];
  consultItems.push('1. Evaluasi dan konfirmasi diagnosa serta penatalaksanaan yang telah dilakukan.');

  if (targetDepartment === 'onkologi') {
    consultItems.push('2. Evaluasi stadium dan respons terapi onkologis saat ini.');
    consultItems.push('3. Pertimbangan modifikasi regimen kemoterapi/radioterapi sesuai kondisi pasien.');
    consultItems.push('4. Rekomendasi terapi suportif dan paliatif onkologis.');
  } else if (targetDepartment === 'penyakit_dalam') {
    consultItems.push('2. Evaluasi penyakit penyerta dan komorbiditas internal.');
    consultItems.push('3. Optimasi manajemen nyeri dan gejala sistemik.');
    consultItems.push('4. Rekomendasi tatalaksana medikamentosa lanjutan.');
  } else if (targetDepartment === 'neurologi') {
    consultItems.push('2. Evaluasi fungsi neurologis dan tingkat kesadaran.');
    consultItems.push('3. Penilaian prognosa neurologis.');
    consultItems.push('4. Rekomendasi tatalaksana gejala neurologis.');
  } else if (targetDepartment === 'jantung') {
    consultItems.push('2. Evaluasi fungsi jantung dan hemodinamik.');
    consultItems.push('3. Optimasi terapi kardiovaskular dalam konteks paliatif.');
    consultItems.push('4. Penilaian risiko dan prognosis kardiologis.');
  } else if (targetDepartment === 'pulmonologi') {
    consultItems.push('2. Evaluasi fungsi paru dan status respirasi.');
    consultItems.push('3. Optimasi terapi oksigen dan bronkodilator.');
    consultItems.push('4. Rekomendasi tatalaksana sesak napas dalam konteks paliatif.');
  } else if (targetDepartment === 'geriatri') {
    consultItems.push('2. Penilaian komprehensif geriatri (CGA) meliputi fungsional, kognitif, dan nutrisi.');
    consultItems.push('3. Evaluasi polifarmasi dan potensi interaksi obat.');
    consultItems.push('4. Rekomendasi rehabilitasi dan dukungan fungsional.');
  } else if (targetDepartment === 'kedokteran_paliatif') {
    consultItems.push('2. Evaluasi holistik kebutuhan perawatan paliatif.');
    consultItems.push('3. Optimasi manajemen gejala total (fisik, psikis, sosial, spiritual).');
    consultItems.push('4. Perencanaan perawatan lanjutan dan akhir hayat.');
  } else if (targetDepartment === 'rehabilitasi_medik') {
    consultItems.push('2. Evaluasi fungsional dan kebutuhan rehabilitasi.');
    consultItems.push('3. Penyusunan program rehabilitasi yang sesuai kondisi paliatif.');
    consultItems.push('4. Rekomendasi alat bantu dan adaptasi lingkungan.');
  } else if (targetDepartment === 'rumah_sakit_rujukan_lanjutan') {
    consultItems.push('2. Evaluasi dan penatalaksanaan komprehensif di fasilitas rujukan lanjutan.');
    consultItems.push('3. Koordinasi perawatan lintas disiplin.');
    consultItems.push('4. Rekomendasi perawatan lanjutan pasca rujukan.');
  }

  // Add specific requests based on screening results
  if (patient.riskLevel === 'merah') {
    consultItems.push((consultItems.length + 1) + '. Penanganan segera mengingat pasien dalam kondisi risiko tinggi (merah).');
  }

  if (acpDocs.length > 0) {
    const acp = acpDocs[0];
    consultItems.push(
      (consultItems.length + 1) + '. Menghormati preferensi perawatan pasien sesuai Advance Care Plan' +
      (acp.resuscitationPref ? ' (CPR/DNR: ' + acp.resuscitationPref + ')' : '') + '.'
    );
  }

  consultItems.push(
    (consultItems.length + 1) + '. Koordinasi rencana tindak lanjut dan komunikasi rutin mengenai perkembangan kondisi pasien.'
  );

  consultParts.push(consultItems.join('\n'));
  consultParts.push('');
  consultParts.push('Demikian surat rujukan ini kami sampaikan. Atas perhatian dan kerja sama ' +
    deptLabel + ', kami ucapkan terima kasih.');

  const consultationRequest = consultParts.join('\n');

  // ── Compose full content ──
  const fullParts: string[] = [];
  fullParts.push('SURAT RUJUKAN PASIEN PALIATIF');
  fullParts.push('Kepada Yth.');
  fullParts.push(deptLabel);
  fullParts.push('Di Tempat');
  fullParts.push('');
  fullParts.push('ALASAN RUJUKAN');
  fullParts.push(referralReason);
  fullParts.push('');
  fullParts.push('RINGKASAN KONDISI KLINIS');
  fullParts.push(clinicalSummary);
  fullParts.push('');
  fullParts.push('PERMINTAAN KONSULTASI');
  fullParts.push(consultationRequest);

  const fullContent = fullParts.join('\n');

  return {
    referralReason,
    clinicalSummary,
    consultationRequest,
    fullContent,
  };
}
