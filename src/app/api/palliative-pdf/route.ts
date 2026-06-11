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

interface PdfRequestBody {
  documentType: 'resume' | 'referral';
  documentId: string;
  patientData: PatientData;
  documentData: DocumentData;
  facilityData?: FacilityData;
}

// ── Helper: Format date in Indonesian ────────────────────────────────────────
function formatIndonesianDate(dateStr: string): string {
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Helper: Draw a bordered box ──────────────────────────────────────────────
function drawBox(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  pdf.rect(x, y, w, h);
}

// ── Helper: Draw a double horizontal line ────────────────────────────────────
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
  pdf: jsPDF,
  y: number,
  margin: number,
  needed: number,
  pageHeight: number,
  pageNum: number,
): { y: number; pageNum: number } {
  if (y + needed > pageHeight - margin - 15) {
    pdf.addPage();
    pageNum++;
    addPageNumber(pdf, pageNum);
    return { y: margin, pageNum };
  }
  return { y, pageNum };
}

// ── Main POST handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: PdfRequestBody = await req.json();
    const { documentType, documentData, patientData, facilityData } = body;

    // Validate required fields
    if (!documentType || !['resume', 'referral'].includes(documentType)) {
      return NextResponse.json(
        { error: 'documentType must be "resume" or "referral"' },
        { status: 400 },
      );
    }
    if (!documentData?.fullContent) {
      return NextResponse.json(
        { error: 'documentData.fullContent is required' },
        { status: 400 },
      );
    }

    // ── Create PDF document ──────────────────────────────────────────────
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;
    let pageNum = 1;

    // ── Facility defaults ────────────────────────────────────────────────
    const facilityName = facilityData?.name || 'FASILITAS KESEHATAN PRIMER';
    const facilityAddress = facilityData?.address || 'Jl. Kesehatan No. 1, Kota, Provinsi';
    const facilityPhone = facilityData?.phone || '(021) 123-4567';
    const facilityEmail = facilityData?.email || 'info@fkprimer.go.id';

    // ══════════════════════════════════════════════════════════════════════
    // HEADER SECTION
    // ══════════════════════════════════════════════════════════════════════

    // Logo placeholder area (left side)
    pdf.setDrawColor(150, 150, 150);
    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(margin, y, 22, 22, 2, 2, 'FD');
    pdf.setFont('times', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text('LOGO', margin + 11, y + 11, { align: 'center' });
    pdf.text('FASILITAS', margin + 11, y + 14.5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);

    // Facility name and address (right of logo)
    pdf.setFont('times', 'bold');
    pdf.setFontSize(14);
    pdf.text(facilityName, margin + 26, y + 6);

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.text(facilityAddress, margin + 26, y + 11);

    const contactLine = `Telp: ${facilityPhone}${facilityEmail ? ' | Email: ' + facilityEmail : ''}`;
    pdf.text(contactLine, margin + 26, y + 15.5);

    y += 26;

    // Double horizontal line separator
    drawDoubleLine(pdf, margin, pageWidth - margin, y);
    y += 5;

    // ── Document info row (number, date, version) ───────────────────────
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);

    const docNumberText = `No. Dokumen: ${documentData.documentNumber || '-'}`;
    const docDateText = `Tanggal: ${formatIndonesianDate(documentData.generatedAt || new Date().toISOString())}`;
    const docVersionText = documentData.version ? `Versi: ${documentData.version}` : '';

    pdf.text(docNumberText, margin, y);
    pdf.text(docDateText, margin + 65, y);
    if (docVersionText) {
      pdf.text(docVersionText, pageWidth - margin, y, { align: 'right' });
    }
    pdf.setTextColor(0, 0, 0);
    y += 6;

    // Thin separator
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y, pageWidth - margin, y);
    pdf.setLineWidth(0.2);
    y += 5;

    // ══════════════════════════════════════════════════════════════════════
    // TITLE SECTION
    // ══════════════════════════════════════════════════════════════════════
    const title = documentType === 'resume'
      ? 'RESUME MEDIS PALIATIF'
      : 'SURAT RUJUKAN RUMAH SAKIT';

    pdf.setFont('times', 'bold');
    pdf.setFontSize(16);
    pdf.text(title, pageWidth / 2, y, { align: 'center' });
    y += 3;

    // Underline the title
    const titleWidth = pdf.getTextWidth(title);
    pdf.setLineWidth(0.4);
    pdf.line(
      pageWidth / 2 - titleWidth / 2,
      y,
      pageWidth / 2 + titleWidth / 2,
      y,
    );
    pdf.setLineWidth(0.2);
    y += 7;

    // ══════════════════════════════════════════════════════════════════════
    // PATIENT IDENTITY BOX (especially for referral letters)
    // ══════════════════════════════════════════════════════════════════════
    if (documentType === 'referral') {
      // Draw identity box
      const boxStartY = y;
      const boxHeight = 52;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      drawBox(pdf, margin, y, contentWidth, boxHeight);

      // Box title bar
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y, contentWidth, 7, 'F');
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(margin, y, contentWidth, 7);

      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.text('IDENTITAS PASIEN', margin + 3, y + 5);
      y += 10;

      // Patient details in two-column layout
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10);

      const labelX1 = margin + 3;
      const valueX1 = margin + 35;
      const labelX2 = margin + contentWidth / 2 + 3;
      const valueX2 = margin + contentWidth / 2 + 30;

      // Row 1: Name & RM Number
      pdf.setFont('times', 'bold');
      pdf.text('Nama', labelX1, y);
      pdf.setFont('times', 'normal');
      pdf.text(`: ${patientData.patientName || '-'}`, valueX1, y);
      pdf.setFont('times', 'bold');
      pdf.text('No. RM', labelX2, y);
      pdf.setFont('times', 'normal');
      pdf.text(`: ${patientData.rmNumber || '-'}`, valueX2, y);
      y += 6;

      // Row 2: NIK & BPJS
      pdf.setFont('times', 'bold');
      pdf.text('NIK', labelX1, y);
      pdf.setFont('times', 'normal');
      pdf.text(`: ${patientData.nik || '-'}`, valueX1, y);
      pdf.setFont('times', 'bold');
      pdf.text('No. BPJS', labelX2, y);
      pdf.setFont('times', 'normal');
      pdf.text(`: ${patientData.bpjsNumber || '-'}`, valueX2, y);
      y += 6;

      // Row 3: Primary Diagnosis
      pdf.setFont('times', 'bold');
      pdf.text('Diagnosa Utama', labelX1, y);
      pdf.setFont('times', 'normal');
      const diagText = patientData.primaryDiagnosis || '-';
      const diagLines = pdf.splitTextToSize(`: ${diagText}`, contentWidth / 2 - 33);
      pdf.text(diagLines[0], valueX1, y);
      if (diagLines.length > 1) {
        pdf.text(diagLines.slice(1).join('\n'), valueX1, y + 5);
      }

      pdf.setFont('times', 'bold');
      pdf.text('Stadium', labelX2, y);
      pdf.setFont('times', 'normal');
      pdf.text(`: ${patientData.diseaseStage || '-'}`, valueX2, y);
      y += 6;

      // Row 4: Secondary Diagnosis
      pdf.setFont('times', 'bold');
      pdf.text('Diagnosa Penyerta', labelX1, y);
      pdf.setFont('times', 'normal');
      const secDiagText = patientData.secondaryDiagnosis || '-';
      pdf.text(`: ${secDiagText}`, valueX1, y);

      pdf.setFont('times', 'bold');
      pdf.text('Status', labelX2, y);
      pdf.setFont('times', 'normal');
      pdf.text(`: ${patientData.careStatus || '-'}`, valueX2, y);
      y += 6;

      // Row 5: Target department & Risk level (referral specific)
      if (documentData.targetDepartment) {
        pdf.setFont('times', 'bold');
        pdf.text('Dept. Tujuan', labelX1, y);
        pdf.setFont('times', 'normal');
        pdf.text(`: ${documentData.targetDepartment}`, valueX1, y);
      }

      pdf.setFont('times', 'bold');
      pdf.text('Tingkat Risiko', labelX2, y);
      pdf.setFont('times', 'normal');
      const riskLabel =
        patientData.riskLevel === 'merah' ? 'Merah (Kritis)' :
        patientData.riskLevel === 'kuning' ? 'Kuning (Moderat)' :
        patientData.riskLevel === 'hijau' ? 'Hijau (Stabil)' :
        patientData.riskLevel || '-';
      pdf.text(`: ${riskLabel}`, valueX2, y);

      y = boxStartY + boxHeight + 5;

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
        pdf.text(`Status Rujukan: ${statusLabel}`, pageWidth - margin, y, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        y += 4;
      }
    } else {
      // Resume Medis - compact patient info line
      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.text('Pasien:', margin, y);
      pdf.setFont('times', 'normal');
      const patientLine = `${patientData.patientName || '-'}  |  RM: ${patientData.rmNumber || '-'}  |  NIK: ${patientData.nik || '-'}  |  BPJS: ${patientData.bpjsNumber || '-'}`;
      const patientLines = pdf.splitTextToSize(patientLine, contentWidth - 18);
      pdf.text(patientLines, margin + 18, y);
      y += patientLines.length * 5;

      pdf.setFont('times', 'bold');
      pdf.text('Diagnosa:', margin, y);
      pdf.setFont('times', 'normal');
      const diagLine = `${patientData.primaryDiagnosis || '-'}${patientData.secondaryDiagnosis ? ' / ' + patientData.secondaryDiagnosis : ''}${patientData.diseaseStage ? ' - Stadium ' + patientData.diseaseStage : ''}`;
      const diagWrapped = pdf.splitTextToSize(diagLine, contentWidth - 24);
      pdf.text(diagWrapped, margin + 24, y);
      y += diagWrapped.length * 5;

      const riskText =
        patientData.riskLevel === 'merah' ? 'Merah (Kritis)' :
        patientData.riskLevel === 'kuning' ? 'Kuning (Moderat)' :
        patientData.riskLevel === 'hijau' ? 'Hijau (Stabil)' :
        patientData.riskLevel || '-';
      pdf.setFont('times', 'bold');
      pdf.text('Risiko:', margin, y);
      pdf.setFont('times', 'normal');
      pdf.text(riskText, margin + 18, y);
      y += 4;
    }

    // Separator before content
    y += 2;
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y, pageWidth - margin, y);
    pdf.setLineWidth(0.2);
    y += 5;

    // ══════════════════════════════════════════════════════════════════════
    // CONTENT SECTION
    // ══════════════════════════════════════════════════════════════════════
    const fullContent = documentData.fullContent;
    const rawLines = fullContent.split('\n');

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // Detect section headers: lines starting with ## or === or all caps with ===
      const isMarkdownHeader = line.trimStart().startsWith('##');
      const isEqualHeader = line.trim().startsWith('===') && line.trim().endsWith('===');
      const isSectionHeader = isMarkdownHeader || isEqualHeader;

      if (isSectionHeader) {
        // Extract the header text
        let headerText = line.trim();
        if (isMarkdownHeader) {
          headerText = headerText.replace(/^##\s*/, '');
        }
        if (isEqualHeader) {
          headerText = headerText.replace(/^===\s*/, '').replace(/\s*===$/, '');
        }

        // Check page break (need room for header + some content)
        const pb = checkPageBreak(pdf, y, margin, 20, pageHeight, pageNum);
        y = pb.y;
        pageNum = pb.pageNum;

        // Draw a subtle background bar for section headers
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, y - 4, contentWidth, 7, 'F');

        // Draw section header
        pdf.setFont('times', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(0, 51, 102);
        const headerLines = pdf.splitTextToSize(headerText, contentWidth - 4);
        pdf.text(headerLines, margin + 2, y);
        y += headerLines.length * 5 + 3;
        pdf.setTextColor(0, 0, 0);
      } else if (line.trim() === '') {
        // Empty line - add small spacing
        y += 3;
      } else {
        // Regular content line - detect bold markers
        const isBoldLine = line.trimStart().startsWith('**') && line.trimEnd().endsWith('**');
        const cleanLine = isBoldLine
          ? line.trim().replace(/^\*\*/, '').replace(/\*\*$/, '')
          : line;

        pdf.setFont('times', isBoldLine ? 'bold' : 'normal');
        pdf.setFontSize(10);

        // Split long lines to fit page width
        const wrappedLines = pdf.splitTextToSize(cleanLine, contentWidth);

        for (const wrappedLine of wrappedLines) {
          const pb = checkPageBreak(pdf, y, margin, 8, pageHeight, pageNum);
          y = pb.y;
          pageNum = pb.pageNum;

          pdf.text(wrappedLine, margin, y);
          y += 5;
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // FOOTER SECTION: Doctor info, signature, QR code
    // ══════════════════════════════════════════════════════════════════════
    y += 8;

    // Ensure enough space for footer (need about 50mm)
    const pb = checkPageBreak(pdf, y, margin, 55, pageHeight, pageNum);
    y = pb.y;
    pageNum = pb.pageNum;

    // Separator line
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Doctor information
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Dokter Penanggung Jawab:', margin, y);
    y += 5;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    pdf.text(documentData.doctorName || '-', margin + 3, y);
    y += 5;

    if (documentData.doctorSip) {
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`SIP: ${documentData.doctorSip}`, margin + 3, y);
      pdf.setTextColor(0, 0, 0);
      y += 5;
    }

    // Signature status
    y += 5;
    if (documentData.isSigned) {
      // Electronic signature indicator
      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 100, 0);
      pdf.text('[Tanda Tangan Elektronik]', margin + 3, y);
      pdf.setTextColor(0, 0, 0);
      y += 5;

      if (documentData.signedAt) {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Ditandatangani: ${formatIndonesianDate(documentData.signedAt)}`, margin + 3, y);
        pdf.setTextColor(0, 0, 0);
        y += 5;
      }
    } else {
      pdf.setFont('times', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text('[Belum Ditandatangani]', margin + 3, y);
      pdf.setTextColor(0, 0, 0);
      y += 5;
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

      // Place QR code at bottom-right of the page
      const qrSize = 25;
      const qrX = pageWidth - margin - qrSize;
      const qrY = Math.min(y + 2, pageHeight - margin - qrSize - 12);

      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // QR code label
      pdf.setFont('times', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Verifikasi', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
      pdf.text('Dokumen', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
      // Continue without QR code - not critical
      pdf.setFont('times', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('[QR Code gagal dibuat]', pageWidth - margin - 30, y + 5);
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

    // ── Add page numbers to all pages ────────────────────────────────────
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
          `${title} - ${patientData.patientName || 'Pasien'} - ${documentData.documentNumber || ''}`,
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
