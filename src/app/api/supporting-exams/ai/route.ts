import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/supporting-exams/ai
// Generates an AI analysis of all supporting examinations (lab, USG, EKG,
// radiology) for a patient. Uses z-ai-web-dev-sdk to produce:
//   1. Ringkasan klinis
//   2. Interpretasi hasil
//   3. Nilai abnormal
//   4. Faktor risiko
//   5. Perbandingan dengan pemeriksaan sebelumnya
//   6. Rekomendasi pemeriksaan lanjutan
//   7. Rekomendasi terapi
//   8. Draft SOAP
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, patientName } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Fetch all supporting exams for this patient from Supabase. We use the
    // `patient_documents` table which stores all 4 exam types (lab, USG, EKG,
    // radiology) with structured JSON in the `keterangan` column.
    const { data: examRows, error: examError } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .in('jenis', ['lab', 'gambar', 'radiologi'])
      .order('tanggal', { ascending: false })
      .limit(50);

    if (examError) {
      console.error('[supporting-exams/ai] Supabase error:', examError.message);
      return NextResponse.json({ error: examError.message }, { status: 500 });
    }

    if (!examRows || examRows.length === 0) {
      return NextResponse.json({
        analysis:
          'Tidak ada hasil pemeriksaan penunjang untuk pasien ini. Silakan input data laboratorium, USG, EKG, atau radiologi terlebih dahulu.',
      });
    }

    // Build the clinical context for the AI.
    const context = buildExamContext(patientName || 'Pasien', examRows);

    let aiAnalysis: string;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: [
              'Anda adalah asisten klinis AI yang ahli dalam interpretasi hasil pemeriksaan penunjang',
              '(laboratorium, USG, EKG, radiologi) untuk pasien perawatan paliatif.',
              '',
              'Analisis data pemeriksaan penunjang berikut dan berikan:',
              '1. RINGKASAN KLINIS — kondisi umum pasien berdasarkan hasil pemeriksaan',
              '2. INTERPRETASI HASIL — arti klinis dari setiap pemeriksaan',
              '3. NILAI ABNORMAL — daftar nilai yang di luar rentang normal',
              '4. FAKTOR RISIKO — risiko komplikasi yang teridentifikasi',
              '5. PERBANDINGAN DENGAN PEMERIKSAAN SEBELUMNYA — tren dari waktu ke waktu',
              '6. REKOMENDASI PEMERIKSAAN LANJUTAN — pemeriksaan apa yang perlu dilakukan',
              '7. REKOMENDASI TERAPI — saran terapi berdasarkan temuan',
              '8. DRAFT SOAP NOTE — catatan SOAP untuk dokumentasi',
              '',
              'Format respons dengan heading yang jelas. Gunakan bahasa Indonesia.',
              'Beri penilaian objektif berdasarkan data, bukan generalisasi.',
              'Jika data tidak cukup untuk suatu bagian, nyatakan dengan jujur.',
            ].join('\n'),
          },
          { role: 'user', content: context },
        ],
      });
      aiAnalysis = completion.choices?.[0]?.message?.content ?? '';
    } catch (aiErr) {
      console.error('[supporting-exams/ai] AI generation failed, using fallback:', aiErr);
      aiAnalysis = generateFallbackAnalysis(patientName || 'Pasien', examRows);
    }

    // Persist the AI report to the ai_reports table.
    try {
      await supabase.from('ai_reports').insert({
        patient_id: patientId,
        report_type: 'supporting_exam_analysis',
        prompt: context,
        response: aiAnalysis,
        metadata: { exam_count: examRows.length },
        generated_by: 'ai',
      });
    } catch (persistErr) {
      console.error('[supporting-exams/ai] Failed to persist AI report:', persistErr);
    }

    return NextResponse.json({ analysis: aiAnalysis, examCount: examRows.length });
  } catch (error) {
    console.error('[supporting-exams/ai] error:', error);
    return NextResponse.json({ error: 'Failed to generate AI analysis' }, { status: 500 });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function safeParseKeterangan(raw: any): Record<string, any> {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw as Record<string, any>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, any>;
    } catch {
      return {};
    }
  }
  return {};
}

