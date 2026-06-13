import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PatientData {
  patientName?: string;
  rmNumber?: string;
  nik?: string;
  bpjsNumber?: string;
  primaryDiagnosis?: string;
  secondaryDiagnosis?: string;
  diseaseStage?: string;
  careStatus?: string;
  riskLevel?: string;
}

interface DocumentData {
  documentNumber: string;
  generatedAt: string;
  doctorName?: string;
  doctorSip?: string;
  isSigned?: boolean;
  signedAt?: string;
  fullContent: string;
  targetDepartment?: string;
  referralStatus?: string;
  version?: number;
}

interface FacilityData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

interface ResumeStructuredData {
  dataPasien: {
    nama?: string;
    tanggalLahir?: string;
    umur?: string;
    jenisKelamin?: string;
    nik?: string;
    noRM?: string;
    noBPJS?: string;
    alamat?: string;
    noTelepon?: string;
    diagnosaUtama?: string;
    diagnosaPenyerta?: string;
    stadiumPenyakit?: string;
    dpjp?: string;
    dpjpSpesialisasi?: string;
    dpjpSIP?: string;
    statusPerawatan?: string;
    statusPasien?: string;
    tingkatRisiko?: string;
    tanggalRegistrasi?: string;
    kontakKeluarga?: { nama?: string; hubungan?: string; telepon?: string };
  };
  ttvSerial: {
    ttvAwal: Record<string, unknown> | null;
    ttvKritis: Record<string, unknown> & { alasanKritis?: string[] } | null;
    ttvTerakhir: Record<string, unknown> | null;
  };
  keluhanHarian: {
    keluhanAwal: Record<string, unknown> | null;
    keluhanTerberat: Record<string, unknown> | null;
    keluhanTerakhir: Record<string, unknown> | null;
    analisis: string;
  };
  skriningPaliatif: Record<string, unknown[]>;
  esasScores: {
    skorAwal: Record<string, unknown> | null;
    skorTertinggi: Record<string, unknown> | null;
    skorTerakhir: Record<string, unknown> | null;
  };
  obat: {
    analgesik?: unknown[];
    simtomatik?: Record<string, unknown[]>;
    obatLainnya?: unknown[];
    kepatuhan?: string;
    perubahanRegimen?: string;
    responsTerapi?: string;
  };
  nutrisi: {
    catatan?: unknown[];
    ringkasan?: string;
  };
  sosial: {
    penilaianSosial?: unknown[];
    caregiver?: unknown[];
    pertemuanKeluarga?: unknown[];
    dukunganKeuangan?: unknown[];
    ringkasan?: string;
  };
  acp: {
    dokumen?: unknown[];
    ringkasan?: string;
  };
  aiAnalysis: {
    ringkasanPerjalananKlinis?: string;
    identifikasiKondisiKritis?: string;
    analisisTrenPasien?: string;
    ringkasanSkrining?: {
      domainFisik?: string;
      domainPsikologis?: string;
      domainSosial?: string;
      domainSpiritual?: string;
      kebutuhanEdukasi?: string;
      bebanCaregiver?: string;
    };
    ringkasanNutrisi?: string;
    ringkasanSosial?: string;
    ringkasanACP?: string;
    kesimpulanTelepaliatif?: Record<string, string>;
    rekomendasi?: string[];
  };
}

interface PdfRequestBody {
  documentType: 'resume' | 'referral';
  documentId: string;
  patientData: PatientData;
  documentData: DocumentData;
  facilityData?: FacilityData;
  resumeData?: ResumeStructuredData;
}

// ── PDF context object to pass around ────────────────────────────────────────
interface PdfContext {
  pdf: jsPDF;
  y: number;
  pageNum: number;
  margin: number;
  contentWidth: number;
  pageWidth: number;
  pageHeight: number;
}

// ── Helper: Format date in Indonesian ────────────────────────────────────────
function formatIndonesianDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Helper: Safe string ─────────────────────────────────────────────────────
function s(val: unknown): string {
  if (val === null || val === undefined || val === '') return '-';
  return String(val);
}

// ── Helper: Draw double horizontal line ──────────────────────────────────────
function drawDoubleLine(pdf: jsPDF, x1: number, x2: number, y: number): void {
  pdf.setLineWidth(0.5);
  pdf.line(x1, y, x2, y);
  pdf.setLineWidth(0.2);
  pdf.line(x1, y + 1.2, x2, y + 1.2);
  pdf.setLineWidth(0.2);
}

// ── Helper: Add page number footer ──────────────────────────────────────────
function addPageNumber(pdf: jsPDF, pageNum: number): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Halaman ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
}

// ── Helper: Check page break needed ─────────────────────────────────────────
function checkPageBreak(
  ctx: PdfContext,
  needed: number,
): PdfContext {
  if (ctx.y + needed > ctx.pageHeight - ctx.margin - 15) {
    ctx.pdf.addPage();
    ctx.pageNum++;
    addPageNumber(ctx.pdf, ctx.pageNum);
    ctx.y = ctx.margin;
  }
  return ctx;
}

// ── Helper: Draw section header bar ─────────────────────────────────────────
function drawSectionHeader(ctx: PdfContext, title: string): PdfContext {
  ctx.y += 3;
  const pb = checkPageBreak(ctx, 12);
  ctx.y = pb.y;
  ctx.pageNum = pb.pageNum;

  // Background bar
  ctx.pdf.setFillColor(230, 237, 244);
  ctx.pdf.rect(ctx.margin, ctx.y - 4, ctx.contentWidth, 7, 'F');

  // Left accent bar
  ctx.pdf.setFillColor(45, 140, 122);
  ctx.pdf.rect(ctx.margin, ctx.y - 4, 2, 7, 'F');

  // Title text
  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.setFontSize(11);
  ctx.pdf.setTextColor(20, 60, 80);
  ctx.pdf.text(title, ctx.margin + 5, ctx.y);
  ctx.pdf.setTextColor(0, 0, 0);

  ctx.y += 6;
  return ctx;
}

// ── Helper: Draw sub-section header ─────────────────────────────────────────
function drawSubHeader(ctx: PdfContext, title: string): PdfContext {
  ctx.y += 2;
  const pb = checkPageBreak(ctx, 10);
  ctx.y = pb.y;
  ctx.pageNum = pb.pageNum;

  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.setFontSize(10);
  ctx.pdf.setTextColor(45, 140, 122);
  ctx.pdf.text(title, ctx.margin + 2, ctx.y);
  ctx.pdf.setTextColor(0, 0, 0);
  ctx.y += 2;
  return ctx;
}

// ── Helper: Draw two-column key-value table (Data Pasien style) ────────────
function drawKeyValueTable(
  ctx: PdfContext,
  rows: Array<[string, string]>,
  colWidths?: [number, number],
): PdfContext {
  const labelW = colWidths ? colWidths[0] : 50;
  const valueW = colWidths ? colWidths[1] : ctx.contentWidth - labelW;
  const rowH = 6;
  const halfW = ctx.contentWidth / 2;

  for (let i = 0; i < rows.length; i += 2) {
    const pb = checkPageBreak(ctx, rowH + 2);
    ctx.y = pb.y;
    ctx.pageNum = pb.pageNum;

    // Left column
    const [label1, value1] = rows[i];
    ctx.pdf.setFillColor(248, 250, 252);
    ctx.pdf.rect(ctx.margin, ctx.y - 4, halfW, rowH, 'F');
    ctx.pdf.setDrawColor(200, 210, 220);
    ctx.pdf.rect(ctx.margin, ctx.y - 4, halfW, rowH);

    ctx.pdf.setFont('times', 'bold');
    ctx.pdf.setFontSize(9);
    ctx.pdf.text(label1, ctx.margin + 2, ctx.y);
    ctx.pdf.setFont('times', 'normal');
    const v1Lines = ctx.pdf.splitTextToSize(value1, halfW - labelW - 4);
    ctx.pdf.text(v1Lines, ctx.margin + labelW, ctx.y);

    // Right column (if exists)
    if (i + 1 < rows.length) {
      const [label2, value2] = rows[i + 1];
      const x2 = ctx.margin + halfW;
      ctx.pdf.setFillColor(248, 250, 252);
      ctx.pdf.rect(x2, ctx.y - 4, halfW, rowH, 'F');
      ctx.pdf.setDrawColor(200, 210, 220);
      ctx.pdf.rect(x2, ctx.y - 4, halfW, rowH);

      ctx.pdf.setFont('times', 'bold');
      ctx.pdf.text(label2, x2 + 2, ctx.y);
      ctx.pdf.setFont('times', 'normal');
      const v2Lines = ctx.pdf.splitTextToSize(value2, halfW - labelW - 4);
      ctx.pdf.text(v2Lines, x2 + labelW, ctx.y);
    }

    ctx.y += rowH;
  }
  ctx.y += 2;
  return ctx;
}

