# Task 5: Enhance Nutrisi, Sosial, and ACP sections + Print template

## Summary
Enhanced the palliative resume preview panel to show actual data records before AI summaries in the Nutrisi, Sosial, and ACP sections. Also fixed the print template to render structured HTML instead of raw markdown text.

## Changes Made

### File: `/home/z/my-project/src/components/telemedicine/palliative-resume-referral-panel.tsx`

1. **Added `renderGenericRecords()` helper** (~line 241) - Safely renders `unknown[]` as key-value pairs in styled cards, filtering internal fields
2. **Added `renderAcpDocument()` helper** (~line 267) - Renders ACP documents with Indonesian labels
3. **Enhanced NUTRISI section** - Shows `resumeNutrisi.catatan` records first, then AI summary
4. **Enhanced SOSIAL section** - Shows Penilaian Sosial, Caregiver, Pertemuan Keluarga, Dukungan Keuangan records first, then AI summary
5. **Enhanced ACP section** - Shows ACP document details with proper labels first, then AI summary
6. **Added `buildResumePrintHtml()` helper** (~line 314) - Generates structured HTML for print with proper sections and tables
7. **Updated `handlePrint`** - Uses structured HTML for resume documents when dataPasien exists
8. **Fixed print title** to "RESUME MEDIS TELEPALIATIF"
9. **Added version info** to print doc-info bar

## Verification
- ESLint passes (only pre-existing seed-palliative.js warning)
- TypeScript shows only pre-existing errors unrelated to changes
- Dev server running without errors
