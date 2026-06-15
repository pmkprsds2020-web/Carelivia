---
Task ID: 1
Agent: main
Task: Fix "Monitoring Paliatif tidak dapat terbuka" (Palliative Monitoring cannot be opened)

Work Log:
- Diagnosed the issue by analyzing the palliative monitoring panel component and its sub-components
- Found multiple critical issues that could prevent the component from loading:
  1. Missing `FamilyCoordinationNote` type import in social-support-panel.tsx (used on lines 1724, 1803 but never imported)
  2. Duplicate keys in scoreMap object in social-support-panel.tsx causing incorrect social score calculations
  3. Wrong property names (patientId vs palliativePatientId) in palliative-resume-referral-panel.tsx
  4. Missing `program_selesai` case in getPatientStatusLabel switch statement
  5. Incorrect trendIcon type inference (null vs React.ReactNode)
  6. Property name mismatches in firestore-provider.tsx (palliativePatientId vs patientId, isSignedByPatient vs patientSigned, etc.)
  7. Invalid enum values in firestore-provider (severity: 'sedang' not valid, alertType: 'warning' not valid)
  8. Missing required fields in firestore-provider (ACP missing isActive, audit missing performedByRole and createdAt)

Stage Summary:
- Fixed all critical issues across 4 files
- social-support-panel.tsx: Added FamilyCoordinationNote import, replaced single scoreMap with category-specific maps
- palliative-resume-referral-panel.tsx: Changed patientId to palliativePatientId in 5 filter operations
- palliative-monitoring-panel.tsx: Added program_selesai case, fixed trendIcon type
- firestore-provider.tsx: Fixed property names, added missing required fields, fixed invalid enum values
- Lint passes cleanly
- Server compiles and serves pages with 200 OK
