---
Task ID: 1
Agent: Main Agent
Task: Integrate Firebase Firestore into CareLivia as single source of truth

Work Log:
- Installed firebase@12.14.0 SDK
- Created .env with Firebase config (NEXT_PUBLIC_FIREBASE_* variables) for security
- Created src/lib/firebase.ts - Firebase initialization with offline persistence
- Created src/lib/firestore-service.ts - Comprehensive CRUD service layer with:
  - Generic CRUD operations (createDoc, setDocById, getDocById, getCollection, getDocsByField, updateDocById, deleteDocById)
  - Real-time listeners (onCollectionSnapshot, onDocSnapshot)
  - Specific service objects for each collection (patients, ttv, keluhan, nutrisi, skrining, sosial, acp, obat, chat, clinicalAlerts, audit, resumes, users, notifications)
  - Collection path helpers for subcollections under patients/{patientId}
- Created src/hooks/useFirestore.ts - React hooks for real-time data:
  - useFirestoreCollection - real-time collection listener
  - useFirestoreDoc - real-time document listener
  - useFirestoreFetch - one-time fetch
  - Convenience hooks: usePalliativePatients, useTTVSerial, useKeluhanHarian, useNutrisi, useSkriningPaliatif, useSosial, useACP, useObat, useChatMessages, useClinicalAlerts, useResumes, useNotifications
  - firestoreActions - callable write actions
- Created src/lib/firestore-sync.ts - Bridge between Zustand and Firestore
  - Every write operation goes to BOTH Zustand (immediate UI) AND Firestore (persistence)
  - Fire-and-forget pattern to avoid blocking UI
- Created src/lib/firestore-seed.ts - Demo data seeding (1410 lines)
  - 3 palliative patients with all subcollections
  - 13 users, 10 notifications
  - Proper duplicate prevention
- Created src/components/telemedicine/firestore-provider.tsx - Provider component
  - Seeds Firestore on first run
  - Loads Firestore data into Zustand store
  - Shows loading state during initialization
  - Falls back to Zustand demo data if Firestore fails
- Updated src/lib/store.ts - Added Firestore sync to all key mutation actions:
  - addPalliativePatient, updatePalliativePatient, removePalliativePatient
  - addVitalSignRecord
  - addPalliativeMedication, updatePalliativeMedication
  - addAdvanceCarePlan, updateAdvanceCarePlan
  - addPalliativeScreeningRecord
  - addNutritionRecord
  - addPalliativeChatMessage, updatePalliativeChatMessage
  - addPalliativeClinicalAlert, markPalliativeAlertRead
  - addDailyComplaint
  - addPalliativeResume, updatePalliativeResume
  - addPalliativeAuditEntry
  - addSocialAssessment
- Updated src/app/page.tsx - Wrapped app with FirestoreProvider
- Created src/app/api/firestore/route.ts - API route placeholder
- Fixed lint issues in useFirestore.ts (React Compiler compatibility)
- Updated .eslintignore for seed-palliative.cjs
- Lint passes cleanly, server compiles and runs

Stage Summary:
- Firebase Firestore is now the primary persistent data store for CareLivia
- All user input data is saved to Firestore (fire-and-forget after Zustand update)
- Firestore data is loaded into Zustand on app initialization
- Real-time listeners available via custom hooks for future component integration
- Demo data is seeded automatically on first run
- Offline persistence enabled for better UX
- API keys stored in .env for security
