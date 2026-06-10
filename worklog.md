---
Task ID: 1
Agent: Main
Task: Add comprehensive "Monitoring Pasien Paliatif" feature to MedikaLink

Work Log:
- Updated prisma/schema.prisma with 7 new models: PalliativePatient, VitalSignRecord, PalliativeMedication, MedicationAdherence, AdvanceCarePlan, ACPRevision, PalliativeScreeningRecord
- Ran `bun run db:push` successfully to apply schema changes
- Updated src/lib/types.ts with new types: PalliativeCareStatus, PalliativePatientStatus, PalliativeRiskLevel, PalliativePatientInfo, VitalSignRecordInfo, PalliativeMedicationInfo, MedicationAdherenceInfo, AdvanceCarePlanInfo, ACPRevisionInfo, PalliativeScreeningRecordInfo, and added 'palliative-monitoring' to ActivePanel
- Updated src/lib/store.ts with new state fields and demo data for palliative monitoring (3 demo patients, 6 vital sign records, 7 medications, 2 ACP documents, 4 screening records)
- Updated sidebar.tsx to add "Monitoring Paliatif" nav item for doctor role with Monitor icon
- Updated page.tsx to import and render PalliativeMonitoringPanel component
- Created src/components/telemedicine/palliative-monitoring-panel.tsx (~3650 lines) with 7 tabs: Dashboard, Pasien, TTV Serial, Skrining, Obat, ACP, AI
- Created src/app/api/palliative-monitoring/route.ts with GET and POST handlers for all CRUD operations
- Created src/app/api/palliative-ai-analysis/route.ts with AI analysis endpoint using z-ai-web-dev-sdk with local fallback
- Fixed lint errors in palliative-ai-analysis route (template literal encoding issues)
- Verified with agent-browser: all 7 tabs render correctly, patient selection works, TTV data displays, ACP document view works, AI analysis generates properly

Stage Summary:
- Complete "Monitoring Pasien Paliatif" feature added with all 8 requested modules:
  1. Manajemen Data Pasien Paliatif - CRUD with search/filter, patient detail view
  2. Monitoring TTV Serial - Vital signs with charts (recharts), clinical alarms
  3. Skrining Paliatif Berkala - History with trend comparison
  4. Monitoring Pemberian Obat - Medication management with adherence tracking
  5. Advance Care Planning - Multi-step form with digital signatures and audit trail
  6. Dashboard Monitoring - Risk-color-coded overview with alerts
  7. AI Clinical Assistant - Generates SOAP notes, risk analysis, recommendations
  8. Audit Trail - All actions logged via AuditLog model and ACP revisions
- Feature accessible from sidebar under "Kesehatan" section for doctor role
- Demo data pre-populated for 3 palliative patients with realistic Indonesian clinical data
