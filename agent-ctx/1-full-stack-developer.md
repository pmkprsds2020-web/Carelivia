---
Task ID: 1
Agent: full-stack-developer
Task: Build Patient Paliatif Module

Work Log:
- Added PatientTransportRequest, PatientCareUpdate, PatientPaliatifChatMessage types to types.ts
- Added 'patient-paliatif' to ActivePanel type
- Extended Zustand store with patient paliatif state and actions (patientTransportRequests, patientCareUpdates, patientPaliatifMessages)
- Created patient-paliatif-panel.tsx with 7 tabs (Dashboard, Family Meeting, Dukungan Keluarga, Koordinasi Perawatan, Kontak Darurat, Transportasi, Chat Paliatif) + dashboard
- Updated sidebar.tsx with Pelayanan Paliatif nav item for patient role under Kesehatan section
- Updated page.tsx with dynamic import and panel rendering for patient-paliatif

Stage Summary:
- Complete patient-facing palliative care module with read-only access to social support data
- Patient can submit care updates and transport requests
- Integrated chat with palliative team
- All tabs have proper empty states and responsive design
- Indonesian language used throughout
- Lint passes without errors
