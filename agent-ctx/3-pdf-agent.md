# Task 3 - PDF Agent

## Task: Create PDF export API endpoint for palliative medical documents

### Files Created
- `/src/app/api/palliative-pdf/route.ts` (624 lines)

### Implementation Details

**POST /api/palliative-pdf** - Generates professional PDF documents for:
- Resume Medis Paliatif
- Surat Rujukan Rumah Sakit

**Request Body:**
```typescript
{
  documentType: 'resume' | 'referral',
  documentId: string,
  patientData: { patientName, rmNumber, nik, bpjsNumber, primaryDiagnosis, secondaryDiagnosis, diseaseStage, careStatus, riskLevel },
  documentData: { documentNumber, generatedAt, doctorName, doctorSip, isSigned, signedAt, fullContent, targetDepartment?, referralStatus?, version },
  facilityData?: { name, address, phone, email, logo? }
}
```

**PDF Features:**
- A4 page size, 20mm margins, Times font
- Header: facility logo placeholder, name, address, contact, double line separator
- Document info: number, Indonesian date, version
- Title: centered bold 16pt with underline
- Patient identity box (referral): bordered two-column layout with gray title bar
- Compact patient info (resume): inline format
- Content: section header detection (## / ===), gray background bars, navy bold text, bold markers (**), text wrapping with splitTextToSize, auto page breaks
- Footer: doctor name/SIP, electronic signature indicator, signed date
- QR code: verification JSON at bottom-right, fallback on failure
- Page numbers, continuation headers, print timestamp

**Testing Results:**
- Resume PDF: 2 pages, ~80KB, valid PDF v1.3
- Referral PDF: 1 page, ~78KB, valid PDF v1.3
- Error handling: 400 for invalid documentType, 400 for missing fullContent
- Lint: clean (0 errors)

**Dependencies Used:**
- jsPDF (already installed, import: `{ jsPDF } from 'jspdf'`)
- qrcode (already installed, import: `import * as QRCode from 'qrcode'`)
