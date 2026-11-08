import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp as initAdminApp, deleteApp as deleteAdminApp, type App as AdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, deleteUser, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, setDoc, terminate, Timestamp as ClientTimestamp } from 'firebase/firestore';
import { ensureUserProfile, USER_PROFILES } from '@/lib/firebase/userProfiles';
import { profileSavePayload } from '@/lib/profileSave';

// Opt-in integration test against the loopback Firestore and Auth emulators
// (firebase emulators:exec --project demo-gayiclub --only firestore,auth). Real
// transaction semantics for create-if-absent, and the member's own merge save
// under the real security rules. Unique IDs, exact cleanup, no collection wipes.
describe.skipIf(process.env.RUN_FIREBASE_RULES_TESTS !== '1')('user profiles on the Firestore emulator', () => {
  const prefix = `user-profiles-${randomUUID()}`;
  const creationTime = 'Sun, 06 Sep 2026 14:03:11 GMT';
  const createdIds: string[] = [];
  let adminApp: AdminApp;
  let db: Firestore;
  let clientApp: FirebaseApp;

  beforeAll(() => {
    if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Refusing tests outside the loopback Firestore emulator.');
    adminApp = initAdminApp({ projectId: 'demo-gayiclub' }, prefix);
    db = getAdminFirestore(adminApp);
    clientApp = initializeApp({ projectId: 'demo-gayiclub', apiKey: 'demo-key' }, `${prefix}-client`);
    connectFirestoreEmulator(getFirestore(clientApp), '127.0.0.1', 8080);
    connectAuthEmulator(getAuth(clientApp), 'http://127.0.0.1:9099', { disableWarnings: true });
  });

  afterAll(async () => {
    if (!db) return;
    await Promise.all(createdIds.map(id => db.collection(USER_PROFILES).doc(id).delete()));
    const user = getAuth(clientApp).currentUser;
    if (user) await deleteUser(user);
    await terminate(getFirestore(clientApp));
    await deleteApp(clientApp);
    await db.terminate();
    await deleteAdminApp(adminApp);
  });

  it('creates exactly one profile under concurrent first sign-ins and never rewrites it', async () => {
    const uid = `${prefix}-concurrent`;
    createdIds.push(uid);
    const user = { uid, displayName: 'Emulator Member', metadata: { creationTime } };
    const results = await Promise.all(Array.from({ length: 5 }, () => ensureUserProfile(user, db)));
    expect(results.filter(r => r.created)).toHaveLength(1);
    const stored = (await db.collection(USER_PROFILES).doc(uid).get()).data();
    expect(stored).toEqual({ id: uid, full_name: 'Emulator Member', created_at: Timestamp.fromDate(new Date(creationTime)) });
    expect((await ensureUserProfile({ ...user, displayName: 'Renamed Later' }, db)).created).toBe(false);
    expect((await db.collection(USER_PROFILES).doc(uid).get()).data()).toEqual(stored);
  });

  it('leaves a profile the member already filled in untouched', async () => {
    const uid = `${prefix}-existing`;
    createdIds.push(uid);
    const existing = { id: uid, full_name: 'Chosen Name', email: 'private@example.test', interests: ['Art'], created_at: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')) };
    await db.collection(USER_PROFILES).doc(uid).set(existing);
    expect(await ensureUserProfile({ uid, displayName: 'Auth Name', metadata: { creationTime } }, db)).toEqual({ created: false, profile: null });
    expect((await db.collection(USER_PROFILES).doc(uid).get()).data()).toEqual(existing);
  });

  it('lets the member save the Profile page afterwards and keeps created_at', async () => {
    const { user } = await signInAnonymously(getAuth(clientApp));
    createdIds.push(user.uid);
    const record = await getAdminAuth(adminApp).getUser(user.uid);
    const result = await ensureUserProfile(record, db);
    expect(result.created).toBe(true);
    const createdAt = result.profile!.created_at.toDate().toISOString();
    expect(createdAt).toBe(new Date(record.metadata.creationTime).toISOString());
    expect(result.profile!.full_name).toBeNull();

    // Same write the Profile page makes: profileSavePayload through payloadOf
    // (ISO strings in timestamp fields become Timestamps, `id` is dropped), merged.
    const payload = profileSavePayload({ userId: user.uid, fullName: 'Settled Name', betaOptIn: true, experienceLevel: 'beginner', interests: ['AI'], email: 'member@example.test', updatedAt: '2026-11-07T10:00:00.000Z' });
    const fields: Record<string, unknown> = { ...payload, updated_at: ClientTimestamp.fromDate(new Date(payload.updated_at)) };
    delete fields.id;
    await setDoc(doc(getFirestore(clientApp), USER_PROFILES, user.uid), fields, { merge: true });

    const after = (await db.collection(USER_PROFILES).doc(user.uid).get()).data()!;
    expect((after.created_at as Timestamp).toDate().toISOString()).toBe(createdAt);
    expect(after).toMatchObject({ id: user.uid, full_name: 'Settled Name', beta_opt_in: true, experience_level: 'beginner', interests: ['AI'], email: 'member@example.test' });
    expect((after.updated_at as Timestamp).toDate().toISOString()).toBe('2026-11-07T10:00:00.000Z');
  });
}, 30000);
