import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { supabase } from '@/supabaseClient';
import { medicalSystemReviewService } from '@/services/supabase';
import { ROS_SYSTEMS, generateRosSummary } from '@/lib/ros-data';
import type { RosItemRecord } from '@/lib/types';

// POST /api/medical-system-review/ai
//
// Generates AI-assisted help around a doctor's completed Anamnesis Sistem
// (Review of Systems): a clinical summary, grouping of complaints, and
// suggested areas for further assessment. Per spec §8/§23:
//   - The AI is only ever given the doctor's own recorded answers — it
//     never invents findings.
//   - The AI must not state a diagnosis; it must use hedged language
//     ("temuan yang perlu dipertimbangkan...").
//   - The response is always labelled for the client as AI assistance that
//     requires doctor verification (done client-side + reinforced here).
//
// Body: { patientId: string, patientName?: string, encounterId?: string, items?: RosItemRecord[] }
// If `items` isn't provided, the latest saved encounter for the patient is
// used instead.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, patientName, encounterId } = body;
    let items: RosItemRecord[] | undefined = body.items;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID diperlukan' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      items = encounterId
        ? await medicalSystemReviewService.getEncounter(patientId, encounterId)
        : (await medicalSystemReviewService.getLatest(patientId))?.items;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        analysis:
          'Belum ada data Anamnesis Sistem untuk pasien ini. Silakan isi formulir Anamnesis Sistem terlebih dahulu.',
      });
    }

    const doctorSummary = generateRosSummary(items);
    const context = buildRosContext(patientName || 'Pasien', items, doctorSummary);

    let aiAnalysis: string;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: [
              'Anda adalah asisten klinis AI yang membantu dokter menelaah hasil Anamnesis Sistem',
              '(Review of Systems) yang SUDAH diisi oleh dokter sendiri. Anda TIDAK BOLEH menambahkan',
              'gejala apa pun yang tidak ada dalam data yang diberikan.',
              '',
              'Berdasarkan data anamnesis sistem berikut, berikan:',
              '1. RINGKASAN — rangkuman singkat temuan per sistem yang positif (gunakan hanya data yang ada).',
              '2. PENGELOMPOKAN KELUHAN — kelompokkan keluhan yang mungkin saling terkait secara klinis.',
              '3. AREA PENGKAJIAN LANJUTAN — sistem/pemeriksaan tambahan apa yang perlu dipertimbangkan dokter.',
              '4. CATATAN UNTUK SOAP — draf singkat bagian Subjective yang bisa dokter sunting.',
              '',
              'ATURAN WAJIB:',
              '- JANGAN membuat diagnosis pasti. Gunakan frasa seperti "temuan yang perlu dipertimbangkan..."',
              '  atau "dapat mengarah pada beberapa kemungkinan, di antaranya...", BUKAN "pasien pasti mengalami...".',
              '- JANGAN mengarang gejala yang tidak disebutkan dalam data.',
              '- Jika sebuah sistem tidak dinilai, jangan berasumsi apa pun tentang sistem tersebut.',
              '- Gunakan bahasa Indonesia, format dengan heading yang jelas.',
            ].join('\n'),
          },
          { role: 'user', content: context },
        ],
      });
      aiAnalysis = completion.choices?.[0]?.message?.content ?? '';
    } catch (aiErr) {
      console.error('[medical-system-review/ai] AI generation failed, using fallback:', aiErr);
      aiAnalysis = `RINGKASAN\n${doctorSummary}\n\n(Analisis AI tidak tersedia saat ini — menampilkan ringkasan berbasis data yang tersimpan.)`;
    }

    // Persist alongside other AI reports (best-effort — never blocks the response).
    try {
      await supabase.from('ai_reports').insert({
        patient_id: patientId,
        report_type: 'medical_system_review_analysis',
        prompt: context,
        response: aiAnalysis,
        metadata: { item_count: items.length, encounter_id: items[0]?.encounterId },
        generated_by: 'ai',
      });
    } catch (persistErr) {
      console.error('[medical-system-review/ai] Failed to persist AI report:', persistErr);
    }

    return NextResponse.json({
      analysis: aiAnalysis,
      doctorSummary,
      label: 'Bantuan AI — memerlukan verifikasi dokter',
    });
  } catch (error) {
    console.error('[medical-system-review/ai] error:', error);
    return NextResponse.json({ error: 'Gagal membuat analisis AI' }, { status: 500 });
  }
}

function buildRosContext(patientName: string, items: RosItemRecord[], doctorSummary: string): string {
  const lines: string[] = [];
  lines.push(`ANAMNESIS SISTEM — ${patientName}`);
  lines.push(`Ringkasan dokter (sudah tervalidasi): ${doctorSummary}`);
  lines.push('');
  lines.push('Data lengkap per sistem (hanya data yang diisi dokter):');

  const bySystem = new Map<string, RosItemRecord[]>();
  for (const item of items) {
    const list = bySystem.get(item.systemName) ?? [];
    list.push(item);
    bySystem.set(item.systemName, list);
  }

  for (const system of ROS_SYSTEMS) {
    const systemItems = bySystem.get(system.id);
    if (!systemItems || systemItems.length === 0) continue;
    lines.push(`\n[${system.label}]`);
    for (const item of systemItems) {
      const statusLabel =
        item.status === 'positive' ? 'Ada' :
        item.status === 'negative' ? 'Tidak ada' :
        item.status === 'not_asked' ? 'Tidak ditanyakan' : 'Tidak dapat dinilai';
      const detail = item.status === 'positive' && item.detail ? ` — Detail: ${item.detail}` : '';
      lines.push(`- ${item.symptomName}: ${statusLabel}${detail}`);
    }
  }

  return lines.join('\n');
}
