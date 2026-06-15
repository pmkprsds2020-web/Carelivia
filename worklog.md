---
Task ID: 1
Agent: main
Task: Fix all TypeScript/runtime bugs preventing Palliative Monitoring panel from opening

Work Log:
- Fixed missing `FamilyCoordinationNote` import in social-support-panel.tsx
- Fixed duplicate scoreMap keys by splitting into category-specific maps
- Fixed firestore-provider.tsx: wrong property names (patientId vs palliativePatientId for ClinicalAlert)
- Fixed firestore-provider.tsx: wrong ACP property names (isSignedByPatient → patientSigned, etc.)
- Fixed firestore-provider.tsx: missing isActive in ACP mapping
- Fixed firestore-provider.tsx: invalid enum values (severity 'sedang' → 'kuning', alertType 'warning' → 'form_tidak_diisi')
- Fixed firestore-provider.tsx: missing required fields in audit entries (performedByRole, createdAt)
- Fixed firestore-provider.tsx: wrong NutritionRecordInfo mapping (gender type, missing calculation, createdAt)
- Fixed firestore-provider.tsx: DailyComplaintRecord enum type mismatches
- Fixed firestore-provider.tsx: PalliativeChatMessage missing required fields (roomId, senderRole, status)
- Fixed firestore-provider.tsx: SocialAssessmentRecord missing required fields
- Fixed firestore-provider.tsx: VitalSignRecordInfo missing createdAt
- Fixed firestore-provider.tsx: PalliativeMedicationInfo missing createdAt/updatedAt
- Fixed palliative-resume-referral-panel.tsx: r.patientId → r.palliativePatientId (5 occurrences)
- Fixed palliative-monitoring-panel.tsx: newPatient type extended with weight/height

Stage Summary:
- All TypeScript errors in key files resolved (0 errors in tsc --noEmit for these files)
- ESLint passes with 0 errors
- Dev server running cleanly on port 3000
- Monitoring Paliatif panel confirmed working via browser testing

---
Task ID: 2-a
Agent: full-stack-developer
Task: Create MonitoringMarquee component, useMonitoringStatus hook, and integrate into palliative monitoring panel

Work Log:
- Created /src/components/telemedicine/monitoring-marquee.tsx with CSS keyframe animation marquee
- Created /src/components/telemedicine/use-monitoring-status.ts with monitoring status logic
- Integrated MonitoringMarquee into all 5 monitoring tabs (TTV, Keluhan, Obat, Nutrisi, Skrining)
- Added highest-priority marquee on Dashboard tab
- Added "Status Monitoring Hari Ini" summary card on Dashboard tab
- Each module has specific messages for 3 statuses: tepat_waktu, akan_jatuh_tempo, terlambat

Stage Summary:
- Running text marquee working with priority-based colors (hijau=kuning=merah)
- Status summary card showing ✅/⚠️/🔴 icons per module
- All module-specific messages match the specification
- Zero lint/TS errors, browser verified
