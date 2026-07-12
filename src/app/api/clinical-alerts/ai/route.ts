import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/clinical-alerts/ai
// Generates an AI analysis of all active clinical alerts for a patient.
// Uses z-ai-web-dev-sdk to produce: ringkasan kondisi, faktor risiko,
// prioritas, saran terapi, rekomendasi monitoring, draft SOAP, rekomendasi rujukan.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, patientName } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Fetch all active alerts for this patient from Supabase.
    const { data: alertRows, error: alertError } = await supabase
      .from('clinical_alerts')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (alertError) {
      console.error('[clinical-alerts/ai] Supabase error:', alertError.message);
      return NextResponse.json({ error: alertError.message }, { status: 500 });
    }

    if (!alertRows || alertRows.length === 0) {
      return NextResponse.json({
        analysis: 'Tidak ada alert aktif untuk pasien ini. Semua parameter klinis dalam batas normal.',
      });
    }

    // Build the clinical context for the AI.
    const context = buildAlertContext(patientName || 'Pasien', alertRows);

    let aiAnalysis: string;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: [
              'Anda adalah asisten klinis AI yang ahli dalam perawatan paliatif dan Early Warning System (EWS).',
              'Analisis daftar clinical alert berikut dan berikan:',
              '1. RINGKASAN KONDISI PASIEN berdasarkan alert yang aktif',
              '2. FAKTOR RISIKO UTAMA yang teridentifikasi',
              '3. PRIORITAS TINDAKAN (urutkan dari paling mendesak)',
              '4. SARAN TERAPI dan intervensi',
              '5. REKOMENDASI MONITORING (frekuensi, parameter)',
              '6. DRAFT SOAP NOTE',
              '7. REKOMENDASI RUJUKAN (jika diperlukan)',
              '',
              'Format respons dengan heading yang jelas. Gunakan bahasa Indonesia.',
              'Beri penilaian objektif berdasarkan data alert, bukan generalisasi.',
            ].join('\n'),
          },
          { role: 'user', content: context },
        ],
      });
      aiAnalysis = completion.choices?.[0]?.message?.content ?? '';
    } catch (aiErr) {
      console.error('[clinical-alerts/ai] AI generation failed, using fallback:', aiErr);
      aiAnalysis = generateFallbackAnalysis(patientName || 'Pasien', alertRows);
    }

    // Persist the AI report to the ai_reports table.
    try {
      await supabase.from('ai_reports').insert({
        patient_id: patientId,
        report_type: 'clinical_alert_analysis',
        prompt: context,
        response: aiAnalysis,
        metadata: { alert_count: alertRows.length },
        generated_by: 'ai',
      });
    } catch (persistErr) {
      console.error('[clinical-alerts/ai] Failed to persist AI report:', persistErr);
    }

    return NextResponse.json({ analysis: aiAnalysis, alertCount: alertRows.length });
  } catch (error) {
    console.error('[clinical-alerts/ai] error:', error);
    return NextResponse.json({ error: 'Failed to generate AI analysis' }, { status: 500 });
  }
}

function buildAlertContext(patientName: string, alerts: any[]): string {
  const lines: string[] = [];
  lines.push(`ANALISIS CLINICAL ALERT — ${patientName}`);
  lines.push(`Total alert aktif: ${alerts.length}`);
  lines.push('');

  const severityCount: Record<string, number> = {};
  alerts.forEach((a) => {
    const v = a.values ?? {};
    const level = v.severityLevel ?? (a.severity === 'merah' ? 'CRITICAL' : a.severity === 'kuning' ? 'MEDIUM' : 'LOW');
    severityCount[level] = (severityCount[level] || 0) + 1;
  });
  lines.push('Distribusi severity:');
  Object.entries(severityCount).forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
  lines.push('');

  lines.push('DAFTAR ALERT:');
  alerts.forEach((a, i) => {
    const v = a.values ?? {};
    const level = v.severityLevel ?? (a.severity === 'merah' ? 'CRITICAL' : a.severity === 'kuning' ? 'MEDIUM' : 'LOW');
    const status = v.status ?? 'ACTIVE';
    const source = v.sourceModule ?? 'unknown';
    const kategori = v.kategori ?? '-';
    const recommendation = v.recommendation ?? '-';
    lines.push(`${i + 1}. [${level}] [${status}] ${a.title}`);
    lines.push(`   Sumber: ${source} | Kategori: ${kategori}`);
    lines.push(`   Deskripsi: ${a.description}`);
    lines.push(`   Rekomendasi: ${recommendation}`);
    lines.push(`   Dibuat: ${a.created_at}`);
  });

  return lines.join('\n');
}

function generateFallbackAnalysis(patientName: string, alerts: any[]): string {
  const critical = alerts.filter((a) => {
    const v = a.values ?? {};
    return v.severityLevel === 'CRITICAL' || a.severity === 'merah';
  });
  const high = alerts.filter((a) => {
    const v = a.values ?? {};
    return v.severityLevel === 'HIGH';
  });

  const lines: string[] = [];
  lines.push('=== RINGKASAN KONDISI PASIEN ===');
  lines.push(`${patientName} memiliki ${alerts.length} clinical alert aktif.`);
  lines.push(`${critical.length} alert CRITICAL, ${high.length} alert HIGH.`);
  lines.push('');

  lines.push('=== PRIORITAS TINDAKAN ===');
  if (critical.length > 0) {
    lines.push('1. SEGERA: Evaluasi pasien untuk alert CRITICAL:');
    critical.forEach((a) => lines.push(`   - ${a.title}: ${a.description}`));
  }
  if (high.length > 0) {
    lines.push('2. PRIORITAS TINGGI: Tindak lanjuti alert HIGH:');
    high.forEach((a) => lines.push(`   - ${a.title}: ${a.description}`));
  }
  lines.push('');

  lines.push('=== REKOMENDASI MONITORING ===');
  if (critical.length > 0) {
    lines.push('- Monitoring TTV setiap 2-4 jam');
    lines.push('- Pertimbangkan rawat inap atau home visit darurat');
  } else if (high.length > 0) {
    lines.push('- Monitoring TTV setiap 4-8 jam');
    lines.push('- Evaluasi dalam 24 jam');
  } else {
    lines.push('- Monitoring rutin setiap 24 jam');
  }

  return lines.join('\n');
}
