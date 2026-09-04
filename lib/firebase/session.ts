/**
 * Server-side session for Server Components and middleware.
 *
 * Supabase kept the session in cookies that @supabase/ssr refreshed in
 * middleware. Firebase's equivalent is a session cookie minted from the
 * client's ID token: the client POSTs its ID token to /api/auth/session
 * after sign-in (and DELETEs it on sign-out); server code reads the cookie
 * with `getServerUser()`. Middleware only checks the cookie's presence —
 * verifying it needs the Admin SDK, which can't run on the Edge runtime.
 */
import { cookies } from 'next/headers';
import { adminAuth } from './admin';

export const SESSION_COOKIE = '__session'; // the one cookie Firebase Hosting/App Hosting forwards
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: TWO_WEEKS_MS });
}

export async function getServerUser(): Promise<{ uid: string; email: string | null } | null> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
