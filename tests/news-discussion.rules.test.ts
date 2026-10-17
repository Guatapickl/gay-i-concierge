import { it, expect } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, deleteDoc, terminate } from 'firebase/firestore';
// Opt-in emulator test (RUN_FIREBASE_RULES_TESTS=1 with the loopback demo emulators): the
// "I want to talk about this" vote documents are server-only, even for the voter.
it.skipIf(process.env.RUN_FIREBASE_RULES_TESTS !== '1')('news discussion votes are never readable or writable from the browser', async () => {
  const app = initializeApp({ projectId: 'demo-gayiclub', apiKey: 'demo-key' }, `news-discussion-rules-${Date.now()}`);
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const base = 'http://127.0.0.1:8080/v1/projects/demo-gayiclub/databases/(default)/documents';
  let seeded: string | null = null;
  try {
    const { user } = await signInAnonymously(auth);
    const path = `news_discussion_votes/rules-${user.uid}`;
    await expect(setDoc(doc(db, path), { news_id: 'story', user_id: user.uid })).rejects.toMatchObject({ code: 'permission-denied' });
    const seed = await fetch(`${base}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { news_id: { stringValue: 'story' }, user_id: { stringValue: user.uid } } }) });
    expect(seed.ok).toBe(true); seeded = path;
    await expect(getDoc(doc(db, path))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(db, path), { news_id: 'other' }, { merge: true })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(deleteDoc(doc(db, path))).rejects.toMatchObject({ code: 'permission-denied' });
    expect((await fetch(`${base}/${path}`)).status).toBe(403);
  } finally {
    if (seeded) await fetch(`${base}/${seeded}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
    if (auth.currentUser) await deleteUser(auth.currentUser);
    await terminate(db); await deleteApp(app);
  }
}, 20000);
