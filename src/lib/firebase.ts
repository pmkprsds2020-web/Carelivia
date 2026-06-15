// Firebase Configuration — using environment variables for security
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase config is available
const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

let app;
let db: ReturnType<typeof getFirestore> | null = null;

try {
  if (hasFirebaseConfig) {
    // Initialize Firebase (prevent duplicate initialization in dev mode)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log('[Firebase] Initialized successfully');
  } else {
    console.warn('[Firebase] No configuration found — running in offline/demo mode');
  }
} catch (err) {
  console.warn('[Firebase] Initialization failed — running in offline/demo mode:', err);
  db = null;
}

export { db };
export default app;
