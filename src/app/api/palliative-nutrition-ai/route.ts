import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/palliative-nutrition-ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientData, nutritionData, symptoms } = body;

    // Validate required fields
    if (!patientData || !nutritionData) {
      return NextResponse.json(
        { error: 'Data pasien dan data nutrisi wajib diisi' },
        { status: 400 }
      );
    }

    const {
      name,
      age,
      gender,
      diagnosis,
      diseaseStage,
      careStatus,
      riskLevel,
      weight,
      height,
      bmi,
      bmiCategory,
    } = patientData;

    const {
      totalCalorieNeeds,
      basalCalories,
      idealBodyWeight,
      actualIntakeKcal,
      activityLevel,
      metabolicStress,
      specialCondition,
      macronutrients,
    } = nutritionData;

    const symptomList: string[] = symptoms || [];

    // Build the detailed clinical prompt in Indonesian
    const prompt = `
DATA PASIEN:
- Nama: ${name || '-'}
- Usia: ${age || '-'} tahun
- Jenis Kelamin: ${gender || '-'}
- Diagnosa: ${diagnosis || '-'}
- Stadium Penyakit: ${diseaseStage || '-'}
- Status Perawatan: ${careStatus || '-'}
- Tingkat Risiko: ${riskLevel || '-'}
- Berat Badan: ${weight || '-'} kg
- Tinggi Badan: ${height || '-'} cm
- BMI: ${bmi || '-'} (${bmiCategory || '-'})
- Berat Badan Ideal: ${idealBodyWeight || '-'} kg

DATA NUTRISI:
- Kebutuhan Kalori Total: ${totalCalorieNeeds || '-'} kkal
- Kalori Basal: ${basalCalories || '-'} kkal
- Asupan Aktual: ${actualIntakeKcal || '-'} kkal
- Tingkat Aktivitas: ${activityLevel || '-'}
- Stres Metabolik: ${metabolicStress || '-'}
- Kondisi Khusus: ${specialCondition || '-'}
${
  macronutrients
    ? `
- Makronutrien Saat Ini:
  * Karbohidrat: ${macronutrients.carbohydrateKcal || '-'} kkal (${macronutrients.carbohydrateGrams || '-'} gram)
  * Protein: ${macronutrients.proteinKcal || '-'} kkal (${macronutrients.proteinGrams || '-'} gram)
  * Lemak: ${macronutrients.fatKcal || '-'} kkal (${macronutrients.fatGrams || '-'} gram)
  * Mineral: ${macronutrients.mineralKcal || '-'} kkal`
    : ''
}

GEJALA YANG DIALAMI:
${symptomList.length > 0 ? symptomList.map((s) => `- ${s}`).join('\n') : '- Tidak ada gejala terkait nutrisi yang dilaporkan'}

INSTRUKSI:
Berdasarkan data pasien paliatif di atas, buat rekomendasi nutrisi klinis yang komprehensif dan individual. Pertimbangkan:
1. Kebutuhan kalori dan protein harus disesuaikan dengan stres metabolik, stadium penyakit, dan kondisi khusus pasien.
2. Jika terdapat defisit asupan (asupan aktual < kebutuhan), berikan strategi peningkatan asupan secara bertahap.
3. Sesuaikan rekomendasi dengan gejala yang dialami (misalnya: mual → porsi kecil dan sering, makanan tidak berbau tajam; disfagia → tekstur makanan yang dimodifikasi; cachexia → suplementasi tinggi kalori-protein; anoreksia → stimulasi nafsu makan).
4. Pertimbangkan interaksi potensial antara nutrisi dan kondisi medis pasien.
5. Pola makan harus realistis dan dapat diterapkan dalam konteks perawatan paliatif di rumah.
6. Evaluasi risiko malnutrisi berdasarkan asupan aktual vs kebutuhan, BMI, dan gejala yang ada.

Kembalikan respons dalam format JSON dengan struktur berikut:
{
  "targetCalories": <number - target kalori harian dalam kkal>,
  "targetProteinGrams": <number - target protein harian dalam gram>,
  "mealPattern": "<string - saran pola makan yang detail dan spesifik>",
  "mealFrequency": "<string - frekuensi dan jadwal makan, misalnya '6x sehari porsi kecil setiap 2-3 jam'>",
  "supplementRecommendation": "<string - rekomendasi suplemen nutrisi spesifik>",
  "malnutritionRisk": "<'rendah' | 'sedang' | 'tinggi' - tingkat risiko malnutrisi>",
  "recommendations": [<array of string - minimal 5 rekomendasi spesifik dan dapat ditindaklanjuti>]
}

Pastikan semua nilai numerik realistis dan berdasarkan pedoman nutrisi klinis. Rekomendasi harus bersifat praktis, spesifik untuk kondisi pasien, dan menggunakan bahasa Indonesia yang jelas.`.trim();

    const zai = await ZAI.create();
    const result = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Kamu adalah ahli gizi klinis spesialis perawatan paliatif dengan pengalaman lebih dari 15 tahun. ' +
            'Kamu memiliki keahlian dalam manajemen nutrisi pasien dengan penyakit kronis lanjut, kanker, dan kondisi life-limiting. ' +
            'Kamu memahami pedoman ESPEN (European Society for Clinical Nutrition and Metabolism) dan ASPEN untuk nutrisi paliatif. ' +
            'Kamu harus memberikan rekomendasi yang berbasis bukti, individual, dan mempertimbangkan kualitas hidup pasien. ' +
            'Selalu respons dalam format JSON yang valid sesuai struktur yang diminta.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse the AI response
    const aiContent = result.choices[0].message.content;
    const aiResponse = JSON.parse(aiContent);

    return NextResponse.json({
      ...aiResponse,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Nutrition AI error:', error);
    return NextResponse.json(
      { error: 'Gagal menghasilkan rekomendasi nutrisi' },
      { status: 500 }
    );
  }
}
