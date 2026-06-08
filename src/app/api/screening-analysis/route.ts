import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateName, standard, answers, questions, score, riskCategory } = body;

    if (!templateName || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Build answers summary for AI analysis
    const answersSummary = questions
      ?.map((q: { id: string; text: string; type: string; options?: { label: string; value: string | number }[] }) => {
        const answer = answers[q.id];
        if (answer === undefined) return null;
        let answerText = '';
        if (Array.isArray(answer)) {
          answerText = answer
            .map((v: string) => q.options?.find((o) => String(o.value) === String(v))?.label || String(v))
            .join(', ');
        } else if (q.type === 'radio' && q.options) {
          answerText = q.options.find((o) => String(o.value) === String(answer))?.label || String(answer);
        } else {
          answerText = String(answer);
        }
        return `• ${q.text}: ${answerText}`;
      })
      .filter(Boolean)
      .join('\n');

    const riskLabel = riskCategory === 'tinggi' ? 'Tinggi' : riskCategory === 'sedang' ? 'Sedang' : 'Rendah';

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `Anda adalah AI Clinical Assistant untuk sistem telemedicine MedikaLink di Indonesia. Anda menganalisis hasil skrining kesehatan pasien dan memberikan ringkasan klinis, faktor risiko utama, dan rekomendasi tindak lanjut berdasarkan pedoman klinis Indonesia. Gunakan bahasa Indonesia yang profesional namun mudah dipahami. Format jawaban dalam Markdown.`,
        },
        {
          role: 'user',
          content: `Analisis hasil skrining kesehatan berikut:

📋 **Jenis Skrining**: ${templateName}
📊 **Standar**: ${standard}
📈 **Skor**: ${score}
⚠️ **Kategori Risiko**: ${riskLabel}

**Jawaban Pasien**:
${answersSummary || 'Tidak ada jawaban'}

Berikan analisis dalam format berikut:

## 📊 Ringkasan Klinis
Ringkasan singkat kondisi pasien berdasarkan hasil skrining.

## ⚠️ Faktor Risiko Utama
Identifikasi faktor risiko utama dari jawaban pasien.

## 💊 Rekomendasi Tindak Lanjut
Rekomendasi tindak lanjut berdasarkan pedoman klinis:
- Pemeriksaan yang perlu dilakukan
- Konsultasi spesialis yang direkomendasikan
- Modifikasi gaya hidup
- Follow-up timeline

## 📝 SOAP Note
Buat SOAP Note singkat dari hasil skrining:
- **Subjective**: Keluhan dan riwayat dari jawaban skrining
- **Objective**: Skor dan kategori risiko
- **Assessment**: Analisis kondisi
- **Plan**: Rencana tindak lanjut`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const analysis = completion.choices[0]?.message?.content || 'Tidak dapat menganalisis hasil skrining.';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Screening analysis error:', error);
    return NextResponse.json(
      { analysis: 'Gagal menganalisis hasil skrining. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