// ── Helper: Draw grid table with header row ─────────────────────────────────
function drawGridTable(
  ctx: PdfContext,
  headers: string[],
  rows: string[][],
  colWidths?: number[],
): PdfContext {
  if (!colWidths) {
    const w = ctx.contentWidth / headers.length;
    colWidths = headers.map(() => w);
  }

  const rowH = 6;

  // Header row
  const pbH = checkPageBreak(ctx, rowH + 2);
  ctx.y = pbH.y;
  ctx.pageNum = pbH.pageNum;

  ctx.pdf.setFillColor(45, 140, 122);
  ctx.pdf.rect(ctx.margin, ctx.y - 4, ctx.contentWidth, rowH, 'F');

  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.setFontSize(8.5);
  ctx.pdf.setTextColor(255, 255, 255);
  let xOff = ctx.margin;
  for (let c = 0; c < headers.length; c++) {
    ctx.pdf.text(headers[c], xOff + 2, ctx.y - 0.5, { maxWidth: colWidths[c] - 4 });
    xOff += colWidths[c];
  }
  ctx.pdf.setTextColor(0, 0, 0);
  ctx.y += rowH;

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    const pbR = checkPageBreak(ctx, rowH + 2);
    ctx.y = pbR.y;
    ctx.pageNum = pbR.pageNum;

    // Alternate row color
    if (r % 2 === 0) {
      ctx.pdf.setFillColor(248, 252, 250);
    } else {
      ctx.pdf.setFillColor(255, 255, 255);
    }
    ctx.pdf.rect(ctx.margin, ctx.y - 4, ctx.contentWidth, rowH, 'F');

    // Grid lines
    ctx.pdf.setDrawColor(200, 210, 220);
    ctx.pdf.rect(ctx.margin, ctx.y - 4, ctx.contentWidth, rowH);

    ctx.pdf.setFont('times', 'normal');
    ctx.pdf.setFontSize(8.5);
    xOff = ctx.margin;
    for (let c = 0; c < rows[r].length && c < headers.length; c++) {
      const cellText = s(rows[r][c]);
      const lines = ctx.pdf.splitTextToSize(cellText, colWidths[c] - 4);
      ctx.pdf.text(lines[0] || '', xOff + 2, ctx.y - 0.5);
      xOff += colWidths[c];
    }
    ctx.y += rowH;
  }
  ctx.y += 3;
  return ctx;
}

// ── Helper: Draw wrapped paragraph text ─────────────────────────────────────
function drawParagraph(ctx: PdfContext, text: string, indent: number = 2): PdfContext {
  if (!text || text.trim() === '' || text === '-') return ctx;

  ctx.pdf.setFont('times', 'normal');
  ctx.pdf.setFontSize(9.5);
  const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth - indent * 2);

  for (const line of lines) {
    const pb = checkPageBreak(ctx, 5);
    ctx.y = pb.y;
    ctx.pageNum = pb.pageNum;
    ctx.pdf.text(line, ctx.margin + indent, ctx.y);
    ctx.y += 4.5;
  }
  return ctx;
}

// ── Helper: Draw a labeled text line ────────────────────────────────────────
function drawLabelValue(ctx: PdfContext, label: string, value: string): PdfContext {
  const pb = checkPageBreak(ctx, 8);
  ctx.y = pb.y;
  ctx.pageNum = pb.pageNum;

  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.setFontSize(9.5);
  ctx.pdf.text(label, ctx.margin + 2, ctx.y);
  ctx.pdf.setFont('times', 'normal');
  const lw = ctx.pdf.getTextWidth(label) + 2;
  const lines = ctx.pdf.splitTextToSize(value, ctx.contentWidth - lw - 4);
  ctx.pdf.text(lines, ctx.margin + 2 + lw, ctx.y);
  ctx.y += Math.max(lines.length * 4.5, 5);
  return ctx;
}

// ── Helper: Draw badge ──────────────────────────────────────────────────────
function drawBadge(ctx: PdfContext, text: string, color: 'red' | 'green' | 'yellow' | 'gray'): PdfContext {
  const tw = ctx.pdf.getTextWidth(text) + 6;
  const bh = 5;

  const colors = {
    red: { fill: [254, 226, 226], text: [153, 27, 27] },
    green: { fill: [220, 252, 231], text: [22, 101, 52] },
    yellow: { fill: [254, 249, 195], text: [113, 63, 18] },
    gray: { fill: [243, 244, 246], text: [75, 85, 99] },
  };
  const c = colors[color];

  ctx.pdf.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
  ctx.pdf.roundedRect(ctx.margin + 2, ctx.y - 3.5, tw, bh, 1.5, 1.5, 'F');
  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.setFontSize(8);
  ctx.pdf.setTextColor(c.text[0], c.text[1], c.text[2]);
  ctx.pdf.text(text, ctx.margin + 5, ctx.y);
  ctx.pdf.setTextColor(0, 0, 0);

  // Advance x position for next badge (we'll just move y for simplicity)
  ctx.y += bh + 1;
  return ctx;
}

