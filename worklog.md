---
Task ID: 1
Agent: Main Agent
Task: Fix "tidak bisa terbuka" - app not opening

Work Log:
- Investigated server stability issues - Next.js dev server uses ~1.65GB RAM and gets OOM killed
- Production build (`npx next start`) uses only ~194MB and works with Caddy gateway
- Removed `output: standalone` from next.config.ts which was causing issues with `next start`
- Added `allowedDevOrigins` to next.config.ts to fix cross-origin warnings
- Made FirestoreProvider completely non-blocking - app renders immediately with local Zustand data
- Added null-safety guards to firebase.ts - app works in offline/demo mode if Firebase unavailable
- Added guardDb() checks to all firestore-service.ts CRUD operations
- Added null-safety to firestore-seed.ts
- All Firestore operations gracefully degrade when Firebase is not configured

Stage Summary:
- Key fix: FirestoreProvider no longer blocks the app with loading/error screens
- The app now loads immediately regardless of Firebase connectivity
- Server uses ~194MB in production mode vs ~1.65GB in dev mode
- Server stability is limited by sandbox environment (processes get killed periodically)
- Added `bun run prod` script for production mode
