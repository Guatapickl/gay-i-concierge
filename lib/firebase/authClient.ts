/**
 * Client-side auth operations. One place maps every Supabase auth call the
 * app used to its Firebase equivalent, and keeps the server session cookie
 * in sync so Server Components / middleware see the same signed-in state.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  sendEmailVerification,
  updatePassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { firebaseAuth, googleProvider } from './client';

const EMAIL_LINK_KEY = 'gayiclub:emailForSignIn';

function siteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || '';
}

/** Mint / clear the `__session` cookie used by SSR. Best-effort. */
export async function syncSessionCookie(user: User | null): Promise<void> {
  try {
    if (user) {
      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    } else {
      await fetch('/api/auth/session', { method: 'DELETE' });
    }
  } catch {
    // SSR cookie is a convenience; client auth state is the source of truth.
  }
}

/** Resolves once Firebase has restored persisted auth state. */
export async function currentUser(): Promise<User | null> {
  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser;
}

/** Bearer header for API routes (same shape the Supabase version sent). */
export async function authHeader(): Promise<Record<string, string>> {
  const u = await currentUser();
  if (!u) return {};
  return { Authorization: `Bearer ${await u.getIdToken()}` };
}

export async function signInWithPassword(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
  await syncSessionCookie(cred.user);
  return cred.user;
}

export async function signUpWithPassword(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  await sendEmailVerification(cred.user, { url: `${siteUrl()}/` }).catch(() => {});
  await syncSessionCookie(cred.user);
  return cred.user;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(firebaseAuth, googleProvider);
  await syncSessionCookie(cred.user);
  return cred.user;
}

export async function sendMagicLink(email: string) {
  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: `${siteUrl()}/auth/callback`,
    handleCodeInApp: true,
  });
  try { window.localStorage.setItem(EMAIL_LINK_KEY, email); } catch {}
}

/** Called on /auth/callback. Returns the user, or null if the URL isn't a magic link. */
export async function completeMagicLink(href: string, emailFallback?: string): Promise<User | null> {
  if (!isSignInWithEmailLink(firebaseAuth, href)) return null;
  let email: string | null = null;
  try { email = window.localStorage.getItem(EMAIL_LINK_KEY); } catch {}
  email = email || emailFallback || window.prompt('Confirm your email to finish signing in') || '';
  const cred = await signInWithEmailLink(firebaseAuth, email, href);
  try { window.localStorage.removeItem(EMAIL_LINK_KEY); } catch {}
  await syncSessionCookie(cred.user);
  return cred.user;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(firebaseAuth, email, { url: `${siteUrl()}/auth/sign-in` });
}

/** /auth/reset?oobCode=… — verify the code, then set the new password. */
export async function completePasswordReset(oobCode: string, newPassword: string) {
  const email = await verifyPasswordResetCode(firebaseAuth, oobCode);
  await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
  return email;
}

export async function setPassword(newPassword: string) {
  const u = await currentUser();
  if (!u) throw new Error('Not signed in');
  await updatePassword(u, newPassword);
}

export async function signOut() {
  await fbSignOut(firebaseAuth);
  await syncSessionCookie(null);
}

export function onUserChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, cb);
}

/** Provider ids as the profile page shows them ('password' | 'google.com' | 'emailLink'). */
export function providerIds(user: User): string[] {
  return user.providerData.map(p => p.providerId);
}
