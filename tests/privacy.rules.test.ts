import { it, expect } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, terminate } from 'firebase/firestore';
// Opt-in integration test, hard-coded demo project and loopback emulators only.
it.skipIf(process.env.RUN_FIREBASE_RULES_TESTS !== '1')('private data denies other members and preserves ownership', async () => {
  const apps = ['owner', 'stranger'].map(name => initializeApp({ projectId: 'demo-gayiclub', apiKey: 'demo-key' }, `privacy-${name}-${Date.now()}`));
  const dbs = apps.map(app => { const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); return db; });
  let createdUid: string | undefined;
  try {
    const users = await Promise.all(apps.map(async app => { const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); return (await signInAnonymously(auth)).user; }));
    const uid = users[0].uid;
    createdUid = uid;
    await setDoc(doc(dbs[0], 'user_profiles', uid), { full_name: 'Privacy test', email: 'private@example.test', phone: '+12025550123' });
    expect((await getDoc(doc(dbs[0], 'user_profiles', uid))).exists()).toBe(true);
    await expect(getDoc(doc(dbs[1], 'user_profiles', uid))).rejects.toMatchObject({ code: 'permission-denied' });
    await setDoc(doc(dbs[0], 'profiles', uid), { user_id: uid, email: 'private@example.test' });
    await expect(getDoc(doc(dbs[1], 'profiles', uid))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(doc(dbs[1], 'profiles', uid), { email: 'attacker@example.test' })).rejects.toMatchObject({ code: 'permission-denied' });
    await setDoc(doc(dbs[0], 'news_saves', uid), { user_id: uid, news_id: 'private-bookmark' });
    expect((await getDoc(doc(dbs[0], 'news_saves', uid))).exists()).toBe(true);
    await expect(getDoc(doc(dbs[1], 'news_saves', uid))).rejects.toMatchObject({ code: 'permission-denied' });
    // Seed server-only contact data through the local emulator REST owner bypass.
    const endpoint = `http://127.0.0.1:8080/v1/projects/demo-gayiclub/databases/(default)/documents/alerts_subscribers/${uid}`;
    const seed = await fetch(endpoint, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { user_id: { stringValue: uid }, email: { stringValue: 'private@example.test' }, consent_ip: { stringValue: '127.0.0.1' } } }) });
    expect(seed.ok).toBe(true);
    expect((await getDoc(doc(dbs[0], 'alerts_subscribers', uid))).exists()).toBe(true);
    await expect(getDoc(doc(dbs[1], 'alerts_subscribers', uid))).rejects.toMatchObject({ code: 'permission-denied' });
  } finally {
    // Only remove this test's exact IDs on the hard-coded local demo emulator.
    if (createdUid) await Promise.all(['user_profiles', 'profiles', 'news_saves', 'alerts_subscribers'].map(async collection => {
      const response = await fetch(`http://127.0.0.1:8080/v1/projects/demo-gayiclub/databases/(default)/documents/${collection}/${createdUid}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
      if (!response.ok && response.status !== 404) throw new Error(`Emulator cleanup failed: ${response.status}`);
    }));
    await Promise.all(apps.map(async app => { const user = getAuth(app).currentUser; if (user) await deleteUser(user); }));
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
  }
}, 20000);
