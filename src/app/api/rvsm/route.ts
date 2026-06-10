import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, patientName, vitalData, alerts, dailyReports, palliativeEstimates } = body;

    // Generate AI analysis for RVSM data
    const analysis = generateRVSMAnalysis({
      patientId,
      patientName,
      vitalData,
      alerts,
      dailyReports,
      palliativeEstimates,
    });

    return NextResponse.json({ analysis, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to analyze RVSM data', success: false },
      { status: 500 }
    );
  }
}

function generateRVSMAnalysis(data: {
  patientId: string;
  patientName?: string;
  vitalData?: Record<string, unknown>[];
  alerts?: Record<string, unknown>[];
  dailyReports?: Record<string, unknown>[];
  palliativeEstimates?: Record<string, unknown>;
}) {
  const { patientName = 'Pasien', vitalData = [], alerts = [], dailyReports = [], palliativeEstimates = {} } = data;

  const latestVital = vitalData.length > 0 ? vitalData[vitalData.length - 1] : {};
  const criticalAlerts = alerts.filter((a: Record<string, unknown>) => a.severity === 'critical');
  const attentionAlerts = alerts.filter((a: Record<string, unknown>) => a.severity === 'attention');

  let analysis = `RINGKASAN MONITORING VITAL SIGN REMOTE\n`;
  analysis += `Pasien: ${patientName}\n`;
  analysis += `Waktu Analisis: ${new Date().toLocaleString('id-ID')}\n\n`;

  analysis += `DATA VITAL TERKINI\n`;
  if (latestVital.heartRate) analysis += `Denyut Jantung: ${latestVital.heartRate} bpm`;
  if (latestVital.heartRhythm) analysis += ` (${latestVital.heartRhythm})`;
  analysis += '\n';
  if (latestVital.oxygenSat) analysis += `SpO2: ${latestVital.oxygenSat}%\n`;
  if (latestVital.respiratoryRate) analysis += `Frekuensi Napas: ${latestVital.respiratoryRate}/menit\n`;
  if (latestVital.systolicBP && latestVital.diastolicBP) analysis += `Tekanan Darah: ${latestVital.systolicBP}/${latestVital.diastolicBP} mmHg\n`;
  if (latestVital.skinTemperature) analysis += `Suhu Kulit: ${latestVital.skinTemperature}°C\n`;

  analysis += `\nANALISIS TREN\n`;
  if (vitalData.length >= 2) {
    const first = vitalData[0] as Record<string, number>;
    const last = vitalData[vitalData.length - 1] as Record<string, number>;
    if (first.heartRate && last.heartRate) {
      const hrChange = last.heartRate - first.heartRate;
      analysis += `Nadi: ${hrChange > 0 ? 'Meningkat' : 'Menurun'} ${Math.abs(hrChange)} bpm\n`;
    }
    if (first.oxygenSat && last.oxygenSat) {
      const spo2Change = last.oxygenSat - first.oxygenSat;
      analysis += `SpO2: ${spo2Change > 0 ? 'Meningkat' : 'Menurun'} ${Math.abs(spo2Change)}%\n`;
    }
  }

  analysis += `\nPERINGATAN DINI\n`;
  if (criticalAlerts.length > 0) {
    analysis += `[KRITIS] ${criticalAlerts.length} peringatan kritis aktif:\n`;
    criticalAlerts.forEach((a: Record<string, unknown>) => {
      analysis += `- ${a.title}: ${a.description}\n`;
    });
  }
  if (attentionAlerts.length > 0) {
    analysis += `[PERHATIAN] ${attentionAlerts.length} peringatan perlu perhatian:\n`;
    attentionAlerts.forEach((a: Record<string, unknown>) => {
      analysis += `- ${a.title}: ${a.description}\n`;
    });
  }
  if (criticalAlerts.length === 0 && attentionAlerts.length === 0) {
    analysis += `Tidak ada peringatan aktif saat ini.\n`;
  }

  const estimates = palliativeEstimates as Record<string, unknown>;
  if (estimates.ppsEstimate) {
    const pps = estimates.ppsEstimate as Record<string, unknown>;
    analysis += `\nESTIMASI SKOR PALIATIF\n`;
    analysis += `PPS Estimasi: ${pps.currentEstimate}%`;
    if (pps.change) analysis += ` (Perubahan: ${Number(pps.change) > 0 ? '+' : ''}${pps.change}%)`;
    analysis += ` | Kepercayaan: ${Math.round((pps.confidence as number) * 100)}%\n`;
  }

  analysis += `\nREKOMENDASI\n`;
  if (criticalAlerts.length > 0) {
    analysis += `- Tindakan segera diperlukan untuk ${criticalAlerts.length} peringatan kritis\n`;
  }
  if (latestVital.oxygenSat && Number(latestVital.oxygenSat) < 92) {
    analysis += `- Evaluasi kebutuhan oksigen tambahan\n`;
  }
  analysis += `- Lanjutkan monitoring vital sign secara berkala\n`;
  analysis += `- Evaluasi ulang dalam 6-12 jam\n`;

  return analysis;
}