function buildExamContext(patientName: string, exams: any[]): string {
  const lines: string[] = [];
  lines.push(`ANALISIS PEMERIKSAAN PENUNJANG — ${patientName}`);
  lines.push(`Total pemeriksaan: ${exams.length}`);

  // Group by type
  const byType: Record<string, any[]> = { lab: [], usg: [], ekg: [], radiologi: [] };
  for (const e of exams) {
    const k = safeParseKeterangan(e.keterangan);
    const type = k.type ?? (e.jenis === 'lab' ? 'lab' : e.jenis === 'radiologi' ? 'radiologi' : 'unknown');
    if (type === 'lab' || e.jenis === 'lab') byType.lab.push(e);
    else if (type === 'usg') byType.usg.push(e);
    else if (type === 'ekg') byType.ekg.push(e);
    else if (type === 'radiology' || e.jenis === 'radiologi') byType.radiologi.push(e);
  }

  lines.push(`Distribusi: Lab=${byType.lab.length}, USG=${byType.usg.length}, EKG=${byType.ekg.length}, Radiologi=${byType.radiologi.length}`);
  lines.push('');

  // Lab results
  if (byType.lab.length > 0) {
    lines.push('=== HASIL LABORATORIUM ===');
    byType.lab.forEach((e, i) => {
      const k = safeParseKeterangan(e.keterangan);
      lines.push(`\nLab #${i + 1} — Tanggal: ${e.tanggal}`);
      if (k.gdp != null) lines.push(`  GDP (Glukosa Puasa): ${k.gdp} mg/dL (normal 70-100)`);
      if (k.gds != null) lines.push(`  GDS (Glukosa Sewaktu): ${k.gds} mg/dL (normal <140)`);
      if (k.hba1c != null) lines.push(`  HbA1c: ${k.hba1c}% (normal <5.7)`);
      if (k.ureum != null) lines.push(`  Ureum: ${k.ureum} mg/dL (normal 15-40)`);
      if (k.kreatinin != null) lines.push(`  Kreatinin: ${k.kreatinin} mg/dL (normal 0.6-1.2)`);
      if (k.kolesterolTotal != null) lines.push(`  Kolesterol Total: ${k.kolesterolTotal} mg/dL (normal <200)`);
      if (k.hdl != null) lines.push(`  HDL: ${k.hdl} mg/dL (normal >40)`);
      if (k.ldl != null) lines.push(`  LDL: ${k.ldl} mg/dL (normal <130)`);
      if (k.trigliserida != null) lines.push(`  Trigliserida: ${k.trigliserida} mg/dL (normal <150)`);
      if (k.mikroalbumin != null) lines.push(`  Mikroalbumin: ${k.mikroalbumin} mg/dL (normal <30)`);
      if (k.catatan) lines.push(`  Catatan: ${k.catatan}`);
    });
    lines.push('');
  }

  // USG results
  if (byType.usg.length > 0) {
    lines.push('=== HASIL USG ===');
    byType.usg.forEach((e, i) => {
      const k = safeParseKeterangan(e.keterangan);
      lines.push(`\nUSG #${i + 1} — Tanggal: ${e.tanggal}`);
      if (k.jenisUsg) lines.push(`  Jenis: ${k.jenisUsg}`);
      if (k.hasil) lines.push(`  Hasil: ${k.hasil}`);
      if (k.catatan) lines.push(`  Catatan: ${k.catatan}`);
    });
    lines.push('');
  }

  // EKG results
  if (byType.ekg.length > 0) {
    lines.push('=== HASIL EKG ===');
    byType.ekg.forEach((e, i) => {
      const k = safeParseKeterangan(e.keterangan);
      lines.push(`\nEKG #${i + 1} — Tanggal: ${e.tanggal}`);
      if (k.interpretasi) lines.push(`  Interpretasi: ${k.interpretasi}`);
      if (k.catatan) lines.push(`  Catatan: ${k.catatan}`);
    });
    lines.push('');
  }

  // Radiology results
  if (byType.radiologi.length > 0) {
    lines.push('=== HASIL RADIOLOGI ===');
    byType.radiologi.forEach((e, i) => {
      const k = safeParseKeterangan(e.keterangan);
      lines.push(`\nRadiologi #${i + 1} — Tanggal: ${e.tanggal}`);
      if (k.jenisRadiologi) lines.push(`  Jenis: ${k.jenisRadiologi}`);
      if (k.hasil) lines.push(`  Hasil: ${k.hasil}`);
      if (k.catatan) lines.push(`  Catatan: ${k.catatan}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

function generateFallbackAnalysis(patientName: string, exams: any[]): string {
  const lines: string[] = [];
  const lab = exams.filter((e) => e.jenis === 'lab');
  const usg = exams.filter((e) => {
    const k = safeParseKeterangan(e.keterangan);
    return k.type === 'usg';
  });
  const ecg = exams.filter((e) => {
    const k = safeParseKeterangan(e.keterangan);
    return k.type === 'ekg';
  });
  const rad = exams.filter((e) => e.jenis === 'radiologi');

  // Identify abnormal values
  const abnormal: string[] = [];
  for (const e of lab) {
    const k = safeParseKeterangan(e.keterangan);
    if (k.hba1c != null && k.hba1c >= 9) abnormal.push(`HbA1c ${k.hba1c}% (>=9% — kritis)`);
    if (k.gdp != null && k.gdp >= 250) abnormal.push(`GDP ${k.gdp} mg/dL (>=250 — kritis)`);
    if (k.gds != null && k.gds >= 300) abnormal.push(`GDS ${k.gds} mg/dL (>=300 — kritis)`);
    if (k.ldl != null && k.ldl >= 190) abnormal.push(`LDL ${k.ldl} mg/dL (>=190 — tinggi)`);
    if (k.kreatinin != null && k.kreatinin > 2.0) abnormal.push(`Kreatinin ${k.kreatinin} mg/dL (>2.0 — tinggi)`);
    if (k.mikroalbumin != null && k.mikroalbumin > 30) abnormal.push(`Mikroalbumin ${k.mikroalbumin} mg/dL (>30 — positif)`);
  }

  lines.push('=== RINGKASAN KLINIS ===');
  lines.push(`${patientName} memiliki ${exams.length} hasil pemeriksaan penunjang.`);
  lines.push(`Lab: ${lab.length}, USG: ${usg.length}, EKG: ${ecg.length}, Radiologi: ${rad.length}.`);
  lines.push('');

  lines.push('=== NILAI ABNORMAL ===');
  if (abnormal.length > 0) {
    abnormal.forEach((a) => lines.push(`- ${a}`));
  } else {
    lines.push('Tidak ada nilai abnormal yang terdeteksi berdasarkan ambang batas otomatis.');
  }
  lines.push('');

  lines.push('=== REKOMENDASI TERAPI ===');
  if (abnormal.length > 0) {
    lines.push('- Tindak lanjuti nilai abnormal dengan evaluasi klinis komprehensif');
    lines.push('- Koreksi penyebab yang dapat diatasi (kepatuhan obat, diet, hidrasi)');
    lines.push('- Pertimbangkan eskalasi terapi sesuai panduan klinis');
    lines.push('- Monitoring berkala untuk evaluasi respons terapi');
  } else {
    lines.push('- Lanjutkan terapi saat ini');
    lines.push('- Monitoring berkala sesuai jadwal');
  }
  lines.push('');

  lines.push('=== REKOMENDASI PEMERIKSAAN LANJUTAN ===');
  lines.push('- Pemeriksaan ulang sesuai indikasi klinis');
  lines.push('- Evaluasi fungsi organ terkait bila ada abnormalitas');

  return lines.join('\n');
}
