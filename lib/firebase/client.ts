/**
 * Browser Firebase SDK. Drop-in successor to `lib/supabase.ts` for client
 * components. Import `firebaseAuth` / `db` from here; never import
 * firebase-admin in client code.
 *
 * Set NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1 to point at `firebase emulators:start`.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config);
}

export const firebaseAuth: Auth = getAuth(app());
export const db: Firestore = getFirestore(app());
export const googleProvider = new GoogleAuthProvider();

if (process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === '1' && typeof window !== 'undefined') {
  const w = window as unknown as { __fbEmu?: boolean };
  if (!w.__fbEmu) {
    connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    w.__fbEmu = true;
  }
}
