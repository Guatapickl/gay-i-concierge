/**
 * Basic member profiles (server side, Admin SDK).
 *
 * The Members directory (/api/directory) lists `user_profiles` documents, so
 * every Firebase Auth account needs one. This module creates a basic profile
 * the first time an account completes a sign-in (POST /api/auth/session calls
 * `ensureProfileForIdToken`) and backs accounts that predate it through
 * scripts/backfill-user-profiles.ts (`ensureUserProfile`).
 *
 * Rules:
 * - create-if-absent: an existing profile is never modified, whatever it holds;
 *   a Firestore transaction guards against two concurrent first sign-ins;
 * - `created_at` is the Auth account creation time, not the time of the write;
 * - `full_name` is the Auth display name when the account has one, otherwise
 *   null. Names are never invented and the email address is never copied into
 *   the profile (the Profile page adds it later as a private field).
 */
import type { Auth } from 'firebase-admin/auth';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './admin';

export const USER_PROFILES = 'user_profiles';

/** The parts of a Firebase Auth `UserRecord` the basic profile is built from. */
export type ProfileSource = {
  uid: string;
  displayName?: string | null;
  metadata?: { creationTime?: string | null } | null;
};

export type BasicProfile = {
  id: string;
  full_name: string | null;
  created_at: Timestamp;
};

export type EnsureResult = { created: boolean; profile: BasicProfile | null };

/** Display name as a public name: trimmed, never empty, never an email address. */
export function publicNameOf(displayName: string | null | undefined): string | null {
  const name = typeof displayName === 'string' ? displayName.trim() : '';
  if (!name || name.includes('@')) return null;
  return name;
}

/** Account creation time; falls back to `now` only if Auth has no usable timestamp. */
export function accountCreatedAt(user: ProfileSource, now: Date = new Date()): Date {
  const raw = user.metadata?.creationTime;
  const parsed = raw ? new Date(raw) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : now;
}

export function basicProfile(user: ProfileSource, now: Date = new Date()): BasicProfile {
  return {
    id: user.uid,
    full_name: publicNameOf(user.displayName),
    created_at: Timestamp.fromDate(accountCreatedAt(user, now)),
  };
}

/**
 * Create the basic profile for `user` unless `user_profiles/{uid}` already
 * exists. Returns `created: false` and leaves the document untouched when it
 * does, including when another writer created it first.
 */
export async function ensureUserProfile(user: ProfileSource, db: Firestore = adminDb()): Promise<EnsureResult> {
  const ref = db.collection(USER_PROFILES).doc(user.uid);
  if ((await ref.get()).exists) return { created: false, profile: null };
  const profile = basicProfile(user);
  const created = await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return false;
    tx.create(ref, profile);
    return true;
  });
  return { created, profile: created ? profile : null };
}

type SessionDeps = { auth: Pick<Auth, 'verifyIdToken' | 'getUser'>; db: Firestore };

/**
 * Sign-in hook: verify the ID token, then make sure its account has a profile.
 * The Auth record is only loaded when the profile is missing, so returning
 * members cost one document read.
 */
export async function ensureProfileForIdToken(idToken: string, deps?: SessionDeps): Promise<EnsureResult> {
  const { auth, db } = deps ?? { auth: adminAuth(), db: adminDb() };
  const { uid } = await auth.verifyIdToken(idToken);
  if ((await db.collection(USER_PROFILES).doc(uid).get()).exists) return { created: false, profile: null };
  return ensureUserProfile(await auth.getUser(uid), db);
}
