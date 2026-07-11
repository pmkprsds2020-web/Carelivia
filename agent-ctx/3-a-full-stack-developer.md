# Agent Context — Task 3-a (full-stack-developer)

## Task
Build 13 Supabase service layer files under `src/services/supabase/` for the CareLivia telemedicine app (Monitoring Paliatif module). Each service must wrap every Supabase call in a never-throwing helper that logs warnings and returns a fallback (null / [] / 0) so the app can degrade gracefully to local Zustand data when tables are missing or RLS/network fails.

## Files created (15 total)

| # | File | Table(s) | Return type |
|---|------|----------|-------------|
| - | `_common.ts` | — | helpers: `safeQuery`, `snakeToCamelRow`, `camelToSnakeRow`, `stripUndefined`, `safeJsonParse`, `combineDateAndTime`, `splitIsoToTanggalJam` |
| 1 | `patientService.ts` | `patients` | `PalliativePatientInfo` |
| 2 | `vitalService.ts` | `vital_signs` | `VitalSignRecordInfo` |
| 3 | `screeningService.ts` | `screenings` | `PalliativeScreeningRecordInfo` |
| 4 | `medicationService.ts` | `medications` | `MedicationWithExtras` (= `PalliativeMedicationInfo` + `sideEffects` + `stock`) |
| 5 | `nutritionService.ts` | `nutrition` | `NutritionRecordInfo` (calculation sub-fields default to 0) |
| 6 | `complaintService.ts` | `daily_complaints` | `DailyComplaintRecord` |
| 7 | `socialService.ts` | `social_assessments` | `SocialAssessmentRecord` (per-item notes dropped on write) |
| 8 | `acpService.ts` | `acp` | `AdvanceCarePlanInfo` |
| 9 | `chatService.ts` | `chat_rooms` + `messages` | `PalliativeChatMessage` |
| 10 | `documentService.ts` | `patient_documents` + Storage bucket `patient-files` | `PatientDocument` (defined here) |
| 11 | `notificationService.ts` | `notifications` | `AppNotification` (defined here) |
| 12 | `dashboardService.ts` | aggregate counts on `patients`, `clinical_alerts`, `chat_rooms` | `DashboardStats` (defined here) |
| 13 | `aiService.ts` | `ai_reports` | `AIReport` (defined here) |
| - | `index.ts` | — | barrel file re-exporting all services + helper types |

## Key design decisions

1. **`safeQuery` accepts `PromiseLike`, not `Promise`.** Supabase query builders (`PostgrestFilterBuilder`, `PostgrestBuilder`) are `PromiseLike<{ data, error }>`, not `Promise`. Using `Promise` caused `TS2345`. The fix widens the parameter to `PromiseLike`.
2. **`safeCount` is a separate helper.** `head: true, count: 'exact'` returns `count` as a sibling of `data` (not inside it). `safeQuery` only reads `data`/`error`, so a dedicated `safeCount` was needed.
3. **Explicit per-field mapping (not blind snake↔camel).** Many columns have different names than the TS type (`rm` ↔ `rmNumber`, `nama` ↔ `patientName`, `sistol` ↔ `systolicBP`, etc.). Each service has explicit `fromDb` / `toDb` functions. The generic helpers in `_common.ts` are still exported for callers who want them.
4. **`stripUndefined` on writes.** Prevents accidentally overwriting DB columns with NULL during partial updates.
5. **JSON field handling:**
   - `jawaban` ↔ `details` (string): JSON.stringify on read, JSON.parse on write
   - `kepatuhan`, `recommendations`, `revisions`, `metadata`, `form_data`, `form_response`, `data`: passed as JS objects; supabase-js serializes them
   - `scoreLabel` stored inside `jawaban` JSON (no dedicated column)
   - `clinicalAlert` stored inside `form_data` JSON under key `clinicalAlert` (no dedicated column)
6. **Date handling:** `tanggal` (date) + `jam` (time) combined into `recordedAt` ISO via `combineDateAndTime`; reverse split via `splitIsoToTanggalJam`.
7. **chatService.getOrCreateRoom** has a race-condition retry: if insert fails (because someone else inserted between select and insert), we re-select.
8. **documentService.upload** builds storage path `{patientId}/{jenis}/{ts}-{sanitized-filename}` to avoid collisions, uploads to `patient-files` bucket, gets public URL, inserts metadata row. `remove()` deletes from both Storage and DB.
9. **dashboardService.getStats** runs 6 count queries in parallel via `Promise.all`, each with its own `safeCount` wrapper that returns 0 on any error.

## Verification

- `bunx tsc --noEmit` — **zero errors** in `src/services/supabase/*`
- `bunx eslint src/services/supabase` — **zero errors**
- Dev server still running cleanly on port 3000 (no new errors in `dev.log`)

## Notes for downstream agents (3-b, 3-c, …)

- Import any service as: `import { patientService, vitalService } from '@/services/supabase';`
- All methods are async and non-throwing. On Supabase error, they return `null` (single-row methods), `[]` (multi-row methods), `false` (delete methods), or `0` (count methods).
- The Medication service returns `MedicationWithExtras` (which extends `PalliativeMedicationInfo` with `sideEffects` and `stock`). If you only need the base type, you can ignore those extra fields.
- The Nutrition service reconstructs `calculation` with many fields set to `0` (the DB schema only stores a subset). If you need the full breakdown, re-run the calculator on the client side using `weight`/`height`/`activityLevel`/`metabolicStress`/`specialCondition`.
- The Social service does NOT persist per-item `*Notes` fields — they are not in the DB schema. If you need to persist notes, store them inside `recommendations` JSON.
- The Chat service stores `clinicalAlert` inside `form_data.clinicalAlert` (no dedicated column).
- The Document service requires the `patient-files` Storage bucket to exist (created via Supabase Dashboard → Storage → New bucket). Public URL is used; for private buckets you'd need `createSignedUrl`.
