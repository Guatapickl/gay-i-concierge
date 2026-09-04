/**
 * Server-only Firebase Admin SDK. Successor to `lib/supabaseAdmin.ts`.
 * On App Hosting / Cloud Functions, Application Default Credentials are
 * injected automatically; locally set GOOGLE_APPLICATION_CREDENTIALS to a
 * service-account JSON (never commit it).
 */
import { getApps, initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let cached: App | null = null;

export function adminApp(): App {
  if (cached) return cached;
  if (getApps().length) {
    cached = getApps()[0]!;
    return cached;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  cached = initializeApp({
    credential: json ? cert(JSON.parse(json)) : applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  return cached;
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

/** Resolve the caller from an `Authorization: Bearer <idToken>` header. */
export async function userFromRequest(req: Request): Promise<{ uid: string; email: string | null } | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

export async function isAdminUid(uid: string): Promise<boolean> {
  const snap = await adminDb().collection('app_admins').doc(uid).get();
  return snap.exists;
}