// ── Render structured resume PDF ─────────────────────────────────────────────
function renderStructuredResume(
  ctx: PdfContext,
  resumeData: ResumeStructuredData,
  patientData: PatientData,
  documentData: DocumentData,
  facilityData: FacilityData | undefined,
): PdfContext {
  const { pdf } = ctx;

  // ══════════════════════════════════════════════════════════════════════
  // 1. HEADER SECTION
  // ══════════════════════════════════════════════════════════════════════
  const facilityName = facilityData?.name || 'FASILITAS KESEHATAN PRIMER';
  const facilityAddress = facilityData?.address || 'Jl. Kesehatan No. 1, Kota, Provinsi';
  const facilityPhone = facilityData?.phone || '(021) 123-4567';

  // Logo placeholder
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(ctx.margin, ctx.y, 22, 22, 2, 2, 'FD');
  pdf.setFont('times', 'italic');
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text('LOGO', ctx.margin + 11, ctx.y + 11, { align: 'center' });
  pdf.text('FASILITAS', ctx.margin + 11, ctx.y + 14.5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  // Facility info
  pdf.setFont('times', 'bold');
  pdf.setFontSize(14);
  pdf.text(facilityName, ctx.margin + 26, ctx.y + 6);

  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.text(facilityAddress, ctx.margin + 26, ctx.y + 11);
  pdf.text(`Telp: ${facilityPhone}`, ctx.margin + 26, ctx.y + 15.5);

  ctx.y += 26;
  drawDoubleLine(pdf, ctx.margin, ctx.pageWidth - ctx.margin, ctx.y);
  ctx.y += 5;

  // Document info row
  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`No. Dokumen: ${documentData.documentNumber || '-'}`, ctx.margin, ctx.y);
  pdf.text(`Tanggal: ${formatIndonesianDate(documentData.generatedAt)}`, ctx.margin + 65, ctx.y);
  if (documentData.version) {
    pdf.text(`Versi: ${documentData.version}`, ctx.pageWidth - ctx.margin, ctx.y, { align: 'right' });
  }
  pdf.setTextColor(0, 0, 0);
  ctx.y += 6;

  // Thin separator
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.1);
  pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  pdf.setLineWidth(0.2);
  ctx.y += 5;

  // ══════════════════════════════════════════════════════════════════════
  // 2. TITLE
  // ══════════════════════════════════════════════════════════════════════
  const title = 'RESUME MEDIS TELEPALIATIF';
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, ctx.pageWidth / 2, ctx.y, { align: 'center' });
  ctx.y += 3;

  const titleWidth = pdf.getTextWidth(title);
  pdf.setLineWidth(0.4);
  pdf.line(
    ctx.pageWidth / 2 - titleWidth / 2,
    ctx.y,
    ctx.pageWidth / 2 + titleWidth / 2,
    ctx.y,
  );
  pdf.setLineWidth(0.2);
  ctx.y += 7;

  // ══════════════════════════════════════════════════════════════════════
  // 3. DATA PASIEN
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'DATA PASIEN');
  const dp = resumeData.dataPasien;
  const kontak = dp.kontakKeluarga;
  const kontakStr = kontak
    ? `${s(kontak.nama)}${kontak.hubungan ? ` (${kontak.hubungan})` : ''}${kontak.telepon ? ` • ${kontak.telepon}` : ''}`
    : '-';
  const dpjpStr = dp.dpjp
    ? `${dp.dpjp}${dp.dpjpSpesialisasi ? ` (${dp.dpjpSpesialisasi})` : ''}${dp.dpjpSIP ? ` - SIP: ${dp.dpjpSIP}` : ''}`
    : '-';

  const patientRows: Array<[string, string]> = [
    ['Nama', s(dp.nama || patientData.patientName)],
    ['No. RM', s(dp.noRM || patientData.rmNumber)],
    ['NIK', s(dp.nik || patientData.nik)],
    ['No. BPJS', s(dp.noBPJS || patientData.bpjsNumber)],
    ['Tanggal Lahir', formatIndonesianDate(dp.tanggalLahir)],
    ['Jenis Kelamin', s(dp.jenisKelamin)],
    ['Umur', s(dp.umur)],
    ['No. Telepon', s(dp.noTelepon)],
    ['Alamat', s(dp.alamat)],
    ['Diagnosa Utama', s(dp.diagnosaUtama || patientData.primaryDiagnosis)],
    ['Diagnosa Penyerta', s(dp.diagnosaPenyerta || patientData.secondaryDiagnosis)],
    ['Stadium Penyakit', s(dp.stadiumPenyakit || patientData.diseaseStage)],
    ['DPJP', dpjpStr],
    ['Status Perawatan', s(dp.statusPerawatan || patientData.careStatus)],
    ['Status Pasien', s(dp.statusPasien)],
    ['Tingkat Risiko', s(dp.tingkatRisiko || patientData.riskLevel)],
    ['Tanggal Registrasi', dp.tanggalRegistrasi ? formatIndonesianDate(dp.tanggalRegistrasi) : '-'],
    ['Kontak Keluarga', kontakStr],
  ];
  ctx = drawKeyValueTable(ctx, patientRows);

  // ══════════════════════════════════════════════════════════════════════
  // 4. TTV SERIAL
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'TTV SERIAL');

  const ttvFields: Array<[string, string]> = [
    ['TD (mmHg)', 'sistolik'],
    ['Nadi (/menit)', 'nadi'],
    ['RR (/menit)', 'rr'],
    ['Suhu (°C)', 'suhu'],
    ['SpO2 (%)', 'spo2'],
    ['BB (kg)', 'berat'],
    ['BMI', 'bmi'],
  ];

  const ttvSections: Array<[string, Record<string, unknown> | null]> = [
    ['TTV Awal', resumeData.ttvSerial.ttvAwal],
    ['TTV Kritis', resumeData.ttvSerial.ttvKritis],
    ['TTV Terakhir', resumeData.ttvSerial.ttvTerakhir],
  ];

  for (const [sectionTitle, ttvData] of ttvSections) {
    ctx = drawSubHeader(ctx, sectionTitle);

    if (!ttvData) {
      ctx = drawParagraph(ctx, 'Data tidak tersedia');
      continue;
    }

    const tanggal = s(ttvData.tanggal);
    const ttvHeaders = ['Parameter', 'Nilai'];
    const ttvRows: string[][] = [];
    for (const [label, key] of ttvFields) {
      const rawVal = ttvData[key];
      let valStr = '-';
      if (key === 'sistolik' && ttvData.diastolik != null) {
        valStr = rawVal != null ? `${rawVal}/${ttvData.diastolik}` : '-';
      } else if (rawVal != null) {
        valStr = String(rawVal);
      }
      ttvRows.push([label, valStr]);
    }

    const cw = [ctx.contentWidth * 0.4, ctx.contentWidth * 0.6];
    ctx = drawGridTable(ctx, ttvHeaders, ttvRows, cw);

    // Show date
    if (tanggal && tanggal !== '-') {
      ctx.pdf.setFont('times', 'italic');
      ctx.pdf.setFontSize(8);
      ctx.pdf.setTextColor(100, 100, 100);
      ctx.pdf.text(`Tanggal: ${formatIndonesianDate(tanggal)}`, ctx.margin + 2, ctx.y);
      ctx.pdf.setTextColor(0, 0, 0);
      ctx.y += 4;
    }

    // Show alasan kritis for Kritis section
    if (sectionTitle === 'TTV Kritis') {
      const alasanKritis = (ttvData as Record<string, unknown> & { alasanKritis?: string[] }).alasanKritis;
      if (alasanKritis && Array.isArray(alasanKritis) && alasanKritis.length > 0) {
        ctx = drawSubHeader(ctx, 'Alasan Kritis:');
        for (const alasan of alasanKritis) {
          ctx = drawBadge(ctx, String(alasan), 'red');
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. KELUHAN HARIAN
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'KELUHAN HARIAN');

  const keluhanSections: Array<[string, Record<string, unknown> | null]> = [
    ['Keluhan Awal', resumeData.keluhanHarian.keluhanAwal],
    ['Keluhan Terberat', resumeData.keluhanHarian.keluhanTerberat],
    ['Keluhan Terakhir', resumeData.keluhanHarian.keluhanTerakhir],
  ];

  for (const [sectionTitle, keluhan] of keluhanSections) {
    ctx = drawSubHeader(ctx, sectionTitle);

    if (!keluhan) {
      ctx = drawParagraph(ctx, 'Data tidak tersedia');
      continue;
    }

    // Extract key keluhan fields
    const keluhanRows: Array<[string, string]> = [];

    // Map common keluhan fields
    const fieldMap: Array<[string, string]> = [
      ['Tanggal', 'tanggal'],
      ['Kondisi Umum', 'kondisiUmum'],
      ['Nyeri', 'nyeri'],
      ['Skala Nyeri', 'skalaNyeri'],
      ['Lokasi Nyeri', 'lokasiNyeri'],
      ['Dyspnea', 'dyspnea'],
      ['Gangguan Tidur', 'gangguanTidur'],
      ['Gangguan Makan', 'gangguanMakan'],
      ['Masalah Obat', 'masalahObat'],
      ['Keluhan Lain', 'keluhanLain'],
      ['Kondisi Kaki', 'kondisiKaki'],
      ['Kondisi Warna Kulit', 'kondisiWarnaKulit'],
      ['Tingkat Keparahan', 'severityLevel'],
      ['Catatan', 'catatan'],
    ];

    for (const [label, key] of fieldMap) {
      if (keluhan[key] !== undefined && keluhan[key] !== null && keluhan[key] !== '') {
        keluhanRows.push([label, String(keluhan[key])]);
      }
    }

    // Also show any extra fields not in the map
    const knownKeys = new Set(fieldMap.map(([, k]) => k));
    for (const [key, val] of Object.entries(keluhan)) {
      if (!knownKeys.has(key) && val !== null && val !== undefined && val !== '') {
        keluhanRows.push([key, String(val)]);
      }
    }

    if (keluhanRows.length === 0) {
      ctx = drawParagraph(ctx, 'Tidak ada data keluhan');
    } else {
      ctx = drawKeyValueTable(ctx, keluhanRows);
    }
  }

  // Analisis frekuensi gejala
  if (resumeData.keluhanHarian.analisis && resumeData.keluhanHarian.analisis.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Analisis Frekuensi Gejala');
    ctx = drawParagraph(ctx, resumeData.keluhanHarian.analisis);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. SKRINING PALIATIF
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'SKRINING PALIATIF');

  const screeningData = resumeData.skriningPaliatif;
  if (!screeningData || Object.keys(screeningData).length === 0) {
    ctx = drawParagraph(ctx, 'Tidak ada data skrining paliatif');
  } else {
    for (const [screeningType, records] of Object.entries(screeningData)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      // Format screening type label
      let typeLabel = screeningType;
      if (screeningType === 'fisik') typeLabel = 'Domain Fisik';
      else if (screeningType === 'psikologis') typeLabel = 'Domain Psikologis';
      else if (screeningType === 'sosial') typeLabel = 'Domain Sosial';
      else if (screeningType === 'spiritual') typeLabel = 'Domain Spiritual';
      else if (screeningType === 'edukasi') typeLabel = 'Kebutuhan Edukasi';
      else if (screeningType === 'caregiver') typeLabel = 'Beban Caregiver';

      ctx = drawSubHeader(ctx, typeLabel);

      const sHeaders = ['Tanggal', 'Skor', 'Interpretasi', 'EWS'];
      const sRows: string[][] = [];
      for (const rec of records) {
        if (typeof rec !== 'object' || rec === null) continue;
        const r = rec as Record<string, unknown>;
        sRows.push([
          formatIndonesianDate(r.tanggal as string || r.createdAt as string || r.date as string),
          s(r.skor || r.score || r.totalScore),
          s(r.interpretasi || r.interpretation),
          s(r.ews || r.ewsLevel || r.riskLevel),
        ]);
      }
      if (sRows.length > 0) {
        const sw = [ctx.contentWidth * 0.25, ctx.contentWidth * 0.15, ctx.contentWidth * 0.35, ctx.contentWidth * 0.25];
        ctx = drawGridTable(ctx, sHeaders, sRows, sw);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7. ESAS
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'EDMONTON SYMPTOM ASSESSMENT SYSTEM (ESAS)');

  const esasSymptoms: Array<[string, string[]]> = [
    ['Nyeri (Pain)', ['nyeri', 'pain', 'Pain', 'Nyeri']],
    ['Lelah (Tiredness)', ['lelah', 'fatigue', 'Tiredness', 'Lelah', 'tiredness']],
    ['Mengantuk (Drowsiness)', ['mengantuk', 'drowsiness', 'Drowsiness', 'Mengantuk']],
    ['Mual (Nausea)', ['mual', 'nausea', 'Nausea', 'Mual']],
    ['Nafsu Makan (Appetite)', ['nafsuMakan', 'appetite', 'Appetite', 'Nafsu Makan']],
    ['Depresi (Depression)', ['depresi', 'depression', 'Depression', 'Depresi']],
    ['Kecemasan (Anxiety)', ['kecemasan', 'anxiety', 'Anxiety', 'Kecemasan']],
    ['Kesejahteraan (Well-being)', ['kesejahteraan', 'wellbeing', 'wellBeing', 'Well-being', 'Wellbeing']],
    ['Sesak (Shortness of Breath)', ['sesak', 'dyspnea', 'shortnessOfBreath', 'Shortness of Breath', 'Sesak']],
  ];

  const skorAwal = resumeData.esasScores.skorAwal;
  const skorTertinggi = resumeData.esasScores.skorTertinggi;
  const skorTerakhir = resumeData.esasScores.skorTerakhir;

  const esasHeaders = ['Gejala', 'Skor Awal', 'Skor Tertinggi', 'Skor Terakhir'];
  const esasRows: string[][] = [];
  let totalAwal = 0;
  let totalTertinggi = 0;
  let totalTerakhir = 0;

  function getEsasValue(scoreObj: Record<string, unknown> | null, keys: string[]): string {
    if (!scoreObj) return '-';
    for (const k of keys) {
      if (scoreObj[k] !== undefined && scoreObj[k] !== null) {
        const v = Number(scoreObj[k]);
        if (!isNaN(v)) return String(v);
        return String(scoreObj[k]);
      }
    }
    return '-';
  }

  function getEsasNum(scoreObj: Record<string, unknown> | null, keys: string[]): number {
    if (!scoreObj) return 0;
    for (const k of keys) {
      if (scoreObj[k] !== undefined && scoreObj[k] !== null) {
        const v = Number(scoreObj[k]);
        if (!isNaN(v)) return v;
      }
    }
    return 0;
  }

  for (const [symptomName, keys] of esasSymptoms) {
    const vAwal = getEsasValue(skorAwal, keys);
    const vTertinggi = getEsasValue(skorTertinggi, keys);
    const vTerakhir = getEsasValue(skorTerakhir, keys);

    esasRows.push([symptomName, vAwal, vTertinggi, vTerakhir]);

    totalAwal += getEsasNum(skorAwal, keys);
    totalTertinggi += getEsasNum(skorTertinggi, keys);
    totalTerakhir += getEsasNum(skorTerakhir, keys);
  }

  // Total row
  esasRows.push(['TOTAL', String(totalAwal), String(totalTertinggi), String(totalTerakhir)]);

  const esasCW = [ctx.contentWidth * 0.4, ctx.contentWidth * 0.2, ctx.contentWidth * 0.2, ctx.contentWidth * 0.2];
  ctx = drawGridTable(ctx, esasHeaders, esasRows, esasCW);

  // ══════════════════════════════════════════════════════════════════════
  // 8. TERAPI OBAT
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'TERAPI OBAT');

  const obatHeaders = ['Obat', 'Dosis', 'Frekuensi', 'Rute', 'Indikasi', 'Status'];
  const obatCW = [
    ctx.contentWidth * 0.2,
    ctx.contentWidth * 0.15,
    ctx.contentWidth * 0.15,
    ctx.contentWidth * 0.1,
    ctx.contentWidth * 0.25,
    ctx.contentWidth * 0.15,
  ];

  // Analgesik
  if (resumeData.obat.analgesik && Array.isArray(resumeData.obat.analgesik) && resumeData.obat.analgesik.length > 0) {
    ctx = drawSubHeader(ctx, 'Analgesik');
    const aRows: string[][] = [];
    for (const med of resumeData.obat.analgesik) {
      if (typeof med !== 'object' || med === null) continue;
      const m = med as Record<string, unknown>;
      aRows.push([
        s(m.namaObat || m.nama || m.name),
        s(m.dosis || m.dosage),
        s(m.frekuensi || m.frequency),
        s(m.rute || m.route),
        s(m.indikasi || m.indication),
        s(m.status),
      ]);
    }
    ctx = drawGridTable(ctx, obatHeaders, aRows, obatCW);
  }

  // Simtomatik categories
  if (resumeData.obat.simtomatik && typeof resumeData.obat.simtomatik === 'object') {
    const categoryLabels: Record<string, string> = {
      antiemetik: 'Antiemetik',
      laksatif: 'Laksatif',
      antidepresan: 'Antidepresan',
      ansiolitik: 'Ansiolitik',
      antikonvulsan: 'Antikonvulsan',
      kortikosteroid: 'Kortikosteroid',
      lainnya: 'Simtomatik Lainnya',
    };

    for (const [catKey, meds] of Object.entries(resumeData.obat.simtomatik)) {
      if (!Array.isArray(meds) || meds.length === 0) continue;
      const catLabel = categoryLabels[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1);
      ctx = drawSubHeader(ctx, catLabel);
      const sRows: string[][] = [];
      for (const med of meds) {
        if (typeof med !== 'object' || med === null) continue;
        const m = med as Record<string, unknown>;
        sRows.push([
          s(m.namaObat || m.nama || m.name),
          s(m.dosis || m.dosage),
          s(m.frekuensi || m.frequency),
          s(m.rute || m.route),
          s(m.indikasi || m.indication),
          s(m.status),
        ]);
      }
      ctx = drawGridTable(ctx, obatHeaders, sRows, obatCW);
    }
  }

  // Obat Lainnya
  if (resumeData.obat.obatLainnya && Array.isArray(resumeData.obat.obatLainnya) && resumeData.obat.obatLainnya.length > 0) {
    ctx = drawSubHeader(ctx, 'Obat Lainnya');
    const oRows: string[][] = [];
    for (const med of resumeData.obat.obatLainnya) {
      if (typeof med !== 'object' || med === null) continue;
      const m = med as Record<string, unknown>;
      oRows.push([
        s(m.namaObat || m.nama || m.name),
        s(m.dosis || m.dosage),
        s(m.frekuensi || m.frequency),
        s(m.rute || m.route),
        s(m.indikasi || m.indication),
        s(m.status),
      ]);
    }
    ctx = drawGridTable(ctx, obatHeaders, oRows, obatCW);
  }

  // Kepatuhan, Perubahan Regimen, Respons Terapi
  if (resumeData.obat.kepatuhan || resumeData.obat.perubahanRegimen || resumeData.obat.responsTerapi) {
    ctx.y += 2;
    if (resumeData.obat.kepatuhan) {
      ctx = drawLabelValue(ctx, 'Kepatuhan: ', s(resumeData.obat.kepatuhan));
    }
    if (resumeData.obat.perubahanRegimen) {
      ctx = drawLabelValue(ctx, 'Perubahan Regimen: ', s(resumeData.obat.perubahanRegimen));
    }
    if (resumeData.obat.responsTerapi) {
      ctx = drawLabelValue(ctx, 'Respons Terapi: ', s(resumeData.obat.responsTerapi));
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 9. NUTRISI
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'NUTRISI');
  if (resumeData.nutrisi.ringkasan && resumeData.nutrisi.ringkasan.trim() !== '') {
    ctx = drawParagraph(ctx, resumeData.nutrisi.ringkasan);
  } else {
    ctx = drawParagraph(ctx, 'Tidak ada ringkasan nutrisi tersedia');
  }

  // Show nutrition records if available
  if (resumeData.nutrisi.catatan && Array.isArray(resumeData.nutrisi.catatan) && resumeData.nutrisi.catatan.length > 0) {
    ctx = drawSubHeader(ctx, 'Catatan Nutrisi');
    for (const rec of resumeData.nutrisi.catatan) {
      if (typeof rec !== 'object' || rec === null) continue;
      const r = rec as Record<string, unknown>;
      const date = formatIndonesianDate(r.tanggal as string || r.createdAt as string || r.date as string);
      ctx.pdf.setFont('times', 'bold');
      ctx.pdf.setFontSize(9);
      ctx.pdf.text(`[${date}]`, ctx.margin + 2, ctx.y);
      ctx.y += 4;

      // Show key-value pairs
      const nutRows: Array<[string, string]> = [];
      for (const [key, val] of Object.entries(r)) {
        if (key === 'tanggal' || key === 'createdAt' || key === 'date' || key === 'id') continue;
        if (val !== null && val !== undefined && val !== '') {
          nutRows.push([key, String(val)]);
        }
      }
      if (nutRows.length > 0) {
        ctx = drawKeyValueTable(ctx, nutRows);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 10. SOSIAL
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'SOSIAL');
  if (resumeData.sosial.ringkasan && resumeData.sosial.ringkasan.trim() !== '') {
    ctx = drawParagraph(ctx, resumeData.sosial.ringkasan);
  } else {
    ctx = drawParagraph(ctx, 'Tidak ada ringkasan sosial tersedia');
  }

  // Show social records if available
  const socialSections: Array<[string, unknown[] | undefined]> = [
    ['Penilaian Sosial', resumeData.sosial.penilaianSosial],
    ['Caregiver', resumeData.sosial.caregiver],
    ['Pertemuan Keluarga', resumeData.sosial.pertemuanKeluarga],
    ['Dukungan Keuangan', resumeData.sosial.dukunganKeuangan],
  ];

  for (const [sectionName, records] of socialSections) {
    if (!records || !Array.isArray(records) || records.length === 0) continue;
    ctx = drawSubHeader(ctx, sectionName);
    for (const rec of records) {
      if (typeof rec !== 'object' || rec === null) continue;
      const r = rec as Record<string, unknown>;
      const socRows: Array<[string, string]> = [];
      for (const [key, val] of Object.entries(r)) {
        if (key === 'id') continue;
        if (val !== null && val !== undefined && val !== '') {
          socRows.push([key, String(val)]);
        }
      }
      if (socRows.length > 0) {
        ctx = drawKeyValueTable(ctx, socRows);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 11. ADVANCE CARE PLANNING
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'ADVANCE CARE PLANNING');

  if (resumeData.acp.ringkasan && resumeData.acp.ringkasan.trim() !== '') {
    ctx = drawParagraph(ctx, resumeData.acp.ringkasan);
  } else {
    ctx = drawParagraph(ctx, 'Tidak ada ringkasan ACP tersedia');
  }

  if (resumeData.acp.dokumen && Array.isArray(resumeData.acp.dokumen) && resumeData.acp.dokumen.length > 0) {
    ctx = drawSubHeader(ctx, 'Dokumen ACP');
    for (const doc of resumeData.acp.dokumen) {
      if (typeof doc !== 'object' || doc === null) continue;
      const d = doc as Record<string, unknown>;
      const acpRows: Array<[string, string]> = [];
      for (const [key, val] of Object.entries(d)) {
        if (key === 'id') continue;
        if (val !== null && val !== undefined && val !== '') {
          acpRows.push([key, String(val)]);
        }
      }
      if (acpRows.length > 0) {
        ctx = drawKeyValueTable(ctx, acpRows);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 12. ANALISIS
  // ══════════════════════════════════════════════════════════════════════
  ctx = drawSectionHeader(ctx, 'ANALISIS AI');

  const ai = resumeData.aiAnalysis;

  // Ringkasan Perjalanan Klinis
  if (ai.ringkasanPerjalananKlinis && ai.ringkasanPerjalananKlinis.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Ringkasan Perjalanan Klinis');
    ctx = drawParagraph(ctx, ai.ringkasanPerjalananKlinis);
  }

  // Identifikasi Kondisi Kritis
  if (ai.identifikasiKondisiKritis && ai.identifikasiKondisiKritis.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Identifikasi Kondisi Kritis');
    ctx = drawParagraph(ctx, ai.identifikasiKondisiKritis);
  }

  // Analisis Tren Pasien
  if (ai.analisisTrenPasien && ai.analisisTrenPasien.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Analisis Tren Pasien');
    ctx = drawParagraph(ctx, ai.analisisTrenPasien);
  }

  // Ringkasan Skrining
  if (ai.ringkasanSkrining) {
    const rs = ai.ringkasanSkrining;
    const hasContent = [rs.domainFisik, rs.domainPsikologis, rs.domainSosial, rs.domainSpiritual, rs.kebutuhanEdukasi, rs.bebanCaregiver]
      .some(v => v && v.trim() !== '');

    if (hasContent) {
      ctx = drawSubHeader(ctx, 'Ringkasan Skrining');
      const skrRows: Array<[string, string]> = [
        ['Domain Fisik', s(rs.domainFisik)],
        ['Domain Psikologis', s(rs.domainPsikologis)],
        ['Domain Sosial', s(rs.domainSosial)],
        ['Domain Spiritual', s(rs.domainSpiritual)],
        ['Kebutuhan Edukasi', s(rs.kebutuhanEdukasi)],
        ['Beban Caregiver', s(rs.bebanCaregiver)],
      ];
      ctx = drawKeyValueTable(ctx, skrRows);
    }
  }

  // Ringkasan Nutrisi
  if (ai.ringkasanNutrisi && ai.ringkasanNutrisi.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Ringkasan Nutrisi');
    ctx = drawParagraph(ctx, ai.ringkasanNutrisi);
  }

  // Ringkasan Sosial
  if (ai.ringkasanSosial && ai.ringkasanSosial.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Ringkasan Sosial');
    ctx = drawParagraph(ctx, ai.ringkasanSosial);
  }

  // Ringkasan ACP
  if (ai.ringkasanACP && ai.ringkasanACP.trim() !== '') {
    ctx = drawSubHeader(ctx, 'Ringkasan ACP');
    ctx = drawParagraph(ctx, ai.ringkasanACP);
  }

  // Kesimpulan Telepaliatif
  if (ai.kesimpulanTelepaliatif && Object.keys(ai.kesimpulanTelepaliatif).length > 0) {
    ctx = drawSubHeader(ctx, 'Kesimpulan Telepaliatif');
    const kesRows: Array<[string, string]> = [];

    const fieldLabels: Record<string, string> = {
      diagnosisUtama: 'Diagnosis Utama',
      statusFungsionalAwal: 'Status Fungsional Awal',
      statusFungsionalTerakhir: 'Status Fungsional Terakhir',
      masalahPaliatifUtama: 'Masalah Paliatif Utama',
      keluhanDominan: 'Keluhan Dominan',
      kondisiPalingKritis: 'Kondisi Paling Kritis',
      responsTerhadapIntervensi: 'Respons Terhadap Intervensi',
      kondisiKlinisSaatIni: 'Kondisi Klinis Saat Ini',
      tujuanPerawatanSaatIni: 'Tujuan Perawatan Saat Ini',
      rencanaTindakLanjut: 'Rencana Tindak Lanjut',
      lokasiPerawatanSaatIni: 'Lokasi Perawatan Saat Ini',
      jadwalMonitoringBerikutnya: 'Jadwal Monitoring Berikutnya',
    };

    for (const [key, label] of Object.entries(fieldLabels)) {
      if (ai.kesimpulanTelepaliatif[key] !== undefined) {
        kesRows.push([label, s(ai.kesimpulanTelepaliatif[key])]);
      }
    }

    // Add any extra fields not in our label map
    const knownKeys = new Set(Object.keys(fieldLabels));
    for (const [key, val] of Object.entries(ai.kesimpulanTelepaliatif)) {
      if (!knownKeys.has(key)) {
        kesRows.push([key, s(val)]);
      }
    }

    ctx = drawKeyValueTable(ctx, kesRows);
  }

  // Rekomendasi
  if (ai.rekomendasi && Array.isArray(ai.rekomendasi) && ai.rekomendasi.length > 0) {
    ctx = drawSubHeader(ctx, 'Rekomendasi');
    for (let i = 0; i < ai.rekomendasi.length; i++) {
      const pb = checkPageBreak(ctx, 8);
      ctx.y = pb.y;
      ctx.pageNum = pb.pageNum;

      ctx.pdf.setFont('times', 'bold');
      ctx.pdf.setFontSize(9.5);
      ctx.pdf.text(`${i + 1}.`, ctx.margin + 2, ctx.y);
      ctx.pdf.setFont('times', 'normal');
      const lines = ctx.pdf.splitTextToSize(ai.rekomendasi[i], ctx.contentWidth - 10);
      ctx.pdf.text(lines, ctx.margin + 8, ctx.y);
      ctx.y += Math.max(lines.length * 4.5, 5);
    }
  }

  return ctx;
}

// ── Render legacy markdown content ───────────────────────────────────────────
function renderMarkdownContent(
  ctx: PdfContext,
  fullContent: string,
  patientData: PatientData,
  documentData: DocumentData,
  facilityData: FacilityData | undefined,
): PdfContext {
  const { pdf } = ctx;

  // ══════════════════════════════════════════════════════════════════════
  // HEADER SECTION
  // ══════════════════════════════════════════════════════════════════════
  const facilityName = facilityData?.name || 'FASILITAS KESEHATAN PRIMER';
  const facilityAddress = facilityData?.address || 'Jl. Kesehatan No. 1, Kota, Provinsi';
  const facilityPhone = facilityData?.phone || '(021) 123-4567';
  const facilityEmail = facilityData?.email || 'info@fkprimer.go.id';

  // Logo placeholder
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(ctx.margin, ctx.y, 22, 22, 2, 2, 'FD');
  pdf.setFont('times', 'italic');
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text('LOGO', ctx.margin + 11, ctx.y + 11, { align: 'center' });
  pdf.text('FASILITAS', ctx.margin + 11, ctx.y + 14.5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  pdf.setFont('times', 'bold');
  pdf.setFontSize(14);
  pdf.text(facilityName, ctx.margin + 26, ctx.y + 6);

  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.text(facilityAddress, ctx.margin + 26, ctx.y + 11);

  const contactLine = `Telp: ${facilityPhone}${facilityEmail ? ' | Email: ' + facilityEmail : ''}`;
  pdf.text(contactLine, ctx.margin + 26, ctx.y + 15.5);

  ctx.y += 26;
  drawDoubleLine(pdf, ctx.margin, ctx.pageWidth - ctx.margin, ctx.y);
  ctx.y += 5;

  // Document info row
  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`No. Dokumen: ${documentData.documentNumber || '-'}`, ctx.margin, ctx.y);
  pdf.text(`Tanggal: ${formatIndonesianDate(documentData.generatedAt)}`, ctx.margin + 65, ctx.y);
  if (documentData.version) {
    pdf.text(`Versi: ${documentData.version}`, ctx.pageWidth - ctx.margin, ctx.y, { align: 'right' });
  }
  pdf.setTextColor(0, 0, 0);
  ctx.y += 6;

  // Thin separator
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.1);
  pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  pdf.setLineWidth(0.2);
  ctx.y += 5;

  // Title
  const title = 'RESUME MEDIS TELEPALIATIF';
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, ctx.pageWidth / 2, ctx.y, { align: 'center' });
  ctx.y += 3;

  const titleWidth = pdf.getTextWidth(title);
  pdf.setLineWidth(0.4);
  pdf.line(
    ctx.pageWidth / 2 - titleWidth / 2,
    ctx.y,
    ctx.pageWidth / 2 + titleWidth / 2,
    ctx.y,
  );
  pdf.setLineWidth(0.2);
  ctx.y += 7;

  // Compact patient info line
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  pdf.text('Pasien:', ctx.margin, ctx.y);
  pdf.setFont('times', 'normal');
  const patientLine = `${patientData.patientName || '-'}  |  RM: ${patientData.rmNumber || '-'}  |  NIK: ${patientData.nik || '-'}  |  BPJS: ${patientData.bpjsNumber || '-'}`;
  const patientLines = pdf.splitTextToSize(patientLine, ctx.contentWidth - 18);
  pdf.text(patientLines, ctx.margin + 18, ctx.y);
  ctx.y += patientLines.length * 5;

  pdf.setFont('times', 'bold');
  pdf.text('Diagnosa:', ctx.margin, ctx.y);
  pdf.setFont('times', 'normal');
  const diagLine = `${patientData.primaryDiagnosis || '-'}${patientData.secondaryDiagnosis ? ' / ' + patientData.secondaryDiagnosis : ''}${patientData.diseaseStage ? ' - Stadium ' + patientData.diseaseStage : ''}`;
  const diagWrapped = pdf.splitTextToSize(diagLine, ctx.contentWidth - 24);
  pdf.text(diagWrapped, ctx.margin + 24, ctx.y);
  ctx.y += diagWrapped.length * 5;

  const riskText =
    patientData.riskLevel === 'merah' ? 'Merah (Kritis)' :
    patientData.riskLevel === 'kuning' ? 'Kuning (Moderat)' :
    patientData.riskLevel === 'hijau' ? 'Hijau (Stabil)' :
    patientData.riskLevel || '-';
  pdf.setFont('times', 'bold');
  pdf.text('Risiko:', ctx.margin, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(riskText, ctx.margin + 18, ctx.y);
  ctx.y += 4;

  // Separator
  ctx.y += 2;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.1);
  pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  pdf.setLineWidth(0.2);
  ctx.y += 5;

  // ══════════════════════════════════════════════════════════════════════
  // MARKDOWN CONTENT
  // ══════════════════════════════════════════════════════════════════════
  const rawLines = fullContent.split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    const isMarkdownHeader = line.trimStart().startsWith('##');
    const isEqualHeader = line.trim().startsWith('===') && line.trim().endsWith('===');
    const isSectionHeader = isMarkdownHeader || isEqualHeader;

    if (isSectionHeader) {
      let headerText = line.trim();
      if (isMarkdownHeader) {
        headerText = headerText.replace(/^##\s*/, '');
      }
      if (isEqualHeader) {
        headerText = headerText.replace(/^===\s*/, '').replace(/\s*===$/, '');
      }

      const pb = checkPageBreak(ctx, 20);
      ctx.y = pb.y;
      ctx.pageNum = pb.pageNum;

      // Draw section header bar
      ctx.pdf.setFillColor(230, 237, 244);
      ctx.pdf.rect(ctx.margin, ctx.y - 4, ctx.contentWidth, 7, 'F');
      ctx.pdf.setFillColor(45, 140, 122);
      ctx.pdf.rect(ctx.margin, ctx.y - 4, 2, 7, 'F');

      ctx.pdf.setFont('times', 'bold');
      ctx.pdf.setFontSize(12);
      ctx.pdf.setTextColor(20, 60, 80);
      const headerLines = ctx.pdf.splitTextToSize(headerText, ctx.contentWidth - 4);
      ctx.pdf.text(headerLines, ctx.margin + 5, ctx.y);
      ctx.y += headerLines.length * 5 + 3;
      ctx.pdf.setTextColor(0, 0, 0);
    } else if (line.trim() === '') {
      ctx.y += 3;
    } else {
      const isBoldLine = line.trimStart().startsWith('**') && line.trimEnd().endsWith('**');
      const cleanLine = isBoldLine
        ? line.trim().replace(/^\*\*/, '').replace(/\*\*$/, '')
        : line;

      ctx.pdf.setFont('times', isBoldLine ? 'bold' : 'normal');
      ctx.pdf.setFontSize(10);

      const wrappedLines = ctx.pdf.splitTextToSize(cleanLine, ctx.contentWidth);

      for (const wrappedLine of wrappedLines) {
        const pb = checkPageBreak(ctx, 8);
        ctx.y = pb.y;
        ctx.pageNum = pb.pageNum;

        ctx.pdf.text(wrappedLine, ctx.margin, ctx.y);
        ctx.y += 5;
      }
    }
  }

  return ctx;
}

// ── Render referral letter ───────────────────────────────────────────────────
function renderReferralLetter(
  ctx: PdfContext,
  patientData: PatientData,
  documentData: DocumentData,
  facilityData: FacilityData | undefined,
): PdfContext {
  const { pdf } = ctx;

  // ══════════════════════════════════════════════════════════════════════
  // HEADER SECTION
  // ══════════════════════════════════════════════════════════════════════
  const facilityName = facilityData?.name || 'FASILITAS KESEHATAN PRIMER';
  const facilityAddress = facilityData?.address || 'Jl. Kesehatan No. 1, Kota, Provinsi';
  const facilityPhone = facilityData?.phone || '(021) 123-4567';
  const facilityEmail = facilityData?.email || 'info@fkprimer.go.id';

  // Logo placeholder
  pdf.setDrawColor(150, 150, 150);
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(ctx.margin, ctx.y, 22, 22, 2, 2, 'FD');
  pdf.setFont('times', 'italic');
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text('LOGO', ctx.margin + 11, ctx.y + 11, { align: 'center' });
  pdf.text('FASILITAS', ctx.margin + 11, ctx.y + 14.5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  pdf.setFont('times', 'bold');
  pdf.setFontSize(14);
  pdf.text(facilityName, ctx.margin + 26, ctx.y + 6);

  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.text(facilityAddress, ctx.margin + 26, ctx.y + 11);

  const contactLine = `Telp: ${facilityPhone}${facilityEmail ? ' | Email: ' + facilityEmail : ''}`;
  pdf.text(contactLine, ctx.margin + 26, ctx.y + 15.5);

  ctx.y += 26;
  drawDoubleLine(pdf, ctx.margin, ctx.pageWidth - ctx.margin, ctx.y);
  ctx.y += 5;

  // Document info row
  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`No. Dokumen: ${documentData.documentNumber || '-'}`, ctx.margin, ctx.y);
  pdf.text(`Tanggal: ${formatIndonesianDate(documentData.generatedAt)}`, ctx.margin + 65, ctx.y);
  if (documentData.version) {
    pdf.text(`Versi: ${documentData.version}`, ctx.pageWidth - ctx.margin, ctx.y, { align: 'right' });
  }
  pdf.setTextColor(0, 0, 0);
  ctx.y += 6;

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.1);
  pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  pdf.setLineWidth(0.2);
  ctx.y += 5;

  // Title
  const title = 'SURAT RUJUKAN RUMAH SAKIT';
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, ctx.pageWidth / 2, ctx.y, { align: 'center' });
  ctx.y += 3;

  const titleWidth = pdf.getTextWidth(title);
  pdf.setLineWidth(0.4);
  pdf.line(
    ctx.pageWidth / 2 - titleWidth / 2,
    ctx.y,
    ctx.pageWidth / 2 + titleWidth / 2,
    ctx.y,
  );
  pdf.setLineWidth(0.2);
  ctx.y += 7;

  // Patient identity box
  const boxStartY = ctx.y;
  const boxHeight = 52;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(ctx.margin, ctx.y, ctx.contentWidth, boxHeight);

  // Box title bar
  pdf.setFillColor(245, 245, 245);
  pdf.rect(ctx.margin, ctx.y, ctx.contentWidth, 7, 'F');
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(ctx.margin, ctx.y, ctx.contentWidth, 7);

  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  pdf.text('IDENTITAS PASIEN', ctx.margin + 3, ctx.y + 5);
  ctx.y += 10;

  pdf.setFont('times', 'normal');
  pdf.setFontSize(10);

  const labelX1 = ctx.margin + 3;
  const valueX1 = ctx.margin + 35;
  const labelX2 = ctx.margin + ctx.contentWidth / 2 + 3;
  const valueX2 = ctx.margin + ctx.contentWidth / 2 + 30;

  // Row 1
  pdf.setFont('times', 'bold');
  pdf.text('Nama', labelX1, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.patientName || '-'}`, valueX1, ctx.y);
  pdf.setFont('times', 'bold');
  pdf.text('No. RM', labelX2, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.rmNumber || '-'}`, valueX2, ctx.y);
  ctx.y += 6;

  // Row 2
  pdf.setFont('times', 'bold');
  pdf.text('NIK', labelX1, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.nik || '-'}`, valueX1, ctx.y);
  pdf.setFont('times', 'bold');
  pdf.text('No. BPJS', labelX2, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.bpjsNumber || '-'}`, valueX2, ctx.y);
  ctx.y += 6;

  // Row 3
  pdf.setFont('times', 'bold');
  pdf.text('Diagnosa Utama', labelX1, ctx.y);
  pdf.setFont('times', 'normal');
  const diagText = patientData.primaryDiagnosis || '-';
  const diagLines = pdf.splitTextToSize(`: ${diagText}`, ctx.contentWidth / 2 - 33);
  pdf.text(diagLines[0], valueX1, ctx.y);
  if (diagLines.length > 1) {
    pdf.text(diagLines.slice(1).join('\n'), valueX1, ctx.y + 5);
  }

  pdf.setFont('times', 'bold');
  pdf.text('Stadium', labelX2, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.diseaseStage || '-'}`, valueX2, ctx.y);
  ctx.y += 6;

  // Row 4
  pdf.setFont('times', 'bold');
  pdf.text('Diagnosa Penyerta', labelX1, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.secondaryDiagnosis || '-'}`, valueX1, ctx.y);

  pdf.setFont('times', 'bold');
  pdf.text('Status', labelX2, ctx.y);
  pdf.setFont('times', 'normal');
  pdf.text(`: ${patientData.careStatus || '-'}`, valueX2, ctx.y);
  ctx.y += 6;

  // Row 5
  if (documentData.targetDepartment) {
    pdf.setFont('times', 'bold');
    pdf.text('Dept. Tujuan', labelX1, ctx.y);
    pdf.setFont('times', 'normal');
    pdf.text(`: ${documentData.targetDepartment}`, valueX1, ctx.y);
  }

  pdf.setFont('times', 'bold');
  pdf.text('Tingkat Risiko', labelX2, ctx.y);
  pdf.setFont('times', 'normal');
  const riskLabel =
    patientData.riskLevel === 'merah' ? 'Merah (Kritis)' :
    patientData.riskLevel === 'kuning' ? 'Kuning (Moderat)' :
    patientData.riskLevel === 'hijau' ? 'Hijau (Stabil)' :
    patientData.riskLevel || '-';
  pdf.text(`: ${riskLabel}`, valueX2, ctx.y);

  ctx.y = boxStartY + boxHeight + 5;

  // Referral status indicator
  if (documentData.referralStatus) {
    const statusMap: Record<string, string> = {
      draft: 'DRAFT',
      dikirim: 'DIKIRIM',
      diterima: 'DITERIMA',
      selesai: 'SELESAI',
      ditolak: 'DITOLAK',
    };
    const statusLabel = statusMap[documentData.referralStatus] || documentData.referralStatus.toUpperCase();
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`Status Rujukan: ${statusLabel}`, ctx.pageWidth - ctx.margin, ctx.y, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
    ctx.y += 4;
  }

  // Separator
  ctx.y += 2;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.1);
  pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  pdf.setLineWidth(0.2);
  ctx.y += 5;

  // Content
  const fullContent = documentData.fullContent;
  const rawLines = fullContent.split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const isBoldLine = line.trimStart().startsWith('**') && line.trimEnd().endsWith('**');
    const cleanLine = isBoldLine
      ? line.trim().replace(/^\*\*/, '').replace(/\*\*$/, '')
      : line;

    if (line.trim() === '') {
      ctx.y += 3;
      continue;
    }

    pdf.setFont('times', isBoldLine ? 'bold' : 'normal');
    pdf.setFontSize(10);

    const wrappedLines = pdf.splitTextToSize(cleanLine, ctx.contentWidth);

    for (const wrappedLine of wrappedLines) {
      const pb = checkPageBreak(ctx, 8);
      ctx.y = pb.y;
      ctx.pageNum = pb.pageNum;

      pdf.text(wrappedLine, ctx.margin, ctx.y);
      ctx.y += 5;
    }
  }

  return ctx;
}

// ── Main POST handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: PdfRequestBody = await req.json();
    const { documentType, documentData, patientData, facilityData, resumeData } = body;

    // Validate required fields
    if (!documentType || !['resume', 'referral'].includes(documentType)) {
      return NextResponse.json(
        { error: 'documentType must be "resume" or "referral"' },
        { status: 400 },
      );
    }

    // fullContent is required only if resumeData is not provided for resume type
    if (!documentData?.fullContent && !(documentType === 'resume' && resumeData)) {
      return NextResponse.json(
        { error: 'documentData.fullContent or resumeData is required' },
        { status: 400 },
      );
    }

    // ── Create PDF document ──────────────────────────────────────────────
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    let ctx: PdfContext = {
      pdf,
      y: margin,
      pageNum: 1,
      margin,
      contentWidth,
      pageWidth,
      pageHeight,
    };

    // Add page number to first page
    addPageNumber(pdf, 1);

    // ══════════════════════════════════════════════════════════════════════
    // RENDER CONTENT BASED ON TYPE
    // ══════════════════════════════════════════════════════════════════════
    if (documentType === 'referral') {
      ctx = renderReferralLetter(ctx, patientData, documentData, facilityData);
    } else if (resumeData) {
      // NEW: Structured resume rendering
      ctx = renderStructuredResume(ctx, resumeData, patientData, documentData, facilityData);
    } else {
      // LEGACY: Markdown content rendering
      ctx = renderMarkdownContent(ctx, documentData.fullContent, patientData, documentData, facilityData);
    }

    // ══════════════════════════════════════════════════════════════════════
    // FOOTER SECTION: Doctor info, signature, QR code
    // ══════════════════════════════════════════════════════════════════════
    ctx.y += 8;

    // Ensure enough space for footer
    ctx = checkPageBreak(ctx, 55);
    ctx.y = ctx.y;
    ctx.pageNum = ctx.pageNum;

    // Separator line
    pdf.setLineWidth(0.3);
    pdf.line(margin, ctx.y, pageWidth - margin, ctx.y);
    ctx.y += 6;

    // Doctor information
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Dokter Penanggung Jawab:', margin, ctx.y);
    ctx.y += 5;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    pdf.text(documentData.doctorName || '-', margin + 3, ctx.y);
    ctx.y += 5;

    if (documentData.doctorSip) {
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`SIP: ${documentData.doctorSip}`, margin + 3, ctx.y);
      pdf.setTextColor(0, 0, 0);
      ctx.y += 5;
    }

    // Signature status
    ctx.y += 5;
    if (documentData.isSigned) {
      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 100, 0);
      pdf.text('[Tanda Tangan Elektronik]', margin + 3, ctx.y);
      pdf.setTextColor(0, 0, 0);
      ctx.y += 5;

      if (documentData.signedAt) {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Ditandatangani: ${formatIndonesianDate(documentData.signedAt)}`, margin + 3, ctx.y);
        pdf.setTextColor(0, 0, 0);
        ctx.y += 5;
      }
    } else {
      pdf.setFont('times', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text('[Belum Ditandatangani]', margin + 3, ctx.y);
      pdf.setTextColor(0, 0, 0);
      ctx.y += 5;
    }

    // ══════════════════════════════════════════════════════════════════════
    // QR CODE SECTION
    // ══════════════════════════════════════════════════════════════════════
    try {
      const verificationData = JSON.stringify({
        docId: body.documentId || '',
        docNumber: documentData.documentNumber || '',
        timestamp: documentData.generatedAt || new Date().toISOString(),
        doctor: documentData.doctorName || '',
        sip: documentData.doctorSip || '',
        signed: !!documentData.isSigned,
        type: documentType,
      });

      const qrDataUrl = await QRCode.toDataURL(verificationData, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      const qrSize = 25;
      const qrX = pageWidth - margin - qrSize;
      const qrY = Math.min(ctx.y + 2, pageHeight - margin - qrSize - 12);

      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      pdf.setFont('times', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Verifikasi', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
      pdf.text('Dokumen', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
      pdf.setFont('times', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('[QR Code gagal dibuat]', pageWidth - margin - 30, ctx.y + 5);
      pdf.setTextColor(0, 0, 0);
    }

    // ── Print date at bottom-left ────────────────────────────────────────
    const printDateText = `Dicetak: ${new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    pdf.setFont('times', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(printDateText, margin, pageHeight - margin - 2);
    pdf.setTextColor(0, 0, 0);

    // ── Add page numbers and continuation headers to all pages ──────────
    const docTitle = documentType === 'resume' ? 'RESUME MEDIS TELEPALIATIF' : 'SURAT RUJUKAN RUMAH SAKIT';
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      addPageNumber(pdf, p);

      // Top margin line on subsequent pages
      if (p > 1) {
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.1);
        pdf.line(margin, margin - 3, pageWidth - margin, margin - 3);
        pdf.setLineWidth(0.2);

        // Continuation header
        pdf.setFont('times', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(130, 130, 130);
        pdf.text(
          `${docTitle} - ${patientData.patientName || 'Pasien'} - ${documentData.documentNumber || ''}`,
          pageWidth / 2,
          margin - 5,
          { align: 'center' },
        );
        pdf.setTextColor(0, 0, 0);
      }
    }

    // ── Return PDF buffer ────────────────────────────────────────────────
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const safeName = (patientData.patientName || 'Pasien').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = documentType === 'resume'
      ? `Resume_Medis_${safeName}_${dateStr}.pdf`
      : `Surat_Rujukan_${safeName}_${dateStr}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: message },
      { status: 500 },
    );
  }
}
