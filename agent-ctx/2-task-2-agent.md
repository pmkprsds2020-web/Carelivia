# Task 2: Fix buildFullMarkdown function and structured response

## Summary
Rewrote the `buildFullMarkdown` function in `/home/z/my-project/src/app/api/palliative-resume/route.ts` to produce comprehensive markdown output covering ALL data from ALL 9 modules, instead of the minimal AI-analysis-only markdown it previously generated.

## Changes Made

### 1. Function Signature Update
- **Old**: Accepted `patient`, `user`, `doctorName`, `ttvSerial`, `keluhanHarian`, `medicationCategories`, `acpDocuments`, `aiAnalysis`
- **New**: Accepts `dataPasien`, `ttvSerial`, `vitalSigns`, `keluhanHarian`, `screeningsByType`, `esasAnalysis`, `obatResponse`, `nutrisiResponse`, `sosialResponse`, `acpResponse`, `aiAnalysis`

### 2. Call Site Update
Updated the `buildFullMarkdown()` call to pass all structured data objects instead of raw patient/user/doctor parameters.

### 3. Title Change
Changed from "RESUME MEDIS PALIATIF" to "RESUME MEDIS TELEPALIATIF"

### 4. Comprehensive Markdown Sections Added
| Section | Content |
|---------|---------|
| DATA PASIEN | Full patient identity table (19 fields) |
| TTV SERIAL | Awal/Kritis/Terakhir narratives + full Riwayat TTV table |
| KELUHAN HARIAN | Awal/Terberat/Terakhir complaints + Frekuensi Gejala table |
| SKRINING PALIATIF | All screening types with full record tables |
| ESAS | 9-symptom comparison table (Awal/Tertinggi/Terakhir) |
| TERAPI OBAT | Analgesik + Simtomatik sub-categories + Obat Lainnya + Kepatuhan |
| NUTRISI | Records + AI summary |
| SOSIAL | Social assessment + caregiver + family meetings + financial + AI summary |
| ADVANCE CARE PLANNING | Full ACP document tables + AI summary |
| ANALISIS | All AI analysis sections + Kesimpulan Telepaliatif table + Rekomendasi |

### 5. Key Implementation Details
- ESAS skipped in Skrining Paliatif section (has its own dedicated section)
- Flexible ESAS symptom key matching for various naming conventions
- Helper functions `writeMedTable` and `renderRecordList` for DRY code
- Graceful handling of null/empty data with descriptive fallback messages

## Verification
- `bun run lint` passes (only pre-existing seed-palliative.js warning)
- Dev server running without errors
- API response structure unchanged - only markdown content generation modified
