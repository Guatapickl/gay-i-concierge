/**
 * Browser Firebase SDK. Drop-in successor to `lib/supabase.ts` for client
 * components. Import `auth` / `db` from here; never import firebase-admin
 * in client code.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
