import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/daily-complaints?palliativePatientId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const palliativePatientId = searchParams.get('palliativePatientId');

    const where: Record<string, string> = {};
    if (palliativePatientId) {
      where.palliativePatientId = palliativePatientId;
    }

    const complaints = await db.dailyComplaint.findMany({
      where,
      include: { patient: { select: { id: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    // Enrich with patient name from the related PalliativePatient record
    const enriched = complaints.map((c) => ({
      ...c,
      patientName: undefined as string | undefined,
    }));

    // Get patient names from the palliativePatients store approach - 
    // since PalliativePatient doesn't have name directly, we get it from the linked User
    const patientIds = [...new Set(complaints.map((c) => c.palliativePatientId))];
    const patients = await db.palliativePatient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, patientId: true },
    });

    // Get user names
    const userIds = patients.map((p) => p.patientId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const patientMap = new Map(patients.map((p) => [p.id, p.patientId]));

    const result = complaints.map((c) => ({
      ...c,
      patientName: userMap.get(patientMap.get(c.palliativePatientId) || '') || undefined,
    }));

    return NextResponse.json({ complaints: result });
  } catch (error) {
    console.error('Error fetching daily complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch daily complaints' }, { status: 500 });
  }
}

// POST /api/daily-complaints
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Calculate severity level based on answers
    const severityLevel = calculateSeverity(body);

    const complaint = await db.dailyComplaint.create({
      data: {
        palliativePatientId: body.palliativePatientId,
        kondisiHariIni: body.kondisiHariIni,
        alasanKondisi: body.alasanKondisi || null,
        keluhanBaru: body.keluhanBaru,
        deskripsiKeluhanBaru: body.deskripsiKeluhanBaru || null,
        kondisiNyeri: body.kondisiNyeri,
        kondisiSesak: body.kondisiSesak,
        makanMinum: body.makanMinum,
        alasanMakanMinum: body.alasanMakanMinum || null,
        tidur: body.tidur,
        alasanTidur: body.alasanTidur || null,
        masalahObat: body.masalahObat,
        deskripsiMasalahObat: body.deskripsiMasalahObat || null,
        severityLevel,
        sumberPengisian: body.sumberPengisian || 'monitoring',
      },
    });

    // Get patient name for notification
    const patient = await db.palliativePatient.findUnique({
      where: { id: body.palliativePatientId },
      select: { patientId: true },
    });

    let patientName = 'Pasien';
    if (patient) {
      const user = await db.user.findUnique({
        where: { id: patient.patientId },
        select: { name: true },
      });
      if (user) patientName = user.name;
    }

    // Create clinical notifications for alert conditions
    const alerts = generateAlerts(body, complaint.id, patientName);

    // Create notifications in DB for each alert
    if (patient) {
      for (const alert of alerts) {
        await db.notification.create({
          data: {
            userId: patient.patientId,
            title: alert.title,
            message: alert.message,
            type: 'clinical_alert',
            referenceId: complaint.id,
          },
        });
      }
    }

    return NextResponse.json({
      complaint: {
        ...complaint,
        patientName,
      },
      alerts,
      severityLevel,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating daily complaint:', error);
    const message = error instanceof Error ? error.message : 'Failed to create daily complaint';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateSeverity(body: Record<string, string>): string {
  // Red: worsening conditions
  if (
    body.kondisiHariIni === 'tidak_baik' ||
    body.keluhanBaru === 'ada' ||
    body.kondisiNyeri === 'bertambah' ||
    body.kondisiSesak === 'bertambah' ||
    body.makanMinum === 'tidak' ||
    body.masalahObat === 'ya'
  ) {
    // Check for critical (multiple red flags)
    const redFlags = [
      body.kondisiHariIni === 'tidak_baik',
      body.kondisiNyeri === 'bertambah',
      body.kondisiSesak === 'bertambah',
      body.makanMinum === 'tidak',
      body.masalahObat === 'ya',
    ].filter(Boolean).length;

    if (redFlags >= 2) return 'merah';
    return 'kuning';
  }

  // Yellow: mild issues (pain/dyspnea still present but not worsening)
  if (
    body.kondisiNyeri === 'sama' ||
    body.kondisiSesak === 'sama' ||
    body.tidur === 'tidak'
  ) {
    return 'kuning';
  }

  // Green: stable / improving
  return 'hijau';
}

interface AlertInfo {
  title: string;
  message: string;
  severity: string;
}

function generateAlerts(body: Record<string, string>, complaintId: string, patientName: string): AlertInfo[] {
  const alerts: AlertInfo[] = [];

  if (body.kondisiHariIni === 'tidak_baik') {
    alerts.push({
      title: 'Kondisi Pasien Tidak Baik',
      message: `${patientName} melaporkan kondisi tidak baik hari ini. Alasan: ${body.alasanKondisi || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.keluhanBaru === 'ada') {
    alerts.push({
      title: 'Keluhan Baru Dilaporkan',
      message: `${patientName} melaporkan keluhan baru: ${body.deskripsiKeluhanBaru || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.kondisiNyeri === 'bertambah') {
    alerts.push({
      title: 'Nyeri Bertambah Berat',
      message: `${patientName} melaporkan nyeri bertambah berat. Perlu evaluasi dan tindak lanjut segera.`,
      severity: 'merah',
    });
  }

  if (body.kondisiSesak === 'bertambah') {
    alerts.push({
      title: 'Sesak Napas Bertambah Berat',
      message: `${patientName} melaporkan sesak napas bertambah berat. Perlu evaluasi dan tindak lanjut segera.`,
      severity: 'merah',
    });
  }

  if (body.makanMinum === 'tidak') {
    alerts.push({
      title: 'Gangguan Makan & Minum',
      message: `${patientName} tidak dapat makan dan minum dengan baik: ${body.alasanMakanMinum || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.tidur === 'tidak') {
    alerts.push({
      title: 'Gangguan Tidur',
      message: `${patientName} tidak dapat tidur dengan baik: ${body.alasanTidur || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.masalahObat === 'ya') {
    alerts.push({
      title: 'Masalah Obat Dilaporkan',
      message: `${patientName} melaporkan masalah dengan obat: ${body.deskripsiMasalahObat || '-'}`,
      severity: 'merah',
    });
  }

  return alerts;
}
