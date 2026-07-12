import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// /api/daily-complaints
//
// Supabase is the SINGLE SOURCE OF TRUTH for daily_complaints. This route no
// longer touches Prisma — every read/write goes straight to Supabase.
//
// Tables touched:
//   • daily_complaints  (the complaint itself)
//   • clinical_alerts   (auto-generated when the patient reports red flags)
//
// All UUID columns (patient_id, doctor_id) are validated before INSERT so we
// never send a non-UUID string to Postgres (which would trigger
// `invalid input syntax for type uuid`).
// ─────────────────────────────────────────────────────────────────────────────

// UUID validation — patient_id is a uuid FK in Supabase.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

// GET /api/daily-complaints?palliativePatientId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const palliativePatientId = searchParams.get('palliativePatientId');

    if (!palliativePatientId || !isValidUuid(palliativePatientId)) {
      // No valid UUID → return empty list (don't try to query with a bad ID)
      return NextResponse.json({ complaints: [], source: 'supabase' });
    }

    const { data: supaRows, error } = await supabase
      .from('daily_complaints')
      .select('*')
      .eq('patient_id', palliativePatientId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[daily-complaints GET] Supabase error:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch daily complaints: ' + error.message },
        { status: 500 }
      );
    }

    const mapped = (supaRows ?? []).map((r: any) => ({
      id: r.id,
      palliativePatientId: r.patient_id,
      kondisiHariIni: r.kondisi_hari_ini,
      alasanKondisi: r.alasan_kondisi,
      keluhanBaru: r.keluhan_baru,
      deskripsiKeluhanBaru: r.deskripsi_keluhan,
      kondisiNyeri: r.kondisi_nyeri,
      kondisiSesak: r.kondisi_sesak,
      makanMinum: r.makan_minum,
      alasanMakanMinum: r.alasan_makan_minum,
      tidur: r.tidur,
      alasanTidur: r.alasan_tidur,
      masalahObat: r.masalah_obat,
      deskripsiMasalahObat: r.deskripsi_masalah,
      severityLevel: r.severity_level || 'ringan',
      sumberPengisian: r.sumber_pengisian || 'manual',
      submittedAt: r.submitted_at,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ complaints: mapped, source: 'supabase' });
  } catch (error) {
    console.error('Error fetching daily complaints:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch daily complaints';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/daily-complaints
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Validate required UUID ────────────────────────────────────────────
    if (!isValidUuid(body.palliativePatientId)) {
      console.error(
        '[daily-complaints POST] ABORTED — patient_id is not a valid UUID:',
        body.palliativePatientId
      );
      return NextResponse.json(
        { error: 'Patient UUID tidak valid — pilih pasien yang valid sebelum mengisi keluhan.' },
        { status: 400 }
      );
    }

    const patientId: string = body.palliativePatientId;
    // NOTE: the daily_complaints table has no doctor_id column — we don't
    // forward it. (clinical_alerts also has no doctor_id in the schema.)

    // Calculate severity level based on answers
    const severityLevel = calculateSeverity(body);

    // ── Build the Supabase row ────────────────────────────────────────────
    // Field names MUST match the daily_complaints table columns exactly.
    const row: Record<string, any> = {
      patient_id: patientId,
      kondisi_hari_ini: body.kondisiHariIni,
      alasan_kondisi: body.alasanKondisi || null,
      keluhan_baru: body.keluhanBaru,
      deskripsi_keluhan: body.deskripsiKeluhanBaru || null,
      kondisi_nyeri: body.kondisiNyeri,
      kondisi_sesak: body.kondisiSesak,
      makan_minum: body.makanMinum,
      alasan_makan_minum: body.alasanMakanMinum || null,
      tidur: body.tidur,
      alasan_tidur: body.alasanTidur || null,
      masalah_obat: body.masalahObat,
      deskripsi_masalah: body.deskripsiMasalahObat || null,
      severity_level: severityLevel,
      sumber_pengisian: body.sumberPengisian || 'monitoring',
    };

    // Diagnostic logging — required by spec.
    console.log('[daily-complaints POST] patient_id:', patientId);
    console.log('[daily-complaints POST] payload:', row);

    // ── INSERT into daily_complaints ──────────────────────────────────────
    const { data: inserted, error: insErr } = await supabase
      .from('daily_complaints')
      .insert(row)
      .select()
      .single();

    if (insErr) {
      console.error('[daily-complaints POST] Supabase INSERT failed:', insErr.message);
      return NextResponse.json(
        { error: 'Gagal menyimpan keluhan: ' + insErr.message },
        { status: 500 }
      );
    }

    const complaint = {
      id: inserted.id,
      palliativePatientId: inserted.patient_id,
      kondisiHariIni: inserted.kondisi_hari_ini,
      alasanKondisi: inserted.alasan_kondisi,
      keluhanBaru: inserted.keluhan_baru,
      deskripsiKeluhanBaru: inserted.deskripsi_keluhan,
      kondisiNyeri: inserted.kondisi_nyeri,
      kondisiSesak: inserted.kondisi_sesak,
      makanMinum: inserted.makan_minum,
      alasanMakanMinum: inserted.alasan_makan_minum,
      tidur: inserted.tidur,
      alasanTidur: inserted.alasan_tidur,
      masalahObat: inserted.masalah_obat,
      deskripsiMasalahObat: inserted.deskripsi_masalah,
      severityLevel: inserted.severity_level,
      sumberPengisian: inserted.sumber_pengisian,
      submittedAt: inserted.submitted_at,
      createdAt: inserted.created_at,
    };

    // ── Generate clinical_alerts into Supabase (best-effort) ──────────────
    const alerts = generateAlerts(body, complaint.id);
    for (const alert of alerts) {
      const alertRow: Record<string, any> = {
        patient_id: patientId,
        alert_type: alert.alertType,
        severity: alert.severity, // already normalized to hijau|kuning|merah
        title: alert.title,
        description: alert.message,
        values: { complaintId: complaint.id, source: 'daily_complaint' },
        is_read: false,
      };
      const { error: alertErr } = await supabase.from('clinical_alerts').insert(alertRow);
      if (alertErr) {
        console.error('[daily-complaints POST] clinical_alerts insert failed:', alertErr.message);
      }
    }

    return NextResponse.json(
      {
        complaint,
        alerts: alerts.map((a) => ({ title: a.title, message: a.message, severity: a.severity })),
        severityLevel,
        source: 'supabase',
      },
      { status: 201 }
    );
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
  alertType: string;
  title: string;
  message: string;
  severity: 'hijau' | 'kuning' | 'merah';
}

function generateAlerts(body: Record<string, string>, complaintId: string): AlertInfo[] {
  const alerts: AlertInfo[] = [];

  if (body.kondisiHariIni === 'tidak_baik') {
    alerts.push({
      alertType: 'kondisi_tidak_baik',
      title: 'Kondisi Pasien Tidak Baik',
      message: `Pasien melaporkan kondisi tidak baik hari ini. Alasan: ${body.alasanKondisi || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.keluhanBaru === 'ada') {
    alerts.push({
      alertType: 'keluhan_baru',
      title: 'Keluhan Baru Dilaporkan',
      message: `Pasien melaporkan keluhan baru: ${body.deskripsiKeluhanBaru || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.kondisiNyeri === 'bertambah') {
    alerts.push({
      alertType: 'nyeri_bertambah',
      title: 'Nyeri Bertambah Berat',
      message: `Pasien melaporkan nyeri bertambah berat. Perlu evaluasi dan tindak lanjut segera.`,
      severity: 'merah',
    });
  }

  if (body.kondisiSesak === 'bertambah') {
    alerts.push({
      alertType: 'sesak_bertambah',
      title: 'Sesak Napas Bertambah Berat',
      message: `Pasien melaporkan sesak napas bertambah berat. Perlu evaluasi dan tindak lanjut segera.`,
      severity: 'merah',
    });
  }

  if (body.makanMinum === 'tidak') {
    alerts.push({
      alertType: 'gangguan_makan_minum',
      title: 'Gangguan Makan & Minum',
      message: `Pasien tidak dapat makan dan minum dengan baik: ${body.alasanMakanMinum || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.tidur === 'tidak') {
    alerts.push({
      alertType: 'gangguan_tidur',
      title: 'Gangguan Tidur',
      message: `Pasien tidak dapat tidur dengan baik: ${body.alasanTidur || '-'}`,
      severity: 'kuning',
    });
  }

  if (body.masalahObat === 'ya') {
    alerts.push({
      alertType: 'masalah_obat',
      title: 'Masalah Obat Dilaporkan',
      message: `Pasien melaporkan masalah dengan obat: ${body.deskripsiMasalahObat || '-'}`,
      severity: 'merah',
    });
  }

  return alerts;
}
